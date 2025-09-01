# CineTune Frontend Architecture Documentation

## Overview

CineTune is a Next.js-based video editing application that provides a comprehensive video editing experience in the browser. Built with React, TypeScript, and modern web technologies, it offers timeline editing, real-time preview, multi-track support, and AI-powered features.

## Tech Stack

### Core Framework
- **Next.js 15.3.2** - React framework with app router
- **React 19** - UI library
- **TypeScript 5** - Type safety and development experience

### State Management
- **Zustand 5.0.4** - Global state management
- **@designcombo/state 5.1.0** - Editor-specific state management
- **@designcombo/events 1.0.2** - Event system for editor

### UI/UX Libraries
- **Radix UI** - Headless UI components (accordion, dialog, popover, etc.)
- **Tailwind CSS 4** - Utility-first CSS framework
- **Framer Motion 11** - Animation library
- **Lucide React** - Icon library

### Video Processing
- **Remotion 4.0.315** - Video rendering engine
  - `@remotion/player` - Video player component
  - `@remotion/renderer` - Server-side rendering
  - `@remotion/bundler` - Asset bundling
  - `@remotion/media-utils` - Media utilities

### Timeline & Editor
- **@designcombo/timeline 5.1.0** - Timeline component
- **@designcombo/frames 0.0.3** - Frame management
- **@interactify/toolkit 1.0.0** - Interactive elements

### Data Management
- **@tanstack/react-query 5.81.5** - Server state management
- **SWR 2.3.3** - Additional data fetching
- **Kysely 0.28.2** - Type-safe SQL query builder
- **pg 8.16.3** - PostgreSQL client

### AI Integration
- **@ai-sdk/google 1.2.18** - Google AI SDK
- **@ai-sdk/google-vertex 2.2.22** - Google Vertex AI
- **@ai-sdk/react 1.2.12** - React AI hooks

## Project Structure

```
src/
├── app/                        # Next.js app router
│   ├── api/                   # API routes
│   │   ├── render/           # Video rendering endpoints
│   │   ├── captions/         # AI caption generation
│   │   ├── broll-timing/     # B-roll timing API
│   │   ├── uploads/          # File upload management
│   │   └── pexels/          # Stock media integration
│   ├── edit/                 # Editor pages
│   │   └── [...id]/         # Dynamic editor routes
│   ├── layout.tsx           # Root layout
│   └── page.tsx            # Home page
├── components/              # Shared components
│   ├── ui/                 # UI component library
│   ├── color-picker/       # Advanced color picker
│   └── shared/            # Common components
├── features/               # Feature modules
│   └── editor/            # Main video editor
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
├── store/                 # Global state stores
└── utils/                 # Helper functions
```

## Editor Architecture

### Core Components

#### 1. Editor (`src/features/editor/editor.tsx`)
- Main editor container component
- Manages overall editor state and layout
- Handles responsive design (mobile/desktop)
- Integrates all editor subsystems

#### 2. Scene (`src/features/editor/scene/`)
- Canvas area for video preview
- Handles element selection and manipulation
- Provides drag-and-drop functionality
- Real-time preview rendering

#### 3. Timeline (`src/features/editor/timeline/`)
- Multi-track timeline interface
- Supports video, audio, image, and text tracks
- Drag-and-drop track items
- Zoom and scroll controls
- Playhead synchronization

#### 4. Menu System (`src/features/editor/menu-item/`)
- **Videos** - Stock video integration (Pexels)
- **Images** - Stock image library
- **Texts** - Text element creation and presets
- **Audios** - Audio track management
- **Uploads** - User file uploads
- **Elements** - Graphic elements and shapes
- **Voice-over** - AI voice generation

#### 5. Control Panels (`src/features/editor/control-item/`)
- Property editors for selected elements
- Type-specific controls (video, audio, text, image)
- Common controls (transform, opacity, effects)
- Smart controls with AI assistance

### State Management

#### Editor Store (`src/features/editor/store/use-store.ts`)
```typescript
interface ITimelineStore {
  duration: number;           // Project duration
  fps: number;               // Frames per second
  tracks: ITrack[];          // Timeline tracks
  trackItemsMap: Record<string, ITrackItem>;
  activeIds: string[];       // Selected elements
  timeline: Timeline | null; // Timeline instance
  playerRef: PlayerRef;      // Video player reference
  compositions: IComposition[]; // Video compositions
}
```

#### Additional Stores
- **Layout Store** - UI layout and panel states
- **Data State** - Media assets and fonts
- **Upload Store** - File upload management
- **Crop Store** - Image/video cropping state
- **Download State** - Export progress tracking

### Key Features

#### 1. AI-Powered Capabilities
- **Caption Generation** - Automatic subtitle creation
- **B-roll Timing** - AI-suggested video timing
- **Voice-over** - Text-to-speech integration
- **Smart Controls** - AI-assisted editing

