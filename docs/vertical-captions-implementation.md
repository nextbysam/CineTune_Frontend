# Vertical Captions Implementation: How Captions with Vertical:true Get Added to Screen

## Overview

This document explains the complete process of how captions with `vertical: true` property are processed and added to the screen in the CineTune video editor. Vertical captions receive special treatment with dynamic font sizing, center positioning, and word-wrap prevention to ensure optimal display.

## Key Implementation File

**Primary File:** `src/features/editor/menu-item/texts.tsx`  
**Main Function:** `handleLoadCaptionsFromJSON()` and `createUniformTextPayload()`

## Vertical Caption Processing Flow

### 1. Caption Classification

When captions are loaded from localStorage, they are first separated into vertical and non-vertical categories:

```typescript
// Caption separation logic in texts.tsx:647-656
for (let index = 0; index < parsedData.captions.length; index++) {
    const caption = parsedData.captions[index];
    if (caption.vertical === true || caption.vertical === "true") {
        verticalCaptions.push({ ...caption, originalIndex: index });
    } else {
        nonVerticalCaptions.push({ ...caption, originalIndex: index });
    }
}
```

**Classification Criteria:**
- `caption.vertical === true` (boolean)
- `caption.vertical === "true"` (string)
- All other values (undefined, false, null) are treated as non-vertical

### 2. Vertical Caption Processing Pipeline

Each vertical caption goes through a specialized processing pipeline:

#### Step 1: Font Size Optimization

Vertical captions use dynamic font sizing to prevent word wrapping:

```typescript
// calculateOptimalFontSize function in texts.tsx:493-518
const calculateOptimalFontSize = (text: string, maxWidth: number = 1080, maxFontSize: number = 120): number => {
    const cleanText = text.trim();
    if (!cleanText) return maxFontSize;
    
    // Character width estimation
    const CHAR_WIDTH_RATIO = 0.6; // 60% of font size
    const SAFETY_MARGIN = 0.9; // Use 90% of available width
    
    // Calculate if text fits at max font size
    const estimatedWidthAtMaxFont = cleanText.length * (maxFontSize * CHAR_WIDTH_RATIO);
    const availableWidth = maxWidth * SAFETY_MARGIN;
    
    if (estimatedWidthAtMaxFont <= availableWidth) {
        return maxFontSize; // Text fits at 120px
    }
    
    // Calculate optimal font size to fit text
    const optimalFontSize = Math.floor((availableWidth / cleanText.length) / CHAR_WIDTH_RATIO);
    const finalFontSize = Math.max(24, Math.min(optimalFontSize, maxFontSize));
    
    return finalFontSize; // Min 24px, max 120px
};
```

**Font Size Examples:**

| Text | Character Count | Calculated Size | Final Size | Reason |
|------|----------------|-----------------|------------|---------|
| "HELLO" | 5 | 162px | 120px | Capped at maximum |
| "IMPORTANT" | 9 | 90px | 90px | Scaled to fit |
| "EXTRAORDINARILY" | 15 | 54px | 54px | Significantly scaled |
| "A" | 1 | 972px | 120px | Capped at maximum |

#### Step 2: Position and Style Configuration

Vertical captions are positioned at screen center with word-wrap prevention:

```typescript
// createUniformTextPayload function - vertical caption handling
if (isVertical) {
    console.log(`📺 Processing VERTICAL caption: "${text}"`);
    
    const optimalFontSize = calculateOptimalFontSize(text, 1080, TEXT_ADD_PAYLOAD.details.fontSize);
    fontSizeOverride = optimalFontSize;
    
    // Critical positioning and styling for vertical captions
    positionOverrides = {
        left: 540,   // Center X (1080/2)
        top: 960,    // Center Y (1920/2)
        textAlign: 'center',
        transform: 'translate(-50%, -50%)', // Perfect center alignment
        isVertical: true,
        fontSize: optimalFontSize, // Dynamic font size
        whiteSpace: 'nowrap', // CRITICAL: Prevent word wrapping
        wordWrap: 'normal', // Override default break-word
        overflow: 'visible', // Allow text to be visible
        maxWidth: 'none' // Remove width constraints
    };
}
```

