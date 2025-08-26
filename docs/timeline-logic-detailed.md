# Timeline Logic - Detailed Documentation

## Overview

The CineTune video editor uses a sophisticated timeline system built on the `@designcombo/timeline` library with custom extensions. The timeline manages tracks, items, and their relationships in a layered canvas-based system.

## Core Architecture

### 1. Timeline Structure

```
Timeline
├── Tracks (Y-axis levels)
│   ├── Track 0 (Main video track)
│   ├── Track 1 (B-roll/Secondary video track)
│   ├── Track 2 (Custom track)
│   ├── Audio Tracks
│   └── Text Tracks
└── Items (X-axis timeline)
    ├── Video Items
    ├── Audio Items
    ├── Image Items
    └── Text Items
```

### 2. Key Components

#### Timeline Canvas (`timeline/timeline.tsx`)
- **Canvas-based rendering** using HTML5 Canvas
- **Viewport management** with scroll and zoom functionality
- **Real-time updates** synchronized with video playback
- **Interactive elements** for drag-and-drop operations

#### Track System (`timeline/items/track.ts`)
- **Track class** extends `@designcombo/timeline` TrackBase
- **Magnetic tracks** that show "Drag and drop media here" when empty
- **Visual feedback** with custom rendering for empty states
- **Track constraints** defined by `acceptsMap` configuration

#### State Management (`store/use-store.ts`)
- **Zustand store** for global timeline state
- **Track items map** for efficient item lookup
- **Scale and zoom** state management
- **Player synchronization** with Remotion player

## Track System Details

### Track Types and Constraints

The timeline uses an `acceptsMap` configuration to define what content types each track accepts:

```typescript
acceptsMap: {
    text: ["text"],
    image: ["image", "video"],
    video: ["video", "image"],
    audio: ["audio"],
    template: ["template"],
    customTrack: ["video", "image"],
    customTrack2: ["video", "image"],
    main: ["video", "image"],
    linealAudioBars: ["audio", "linealAudioBars"],
    radialAudioBars: ["audio", "radialAudioBars"],
    waveAudioBars: ["audio", "waveAudioBars"],
    hillAudioBars: ["audio", "hillAudioBars"],
}
```

### Track Sizes

Different track types have specific height allocations:

```typescript
sizesMap: {
    text: 32,
    audio: 36,
    customTrack: 40,
    customTrack2: 40,
    linealAudioBars: 40,
    radialAudioBars: 40,
    waveAudioBars: 40,
    hillAudioBars: 40,
}
```

## Item Management

### Item Types
- **Video items**: Primary content with video/audio streams
- **Audio items**: Standalone audio content
- **Image items**: Static images with duration
- **Text items**: Overlay text elements
- **Helper items**: Utility items for UI guidance

### Item Properties
Each timeline item contains:
- `id`: Unique identifier
- `type`: Item type (video, audio, image, text)
- `display`: Position and duration (`from`, `to`)
- `details`: Type-specific properties (src, volume, etc.)
- `trackIndex`: Which track the item belongs to

### Item Grouping (`utils/track-items.ts`)
The system groups connected items using transitions:
- **Sequential grouping** for items connected by transitions
- **Transition filtering** (ignores transitions of kind 'none')
- **Automatic sorting** by display.from within groups

## Drag and Drop System

### Drop Target Configuration (`scene/droppable.tsx`)
```typescript
const handleDrop = (draggedData: DraggedData) => {
    const payload = { ...draggedData, id: generateId() };
    switch (draggedData.type) {
        case AcceptedDropTypes.VIDEO:
            dispatch(ADD_VIDEO, { 
                payload,
                options: {
                    targetTrackIndex: 0,  // Configurable track targeting
                    scaleMode: "fit",
                }
            });
            break;
        // ... other types
    }
};
```

### Track Assignment Logic
- **Default placement**: New items go to track 0 by default
- **B-roll assignment**: Sequential B-roll videos get separate tracks
- **Auto-track creation**: System creates new tracks as needed
- **Magnetic attraction**: Empty tracks show visual drop zones

## Timeline Rendering

### Canvas Rendering Pipeline
1. **Viewport calculation** based on scroll and zoom
2. **Track rendering** with proper spacing and heights
3. **Item rendering** with visual representations
4. **Overlay elements** (playhead, ruler, controls)
5. **Interactive elements** (selection, drag handles)

### Performance Optimizations
- **Viewport culling**: Only renders visible items
- **Throttled scroll updates**: Prevents excessive re-renders
- **Canvas object pooling**: Reuses canvas objects
- **Lazy loading**: Loads thumbnails and waveforms on demand

## Synchronization

### Player Integration
- **Frame-accurate positioning** with Remotion player
- **Real-time playhead updates** during playback
- **Seek functionality** from timeline clicks
- **Auto-scroll** to keep playhead visible

### State Synchronization
```typescript
useEffect(() => {
    const position = timeMsToUnits((currentFrame / fps) * 1000, scale.zoom);
    // Update playhead position and handle auto-scroll
}, [currentFrame]);
```

## API Integration

### Adding Items Programmatically
```typescript
// Add video to specific track
dispatch(ADD_VIDEO, {
    payload: {
        id: generateId(),
        type: 'video',
        src: videoUrl,
        trackIndex: 1,
        display: { from: 0, to: 5000 }
    }
});
```

### Track Management
```typescript
// Create new track
const newTrack = {
    id: generateId(),
    type: 'customTrack',
    magnetic: true,
    accepts: ['video', 'image']
};
```

## Error Handling

### Common Issues
- **Overlapping items**: Handled by timeline collision detection
- **Invalid drops**: Prevented by acceptsMap validation
- **Missing media**: Graceful fallback with placeholder content
- **Performance limits**: Automatic optimization for large timelines

### Recovery Mechanisms
- **Auto-save**: Periodic state snapshots
- **Undo/Redo**: State history management
- **Error boundaries**: Prevent complete timeline failure
- **Fallback rendering**: Basic rendering when advanced features fail

## Configuration Options

### Timeline Initialization
```typescript
const timeline = new CanvasTimeline(canvasEl, {
    width: containerWidth,
    height: containerHeight,
    scale: scaleState,
    duration: totalDuration,
    spacing: {
        left: TIMELINE_OFFSET_CANVAS_LEFT,
        right: TIMELINE_OFFSET_CANVAS_RIGHT,
    },
    selectionColor: "rgba(0, 216, 214, 0.1)",
    selectionBorderColor: "rgba(0, 216, 214, 1.0)",
    guideLineColor: "#ffffff",
});
```

### Customization Points
- **Track colors and styling**
- **Item appearance and thumbnails**
- **Selection and highlight colors**
- **Spacing and margins**
- **Animation and transition effects**

---

This timeline system provides a robust foundation for video editing with support for multi-track editing, real-time preview, and complex media relationships.