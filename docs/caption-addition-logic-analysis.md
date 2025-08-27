# Caption Addition Logic Analysis: Non-Vertical Captions

## Overview

This document provides a detailed analysis of how captions without the `vertical: true` attribute are added to the composition in the CineTune video editor. The logic is primarily implemented in the `texts.tsx` component and involves processing captions from localStorage, applying positioning algorithms, and dispatching them to the timeline.

## Key Files and Functions

### Primary File: `src/features/editor/menu-item/texts.tsx`

**Main Functions:**
- `handleLoadCaptionsFromJSON()` - Loads captions from localStorage and adds them to timeline
- `handleAddCreativeCaptions()` - Generates new captions via API and adds them to timeline  
- `calculateRegionPosition()` - Calculates positioning based on selected region
- `resolveLocalFontFromJson()` - Resolves font files from JSON font data

### Supporting Files:
- `src/features/editor/constants/payload.ts` - Contains `TEXT_ADD_PAYLOAD` template
- `src/features/editor/constants/font.ts` - Default font configuration

## Caption Processing Flow for Non-Vertical Captions

### 1. Data Source
Captions are loaded from localStorage with keys that start with `captions_`. The system uses the most recent caption set:

```typescript
const allKeys = Object.keys(localStorage);
const captionsKeys = allKeys.filter(key => key.startsWith('captions_'));
const mostRecentKey = captionsKeys[captionsKeys.length - 1];
const captionsData = localStorage.getItem(mostRecentKey);
```

### 2. Caption Filtering
The system separates vertical and non-vertical captions:

```typescript
// Caption is considered non-vertical if:
// - vertical property is undefined, null, or false
// - vertical !== true && vertical !== "true"

for (let index = 0; index < parsedData.captions.length; index++) {
    const caption = parsedData.captions[index];
    if (caption.vertical === true || caption.vertical === "true") {
        verticalCaptions.push({ ...caption, originalIndex: index });
    } else {
        nonVerticalCaptions.push({ ...caption, originalIndex: index });
    }
}
```

### 3. Layout Algorithm for Non-Vertical Captions

Non-vertical captions use a sophisticated **3x3 cyclic grid layout**:

#### Grid Configuration:
- **Maximum words per line:** 3
- **Maximum lines per cycle:** 3
- **Total slots per cycle:** 9 (3×3 grid)
- **Layout pattern:** Horizontal flow, left-to-right, top-to-bottom

#### Positioning Logic (UNIFORM SPACING):
```typescript
const maxWordsPerLine = 3;
const maxLines = 3;
const slotsPerCycle = maxWordsPerLine * maxLines; // 9

// UNIFORM SPACING CONSTANTS - Optimized to prevent overlap with 85px font size
const UNIFORM_HORIZONTAL_SPACING = 200; // Fixed horizontal spacing - prevents overlap for long words
const UNIFORM_VERTICAL_SPACING = 115; // Fixed vertical spacing - prevents vertical overlap

// Calculate position for each caption with uniform spacing
nonVerticalIndices.forEach((originalIdx: number, seqIndex: number) => {
    const cycle = Math.floor(seqIndex / slotsPerCycle);
    const slot = seqIndex % slotsPerCycle; // 0..8
    const line = Math.floor(slot / maxWordsPerLine); // 0..2
    const col = slot % maxWordsPerLine; // 0..2
    
    // UNIFORM GRID POSITIONING - Each word gets exactly the same spacing
    const offsetX = col * UNIFORM_HORIZONTAL_SPACING;
    const baseTop = line * UNIFORM_VERTICAL_SPACING;
    
    // Apply region-based positioning
    const position = calculateRegionPosition(captionRegion, offsetX, baseTop, fontSize);
    layoutPositions[originalIdx] = position;
});
```

### 4. Region-Based Positioning

The `calculateRegionPosition()` function applies final positioning based on user-selected region:

```typescript
const calculateRegionPosition = (region: string, baseLeft: number, baseTop: number, fontSize: number): { left: number; top: number } => {
    const videoWidth = 1080;
    const videoHeight = 1920;
    const margin = 24;
    
    switch (region) {
        case 'top_left':
            return { left: margin + baseLeft, top: margin + baseTop };
        case 'top_right':
            return { left: videoWidth - margin - baseLeft, top: margin + baseTop };
        case 'bottom_left':
            return { left: margin + baseLeft, top: videoHeight - margin - baseTop };
        case 'bottom_right':
            return { left: videoWidth - margin - baseLeft, top: videoHeight - margin - baseTop };
        case 'center':
            return { left: (videoWidth / 2) + baseLeft, top: (videoHeight / 2) + baseTop };
        case 'bottom_center':
            return { left: (videoWidth / 2) + baseLeft, top: videoHeight - margin - baseTop };
        default:
            return { left: margin + baseLeft, top: margin + baseTop };
    }
};
```

### 5. Timeline Addition Process

