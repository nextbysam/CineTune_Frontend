import {
	ITrackItemsMap,
	ITransition,
	ITrackItem,
	ITrack,
} from "@designcombo/types";

type GroupElement = ITrackItem | ITransition;

export const groupTrackItems = (data: {
	trackItemIds: string[];
	transitionsMap: Record<string, ITransition>;
	trackItemsMap: ITrackItemsMap;
}): GroupElement[][] => {
	const { trackItemIds, transitionsMap, trackItemsMap } = data;

	// Create a map to track which items are part of transitions
	const itemTransitionMap = new Map<string, ITransition[]>();

	// Initialize transition maps
	Object.values(transitionsMap).forEach((transition) => {
		const { fromId, toId, kind } = transition;
		if (kind === "none") return; // Skip transitions of kind 'none'
		if (!itemTransitionMap.has(fromId)) itemTransitionMap.set(fromId, []);
		if (!itemTransitionMap.has(toId)) itemTransitionMap.set(toId, []);
		itemTransitionMap.get(fromId)?.push(transition);
		itemTransitionMap.get(toId)?.push(transition);
	});

	const groups: GroupElement[][] = [];
	const processed = new Set<string>();

	// Helper function to build a connected group starting from an item
	const buildGroup = (startItemId: string): GroupElement[] => {
		const group: GroupElement[] = [];
		let currentId = startItemId;

		while (currentId) {
			if (processed.has(currentId)) break;

			processed.add(currentId);
			const currentItem = trackItemsMap[currentId];
			group.push(currentItem);

			// Find transition from this item
			const transition = Object.values(transitionsMap).find(
				(t) => t.fromId === currentId && t.kind !== "none", // Filter here
			);
			if (!transition) break;

			group.push(transition);
			currentId = transition.toId;
		}

		return group;
	};

	// Process all items
	for (const itemId of trackItemIds) {
		if (processed.has(itemId)) continue;

		// If item is not part of any transition or is the start of a sequence
		if (
			!itemTransitionMap.has(itemId) ||
			!Object.values(transitionsMap).some((t) => t.toId === itemId)
		) {
			const group = buildGroup(itemId);
			if (group.length > 0) {
				groups.push(group);
			}
		}
	}

	// Sort items within each group by display.from
	groups.forEach((group) => {
		group.sort((a, b) => {
			if ("display" in a && "display" in b) {
				return a.display.from - b.display.from;
			}
			return 0;
		});
	});

	return groups;
};

/**
 * Gets the visual order/position of a selected video item in the timeline.
 * Videos are ordered by their start time (display.from) across all tracks.
 *
 * @param selectedVideoId - The ID of the selected video
 * @param tracks - Array of timeline tracks
 * @param trackItemsMap - Map of track items by ID
 * @returns The visual position (1-based) of the video, or 0 if not found
 *
 * @example
 * // If there are 3 videos starting at times [0ms, 1000ms, 2000ms]
 * // and you select the second video:
 * getSelectedVideoOrder("video2", tracks, trackItemsMap) // returns 2
 */
/**
 * Provides comprehensive logging and analysis of video positioning on the timeline.
 * This function gives detailed visibility into where videos are located and how
 * layers should be arranged for proper ordering.
 *
 * @param videoId - The ID of the video to analyze
 * @param tracks - Array of timeline tracks
 * @param trackItemsMap - Map of track items by ID
 * @returns Detailed analysis object with positioning information
 */
