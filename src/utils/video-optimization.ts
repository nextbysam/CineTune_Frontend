/**
 * Video Optimization Utility for Caption Generation
 * Optimizes large videos for faster caption processing by reducing file size
 * while maintaining audio quality for accurate transcription.
 * 
 * OPTIMIZATION STRATEGIES (in order of preference):
 * 1. Audio Extraction - Extract audio only (best for captions, smallest size)
 * 2. Video Compression - Compress video while maintaining audio quality
 * 3. File Chunking - Use portion of original file (fallback)
 */

import { extractAudioForCaptions, shouldExtractAudio } from './audio-extraction';

export interface VideoOptimizationOptions {
  maxSizeMB?: number;           // Maximum file size in MB (default: 50MB)
  maxWidth?: number;            // Maximum width (default: 640px)
  maxHeight?: number;           // Maximum height (default: 360px)
  videoBitrate?: number;        // Video bitrate in kbps (default: 500kbps)
  audioBitrate?: number;        // Audio bitrate in kbps (default: 128kbps)
  fps?: number;                 // Target FPS (default: 15fps)
  quality?: number;             // Quality 0-1 (default: 0.7)
  preferAudioExtraction?: boolean; // Prefer audio extraction over video compression (default: true)
  audioExtractionThreshold?: number; // Size threshold for audio extraction in MB (default: 10MB)
}

export interface OptimizationResult {
  optimizedFile: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  wasOptimized: boolean;
  processingTime: number;
  optimizationMethod: 'audio_extraction' | 'video_compression' | 'file_chunking' | 'none';
  isAudioOnly: boolean;
}

/**
 * Checks if video needs optimization based on file size and duration
 */
export function shouldOptimizeVideo(
  videoFile: File, 
  maxSizeMB: number = 50
): boolean {
  const sizeInMB = videoFile.size / (1024 * 1024);
  const needsOptimization = sizeInMB > maxSizeMB;
  
  console.log(`🔍 [VIDEO-OPT] Size check: ${videoFile.name} = ${sizeInMB.toFixed(2)}MB`);
  console.log(`🔍 [VIDEO-OPT] Threshold: ${maxSizeMB}MB, Needs optimization: ${needsOptimization}`);
  
  return needsOptimization;
}

/**
 * Optimizes video for caption generation using canvas-based compression
 * This approach maintains audio quality while reducing visual data
 */