Each non-vertical caption is converted to a text payload and dispatched:

```typescript
// For each non-vertical caption
const textPayload = {
    ...TEXT_ADD_PAYLOAD,
    id: nanoid(),
    display: {
        from: Math.max(0, startTimeMs),  // Start time in milliseconds
        to: Math.max(startTimeMs + 100, endTimeMs), // End time in milliseconds
    },
    details: {
        ...TEXT_ADD_PAYLOAD.details,
        text: captionText,  // Caption text from JSON
        originalIndex: caption.originalIndex,
        // Apply calculated position if available
        ...(layoutPositions[caption.originalIndex] ? { 
            left: layoutPositions[caption.originalIndex].left, 
            top: layoutPositions[caption.originalIndex].top, 
            textAlign: 'left' 
        } : {}),
        // Apply font if resolvable from JSON
        ...(fontUrlToUse && fontFamilyToUse ? { 
            fontUrl: fontUrlToUse, 
            fontFamily: fontFamilyToUse 
        } : {}),
    },
};

// Dispatch to timeline
dispatch(ADD_TEXT, {
    payload: textPayload,
    options: {},
});
```

## Font Resolution for Non-Vertical Captions

### Font Mapping System
The system includes a comprehensive local font mapping:

```typescript
const LOCAL_FONT_MAPPING: Record<string, { url: string; postScriptName: string }> = {
    "Montserrat": { url: "/fonts/Montserrat-Regular.ttf", postScriptName: "Montserrat-Regular" },
    "Inter": { url: "/fonts/Inter_28pt-Regular.ttf", postScriptName: "Inter_28pt-Regular" },
    "Cinzel": { url: "/fonts/Cinzel-Regular.ttf", postScriptName: "Cinzel-Regular" },
    // ... more fonts
};
```

### Font Resolution Process:
1. Extract font family from caption JSON: `caption.fontFamily || caption.style?.fontFamily`
2. Normalize font name using canonical mapping
3. Select appropriate weight variant based on `fontWeight` property
4. Resolve to local font file path and PostScript name

## Timing Management

### Time Conversion
- Input: Seconds from JSON (`caption.start`, `caption.end`)  
- Output: Milliseconds for timeline (`startTimeMs`, `endTimeMs`)

### Cycle End Time Extension
Non-vertical captions in the same cycle share the same end time (from the last word in the cycle):

```typescript
// Compute end time for each cycle from the last word
for (const [cycleStr, indices] of Object.entries(cycleToOriginalIndices)) {
    const lastIdx = indices[indices.length - 1];
    const c = parsedData.captions[lastIdx];
    const endSeconds = (c.end ?? c.endTime ?? ((c.start ?? c.startTime ?? 0) + 3));
    cycleEndMsByCycle[Number(cycleStr)] = Math.round(endSeconds * 1000);
}

// Apply cycle end time if caption is part of a cycle
const cycle = indexToCycle[caption.originalIndex];
if (cycle !== undefined && cycleEndMsByCycle[cycle] !== undefined) {
    endTimeMs = Math.max(endTimeMs, cycleEndMsByCycle[cycle]);
}
```

## Default Styling for Non-Vertical Captions

### From `TEXT_ADD_PAYLOAD`:
- **Font Size:** 85px
- **Color:** #ffffff (white)
- **Text Align:** center (overridden to 'left' for positioned captions)
- **Font Family:** Default font (typically Inter)
- **Width:** 600px
- **Word Wrap:** break-word

### Position-Specific Overrides:
- **Text Align:** 'left' (when positioned via layout algorithm)
- **Left/Top:** Calculated values from positioning algorithm
- **Font URL/Family:** Resolved from JSON if available

## Caption Data Structure

### Input Format (from localStorage):
```json
{
  "jobId": "caption-job-id",
  "captions": [
    {
      "id": "caption-1",
      "word": "Hello",
      "text": "Hello",
      "start": 0.5,
      "end": 1.2,
      "startTime": 0.5,
      "endTime": 1.2,
      "vertical": false,  // Non-vertical caption
      "confidence": 0.95,
      "fontFamily": "Montserrat-Bold",
      "style": {
        "fontSize": 48,
        "fontWeight": "bold"
      }
    }
  ]
}
```

### Output Format (timeline payload):
```javascript
{
  id: "generated-nanoid",
  type: "text",
  display: {
    from: 500,  // milliseconds
    to: 1200    // milliseconds
  },
  details: {
    text: "Hello",
    fontSize: 85,
    left: 156,   // calculated position
    top: 48,     // calculated position
    textAlign: "left",
    fontFamily: "Montserrat-Bold",
    fontUrl: "/fonts/Montserrat-Bold.ttf",
    color: "#ffffff",
    // ... other styling properties
    originalIndex: 0
  }
}
```

## Error Handling and Fallbacks

