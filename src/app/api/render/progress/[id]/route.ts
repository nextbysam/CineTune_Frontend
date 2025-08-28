import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const progressFilePath = path.join(os.tmpdir(), `render-progress-${id}.json`);
    
    // Check if progress file exists
    if (!fs.existsSync(progressFilePath)) {
      return NextResponse.json({ progress: 0, status: "not_found" });
    }
    
    try {
      const progressData = JSON.parse(fs.readFileSync(progressFilePath, 'utf-8'));
      return NextResponse.json({
        progress: progressData.progress || 0,
        timestamp: progressData.timestamp || Date.now(),
        status: "rendering"
      });
    } catch (parseError) {
      console.error("[progress-api] Failed to parse progress file:", parseError);
      return NextResponse.json({ progress: 0, status: "error" });
    }
    
  } catch (error) {
    console.error("[progress-api] Error reading progress:", error);
    return NextResponse.json({ progress: 0, status: "error" }, { status: 500 });
  }
}