**Key Styling Properties:**
- **Position:** Absolute center (540, 960) with transform translate(-50%, -50%)
- **Font Size:** Dynamically calculated (24px-120px range)
- **Word Wrap:** Completely disabled via `whiteSpace: 'nowrap'`
- **Overflow:** Visible to ensure text doesn't get clipped
- **Width Constraints:** Removed to prevent forced wrapping

### 3. Payload Creation Process

#### Step 1: Text Payload Generation

```typescript
// createUniformTextPayload call for vertical captions
const textPayload = createUniformTextPayload({
    text: captionText,
    startTimeMs: Math.max(0, startTimeMs),
    endTimeMs: Math.max(startTimeMs + 100, endTimeMs),
    isVertical: true, // Critical flag
    originalIndex: caption.originalIndex,
    fontFamily: fontFamilyToUse,
    fontUrl: fontUrlToUse
});
```

#### Step 2: Additional Properties

Special properties are added to vertical captions:

```typescript
// Additional vertical-specific properties
if (textPayload.details && typeof textPayload.details === 'object') {
    // Preserve ominous property for styling effects
    (textPayload.details as any).ominous = caption.ominous === true || caption.ominous === "true";
    
    console.log('📺 FINAL vertical caption properties:', {
        fontSize: (textPayload.details as any).fontSize,
        whiteSpace: (textPayload.details as any).whiteSpace,
        wordWrap: (textPayload.details as any).wordWrap,
        ominous: (textPayload.details as any).ominous
    });
}
```

### 4. Timeline Integration

#### Dispatch to Timeline

```typescript
// Individual ADD_TEXT dispatch for each vertical caption
dispatch(ADD_TEXT, {
    payload: textPayload,
    options: {},
});
```

#### Timing Processing

Vertical captions maintain **strict timing adherence**:

- **Start Time:** Converted from seconds to milliseconds: `Math.round(startSeconds * 1000)`
- **End Time:** Uses actual end time from JSON data
- **Minimum Duration:** 100ms fallback for invalid timing
- **No Cycle Extension:** Unlike non-vertical captions, vertical captions don't extend to cycle end times

### 5. Error Handling and Fallbacks

#### Fallback Payload Creation

If processing fails, a fallback payload is created:

```typescript
// Fallback creation for vertical captions
const fallbackPayload = createUniformTextPayload({
    text: fallbackText,
    startTimeMs: Math.max(0, fallbackStartMs),
    endTimeMs: Math.max(fallbackStartMs + 500, fallbackEndMs),
    isVertical: true, // Maintains vertical behavior
    originalIndex: caption.originalIndex
});
```

#### Error Recovery Features

- **Minimum Duration:** 500ms for fallback captions
- **Text Fallback:** Uses `caption.word` → `caption.text` → `"Vertical Caption N"`
- **Timing Fallback:** Uses index-based timing if JSON timing is invalid
- **Font Fallback:** Uses default fonts if custom fonts fail to resolve

## Font Resolution for Vertical Captions

### Font Mapping System

Vertical captions use the same font resolution as non-vertical captions:

```typescript
// Font resolution process
const LOCAL_FONT_MAPPING: Record<string, { url: string; postScriptName: string }> = {
    "Montserrat": { url: "/fonts/Montserrat-Regular.ttf", postScriptName: "Montserrat-Regular" },
    "Inter": { url: "/fonts/Inter_28pt-Regular.ttf", postScriptName: "Inter_28pt-Regular" },
    "Cinzel": { url: "/fonts/Cinzel-Regular.ttf", postScriptName: "Cinzel-Regular" },
    // ... additional fonts
};
```

