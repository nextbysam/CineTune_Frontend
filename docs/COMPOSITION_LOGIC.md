# CineTune Composition Logic Documentation

## Overview

This document provides a comprehensive technical analysis of the composition system in CineTune, focusing on how videos are added to compositions, how the timeline manages track items, and the underlying state management architecture that enables real-time video editing.

## Core Architecture Components

### 1. Timeline Store (`src/features/editor/store/use-store.ts`)

The central state management system built on Zustand with subscribeWithSelector middleware for granular state updates.

#### Key State Structure
```typescript
interface ITimelineStore {
  duration: number;           // Total project duration in milliseconds
  fps: number;                // Frame rate (default: 30fps)
  size: ISize;                // Canvas dimensions (default: 1080x1920 vertical)
  tracks: ITrack[];           // Array of timeline tracks
  trackItemIds: string[];     // Flat array of all track item IDs for performance
  trackItemsMap: Record<string, ITrackItem>; // O(1) lookup for track items
  transitionsMap: Record<string, ITransition>; // Transition effects storage
  structure: ItemStructure[]; // Hierarchical organization of elements
  activeIds: string[];        // Currently selected track items
  compositions: Partial<IComposition>[]; // Remotion composition metadata

  // Video player integration
  playerRef: React.RefObject<PlayerRef> | null;
  timeline: Timeline | null;  // @designcombo/timeline instance

  // Auto composition system
  autoComposition: boolean;   // Enables intelligent video fitting
}
```

### 2. Video Addition Workflow

#### Entry Points for Video Addition

**A. Manual Upload via Uploads Component (`src/features/editor/menu-item/uploads.tsx`)**
```typescript
const handleAddVideo = (video: any) => {
  // Source URL priority: uploadedUrl > localUrl (non-blob) > url
  const srcVideo = video.metadata?.uploadedUrl ||
                   (video.metadata?.localUrl && !video.metadata.localUrl.startsWith("blob:")
                     ? video.metadata.localUrl : null) ||
                   video.url;

  dispatch(ADD_VIDEO, {
    payload: {
      id: generateId(),
      details: { src: srcVideo },
      metadata: {
        previewUrl: "https://cdn.designcombo.dev/caption_previews/static_preset1.webp",
        aRollType: video.aRollType, // "a-roll" or "b-roll"
        userId: video.userId,
        fileName: video.fileName || video.file?.name,
        thumbnailUrl: video.metadata?.thumbnailUrl
      }
    },
    options: {
      targetTrackIndex: 0, // Allows multiple videos on same track
      scaleMode: "fit"
    }
  });
};
```

**B. Drag-and-Drop via Droppable Area (`src/features/editor/scene/droppable.tsx`)**
```typescript
const handleDrop = useCallback((draggedData: DraggedData) => {
  const payload = { ...draggedData, id: generateId() };

  if (draggedData.type === AcceptedDropTypes.VIDEO) {
    dispatch(ADD_VIDEO, {
      payload,
      options: {
        targetTrackIndex: 0,
        scaleMode: "fit"
      }
    });
  }
}, []);
```

**C. AI-Powered B-Roll Synchronization (Advanced)**
The system includes sophisticated B-roll timing synchronization that analyzes A-roll content and automatically places B-roll videos at strategic timestamps:

```typescript
// B-roll placement with separate track assignment
const brollTrackIndex = index + 1; // Tracks 1, 2, 3, etc.
const resourceId = `broll-track-${index + 1}`; // Unique resource ID

const addVideoPayload = {
  payload: {
    id: `broll-timing-${Date.now()}-${index}-${generateId()}`,
    resourceId: resourceId, // Creates separate tracks for each B-roll
    display: {
      from: startTimeMs,
      to: endTimeMs
    },
    details: { src: srcVideo },
    metadata: {
      brollPlacement: {
        originalClipName: clipName,
        strategicReasoning: placement.strategicReasoning,
        relatedArollWords: placement.relatedArollWords,
        trackIndex: brollTrackIndex,
        placementIndex: index + 1
      }
    }
  },
  options: { scaleMode: "fit" }
};
```

