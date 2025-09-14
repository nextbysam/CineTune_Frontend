# Timeline Selection System - Technical Documentation

## Overview

The CineTune video editor uses a sophisticated multi-layered selection system that tracks which video elements (track items) are currently selected in both the timeline and scene. The system operates across three main interaction layers: **timeline selection**, **scene selection**, and **global state management**.

## Architecture Overview

```
Selection Flow:
User Interaction → Selection Layer → State Manager → Store → UI Updates
     ↓                    ↓              ↓           ↓         ↓
 Timeline/Scene    @designcombo    StateManager   Zustand   Components
                   Selection       Events         Store     Re-render
```

## Core Selection State

### Primary State Container (`store/use-store.ts:29`)

The main selection state is stored in the Zustand store:

```typescript
interface ITimelineStore {
  activeIds: string[];           // Currently selected track item IDs
  trackItemsMap: Record<string, ITrackItem>;  // Lookup map for track items
  // ... other state
}
```

- **`activeIds[]`** - Array of currently selected track item IDs
- **`trackItemsMap`** - Hash map for efficient track item lookup by ID
- **`setState()`** - Batch state update function to prevent multiple re-renders

## Selection Event System

### Event-Driven Architecture

The selection system uses `@designcombo/events` for decoupled communication:

```typescript
// Core selection event
import { LAYER_PREFIX, LAYER_SELECTION } from "@designcombo/state";

// Event payload structure
{
  key: "LAYER_SELECTION",
  value: {
    payload: {
      activeIds: string[]  // Selected item IDs
    }
  }
}
```

### Event Subscription (`hooks/use-timeline-events.ts:68-81`)

Timeline events hook subscribes to selection changes:

```typescript
useEffect(() => {
  const selectionEvents = subject.pipe(
    filter(({ key }) => key.startsWith(LAYER_PREFIX)),
  );

  const selectionSubscription = selectionEvents.subscribe((obj) => {
    if (obj.key === LAYER_SELECTION) {
      setState({
        activeIds: obj.value?.payload.activeIds,
      });
    }
  });

  return () => selectionSubscription.unsubscribe();
}, [timeline]);
```

## Timeline Selection Layer

### Canvas-Based Selection (`timeline/timeline.tsx`)

The timeline uses `CanvasTimeline` from `@designcombo/timeline` for rendering and interaction:

```typescript
const timeline = new CanvasTimeline(canvasEl, {
  selectionColor: "rgba(0, 216, 214, 0.1)",      // Selection highlight
  selectionBorderColor: "rgba(0, 216, 214, 1.0)", // Selection border
  state: stateManager,                             // StateManager integration
  // ... other config
});
```

#### Selection Configuration
- **Selection Visual Feedback**: Teal highlight (`rgba(0, 216, 214, 0.1)`) with solid border
- **State Integration**: Direct connection to StateManager for selection events
- **Multi-Selection**: Supports selecting multiple timeline items simultaneously

### Timeline Item Types

Timeline supports selection of multiple media types:

```typescript
itemTypes: [
  "text", "image", "audio", "video",
  "helper", "track", "composition", "template",
  "linealAudioBars", "radialAudioBars",
  "progressFrame", "progressBar",
  "waveAudioBars", "hillAudioBars"
]
```

## Scene Selection Layer

### Interactive Selection (`scene/interactions.tsx`)

Scene selection uses `@interactify/toolkit` for direct manipulation:

```typescript
const selection = new Selection({
  container: containerRef.current,
  boundContainer: true,
  hitRate: 0,
  selectableTargets: [".designcombo-scene-item"],    // Target CSS class
  selectFromInside: false,
  selectByClick: true,
  toggleContinueSelect: "shift",                      // Multi-select with Shift
})
```

#### Selection Events

