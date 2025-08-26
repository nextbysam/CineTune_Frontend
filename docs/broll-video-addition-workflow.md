# B-Roll Video Addition Workflow Documentation

## Overview

This document details the complete workflow for adding B-roll videos to the timeline from JSON responses received from the `/api/generate-broll-timing` endpoint. The process involves fetching timing suggestions, processing video placements, and adding them to the timeline with proper track assignment and mute settings.

## Table of Contents

1. [API Endpoint Integration](#api-endpoint-integration)
2. [JSON Response Structure](#json-response-structure)
3. [Video Matching Logic](#video-matching-logic)
4. [Timeline Addition Process](#timeline-addition-process)
5. [Track Assignment Strategy](#track-assignment-strategy)
6. [Mute Feature Implementation](#mute-feature-implementation)
7. [State Management](#state-management)
8. [Known Issues and Solutions](#known-issues-and-solutions)
9. [Debugging and Logging](#debugging-and-logging)
10. [Future Improvements](#future-improvements)

## API Endpoint Integration

### Endpoint Details
- **URL**: `http://localhost:3000/api/generate-broll-timing`
- **Method**: `POST`
- **Purpose**: Generate B-roll timing suggestions based on caption analysis

### Request Payload
```typescript
{
  jobId: string,           // Caption job ID from localStorage
  videoId: string,         // A-roll video name/ID
  brollContext: Array<{    // Available B-roll videos
    id: string,
    name: string,
    url: string,
    metadata: object
  }>
}
```

### Response Structure
```typescript
{
  jobId: string,
  status: "completed" | "processing" | "failed",
  brollTimingSuggestions: {
    brollPlacements: Array<{
      clipName: string,
      startTime: number,    // in seconds
      endTime: number,      // in seconds
      duration: number,
      strategicReasoning: string,
      confidence: number
    }>,
    skippedClips: Array<string>,
    summary: {
      totalClipsUsed: number,
      totalClipsSkipped: number,
      videoCoveragePercentage: number,
      overallStrategy: string
    }
  }
}
```

## JSON Response Structure

### B-Roll Placement Object
Each placement in the `brollPlacements` array contains:

```typescript
interface BrollPlacement {
  clipName: string;           // Name of the B-roll clip to use
  startTime: number;          // Start time in seconds
  endTime: number;           // End time in seconds
  duration: number;          // Duration in seconds
  strategicReasoning: string; // AI reasoning for placement
  confidence: number;        // Confidence score (0-1)
}
```

### Example Response
```json
{
  "jobId": "broll-timing-1755699586360-orh69xh6b",
  "status": "completed",
  "brollTimingSuggestions": {
    "brollPlacements": [
      {
        "clipName": "Screen Recording 2025-08-05 at 8.43.00 PM.mov",
        "startTime": 2.1,
        "endTime": 4.3,
        "duration": 2.2,
        "strategicReasoning": "The B-roll is placed when the speaker mentions 'hooks', providing visual context to the explanation.",
        "confidence": 0.85
      },
      {
        "clipName": "IMG_1862.MOV",
        "startTime": 7.0,
        "endTime": 9.0,
        "duration": 2.0,
        "strategicReasoning": "This B-roll is used during 'some issues' to visualize problems or challenges, enhancing the narrative.",
        "confidence": 0.78
      }
    ],
    "skippedClips": [],
    "summary": {
      "totalClipsUsed": 2,
      "totalClipsSkipped": 0,
      "videoCoveragePercentage": 36.4,
      "overallStrategy": "The B-rolls were strategically placed to provide visual context during key moments..."
    }
  }
}
```

## Video Matching Logic

### Matching Strategy
The system uses a **partial matching** approach to find B-roll videos:

```typescript
const matchingVideo = videosB.find(video => {
  const videoName = video.fileName || video.file?.name || video.url;
  return videoName?.includes(clipName) || clipName?.includes(videoName);
});
```

### Matching Process
1. **Extract clip name** from placement: `placement.clipName`
2. **Search available B-roll videos** using partial matching
3. **Fallback handling** if no match found
4. **Error logging** for debugging

### Example Matching
```
Placement clipName: "Screen Recording 2025-08-05 at 8.43.00 PM.mov"
Available videos: ["Screen Recording 2025-08-05 at 8.43.00 PM.mov", "IMG_1862.MOV"]
Result: ✅ Exact match found
```

## Timeline Addition Process

### Video Dispatch Structure
```typescript
dispatch(ADD_VIDEO, {
  payload: {
    id: generateId(),
    display: {
      from: startTimeMs,    // Convert seconds to milliseconds
      to: endTimeMs,
    },
    details: {
      src: srcVideo,        // Video source URL
      muted: true,          // B-roll videos are muted by default
      volume: 0,
    },
    metadata: {
      previewUrl: "https://cdn.designcombo.dev/caption_previews/static_preset1.webp",
      localUrl: matchingVideo.metadata?.localUrl,
      externalUrl: matchingVideo.metadata?.uploadedUrl,
      aRollType: "b-roll",
      userId: matchingVideo.userId,
      fileName: matchingVideo.fileName,
      thumbnailUrl: matchingVideo.metadata?.thumbnailUrl,
      brollPlacement: {
        originalClipName: clipName,
        startTime: placement.startTime,
        endTime: placement.endTime,
        reasoning: placement.reasoning || placement.description,
        confidence: placement.confidence
      }
    },
  },
  options: {
    resourceId: "main",     // Track assignment
    scaleMode: "fit",
  },
});
```

### Processing Steps
1. **Extract timing** from placement (convert seconds to milliseconds)
2. **Find matching video** using partial matching
3. **Get video source** (prefer uploadedUrl over localUrl)
4. **Generate unique ID** for the timeline item
5. **Create dispatch payload** with all required properties
6. **Dispatch ADD_VIDEO action** to state manager

## Track Assignment Strategy

### Current Implementation
```typescript
options: {
  resourceId: "main",  // All B-roll videos assigned to "main" track
  scaleMode: "fit",
}
```

### Track Types Available
- `"main"` - Primary video track
- `"customTrack"` - Custom track 1
- `"customTrack2"` - Custom track 2

### Track Configuration
```typescript
// From timeline configuration
sizesMap: {
  text: 32,
  audio: 36,
  customTrack: 40,    // B-roll videos can use these tracks
  customTrack2: 40,
  linealAudioBars: 40,
  radialAudioBars: 40,
  waveAudioBars: 40,
  hillAudioBars: 40,
},
```

### Future Track Distribution
To avoid overlap, videos should be distributed across different tracks:
```typescript
const availableTracks = ["customTrack", "customTrack2", "main"];
const assignedTrack = availableTracks[index % availableTracks.length];
```

## Mute Feature Implementation

### B-Roll Mute Default
All B-roll videos added via the API are **muted by default**:

```typescript
details: {
  src: srcVideo,
  muted: true,    // B-roll videos start muted
  volume: 0,      // Volume set to 0
}
```

### Mute State Persistence
The mute state persists through:
- **Timeline display** - Shows muted state in controls
- **Player preview** - Videos play without audio
- **Final rendering** - Exported video has muted B-roll

### Mute Control UI
Users can unmute B-roll videos using:
- **Volume control** in timeline controls
- **Mute toggle button** in video properties
- **Global mute controls** in timeline header

## State Management

### State Flow
1. **API Response** → JSON parsing
2. **Video Matching** → Find corresponding B-roll files
3. **Payload Creation** → Build ADD_VIDEO dispatch
4. **State Dispatch** → Send to StateManager
5. **Timeline Update** → CanvasTimeline renders
6. **Zustand Sync** → React components update

### Key State Objects
```typescript
// Timeline state
trackItemsMap: {
  [videoId]: {
    id: string,
    type: "video",
    display: { from: number, to: number },
    details: { src: string, muted: boolean, volume: number },
    metadata: object
  }
}

// Canvas objects
canvasObjects: [
  {
    id: string,
    type: "video",
    resourceId: string,
    top: number,      // Y-position on timeline
    left: number,     // X-position on timeline
    width: number,
    height: number
  }
]
```

## Known Issues and Solutions

### Issue 1: ResourceId Not Being Set
**Problem**: Canvas objects show `resourceId: ""` even when set in payload
```javascript
// Canvas object shows:
{ id: "MzWnXacT08pChYci", resourceId: "", top: 30 }
```

**Root Cause**: The `resourceId` property in the payload is not being processed by the state manager

**Solution**: 
- Set `resourceId` directly in the payload structure
- Ensure proper track assignment in options
- Add explicit Y-positioning with `top` property

### Issue 2: Videos Overlapping at Same Y-Level
**Problem**: Multiple B-roll videos appear at the same `top: 30` position
```javascript
// Both videos end up at same Y-level
Canvas object 1: { top: 30, left: 78.96 }
Canvas object 2: { top: 30, left: 263.2 }
```

**Root Cause**: Track assignment not working, all videos default to same Y-level

**Solution**:
```typescript
// Assign different tracks cyclically
const availableTracks = ["customTrack", "customTrack2", "main"];
const assignedTrack = availableTracks[index % availableTracks.length];

// Set explicit Y-positions
details: {
  top: index * 50,  // Each video gets different Y-level
}
```

### Issue 3: State Synchronization Delays
**Problem**: Videos appear in canvas but not in Zustand store immediately
```javascript
// Timeline canvas has video but store doesn't
Canvas verification: 1/2 videos found in canvas
Zustand store added: [] // Empty array
```

**Root Cause**: Asynchronous state updates between StateManager and Zustand

**Solution**:
- Add delays between dispatches
- Implement retry logic for verification
- Check both canvas and store states

## Debugging and Logging

### Comprehensive Logging Strategy
```typescript
// Pre-processing logs
console.log('🎯 Processing B-roll placements:', placements);
console.log('🎯 Available B-roll videos:', videosB.length);

// Video matching logs
console.log(`🔍 Looking for B-roll clip: "${clipName}"`);
console.log(`✅ Matched B-roll: "${clipName}" -> "${matchingVideo.fileName}"`);

// Track assignment logs
console.log(`🎯 Track assignment for B-roll ${index + 1}:`, {
  index,
  availableTracks,
  assignedTrack,
  trackIndex: index % availableTracks.length
});

// Dispatch logs
console.log(`🚀 Dispatching B-roll ${index}: ${fileName} (ID: ${videoId})`);
console.log(`🔍 Complete payload for ${fileName}:`, completePayload);

// State verification logs
console.log(`📊 State before dispatch: ${Object.keys(stateBefore.trackItemsMap).length} items`);
console.log(`📊 State after dispatch: ${Object.keys(stateAfter.trackItemsMap).length} items`);
```

### Verification Process
```typescript
const verifyVideoAddition = (attempt: number = 1, maxAttempts: number = 5) => {
  setTimeout(() => {
    const finalState = useStore.getState();
    const addedVideoIds = videoPayloads.map(p => p.videoId);
    const actuallyAdded = addedVideoIds.filter(id => finalState.trackItemsMap[id]);
    
    console.log(`📊 Verification attempt ${attempt}/${maxAttempts}: ${actuallyAdded.length}/${addedVideoIds.length} B-roll videos in timeline state`);
    
    // Check timeline canvas state
    if (timeline && typeof timeline.getObjects === 'function') {
      const allCanvasObjects = timeline.getObjects();
      const timelineCanvasItems = allCanvasObjects.filter((obj: any) => 
        addedVideoIds.includes(obj.id)
      );
      console.log(`📊 Timeline canvas verification: ${timelineCanvasItems.length}/${addedVideoIds.length} videos found in canvas`);
    }
  }, attempt === 1 ? 500 : 500);
};
```

### Error Handling
```typescript
try {
  // Video processing logic
} catch (error) {
  console.error(`❌ Error processing B-roll placement ${index + 1}:`, error);
  errorCount++;
}

// Summary reporting
console.log(`📊 B-roll processing summary: ${successCount} successful, ${errorCount} errors, ${placements.length} total placements`);
```

## Future Improvements

### 1. Enhanced Track Assignment
```typescript
// Implement smart track assignment
const assignTrack = (index: number, totalVideos: number) => {
  const tracks = ["customTrack", "customTrack2", "main"];
  const trackIndex = index % tracks.length;
  return {
    resourceId: tracks[trackIndex],
    yPosition: index * 50,  // Explicit Y-positioning
    trackPriority: trackIndex
  };
};
```

### 2. Batch Processing Optimization
```typescript
// Process videos in batches with proper delays
const processBatch = async (videos: VideoPayload[], batchSize: number = 3) => {
  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize);
    await Promise.all(batch.map(video => dispatch(ADD_VIDEO, video)));
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};
```

### 3. Advanced Video Matching
```typescript
// Implement fuzzy matching for better video identification
const findMatchingVideo = (clipName: string, availableVideos: Video[]) => {
  // Exact match first
  let match = availableVideos.find(v => v.fileName === clipName);
  if (match) return match;
  
  // Fuzzy match using similarity scoring
  return availableVideos.find(v => {
    const similarity = calculateSimilarity(v.fileName, clipName);
    return similarity > 0.8;
  });
};
```

### 4. Real-time Progress Tracking
```typescript
// Add progress tracking for long-running operations
const trackProgress = (current: number, total: number) => {
  const progress = (current / total) * 100;
  console.log(`📊 Progress: ${progress.toFixed(1)}% (${current}/${total})`);
  // Update UI progress indicator
};
```

## Conclusion

The B-roll video addition workflow is a complex process involving multiple systems:
- **API integration** for timing suggestions
- **Video matching** for file identification
- **State management** for timeline updates
- **Track assignment** for proper positioning
- **Mute functionality** for audio control

The current implementation provides a solid foundation but requires ongoing optimization for track assignment and state synchronization. The comprehensive logging and error handling ensure reliable debugging and monitoring of the process.

---

**Last Updated**: August 20, 2025  
**Version**: 1.0  
**Status**: Active Development 