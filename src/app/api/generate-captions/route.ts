import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { jobManager } from "@/lib/job-manager";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

export async function POST(request: NextRequest) {
	const requestId = nanoid().slice(0, 8);

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
		// Check if request is FormData
		const contentType = request.headers.get("content-type") || "";

		if (!contentType.includes("multipart/form-data")) {
			return NextResponse.json(
				{
					success: false,
					error:
						"Invalid content type. Expected multipart/form-data with video file.",
				},
				{
					status: 400,
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
						"Access-Control-Allow-Headers": "Content-Type, Authorization",
					},
				},
			);
		}

		// Handle FormData
		const formData = await request.formData();

		// Extract video file (REQUIRED)
		const videoFile = formData.get("video") as File;
		if (!videoFile) {
			return NextResponse.json(
				{
					success: false,
					error:
						"No video file provided. Please include a video file in the request.",
				},
				{
					status: 400,
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
						"Access-Control-Allow-Headers": "Content-Type, Authorization",
					},
				},
			);
		}

		// Validate video file
		if (videoFile.size === 0) {
			return NextResponse.json(
				{
					success: false,
					error: "Video file is empty (0 bytes)",
				},
				{
					status: 400,
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
						"Access-Control-Allow-Headers": "Content-Type, Authorization",
					},
				},
			);
		}

		// Check file size limit (100MB)
		const maxSizeMB = 100;
		const maxSizeBytes = maxSizeMB * 1024 * 1024;
		if (videoFile.size > maxSizeBytes) {
			return NextResponse.json(
				{
					success: false,
					error: `Video file too large. Maximum size is ${maxSizeMB}MB, received ${(videoFile.size / 1024 / 1024).toFixed(2)}MB`,
				},
				{
					status: 400,
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
						"Access-Control-Allow-Headers": "Content-Type, Authorization",
					},
				},
			);
		}

		// Get metadata from FormData (optional)
		let videoUrl, videoId, videoContext, style, timestamp, orientation;
		const metadataString = formData.get("metadata") as string;
		if (metadataString) {
			try {
				const metadata = JSON.parse(metadataString);

				videoUrl = metadata.videoUrl;
				videoId = metadata.videoId;
				videoContext = metadata.videoContext;
				style = metadata.style;
				timestamp = metadata.timestamp;
			} catch (error) {}
		}

		// Get orientation from FormData
		orientation = (formData.get("orientation") as string) || "vertical";

		// Generate a unique job ID
		const jobId = nanoid();

		// Initialize job status
		jobManager.createJob(jobId);

		// Save uploaded video file to temporary location

		const tempDir = path.join(os.tmpdir(), "video-captions");
		await fs.mkdir(tempDir, { recursive: true });

		const fileExtension = path.extname(videoFile.name) || ".mp4";
		const tempVideoPath = path.join(tempDir, `video_${jobId}${fileExtension}`);

		try {
			const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
			await fs.writeFile(tempVideoPath, videoBuffer);

			const stats = await fs.stat(tempVideoPath);
		} catch (error) {
			return NextResponse.json(
				{
					success: false,
					error: "Failed to save uploaded video file",
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

		// Start video processing asynchronously

		// Process video in background
		processVideoAsync(jobId, tempVideoPath, orientation, requestId);

		const response = {
			success: true,
			id: jobId, // Frontend expects 'id' field
			jobId: jobId,
			message: "Video processing started successfully",
			requestData: {
				videoFileName: videoFile.name,
				videoSize: videoFile.size,
				videoType: videoFile.type,
				orientation,
				videoUrl,
				videoId,
				tempVideoPath,
				videoContext,
				style,
				timestamp,
			},
		};

		return NextResponse.json(response, {
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
			},
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "Failed to start video processing",
				message: error instanceof Error ? error.message : "Unknown error",
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

// Background video processing function
async function processVideoAsync(
	jobId: string,
	videoPath: string,
	orientation: string,
	requestId: string,
) {
	const processingId = nanoid().slice(0, 8);

	try {
		// Verify video file exists
		await fs.access(videoPath);
		const stats = await fs.stat(videoPath);

		// TODO: Replace this with actual video processing
		// For now, we'll simulate processing and generate realistic captions

		// Simulate processing time based on file size (2-8 seconds)
		const processingTime = Math.min(
			2000 + (stats.size / 1024 / 1024) * 500,
			8000,
		);
		await new Promise((resolve) => setTimeout(resolve, processingTime));

		// Generate realistic captions based on video duration (estimate 30 seconds)
		const estimatedDurationSeconds = 30; // TODO: Get actual duration from video
		const captionsPerSecond = 2; // Approximate words per second
		const totalCaptions = Math.floor(
			estimatedDurationSeconds * captionsPerSecond,
		);

		const sampleWords = [
			"Welcome",
			"to",
			"our",
			"amazing",
			"video",
			"content",
			"creation",
			"platform",
			"Here",
			"you",
			"can",
			"create",
			"stunning",
			"videos",
			"with",
			"professional",
			"captions",
			"and",
			"effects",
			"Let",
			"your",
			"creativity",
			"shine",
			"through",
			"every",
			"frame",
			"and",
			"make",
			"your",
			"content",
			"stand",
			"out",
			"from",
			"the",
			"crowd",
			"with",
			"engaging",
			"storytelling",
			"techniques",
			"Transform",
			"your",
			"ideas",
			"into",
			"viral",
			"content",
			"today",
		];

		const captions = [];
		for (let i = 0; i < Math.min(totalCaptions, 60); i++) {
			const wordIndex = i % sampleWords.length;
			const startTime = i * 0.5; // 0.5 seconds per word
			const endTime = startTime + 0.8; // 0.8 second duration per word

			captions.push({
				id: `caption-${i + 1}`,
				word: sampleWords[wordIndex],
				text: sampleWords[wordIndex],
				start: startTime,
				end: endTime,
				startTime: Math.round(startTime * 1000), // milliseconds
				endTime: Math.round(endTime * 1000), // milliseconds
				confidence: 0.85 + Math.random() * 0.15, // 0.85-1.0
				vertical: orientation === "vertical",
			});
		}

		// Update job status to completed
		jobManager.updateJob(jobId, {
			status: "completed",
			captions: captions,
			processedAt: new Date().toISOString(),
			videoPath: videoPath,
			orientation: orientation,
		});

		// Clean up temporary file after processing
		setTimeout(async () => {
			try {
				await fs.unlink(videoPath);
			} catch (cleanupError) {}
		}, 60000); // Clean up after 1 minute
	} catch (error) {
		// Update job status to failed
		jobManager.updateJob(jobId, {
			status: "failed",
			error: error instanceof Error ? error.message : "Unknown error",
			failedAt: new Date().toISOString(),
		});

		// Clean up temporary file on failure
		try {
			await fs.unlink(videoPath);
		} catch (cleanupError) {}
	}
}

// Optional: Add GET method for testing
export async function GET() {
	return NextResponse.json({
		message: "Video processing API is running",
		endpoints: {
			POST: "/api/generate-captions",
			GET: "/api/captions/:jobId",
		},
		activeJobs: jobManager.getAllJobs(),
	});
}