**Basic Selection (`interactions.tsx:85-106`)**:
```typescript
.on("select", (e) => {
  // Filter out audio items (not visually selectable)
  const filteredSelected = e.selected.filter(
    (el) => !el.className.includes("designcombo-scene-item-type-audio")
  );

  const ids = filteredSelected.map((el) => getIdFromClassName(el.className));

  // Update StateManager with new selection
  stateManager.updateState({
    activeIds: ids,
  }, {
    updateHistory: false,
    kind: "layer:selection",  // Event type identifier
  });
})
```

**Selection End with Drag Support (`interactions.tsx:124-155`)**:
```typescript
.on("selectEnd", (e) => {
  const moveable = moveableRef.current;

  if (e.isDragStart) {
    // Handle drag-to-move initiation
    setTimeout(() => {
      if (!dragStartEnd) {
        moveable?.moveable.dragStart(e.inputEvent);
      }
    });
  } else {
    // Standard selection update
    const ids = filteredSelected.map((el) => getIdFromClassName(el.className));

    stateManager.updateState({
      activeIds: ids,
    }, {
      updateHistory: false,
      kind: "layer:selection",
    });
  }
})
```

### Audio Item Filtering

Audio items are systematically excluded from scene selection:

```typescript
// Filter logic applied in multiple places
const filteredSelected = e.selected.filter(
  (el) => !el.className.includes("designcombo-scene-item-type-audio")
);
```

**Reasoning**: Audio items exist in the timeline but have no visual representation in the scene canvas, so they cannot be selected through scene interaction.

## Time-Based Selection Filtering

### Active Item Validation (`scene/interactions.tsx:38-55`)

Selected items must be active at the current playback time:

```typescript
const updateTargets = (time?: number) => {
  const currentTime = time || getCurrentTime();
  const { trackItemsMap } = useStore.getState();

  // Filter items that are active at current time
  const targetIds = activeIds.filter((id) => {
    return (
      trackItemsMap[id]?.display.from <= currentTime &&
      trackItemsMap[id]?.display.to >= currentTime
    );
  });

  // Update moveable targets
  const targets = targetIds.map((id) => getTargetById(id) as HTMLDivElement);
  selection?.setSelectedTargets(targets);
};
```

### Playback Synchronization

Selection updates automatically during video playback:

```typescript
const onSeeked = (v: any) => {
  setTimeout(() => {
    const { fps } = useStore.getState();
    const seekedTime = (v.detail.frame / fps) * 1000;
    updateTargets(seekedTime);  // Update active selections
  });
};

playerRef?.current?.addEventListener("seeked", onSeeked);
```

## State Manager Integration

### StateManager Bridge (`hooks/use-state-manager-events.ts`)

StateManager acts as the central coordinator between timeline and scene selections:

```typescript
// StateManager subscription for activeIds changes
const activeSelectionSubscription = stateManager.subscribeToActiveIds(
  (newState) => {
    setState(newState);  // Update Zustand store
  },
);
```

### Selection Update Flow

1. **User Interaction** → Timeline click or scene selection
2. **Selection Component** → Captures interaction and extracts item IDs
3. **StateManager Update** → `stateManager.updateState()` with new `activeIds`
4. **Event Dispatch** → `LAYER_SELECTION` event fired via `@designcombo/events`
5. **Store Update** → Zustand store `activeIds` updated via `setState()`
6. **UI Re-render** → Components re-render based on new selection state

## Selection-Aware Components

### Control Panels (`control-item/control-item.tsx:24-36`)

Property panels respond to single-item selections:

```typescript
useEffect(() => {
  if (activeIds.length === 1) {
    const [id] = activeIds;
    const trackItem = trackItemsMap[id];
    if (trackItem) {
      setTrackItem(trackItem);      // Show properties for selected item
      setLayoutTrackItem(trackItem);
    }
  } else {
    setTrackItem(null);             // Hide properties for multi-selection
    setLayoutTrackItem(null);
  }
}, [activeIds, trackItemsMap]);
```

