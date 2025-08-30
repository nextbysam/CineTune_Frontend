# Video Encoding System

## Overview

The CineTune video editor includes an intelligent video encoding system that automatically compresses large video files to optimize them for editing while preserving quality. This system reduces file sizes by up to 95% while maintaining excellent visual quality, resulting in faster timeline performance and smoother editing experiences.

## Architecture

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Side   │    │   Server Side    │    │   File System  │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Upload Store    │───▶│ Encoding API     │───▶│ FFmpeg Process  │
│ Progress UI     │    │ Job Management   │    │ Input/Output    │
│ File Detection  │    │ Status Tracking  │    │ File Storage    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### File Structure

```
src/
├── app/api/uploads/encode-video/
│   └── route.ts                    # Main encoding API endpoint
├── utils/
│   └── video-encoding.ts          # Client-side encoding utilities
├── features/editor/store/
│   └── use-upload-store.ts        # Upload store with encoding states
└── features/editor/menu-item/
    └── uploads.tsx                # UI with encoding progress display
```

## Features

### ✅ Automatic Compression
- **Smart Detection**: Automatically identifies videos that would benefit from encoding based on size and format
- **Dynamic Size Limits**: Accepts videos up to 1GB for drag & drop, with intelligent encoding thresholds
- **Format-Aware Logic**: Different compression thresholds for various video formats (MOV: 10MB, MP4: 100MB, General: 25MB)
- **Optimal Settings**: Uses proven H.264 settings optimized for editing workflows
- **Background Processing**: Non-blocking encoding jobs that don't interrupt user workflow

### ✅ Progress Tracking
- **Real-time Updates**: Live progress percentage during encoding
- **Status Display**: Clear status indicators (Uploading → Compressing → Complete)
- **Compression Metrics**: Shows size reduction percentage after completion

### ✅ Quality Preservation
- **Resolution**: Intelligently scales to 720p height while maintaining aspect ratio
- **Frame Rate**: Preserves original frame rate (typically 30fps)
- **Audio**: High-quality AAC audio at 128kbps
- **Duration**: Perfect preservation of original video length

## Performance Results

### Real-world Test Case
- **Original**: iPhone MOV file - 234MB
- **Encoded**: MP4 file - 11MB  
- **Reduction**: 95.4% size decrease
- **Processing**: ~20 seconds for 78-second video
- **Quality**: Excellent visual fidelity maintained

### Technical Specifications
```yaml
Video Codec: H.264/AVC
Audio Codec: AAC
Container: MP4
Resolution: 720p height (aspect ratio preserved)
Video Bitrate: Max 2Mbps, CRF 23
Audio Bitrate: 128kbps
Keyframe Interval: 60 frames (2 seconds at 30fps)
Pixel Format: yuv420p (universal compatibility)
```

## API Reference

### POST `/api/uploads/encode-video`

Start video encoding for a given file.

**Request:**
```json
{
  "filePath": "/uploads/video-file.mov",
  "fileName": "video-file.mov"
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "abc123",
  "message": "Video encoding started",
  "outputFileName": "encoded_video-file_abc123.mp4",
  "outputUrl": "/uploads/encoded_video-file_abc123.mp4"
}
```

### GET `/api/uploads/encode-video?jobId={id}`

Check encoding job status and progress.

**Response (In Progress):**
```json
{
  "jobId": "abc123",
  "status": "processing",
  "progress": 45,
  "processingTime": 12
}
```

**Response (Completed):**
```json
{
  "jobId": "abc123",
  "status": "completed",
  "progress": 100,
  "originalSize": 245438470,
  "compressedSize": 11399716,
  "outputUrl": "/uploads/encoded_video-file_abc123.mp4"
}
```

## Client-side Integration

### Upload Store Integration

The upload store automatically handles encoding for large video files:

