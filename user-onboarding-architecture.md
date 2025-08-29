# User Onboarding & Demo System Architecture

## Overview

The user onboarding system provides an interactive guided tour of the video editor, helping new users understand the interface and key features. The system is designed to be non-intrusive, contextual, and easily extensible.

## Architecture Components

### 1. Core Components

#### Demo Button Component
- **Location**: `src/components/ui/demo-button.tsx`
- **Purpose**: Floating action button to trigger guided tour
- **Position**: Bottom-right corner of editor interface
- **States**: Hidden, visible, active tour mode

#### Tour Provider
- **Location**: `src/features/editor/tour/tour-provider.tsx`
- **Purpose**: Context provider for tour state management
- **Responsibilities**:
  - Tour step management
  - Progress tracking
  - Tour completion state
  - Skip/restart functionality

#### Tour Step Component
- **Location**: `src/features/editor/tour/tour-step.tsx`
- **Purpose**: Individual tour step with overlay and content
- **Features**:
  - Spotlight highlighting
  - Content positioning
  - Navigation controls
  - Step validation

### 2. Tour System Architecture

```
Tour System
├── TourProvider (Context)
│   ├── Tour State Management
│   ├── Step Navigation Logic
│   └── Progress Persistence
├── TourStep Components
│   ├── Overlay System
│   ├── Spotlight Highlighting
│   └── Content Positioning
└── Demo Integration
    ├── Interactive Examples
    ├── Sample Data Loading
    └── Feature Demonstrations
```

### 3. Tour Flow Architecture

#### Step Definition Structure
```typescript
interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector or element ID
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'hover' | 'input';
  validation?: () => boolean;
  onEnter?: () => void;
  onExit?: () => void;
}
```

#### Tour Categories
1. **Interface Overview** - Main UI elements
2. **Timeline Basics** - Timeline navigation and controls
3. **Adding Content** - Media uploads and library usage
4. **Text & Captions** - Adding text, creative captions workflow
5. **Color Grading** - Applying cinematic effects to videos
6. **Editing Features** - Effects and modifications
7. **Rendering & Export** - Final output generation

### 4. State Management Integration

#### Tour Store (Zustand)
```typescript
interface TourState {
  isActive: boolean;
  currentStep: number;
  completedSteps: string[];
  hasCompletedTour: boolean;
  tourData: TourStep[];
  
  startTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  setStep: (step: number) => void;
}
```

#### Integration with Editor State
- Non-intrusive overlay system
- Temporary demo data injection
- Reversible state changes
- Original functionality preservation

## Implementation Strategy

### 1. Progressive Enhancement
- **Base Experience**: Full editor functionality without tour
- **Enhanced Experience**: Tour overlay when activated
- **Graceful Degradation**: Tour disabled if conflicts detected

### 2. Context-Aware Guidance
- **Dynamic Content**: Tour adapts to user's current state
- **Conditional Steps**: Skip irrelevant steps based on user progress
- **Smart Positioning**: Automatic tooltip positioning to avoid clipping

### 3. Demo Data System
- **Sample Assets**: Preloaded images, videos, audio
- **Template Compositions**: Ready-made examples
- **Reversible Changes**: Easy restoration of user's work

## Technical Implementation

### 1. Overlay System
```typescript
// Spotlight highlighting with CSS
.tour-spotlight {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  z-index: 9999;
}

.tour-highlight {
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.8);
  position: relative;
  z-index: 10000;
}
```

### 2. Step Navigation
- **Keyboard Support**: Arrow keys, ESC to exit
- **Mouse Controls**: Click to advance, outside click handling
- **Touch Support**: Swipe gestures on mobile devices

### 3. Progress Persistence
- **Local Storage**: Tour progress and completion status
- **Session Recovery**: Resume interrupted tours
- **Analytics Integration**: Track tour engagement metrics

## Feature Specifications

### 1. Demo Button Features
- **Floating Position**: Bottom-right corner, non-obstructive
- **Visual States**: 
  - Idle: Info icon with subtle animation
  - Hover: Expanded tooltip preview
  - Active: Different styling during tour