### 3. Timeline Track Management

#### Track Item Structure
```typescript
interface ITrackItem {
  id: string;                    // Unique identifier
  type: "video" | "audio" | "image" | "text";
  display: {
    from: number;                // Start time in milliseconds
    to: number;                  // End time in milliseconds
  };
  details: {
    src?: string;                // Media source URL
    width?: number;              // Element width
    height?: number;             // Element height
    left?: number;               // X position on canvas
    top?: number;                // Y position on canvas
    transform?: string;          // CSS transform (scaling, rotation)
    opacity?: number;            // Transparency (0-100)
    volume?: number;             // Audio volume (0-100)
    muted?: boolean;             // Audio mute state
    crop?: {                     // Cropping boundaries
      x: number;
      y: number;
      width: number;
      height: number;
    };
    // Video-specific properties
    playbackRate?: number;       // Playback speed multiplier
    // Text-specific properties
    text?: string;
    fontFamily?: string;
    fontSize?: string;
    color?: string;
    ominous?: boolean;           // Special mix-blend-mode effect
  };
  trim?: {                       // Media trimming
    from: number;
    to: number;
  };
  resourceId?: string;           // Track assignment identifier
  metadata?: any;                // Additional metadata
}
```

#### Track Assignment Logic
- **Single Track Strategy**: `targetTrackIndex: 0` allows multiple videos on the same track
- **Multi-Track Strategy**: Unique `resourceId` creates separate tracks for each element
- **B-Roll Separation**: AI-placed B-roll videos use sequential `resourceId` values (`broll-track-1`, `broll-track-2`, etc.)

### 4. Auto-Composition System (`src/features/editor/hooks/use-auto-composition.ts`)

The auto-composition system intelligently analyzes video dimensions and automatically adjusts canvas size and video positioning.

#### Video Orientation Detection
```typescript
const determineOrientation = (width: number, height: number) => {
  const aspectRatio = width / height;

  if (aspectRatio > 1.0) return "horizontal";      // Landscape
  if (aspectRatio < 1.0) return "vertical";        // Portrait
  return "square";                                 // 1:1 ratio
};
```

#### Optimal Composition Dimensions
```typescript
const getOptimalCompositionDimensions = (videoWidth: number, videoHeight: number) => {
  const orientation = determineOrientation(videoWidth, videoHeight);
  const videoAspectRatio = videoWidth / videoHeight;

  switch (orientation) {
    case "horizontal":
      if (videoAspectRatio >= 1.77 && videoAspectRatio <= 1.78) {
        return { width: 1920, height: 1080 }; // 16:9 HD
      }
      if (videoAspectRatio >= 1.33 && videoAspectRatio <= 1.34) {
        return { width: 1440, height: 1080 }; // 4:3
      }
      if (videoAspectRatio >= 2.35) {
        return { width: 2560, height: 1080 }; // Cinematic
      }
      // Custom scaling for other ratios
      const minWidth = 1280;
      const minHeight = 720;
      let canvasWidth = Math.max(videoWidth, minWidth);
      let canvasHeight = canvasWidth / videoAspectRatio;

      if (canvasHeight < minHeight) {
        canvasHeight = minHeight;
        canvasWidth = canvasHeight * videoAspectRatio;
      }

      return {
        width: Math.round(canvasWidth),
        height: Math.round(canvasHeight)
      };

    case "vertical":
      if (videoHeight / videoWidth >= 1.77) {
        return { width: 1080, height: 1920 }; // 9:16 mobile
      }
      return {
        width: Math.max(videoWidth, 720),
        height: Math.max(videoHeight, 1280)
      };

    case "square":
      return {
        width: Math.max(videoWidth, 1080),
        height: Math.max(videoHeight, 1080)
      };
  }
};
```

