import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";

export async function GET(request: NextRequest) {
  try {
    // Universal access: Show all renders to all users
    console.log(`[render-list] Loading all renders (universal access)`);
    
    // FIXED: Use correct renders directory path (same fix as render script)
    const projectRoot = process.cwd().includes('.next/standalone') 
      ? join(process.cwd(), '../../')
      : process.cwd();
    const baseRendersDir = join(projectRoot, "renders");
    let allRenders: any[] = [];
    
    // Get all files from all directories in renders
    try {
      const items = await readdir(baseRendersDir);
      
      for (const item of items) {
        const itemPath = join(baseRendersDir, item);
        const itemStats = await stat(itemPath);
        
        if (itemStats.isDirectory()) {
          // This is a session directory, read files from it
          try {
            const sessionFiles = await readdir(itemPath);
            const sessionVideoFiles = sessionFiles.filter(file => file.endsWith('.mp4'));
            
            for (const file of sessionVideoFiles) {
              const filePath = join(itemPath, file);
              const fileStats = await stat(filePath);
              allRenders.push({
                file,
                filePath,
                stats: fileStats,
                source: `session: ${item}`
              });
            }
          } catch (error) {
            console.warn(`[render-list] Could not read session directory ${item}:`, error);
          }
        } else if (item.endsWith('.mp4')) {
          // This is a legacy file in the base directory
          allRenders.push({
            file: item,
            filePath: itemPath,
            stats: itemStats,
            source: 'legacy'
          });
        }
      }
      
      console.log(`[render-list] Found ${allRenders.length} total renders from all sources`);
    } catch (error) {
      console.log(`[render-list] No renders directory found or error reading:`, error);
      return NextResponse.json({ renders: [], totalCount: 0 }, { status: 200 });
    }
    
    // Process all renders
    console.log(`[render-list] Processing ${allRenders.length} total video files`);
    
    const renders = allRenders.map((renderItem) => {
      const { file, filePath, stats, source } = renderItem;
      
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
        source, // Show which source this render came from
        downloadUrl: `/api/render/local/file?path=${encodeURIComponent(filePath)}`,
      };
    });

    // Sort by creation date (newest first)
    renders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`[render-list] Returning ${renders.length} total renders (universal access)`);
    return NextResponse.json({ renders, totalCount: renders.length }, { status: 200 });
  } catch (error) {
    console.error("[render-list] Error listing renders:", error);
    return NextResponse.json(
      { error: "Failed to list renders", message: String(error) },
      { status: 500 }
    );
  }
}