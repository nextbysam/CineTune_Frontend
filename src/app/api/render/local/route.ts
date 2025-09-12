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
	console.log("[local-render] API route hit - starting");

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

		const child = spawn(
			nodeBin,
			[
				// Memory optimization flags for Node.js process
				"--max-old-space-size=1024", // Limit Node.js heap to 1GB
				// "--expose-gc", // Not allowed in production NODE_OPTIONS
				scriptPath,
				`--design=${designPath}`,
				`--session=${sanitizedSessionId}`,
				`--progress=${progressFilePath}`,
			],
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
			console.log("[local-render] stderr chunk:", chunk.slice(0, 200));
		});

		console.log("[local-render] Waiting for child process to complete...");
		const exitCode: number = await new Promise((resolve) =>
			child.on("close", resolve),
		);
		console.log("[local-render] child exited with code:", exitCode);

		if (stderr) {
			console.log("[local-render] Full stderr:", stderr.slice(0, 4000));
		}
		if (stdout) {
			console.log("[local-render] stdout received, length:", stdout.length);
		}

		if (exitCode !== 0) {
			console.error("[local-render] Renderer failed with exit code:", exitCode);
			return NextResponse.json(
				{
					message: "Renderer failed",
					exitCode,
					stderr: stderr.slice(0, 8000),
					scriptPath,
					designPath,
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
		console.log("[local-render] Success! Returning file URL:", fileUrl);

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
		console.error("[local-render] Unexpected API error:", e);
		console.error("[local-render] Error stack:", e?.stack);
		return NextResponse.json(
			{
				message: "Unexpected error",
				error: e?.message || String(e),
				stack: e?.stack?.slice(0, 2000) || "No stack trace",
				type: typeof e,
				name: e?.name || "Unknown",
			},
			{ status: 500 },
		);
	}
}