- **Accessibility**: ARIA labels, keyboard navigation

### 2. Tour Content Features
- **Interactive Elements**: Clickable examples within tour
- **Media Integration**: Video demonstrations of features
- **Contextual Help**: Links to detailed documentation
- **Multi-language Support**: Internationalization ready
- **Workflow Demonstrations**: Step-by-step process explanations
- **Feature Deep-Dives**: Detailed explanations of complex features like captions and color grading

### 3. Advanced Features
- **Tour Branching**: Different paths based on user type
- **Feature Flags**: Enable/disable specific tour sections
- **A/B Testing**: Multiple tour variations
- **Analytics**: Tour completion rates and drop-off points

## Integration Points

### 1. Editor Integration
- **Non-Destructive**: No modification of existing editor state
- **Event Handling**: Coordinate with existing event systems
- **Performance**: Minimal impact on editor performance

### 2. Component Integration
- **Portal Rendering**: Tour components render in portal
- **Z-Index Management**: Proper layering with existing modals
- **Responsive Design**: Tour adapts to different screen sizes

### 3. Data Integration
- **Sample Content**: Integration with existing data providers
- **Asset Loading**: Efficient loading of demo assets
- **State Restoration**: Clean restoration after tour completion

## User Experience Design

### 1. Tour Triggers
- **First Visit**: Automatic tour prompt for new users
- **Manual Activation**: Demo button always available
- **Feature Introduction**: Mini-tours for new features
- **Help Context**: Integrated with help system

### 2. Progression System
- **Linear Flow**: Step-by-step progression
- **Non-Linear Options**: Jump to specific sections
- **Completion Tracking**: Visual progress indicators
- **Restart Capability**: Ability to retake tours

### 3. Customization Options
- **Tour Preferences**: User can customize tour behavior
- **Speed Controls**: Adjustable tour pacing
- **Content Depth**: Basic vs. advanced explanations
- **Accessibility Options**: High contrast, screen reader support

## Security & Privacy

### 1. Data Handling
- **No Personal Data**: Tour system doesn't collect sensitive information
- **Local Storage Only**: Progress stored locally
- **Optional Analytics**: User consent for usage tracking

### 2. Content Security
- **Sanitized Content**: All tour content properly sanitized
- **Asset Validation**: Demo assets verified and secure
- **Permission Checks**: Respect user's editor permissions

## Performance Considerations

### 1. Lazy Loading
- **Component Loading**: Tour components loaded on demand
- **Asset Optimization**: Demo assets optimized for size
- **Code Splitting**: Tour system in separate bundle

### 2. Memory Management
- **Cleanup**: Proper cleanup when tour exits
- **Event Listeners**: Efficient event listener management
- **DOM Manipulation**: Minimal DOM impact

### 3. Accessibility
- **ARIA Support**: Full screen reader compatibility
- **Keyboard Navigation**: Complete keyboard accessibility
- **Focus Management**: Proper focus handling during tour

## Extensibility

### 1. Adding New Tours
- **Configuration-Driven**: Easy addition of new tour steps
- **Template System**: Reusable tour step templates
- **Plugin Architecture**: Third-party tour extensions

### 2. Customization
- **Theme Support**: Tour styling matches application theme
- **Branding**: Customizable branding and messaging
- **Localization**: Multi-language support architecture

## Interactive Tour Features

### Dynamic Section Navigation
The tour system automatically switches between sidebar sections and highlights specific UI elements:

#### **Automatic Section Switching**
- **Texts Section**: Tour switches to texts when explaining captions and dropdowns
- **Color Grade Section**: Automatically navigates to images section for color grading
- **Uploads Section**: Switches to uploads when explaining A-Roll/B-Roll organization
- **Visual Feedback**: Users see the interface change contextually during the tour

#### **Element-Specific Highlighting**
- **Button Highlighting**: Specific buttons like "Add Creative Captions" are precisely targeted
- **Dropdown Targeting**: Individual dropdowns for region and words-at-a-time are highlighted
- **Interactive Elements**: Users can see exactly which controls are being discussed

