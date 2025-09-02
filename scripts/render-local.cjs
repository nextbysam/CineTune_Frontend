const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition } = require("@remotion/renderer");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const os = require("os");

async function main() {
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

	const raw = await fsp.readFile(designPath, "utf-8");
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

	const serveUrl = await bundle({
		entryPoint: entry,
		outDir: outdir,
		verbose: false,
		logLevel: "error",
	});

	// Get composition with the design props
	const compositionId = "TimelineComposition";
	const inputProps = { design };

	process.stderr.write(`[render-local] Selecting composition with props\n`);

	const composition = await selectComposition({
		serveUrl,
		id: compositionId,
		inputProps,
	});

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

	await renderMedia({
		composition,
		serveUrl,
		codec: "h264",
		outputLocation,
		inputProps,
		onProgress: (progress) => {
			const progressPercent = Math.round(progress.progress * 100);
			// Progress logs go to STDERR for debugging
			process.stderr.write(`[render-local] Progress: ${progressPercent}%\n`);
			// Also output structured progress to a temp file for API to read
			if (global.progressFilePath) {
				try {
					fs.writeFileSync(
						global.progressFilePath,
						JSON.stringify({
							progress: progressPercent,
							timestamp: Date.now(),
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
			gl: "angle", // Better video compatibility than swiftshader
			args: [
				"--no-sandbox",
				"--disable-web-security",
				"--disable-extensions",
				"--disable-background-timer-throttling",
				"--disable-backgrounding-occluded-windows",
				"--disable-renderer-backgrounding",
				"--disable-features=TranslateUI",
				"--disable-dev-shm-usage",
				"--disable-gpu-sandbox",
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
				"--memory-pressure-off",
				"--silent",
				"--quiet",
				// Video codec support flags
				"--enable-features=VaapiVideoDecoder",
				"--ignore-gpu-blocklist",
				"--enable-gpu-rasterization",
				"--enable-zero-copy",
			],
		},
		// Balanced timeouts for stable rendering
		timeoutInMilliseconds: 300000, // 5 minutes total timeout
		delayRenderTimeoutInMilliseconds: 180000, // 3 minutes for individual asset loading
		// Performance settings optimized for compatibility
		concurrency: 1, // Single thread for stability
		verbose: false, // Disabled to prevent stdout contamination
		logLevel: "error", // Only log errors
		// Audio handling - allow audio but handle errors gracefully
		enforceAudioTrack: false, // Don't enforce audio if not needed
		// Quality settings optimized for compatibility
		jpegQuality: 80, // Good quality for better compatibility
		// Pixel format for better compatibility
		pixelFormat: "yuv420p",
		// H.264 encoding optimizations for compatibility
		crf: 23, // Standard CRF for good quality/size balance
	});

	process.stderr.write(`[render-local] Render complete: ${outputLocation}\n`);

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
	process.stderr.write(`[render-local] FATAL ERROR: ${e}\n`);
	process.stderr.write(`[render-local] Error stack: ${String(e?.stack || e)}\n`);

	// Provide helpful error messages based on error type
	if (String(e).includes('ENOENT')) {
		process.stderr.write(`[render-local] HINT: File not found error - check if all media files are accessible\n`);
	} else if (String(e).includes('spawn ENOMEM') || String(e).includes('out of memory')) {
		process.stderr.write(`[render-local] HINT: Out of memory error - try reducing video quality or duration\n`);
	} else if (String(e).includes('timeout')) {
		process.stderr.write(`[render-local] HINT: Render timeout - try breaking down the video into smaller segments\n`);
	} else if (String(e).includes('codec') || String(e).includes('format')) {
		process.stderr.write(`[render-local] HINT: Video format error - convert .mov/.m4v files to .mp4 format\n`);
	} else if (String(e).includes('EncodingError') || String(e).includes('Decoding failed')) {
		process.stderr.write(`[render-local] HINT: Audio/Video decoding error - problematic media format detected\n`);
	}

	process.exit(9); // Use exit code 9 to distinguish from other errors
});
