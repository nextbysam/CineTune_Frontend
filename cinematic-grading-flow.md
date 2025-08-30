# Cinematic Grading Flow Documentation

This document provides a comprehensive overview of the Cinematic Grading functionality in the CineTune video editor, detailing the complete workflow from button click to video replacement.

---

## Overview

The Cinematic Grading feature allows users to apply cinematic color grading (LUTs - Look-Up Tables) to videos in their timeline. The process involves generating preview frames with different LUTs applied, then allowing users to select and apply their preferred grading to replace the original video.

**Location:** `src/features/editor/menu-item/images.tsx`

---

## Phase 1: Cinematic Grading Button Click

### Initial Action
When the user clicks the "Cinematic Grading" button:

1. **UI State Changes:**
   - Button text changes to "Processing..."
   - Button becomes disabled (`isProcessing = true`)
   - Previous LUT preview frames are cleared from UI
   - Toast notification: "Processing video for cinematic grading..."

2. **Video Detection:**
   ```typescript
   const getVideoFromTimeline = () => {
     const videoItems = Object.values(trackItemsMap).filter(
       (item) => item.type === "video"
     );
     
     if (videoItems.length === 0) {
       throw new Error("No video found in timeline. Please add a video first.");
     }
     
     return videoItems[0]; // Uses the first video found
   };
   ```

### Backend API Call: Generate LUT Previews

**Endpoint:** `https://cinetune-llh0.onrender.com/api/generate-lut-previews`  
**Method:** POST  
**Content-Type:** multipart/form-data

#### Request Preparation:
1. **Video Fetch:** Downloads video from timeline using the video's `src` URL
2. **File Conversion:** Converts response to Blob, then to File object
3. **FormData Construction:**
   ```typescript
   const formData = new FormData();
   formData.append('video', videoFile);
   formData.append('frameNumber', '30');      // Extract frame at 30 seconds
   formData.append('isVertical', 'false');    // Orientation setting
   ```

#### Response Structure:
```typescript
{
  frames: Array<{
    url: string;    // URL to preview frame image
    name: string;   // LUT name (e.g., "Cinematic Blue", "Warm Sunset")
  }>
}
```

---

## Phase 2: Preview Generation Response

### Success Response Processing:

1. **Frame URL Processing:**
   - Relative URLs are converted to absolute: `https://cinetune-llh0.onrender.com${frame.url}`
   - Cache-busting timestamp added: `${frame.url}?t=${Date.now()}`

2. **UI State Updates:**
   ```typescript
   setLutFrames(data.frames);  // Store preview frames
   setIsProcessing(false);     // Re-enable button
   ```

3. **User Feedback:**
   - Success toast: "Generated X cinematic grading previews!"
   - Preview grid appears with all available LUT options

### Preview Grid Display:

**Layout:** 2-column grid (`grid-cols-2`) with scrollable overflow  
**Individual Frame Widget:**
```typescript
<div key={index} className="relative group">
  <img
    src={`${frame.url}?t=${Date.now()}`}
    alt={frame.name}
    className="w-full h-20 object-cover rounded-md cursor-pointer hover:opacity-80"
    onClick={() => handleApplyLUT(lutName)}
  />
  <div className="absolute bottom-0 bg-black/70 text-white text-xs p-1">
    {frame.name}
  </div>
</div>
```

**Visual Features:**
- **Hover Effect:** Opacity reduces to 80% on hover
- **LUT Name Label:** Overlay at bottom with semi-transparent background  
- **Clickable:** Entire frame acts as button to apply LUT
- **Responsive Height:** Fixed 20 units (h-20) with object-cover

---

## Phase 3: LUT Selection & Application

### When User Clicks a Preview Frame:

1. **Immediate UI Response:**
   - Button state: "Processing..." (disabled)
   - Toast notification: "Applying [LUT NAME] LUT to video..."

2. **Video Preparation:** (Same as Phase 1)
   - Fetches original video from timeline
   - Converts to File object for upload

### Backend API Call: Apply LUT

**Endpoint:** `https://cinetune-llh0.onrender.com/api/grade-video-lut`  
**Method:** POST  
**Content-Type:** multipart/form-data

#### Request Structure:
```typescript
const formData = new FormData();
formData.append('video', videoFile);
formData.append('lutName', lutName);        // Selected LUT name
formData.append('isVertical', 'false');
```

#### Response Structure:
```typescript
{
  success: boolean;
  url: string;        // URL to the newly graded video
  message?: string;   // Optional status message
}
```

---

## Phase 4: Video Replacement in Timeline