export const analyzeVideoTimelinePosition = (
	videoId: string,
	tracks: ITrack[],
	trackItemsMap: ITrackItemsMap,
): {
	// Target video analysis
	targetVideo: {
		id: string;
		found: boolean;
		trackIndex: number;
		positionInTrack: number;
		timelinePosition: {
			from: number;
			to: number;
			duration: number;
		};
		type: string;
		resourceId?: string;
	};
	// All videos context
	allVideosOnTimeline: Array<{
		id: string;
		trackIndex: number;
		positionInTrack: number;
		timelinePosition: { from: number; to: number; duration: number };
		type: string;
		resourceId?: string;
		isTarget: boolean;
	}>;
	// Track structure analysis
	trackStructure: Array<{
		trackIndex: number;
		trackId: string;
		totalItems: number;
		videoItems: number;
		hasTargetVideo: boolean;
		availableForBackground: boolean;
		itemIds: string[];
	}>;
	// Layer placement recommendations
	layerPlacement: {
		optimalBackgroundTrack: number;
		optimalVideoTrack: number;
		strategy: string;
		reasoning: string;
		wouldRequireVideoMove: boolean;
		alternatives: Array<{
			backgroundTrack: number;
			videoTrack: number;
			strategy: string;
			pros: string[];
			cons: string[];
		}>;
	};
	// Timeline statistics
	statistics: {
		totalTracks: number;
		totalItems: number;
		totalVideos: number;
		emptyTracks: number;
		videosByTrack: Record<number, number>;
		chronologicalVideoOrder: number; // 1-based position by start time
	};
} => {
	// Initialize analysis object
	const analysis = {
		targetVideo: {
			id: videoId,
			found: false,
			trackIndex: -1,
			positionInTrack: -1,
			timelinePosition: { from: 0, to: 0, duration: 0 },
			type: "unknown",
			resourceId: undefined,
		},
		allVideosOnTimeline: [] as any[],
		trackStructure: [] as any[],
		layerPlacement: {
			optimalBackgroundTrack: 0,
			optimalVideoTrack: 1,
			strategy: "UNKNOWN",
			reasoning: "",
			wouldRequireVideoMove: false,
			alternatives: [],
		},
		statistics: {
			totalTracks: tracks.length,
			totalItems: Object.keys(trackItemsMap).length,
			totalVideos: 0,
			emptyTracks: 0,
			videosByTrack: {},
			chronologicalVideoOrder: 0,
		},
	};

	// Analyze track structure and collect all videos
	tracks.forEach((track, trackIndex) => {
		const trackVideos: any[] = [];
		const allTrackItems: any[] = [];

		track.items.forEach((itemId, positionInTrack) => {
			const item = trackItemsMap[itemId];
			if (!item) return;

			allTrackItems.push({
				id: itemId,
				type: item.type,
				positionInTrack,
			});

			if (item.type === "video") {
				const videoInfo = {
					id: itemId,
					trackIndex,
					positionInTrack,
					timelinePosition: {
						from: item.display.from,
						to: item.display.to,
						duration: item.display.to - item.display.from,
					},
					type: item.type,
					resourceId: (item as any).resourceId,
					isTarget: itemId === videoId,
				};

				trackVideos.push(videoInfo);
				analysis.allVideosOnTimeline.push(videoInfo);

				// Check if this is our target video
				if (itemId === videoId) {
					analysis.targetVideo = {
						id: videoId,
						found: true,
						trackIndex,
						positionInTrack,
						timelinePosition: videoInfo.timelinePosition,
						type: item.type,
						resourceId: (item as any).resourceId,
					};
				}
			}
		});

		// Analyze track structure
		analysis.trackStructure.push({
			trackIndex,
			trackId: track.id || `track-${trackIndex}`,
			totalItems: track.items.length,
			videoItems: trackVideos.length,
			hasTargetVideo: trackVideos.some((v) => v.id === videoId),
			availableForBackground:
				track.items.length === 0 ||
				trackIndex < analysis.targetVideo.trackIndex,
			itemIds: track.items,
		});

		// Update statistics
		(analysis.statistics.videosByTrack as any)[trackIndex] = trackVideos.length;
		analysis.statistics.totalVideos += trackVideos.length;
		if (track.items.length === 0) {
			analysis.statistics.emptyTracks++;
		}
	});

	// Calculate chronological video order
	const sortedVideos = analysis.allVideosOnTimeline.sort(
		(a, b) => a.timelinePosition.from - b.timelinePosition.from,
	);
	const chronologicalIndex = sortedVideos.findIndex((v) => v.id === videoId);
	analysis.statistics.chronologicalVideoOrder =
		chronologicalIndex !== -1 ? chronologicalIndex + 1 : 0;

	// Calculate optimal layer placement using new strategy:
	// Video moves to currentTrackIndex + 1, background takes original position
	if (analysis.targetVideo.found) {
		const currentTrack = analysis.targetVideo.trackIndex;

		// NEW STRATEGY: Always shift video up and place background in original position
		const newVideoTrack = currentTrack + 1;
		const backgroundTrack = currentTrack; // Background takes video's original position

		(analysis as any).layerPlacement = {
			optimalBackgroundTrack: backgroundTrack,
			optimalVideoTrack: newVideoTrack,
			strategy: "SHIFT_VIDEO_UP_PLACE_BACKGROUND_IN_ORIGINAL",
			reasoning: `Video at track ${currentTrack} will move to track ${newVideoTrack}. Background will be placed at track ${backgroundTrack} (video's original position) for proper layering.`,
			wouldRequireVideoMove: true, // Always requires video move with new strategy
			alternatives: [
				{
					backgroundTrack: currentTrack - 1,
					videoTrack: currentTrack,
					strategy: "LEGACY_PLACE_BACKGROUND_BELOW",
					pros: ["Video stays in place", "Minimal track changes"],
					cons: [
						"Background at negative track if video at track 0",
						"Less predictable for track 0 videos",
					],
				},
			],
		};
	} else {
		// Video not found - fallback strategy
		analysis.layerPlacement = {
			optimalBackgroundTrack: 0,
			optimalVideoTrack: 1,
			strategy: "FALLBACK_FIXED_TRACKS",
			reasoning:
				"Video not found on timeline. Using fallback: background at track 0, video at track 1.",
			wouldRequireVideoMove: true,
			alternatives: [],
		};
	}

	return analysis;
};