#### 2. Media Management
- **Stock Integration** - Pexels API for videos/images
- **Upload System** - Local and cloud file handling
- **Format Support** - Video, audio, images
- **Thumbnail Generation** - Automatic previews

#### 3. Timeline Editing
- **Multi-track Support** - Unlimited video/audio tracks
- **Precision Editing** - Frame-accurate editing
- **Effects System** - Transitions and filters
- **Real-time Preview** - Instant feedback

#### 4. Export System
- **Multiple Formats** - Various resolution options
- **Progress Tracking** - Real-time export status
- **Local Rendering** - Browser-based processing
- **Server Rendering** - Cloud-based exports

## API Architecture

### Video Rendering (`/api/render/`)
- `POST /api/render` - Start video render
- `GET /api/render/[id]` - Get render status
- `GET /api/render/progress/[id]` - Render progress
- `POST /api/render/start` - Start render process

### AI Services
- `POST /api/generate-captions` - Generate video captions
- `POST /api/generate-broll-timing` - AI timing suggestions
- `GET /api/captions/[jobId]` - Get caption results

### Media APIs
- `GET /api/pexels` - Search Pexels images
- `GET /api/pexels-videos` - Search Pexels videos
- `POST /api/uploads/presign` - Get upload URLs
- `POST /api/uploads/verify-local` - Verify local files

### File Management
- `POST /api/uploads/delete` - Delete uploaded files
- `GET /api/uploads/url` - Get file URLs

## Component Architecture

### UI Components (`src/components/ui/`)
- **Accordion** - Collapsible sections
- **Button** - Various button styles
- **Dialog** - Modal dialogs
- **Dropdown Menu** - Context menus
- **Input/Textarea** - Form inputs
- **Slider** - Range controls
- **Tabs** - Tab navigation
- **Tooltip** - Hover information

### Color Picker (`src/components/color-picker/`)
Advanced color selection system with:
- **Solid Colors** - RGB/HSL/Hex selection
- **Gradients** - Linear/radial gradients
- **Alpha Channel** - Transparency support
- **Color Panels** - Visual color selection
- **Preset Colors** - Common color swatches

### Editor Controls (`src/features/editor/control-item/`)
- **Basic Controls** - Text, image, video, audio
- **Common Effects** - Opacity, blur, brightness
- **Transform** - Position, scale, rotation
- **Advanced** - Shadow, outline, radius
- **Floating Controls** - Context-sensitive panels

## Hooks and Utilities

### Custom Hooks (`src/hooks/`)
- **use-media-query** - Responsive breakpoints
- **use-copy-to-clipboard** - Clipboard operations
- **use-pexels-images/videos** - Stock media fetching
- **use-autosize-textarea** - Dynamic text areas

### Editor Hooks (`src/features/editor/hooks/`)
- **use-timeline-events** - Timeline interaction
- **use-player-events** - Video player events
- **use-current-frame** - Frame synchronization
- **use-zoom** - Canvas zoom controls
- **use-auto-composition** - AI composition

### Utilities (`src/utils/`)
- **download.ts** - File download helpers
- **metadata.ts** - SEO metadata generation
- **session.ts** - User session management
- **upload-service.ts** - File upload handling

## Configuration

### Next.js Config (`next.config.ts`)
- **Standalone Output** - Containerized deployment
- **Remotion Integration** - External packages handling
- **Image Optimization** - Multi-domain support
- **Webpack Customization** - Worker and source map config

### Environment Variables
```env
PEXELS_API_KEY=          # Stock media access
NODE_ENV=                # Environment setting
CUSTOM_KEY=              # Additional config
```

### Build Scripts
- `pnpm dev` - Development server
- `pnpm build` - Production build
- `pnpm start` - Production server
- `pnpm lint` - Code linting
- `pnpm format` - Code formatting

## Performance Optimizations

### Code Splitting
- Dynamic imports for editor components
- Lazy loading of media assets
- Chunked bundle optimization

### Memory Management
- Efficient timeline rendering
- Thumbnail caching system
- Worker thread utilization

### State Recovery
- Automatic state persistence
- Session recovery on reload
- Background upload handling

## Development Guidelines

### File Organization
- Feature-based folder structure
- Consistent naming conventions
- Separation of concerns
- Modular component design

### State Management Patterns
- Zustand for global state
- React Query for server state
- Local state for UI interactions
- Event-driven architecture

### Code Quality
- TypeScript for type safety
- Biome for code formatting
- ESLint for code standards
- Component composition patterns

## Deployment

### Production Build
- Standalone Next.js output
- Docker container support
- Static asset optimization
- CDN integration

### Server Requirements
- Node.js runtime
- PostgreSQL database
- File storage system
- External API access (Pexels, AI services)

This architecture provides a scalable, maintainable foundation for the CineTune video editing platform, supporting both current features and future enhancements.