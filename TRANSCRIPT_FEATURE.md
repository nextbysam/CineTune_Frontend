# Enhanced Transcript Feature

## Overview

The enhanced transcript feature in the Text section sidebar displays individual words from loaded JSON captions, providing a comprehensive view of all caption data with advanced filtering and organization capabilities.

## Features

### 📄 **Word-Level Display**
- Shows each individual word from JSON captions as a separate item
- Displays timing information (start time → end time) 
- Shows word duration and confidence scores
- Preserves original index numbers from JSON

### 🏷️ **Visual Organization**
- **Vertical Words**: Blue background with "V" badge for vertical captions
- **Horizontal Words**: Green background with "H" badge for horizontal captions
- **Index Badges**: Shows original position in JSON (#1, #2, etc.)
- **Font Information**: Displays font family when available

### 🔍 **Advanced Filtering**
- **All**: Shows all words from the JSON
- **Vertical**: Shows only words marked as vertical captions
- **Horizontal**: Shows only horizontal/regular words
- Real-time count updates for each filter type

### 📊 **Statistics & Metadata**
- Total word count
- Vertical vs horizontal word breakdown
- Total duration of all captions
- Individual word confidence scores
- Font family information per word

### 🔧 **Interactive Features**
- Click any word to log detailed information to console
- **Edit word text in-place** with pencil icon - changes persist to localStorage and timeline
- Copy entire transcript to clipboard in formatted text
- Refresh to reload from localStorage
- Automatic loading when captions are generated or imported

## Data Format

### Input JSON Structure
```json
{
  "captions": [
    {
      "id": "caption-1",
      "word": "Hello",
      "start": 0.5,
      "end": 1.2,
      "vertical": false,
      "confidence": 0.95,
      "fontFamily": "Montserrat-Bold"
    }
  ]
}
```

### Transformed Display Format
Each word is normalized to include:
- `word/text`: The actual word content
- `startTime/endTime`: Timing in milliseconds for display
- `vertical`: Boolean flag for caption type
- `originalIndex`: Position in original JSON
- `confidence`: Recognition confidence (if available)
- `fontFamily`: Font information (if available)

## Usage

### 1. **Load Captions**
Use either:
- "Add creative captions" button (generates from video)
- "Load captions from JSON" button (imports existing)

### 2. **View Transcript**
- Click "Show transcript" button when captions are available
- Transcript automatically appears below the buttons

### 3. **Filter Words**
- Use filter buttons to show All, Vertical, or Horizontal words
- Counts update automatically based on original data

### 4. **Export Transcript**
- Click "Copy Text" to copy formatted transcript
- Format: `[timestamp] [type] word`
- Example: `00:05 [V] Hello`

## Integration with Caption Loading

The transcript feature integrates seamlessly with the caption loading system:

### Auto-Refresh Triggers
- Automatically refreshes when "Add creative captions" completes
- Automatically refreshes when "Load captions from JSON" completes
- Manual refresh via "Refresh" button

### Data Persistence
- Reads from localStorage (`captions_*` keys)
- Maintains data across browser sessions
- Preserves filtering state during session

## Visual Design

### Layout Structure
```
┌─ Header ─────────────────────────┐
│ Transcript                       │
│ [count] words • [v] vertical •   │
│ [All] [Vertical] [Horizontal]    │
├─ Scrollable Content ─────────────┤
│ [time] "word" [V/#1] → [endtime] │
│        Duration, Confidence...   │
├─ Footer Actions ─────────────────┤
│ [Refresh] [Copy Text]            │
│ Total: X words • Duration: X:XX  │
└──────────────────────────────────┘
```

### Color Coding
- **Vertical words**: Blue background (`bg-blue-50/50`)
- **Horizontal words**: Green background (`bg-green-50/50`)
- **Type badges**: Blue "V" for vertical, Green "H" for horizontal
- **Index badges**: Gray numbered badges (#1, #2, etc.)

## Technical Implementation

### State Management
```typescript
const [availableCaptions, setAvailableCaptions] = useState<any[]>([]);
const [originalCaptions, setOriginalCaptions] = useState<any[]>([]);
const [showTranscript, setShowTranscript] = useState(false);
```

### Data Transformation
```typescript
const transformedCaptions = parsedData.captions.map((caption, index) => ({
  id: caption.id || `caption-${index}`,
  word: caption.word || caption.text || '',
  text: caption.word || caption.text || '',
  startTime: (caption.start || caption.startTime || 0) * 1000,
  endTime: (caption.end || caption.endTime || 0) * 1000,
  vertical: caption.vertical || false,
  originalIndex: index,
  // ... other properties
}));
```

## Benefits

1. **Complete Visibility**: See every word that will be added to timeline
2. **Quality Control**: Review confidence scores and timing before adding
3. **Organization**: Separate view of vertical vs horizontal captions
4. **Debugging**: Console logging for detailed word inspection
5. **Export**: Easy copy of transcript for external use
6. **Persistence**: Data survives browser sessions
7. **Live Editing**: Edit word text directly in transcript with automatic localStorage persistence

## Use Cases

- **Content Review**: Check all words before adding to timeline
- **Quality Assurance**: Verify timing and confidence scores
- **Script Creation**: Export transcript for documentation
- **Debugging**: Inspect individual word properties
- **Organization**: Separate management of vertical/horizontal text
- **Real-time Corrections**: Fix transcription errors directly in the transcript interface 