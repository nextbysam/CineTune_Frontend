# Frontend Architecture - React Video Editor

## Project Overview

CineTune is a Next.js-based React video editor application that provides AI-powered video editing capabilities with a timeline-based interface. The application uses Remotion for video rendering and includes features like captions generation, B-roll timing, and various video effects.

## Technology Stack

### Core Framework
- **Next.js 15.3.2** - React framework with App Router
- **React 19.0.0** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling

### Video Processing
- **Remotion 4.0.315** - Video rendering engine
- **@remotion/player** - Video playback component
- **@remotion/bundler** - Asset bundling for video
- **@remotion/renderer** - Server-side rendering

### State Management
- **Zustand 5.0.4** - Primary state management
- **@designcombo/state** - Custom state management for editor
- **@tanstack/react-query** - Server state management

### UI Components
- **Radix UI** - Headless UI components
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **Vaul** - Drawer component

### External Services
- **AI SDK** - Google Vertex AI integration
- **Pexels API** - Stock media integration
- **Socket.IO** - Real-time communication

## Architecture Patterns

### 1. Feature-Based Architecture

The application follows a feature-based structure with the main editor functionality contained in `/src/features/editor/`:

```
src/features/editor/
├── constants/       # Configuration constants
├── control-item/    # Property controls for timeline items
├── data/           # Data providers and constants
├── hooks/          # Custom React hooks
├── interfaces/     # TypeScript interfaces
├── menu-item/      # Sidebar menu components
├── player/         # Video player components
├── scene/          # Canvas/scene management
├── store/          # State management stores
├── timeline/       # Timeline UI components
└── utils/          # Utility functions
```

### 2. State Management Architecture

The application uses multiple state management solutions:

#### Primary Store (Zustand)
- **Location**: `/src/features/editor/store/use-store.ts`
- **Purpose**: Timeline state, player refs, composition data
- **Key State**:
  - Timeline configuration (duration, fps, scale, scroll)
  - Track items and transitions
  - Player references
  - Scene moveable references

#### Specialized Stores
- **Data State**: Fonts, compact fonts, external resources
- **Layout Store**: UI layout and panel states  
- **Crop Store**: Image/video cropping functionality
- **Upload Store**: File upload management
- **Download State**: Render progress and downloads

#### External State
- **@designcombo/state**: Core editor state management
- **React Query**: API data fetching and caching

### 3. Component Architecture

#### Core Components Structure
```
src/components/
├── ui/              # Reusable UI components (shadcn/ui style)
├── shared/          # Shared business components
└── color-picker/    # Specialized color picker component
```

#### Editor Component Hierarchy
```
Editor (main container)
├── Navbar (top navigation)
├── ResizablePanelGroup
│   ├── MenuList (left sidebar)
│   ├── Scene (center canvas)
│   └── ControlItem (right properties panel)
└── Timeline (bottom timeline)
```

### 4. API Architecture

#### Next.js API Routes Structure
```
src/app/api/
├── render/              # Video rendering endpoints
├── uploads/             # File upload management
├── captions/            # AI caption generation
├── generate-broll-timing/ # AI B-roll timing
├── pexels/             # Stock media integration
└── processing-status/   # Job status tracking
```

#### Data Flow
1. **Client → API Route** - User interactions trigger API calls
2. **API Route → External Services** - Integrates with AI services, Pexels
3. **Background Jobs** - Long-running tasks (rendering, AI processing)
4. **Socket.IO** - Real-time updates for job progress

## Key Features Implementation

### 1. Timeline System
- **Components**: `/src/features/editor/timeline/`
- **State**: Track items, transitions, playhead position
- **Interactions**: Drag & drop, resizing, splitting
- **Rendering**: Canvas-based timeline with custom drawing

### 2. Video Player Integration
- **Remotion Player**: Handles video playback and scrubbing
- **Composition**: Dynamic video composition based on timeline state
- **Items**: Audio, video, text, image track items

### 3. Real-time Collaboration Ready
- **State Recovery**: `/src/lib/state-recovery.ts`
- **Session Management**: User session tracking
- **Background Jobs**: Job manager for long-running tasks

### 4. AI Integration
- **Caption Generation**: Automatic subtitle generation
- **B-roll Timing**: AI-powered B-roll insertion timing
- **Content Analysis**: Video content understanding

## Styling Architecture

### Tailwind Configuration
- **Custom Design System**: Extended Tailwind with custom colors
- **Component Classes**: Utility-first approach
- **Responsive Design**: Mobile-first responsive patterns

### CSS Organization
- **Global Styles**: `/src/app/globals.css`
- **Component Styles**: Co-located with components
- **Animation Classes**: Framer Motion integration

## Performance Optimizations

### 1. Code Splitting
- **Next.js Automatic**: Route-based splitting
- **Dynamic Imports**: Heavy components loaded on demand
- **Remotion Lazy Loading**: Video processing components

### 2. State Optimization  
- **Zustand Selectors**: Prevent unnecessary re-renders
- **React Query**: Efficient server state caching
- **Timeline Virtualization**: Only render visible timeline items

### 3. Asset Management
- **Static Assets**: Public folder organization
- **Font Loading**: Optimized web font loading
- **Image Optimization**: Next.js Image component

## Development Workflow

### Build Process
- **Development**: `npm run dev` - Next.js dev server
- **Production**: `npm run build` - Optimized build
- **Linting**: Biome for code formatting and linting

### File Organization Principles
1. **Feature Co-location**: Related files grouped together
2. **Clear Separation**: UI, logic, and data layers separated
3. **Consistent Naming**: Kebab-case for files, PascalCase for components
4. **Index Files**: Clean exports from feature directories

## Extensibility Points

### 1. Timeline Items
- **Add New Types**: Extend track item interfaces and renderers
- **Custom Controls**: Add property panels for new item types

### 2. AI Integrations
- **New Providers**: Additional AI service integrations
- **Custom Workflows**: Extended AI-powered features

### 3. Export Formats
- **Remotion Extensions**: New output formats and configurations
- **Custom Renderers**: Alternative rendering pipelines

## Security Considerations

- **API Route Protection**: Input validation and sanitization
- **File Upload Security**: Type checking and size limits
- **External API Keys**: Secure environment variable management
- **User Session Management**: Secure session handling

## Deployment Architecture

- **Containerized Deployment**: Docker support
- **Nginx Configuration**: Reverse proxy setup
- **PM2 Process Management**: Production process management
- **Database Integration**: PostgreSQL with Kysely query builder

This architecture provides a scalable, maintainable foundation for a complex video editing application with real-time features and AI integration capabilities.