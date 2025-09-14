# Squantre Feature Implementation

## Overview

The Squantre feature transforms videos into centered, rounded squares with a white background layer, creating a distinctive visual effect. This implementation spans across multiple components in the video editor architecture, following the project's established patterns for state management and rendering.

## Component Architecture

### Core Components

#### 1. Squantre Toggle Component (`src/features/editor/control-item/common/squantre.tsx`)
A reusable UI toggle control that provides boolean state management:

```typescript
{
  value: boolean;           // Current Squantre state
  onChange: (v: boolean) => void;  // State change handler
}
```

**Features:**
- **Local State**: Uses `useState(value)` for immediate UI responsiveness
- **Effect Sync**: `useEffect` synchronizes with external prop changes
- **Visual States**: Check icon (✓) when active, Square icon (□) when inactive
- **Accessibility**: Full ARIA labeling and keyboard support

#### 2. Video Control Integration (`src/features/editor/control-item/basic-video.tsx`)
Integrates the Squantre toggle with video property controls via `handleSquantreToggle` function.

**Implementation Details:**
- Located at lines 214-357 in `basic-video.tsx`
- Manages both video transformation and white background creation
- Uses event-driven architecture with `@designcombo/events`

#### 3. Video Rendering (`src/remotion/TimelineVideo.tsx`)
Handles the actual video rendering using Remotion's composition system:
- Uses `calculateContainerStyles` and `calculateMediaStyles` for positioning
- Supports dynamic dimensions and transforms
- Integrates with the project's style calculation system

## Squantre Transformation Logic

### When Squantre is Enabled:

1. **White Background Creation**
   ```typescript
   // Creates a white background text object covering entire composition
   const whiteBackgroundId = generateId();
   dispatch(ADD_TEXT, {
     payload: {
       // Covers entire canvas
       width: size.width,
       height: size.height,
       backgroundColor: "#ffffff",
       // Transparent text content
       color: "rgba(255, 255, 255, 0)",
       text: " ",
       // Custom tracking properties
       squantreBackground: true,
       squantreVideoId: trackItem.id,
     },
     options: {
       // CRITICAL: Ensures background renders BELOW the video
       targetTrackIndex: -1,
     }
   });
   ```

2. **Video Transformation**
   ```typescript
   // Calculate square dimensions (25% of smallest canvas dimension)
   const squareSize = Math.min(size.width, size.height) * 0.25;
   const centerX = (size.width - squareSize) / 2;
   const centerY = (size.height - squareSize) / 2;

   dispatch(EDIT_OBJECT, {
     payload: {
       [trackItem.id]: {
         details: {
           // Center positioning
           left: centerX,
           top: centerY,
           width: squareSize,
           height: squareSize,
           // Rounded corners (25% border radius)
           borderRadius: 25,
           // Video scaling
           objectFit: "cover",
           transform: "none",
           // State tracking
           squantre: true,
           squantreBackgroundId: whiteBackgroundId,
         }
       }
     }
   });
   ```

### When Squantre is Disabled:

1. **Background Cleanup**
   - Locates the associated white background using `squantreBackgroundId`
   - Removes background from timeline using `EDIT_OBJECT` with `undefined`

2. **Video Reset**
   ```typescript
   dispatch(EDIT_OBJECT, {
     payload: {
       [trackItem.id]: {
         details: {
           borderRadius: 0,
           squantre: false,
           objectFit: "contain",
           squantreBackgroundId: undefined,
         }
       }
     }
   });
   ```

## State Management Integration

### Store Integration
- **Main Store**: Accesses `size` property for canvas dimensions via `useStore()`
- **Track Items**: Manages video properties through `trackItemsMap`
- **State Persistence**: Squantre state persists in `trackItem.details.squantre`

### Event System
- Uses `@designcombo/events` for decoupled communication
- `ADD_TEXT`: Creates white background layer
- `EDIT_OBJECT`: Modifies video properties and removes background

## Rendering Pipeline

### Layer Ordering
The critical aspect of the Squantre feature is proper layer ordering to ensure the video appears on top of the white background:

1. **Background Layer**: White background text object with `targetTrackIndex: -1` (renders behind)
2. **Video Layer**: Transformed video with rounded square appearance (renders on top)

**Key Implementation Detail:**
- Uses `targetTrackIndex: -1` for background creation
- Negative track indices render below positive indices in the Remotion composition
- This ensures the white background appears behind the video, not in front of it

### Style Calculations
- **Container Styles**: `calculateContainerStyles()` handles positioning and transforms
- **Media Styles**: `calculateMediaStyles()` manages borders, shadows, and crop
- **Responsive Sizing**: Adapts to different canvas dimensions automatically

## Technical Implementation Details

### Canvas Size Responsiveness
```typescript
// 25% of smallest dimension ensures proper scaling across all canvas sizes
const squareSize = Math.min(size.width, size.height) * 0.25;
```

### Background Lifecycle Management
- Background objects are tagged with `squantreBackground: true`
- Links to parent video via `squantreVideoId`
- Automatic cleanup when Squantre is disabled

### Performance Considerations
- Minimal DOM operations through efficient state batching
- Reuses existing style calculation functions
- Leverages Remotion's optimized rendering pipeline

## Integration with Video Editor Architecture

### Follows Project Patterns
- **Event-Driven**: Uses established `@designcombo/events` system
- **State Management**: Integrates with existing Zustand store patterns
- **Component Structure**: Follows feature-based organization in `src/features/editor/`
- **Styling**: Uses existing style calculation utilities

### Extensibility
- Squantre properties stored in video details object
- Easy to extend with additional transformation options
- Compatible with existing video effects and properties

## Usage in Video Editor

### User Workflow
1. Select a video element on the timeline
2. Open video properties panel (right sidebar)
3. Toggle "Squantre" option in the Basic properties section
4. Video transforms to centered rounded square with white background
5. Toggle off to return to original video appearance

### Visual Result
- Video appears as a rounded square in the center of the composition
- White background fills the entire canvas area
- Video content scales to fill the square while maintaining aspect ratio (`objectFit: "cover"`)
- 25% border radius creates smooth rounded corners

This implementation provides a professional, polished video effect while maintaining full integration with the editor's existing architecture and performance characteristics.