## Detailed Feature Explanations in Tours

### 1. Creative Captions Workflow Tutorial
The tour system includes comprehensive explanations with interactive highlighting:

#### **Add Creative Captions Process**
- **Prerequisites**: Requires audio or video content in the timeline
- **Step 1**: Click "Add Creative Captions" button in Texts section
- **Step 2**: System processes the audio/video content (user sees progress indicator)
- **Step 3**: AI generates automatic subtitles with timing
- **Wait Period**: Processing takes time - users are informed to wait
- **Result**: Captions are generated and ready for timeline integration

#### **Load Captions Process**
- **Purpose**: Adds the processed captions directly to the timeline
- **Prerequisites**: Captions must be generated first via "Add Creative Captions"
- **Action**: One-click addition of all caption segments to timeline
- **Positioning**: Captions are automatically positioned and timed correctly

#### **Caption Configuration Dropdowns**
- **Region Dropdown**: Controls the display area/region where captions appear on screen
- **Words-at-a-Time Dropdown**: Sets how many words appear in each caption segment for optimal reading speed

### 2. Color Grading Workflow Tutorial
The tour explains the professional color grading system:

#### **Color Grading Process**
- **Detection**: System automatically detects videos in the timeline
- **Preview Generation**: Backend generates preview frames showing different cinematic looks
- **LUT Selection**: Users see side-by-side comparisons of various color lookup tables (LUTs)
- **Application**: Click any preview to apply that cinematic look to your video
- **Timeline Integration**: The graded video replaces the original in the timeline

#### **Cinematic Effects Available**
- Professional color grading using industry-standard LUTs
- Real-time preview generation for immediate visual feedback
- One-click application with timeline integration
- Non-destructive editing - original video preserved

### 3. A-Roll/B-Roll Organization Tutorial
The tour covers the sophisticated content organization system:

#### **A-Roll (Main Video) Section**
- **Purpose**: Primary content, main narrative videos
- **Visual Indicators**: Blue badges with crown icons
- **Upload Process**: Click section header to upload main content
- **Usage**: Perfect for talking head videos, primary content, hero footage

#### **B-Roll (Supporting Video) Section**
- **Purpose**: Secondary content, supplementary footage
- **Visual Indicators**: Green badges with layers icons
- **Upload Process**: Click section header to upload supporting content
- **Usage**: Background footage, cutaways, supporting visuals

### 4. Text Section Complete Workflow
The tour provides comprehensive text and caption guidance:

#### **Text Elements**
- **Add Text**: Simple text overlays that can be dragged to timeline
- **Customization**: Full font, color, and positioning control
- **Timeline Integration**: Drag-and-drop or click-to-add functionality

#### **Caption Configuration**
- **Region Selection**: Choose where captions appear (top, center, bottom of video)
- **Words Per Caption**: Control reading speed and caption density
- **Timing Control**: Precise caption timing and duration management

## Tour Implementation Strategy

### 1. Progressive Disclosure
- **Basic Overview**: Start with high-level interface tour
- **Feature Deep-Dives**: Detailed explanations of complex workflows
- **Contextual Help**: Just-in-time information when users need it

### 2. Workflow-Based Learning
- **Process Explanation**: Step-by-step workflow breakdowns
- **Prerequisites**: Clear explanation of what's needed before starting
- **Expected Outcomes**: Users understand what results to expect

### 3. Visual Learning Integration
- **Spotlight Highlighting**: Draw attention to relevant interface elements
- **Interactive Demonstrations**: Users can follow along with real interface
- **Dynamic Section Switching**: Tour automatically navigates to relevant sidebar sections
- **Specific Element Targeting**: Highlights individual buttons, dropdowns, and controls
- **Progress Indicators**: Show multi-step processes clearly
- **Contextual Navigation**: Automatically switches UI context when explaining features

This architecture ensures a seamless, educational user experience that enhances rather than interrupts the core video editing workflow, with particular attention to complex features like AI captions and professional color grading.