# CineTune Video Editor - Rendering System Documentation

## Overview

The CineTune video editor uses a sophisticated rendering system built on **Remotion** for video generation. The system supports both cloud-based (via combo.sh) and local rendering with comprehensive progress tracking and file management.

## System Architecture

```
Frontend (React) → API Routes → Rendering Engine → Output Files
     ↓               ↓             ↓               ↓
UI Controls    → /api/render   → Remotion      → /renders/
Progress Modal → /api/render/[id] → Node.js    → MP4 Files
Download       → /api/render/local → Scripts   → File Streaming
```

## Core Components

### 1. **Frontend Components**

#### **Navbar Export Button** (`src/features/editor/navbar.tsx`)
- **Location**: Top-right corner of the editor
- **Trigger**: Export button with dropdown for format selection (MP4/JSON)
- **Functionality**:
  - Collects current timeline state using `stateManager.getState()`
  - Normalizes design data structure
  - Initiates export process via `actions.startExport()`

#### **Download Progress Modal** (`src/features/editor/download-progress-modal.tsx`)
- **Purpose**: Displays real-time rendering progress and handles completed downloads
- **States**:
  - **Progress**: Shows percentage completion (0-100%)
  - **Completed**: Shows success checkmark and download button
- **Features**:
  - Non-blocking rendering (can close browser safely)
  - Direct download functionality
  - Cancel option (currently UI-only)

#### **Download State Management** (`src/features/editor/store/use-download-state.ts`)
- **Zustand store** for managing export state
- **Key Properties**:
  - `exporting`: Boolean flag for render status
  - `progress`: Percentage completion (0-100)
  - `output`: Contains final video URL
  - `payload`: Design data to be rendered
- **Actions**:
  - `startExport()`: Main export trigger
  - `setProgress()`: Updates rendering progress
  - `setOutput()`: Sets final render output

### 2. **API Routes**

#### **Primary Render Endpoint** (`/api/render/route.ts`)
- **Method**: POST
- **Purpose**: Cloud-based rendering via combo.sh API
- **Input**: Design object with timeline data
- **Process**:
  1. Normalizes incoming design payload
  2. Authenticates with combo.sh using `COMBO_SH_JWT`
  3. Sends render request to `https://api.combo.sh/v1/render`
  4. Returns render job ID for status polling

- **Method**: GET  
- **Purpose**: Check render status
- **Parameters**: `?type=status&id={render_id}`
- **Returns**: Render status and completion data

#### **Render Status Check** (`/api/render/[id]/route.ts`)
- **Method**: GET
- **Purpose**: Poll individual render job status
- **Authentication**: Uses hardcoded JWT token
- **Returns**: Current render progress and status

#### **Local Render Endpoint** (`/api/render/local/route.ts`)
- **Method**: POST
- **Purpose**: Server-side rendering using local Remotion
- **Process**:
  1. Validates design data structure
  2. Creates temporary design file
  3. Spawns Node.js child process with render script
  4. Monitors rendering progress via stdout/stderr
  5. Returns file URL for completed render
- **Output**: Files saved to `/renders/export_[timestamp].mp4`

#### **File Streaming Endpoint** (`/api/render/local/file/route.ts`)
- **Method**: GET
- **Purpose**: Stream rendered video files to client
- **Parameters**: `?path={file_path}`
- **Features**:
  - Direct file streaming using Node.js ReadableStream
  - Proper video headers (`Content-Type: video/mp4`)
  - Download attachment disposition

### 3. **Rendering Scripts**

#### **Local Render Script** (`scripts/render-local.cjs`)
- **Technology**: Node.js + Remotion bundler/renderer
- **Input**: Design JSON file path via `--design=` argument
- **Process**:
  1. **Bundling**: Bundles React composition from `src/remotion/index.tsx`
  2. **Composition Selection**: Loads 'TimelineComposition' with design props
  3. **Rendering**: Uses `@remotion/renderer` with optimized settings
  4. **Output**: Saves MP4 to `/renders/` directory

- **Optimizations**:
  ```javascript
  {
    chromiumOptions: {
      gl: 'angle',
      args: ['--no-sandbox', '--disable-web-security', ...]
    },
    timeoutInMilliseconds: 300000, // 5 minutes
    concurrency: 1, // Single thread
    jpegQuality: 80, // Balanced quality/speed
    pixelFormat: 'yuv420p' // Universal compatibility
  }
  ```

### 4. **Data Flow**

#### **Export Initiation**
1. User clicks "Export" button in navbar
2. `DownloadPopover` collects current timeline state
3. `handleExport()` creates design payload with `generateId()`
4. State stored in download store via `actions.setState()`
5. `actions.startExport()` triggered

#### **Local Rendering Process**
1. **API Call**: POST to `/api/render/local` with design data
2. **Validation**: Server validates required properties (size, trackItems)
3. **File Creation**: Design saved to temporary JSON file
4. **Script Execution**: `render-local.cjs` spawned as child process
5. **Monitoring**: Progress tracked via stderr output
6. **Completion**: Final file path returned via stdout JSON

#### **Progress Tracking** (Currently Not Implemented for Local)
- Cloud rendering: Real-time progress via combo.sh API polling
- Local rendering: Currently no progress updates during render
- Modal shows indeterminate loading until completion

#### **File Management**
- **Storage Location**: `/renders/export_[ISO-timestamp].mp4`
- **Naming Convention**: `export_2025-08-25T18-33-26-038Z.mp4`
- **Access**: Via `/api/render/local/file?path=` streaming endpoint
- **Download**: Browser download triggered via `src/utils/download.ts`

