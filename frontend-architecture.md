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

### 3. Intelligent Video Encoding System
- **Automatic Compression**: Smart detection of videos that benefit from encoding
- **File Size Optimization**: Reduces video files by up to 95% while preserving quality
- **Background Processing**: Non-blocking FFmpeg encoding with real-time progress tracking
- **Dynamic Upload Limits**: Accepts videos up to 1GB with intelligent size thresholds
- **Format-Aware Logic**: Different compression strategies for MOV, MP4, AVI, and other formats
- **API Endpoints**: `/src/app/api/uploads/encode-video/` for server-side encoding
- **Client Integration**: Seamless integration with upload store and UI progress displays

### 4. Real-time Collaboration Ready
- **State Recovery**: `/src/lib/state-recovery.ts`
- **Session Management**: User session tracking
- **Background Jobs**: Job manager for long-running tasks

### 5. AI Integration
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
- **Video Compression**: Automatic encoding reduces file sizes by up to 95%
- **Smart Caching**: Encoded videos cached for faster subsequent loads

### 4. Upload System Optimization
- **Dynamic Size Limits**: Intelligent file size handling based on media type
- **Background Encoding**: FFmpeg processing doesn't block user interactions
- **Progress Tracking**: Real-time encoding progress with compression metrics
- **Format Detection**: Automatic detection of high-bitrate formats needing compression

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

## Claude MCP-Like Architecture for Scriptable Editor

### Overview
The editor implements an MCP-inspired architecture where Claude acts as an intelligent agent that can execute editor operations through a structured tool interface, similar to how MCP servers expose tools to Claude.

### 1. Tool Registry System

#### Core Interface
```typescript
interface EditorTool {
  name: string
  description: string
  parameters: z.ZodSchema
  category: 'timeline' | 'media' | 'effects' | 'export' | 'ai'
  execute: (params: any, context: EditorContext) => Promise<ToolResult>
  requiredPermissions?: string[]
}

interface EditorContext {
  timeline: TimelineState
  scene: SceneState
  selectedItems: string[]
  stateManager: StateManager
  stores: {
    useStore: ReturnType<typeof useStore>
    useDataState: ReturnType<typeof useDataState>
    useLayoutStore: ReturnType<typeof useLayoutStore>
  }
}

interface ToolResult {
  success: boolean
  data?: any
  message?: string
  stateChanges?: string[]
}
```

#### Tool Categories and Examples

**Timeline Tools:**
- `add_media(type, url, position, track)` - Add video/audio/image to timeline
- `split_item(itemId, time)` - Split timeline item at specified time
- `adjust_timing(itemId, start, end)` - Modify item timing
- `add_transition(type, duration, position)` - Add transitions between clips
- `duplicate_item(itemId, offset)` - Duplicate timeline items
- `delete_items(itemIds)` - Remove items from timeline

**Media Tools:**
- `search_stock_video(query, duration?, orientation?)` - Find Pexels videos
- `search_stock_images(query, orientation?, color?)` - Find Pexels images
- `upload_media(file, type)` - Upload user media
- `generate_captions(videoId, style?, language?)` - AI caption generation
- `generate_broll_timing(transcript, duration)` - AI B-roll placement

**Effects Tools:**
- `apply_filter(itemIds, type, intensity)` - Visual effects (blur, brightness, etc.)
- `apply_lut(itemIds, lutName)` - Color grading
- `add_text(content, style, position, duration)` - Add text overlays
- `apply_audio_effect(itemIds, effect, params)` - Audio processing
- `crop_media(itemId, cropArea)` - Crop video/images

**Export Tools:**
- `render_video(format, quality, range?)` - Export video
- `generate_thumbnail(time, size)` - Create thumbnail
- `export_project(format)` - Export project file
- `get_render_progress(renderId)` - Check render status

**AI Tools:**
- `analyze_content(itemIds, analysisType)` - Content analysis
- `suggest_edits(context, style)` - AI editing suggestions  
- `auto_sync_audio(videoId, audioId)` - Auto audio sync
- `generate_script(topic, duration, style)` - Script generation

### 2. Claude Agent Implementation

#### Agent Core
```typescript
class ClaudeEditorAgent {
  private tools: Map<string, EditorTool>
  private context: EditorContext
  private conversationHistory: Message[]
  
  constructor(editorContext: EditorContext) {
    this.context = editorContext
    this.tools = new Map()
    this.initializeTools()
  }
  
  async processCommand(userInput: string): Promise<AgentResponse> {
    const systemPrompt = this.buildSystemPrompt()
    const response = await this.callClaude(systemPrompt, userInput)
    return this.executeToolCalls(response)
  }
  
  private buildSystemPrompt(): string {
    return `You are an expert video editor assistant with access to powerful editing tools.
    
    Current editor state:
    - Timeline duration: ${this.context.timeline.duration}s
    - Active items: ${this.context.selectedItems.length}
    - Track count: ${this.context.timeline.tracks.length}
    
    Available tools:
    ${Array.from(this.tools.entries()).map(([name, tool]) => 
      `- ${name}: ${tool.description} (${tool.category})`
    ).join('\n')}
    
    When users request edits, analyze their intent and execute the appropriate tools.
    Always explain what you're doing and ask for confirmation on major changes.`
  }
}
```

#### Tool Execution Engine
```typescript
interface ToolCall {
  name: string
  parameters: Record<string, any>
  id: string
}

