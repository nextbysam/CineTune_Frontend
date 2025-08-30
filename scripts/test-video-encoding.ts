#!/usr/bin/env tsx

/**
 * Test script for video encoding functionality
 * Run with: npx tsx scripts/test-video-encoding.ts
 */

import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";

// Test if FFmpeg is available
async function testFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    
    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });
    
    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
}

// Create a simple test video using FFmpeg
async function createTestVideo(): Promise<string> {
  const testVideoPath = path.join(process.cwd(), 'public', 'uploads', 'test-video.mp4');
  
  return new Promise((resolve, reject) => {
    // Create a simple 10-second test video with color bars
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'lavfi',
      '-i', 'testsrc=duration=10:size=1920x1080:rate=30',
      '-c:v', 'libx264',
      '-t', '10',
      '-pix_fmt', 'yuv420p',
      '-y',
      testVideoPath
    ]);
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Test video created: ${testVideoPath}`);
        resolve(testVideoPath);
      } else {
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });
    
    ffmpeg.on('error', (error) => {
      reject(error);
    });
  });
}

// Test the encoding API
async function testEncodingAPI(videoPath: string) {
  try {
    console.log('\n🧪 Testing encoding API...');
    
    // Start encoding
    const response = await fetch('http://localhost:3000/api/uploads/encode-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath: videoPath,
        fileName: path.basename(videoPath)
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('🎬 Encoding started:', result);
    
    if (!result.success) {
      throw new Error(result.error || 'Encoding failed to start');
    }
    
    // Poll for completion
    const jobId = result.jobId;
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 1 minute timeout
    
    console.log('📊 Polling for encoding progress...');
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;
      
      const statusResponse = await fetch(`http://localhost:3000/api/uploads/encode-video?jobId=${jobId}`);
      const statusResult = await statusResponse.json();
      
      console.log(`Progress: ${statusResult.progress || 0}% - Status: ${statusResult.status}`);
      
      if (statusResult.status === 'completed') {
        completed = true;
        console.log('✅ Encoding completed!');
        console.log(`📦 Original size: ${statusResult.originalSize} bytes`);
        console.log(`📦 Compressed size: ${statusResult.compressedSize} bytes`);
        
        if (statusResult.originalSize && statusResult.compressedSize) {
          const reduction = ((statusResult.originalSize - statusResult.compressedSize) / statusResult.originalSize * 100).toFixed(1);
          console.log(`💾 Size reduction: ${reduction}%`);
        }
        
        console.log(`🎯 Output URL: ${statusResult.outputUrl}`);
      } else if (statusResult.status === 'failed') {
        throw new Error(`Encoding failed: ${statusResult.error || 'Unknown error'}`);
      }
    }
    
    if (!completed) {
      throw new Error('Encoding timeout');
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error);
    throw error;
  }
}

async function cleanup() {
  try {
    const testVideoPath = path.join(process.cwd(), 'public', 'uploads', 'test-video.mp4');
    await fs.unlink(testVideoPath);
    console.log('🧹 Cleaned up test video');
  } catch (error) {
    // Ignore cleanup errors
  }
}

async function main() {
  console.log('🎬 Video Encoding Test Script');
  console.log('==============================\n');
  
  try {
    // Check if FFmpeg is available
    console.log('1. Checking FFmpeg availability...');
    const ffmpegAvailable = await testFFmpegAvailable();
    
    if (!ffmpegAvailable) {
      console.error('❌ FFmpeg is not available. Please install FFmpeg first.');
      console.log('macOS: brew install ffmpeg');
      console.log('Ubuntu: sudo apt install ffmpeg');
      console.log('Windows: Download from https://ffmpeg.org/download.html');
      process.exit(1);
    }
    
    console.log('✅ FFmpeg is available');
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    // Create test video
    console.log('\n2. Creating test video...');
    const testVideoPath = await createTestVideo();
    
    // Get file stats
    const stats = await fs.stat(testVideoPath);
    console.log(`📊 Test video size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Test the encoding API (requires the Next.js server to be running)
    console.log('\n3. Testing encoding API...');
    console.log('⚠️  Make sure your Next.js development server is running (npm run dev)');
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    try {
      await testEncodingAPI(testVideoPath);
      console.log('\n🎉 All tests passed!');
    } catch (error) {
      console.log('\n⚠️  API test failed. This might be expected if the dev server is not running.');
      console.log('To test the API manually:');
      console.log(`1. Start the dev server: npm run dev`);
      console.log(`2. Use the test video: ${testVideoPath}`);
      console.log(`3. Call the API: POST /api/uploads/encode-video`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await cleanup();
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}