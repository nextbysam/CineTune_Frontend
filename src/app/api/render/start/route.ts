import { NextResponse } from "next/server";
import path from "path";
import os from "os";
import fs from "fs/promises";
import fsSync from "fs";
import { spawn } from "child_process";
import { getServerSessionId, sanitizeSessionId } from "@/utils/session";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

// Store active renders for progress tracking
const activeRenders = new Map<
	string,
	{
		status: string;
		startTime: number;
		child?: any;
		progressFilePath: string;
		filePath?: string;
		error?: string;
		stderr?: string;
	}
>();

export async function POST(request: Request) {
	console.log("[render-start] API route hit - starting");

	try {
		// Get user session ID for isolation
		const sessionId = getServerSessionId(request);
		const sanitizedSessionId = sanitizeSessionId(sessionId);
		console.log(
			`[render-start] Processing render for session: ${sanitizedSessionId}`,
		);

		console.log("[render-start] Parsing request body...");
		let body: any;
		try {
			body = await request.json();
		} catch (parseError) {
			console.error("[render-start] Body parse error:", parseError);
			return NextResponse.json(
				{ message: "Invalid JSON in request body", error: String(parseError) },
				{ status: 400 },
			);
		}

		console.log("[render-start] Body parsed successfully");
		const design = body?.design || {};

		console.log("[render-start] incoming design summary:", {
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
			console.error("[render-start] Missing required design properties");
			return NextResponse.json(
				{
					message: "Invalid design: missing size or trackItems",
					design: design,
				},
				{ status: 400 },
			);
		}

		// Generate unique render ID
		const renderId = randomUUID();
		const progressFilePath = path.join(
			os.tmpdir(),
			`render-progress-${renderId}.json`,
		);

		console.log("[render-start] Creating temp directory...");
		const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "remotion-design-"));
		const designPath = path.join(tmpDir, "design.json");

		console.log("[render-start] Writing design to:", designPath);
		await fs.writeFile(designPath, JSON.stringify({ design }, null, 2));
		console.log("[render-start] Design file written successfully");

		const nodeBin = process.execPath;
		
		// Fix script path resolution for standalone deployment
		let projectRoot;
		if (process.cwd().includes('.next/standalone')) {
			// Running from standalone directory - go up to project root
			projectRoot = path.resolve(process.cwd(), "../../");
		} else {
			// Running directly from project root
			projectRoot = process.cwd();
		}
		
		const scriptPath = path.join(projectRoot, "scripts", "render-local.cjs");
		console.log("[render-start] node bin:", nodeBin);
		console.log("[render-start] script path:", scriptPath);

		// Verify script exists
		console.log("[render-start] Checking if script exists...");
		try {
			const scriptStats = await fs.stat(scriptPath);
			console.log(
				"[render-start] Script found, size:",
				scriptStats.size,
				"bytes",
			);
		} catch (scriptError) {
			console.error("[render-start] Script not found:", scriptError);
			return NextResponse.json(
				{
					message: "Renderer script not found",
					scriptPath,
					error: String(scriptError),
				},
				{ status: 500 },
			);
		}

		// Initialize progress tracking
		activeRenders.set(renderId, {
			status: "starting",
			startTime: Date.now(),
			progressFilePath,
		});

		console.log("[render-start] Spawning child process asynchronously...");
		console.log("[render-start] Render ID:", renderId);
		console.log("[render-start] Progress file:", progressFilePath);

		// Spawn the render process asynchronously
		const child = spawn(
			nodeBin,
			[
				// Enhanced memory optimization flags for Node.js process
				"--max-old-space-size=2048", // Increase heap to 2GB for better stability
				"--expose-gc", // Enable garbage collection
				scriptPath,
				`--design=${designPath}`,
				`--session=${sanitizedSessionId}`,
				`--progress=${progressFilePath}`,
			],
			{
				stdio: ["ignore", "pipe", "pipe"],
				cwd: projectRoot,
				env: {
					...process.env,
					CHROMIUM_DISABLE_LOGGING: "1",
					CHROME_LOG_LEVEL: "3",
					PUPPETEER_DISABLE_HEADLESS_WARNING: "true",
					REMOTION_DISABLE_LOGGING: "1",
					NODE_ENV: "production",
					// Enhanced memory management and Chrome stability
					NODE_OPTIONS: "--max-old-space-size=2048 --expose-gc",
					DISPLAY: ":99", // Virtual display for headless rendering
				},
				detached: false,
			},
		);

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (d) => {
			stdout += d.toString();
		});

		child.stderr.on("data", (d) => {
			stderr += d.toString();
			console.log("[render-start] stderr chunk:", d.toString().slice(0, 200));
		});

		// Handle process completion asynchronously
		child.on("close", async (exitCode) => {
			console.log("[render-start] child exited with code:", exitCode);

			const renderData = activeRenders.get(renderId);
			if (!renderData) return;

			if (exitCode === 0) {
				try {
					const cleanStdout = stdout.trim();
					const parsed = JSON.parse(cleanStdout);
					const filePath = parsed.url;

					// Update render status to completed with file path
					activeRenders.set(renderId, {
						...renderData,
						status: "completed",
						filePath: filePath,
					});

					console.log(
						"[render-start] Render completed successfully:",
						filePath,
					);
				} catch (parseError) {
					console.error(
						"[render-start] Failed to parse completion output:",
						parseError,
					);
					activeRenders.set(renderId, {
						...renderData,
						status: "error",
						error: "Failed to parse render output",
					});
				}
			} else {
				console.error("[render-start] Render failed with exit code:", exitCode);
				activeRenders.set(renderId, {
					...renderData,
					status: "error",
					error: `Render failed with exit code ${exitCode}`,
					stderr: stderr.slice(0, 1000),
				});
			}
		});

		// Store child process reference
		activeRenders.set(renderId, {
			...activeRenders.get(renderId)!,
			status: "rendering",
			child,
		});

		// Return render ID immediately for progress tracking
		console.log("[render-start] Returning render ID for progress tracking");
		return NextResponse.json(
			{
				renderId: renderId,
				status: "started",
				message: "Render started successfully",
			},
			{ status: 202 },
		); // 202 Accepted - request accepted for processing
	} catch (e: any) {
		console.error("[render-start] Unexpected API error:", e);
		return NextResponse.json(
			{
				message: "Unexpected error",
				error: e?.message || String(e),
			},
			{ status: 500 },
		);
	}
}