export const getSelectedVideoOrder = (
	selectedVideoId: string,
	tracks: ITrack[],
	trackItemsMap: ITrackItemsMap,
): number => {
	// Use the comprehensive analysis function
	const analysis = analyzeVideoTimelinePosition(
		selectedVideoId,
		tracks,
		trackItemsMap,
	);
	return analysis.statistics.chronologicalVideoOrder;
};

/**
 * Finds the exact track index where a specific video item is currently located.
 * This is crucial for Squantre feature to determine proper background placement.
 *
 * @param videoId - The ID of the video to locate
 * @param tracks - Array of timeline tracks
 * @returns Object containing track information or null if not found
 *
 * @example
 * const location = findVideoTrackLocation("video123", tracks);
 * if (location) {
 *   console.log(`Video is at track ${location.trackIndex}`);
 *   const backgroundTrack = location.trackIndex - 1; // Place background below
 * }
 */
export const findVideoTrackLocation = (
	videoId: string,
	tracks: ITrack[],
): {
	trackIndex: number;
	track: ITrack;
	itemPosition: number;
	hasValidIndex: boolean;
} | null => {
	for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
		const track = tracks[trackIndex];
		const itemPosition = track.items.findIndex((itemId) => itemId === videoId);

		if (itemPosition !== -1) {
			return {
				trackIndex,
				track,
				itemPosition,
				hasValidIndex: trackIndex >= 0 && trackIndex < tracks.length,
			};
		}
	}

	return null;
};

/**
 * Calculates the optimal track indices for Squantre background and video placement.
 * Ensures the background is always placed below the video for proper layer ordering.
 * This function provides strict guarantees about layer ordering.
 *
 * @param videoId - The ID of the video being squantred
 * @param tracks - Array of timeline tracks
 * @returns Object with calculated track indices and placement strategy
 *
 * @example
 * const placement = calculateSquantreTrackPlacement("video123", tracks);
 * // Use placement.backgroundTrackIndex for background
 * // Use placement.videoTrackIndex for video (if video needs to move)
 */
/**
 * Quick utility function for debugging video positions from anywhere in the app.
 * Just call this with a video ID to get comprehensive logging.
 *
 * @param videoId - The video ID to analyze
 * @param context - Optional context string for the logs (default: 'DEBUG')
 *
 * @example
 * // From any component with access to the store:
 * import { quickLogVideoPosition } from '../utils/track-items';
 * import useStore from '../store/use-store';
 *
 * const { tracks, trackItemsMap } = useStore();
 * quickLogVideoPosition('video-123', tracks, trackItemsMap, 'MY_COMPONENT');
 */
export const quickLogVideoPosition = (
	videoId: string,
	tracks: ITrack[],
	trackItemsMap: ITrackItemsMap,
	context: string = "DEBUG",
): void => {
	console.group(`🔍 [${context}] Quick Video Position Check`);
	console.log(`Analyzing video: ${videoId}`);
	logVideoTimelinePosition(videoId, tracks, trackItemsMap, context);
	console.groupEnd();
};

