# Video Composition and Orientation-Based Arrangement

## Overview

This document explains how videos are added to the CineTune video editor composition and how the system automatically rearranges them based on their orientation (horizontal vs vertical).

## Video Addition Workflow

### 1. Video Upload and Processing

Videos are uploaded through the `ModalUpload` component and processed by the upload system:

```typescript
// Location: src/features/editor/menu-item/uploads.tsx
const handleAddVideo = (video: any) => {
  const srcVideo = 
    video.metadata?.uploadedUrl ||
    (video.metadata?.localUrl && !video.metadata.localUrl.startsWith("blob:")
      ? video.metadata.localUrl
      : null) ||
    video.url;

  dispatch(ADD_VIDEO, {
    payload: {
      id: generateId(),
      details: {
        src: srcVideo,
      },
      metadata: {
        previewUrl: "https://cdn.designcombo.dev/caption_previews/static_preset1.webp",
        localUrl: video.metadata?.localUrl?.startsWith("blob:") 
          ? undefined 
          : video.metadata?.localUrl,
        externalUrl: video.metadata?.uploadedUrl,
        aRollType: video.aRollType, // "a-roll" or "b-roll"
        userId: video.userId,
        fileName: video.fileName || video.file?.name || video.url,
        thumbnailUrl: video.metadata?.thumbnailUrl,
      },
    },
    options: {
      targetTrackIndex: 0,
      scaleMode: "fit",
    },
  });
};
```

### 2. Video Types and Classification

The system distinguishes between two main video types:

#### A-Roll Videos (Main Content)
- Primary video content that forms the backbone of the composition
- Usually uploaded first and determines the composition's base dimensions
- Stored with `aRollType: "a-roll"` metadata

#### B-Roll Videos (Supporting Content)  
- Supporting footage that complements the main content
- Can be automatically positioned using AI-powered timing suggestions
- Stored with `aRollType: "b-roll"` metadata
- Often placed on separate tracks to avoid conflicts

### 3. Composition State Management

Videos are managed through multiple state layers:

```typescript
// Location: src/features/editor/player/composition.tsx
const Composition = () => {
  const {
    trackItemIds,
    trackItemsMap,
    fps,
    sceneMoveableRef,
    size,
    transitionsMap,
    structure,
    activeIds,
    timeline,
  } = useStore();

  const groupedItems = groupTrackItems({
    trackItemIds,
    transitionsMap,
    trackItemsMap: trackItemsMap,
  });

  const mediaItems = Object.values(trackItemsMap).filter((item) => {
    return item.type === "video" || item.type === "audio";
  });
```

## Auto-Composition and Orientation Detection

### 1. Automatic Composition Sizing with Orientation Detection

The system automatically adjusts the composition size and centers videos based on their orientation:

```typescript
// Location: src/features/editor/hooks/use-auto-composition.ts
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
        // For horizontal videos, automatically switch to landscape canvas
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
    }
  };

  // Calculate centered position for video in composition
  const calculateCenteredPosition = (videoWidth, videoHeight, compositionWidth, compositionHeight) => {
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

  // Apply auto composition when enabled
  useEffect(() => {
    if (autoComposition) {
      const videoDetails = getFirstVideoDetails();
      if (videoDetails) {
        const { id, width, height } = videoDetails;
        const orientation = determineOrientation(width, height);
        
        // Get optimal composition dimensions
        const compositionDims = getOptimalCompositionDimensions(width, height);
        
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
          width, height, compositionDims.width, compositionDims.height
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
                transform: `scale(1)`,
                transformOrigin: "center center"
              },
            },
          },
        });
      }
    }
  }, [autoComposition, trackItemsMap]);
};
```

### 2. Orientation-Based Logic

The system determines video orientation using the aspect ratio:

```javascript
// Orientation detection logic
const determineOrientation = (width, height) => {
  const aspectRatio = width / height;
  
  if (aspectRatio > 1.0) {
    return "horizontal"; // Landscape
  } else if (aspectRatio < 1.0) {
    return "vertical";   // Portrait
  } else {
    return "square";     // 1:1 aspect ratio
  }
};
```

### 3. Composition Arrangement Rules

Based on the video orientation, the system applies different arrangement strategies:

#### Horizontal Videos (Landscape)
- **Automatic Canvas Switch**: System automatically switches to landscape canvas orientation
- **Composition Size**: 
  - 16:9 videos → 1920×1080 canvas
  - 4:3 videos → 1440×1080 canvas  
  - Custom ratios → Maintains native dimensions with minimum 1280×720
- **Positioning**: Videos are automatically centered both horizontally and vertically
- **Scale Mode**: `"fit"` - video scales to fit within composition bounds while maintaining aspect ratio
- **Centering Logic**: Calculates optimal scale and centers video using `calculateCenteredPosition()`
- **Track Assignment**: Primary track (index 0) for A-roll, sequential tracks for B-roll