// GET method to check render status and get result
export async function GET(request: Request) {
	const url = new URL(request.url);
	const renderId = url.searchParams.get("id");

	if (!renderId) {
		return NextResponse.json({ message: "Missing render ID" }, { status: 400 });
	}

	const renderData = activeRenders.get(renderId);
	if (!renderData) {
		return NextResponse.json({ message: "Render not found" }, { status: 404 });
	}

	// Read current progress if available
	let progress = 0;
	try {
		if (fsSync.existsSync(renderData.progressFilePath)) {
			const progressData = JSON.parse(
				await fs.readFile(renderData.progressFilePath, "utf-8"),
			);
			progress = progressData.progress || 0;
		}
	} catch (progressError) {
		console.log("[render-start] Failed to read progress:", progressError);
	}

	const response: any = {
		renderId,
		status: renderData.status,
		progress,
		startTime: renderData.startTime,
		elapsed: Date.now() - renderData.startTime,
	};

	if (renderData.status === "completed" && (renderData as any).filePath) {
		response.url = `/api/render/local/file?path=${encodeURIComponent((renderData as any).filePath)}`;

		// Clean up after successful completion
		activeRenders.delete(renderId);
		try {
			if (fsSync.existsSync(renderData.progressFilePath)) {
				await fs.unlink(renderData.progressFilePath);
			}
		} catch (cleanupError) {
			console.log("[render-start] Progress file cleanup failed:", cleanupError);
		}
	}

	if (renderData.status === "error") {
		response.error = (renderData as any).error;
		response.stderr = (renderData as any).stderr;

		// Clean up after error
		activeRenders.delete(renderId);
		try {
			if (fsSync.existsSync(renderData.progressFilePath)) {
				await fs.unlink(renderData.progressFilePath);
			}
		} catch (cleanupError) {
			console.log("[render-start] Progress file cleanup failed:", cleanupError);
		}
	}

	return NextResponse.json(response);
}