class ToolExecutor {
  async executeBatch(calls: ToolCall[], context: EditorContext): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = []
    
    for (const call of calls) {
      try {
        const tool = this.tools.get(call.name)
        if (!tool) throw new Error(`Unknown tool: ${call.name}`)
        
        // Validate parameters
        const validatedParams = tool.parameters.parse(call.parameters)
        
        // Execute tool
        const result = await tool.execute(validatedParams, context)
        results.push({ callId: call.id, ...result })
        
        // Update context with state changes
        if (result.stateChanges) {
          this.updateContext(context, result.stateChanges)
        }
        
      } catch (error) {
        results.push({
          callId: call.id,
          success: false,
          error: error.message
        })
      }
    }
    
    return results
  }
}
```

### 3. Integration with Existing Architecture

#### Store Integration
```typescript
// Hook into existing Zustand stores
const useClaudeAgent = () => {
  const store = useStore()
  const dataState = useDataState()
  const layoutStore = useLayoutStore()
  const scene = useSceneStore()
  
  const context: EditorContext = {
    timeline: store.timeline,
    scene: scene.scene,
    selectedItems: store.activeIds,
    stateManager: store.stateManager,
    stores: { useStore: store, useDataState: dataState, useLayoutStore: layoutStore }
  }
  
  const agent = useMemo(() => new ClaudeEditorAgent(context), [context])
  
  return {
    agent,
    processCommand: (input: string) => agent.processCommand(input),
    registerTool: (tool: EditorTool) => agent.registerTool(tool),
    getAvailableTools: () => agent.getTools()
  }
}
```

#### Component Integration
```typescript
// Add to menu system
const AIAssistantMenuItem = () => {
  const { agent, processCommand } = useClaudeAgent()
  const [conversation, setConversation] = useState<ConversationItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  const handleCommand = async (input: string) => {
    setIsProcessing(true)
    try {
      const response = await processCommand(input)
      setConversation(prev => [...prev, {
        user: input,
        assistant: response.message,
        actions: response.toolResults,
        timestamp: new Date()
      }])
    } finally {
      setIsProcessing(false)
    }
  }
  
  return <ChatInterface onCommand={handleCommand} isProcessing={isProcessing} />
}
```

### 4. Natural Language Commands

#### Example Interactions
```typescript
// User: "Add a cinematic fade between the first two clips"
// Tool calls:
[
  {
    name: "add_transition",
    parameters: {
      type: "cinematic_fade",
      duration: 1.0,
      position: "between_clips",
      clipIndices: [0, 1]
    }
  }
]

// User: "Make all the clips 20% darker and add some film grain"
// Tool calls:
[
  {
    name: "apply_filter",
    parameters: {
      itemIds: "all_selected",
      type: "brightness",
      intensity: -20
    }
  },
  {
    name: "apply_filter", 
    parameters: {
      itemIds: "all_selected",
      type: "film_grain",
      intensity: 30
    }
  }
]

// User: "Find some cooking B-roll and add it between 10-15 seconds"
// Tool calls:
[
  {
    name: "search_stock_video",
    parameters: {
      query: "cooking food preparation kitchen",
      duration: 5,
      orientation: "landscape"
    }
  },
  {
    name: "add_media",
    parameters: {
      type: "video",
      url: "{result_from_search}",
      position: 10,
      duration: 5,
      track: 1
    }
  }
]
```

### 5. Security and Permissions

#### Permission System
```typescript
interface Permission {
  action: string
  scope: 'timeline' | 'media' | 'export' | 'all'
  level: 'read' | 'write' | 'execute'
}

class PermissionManager {
  checkPermission(toolName: string, userPermissions: Permission[]): boolean {
    const tool = this.tools.get(toolName)
    return tool?.requiredPermissions?.every(required => 
      userPermissions.some(perm => this.matchesPermission(perm, required))
    ) ?? true
  }
}
```

#### Safety Guards
```typescript
const DESTRUCTIVE_ACTIONS = ['delete_items', 'clear_timeline', 'reset_project']
const EXPORT_ACTIONS = ['render_video', 'export_project']

// Require confirmation for destructive actions
const requiresConfirmation = (toolName: string) => 
  DESTRUCTIVE_ACTIONS.includes(toolName) || EXPORT_ACTIONS.includes(toolName)
