import { NextRequest, NextResponse } from "next/server";
import { createReadStream, statSync } from "fs";
import { basename, dirname, join, resolve } from "path";
import { getServerSessionId, sanitizeSessionId } from "@/utils/session";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get("path");
    const requestedSession = searchParams.get("session");

    if (!filePath) {
      return NextResponse.json({ error: "No file path provided" }, { status: 400 });
    }

    // Universal access: Allow all users to access all rendered videos
    // FIXED: Use correct renders directory path (same fix as render script and list endpoint)
    const projectRoot = process.cwd().includes('.next/standalone') 
      ? join(process.cwd(), '../../')
      : process.cwd();
    const baseRendersDir = join(projectRoot, "renders");
    
    // Resolve paths to absolute normalized paths for comparison
    const resolvedFilePath = resolve(filePath);
    const resolvedBaseDir = resolve(baseRendersDir);
    
    // Basic security check: Ensure file is within the renders directory
    const isWithinRendersDir = resolvedFilePath.startsWith(resolvedBaseDir + '/') || 
                               resolvedFilePath.startsWith(resolvedBaseDir + '\\') ||
                               resolvedFilePath === resolvedBaseDir;
    
    console.log(`[file-stream] Universal access check:`);
    console.log(`[file-stream] Current working directory: ${process.cwd()}`);
    console.log(`[file-stream] Project root: ${projectRoot}`);
    console.log(`[file-stream] Base renders dir: ${resolvedBaseDir}`);
    console.log(`[file-stream] Requested file: ${resolvedFilePath}`);
    console.log(`[file-stream] Is within renders dir: ${isWithinRendersDir}`);
    
    if (!isWithinRendersDir) {
      console.warn(`[file-stream] Access denied - File not in renders directory: ${filePath}`);
      return NextResponse.json({ error: "Access denied - File must be in renders directory" }, { status: 403 });
    }
    
    console.log(`[file-stream] Universal access granted to file: ${filePath}`);

    // Verify file exists and get stats
    let stats;
    try {
      stats = statSync(filePath);
    } catch (error) {
      console.error("[file-stream] File not found:", filePath, error);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileName = basename(filePath);
    const fileSize = stats.size;

    console.log("[file-stream] Streaming file:", {
      path: filePath,
      name: fileName,
      size: fileSize,
    });

    // Create a readable stream
    const stream = createReadStream(filePath);

    // Convert Node.js stream to Web API ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => {
          controller.enqueue(new Uint8Array(Buffer.from(chunk)));
        });
        
        stream.on("end", () => {
          controller.close();
        });
        
        stream.on("error", (error) => {
          console.error("[file-stream] Stream error:", error);
          controller.error(error);
        });
      },
    });

    return new NextResponse(readableStream, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": fileSize.toString(),
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[file-stream] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 