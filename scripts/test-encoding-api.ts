#!/usr/bin/env tsx

/**
 * Test the video encoding API directly
 * Run with: npx tsx scripts/test-encoding-api.ts
 */

import { startVideoEncoding, getEncodingStatus, pollEncodingStatus } from "../src/utils/video-encoding";
import { promises as fs } from "fs";
import path from "path";

async function testEncodingAPI() {
  try {
    console.log('🧪 Testing Video Encoding API');
    console.log('==============================\n');

    // Test file path
    const testVideoPath = path.join(process.cwd(), 'public', 'uploads', 'large-test-video.mp4');
    
    // Check if test file exists
    try {
      const stats = await fs.stat(testVideoPath);
      console.log(`✅ Test video found: ${testVideoPath}`);
      console.log(`📊 Original size: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);
    } catch {
      console.error('❌ Test video not found. Run this first:');
      console.error('ffmpeg -f lavfi -i testsrc=duration=5:size=1920x1080:rate=30 -c:v libx264 -t 5 -pix_fmt yuv420p -b:v 5M -y ./public/uploads/large-test-video.mp4');
      process.exit(1);
    }

    console.log('1. Starting video encoding...');
    const { jobId, outputUrl } = await startVideoEncoding(testVideoPath, 'large-test-video.mp4');
    console.log(`✅ Encoding started with job ID: ${jobId}`);
    console.log(`📁 Output will be saved to: ${outputUrl}\n`);

    console.log('2. Polling encoding progress...');
    
    return new Promise<void>((resolve, reject) => {
      const cancelPolling = pollEncodingStatus(jobId, {
        onProgress: (id, progress) => {
          process.stdout.write(`\r📊 Progress: ${progress}%`);
        },
        onStatus: (id, status, url) => {
          if (status !== 'processing') {
            console.log(`\n📋 Status: ${status}`);
          }
        },
        onError: (id, error) => {
          console.log(`\n❌ Encoding failed: ${error}`);
          reject(new Error(error));
        },
        onComplete: async (id, result) => {
          console.log('\n✅ Encoding completed!');
          console.log(`📦 Original size: ${(result.originalSize / 1024 / 1024).toFixed(2)} MB`);
          console.log(`📦 Compressed size: ${(result.compressedSize / 1024 / 1024).toFixed(2)} MB`);
          
          const compressionRatio = ((result.originalSize - result.compressedSize) / result.originalSize * 100).toFixed(1);
          console.log(`💾 Size reduction: ${compressionRatio}%`);
          console.log(`🎯 Output URL: ${result.encodedUrl}`);
          
          // Check if output file exists
          const outputPath = path.join(process.cwd(), 'public', result.encodedUrl);
          try {
            const outputStats = await fs.stat(outputPath);
            console.log(`✅ Output file verified: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);
          } catch (error) {
            console.log(`⚠️  Could not verify output file: ${error}`);
          }
          
          resolve();
        }
      });
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testEncodingAPI()
    .then(() => {
      console.log('\n🎉 All encoding tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Encoding test failed:', error.message);
      process.exit(1);
    });
}

export { testEncodingAPI };