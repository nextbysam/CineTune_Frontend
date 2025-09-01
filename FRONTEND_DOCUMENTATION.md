# CineTune Frontend Architecture Documentation

## Overview
CineTune is an AI-powered video editor built with Next.js 15, featuring a sophisticated timeline-based editing interface, real-time preview capabilities, and AI-powered features for caption generation and B-roll timing. The frontend is architected as a complex video editing application with Remotion integration for video rendering.

## Technology Stack

### Core Framework
- **Next.js 15.3.2** - Full-stack React framework with App Router
- **React 19** - UI library with latest features
- **TypeScript 5** - Type safety and developer experience

### UI & Styling
- **Tailwind CSS 4** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Framer Motion 11** - Animation and gesture library
- **Lucide React** - Icon system

### Video Editing & Rendering
- **Remotion 4.0.315** - Video creation and rendering framework
- **@designcombo/timeline** - Custom timeline component library
- **@designcombo/state** - State management for timeline operations
- **@designcombo/frames** - Frame-based operations

### State Management
- **Zustand 5** - Lightweight state management
- **@tanstack/react-query 5** - Server state management and caching

### Additional Features
- **@ai-sdk/google** - AI integration for captions and B-roll
- **Socket.io-client** - Real-time communication
- **Kysely** - Type-safe SQL query builder
- **Axios** - HTTP client for API requests

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── edit/              # Editor pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage (redirects to editor)
├── components/            # Reusable UI components
│   ├── color-picker/      # Advanced color picker system
│   ├── shared/            # Shared utilities (icons, logos, draggable)
│   └── ui/                # Radix UI-based components
├── features/              # Feature-specific components
│   └── editor/            # Main video editor feature
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configurations
├── remotion/              # Remotion video rendering components
├── store/                 # Global state management
├── utils/                 # Utility functions
└── constants/             # Application constants
```

## Core Features & Components

### 1. Video Editor (`src/features/editor/`)
The heart of the application, containing all video editing functionality:

#### Main Editor Component (`editor.tsx`)
- **Layout**: Responsive design with resizable panels
- **Scene Management**: Canvas-based video preview with zoom/pan controls
- **Timeline Integration**: Custom timeline with drag-and-drop capabilities
- **State Management**: Complex state orchestration with multiple stores
- **Font Management**: Dynamic font loading and rendering
- **Responsive Design**: Adapts between desktop and mobile layouts

#### Timeline System (`timeline/`)
- **Custom Timeline Canvas**: High-performance canvas-based timeline
- **Track Items**: Support for text, images, videos, and audio
- **Playhead Control**: Frame-accurate scrubbing and playback
- **Drag & Drop**: Intuitive media manipulation
- **Zoom & Pan**: Detailed timeline navigation
- **Audio Visualization**: Waveform rendering for audio tracks

#### Control Systems
- **Property Panels**: Dynamic controls based on selected items
- **Floating Controls**: Context-aware editing tools
- **Preset System**: Quick-apply text and style presets
- **Transform Controls**: Position, scale, rotation, and opacity
- **Typography**: Font selection, sizing, and styling

#### Media Management
- **Upload System**: File upload with progress tracking
- **Media Library**: Images, videos, audio, and fonts
- **Pexels Integration**: Stock media search and integration
- **Local Storage**: Cached media for performance

### 2. Component Architecture

#### UI Components (`components/ui/`)
Consistent design system based on Radix UI:
- **Form Controls**: Buttons, inputs, selects, sliders
- **Layout**: Dialogs, popovers, accordions, tabs
- **Data Display**: Cards, badges, tooltips
- **Feedback**: Progress bars, loading states, toast notifications

#### Color Picker System (`components/color-picker/`)
Advanced color management:
- **Solid Colors**: HSB/RGB color selection
- **Gradients**: Linear and radial gradient creation
- **Alpha Channel**: Transparency controls
- **Color Utilities**: Format conversion and validation

#### Shared Components (`components/shared/`)
- **Draggable**: Reusable drag-and-drop wrapper
- **Icons & Logos**: SVG icon system
- **Modal Upload**: File upload interface

### 3. State Management

#### Editor Store (`features/editor/store/`)
Complex state management for video editing:
- **Timeline State**: Tracks, items, transitions, and playback
- **Selection State**: Active items and their properties
- **Layout State**: Panel sizes and responsive configuration
- **Data State**: Fonts, media, and cached resources
- **Crop State**: Image/video cropping functionality

#### Global Stores (`store/`)
- **Scene Store**: Top-level scene configuration
- **User Session**: Authentication and preferences

### 4. API Integration (`app/api/`)

#### Core APIs
- **Render System**: Video export and processing
- **Caption Generation**: AI-powered subtitle creation
- **B-roll Timing**: AI-suggested video timing
- **Media Processing**: Upload, verification, and optimization
- **Health Checks**: System status monitoring

#### External Integrations
- **Pexels API**: Stock media search and download
- **Video Processing**: LUT application and grading
- **File Management**: Presigned uploads and CDN integration

### 5. Rendering System (`remotion/`)

#### Remotion Integration
- **TimelineVideo Component**: Main video composition
- **Dynamic Properties**: Runtime configuration of video parameters
- **Frame Calculation**: Accurate duration and timing
- **Export Pipeline**: High-quality video rendering

## Key Workflows

### 1. Video Creation Workflow
1. **Project Initialization**: Create new video project with default settings
2. **Media Import**: Upload or select media from libraries
3. **Timeline Assembly**: Drag media to timeline tracks
4. **Property Editing**: Adjust timing, transforms, and effects
5. **Preview & Review**: Real-time preview with playback controls
6. **Export**: Render final video through Remotion

### 2. AI-Powered Features
1. **Caption Generation**: Automatic subtitle creation from audio
2. **B-roll Timing**: AI suggests optimal timing for supplementary footage
3. **Smart Composition**: Auto-arrangement of timeline elements

### 3. Responsive Design Pattern
- **Desktop**: Full-featured interface with sidebars and detailed controls
- **Mobile**: Streamlined interface with bottom sheets and simplified controls
- **Tablet**: Adaptive layout that scales between modes

## Performance Optimizations

### 1. Timeline Performance
- **Canvas Rendering**: Hardware-accelerated timeline visualization
- **Virtualization**: Only render visible timeline segments
- **Debounced Updates**: Reduced re-renders during scrubbing
- **Worker Threads**: Background processing for heavy operations

### 2. Media Handling
- **Lazy Loading**: Progressive media loading as needed
- **Thumbnail Generation**: Cached previews for fast scrubbing
- **Compression**: Optimized media formats for web delivery
- **CDN Integration**: Global media distribution

### 3. State Optimization
- **Selective Updates**: Granular state updates to minimize re-renders
- **Memoization**: Cached computations for expensive operations
- **Batch Operations**: Grouped state changes for better performance

## Development Guidelines

### 1. Code Organization
- **Feature-Based Structure**: Related components grouped by functionality
- **Separation of Concerns**: Clear boundaries between UI, logic, and data
- **Reusable Components**: Shared components with consistent APIs
- **Type Safety**: Comprehensive TypeScript coverage

### 2. Styling Approach
- **Tailwind Utilities**: Utility-first styling approach
- **Component Variants**: Class Variance Authority for component variants
- **Responsive Design**: Mobile-first responsive development
- **Theme System**: Consistent color and spacing tokens

### 3. State Management Patterns
- **Local State**: React hooks for component-specific state
- **Feature State**: Zustand stores for feature-level state
- **Server State**: React Query for API data management
- **Derived State**: Computed values from base state

## Testing & Quality

### 1. Code Quality
- **Biome**: Formatting and linting
- **TypeScript**: Static type checking
- **ESLint**: Code quality rules
- **Prettier**: Code formatting

### 2. Build Configuration
- **Next.js**: Production-optimized builds
- **Webpack**: Custom configurations for workers and assets
- **Source Maps**: Disabled in production for security
- **Bundle Analysis**: Optimized bundle sizes

## Deployment & Infrastructure

### 1. Build Process
- **Standalone Output**: Self-contained deployment artifacts
- **Static Assets**: Optimized images and fonts
- **Environment Configuration**: Runtime environment variables
- **Production Optimizations**: Minification and compression

### 2. Server Configuration
- **Nginx**: Reverse proxy and static file serving
- **PM2**: Process management for Node.js
- **Health Monitoring**: Automated uptime checks
- **SSL/TLS**: Secure communications

## Security Considerations

### 1. File Upload Security
- **Type Validation**: Strict file type checking
- **Size Limits**: Prevent resource exhaustion
- **Virus Scanning**: Malware detection for uploads
- **Signed URLs**: Secure file access patterns

### 2. API Security
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Input Validation**: Server-side data validation
- **CSRF Protection**: Cross-site request forgery prevention
- **Secure Headers**: Security-focused HTTP headers

## Future Considerations

### 1. Scalability
- **Microservices**: Potential service decomposition
- **Caching Layers**: Redis for improved performance
- **CDN Expansion**: Global content delivery
- **Database Optimization**: Query optimization and indexing

### 2. Feature Expansion
- **Collaboration**: Real-time collaborative editing
- **Advanced Effects**: More sophisticated video effects
- **Template System**: Pre-built video templates
- **Analytics**: User behavior and performance tracking

## Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run linting
npm run format          # Format code with Biome

# Video Rendering
npm run render:local    # Local video rendering for testing
```

This documentation provides a comprehensive overview of the CineTune frontend architecture, serving as a reference for understanding the codebase structure, key components, and development patterns used throughout the application.