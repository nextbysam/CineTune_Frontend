# Upload Structure Documentation

## Overview
This document provides a comprehensive overview of the upload system architecture in the React Video Editor application. The system handles multiple file types (video, audio, image) with special support for A-Roll and B-Roll video categorization, video encoding/compression, and cloud storage integration.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [API Endpoints](#api-endpoints)
- [File Processing](#file-processing)
- [Storage Structure](#storage-structure)
- [State Management](#state-management)
- [Video Encoding Pipeline](#video-encoding-pipeline)
- [A-Roll vs B-Roll System](#a-roll-vs-b-roll-system)

## Architecture Overview

### High-Level Flow
```
User Input → Modal Upload → Upload Store → API Routes → External Services → Local Processing → Timeline Integration
```

### Key Technologies
- **Frontend**: React, Zustand (state management), Framer Motion (animations)
- **Backend**: Next.js API Routes
- **Storage**: Google Cloud Storage (via external service)
- **Processing**: FFmpeg (video encoding)
- **File Transfer**: Presigned URLs for direct cloud uploads

## Core Components

### 1. Modal Upload Component (`src/components/modal-upload.tsx`)

**Purpose**: Primary user interface for file uploads

**Key Features**:
- Drag & drop file selection
- URL input for remote media
- Real-time thumbnail generation for videos
- Multi-file selection support
- A-Roll/B-Roll type assignment
- Progress tracking integration

**Props**:
```typescript
interface ModalUploadProps {
  type?: string;                    // File type filter ('audio', 'image', 'video', 'all')
  aRollType?: 'a-roll' | 'b-roll';  // Video categorization
  userId?: string;                  // User identification for cloud organization
}
```

**File Processing Flow**:
1. File selection (drag/drop or browse)
2. Thumbnail extraction for videos (`extractVideoThumbnail`)
3. Metadata preparation with A-Roll/B-Roll tagging
4. Upload queue management via Upload Store

### 2. Upload Store (`src/features/editor/store/use-upload-store.ts`)

**Purpose**: Centralized state management for upload operations

**Key State Properties**:
```typescript
interface IUploadStore {
  showUploadModal: boolean;           // Modal visibility
  files: UploadFile[];               // Selected files awaiting upload
  pendingUploads: UploadFile[];      // Queued uploads
  activeUploads: UploadFile[];       // Currently processing uploads
  uploads: any[];                    // Completed uploads
  uploadProgress: Record<string, number>; // Progress tracking
}
```

**Upload Lifecycle**:
1. **Pending**: Files selected, awaiting processing
2. **Uploading**: File transfer in progress
3. **Encoding**: Video compression (if required)
4. **Uploaded**: Complete and available for use
5. **Failed**: Error state with retry capability

### 3. Upload Service (`src/utils/upload-service.ts`)

**Purpose**: Core upload processing logic

**Functions**:
- `processFileUpload()`: Handles direct file uploads via presigned URLs
- `processUrlUpload()`: Downloads and processes remote URLs
- `processUpload()`: Unified interface for both file and URL uploads

**Upload Process**:
1. Generate presigned URL from cloud service
2. Upload file directly to cloud storage
3. Update progress callbacks
4. Return upload metadata

### 4. Uploads Menu Component (`src/features/editor/menu-item/uploads.tsx`)

**Purpose**: Display and manage uploaded media in editor sidebar

**Features**:
- Categorized display (A-Roll, B-Roll, Images, Audio)
- Thumbnail generation and caching
- Context editing for B-Roll clips
- Direct timeline integration
- B-Roll sync functionality
- Delete functionality

## Data Flow

### Upload Initiation
```
User selects files → ModalUpload → useUploadStore.addPendingUploads()
```

### Processing Pipeline
```
pendingUploads → activeUploads → processUploads() → API calls → External services → Local storage
```

### Timeline Integration
```
Completed uploads → Uploads menu → User selection → Timeline dispatch (ADD_VIDEO/ADD_AUDIO/ADD_IMAGE)
```

## API Endpoints

### 1. Presigned URL Generation (`/api/uploads/presign`)
**Method**: POST  
**Purpose**: Generate secure upload URLs for direct cloud storage

**Request**:
```json
{
  "userId": "string",
  "fileNames": ["file1.mp4", "file2.mp3"]
}
```

**Response**:
```json
{
  "uploads": [
    {
      "fileName": "file1.mp4",
      "filePath": "/path/to/file",
      "contentType": "video/mp4",
      "presignedUrl": "https://storage.googleapis.com/...",
      "url": "https://storage.googleapis.com/...",
      "folder": "user_uploads"
    }
  ]
}
```

**External Service**: `https://upload-file-j43uyuaeza-uc.a.run.app/presigned`

### 2. URL Upload (`/api/uploads/url`)
**Method**: POST  
**Purpose**: Download and store media from remote URLs

**Request**:
```json
{
  "userId": "string",
  "urls": ["https://example.com/video.mp4"]
}
```

**Response**:
```json
{
  "uploads": [
    {
      "fileName": "video.mp4",
      "filePath": "/uploads/video.mp4",
      "contentType": "video/mp4",
      "originalUrl": "https://example.com/video.mp4",
      "url": "https://storage.googleapis.com/..."
    }
  ]
}
```

**External Service**: `https://upload-file-j43uyuaeza-uc.a.run.app/url`

### 3. Video Encoding (`/api/uploads/encode-video`)
**Method**: POST (start encoding), GET (check status)  
**Purpose**: Compress and optimize videos for editing

**Start Encoding Request**:
```json
{
  "filePath": "/path/to/video.mp4",
  "fileName": "video.mp4"
}
```

**Status Response**:
```json
{
  "jobId": "encoding_job_123",
  "status": "processing",
  "progress": 75,
  "originalSize": 50000000,
  "compressedSize": 15000000,
  "outputUrl": "/uploads/encoded_video_123.mp4"
}
```

## File Processing

### Video Thumbnail Generation
**Function**: `extractVideoThumbnail()` (modal-upload.tsx)

**Process**:
1. Create video element with blob URL
2. Seek to 1-1.5 seconds into video
3. Capture frame on canvas (160x90, JPEG 0.7 quality)
4. Convert to base64 data URL
5. Store in upload metadata

**Optimization**: Small size (160x90) to prevent localStorage quota issues

### Video Encoding Pipeline (`src/utils/video-encoding.ts`)

**When Videos Are Encoded**:
- Files > 25MB always encoded
- High bitrate formats (MOV, AVI, etc.) > 10MB
- Compressed formats (MP4, WebM) > 100MB

**Encoding Settings** (FFmpeg):
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -preset medium \
  -crf 23 \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  -vf scale=-2:720 \
  -maxrate 2M \
  -bufsize 4M \
  output.mp4
```

**Key Features**:
- 720p max resolution
- 2Mbps max bitrate
- H.264 codec for compatibility
- Fast start for web playback
- Progress tracking via stdout parsing

## Storage Structure

### Local Storage (`public/uploads/`)
```
public/
├── uploads/
│   ├── encoded_video1_abc123.mp4    # Encoded videos
│   ├── encoded_video2_def456.mp4
│   └── thumbnails/                  # Generated thumbnails (future)
```

### Cloud Storage (Google Cloud)
```
gs://bucket/
├── users/
│   ├── {userId}/
│   │   ├── a-roll/
│   │   │   └── video1.mp4
│   │   ├── b-roll/
│   │   │   ├── broll1.mp4
│   │   │   └── broll2.mp4
│   │   ├── images/
│   │   └── audio/
```

### Metadata Structure
```typescript
interface UploadFile {
  id: string;
  file?: File;
  url?: string;
  type?: string;
  status?: 'pending' | 'uploading' | 'encoding' | 'uploaded' | 'failed';
  progress?: number;
  aRollType?: 'a-roll' | 'b-roll';
  userId?: string;
  metadata?: {
    aRollType?: 'a-roll' | 'b-roll';
    userId?: string;
    uploadedAt?: string;
    thumbnailUrl?: string | null;
    fileName?: string;
    localUrl?: string;          // Local processing URL
    uploadedUrl?: string;       // Cloud storage URL
    encodedUrl?: string;        // Encoded version URL
    originalSize?: number;
    compressedSize?: number;
    compressionRatio?: number;
    context?: string;           // B-Roll context description
  };
}
```

## State Management

### Upload Store Persistence
**Storage**: LocalStorage via Zustand persist middleware  
**Key**: 'upload-store'

**Persistence Strategy**:
```typescript
partialize: (state) => ({ 
  uploads: state.uploads.map(upload => ({
    ...upload,
    metadata: upload.metadata ? {
      ...upload.metadata,
      thumbnailUrl: undefined,  // Exclude large thumbnails
      localUrl: upload.metadata.localUrl?.startsWith('blob:') 
        ? undefined 
        : upload.metadata.localUrl,  // Exclude blob URLs
    } : undefined
  }))
})
```

### Upload State Transitions
```
pending → uploading → (encoding) → uploaded
                   ↘ failed
```

## Video Encoding Pipeline

### Encoding Decision Logic (`shouldEncodeVideo`)
```typescript
// Always encode if > 25MB
if (file.size > 25 * 1024 * 1024) return true;

// High bitrate formats > 10MB
const highBitrateFormats = ['video/mov', 'video/avi', 'video/quicktime'];
if (highBitrateFormats.includes(file.type) && file.size > 10MB) return true;

// Already compressed > 100MB
const compressedFormats = ['video/mp4', 'video/webm'];
if (compressedFormats.includes(file.type) && file.size > 100MB) return true;
```

### Encoding Workflow
1. **Upload Original**: File uploaded to cloud storage first
2. **Start Encoding**: Server-side FFmpeg processing begins
3. **Progress Tracking**: Real-time progress via polling
4. **Completion**: Encoded file available, size comparison calculated
5. **Cleanup**: Original file can be optionally removed

### Progress Monitoring
- **Polling Interval**: 1 second
- **Timeout**: 5 minutes (300 polls)
- **Progress Parsing**: FFmpeg stdout analysis for percentage

## A-Roll vs B-Roll System

### Categorization
- **A-Roll**: Primary content, main video track
- **B-Roll**: Supporting footage, overlay content
- **UI Distinction**: Different colors/icons (A=Crown/Blue, B=Layers/Green)

### B-Roll Context System
**Purpose**: Describe when/how B-Roll should be used

**Interface**: Editable text field per B-Roll clip  
**Storage**: In upload metadata.context field  
**Usage**: AI-powered B-Roll timing sync

### B-Roll Sync Functionality
**Location**: `src/features/editor/menu-item/uploads.tsx`

**Workflow**:
1. Get most recent caption job ID
2. Collect B-Roll videos with context
3. Call external timing API
4. Poll for timing suggestions
5. Auto-place B-Roll clips on timeline tracks

**API Integration**:
- **Endpoint**: `https://cinetune-llh0.onrender.com/api/generate-broll-timing`
- **Polling**: `https://cinetune-llh0.onrender.com/api/broll-timing-result/{jobId}`

### Timeline Integration
**Track Assignment**:
- A-Roll: Track 0 (main track)
- B-Roll: Sequential tracks (1, 2, 3, etc.)
- **Dispatch**: Uses `ADD_VIDEO` action with `targetTrackIndex`

## Error Handling & Recovery

### Upload Failures
- **Retry Logic**: Automatic retry for network errors
- **Timeout Handling**: 2-minute timeout for uploads
- **Error Display**: Toast notifications with specific error messages
- **Cleanup**: Failed uploads removed after 3 seconds

### Encoding Failures
- **Fallback**: Original file used if encoding fails
- **Error Tracking**: Detailed error logs in encoding jobs
- **User Feedback**: Clear status indicators and error messages

### State Recovery
- **Blob URL Cleanup**: Invalid blob URLs filtered on app start
- **Persistence**: Upload history maintained across sessions
- **Thumbnail Regeneration**: Thumbnails regenerated if missing

## Performance Considerations

### Thumbnail Optimization
- **Size**: 160x90 pixels maximum
- **Quality**: JPEG 0.7 compression
- **Memory**: Cleanup video/canvas elements after use
- **Storage**: Exclude from persistence to save space

### Upload Efficiency
- **Direct Upload**: Presigned URLs bypass server processing
- **Parallel Processing**: Multiple uploads can run simultaneously
- **Progress Tracking**: Minimal overhead progress callbacks
- **Memory Management**: File references cleaned after upload

### Encoding Optimization
- **Server-side Processing**: Encoding happens on server, not in browser
- **Quality Settings**: Optimized for editing workflow (720p, 2Mbps)
- **Format Standardization**: All videos encoded to H.264 MP4
- **Size Reduction**: Typically 60-80% size reduction

## Usage Examples

### Basic File Upload
```typescript
// Open upload modal for A-Roll
const openARollModal = () => {
  setCurrentModalType('a-roll');
  setShowUploadModal(true);
};

// Upload process handled automatically by store
```

### Adding to Timeline
```typescript
// From uploads menu
const handleAddVideo = (video) => {
  dispatch(ADD_VIDEO, {
    payload: {
      id: generateId(),
      details: { src: video.metadata?.uploadedUrl },
      metadata: { aRollType: video.aRollType }
    },
    options: { targetTrackIndex: 0 }
  });
};
```

### B-Roll Context Management
```typescript
// Save context for B-Roll clip
const handleContextSave = () => {
  setUploads((prev) =>
    prev.map((upload) =>
      upload.id === video.id
        ? {
          ...upload,
          metadata: { ...upload.metadata, context: contextValue }
        }
        : upload
    )
  );
};
```

---

This documentation provides a complete understanding of the upload system architecture and can be used as reference for development, debugging, and future enhancements.