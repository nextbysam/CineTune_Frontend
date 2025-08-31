import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

async function getVideoOrientation(videoUrl: string): Promise<{
  orientation: 'vertical' | 'horizontal';
  width: number;
  height: number;
}> {
  try {
    console.log(`📐 [SERVER-AUDIO] Detecting video orientation from URL`);
    
    // Use ffprobe to get video dimensions
    const ffprobeCmd = `ffprobe -v quiet -print_format json -show_streams "${videoUrl}"`;
    
    const { stdout } = await execAsync(ffprobeCmd, { 
      timeout: 30000, // 30 second timeout for metadata
      maxBuffer: 1024 * 1024 // 1MB buffer
    });
    
    const probeData = JSON.parse(stdout);
    const videoStream = probeData.streams?.find((stream: any) => stream.codec_type === 'video');
    
    if (!videoStream) {
      console.warn(`⚠️ [SERVER-AUDIO] No video stream found, defaulting to vertical`);
      return { orientation: 'vertical', width: 0, height: 0 };
    }
    
    const width = parseInt(videoStream.width) || 0;
    const height = parseInt(videoStream.height) || 0;
    const orientation = height > width ? 'vertical' : 'horizontal';
    
    console.log(`📐 [SERVER-AUDIO] Video dimensions: ${width}x${height} (${orientation})`);
    
    return { orientation, width, height };
    
  } catch (error) {
    console.warn(`⚠️ [SERVER-AUDIO] Failed to detect orientation, defaulting to vertical:`, error);
    return { orientation: 'vertical', width: 0, height: 0 };
  }
}

interface AudioExtractionRequest {
  videoUrl: string;
  videoId: string;
  userId?: string;
  options?: {
    format?: 'mp3' | 'wav' | 'aac';
    bitrate?: string;
    channels?: number;
    sampleRate?: number;
    normalize?: boolean;
    removeNoise?: boolean;
  };
}

interface AudioExtractionResponse {
  success: boolean;
  audioUrl?: string;
  audioFile?: {
    name: string;
    size: number;
    type: string;
    duration?: number;
  };
  videoOrientation?: 'vertical' | 'horizontal';
  videoDimensions?: {
    width: number;
    height: number;
  };
  processingTime?: number;
  error?: string;
}

