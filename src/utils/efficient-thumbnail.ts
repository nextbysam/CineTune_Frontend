import { thumbnailCache, createThumbnailKey } from "./thumbnail-cache";

// Track ongoing thumbnail generations to prevent duplicates
const generationQueue = new Map<string, Promise<string | null>>();

// Optimized thumbnail generation with caching and deduplication
export const generateOptimizedThumbnail = async (
	videoSrc: string,
	originalFile?: File,
): Promise<string | null> => {
	const cacheKey = createThumbnailKey(videoSrc);

	// Check cache first
	const cached = thumbnailCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	// Check if already generating
	if (generationQueue.has(cacheKey)) {
		return await generationQueue.get(cacheKey)!;
	}

	// Start generation
	const generationPromise = generateThumbnailInternal(videoSrc, originalFile);
	generationQueue.set(cacheKey, generationPromise);

	try {
		const result = await generationPromise;
		if (result) {
			thumbnailCache.set(cacheKey, result);
		}
		return result;
	} finally {
		// Clean up queue
		generationQueue.delete(cacheKey);
	}
};

const generateThumbnailInternal = async (
	videoSrc: string,
	originalFile?: File,
): Promise<string | null> => {
	return new Promise((resolve) => {
		const video = document.createElement("video");
		video.crossOrigin = "anonymous";
		video.src = videoSrc;
		video.currentTime = 1.5;
		video.muted = true;
		video.playsInline = true;
		video.preload = "metadata";
		video.style.display = "none";

		let resolved = false;

		const cleanup = () => {
			if (video.parentNode) {
				video.parentNode.removeChild(video);
			}
			if (videoSrc.startsWith("blob:")) {
				URL.revokeObjectURL(videoSrc);
			}
		};

		const resolveOnce = (result: string | null) => {
			if (!resolved) {
				resolved = true;
				cleanup();
				resolve(result);
			}
		};

		video.onloadedmetadata = () => {
			setTimeout(() => {
				video.currentTime = Math.min(1.5, video.duration * 0.1);
			}, 100); // Reduced delay
		};

		video.onloadeddata = () => {
			setTimeout(() => {
				try {
					const canvas = document.createElement("canvas");

					// Smaller dimensions to reduce memory usage
					const maxWidth = 120; // Reduced from 160
					const maxHeight = 68; // Reduced from 90

					const aspectRatio = video.videoWidth / video.videoHeight;
					let width, height;

					if (aspectRatio > maxWidth / maxHeight) {
						width = maxWidth;
						height = maxWidth / aspectRatio;
					} else {
						height = maxHeight;
						width = maxHeight * aspectRatio;
					}

					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext("2d");
					if (ctx) {
						ctx.drawImage(video, 0, 0, width, height);
						// Use lower quality JPEG to reduce size further
						const thumbnail = canvas.toDataURL("image/jpeg", 0.6); // Reduced from 0.7
						resolveOnce(thumbnail);
					} else {
						resolveOnce(null);
					}
				} catch (error) {
					resolveOnce(null);
				}
			}, 200); // Reduced delay
		};

		video.onerror = () => resolveOnce(null);
		video.onabort = () => resolveOnce(null);

		// Shorter timeout
		setTimeout(() => resolveOnce(null), 5000); // Reduced from 10 seconds

		document.body.appendChild(video);
		video.load();
	});
};

// Batch thumbnail generation for multiple videos
export const generateThumbnailsBatch = async (
	videos: Array<{ src: string; file?: File }>,
): Promise<Map<string, string | null>> => {
	const results = new Map<string, string | null>();

	// Process in smaller batches to avoid overwhelming the browser
	const batchSize = 3; // Process max 3 thumbnails at once

	for (let i = 0; i < videos.length; i += batchSize) {
		const batch = videos.slice(i, i + batchSize);
		const batchPromises = batch.map(async (video) => {
			const thumbnail = await generateOptimizedThumbnail(video.src, video.file);
			return { src: video.src, thumbnail };
		});

		const batchResults = await Promise.all(batchPromises);
		batchResults.forEach(({ src, thumbnail }) => {
			results.set(src, thumbnail);
		});

		// Small delay between batches to prevent blocking
		if (i + batchSize < videos.length) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	return results;
};
