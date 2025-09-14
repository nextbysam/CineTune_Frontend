import { ScrollArea } from "@/components/ui/scroll-area";
import { IBoxShadow, ITrackItem, IVideo } from "@designcombo/types";
import Outline from "./common/outline";
import Shadow from "./common/shadow";
import Opacity from "./common/opacity";
import Rounded from "./common/radius";
import AspectRatio from "./common/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Crop } from "lucide-react";
import Volume from "./common/volume";
import React, { useEffect, useState } from "react";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT, ADD_TEXT } from "@designcombo/state";
import Speed from "./common/speed";
import useLayoutStore from "../store/use-layout-store";
import { Label } from "@/components/ui/label";
import Squantre from "./common/squantre";
import useStore from "../store/use-store";
import { generateId } from "@designcombo/timeline";
import {
	getSelectedVideoOrder,
	findVideoTrackLocation,
	calculateSquantreTrackPlacement,
	calculateCompositionPlacementBelowVideo,
	logVideoTimelinePosition,
	analyzeVideoTimelinePosition,
	swapTracks,
	validateTrackOperation,
} from "../utils/track-items";

const BasicVideo = ({
	trackItem,
	type,
}: {
	trackItem: ITrackItem & IVideo;
	type?: string;
}) => {
	const showAll = !type;
	const [properties, setProperties] = useState(trackItem);
	const { setCropTarget } = useLayoutStore();
	const { size } = useStore(); // Get canvas/composition size

	// Track muted state - consider video muted if volume is 0 and muted flag is set
	const isMuted =
		(properties.details as any).muted === true ||
		(properties.details.volume === 0 &&
			(properties.details as any).muted !== false);

	const handleChangeVolume = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						volume: v,
						// Clear muted flag when volume is manually changed
						...(v === 0 ? { muted: true } : { muted: false }),
					},
				},
			},
		});

		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					volume: v,
					...(v === 0 ? { muted: true } : { muted: false }),
				},
			};
		});
	};

	const handleMuteToggle = (muted: boolean) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						...trackItem.details,
						muted: muted,
					} as any,
				},
			},
		});

		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					muted: muted,
				} as any,
			};
		});
	};

	const onChangeBorderWidth = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						borderWidth: v,
					},
				},
			},
		});
		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					borderWidth: v,
				},
			};
		});
	};

	const onChangeBorderColor = (v: string) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						borderColor: v,
					},
				},
			},
		});
		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					borderColor: v,
				},
			};
		});
	};

	const handleChangeOpacity = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						opacity: v,
					},
				},
			},
		});

		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					opacity: v,
				},
			};
		});
	};

	const handleChangeSpeed = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					playbackRate: v,
				},
			},
		});

		setProperties((prev) => {
			return {
				...prev,
				playbackRate: v,
			};
		});
	};

	const onChangeBorderRadius = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						borderRadius: v,
					},
				},
			},
		});
		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					borderRadius: v,
				},
			};
		});
	};

	const onChangeBoxShadow = (v: IBoxShadow) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						boxShadow: v,
					},
				},
			},
		});
		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					boxShadow: v,
				},
			};
		});
	};

	const openCropModal = () => {
		setCropTarget(trackItem);
	};

	// Handle Squantre transformation - make video small rounded square in center with white background
	const handleSquantreToggle = (enabled: boolean) => {
		console.group(
			`🚀 [SQUANTRE ${enabled ? "ENABLE" : "DISABLE"}] Starting transformation`,
		);
		console.time(`SQUANTRE_${enabled ? "ENABLE" : "DISABLE"}_DURATION`);

		const startTime = Date.now();
		const currentState = useStore.getState();

		// Initialize variables outside of conditional blocks to avoid scope issues
		let trackPlacement: ReturnType<
			typeof calculateSquantreTrackPlacement
		> | null = null;
		let needsVideoMove = false;
		let backgroundTrackIndex = -1;
		let videoNewTrackIndex = -1;

		// Comprehensive initial state logging for debugging
		console.log(`📊 [SQUANTRE DEBUG] Initial state capture:`, {
			timestamp: new Date().toISOString(),
			enabled: enabled,
			trackItemId: trackItem.id,
			stateSnapshot: {
				totalTracks: currentState.tracks.length,
				totalItems: Object.keys(currentState.trackItemsMap).length,
				activeIds: currentState.activeIds,
				activeIdsCount: currentState.activeIds.length,
				canvasSize: currentState.size,
				fps: currentState.fps,
				duration: currentState.duration,
			},
		});

		if (enabled) {
			// Get current state for detailed logging and track analysis
			const currentVideo = currentState.trackItemsMap[trackItem.id];
			const { activeIds, tracks, trackItemsMap } = currentState; // Get currently selected items from timeline selection system

			// PHASE 2: VIDEO VALIDATION AND ANALYSIS
			console.log(`🔍 [SQUANTRE DEBUG] Video validation phase:`);

			// Detailed video existence check
			if (!currentVideo) {
				console.error(
					`❌ [SQUANTRE CRITICAL ERROR] Video not found in trackItemsMap:`,
					{
						searchedId: trackItem.id,
						trackItemsMapKeys: Object.keys(trackItemsMap),
						trackItemsMapSize: Object.keys(trackItemsMap).length,
						passedTrackItem: {
							id: trackItem.id,
							type: trackItem.type,
							resourceId: (trackItem as any).resourceId,
						},
						errorCode: "VIDEO_NOT_FOUND_IN_MAP",
					},
				);
				console.groupEnd();
				return;
			}

			// Get the visual order/position of the selected video in the timeline
			let videoOrder: number;
			try {
				videoOrder = getSelectedVideoOrder(trackItem.id, tracks, trackItemsMap);
				console.log(`📍 [SQUANTRE DEBUG] Video order calculation:`, {
					videoId: trackItem.id,
					visualOrder: videoOrder,
					calculationSuccess: true,
				});
			} catch (error) {
				console.error(`❌ [SQUANTRE ERROR] Failed to calculate video order:`, {
					videoId: trackItem.id,
					error: error,
					tracksLength: tracks.length,
					errorCode: "VIDEO_ORDER_CALCULATION_FAILED",
				});
				videoOrder = 0;
			}

			// Selection state validation
			const isVideoSelected = activeIds.includes(trackItem.id);
			console.log(`🎯 [SQUANTRE DEBUG] Selection validation:`, {
				videoId: trackItem.id,
				isVideoSelected: isVideoSelected,
				activeIds: activeIds,
				activeIdsCount: activeIds.length,
				allSelectedTypes: activeIds.map((id) => ({
					id: id,
					type: trackItemsMap[id]?.type,
					exists: !!trackItemsMap[id],
				})),
				selectionValid: isVideoSelected,
			});

			if (!isVideoSelected) {
				console.warn(`⚠️ [SQUANTRE WARNING] Video not in active selection:`, {
					videoId: trackItem.id,
					currentActiveIds: activeIds,
					warningCode: "VIDEO_NOT_IN_ACTIVE_SELECTION",
					continuingAnyway: true,
				});
			}

			// PHASE 3: GEOMETRIC CALCULATIONS AND LAYOUT PLANNING
			console.log(`📐 [SQUANTRE DEBUG] Layout calculation phase:`);

			// Validate canvas size before calculations
			if (!size || size.width <= 0 || size.height <= 0) {
				console.error(`❌ [SQUANTRE CRITICAL ERROR] Invalid canvas size:`, {
					size: size,
					width: size?.width,
					height: size?.height,
					errorCode: "INVALID_CANVAS_SIZE",
				});
				console.groupEnd();
				return;
			}

			// Calculate center position and small square dimensions
			const squareSize = Math.min(size.width, size.height) * 0.25; // 25% of smallest dimension
			const centerX = (size.width - squareSize) / 2;
			const centerY = (size.height - squareSize) / 2;

			console.log(`📐 [SQUANTRE DEBUG] Geometric calculations:`, {
				canvasSize: { width: size.width, height: size.height },
				calculations: {
					smallestDimension: Math.min(size.width, size.height),
					squareSize: squareSize,
					centerX: centerX,
					centerY: centerY,
					squarePercentage: 25,
				},
				validation: {
					squareSizeValid: squareSize > 0,
					centerXValid: centerX >= 0,
					centerYValid: centerY >= 0,
					fitsInCanvas:
						centerX + squareSize <= size.width &&
						centerY + squareSize <= size.height,
				},
			});

			// COMPREHENSIVE VIDEO POSITION ANALYSIS WITH DETAILED LOGGING
			console.log(
				`🎯 [SQUANTRE DEBUG] Starting comprehensive video position analysis:`,
			);

			// Use the new detailed logging function to get complete visibility
			logVideoTimelinePosition(
				trackItem.id,
				tracks,
				trackItemsMap,
				"SQUANTRE_VIDEO_ANALYSIS",
			);

			// Get the full analysis for decision making
			const videoAnalysis = analyzeVideoTimelinePosition(
				trackItem.id,
				tracks,
				trackItemsMap,
			);
			trackPlacement = calculateSquantreTrackPlacement(trackItem.id, tracks);

			// Enhanced logging with comprehensive analysis results
			console.log(`🎯 [SQUANTRE DEBUG] Enhanced Analysis Summary:`, {
				targetVideo: {
					found: videoAnalysis.targetVideo.found,
					trackIndex: videoAnalysis.targetVideo.trackIndex,
					positionInTrack: videoAnalysis.targetVideo.positionInTrack,
					chronologicalOrder: videoAnalysis.statistics.chronologicalVideoOrder,
					timeRange: `${videoAnalysis.targetVideo.timelinePosition.from}ms - ${videoAnalysis.targetVideo.timelinePosition.to}ms`,
				},
				timelineContext: {
					totalTracks: videoAnalysis.statistics.totalTracks,
					totalVideos: videoAnalysis.statistics.totalVideos,
					emptyTracks: videoAnalysis.statistics.emptyTracks,
					videosByTrack: videoAnalysis.statistics.videosByTrack,
				},
				calculatedPlacement: {
					strategy: trackPlacement.strategy,
					reasoning: trackPlacement.reasoning,
					backgroundTrackIndex: trackPlacement.backgroundTrackIndex,
					videoTrackIndex: trackPlacement.videoTrackIndex,
					needsVideoMove: trackPlacement.needsVideoMove,
					isValid: trackPlacement.isValid,
				},
				layerRecommendations: {
					optimal: videoAnalysis.layerPlacement,
					alternatives:
						videoAnalysis.layerPlacement.alternatives.length > 0
							? videoAnalysis.layerPlacement.alternatives
							: "No alternatives available",
				},
				validation: {
					backgroundBelowVideo:
						trackPlacement.backgroundTrackIndex <
						trackPlacement.videoTrackIndex,
					backgroundTrackValid: trackPlacement.backgroundTrackIndex >= 0,
					videoTrackValid: trackPlacement.videoTrackIndex >= 0,
					correctLayerOrder:
						trackPlacement.backgroundTrackIndex <
						trackPlacement.videoTrackIndex,
				},
			});

			// NEW SIMPLIFIED LAYER ORDERING STRATEGY
			// Use the calculated placement strategy directly - video always moves up, background takes original position
			backgroundTrackIndex = trackPlacement.backgroundTrackIndex;
			videoNewTrackIndex = trackPlacement.videoTrackIndex;
			needsVideoMove = trackPlacement.needsVideoMove;

			console.log(`🎯 [SQUANTRE NEW STRATEGY] Simplified layer placement:`, {
				strategy: trackPlacement.strategy,
				currentVideoTrack: trackPlacement.videoCurrentTrackIndex,
				newVideoTrack: videoNewTrackIndex,
				backgroundTrack: backgroundTrackIndex,
				needsVideoMove: needsVideoMove,
				reasoning: trackPlacement.reasoning,
				layerOrderGuaranteed: backgroundTrackIndex < videoNewTrackIndex,
				isValid: trackPlacement.isValid,
				validationError: trackPlacement.validationError || "None",
			});

			// Log comprehensive Squantre activation details
			console.log(
				`🎯 [SQUANTRE ACTIVATION] Starting transformation for selected video:`,
				{
					videoId: trackItem.id,
					videoVisualOrder: videoOrder, // Add visual order to logging
					selectionInfo: {
						isVideoSelected: isVideoSelected,
						currentActiveIds: activeIds,
						allSelectedItems: activeIds.map((id) => ({
							id,
							type: currentState.trackItemsMap[id]?.type,
							resourceId: (currentState.trackItemsMap[id] as any)?.resourceId,
						})),
					},
					currentVideoData: {
						resourceId: (currentVideo as any).resourceId || "unknown",
						display: currentVideo.display,
						position: {
							left: currentVideo.details?.left,
							top: currentVideo.details?.top,
							width: currentVideo.details?.width,
							height: currentVideo.details?.height,
						},
					},
					newTrackStrategy: {
						backgroundTrackIndex: backgroundTrackIndex,
						videoNewTrackIndex: videoNewTrackIndex,
						reasoning: trackPlacement.reasoning,
						layerOrder: `Background (track ${backgroundTrackIndex}) → Video (track ${videoNewTrackIndex}) for proper rendering`,
						strategy: trackPlacement.strategy,
					},
					canvasSize: { width: size.width, height: size.height },
					calculatedSquare: {
						size: squareSize,
						centerX: centerX,
						centerY: centerY,
					},
					totalTracksInTimeline: currentState.tracks.length,
					totalItemsInTimeline: Object.keys(currentState.trackItemsMap).length,
				},
			);

			// PHASE 4: BACKGROUND CREATION PREPARATION
			console.log(`🎨 [SQUANTRE DEBUG] Background creation preparation phase:`);

			// Step 1: Create white background that will be placed on track 0 (bottom layer)
			// The video will then be moved to track 1 to render above it
			let whiteBackgroundId: string;
			let backgroundResourceId: string;
			let backgroundDisplayDuration: number;

			try {
				whiteBackgroundId = generateId();
				backgroundResourceId = `squantre-bg-${trackItem.id}`;
				backgroundDisplayDuration = properties.display?.to || 5000;

				console.log(`🎨 [SQUANTRE DEBUG] Background ID generation:`, {
					whiteBackgroundId: whiteBackgroundId,
					backgroundResourceId: backgroundResourceId,
					backgroundDisplayDuration: backgroundDisplayDuration,
					originalVideoDisplay: properties.display,
					idGenerationSuccess: !!whiteBackgroundId,
					validDuration: backgroundDisplayDuration > 0,
				});
			} catch (error) {
				console.error(
					`❌ [SQUANTRE CRITICAL ERROR] Background preparation failed:`,
					{
						error: error,
						trackItemId: trackItem.id,
						propertiesDisplay: properties.display,
						errorCode: "BACKGROUND_PREPARATION_FAILED",
					},
				);
				console.groupEnd();
				return;
			}

			console.log(
				`🎯 [SQUANTRE BACKGROUND] Creating white background layer at track ${backgroundTrackIndex}:`,
				{
					backgroundId: whiteBackgroundId,
					backgroundResourceId: backgroundResourceId,
					targetTrackIndex: backgroundTrackIndex,
					newStrategy: `Video moves to track ${videoNewTrackIndex}, background placed at track ${backgroundTrackIndex}`,
					displayTiming: {
						from: 0,
						to: backgroundDisplayDuration,
						duration: backgroundDisplayDuration + "ms",
					},
					dimensions: {
						left: 0,
						top: 0,
						width: size.width,
						height: size.height,
					},
					styling: {
						backgroundColor: "#ffffff",
						textColor: "rgba(255, 255, 255, 0)",
						fontSize: size.height,
						opacity: 100,
					},
					metadata: {
						squantreBackground: true,
						squantreVideoId: trackItem.id,
						linkedToSelectedVideo: true,
					},
				},
			);

			// PHASE 5: BACKGROUND DISPATCH WITH ERROR HANDLING
			console.log(`🚀 [SQUANTRE DEBUG] Dispatching background creation:`);

			const backgroundPayload = {
				id: whiteBackgroundId,
				type: "text",
				resourceId: backgroundResourceId,
				display: {
					from: 0,
					to: backgroundDisplayDuration,
				},
				details: {
					text: " ",
					left: 0,
					top: 0,
					width: size.width,
					height: size.height,
					backgroundColor: "#ffffff",
					color: "rgba(255, 255, 255, 0)",
					fontSize: size.height,
					fontFamily: "Arial",
					textAlign: "left",
					lineHeight: "1",
					wordWrap: "normal",
					borderWidth: 0,
					borderColor: "transparent",
					boxShadow: {
						color: "transparent",
						x: 0,
						y: 0,
						blur: 0,
					},
					opacity: 100,
					squantreBackground: true,
					squantreVideoId: trackItem.id,
					linkedToSelectedVideo: true,
				},
			};

			const backgroundOptions = {
				targetTrackIndex: backgroundTrackIndex,
			};

			console.log(`🚀 [SQUANTRE DEBUG] Background dispatch payload:`, {
				dispatchEvent: "ADD_TEXT",
				payload: backgroundPayload,
				options: backgroundOptions,
				trackPlacement: {
					intendedBackgroundTrack: backgroundTrackIndex,
					intendedVideoTrack: videoNewTrackIndex,
					layerOrderCorrect: backgroundTrackIndex < videoNewTrackIndex,
					currentVideoTrackIndex: trackPlacement.videoCurrentTrackIndex,
					moveVideoRequired: needsVideoMove,
				},
				payloadValidation: {
					hasId: !!backgroundPayload.id,
					hasResourceId: !!backgroundPayload.resourceId,
					validDisplay:
						backgroundPayload.display.from >= 0 &&
						backgroundPayload.display.to > 0,
					validDimensions:
						backgroundPayload.details.width > 0 &&
						backgroundPayload.details.height > 0,
					correctBackgroundColor:
						backgroundPayload.details.backgroundColor === "#ffffff",
					hasSquantreMetadata:
						backgroundPayload.details.squantreBackground === true,
					targetTrackIndexIsValid:
						typeof backgroundTrackIndex === "number" &&
						backgroundTrackIndex >= 0,
				},
			});

			// CRITICAL: Ensure we're adding the background to the correct track position
			console.log(
				`🎯 [SQUANTRE CRITICAL] Final layer ordering validation before dispatch:`,
				{
					backgroundTrackIndex: backgroundTrackIndex,
					videoNewTrackIndex: videoNewTrackIndex,
					isValidLayerOrder: backgroundTrackIndex < videoNewTrackIndex,
					backgroundTrackIsNonNegative: backgroundTrackIndex >= 0,
					videoTrackIsNonNegative: videoNewTrackIndex >= 0,
					currentTimelineState: {
						totalTracks: tracks.length,
						tracksBeforeBackground: tracks.length,
						willCreateNewTrackForBackground:
							backgroundTrackIndex >= tracks.length,
					},
				},
			);

			try {
				dispatch(ADD_TEXT, {
					payload: backgroundPayload,
					options: backgroundOptions,
				});

				console.log(`✅ [SQUANTRE DEBUG] Background dispatch successful:`, {
					dispatchedAt: Date.now(),
					backgroundId: whiteBackgroundId,
					targetTrack: backgroundTrackIndex,
					dispatchSuccess: true,
				});
			} catch (error) {
				console.error(
					`❌ [SQUANTRE CRITICAL ERROR] Background dispatch failed:`,
					{
						error: error,
						payload: backgroundPayload,
						options: backgroundOptions,
						errorCode: "BACKGROUND_DISPATCH_FAILED",
					},
				);
				console.groupEnd();
				return;
			}

			// PHASE 6: BACKGROUND VERIFICATION WITH COMPREHENSIVE STATE ANALYSIS
			setTimeout(() => {
				console.log(`🔍 [SQUANTRE DEBUG] Phase 6 - Background verification:`);

				const updatedState = useStore.getState();
				const backgroundItem = updatedState.trackItemsMap[whiteBackgroundId];

				console.log(`🔍 [SQUANTRE DEBUG] State after background creation:`, {
					verificationDelay: "100ms",
					stateTimestamp: Date.now(),
					searchingForId: whiteBackgroundId,
					backgroundFound: !!backgroundItem,
					totalTracksAfterAdd: updatedState.tracks.length,
					totalItemsAfterAdd: Object.keys(updatedState.trackItemsMap).length,
					allItemIds: Object.keys(updatedState.trackItemsMap),
				});

				if (backgroundItem) {
					const backgroundTrackIndex = updatedState.tracks.findIndex((track) =>
						track.items.some((item) => (item as any).id === whiteBackgroundId),
					);

					console.log(`✅ [SQUANTRE DEBUG] Background verification SUCCESS:`, {
						backgroundId: whiteBackgroundId,
						foundInTrackIndex: backgroundTrackIndex,
						expectedTrackIndex: backgroundTrackIndex,
						indexMatches: backgroundTrackIndex === backgroundTrackIndex,
						backgroundItem: {
							id: backgroundItem.id,
							type: backgroundItem.type,
							resourceId: (backgroundItem as any).resourceId,
							display: backgroundItem.display,
							details: {
								text: backgroundItem.details?.text,
								backgroundColor: backgroundItem.details?.backgroundColor,
								width: backgroundItem.details?.width,
								height: backgroundItem.details?.height,
								squantreBackground: (backgroundItem.details as any)
									?.squantreBackground,
								squantreVideoId: (backgroundItem.details as any)
									?.squantreVideoId,
								linkedToSelectedVideo: (backgroundItem.details as any)
									?.linkedToSelectedVideo,
							},
						},
						trackAnalysis:
							backgroundTrackIndex >= 0
								? {
										trackIndex: backgroundTrackIndex,
										trackData: updatedState.tracks[backgroundTrackIndex],
										itemsInTrack:
											updatedState.tracks[backgroundTrackIndex]?.items,
										trackResourceId:
											(updatedState.tracks[backgroundTrackIndex] as any)?.resourceId,
									}
								: null,
						stateHealth: {
							tracksValid: Array.isArray(updatedState.tracks),
							trackItemsMapValid:
								typeof updatedState.trackItemsMap === "object",
							backgroundProperlyLinked:
								(backgroundItem.details as any)?.squantreVideoId ===
								trackItem.id,
						},
					});
				} else {
					console.error(
						`❌ [SQUANTRE CRITICAL ERROR] Background verification FAILED:`,
						{
							searchedId: whiteBackgroundId,
							backgroundFound: false,
							errorCode: "BACKGROUND_NOT_CREATED",
							debugInfo: {
								availableIds: Object.keys(updatedState.trackItemsMap),
								tracksCount: updatedState.tracks.length,
								tracksStructure: updatedState.tracks.map((track, idx) => ({
									trackIndex: idx,
									resourceId: (track as any).resourceId,
									itemCount: track.items.length,
									itemIds: track.items,
								})),
								possibleCauses: [
									"Dispatch failed silently",
									"State update not yet processed",
									"ID generation collision",
									"Track index out of bounds",
									"ADD_TEXT event not handled properly",
								],
							},
						},
					);
				}
			}, 100);

			// PHASE 7: VIDEO TRANSFORMATION PREPARATION
			console.log(
				`🎬 [SQUANTRE DEBUG] Phase 7 - Video transformation preparation:`,
			);

			const originalVideoState = {
				left: properties.details?.left,
				top: properties.details?.top,
				width: properties.details?.width,
				height: properties.details?.height,
				borderRadius: properties.details?.borderRadius,
				objectFit: (properties.details as any)?.objectFit,
				squantre: (properties.details as any)?.squantre,
			};

			const targetVideoState = {
				left: centerX,
				top: centerY,
				width: squareSize,
				height: squareSize,
				borderRadius: 25,
				objectFit: "cover",
				squantre: true,
				squantreBackgroundId: whiteBackgroundId,
			};

			console.log(`🎬 [SQUANTRE DEBUG] Video transformation analysis:`, {
				videoId: trackItem.id,
				transformationType: "ENABLE_SQUANTRE",
				selectionContext: {
					wasSelected: isVideoSelected,
					fromActiveIds: activeIds.includes(trackItem.id),
					activeIdsSnapshot: activeIds,
				},
				transformation: {
					from: originalVideoState,
					to: targetVideoState,
					changeAnalysis: {
						positionChanged:
							originalVideoState.left !== targetVideoState.left ||
							originalVideoState.top !== targetVideoState.top,
						sizeChanged:
							originalVideoState.width !== targetVideoState.width ||
							originalVideoState.height !== targetVideoState.height,
						radiusChanged:
							originalVideoState.borderRadius !== targetVideoState.borderRadius,
						objectFitChanged:
							originalVideoState.objectFit !== targetVideoState.objectFit,
						wasAlreadySquantre: originalVideoState.squantre === true,
					},
				},
				trackMovement: {
					strategy: trackPlacement.strategy,
					targetTrackIndex: videoNewTrackIndex,
					backgroundTrackIndex: backgroundTrackIndex,
					needsVideoMove: needsVideoMove,
					currentTrackIndex: trackPlacement.videoCurrentTrackIndex,
					layerOrderingCorrect: videoNewTrackIndex > backgroundTrackIndex,
				},
				validation: {
					centerXValid: !isNaN(centerX) && centerX >= 0,
					centerYValid: !isNaN(centerY) && centerY >= 0,
					squareSizeValid: !isNaN(squareSize) && squareSize > 0,
					backgroundIdValid: !!whiteBackgroundId,
				},
			});

			// PHASE 8: VIDEO DISPATCH WITH ERROR HANDLING
			console.log(
				`🚀 [SQUANTRE DEBUG] Phase 8 - Video transformation dispatch:`,
			);

			// Transform video and move it above the background track for proper layering
			const videoEditPayload: any = {
				[trackItem.id]: {
					details: {
						left: centerX,
						top: centerY,
						width: squareSize,
						height: squareSize,
						borderRadius: 25,
						transform: "none",
						objectFit: "cover",
						squantre: true,
						squantreBackgroundId: whiteBackgroundId,
					},
				},
			};

			// Conditionally move video only if needed for proper layering
			let newVideoResourceId: string | undefined;
			let editOptions: any = {};

			if (needsVideoMove) {
				newVideoResourceId = `squantre-video-above-bg-${trackItem.id}`;
				videoEditPayload[trackItem.id].resourceId = newVideoResourceId;
				editOptions.targetTrackIndex = videoNewTrackIndex;

				console.log(`🚀 [SQUANTRE DEBUG] Video will be moved:`, {
					reason: "Video needs to move for proper layering",
					from: trackPlacement.videoCurrentTrackIndex,
					to: videoNewTrackIndex,
					backgroundAt: backgroundTrackIndex,
					newResourceId: newVideoResourceId,
					layerOrderGuaranteed: backgroundTrackIndex < videoNewTrackIndex,
				});
			} else {
				console.log(
					`🚀 [SQUANTRE DEBUG] Video will stay in current position:`,
					{
						reason: "Current position allows proper layering",
						currentTrack: trackPlacement.videoCurrentTrackIndex,
						backgroundWillBePlacedAt: backgroundTrackIndex,
						layerOrderCorrect:
							trackPlacement.videoCurrentTrackIndex > backgroundTrackIndex,
					},
				);
			}

			console.log(`🚀 [SQUANTRE DEBUG] Video dispatch payload preparation:`, {
				dispatchEvent: "EDIT_OBJECT",
				videoId: trackItem.id,
				willMoveTrack: needsVideoMove,
				newResourceId: newVideoResourceId || "UNCHANGED",
				payload: videoEditPayload,
				options: editOptions,
				payloadValidation: {
					hasVideoId: !!videoEditPayload[trackItem.id],
					hasDetails: !!videoEditPayload[trackItem.id]?.details,
					hasResourceId: !!videoEditPayload[trackItem.id]?.resourceId,
					validPosition:
						videoEditPayload[trackItem.id]?.details?.left >= 0 &&
						videoEditPayload[trackItem.id]?.details?.top >= 0,
					validDimensions:
						videoEditPayload[trackItem.id]?.details?.width > 0 &&
						videoEditPayload[trackItem.id]?.details?.height > 0,
					correctObjectFit:
						videoEditPayload[trackItem.id]?.details?.objectFit === "cover",
					squantreMarked:
						videoEditPayload[trackItem.id]?.details?.squantre === true,
					backgroundLinked:
						videoEditPayload[trackItem.id]?.details?.squantreBackgroundId ===
						whiteBackgroundId,
				},
				optionsValidation: {
					hasTargetTrack: typeof editOptions.targetTrackIndex === "number",
					targetTrackValid:
						typeof editOptions.targetTrackIndex === "number"
							? editOptions.targetTrackIndex >= 0
							: true,
					willChangeTrack: needsVideoMove,
				},
			});

			try {
				dispatch(EDIT_OBJECT, {
					payload: videoEditPayload,
					options: editOptions,
				});

				console.log(`✅ [SQUANTRE DEBUG] Video dispatch successful:`, {
					dispatchedAt: Date.now(),
					videoId: trackItem.id,
					targetTrack: needsVideoMove
						? videoNewTrackIndex
						: trackPlacement.videoCurrentTrackIndex,
					trackChanged: needsVideoMove,
					newResourceId: newVideoResourceId || "UNCHANGED",
					dispatchSuccess: true,
				});
			} catch (error) {
				console.error(`❌ [SQUANTRE CRITICAL ERROR] Video dispatch failed:`, {
					error: error,
					payload: videoEditPayload,
					options: editOptions,
					errorCode: "VIDEO_DISPATCH_FAILED",
				});
				console.groupEnd();
				return;
			}

			setProperties((prev) => ({
				...prev,
				...(newVideoResourceId ? { resourceId: newVideoResourceId } : {}), // Only update resourceId if video moved
				details: {
					...prev.details,
					left: centerX,
					top: centerY,
					width: squareSize,
					height: squareSize,
					borderRadius: 25,
					transform: "none",
					objectFit: "cover",
					squantre: true,
					squantreBackgroundId: whiteBackgroundId,
				} as any,
			}));
		} else {
			// PHASE 1 (DISABLE): DISABLE STATE ANALYSIS AND VALIDATION
			console.log(`🚫 [SQUANTRE DEBUG] Phase 1 - Disable state analysis:`);

			const backgroundId = (properties.details as any).squantreBackgroundId;
			const currentState = useStore.getState();

			console.log(`🚫 [SQUANTRE DEBUG] Disable operation analysis:`, {
				operation: "SQUANTRE_DISABLE",
				videoId: trackItem.id,
				backgroundId: backgroundId,
				hasBackgroundId: !!backgroundId,
				currentVideoState: {
					squantre: (properties.details as any).squantre,
					borderRadius: properties.details?.borderRadius,
					objectFit: (properties.details as any)?.objectFit,
					position: {
						left: properties.details?.left,
						top: properties.details?.top,
						width: properties.details?.width,
						height: properties.details?.height,
					},
					currentResourceId: (properties as any).resourceId,
				},
				stateSnapshot: {
					totalTracks: currentState.tracks.length,
					totalItems: Object.keys(currentState.trackItemsMap).length,
					activeIds: currentState.activeIds,
				},
				validation: {
					videoCurrentlySquantre: (properties.details as any).squantre === true,
					hasLinkedBackground: !!backgroundId,
					canProceedWithCleanup: !!backgroundId,
				},
			});

			if (!backgroundId) {
				console.warn(
					`⚠️ [SQUANTRE WARNING] No background ID found for cleanup:`,
					{
						videoId: trackItem.id,
						warningCode: "NO_BACKGROUND_ID_FOR_CLEANUP",
						possibleCauses: [
							"Video was never squantred",
							"Background was already cleaned up",
							"Background ID was lost during state updates",
							"Invalid squantre state",
						],
						continuingWithVideoReset: true,
					},
				);
			}

			// Remove white background first if it exists
			if (backgroundId) {
				const backgroundItem = currentState.trackItemsMap[backgroundId];

				if (backgroundItem) {
					console.log(`🎯 [SQUANTRE CLEANUP] Removing white background:`, {
						backgroundId: backgroundId,
						backgroundFound: true,
						backgroundData: {
							id: backgroundItem.id,
							type: backgroundItem.type,
							resourceId: (backgroundItem as any).resourceId,
							display: backgroundItem.display,
							details: {
								backgroundColor: backgroundItem.details?.backgroundColor,
								squantreBackground: (backgroundItem.details as any)
									?.squantreBackground,
								squantreVideoId: (backgroundItem.details as any)
									?.squantreVideoId,
							},
						},
					});

					// Use EDIT_OBJECT with undefined to remove the item
					dispatch(EDIT_OBJECT, {
						payload: {
							[backgroundId]: undefined,
						},
					});

					// Verify removal after a delay
					setTimeout(() => {
						const verifyState = useStore.getState();
						const stillExists = verifyState.trackItemsMap[backgroundId];

						if (stillExists) {
							console.warn(
								`⚠️ [SQUANTRE CLEANUP] Background still exists after removal attempt:`,
								{
									backgroundId: backgroundId,
									stillExists: true,
								},
							);
						} else {
							console.log(
								`✅ [SQUANTRE CLEANUP] Background successfully removed:`,
								{
									backgroundId: backgroundId,
									totalItemsAfterRemoval: Object.keys(verifyState.trackItemsMap)
										.length,
								},
							);
						}
					}, 100);
				} else {
					console.warn(
						`⚠️ [SQUANTRE CLEANUP] Background not found in timeline:`,
						{
							searchedId: backgroundId,
							availableIds: Object.keys(currentState.trackItemsMap),
							backgroundFound: false,
						},
					);
				}
			} else {
				console.warn(
					`⚠️ [SQUANTRE CLEANUP] No background ID found in video properties:`,
					{
						videoId: trackItem.id,
						squantreBackgroundId: backgroundId,
					},
				);
			}

			// Reset video properties (remove Squantre effect)
			console.log(`🎯 [SQUANTRE RESET] Resetting video to normal mode:`, {
				videoId: trackItem.id,
				resetProperties: {
					borderRadius: 0,
					squantre: false,
					objectFit: "contain",
					squantreBackgroundId: undefined,
				},
			});

			dispatch(EDIT_OBJECT, {
				payload: {
					[trackItem.id]: {
						details: {
							// Reset border radius
							borderRadius: 0,
							// Remove custom squantre flag
							squantre: false,
							// Reset object fit
							objectFit: "contain",
							// Remove background reference
							squantreBackgroundId: undefined,
							// You could store original dimensions and restore them here
							// For now, we'll leave width/height/position as-is so user can adjust
						},
					},
				},
			});

			setProperties((prev) => ({
				...prev,
				details: {
					...prev.details,
					borderRadius: 0,
					squantre: false,
					objectFit: "contain",
					squantreBackgroundId: undefined,
				} as any,
			}));

			console.log(
				`🎯 [SQUANTRE DISABLE] Squantre deactivation completed for video:`,
				trackItem.id,
			);
		}

		// FINAL PHASE: COMPREHENSIVE STATE VERIFICATION AND COMPLETION LOGGING
		setTimeout(() => {
			console.log(
				`🏁 [SQUANTRE DEBUG] Final phase - Complete state verification:`,
			);
			console.timeEnd(`SQUANTRE_${enabled ? "ENABLE" : "DISABLE"}_DURATION`);

			const finalState = useStore.getState();
			const finalVideo = finalState.trackItemsMap[trackItem.id];

			// Find where the video ended up in the timeline
			const finalVideoTrackIndex = finalState.tracks.findIndex((track) =>
				track.items.some((item) => (item as any).id === trackItem.id),
			);

			// Find any associated background
			const backgroundId = (finalVideo?.details as any)?.squantreBackgroundId;
			const backgroundItem = backgroundId
				? finalState.trackItemsMap[backgroundId]
				: null;
			const backgroundTrackIndex = backgroundItem
				? finalState.tracks.findIndex((track) =>
						track.items.some((item) => (item as any).id === backgroundId),
					)
				: -1;

			const executionTime = Date.now() - startTime;

			// Enhanced operation success validation
			let operationSuccess = false;
			let layerOrderingCorrect = false;

			if (enabled) {
				const videoIsSquantre = (finalVideo?.details as any)?.squantre === true;
				const backgroundExists = !!backgroundId && !!backgroundItem;
				layerOrderingCorrect =
					finalVideoTrackIndex > backgroundTrackIndex &&
					backgroundTrackIndex >= 0;
				operationSuccess =
					videoIsSquantre && backgroundExists && layerOrderingCorrect;
			} else {
				const videoNotSquantre =
					(finalVideo?.details as any)?.squantre !== true;
				const noBackground = !backgroundItem;
				operationSuccess = videoNotSquantre && noBackground;
				layerOrderingCorrect = true; // Not applicable for disable
			}

			console.log(`🔍 [SQUANTRE DEBUG] Operation success analysis:`, {
				enabled: enabled,
				operationSuccess: operationSuccess,
				detailedValidation: enabled
					? {
							videoIsSquantre: (finalVideo?.details as any)?.squantre === true,
							backgroundExists: !!backgroundId && !!backgroundItem,
							layerOrderingCorrect: layerOrderingCorrect,
							finalVideoTrackIndex: finalVideoTrackIndex,
							backgroundTrackIndex: backgroundTrackIndex,
							trackIndexesValid:
								finalVideoTrackIndex >= 0 && backgroundTrackIndex >= 0,
							backgroundBelowVideo: finalVideoTrackIndex > backgroundTrackIndex,
						}
					: {
							videoNotSquantre: (finalVideo?.details as any)?.squantre !== true,
							noBackgroundExists: !backgroundItem,
						},
			});

			console.log(`🏁 [SQUANTRE DEBUG] Final state verification complete:`, {
				operation: enabled ? "ENABLE" : "DISABLE",
				executionTime: `${executionTime}ms`,
				operationSuccess: operationSuccess,
				videoId: trackItem.id,
				finalTimestamp: new Date().toISOString(),
				selectionContext: {
					finalActiveIds: finalState.activeIds,
					videoStillSelected: finalState.activeIds.includes(trackItem.id),
					selectionMaintained: finalState.activeIds.includes(trackItem.id),
				},
				finalVideoState: {
					found: !!finalVideo,
					id: finalVideo?.id,
					type: finalVideo?.type,
					resourceId: (finalVideo as any)?.resourceId,
					trackIndex: finalVideoTrackIndex,
					display: finalVideo?.display,
					squantre: (finalVideo?.details as any)?.squantre,
					squantreBackgroundId: backgroundId,
					position: {
						left: finalVideo?.details?.left,
						top: finalVideo?.details?.top,
						width: finalVideo?.details?.width,
						height: finalVideo?.details?.height,
					},
					styling: {
						borderRadius: finalVideo?.details?.borderRadius,
						objectFit: finalVideo?.details?.objectFit,
						transform: finalVideo?.details?.transform,
					},
					validation: {
						hasValidPosition:
							finalVideo?.details?.left >= 0 && finalVideo?.details?.top >= 0,
						hasValidDimensions:
							finalVideo?.details?.width > 0 && finalVideo?.details?.height > 0,
						correctSquantreState: enabled
							? (finalVideo?.details as any)?.squantre === true
							: (finalVideo?.details as any)?.squantre !== true,
					},
				},
				backgroundState: backgroundItem
					? {
							found: true,
							id: backgroundId,
							type: backgroundItem.type,
							resourceId: (backgroundItem as any).resourceId,
							trackIndex: backgroundTrackIndex,
							display: backgroundItem.display,
							linkedToSelectedVideo: (backgroundItem?.details as any)
								?.linkedToSelectedVideo,
							squantreBackground: (backgroundItem?.details as any)
								?.squantreBackground,
							details: {
								backgroundColor: backgroundItem?.details?.backgroundColor,
								width: backgroundItem?.details?.width,
								height: backgroundItem?.details?.height,
								squantreVideoId: (backgroundItem?.details as any)
									?.squantreVideoId,
							},
							validation: {
								correctBackgroundColor:
									backgroundItem?.details?.backgroundColor === "#ffffff",
								properlyLinked:
									(backgroundItem?.details as any)?.squantreVideoId ===
									trackItem.id,
								correctType: backgroundItem.type === "text",
							},
						}
					: {
							found: false,
							searchedId: backgroundId,
							shouldExist: enabled,
						},
				layerOrder: {
					backgroundTrack: backgroundTrackIndex,
					videoTrack: finalVideoTrackIndex,
					correctLayering: enabled ? layerOrderingCorrect : "N/A (disabled)",
					layerOrderValid: layerOrderingCorrect,
					validation: enabled
						? {
								videoAboveBackground:
									finalVideoTrackIndex > backgroundTrackIndex,
								bothTracksFound:
									finalVideoTrackIndex >= 0 && backgroundTrackIndex >= 0,
								backgroundTrackValid: backgroundTrackIndex >= 0,
								videoTrackValid: finalVideoTrackIndex >= 0,
								expectedBackgroundTrack: trackPlacement?.backgroundTrackIndex,
								expectedVideoTrack: trackPlacement?.videoTrackIndex,
								tracksMatchExpected: {
									background:
										backgroundTrackIndex ===
										trackPlacement?.backgroundTrackIndex,
									video:
										finalVideoTrackIndex === trackPlacement?.videoTrackIndex,
								},
							}
						: null,
				},
				timelineOverview: {
					totalTracks: finalState.tracks.length,
					totalItems: Object.keys(finalState.trackItemsMap).length,
					squantreItemsCount: Object.values(finalState.trackItemsMap).filter(
						(item) =>
							(item.details as any)?.squantre === true ||
							(item.details as any)?.squantreBackground === true,
					).length,
					trackStructure: finalState.tracks.map((track, index) => ({
						trackIndex: index,
						resourceId: (track as any).resourceId,
						itemCount: track.items.length,
						itemIds: track.items,
						hasSquantreBackground: track.items.some(
							(itemId) =>
								(finalState.trackItemsMap[itemId]?.details as any)
									?.squantreBackground === true,
						),
						hasSelectedVideo: track.items.some(
							(itemId) => itemId === trackItem.id,
						),
						hasSquantreVideo: track.items.some(
							(itemId) =>
								(finalState.trackItemsMap[itemId]?.details as any)?.squantre ===
								true,
						),
					})),
				},
				operationSummary: {
					success: operationSuccess,
					enabled: enabled,
					videoTransformed: enabled
						? (finalVideo?.details as any)?.squantre === true
						: (finalVideo?.details as any)?.squantre !== true,
					backgroundHandled: enabled ? !!backgroundItem : !backgroundItem,
					layerOrderCorrect: layerOrderingCorrect,
					trackPlacementStrategy: trackPlacement?.strategy || "UNKNOWN",
					videoMovedAsExpected: enabled
						? needsVideoMove
							? finalVideoTrackIndex === trackPlacement?.videoTrackIndex
							: true
						: true,
					backgroundPlacedCorrectly: enabled
						? backgroundTrackIndex === trackPlacement?.backgroundTrackIndex
						: true,
					criticalIssues: enabled
						? [
								...(!(finalVideo?.details as any)?.squantre
									? ["Video not marked as squantre"]
									: []),
								...(!backgroundItem ? ["Background not created"] : []),
								...(!layerOrderingCorrect ? ["Layer ordering incorrect"] : []),
								...(finalVideoTrackIndex === -1
									? ["Video not found in timeline"]
									: []),
								...(backgroundTrackIndex === -1 && backgroundItem
									? ["Background not found in timeline"]
									: []),
							]
						: [],
					errorCount: 0, // Could be incremented during operation
					warningCount: 0, // Could be incremented during operation
				},
			});

			console.groupEnd();
		}, 200);
	};

	// Handle video order reversal - Swaps track 0 and track 1 videos
	const handleReverseVideoOrder = () => {
		const { tracks, trackItemsMap, setState, timeline } = useStore.getState();

		console.group(`🔄 [VIDEO REORDER] Starting track 0 ↔ track 1 swap`);
		console.time("VIDEO_REORDER_DURATION");

		// DETAILED LOGGING: Show actual tracks structure
		console.log(`📊 [VIDEO REORDER] BEFORE - Complete tracks structure:`, {
			totalTracks: tracks.length,
			tracks: tracks.map((track, index) => ({
				index,
				id: track.id,
				type: track.type,
				itemCount: track.items.length,
				items: track.items,
				accepts: track.accepts,
			})),
		});

		// DETAILED LOGGING: Show actual video items in trackItemsMap
		const track0Items = tracks[0]?.items || [];
		const track1Items = tracks[1]?.items || [];

		console.log(
			`📊 [VIDEO REORDER] BEFORE - Track contents with video details:`,
			{
				track0: {
					itemIds: track0Items,
					videoDetails: track0Items.map((itemId) => {
						const item = trackItemsMap[itemId];
						return item
							? {
									id: itemId,
									type: item.type,
									resourceId: (item as any).resourceId,
									src: item.details?.src || "no-src",
								}
							: `MISSING: ${itemId}`;
					}),
				},
				track1: {
					itemIds: track1Items,
					videoDetails: track1Items.map((itemId) => {
						const item = trackItemsMap[itemId];
						return item
							? {
									id: itemId,
									type: item.type,
									resourceId: (item as any).resourceId,
									src: item.details?.src || "no-src",
								}
							: `MISSING: ${itemId}`;
					}),
				},
			},
		);

		// Validate we have at least 2 tracks
		if (tracks.length < 2) {
			console.log(
				`⚠️ [VIDEO REORDER] Not enough tracks to swap (found ${tracks.length})`,
			);
			console.groupEnd();
			return;
		}

		// Check if both tracks have videos
		const track0HasVideos = track0Items.length > 0;
		const track1HasVideos = track1Items.length > 0;

		if (!track0HasVideos && !track1HasVideos) {
			console.log(`⚠️ [VIDEO REORDER] No videos found on tracks 0 or 1`);
			console.groupEnd();
			return;
		}

		// Validate the swap operation
		const validation = validateTrackOperation(
			"swap",
			{
				sourceIndex: 0,
				targetIndex: 1,
			},
			tracks,
		);

		if (!validation.isValid) {
			console.error(`❌ [VIDEO REORDER] Validation failed:`, validation.error);
			console.groupEnd();
			return;
		}

		console.log(`🔄 [VIDEO REORDER] About to swap track 0 ↔ track 1`);

		try {
			// Perform the swap using our track manipulation system
			const updatedTracks = swapTracks(0, 1, tracks);

			// DETAILED LOGGING: Compare before and after
			console.log(`📊 [VIDEO REORDER] AFTER - Swap function result:`, {
				original: {
					track0Items: tracks[0].items,
					track1Items: tracks[1].items,
				},
				updated: {
					track0Items: updatedTracks[0].items,
					track1Items: updatedTracks[1].items,
				},
				swapOccurred: {
					track0Changed:
						JSON.stringify(tracks[0].items) !==
						JSON.stringify(updatedTracks[0].items),
					track1Changed:
						JSON.stringify(tracks[1].items) !==
						JSON.stringify(updatedTracks[1].items),
				},
			});

			// Check if swapTracks actually changed anything
			const tracksChanged =
				JSON.stringify(tracks) !== JSON.stringify(updatedTracks);
			console.log(
				`🔄 [VIDEO REORDER] Tracks actually changed: ${tracksChanged}`,
			);

			if (!tracksChanged) {
				console.warn(
					`⚠️ [VIDEO REORDER] swapTracks returned identical tracks - no swap occurred!`,
				);
			}

			// UPDATE THE STATEMANAGER: This is what the timeline actually listens to!
			console.log(`🔄 [VIDEO REORDER] Getting StateManager from timeline...`);

			if (timeline && (timeline as any).stateManager) {
				const stateManager = (timeline as any).stateManager;
				console.log(`✅ [VIDEO REORDER] Found StateManager on timeline`);

				try {
					// Update StateManager with the new tracks
					console.log(`🔄 [VIDEO REORDER] Updating StateManager tracks...`);
					stateManager.setState({ tracks: updatedTracks });
					console.log(`✅ [VIDEO REORDER] StateManager updated successfully`);

					// Also update our Zustand store to keep them in sync
					setState({ tracks: updatedTracks });
					console.log(`✅ [VIDEO REORDER] Zustand store updated`);
				} catch (stateManagerError) {
					console.error(
						`❌ [VIDEO REORDER] StateManager update failed:`,
						stateManagerError,
					);

					// Fallback to just updating Zustand store
					console.log(
						`🔄 [VIDEO REORDER] Falling back to Zustand store only...`,
					);
					setState({ tracks: updatedTracks });
				}
			} else {
				console.warn(
					`⚠️ [VIDEO REORDER] No StateManager found on timeline, using fallback...`,
				);

				// Try accessing StateManager from the timeline component or other sources
				const timelineElement =
					document.querySelector("[data-timeline]") ||
					document.querySelector("canvas");
				if (timelineElement) {
					console.log(
						`🔄 [VIDEO REORDER] Found timeline element, checking for StateManager...`,
					);
					// Try to find StateManager reference
				}

				// Fallback: Just update Zustand store and try event dispatching
				setState({ tracks: updatedTracks });

				try {
					const { dispatch } = require("@designcombo/events");
					dispatch("state:changed", { tracks: updatedTracks });
					console.log(
						`✅ [VIDEO REORDER] Fallback: Dispatched state:changed event`,
					);
				} catch (eventError) {
					console.warn(
						`⚠️ [VIDEO REORDER] Fallback event dispatch failed:`,
						(eventError as Error).message,
					);
				}
			}

			// DETAILED LOGGING: Verify both stores were updated
			setTimeout(() => {
				const { tracks: newStateTracks } = useStore.getState();

				// Also check StateManager state if available
				let stateManagerTracks = null;
				if (timeline && (timeline as any).stateManager) {
					try {
						const smState = (timeline as any).stateManager.getState();
						stateManagerTracks = smState.tracks;
					} catch (error) {
						console.log(
							`⚠️ [VIDEO REORDER] Could not read StateManager state:`,
							(error as Error).message,
						);
					}
				}

				console.log(`📊 [VIDEO REORDER] FINAL VERIFICATION:`, {
					zustandUpdated:
						JSON.stringify(tracks) !== JSON.stringify(newStateTracks),
					zustandTracks: {
						track0Items: newStateTracks[0]?.items || [],
						track1Items: newStateTracks[1]?.items || [],
					},
					stateManagerTracks: stateManagerTracks
						? {
								track0Items: stateManagerTracks[0]?.items || [],
								track1Items: stateManagerTracks[1]?.items || [],
								tracksMatch:
									JSON.stringify(newStateTracks) ===
									JSON.stringify(stateManagerTracks),
							}
						: "Not available",
				});
			}, 100);

			console.log(`✅ [VIDEO REORDER] Swap operation completed`);
		} catch (error) {
			console.error(`❌ [VIDEO REORDER] Failed to swap tracks:`, error);
			console.error(`❌ [VIDEO REORDER] Error details:`, {
				error: (error as Error).message,
				stack: (error as Error).stack,
				tracks: tracks.length,
				track0: tracks[0],
				track1: tracks[1],
			});
		}

		console.timeEnd("VIDEO_REORDER_DURATION");
		console.groupEnd();
	};

	useEffect(() => {
		setProperties(trackItem);
	}, [trackItem]);

	const components = [
		{
			key: "crop",
			component: (
				<div className="flex gap-2">
					<div className="flex flex-1 items-center text-sm text-muted-foreground">
						Crop
					</div>
					<Button
						onClick={openCropModal}
						variant="ghost"
						className="flex h-8 w-8 items-center justify-center p-0"
					>
						<Crop className="h-4 w-4" />
					</Button>
				</div>
			),
		},
		{
			key: "basic",
			component: (
				<div className="flex flex-col gap-2">
					<AspectRatio />
					<Volume
						onChange={(v: number) => handleChangeVolume(v)}
						value={properties.details.volume ?? 100}
						isMuted={isMuted}
						onMuteToggle={handleMuteToggle}
					/>
					<Opacity
						onChange={(v: number) => handleChangeOpacity(v)}
						value={properties.details.opacity ?? 100}
					/>
					<Speed
						value={properties.playbackRate ?? 1}
						onChange={handleChangeSpeed}
					/>
					<Squantre
						value={(properties.details as any).squantre ?? false}
						onChange={handleSquantreToggle}
					/>
					<div className="flex flex-col gap-3">
						<Label className="text-text-primary text-xs font-medium">
							Test Controls
						</Label>
						<Button
							onClick={handleReverseVideoOrder}
							variant="outline"
							size="sm"
							className="w-full"
						>
							🔄 Reverse Video Order
						</Button>
					</div>
					<Rounded
						onChange={(v: number) => onChangeBorderRadius(v)}
						value={properties.details.borderRadius as number}
					/>
				</div>
			),
		},

		{
			key: "outline",
			component: (
				<Outline
					onChageBorderWidth={(v: number) => onChangeBorderWidth(v)}
					onChangeBorderColor={(v: string) => onChangeBorderColor(v)}
					valueBorderWidth={properties.details.borderWidth as number}
					valueBorderColor={properties.details.borderColor as string}
					label="Outline"
				/>
			),
		},
		{
			key: "shadow",
			component: (
				<Shadow
					onChange={(v: IBoxShadow) => onChangeBoxShadow(v)}
					value={
						properties.details.boxShadow ?? {
							color: "transparent",
							x: 0,
							y: 0,
							blur: 0,
						}
					}
					label="Shadow"
				/>
			),
		},
	];

	return (
		<div className="flex flex-1 flex-col">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
				Video
			</div>
			<ScrollArea className="h-full">
				<div className="flex flex-col gap-2 px-4 py-4">
					{components
						.filter((comp) => showAll || comp.key === type)
						.map((comp) => (
							<React.Fragment key={comp.key}>{comp.component}</React.Fragment>
						))}
				</div>
			</ScrollArea>
		</div>
	);
};

export default BasicVideo;