## Current Render Settings

### **Video Configuration**
```javascript
{
  size: { width: 1080, height: 1920 }, // Default 9:16 format
  fps: 30, // Frames per second
  format: "mp4", // Output format
  codec: "h264", // Video codec
  pixelFormat: "yuv420p" // Compatibility format
}
```

### **Performance Settings**
```javascript
{
  timeoutInMilliseconds: 300000, // 5 minute total timeout
  delayRenderTimeoutInMilliseconds: 180000, // 3 minute asset timeout
  concurrency: 1, // Single-threaded rendering
  verbose: true, // Detailed logging
  jpegQuality: 80, // 80% quality for speed/size balance
}
```

## File System Structure

```
react-video-editor/
├── src/
│   ├── app/api/render/          # API endpoints
│   │   ├── route.ts             # Main render endpoint (cloud)
│   │   ├── [id]/route.ts        # Status polling
│   │   └── local/
│   │       ├── route.ts         # Local render endpoint
│   │       └── file/route.ts    # File streaming
│   ├── features/editor/
│   │   ├── navbar.tsx           # Export UI
│   │   ├── download-progress-modal.tsx
│   │   └── store/use-download-state.ts
│   ├── remotion/                # Remotion compositions
│   │   └── index.tsx            # TimelineComposition entry
│   └── utils/download.ts        # Client-side download
├── scripts/
│   └── render-local.cjs         # Server-side render script
└── renders/                     # Output directory
    └── export_*.mp4             # Rendered videos
```

## Export Types

### **1. MP4 Export (Default)**
- **Process**: Full video rendering with all timeline elements
- **Output**: MP4 video file ready for playback/sharing
- **Use Case**: Final video output for distribution

### **2. JSON Export**
- **Process**: Exports current timeline state as JSON
- **Output**: Design configuration file
- **Use Case**: Saving project state, sharing templates

## Rendering Pipeline

### **Timeline → Design Conversion**
```javascript
const design = {
  id: generateId(),
  size: { width: 1080, height: 1920 },
  fps: 30,
  duration: calculatedDuration,
  background: currentBackground,
  trackItems: Object.values(trackItemsMap), // Flattened items
  tracks: currentTracks,
  transitionsMap: currentTransitions
}
```

### **Remotion Composition**
- **Entry Point**: `src/remotion/index.tsx`
- **Composition ID**: `'TimelineComposition'`
- **Props**: Design object with all timeline data
- **Processing**: Remotion renders each frame based on timeline state

## Current Issues & Limitations

### **1. Missing Progress Updates**
- **Issue**: Local rendering shows no progress during render
- **Impact**: Users see indeterminate loading spinner
- **Solution Needed**: Implement progress streaming from render script

### **2. No Render History/Gallery**
- **Issue**: Completed renders not visible in UI after download
- **Impact**: Users can't access previous renders
- **Files Available**: 15+ renders stored in `/renders/` directory
- **Solution Needed**: Render gallery component

### **3. Limited Error Handling**
- **Issue**: Render failures not clearly communicated to users
- **Impact**: Users may not understand why renders fail
- **Solution Needed**: Better error reporting and recovery

### **4. No Render Management**
- **Issue**: No way to cancel, retry, or manage multiple renders
- **Impact**: Users can't control rendering process
- **Solution Needed**: Render queue management

## File Output Examples

### **Successful Renders** (Currently in `/renders/`)
```
export_2025-08-22T15-56-36-657Z.mp4  # 2.3 MB
export_2025-08-22T16-06-39-599Z.mp4  # 1.8 MB  
export_2025-08-23T06-13-01-429Z.mp4  # 3.1 MB
export_2025-08-25T18-33-26-038Z.mp4  # 2.7 MB
... (15 total files)
```

### **File Properties**
- **Format**: MP4 (H.264)
- **Resolution**: Typically 1080×1920 (9:16)
- **Frame Rate**: 30 FPS
- **Bitrate**: Variable (optimized for file size)
- **Audio**: Supported when present in timeline

## Technical Implementation Details

### **State Management Flow**
```
1. User Interaction → Navbar Export Button
2. State Collection → useStore.getState()
3. Data Normalization → IDesign format
4. Store Update → useDownloadState.actions.setState()
5. Export Trigger → actions.startExport()
6. API Request → /api/render/local
7. File Processing → render-local.cjs script
8. Completion → File URL returned
9. UI Update → Download modal shown
10. User Download → download() utility function
```

### **Error Scenarios**
```javascript
// Common error points:
1. Invalid design data → 400 Bad Request
2. Script not found → 500 Server Error  
3. Render timeout → 500 Server Error
4. File system errors → 500 Server Error
5. Chromium crashes → Exit code 1
6. Missing dependencies → Module not found
```

## Integration Points

### **Frontend Integration**
- **Navbar**: Export button integration
- **Progress Modal**: Real-time updates needed
- **Download Handling**: File streaming and browser download

### **Backend Integration**  
- **API Routes**: RESTful render endpoints
- **File System**: Direct file system access for renders
- **Process Management**: Child process spawning and monitoring

### **Remotion Integration**
- **Composition**: React-based video composition
- **Bundling**: Dynamic bundling for server-side rendering
- **Asset Loading**: Timeline elements converted to video assets

---

*Last Updated: 2025-08-26*
*System Status: ✅ Functional (Local Rendering) | ⚠️ Progress Updates Missing | ❌ Render Gallery Missing*