export const calculateSquantreTrackPlacement = (
	videoId: string,
	tracks: ITrack[],
): {
	backgroundTrackIndex: number;
	videoTrackIndex: number;
	videoCurrentTrackIndex: number;
	strategy: string;
	needsVideoMove: boolean;
	reasoning: string;
	isValid: boolean;
	validationError?: string;
} => {
	const currentLocation = findVideoTrackLocation(videoId, tracks);

	if (!currentLocation) {
		// Video not found - use fallback strategy
		const result = {
			backgroundTrackIndex: 0,
			videoTrackIndex: 1,
			videoCurrentTrackIndex: -1,
			strategy: "FALLBACK_FIXED_TRACKS",
			needsVideoMove: true,
			reasoning:
				"Video not found in timeline, using fallback placement: background at track 0, video at track 1",
			isValid: true,
		};
		// Validate the fallback strategy
		if (result.backgroundTrackIndex >= result.videoTrackIndex) {
			result.isValid = false;
			(result as any).validationError =
				"Fallback strategy would place background above or at same level as video";
		}
		return result;
	}

	const currentTrackIndex = currentLocation.trackIndex;

	// NEW STRATEGY: Always shift video up and place background in original position
	const newVideoTrackIndex = currentTrackIndex + 1;
	const backgroundTrackIndex = currentTrackIndex; // Background takes video's original position

	const result = {
		backgroundTrackIndex: backgroundTrackIndex,
		videoTrackIndex: newVideoTrackIndex,
		videoCurrentTrackIndex: currentTrackIndex,
		strategy: "SHIFT_VIDEO_UP_PLACE_BACKGROUND_IN_ORIGINAL",
		needsVideoMove: true, // Always move video with new strategy
		reasoning: `Video at track ${currentTrackIndex} moves to track ${newVideoTrackIndex}. Background placed at track ${backgroundTrackIndex} (video's original position)`,
		isValid: true,
	};

	// Validate the strategy - background track must be below video track
	if (result.backgroundTrackIndex >= result.videoTrackIndex) {
		result.isValid = false;
		(result as any).validationError =
			"Strategy would place background above or at same level as video";
	}

	return result;
};

/**
 * Logs comprehensive video timeline positioning information to console.
 * This function provides detailed visibility for debugging layer placement.
 *
 * @param videoId - The ID of the video to analyze
 * @param tracks - Array of timeline tracks
 * @param trackItemsMap - Map of track items by ID
 * @param context - Optional context string for logging (e.g., "SQUANTRE_DEBUG")
 */
export const logVideoTimelinePosition = (
	videoId: string,
	tracks: ITrack[],
	trackItemsMap: ITrackItemsMap,
	context: string = "VIDEO_POSITION",
): void => {
	const analysis = analyzeVideoTimelinePosition(videoId, tracks, trackItemsMap);

	console.group(`🔍 [${context}] Video Timeline Position Analysis`);

	// Target video details
	console.log(`📍 Target Video Analysis:`, {
		videoId: analysis.targetVideo.id,
		found: analysis.targetVideo.found,
		position: analysis.targetVideo.found
			? {
					trackIndex: analysis.targetVideo.trackIndex,
					positionInTrack: analysis.targetVideo.positionInTrack,
					timeRange: `${analysis.targetVideo.timelinePosition.from}ms - ${analysis.targetVideo.timelinePosition.to}ms`,
					duration: `${analysis.targetVideo.timelinePosition.duration}ms`,
					type: analysis.targetVideo.type,
					resourceId: analysis.targetVideo.resourceId,
				}
			: "VIDEO NOT FOUND",
	});

	// Timeline overview
	console.log(`📊 Timeline Statistics:`, {
		totalTracks: analysis.statistics.totalTracks,
		totalItems: analysis.statistics.totalItems,
		totalVideos: analysis.statistics.totalVideos,
		emptyTracks: analysis.statistics.emptyTracks,
		chronologicalVideoOrder: analysis.statistics.chronologicalVideoOrder,
		videosByTrack: analysis.statistics.videosByTrack,
	});

	// Track structure breakdown
	console.log(`🎬 Track Structure Analysis:`);
	analysis.trackStructure.forEach((track) => {
		console.log(`  Track ${track.trackIndex}:`, {
			id: track.trackId,
			totalItems: track.totalItems,
			videoItems: track.videoItems,
			hasTargetVideo: track.hasTargetVideo,
			availableForBackground: track.availableForBackground,
			itemIds: track.itemIds,
			status:
				track.totalItems === 0
					? "EMPTY"
					: track.hasTargetVideo
						? "CONTAINS_TARGET"
						: track.videoItems > 0
							? "HAS_OTHER_VIDEOS"
							: "NON_VIDEO_CONTENT",
		});
	});

	// All videos context
	if (analysis.allVideosOnTimeline.length > 1) {
		console.log(`🎥 All Videos on Timeline (chronological order):`);
		analysis.allVideosOnTimeline
			.sort((a, b) => a.timelinePosition.from - b.timelinePosition.from)
			.forEach((video, index) => {
				console.log(`  ${index + 1}. ${video.isTarget ? "🎯 " : ""}Video:`, {
					id: video.id,
					trackIndex: video.trackIndex,
					positionInTrack: video.positionInTrack,
					timeRange: `${video.timelinePosition.from}ms - ${video.timelinePosition.to}ms`,
					isTarget: video.isTarget,
					resourceId: video.resourceId,
				});
			});
	}

	// Layer placement recommendations
	console.log(`🎯 Layer Placement Recommendations:`, {
		optimalStrategy: {
			backgroundTrack: analysis.layerPlacement.optimalBackgroundTrack,
			videoTrack: analysis.layerPlacement.optimalVideoTrack,
			strategy: analysis.layerPlacement.strategy,
			reasoning: analysis.layerPlacement.reasoning,
			requiresVideoMove: analysis.layerPlacement.wouldRequireVideoMove,
		},
		alternativeStrategies: analysis.layerPlacement.alternatives,
		validation: {
			layerOrderCorrect:
				analysis.layerPlacement.optimalBackgroundTrack <
				analysis.layerPlacement.optimalVideoTrack,
			backgroundTrackValid: analysis.layerPlacement.optimalBackgroundTrack >= 0,
			videoTrackValid: analysis.layerPlacement.optimalVideoTrack >= 0,
		},
	});

	console.groupEnd();
};