### Font Weight Handling

- **Source:** `caption.fontFamily` or `caption.style?.fontFamily`
- **Weight Processing:** Automatic weight variant selection based on `fontWeight` property
- **Fallback:** Default to Inter font family if resolution fails

## Sequential Caption Display Logic (Words-at-a-Time Control)

The system allows users to control how many words appear together through the "Words at a time" dropdown in the text panel. This setting determines grouping for both display timing and positioning:

### Words-at-a-Time Grouping Implementation

```typescript
// Group non-vertical captions by wordsAtATime setting
const captionGroups: any[][] = [];
for (let i = 0; i < nonVerticalCaptions.length; i += wordsAtATime) {
    const group = nonVerticalCaptions.slice(i, i + wordsAtATime);
    captionGroups.push(group);
}

// Process each group as a single caption unit
for (let groupIndex = 0; groupIndex < captionGroups.length; groupIndex++) {
    const captionGroup = captionGroups[groupIndex];
    
    // Extract timing from first and last caption in group
    const firstCaption = captionGroup[0];
    const lastCaption = captionGroup[captionGroup.length - 1];
    
    const startSeconds = firstCaption.start || firstCaption.startTime || 0;
    const endSeconds = lastCaption.end || lastCaption.endTime || (lastCaption.start || lastCaption.startTime || 0) + 3;
    
    // Combine text content from all captions in the group
    const captionTexts = captionGroup.map(caption => caption.word || caption.text || "Caption text");
    const captionText = captionTexts.join(" ");
    
    // Create single payload for the entire group
    const textPayload = createUniformTextPayload({
        text: captionText,
        startTimeMs: Math.max(0, startTimeMs),
        endTimeMs: Math.max(startTimeMs + 100, endTimeMs),
        // ... other properties
    });
}
```

### Timeline Frame Calculation

```typescript
// In utils/frames.ts - Converts milliseconds to Remotion frames
export const calculateFrames = (
    display: { from: number; to: number },
    fps: number,
) => {
    const from = (display.from / 1000) * fps;
    const durationInFrames = (display.to / 1000) * fps - from;
    return { from, durationInFrames };
};
```

### Words-at-a-Time Display Mechanism

**Key Principles:**
1. **User-Controlled Grouping** - Words are grouped according to dropdown selection (1, 2, or 3 words)
2. **Smart Vertical Override** - When wordsAtATime > 1, even captions marked as `vertical: true` will be grouped
3. **Group Timing Span** - Start time from first word, end time from last word in group  
4. **Combined Text Display** - All words in group appear as single text element
5. **Sequential Group Display** - Groups appear one after another with no overlap
6. **Styling Preservation** - Grouped vertical captions maintain center positioning and dynamic font sizing

**Timeline Structure:**
```typescript
// Each group becomes an individual Sequence with combined timing
<Sequence
    key={item.id}
    from={from}                    // Start frame (from first word in group)
    durationInFrames={durationInFrames}  // Duration spans entire group timing
>
    <TextComponent text="combined words from group" />
</Sequence>
```

**Example Timeline for Words-at-a-Time Display:**

**1 Word at a Time (Default):**
| Group | Words | Start Time | End Time | Display Duration | Visual Effect |
|-------|--------|------------|----------|------------------|---------------|
| Group 1 | "HELLO" | 0ms | 1000ms | 1 second | Shows "HELLO" alone |
| Group 2 | "WORLD" | 1000ms | 2500ms | 1.5 seconds | Shows "WORLD" alone |
| Group 3 | "EVERYONE" | 2500ms | 3500ms | 1 second | Shows "EVERYONE" alone |

**2 Words at a Time:**
| Group | Words | Start Time | End Time | Display Duration | Visual Effect |
|-------|--------|------------|----------|------------------|---------------|
| Group 1 | "HELLO WORLD" | 0ms | 2500ms | 2.5 seconds | Shows "HELLO WORLD" together |
| Group 2 | "EVERYONE" | 2500ms | 3500ms | 1 second | Shows "EVERYONE" alone |

