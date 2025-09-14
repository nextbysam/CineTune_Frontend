# Track Index Manipulation System

**Project**: CineTune Video Editor
**Feature**: Comprehensive Track Index Control for Layer Management
**Date**: 2025-01-14
**Status**: ✅ **IMPLEMENTED**

## Overview

This document describes the robust track index manipulation system that enables programmatic control over track layering in the CineTune video editor. The system leverages the existing track index mechanism where **track index 0 is the bottom layer** and higher indices render on top, providing complete control over visual stacking order.

## Core Concept

In CineTune's timeline system:
- **Track Index = Layer Position** (Z-index)
- **Track 0** = Bottom layer (renders first, appears behind everything)
- **Track 1** = Second layer (renders on top of track 0)
- **Track N** = Top layer (renders last, appears in front)

This natural ordering eliminates the need for a separate Z-index system - we simply manipulate track indices to control layering.

## API Reference

### Core Functions

#### 1. `moveItemToTrack(itemId, targetTrackIndex, tracks, trackItemsMap)`

Moves a single item to a different track, changing its layer position.

```typescript
// Move video to bottom layer (track 0)
const updatedTracks = moveItemToTrack("video-123", 0, tracks, trackItemsMap);

// Move video to top layer
const topIndex = tracks.length - 1;
const updatedTracks = moveItemToTrack("video-123", topIndex, tracks, trackItemsMap);
```

**Features:**
- Maintains chronological ordering within target track
- Creates new tracks if target index doesn't exist
- Returns updated tracks array without mutations

#### 2. `swapTracks(trackIndex1, trackIndex2, tracks)`

Swaps two entire tracks, exchanging their layer positions.

```typescript
// Swap track 0 and track 2 (flip their layers)
const updatedTracks = swapTracks(0, 2, tracks);
```

**Use Case:** Quick layer swapping for A/B comparisons or rapid reordering.

#### 3. `moveTrackToIndex(sourceIndex, targetIndex, tracks)`

Moves a track to a specific index, shifting others as needed.

```typescript
// Move track 3 to position 1 (shifts tracks 1-2 up)
const updatedTracks = moveTrackToIndex(3, 1, tracks);
```

**Use Case:** Precise track positioning with automatic shifting.

#### 4. `moveAllItemsToTrack(sourceTrackIndex, targetTrackIndex, tracks, trackItemsMap)`

Consolidates all items from one track to another.

```typescript
// Move all items from track 2 to track 0
const updatedTracks = moveAllItemsToTrack(2, 0, tracks, trackItemsMap);
```

**Use Case:** Track consolidation or layer merging.

#### 5. `insertTrackAtIndex(index, tracks, trackConfig?)`

Inserts a new empty track at a specific position.

```typescript
// Insert new track at position 1 (shifts existing tracks up)
const updatedTracks = insertTrackAtIndex(1, tracks, {
  accepts: ["video", "image"],
  magnetic: true
});
```

**Use Case:** Creating intermediate layers for complex compositions.

#### 6. `removeEmptyTrack(trackIndex, tracks)`

Removes an empty track from the timeline.

```typescript
// Remove track 2 if it's empty
const updatedTracks = removeEmptyTrack(2, tracks);
```

**Safety:** Only removes tracks with no items.

#### 7. `reorderTracks(indexMap, tracks)`

Reorders multiple tracks based on a mapping.

```typescript
// Complex reordering: 0→2, 1→0, 2→1
const indexMap = new Map([
  [0, 2],
  [1, 0],
  [2, 1]
]);
const updatedTracks = reorderTracks(indexMap, tracks);
```

**Use Case:** Batch reordering operations.

### Helper Functions

#### `findOptimalTrackIndex(strategy, tracks, referenceItemId?, specificIndex?)`

Finds the best track index based on placement strategy.

```typescript
// Place at bottom layer
const bottomIndex = findOptimalTrackIndex("bottom", tracks);

// Place above specific video
const aboveIndex = findOptimalTrackIndex("above", tracks, "video-123");

// Place at specific index
const targetIndex = findOptimalTrackIndex("specific", tracks, null, 3);
```

**Strategies:**
- `"bottom"` - Returns 0 (bottom layer)
- `"top"` - Returns highest track index
- `"above"` - Returns index above reference item
- `"below"` - Returns index below reference item
- `"specific"` - Returns specified index (clamped to valid range)

#### `validateTrackOperation(operation, params, tracks)`

Validates operations before execution.

```typescript
const validation = validateTrackOperation("move", {
  sourceIndex: 0,
  targetIndex: 3
}, tracks);

if (validation.isValid) {
  // Proceed with operation
} else {
  console.error(validation.error);
}
```

## Usage Examples

### Example 1: Bring Video to Front