```

### 6. State Synchronization

#### Real-time Updates
```typescript
// Sync agent state with editor state changes
const useAgentStateSync = (agent: ClaudeEditorAgent) => {
  const store = useStore()
  
  useEffect(() => {
    const unsubscribe = store.subscribe((state, prevState) => {
      if (state.timeline !== prevState.timeline) {
        agent.updateContext({ timeline: state.timeline })
      }
      if (state.activeIds !== prevState.activeIds) {
        agent.updateContext({ selectedItems: state.activeIds })
      }
    })
    
    return unsubscribe
  }, [agent, store])
}
```

#### Undo/Redo Integration
```typescript
// Integrate tool actions with editor's undo system
class UndoableToolExecutor extends ToolExecutor {
  async execute(tool: EditorTool, params: any, context: EditorContext) {
    const beforeState = this.captureState(context)
    const result = await super.execute(tool, params, context)
    
    if (result.success) {
      const afterState = this.captureState(context)
      this.addToUndoStack({
        action: tool.name,
        params,
        beforeState,
        afterState,
        timestamp: new Date()
      })
    }
    
    return result
  }
}
```

### 7. Extensibility

#### Custom Tool Registration
```typescript
// Allow plugins to register new tools
const registerCustomTool = (tool: EditorTool) => {
  // Validate tool schema
  if (!tool.name || !tool.execute) {
    throw new Error('Invalid tool definition')
  }
  
  // Register with agent
  agent.registerTool(tool.name, tool)
  
  // Update UI
  updateToolsUI()
}

// Example custom tool
const customTransitionTool: EditorTool = {
  name: 'add_custom_transition',
  description: 'Add a custom transition effect',
  category: 'effects',
  parameters: z.object({
    type: z.enum(['swipe', 'zoom', 'rotate']),
    direction: z.enum(['left', 'right', 'up', 'down']).optional(),
    duration: z.number().min(0.1).max(5.0)
  }),
  execute: async (params, context) => {
    // Custom transition implementation
    return { success: true, message: 'Custom transition added' }
  }
}
```

This architecture creates a powerful, scriptable editor where Claude can understand natural language commands and execute complex editing workflows through a structured tool interface, similar to MCP but adapted for frontend use.

## Extensibility Points

### 1. Timeline Items
- **Add New Types**: Extend track item interfaces and renderers
- **Custom Controls**: Add property panels for new item types

### 2. Video Encoding System
- **Custom Encoding Presets**: Add new quality/compression profiles
- **Format Support**: Extend support for additional video formats
- **Cloud Encoding**: Integration with cloud encoding services (AWS MediaConvert, etc.)
- **Encoding Plugins**: Custom FFmpeg filter chains and processing

### 3. AI Integrations
- **New Providers**: Additional AI service integrations
- **Custom Workflows**: Extended AI-powered features
- **Claude Tools**: Extensible tool registration system

### 4. Upload System Extensions
- **Cloud Storage**: Direct upload to AWS S3, Google Drive, etc.
- **Batch Processing**: Multiple file encoding queues
- **Custom Size Limits**: Per-user or per-plan file size restrictions
- **Progress Webhooks**: Real-time updates via WebSocket or Server-Sent Events

### 5. Export Formats
- **Remotion Extensions**: New output formats and configurations
- **Custom Renderers**: Alternative rendering pipelines

## Security Considerations

- **API Route Protection**: Input validation and sanitization
- **File Upload Security**: Type checking and dynamic size limits based on file type
- **Video Processing Security**: FFmpeg command injection prevention and sandboxing
- **Temporary File Cleanup**: Automatic cleanup of uploaded and processed files
- **External API Keys**: Secure environment variable management
- **User Session Management**: Secure session handling
- **Encoding Job Isolation**: Separate processes for video encoding to prevent system overload

## Deployment Architecture

- **Containerized Deployment**: Docker support with FFmpeg included
- **Nginx Configuration**: Reverse proxy setup with large file upload support
- **PM2 Process Management**: Production process management with encoding workers
- **Database Integration**: PostgreSQL with Kysely query builder
- **Video Processing Infrastructure**: Dedicated encoding servers for high-volume processing
- **Storage Architecture**: Separate storage for original and encoded video files
- **CDN Integration**: Optimized delivery of processed video content

## Real-world Performance Metrics

### Video Encoding Performance
- **Test Case**: 234MB iPhone MOV file (78 seconds, 1080p)
- **Processing Time**: ~20-30 seconds
- **Output Size**: 11MB MP4 (95.4% size reduction)
- **Quality**: 720p H.264 with excellent visual fidelity
- **Bitrate**: Optimized to 2Mbps max for smooth timeline performance

### Upload System Capacity
- **Maximum File Size**: 1GB per upload (configurable)
- **Concurrent Uploads**: Multiple files supported with queue management
- **Format Support**: MOV, MP4, AVI, MTS, WMV, 3GP, WebM, and more
- **Smart Thresholds**: Different encoding rules based on format and size

This architecture provides a scalable, maintainable foundation for a complex video editing application with intelligent video processing, real-time features, and AI integration capabilities.