**3 Words at a Time:**
| Group | Words | Start Time | End Time | Display Duration | Visual Effect |
|-------|--------|------------|----------|------------------|---------------|
| Group 1 | "HELLO WORLD EVERYONE" | 0ms | 3500ms | 3.5 seconds | Shows all words together |

This allows users to control caption density and reading pace through the dropdown setting.

## Data Flow Summary

```
1. Caption JSON Data (localStorage)
   ↓
2. Classification (vertical: true/false)
   ↓
3. Words-at-a-Time Grouping:
   • All captions grouped by dropdown setting when wordsAtATime > 1
   • When wordsAtATime = 1, vertical captions remain individual
   • Smart vertical override: captions with vertical: true still get grouped
   • Group timing: start from first word, end from last word
   ↓
4. Sequential Timing Extraction:
   • Start time (seconds → milliseconds) from first word in group
   • End time (seconds → milliseconds) from last word in group
   • Duration validation (minimum thresholds)
   ↓
5. Vertical Caption Processing (Individual):
   • Font size calculation (24px-120px)
   • Center positioning (540, 960)
   • Word-wrap prevention styling
   ↓
6. Non-Vertical Caption Processing (Grouped):
   • Combined text from all words in group
   • Font resolution from first word in group
   • Layout positioning for group as unit
   ↓
7. Text Payload Creation:
   • Group-based timing assignment (display.from/to)
   • Font resolution (JSON → local files)
   • Style application
   ↓
8. Timeline Addition:
   • Individual ADD_TEXT dispatch per group/vertical caption
   • Remotion Sequence creation with frame timing
   • State validation and error handling
   ↓
9. Sequential Screen Rendering:
   • Frame-accurate display timing
   • Groups appear based on words-at-a-time setting
   • Positioned according to user-selected region
   • No word wrapping, strict timing adherence
```

## Ominous Text Mix-Blend-Mode Styling

### 7. Ominous Text Mix-Blend-Mode Styling

Text elements with `ominous: true` property (set via "ominous" toggle in right sidebar) automatically receive `mix-blend-mode: difference` styling applied to their outermost container div (second div under `__remotion-player`):

```typescript
// In use-update-ansestors.tsx - Applied to outermost div for ominous text
if (isOminous) {
    outermostDiv.style.mixBlendMode = 'difference';
    console.log(`🎭 Applied mix-blend-mode: difference to outermost div for ominous text "${text}..." (ID: ${itemId})`);
} else {
    outermostDiv.style.mixBlendMode = 'normal';
}
```

#### Automatic Detection and Styling

The system uses multiple detection methods to ensure every ominous text element gets styled:

**Primary Detection:**
- Checks `item.details.ominous === true` from the timeline store
- Applies styling immediately when track items change

**Fallback Detection:**
- Uses `data-ominous="true"` DOM attribute
- Checks for `ominous-text` CSS class
- Ensures reliable detection even if store state is temporarily unavailable

#### Enhanced DOM Attributes

Text elements receive additional attributes for reliable ominous identification:

```typescript
// In base-sequence.tsx - Enhanced ominous text attributes
<AbsoluteFill
    id={item.id}
    data-track-item="transition-element"
    data-ominous={isOminous ? "true" : "false"}
    className={`designcombo-scene-item id-${item.id} designcombo-scene-item-type-${item.type}${isOminous ? ' ominous-text' : ''}`}
    // ...
>
```

#### Styling Trigger Points

The mix-blend-mode styling is applied at multiple trigger points to ensure comprehensive coverage:

1. **Immediate Application:** When `trackItemIds` changes (new text added)
2. **Delayed Application:** 100ms timeout to ensure DOM is fully updated
3. **State Changes:** When playing state changes and player is not playing
4. **User Interactions:** When active items change or ominous property is toggled
5. **Seek Events:** When user seeks through the timeline

