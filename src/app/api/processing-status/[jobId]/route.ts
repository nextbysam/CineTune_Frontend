import { NextRequest, NextResponse } from "next/server";
import { jobManager } from "@/lib/job-manager";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ jobId: string }> },
) {
	const { jobId } = await params;
	console.log(`🔍 [STATUS] Checking processing status for job: ${jobId}`);

	try {
		// Get job status from job manager
		const job = jobManager.getJob(jobId);

		if (!job) {
			console.log(`❌ [STATUS] Job not found: ${jobId}`);
			return NextResponse.json(
				{
					success: false,
					error: "Job not found",
					status: "not_found",
				},
				{
					status: 404,
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
						"Access-Control-Allow-Headers": "Content-Type, Authorization",
					},
				},
			);
		}

		console.log(`✅ [STATUS] Job ${jobId} status: ${job.status}`);

		// Return job status
		const response = {
			success: true,
			jobId: jobId,
			status: job.status,
			...(job.error && { error: job.error }),
			...(job.captions && { captionsCount: job.captions.length }),
			...(job.processedAt && { processedAt: job.processedAt }),
			...(job.failedAt && { failedAt: job.failedAt }),
		};

		return NextResponse.json(response, {
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		});
	} catch (error) {
		console.error(`❌ [STATUS] Error checking job status for ${jobId}:`, error);

		return NextResponse.json(
			{
				success: false,
				error: "Failed to check job status",
				message: error instanceof Error ? error.message : "Unknown error",
				status: "error",
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

// Handle OPTIONS for CORS
export async function OPTIONS() {
	return new NextResponse(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
