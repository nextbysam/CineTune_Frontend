import { NextResponse } from "next/server";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { spawn } from "child_process";
import { getServerSessionId, sanitizeSessionId } from "@/utils/session";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

// Store active renders for progress tracking
const activeRenders = new Map<string, { status: string; startTime: number }>();

export async function POST(request: Request) {
	const startTime = Date.now();
	console.log("[local-render] API route hit - starting");
	console.log(`[local-render] Server environment: Node ${process.version}, Platform: ${process.platform}`);
	console.log(`[local-render] Memory at start: ${JSON.stringify(process.memoryUsage())}`);

	try {
		// Get user session ID for isolation
		const sessionId = getServerSessionId(request);
		const sanitizedSessionId = sanitizeSessionId(sessionId);
		console.log(
			`[local-render] Processing render for session: ${sanitizedSessionId}`,
		);

		console.log("[local-render] Parsing request body...");
		let body: any;
		try {
			body = await request.json();
		} catch (parseError) {
			console.error("[local-render] Body parse error:", parseError);
			return NextResponse.json(
				{ message: "Invalid JSON in request body", error: String(parseError) },
				{ status: 400 },
			);
		}

		console.log("[local-render] Body parsed successfully");
		const design = body?.design || {};

		console.log("[local-render] incoming design summary:", {
			id: design?.id,
			size: design?.size,
			fps: design?.fps,
			duration: design?.duration,
			background: design?.background,
			trackItemsCount: Array.isArray(design?.trackItems)
				? design.trackItems.length
				: 0,
			hasTrackItems: !!design?.trackItems,
			designKeys: Object.keys(design),
		});

		// Validate required properties
		if (!design?.size || !design?.trackItems) {
			console.error("[local-render] Missing required design properties");
			return NextResponse.json(
				{
					message: "Invalid design: missing size or trackItems",
					design: design,
				},
				{ status: 400 },
			);
		}

		console.log("[local-render] Creating temp directory...");
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "remotion-design-"));
		const designPath = path.join(tmpDir, "design.json");

		console.log("[local-render] Writing design to:", designPath);
		await fs.writeFile(designPath, JSON.stringify({ design }, null, 2));
		console.log("[local-render] Design file written successfully");

		const nodeBin = process.execPath;
		const scriptPath = path.join(process.cwd(), "scripts", "render-local.cjs");
		console.log("[local-render] node bin:", nodeBin);
		console.log("[local-render] script path:", scriptPath);
		console.log("[local-render] current working directory:", process.cwd());
		
		// Log system resources before starting render
		console.log(`[local-render] System resources:`);
		console.log(`  Free memory: ${Math.round(os.freemem() / 1024 / 1024)}MB`);
		console.log(`  Total memory: ${Math.round(os.totalmem() / 1024 / 1024)}MB`);
		console.log(`  CPU cores: ${os.cpus().length}`);
		console.log(`  Load average: ${os.loadavg()}`);
		console.log(`  Platform: ${os.platform()}, Architecture: ${os.arch()}`);

		// Verify script exists
		console.log("[local-render] Checking if script exists...");
		try {
			const scriptStats = await fs.stat(scriptPath);
			console.log(
				"[local-render] Script found, size:",
				scriptStats.size,
				"bytes",
			);
		} catch (scriptError) {
			console.error("[local-render] Script not found:", scriptError);
			return NextResponse.json(
				{
					message: "Renderer script not found",
					scriptPath,
					cwd: process.cwd(),
					error: String(scriptError),
				},
				{ status: 500 },
			);
		}

		// Verify design exists
		console.log("[local-render] Verifying design file...");
		try {
			const designStats = await fs.stat(designPath);
			console.log(
				"[local-render] Design file verified, size:",
				designStats.size,
				"bytes",
			);
		} catch (designError) {
			console.error("[local-render] Design file missing:", designError);
			return NextResponse.json(
				{
					message: "Temp design file missing",
					designPath,
					error: String(designError),
				},
				{ status: 500 },
			);
		}

		// Generate unique render ID for progress tracking
		const renderId = randomUUID();
		const progressFilePath = path.join(
			os.tmpdir(),
			`render-progress-${renderId}.json`,
		);

		console.log(
			"[local-render] Spawning child process with progress tracking...",
		);
		console.log("[local-render] Render ID:", renderId);
		console.log("[local-render] Progress file:", progressFilePath);
		
		// Log the exact command being executed
		const cmdArgs = [
			"--max-old-space-size=1024",
			scriptPath,
			`--design=${designPath}`,
			`--session=${sanitizedSessionId}`,
			`--progress=${progressFilePath}`,
		];
		console.log(`[local-render] Command: ${nodeBin} ${cmdArgs.join(' ')}`);
		console.log(`[local-render] Environment variables being set:`);
		console.log(`  NODE_OPTIONS: --max-old-space-size=1024`);
		console.log(`  CHROMIUM_DISABLE_LOGGING: 1`);
		console.log(`  CHROME_LOG_LEVEL: 3`);

		const child = spawn(
			nodeBin,
			cmdArgs,
			{
				stdio: ["ignore", "pipe", "pipe"],
				cwd: process.cwd(),
				env: {
					...process.env,
					// Suppress Chrome download logs
					CHROMIUM_DISABLE_LOGGING: "1",
					CHROME_LOG_LEVEL: "3", // Only fatal errors
					PUPPETEER_DISABLE_HEADLESS_WARNING: "true",
					// Suppress Remotion logs
					REMOTION_DISABLE_LOGGING: "1",
					NODE_ENV: "production", // Suppress dev warnings
					// Additional memory management
					NODE_OPTIONS: "--max-old-space-size=1024",
				},
			},
		);

		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d) => {
			const chunk = d.toString();
			stdout += chunk;
			// Don't log stdout chunks as they contain the JSON result
		});

		child.stderr.on("data", (d) => {
			const chunk = d.toString();
			stderr += chunk;
			// Log all stderr chunks for debugging (but limit length for readability)
			console.log("[render-start] stderr chunk:", chunk);
		});

		console.log("[local-render] Waiting for child process to complete...");
		const renderStartTime = Date.now();
		const exitCode: number = await new Promise((resolve) =>
			child.on("close", resolve),
		);
		const renderDuration = Date.now() - renderStartTime;
		console.log("[render-start] child exited with code:", exitCode);
		console.log(`[local-render] Total render time: ${renderDuration}ms`);

		if (stderr) {
			console.log("[local-render] Full stderr:", stderr.slice(0, 4000));
		}
		if (stdout) {
			console.log("[local-render] stdout received, length:", stdout.length);
		}

		if (exitCode !== 0) {
			console.error("[render-start] Render failed with exit code:", exitCode);
			console.error(`[local-render] Render duration before failure: ${renderDuration}ms`);
			console.error(`[local-render] Memory at failure: ${JSON.stringify(process.memoryUsage())}`);
			
			// Analyze the error type based on stderr
			let errorAnalysis = "Unknown error";
			if (stderr.includes('TimeoutError')) {
				errorAnalysis = "React component rendering timeout - likely VPS performance issue";
			} else if (stderr.includes('out of memory') || stderr.includes('ENOMEM')) {
				errorAnalysis = "Out of memory error - VPS needs more RAM";
			} else if (stderr.includes('Protocol error') || stderr.includes('Target closed')) {
				errorAnalysis = "Chrome process crashed - VPS resource constraint";
			} else if (stderr.includes('ENOENT')) {
				errorAnalysis = "File not found - media file access issue";
			} else if (stderr.includes('codec') || stderr.includes('format')) {
				errorAnalysis = "Media format/codec issue";
			}
			
			console.error(`[local-render] Error analysis: ${errorAnalysis}`);
			
			return NextResponse.json(
				{
					message: "Renderer failed",
					exitCode,
					stderr: stderr.slice(0, 8000),
					scriptPath,
					designPath,
					errorAnalysis,
					renderDuration,
					memoryAtFailure: process.memoryUsage(),
					systemInfo: {
						platform: os.platform(),
						freeMemMB: Math.round(os.freemem() / 1024 / 1024),
						totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
						loadAvg: os.loadavg(),
						cpuCount: os.cpus().length
					}
				},
				{ status: 500 },
			);
		}

		console.log("[local-render] Parsing renderer output...");
		let parsed: any = {};
		try {
			// Clean stdout - remove any trailing whitespace/newlines
			const cleanStdout = stdout.trim();
			console.log("[local-render] Clean stdout:", cleanStdout);
			parsed = JSON.parse(cleanStdout);
			console.log("[local-render] Parsed output:", parsed);
		} catch (parseError) {
			console.error("[local-render] Failed to parse stdout JSON:", parseError);
			console.error("[local-render] Raw stdout:", stdout);
			return NextResponse.json(
				{
					message: "Invalid renderer output",
					stdout: stdout.slice(0, 8000),
					parseError: String(parseError),
				},
				{ status: 500 },
			);
		}

		const filePath: string = parsed.url;
		console.log("[local-render] Output file path:", filePath);
		if (!filePath) {
			return NextResponse.json(
				{ message: "No output file returned", parsed },
				{ status: 500 },
			);
		}

		// Verify the output file exists
		try {
			const outputStats = await fs.stat(filePath);
			console.log(
				"[local-render] Output file verified, size:",
				outputStats.size,
				"bytes",
			);
		} catch (fileError) {
			console.error("[local-render] Output file missing:", fileError);
			return NextResponse.json(
				{
					message: "Output file not found",
					filePath,
					error: String(fileError),
				},
				{ status: 500 },
			);
		}

		const fileUrl = `/api/render/local/file?path=${encodeURIComponent(filePath)}`;
		const totalApiDuration = Date.now() - startTime;
		console.log("[local-render] Success! Returning file URL:", fileUrl);
		console.log(`[local-render] Total API duration: ${totalApiDuration}ms`);
		console.log(`[local-render] Final memory usage: ${JSON.stringify(process.memoryUsage())}`);

		// Clean up progress file after successful render
		try {
			await fs.unlink(progressFilePath);
			console.log("[local-render] Progress file cleaned up");
		} catch (cleanupError) {
			console.log(
				"[local-render] Progress file cleanup failed (non-critical):",
				cleanupError,
			);
		}

		// Clean up temporary design file and directory to prevent memory bloat
		try {
			await fs.unlink(designPath);
			await fs.rmdir(tmpDir);
			console.log("[local-render] Temporary design files cleaned up");
		} catch (cleanupError) {
			console.log(
				"[local-render] Design cleanup failed (non-critical):",
				cleanupError,
			);
		}

		return NextResponse.json(
			{
				url: fileUrl,
				renderId: renderId,
				status: "completed",
			},
			{ status: 200 },
		);
	} catch (e: any) {
		const totalApiDuration = Date.now() - startTime;
		console.error("[local-render] Unexpected API error:", e);
		console.error("[local-render] Error stack:", e?.stack);
		console.error(`[local-render] API failed after ${totalApiDuration}ms`);
		console.error(`[local-render] Memory at error: ${JSON.stringify(process.memoryUsage())}`);
		console.error(`[local-render] System state at error:`);
		console.error(`  Free memory: ${Math.round(os.freemem() / 1024 / 1024)}MB`);
		console.error(`  Load average: ${os.loadavg()}`);
		
		return NextResponse.json(
			{
				message: "Unexpected error",
				error: e?.message || String(e),
				stack: e?.stack?.slice(0, 2000) || "No stack trace",
				type: typeof e,
				name: e?.name || "Unknown",
				apiDuration: totalApiDuration,
				memoryAtError: process.memoryUsage(),
				systemInfo: {
					platform: os.platform(),
					freeMemMB: Math.round(os.freemem() / 1024 / 1024),
					totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
					loadAvg: os.loadavg(),
					cpuCount: os.cpus().length
				}
			},
			{ status: 500 },
		);
	}
}