#### Comprehensive Processing

```typescript
// Enhanced processing with logging and fallback detection
const updateAnsestorsPointerEvents = () => {
    const elements = document.querySelectorAll('[data-track-item="transition-element"]');
    console.log(`🔄 Processing ${elements.length} track items for ancestor styling`);
    
    elements.forEach((element) => {
        // Find outermost div (second div under __remotion-player)
        let outermostDiv = null;
        let currentElement = element;
        
        while (currentElement.parentElement?.className !== "__remotion-player") {
            const parentElement = currentElement.parentElement;
            if (parentElement) {
                currentElement = parentElement;
                outermostDiv = parentElement; // Track the outermost container
            }
        }
        
        // Apply mix-blend-mode based on ominous status
        if (outermostDiv && element.classList.contains('designcombo-scene-item-type-text')) {
            const isOminous = checkOminousStatus(element); // Multiple detection methods
            outermostDiv.style.mixBlendMode = isOminous ? 'difference' : 'normal';
        }
    });
};
```

## Key Differences from Non-Vertical Captions

| Feature | Vertical Captions | Non-Vertical Captions |
|---------|-------------------|----------------------|
| **Positioning** | Always center (540, 960) | Grid-based with user regions |
| **Font Sizing** | Dynamic (24px-120px) | Fixed 120px |
| **Word Wrapping** | Disabled completely | Allowed with grid spacing |
| **Layout Algorithm** | Single center position | 3x3 cyclic grid |
| **Timing Extension** | Strict JSON timing | Cycle-based end time extension |
| **Text Alignment** | Center with transform | Left/center based on region |
| **Mix-Blend-Mode** | Applied to outermost div when `ominous: true` | `normal` (no special blend mode) |
| **DOM Attributes** | `data-ominous="true"`, `ominous-text` class when ominous | `data-ominous="false"`, no special class |

## Configuration Constants

### Screen Dimensions
- **Video Width:** 1080px
- **Video Height:** 1920px (vertical video format)

### Font Size Constraints
- **Maximum Font Size:** 120px
- **Minimum Font Size:** 24px
- **Character Width Ratio:** 0.6 (60% of font size)
- **Safety Margin:** 0.9 (90% of screen width)

### Positioning
- **Center X:** 540px (1080/2)
- **Center Y:** 960px (1920/2)
- **Transform:** translate(-50%, -50%) for perfect centering

## Logging and Debugging

The system provides comprehensive logging for vertical captions:

### Caption Processing Logs
```typescript
console.log(`📺 Processing VERTICAL caption: "${text}"`);
console.log(`📺 VERTICAL caption configured:`, {
    text: text,
    originalFontSize: TEXT_ADD_PAYLOAD.details.fontSize,
    optimizedFontSize: optimalFontSize,
    positioning: 'center-screen'
});
console.log('📺 FINAL vertical caption properties:', {
    fontSize: fontSize,
    whiteSpace: whiteSpace,
    wordWrap: wordWrap,
    ominous: ominous
});
```

### Mix-Blend-Mode Styling Logs
```typescript
console.log(`🔄 Processing ${elements.length} track items for ancestor styling`);
console.log(`🎭 Applied mix-blend-mode: difference to outermost div for ominous text "${text}..." (ID: ${itemId})`);
console.log(`✅ Processed ${elements.length} total elements, ${ominousCount} ominous text elements styled with mix-blend-mode: difference`);
console.warn(`⚠️ Track item not found for element ${itemId}, checking element attributes for ominous status`);
```

### Enhanced File Structure

**Primary Implementation Files:**
- `src/features/editor/menu-item/texts.tsx` - Caption processing and payload creation
- `src/features/editor/player/base-sequence.tsx` - DOM attribute enhancement
- `src/features/editor/hooks/use-update-ansestors.tsx` - Mix-blend-mode styling application