/**
 * Creates a composition item (like text/background) and places it on a specific track
 * below a target video. This includes detailed logging for debugging.
 */
export const calculateCompositionPlacementBelowVideo = (
	targetVideoId: string,
	compositionPayload: any,
	tracks: ITrack[],
	trackItemsMap: ITrackItemsMap,
	options: {
		compositionType?: "background" | "overlay";
		fallbackTrackIndex?: number;
		logContext?: string;
	} = {},
): {
	targetTrackIndex: number;
	videoTrackIndex: number;
	strategy: string;
	reasoning: string;
	isValid: boolean;
	validationError?: string;
	needsVideoMove: boolean;
	videoMoveToTrackIndex?: number;
	analysis: ReturnType<typeof analyzeVideoTimelinePosition>;
} => {
	const {
		compositionType = "background",
		fallbackTrackIndex = 0,
		logContext = "COMPOSITION_PLACEMENT",
	} = options;

	// Get comprehensive analysis with logging
	const analysis = analyzeVideoTimelinePosition(
		targetVideoId,
		tracks,
		trackItemsMap,
	);
	if (logContext) {
		logVideoTimelinePosition(targetVideoId, tracks, trackItemsMap, logContext);
	}

	if (!analysis.targetVideo.found) {
		return {
			targetTrackIndex: fallbackTrackIndex,
			videoTrackIndex: -1,
			strategy: "FALLBACK_VIDEO_NOT_FOUND",
			reasoning: `Video ${targetVideoId} not found on timeline, using fallback track ${fallbackTrackIndex}`,
			isValid: false,
			validationError: "Video not found on timeline",
			needsVideoMove: false,
			analysis,
		};
	}

	const placement = analysis.layerPlacement;

	// For background compositions, use the optimal placement
	if (compositionType === "background") {
		return {
			targetTrackIndex: placement.optimalBackgroundTrack,
			videoTrackIndex: placement.optimalVideoTrack,
			strategy: placement.strategy,
			reasoning: `${placement.reasoning} (background composition)`,
			isValid:
				placement.optimalBackgroundTrack < placement.optimalVideoTrack &&
				placement.optimalBackgroundTrack >= 0,
			needsVideoMove: placement.wouldRequireVideoMove,
			videoMoveToTrackIndex: placement.wouldRequireVideoMove
				? placement.optimalVideoTrack
				: undefined,
			analysis,
		};
	}

	// For overlay compositions, place above video
	if (compositionType === "overlay") {
		const overlayTrackIndex = placement.optimalVideoTrack + 1;
		return {
			targetTrackIndex: overlayTrackIndex,
			videoTrackIndex: placement.optimalVideoTrack,
			strategy: `${placement.strategy}_OVERLAY`,
			reasoning: `${placement.reasoning} (overlay composition above video at track ${overlayTrackIndex})`,
			isValid: true,
			needsVideoMove: placement.wouldRequireVideoMove,
			videoMoveToTrackIndex: placement.wouldRequireVideoMove
				? placement.optimalVideoTrack
				: undefined,
			analysis,
		};
	}

	// Default fallback
	return {
		targetTrackIndex: fallbackTrackIndex,
		videoTrackIndex: placement.optimalVideoTrack,
		strategy: "FALLBACK_UNKNOWN_COMPOSITION_TYPE",
		reasoning: `Unknown composition type '${compositionType}', using fallback track ${fallbackTrackIndex}`,
		isValid: false,
		validationError: `Unknown composition type: ${compositionType}`,
		needsVideoMove: false,
		analysis,
	};
};

/**
 * Analyzes all videos in the timeline and returns their track positions
 * for reordering operations.
 *
 * @param tracks - Timeline tracks array
 * @param trackItemsMap - Track items lookup map
 * @returns Array of video information with track positions
 */