```typescript
import { moveItemToTrack } from "@/features/editor/utils/track-items";
import useStore from "@/features/editor/store/use-store";

const bringToFront = (videoId: string) => {
  const { tracks, trackItemsMap, setState } = useStore.getState();

  // Move to highest track index (top layer)
  const topTrack = tracks.length - 1;
  const updatedTracks = moveItemToTrack(
    videoId,
    topTrack,
    tracks,
    trackItemsMap
  );

  setState({ tracks: updatedTracks });
};
```

### Example 2: Send Video to Back

```typescript
const sendToBack = (videoId: string) => {
  const { tracks, trackItemsMap, setState } = useStore.getState();

  // Move to track 0 (bottom layer)
  const updatedTracks = moveItemToTrack(
    videoId,
    0,
    tracks,
    trackItemsMap
  );

  setState({ tracks: updatedTracks });
};
```

### Example 3: Layer Video Above Another

```typescript
const layerAbove = (videoId: string, referenceVideoId: string) => {
  const { tracks, trackItemsMap, setState } = useStore.getState();

  // Find optimal position above reference
  const targetIndex = findOptimalTrackIndex(
    "above",
    tracks,
    referenceVideoId
  );

  const updatedTracks = moveItemToTrack(
    videoId,
    targetIndex,
    tracks,
    trackItemsMap
  );

  setState({ tracks: updatedTracks });
};
```

### Example 4: Swap Two Video Layers

```typescript
const swapVideoLayers = (videoId1: string, videoId2: string) => {
  const { tracks, setState } = useStore.getState();

  // Find track indices for both videos
  const location1 = findVideoTrackLocation(videoId1, tracks);
  const location2 = findVideoTrackLocation(videoId2, tracks);

  if (location1 && location2) {
    const updatedTracks = swapTracks(
      location1.trackIndex,
      location2.trackIndex,
      tracks
    );

    setState({ tracks: updatedTracks });
  }
};
```

### Example 5: Create Sandwich Layer Effect

```typescript
const createSandwichEffect = (
  middleVideoId: string,
  topVideoId: string,
  bottomVideoId: string
) => {
  const { tracks, trackItemsMap, setState } = useStore.getState();

  // Ensure we have at least 3 tracks
  let updatedTracks = [...tracks];
  while (updatedTracks.length < 3) {
    updatedTracks = insertTrackAtIndex(updatedTracks.length, updatedTracks);
  }

  // Place videos in sandwich formation
  updatedTracks = moveItemToTrack(bottomVideoId, 0, updatedTracks, trackItemsMap);
  updatedTracks = moveItemToTrack(middleVideoId, 1, updatedTracks, trackItemsMap);
  updatedTracks = moveItemToTrack(topVideoId, 2, updatedTracks, trackItemsMap);

  setState({ tracks: updatedTracks });
};
```

### Example 6: Implement Drag-and-Drop Layer Reordering

```typescript
const handleTrackDrop = (
  draggedItemId: string,
  targetTrackIndex: number
) => {
  const { tracks, trackItemsMap, setState } = useStore.getState();

  // Validate the operation first
  const validation = validateTrackOperation("move", {
    itemId: draggedItemId,
    targetIndex: targetTrackIndex
  }, tracks);

  if (!validation.isValid) {
    console.error("Invalid track operation:", validation.error);
    return;
  }

  // Move item to new track
  const updatedTracks = moveItemToTrack(
    draggedItemId,
    targetTrackIndex,
    tracks,
    trackItemsMap
  );

  setState({ tracks: updatedTracks });
};
```

## Integration with Existing Systems

### With Squantre Effect

The track manipulation system works seamlessly with the Squantre effect:

```typescript
// Ensure white background is below video
const applySquantreWithLayer = (videoId: string) => {
  const { tracks, trackItemsMap } = useStore.getState();

  // Find video location
  const videoLocation = findVideoTrackLocation(videoId, tracks);
  if (!videoLocation) return;

  // Calculate placement ensuring background is below
  const placement = calculateSquantreTrackPlacement(videoId, tracks);

  // If video is at track 0, move it up first
  let updatedTracks = tracks;
  if (videoLocation.trackIndex === 0) {
    updatedTracks = moveItemToTrack(videoId, 1, tracks, trackItemsMap);
  }

  // Now add background at track 0
  // ... (background addition logic)
};
```

### With Timeline UI

Add visual indicators and controls:

```typescript
// Add layer controls to timeline items
const TimelineItemControls = ({ itemId, currentTrackIndex }) => {
  const moveUp = () => {
    const targetIndex = Math.min(currentTrackIndex + 1, maxTracks - 1);
    handleTrackMove(itemId, targetIndex);
  };

  const moveDown = () => {
    const targetIndex = Math.max(0, currentTrackIndex - 1);
    handleTrackMove(itemId, targetIndex);
  };

  return (
    <div className="layer-controls">
      <button onClick={moveUp} disabled={currentTrackIndex === maxTracks - 1}>
        Move Up Layer
      </button>
      <button onClick={moveDown} disabled={currentTrackIndex === 0}>
        Move Down Layer
      </button>
      <span>Layer: {currentTrackIndex}</span>
    </div>
  );
};
```

