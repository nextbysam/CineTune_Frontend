const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition } = require("@remotion/renderer");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const os = require("os");

// System diagnostics helper
function logSystemInfo() {
	process.stderr.write(`[render-diagnostics] System Info:\n`);
	process.stderr.write(`  Platform: ${process.platform}\n`);
	process.stderr.write(`  Architecture: ${process.arch}\n`);
	process.stderr.write(`  Node version: ${process.version}\n`);
	process.stderr.write(`  Memory usage: ${JSON.stringify(process.memoryUsage(), null, 2)}\n`);
	process.stderr.write(`  CPU count: ${os.cpus().length}\n`);
	process.stderr.write(`  Free memory: ${Math.round(os.freemem() / 1024 / 1024)}MB\n`);
	process.stderr.write(`  Total memory: ${Math.round(os.totalmem() / 1024 / 1024)}MB\n`);
	process.stderr.write(`  Load average: ${os.loadavg()}\n`);
	process.stderr.write(`  Working directory: ${process.cwd()}\n`);
	process.stderr.write(`  Environment: NODE_ENV=${process.env.NODE_ENV}\n`);
	process.stderr.write(`  Process uptime: ${process.uptime()}s\n`);
	
	// System resource state
	const freeMemMB = Math.round(os.freemem() / 1024 / 1024);
	process.stderr.write(`  Free memory: ${freeMemMB}MB\n`);
	
	const loadAvg = os.loadavg()[0];
	process.stderr.write(`  CPU load: ${loadAvg.toFixed(2)}\n`);
}

function logTimestamp(label) {
	const timestamp = new Date().toISOString();
	process.stderr.write(`[render-timing] ${timestamp} - ${label}\n`);
}