```typescript
// When a video file is uploaded
const upload = {
  file: videoFile,
  needsEncoding: shouldEncodeVideo(videoFile), // Files >50MB
  status: 'uploading'
};

// After upload completes, encoding starts automatically
if (upload.needsEncoding) {
  upload.status = 'encoding';
  await processVideoFile(upload.file, callbacks);
}
```

### Utility Functions

```typescript
import { 
  startVideoEncoding, 
  pollEncodingStatus,
  shouldEncodeVideo 
} from '@/utils/video-encoding';

// Check if a file should be encoded
const needsEncoding = shouldEncodeVideo(file); // true for videos >50MB

// Start encoding
const { jobId, outputUrl } = await startVideoEncoding(filePath, fileName);

// Monitor progress
pollEncodingStatus(jobId, {
  onProgress: (id, progress) => console.log(`${progress}%`),
  onComplete: (id, result) => console.log('Done!', result)
});
```

### UI Status Display

The upload interface automatically shows encoding progress:

```tsx
// Upload status indicators
{upload.status === 'encoding' ? 'Compressing...' : 
 upload.status === 'uploading' ? 'Uploading...' :
 upload.status}

// Compression badge (after completion)
{upload.metadata?.compressionRatio && (
  <span className="bg-green-100 text-green-600">
    -{upload.metadata.compressionRatio}%
  </span>
)}
```

## Configuration

### FFmpeg Settings

The encoding uses optimized settings for editing workflows:

```typescript
const encodingSettings = [
  '-c:v', 'libx264',           // H.264 codec
  '-preset', 'medium',         // Balance speed/compression
  '-crf', '23',               // Constant rate factor (quality)
  '-c:a', 'aac',              // AAC audio
  '-b:a', '128k',             // Audio bitrate
  '-movflags', '+faststart',   // Web optimization
  '-pix_fmt', 'yuv420p',      // Universal pixel format
  '-vf', 'scale=-2:720',      // Scale to 720p height
  '-maxrate', '2M',           // Max bitrate 2Mbps
  '-bufsize', '4M',           // Buffer size
  '-g', '60',                 // GOP size (keyframes)
  '-keyint_min', '60'         // Min keyframe interval
];
```

### File Size Thresholds

```typescript
// Updated intelligent encoding thresholds
function shouldEncodeVideo(file: File, maxSizeForEncoding: number = 25 * 1024 * 1024): boolean {
  if (!file.type.startsWith('video/')) return false;

  // General threshold: 25MB (reduced from 50MB for better compression coverage)
  if (file.size > maxSizeForEncoding) return true;

  // High bitrate formats (iPhone/Mac recordings): 10MB threshold
  const highBitrateFormats = ['video/mov', 'video/quicktime', 'video/avi', 'video/mts'];
  if (highBitrateFormats.some(format => file.type.includes(format))) {
    return file.size > 10 * 1024 * 1024;
  }

  // Already compressed formats: 100MB threshold
  const compressedFormats = ['video/mp4', 'video/webm', 'video/ogg'];
  if (compressedFormats.includes(file.type)) {
    return file.size > 100 * 1024 * 1024;
  }

  return false;
}
```

### Dynamic Upload Size Limits

```typescript
// Droppable component now supports dynamic size limits
<Droppable
  accept={{ "video/*": [], "image/*": [], "audio/*": [] }}
  allowLargeVideos={true}  // Enables up to 1GB for videos
  maxFileCount={4}
/>

// Size limits by file type:
// - Videos (with allowLargeVideos): 1GB
// - Videos (default): 50MB  
// - Images: 10MB
// - Audio: 25MB
// - Other files: 2MB
```

## Error Handling

### Common Issues

1. **File Not Found**
   - **Error**: `Input file not found`
   - **Solution**: Verify file path and ensure file exists in uploads directory

2. **FFmpeg Process Failed**
   - **Error**: `FFmpeg process failed with code X`
   - **Solution**: Check FFmpeg installation and file format compatibility