### Missing or Invalid Timing:
```typescript
if (startTimeMs >= endTimeMs) {
    console.warn(`⚠️ Invalid timing for caption, fixing with minimum duration`);
    endTimeMs = startTimeMs + 1000; // Add 1 second minimum duration
}
```

### Font Resolution Failures:
- Falls back to `TEXT_ADD_PAYLOAD` defaults
- Uses Inter font family as ultimate fallback

### Caption Processing Errors:
- Creates fallback payload with basic styling
- Uses index-based timing as last resort
- Ensures no captions are lost during processing

## Performance Considerations

### Batch Processing:
- Processes all captions in memory before dispatching
- Uses individual `ADD_TEXT` dispatches with 10ms delays
- Implements comprehensive validation to ensure no captions are lost

### State Management:
- Tracks processed indices to prevent duplication
- Validates all captions are successfully added to timeline
- Provides detailed logging for debugging

## Configuration Options

### User-Configurable Settings:
1. **Caption Region:** top_left, top_right, bottom_left, bottom_right, center, bottom_center
2. **Words at a Time:** 1, 2, or 3 (affects grid layout)

### Layout Constants:
- **Video Dimensions:** 1080×1920 (vertical video format)
- **Margin:** 24px from edges
- **Uniform Horizontal Spacing:** 200px between words (prevents overlap with 85px font)
- **Uniform Vertical Spacing:** 115px between lines (prevents vertical overlap)
- **Grid Pattern:** Fixed 3×3 layout per cycle
- **Font Size:** 85px (default from TEXT_ADD_PAYLOAD)

### Uniform Spacing Grid Pattern (Non-Overlapping):
```
Cycle Layout (relative offsets):
[0,0]     [200,0]   [400,0]
[0,115]   [200,115] [400,115]  
[0,230]   [200,230] [400,230]
```

This comprehensive system ensures that **non-vertical captions only** (`vertical: false` or undefined) are positioned with **perfectly uniform spacing and no overlapping** using a fixed grid-based layout algorithm with 85px default font size while maintaining proper timing, font resolution, and error handling throughout the process.

## Vertical Caption Word Boundary Protection (`vertical: true`)

### Dynamic Font Sizing to Prevent Word Wrapping

Vertical captions use a sophisticated **word boundary protection system** to ensure words never break across lines:

```typescript
// Calculate optimal font size for vertical captions to prevent word wrapping
const calculateOptimalFontSize = (text: string, maxWidth: number = 1080, maxFontSize: number = 85): number => {
    const cleanText = text.trim();
    const CHAR_WIDTH_RATIO = 0.6; // Characters are approximately 60% of font size width
    const SAFETY_MARGIN = 0.9; // Use 90% of available width for safety
    
    const estimatedWidthAtMaxFont = cleanText.length * (maxFontSize * CHAR_WIDTH_RATIO);
    const availableWidth = maxWidth * SAFETY_MARGIN;
    
    if (estimatedWidthAtMaxFont <= availableWidth) {
        return maxFontSize; // Text fits at max font size
    }
    
    // Calculate optimal font size to fit the text
    const optimalFontSize = Math.floor((availableWidth / cleanText.length) / CHAR_WIDTH_RATIO);
    return Math.max(24, Math.min(optimalFontSize, maxFontSize)); // Min 24px, max 120px
};
```

### Word Wrap Prevention Properties

Vertical captions receive these critical CSS properties to prevent word breaking:

```typescript
// Vertical caption styling (prevents word wrapping)
{
    left: 540,                // Center X (1080/2)
    top: 960,                 // Center Y (1920/2)
    textAlign: 'center',
    transform: 'translate(-50%, -50%)',
    fontSize: optimalFontSize, // Dynamically calculated
    whiteSpace: 'nowrap',     // CRITICAL: Prevent word wrapping
    wordWrap: 'normal',       // Override default break-word
    overflow: 'visible',      // Allow text to be visible
    maxWidth: 'none'          // Remove width constraints
}
```

### Font Size Examples

| Word | Length | Max Font | Calculated | Final | Result |
|------|--------|----------|------------|-------|--------|
| "HELLO" | 5 chars | 85px | 162px | 85px | No scaling needed |
| "IMPORTANT" | 9 chars | 85px | 64px | 64px | Scaled down to fit |
| "EXTRAORDINARILY" | 15 chars | 85px | 38px | 38px | Significantly scaled |
| "A" | 1 char | 85px | 972px | 85px | No scaling needed |

### Benefits

1. **No Word Breaking:** Words like "important" will never display as "importa/nt"
2. **Automatic Scaling:** Long words get smaller font size to fit on screen
3. **Maintains Readability:** Minimum 24px font size ensures text remains readable
4. **Screen Compatibility:** Works within 1080px width constraint with 10% safety margin

**Note:** Non-vertical captions (`vertical: false` or undefined) use the uniform grid spacing algorithm and are **not affected** by this word boundary protection system.