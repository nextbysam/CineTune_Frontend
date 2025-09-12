import { bundle } from "@remotion/bundler";
import { renderMedia, getCompositions } from "@remotion/renderer";
import fs from "fs/promises";
import path from "path";
import os from "os";

// Production-optimized render configuration - removed chromium options for compatibility
const PRODUCTION_RENDER_CONFIG = {
	concurrency: 1, // Use single thread for VPS stability
	enforceAudioTrack: false, // Don't fail if no audio
	disallowParallelEncoding: true, // Prevent memory issues
	timeoutInMilliseconds: 120000, // 2 minutes for composition selection
};

// Chromium options for renderMedia (different API)
const CHROMIUM_OPTIONS = [
	'--disable-gpu',
	'--disable-dev-shm-usage',
	'--disable-extensions',
	'--disable-plugins',
	'--no-sandbox',
	'--disable-setuid-sandbox',
	'--memory-pressure-off',
	'--max_old_space_size=2048',
	'--disable-background-networking',
	'--disable-background-timer-throttling',
	'--disable-client-side-phishing-detection',
	'--disable-default-apps',
	'--disable-hang-monitor',
	'--disable-popup-blocking',
	'--disable-prompt-on-repost',
	'--disable-sync',
	'--disable-translate',
	'--metrics-recording-only',
	'--no-first-run',
	'--safebrowsing-disable-auto-update',
	'--enable-automation',
	'--password-store=basic',
	'--use-mock-keychain',
];

async function main() {
	try {
		console.log("🚀 [render-local] Starting production-optimized render process");
		console.log("📊 [render-local] Memory usage at start:", process.memoryUsage());
		
		const args = process.argv.slice(2);
		const designPathArg = args.find((a) => a.startsWith("--design="));
		if (!designPathArg) {
			console.error("❌ Missing --design=<path-to-json>");
			process.exit(1);
		}
		
		const designPath = designPathArg.split("=")[1];
		console.log("📄 [render-local] Reading design file:", designPath);
		
		const raw = await fs.readFile(designPath, "utf-8");
		const { design } = JSON.parse(raw);

		const size = design.size || { width: 1080, height: 1920 };
		const fps = design.fps || 30;
		const durationMs = design.duration || 10000;
		const durationInFrames = Math.ceil((durationMs / 1000) * fps);

		console.log("🎬 [render-local] Render configuration:", {
			size,
			fps,
			durationMs,
			durationInFrames,
			trackItemsCount: design.trackItems?.length || 0,
		});

		const entry = path.join(process.cwd(), "src/remotion/index.tsx");
		console.log("📦 [render-local] Entry file:", entry);
		
		// Verify entry file exists
		try {
			await fs.access(entry);
			console.log("✅ [render-local] Entry file confirmed to exist");
		} catch (error) {
			console.error("❌ [render-local] Entry file not found:", entry);
			process.exit(1);
		}

		const outdir = await fs.mkdtemp(path.join(os.tmpdir(), "remotion-bundle-"));
		console.log("📦 [render-local] Bundle directory:", outdir);
		
		console.log("🔨 [render-local] Starting bundle process...");
		const bundleStart = Date.now();
		
		const serveUrl = await bundle(entry, undefined, { 
			outDir: outdir,
			// Add production webpack optimizations
			webpackOverride: (config) => ({
				...config,
				optimization: {
					...config.optimization,
					minimize: false, // Disable minification for better debugging
				},
			}),
		});
		
		const bundleTime = Date.now() - bundleStart;
		console.log(`✅ [render-local] Bundle completed in ${bundleTime}ms`);
		console.log("🌐 [render-local] Bundle URL:", serveUrl);

		// Test composition selection before rendering
		console.log("🔍 [render-local] Testing composition selection...");
		const compositionStart = Date.now();
		
		try {
			const compositions = await getCompositions(serveUrl, {
				inputProps: { design },
				...PRODUCTION_RENDER_CONFIG,
			});
			
			const compositionTime = Date.now() - compositionStart;
			console.log(`✅ [render-local] Composition selection completed in ${compositionTime}ms`);
			console.log("📋 [render-local] Available compositions:", compositions.map(c => c.id));
			
			const targetComposition = compositions.find(c => c.id === "TimelineComposition");
			if (!targetComposition) {
				console.error("❌ [render-local] TimelineComposition not found in available compositions");
				process.exit(1);
			}
			
			console.log("🎯 [render-local] Target composition found:", {
				id: targetComposition.id,
				width: targetComposition.width,
				height: targetComposition.height,
				fps: targetComposition.fps,
				durationInFrames: targetComposition.durationInFrames,
			});
			
		} catch (error) {
			console.error("❌ [render-local] Composition selection failed:", error);
			console.error("💡 [render-local] This suggests the React component is not rendering properly");
			process.exit(1);
		}

		const outputLocation = path.join(os.tmpdir(), `export_${Date.now()}.mp4`);
		console.log("🎥 [render-local] Output location:", outputLocation);

		console.log("🎬 [render-local] Starting media render...");
		const renderStart = Date.now();
		
		await renderMedia({
			serveUrl,
			composition: {
				id: "TimelineComposition",
				width: size.width,
				height: size.height,
				fps,
				durationInFrames,
				defaultProps: { design },
			} as any,
			codec: "h264",
			outputLocation,
			inputProps: { design },
			...PRODUCTION_RENDER_CONFIG,
			// Additional render optimizations
			pixelFormat: 'yuv420p', // Better compatibility
			crf: 18, // Good quality/size balance
		});

		const renderTime = Date.now() - renderStart;
		console.log(`✅ [render-local] Media render completed in ${renderTime}ms`);
		console.log("📊 [render-local] Memory usage at end:", process.memoryUsage());

		// Verify output file was created
		try {
			const stats = await fs.stat(outputLocation);
			console.log(`📁 [render-local] Output file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
		} catch (error) {
			console.error("❌ [render-local] Output file verification failed:", error);
			process.exit(1);
		}

		process.stdout.write(JSON.stringify({ url: outputLocation }));
		
	} catch (error) {
		console.error("💥 [render-local] Render process failed:", error);
		console.error("📊 [render-local] Memory usage at error:", process.memoryUsage());
		throw error;
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