3. **Encoding Timeout**
   - **Error**: `Encoding timeout - job took too long`
   - **Solution**: Check file size and server resources

### Error Response Format

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Installation & Setup

### Prerequisites

1. **FFmpeg Installation**
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu/Debian
   sudo apt install ffmpeg
   
   # Windows
   # Download from https://ffmpeg.org/download.html
   ```

2. **Node.js Dependencies**
   ```bash
   npm install fluent-ffmpeg @types/fluent-ffmpeg --legacy-peer-deps
   ```

### Verification

Test FFmpeg installation:
```bash
ffmpeg -version
```

Test the encoding API:
```bash
# Start the development server
npm run dev

# Test with a video file
curl -X POST http://localhost:3001/api/uploads/encode-video \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/uploads/test-video.mp4", "fileName": "test-video.mp4"}'
```

## Testing

### Automated Testing

Run the comprehensive test suite:

```bash
# Create test video and run all tests
npx tsx scripts/test-video-encoding.ts

# Test API directly
npx tsx scripts/test-encoding-api.ts
```

### Manual Testing

1. **Drag & Drop Test**: Drag a large video file (>25MB) onto the canvas area
2. **Upload Modal Test**: Use the upload modal to select large video files
3. **Size Limit Test**: Verify videos up to 1GB are accepted for upload
4. **Encoding Detection**: Check that appropriate videos are automatically flagged for encoding
5. **Progress Monitoring**: Watch the uploads UI show encoding progress with compression badges
6. **Quality Verification**: Confirm final compressed files maintain good quality while reducing size significantly

## Performance Optimization

### Server Resources

- **CPU**: Encoding is CPU-intensive; ensure adequate server resources
- **Memory**: ~1GB RAM recommended per concurrent encoding job
- **Storage**: Temporary storage needed for input/output files

### Scaling Considerations

For high-volume applications:

1. **Queue System**: Implement job queuing with Redis
2. **Worker Processes**: Dedicated encoding worker servers
3. **Cloud Encoding**: Consider AWS MediaConvert or similar services
4. **CDN**: Serve encoded files from CDN for faster delivery

## Troubleshooting

### Debug Mode

Enable detailed logging by setting environment variable:
```bash
DEBUG_ENCODING=true npm run dev
```

### Common Solutions

1. **Slow Encoding**: Reduce CRF value or use faster preset
2. **Large Output Files**: Lower maxrate or adjust CRF
3. **Quality Issues**: Increase CRF value or adjust scale settings
4. **Compatibility Issues**: Ensure yuv420p pixel format is used

## Future Enhancements

### Planned Features

- [ ] **Multiple Quality Options**: Low/Medium/High quality presets
- [ ] **Custom Encoding Settings**: User-configurable encoding parameters
- [ ] **Batch Processing**: Encode multiple files simultaneously
- [ ] **Cloud Integration**: AWS/GCP encoding services
- [ ] **Format Support**: Additional input/output formats
- [ ] **Preview Generation**: Thumbnail extraction during encoding

### Architecture Improvements

- [ ] **Queue Management**: Redis-based job queue
- [ ] **Microservice**: Separate encoding service
- [ ] **Real-time WebSocket**: Live progress updates
- [ ] **Resume Support**: Ability to resume interrupted encodings

## Contributing

When contributing to the video encoding system:

1. **Test Thoroughly**: Use various video formats and sizes
2. **Performance**: Monitor encoding speed and output quality
3. **Error Handling**: Ensure graceful failure handling
4. **Documentation**: Update this guide with any changes
5. **Backwards Compatibility**: Maintain API compatibility

## License & Credits

This implementation uses:
- **FFmpeg**: Licensed under LGPL/GPL
- **Next.js**: MIT License
- **Various Node.js libraries**: See package.json for details

Built for CineTune Video Editor - Optimizing video editing workflows through intelligent compression.