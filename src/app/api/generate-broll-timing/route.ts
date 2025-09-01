import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { jobManager } from "@/lib/job-manager";

export async function POST(request: NextRequest) {
	const requestId = nanoid().slice(0, 8);
	console.log(`🟡 ==========================================`);
	console.log(
		`🟡 [${requestId}] POST /api/generate-broll-timing - REQUEST STARTED`,
	);
	console.log(`🟡 ==========================================`);
	console.log(`🟡 [${requestId}] Timestamp: ${new Date().toISOString()}`);

	// Handle CORS preflight request
	if (request.method === "OPTIONS") {
		return new NextResponse(null, {
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		});
	}

	try {
		const body = await request.json();
		console.log(
			`🟡 [${requestId}] Request body:`,
			JSON.stringify(body, null, 2),
		);

		const { jobId, videoId, brollContext } = body;

		// Validate required parameters
		if (!jobId) {
			console.error(`❌ [${requestId}] Missing required parameter: jobId`);
			return NextResponse.json({ error: "jobId is required" }, { status: 400 });
		}

		if (
			!brollContext ||
			!Array.isArray(brollContext) ||
			brollContext.length === 0
		) {
			console.error(`❌ [${requestId}] Missing or invalid brollContext`);
			return NextResponse.json(
				{ error: "brollContext is required and must be a non-empty array" },
				{ status: 400 },
			);
		}

		// Check if the caption job exists and is completed
		const captionJob = jobManager.getJob(jobId);
		if (!captionJob) {
			console.error(`❌ [${requestId}] Caption job not found: ${jobId}`);
			return NextResponse.json(
				{ error: "Caption job not found" },
				{ status: 404 },
			);
		}

		if (captionJob.status !== "completed" || !captionJob.captions) {
			console.error(
				`❌ [${requestId}] Caption job not completed or has no captions: ${jobId}`,
			);
			return NextResponse.json(
				{
					error:
						"Caption job must be completed with captions before generating B-roll timing",
				},
				{ status: 400 },
			);
		}

		console.log(`🟡 [${requestId}] ==========================================`);
		console.log(`🟡 [${requestId}] EXTRACTED PARAMETERS`);
		console.log(`🟡 [${requestId}] ==========================================`);
		console.log(`🟡 [${requestId}] jobId: ${jobId}`);
		console.log(`🟡 [${requestId}] videoId: ${videoId || "Not provided"}`);
		console.log(`🟡 [${requestId}] brollContext: ${brollContext.length} clips`);
		console.log(
			`🟡 [${requestId}] Available captions: ${captionJob.captions.length}`,
		);

		// Generate a unique B-roll job ID
		const brollJobId = nanoid();
		console.log(`🟡 [${requestId}] Generated B-roll job ID: ${brollJobId}`);

		// Initialize B-roll timing job
		jobManager.createJob(brollJobId);
		console.log(
			`🟡 [${requestId}] B-roll timing job created in manager: ${brollJobId}`,
		);

		// Start async B-roll timing processing
		processBrollTiming(
			brollJobId,
			captionJob.captions,
			brollContext,
			requestId,
		).catch((error) => {
			console.error(
				`❌ [${requestId}] B-roll timing processing failed:`,
				error,
			);
			jobManager.updateJob(brollJobId, {
				status: "failed",
				error: error.message || "Unknown error during B-roll timing generation",
			});
		});

		console.log(`🟡 [${requestId}] ==========================================`);
		console.log(`🟡 [${requestId}] RESPONSE - B-roll timing job started`);
		console.log(`🟡 [${requestId}] ==========================================`);

		const response = {
			success: true,
			brollJobId,
			message: "B-roll timing generation started",
			status: "processing",
		};

		console.log(`✅ [${requestId}] Returning response:`, response);

		return NextResponse.json(response, {
			status: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		});
	} catch (error) {
		console.error(`❌ [${requestId}] Error processing request:`, error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{
				status: 500,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
				},
			},
		);
	}
}

// Async function to process B-roll timing generation
async function processBrollTiming(
	brollJobId: string,
	captions: any[],
	brollContext: any[],
	requestId: string,
) {
	console.log(
		`🟡 [${requestId}] Starting B-roll timing processing for job: ${brollJobId}`,
	);

	try {
		// Simulate processing time (in real implementation, this would call external service)
		await new Promise((resolve) => setTimeout(resolve, 3000));

		// Mock B-roll timing generation based on captions and B-roll context
		const brollTimings = generateMockBrollTimings(captions, brollContext);

		console.log(
			`✅ [${requestId}] B-roll timing generation completed for job: ${brollJobId}`,
		);
		console.log(
			`🟡 [${requestId}] Generated ${brollTimings.length} B-roll timing suggestions`,
		);

		// Update job with results
		jobManager.updateJob(brollJobId, {
			status: "completed",
			brollTimings,
		});
	} catch (error) {
		console.error(
			`❌ [${requestId}] B-roll timing processing failed for job: ${brollJobId}`,
			error,
		);
		jobManager.updateJob(brollJobId, {
			status: "failed",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
}

// Mock function to generate B-roll timing suggestions
function generateMockBrollTimings(captions: any[], brollContext: any[]) {
	const timings = [];

	// Group captions into segments for B-roll placement
	const captionDuration =
		captions.length > 0
			? Math.max(...captions.map((c) => c.endTime || c.end || 0))
			: 0;

	const segmentDuration = 5; // 5 second segments
	const numSegments = Math.ceil(captionDuration / segmentDuration);

	for (let i = 0; i < numSegments && i < brollContext.length; i++) {
		const startTime = i * segmentDuration;
		const endTime = Math.min((i + 1) * segmentDuration, captionDuration);
		const brollClip = brollContext[i % brollContext.length];

		timings.push({
			id: nanoid(),
			startTime,
			endTime,
			duration: endTime - startTime,
			brollClip: {
				id: brollClip.id,
				name: brollClip.name || `B-roll ${i + 1}`,
				url: brollClip.url || brollClip.metadata?.uploadedUrl,
				thumbnail: brollClip.metadata?.thumbnail,
			},
			confidence: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
			reasoning: `Suggested B-roll for segment ${i + 1} (${startTime}s - ${endTime}s)`,
			captionContext: captions
				.filter((c) => {
					const cStart = c.startTime || c.start || 0;
					const cEnd = c.endTime || c.end || 0;
					return cStart < endTime && cEnd > startTime;
				})
				.map((c) => c.text || c.word)
				.join(" "),
		});
	}

	return timings;
}