#### Video Scaling and Positioning
```typescript
const calculateVideoSettings = (videoWidth, videoHeight, compositionWidth, compositionHeight, currentVideoDetails) => {
  // Maintain aspect ratio while fitting in composition
  const scaleX = compositionWidth / videoWidth;
  const scaleY = compositionHeight / videoHeight;
  const scale = Math.min(scaleX, scaleY); // Preserve aspect ratio

  // Keep original dimensions, apply scaling via transform
  const originalWidth = videoWidth;
  const originalHeight = videoHeight;

  // Calculate centered position for initial placement
  const finalDisplayWidth = originalWidth * scale;
  const finalDisplayHeight = originalHeight * scale;
  const centeredX = (compositionWidth - finalDisplayWidth) / 2;
  const centeredY = (compositionHeight - finalDisplayHeight) / 2;

  // Only set initial position if video hasn't been manually positioned
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
    left: shouldSetInitialPosition ? centeredX : currentVideoDetails?.left,
    top: shouldSetInitialPosition ? centeredY : currentVideoDetails?.top,
    width: originalWidth,
    height: originalHeight,
    scale: scale,
    shouldSetInitialPosition
  };
};
```

#### Composition Updates via Event System
```typescript
// Resize canvas to optimal dimensions
dispatch(DESIGN_RESIZE, {
  payload: {
    width: compositionDims.width,
    height: compositionDims.height,
    name: orientation === "horizontal" ? "landscape-auto" :
          orientation === "vertical" ? "portrait-auto" : "square-auto"
  }
});

// Apply video positioning and scaling
dispatch(EDIT_OBJECT, {
  payload: {
    [videoId]: {
      details: {
        width: videoSettings.width,
        height: videoSettings.height,
        transform: `scale(${videoSettings.scale})`,
        transformOrigin: "center center",
        objectFit: "contain",
        // Position only if initial placement
        ...(videoSettings.shouldSetInitialPosition && {
          left: videoSettings.left,
          top: videoSettings.top
        })
      }
    }
  }
});
```

### 5. Remotion Integration (`src/remotion/`)

#### Composition Registration (`src/remotion/index.tsx`)
```typescript
const RemotionRoot: React.FC = () => (
  <Composition
    id="TimelineComposition"
    component={TimelineVideo}
    durationInFrames={300}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{
      design: {
        size: { width: 1080, height: 1920 },
        fps: 30,
        duration: 10000,
        trackItems: []
      }
    }}
    calculateMetadata={({ props }) => {
      const design = (props as any).design;
      const fps = design?.fps || 30;
      let duration = design?.duration || 10000;

      // Calculate duration from track items if not specified
      if (!duration && design?.trackItems && design.trackItems.length > 0) {
        const maxTo = design.trackItems.reduce(
          (acc: number, item: any) => Math.max(acc, item.display?.to || 0),
          0
        );
        duration = Math.max(maxTo, 1000);
      }

      return {
        durationInFrames: Math.ceil((duration / 1000) * fps),
        fps: fps,
        width: design?.size?.width || 1080,
        height: design?.size?.height || 1920
      };
    }}
  />
);
```

