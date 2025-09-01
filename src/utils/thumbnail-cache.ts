interface ThumbnailCacheItem {
	thumbnail: string;
	timestamp: number;
	size: number;
}

interface ThumbnailCacheStats {
	totalSize: number;
	itemCount: number;
}

class ThumbnailCache {
	private cache = new Map<string, ThumbnailCacheItem>();
	private maxSize = 5 * 1024 * 1024; // 5MB max cache size
	private maxAge = 30 * 60 * 1000; // 30 minutes
	private cleanupInterval: NodeJS.Timeout | null = null;

	constructor() {
		// Cleanup expired items every 5 minutes
		this.cleanupInterval = setInterval(() => {
			this.cleanupExpired();
		}, 5 * 60 * 1000);
	}

	private calculateSize(thumbnail: string): number {
		// Rough estimation: base64 string length
		return thumbnail.length;
	}

	private cleanupExpired(): void {
		const now = Date.now();
		const expiredKeys: string[] = [];

		for (const [key, item] of this.cache.entries()) {
			if (now - item.timestamp > this.maxAge) {
				expiredKeys.push(key);
			}
		}

		expiredKeys.forEach(key => {
			this.cache.delete(key);
		});
	}

	private makeSpace(requiredSize: number): void {
		const stats = this.getStats();
		
		if (stats.totalSize + requiredSize <= this.maxSize) {
			return;
		}

		// Sort by timestamp, oldest first
		const sortedItems = Array.from(this.cache.entries()).sort(
			([, a], [, b]) => a.timestamp - b.timestamp
		);

		let freedSize = 0;
		for (const [key] of sortedItems) {
			if (stats.totalSize - freedSize + requiredSize <= this.maxSize) {
				break;
			}
			const item = this.cache.get(key);
			if (item) {
				freedSize += item.size;
				this.cache.delete(key);
			}
		}
	}

	set(key: string, thumbnail: string): void {
		const size = this.calculateSize(thumbnail);
		
		// Don't cache thumbnails larger than 1MB
		if (size > 1024 * 1024) {
			return;
		}

		this.makeSpace(size);

		this.cache.set(key, {
			thumbnail,
			timestamp: Date.now(),
			size
		});
	}

	get(key: string): string | null {
		const item = this.cache.get(key);
		
		if (!item) {
			return null;
		}

		// Check if expired
		if (Date.now() - item.timestamp > this.maxAge) {
			this.cache.delete(key);
			return null;
		}

		return item.thumbnail;
	}

	has(key: string): boolean {
		return this.get(key) !== null;
	}

	clear(): void {
		this.cache.clear();
	}

	getStats(): ThumbnailCacheStats {
		let totalSize = 0;
		for (const item of this.cache.values()) {
			totalSize += item.size;
		}
		
		return {
			totalSize,
			itemCount: this.cache.size
		};
	}

	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
		this.clear();
	}
}

export const thumbnailCache = new ThumbnailCache();

export const createThumbnailKey = (src: string, width: number = 160, height: number = 90): string => {
	return `thumb:${src}:${width}x${height}`;
};