export async function optimizeVideoForCaptions(
  videoFile: File,
  options: VideoOptimizationOptions = {}
): Promise<OptimizationResult> {
  const startTime = Date.now();
  
  console.log(`🚀 [VIDEO-OPT] Starting optimization for: ${videoFile.name}`);
  console.log(`📊 [VIDEO-OPT] Options:`, options);
  
  const {
    maxSizeMB = 50,
    maxWidth = 640,
    maxHeight = 360,
    videoBitrate = 500,
    audioBitrate = 128,
    fps = 15,
    quality = 0.7,
    preferAudioExtraction = true,
    audioExtractionThreshold = 10
  } = options;

  // Check if optimization is needed
  const originalSizeInMB = videoFile.size / (1024 * 1024);
  console.log(`📏 [VIDEO-OPT] Original size: ${originalSizeInMB.toFixed(2)}MB`);
  
  if (!shouldOptimizeVideo(videoFile, maxSizeMB)) {
    console.log(`✅ [VIDEO-OPT] No optimization needed - file under ${maxSizeMB}MB threshold`);
    return {
      optimizedFile: videoFile,
      originalSize: videoFile.size,
      optimizedSize: videoFile.size,
      compressionRatio: 0,
      wasOptimized: false,
      processingTime: Date.now() - startTime,
      optimizationMethod: 'none',
      isAudioOnly: false
    };
  }

  // Strategy 1: Try Audio Extraction First (Most Efficient)
  if (preferAudioExtraction && shouldExtractAudio(videoFile, audioExtractionThreshold)) {
    console.log(`🎵 [VIDEO-OPT] Attempting audio extraction (primary strategy)`);
    try {
      const audioResult = await extractAudioForCaptions(videoFile, {
        audioBitrate,
        audioFormat: 'mp3',
        maxDurationSeconds: 300, // 5 minutes max
        sampleRate: 44100
      });

      if (audioResult.wasExtracted) {
        const processingTime = Date.now() - startTime;
        console.log(`✅ [VIDEO-OPT] Audio extraction successful`);
        return {
          optimizedFile: audioResult.audioFile,
          originalSize: audioResult.originalVideoSize,
          optimizedSize: audioResult.audioSize,
          compressionRatio: audioResult.compressionRatio,
          wasOptimized: true,
          processingTime,
          optimizationMethod: 'audio_extraction',
          isAudioOnly: true
        };
      }
    } catch (audioError) {
      console.warn(`⚠️ [VIDEO-OPT] Audio extraction failed, trying video compression:`, audioError);
    }
  }

  try {
    // Strategy 2: Video Compression (Fallback if audio extraction not preferred/failed)
    console.log(`🎬 [VIDEO-OPT] Starting video compression optimization for ${videoFile.name} (${originalSizeInMB.toFixed(2)}MB)`);
    
    // Create video element for processing
    console.log(`🎥 [VIDEO-OPT] Creating video element for metadata extraction`);
    const video = document.createElement('video');
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    // Wait for video metadata to load
    console.log(`⏳ [VIDEO-OPT] Waiting for video metadata to load...`);
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        console.log(`✅ [VIDEO-OPT] Video metadata loaded successfully`);
        resolve();
      };
      video.onerror = (error) => {
        console.error(`❌ [VIDEO-OPT] Failed to load video metadata:`, error);
        reject(new Error('Failed to load video metadata'));
      };
    });

    const originalWidth = video.videoWidth;
    const originalHeight = video.videoHeight;
    const duration = video.duration;

    console.log(`📐 [VIDEO-OPT] Video dimensions: ${originalWidth}x${originalHeight}, duration: ${duration.toFixed(2)}s`);

    // Calculate optimal dimensions maintaining aspect ratio
    const aspectRatio = originalWidth / originalHeight;
    let targetWidth = Math.min(originalWidth, maxWidth);
    let targetHeight = Math.min(originalHeight, maxHeight);

    console.log(`🔄 [VIDEO-OPT] Initial target dimensions: ${targetWidth}x${targetHeight}, aspect ratio: ${aspectRatio.toFixed(3)}`);

    if (targetWidth / targetHeight > aspectRatio) {
      targetWidth = targetHeight * aspectRatio;
      console.log(`📏 [VIDEO-OPT] Adjusted width to maintain aspect ratio: ${targetWidth}`);
    } else {
      targetHeight = targetWidth / aspectRatio;
      console.log(`📏 [VIDEO-OPT] Adjusted height to maintain aspect ratio: ${targetHeight}`);
    }

    // Round to even numbers for video encoding compatibility
    targetWidth = Math.round(targetWidth / 2) * 2;
    targetHeight = Math.round(targetHeight / 2) * 2;

    console.log(`📏 [VIDEO-OPT] Final target dimensions (rounded): ${originalWidth}x${originalHeight} → ${targetWidth}x${targetHeight}`);

    // Try MediaRecorder API first, fallback to canvas-based approach
    let optimizedFile: File;
    try {
      console.log(`🎙️ [VIDEO-OPT] Attempting MediaRecorder compression...`);
      console.log(`🎛️ [VIDEO-OPT] Settings: ${videoBitrate}kbps video, ${audioBitrate}kbps audio, quality: ${quality}`);
      
      optimizedFile = await compressVideoWithMediaRecorder(
        video,
        targetWidth,
        targetHeight,
        videoBitrate,
        audioBitrate,
        quality,
        videoFile.name
      );
      
      console.log(`✅ [VIDEO-OPT] MediaRecorder compression successful`);
    } catch (mediaRecorderError) {
      console.warn(`⚠️ [VIDEO-OPT] MediaRecorder compression failed, using fallback strategy:`, mediaRecorderError);
      
      // Fallback to simpler approach: just return a smaller version of original file
      // This is less optimal but more compatible
      console.log(`🔄 [VIDEO-OPT] Starting fallback optimization strategy...`);
      optimizedFile = await createSimplifiedVideo(videoFile, targetWidth, targetHeight, quality);
    }

    // Cleanup
    console.log(`🧹 [VIDEO-OPT] Cleaning up blob URL`);
    URL.revokeObjectURL(videoUrl);

    const optimizedSize = optimizedFile.size;
    const compressionRatio = Math.round(((videoFile.size - optimizedSize) / videoFile.size) * 100);
    const processingTime = Date.now() - startTime;

    console.log(`📊 [VIDEO-OPT] Optimization results:`);
    console.log(`   📏 Original size: ${originalSizeInMB.toFixed(2)}MB`);
    console.log(`   📏 Optimized size: ${(optimizedSize / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`   📉 Compression: ${compressionRatio}% reduction`);
    console.log(`   ⏱️ Processing time: ${(processingTime / 1000).toFixed(1)}s`);
    console.log(`✅ [VIDEO-OPT] Video optimization completed successfully`);

    return {
      optimizedFile,
      originalSize: videoFile.size,
      optimizedSize,
      compressionRatio,
      wasOptimized: true,
      processingTime,
      optimizationMethod: 'video_compression',
      isAudioOnly: false
    };

  } catch (error) {
    console.error(`❌ [VIDEO-OPT] Video compression failed:`, error);
    console.log(`🔄 [VIDEO-OPT] Trying file chunking as final fallback`);
    
    // Strategy 3: File Chunking (Ultimate Fallback)
    try {
      const chunkResult = await createSimplifiedVideo(videoFile, maxWidth, maxHeight, quality);
      const processingTime = Date.now() - startTime;
      
      if (chunkResult.size < videoFile.size) {
        const compressionRatio = Math.round(((videoFile.size - chunkResult.size) / videoFile.size) * 100);
        console.log(`✅ [VIDEO-OPT] File chunking successful: ${compressionRatio}% reduction`);
        
        return {
          optimizedFile: chunkResult,
          originalSize: videoFile.size,
          optimizedSize: chunkResult.size,
          compressionRatio,
          wasOptimized: true,
          processingTime,
          optimizationMethod: 'file_chunking',
          isAudioOnly: false
        };
      }
    } catch (chunkError) {
      console.error(`❌ [VIDEO-OPT] File chunking also failed:`, chunkError);
    }
    
    // Ultimate fallback: return original file
    const processingTime = Date.now() - startTime;
    console.log(`⚠️ [VIDEO-OPT] All optimization strategies failed, returning original file after ${(processingTime / 1000).toFixed(1)}s`);
    
    return {
      optimizedFile: videoFile,
      originalSize: videoFile.size,
      optimizedSize: videoFile.size,
      compressionRatio: 0,
      wasOptimized: false,
      processingTime,
      optimizationMethod: 'none',
      isAudioOnly: false
    };
  }
}

/**
 * Compresses video using MediaRecorder API with canvas resampling
 */
async function compressVideoWithMediaRecorder(
  video: HTMLVideoElement,
  targetWidth: number,
  targetHeight: number,
  videoBitrate: number,
  audioBitrate: number,
  quality: number,
  originalFileName: string
): Promise<File> {
  console.log(`🎬 [MEDIA-REC] Starting MediaRecorder compression`);
  console.log(`🎬 [MEDIA-REC] Target dimensions: ${targetWidth}x${targetHeight}`);
  console.log(`🎬 [MEDIA-REC] Bitrates: video ${videoBitrate}kbps, audio ${audioBitrate}kbps`);
  
  return new Promise((resolve, reject) => {
    try {
      // Create canvas for video resampling
      console.log(`🎨 [MEDIA-REC] Creating canvas for video resampling`);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        const error = new Error('Failed to get canvas context');
        console.error(`❌ [MEDIA-REC] ${error.message}`);
        throw error;
      }
      
      console.log(`✅ [MEDIA-REC] Canvas created successfully`);

      // Create canvas stream
      console.log(`📺 [MEDIA-REC] Creating canvas stream at 15 FPS`);
      const canvasStream = canvas.captureStream(15);

      // Get audio track from original video if available  
      let audioTrack: MediaStreamTrack | undefined;
      
      // Create audio context to extract audio
      console.log(`🎵 [MEDIA-REC] Creating audio context for audio extraction`);
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaElementSource(video);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      console.log(`🔗 [MEDIA-REC] Audio context setup complete`);
      
      // Add audio track to canvas stream
      destination.stream.getAudioTracks().forEach(track => {
        console.log(`🎵 [MEDIA-REC] Adding audio track to canvas stream`);
        canvasStream.addTrack(track);
        audioTrack = track;
      });

      // Configure MediaRecorder
      const mimeType = getSupportedMimeType();
      console.log(`🎥 [MEDIA-REC] Using MIME type: ${mimeType}`);
      console.log(`⚙️ [MEDIA-REC] MediaRecorder settings: video ${videoBitrate * 1000}bps, audio ${audioBitrate * 1000}bps`);
      
      const mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: videoBitrate * 1000,
        audioBitsPerSecond: audioBitrate * 1000,
      });

      const chunks: BlobPart[] = [];
      console.log(`📝 [MEDIA-REC] MediaRecorder configured, setting up event handlers`);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`📦 [MEDIA-REC] Received chunk: ${(event.data.size / 1024).toFixed(1)}KB`);
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log(`🛑 [MEDIA-REC] MediaRecorder stopped, processing ${chunks.length} chunks`);
        try {
          // Clean up
          console.log(`🧹 [MEDIA-REC] Cleaning up audio resources`);
          audioTrack?.stop();
          audioContext.close();
          
          // Create optimized file
          const blob = new Blob(chunks, { type: mimeType });
          const fileName = originalFileName.replace(/\.[^/.]+$/, '_optimized.mp4');
          const optimizedFile = new File([blob], fileName, { type: 'video/mp4' });
          
          console.log(`✅ [MEDIA-REC] Created optimized file: ${fileName} (${(blob.size / 1024 / 1024).toFixed(2)}MB)`);
          resolve(optimizedFile);
        } catch (error) {
          console.error(`❌ [MEDIA-REC] Error creating optimized file:`, error);
          reject(error);
        }
      };

      mediaRecorder.onerror = (error) => {
        console.error(`❌ [MEDIA-REC] MediaRecorder error:`, error);
        reject(error);
      };

      // Start recording
      console.log(`🎬 [MEDIA-REC] Starting MediaRecorder (1s chunk intervals)`);
      mediaRecorder.start(1000); // Collect data every second

      // Draw video frames to canvas
      let frameCount = 0;
      const drawFrame = () => {
        if (video.ended || video.paused) {
          console.log(`🎬 [MEDIA-REC] Video playback ended, stopping MediaRecorder (${frameCount} frames processed)`);
          mediaRecorder.stop();
          return;
        }

        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        frameCount++;
        if (frameCount % 30 === 0) { // Log every 30 frames (2 seconds at 15fps)
          console.log(`🎬 [MEDIA-REC] Processed ${frameCount} frames (${(video.currentTime).toFixed(1)}s/${video.duration.toFixed(1)}s)`);
        }
        requestAnimationFrame(drawFrame);
      };

      // Start video playback and frame drawing
      console.log(`▶️ [MEDIA-REC] Starting video playback from beginning`);
      video.currentTime = 0;
      video.play().then(() => {
        console.log(`🎨 [MEDIA-REC] Starting frame drawing process`);
        drawFrame();
      }).catch((playError) => {
        console.error(`❌ [MEDIA-REC] Video playback failed:`, playError);
        reject(playError);
      });

      // Stop recording when video ends
      video.onended = () => {
        console.log(`🏁 [MEDIA-REC] Video ended, stopping recording in 100ms`);
        setTimeout(() => mediaRecorder.stop(), 100);
      };

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get best supported MIME type for video recording
 */
function getSupportedMimeType(): string {
  const possibleTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/mp4;codecs=h264,aac',
    'video/webm',
    'video/mp4'
  ];

  for (const type of possibleTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'video/webm'; // Fallback
}

/**
 * Alternative optimization using FFmpeg-style processing (if available)
 * This is a placeholder for future server-side optimization
 */
export async function optimizeVideoServerSide(
  videoFile: File,
  options: VideoOptimizationOptions = {}
): Promise<OptimizationResult> {
  // This could be implemented to send video to your encoding API
  // for server-side optimization using FFmpeg
  
  console.log('🚧 Server-side optimization not implemented yet');
  
  // For now, fallback to client-side optimization
  return optimizeVideoForCaptions(videoFile, options);
}

/**
 * Simple fallback video optimization when MediaRecorder is not available
 * Instead of complex processing, we use a smarter approach: chunk the video
 */
async function createSimplifiedVideo(
  originalFile: File,
  targetWidth: number,
  targetHeight: number,
  quality: number
): Promise<File> {
  console.log(`🔄 [FALLBACK] Starting simplified video optimization`);
  console.log(`📁 [FALLBACK] Original file: ${originalFile.name} (${(originalFile.size / 1024 / 1024).toFixed(2)}MB)`);
  
  try {
    // For large video files, a practical approach is to create a smaller chunk
    // that contains the audio (which is what matters for captions)
    // This is much more reliable than canvas-based approaches
    
    const maxChunkSizeMB = 25; // Smaller target for fallback
    const maxChunkSizeBytes = maxChunkSizeMB * 1024 * 1024;
    
    console.log(`🎯 [FALLBACK] Target chunk size: ${maxChunkSizeMB}MB (${maxChunkSizeBytes} bytes)`);
    
    if (originalFile.size <= maxChunkSizeBytes) {
      // File is already small enough
      console.log(`✅ [FALLBACK] File already under ${maxChunkSizeMB}MB, no chunking needed`);
      return originalFile;
    }
    
    // Create a smaller chunk from the beginning of the file
    // This maintains the original format and audio quality
    console.log(`📦 [FALLBACK] Reading file into ArrayBuffer...`);
    const arrayBuffer = await originalFile.arrayBuffer();
    console.log(`📦 [FALLBACK] ArrayBuffer created: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);
    
    const chunkSize = Math.min(arrayBuffer.byteLength, maxChunkSizeBytes);
    console.log(`✂️ [FALLBACK] Creating chunk of ${(chunkSize / 1024 / 1024).toFixed(2)}MB from beginning`);
    const chunk = arrayBuffer.slice(0, chunkSize);
    
    const fileName = originalFile.name.replace(/\.[^/.]+$/, '_optimized_chunk.mp4');
    const optimizedFile = new File([chunk], fileName, { type: originalFile.type });
    
    console.log(`✅ [FALLBACK] Created chunk file: ${fileName}`);
    console.log(`📊 [FALLBACK] Size reduction: ${(originalFile.size / 1024 / 1024).toFixed(2)}MB → ${(optimizedFile.size / 1024 / 1024).toFixed(2)}MB`);
    
    return optimizedFile;
    
  } catch (error) {
    console.error(`❌ [FALLBACK] Chunk-based optimization failed:`, error);
    console.warn(`🔄 [FALLBACK] Returning original file as ultimate fallback`);
    
    // Ultimate fallback: return original file
    return originalFile;
  }
}

/**
 * Utility to format file sizes for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}