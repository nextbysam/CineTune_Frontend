import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";

interface VideoEncodingJob {
  id: string;
  inputPath: string;
  outputPath: string;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  originalSize?: number;
  compressedSize?: number;
  startTime?: number;
}

// In-memory job tracking (in production, use Redis or database)
const encodingJobs = new Map<string, VideoEncodingJob>();

// Optimal encoding settings for editing workflow
const getEncodingSettings = (inputPath: string) => {
  const ext = path.extname(inputPath).toLowerCase();
  
  // Base settings for high-quality, low-size editing proxy
  const baseSettings = [
    '-c:v', 'libx264',           // H.264 codec for compatibility
    '-preset', 'medium',         // Balance between speed and compression
    '-crf', '23',               // Constant Rate Factor - good quality
    '-c:a', 'aac',              // AAC audio codec
    '-b:a', '128k',             // Audio bitrate
    '-movflags', '+faststart',   // Web optimization
    '-pix_fmt', 'yuv420p',      // Pixel format for compatibility
    '-vf', 'scale=-2:720',      // Scale to 720p height, maintain aspect ratio
    '-maxrate', '2M',           // Maximum bitrate 2Mbps
    '-bufsize', '4M',           // Buffer size
    '-g', '60',                 // GOP size for seeking performance
    '-keyint_min', '60'         // Minimum keyframe interval
  ];

  return baseSettings;
};

const encodeVideo = async (job: VideoEncodingJob): Promise<void> => {
  return new Promise((resolve, reject) => {
    const settings = getEncodingSettings(job.inputPath);
    
    const ffmpegArgs = [
      '-i', job.inputPath,
      '-progress', 'pipe:1',     // Progress to stdout
      '-nostats',                // No stats output
      '-loglevel', 'error',      // Only show errors
      ...settings,
      '-y',                      // Overwrite output
      job.outputPath
    ];

    console.log(`🎬 Starting FFmpeg encoding: ${job.inputPath} -> ${job.outputPath}`);
    console.log(`FFmpeg command: ffmpeg ${ffmpegArgs.join(' ')}`);

    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    let duration: number | null = null;
    let timeProcessed: number | null = null;

    job.status = 'processing';
    job.startTime = Date.now();

    ffmpeg.stdout.on('data', (data) => {
      const output = data.toString();
      
      // Parse FFmpeg progress output
      const durationMatch = output.match(/duration=(\d+):(\d+):(\d+\.\d+)/);
      const timeMatch = output.match(/out_time=(\d+):(\d+):(\d+\.\d+)/);
      
      if (durationMatch) {
        const [, hours, minutes, seconds] = durationMatch;
        duration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
      }
      
      if (timeMatch && duration) {
        const [, hours, minutes, seconds] = timeMatch;
        timeProcessed = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
        
        const progress = Math.min(Math.round((timeProcessed / duration) * 100), 100);
        job.progress = progress;
        
        console.log(`📊 Encoding progress: ${job.id} - ${progress}%`);
      }
    });

    ffmpeg.stderr.on('data', (data) => {
      const error = data.toString();
      console.error(`FFmpeg error: ${error}`);
      
      // Extract duration from initial FFmpeg output if not found yet
      if (!duration) {
        const durationMatch = error.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
        if (durationMatch) {
          const [, hours, minutes, seconds] = durationMatch;
          duration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
        }
      }
    });

    ffmpeg.on('close', async (code) => {
      if (code === 0) {
        try {
          // Get file sizes for comparison
          const originalStats = await fs.stat(job.inputPath);
          const compressedStats = await fs.stat(job.outputPath);
          
          job.originalSize = originalStats.size;
          job.compressedSize = compressedStats.size;
          job.status = 'completed';
          job.progress = 100;
          
          const compressionRatio = ((originalStats.size - compressedStats.size) / originalStats.size * 100).toFixed(1);
          console.log(`✅ Encoding completed: ${job.id}`);
          console.log(`📦 Size reduction: ${originalStats.size} -> ${compressedStats.size} bytes (${compressionRatio}% smaller)`);
          
          resolve();
        } catch (error) {
          job.status = 'failed';
          job.error = `Failed to get file stats: ${error}`;
          reject(error);
        }
      } else {
        job.status = 'failed';
        job.error = `FFmpeg process exited with code ${code}`;
        console.error(`❌ Encoding failed: ${job.id} - Exit code: ${code}`);
        reject(new Error(`FFmpeg process failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (error) => {
      job.status = 'failed';
      job.error = error.message;
      console.error(`❌ FFmpeg spawn error: ${error.message}`);
      reject(error);
    });
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath, fileName } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      );
    }

    // Validate input file exists
    let inputPath: string;
    if (path.isAbsolute(filePath) && !filePath.startsWith('/uploads/')) {
      // It's a true absolute path (like /Users/sam/...)
      inputPath = filePath;
    } else {
      // It's a relative path or starts with /uploads/ (which should be relative to public)
      const relativePath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
      inputPath = path.join(process.cwd(), 'public', relativePath);
    }
    
    try {
      await fs.access(inputPath);
    } catch (error) {
      return NextResponse.json(
        { error: "Input file not found" },
        { status: 404 }
      );
    }

    // Generate job ID and output path
    const jobId = nanoid();
    const originalName = fileName || path.basename(inputPath);
    const name = path.parse(originalName).name;
    const outputFileName = `encoded_${name}_${jobId}.mp4`;
    const outputPath = path.join(process.cwd(), 'public', 'uploads', outputFileName);

    // Ensure uploads directory exists
    const uploadsDir = path.dirname(outputPath);
    await fs.mkdir(uploadsDir, { recursive: true });

    // Create encoding job
    const job: VideoEncodingJob = {
      id: jobId,
      inputPath,
      outputPath,
      progress: 0,
      status: 'pending'
    };

    encodingJobs.set(jobId, job);

    // Start encoding process asynchronously
    encodeVideo(job).catch((error) => {
      console.error(`Encoding job ${jobId} failed:`, error);
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Video encoding started',
      outputFileName,
      outputUrl: `/uploads/${outputFileName}`
    });

  } catch (error) {
    console.error("Error starting video encoding:", error);
    return NextResponse.json(
      {
        error: "Failed to start video encoding",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const job = encodingJobs.get(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Calculate processing time if job is active
    let processingTime = null;
    if (job.startTime && job.status === 'processing') {
      processingTime = Math.round((Date.now() - job.startTime) / 1000);
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      error: job.error,
      originalSize: job.originalSize,
      compressedSize: job.compressedSize,
      processingTime,
      outputUrl: job.status === 'completed' ? `/uploads/${path.basename(job.outputPath)}` : undefined
    });

  } catch (error) {
    console.error("Error getting encoding job status:", error);
    return NextResponse.json(
      {
        error: "Failed to get job status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}