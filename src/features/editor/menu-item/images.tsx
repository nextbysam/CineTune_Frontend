import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import useStore from "../store/use-store";
import { toast } from "sonner";

export const Images = () => {
	const { trackItemsMap, setState } = useStore();
	const [isProcessing, setIsProcessing] = useState(false);
	const [lutFrames, setLutFrames] = useState<Array<{ url: string; name: string }>>([]);

	const getVideoFromTimeline = () => {
		const videoItems = Object.values(trackItemsMap).filter(
			(item) => item.type === "video"
		);
		
		if (videoItems.length === 0) {
			throw new Error("No video found in timeline. Please add a video first.");
		}
		
		return videoItems[0]; // Use the first video found
	};

	const handleCinematicGrading = async () => {
		
		setLutFrames([]); // Clear previous previews from UI
		setIsProcessing(true);
		toast.info("Processing video for cinematic grading...");
		
		try {
			// Step 1: Get video files from the timeline
			const videoItem = getVideoFromTimeline();
			const videoUrl = videoItem.details.src;
			

			// Step 2: Fetch video file from the URL
			const fileResponse = await fetch(videoUrl);
			if (!fileResponse.ok) {
				throw new Error(`Failed to fetch video: ${fileResponse.status} ${fileResponse.statusText}`);
			}
			
			const videoBlob = await fileResponse.blob();

			// Step 3: Create FormData as per the specified format
			const formData = new FormData();
			const filename = videoUrl.split('/').pop() || `video_${videoItem.id}.mp4`;
			const videoFile = new File([videoBlob], filename, { type: videoBlob.type || 'video/mp4' });
			
			formData.append('video', videoFile);
			formData.append('frameNumber', '30');
			formData.append('isVertical', 'false');


			// Step 4: Send POST request to generate LUT previews
			const response = await fetch('https://cinetune-llh0.onrender.com/api/generate-lut-previews', {
				method: 'POST',
				body: formData
			});

			
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`API Error: ${response.status} - ${errorText}`);
			}

			// Step 5: Parse response and extract frame URLs
			const data = await response.json();

			if (data.frames && Array.isArray(data.frames)) {

				setLutFrames(data.frames);
				toast.success(`Generated ${data.frames.length} cinematic grading previews!`);
			} else {
				toast.warning("No grading previews were generated.");
			}

		} catch (error) {
			toast.error(`Failed to generate cinematic grading: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleApplyLUT = async (lutName: string) => {
		
		setIsProcessing(true);
		toast.info(`Applying ${lutName} LUT to video...`);
		
		try {
			// Step 1: Get video from timeline
			const videoItem = getVideoFromTimeline();
			const videoUrl = videoItem.details.src;
			

			// Step 2: Fetch video file from the URL
			const fileResponse = await fetch(videoUrl);
			if (!fileResponse.ok) {
				throw new Error(`Failed to fetch video: ${fileResponse.status} ${fileResponse.statusText}`);
			}
			
			const videoBlob = await fileResponse.blob();

			// Step 3: Create FormData for LUT application
			const formData = new FormData();
			const filename = videoUrl.split('/').pop() || `video_${videoItem.id}.mp4`;
			const videoFile = new File([videoBlob], filename, { type: videoBlob.type || 'video/mp4' });
			
			formData.append('video', videoFile);
			formData.append('lutName', lutName);
			formData.append('isVertical', 'false');

			// Step 4: Send POST request to apply LUT
			const response = await fetch('https://cinetune-llh0.onrender.com/api/grade-video-lut', {
				method: 'POST',
				body: formData
			});

			
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`LUT Application Error: ${response.status} - ${errorText}`);
			}

			// Step 5: Process response (could be a new video URL or success message)
			const data = await response.json();
			
			if (data.success && data.url) {
				const videoItem = getVideoFromTimeline();
				const videoId = videoItem.id;
				const newSrc = data.url.startsWith('http')
					? data.url
					: `https://cinetune-llh0.onrender.com${data.url}`;

				// Update the video in the timeline
				setState({
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
				toast.success('Timeline video replaced with graded version!');
			} else {
			}

		} catch (error) {
			toast.error(`Failed to apply ${lutName} LUT: ${error instanceof Error ? error.message : 'Unknown error'}`);
		} finally {
			setIsProcessing(false);
		}
	};

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
					onClick={handleCinematicGrading}
					disabled={isProcessing}
				>
					{isProcessing ? "Processing..." : "Cinematic Grading(hopefully)"}
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
									frame.url.startsWith('http')
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
