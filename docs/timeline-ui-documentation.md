# Timeline UI Documentation

## Overview
The timeline UI is the core component where users can arrange, edit, and manipulate video and audio elements in the CineTune video editor. It provides a visual representation of the video composition with tracks for different media types and precise time-based editing controls.

## Architecture

### Main Components

#### 1. Timeline Container (`timeline.tsx:33`)
The root timeline component that orchestrates all timeline functionality:
- **Canvas-based rendering** using `CanvasTimeline` for performance
- **Multi-track support** with different track types (video, audio, text, image)
- **Scroll management** with both horizontal and vertical scrollbars
- **State management** integration with editor store
- **Real-time updates** synchronized with video player

#### 2. Header (`header.tsx:92`)
Control panel at the top of the timeline containing:
- **Play/pause controls** with skip forward/backward buttons
- **Timeline time display** showing current position and total duration
- **Track item controls** (delete, clone, mute/unmute for selected items)
- **Zoom controls** (zoom in, zoom out, fit to timeline)
- **Auto composition toggle** for automatic layout management

#### 3. Ruler (`ruler.tsx:26`)
Time scale indicator that:
- **Displays time markers** with major and minor tick marks
- **Shows formatted timestamps** at regular intervals
- **Supports click-to-seek** functionality
- **Syncs with timeline scroll** position
- **Provides drag-to-scroll** interaction

#### 4. Playhead (`playhead.tsx:7`)
Current time position indicator:
- **Visual cursor** showing current playback position
- **Draggable interface** for scrubbing through timeline
- **Real-time sync** with video player frame position
- **Responsive to zoom** and scroll changes

## Media Item Types

### Video Items (`video.ts:38`)
Video tracks display:
- **Thumbnail filmstrips** showing frame previews
- **Dynamic thumbnail loading** with caching system
- **Trimming support** with visual trim handles
- **Aspect ratio preservation** in thumbnails
- **Fallback preview** system for loading states

Key features:
- Offscreen canvas rendering for performance
- Segment-based thumbnail loading
- Real-time preview generation from video files
- Scroll-optimized rendering

### Audio Items (`audio.ts:28`)
Audio tracks display:
- **Waveform visualization** showing amplitude over time
- **Real-time audio analysis** using `@remotion/media-utils`
- **Visual audio bars** with configurable density
- **Mute/volume controls** integration

Key features:
- Offscreen canvas for waveform rendering
- Efficient audio data processing
- Responsive waveform scaling
- Visual feedback for audio levels

## Timeline Interaction System

### Track Management
- **Multi-track layout** with configurable track heights
- **Drag and drop** support for adding media items
- **Track type validation** ensuring compatible media types
- **Auto-arrangement** with collision detection

### Selection System
- **Multi-select support** with visual selection indicators
- **Selection-aware controls** (mute, delete, clone)
- **Keyboard shortcuts** for common operations
- **Context-sensitive actions** based on selected items

### Zoom and Scale
- **Adaptive zoom levels** from overview to frame-precise editing
- **Fit-to-timeline** automatic scaling
- **Preserves position** during zoom operations
- **Smooth zoom transitions** with scroll management

### Scroll Synchronization
- **Dual-axis scrolling** (horizontal for time, vertical for tracks)
- **Auto-scroll during playback** keeping playhead visible
- **Scroll-aware rendering** for performance optimization
- **Snap-to-grid** functionality for precise positioning

## Performance Optimizations

### Canvas-Based Rendering
- **OffscreenCanvas** for background processing
- **Dirty region tracking** to minimize redraws
- **Request animation frame** scheduling
- **Viewport culling** for off-screen elements

### Asset Management
- **Thumbnail caching** system with LRU eviction
- **Lazy loading** of video frames
- **Memory-efficient** waveform generation
- **Background processing** for non-blocking operations

### State Management
- **Event-driven updates** using `@designcombo/events`
- **Optimistic UI updates** for responsive interactions
- **Debounced operations** for performance-critical updates
- **Selective re-rendering** based on change detection

## How It Works

### Media Loading Process
1. **File upload** triggers metadata extraction
2. **Preview generation** creates fallback thumbnails
3. **Background processing** prepares detailed assets
4. **Timeline integration** adds items to appropriate tracks
5. **Real-time updates** as processing completes

### Playback Synchronization
1. **Frame-accurate positioning** using fps calculations
2. **Time unit conversion** between milliseconds and timeline units
3. **Scroll compensation** maintaining visual consistency
4. **Player event handling** for play/pause state changes

### Editing Operations
1. **Selection management** tracks active timeline items
2. **Operation dispatch** through centralized event system
3. **State validation** ensures timeline consistency
4. **UI feedback** provides immediate visual response
5. **Undo/redo support** through state manager integration

### Rendering Pipeline
1. **Layout calculation** determines item positions and sizes
2. **Viewport culling** identifies visible elements
3. **Asset preparation** loads required thumbnails/waveforms
4. **Canvas drawing** renders final timeline view
5. **Interaction handling** processes user input events

The timeline UI provides a professional-grade editing experience with frame-accurate control, efficient performance, and intuitive interactions for complex video composition workflows.