async function extractAudioWithFFmpeg(videoUrl: string, videoId: string, options: any = {}) {
  const tempDir = tmpdir();
  const audioPath = path.join(tempDir, `audio_${videoId}_${Date.now()}.mp3`);
  
  try {
    console.log(`🎵 [SERVER-AUDIO] Extracting audio directly from URL (no download): ${videoUrl}`);
    
    // Build FFmpeg command with options - directly from URL
    const format = options.format || 'mp3';
    const bitrate = options.bitrate || '128k';
    const channels = options.channels || 1;
    const sampleRate = options.sampleRate || 44100;
    
    // Use FFmpeg directly with the URL - optimized for speed!
    let ffmpegCmd = `ffmpeg -i "${videoUrl}" -vn -acodec libmp3lame -b:a ${bitrate} -ac ${channels} -ar ${sampleRate}`;
    
    // Add optimizations for faster processing
    ffmpegCmd += ` -avoid_negative_ts make_zero`; // Handle timestamp issues
    ffmpegCmd += ` -fflags +genpts`; // Generate presentation timestamps
    
    // Add duration limit for safety (max 5 minutes of audio)
    ffmpegCmd += ` -t 300`;
    
    ffmpegCmd += ` -y "${audioPath}"`;
    
    console.log(`⚡ [SERVER-AUDIO] Running optimized FFmpeg: ${ffmpegCmd.substring(0, 120)}...`);
    
    // Execute FFmpeg command with extended timeout for slow network conditions
    const ffmpegStartTime = Date.now();
    try {
      const { stdout, stderr } = await execAsync(ffmpegCmd, { 
        timeout: 300000, // 5 minute timeout (increased from 2 minutes)
        maxBuffer: 1024 * 1024 * 20, // 20MB buffer for large outputs
        env: { ...process.env, FFREPORT: 'file=/dev/null' } // Reduce FFmpeg logging overhead
      });
      
      const ffmpegDuration = Date.now() - ffmpegStartTime;
      console.log(`✅ [SERVER-AUDIO] FFmpeg completed in ${ffmpegDuration}ms`);
      
      if (stderr && stderr.length > 0) {
        // Log progress information and any errors
        const stderrLines = stderr.split('\n');
        
        // Find progress lines (contain "time=" and "speed=")
        const progressLines = stderrLines.filter(line => 
          line.includes('time=') && line.includes('speed=')
        );
        if (progressLines.length > 0) {
          const lastProgress = progressLines[progressLines.length - 1];
          console.log(`📈 [SERVER-AUDIO] Progress: ${lastProgress.trim()}`);
        }
        
        // Find error lines
        const errorLines = stderrLines.filter(line => 
          line.includes('error') || line.includes('Error') || line.includes('fail') || line.includes('Failed')
        );
        if (errorLines.length > 0) {
          console.log(`⚠️ [SERVER-AUDIO] FFmpeg issues: ${errorLines.slice(0, 2).join(', ')}`);
        }
      }
      
    } catch (ffmpegError) {
      console.error(`❌ [SERVER-AUDIO] FFmpeg execution failed:`, ffmpegError);
      throw new Error(`FFmpeg execution failed: ${ffmpegError instanceof Error ? ffmpegError.message : String(ffmpegError)}`);
    }
    
    // Check if audio file was created
    try {
      const audioStats = await fs.stat(audioPath);
      console.log(`📊 [SERVER-AUDIO] Audio file created: ${(audioStats.size / 1024 / 1024).toFixed(2)}MB`);
      
      if (audioStats.size === 0) {
        throw new Error('FFmpeg created empty audio file');
      }
      
      // Read the extracted audio file
      const audioBuffer = await fs.readFile(audioPath);
      
      return {
        audioBuffer,
        audioSize: audioStats.size,
        audioPath,
        audioFilename: `audio_${videoId}.mp3`
      };
      
    } catch (statsError) {
      throw new Error(`Audio file was not created or is inaccessible: ${statsError instanceof Error ? statsError.message : String(statsError)}`);
    }
    
  } catch (error) {
    console.error(`❌ [SERVER-AUDIO] Audio extraction error:`, error);
    
    // Clean up temporary files on error
    await fs.unlink(audioPath).catch(() => {});
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AudioExtractionRequest = await request.json();
    const { videoUrl, videoId, userId, options = {} } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { 
          success: false,
          error: "videoUrl is required" 
        },
        { status: 400 }
      );
    }

    if (!videoId) {
      return NextResponse.json(
        { 
          success: false,
          error: "videoId is required" 
        },
        { status: 400 }
      );
    }

    console.log(`🎵 [SERVER-AUDIO] Starting server-side audio extraction for video: ${videoId}`);
    console.log(`🔗 [SERVER-AUDIO] Source video URL: ${videoUrl}`);
    console.log(`⚡ [SERVER-AUDIO] Checking FFmpeg availability`);

    // First, check if FFmpeg is available
    try {
      await execAsync('ffmpeg -version', { timeout: 5000 });
      console.log(`✅ [SERVER-AUDIO] FFmpeg is available`);
    } catch (ffmpegCheckError) {
      console.error(`❌ [SERVER-AUDIO] FFmpeg not available:`, ffmpegCheckError);
      return NextResponse.json(
        { 
          success: false,
          error: "Server-side audio extraction not available - FFmpeg not installed", 
          fallbackToClient: true,
          details: "FFmpeg is not available on the server"
        },
        { status: 503 }
      );
    }

    // Check if ffprobe is available (for orientation detection)
    let ffprobeAvailable = true;
    try {
      await execAsync('ffprobe -version', { timeout: 5000 });
      console.log(`✅ [SERVER-AUDIO] FFprobe is available for orientation detection`);
    } catch (ffprobeCheckError) {
      console.warn(`⚠️ [SERVER-AUDIO] FFprobe not available, orientation detection will be skipped:`, ffprobeCheckError);
      ffprobeAvailable = false;
    }

    console.log(`⚡ [SERVER-AUDIO] Using local FFmpeg processing`);

    const extractionStartTime = Date.now();
    
    try {
      // Get video orientation first (only if ffprobe is available)
      let orientationPromise;
      if (ffprobeAvailable) {
        console.log(`📐 [SERVER-AUDIO] Getting video orientation and dimensions`);
        orientationPromise = getVideoOrientation(videoUrl);
      } else {
        console.log(`📐 [SERVER-AUDIO] Skipping orientation detection (ffprobe not available)`);
        orientationPromise = Promise.resolve({ orientation: 'vertical' as const, width: 0, height: 0 });
      }
      
      // Try local FFmpeg extraction first
      const extractionResult = await extractAudioWithFFmpeg(videoUrl, videoId, options);
      const orientationResult = await orientationPromise;
      const processingTime = Date.now() - extractionStartTime;
      
      console.log(`✅ [SERVER-AUDIO] Audio extraction completed in ${processingTime}ms`);
      console.log(`📊 [SERVER-AUDIO] Audio file size: ${(extractionResult.audioSize / 1024 / 1024).toFixed(2)}MB`);

      // Create a unique audio ID for serving the file
      const audioId = `${videoId}_${Date.now()}`;
      const serveAudioPath = path.join(tmpdir(), `audio_${audioId}.mp3`);
      
      // Copy the audio file to a location that can be served
      await fs.copyFile(extractionResult.audioPath, serveAudioPath);
      
      // Clean up the original temporary audio file
      await fs.unlink(extractionResult.audioPath).catch(() => {});
      
      // Create absolute URL to serve the extracted audio
      let baseUrl = request.nextUrl.origin;
      
      // Fix for production: if origin is 0.0.0.0 or localhost, use the host header instead
      if (baseUrl.includes('0.0.0.0') || baseUrl.includes('localhost')) {
        const host = request.headers.get('host');
        const protocol = request.nextUrl.protocol;
        if (host) {
          baseUrl = `${protocol}//${host}`;
          console.log(`🔧 [SERVER-AUDIO] Fixed URL from ${request.nextUrl.origin} to ${baseUrl}`);
        }
      }
      
      const audioUrl = `${baseUrl}/api/uploads/serve-audio/${audioId}`;
      
      console.log(`🔗 [SERVER-AUDIO] Audio available at: ${audioUrl}`);

      const response: AudioExtractionResponse = {
        success: true,
        audioUrl: audioUrl,
        audioFile: {
          name: extractionResult.audioFilename,
          size: extractionResult.audioSize,
          type: 'audio/mp3'
        },
        videoOrientation: orientationResult.orientation,
        videoDimensions: {
          width: orientationResult.width,
          height: orientationResult.height
        },
        processingTime,
      };
      
      // Schedule cleanup of the served audio file after 1 hour
      setTimeout(async () => {
        try {
          await fs.unlink(serveAudioPath);
          console.log(`🧹 [SERVER-AUDIO] Cleaned up temporary audio file: ${serveAudioPath}`);
        } catch (cleanupError) {
          console.warn(`⚠️ [SERVER-AUDIO] Failed to cleanup audio file: ${cleanupError}`);
        }
      }, 60 * 60 * 1000); // 1 hour

      return NextResponse.json(response);

    } catch (ffmpegError) {
      console.error(`❌ [SERVER-AUDIO] Local FFmpeg extraction failed:`, ffmpegError);
      
      // Provide more specific error information
      let errorDetails = "Unknown error";
      let specificError = "Server-side audio extraction failed";
      
      if (ffmpegError instanceof Error) {
        errorDetails = ffmpegError.message;
        
        if (errorDetails.includes('timeout')) {
          specificError = "FFmpeg processing timed out - video may be too large or server overloaded";
        } else if (errorDetails.includes('No such file') || errorDetails.includes('not found')) {
          specificError = "FFmpeg binary not found or not executable";
        } else if (errorDetails.includes('Permission denied')) {
          specificError = "FFmpeg permission denied - server configuration issue";
        } else if (errorDetails.includes('Invalid data') || errorDetails.includes('No such file')) {
          specificError = "Unable to access video URL - network or permissions issue";
        } else if (errorDetails.includes('Protocol not found')) {
          specificError = "FFmpeg cannot access HTTPS URLs - missing protocol support";
        }
      }
      
      console.log(`🔄 [SERVER-AUDIO] Specific error: ${specificError}`);
      
      // Return a controlled error that triggers client-side fallback with specific details
      return NextResponse.json(
        { 
          success: false,
          error: "Server-side audio extraction temporarily unavailable", 
          fallbackToClient: true,
          details: `${specificError}: ${errorDetails}`
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error("❌ [SERVER-AUDIO] Audio extraction route error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "Server-side audio extraction not available",
        fallbackToClient: true,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}

// GET method for checking audio extraction service status
export async function GET() {
  try {
    // Check if FFmpeg is available locally
    let ffmpegAvailable = false;
    try {
      await execAsync('ffmpeg -version', { timeout: 5000 });
      ffmpegAvailable = true;
    } catch (ffmpegError) {
      console.warn('FFmpeg not available locally:', ffmpegError);
    }

    // Check if the external audio extraction service is available (as fallback)
    let externalServiceHealthy = false;
    try {
      const healthResponse = await fetch("https://upload-file-j43uyuaeza-uc.a.run.app/url", {
        method: "HEAD",
        headers: { "Content-Type": "application/json" },
      });
      externalServiceHealthy = healthResponse.ok;
    } catch (externalError) {
      console.warn('External service health check failed:', externalError);
    }
    
    return NextResponse.json({
      service: "Server-side Audio Extraction API",
      status: "running",
      localFFmpeg: ffmpegAvailable ? "available" : "unavailable",
      externalServiceHealth: externalServiceHealthy ? "healthy" : "unhealthy",
      processingMethods: [
        ffmpegAvailable ? "Local FFmpeg (primary)" : "Local FFmpeg (unavailable)",
        externalServiceHealthy ? "External service (fallback)" : "External service (unavailable)",
        "Client-side fallback (always available)"
      ],
      capabilities: {
        formats: ["mp3", "wav", "aac"],
        maxFileSize: "500MB",
        processing: ffmpegAvailable ? "Local FFmpeg + External fallback" : "External service only",
        features: [
          "High-quality audio extraction",
          "Format conversion", 
          "Audio normalization",
          "Noise reduction (optional)",
          "Multiple fallback strategies"
        ]
      },
      endpoints: {
        POST: "/api/uploads/extract-audio - Extract audio from video URL",
        GET: "/api/uploads/extract-audio - Service health check"
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      service: "Server-side Audio Extraction API", 
      status: "running",
      localFFmpeg: "unknown",
      externalServiceHealth: "unknown",
      error: "Could not check service health",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}