async function main() {
	logTimestamp('Render script started');
	logSystemInfo();
	
	const args = process.argv.slice(2);
	const designArg = args.find((a) => a.startsWith("--design="));
	const sessionArg = args.find((a) => a.startsWith("--session="));
	const progressArg = args.find((a) => a.startsWith("--progress="));

	if (!designArg) {
		process.stderr.write("Missing --design=path\n");
		process.exit(1);
	}

	const designPath = designArg.split("=")[1];
	const sessionId = sessionArg ? sessionArg.split("=")[1] : "default";

	// Set up progress file for real-time progress updates
	if (progressArg) {
		global.progressFilePath = progressArg.split("=")[1];
		process.stderr.write(
			`[render-local] Progress file: ${global.progressFilePath}\n`,
		);
		// Initialize progress file
		fs.writeFileSync(
			global.progressFilePath,
			JSON.stringify({ progress: 0, timestamp: Date.now() }),
		);
	}

	process.stderr.write(`[render-local] Session ID: ${sessionId}\n`);
	logTimestamp('About to read design file');

	const raw = await fsp.readFile(designPath, "utf-8");
	logTimestamp('Design file read successfully');
	const { design } = JSON.parse(raw);

	// ALL LOGS GO TO STDERR, NOT STDOUT
	process.stderr.write(
		`[render-local] Starting render with design: ${JSON.stringify({
			size: design.size,
			fps: design.fps,
			duration: design.duration,
			trackItemsCount: design.trackItems?.length || 0,
		})}\n`,
	);

	// Analyze track items for potential issues
	if (design.trackItems && design.trackItems.length > 0) {
		const videoItems = design.trackItems.filter(item => item.type === 'video');
		const audioItems = design.trackItems.filter(item => item.type === 'audio');
		const problematicItems = design.trackItems.filter(item => {
			if (item.type === 'video' || item.type === 'audio') {
				const src = item.details?.src || '';
				return src.toLowerCase().includes('.mov') || 
				       src.toLowerCase().includes('.m4v') || 
				       src.toLowerCase().includes('quicktime');
			}
			return false;
		});

		process.stderr.write(`[render-local] Track analysis: ${videoItems.length} videos, ${audioItems.length} audio tracks\n`);
		if (problematicItems.length > 0) {
			process.stderr.write(`[render-local] WARNING: ${problematicItems.length} potentially problematic media files detected (.mov/.m4v formats)\n`);
			problematicItems.forEach((item, index) => {
				process.stderr.write(`[render-local]   ${index + 1}. ${item.type}: ${item.details?.src}\n`);
			});
			process.stderr.write(`[render-local] RECOMMENDATION: Convert problematic files to MP4 format for better compatibility\n`);
		}
	}

	// Fix path resolution for standalone deployment
	let projectRoot;
	if (process.cwd().includes('.next/standalone')) {
		// Running from standalone directory - go up to project root
		projectRoot = path.resolve(process.cwd(), "../../");
	} else {
		// Running directly from project root
		projectRoot = process.cwd();
	}
	
	const entry = path.join(projectRoot, "src", "remotion", "index.tsx");
	const outdir = await fsp.mkdtemp(path.join(os.tmpdir(), "remotion-bundle-"));
	
	process.stderr.write(`[render-local] Project root resolved to: ${projectRoot}\n`);

	process.stderr.write(`[render-local] Bundling from: ${entry}\n`);
	logTimestamp('Starting bundle process');
	
	// Check if entry file exists before bundling
	try {
		await fsp.access(entry);
		process.stderr.write(`[render-local] Entry file confirmed to exist: ${entry}\n`);
	} catch (e) {
		process.stderr.write(`[render-local] CRITICAL: Entry file not found: ${entry}\n`);
		throw new Error(`Entry file not found: ${entry}`);
	}

	// Capture and redirect any console output during bundling
	const originalLog = console.log;
	const originalWarn = console.warn;
	const originalError = console.error;
	const originalInfo = console.info;

	// Redirect all console output to stderr during Remotion operations
	console.log = (...args) =>
		process.stderr.write(`[remotion-log] ${args.join(" ")}\n`);
	console.warn = (...args) =>
		process.stderr.write(`[remotion-warn] ${args.join(" ")}\n`);
	console.error = (...args) =>
		process.stderr.write(`[remotion-error] ${args.join(" ")}\n`);
	console.info = (...args) =>
		process.stderr.write(`[remotion-info] ${args.join(" ")}\n`);

	const bundleStartTime = Date.now();
	const serveUrl = await bundle({
		entryPoint: entry,
		outDir: outdir,
		verbose: false,
		logLevel: "error",
	});
	const bundleDuration = Date.now() - bundleStartTime;
	logTimestamp(`Bundle completed in ${bundleDuration}ms`);
	process.stderr.write(`[render-local] Bundle URL: ${serveUrl}\n`);

	// Get composition with the design props
	const compositionId = "TimelineComposition";
	const inputProps = { design };

	process.stderr.write(`[render-local] ===== COMPOSITION SELECTION PHASE =====\n`);
	process.stderr.write(`[render-local] Composition ID: ${compositionId}\n`);
	process.stderr.write(`[render-local] Serve URL: ${serveUrl}\n`);
	process.stderr.write(`[render-local] Input props keys: ${Object.keys(inputProps).join(', ')}\n`);
	process.stderr.write(`[render-local] Design props: ${JSON.stringify({
		trackItems: inputProps.design?.trackItems?.length || 0,
		tracks: inputProps.design?.tracks?.length || 0,
		duration: inputProps.design?.duration,
		size: inputProps.design?.size
	})}\n`);
	
	// Memory check before composition selection
	const preCompMemory = process.memoryUsage();
	process.stderr.write(`[render-local] Pre-composition memory: RSS=${Math.round(preCompMemory.rss/1024/1024)}MB, Heap=${Math.round(preCompMemory.heapUsed/1024/1024)}MB\n`);
	
	logTimestamp('Starting composition selection with enhanced monitoring');
	process.stderr.write(`[render-local] Composition selection timeout: 60 seconds\n`);
	
	// Add timeout wrapper for composition selection to get better error info
	const compositionStartTime = Date.now();
	let composition;
	let timeoutId;
	
	// Set up periodic progress logging during composition selection
	const progressInterval = setInterval(() => {
		const elapsed = Math.round((Date.now() - compositionStartTime) / 1000);
		const currentMem = process.memoryUsage();
		process.stderr.write(`[render-local] Composition selection ongoing... ${elapsed}s elapsed\n`);
		process.stderr.write(`[render-local]   Current memory: RSS=${Math.round(currentMem.rss/1024/1024)}MB, Heap=${Math.round(currentMem.heapUsed/1024/1024)}MB\n`);
		process.stderr.write(`[render-local]   System free memory: ${Math.round(os.freemem() / 1024 / 1024)}MB\n`);
	}, 5000);
	
	try {
		composition = await Promise.race([
			selectComposition({
				serveUrl,
				id: compositionId,
				inputProps,
				logLevel: 'error',
				chromiumOptions: {
					gl: 'swiftshader',
					args: [
						'--no-sandbox',
						'--disable-web-security',
						'--disable-extensions',
						'--disable-gpu',
						'--disable-gpu-sandbox',
						'--disable-software-rasterizer',
						'--disable-background-timer-throttling',
						'--disable-backgrounding-occluded-windows',
						'--disable-renderer-backgrounding',
						'--disable-field-trial-config',
						'--disable-features=TranslateUI,VizDisplayCompositor',
						'--run-all-compositor-stages-before-draw',
						'--disable-threaded-animation',
						'--disable-threaded-scrolling',
						'--disable-dev-shm-usage',
						'--disable-accelerated-2d-canvas',
						'--disable-accelerated-jpeg-decoding',
						'--disable-accelerated-mjpeg-decode',
						'--disable-accelerated-video-decode',
						'--disable-accelerated-video-encode',
						'--disable-gpu-memory-buffer-compositor-resources',
						'--disable-gpu-memory-buffer-video-frames',
						'--disable-gpu-rasterization',
						'--disable-2d-canvas-clip-aa',
						'--disable-2d-canvas-image-chromium',
						'--disable-3d-apis',
						'--disable-canvas-aa',
						'--disable-composited-antialiasing',
						'--memory-pressure-off',
						'--max_old_space_size=1024',
						'--js-flags=--max-old-space-size=1024',
						'--no-zygote',
						'--single-process',
						'--disable-setuid-sandbox',
						'--disable-namespace-sandbox',
						'--disable-logging',
						'--silent',
						'--log-level=3',
						'--disable-crash-reporter',
						'--disable-breakpad',
						'--no-first-run',
						'--no-default-browser-check',
						'--disable-default-apps',
						'--disable-component-extensions-with-background-pages',
						'--disable-client-side-phishing-detection'
					],
					environmentVariables: {
						CHROME_NO_SANDBOX: '1',
						NODE_OPTIONS: '--max-old-space-size=1024',
						CHROMIUM_DISABLE_LOGGING: '1',
						CHROME_LOG_LEVEL: '3',
						PUPPETEER_DISABLE_HEADLESS_WARNING: 'true'
					}
				},
				onBrowserLog: (log) => {
					if (log.type === 'error') {
						process.stderr.write(`[chrome-composition-${log.type}] ${log.text}\n`);
					}
				}
			}),
			new Promise((_, reject) => {
				timeoutId = setTimeout(() => {
					clearInterval(progressInterval);
					reject(new Error('Composition selection timeout after 60 seconds'));
				}, 60000);
			})
		]);
		
		clearTimeout(timeoutId);
		clearInterval(progressInterval);
		clearTimeout(timeoutId);
		clearInterval(progressInterval);
		
		const compositionDuration = Date.now() - compositionStartTime;
		const postCompMemory = process.memoryUsage();
		logTimestamp(`Composition selected successfully in ${compositionDuration}ms`);
		process.stderr.write(`[render-local] ✅ Composition selection SUCCESS after ${compositionDuration}ms\n`);
		process.stderr.write(`[render-local] Post-composition memory: RSS=${Math.round(postCompMemory.rss/1024/1024)}MB, Heap=${Math.round(postCompMemory.heapUsed/1024/1024)}MB\n`);
		process.stderr.write(`[render-local] Memory delta: RSS=${Math.round((postCompMemory.rss - preCompMemory.rss)/1024/1024)}MB, Heap=${Math.round((postCompMemory.heapUsed - preCompMemory.heapUsed)/1024/1024)}MB\n`);
	} catch (e) {
		clearTimeout(timeoutId);
		clearInterval(progressInterval);
		
		const compositionDuration = Date.now() - compositionStartTime;
		const errorMemory = process.memoryUsage();
		process.stderr.write(`[render-local] Composition selection failed after ${compositionDuration}ms\n`);
		process.stderr.write(`[render-local] Error type: ${e.constructor.name}\n`);
		process.stderr.write(`[render-local] Error message: ${e.message}\n`);
		process.stderr.write(`[render-local] Error stack: ${e.stack}\n`);
		process.stderr.write(`[render-local] Memory at failure: RSS=${Math.round(errorMemory.rss/1024/1024)}MB, Heap=${Math.round(errorMemory.heapUsed/1024/1024)}MB\n`);
		process.stderr.write(`[render-local] System memory at failure: ${Math.round(os.freemem() / 1024 / 1024)}MB free\n`);
		process.stderr.write(`[render-local] System load at failure: ${os.loadavg()}\n`);
		
		throw e;
	}

	process.stderr.write(
		`[render-local] Composition selected: ${JSON.stringify({
			id: composition.id,
			width: composition.width,
			height: composition.height,
			fps: composition.fps,
			durationInFrames: composition.durationInFrames,
		})}\n`,
	);

	// Create user-specific renders directory in project folder
	const baseRendersDir = path.join(projectRoot, "renders");
	const userRendersDir = path.join(baseRendersDir, sessionId);
	
	process.stderr.write(`[render-local] Base renders directory: ${baseRendersDir}\n`);

	try {
		await fsp.mkdir(userRendersDir, { recursive: true });
		process.stderr.write(
			`[render-local] Created/verified user renders directory: ${userRendersDir}\n`,
		);
	} catch (e) {
		process.stderr.write(
			`[render-local] Error creating user renders directory: ${e}\n`,
		);
	}

	// Save to user-specific renders folder
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const outputLocation = path.join(userRendersDir, `export_${timestamp}.mp4`);
	process.stderr.write(`[render-local] Rendering to: ${outputLocation}\n`);
	logTimestamp('Starting video render process');
	
	// Log render configuration
	process.stderr.write(`[render-local] ===== RENDER PHASE =====\n`);
	process.stderr.write(`[render-local] Chrome GL: angle\n`);
	process.stderr.write(`[render-local] Timeout: 300000ms\n`);
	process.stderr.write(`[render-local] Delay render timeout: 180000ms\n`);
	process.stderr.write(`[render-local] Concurrency: 1\n`);
	process.stderr.write(`[render-local] Output location: ${outputLocation}\n`);
	
	let lastProgressTime = Date.now();
	let renderStartTime = Date.now();

	await renderMedia({
		composition,
		serveUrl,
		codec: "h264",
		outputLocation,
		inputProps,
		onProgress: (progress) => {
			const now = Date.now();
			const progressPercent = Math.round(progress.progress * 100);
			const timeSinceLastProgress = now - lastProgressTime;
			const totalRenderTime = now - renderStartTime;
			
			// Progress logs go to STDERR for debugging with timing info
			process.stderr.write(`[render-local] Progress: ${progressPercent}% (+${timeSinceLastProgress}ms, total: ${totalRenderTime}ms)\n`);
			
			// Log detailed frame info
			if (progress.renderedFrames !== undefined && progress.encodedFrames !== undefined) {
				process.stderr.write(`[render-local]   Frames: ${progress.renderedFrames} rendered, ${progress.encodedFrames} encoded\n`);
			}
			
			// Log memory usage at key progress points
			if (progressPercent % 25 === 0) {
				const memUsage = process.memoryUsage();
				process.stderr.write(`[render-local]   Memory: RSS=${Math.round(memUsage.rss/1024/1024)}MB, Heap=${Math.round(memUsage.heapUsed/1024/1024)}MB\n`);
			}
			
			lastProgressTime = now;
			
			// Also output structured progress to a temp file for API to read
			if (global.progressFilePath) {
				try {
					fs.writeFileSync(
						global.progressFilePath,
						JSON.stringify({
							progress: progressPercent,
							timestamp: now,
							renderedFrames: progress.renderedFrames,
							encodedFrames: progress.encodedFrames,
						}),
					);
				} catch (e) {
					process.stderr.write(
						`[render-local] Failed to write progress: ${e}\n`,
					);
				}
			}
		},
		chromiumOptions: {
			gl: "swiftshader", // Use software rendering for VPS compatibility
			args: [
				"--no-sandbox",
				"--disable-web-security",
				"--disable-extensions",
				"--disable-gpu",
				"--disable-gpu-sandbox",
				"--disable-software-rasterizer",
				"--disable-background-timer-throttling",
				"--disable-backgrounding-occluded-windows",
				"--disable-renderer-backgrounding",
				"--disable-field-trial-config",
				"--disable-features=TranslateUI,VizDisplayCompositor",
				"--run-all-compositor-stages-before-draw",
				"--disable-threaded-animation",
				"--disable-threaded-scrolling",
				"--disable-dev-shm-usage",
				"--disable-accelerated-2d-canvas",
				"--disable-accelerated-jpeg-decoding",
				"--disable-accelerated-mjpeg-decode",
				"--disable-accelerated-video-decode",
				"--disable-accelerated-video-encode",
				"--disable-gpu-memory-buffer-compositor-resources",
				"--disable-gpu-memory-buffer-video-frames",
				"--disable-gpu-rasterization",
				"--disable-2d-canvas-clip-aa",
				"--disable-2d-canvas-image-chromium",
				"--disable-3d-apis",
				"--disable-canvas-aa",
				"--disable-composited-antialiasing",
				"--memory-pressure-off",
				"--max_old_space_size=1024",
				"--js-flags=--max-old-space-size=1024",
				"--no-zygote",
				"--single-process",
				"--disable-setuid-sandbox",
				"--disable-namespace-sandbox",
				"--disable-background-networking",
				"--disable-client-side-phishing-detection",
				"--disable-component-extensions-with-background-pages",
				"--disable-default-apps",
				"--disable-hang-monitor",
				"--disable-ipc-flooding-protection",
				"--disable-popup-blocking",
				"--disable-prompt-on-repost",
				"--disable-sync",
				"--disable-translate",
				"--hide-scrollbars",
				"--metrics-recording-only",
				"--no-first-run",
				"--no-default-browser-check",
				"--disable-logging",
				"--silent",
				"--log-level=3",
				"--disable-crash-reporter",
				"--disable-breakpad",
				"--disable-background-mode",
				"--disable-plugins",
				"--disable-plugins-discovery",
				"--disable-preconnect"
			],
			// Add environment variables for better Chrome stability on VPS
			environmentVariables: {
				CHROME_NO_SANDBOX: "1",
				CHROMIUM_DISABLE_LOGGING: "1",
				CHROME_LOG_LEVEL: "3",
				PUPPETEER_DISABLE_HEADLESS_WARNING: "true",
				REMOTION_DISABLE_LOGGING: "1",
				// Memory and performance settings
				NODE_OPTIONS: "--max-old-space-size=1024",
				MALLOC_ARENA_MAX: "2", // Limit glibc arenas
				// Disable X11 requirements completely
				DISPLAY: "",
				XAUTHORITY: ""
			},
		},
		// Chrome browser logging
		onBrowserLog: (log) => {
			if (log.type === 'error') {
				process.stderr.write(`[chrome-${log.type}] ${log.text}\n`);
			}
		},
		// Download logging
		onDownload: (src) => {
			process.stderr.write(`[render-local] Download: ${src}\n`);
		},
		// Start logging
		onStart: () => {
			process.stderr.write(`[render-local] Render process started\n`);
		},
		// Balanced timeouts for stable rendering
		timeoutInMilliseconds: 300000, // 5 minutes total timeout
		delayRenderTimeoutInMilliseconds: 180000, // 3 minutes for individual asset loading
		// Performance settings optimized for compatibility
		concurrency: 1, // Single thread for stability
		verbose: false, // Disabled to prevent stdout contamination
		logLevel: "error", // Only log errors
		// Audio handling - include audio in final render
		enforceAudioTrack: true, // Include audio track in final video
		// Quality settings optimized for compatibility
		jpegQuality: 80, // Good quality for better compatibility
		// Pixel format for better compatibility
		pixelFormat: "yuv420p",
		// H.264 encoding optimizations for compatibility
		crf: 23, // Standard CRF for good quality/size balance
	});

	const totalRenderDuration = Date.now() - renderStartTime;
	logTimestamp(`Render completed in ${totalRenderDuration}ms`);
	process.stderr.write(`[render-local] Render complete: ${outputLocation}\n`);
	
	// Check output file properties
	try {
		const stats = await fsp.stat(outputLocation);
		process.stderr.write(`[render-local] Output file size: ${Math.round(stats.size / 1024 / 1024 * 100) / 100}MB\n`);
		process.stderr.write(`[render-local] Output file created: ${stats.birthtime}\n`);
	} catch (e) {
		process.stderr.write(`[render-local] Warning: Could not read output file stats: ${e}\n`);
	}

	// Cleanup temporary bundle directory to prevent memory bloat
	try {
		await fsp.rm(outdir, { recursive: true, force: true });
		process.stderr.write(`[render-local] Cleaned up bundle directory: ${outdir}\n`);
	} catch (cleanupError) {
		process.stderr.write(`[render-local] Bundle cleanup warning (non-critical): ${cleanupError}\n`);
	}

	// Force garbage collection if available (helps with memory cleanup)
	if (global.gc) {
		global.gc();
		process.stderr.write(`[render-local] Forced garbage collection\n`);
	}

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
	logTimestamp('Fatal error occurred');
	process.stderr.write(`[render-local] FATAL ERROR: ${e}\n`);
	process.stderr.write(`[render-local] Error stack: ${String(e?.stack || e)}\n`);
	
	// Log final system state
	process.stderr.write(`[render-diagnostics] Final system state:\n`);
	const finalMemUsage = process.memoryUsage();
	process.stderr.write(`  Final memory: RSS=${Math.round(finalMemUsage.rss/1024/1024)}MB, Heap=${Math.round(finalMemUsage.heapUsed/1024/1024)}MB\n`);
	process.stderr.write(`  System free memory: ${Math.round(os.freemem() / 1024 / 1024)}MB\n`);
	process.stderr.write(`  System load: ${os.loadavg()}\n`);

	// Provide helpful error messages based on error type
	if (String(e).includes('ENOENT')) {
		process.stderr.write(`[render-local] HINT: File not found error - check if all media files are accessible\n`);
	} else if (String(e).includes('spawn ENOMEM') || String(e).includes('out of memory')) {
		process.stderr.write(`[render-local] HINT: Out of memory error - VPS may have insufficient RAM\n`);
		process.stderr.write(`[render-local]   - Try reducing concurrency to 1\n`);
		process.stderr.write(`[render-local]   - Consider upgrading VPS memory\n`);
		process.stderr.write(`[render-local]   - Break video into smaller segments\n`);
	} else if (String(e).includes('timeout') || String(e).includes('TimeoutError')) {
		process.stderr.write(`[render-local] HINT: Timeout during React component rendering\n`);
		process.stderr.write(`[render-local]   This usually indicates:\n`);
		process.stderr.write(`[render-local]   1. VPS performance issues (CPU/memory constraints)\n`);
		process.stderr.write(`[render-local]   2. Media files taking too long to load\n`);
		process.stderr.write(`[render-local]   3. React components in infinite render loops\n`);
		process.stderr.write(`[render-local]   4. Network requests in components not resolving\n`);
		process.stderr.write(`[render-local]   Solutions:\n`);
		process.stderr.write(`[render-local]   - Increase delayRenderTimeoutInMilliseconds\n`);
		process.stderr.write(`[render-local]   - Check media file accessibility and formats\n`);
		process.stderr.write(`[render-local]   - Simplify React components\n`);
		process.stderr.write(`[render-local]   - Ensure no network requests in render\n`);
	} else if (String(e).includes('codec') || String(e).includes('format')) {
		process.stderr.write(`[render-local] HINT: Video format error - convert .mov/.m4v files to .mp4 format\n`);
	} else if (String(e).includes('EncodingError') || String(e).includes('Decoding failed')) {
		process.stderr.write(`[render-local] HINT: Audio/Video decoding error - problematic media format detected\n`);
	} else if (String(e).includes('Protocol error') || String(e).includes('Target closed')) {
		process.stderr.write(`[render-local] HINT: Chrome process crashed - likely VPS resource constraint\n`);
		process.stderr.write(`[render-local]   - VPS may need more RAM or CPU\n`);
		process.stderr.write(`[render-local]   - Try disabling GPU acceleration completely\n`);
		process.stderr.write(`[render-local]   - Reduce Chrome flags for minimal resource usage\n`);
	}

	process.exit(9); // Use exit code 9 to distinguish from other errors
});
