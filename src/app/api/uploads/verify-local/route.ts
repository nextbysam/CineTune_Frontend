import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoUrl, videoId } = body;
    
    console.log(`🔍 Verifying local video: ${videoUrl}`);
    
    if (!videoUrl) {
      return NextResponse.json(
        { error: "No video URL provided" },
        { status: 400 }
      );
    }

    // Extract filename from video URL
    let fileName = null;
    let localFilePath = null;
    
    if (videoUrl.startsWith('/uploads/')) {
      // It's already a local URL
      fileName = videoUrl.split('/').pop();
      localFilePath = path.join(process.cwd(), 'public', videoUrl);
      console.log(`✅ Local video URL detected: ${videoUrl}`);
    } else {
      // It's an external URL, we need to find the matching local file
      console.log(`🔍 External URL detected, searching for local match...`);
      
      // Get all files in uploads directory
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      try {
        const files = await fs.readdir(uploadsDir);
        console.log(`📁 Found ${files.length} files in uploads directory:`, files);
        
        // Look for local files (files starting with 'local_')
        const localFiles = files.filter(file => file.startsWith('local_'));
        console.log(`📁 Found ${localFiles.length} local files:`, localFiles);
        
        if (localFiles.length === 0) {
          return NextResponse.json(
            { 
              error: "No local video files found",
              details: "No files starting with 'local_' found in uploads directory"
            },
            { status: 404 }
          );
        }
        
        // For now, use the first local file found
        // In a more sophisticated system, you might want to match by metadata or other criteria
        fileName = localFiles[0];
        localFilePath = path.join(uploadsDir, fileName);
        console.log(`✅ Using local file: ${fileName}`);
        
      } catch (error) {
        console.error(`❌ Error reading uploads directory:`, error);
        return NextResponse.json(
          { 
            error: "Failed to read uploads directory",
            details: error instanceof Error ? error.message : "Unknown error"
          },
          { status: 500 }
        );
      }
    }
    
    // Verify the file exists and get its stats
    try {
      const stats = await fs.stat(localFilePath);
      console.log(`✅ Local file verified: ${localFilePath} (${stats.size} bytes)`);
      
      return NextResponse.json({
        success: true,
        fileName: fileName,
        localFilePath: localFilePath,
        localUrl: `/uploads/${fileName}`,
        fileSize: stats.size,
        videoId: videoId,
        originalUrl: videoUrl,
      });
      
    } catch (error) {
      console.error(`❌ Local file not found: ${localFilePath}`);
      return NextResponse.json(
        { 
          error: "Local video file not found",
          details: `File not found: ${localFilePath}`,
          searchedPath: localFilePath
        },
        { status: 404 }
      );
    }
    
  } catch (error) {
    console.error("Error verifying local video:", error);
    return NextResponse.json(
      {
        error: "Failed to verify local video",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 