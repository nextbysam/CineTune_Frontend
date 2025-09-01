// Migration script to move existing renders to user-specific folders
const fs = require("fs/promises");
const path = require("path");

async function migrateRenders() {
	const rendersDir = path.join(process.cwd(), "renders");
	const defaultUserDir = path.join(rendersDir, "legacy_user");

	console.log("[migrate] Starting render migration...");

	try {
		// Check if renders directory exists
		const stats = await fs.stat(rendersDir);
		if (!stats.isDirectory()) {
			console.log("[migrate] Renders directory not found, nothing to migrate");
			return;
		}

		// Get all files in renders directory
		const files = await fs.readdir(rendersDir);
		const videoFiles = files.filter((file) => file.endsWith(".mp4"));

		if (videoFiles.length === 0) {
			console.log("[migrate] No video files found to migrate");
			return;
		}

		console.log(`[migrate] Found ${videoFiles.length} video files to migrate`);

		// Create legacy user directory
		await fs.mkdir(defaultUserDir, { recursive: true });
		console.log(`[migrate] Created legacy user directory: ${defaultUserDir}`);

		// Move each video file
		let movedCount = 0;
		for (const file of videoFiles) {
			const sourcePath = path.join(rendersDir, file);
			const targetPath = path.join(defaultUserDir, file);

			try {
				// Check if file is actually in the root renders directory (not a subdirectory)
				const sourceStats = await fs.stat(sourcePath);
				if (sourceStats.isFile()) {
					await fs.rename(sourcePath, targetPath);
					console.log(`[migrate] Moved: ${file}`);
					movedCount++;
				}
			} catch (moveError) {
				console.warn(`[migrate] Failed to move ${file}:`, moveError.message);
			}
		}

		console.log(
			`[migrate] Migration complete: ${movedCount} files moved to legacy_user folder`,
		);
	} catch (error) {
		console.error("[migrate] Migration failed:", error.message);
	}
}

// Run migration if called directly
if (require.main === module) {
	migrateRenders().catch(console.error);
}

module.exports = { migrateRenders };
