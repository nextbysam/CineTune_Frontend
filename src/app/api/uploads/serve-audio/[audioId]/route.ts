import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ audioId: string }> }
) {
  try {
    const { audioId } = await params;
    
    if (!audioId) {
      return NextResponse.json(
        { error: "Audio ID is required" },
        { status: 400 }
      );
    }

    // Construct the audio file path
    const tempDir = tmpdir();
    const audioPath = path.join(tempDir, `audio_${audioId}.mp3`);
    
    try {
      // Check if the audio file exists
      await fs.access(audioPath);
      
      // Read the audio file
      const audioBuffer = await fs.readFile(audioPath);
      
      // Return the audio file with proper headers
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="audio_${audioId}.mp3"`,
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
          'Content-Length': audioBuffer.length.toString(),
        },
      });
      
    } catch (fileError) {
      console.warn(`⚠️ [SERVE-AUDIO] Audio file not found: ${audioPath}`);
      return NextResponse.json(
        { 
          error: "Audio file not found or expired",
          audioId: audioId 
        },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error("❌ [SERVE-AUDIO] Error serving audio file:", error);
    
    return NextResponse.json(
      {
        error: "Failed to serve audio file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}