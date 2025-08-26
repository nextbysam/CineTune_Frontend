import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { getUserIdFromRequest, sanitizeUserId } from "@/utils/user-session";

export async function GET(request: Request) {
  try {
    // Get user ID for isolation
    const userId = getUserIdFromRequest(request);
    const sanitizedUserId = sanitizeUserId(userId);
    
    console.log(`[render-list] Loading renders for user: ${sanitizedUserId}`);
    
    const baseRendersDir = join(process.cwd(), "renders");
    const userRendersDir = join(baseRendersDir, sanitizedUserId);
    
    // Check for user-specific renders first
    let rendersDir = userRendersDir;
    let files: string[] = [];
    
    try {
      await stat(userRendersDir);
      files = await readdir(userRendersDir);
      console.log(`[render-list] Found user-specific directory with ${files.length} files`);
    } catch {
      // Fallback to legacy renders directory for backwards compatibility
      try {
        await stat(baseRendersDir);
        files = await readdir(baseRendersDir);
        rendersDir = baseRendersDir;
        console.log(`[render-list] Using legacy renders directory with ${files.length} files`);
      } catch {
        console.log(`[render-list] No renders found for user: ${sanitizedUserId}`);
        return NextResponse.json({ renders: [], userId: sanitizedUserId }, { status: 200 });
      }
    }
    
    // Filter for video files
    const videoFiles = files.filter(file => file.endsWith('.mp4'));
    console.log(`[render-list] Processing ${videoFiles.length} video files`);
    
    const renders = await Promise.all(
      videoFiles.map(async (file) => {
        const filePath = join(rendersDir, file);
        const stats = await stat(filePath);
        
        // FIXED: Simple and safe date handling
        let createdAt: string;
        try {
          // Try to extract timestamp from filename (export_YYYY-MM-DDTHH-mm-ss-sssZ.mp4)
          const timestampMatch = file.match(/export_(.+)\.mp4$/);
          if (timestampMatch) {
            const rawTimestamp = timestampMatch[1];
            // Convert: 2025-08-26T18-21-41-878Z -> 2025-08-26T18:21:41.878Z
            const isoTimestamp = rawTimestamp
              .replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z');
            
            const parsedDate = new Date(isoTimestamp);
            if (!isNaN(parsedDate.getTime())) {
              createdAt = parsedDate.toISOString();
            } else {
              throw new Error('Invalid timestamp format');
            }
          } else {
            throw new Error('No timestamp in filename');
          }
        } catch (error) {
          // Fallback to file modification time
          createdAt = stats.mtime.toISOString();
        }
        
        return {
          id: file.replace('.mp4', ''),
          filename: file,
          path: filePath,
          size: stats.size,
          createdAt,
          modifiedAt: stats.mtime.toISOString(),
          downloadUrl: `/api/render/local/file?path=${encodeURIComponent(filePath)}`,
        };
      })
    );

    // Sort by creation date (newest first)
    renders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`[render-list] Returning ${renders.length} renders for user: ${sanitizedUserId}`);
    return NextResponse.json({ renders, userId: sanitizedUserId }, { status: 200 });
  } catch (error) {
    console.error("[render-list] Error listing renders:", error);
    return NextResponse.json(
      { error: "Failed to list renders", message: String(error) },
      { status: 500 }
    );
  }
}