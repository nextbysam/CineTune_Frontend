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
		
		switch (orientation) {
			case "horizontal":
				// For horizontal videos, use standard landscape ratios
				const aspectRatio = videoWidth / videoHeight;
				if (aspectRatio >= 1.77 && aspectRatio <= 1.78) {
					// 16:9 aspect ratio
					return { width: 1920, height: 1080 };
				} else if (aspectRatio >= 1.33 && aspectRatio <= 1.34) {
					// 4:3 aspect ratio
					return { width: 1440, height: 1080 };
				} else {
					// Use video's native dimensions but ensure minimum size
					return {
						width: Math.max(videoWidth, 1280),
						height: Math.max(videoHeight, 720)
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

	// Calculate centered position for video in composition
	const calculateCenteredPosition = (videoWidth: number, videoHeight: number, compositionWidth: number, compositionHeight: number) => {
		// Calculate scale to fit video within composition while maintaining aspect ratio
		const scaleX = compositionWidth / videoWidth;
		const scaleY = compositionHeight / videoHeight;
		const scale = Math.min(scaleX, scaleY); // Use smaller scale to ensure video fits entirely

		// Calculate scaled dimensions
		const scaledWidth = videoWidth * scale;
		const scaledHeight = videoHeight * scale;

		// Calculate centered position
		const centeredX = (compositionWidth - scaledWidth) / 2;
		const centeredY = (compositionHeight - scaledHeight) / 2;

		return {
			left: centeredX,
			top: centeredY,
			width: scaledWidth,
			height: scaledHeight,
			scaleX: scale,
			scaleY: scale
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

				// Calculate centered position for the video
				const centeredPosition = calculateCenteredPosition(
					width, 
					height, 
					compositionDims.width, 
					compositionDims.height
				);

				console.log(
					"Auto composition: Centering video at position",
					centeredPosition
				);

				// Center and scale the video within the composition
				dispatch(EDIT_OBJECT, {
					payload: {
						[id]: {
							details: {
								left: centeredPosition.left,
								top: centeredPosition.top,
								width: centeredPosition.width,
								height: centeredPosition.height,
								scaleX: centeredPosition.scaleX,
								scaleY: centeredPosition.scaleY,
								// Ensure video fills composition appropriately
								transform: `scale(1)`, // Reset any existing transform
								transformOrigin: "center center"
							},
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
		calculateCenteredPosition,
	};
};
