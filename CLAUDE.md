# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
pnpm dev              # Start development server (http://localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # ESLint + Next.js linting
pnpm format           # Biome code formatting with tab indentation
```

### Database & Video Rendering
```bash
pnpm migrate:up       # Run database migrations
pnpm migrate:down     # Rollback migrations
pnpm cleanup-db       # Clean database
pnpm render:local     # Local video rendering (uses .remotion-design.json)
```

### Environment Setup
Required `.env` variables:
```env
NODE_ENV=""           # Environment setting
CUSTOM_KEY=""         # Application-specific config
DATABASE_URL=""       # PostgreSQL connection
```

## Architecture Overview

This is **CineTune**, a professional browser-based video editor built with Next.js 15, React 19, and Remotion 4. The application features timeline-based editing, AI-powered capabilities, real-time preview, and cloud rendering.

### Core Technology Stack
- **Next.js 15** - App Router with standalone output for containerization
- **React 19** - With strict mode disabled for performance
- **Remotion 4.0.315** - Video rendering and composition engine
- **@designcombo** packages - Custom timeline, state management, and event system
- **Zustand** - Primary state management with middleware
- **Radix UI** - Complete headless component library
- **Tailwind CSS 4** - Utility-first styling
- **Biome** - Code formatting and linting (replaces Prettier + ESLint)

### Editor Core Architecture

The video editor is built around these main systems:

#### 1. Timeline System (`src/features/editor/timeline/`)
- Multi-track support with unlimited video/audio/text tracks
- Frame-accurate editing at 30fps default
- Drag-and-drop functionality with context menus
- Zoom and scroll controls with playhead synchronization
- Uses `@designcombo/timeline` for core functionality

#### 2. Scene/Canvas (`src/features/editor/scene/`)
- Real-time preview rendering through `@remotion/player`
- Interactive element manipulation with Moveable.js
- Transform controls for scaling, rotation, positioning
- Drag-and-drop interface for media positioning

#### 3. Menu System (`src/features/editor/menu-item/`)
- **uploads.tsx** - A-Roll/B-Roll video organization with thumbnails
- **texts.tsx** - Text elements with AI caption generation
- **videos.tsx** - Pexels stock video integration
- **images.tsx** - Color grading (LUTs) and stock images
- **audios.tsx** - Audio track management
- **elements.tsx** - Graphic elements and shapes
- **voice-over.tsx** - AI-powered text-to-speech

#### 4. Control Panels (`src/features/editor/control-item/`)
Property editors for selected elements including transform, effects, gradients, and animations.

### State Management Architecture

#### Main Timeline Store (`src/features/editor/store/use-store.ts`)
Central state containing:
- `tracks[]` - Timeline tracks array
- `trackItemsMap` - Track items lookup for performance
- `activeIds[]` - Selected elements
- `playerRef` - Video player reference
- `duration`, `fps`, `scale`, `scroll` - Timeline state
- `size` - Canvas dimensions (default 1080x1920 for vertical video)

#### Specialized Stores
- **Upload Store** - A-Roll/B-Roll file management with thumbnail generation
- **Layout Store** - UI panel states and responsive breakpoints
- **Scene Store** - Canvas interaction state

### A-Roll/B-Roll System

The uploads system features sophisticated content organization:
- **A-Roll** - Primary content videos (blue badge with crown icon)
- **B-Roll** - Secondary footage (green badge with layers icon)
- **AI Integration** - Automatic B-roll timing suggestions via `/api/generate-broll-timing`
- **Thumbnail Generation** - Automatic video thumbnails with fallback to video icons
- **Context System** - B-roll videos can have context descriptions for AI placement

### API Routes Architecture

#### Video Rendering (`/api/render/`)
- `POST /api/render` - Initialize video render job
- `GET /api/render/[id]` - Get render status and progress
- `POST /api/render/start` - Start render process
- Uses Remotion renderer with external GCP service integration

#### AI Services
- `POST /api/generate-captions` - Speech-to-text with timing
- `POST /api/generate-broll-timing` - AI B-roll placement suggestions
- `GET /api/captions/[jobId]` - Polling endpoint for caption results

#### Media Management
- `GET /api/pexels` & `/api/pexels-videos` - Stock media search
- `POST /api/uploads/presign` - Generate cloud storage URLs
- `POST /api/uploads/verify-local` - Development file verification
- `POST /api/uploads/delete` - Remove uploaded files

### Key Component Patterns

#### Lazy Loading
Main editor components use React.lazy() for performance:
```typescript
const Timeline = lazy(() => import("./timeline/timeline"));
const Scene = lazy(() => import("./scene/scene"));
```

#### Responsive Design
Uses `@radix-ui/react-resize` with breakpoints:
- Desktop: Full editor with resizable panels
- Mobile: Drawer-based UI with bottom sheets

#### Event-Driven Architecture
Uses `@designcombo/events` for loose coupling between editor components:
```typescript
import { dispatch } from "@designcombo/events";
dispatch(ADD_VIDEO, { payload, options });
```

### Development Patterns

#### File Organization
- Feature-based structure in `src/features/editor/`
- UI components in `src/components/ui/` (37 Radix-based components)
- Global utilities in `src/utils/` and `src/hooks/`
- Remotion video components in `src/remotion/`

#### Code Quality
- **Biome** formatting with tab indentation and double quotes
- TypeScript strict mode with comprehensive type checking
- Import organization enabled
- Specific rule overrides for video editor requirements

#### Performance Optimizations
- Thumbnail caching system for media previews
- Virtualized timeline rendering for large projects
- Efficient state updates with Zustand middleware
- Memory monitoring utilities for debugging

### Deployment Configuration

#### Next.js Config
- **Standalone output** for container deployment
- **Source maps disabled** in production for security
- **Remotion externals** properly configured for server-side rendering
- **Worker handling** for OPFS and blob URLs

#### Docker Support
The standalone build creates a self-contained deployment suitable for containerization with external PostgreSQL database support.

### Video Rendering Pipeline

1. **Timeline Composition** - Built using `@designcombo/timeline`
2. **Remotion Rendering** - Server-side video generation
3. **Progress Tracking** - Real-time render status via WebSocket
4. **Export Options** - Multiple formats and resolutions
5. **Cloud Integration** - External GCP service for heavy rendering

### AI Features Integration

#### Caption Generation
- Speech-to-text processing with timing synchronization
- Auto-generated captions with word-level timestamps
- Manual caption editing and styling options

#### B-Roll Intelligence
- Analyzes A-Roll content for strategic B-roll placement
- Provides reasoning and confidence scores for suggestions
- Supports multiple B-roll clips with timing optimization

### Common Development Tasks

When modifying the editor:
1. **Timeline changes** - Update both store state and timeline component
2. **New menu items** - Add to menu-item directory and update menu-list.tsx
3. **Control panels** - Create in control-item directory for property editing
4. **API integration** - Use React Query for server state management
5. **State updates** - Use Zustand actions to maintain consistency

### Important Implementation Notes

- React strict mode is disabled for Remotion compatibility
- Canvas size defaults to 1080x1920 (vertical video format)
- All video operations use frame-accurate positioning (30fps default)
- Upload system supports both local development and cloud deployment
- B-Roll thumbnails are generated automatically with efficient caching
- Timeline operations use event-driven architecture for component decoupling