**Log Markers:**
- `📺` - Vertical caption processing and styling
- `🎭` - Ominous text mix-blend-mode styling
- `🎬` - General caption processing
- `📏` - Font size calculations
- `🔄` - Ancestor styling processing
- `✅` - Success operations and summaries
- `❌` - Error conditions
- `⚠️` - Warning conditions and fallback detection

This comprehensive system ensures that vertical captions are displayed with optimal font sizing, perfect center positioning, complete word-wrap prevention, and automatic `mix-blend-mode: difference` styling on their outermost container div when `ominous: true` is set, while maintaining strict timing adherence from the original JSON data.

## Summary of Caption Features

### Vertical Captions (`vertical: true`)

Every word with `vertical: true` receives:

1. ✅ **Dynamic Font Sizing** - Optimal size calculation (24px-120px range) to prevent word wrapping
2. ✅ **Perfect Center Positioning** - Always positioned at screen center (540, 960) with translate(-50%, -50%)
3. ✅ **Word-Wrap Prevention** - Complete disabling of word wrapping via CSS properties
4. ✅ **Individual Processing** - Each vertical caption processed individually regardless of words-at-a-time setting
5. ✅ **Ominous Mix-Blend-Mode Styling** - Automatic `difference` blend mode applied to outermost container div when `ominous: true`

### Non-Vertical Captions (Regular Captions)

Every non-vertical caption receives:

1. ✅ **Words-at-a-Time Grouping** - User-controlled grouping (1, 2, or 3 words) via dropdown in text panel
2. ✅ **Group-Based Timing** - Combined timing from first word start to last word end in group
3. ✅ **Combined Text Display** - All words in group appear as single text element with space separation
4. ✅ **Grid-Based Positioning** - Positioned according to 3x3 grid layout in user-selected region
5. ✅ **Sequential Group Display** - Groups appear one after another with no overlap
6. ✅ **Flexible Caption Density** - Users can control reading pace and caption density

### Universal Features

All captions (vertical and non-vertical) benefit from:

1. ✅ **Enhanced DOM Attributes** - `data-ominous="true"` and `ominous-text` class for reliable identification when ominous
2. ✅ **Comprehensive Detection** - Multiple fallback methods ensure no caption is missed
3. ✅ **Real-time Updates** - Styling applied immediately when captions are added and on all timeline interactions
4. ✅ **Robust Error Handling** - Fallback detection and recovery for edge cases
5. ✅ **Detailed Logging** - Comprehensive console output for debugging and verification
6. ✅ **Font Resolution** - Automatic local font mapping and fallback handling
7. ✅ **Strict Timing Adherence** - Frame-accurate timing from JSON data

## Words-at-a-Time Feature Summary

The **"Words at a time"** dropdown in the text panel provides users with control over caption grouping:

- **1 word at a time** (default): Each word appears individually, respecting original vertical properties
- **2 words at a time**: Words are grouped in pairs, overriding vertical classification for grouping
- **3 words at a time**: Words are grouped in triplets, overriding vertical classification for grouping

**Key Benefits:**
- **User Control**: Allows users to adjust reading pace and caption density
- **Smart Override**: When grouping is requested (> 1 word), it overrides individual vertical settings
- **Flexible Display**: Supports different content types (fast-paced vs. slower content)
- **Seamless Integration**: Works with existing positioning and timing systems
- **Styling Preservation**: Grouped vertical captions maintain their center positioning and dynamic font sizing

**New Behavior:**
- **Vertical Override**: Setting wordsAtATime > 1 will group even captions marked as `vertical: true`
- **Style Preservation**: Grouped captions that were originally vertical maintain vertical styling (center position, dynamic fonts)
- **User Intent**: The dropdown setting takes precedence over individual caption vertical properties

The system now prioritizes user intent - when you select "2 words at a time", ALL captions will be grouped accordingly, regardless of their original vertical classification.