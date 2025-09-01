import { Button } from "@/components/ui/button";
import React, { useState, useCallback, useMemo } from "react";
import useStore from "../store/use-store";
import { toast } from "sonner";

export const Images = () => {
	const { trackItemsMap, setState } = useStore();
	const [isProcessing, setIsProcessing] = useState(false);
	const [lutFrames, setLutFrames] = useState<
		Array<{ url: string; name: string }>
	>([]);

	// Memoize video selection to prevent recalculation on every render
	const selectedVideo = useMemo(() => {
		const videoItems = Object.values(trackItemsMap).filter(
			(item) => item.type === "video",
		);
		return videoItems.length > 0 ? videoItems[0] : null;
	}, [trackItemsMap]);

	const getVideoFromTimeline = useCallback(() => {
		if (!selectedVideo) {
			throw new Error("No video found in timeline. Please add a video first.");
		}
		return selectedVideo;
	}, [selectedVideo]);

	const handleCinematicGrading = useCallback(async () => {
		console.log("🎬 Starting cinematic grading process...");

		setLutFrames([]); // Clear previous previews from UI
		setIsProcessing(true);
		toast.info("Processing video for cinematic grading...");

		try {
			// Step 1: Get video files from the timeline
			console.log("📹 Getting video from timeline...");
			const videoItem = getVideoFromTimeline();
			const videoUrl = videoItem.details.src;
			console.log("🔗 Video URL:", videoUrl);

			// Step 2: Fetch video file from the URL
			console.log("⬇️ Fetching video file...");
			const fileResponse = await fetch(videoUrl);
			if (!fileResponse.ok) {
				throw new Error(
					`Failed to fetch video: ${fileResponse.status} ${fileResponse.statusText}`,
				);
			}

			const videoBlob = await fileResponse.blob();
			console.log("📦 Video blob size:", videoBlob.size, "bytes");

			// Step 3: Create FormData as per the specified format
			const formData = new FormData();
			const filename = videoUrl.split("/").pop() || `video_${videoItem.id}.mp4`;
			const videoFile = new File([videoBlob], filename, {
				type: videoBlob.type || "video/mp4",
			});

			formData.append("video", videoFile);
			formData.append("frameNumber", "30");
			formData.append("isVertical", "false");

			console.log(
				"📋 FormData prepared with file:",
				filename,
				"Type:",
				videoFile.type,
			);

			// Step 4: Send POST request to generate LUT previews
			console.log("🚀 Sending request to generate LUT previews...");
			const response = await fetch(
				"https://cinetune-llh0.onrender.com/api/generate-lut-previews",
				{
					method: "POST",
					body: formData,
				},
			);

			console.log("📨 Response status:", response.status, response.statusText);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("❌ API Error Response:", errorText);
				throw new Error(`API Error: ${response.status} - ${errorText}`);
			}

			// Step 5: Parse response and extract frame URLs
			const data = await response.json();
			console.log("📊 API Response data:", data);

			if (data.frames && Array.isArray(data.frames)) {
				console.log("🖼️ Generated", data.frames.length, "preview frames");
				// Process frame URLs to make them absolute
				const processedFrames = data.frames.map(
					(frame: { url: string; name: string }) => ({
						...frame,
						url: frame.url.startsWith("http")
							? frame.url
							: `https://cinetune-llh0.onrender.com${frame.url}`,
					}),
				);

				setLutFrames(processedFrames);
				toast.success(
					`Generated ${data.frames.length} cinematic grading previews!`,
				);
			} else {
				console.warn(
					"⚠️ No frames in response or frames is not an array:",
					data,
				);
				toast.warning("No grading previews were generated.");
			}
		} catch (error) {
			console.error("💥 Cinematic grading error:", error);
			toast.error(
				`Failed to generate cinematic grading: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		} finally {
			setIsProcessing(false);
			console.log("✅ Cinematic grading process complete");
		}
	}, [getVideoFromTimeline]);

	const handleApplyLUT = useCallback(
		async (lutName: string) => {
			console.log(`🎨 Starting LUT application: ${lutName}`);

			setIsProcessing(true);
			toast.info(`Applying ${lutName} LUT to video...`);

			try {
				// Step 1: Get video from timeline
				console.log("📹 Getting video from timeline for LUT application...");
				const videoItem = getVideoFromTimeline();
				const videoUrl = videoItem.details.src;
				console.log("🔗 Video URL for LUT:", videoUrl);

				// Step 2: Fetch video file from the URL
				console.log("⬇️ Fetching video file for LUT application...");
				const fileResponse = await fetch(videoUrl);
				if (!fileResponse.ok) {
					throw new Error(
						`Failed to fetch video: ${fileResponse.status} ${fileResponse.statusText}`,
					);
				}

				const videoBlob = await fileResponse.blob();
				console.log("📦 Video blob size for LUT:", videoBlob.size, "bytes");

				// Step 3: Create FormData for LUT application
				const formData = new FormData();
				const filename =
					videoUrl.split("/").pop() || `video_${videoItem.id}.mp4`;
				const videoFile = new File([videoBlob], filename, {
					type: videoBlob.type || "video/mp4",
				});

				formData.append("video", videoFile);
				formData.append("lutName", lutName);
				formData.append("isVertical", "false");

				console.log("📋 FormData prepared for LUT with:", {
					filename,
					lutName,
					type: videoFile.type,
				});

				// Step 4: Send POST request to apply LUT
				console.log("🚀 Sending LUT application request...");
				const response = await fetch(
					"https://cinetune-llh0.onrender.com/api/grade-video-lut",
					{
						method: "POST",
						body: formData,
					},
				);

				console.log(
					"📨 LUT Response status:",
					response.status,
					response.statusText,
				);

				if (!response.ok) {
					const errorText = await response.text();
					console.error("❌ LUT API Error Response:", errorText);
					throw new Error(
						`LUT Application Error: ${response.status} - ${errorText}`,
					);
				}

				// Step 5: Process response (could be a new video URL or success message)
				const data = await response.json();
				console.log("📊 LUT API Response data:", data);

				if (data.success && data.url) {
					const videoItem = getVideoFromTimeline();
					const videoId = videoItem.id;
					const newSrc = data.url.startsWith("http")
						? data.url
						: `https://cinetune-llh0.onrender.com${data.url}`;

					console.log("🔄 Updating timeline with new video URL:", newSrc);

					// Update the video in the timeline
					await setState({
						trackItemsMap: {
							...trackItemsMap,
							[videoId]: {
								...videoItem,
								details: {
									...videoItem.details,
									src: newSrc,
								},
							},
						},
					});

					console.log("✅ Timeline updated successfully");
					toast.success("Timeline video replaced with graded version!");
				} else {
					console.error("❌ Invalid response from LUT API:", data);
					throw new Error(
						data.message || "Backend did not return a valid graded video URL",
					);
				}
			} catch (error) {
				console.error("💥 LUT application error:", error);
				toast.error(
					`Failed to apply ${lutName} LUT: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			} finally {
				setIsProcessing(false);
				console.log("✅ LUT application process complete");
			}
		},
		[getVideoFromTimeline, setState, trackItemsMap],
	);

	return (
		<div className="flex flex-1 flex-col">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
				Color Grade
			</div>

			{/* Cinematic Grading Button */}
			<div className="px-4 pb-4">
				<Button
					variant="default"
					className="w-full"
					onClick={(e) => {
						console.log("🖱️ Cinematic Grading button clicked!");
						e.preventDefault();
						handleCinematicGrading();
					}}
					disabled={isProcessing}
					data-tour="cinematic-grading-button"
				>
					{isProcessing ? "Processing..." : "Cinematic Grading"}
				</Button>
			</div>

			{/* Display LUT Preview Frames */}
			{lutFrames.length > 0 && (
				<div className="px-4 pb-4">
					<div className="text-sm font-medium text-muted-foreground mb-2">
						Cinematic Grading Previews ({lutFrames.length})
					</div>
					<div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
						{lutFrames.map((frame, index) => (
							<div key={index} className="relative group">
								<img
									src={
										frame.url.startsWith("http")
											? `${frame.url}?t=${Date.now()}`
											: `https://cinetune-llh0.onrender.com${frame.url}?t=${Date.now()}`
									}
									alt={frame.name || `Grading ${index + 1}`}
									className="w-full h-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
									onClick={() => {
										const lutName = frame.name || `Grading ${index + 1}`;

										if (!isProcessing) {
											handleApplyLUT(lutName);
										}
									}}
								/>
								<div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 rounded-b-md truncate">
									{frame.name || `Grading ${index + 1}`}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
