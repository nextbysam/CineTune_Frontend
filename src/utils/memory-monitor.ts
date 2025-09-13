interface MemoryInfo {
	usedJSHeapSize: number;
	totalJSHeapSize: number;
	jsHeapSizeLimit: number;
	usagePercentage: number;
}

class MemoryMonitor {
	private warningThreshold = 0.8; // 80%
	private criticalThreshold = 0.9; // 90%
	private listeners: Array<(info: MemoryInfo) => void> = [];
	private intervalId: NodeJS.Timeout | null = null;

	constructor() {
		// Check memory every 30 seconds
		this.start(30000);
	}

	start(interval = 30000): void {
		if (this.intervalId) return;

		this.intervalId = setInterval(() => {
			this.checkMemory();
		}, interval);
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	private checkMemory(): void {
		if (!this.isMemoryAPIAvailable()) return;

		const memory = (performance as any).memory;
		const info: MemoryInfo = {
			usedJSHeapSize: memory.usedJSHeapSize,
			totalJSHeapSize: memory.totalJSHeapSize,
			jsHeapSizeLimit: memory.jsHeapSizeLimit,
			usagePercentage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
		};

		this.notifyListeners(info);

		if (info.usagePercentage > this.criticalThreshold) {
			console.warn(
				"🔴 Critical memory usage:",
				this.formatBytes(info.usedJSHeapSize),
			);
			this.triggerGarbageCollection();
		} else if (info.usagePercentage > this.warningThreshold) {
			console.warn(
				"🟡 High memory usage:",
				this.formatBytes(info.usedJSHeapSize),
			);
		}
	}

	private isMemoryAPIAvailable(): boolean {
		return (
			typeof performance !== "undefined" &&
			"memory" in performance &&
			typeof (performance as any).memory === "object"
		);
	}

	private triggerGarbageCollection(): void {
		// Force garbage collection if available (Chrome DevTools)
		if ("gc" in window) {
			(window as any).gc();
		}

		// Clear caches
		if (typeof window !== "undefined") {
			// Clear thumbnail cache
			import("./thumbnail-cache").then(({ thumbnailCache }) => {
				const stats = thumbnailCache.getStats();
				if (stats.totalSize > 2 * 1024 * 1024) {
					// If cache > 2MB
					thumbnailCache.clear();
					console.log("🧹 Cleared thumbnail cache to free memory");
				}
			});
		}
	}

	private formatBytes(bytes: number): string {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	}

	getCurrentMemoryInfo(): MemoryInfo | null {
		if (!this.isMemoryAPIAvailable()) return null;

		const memory = (performance as any).memory;
		return {
			usedJSHeapSize: memory.usedJSHeapSize,
			totalJSHeapSize: memory.totalJSHeapSize,
			jsHeapSizeLimit: memory.jsHeapSizeLimit,
			usagePercentage: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
		};
	}

	onMemoryChange(callback: (info: MemoryInfo) => void): () => void {
		this.listeners.push(callback);
		return () => {
			const index = this.listeners.indexOf(callback);
			if (index > -1) {
				this.listeners.splice(index, 1);
			}
		};
	}

	private notifyListeners(info: MemoryInfo): void {
		this.listeners.forEach((listener) => {
			try {
				listener(info);
			} catch (error) {
				console.error("Memory monitor listener error:", error);
			}
		});
	}

	setThresholds(warning: number, critical: number): void {
		this.warningThreshold = Math.max(0, Math.min(1, warning));
		this.criticalThreshold = Math.max(0, Math.min(1, critical));
	}
}

export const memoryMonitor = new MemoryMonitor();

import { useState, useEffect } from "react";

// Hook for React components
export function useMemoryMonitor() {
	const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);

	useEffect(() => {
		const unsubscribe = memoryMonitor.onMemoryChange(setMemoryInfo);

		// Get initial memory info
		const initial = memoryMonitor.getCurrentMemoryInfo();
		if (initial) setMemoryInfo(initial);

		return unsubscribe;
	}, []);

	return memoryInfo;
}