### Successful LUT Application:

1. **URL Processing:**
   ```typescript
   const newSrc = data.url.startsWith('http')
     ? data.url  // Already absolute URL
     : `https://cinetune-llh0.onrender.com${data.url}`;  // Make relative URLs absolute
   ```

2. **Timeline State Update:**
   ```typescript
   setState({
     trackItemsMap: {
       ...trackItemsMap,
       [videoId]: {
         ...videoItem,              // Preserve all existing properties
         details: {
           ...videoItem.details,    // Preserve all existing details
           src: newSrc,             // ONLY update the video source URL
         },
       },
     },
   });
   ```

3. **User Feedback:**
   - Success toast: "Timeline video replaced with graded version!"
   - UI processing state reset (`isProcessing = false`)

4. **Error Handling for Invalid Response:**
   ```typescript
   } else {
     throw new Error(data.message || 'Backend did not return a valid graded video URL');
   }
   ```

### State Management Details:

**Store Used:** `useStore()` from `src/features/editor/store/use-store.ts`  
**Key Properties:**
- `trackItemsMap`: Record of all timeline items indexed by ID
- `setState`: Async function to update store state

**Video Item Structure (Preserved):**
```typescript
interface ITrackItem {
  id: string;
  type: "video" | "audio" | "text" | ...;
  details: {
    src: string;        // ← This is what gets updated
    duration?: number;
    // ... other properties preserved
  };
  // ... all other properties preserved
}
```

---

## Error Handling

### Common Error Scenarios:

1. **No Video in Timeline:**
   - Error: "No video found in timeline. Please add a video first."
   - User must add video before using cinematic grading

2. **Video Fetch Failure:**
   - Error: "Failed to fetch video: [STATUS] [STATUS_TEXT]"
   - Could indicate network issues or invalid video URL

3. **Backend API Errors:**
   - **Preview Generation:** "API Error: [STATUS] - [ERROR_TEXT]"
   - **LUT Application:** "LUT Application Error: [STATUS] - [ERROR_TEXT]"

4. **Processing Errors:**
   - Generic fallback: "Unknown error" for unexpected failures
   - All errors displayed via toast notifications

### Error Recovery:
- `setIsProcessing(false)` ensures UI returns to usable state
- Previous preview frames remain available for retry
- User can attempt different LUTs or re-trigger the process

---

## Technical Architecture

### API Endpoints:
- **Preview Service:** `cinetune-llh0.onrender.com/api/generate-lut-previews`
- **LUT Application:** `cinetune-llh0.onrender.com/api/grade-video-lut`

### Key Dependencies:
- **State Management:** Zustand store (`useStore`)
- **UI Components:** Button component, toast notifications (Sonner)
- **Timeline Integration:** Direct timeline state manipulation

### Processing Flow:
```
Timeline Video → Fetch → Convert to File → Backend API → Preview Frames → User Selection → LUT Application → New Video URL → Timeline Replacement
```

---

## User Experience Flow

1. **Setup:** User has video in timeline
2. **Initiate:** Click "Cinematic Grading" button  
3. **Wait:** Processing indicator while frames generate (~30s)
4. **Preview:** Grid of LUT preview frames appears
5. **Select:** Click desired preview frame
6. **Apply:** Processing indicator while LUT applies (~30-60s)
7. **Result:** Original timeline video replaced with graded version

### Visual Feedback:
- **Button State:** Shows processing status
- **Toast Messages:** Inform user of progress and results  
- **Preview Grid:** Visual LUT options with hover effects
- **Timeline:** Video automatically updates without user intervention

---

## Performance Considerations

- **Frame Extraction:** Fixed at 30-second mark (`frameNumber: '30'`)
- **Cache Busting:** Timestamp parameters prevent browser caching issues
- **Memory Management:** Previous frames cleared before new processing
- **Network Efficiency:** Direct video URL usage, no unnecessary downloads
- **UI Responsiveness:** Async operations prevent UI blocking

---

## Future Enhancement Opportunities

1. **Multiple Frame Times:** Allow users to select which frame to use for preview
2. **Batch Processing:** Apply LUTs to multiple videos simultaneously  
3. **Custom LUT Upload:** Allow users to upload their own LUT files
4. **Preview Comparison:** Side-by-side original vs graded preview
5. **Undo/Redo:** Ability to revert to original video after grading

---

*This documentation covers the complete cinematic grading workflow as implemented in `src/features/editor/menu-item/images.tsx`. Use this as reference for understanding, debugging, or extending the LUT application system.*