#### Vertical Videos (Portrait)
- **Composition Size**: Adapts to vertical format (e.g., 1080×1920 for 9:16)
- **Positioning**: Videos are positioned to fill the height, maintaining aspect ratio
- **Scale Mode**: `"fit"` - video scales to fit within composition bounds
- **Background**: May add background elements to fill unused space

#### Mixed Orientation Handling
When both horizontal and vertical videos are present:
- The first video's orientation determines the base composition format
- Subsequent videos are scaled and positioned to fit within the established composition
- Letterboxing or pillarboxing may be applied to maintain aspect ratios

## Video Rendering in Composition

### 1. Remotion Integration

Videos are rendered using Remotion components:

```typescript
// Location: src/remotion/TimelineVideo.tsx
const VideoItem: React.FC<{ item: TrackItem; fps: number }> = ({
  item,
  fps,
}) => {
  const { details } = item;
  const { from, durationInFrames } = calculateFrames(item.display, fps);
  const playbackRate = item.playbackRate || 1;

  const crop = details.crop || {
    x: 0,
    y: 0,
    width: details.width,
    height: details.height,
  };

  return (
    <Sequence
      key={item.id}
      from={from}
      durationInFrames={durationInFrames || 1 / fps}
    >
      <AbsoluteFill
        style={calculateContainerStyles(details, crop, {
          pointerEvents: "none",
        })}
      >
        <div style={calculateMediaStyles(details, crop)}>
          {/* Video rendering logic */}
        </div>
      </AbsoluteFill>
    </Sequence>
  );
};
```

### 2. Style Calculations

The system calculates container and media styles based on orientation:

```typescript
// Container styles adapt to video dimensions and composition size
const calculateContainerStyles = (details, crop, additionalStyles) => {
  return {
    position: "absolute",
    left: `${details.x || 0}px`,
    top: `${details.y || 0}px`,
    width: `${details.width}px`,
    height: `${details.height}px`,
    transform: `rotate(${details.rotation || 0}deg) scale(${details.scaleX || 1}, ${details.scaleY || 1})`,
    opacity: details.opacity !== undefined ? details.opacity / 100 : 1,
    ...additionalStyles,
  };
};

// Media styles handle aspect ratio and scaling
const calculateMediaStyles = (details, crop) => {
  return {
    width: "100%",
    height: "100%",
    objectFit: details.scaleMode === "fill" ? "cover" : "contain",
    clipPath: crop ? `inset(${crop.y}px ${crop.x + crop.width}px ${crop.y + crop.height}px ${crop.x}px)` : "none",
  };
};
```

## Track Management for Multiple Videos

### 1. Sequential Track Assignment

When multiple videos are added, they are assigned to separate tracks:

```typescript
// B-roll videos get separate track assignments
for (let i = 0; i < allVideoPayloads.length; i++) {
  const brollTrackIndex = i + 1; // Track 1, 2, 3, etc.
  const resourceId = `broll-track-${i + 1}`;
  
  const addVideoPayload = {
    payload: {
      id: videoId,
      resourceId: resourceId, // Unique resource ID for each B-roll
      display: {
        from: startTimeMs,
        to: endTimeMs,
      },
      details: {
        src: srcVideo,
      },
    },
    options: {
      scaleMode: "fit",
    },
  };
}
```

### 2. Timeline Integration

Videos are integrated into the timeline with proper timing and positioning:

- **A-roll videos**: Usually span the full timeline duration
- **B-roll videos**: Positioned at specific time ranges based on content analysis
- **Transitions**: Applied between video segments when specified
- **Overlays**: Text, images, and effects can be layered on top

## Performance Optimizations

### 1. Video Format Handling

The system optimizes video handling based on format:

```typescript
// Format-specific optimizations
const isProblematicFormat = (src: string) => {
  const url = src.toLowerCase();
  return url.includes('.mov') || url.includes('quicktime') || url.includes('.m4v');
};

// Use appropriate Remotion component
if (isProblematicFormat(details.src)) {
  return <Video src={details.src} volume={effectiveVolume} />;
} else {
  return <OffthreadVideo src={details.src} volume={effectiveVolume} />;
}
```

### 2. Thumbnail Generation

Video thumbnails are generated for UI previews:

```typescript
// Thumbnail generation with orientation-aware sizing
const generateThumbnailFromVideo = async (videoSrc: string) => {
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
  // ... thumbnail generation logic
};
```

## Key Features

### 1. Intelligent Video Encoding
- Automatic compression for large files (up to 95% size reduction)
- Format-aware processing (MOV, MP4, AVI, etc.)
- Background encoding with progress tracking

### 2. AI-Powered B-Roll Placement
- Automatic timing suggestions based on content analysis
- Context-aware positioning of supporting footage
- Multiple placement strategies with confidence scoring

### 3. Real-Time Preview
- Live composition preview during editing
- Orientation-aware scaling and positioning
- Smooth playback with proper aspect ratio handling

### 4. Cross-Platform Compatibility
- Support for various video formats and codecs
- Fallback rendering for problematic formats
- Error handling with user-friendly messages

This architecture ensures that videos are seamlessly integrated into the composition with proper orientation handling, optimal performance, and intelligent arrangement based on content analysis.