export const getAllVideoPositions = (
	tracks: ITrack[],
	trackItemsMap: ITrackItemsMap,
): Array<{
	videoId: string;
	trackIndex: number;
	positionInTrack: number;
	timeRange: { from: number; to: number };
	resourceId?: string;
}> => {
	const videoPositions: Array<{
		videoId: string;
		trackIndex: number;
		positionInTrack: number;
		timeRange: { from: number; to: number };
		resourceId?: string;
	}> = [];

	tracks.forEach((track, trackIndex) => {
		track.items.forEach((itemId, positionInTrack) => {
			const item = trackItemsMap[itemId];
			if (item && item.type === "video") {
				videoPositions.push({
					videoId: itemId,
					trackIndex,
					positionInTrack,
					timeRange: {
						from: item.display.from,
						to: item.display.to,
					},
					resourceId: (item as any).resourceId,
				});
			}
		});
	});

	// Sort by track index (top to bottom in UI)
	return videoPositions.sort((a, b) => a.trackIndex - b.trackIndex);
};

/**
 * Creates a reversed mapping of video positions for track reordering.
 * Top videos move to bottom tracks and vice versa.
 *
 * @param tracks - Timeline tracks array
 * @param trackItemsMap - Track items lookup map
 * @returns Array of move operations to reverse video order
 */