#### Video Rendering Component (`src/remotion/TimelineVideo.tsx`)
```typescript
const VideoItem: React.FC<{ item: TrackItem; fps: number }> = ({ item, fps }) => {
  const { details } = item;
  const { from, durationInFrames } = calculateFrames(item.display, fps);
  const playbackRate = item.playbackRate || 1;

  // Calculate effective volume (muted overrides volume)
  const isMuted = details.muted === true;
  const effectiveVolume = isMuted ? 0 : (details.volume || 0) / 100;

  // Enhanced error handling for problematic formats
  const isProblematicFormat = (src: string) => {
    const url = src.toLowerCase();
    return url.includes('.mov') || url.includes('quicktime') || url.includes('.m4v');
  };

  const renderVideoContent = () => {
    // Production environment detection
    const isProductionRender = typeof window === 'undefined' || typeof document === 'undefined';

    if (isProblematicFormat(details.src)) {
      return (
        <Video
          startFrom={((item.trim?.from || 0) / 1000) * fps}
          endAt={((item.trim?.to || item.display.to) / 1000) * fps || 1 / fps}
          playbackRate={playbackRate}
          src={details.src}
          volume={effectiveVolume}
          muted={isMuted}
        />
      );
    }

    if (isProductionRender) {
      return (
        <Video
          startFrom={((item.trim?.from || 0) / 1000) * fps}
          endAt={((item.trim?.to || item.display.to) / 1000) * fps || 1 / fps}
          playbackRate={playbackRate}
          src={details.src}
          volume={effectiveVolume}
          muted={isMuted}
        />
      );
    }

    // OffthreadVideo for development (better performance)
    return (
      <OffthreadVideo
        startFrom={((item.trim?.from || 0) / 1000) * fps}
        endAt={((item.trim?.to || item.display.to) / 1000) * fps || 1 / fps}
        playbackRate={playbackRate}
        src={details.src}
        volume={effectiveVolume}
        transparent={false}
      />
    );
  };

  return (
    <Sequence key={item.id} from={from} durationInFrames={durationInFrames || 1 / fps}>
      <AbsoluteFill style={calculateContainerStyles(details, crop)}>
        <div style={calculateMediaStyles(details, crop)}>
          {renderVideoContent()}
        </div>
      </AbsoluteFill>
    </Sequence>
  );
};
```

### 6. Style Calculation System (`src/features/editor/player/styles.ts`)

#### Container Styles
```typescript
export const calculateContainerStyles = (
  details: ITrackItem["details"],
  crop: ITrackItem["details"]["crop"] = {},
  overrides: React.CSSProperties = {}
): React.CSSProperties => ({
  pointerEvents: "auto",
  top: details.top || 0,
  left: details.left || 0,
  width: crop.width || details.width || "100%",
  height: crop.height || details.height || "auto",
  transform: details.transform || "none",
  opacity: details.opacity !== undefined ? details.opacity / 100 : 1,
  transformOrigin: details.transformOrigin || "center center",
  filter: `brightness(${details.brightness}%) blur(${details.blur}px)`,
  rotate: details.rotate || "0deg",
  ...overrides
});
```

#### Media-Specific Styles
```typescript
export const calculateMediaStyles = (
  details: ITrackItem["details"],
  crop: ITrackItem["details"]["crop"]
) => ({
  pointerEvents: "none",
  boxShadow: [
    `0 0 0 ${details.borderWidth}px ${details.borderColor}`,
    details.boxShadow ?
      `${details.boxShadow.x}px ${details.boxShadow.y}px ${details.boxShadow.blur}px ${details.boxShadow.color}` : ""
  ].filter(Boolean).join(", "),
  ...calculateCropStyles(details, crop),
  overflow: "hidden"
});
```

### 7. Event-Driven Architecture

The composition system uses `@designcombo/events` for loose coupling between components:

#### Key Events
- `ADD_VIDEO` - Adds video to timeline with payload and options
- `ADD_AUDIO` - Adds audio track
- `ADD_IMAGE` - Adds image element
- `ADD_TEXT` - Adds text element
- `DESIGN_RESIZE` - Changes canvas dimensions
- `EDIT_OBJECT` - Updates track item properties

#### Event Dispatch Pattern
```typescript
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";

dispatch(ADD_VIDEO, {
  payload: {
    id: generateId(),
    details: { src: videoUrl },
    display: { from: 0, to: 5000 },
    metadata: { /* additional data */ }
  },
  options: {
    targetTrackIndex: 0,
    scaleMode: "fit"
  }
});
```

## Advanced Features

### 1. A-Roll/B-Roll System

#### Classification
- **A-Roll**: Primary content videos (blue badge with crown icon)
- **B-Roll**: Secondary footage (green badge with layers icon)