### Timeline Header Controls (`timeline/header.tsx`)

Header controls become active when items are selected:

```typescript
// Controls depend on activeIds.length > 0
const hasSelection = activeIds.length > 0;

return (
  <>
    <Button disabled={!hasSelection} onClick={deleteSelectedItems}>
      Delete
    </Button>
    <Button disabled={!hasSelection} onClick={cloneSelectedItems}>
      Clone
    </Button>
    <Button disabled={!hasSelection} onClick={toggleMuteSelectedItems}>
      Mute/Unmute
    </Button>
  </>
);
```

## Multi-Selection Support

### Selection Modes

The system supports multiple selection paradigms:

1. **Single Selection**: Click on timeline item or scene element
2. **Multi-Selection**:
   - Hold `Shift` + click for additive selection
   - Drag selection box in scene (if multiple items intersect)
   - Timeline multi-select through canvas interaction

### Batch Operations

When multiple items are selected (`activeIds.length > 1`):

- **Property Panel**: Shows "No item selected" (doesn't support multi-edit)
- **Header Controls**: Enable batch operations (delete, clone, mute)
- **Moveable**: Supports group transformation in scene

## Selection Visual Feedback

### Timeline Visualization

```typescript
// Timeline canvas selection styling
{
  selectionColor: "rgba(0, 216, 214, 0.1)",        // Semi-transparent teal fill
  selectionBorderColor: "rgba(0, 216, 214, 1.0)",  // Solid teal border
  guideLineColor: "#ffffff",                        // White guide lines
}
```

### Scene Visualization

Scene selection uses `Moveable` component with:
- **Selection Handles**: Corner and edge resize handles
- **Rotation Control**: Bottom rotation handle
- **Visual Boundary**: Selection outline around selected elements

## Error Handling & Edge Cases

### Missing Track Items

```typescript
// Defensive programming in control-item.tsx:31
if (trackItem) {
  setTrackItem(trackItem);
} else {
  console.log(transitionsMap[id]);  // Check if it's a transition instead
}
```

### Audio Item Handling

Audio items exist in `trackItemsMap` but are filtered from scene selection:

```typescript
// Consistent filtering across selection events
const filteredSelected = e.selected.filter(
  (el) => !el.className.includes("designcombo-scene-item-type-audio")
);
```

### Time Boundary Validation

Items outside their display time range are automatically deselected:

```typescript
const targetIds = activeIds.filter((id) => {
  return (
    trackItemsMap[id]?.display.from <= currentTime &&
    trackItemsMap[id]?.display.to >= currentTime
  );
});
```

## Performance Optimizations

### Efficient Lookups

- **`trackItemsMap`**: O(1) track item lookup by ID instead of array searching
- **Batch State Updates**: `setState()` only updates when values actually change
- **Event Filtering**: Uses RxJS `filter()` to only process relevant events

### Debounced Updates

```typescript
// Timeout prevents excessive updates during rapid selection changes
const timer = setTimeout(() => {
  updateTargets();
});
```

### Memory Management

```typescript
// Proper cleanup of event subscriptions
return () => {
  playerEventsSubscription.unsubscribe();
  timelineEventsSubscription.unsubscribe();
  selectionSubscription.unsubscribe();
};
```

## Integration Points

### Key Dependencies

- **`@designcombo/timeline`**: Timeline canvas and selection events
- **`@designcombo/state`**: StateManager and selection constants
- **`@designcombo/events`**: Event system for decoupled communication
- **`@interactify/toolkit`**: Scene selection and moveable components
- **`zustand`**: Global state management with subscriptions

### External Integrations

- **Remotion Player**: Playback synchronization affects active selection filtering
- **Control Panels**: Property editors respond to single-item selections
- **Timeline Operations**: All timeline manipulations (delete, clone, mute) use `activeIds`

---

This selection system provides a robust, performant foundation for complex video editing operations with real-time synchronization between timeline and scene representations.