import { useEffect } from "react";
import { dispatch } from "@designcombo/events";
import { DESIGN_RESIZE, EDIT_OBJECT } from "@designcombo/state";
import useStore from "../store/use-store";

export const useAutoComposition = () => {
	const { autoComposition, trackItemsMap, size } = useStore();

	// Determine video orientation
	const determineOrientation = (width: number, height: number) => {
		const aspectRatio = width / height;
		
		if (aspectRatio > 1.0) {
			return "horizontal"; // Landscape
		} else if (aspectRatio < 1.0) {
			return "vertical";   // Portrait
		} else {
			return "square";     // 1:1 aspect ratio
		}
	};

	// Get optimal composition dimensions based on video orientation
	const getOptimalCompositionDimensions = (videoWidth: number, videoHeight: number) => {
		const orientation = determineOrientation(videoWidth, videoHeight);
		const videoAspectRatio = videoWidth / videoHeight;
		
		switch (orientation) {
			case "horizontal":
				// For horizontal videos, choose composition that best fits the video
				if (videoAspectRatio >= 1.77 && videoAspectRatio <= 1.78) {
					// 16:9 aspect ratio - use standard HD canvas
					return { width: 1920, height: 1080 };
				} else if (videoAspectRatio >= 1.33 && videoAspectRatio <= 1.34) {
					// 4:3 aspect ratio - use 4:3 canvas
					return { width: 1440, height: 1080 };
				} else if (videoAspectRatio >= 2.35) {
					// Ultra-wide cinematic aspect ratio
					return { width: 2560, height: 1080 };
				} else {
					// CRITICAL: For other aspect ratios, create canvas that fits video perfectly
					// Scale up video to minimum acceptable resolution while preserving aspect ratio
					const minWidth = 1280;
					const minHeight = 720;
					
					let canvasWidth = Math.max(videoWidth, minWidth);
					let canvasHeight = canvasWidth / videoAspectRatio;
					
					// Ensure minimum height
					if (canvasHeight < minHeight) {
						canvasHeight = minHeight;
						canvasWidth = canvasHeight * videoAspectRatio;
					}
					
					return {
						width: Math.round(canvasWidth),
						height: Math.round(canvasHeight)
					};
				}
			case "vertical":
				// For vertical videos, use portrait ratios
				if (videoHeight / videoWidth >= 1.77) {
					// 9:16 aspect ratio (common for mobile)
					return { width: 1080, height: 1920 };
				} else {
					// Use video's native dimensions but ensure minimum size
					return {
						width: Math.max(videoWidth, 720),
						height: Math.max(videoHeight, 1280)
					};
				}
			case "square":
				// For square videos, use 1:1 ratio
				return {
					width: Math.max(videoWidth, 1080),
					height: Math.max(videoHeight, 1080)
				};
			default:
				return { width: videoWidth, height: videoHeight };
		}
	};

	// Calculate optimal scale and initial centered position for video in composition
	const calculateVideoSettings = (videoWidth: number, videoHeight: number, compositionWidth: number, compositionHeight: number, currentVideoDetails: any) => {
		// Calculate scale to fit video within composition while maintaining aspect ratio
		const scaleX = compositionWidth / videoWidth;
		const scaleY = compositionHeight / videoHeight;
		const scale = Math.min(scaleX, scaleY); // Use smaller scale to ensure video fits entirely

		// CRITICAL: Keep original video dimensions, don't stretch to fill composition
		const originalWidth = videoWidth;
		const originalHeight = videoHeight;

		// Calculate final display dimensions after scaling (for positioning calculations)
		const finalDisplayWidth = originalWidth * scale;
		const finalDisplayHeight = originalHeight * scale;

		// Calculate centered position - BUT only use as initial position if video has no position set
		const centeredX = (compositionWidth - finalDisplayWidth) / 2;
		const centeredY = (compositionHeight - finalDisplayHeight) / 2;

		console.log("Video fitting calculation:", {
			originalVideo: { width: videoWidth, height: videoHeight },
			composition: { width: compositionWidth, height: compositionHeight },
			scale: scale,
			finalDisplay: { width: finalDisplayWidth, height: finalDisplayHeight },
			suggestedCenterPosition: { x: centeredX, y: centeredY },
			currentPosition: { x: currentVideoDetails?.left, y: currentVideoDetails?.top }
		});

		// IMPORTANT: Only set initial position if video doesn't have a position yet
		// This allows user to move the video after initial placement
		const shouldSetInitialPosition = (
			currentVideoDetails?.left === undefined || 
			currentVideoDetails?.left === null || 
			currentVideoDetails?.left === 0
		) && (
			currentVideoDetails?.top === undefined || 
			currentVideoDetails?.top === null || 
			currentVideoDetails?.top === 0
		);

		return {
			// Only set position for initial placement, otherwise preserve user's positioning
			left: shouldSetInitialPosition ? centeredX : currentVideoDetails?.left,
			top: shouldSetInitialPosition ? centeredY : currentVideoDetails?.top,
			width: originalWidth,  // Keep original video dimensions
			height: originalHeight, // Keep original video dimensions
			scale: scale,          // Apply scaling via transform
			shouldSetInitialPosition: shouldSetInitialPosition
		};
	};

	// Get first video dimensions and details for auto composition
	const getFirstVideoDetails = () => {
		const videoItems = Object.values(trackItemsMap).filter(
			(item) => item.type === "video",
		);

		if (videoItems.length > 0) {
			const firstVideo = videoItems[0];
			return {
				id: firstVideo.id,
				width: firstVideo.details.width,
				height: firstVideo.details.height,
				details: firstVideo.details,
			};
		}
		return null;
	};

	// Apply auto composition when enabled
	useEffect(() => {
		if (autoComposition) {
			const videoDetails = getFirstVideoDetails();
			if (videoDetails) {
				const { id, width, height } = videoDetails;
				const orientation = determineOrientation(width, height);
				
				console.log(
					"Auto composition: Analyzing video",
					{ width, height, orientation, id }
				);

				// Get optimal composition dimensions
				const compositionDims = getOptimalCompositionDimensions(width, height);
				
				console.log(
					"Auto composition: Setting composition to",
					compositionDims,
					`for ${orientation} video`
				);

				// Resize the canvas/composition
				dispatch(DESIGN_RESIZE, {
					payload: {
						width: compositionDims.width,
						height: compositionDims.height,
						name: orientation === "horizontal" ? "landscape-auto" : orientation === "vertical" ? "portrait-auto" : "square-auto",
					},
				});

				// Calculate optimal video settings (scale + initial position if needed)
				const videoSettings = calculateVideoSettings(
					width, 
					height, 
					compositionDims.width, 
					compositionDims.height,
					videoDetails.details // Pass current video details to check existing position
				);

				console.log(
					"Auto composition: Applying video settings",
					videoSettings
				);

				// Build the details object - only include positioning if this is initial setup
				const detailsToUpdate: any = {
					width: videoSettings.width,  // Original video dimensions
					height: videoSettings.height, // Original video dimensions
					// Apply uniform scaling to fit composition while preserving aspect ratio
					transform: `scale(${videoSettings.scale})`,
					transformOrigin: "center center",
					// Reset any conflicting scale properties
					scaleX: undefined,
					scaleY: undefined,
					// Ensure video object-fit behavior
					objectFit: "contain" // Ensure video fits within bounds without distortion
				};

				// Only set position for initial placement - preserve user positioning otherwise
				if (videoSettings.shouldSetInitialPosition) {
					detailsToUpdate.left = videoSettings.left;
					detailsToUpdate.top = videoSettings.top;
					console.log("Auto composition: Setting initial center position", {
						left: videoSettings.left,
						top: videoSettings.top
					});
				} else {
					console.log("Auto composition: Preserving user's current position", {
						left: videoSettings.left,
						top: videoSettings.top
					});
				}

				// Apply the video settings
				dispatch(EDIT_OBJECT, {
					payload: {
						[id]: {
							details: detailsToUpdate,
						},
					},
				});

			} else {
				console.log("Auto composition: No video found in composition");
			}
		}
	}, [autoComposition, trackItemsMap]);

	return {
		getFirstVideoDetails,
		determineOrientation,
		getOptimalCompositionDimensions,
		calculateVideoSettings,
	};
};