#### AI-Powered B-Roll Timing
1. **Caption Analysis**: Uses existing caption job to understand A-roll content
2. **Context Matching**: Matches B-roll context descriptions with A-roll segments
3. **Strategic Placement**: AI determines optimal timing based on content analysis
4. **Separate Track Assignment**: Each B-roll gets unique `resourceId` for timeline organization

### 2. Thumbnail Generation System

#### Optimized Thumbnail Creation
```typescript
const generateThumbnailFromVideo = async (videoSrc: string): Promise<string | null> => {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.src = videoSrc;
  video.currentTime = 1.5; // Sample frame at 1.5 seconds
  video.muted = true;
  video.preload = "metadata";

  return new Promise((resolve) => {
    video.onloadeddata = () => {
      setTimeout(() => {
        const canvas = document.createElement("canvas");
        const maxWidth = 160;
        const maxHeight = 90;

        const aspectRatio = video.videoWidth / video.videoHeight;
        let width, height;

        if (aspectRatio > maxWidth / maxHeight) {
          width = maxWidth;
          height = maxWidth / aspectRatio;
        } else {
          height = maxHeight;
          width = maxHeight * aspectRatio;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
          resolve(thumbnail);
        } else {
          resolve(null);
        }
      }, 500);
    };

    document.body.appendChild(video);
    video.load();
  });
};
```

### 3. Performance Optimizations

#### State Update Batching
```typescript
setState: async (state) => {
  return set((currentState) => {
    const hasChanges = Object.keys(state).some(
      (key) => currentState[key as keyof ITimelineStore] !== state[key]
    );
    return hasChanges ? { ...currentState, ...state } : currentState;
  });
}
```

#### Memory Management
- Thumbnail caching system with localStorage
- Blob URL cleanup on component unmount
- Efficient track item lookups via `trackItemsMap`
- Virtualized timeline rendering for large projects

### 4. Error Handling and Format Support

#### Video Format Compatibility
```typescript
const isProblematicFormat = (src: string) => {
  const url = src.toLowerCase();
  return url.includes('.mov') || url.includes('quicktime') || url.includes('.m4v');
};

// Fallback rendering for problematic formats
if (isProblematicFormat(details.src)) {
  return <Video /* standard Video component with enhanced error handling */ />;
}

// OffthreadVideo for optimal performance in development
return <OffthreadVideo /* performance-optimized component */ />;
```

## Integration Points

### 1. Timeline Component Integration
- Connects to `@designcombo/timeline` for visual timeline representation
- Synchronizes with `PlayerRef` for video playback control
- Manages track item selection via `activeIds` array

### 2. Scene/Canvas Integration
- Renders track items as interactive elements on canvas
- Handles drag-and-drop positioning and resizing
- Integrates with `Moveable.js` for transform controls

### 3. Control Panels Integration
- Property editors update track item `details` via `EDIT_OBJECT` events
- Real-time preview updates through state subscriptions
- Type-specific controls for video, audio, image, and text elements

## Best Practices

### 1. Video Addition
- Always use `generateId()` for unique identifiers
- Prefer `uploadedUrl` over `localUrl` to avoid blob URL issues
- Include comprehensive metadata for AI features and user experience

### 2. Track Management
- Use `targetTrackIndex` for simple track assignment
- Use unique `resourceId` values when separate tracks are required
- Implement sequential delays for multiple video additions to prevent state conflicts

### 3. Performance Considerations
- Batch state updates when possible
- Use thumbnail caching to reduce regeneration
- Implement proper cleanup for blob URLs and DOM elements
- Monitor memory usage with large video files

### 4. Error Recovery
- Implement fallback rendering for unsupported video formats
- Provide user feedback for failed operations
- Use graceful degradation for AI-powered features

This composition logic forms the foundation of CineTune's professional video editing capabilities, enabling real-time editing, AI-powered content placement, and seamless integration between timeline, canvas, and rendering systems.