export const calculateVideoOrderReversal = (
	tracks: ITrack[],
	trackItemsMap: ITrackItemsMap,
): Array<{
	videoId: string;
	currentTrackIndex: number;
	newTrackIndex: number;
	moveRequired: boolean;
	resourceId?: string;
}> => {
	const videoPositions = getAllVideoPositions(tracks, trackItemsMap);

	if (videoPositions.length <= 1) {
		// Not enough videos to reverse
		return videoPositions.map((video) => ({
			videoId: video.videoId,
			currentTrackIndex: video.trackIndex,
			newTrackIndex: video.trackIndex,
			moveRequired: false,
			resourceId: video.resourceId,
		}));
	}

	// Create reversed mapping
	const reversalPlan: Array<{
		videoId: string;
		currentTrackIndex: number;
		newTrackIndex: number;
		moveRequired: boolean;
		resourceId?: string;
	}> = [];

	const trackIndices = videoPositions.map((v) => v.trackIndex);
	const reversedTrackIndices = [...trackIndices].reverse();

	videoPositions.forEach((video, index) => {
		const newTrackIndex = reversedTrackIndices[index];
		reversalPlan.push({
			videoId: video.videoId,
			currentTrackIndex: video.trackIndex,
			newTrackIndex,
			moveRequired: video.trackIndex !== newTrackIndex,
			resourceId: video.resourceId,
		});
	});

	return reversalPlan;
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TRACK INDEX MANIPULATION SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Comprehensive utilities for manipulating track indices to control layering.
 * Track index 0 is the bottom layer, higher indices render on top.
 */

/**
 * Moves an item from one track to another, handling all necessary updates.
 * This is the core function for changing an item's layer position.
 *
 * @param itemId - The ID of the item to move
 * @param targetTrackIndex - The target track index (0 = bottom layer)
 * @param tracks - Current tracks array
 * @param trackItemsMap - Map of track items
 * @returns Updated tracks array with the item moved
 */
export const moveItemToTrack = (
	itemId: string,
	targetTrackIndex: number,
	tracks: ITrack[],
	trackItemsMap: ITrackItemsMap,
): ITrack[] => {
	// Deep clone tracks to avoid mutations
	const newTracks = JSON.parse(JSON.stringify(tracks)) as ITrack[];

	// Find current location of the item
	let sourceTrackIndex = -1;
	let itemPositionInTrack = -1;

	for (let i = 0; i < newTracks.length; i++) {
		const track = newTracks[i];
		const position = track.items.indexOf(itemId);
		if (position !== -1) {
			sourceTrackIndex = i;
			itemPositionInTrack = position;
			break;
		}
	}

	// If item not found, return original tracks
	if (sourceTrackIndex === -1) {
		console.warn(`Item ${itemId} not found in any track`);
		return tracks;
	}

	// If target is same as source, no change needed
	if (sourceTrackIndex === targetTrackIndex) {
		return tracks;
	}

	// Ensure target track exists (create if needed)
	while (newTracks.length <= targetTrackIndex) {
		newTracks.push({
			id: `track-${newTracks.length}`,
			type: "track",
			items: [],
			accepts: ["video", "image"],
			magnetic: true,
		} as any);
	}

	// Remove item from source track
	newTracks[sourceTrackIndex].items.splice(itemPositionInTrack, 1);

	// Add item to target track (maintaining chronological order if needed)
	const item = trackItemsMap[itemId];
	if (item) {
		// Find appropriate position in target track based on time
		const targetTrack = newTracks[targetTrackIndex];
		let insertPosition = targetTrack.items.length;

		for (let i = 0; i < targetTrack.items.length; i++) {
			const existingItem = trackItemsMap[targetTrack.items[i]];
			if (existingItem && existingItem.display.from > item.display.from) {
				insertPosition = i;
				break;
			}
		}

		targetTrack.items.splice(insertPosition, 0, itemId);
	} else {
		// Fallback: add to end if item details not found
		newTracks[targetTrackIndex].items.push(itemId);
	}

	return newTracks;
};

/**
 * Swaps the positions of two tracks, effectively swapping their layer order.
 *
 * @param trackIndex1 - First track index
 * @param trackIndex2 - Second track index
 * @param tracks - Current tracks array
 * @returns Updated tracks array with swapped tracks
 */
export const swapTracks = (
	trackIndex1: number,
	trackIndex2: number,
	tracks: ITrack[],
): ITrack[] => {
	// Validate indices
	if (
		trackIndex1 < 0 ||
		trackIndex1 >= tracks.length ||
		trackIndex2 < 0 ||
		trackIndex2 >= tracks.length ||
		trackIndex1 === trackIndex2
	) {
		return tracks;
	}

	// Deep clone tracks
	const newTracks = [...tracks];

	// Swap the tracks
	[newTracks[trackIndex1], newTracks[trackIndex2]] = [
		newTracks[trackIndex2],
		newTracks[trackIndex1],
	];

	return newTracks;
};

/**
 * Moves a track to a specific index, shifting other tracks as needed.
 *
 * @param sourceIndex - Current track index
 * @param targetIndex - Target track index
 * @param tracks - Current tracks array
 * @returns Updated tracks array with moved track
 */
export const moveTrackToIndex = (
	sourceIndex: number,
	targetIndex: number,
	tracks: ITrack[],
): ITrack[] => {
	// Validate indices
	if (
		sourceIndex < 0 ||
		sourceIndex >= tracks.length ||
		targetIndex < 0 ||
		targetIndex >= tracks.length ||
		sourceIndex === targetIndex
	) {
		return tracks;
	}

	const newTracks = [...tracks];
	const [movedTrack] = newTracks.splice(sourceIndex, 1);
	newTracks.splice(targetIndex, 0, movedTrack);

	return newTracks;
};

/**
 * Moves all items from a source track to a target track.
 * Useful for consolidating tracks or clearing a specific layer.
 *
 * @param sourceTrackIndex - Source track index
 * @param targetTrackIndex - Target track index
 * @param tracks - Current tracks array
 * @param trackItemsMap - Map of track items
 * @returns Updated tracks array
 */
export const moveAllItemsToTrack = (
	sourceTrackIndex: number,
	targetTrackIndex: number,
	tracks: ITrack[],
	trackItemsMap: ITrackItemsMap,
): ITrack[] => {
	if (sourceTrackIndex === targetTrackIndex) return tracks;

	const newTracks = JSON.parse(JSON.stringify(tracks)) as ITrack[];

	// Ensure both tracks exist
	if (
		sourceTrackIndex >= newTracks.length ||
		targetTrackIndex >= newTracks.length
	) {
		return tracks;
	}

	const sourceTrack = newTracks[sourceTrackIndex];
	const targetTrack = newTracks[targetTrackIndex];

	// Combine and sort items by time
	const allItems = [...targetTrack.items, ...sourceTrack.items];
	allItems.sort((a, b) => {
		const itemA = trackItemsMap[a];
		const itemB = trackItemsMap[b];
		if (!itemA || !itemB) return 0;
		return itemA.display.from - itemB.display.from;
	});

	// Update tracks
	targetTrack.items = allItems;
	sourceTrack.items = [];

	return newTracks;
};

/**
 * Inserts a new empty track at a specific index.
 * All tracks at or above this index are shifted up.
 *
 * @param index - Index where to insert the new track
 * @param tracks - Current tracks array
 * @param trackConfig - Optional configuration for the new track
 * @returns Updated tracks array with new track inserted
 */
export const insertTrackAtIndex = (
	index: number,
	tracks: ITrack[],
	trackConfig?: Partial<ITrack>,
): ITrack[] => {
	const newTracks = [...tracks];

	const newTrack: ITrack = {
		id: trackConfig?.id || `track-${Date.now()}`,
		type: trackConfig?.type || "track",
		items: [],
		accepts: trackConfig?.accepts || ["video", "image"],
		magnetic: trackConfig?.magnetic !== undefined ? trackConfig.magnetic : true,
		...trackConfig,
	} as ITrack;

	// Insert at the specified index
	newTracks.splice(Math.max(0, Math.min(index, newTracks.length)), 0, newTrack);

	return newTracks;
};

/**
 * Removes an empty track from the timeline.
 * Only removes tracks that have no items.
 *
 * @param trackIndex - Index of track to remove
 * @param tracks - Current tracks array
 * @returns Updated tracks array with track removed (if it was empty)
 */
export const removeEmptyTrack = (
	trackIndex: number,
	tracks: ITrack[],
): ITrack[] => {
	if (trackIndex < 0 || trackIndex >= tracks.length) {
		return tracks;
	}

	const track = tracks[trackIndex];
	if (track.items.length > 0) {
		console.warn(`Cannot remove track ${trackIndex}: track is not empty`);
		return tracks;
	}

	const newTracks = [...tracks];
	newTracks.splice(trackIndex, 1);
	return newTracks;
};

/**
 * Reorders multiple tracks based on a mapping of old to new indices.
 * Useful for complex reordering operations.
 *
 * @param indexMap - Map of old index to new index
 * @param tracks - Current tracks array
 * @returns Reordered tracks array
 */
export const reorderTracks = (
	indexMap: Map<number, number>,
	tracks: ITrack[],
): ITrack[] => {
	const newTracks = new Array(tracks.length);

	indexMap.forEach((newIndex, oldIndex) => {
		if (
			oldIndex >= 0 &&
			oldIndex < tracks.length &&
			newIndex >= 0 &&
			newIndex < tracks.length
		) {
			newTracks[newIndex] = tracks[oldIndex];
		}
	});

	// Fill any undefined slots with remaining tracks
	return newTracks.filter((track) => track !== undefined);
};

/**
 * Finds the optimal track index for placing an item based on various strategies.
 *
 * @param strategy - Placement strategy ("bottom", "top", "above", "below", "specific")
 * @param tracks - Current tracks array
 * @param referenceItemId - Reference item for "above" or "below" strategies
 * @param specificIndex - Specific index for "specific" strategy
 * @returns Optimal track index
 */
export const findOptimalTrackIndex = (
	strategy: "bottom" | "top" | "above" | "below" | "specific",
	tracks: ITrack[],
	referenceItemId?: string,
	specificIndex?: number,
): number => {
	switch (strategy) {
		case "bottom":
			return 0;

		case "top":
			return Math.max(0, tracks.length - 1);

		case "above":
			if (referenceItemId) {
				const location = findVideoTrackLocation(referenceItemId, tracks);
				if (location) {
					return Math.min(location.trackIndex + 1, tracks.length - 1);
				}
			}
			return tracks.length - 1;

		case "below":
			if (referenceItemId) {
				const location = findVideoTrackLocation(referenceItemId, tracks);
				if (location) {
					return Math.max(0, location.trackIndex - 1);
				}
			}
			return 0;

		case "specific":
			return Math.max(0, Math.min(specificIndex || 0, tracks.length - 1));

		default:
			return 0;
	}
};

/**
 * Validates track index operations before execution.
 *
 * @param operation - Type of operation
 * @param params - Operation parameters
 * @param tracks - Current tracks array
 * @returns Validation result with any error messages
 */
export const validateTrackOperation = (
	operation: "move" | "swap" | "insert" | "remove",
	params: {
		sourceIndex?: number;
		targetIndex?: number;
		itemId?: string;
	},
	tracks: ITrack[],
): { isValid: boolean; error?: string } => {
	const { sourceIndex, targetIndex, itemId } = params;

	switch (operation) {
		case "move":
			if (sourceIndex === undefined || targetIndex === undefined) {
				return { isValid: false, error: "Source and target indices required" };
			}
			if (sourceIndex < 0 || sourceIndex >= tracks.length) {
				return { isValid: false, error: "Invalid source index" };
			}
			if (targetIndex < 0) {
				return { isValid: false, error: "Invalid target index" };
			}
			break;

		case "swap":
			if (sourceIndex === undefined || targetIndex === undefined) {
				return { isValid: false, error: "Both indices required for swap" };
			}
			if (
				sourceIndex < 0 ||
				sourceIndex >= tracks.length ||
				targetIndex < 0 ||
				targetIndex >= tracks.length
			) {
				return { isValid: false, error: "Invalid track indices" };
			}
			break;

		case "remove":
			if (sourceIndex === undefined) {
				return { isValid: false, error: "Track index required" };
			}
			if (sourceIndex < 0 || sourceIndex >= tracks.length) {
				return { isValid: false, error: "Invalid track index" };
			}
			if (tracks[sourceIndex].items.length > 0) {
				return { isValid: false, error: "Cannot remove non-empty track" };
			}
			break;
	}

	return { isValid: true };
};
