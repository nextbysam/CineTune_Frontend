const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');

async function main() {
  const args = process.argv.slice(2);
  const designArg = args.find((a) => a.startsWith('--design='));
  const sessionArg = args.find((a) => a.startsWith('--session='));
  const progressArg = args.find((a) => a.startsWith('--progress='));
  
  if (!designArg) {
    process.stderr.write('Missing --design=path\n');
    process.exit(1);
  }
  
  const designPath = designArg.split('=')[1];
  const sessionId = sessionArg ? sessionArg.split('=')[1] : 'default';
  
  // Set up progress file for real-time progress updates
  if (progressArg) {
    global.progressFilePath = progressArg.split('=')[1];
    process.stderr.write(`[render-local] Progress file: ${global.progressFilePath}\n`);
    // Initialize progress file
    fs.writeFileSync(global.progressFilePath, JSON.stringify({ progress: 0, timestamp: Date.now() }));
  }
  
  process.stderr.write(`[render-local] Session ID: ${sessionId}\n`);
  
  const raw = await fsp.readFile(designPath, 'utf-8');
  const { design } = JSON.parse(raw);

  // ALL LOGS GO TO STDERR, NOT STDOUT
  process.stderr.write(`[render-local] Starting render with design: ${JSON.stringify({
    size: design.size,
    fps: design.fps,
    duration: design.duration,
    trackItemsCount: design.trackItems?.length || 0,
  })}\n`);

  // Fix path resolution for standalone deployment
  const projectRoot = path.resolve(process.cwd(), '../../');
  const entry = path.join(projectRoot, 'src', 'remotion', 'index.tsx');
  const outdir = await fsp.mkdtemp(path.join(os.tmpdir(), 'remotion-bundle-'));
  
  process.stderr.write(`[render-local] Bundling from: ${entry}\n`);
  
  // Capture and redirect any console output during bundling
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;
  
  // Redirect all console output to stderr during Remotion operations
  console.log = (...args) => process.stderr.write(`[remotion-log] ${args.join(' ')}\n`);
  console.warn = (...args) => process.stderr.write(`[remotion-warn] ${args.join(' ')}\n`);
  console.error = (...args) => process.stderr.write(`[remotion-error] ${args.join(' ')}\n`);
  console.info = (...args) => process.stderr.write(`[remotion-info] ${args.join(' ')}\n`);
  
  const serveUrl = await bundle({
    entryPoint: entry,
    outDir: outdir,
    verbose: false,
    logLevel: 'error'
  });

  // Get composition with the design props
  const compositionId = 'TimelineComposition';
  const inputProps = { design };
  
  process.stderr.write(`[render-local] Selecting composition with props\n`);
  
  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps,
  });

  process.stderr.write(`[render-local] Composition selected: ${JSON.stringify({
    id: composition.id,
    width: composition.width,
    height: composition.height,
    fps: composition.fps,
    durationInFrames: composition.durationInFrames,
  })}\n`);

  // Create user-specific renders directory in project folder
  const baseRendersDir = path.join(projectRoot, 'renders');
  const userRendersDir = path.join(baseRendersDir, sessionId);
  
  try {
    await fsp.mkdir(userRendersDir, { recursive: true });
    process.stderr.write(`[render-local] Created/verified user renders directory: ${userRendersDir}\n`);
  } catch (e) {
    process.stderr.write(`[render-local] Error creating user renders directory: ${e}\n`);
  }

  // Save to user-specific renders folder
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputLocation = path.join(userRendersDir, `export_${timestamp}.mp4`);
  process.stderr.write(`[render-local] Rendering to: ${outputLocation}\n`);

  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation,
    inputProps,
    onProgress: (progress) => {
      const progressPercent = Math.round(progress.progress * 100);
      // Progress logs go to STDERR for debugging
      process.stderr.write(`[render-local] Progress: ${progressPercent}%\n`);
      // Also output structured progress to a temp file for API to read
      if (global.progressFilePath) {
        try {
          fs.writeFileSync(global.progressFilePath, JSON.stringify({
            progress: progressPercent,
            timestamp: Date.now()
          }));
        } catch (e) {
          process.stderr.write(`[render-local] Failed to write progress: ${e}\n`);
        }
      }
    },
    chromiumOptions: {
      gl: 'angle',
      // Optimize for video processing
      args: [
        '--no-sandbox',
        '--disable-web-security',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--no-zygote',
        '--single-process',
        '--disable-gpu-sandbox',
        '--silent',
        '--quiet'
      ]
    },
    // Optimized timeouts for video processing
    timeoutInMilliseconds: 300000, // 5 minutes total timeout
    delayRenderTimeoutInMilliseconds: 180000, // 3 minutes for individual asset loading
    // Performance optimizations
    concurrency: 1, // Single thread to avoid resource conflicts
    verbose: false, // Disabled to prevent stdout contamination
    logLevel: 'error', // Only log errors
    // Video-specific optimizations
    enforceAudioTrack: false, // Don't enforce audio if not needed
    muted: false, // Allow audio processing
    // Quality settings optimized for speed
    jpegQuality: 80, // Slightly lower quality for faster processing
    // Pixel format for better compatibility
    pixelFormat: 'yuv420p'
  });

  process.stderr.write(`[render-local] Render complete: ${outputLocation}\n`);
  
  // Restore original console methods
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
  console.info = originalInfo;
  
  // ONLY JSON OUTPUT GOES TO STDOUT - ensure no trailing content
  process.stdout.write(JSON.stringify({ url: outputLocation }));
  // Do NOT add newline to stdout as it can interfere with JSON parsing
}

main().catch((e) => {
  process.stderr.write(`[render-local] Error: ${e}\n`);
  process.stderr.write(String(e?.stack || e));
  process.exit(1);
}); 