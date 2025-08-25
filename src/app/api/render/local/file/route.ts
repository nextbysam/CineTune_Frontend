import { NextRequest, NextResponse } from "next/server";
import { createReadStream, statSync } from "fs";
import { basename } from "path";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "No file path provided" }, { status: 400 });
    }

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