## Performance Considerations

### Optimization Tips

1. **Batch Operations**: When moving multiple items, collect all changes and update state once:

```typescript
const batchMoveItems = (moves: Array<{itemId: string, targetTrack: number}>) => {
  let updatedTracks = tracks;

  for (const move of moves) {
    updatedTracks = moveItemToTrack(
      move.itemId,
      move.targetTrack,
      updatedTracks,
      trackItemsMap
    );
  }

  setState({ tracks: updatedTracks });
};
```

2. **Validation First**: Always validate before executing:

```typescript
const safeMoveItem = (itemId: string, targetIndex: number) => {
  const validation = validateTrackOperation("move", {
    itemId,
    targetIndex
  }, tracks);

  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  // Proceed with move
  const updatedTracks = moveItemToTrack(itemId, targetIndex, tracks, trackItemsMap);
  setState({ tracks: updatedTracks });

  return { success: true };
};
```

3. **Track Cleanup**: Remove empty tracks periodically:

```typescript
const cleanupEmptyTracks = () => {
  let updatedTracks = [...tracks];

  // Remove empty tracks from top to bottom to maintain indices
  for (let i = updatedTracks.length - 1; i >= 0; i--) {
    if (updatedTracks[i].items.length === 0) {
      updatedTracks = removeEmptyTrack(i, updatedTracks);
    }
  }

  setState({ tracks: updatedTracks });
};
```

## Advanced Patterns

### Pattern 1: Layer Groups

Group related items on adjacent tracks:

```typescript
const createLayerGroup = (itemIds: string[], startTrackIndex: number) => {
  let updatedTracks = tracks;

  itemIds.forEach((itemId, offset) => {
    updatedTracks = moveItemToTrack(
      itemId,
      startTrackIndex + offset,
      updatedTracks,
      trackItemsMap
    );
  });

  return updatedTracks;
};
```

### Pattern 2: Layer Templates

Pre-defined layer arrangements:

```typescript
const applyLayerTemplate = (template: "pip" | "splitscreen" | "overlay") => {
  switch (template) {
    case "pip": // Picture-in-picture
      // Main video on track 0, PIP on track 1
      break;
    case "splitscreen":
      // Videos side-by-side on same track
      break;
    case "overlay":
      // Background on 0, overlay on 1, text on 2
      break;
  }
};
```

### Pattern 3: Smart Layer Assignment

Automatically assign tracks based on content type:

```typescript
const smartLayerAssignment = (itemType: string): number => {
  const layerMap = {
    "background": 0,
    "main-video": 1,
    "b-roll": 2,
    "overlay": 3,
    "text": 4,
    "watermark": 5
  };

  return layerMap[itemType] || 1;
};
```

## Testing Scenarios

### Scenario 1: Basic Layer Swap
```typescript
// Initial: Video A on track 0, Video B on track 1
// Action: Swap layers
// Result: Video B on track 0, Video A on track 1
```

### Scenario 2: Multi-Layer Reorder
```typescript
// Initial: 5 videos on tracks 0-4
// Action: Reverse layer order
// Result: Videos in opposite stacking order
```

### Scenario 3: Dynamic Track Creation
```typescript
// Initial: 2 tracks
// Action: Move item to track 5
// Result: Creates tracks 2-5, item placed on track 5
```

## Troubleshooting

### Common Issues and Solutions

1. **Item not moving**: Check if source and target indices are the same
2. **Track not found**: Validate track index before operation
3. **Items overlapping**: Ensure proper chronological sorting within tracks
4. **Performance lag**: Batch operations instead of individual moves

## Future Enhancements

Potential improvements to consider:

1. **Undo/Redo Support**: Track operation history for reversal
2. **Layer Locking**: Prevent accidental moves of certain tracks
3. **Layer Visibility Toggle**: Show/hide tracks without removing
4. **Layer Blend Modes**: Different compositing modes per track
5. **Layer Effects**: Apply effects to entire tracks

## Conclusion

This track index manipulation system provides complete programmatic control over layer ordering in CineTune. By leveraging the existing track index as the Z-index mechanism, we maintain simplicity while enabling powerful layer management capabilities. The system is:

- **Robust**: Comprehensive validation and error handling
- **Flexible**: Multiple strategies for different use cases
- **Performant**: Optimized for batch operations
- **Extensible**: Easy to add new features and patterns

The implementation respects the existing project structure and integrates seamlessly with current features like Squantre effects and timeline management.