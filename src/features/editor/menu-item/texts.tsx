import { Button, buttonVariants } from "@/components/ui/button";
import {
	ADD_AUDIO,
	ADD_IMAGE,
	ADD_TEXT,
	ADD_ITEMS,
	ENTER_EDIT_MODE,
	EDIT_OBJECT,
} from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import Draggable from "@/components/shared/draggable";
import { TEXT_ADD_PAYLOAD } from "../constants/payload";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import { generateId } from "@designcombo/timeline";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import useStore from "../store/use-store";
import { Pencil } from "lucide-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import useUploadStore from "../store/use-upload-store";
import { LOCAL_FONT_MAPPING } from "../utils/local-fonts";
import { loadFonts } from "../utils/fonts";
import {
	optimizeVideoForCaptions,
	shouldOptimizeVideo,
	formatFileSize,
} from "@/utils/video-optimization";
import {
	shouldExtractAudio,
	extractAudioForCaptions,
} from "@/utils/audio-extraction";

// Canonical mapping and normalization
const FONT_FAMILY_CANONICAL_MAP: Record<string, string> = {
	inter: "Inter",
	inter_28pt: "Inter",
	"inter_28pt-regular": "Inter",
	"inter_28pt-semibold": "Inter",
	"inter_28pt-thin": "Inter",

	instrumentserif: "InstrumentSerif-Regular",
	"instrumentserif-regular": "InstrumentSerif-Regular",
	"instrumentserif-italic": "InstrumentSerif-Italic",

	montserrat: "Montserrat",
	"montserrat-regular": "Montserrat",
	"montserrat-medium": "Montserrat",
	"montserrat-semibold": "Montserrat",
	"montserrat-bold": "Montserrat",
	"montserrat-extrabold": "Montserrat",
	"montserrat-black": "Montserrat",

	cinzel: "Cinzel",
	"cinzel-regular": "Cinzel",
	"cinzel-medium": "Cinzel",
	"cinzel-semibold": "Cinzel",
	"cinzel-bold": "Cinzel",
	"cinzel-extrabold": "Cinzel",
	"cinzel-black": "Cinzel",

	anton: "Anton",
	"anton-regular": "Anton",

	badscript: "BadScript-Regular",
	"badscript-regular": "BadScript-Regular",

	bebasneue: "BebasNeue",
	cormorantgaramond: "CormorantGaramond",
};

// Memoize font processing functions for better performance
const fontFamilyCache = new Map<string, string>();
const fontWeightCache = new Map<string, number>();

const normalizeFontFamilyName = (fontFamily?: string): string => {
	if (!fontFamily) return "Inter";

	if (fontFamilyCache.has(fontFamily)) {
		return fontFamilyCache.get(fontFamily)!;
	}

	const key = fontFamily.trim().toLowerCase();
	const stripped = key.replace(
		/-?(regular|italic|medium|semibold|semi-bold|bold|extrabold|extra-bold|black)$/i,
		"",
	);
	const result =
		FONT_FAMILY_CANONICAL_MAP[key] ||
		FONT_FAMILY_CANONICAL_MAP[stripped] ||
		fontFamily;

	fontFamilyCache.set(fontFamily, result);
	return result;
};

const getFontFamilyCanonical = (
	fontFamily: string,
	isVertical = false,
): string => {
	return normalizeFontFamilyName(fontFamily) || "Inter";
};

const getFontWeightNumeric = (weight?: string, isVertical = false): number => {
	const cacheKey = `${weight || ""}_${isVertical}`;

	if (fontWeightCache.has(cacheKey)) {
		return fontWeightCache.get(cacheKey)!;
	}

	const w = (weight || "").toLowerCase().trim();
	const table: Record<string, string> = {
		thin: "100",
		extralight: "200",
		"extra-light": "200",
		light: "300",
		regular: "400",
		normal: "400",
		book: "400",
		medium: "500",
		semibold: "600",
		"semi-bold": "600",
		demibold: "600",
		bold: "700",
		extrabold: "800",
		"extra-bold": "800",
		black: "900",
		heavy: "900",
	};
	let mapped =
		table[w] || w.match(/(100|200|300|400|500|600|700|800|900)/)?.[0] || "400";
	const result = parseInt(mapped, 10);

	fontWeightCache.set(cacheKey, result);
	return result;
};

// Resolve JSON font -> local font url + postScriptName
const resolveLocalFontFromJson = (
	fontFamily?: string,
	fontWeight?: string,
	isVertical = false,
): { url: string; postScriptName: string } | null => {
	if (!fontFamily) return null;
	const canonical = getFontFamilyCanonical(fontFamily, isVertical);
	const weight = getFontWeightNumeric(fontWeight, isVertical);
	// Family-specific mapping to variant keys present in LOCAL_FONT_MAPPING
	const pickVariant = (family: string, w: number): { key: string } => {
		switch (family) {
			case "Inter":
				if (w <= 300) return { key: "Inter_28pt-Thin" };
				if (w >= 600) return { key: "Inter_28pt-SemiBold" };
				return { key: "Inter_28pt-Regular" };
			case "Montserrat":
				if (w <= 100) return { key: "Montserrat-Thin" };
				if (w <= 200) return { key: "Montserrat-ExtraLight" };
				if (w <= 300) return { key: "Montserrat-Light" };
				if (w <= 400) return { key: "Montserrat-Regular" };
				if (w <= 500) return { key: "Montserrat-Medium" };
				if (w <= 600) return { key: "Montserrat-SemiBold" };
				if (w <= 700) return { key: "Montserrat-Bold" };
				if (w <= 800) return { key: "Montserrat-ExtraBold" };
				return { key: "Montserrat-Black" };
			case "Cinzel":
				if (w <= 400) return { key: "Cinzel-Regular" };
				if (w <= 500) return { key: "Cinzel-Medium" };
				if (w <= 600) return { key: "Cinzel-SemiBold" };
				if (w <= 700) return { key: "Cinzel-Bold" };
				if (w <= 800) return { key: "Cinzel-ExtraBold" };
				return { key: "Cinzel-Black" };
			case "InstrumentSerif-Regular":
				return { key: "InstrumentSerif-Regular" };
			case "InstrumentSerif-Italic":
				return { key: "InstrumentSerif-Italic" };
			case "Anton":
				return { key: "Anton-Regular" };
			case "BadScript-Regular":
				return { key: "BadScript-Regular" };
			default:
				// Default to Inter
				if (w <= 300) return { key: "Inter_28pt-Thin" };
				if (w >= 600) return { key: "Inter_28pt-SemiBold" };
				return { key: "Inter_28pt-Regular" };
		}
	};
	const { key } = pickVariant(canonical, weight);
	const direct = LOCAL_FONT_MAPPING[key];
	if (direct) return direct;
	// Fallback: construct url/postScriptName by convention
	if (key.startsWith("Inter_28pt-"))
		return { url: `/fonts/${key}.ttf`, postScriptName: key };
	if (key.startsWith("Montserrat-"))
		return { url: `/fonts/${key}.ttf`, postScriptName: key };
	if (key.startsWith("Cinzel-"))
		return { url: `/fonts/${key}.ttf`, postScriptName: key };
	if (key.startsWith("InstrumentSerif-"))
		return {
			url: `/fonts/InstrumentSerif-Regular.ttf`,
			postScriptName: "InstrumentSerif-Regular",
		};
	if (key.startsWith("Anton-"))
		return { url: `/fonts/Anton-Regular.ttf`, postScriptName: "Anton-Regular" };
	if (key.startsWith("BadScript-"))
		return {
			url: `/fonts/BadScript-Regular.ttf`,
			postScriptName: "BadScript-Regular",
		};
	return null;
};

/**
 * Checks if video has audio track for direct extraction
 */
async function checkVideoHasAudioDirect(
	video: HTMLVideoElement,
): Promise<boolean> {
	console.log(`🔍 [DIRECT-AUDIO] Running audio detection tests...`);

	try {
		// Method 1: Check audioTracks if available
		const anyVideo = video as any;
		if (anyVideo.audioTracks && anyVideo.audioTracks.length > 0) {
			console.log(
				`✅ [DIRECT-AUDIO] Audio detected via audioTracks API (${anyVideo.audioTracks.length} tracks)`,
			);
			return true;
		}

		// Method 2: Mozilla-specific check
		if (typeof anyVideo.mozHasAudio !== "undefined") {
			const hasAudio = anyVideo.mozHasAudio;
			console.log(
				`${hasAudio ? "✅" : "❌"} [DIRECT-AUDIO] Audio detection via mozHasAudio: ${hasAudio}`,
			);
			if (hasAudio) return true;
		}

		// Method 3: WebKit-specific check
		if (typeof anyVideo.webkitAudioDecodedByteCount !== "undefined") {
			// Give the video a moment to start decoding
			await new Promise((resolve) => setTimeout(resolve, 100));
			const hasAudio = anyVideo.webkitAudioDecodedByteCount > 0;
			console.log(
				`${hasAudio ? "✅" : "❌"} [DIRECT-AUDIO] Audio detection via webkitAudioDecodedByteCount: ${anyVideo.webkitAudioDecodedByteCount} bytes`,
			);
			if (hasAudio) return true;
		}

		// Method 4: Simple duration check - most videos with audio will have reasonable duration
		if (video.duration > 0) {
			console.log(
				`✅ [DIRECT-AUDIO] Video has valid duration (${video.duration.toFixed(2)}s), likely has audio track`,
			);
			return true;
		}

		console.warn(
			`⚠️ [DIRECT-AUDIO] No reliable audio detection method available, assuming audio exists`,
		);
		return true; // Be permissive - let MediaRecorder attempt extraction
	} catch (error) {
		console.warn(
			`⚠️ [DIRECT-AUDIO] Audio detection failed, assuming audio exists:`,
			error,
		);
		return true; // Be permissive to avoid false negatives
	}
}

/**
 * Server-side audio extraction using FFmpeg - most efficient approach
 * Leverages server infrastructure for optimal performance and no client-side processing
 */
async function extractAudioServerSide(
	videoUrl: string,
	videoId: string,
): Promise<{
	audioUrl: string;
	audioFile?: {
		name: string;
		size: number;
		type: string;
		duration?: number;
	};
	videoOrientation?: "vertical" | "horizontal";
	videoDimensions?: {
		width: number;
		height: number;
	};
	processingTime?: number;
}> {
	console.log(`🎵 [SERVER-AUDIO] Starting server-side audio extraction`);
	console.log(`🔗 [SERVER-AUDIO] Video URL: ${videoUrl}`);
	console.log(`⚡ [SERVER-AUDIO] Processing on server with FFmpeg`);

	try {
		const response = await fetch("/api/uploads/extract-audio", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				videoUrl,
				videoId,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(
				`Server-side extraction failed (${response.status}): ${errorData.error || "Unknown error"}`,
			);
		}

		const result = await response.json();

		if (!result.success) {
			// Check if this is a fallback scenario (server not ready)
			if (result.fallbackToClient) {
				console.log(
					`🔄 [SERVER-AUDIO] Server requests client-side fallback: ${result.error}`,
				);
				throw new Error(`FALLBACK_TO_CLIENT: ${result.error}`);
			}
			throw new Error(`Server-side extraction failed: ${result.error}`);
		}

		console.log(`✅ [SERVER-AUDIO] Server-side extraction successful`);
		console.log(`🎵 [SERVER-AUDIO] Audio URL: ${result.audioUrl}`);

		return {
			audioUrl: result.audioUrl,
			audioFile: result.audioFile,
			processingTime: result.processingTime,
		};
	} catch (error) {
		console.error(`❌ [SERVER-AUDIO] Server-side extraction failed:`, error);
		throw error;
	}
}

/**
 * LEGACY: Client-side audio extraction (fallback only)
 * Extracts audio directly from a video URL without downloading the full video
 * This is much less efficient than server-side processing
 */
async function extractAudioDirectlyFromUrl(
	videoUrl: string,
	videoId: string,
): Promise<File> {
	console.log(
		`🎵 [DIRECT-AUDIO] Starting efficient audio-only extraction from URL`,
	);
	console.log(`🔗 [DIRECT-AUDIO] Video URL: ${videoUrl}`);
	console.log(
		`🚀 [DIRECT-AUDIO] Using direct stream processing - no full video download`,
	);

	// Method 1: Direct audio extraction using video element streaming
	try {
		return await extractAudioFromVideoStream(videoUrl, videoId);
	} catch (streamError) {
		console.warn(`⚠️ [DIRECT-AUDIO] Stream method failed:`, streamError);

		// Method 2: Fallback to range-based partial download for audio extraction
		try {
			console.log(
				`🔄 [DIRECT-AUDIO] Fallback: Using range-based partial extraction`,
			);
			return await extractAudioWithRangeRequest(videoUrl, videoId);
		} catch (rangeError) {
			console.error(
				`❌ [DIRECT-AUDIO] All efficient methods failed:`,
				rangeError,
			);
			throw new Error(
				`Audio extraction failed: ${rangeError instanceof Error ? rangeError.message : String(rangeError)}`,
			);
		}
	}
}

// Method 1: Direct streaming audio extraction (most efficient - no video download)
async function extractAudioFromVideoStream(
	videoUrl: string,
	videoId: string,
): Promise<File> {
	console.log(`🎵 [STREAM-AUDIO] Starting direct stream audio extraction`);
	console.log(
		`⚡ [STREAM-AUDIO] No video download required - pure audio streaming`,
	);

	return new Promise((resolve, reject) => {
		let audioContext: AudioContext;
		let mediaRecorder: MediaRecorder;
		let timeouts: NodeJS.Timeout[] = [];

		const cleanup = () => {
			timeouts.forEach((timeout) => clearTimeout(timeout));
			try {
				if (audioContext && audioContext.state !== "closed") {
					audioContext.close();
				}
				if (mediaRecorder && mediaRecorder.state === "recording") {
					mediaRecorder.stop();
				}
			} catch (cleanupError) {
				console.warn(`⚠️ [STREAM-AUDIO] Cleanup warning:`, cleanupError);
			}
		};

		try {
			// Create video element that streams directly from URL
			const video = document.createElement("video");
			video.src = videoUrl;
			video.preload = "auto"; // Changed to auto for better streaming
			video.muted = false;
			video.volume = 1.0; // Ensure full volume for audio extraction

			console.log(
				`📺 [STREAM-AUDIO] Video element created, waiting for stream to start...`,
			);

			// Loading timeout
			const loadingTimeout = setTimeout(() => {
				cleanup();
				reject(new Error("Video stream loading timeout"));
			}, 12000);
			timeouts.push(loadingTimeout);

			video.onloadedmetadata = async () => {
				try {
					clearTimeout(loadingTimeout);
					console.log(
						`✅ [STREAM-AUDIO] Video stream metadata loaded - Duration: ${video.duration.toFixed(2)}s`,
					);

					// Create audio context for processing
					audioContext = new (
						window.AudioContext || (window as any).webkitAudioContext
					)();

					// Resume audio context if suspended (Chrome requirement)
					if (audioContext.state === "suspended") {
						await audioContext.resume();
						console.log(`🔊 [STREAM-AUDIO] AudioContext resumed`);
					}

					// Create audio processing chain
					const source = audioContext.createMediaElementSource(video);
					const destination = audioContext.createMediaStreamDestination();

					// Connect directly - no processing to maintain efficiency
					source.connect(destination);
					console.log(
						`🔗 [STREAM-AUDIO] Direct audio routing established (no video processing)`,
					);

					// Use most compatible audio format
					const getSupportedMimeType = (): string => {
						const types = [
							"audio/webm;codecs=opus", // Best compression and quality
							"audio/webm", // Widely supported
							"audio/mp4;codecs=mp4a.40.2", // Safari compatibility
							"audio/ogg;codecs=opus", // Firefox fallback
						];

						for (const type of types) {
							if (MediaRecorder.isTypeSupported(type)) {
								console.log(
									`✅ [STREAM-AUDIO] Using optimal MIME type: ${type}`,
								);
								return type;
							}
						}
						console.log(
							`✅ [STREAM-AUDIO] Using fallback MIME type: audio/webm`,
						);
						return "audio/webm";
					};

					const mimeType = getSupportedMimeType();

					try {
						mediaRecorder = new MediaRecorder(destination.stream, {
							mimeType,
							audioBitsPerSecond: 128000, // High quality 128kbps for captions
						});
						console.log(
							`✅ [STREAM-AUDIO] MediaRecorder ready with ${mimeType} @ 128kbps`,
						);
					} catch (recorderError) {
						// Fallback to basic MediaRecorder
						mediaRecorder = new MediaRecorder(destination.stream);
						console.log(
							`✅ [STREAM-AUDIO] MediaRecorder ready with default settings`,
						);
					}

					const chunks: BlobPart[] = [];
					let hasReceivedData = false;
					let recordingStartTime = Date.now();

					mediaRecorder.ondataavailable = (event) => {
						if (event.data.size > 0) {
							const chunkSizeKB = (event.data.size / 1024).toFixed(1);
							console.log(
								`📦 [STREAM-AUDIO] Audio chunk received: ${chunkSizeKB}KB`,
							);
							chunks.push(event.data);
							hasReceivedData = true;

							// Clear no-data timeout once we start receiving data
							timeouts.forEach((timeout) => clearTimeout(timeout));
							timeouts.length = 0;
						}
					};

					mediaRecorder.onstop = () => {
						const recordingDuration = Date.now() - recordingStartTime;
						console.log(
							`🛑 [STREAM-AUDIO] Recording complete: ${chunks.length} chunks in ${recordingDuration}ms`,
						);

						try {
							cleanup();

							if (chunks.length === 0 || !hasReceivedData) {
								reject(
									new Error(
										"No audio stream data captured - may be cross-origin restricted",
									),
								);
								return;
							}

							// Create final audio file
							const finalMimeType = mediaRecorder.mimeType || mimeType;
							const audioBlob = new Blob(chunks, { type: finalMimeType });

							// Determine file extension
							const extension = finalMimeType.includes("webm")
								? "webm"
								: finalMimeType.includes("mp4")
									? "mp4"
									: finalMimeType.includes("ogg")
										? "ogg"
										: "webm";

							const fileName = `audio_stream_${videoId}.${extension}`;
							const audioFile = new File([audioBlob], fileName, {
								type: finalMimeType,
							});

							const fileSizeMB = (audioFile.size / 1024 / 1024).toFixed(2);
							console.log(
								`✅ [STREAM-AUDIO] Audio file created: ${fileName} (${fileSizeMB}MB)`,
							);
							console.log(
								`⚡ [STREAM-AUDIO] Stream extraction completed efficiently - no video download needed`,
							);

							resolve(audioFile);
						} catch (error) {
							console.error(
								`❌ [STREAM-AUDIO] Error creating audio file:`,
								error,
							);
							reject(error);
						}
					};

					mediaRecorder.onerror = (error) => {
						console.error(`❌ [STREAM-AUDIO] MediaRecorder error:`, error);
						cleanup();
						reject(error);
					};

					// Start recording
					console.log(`🎬 [STREAM-AUDIO] Starting audio stream recording...`);
					mediaRecorder.start(1000); // 1-second chunks for responsive feedback

					// Set no-data timeout - if we don't receive data quickly, it's likely CORS
					const noDataTimeout = setTimeout(() => {
						if (!hasReceivedData) {
							console.error(
								`❌ [STREAM-AUDIO] No audio data received after 7 seconds - likely CORS restriction`,
							);
							cleanup();
							reject(
								new Error(
									"Audio stream blocked - cross-origin restrictions detected",
								),
							);
						}
					}, 7000);
					timeouts.push(noDataTimeout);

					// Start video playback to begin audio streaming
					video.currentTime = 0;
					video
						.play()
						.then(() => {
							console.log(
								`▶️ [STREAM-AUDIO] Video playback started - audio streaming active`,
							);
							console.log(
								`⏳ [STREAM-AUDIO] Extracting audio stream... (timeout in 7s if no data)`,
							);
						})
						.catch((playError) => {
							// Try autoplay workaround for Chrome policy
							console.warn(
								`⚠️ [STREAM-AUDIO] Direct autoplay blocked, trying workaround:`,
								playError,
							);
							video.muted = true;
							video
								.play()
								.then(() => {
									console.log(
										`▶️ [STREAM-AUDIO] Playing muted, unmuting for audio extraction...`,
									);
									setTimeout(() => {
										video.muted = false;
										console.log(
											`🔊 [STREAM-AUDIO] Audio unmuted - stream extraction active`,
										);
									}, 200);
								})
								.catch(() => {
									cleanup();
									reject(new Error("Unable to start video stream playback"));
								});
						});

					// Auto-stop when video ends
					video.onended = () => {
						console.log(
							`🏁 [STREAM-AUDIO] Video stream ended, finalizing audio extraction`,
						);
						if (mediaRecorder && mediaRecorder.state === "recording") {
							setTimeout(() => mediaRecorder.stop(), 200);
						}
					};

					// Safety timeout for very long videos (max 5 minutes of audio)
					const maxRecordingTimeout = setTimeout(() => {
						if (mediaRecorder && mediaRecorder.state === "recording") {
							console.log(
								`⏰ [STREAM-AUDIO] Max duration (5min) reached, stopping extraction`,
							);
							video.pause();
							mediaRecorder.stop();
						}
					}, 300000); // 5 minutes max
					timeouts.push(maxRecordingTimeout);
				} catch (error) {
					console.error(`❌ [STREAM-AUDIO] Stream processing error:`, error);
					cleanup();
					reject(error);
				}
			};

			video.onerror = (error) => {
				console.error(`❌ [STREAM-AUDIO] Video stream error:`, error);
				cleanup();
				reject(new Error(`Video stream failed: ${error}`));
			};
		} catch (error) {
			console.error(`❌ [STREAM-AUDIO] Setup error:`, error);
			cleanup();
			reject(error);
		}
	});
}

// Method 2: Range-based partial download (fallback for when streaming fails)
async function extractAudioWithRangeRequest(
	videoUrl: string,
	videoId: string,
): Promise<File> {
	console.log(`🎵 [RANGE-AUDIO] Starting range-based audio extraction`);
	console.log(
		`📊 [RANGE-AUDIO] Will download minimal video data for audio track only`,
	);

	try {
		// First, get the file size to determine range strategy
		const headResponse = await fetch(videoUrl, { method: "HEAD" });
		if (!headResponse.ok) {
			throw new Error(`HEAD request failed: ${headResponse.status}`);
		}

		const contentLength = headResponse.headers.get("content-length");
		const totalSize = contentLength ? parseInt(contentLength, 10) : 0;

		console.log(
			`📏 [RANGE-AUDIO] Video file size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
		);

		// Strategy: Download first 25% of video (usually contains all audio metadata + initial audio)
		const rangeEnd = Math.min(totalSize * 0.25, 50 * 1024 * 1024); // Max 50MB

		console.log(
			`📥 [RANGE-AUDIO] Downloading first ${(rangeEnd / 1024 / 1024).toFixed(2)}MB for audio extraction`,
		);

		const rangeResponse = await fetch(videoUrl, {
			headers: {
				Range: `bytes=0-${Math.floor(rangeEnd)}`,
			},
		});

		if (!rangeResponse.ok && rangeResponse.status !== 206) {
			throw new Error(`Range request failed: ${rangeResponse.status}`);
		}

		const partialBlob = await rangeResponse.blob();
		console.log(
			`✅ [RANGE-AUDIO] Partial video data downloaded: ${(partialBlob.size / 1024 / 1024).toFixed(2)}MB`,
		);

		// Create a temporary file from the partial data and extract audio
		const tempVideoFile = new File([partialBlob], `temp_${videoId}.mov`, {
			type: partialBlob.type || "video/mp4",
		});

		// Use the local extraction method on this partial file
		return await extractAudioFromPartialVideo(tempVideoFile, videoId);
	} catch (error) {
		console.error(`❌ [RANGE-AUDIO] Range-based extraction failed:`, error);
		throw error;
	}
}

// Helper: Extract audio from partial video file
async function extractAudioFromPartialVideo(
	partialVideoFile: File,
	videoId: string,
): Promise<File> {
	console.log(
		`🎵 [PARTIAL-AUDIO] Extracting audio from partial video: ${(partialVideoFile.size / 1024 / 1024).toFixed(2)}MB`,
	);

	return new Promise((resolve, reject) => {
		let audioContext: AudioContext;
		let mediaRecorder: MediaRecorder;
		let timeouts: NodeJS.Timeout[] = [];

		const cleanup = () => {
			timeouts.forEach((timeout) => clearTimeout(timeout));
			try {
				if (audioContext && audioContext.state !== "closed") {
					audioContext.close();
				}
				if (mediaRecorder && mediaRecorder.state === "recording") {
					mediaRecorder.stop();
				}
			} catch (e) {
				console.warn(`⚠️ [PARTIAL-AUDIO] Cleanup warning:`, e);
			}
		};

		try {
			const video = document.createElement("video");
			const videoUrl = URL.createObjectURL(partialVideoFile);
			video.src = videoUrl;
			video.preload = "metadata";
			video.muted = false;

			video.onloadedmetadata = async () => {
				try {
					console.log(
						`✅ [PARTIAL-AUDIO] Partial video loaded - Duration: ${video.duration.toFixed(2)}s`,
					);

					audioContext = new (
						window.AudioContext || (window as any).webkitAudioContext
					)();
					if (audioContext.state === "suspended") {
						await audioContext.resume();
					}

					const source = audioContext.createMediaElementSource(video);
					const destination = audioContext.createMediaStreamDestination();
					source.connect(destination);

					const mimeType = "audio/webm";
					mediaRecorder = new MediaRecorder(destination.stream);

					const chunks: BlobPart[] = [];
					let hasReceivedData = false;

					mediaRecorder.ondataavailable = (event) => {
						if (event.data.size > 0) {
							console.log(
								`📦 [PARTIAL-AUDIO] Audio chunk: ${(event.data.size / 1024).toFixed(1)}KB`,
							);
							chunks.push(event.data);
							hasReceivedData = true;
						}
					};

					mediaRecorder.onstop = () => {
						cleanup();
						URL.revokeObjectURL(videoUrl);

						if (chunks.length === 0) {
							reject(new Error("No audio extracted from partial video"));
							return;
						}

						const audioBlob = new Blob(chunks, { type: mimeType });
						const audioFile = new File(
							[audioBlob],
							`partial_audio_${videoId}.webm`,
							{ type: mimeType },
						);

						console.log(
							`✅ [PARTIAL-AUDIO] Audio extracted: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`,
						);
						resolve(audioFile);
					};

					mediaRecorder.start(1000);

					// Timeout for no data
					const noDataTimeout = setTimeout(() => {
						if (!hasReceivedData) {
							cleanup();
							reject(new Error("No audio data from partial video"));
						}
					}, 6000);
					timeouts.push(noDataTimeout);

					// Play the partial video
					video.play().catch(() => {
						cleanup();
						reject(new Error("Partial video playback failed"));
					});

					// Stop when video ends (will be quick for partial video)
					video.onended = () => {
						if (mediaRecorder && mediaRecorder.state === "recording") {
							setTimeout(() => mediaRecorder.stop(), 100);
						}
					};
				} catch (error) {
					cleanup();
					reject(error);
				}
			};

			video.onerror = () => {
				cleanup();
				URL.revokeObjectURL(videoUrl);
				reject(new Error("Failed to load partial video"));
			};
		} catch (error) {
			cleanup();
			reject(error);
		}
	});
}

export const Texts = () => {
	const isDraggingOverTimeline = useIsDraggingOverTimeline();
	const [isLoadingCaptions, setIsLoadingCaptions] = useState(false);
	const [captionRegion, setCaptionRegion] = useState<
		| "top_left"
		| "top_right"
		| "bottom_left"
		| "bottom_right"
		| "center"
		| "bottom_center"
	>("top_left");
	const [wordsAtATime, setWordsAtATime] = useState<number>(1);
	const [gridLayout, setGridLayout] = useState<"default" | "either_side">(
		"default",
	);
	const [defaultCaptionFont, setDefaultCaptionFont] = useState<string>("Inter");
	const [bulkCaptionFont, setBulkCaptionFont] = useState<string>("Inter");
	const [availableCaptions, setAvailableCaptions] = useState<any[]>([]);
	const [originalCaptions, setOriginalCaptions] = useState<any[]>([]); // Store original data for filtering
	const { trackItemsMap, activeIds, size } = useStore();
	const { uploads } = useUploadStore();
	const [editingWordIndex, setEditingWordIndex] = useState<number | null>(null);
	const [editingWordValue, setEditingWordValue] = useState<string>("");

	// Load available captions from localStorage on component mount
	useEffect(() => {
		loadAvailableCaptions();
	}, []);

	const loadAvailableCaptions = () => {
		try {
			const allKeys = Object.keys(localStorage);
			const captionsKeys = allKeys.filter((key) => key.startsWith("captions_"));

			if (captionsKeys.length > 0) {
				const mostRecentKey = captionsKeys[captionsKeys.length - 1];
				const captionsData = localStorage.getItem(mostRecentKey);

				if (captionsData) {
					const parsedData = JSON.parse(captionsData);
					if (parsedData.captions && Array.isArray(parsedData.captions)) {
						// Transform captions to ensure consistent format for transcript display
						const transformedCaptions = parsedData.captions.map(
							(caption: any, index: number) => ({
								id: caption.id || `caption-${index}`,
								word: caption.word || caption.text || "",
								text: caption.word || caption.text || "",
								start: caption.start || caption.startTime || 0,
								end:
									caption.end ||
									caption.endTime ||
									(caption.start || caption.startTime || 0) + 1,
								startTime: (caption.start || caption.startTime || 0) * 1000, // Convert to ms for display
								endTime:
									(caption.end ||
										caption.endTime ||
										(caption.start || caption.startTime || 0) + 1) * 1000, // Convert to ms for display
								vertical: caption.vertical || false,
								confidence: caption.confidence,
								originalIndex: index,
								style: caption.style || {},
								fontFamily: caption.fontFamily || caption.style?.fontFamily,
								...caption,
							}),
						);

						setAvailableCaptions(transformedCaptions);
						setOriginalCaptions(transformedCaptions);
					}
				}
			}
		} catch (error) {
			console.error("Error loading available captions:", error);
		}
	};

	// Function to save caption edits back to localStorage
	const saveCaptionEditToLocalStorage = (
		editedCaption: any,
		originalIndex: number,
	) => {
		try {
			const allKeys = Object.keys(localStorage);
			const captionsKeys = allKeys.filter((key) => key.startsWith("captions_"));

			if (captionsKeys.length > 0) {
				const mostRecentKey = captionsKeys[captionsKeys.length - 1];
				const captionsData = localStorage.getItem(mostRecentKey);

				if (captionsData) {
					const parsedData = JSON.parse(captionsData);

					if (parsedData.captions && Array.isArray(parsedData.captions)) {
						// Find and update the caption at the original index
						if (
							originalIndex >= 0 &&
							originalIndex < parsedData.captions.length
						) {
							const oldCaption = parsedData.captions[originalIndex];
							const oldWord = oldCaption.word || oldCaption.text || "";

							// Update both word and text fields to ensure consistency
							parsedData.captions[originalIndex] = {
								...parsedData.captions[originalIndex],
								word: editedCaption.word,
								text: editedCaption.text || editedCaption.word,
							};

							// Update timestamp to track when edit was made
							parsedData.updatedAt = new Date().toISOString();

							// Save back to localStorage
							localStorage.setItem(mostRecentKey, JSON.stringify(parsedData));

							return true;
						} else {
							console.error(
								"❌ Invalid original index for caption edit:",
								originalIndex,
							);
							return false;
						}
					}
				}
			}
		} catch (error) {
			console.error("❌ Error saving caption edit to localStorage:", error);
			return false;
		}
		return false;
	};

	const formatTime = (timeMs: number): string => {
		const seconds = Math.floor(timeMs / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
	};

	// Get video dimensions from timeline
	const getVideoDimensions = (): { width: number; height: number } => {
		// Use the current composition size from the store
		return {
			width: size.width,
			height: size.height,
		};
	};

	// Helper function to determine orientation based on current composition size
	const getCompositionOrientation = (): "vertical" | "horizontal" => {
		const compositionDimensions = getVideoDimensions();
		const orientation =
			compositionDimensions.height > compositionDimensions.width
				? "vertical"
				: "horizontal";
		console.log(
			`📐 [CAPTION-GEN] Composition orientation: ${orientation} (${compositionDimensions.width}x${compositionDimensions.height})`,
		);
		return orientation;
	};

	// Calculate positioning based on selected region
	const calculateRegionPosition = (
		region: string,
		baseLeft: number,
		baseTop: number,
		fontSize: number,
		videoDimensions?: { width: number; height: number },
	): { left: number; top: number } => {
		const dimensions = videoDimensions || getVideoDimensions();
		const videoWidth = dimensions.width;
		const videoHeight = dimensions.height;
		const margin = 24;
		const lineHeight = Math.round(fontSize * 1.2);

		switch (region) {
			case "top_left":
				return { left: margin + baseLeft, top: margin + baseTop };
			case "top_right":
				return { left: videoWidth - margin - baseLeft, top: margin + baseTop };
			case "bottom_left":
				return { left: margin + baseLeft, top: videoHeight - margin - baseTop };
			case "bottom_right":
				return {
					left: videoWidth - margin - baseLeft,
					top: videoHeight - margin - baseTop,
				};
			case "center":
				return {
					left: videoWidth / 2 + baseLeft,
					top: videoHeight / 2 + baseTop,
				};
			case "bottom_center":
				return {
					left: videoWidth / 2 + baseLeft,
					top: videoHeight - margin - baseTop,
				};
			case "left_center":
				return { left: margin + baseLeft, top: videoHeight / 2 + baseTop };
			case "right_center":
				return {
					left: videoWidth - margin - baseLeft,
					top: videoHeight / 2 + baseTop,
				};
			default:
				return { left: margin + baseLeft, top: margin + baseTop };
		}
	};

	// Calculate optimal font size for vertical captions to prevent word wrapping
	const calculateOptimalFontSize = (
		text: string,
		maxWidth: number = 1080,
		maxFontSize: number = 85,
	): number => {
		// Remove any extra whitespace and get the actual word
		const cleanText = text.trim();
		if (!cleanText) return maxFontSize;

		// Estimated character width ratio (varies by font, but good approximation)
		const CHAR_WIDTH_RATIO = 0.6; // Characters are approximately 60% of font size width
		const SAFETY_MARGIN = 0.9; // Use 90% of available width for safety

		// Calculate estimated text width at max font size
		const estimatedWidthAtMaxFont =
			cleanText.length * (maxFontSize * CHAR_WIDTH_RATIO);
		const availableWidth = maxWidth * SAFETY_MARGIN;

		// If text fits at max font size, use it
		if (estimatedWidthAtMaxFont <= availableWidth) {
			return maxFontSize;
		}

		// Calculate optimal font size to fit the text
		const optimalFontSize = Math.floor(
			availableWidth / cleanText.length / CHAR_WIDTH_RATIO,
		);
		const finalFontSize = Math.max(24, Math.min(optimalFontSize, maxFontSize)); // Min 24px, max original size

		return finalFontSize;
	};

	// Unified text creation function to ensure consistency across all text addition methods
	const createUniformTextPayload = (
		options: {
			text?: string;
			startTimeMs?: number;
			endTimeMs?: number;
			isVertical?: boolean;
			originalIndex?: number;
			fontFamily?: string;
			fontUrl?: string;
			applyRegionPositioning?: boolean;
			isFromCaption?: boolean; // New flag to identify caption text
			fontSize?: number; // Dynamic font size for Either Side layout
		} = {},
	) => {
		// Get video dimensions for dynamic positioning
		const videoDimensions = getVideoDimensions();
		console.log(`🔧 CREATE UNIFORM TEXT PAYLOAD DEBUG:`, {
			videoDimensions,
			isVertical: options.isVertical,
			text: options.text?.substring(0, 30),
			isFromCaption: options.isFromCaption,
			applyRegionPositioning: options.applyRegionPositioning,
		});
		const {
			text = "Heading and some body",
			startTimeMs = 0,
			endTimeMs = 5000,
			isVertical = false,
			originalIndex,
			fontFamily,
			fontUrl,
			applyRegionPositioning = false,
			isFromCaption = false,
			fontSize, // Dynamic font size for Either Side layout
		} = options;

		// For captions, don't use demo text if text is empty or undefined
		const finalText =
			isFromCaption &&
			(!text || text.trim() === "" || text === "Heading and some body")
				? "Caption text"
				: text;

		// Calculate position and font size if needed
		let positionOverrides = {};
		let fontSizeOverride = TEXT_ADD_PAYLOAD.details.fontSize; // Default from payload

		if (isVertical) {
			// VERTICAL CAPTIONS: Prevent word wrapping with dynamic font sizing

			// Calculate optimal font size to prevent word breaking - use video width for dynamic sizing
			const optimalFontSize = calculateOptimalFontSize(
				finalText,
				videoDimensions.width,
				85,
			);
			fontSizeOverride = optimalFontSize;

			// DYNAMIC vertical captions positioning - adapt to actual video dimensions
			const centerX = videoDimensions.width / 2;
			const centerY = videoDimensions.height / 2;

			console.log(`📍 VERTICAL CAPTION POSITIONING:`, {
				videoDimensions,
				centerX,
				centerY,
				text: finalText?.substring(0, 20),
				optimalFontSize,
			});

			positionOverrides = {
				left: centerX, // Dynamic center X based on actual video width
				top: centerY, // Dynamic center Y based on actual video height
				textAlign: "center",
				transform: "translate(-50%, -50%)",
				isVertical: true,
				fontSize: optimalFontSize, // Dynamic font size
				whiteSpace: "nowrap", // CRITICAL: Prevent word wrapping
				wordWrap: "normal", // Override default break-word
				overflow: "visible", // Allow text to be visible even if slightly larger
				maxWidth: "none", // Remove any width constraints that could cause wrapping
			};
		} else {
			// For non-vertical captions, use dynamic font size if provided (for Either Side layout), otherwise default to 40px
			fontSizeOverride = fontSize || 40;

			if (applyRegionPositioning && originalIndex !== undefined) {
				// Apply regional positioning for non-vertical captions with uniform grid offset
				// This will be overridden by specific layout positions if calculated
				const basePosition = calculateRegionPosition(
					captionRegion,
					0,
					0,
					fontSize || 40,
					videoDimensions, // Pass dynamic video dimensions
				);
				console.log(`📍 NON-VERTICAL CAPTION POSITIONING:`, {
					captionRegion,
					videoDimensions,
					basePosition,
					text: finalText?.substring(0, 20),
				});
				positionOverrides = {
					left: basePosition.left,
					top: basePosition.top,
					textAlign: "left",
				};
			} else if (applyRegionPositioning) {
				// Apply regional positioning for regular text when requested
				const basePosition = calculateRegionPosition(
					captionRegion,
					0,
					0,
					fontSize || 40,
					videoDimensions, // Pass dynamic video dimensions
				);
				console.log(`📍 REGULAR TEXT POSITIONING:`, {
					captionRegion,
					videoDimensions,
					basePosition,
					text: finalText?.substring(0, 20),
				});
				positionOverrides = {
					left: basePosition.left,
					top: basePosition.top,
					textAlign: captionRegion.includes("center") ? "center" : "left",
				};
			}
		}

		// Font resolution
		let fontOverrides = {};
		if (fontFamily && fontUrl) {
			fontOverrides = { fontFamily, fontUrl };
		}

		const payload = {
			...TEXT_ADD_PAYLOAD,
			id: generateId(),
			display: {
				from: Math.max(0, startTimeMs),
				to: Math.max(startTimeMs + 100, endTimeMs),
			},
			details: {
				...TEXT_ADD_PAYLOAD.details,
				text: finalText,
				fontSize: fontSizeOverride, // Apply dynamic font size
				// Ensure proper dimensions for visibility
				width: TEXT_ADD_PAYLOAD.details.width || 600,
				height: isVertical
					? fontSizeOverride + 20
					: Math.max(fontSizeOverride + 20, 60), // Dynamic height based on font size
				...(originalIndex !== undefined && { originalIndex }),
				...fontOverrides,
			},
		};

		// Apply position overrides safely
		if (payload.details && typeof payload.details === "object") {
			Object.assign(payload.details as any, positionOverrides);
		}

		return payload;
	};

	const handleAddText = () => {
		// Get current state before dispatch
		const stateBefore = useStore.getState();
		const trackItemsCountBefore = Object.keys(stateBefore.trackItemsMap).length;

		// Create uniform text payload with optional region positioning
		const textPayload = createUniformTextPayload({
			text: "Heading and some body",
			applyRegionPositioning: true, // Apply user-selected region for consistency
		});

		dispatch(ADD_TEXT, {
			payload: textPayload,
			options: {},
		});

		// Automatically trigger edit mode for the newly added text
		setTimeout(() => {
			dispatch(ENTER_EDIT_MODE, {
				payload: {
					id: textPayload.id,
				},
			});
		}, 100); // Small delay to ensure the text is rendered first

		// Check state after dispatch
		const stateAfter = useStore.getState();
		const trackItemsCountAfter = Object.keys(stateAfter.trackItemsMap).length;

		if (trackItemsCountAfter > trackItemsCountBefore) {
		} else {
			console.error("❌ Regular add text failed - count didn't increase");
		}
	};

	const handleLoadCaptionsFromJSON = async () => {
		try {
			// Step 1: Find captions in localStorage

			const allKeys = Object.keys(localStorage);
			const captionsKeys = allKeys.filter((key) => key.startsWith("captions_"));

			if (captionsKeys.length === 0) {
				console.error("❌ ==========================================");
				console.error("❌ NO CAPTIONS FOUND IN LOCALSTORAGE");
				console.error("❌ ==========================================");
				console.error("❌ Available keys:", allKeys);
				toast.error("No captions found. Please generate captions first.");
				return;
			}

			// Step 2: Select the most recent captions

			const mostRecentKey = captionsKeys[captionsKeys.length - 1];

			// Step 3: Load and parse captions data

			const captionsData = localStorage.getItem(mostRecentKey);

			if (!captionsData) {
				console.error("❌ ==========================================");
				console.error("❌ NO CAPTIONS DATA FOUND FOR KEY:", mostRecentKey);
				console.error("❌ ==========================================");
				toast.error("No captions data found. Please generate captions first.");
				return;
			}

			const parsedData = JSON.parse(captionsData);

			if (!parsedData.captions || !Array.isArray(parsedData.captions)) {
				console.error("❌ ==========================================");
				console.error("❌ INVALID CAPTIONS DATA STRUCTURE");
				console.error("❌ ==========================================");
				console.error("❌ Expected structure: { captions: [...] }");
				console.error("❌ Actual structure:", parsedData);
				console.error("❌ Captions property type:", typeof parsedData.captions);
				console.error("❌ Captions property value:", parsedData.captions);
				toast.error("Invalid captions data structure.");
				return;
			}

			// Step 4: Validate captions structure

			const totalCaptions = parsedData.captions.length;

			// Prepare horizontal layout: top-left anchor, max 3 words per line, max 3 lines, repeat in cycles
			const layoutPositions: Record<number, { left: number; top: number }> = {};
			// Store dynamic font sizes for Either Side layout groups (groupIndex -> fontSize)
			const eitherSideFontSizes = new Map<number, number>();
			// Also map original caption index -> cycle, and compute cycle end times from last word in cycle
			const indexToCycle: Record<number, number> = {};
			const cycleToOriginalIndices: Record<number, number[]> = {};
			const cycleEndMsByCycle: Record<number, number> = {};
			try {
				const maxWordsPerLine = 3;
				const maxLines = 3;
				const slotsPerCycle = maxWordsPerLine * maxLines; // 9

				// UNIFORM SPACING CONSTANTS - Optimized to prevent overlap with 85px font size
				const UNIFORM_HORIZONTAL_SPACING = 200; // Fixed horizontal spacing - prevents overlap for long words
				const UNIFORM_VERTICAL_SPACING = 115; // Fixed vertical spacing - prevents vertical overlap

				// Build a sequence of non-vertical captions ordered by start time and group by wordsAtATime
				const nonVerticalIndices = parsedData.captions
					.map((c: any, idx: number) => ({
						idx,
						start: c.start ?? c.startTime ?? 0,
						vertical: !!c.vertical,
					}))
					.filter((it: any) => !it.vertical)
					.sort((a: any, b: any) => a.start - b.start)
					.map((it: any) => it.idx);

				// Group indices by wordsAtATime for positioning
				const groupedIndicesForPositioning: number[][] = [];
				for (let i = 0; i < nonVerticalIndices.length; i += wordsAtATime) {
					const group = nonVerticalIndices.slice(i, i + wordsAtATime);
					groupedIndicesForPositioning.push(group);
				}

				// Use the outer font sizes map for Either Side layout

				groupedIndicesForPositioning.forEach(
					(groupIndices: number[], groupSeqIndex: number) => {
						// Use the first caption in the group for positioning reference
						const firstCaptionIdx = groupIndices[0];
						const caption = parsedData.captions[firstCaptionIdx];
						const allTexts = groupIndices
							.map(
								(idx) =>
									parsedData.captions[idx].word ||
									parsedData.captions[idx].text ||
									"",
							)
							.join(" ");

						let position;
						let cycle;
						let offsetX, baseTop;

						if (gridLayout === "either_side") {
							// EITHER SIDE LAYOUT: Different behavior for horizontal vs vertical compositions
							// Get actual video dimensions
							const videoDimensions = getVideoDimensions();
							const isHorizontalVideo =
								videoDimensions.width > videoDimensions.height;

							console.log(`🔄 EITHER SIDE LAYOUT:`, {
								videoDimensions,
								isHorizontalVideo,
								groupSeqIndex,
								allTexts: allTexts.substring(0, 20),
							});

							const edgePadding = 24; // Padding from screen edges
							const centerClearWidth = Math.round(videoDimensions.width * 0.4); // 40% of screen width kept clear in center
							const sideWidth =
								(videoDimensions.width - centerClearWidth - edgePadding * 2) /
								2; // Available width per side

							// Define side boundaries
							const leftSideStart = edgePadding;
							const leftSideEnd = edgePadding + sideWidth;
							const rightSideStart =
								videoDimensions.width - edgePadding - sideWidth;
							const rightSideEnd = videoDimensions.width - edgePadding;

							const FONT_SIZE = 40;
							const currentWordText = allTexts.trim() || "";
							const WORD_MARGIN = 25; // Exactly 25px margin between word end and next word start

							// Calculate word width (simplified)
							const CHAR_WIDTH_RATIO = 0.6;
							const currentWordWidth =
								currentWordText.length * (FONT_SIZE * CHAR_WIDTH_RATIO);

							// Store font size for this group
							eitherSideFontSizes.set(groupSeqIndex, FONT_SIZE);

							let finalLeft, finalTop;
							let isLeftSide, sidePosition, sectionIndex;

							if (isHorizontalVideo) {
								// HORIZONTAL VIDEO: 2 lines on each side (4 words per section: 2 left top, 2 left bottom, then 2 right top, 2 right bottom)
								const wordsPerSection = 8; // 8 words total per section (4 left: 2 top + 2 bottom, 4 right: 2 top + 2 bottom)
								sectionIndex = Math.floor(groupSeqIndex / wordsPerSection);
								const positionInSection = groupSeqIndex % wordsPerSection; // 0-7 within current section

								// Distribution: 0-3 go left (0-1 top line, 2-3 bottom line), 4-7 go right (4-5 top line, 6-7 bottom line)
								isLeftSide = positionInSection < 4; // First 4 go left, next 4 go right

								if (isLeftSide) {
									const leftLineIndex = Math.floor(positionInSection / 2); // 0 = top line, 1 = bottom line
									sidePosition = positionInSection % 2; // 0 or 1 within the line

									// Calculate vertical position: top line or bottom line
									const lineSpacing = 60; // 60px between lines
									const centerY = videoDimensions.height / 2;
									finalTop =
										centerY - lineSpacing / 2 + leftLineIndex * lineSpacing; // Top line: center-30, Bottom line: center+30
								} else {
									const rightPosInSide = positionInSection - 4; // 0-3 for right side
									const rightLineIndex = Math.floor(rightPosInSide / 2); // 0 = top line, 1 = bottom line
									sidePosition = rightPosInSide % 2; // 0 or 1 within the line

									// Calculate vertical position: top line or bottom line
									const lineSpacing = 60; // 60px between lines
									const centerY = videoDimensions.height / 2;
									finalTop =
										centerY - lineSpacing / 2 + rightLineIndex * lineSpacing; // Top line: center-30, Bottom line: center+30
								}

								console.log(`📍 HORIZONTAL EITHER SIDE:`, {
									groupSeqIndex,
									sectionIndex,
									positionInSection,
									isLeftSide,
									sidePosition,
									finalTop,
									text: allTexts.substring(0, 15),
								});
							} else {
								// VERTICAL VIDEO: Original single-line behavior (4 words per section: 2 left, 2 right)
								isLeftSide = groupSeqIndex % 4 < 2; // First 2 of every 4 go left
								sidePosition = groupSeqIndex % 2; // Position within side (0 or 1)
								sectionIndex = Math.floor(groupSeqIndex / 4); // Which section (0, 1, 2, ...)

								// ABSOLUTE VERTICAL CENTER - no line wrapping, always center
								finalTop = Math.round(videoDimensions.height / 2);
							}

							if (isLeftSide) {
								// LEFT SIDE: Position words with exact 25px margin between them
								if (sidePosition === 0) {
									// First word on left side - start from edge
									finalLeft = leftSideStart;
								} else {
									// Second word on left side - need to find where first word ended
									// Look for the previous word (groupSeqIndex - 1) which should be on left side too
									const prevGroupIndex = groupSeqIndex - 1;
									if (prevGroupIndex >= 0) {
										const prevGroup =
											groupedIndicesForPositioning[prevGroupIndex];
										if (prevGroup) {
											const prevWordText = prevGroup
												.map(
													(idx) =>
														parsedData.captions[idx].word ||
														parsedData.captions[idx].text ||
														"",
												)
												.join(" ")
												.trim();
											const prevWordWidth =
												prevWordText.length * (FONT_SIZE * CHAR_WIDTH_RATIO);
											const prevWordEnd = leftSideStart + prevWordWidth;
											finalLeft = prevWordEnd + WORD_MARGIN; // Exact 25px after previous word ends
										} else {
											finalLeft = leftSideStart + WORD_MARGIN; // Fallback
										}
									} else {
										finalLeft = leftSideStart + WORD_MARGIN; // Fallback
									}
								}

								// Ensure word stays within left side boundaries
								finalLeft = Math.max(
									leftSideStart,
									Math.min(finalLeft, leftSideEnd - currentWordWidth),
								);
							} else {
								// RIGHT SIDE: Position words with exact 25px margin between them
								if (sidePosition === 0) {
									// First word on right side - start from right side edge
									finalLeft = rightSideStart;
								} else {
									// Second word on right side - need to find where first word ended
									// Look for the previous word (groupSeqIndex - 1) which should be on right side too
									const prevGroupIndex = groupSeqIndex - 1;
									if (prevGroupIndex >= 0) {
										const prevGroup =
											groupedIndicesForPositioning[prevGroupIndex];
										if (prevGroup) {
											const prevWordText = prevGroup
												.map(
													(idx) =>
														parsedData.captions[idx].word ||
														parsedData.captions[idx].text ||
														"",
												)
												.join(" ")
												.trim();
											const prevWordWidth =
												prevWordText.length * (FONT_SIZE * CHAR_WIDTH_RATIO);
											const prevWordEnd = rightSideStart + prevWordWidth;
											finalLeft = prevWordEnd + WORD_MARGIN; // Exact 25px after previous word ends
										} else {
											finalLeft = rightSideStart + WORD_MARGIN; // Fallback
										}
									} else {
										finalLeft = rightSideStart + WORD_MARGIN; // Fallback
									}
								}

								// Ensure word stays within right side boundaries
								finalLeft = Math.max(
									rightSideStart,
									Math.min(finalLeft, rightSideEnd - currentWordWidth),
								);
							}

							position = { left: finalLeft, top: finalTop };
							cycle = sectionIndex; // Each section is a cycle (4 words per cycle for vertical, 8 words per cycle for horizontal)
						} else {
							// DEFAULT GRID LAYOUT (3x3 grid pattern)
							cycle = Math.floor(groupSeqIndex / slotsPerCycle);
							const slot = groupSeqIndex % slotsPerCycle; // 0..8
							const line = Math.floor(slot / maxWordsPerLine); // 0..2
							const col = slot % maxWordsPerLine; // 0..2

							// UNIFORM GRID POSITIONING
							offsetX = col * UNIFORM_HORIZONTAL_SPACING;
							baseTop = line * UNIFORM_VERTICAL_SPACING;

							position = calculateRegionPosition(
								captionRegion,
								offsetX,
								baseTop,
								40,
							);
						}

						// Assign the position to the first caption in group (which will be used during processing)
						layoutPositions[firstCaptionIdx] = position;

						// Map all indices in the group to the same cycle
						for (const originalIdx of groupIndices) {
							indexToCycle[originalIdx] = cycle;
							if (!cycleToOriginalIndices[cycle])
								cycleToOriginalIndices[cycle] = [];
							cycleToOriginalIndices[cycle].push(originalIdx);
						}
					},
				);

				// Compute end time (ms) for each cycle from the last word in that cycle
				// For either side layout, use simplified timing (same as default)
				for (const [cycleStr, indices] of Object.entries(
					cycleToOriginalIndices,
				)) {
					if (!indices || indices.length === 0) continue;
					const lastIdx = indices[indices.length - 1];
					const c = parsedData.captions[lastIdx];
					const endSeconds =
						c.end ?? c.endTime ?? (c.start ?? c.startTime ?? 0) + 3;
					cycleEndMsByCycle[Number(cycleStr)] = Math.round(endSeconds * 1000);
				}

				// Layout positioning complete
			} catch (layoutErr) {
				console.warn(
					"⚠️ Failed to prepare horizontal layout positions:",
					layoutErr,
				);
			}

			// Sample first few captions for validation
			const sampleCaptions = parsedData.captions.slice(0, 3);
			sampleCaptions.forEach((caption: any, index: number) => {});

			// Step 5: Process each caption and add to timeline

			let processedCount = 0;
			let skippedCount = 0;
			let errorCount = 0;

			// Get initial state
			const initialState = useStore.getState();

			// Build all caption payloads first
			const captionPayloads: any[] = [];
			const usedFonts = new Set<string>();

			// Track which original indices we've processed to ensure nothing is missed
			const processedIndices = new Set<number>();
			const skippedIndices = new Set<number>();
			const errorIndices = new Set<number>();

			// First, separate vertical and non-vertical captions
			const verticalCaptions: any[] = [];
			const nonVerticalCaptions: any[] = [];

			for (let index = 0; index < parsedData.captions.length; index++) {
				const caption = parsedData.captions[index];
				const hasVerticalProperty =
					caption.vertical === true || caption.vertical === "true";

				// If wordsAtATime > 1, treat all captions as non-vertical for grouping purposes
				// Otherwise, respect the original vertical property
				const treatAsVertical = hasVerticalProperty && wordsAtATime === 1;

				if (treatAsVertical) {
					verticalCaptions.push({ ...caption, originalIndex: index });
				} else {
					// For grouping purposes, treat as non-vertical but preserve original vertical property
					nonVerticalCaptions.push({
						...caption,
						originalIndex: index,
						originalVertical: hasVerticalProperty,
					});
				}
			}

			// Process vertical captions individually with strict timing adherence
			if (verticalCaptions.length > 0) {
				for (let i = 0; i < verticalCaptions.length; i++) {
					const caption = verticalCaptions[i];

					try {
						// Extract timing information with strict adherence to start/end attributes
						const startSeconds = caption.start || caption.startTime || 0;
						const endSeconds =
							caption.end || caption.endTime || startSeconds + 1; // Default 1 second duration if no end time

						// Convert to milliseconds for timeline
						const startTimeMs = Math.round(startSeconds * 1000);
						let endTimeMs = Math.round(endSeconds * 1000);

						// Extract text content with fallbacks
						const captionText =
							caption.word || caption.text || "Vertical Caption";

						// Validate timing - ensure minimum duration but respect original timing
						if (startTimeMs >= endTimeMs) {
							console.warn(
								`⚠️   Invalid timing for vertical caption ${i + 1}, using minimum duration while preserving start time`,
							);
							endTimeMs = startTimeMs + 500; // Minimum 500ms duration for vertical captions
							console.warn(
								`⚠️   Fixed timing: ${startTimeMs}ms → ${endTimeMs}ms`,
							);
						}

						// Always mark as processed (strict timing adherence)
						processedIndices.add(caption.originalIndex);

						// Get font details from caption
						const requestedFontFamily =
							caption.fontFamily || caption.style?.fontFamily;
						const fontDetails = resolveLocalFontFromJson(
							requestedFontFamily,
							caption.style?.fontWeight || caption.weight,
							true,
						);

						if (requestedFontFamily) {
							if (fontDetails) {
								usedFonts.add(fontDetails.postScriptName);
							} else {
							}
						}

						// Resolve font directly from JSON font fields (supports snake_case and camelCase)
						const jsonFontNameRaw =
							caption.font_name ||
							caption.fontFamily ||
							caption.font_family ||
							caption.style?.font_family ||
							caption.style?.fontFamily;
						let fontFamilyToUse: string | undefined;
						let fontUrlToUse: string | undefined;
						if (jsonFontNameRaw && typeof jsonFontNameRaw === "string") {
							const cleanFontBase = jsonFontNameRaw
								.trim()
								.replace(/\.ttf$/i, "");
							fontFamilyToUse = cleanFontBase;
							fontUrlToUse = `/fonts/${cleanFontBase}.ttf`;
						} else {
							// Use selected default caption font when no font is specified in caption data
							const defaultFontMapping = LOCAL_FONT_MAPPING[defaultCaptionFont];
							if (defaultFontMapping) {
								fontFamilyToUse = defaultFontMapping.postScriptName;
								fontUrlToUse = defaultFontMapping.url;
							}
						}

						// Create uniform text payload with STRICT timing from localStorage
						const textPayload = createUniformTextPayload({
							text: captionText,
							startTimeMs: Math.max(0, startTimeMs),
							endTimeMs: Math.max(startTimeMs + 100, endTimeMs),
							isVertical: true,
							originalIndex: caption.originalIndex,
							fontFamily: fontFamilyToUse,
							fontUrl: fontUrlToUse,
							isFromCaption: true,
						});

						// Add vertical-specific properties (word wrap prevention is now handled in createUniformTextPayload)
						if (
							textPayload.details &&
							typeof textPayload.details === "object"
						) {
							// Preserve ominous property from caption
							(textPayload.details as any).ominous =
								caption.ominous === true || caption.ominous === "true";
						}

						captionPayloads.push(textPayload);
						processedCount++;
					} catch (captionError) {
						console.error(
							`❌   Error processing vertical caption ${i + 1}:`,
							captionError,
						);
						errorIndices.add(caption.originalIndex);
						errorCount++;

						// Even if there's an error, try to create a basic payload with strict timing
						try {
							const fallbackText =
								caption.word || caption.text || `Vertical Caption ${i + 1}`;
							const fallbackStartMs = Math.round(
								(caption.start || caption.startTime || 0) * 1000,
							);
							const fallbackEndMs = Math.round(
								(caption.end ||
									caption.endTime ||
									(caption.start || caption.startTime || 0) + 1) * 1000,
							);

							const fallbackPayload = createUniformTextPayload({
								text: fallbackText,
								startTimeMs: Math.max(0, fallbackStartMs),
								endTimeMs: Math.max(fallbackStartMs + 500, fallbackEndMs),
								isVertical: true,
								originalIndex: caption.originalIndex,
								isFromCaption: true,
							});

							// Note: word wrap prevention is now handled in createUniformTextPayload for vertical captions

							captionPayloads.push(fallbackPayload);
							processedIndices.add(caption.originalIndex);
							console.warn(
								`⚠️   Created fallback payload for vertical caption ${i + 1} with strict timing`,
							);
						} catch (fallbackError) {
							console.error(
								`❌   Failed to create fallback payload for vertical caption ${i + 1}:`,
								fallbackError,
							);
						}
					}
				}
			}

			// Process non-vertical captions with words-at-a-time grouping

			if (nonVerticalCaptions.length === 0) {
			} else {
				// Group non-vertical captions by wordsAtATime setting
				const captionGroups: any[][] = [];
				for (let i = 0; i < nonVerticalCaptions.length; i += wordsAtATime) {
					const group = nonVerticalCaptions.slice(i, i + wordsAtATime);
					captionGroups.push(group);
				}

				for (
					let groupIndex = 0;
					groupIndex < captionGroups.length;
					groupIndex++
				) {
					const captionGroup = captionGroups[groupIndex];

					try {
						// Extract timing information from first and last caption in group
						const firstCaption = captionGroup[0];
						const lastCaption = captionGroup[captionGroup.length - 1];

						const startSeconds =
							firstCaption.start || firstCaption.startTime || 0;
						const endSeconds =
							lastCaption.end ||
							lastCaption.endTime ||
							(lastCaption.start || lastCaption.startTime || 0) + 3;

						// Convert to milliseconds for timeline
						const startTimeMs = Math.round(startSeconds * 1000);
						let endTimeMs = Math.round(endSeconds * 1000);

						// If any caption in group is part of a cycle, extend end to cycle's end
						for (const caption of captionGroup) {
							const cycle = indexToCycle[caption.originalIndex];
							if (
								cycle !== undefined &&
								cycleEndMsByCycle[cycle] !== undefined
							) {
								endTimeMs = Math.max(endTimeMs, cycleEndMsByCycle[cycle]);
							}
						}

						// Combine text content from all captions in the group
						const captionTexts = captionGroup.map(
							(caption) => caption.word || caption.text || "Caption text",
						);
						const captionText = captionTexts.join(" ");

						// Validate timing - but be more lenient and fix issues instead of skipping
						if (startTimeMs >= endTimeMs) {
							console.warn(
								`⚠️   Invalid timing for caption group ${groupIndex + 1}, fixing with minimum duration`,
							);
							endTimeMs = startTimeMs + 1000; // Add 1 second minimum duration
							console.warn(
								`⚠️   Fixed timing: ${startTimeMs}ms → ${endTimeMs}ms`,
							);
						}

						// Mark all captions in the group as processed
						for (const caption of captionGroup) {
							processedIndices.add(caption.originalIndex);
						}

						// Get font details from the first caption in the group
						const firstCaptionForFont = captionGroup[0];
						const requestedFontFamily =
							firstCaptionForFont.fontFamily ||
							firstCaptionForFont.style?.fontFamily;
						const fontDetails = resolveLocalFontFromJson(
							requestedFontFamily,
							firstCaptionForFont.style?.fontWeight ||
								firstCaptionForFont.weight,
							false,
						);

						if (requestedFontFamily) {
							if (fontDetails) {
								usedFonts.add(fontDetails.postScriptName);
							} else {
							}
						}

						// Resolve font directly from JSON font fields (supports snake_case and camelCase)
						// Fonts are located in /public/fonts; we append .ttf
						const jsonFontNameRaw =
							firstCaptionForFont.font_name ||
							firstCaptionForFont.fontFamily ||
							firstCaptionForFont.font_family ||
							firstCaptionForFont.style?.font_family ||
							firstCaptionForFont.style?.fontFamily;
						let fontFamilyToUse: string | undefined;
						let fontUrlToUse: string | undefined;
						if (jsonFontNameRaw && typeof jsonFontNameRaw === "string") {
							// ensure .ttf once
							const cleanFontBase = jsonFontNameRaw
								.trim()
								.replace(/\.ttf$/i, "");
							fontFamilyToUse = cleanFontBase;
							fontUrlToUse = `/fonts/${cleanFontBase}.ttf`;
						} else {
							// Use selected default caption font when no font is specified in caption data
							const defaultFontMapping = LOCAL_FONT_MAPPING[defaultCaptionFont];
							if (defaultFontMapping) {
								fontFamilyToUse = defaultFontMapping.postScriptName;
								fontUrlToUse = defaultFontMapping.url;
							}
						}

						// Check if any caption in the group was originally vertical
						const anyOriginallyVertical = captionGroup.some(
							(caption) => caption.originalVertical === true,
						);

						// Get dynamic font size for Either Side layout if available
						const dynamicFontSize = eitherSideFontSizes.get(groupIndex);

						// Create uniform text payload with proper timing and font from JSON if resolvable
						const textPayload = createUniformTextPayload({
							text: captionText,
							startTimeMs: Math.max(0, startTimeMs),
							endTimeMs: Math.max(startTimeMs + 100, endTimeMs),
							isVertical: anyOriginallyVertical, // Use vertical styling if any caption was originally vertical
							originalIndex: firstCaption.originalIndex, // Use first caption's index for reference
							fontFamily: fontFamilyToUse,
							fontUrl: fontUrlToUse,
							applyRegionPositioning: !anyOriginallyVertical, // Only apply region positioning if not originally vertical
							isFromCaption: true,
							fontSize: dynamicFontSize, // Apply dynamic font size for Either Side layout
						});

						// Apply layout position only if not originally vertical (vertical captions use center positioning)
						if (
							!anyOriginallyVertical &&
							layoutPositions[firstCaption.originalIndex] &&
							textPayload.details &&
							typeof textPayload.details === "object"
						) {
							(textPayload.details as any).left =
								layoutPositions[firstCaption.originalIndex].left;
							(textPayload.details as any).top =
								layoutPositions[firstCaption.originalIndex].top;
							(textPayload.details as any).textAlign = "left";
						} else if (anyOriginallyVertical) {
						}

						captionPayloads.push(textPayload);
						processedCount++;
					} catch (captionError) {
						console.error(
							`❌   Error processing caption group ${groupIndex + 1}:`,
							captionError,
						);
						// Mark all captions in the group as having errors
						for (const caption of captionGroup) {
							errorIndices.add(caption.originalIndex);
						}
						errorCount++;

						// Even if there's an error, try to create a basic payload to avoid losing the captions
						try {
							// Create fallback with combined text from the group
							const fallbackTexts = captionGroup.map(
								(caption) =>
									caption.word ||
									caption.text ||
									`Caption ${caption.originalIndex + 1}`,
							);
							const fallbackText = fallbackTexts.join(" ");
							const anyOriginallyVerticalFallback = captionGroup.some(
								(caption) => caption.originalVertical === true,
							);
							const firstCaptionFallback = captionGroup[0];
							// Get dynamic font size for fallback as well
							const fallbackDynamicFontSize =
								eitherSideFontSizes.get(groupIndex);

							const fallbackPayload = createUniformTextPayload({
								text: fallbackText,
								startTimeMs: Math.max(
									0,
									firstCaptionFallback.originalIndex * 1000,
								),
								endTimeMs: Math.max(
									1000,
									firstCaptionFallback.originalIndex * 1000 + 2000,
								),
								isVertical: anyOriginallyVerticalFallback,
								originalIndex: firstCaptionFallback.originalIndex,
								applyRegionPositioning: !anyOriginallyVerticalFallback,
								isFromCaption: true,
								fontSize: fallbackDynamicFontSize, // Apply dynamic font size for fallback payloads too
							});

							captionPayloads.push(fallbackPayload);
							// Mark all captions in the group as processed even in fallback
							for (const caption of captionGroup) {
								processedIndices.add(caption.originalIndex);
							}
							console.warn(
								`⚠️   Created fallback payload for caption group ${groupIndex + 1} with ${captionGroup.length} words`,
							);
						} catch (fallbackError) {
							console.error(
								`❌   Failed to create fallback payload for caption group ${groupIndex + 1}:`,
								fallbackError,
							);
						}
					}
				}
			} // End of else block for non-vertical captions processing

			// Comprehensive validation: Check if we've processed every caption

			// Find any missing indices
			const allIndices = new Set(
				Array.from({ length: parsedData.captions.length }, (_, i) => i),
			);
			const missingIndices = Array.from(allIndices).filter(
				(i) => !processedIndices.has(i),
			);

			if (missingIndices.length > 0) {
				console.error(
					`❌   MISSING INDICES DETECTED: [${missingIndices.join(", ")}]`,
				);
				console.error(
					`❌   These captions were not processed and will be lost!`,
				);

				// Try to process missing captions with basic fallback
				for (const missingIndex of missingIndices) {
					const missingCaption = parsedData.captions[missingIndex];
					console.warn(
						`⚠️   Creating emergency fallback for missing caption ${missingIndex + 1}`,
					);

					try {
						const emergencyText =
							missingCaption?.word ||
							missingCaption?.text ||
							`Missing caption ${missingIndex + 1}`;
						const emergencyPayload = createUniformTextPayload({
							text: emergencyText,
							startTimeMs: Math.max(0, missingIndex * 1000),
							endTimeMs: Math.max(1000, missingIndex * 1000 + 2000),
							isVertical: false,
							originalIndex: missingIndex,
							applyRegionPositioning: true,
							isFromCaption: true,
						});

						captionPayloads.push(emergencyPayload);
						processedIndices.add(missingIndex);
						console.warn(
							`⚠️   Emergency payload created for index ${missingIndex}`,
						);
					} catch (emergencyError) {
						console.error(
							`❌   Failed to create emergency payload for index ${missingIndex}:`,
							emergencyError,
						);
					}
				}
			} else {
			}

			// Add all captions using PRODUCTION-OPTIMIZED sequential dispatch system
			if (captionPayloads.length > 0) {
				// CRITICAL: Temporarily disable auto-composition during bulk caption loading
				// This prevents DESIGN_RESIZE from interfering with ADD_TEXT dispatches
				const stateBefore = useStore.getState();
				const trackItemsCountBefore = Object.keys(
					stateBefore.trackItemsMap,
				).length;
				const originalAutoComposition = stateBefore.autoComposition;

				try {
					if (originalAutoComposition) {
						console.log(
							`⚠️ Temporarily disabling auto-composition to prevent interference...`,
						);
						useStore.getState().setAutoComposition(false);
					}

					console.log(
						`🎬 PRODUCTION: Adding ${captionPayloads.length} captions to timeline...`,
					);
					console.log(`🔍 Environment check:`, {
						NODE_ENV:
							typeof process !== "undefined" ? process.env.NODE_ENV : "unknown",
						isProduction:
							typeof window !== "undefined"
								? window.location.hostname !== "localhost"
								: false,
						initialItemCount: trackItemsCountBefore,
						autoCompositionDisabled: originalAutoComposition
							? "YES (was enabled)"
							: "NO (was disabled)",
					});

					// Debug first payload structure
					if (captionPayloads.length > 0) {
						console.log(`🔍 Sample payload:`, {
							id: captionPayloads[0].id,
							type: captionPayloads[0].type,
							hasDetails: !!captionPayloads[0].details,
							text: captionPayloads[0].details?.text,
							fontSize: captionPayloads[0].details?.fontSize,
							timing: captionPayloads[0].display,
						});
					}

					// PRODUCTION STRATEGY: Sequential dispatch with state verification after each addition
					let successCount = 0;
					let failureCount = 0;
					const failedPayloads: any[] = [];
					const addedIds: string[] = [];

					console.log(
						`🚀 SEQUENTIAL DISPATCH: Processing ${captionPayloads.length} captions one by one...`,
					);

					for (let i = 0; i < captionPayloads.length; i++) {
						const payload = captionPayloads[i];
						const captionNum = i + 1;

						try {
							console.log(
								`📤 [${captionNum}/${captionPayloads.length}] Dispatching: "${payload.details?.text}" (ID: ${payload.id})`,
							);

							// Validate payload before dispatch
							if (
								!payload.id ||
								!payload.type ||
								!payload.details ||
								!payload.details.text
							) {
								throw new Error(
									`Invalid payload structure: missing ${!payload.id ? "id" : !payload.type ? "type" : "details/text"}`,
								);
							}

							// Get state snapshot before this dispatch
							const preDispatchState = useStore.getState();
							const preDispatchCount = Object.keys(
								preDispatchState.trackItemsMap,
							).length;

							// Dispatch the caption
							dispatch(ADD_TEXT, {
								payload: payload,
								options: {},
							});

							// Wait for state to update (production needs longer delays)
							await new Promise((resolve) => setTimeout(resolve, 250));

							// Verify this specific caption was added
							const postDispatchState = useStore.getState();
							const postDispatchCount = Object.keys(
								postDispatchState.trackItemsMap,
							).length;
							const wasAdded = postDispatchState.trackItemsMap[payload.id];

							if (wasAdded) {
								successCount++;
								addedIds.push(payload.id);
								console.log(
									`✅ [${captionNum}/${captionPayloads.length}] SUCCESS: "${payload.details?.text}" added (count: ${preDispatchCount} → ${postDispatchCount})`,
								);
							} else {
								failureCount++;
								failedPayloads.push({
									payload,
									attempt: 1,
									reason: "Not found in state after dispatch",
								});
								console.warn(
									`⚠️ [${captionNum}/${captionPayloads.length}] FAILED: "${payload.details?.text}" not in state (count: ${preDispatchCount} → ${postDispatchCount})`,
								);
							}
						} catch (error) {
							failureCount++;
							const errorMessage =
								error instanceof Error ? error.message : String(error);
							failedPayloads.push({
								payload,
								attempt: 1,
								reason: errorMessage,
							});
							console.error(
								`❌ [${captionNum}/${captionPayloads.length}] ERROR dispatching "${payload.details?.text}":`,
								error,
							);
						}
					}

					console.log(
						`📊 FIRST PASS RESULTS: ${successCount} success, ${failureCount} failed`,
					);

					// RETRY FAILED CAPTIONS (up to 2 more attempts)
					if (failedPayloads.length > 0) {
						console.log(
							`🔄 RETRY: Attempting to recover ${failedPayloads.length} failed captions...`,
						);

						for (let attempt = 2; attempt <= 3; attempt++) {
							const stillFailed: any[] = [];

							for (const failedItem of failedPayloads) {
								if (failedItem.attempt >= attempt) continue; // Skip if already attempted

								const { payload } = failedItem;

								try {
									console.log(
										`🔄 [Attempt ${attempt}] Retrying: "${payload.details?.text}" (ID: ${payload.id})`,
									);

									// Check if somehow it exists now
									const currentState = useStore.getState();
									if (currentState.trackItemsMap[payload.id]) {
										console.log(
											`✅ [Attempt ${attempt}] RECOVERED: "${payload.details?.text}" found in state`,
										);
										successCount++;
										addedIds.push(payload.id);
										continue;
									}

									// Re-dispatch with longer delay
									dispatch(ADD_TEXT, {
										payload: payload,
										options: {},
									});

									// Longer wait for retries
									await new Promise((resolve) => setTimeout(resolve, 500));

									// Check if it worked
									const newState = useStore.getState();
									if (newState.trackItemsMap[payload.id]) {
										console.log(
											`✅ [Attempt ${attempt}] RETRY SUCCESS: "${payload.details?.text}"`,
										);
										successCount++;
										addedIds.push(payload.id);
									} else {
										failedItem.attempt = attempt;
										stillFailed.push(failedItem);
										console.warn(
											`⚠️ [Attempt ${attempt}] RETRY FAILED: "${payload.details?.text}"`,
										);
									}
								} catch (retryError) {
									failedItem.attempt = attempt;
									failedItem.reason =
										retryError instanceof Error
											? retryError.message
											: String(retryError);
									stillFailed.push(failedItem);
									console.error(
										`❌ [Attempt ${attempt}] RETRY ERROR: "${payload.details?.text}":`,
										retryError,
									);
								}
							}

							// Update failed list
							failedPayloads.length = 0;
							failedPayloads.push(...stillFailed);

							if (failedPayloads.length === 0) {
								console.log(
									`🎉 All captions recovered after ${attempt} attempts!`,
								);
								break;
							}
						}
					}

					// FINAL STATE VERIFICATION
					const finalState = useStore.getState();
					const finalCount = Object.keys(finalState.trackItemsMap).length;
					const actuallyAdded = finalCount - trackItemsCountBefore;

					console.log(`📊 FINAL RESULTS:`);
					console.log(`   Initial items: ${trackItemsCountBefore}`);
					console.log(`   Final items: ${finalCount}`);
					console.log(`   Actually added: ${actuallyAdded}`);
					console.log(`   Expected: ${captionPayloads.length}`);
					console.log(
						`   Success rate: ${successCount}/${captionPayloads.length} (${Math.round((successCount / captionPayloads.length) * 100)}%)`,
					);

					if (failedPayloads.length > 0) {
						console.error(
							`❌ PERMANENTLY FAILED (${failedPayloads.length}):`,
							failedPayloads.map((f) => ({
								text: f.payload.details?.text,
								id: f.payload.id,
								reason: f.reason,
							})),
						);
					}

					// Update error tracking
					errorCount = failedPayloads.length;

					// Re-enable auto-composition if it was originally enabled
					if (originalAutoComposition) {
						console.log(
							`✅ Re-enabling auto-composition after caption loading...`,
						);
						useStore.getState().setAutoComposition(true);
					}
				} catch (dispatchError) {
					console.error(`❌ CRITICAL ERROR in dispatch system:`, dispatchError);
					errorCount = captionPayloads.length;

					// Re-enable auto-composition even on error
					if (originalAutoComposition) {
						console.log(`⚠️ Re-enabling auto-composition after error...`);
						useStore.getState().setAutoComposition(true);
					}
				} finally {
					// Always re-enable auto-composition in finally block to ensure cleanup
					if (originalAutoComposition && !useStore.getState().autoComposition) {
						console.log(
							`🔄 [CLEANUP] Re-enabling auto-composition in finally block...`,
						);
						useStore.getState().setAutoComposition(true);
					}
				}
			} else {
				console.error(
					`❌ No caption payloads were created! All captions were lost.`,
				);
				errorCount = totalCaptions;
			}

			// Step 6: Summary and completion

			if (processedIndices.size > 0) {
				toast.success(
					`Successfully processed ${processedIndices.size}/${totalCaptions} captions from JSON!`,
				);
				// Refresh transcript view to show newly loaded captions
				loadAvailableCaptions();
			} else {
				console.error("❌ ==========================================");
				console.error("❌ NO CAPTIONS WERE PROCESSED SUCCESSFULLY");
				console.error("❌ ==========================================");
				toast.error(
					"No captions were processed successfully. Check console for details.",
				);
			}
		} catch (error) {
			console.error("❌ ==========================================");
			console.error("❌ ERROR LOADING CAPTIONS FROM JSON");
			console.error("❌ ==========================================");
			console.error(
				"❌ Error type:",
				error instanceof Error ? error.constructor.name : typeof error,
			);
			console.error(
				"❌ Error message:",
				error instanceof Error ? error.message : String(error),
			);
			console.error(
				"❌ Error stack:",
				error instanceof Error ? error.stack : "No stack trace available",
			);
			console.error("❌ Full error object:", error);
			toast.error(
				`Failed to load captions: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	};

	const handleAddCreativeCaptions = async () => {
		console.log(
			`🎬 [CAPTION-GEN] ═══ Starting Creative Captions Generation ═══`,
		);
		const startTime = Date.now();

		setIsLoadingCaptions(true);
		toast.info("Processing video for creative captions...");

		let data: any = null; // Declare data variable to be accessible in catch block

		try {
			console.log(
				`🔍 [CAPTION-GEN] Step 1: Validating B-roll videos and context`,
			);
			// Step 1: Check if all B-roll videos have context
			const videosB = uploads.filter(
				(upload) =>
					(upload.type?.startsWith("video/") || upload.type === "video") &&
					upload.aRollType === "b-roll",
			);

			console.log(
				`📼 [CAPTION-GEN] Found ${videosB.length} B-roll videos in uploads`,
			);

			if (videosB.length > 0) {
				const videosWithoutContext = videosB.filter(
					(video) =>
						!video.metadata?.context || video.metadata.context.trim() === "",
				);

				console.log(
					`📝 [CAPTION-GEN] B-roll context check: ${videosB.length - videosWithoutContext.length}/${videosB.length} have context`,
				);

				if (videosWithoutContext.length > 0) {
					console.error(
						`❌ [CAPTION-GEN] ${videosWithoutContext.length} B-roll video(s) missing context:`,
						videosWithoutContext.map((v) => v.fileName || v.id),
					);
					setIsLoadingCaptions(false);
					toast.error(
						`Please add context for all B-roll videos before generating captions. ${videosWithoutContext.length} B-roll video(s) missing context.`,
					);
					return;
				}

				console.log(`✅ [CAPTION-GEN] All B-roll videos have context`);
			} else {
				console.log(
					`ℹ️ [CAPTION-GEN] No B-roll videos found, proceeding without B-roll context`,
				);
			}

			console.log(
				`🎬 [CAPTION-GEN] Step 2: Finding videos and audio in timeline`,
			);

			// Step 2: Get video files from the timeline
			const videoItems = Object.values(trackItemsMap).filter(
				(item) => item.type === "video",
			);

			// Step 2b: Get audio files from the timeline
			const audioItems = Object.values(trackItemsMap).filter(
				(item) => item.type === "audio",
			);

			console.log(
				`🎥 [CAPTION-GEN] Found ${videoItems.length} video item(s) in timeline`,
			);
			videoItems.forEach((video, index) => {
				console.log(
					`   📹 Video ${index + 1}: ${video.details?.src || "No source"} (ID: ${video.id})`,
				);
			});

			console.log(
				`🎵 [CAPTION-GEN] Found ${audioItems.length} audio item(s) in timeline`,
			);
			audioItems.forEach((audio, index) => {
				console.log(
					`   🎵 Audio ${index + 1}: ${audio.details?.src || "No source"} (ID: ${audio.id})`,
				);
			});

			if (videoItems.length === 0) {
				console.error("❌ [CAPTION-GEN] No videos found in timeline");
				toast.error("No video found in timeline. Please add a video first.");
				return;
			}

			console.log(
				`🎯 [CAPTION-GEN] Step 3: Selecting target video for caption generation`,
			);

			// Try to use the selected video first, then fall back to the first video
			let videoItem = null;

			console.log(
				`🔍 [CAPTION-GEN] Checking for selected videos (${activeIds.length} active IDs)`,
			);

			// Check if any video is currently selected
			if (activeIds.length > 0) {
				for (const activeId of activeIds) {
					const activeItem = trackItemsMap[activeId];
					if (activeItem && activeItem.type === "video") {
						console.log(
							`✅ [CAPTION-GEN] Using selected video: ${activeItem.details?.src} (ID: ${activeId})`,
						);
						videoItem = activeItem;
						break;
					}
				}
			}

			// If no video is selected or selected item is not a video, use the first video
			if (!videoItem) {
				videoItem = videoItems[0];
				console.log(
					`🔄 [CAPTION-GEN] No video selected, using first video: ${videoItem.details?.src} (ID: ${videoItem.id})`,
				);
			}

			const videoUrl = videoItem.details.src;
			console.log(`📹 [CAPTION-GEN] Target video URL: ${videoUrl}`);

			// Step 3: Prepare B-roll context data for API
			const brollContextData = videosB.map((video) => ({
				videoId: video.id,
				fileName: video.fileName || video.file?.name || "Unknown",
				context: video.metadata?.context || "",
			}));

			console.log(
				`📥 [CAPTION-GEN] Step 4: Downloading and preparing video for processing`,
			);

			let finalVideoUrl = videoUrl;

			// Check if video has a local URL already available
			const existingLocalUrl = videoItem.metadata?.localUrl;
			console.log(
				`🔍 [CAPTION-GEN] Checking for existing local URL: ${existingLocalUrl}`,
			);

			if (
				existingLocalUrl &&
				existingLocalUrl.startsWith("https://cinetune-llh0.onrender.com")
			) {
				finalVideoUrl = existingLocalUrl;
				console.log(
					`✅ [CAPTION-GEN] Using existing local URL: ${finalVideoUrl}`,
				);
			} else if (
				videoUrl?.startsWith("blob:") ||
				videoUrl?.startsWith("data:")
			) {
				const error = new Error(
					"Blob/data URLs require special handling. Please use uploaded video files with HTTP URLs.",
				);
				console.error(`❌ [CAPTION-GEN] ${error.message}`);
				throw error;
			} else {
				console.log(
					`🔄 [CAPTION-GEN] Using original video URL: ${finalVideoUrl}`,
				);
			}

			// Extract audio using server-side processing for maximum efficiency
			console.log(
				`🎵 [CAPTION-GEN] Step 5: Extracting audio using server-side processing`,
			);
			console.log(
				`⚡ [CAPTION-GEN] Using FFmpeg on server - no client-side processing needed`,
			);
			toast.info(
				"Extracting audio on server for ultra-fast caption processing...",
			);

			const audioExtractionStartTime = Date.now();
			let processedFile;
			let optimizationResult;

			try {
				// Extract audio on server - much more efficient than client-side
				const audioExtractionResult = await extractAudioServerSide(
					finalVideoUrl,
					videoItem.id,
				);
				const audioExtractionDuration = Date.now() - audioExtractionStartTime;

				// Create a File object from the server response for API compatibility
				// Note: We create with the server-reported size for display purposes, actual file will be downloaded later
				const serverFileSize = audioExtractionResult.audioFile?.size || 0;
				processedFile = new File(
					[new ArrayBuffer(0)],
					audioExtractionResult.audioFile?.name || `audio_${videoItem.id}.mp3`,
					{
						type: audioExtractionResult.audioFile?.type || "audio/mp3",
					},
				);

				// Store the actual server file size for proper reporting
				(processedFile as any).serverFileSize = serverFileSize;
				// Set the server URL and orientation as properties for upload
				(processedFile as any).serverUrl = audioExtractionResult.audioUrl;
				(processedFile as any).serverVideoOrientation =
					audioExtractionResult.videoOrientation || "vertical";
				(processedFile as any).serverVideoDimensions =
					audioExtractionResult.videoDimensions;

				optimizationResult = {
					optimizedFile: processedFile,
					originalSize: 0, // Server handles this, no need to download full video
					optimizedSize: audioExtractionResult.audioFile?.size || 0,
					compressionRatio: 0, // Server-side optimization
					wasOptimized: true,
					processingTime: audioExtractionDuration,
					optimizationMethod: "server_side_audio_extraction" as const,
					isAudioOnly: true,
				};

				console.log(
					`✅ [CAPTION-GEN] Server-side audio extraction completed in ${audioExtractionDuration}ms`,
				);
				console.log(
					`📊 [CAPTION-GEN] Extracted audio: ${audioExtractionResult.audioFile?.name} (${audioExtractionResult.audioFile?.size ? (audioExtractionResult.audioFile.size / 1024 / 1024).toFixed(2) + "MB" : "Unknown size"})`,
				);
				console.log(
					`⚡ [CAPTION-GEN] Server-side processing: FFmpeg optimized`,
				);
			} catch (audioExtractionError) {
				console.error(
					`❌ [CAPTION-GEN] Server-side audio extraction failed:`,
					audioExtractionError,
				);

				// Check if the error is specifically due to no audio track
				if (
					audioExtractionError instanceof Error &&
					audioExtractionError.message.includes("no audio track")
				) {
					console.warn(
						`⚠️ [CAPTION-GEN] Video has no audio track - proceeding with original video file for potential visual analysis`,
					);
					toast.warning(
						"Video has no audio track. Proceeding with video file - some caption generation methods may still work.",
					);

					// Flag to skip audio extraction and use original video
					var skipAudioExtraction = true;
				} else {
					var skipAudioExtraction = false;

					// Check if server requested client-side fallback
					const errorMessage =
						audioExtractionError instanceof Error
							? audioExtractionError.message
							: String(audioExtractionError);
					if (
						errorMessage.includes("FALLBACK_TO_CLIENT") ||
						errorMessage.includes("FFmpeg not installed") ||
						errorMessage.includes("temporarily unavailable") ||
						errorMessage.includes("503")
					) {
						console.log(
							`🔄 [CAPTION-GEN] Server-side extraction unavailable, using client-side fallback...`,
						);
						toast.info(
							"Server processing unavailable - using client-side audio extraction (may take longer)...",
						);
					} else {
						console.log(
							`🔄 [CAPTION-GEN] Server-side extraction failed, falling back to video download...`,
						);
					}
				}

				// Fallback: Download full video and extract audio (or use as-is if no audio)
				const fetchStartTime = Date.now();
				const localVideoResponse = await fetch(finalVideoUrl);
				const fetchDuration = Date.now() - fetchStartTime;

				if (!localVideoResponse.ok) {
					const localVideoError = await localVideoResponse.text();
					console.error(
						`❌ [CAPTION-GEN] Failed to fetch video (${localVideoResponse.status}):`,
						localVideoError,
					);
					throw new Error(
						`Failed to fetch video: ${localVideoResponse.status} - ${localVideoError}`,
					);
				}

				console.log(
					`📦 [CAPTION-GEN] Video download completed in ${fetchDuration}ms, reading blob...`,
				);
				const videoBlob = await localVideoResponse.blob();
				console.log(
					`✅ [CAPTION-GEN] Video blob created: ${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`,
				);

				const filename =
					videoUrl.split("/").pop() || `video_${videoItem.id}.mp4`;
				const originalVideoFile = new File([videoBlob], filename, {
					type: videoBlob.type || "video/mp4",
				});

				// Extract audio from downloaded video (skip if no audio track detected)
				if (skipAudioExtraction) {
					// No audio track detected - use original video file directly
					const totalDuration = Date.now() - audioExtractionStartTime;
					processedFile = originalVideoFile;
					optimizationResult = {
						optimizedFile: originalVideoFile,
						originalSize: originalVideoFile.size,
						optimizedSize: originalVideoFile.size,
						compressionRatio: 0,
						wasOptimized: false,
						processingTime: totalDuration,
						optimizationMethod: "no_audio_fallback" as const,
						isAudioOnly: false,
					};
					console.log(
						`🔄 [CAPTION-GEN] Using original video file due to no audio track`,
					);
				} else {
					// Try to extract audio from downloaded video
					try {
						const audioResult = await extractAudioForCaptions(
							originalVideoFile,
							{
								audioBitrate: 128,
								audioFormat: "mp3",
								maxDurationSeconds: 300,
								sampleRate: 44100,
							},
						);

						const totalDuration = Date.now() - audioExtractionStartTime;
						processedFile = audioResult.audioFile;
						optimizationResult = {
							optimizedFile: audioResult.audioFile,
							originalSize: audioResult.originalVideoSize,
							optimizedSize: audioResult.audioSize,
							compressionRatio: audioResult.compressionRatio,
							wasOptimized: audioResult.wasExtracted,
							processingTime: totalDuration,
							optimizationMethod: "fallback_audio_extraction" as const,
							isAudioOnly: audioResult.wasExtracted,
						};

						console.log(`✅ [CAPTION-GEN] Fallback audio extraction completed`);
						console.log(
							`📊 [CAPTION-GEN] Final file: ${processedFile.name} (${(processedFile.size / 1024 / 1024).toFixed(2)}MB)`,
						);
					} catch (fallbackError) {
						console.error(
							`❌ [CAPTION-GEN] Fallback audio extraction also failed:`,
							fallbackError,
						);
						// Ultimate fallback: use original video file
						const totalDuration = Date.now() - audioExtractionStartTime;
						processedFile = originalVideoFile;
						optimizationResult = {
							optimizedFile: originalVideoFile,
							originalSize: originalVideoFile.size,
							optimizedSize: originalVideoFile.size,
							compressionRatio: 0,
							wasOptimized: false,
							processingTime: totalDuration,
							optimizationMethod: "none" as const,
							isAudioOnly: false,
						};
						console.log(
							`🔄 [CAPTION-GEN] Using original video file as ultimate fallback`,
						);
					}
				}
			}

			if (optimizationResult.wasOptimized) {
				const savedMB = (
					(optimizationResult.originalSize - optimizationResult.optimizedSize) /
					(1024 * 1024)
				).toFixed(2);
				console.log(
					`🎉 [CAPTION-GEN] Optimization successful: saved ${savedMB}MB (${optimizationResult.compressionRatio}% reduction)`,
				);

				if (optimizationResult.isAudioOnly) {
					toast.success(
						`Audio extracted! Reduced from ${(optimizationResult.originalSize / (1024 * 1024)).toFixed(1)}MB video to ${(optimizationResult.optimizedSize / (1024 * 1024)).toFixed(1)}MB audio (${optimizationResult.compressionRatio}% smaller) for ultra-fast processing.`,
					);
				} else {
					toast.success(
						`Video optimized! Reduced size by ${savedMB}MB (${optimizationResult.compressionRatio}% smaller) for faster processing.`,
					);
				}
			}

			// Use the optimized file (could be audio-only or compressed video)
			const videoFile = processedFile;

			// --- AUDIO TRACK CHECK & ORIENTATION DETECTION ---
			let audioCheckDone = false;
			let videoOrientation: "vertical" | "horizontal" = "vertical"; // default

			// Skip audio/orientation check for audio-only files
			if (optimizationResult.isAudioOnly) {
				console.log(
					"🎵 [CAPTION-GEN] Audio-only file detected - using composition orientation",
				);

				// Always use composition orientation for audio-only files
				videoOrientation = getCompositionOrientation();
				audioCheckDone = true;
			} else {
				// For video files, perform the normal audio track and orientation check
				try {
					const videoForCheck = document.createElement("video");
					videoForCheck.preload = "metadata";
					videoForCheck.src = URL.createObjectURL(videoFile);
					videoForCheck.muted = true;
					await new Promise<void>((resolve, reject) => {
						videoForCheck.onloadedmetadata = () => {
							let hasAudio = false;
							const anyVideo = videoForCheck as any;
							if (anyVideo.audioTracks && anyVideo.audioTracks.length > 0) {
								hasAudio = true;
							} else if (typeof anyVideo.mozHasAudio !== "undefined") {
								hasAudio = anyVideo.mozHasAudio;
							} else if (
								typeof anyVideo.webkitAudioDecodedByteCount !== "undefined"
							) {
								hasAudio = anyVideo.webkitAudioDecodedByteCount > 0;
							}
							if (!hasAudio) {
								console.warn(
									"⚠️ The selected video does NOT have an audio track!",
								);
								toast.warning(
									"Warning: The selected video does NOT have an audio track. Captions will be generated, but no audio will be sent.",
								);
							} else {
								console.log("✅ [CAPTION-GEN] Video file has audio track");
							}
							// Orientation check - use composition orientation
							videoOrientation = getCompositionOrientation();
							URL.revokeObjectURL(videoForCheck.src);
							resolve();
						};
						videoForCheck.onerror = () => {
							console.warn(
								"⚠️ Could not check audio track or orientation (possibly due to CORS or unsupported browser). Proceeding anyway.",
							);
							resolve();
						};
					});
					audioCheckDone = true;
				} catch (audioCheckErr) {
					console.warn("⚠️ Audio/Orientation check failed:", audioCheckErr);
				}
				if (!audioCheckDone) {
					console.warn(
						"⚠️ Audio/Orientation check was not completed. Defaulting to vertical.",
					);
				}
			}
			// --- END AUDIO TRACK & ORIENTATION CHECK ---

			console.log(
				`📦 [CAPTION-GEN] Step 6: Preparing FormData for caption API`,
			);
			const captionFormData = new FormData();

			// Add the processed file (video or audio) with appropriate field name
			if (optimizationResult.isAudioOnly) {
				console.log(`🎵 [CAPTION-GEN] Adding audio-only file to FormData`);
				const displaySize =
					(processedFile as any).serverFileSize || processedFile.size;
				console.log(
					`📄 [CAPTION-GEN] Audio file details: ${processedFile.name} (${processedFile.type}) - ${(displaySize / 1024 / 1024).toFixed(2)}MB`,
				);

				// Check if the audio format is compatible with the server
				const isCompatibleFormat =
					processedFile.type.includes("webm") ||
					processedFile.type.includes("mp3") ||
					processedFile.type.includes("wav");
				if (!isCompatibleFormat) {
					console.warn(
						`⚠️ [CAPTION-GEN] Audio format ${processedFile.type} may not be compatible with server, but proceeding anyway`,
					);
				}

				// Check if we have a server-extracted audio file with URL
				if ((processedFile as any).serverUrl) {
					console.log(
						`🌐 [CAPTION-GEN] Downloading server-extracted audio: ${(processedFile as any).serverUrl}`,
					);

					try {
						// Download the server-extracted audio file
						console.log(
							`🌐 [CAPTION-GEN] Downloading server-extracted audio file...`,
						);
						// Create timeout signal if supported
						const audioTimeoutSignal =
							typeof AbortSignal !== "undefined" && AbortSignal.timeout
								? AbortSignal.timeout(30000) // 30 second timeout
								: undefined;

						const audioResponse = await fetch(
							(processedFile as any).serverUrl,
							{
								...(audioTimeoutSignal && { signal: audioTimeoutSignal }),
							},
						);

						if (!audioResponse.ok) {
							console.error(
								`❌ [CAPTION-GEN] Audio download failed: ${audioResponse.status} ${audioResponse.statusText}`,
							);
							throw new Error(
								`Failed to download server audio: ${audioResponse.status} ${audioResponse.statusText}`,
							);
						}

						console.log(`📦 [CAPTION-GEN] Reading audio blob...`);
						const audioBlob = await audioResponse.blob();

						if (audioBlob.size === 0) {
							console.error(`❌ [CAPTION-GEN] Downloaded audio blob is empty`);
							throw new Error("Downloaded audio file is empty");
						}

						const serverAudioFile = new File([audioBlob], processedFile.name, {
							type: "audio/mp3",
						});

						console.log(
							`✅ [CAPTION-GEN] Server audio downloaded successfully: ${(serverAudioFile.size / 1024 / 1024).toFixed(2)}MB`,
						);

						captionFormData.append("audio", serverAudioFile); // Upload the actual audio file
						captionFormData.append("file_type", "audio_only");

						// Use composition-based orientation
						captionFormData.append("orientation", videoOrientation);
						console.log(
							`📐 [CAPTION-GEN] Using composition orientation: ${videoOrientation}`,
						);
					} catch (downloadError) {
						console.error(
							`❌ [CAPTION-GEN] Failed to download server audio:`,
							downloadError,
						);
						console.error(`❌ [CAPTION-GEN] Download error details:`, {
							serverUrl: (processedFile as any).serverUrl,
							errorMessage:
								downloadError instanceof Error
									? downloadError.message
									: String(downloadError),
							errorStack:
								downloadError instanceof Error
									? downloadError.stack
									: undefined,
						});

						// Don't throw here - instead fallback to using the file without downloading
						console.log(
							`🔄 [CAPTION-GEN] Download failed, attempting to use server URL directly in FormData`,
						);

						// Create a placeholder file with server URL metadata
						const placeholderFile = new File([], processedFile.name, {
							type: "audio/mp3",
						});
						(placeholderFile as any).serverUrl = (
							processedFile as any
						).serverUrl;

						captionFormData.append(
							"audio_url",
							(processedFile as any).serverUrl,
						); // Send URL instead
						captionFormData.append("file_type", "audio_url");

						captionFormData.append("orientation", videoOrientation);
						console.log(
							`🔄 [CAPTION-GEN] Using audio URL fallback method with composition orientation: ${videoOrientation}`,
						);
					}
				} else {
					captionFormData.append("audio", processedFile); // Use 'audio' field for audio-only files
					captionFormData.append("file_type", "audio_only");
				}
			} else {
				console.log(`🎬 [CAPTION-GEN] Adding video file to FormData`);
				captionFormData.append("video", videoFile); // Use 'video' field for video files
				captionFormData.append("orientation", videoOrientation);
				captionFormData.append("file_type", "video");
			}

			// Step 5: Add audio files from timeline if any exist
			if (audioItems.length > 0) {
				console.log(
					`🎵 Processing ${audioItems.length} audio file(s) from timeline...`,
				);

				for (let i = 0; i < audioItems.length; i++) {
					const audioItem = audioItems[i];
					const audioUrl = audioItem.details?.src;

					if (!audioUrl) {
						console.warn(`⚠️ Audio item ${i + 1} has no source URL, skipping`);
						continue;
					}

					try {
						console.log(`🎵 Fetching audio ${i + 1}: ${audioUrl}`);

						// Fetch audio file
						const audioResponse = await fetch(audioUrl);
						if (!audioResponse.ok) {
							console.error(
								`❌ Failed to fetch audio ${i + 1}: ${audioResponse.status}`,
							);
							continue;
						}

						const audioBlob = await audioResponse.blob();
						if (audioBlob.size === 0) {
							console.warn(`⚠️ Audio ${i + 1} blob is empty, skipping`);
							continue;
						}

						// Create audio file object with appropriate name
						const audioFilename =
							audioUrl.split("/").pop() || `audio_${audioItem.id}.mp3`;
						const audioFile = new File([audioBlob], audioFilename, {
							type: audioBlob.type || "audio/mpeg",
						});

						// Append to FormData with index for multiple audio files
						captionFormData.append(`audio_${i}`, audioFile);
						console.log(
							`✅ Added audio ${i + 1} to FormData: ${audioFilename} (${audioBlob.size} bytes)`,
						);
					} catch (audioError) {
						console.error(`❌ Error processing audio ${i + 1}:`, audioError);
					}
				}
			} else {
				console.log(`ℹ️ No audio files found in timeline`);
			}

			// Add basic metadata (B-roll context is now handled separately via Sync B-roll button)
			const metadata = {
				videoUrl: videoUrl,
				videoId: videoItem.id,
				audioCount: audioItems.length,
			};
			captionFormData.append("metadata", JSON.stringify(metadata));

			console.log(
				`🌐 [CAPTION-GEN] Step 7: Sending ${optimizationResult.isAudioOnly ? "audio" : "video"} to caption generation API`,
			);
			console.log(
				`🔗 [CAPTION-GEN] API endpoint: https://cinetune-llh0.onrender.com/api/generate-captions`,
			);
			console.log(
				`📤 [CAPTION-GEN] Payload size: ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`,
			);

			// Log FormData contents for debugging
			console.log(`📋 [CAPTION-GEN] FormData contents:`);
			for (const [key, value] of captionFormData.entries()) {
				if (value instanceof File) {
					console.log(
						`  - ${key}: File(${value.name}, ${value.type}, ${(value.size / 1024 / 1024).toFixed(2)}MB)`,
					);
				} else {
					console.log(
						`  - ${key}: ${String(value).substring(0, 100)}${String(value).length > 100 ? "..." : ""}`,
					);
				}
			}

			console.log(
				`🌐 [CAPTION-GEN] Step 7: Sending ${optimizationResult.isAudioOnly ? "audio" : "video"} to caption generation API`,
			);
			console.log(
				`🔗 [CAPTION-GEN] API endpoint: https://cinetune-llh0.onrender.com/api/generate-captions`,
			);
			// Calculate the actual payload size (if server-extracted, use downloaded file size)
			let payloadSize = processedFile.size;
			if (
				optimizationResult.isAudioOnly &&
				(processedFile as any).serverFileSize
			) {
				payloadSize = (processedFile as any).serverFileSize;
			}
			console.log(
				`📤 [CAPTION-GEN] Payload size: ${(payloadSize / 1024 / 1024).toFixed(2)}MB`,
			);

			const apiCallStartTime = Date.now();

			console.log(
				`🚀 [CAPTION-GEN] Making API call to generate-captions endpoint...`,
			);

			// Final validation before API call
			let hasValidData = false;
			for (const [key, value] of captionFormData.entries()) {
				if (
					(key === "audio" || key === "video" || key === "audio_url") &&
					value
				) {
					hasValidData = true;
					console.log(`✅ [CAPTION-GEN] Found valid data for ${key}`);
					break;
				}
			}

			if (!hasValidData) {
				console.error(
					`❌ [CAPTION-GEN] No valid audio/video data found in FormData!`,
				);
				throw new Error("No valid media data prepared for API call");
			}

			// Update user with progress
			toast.info("Sending audio to caption generation service...");

			// Send to caption generation API (absolute URL) with timeout handling
			let response;
			try {
				// Try to use AbortSignal.timeout if available
				const timeoutSignal =
					typeof AbortSignal !== "undefined" && AbortSignal.timeout
						? AbortSignal.timeout(300000) // 5 minute timeout
						: undefined;

				response = await fetch(
					"https://cinetune-llh0.onrender.com/api/generate-captions",
					{
						method: "POST",
						body: captionFormData,
						...(timeoutSignal && { signal: timeoutSignal }),
					},
				);
			} catch (fetchError) {
				console.error(`❌ [CAPTION-GEN] Fetch error:`, fetchError);
				if (fetchError instanceof Error && fetchError.name === "AbortError") {
					throw new Error(
						"Request timed out after 5 minutes. Please try with a shorter video.",
					);
				}
				throw fetchError;
			}

			console.log(
				`📡 [CAPTION-GEN] API call made, received response with status: ${response.status}`,
			);

			const apiCallDuration = Date.now() - apiCallStartTime;
			console.log(`⏱️ [CAPTION-GEN] API call completed in ${apiCallDuration}ms`);

			if (!response.ok) {
				console.error(
					`❌ [CAPTION-GEN] API request failed with status: ${response.status} ${response.statusText}`,
				);
				let errorText = "";
				let errorJson = null;
				try {
					const responseText = await response.text();
					errorText = responseText;
					console.log(
						`📄 [CAPTION-GEN] Error response body: ${errorText.substring(0, 500)}${errorText.length > 500 ? "..." : ""}`,
					);
					try {
						errorJson = JSON.parse(responseText);
						if (errorJson.error) {
							console.error("❌ [CAPTION-GEN] Backend error:", errorJson.error);

							// Check for specific audio format issues
							if (
								errorJson.error.toLowerCase().includes("audio format") ||
								errorJson.error.toLowerCase().includes("unsupported format") ||
								errorJson.error.toLowerCase().includes("invalid format")
							) {
								console.error(
									"🎵 [CAPTION-GEN] Audio format issue detected - server may not support the extracted audio format",
								);
								toast.error(
									"The extracted audio format is not supported by the server. Please try with a different video or contact support.",
								);
								throw new Error(
									`Audio format not supported: ${errorJson.error}`,
								);
							}
						}
					} catch (jsonParseError) {
						console.error("❌ [CAPTION-GEN] Error response is not JSON");
						// Check if HTML error indicates server processing failure
						if (errorText.includes("Internal Server Error")) {
							console.error(
								"🎵 [CAPTION-GEN] Server internal error - likely audio processing failure",
							);
							toast.error(
								"The server encountered an error processing the audio. This may be due to an unsupported audio format or server issue.",
							);
						}
					}
				} catch (textReadError) {
					console.error("❌ [CAPTION-GEN] Failed to read error response");
					errorText = "Failed to read error response";
				}
				let errorMessage = `HTTP error! status: ${response.status}`;
				if (errorJson?.error) {
					errorMessage += ` - Backend error: ${errorJson.error}`;
				} else if (errorText) {
					errorMessage += ` - Response: ${errorText.substring(0, 200)}${errorText.length > 200 ? "..." : ""}`;
				}
				throw new Error(errorMessage);
			}

			console.log(
				`✅ [CAPTION-GEN] API request successful (${response.status} ${response.statusText})`,
			);

			// Parse successful response
			console.log(`📋 [CAPTION-GEN] Step 8: Parsing API response...`);
			try {
				const responseText = await response.text();
				console.log(
					`📄 [CAPTION-GEN] Response body: ${responseText.substring(0, 300)}${responseText.length > 300 ? "..." : ""}`,
				);
				data = JSON.parse(responseText);
				console.log(`✅ [CAPTION-GEN] Successfully parsed JSON response`);
			} catch (jsonError) {
				console.error(
					"❌ [CAPTION-GEN] Failed to parse response as JSON:",
					jsonError,
				);
				throw new Error("Backend returned invalid JSON response");
			}

			if (!data.id) {
				console.error(
					"❌ [CAPTION-GEN] No job ID received from server, response data:",
					data,
				);
				throw new Error("No job ID received from server");
			}

			console.log(`🆔 [CAPTION-GEN] Received job ID: ${data.id}`);

			// Save jobID immediately to localStorage for B-roll sync
			try {
				const immediateJobData = {
					jobId: data.id,
					status: "processing",
					createdAt: new Date().toISOString(),
					videoUrl: videoUrl,
					videoId: videoItem.id,
				};
				const jobKey = `captions_${data.id}`;
				localStorage.setItem(jobKey, JSON.stringify(immediateJobData));
			} catch (jobSaveError) {
				console.warn("⚠️ Failed to save job ID to localStorage:", jobSaveError);
			}

			console.log(
				`🔄 [CAPTION-GEN] Step 9: Starting caption processing polling...`,
			);
			toast.info("Video processing started. Retrieving captions...");

			// Step 4: Poll for captions using the jobId (absolute URLs)
			let captions = null;
			let attempts = 0;
			const maxAttempts = 1500; // 1500 seconds timeout
			const pollingStartTime = Date.now();

			console.log(
				`⏰ [CAPTION-GEN] Starting polling loop (max ${maxAttempts} attempts, 1s intervals)`,
			);

			while (!captions && attempts < maxAttempts) {
				await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
				attempts++;

				try {
					console.log(
						`🔍 [CAPTION-GEN] Polling attempt ${attempts}/${maxAttempts} - checking job status...`,
					);
					const captionsResponse = await fetch(
						`https://cinetune-llh0.onrender.com/api/processing-status/${data.id}`,
					);

					if (captionsResponse.ok) {
						const captionsData = await captionsResponse.json();
						console.log(`📊 [CAPTION-GEN] Job status: ${captionsData.status}`);

						if (captionsData.status === "completed") {
							console.log(
								`✅ [CAPTION-GEN] Job completed! Fetching final captions...`,
							);
							try {
								const captionsFetchResponse = await fetch(
									`https://cinetune-llh0.onrender.com/api/captions/${data.id}`,
								);
								if (captionsFetchResponse.ok) {
									const captionsResult = await captionsFetchResponse.json();
									console.log(
										`📝 [CAPTION-GEN] Captions response: ${Object.keys(captionsResult).join(", ")}`,
									);

									if (captionsResult.captions) {
										captions = captionsResult.captions;
										const pollingDuration = Date.now() - pollingStartTime;
										console.log(
											`🎉 [CAPTION-GEN] Successfully retrieved ${Array.isArray(captions) ? captions.length : "unknown"} captions after ${(pollingDuration / 1000).toFixed(1)}s (${attempts} attempts)`,
										);
										break;
									} else {
										console.error(
											"❌ [CAPTION-GEN] No captions data in response:",
											captionsResult,
										);
										throw new Error("No captions data received");
									}
								} else {
									console.error(
										"❌ Failed to fetch captions data:",
										captionsFetchResponse.status,
									);
									throw new Error(
										`Failed to fetch captions: ${captionsFetchResponse.status}`,
									);
								}
							} catch (captionsFetchError) {
								console.error(
									"❌ Error fetching captions data:",
									captionsFetchError,
								);
								throw captionsFetchError;
							}
						} else if (captionsData.status === "processing") {
							if (attempts % 10 === 0) {
								toast.info("Still processing video...");
							}
						} else if (captionsData.status === "failed") {
							console.error(
								"❌ Caption generation failed:",
								captionsData.error,
							);
							throw new Error(
								`Caption generation failed: ${captionsData.error}`,
							);
						}
					} else {
						console.error(
							"❌ Processing status response not ok:",
							captionsResponse.status,
						);
					}
				} catch (error) {
					console.error(
						`❌ [CAPTION-GEN] Polling attempt ${attempts} failed:`,
						error,
					);
					// Continue polling unless it's a critical error
					if (error instanceof Error && error.message.includes("network")) {
						console.log(
							`🔄 [CAPTION-GEN] Network error during polling, will retry...`,
						);
					}
				}
			}

			if (!captions) {
				const timeoutDuration = Date.now() - pollingStartTime;
				console.error(
					`❌ [CAPTION-GEN] Caption generation timed out after ${maxAttempts} attempts (${(timeoutDuration / 1000).toFixed(1)}s)`,
				);
				throw new Error("Caption generation timed out");
			}

			console.log(
				`💾 [CAPTION-GEN] Step 10: Saving captions to localStorage and preparing final response...`,
			);

			if (Array.isArray(captions)) {
				console.log(
					`📝 [CAPTION-GEN] Processing ${captions.length} caption entries...`,
				);
				// Create a comprehensive captions data structure for later styling
				const captionsData = {
					jobId: data.id,
					videoUrl: videoUrl,
					videoId: videoItem.id,
					captions: captions.map((caption: any, index: number) => ({
						id: caption.id || `caption-${index + 1}`,
						word: caption.word || caption.text,
						start: caption.start || caption.startTime,
						end: caption.end || caption.endTime,
						style: caption.style || {},
						vertical: caption.vertical || false,
						text: caption.text,
						startTime: caption.startTime,
						endTime: caption.endTime,
						...caption,
					})),
					metadata: {
						totalDuration: Math.max(
							...captions.map((c: any) => (c.end || c.endTime || 0) * 1000),
						),
						fps: 30,
						videoWidth: 1080,
						videoHeight: 1920,
						processingTime: Date.now(),
						model: "whisper-large-v3",
						language: "en",
					},
					status: "completed",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				// Save captions data to localStorage
				try {
					const allKeys = Object.keys(localStorage);
					const oldCaptionKeys = allKeys.filter(
						(key) =>
							key.startsWith("captions_") && key !== `captions_${data.id}`,
					);
					if (oldCaptionKeys.length > 0) {
						oldCaptionKeys.forEach((key) => localStorage.removeItem(key));
					}
				} catch (cleanupError) {
					console.warn("⚠️ Failed to clean up old captions keys:", cleanupError);
				}

				const captionsKey = `captions_${data.id}`;
				const captionsDataSize = JSON.stringify(captionsData).length;

				console.log(
					`💾 [CAPTION-GEN] Saving captions to localStorage with key: ${captionsKey}`,
				);
				console.log(
					`📊 [CAPTION-GEN] Captions data size: ${(captionsDataSize / 1024).toFixed(2)}KB`,
				);

				localStorage.setItem(captionsKey, JSON.stringify(captionsData));

				const totalProcessingTime = Date.now() - startTime;
				console.log(`🎉 [CAPTION-GEN] ═══ CAPTION GENERATION COMPLETE ═══`);
				console.log(
					`⏱️ [CAPTION-GEN] Total processing time: ${(totalProcessingTime / 1000).toFixed(1)}s`,
				);
				console.log(`📝 [CAPTION-GEN] Generated ${captions.length} captions`);
				console.log(
					`🎵 [CAPTION-GEN] Used ${optimizationResult.isAudioOnly ? "audio-only" : "video"} processing`,
				);
				if (optimizationResult.wasOptimized) {
					console.log(
						`📉 [CAPTION-GEN] File size reduction: ${optimizationResult.compressionRatio}%`,
					);
				}

				toast.success(
					`Successfully generated ${captions.length} creative captions! Use "Add captions" to add them to the timeline.`,
				);
				// Refresh transcript view to show newly generated captions
				loadAvailableCaptions();
			} else {
				console.warn("⚠️ No captions array received");
				toast.warning("No captions were generated. Please try again.");
			}
		} catch (error) {
			const totalProcessingTime = Date.now() - startTime;
			console.error(`❌ [CAPTION-GEN] ═══ CAPTION GENERATION FAILED ═══`);
			console.error(
				`⏱️ [CAPTION-GEN] Failed after: ${(totalProcessingTime / 1000).toFixed(1)}s`,
			);
			console.error(`🚨 [CAPTION-GEN] Error details:`, error);
			console.error(
				`📍 [CAPTION-GEN] Error type: ${error instanceof Error ? error.constructor.name : typeof error}`,
			);
			if (error instanceof Error && error.stack) {
				console.error(`📚 [CAPTION-GEN] Stack trace:`, error.stack);
			}

			toast.error(
				`Failed to generate creative captions: ${error instanceof Error ? error.message : "Unknown error"}`,
			);

			// Clean up the localStorage entry if it was created but processing failed
			try {
				const errorJobId = data && data.id ? data.id : null;
				if (errorJobId) {
					console.log(
						`🧹 [CAPTION-GEN] Cleaning up failed job ${errorJobId} in localStorage`,
					);
					const errorJobKey = `captions_${errorJobId}`;
					const existingData = localStorage.getItem(errorJobKey);
					if (existingData) {
						const parsedData = JSON.parse(existingData);
						if (parsedData.status === "processing") {
							// Update status to failed instead of removing completely
							parsedData.status = "failed";
							parsedData.error =
								error instanceof Error ? error.message : "Unknown error";
							parsedData.updatedAt = new Date().toISOString();
							localStorage.setItem(errorJobKey, JSON.stringify(parsedData));
							console.log(
								`✅ [CAPTION-GEN] Updated job status to failed in localStorage`,
							);
						}
					}
				}
			} catch (cleanupError) {
				console.warn(
					"⚠️ Failed to update failed job status in localStorage:",
					cleanupError,
				);
			}
		} finally {
			setIsLoadingCaptions(false);
		}
	};

	const handleAddAudio = () => {
		dispatch(ADD_AUDIO, {
			payload: {
				id: nanoid(),
				details: {
					src: "https://cdn.designcombo.dev/quick-brown.mp3",
				},
			},
			options: {},
		});
	};
	// https://cdn.designcombo.dev/rect-gray.png

	const handleAddImage = () => {
		dispatch(ADD_IMAGE, {
			payload: {
				id: nanoid(),
				details: {
					src: "https://cdn.designcombo.dev/rect-gray.png",
				},
			},
			options: {},
		});
	};

	// Bulk font change function for existing captions in timeline
	const handleBulkCaptionFontChange = async () => {
		console.log(
			`🔄 [BULK-FONT] Starting bulk font change to ${bulkCaptionFont} for all caption text items`,
		);
		console.log(`🔄 [BULK-FONT] Current timeline state:`, {
			totalTrackItems: Object.keys(trackItemsMap).length,
			allItemTypes: Object.values(trackItemsMap).map((item) => item.type),
		});

		// Get all timeline text items that are captions (have originalIndex property)
		const captionTextItems = Object.values(trackItemsMap).filter((item) => {
			const hasOriginalIndex =
				item.type === "text" &&
				item.details &&
				typeof item.details === "object" &&
				"originalIndex" in item.details;

			if (hasOriginalIndex) {
				console.log(`📋 [BULK-FONT] Found caption item:`, {
					id: item.id,
					type: item.type,
					text: (item.details as any)?.text?.substring(0, 20) || "N/A",
					originalIndex: (item.details as any)?.originalIndex,
					currentFont: (item.details as any)?.fontFamily || "default",
					currentFontUrl: (item.details as any)?.fontUrl || "default",
				});
			}

			return hasOriginalIndex;
		});

		if (captionTextItems.length === 0) {
			console.error(`❌ [BULK-FONT] No caption text items found in timeline`);
			console.error(`❌ [BULK-FONT] Timeline analysis:`, {
				totalItems: Object.keys(trackItemsMap).length,
				textItems: Object.values(trackItemsMap).filter(
					(item) => item.type === "text",
				).length,
				textItemsWithDetails: Object.values(trackItemsMap).filter(
					(item) =>
						item.type === "text" &&
						item.details &&
						typeof item.details === "object",
				).length,
				allItemIds: Object.keys(trackItemsMap),
			});
			toast.error("No caption text items found in timeline");
			return;
		}

		console.log(
			`🎯 [BULK-FONT] Found ${captionTextItems.length} caption text items to update`,
		);

		// Get font mapping for selected font
		const fontMapping = LOCAL_FONT_MAPPING[bulkCaptionFont];
		if (!fontMapping) {
			console.error(
				`❌ [BULK-FONT] Font "${bulkCaptionFont}" not found in LOCAL_FONT_MAPPING`,
			);
			console.error(
				`❌ [BULK-FONT] Available font keys:`,
				Object.keys(LOCAL_FONT_MAPPING),
			);
			toast.error(`Font "${bulkCaptionFont}" not found in font mapping`);
			return;
		}

		const { url: fontUrl, postScriptName: fontFamily } = fontMapping;
		console.log(`📝 [BULK-FONT] Using font mapping:`, {
			selectedFont: bulkCaptionFont,
			fontFamily,
			fontUrl,
			mappingExists: !!fontMapping,
		});

		// Log the before state of each caption item
		const beforeState = captionTextItems.map((item) => ({
			id: item.id,
			text: (item.details as any)?.text?.substring(0, 20) || "N/A",
			beforeFont: (item.details as any)?.fontFamily || "undefined",
			beforeFontUrl: (item.details as any)?.fontUrl || "undefined",
		}));
		console.log(`📊 [BULK-FONT] Before state:`, beforeState);

		// Bulk update all caption text items
		const payload: Record<string, any> = {};
		const updatedItemIds: string[] = [];

		captionTextItems.forEach((item) => {
			payload[item.id] = {
				details: {
					fontFamily,
					fontUrl,
				},
			};
			updatedItemIds.push(item.id);
		});

		console.log(`🚀 [BULK-FONT] Dispatching EDIT_OBJECT with payload:`, {
			itemCount: Object.keys(payload).length,
			itemIds: updatedItemIds,
			fontChange: { from: "various", to: fontFamily },
			urlChange: { from: "various", to: fontUrl },
		});

		// Load the font into the document before applying to timeline items
		console.log(`🔄 [BULK-FONT] Loading font into document:`, {
			fontFamily,
			fontUrl,
		});
		try {
			await loadFonts([
				{
					name: fontFamily,
					url: fontUrl,
				},
			]);
			console.log(`✅ [BULK-FONT] Font loaded successfully into document`);
		} catch (fontLoadError) {
			console.error(`❌ [BULK-FONT] Failed to load font:`, fontLoadError);
			toast.error(
				`Failed to load font ${bulkCaptionFont}. Font may not display correctly.`,
			);
		}

		// Dispatch single EDIT_OBJECT action with all updates
		dispatch(EDIT_OBJECT, { payload });

		// Verify the changes were applied by checking the store state after dispatch
		setTimeout(() => {
			const updatedState = useStore.getState();
			const verificationResults = updatedItemIds.map((itemId) => {
				const updatedItem = updatedState.trackItemsMap[itemId];
				const wasSuccessfullyUpdated =
					updatedItem &&
					updatedItem.details &&
					typeof updatedItem.details === "object" &&
					(updatedItem.details as any).fontFamily === fontFamily &&
					(updatedItem.details as any).fontUrl === fontUrl;

				return {
					id: itemId,
					text: (updatedItem?.details as any)?.text?.substring(0, 20) || "N/A",
					afterFont: (updatedItem?.details as any)?.fontFamily || "undefined",
					afterFontUrl: (updatedItem?.details as any)?.fontUrl || "undefined",
					updateSuccess: wasSuccessfullyUpdated,
				};
			});

			const successCount = verificationResults.filter(
				(result) => result.updateSuccess,
			).length;
			const failureCount = verificationResults.length - successCount;

			console.log(
				`📊 [BULK-FONT] After state verification:`,
				verificationResults,
			);
			console.log(`✅ [BULK-FONT] FINAL RESULTS:`, {
				totalCaptionsFound: captionTextItems.length,
				totalUpdatesAttempted: updatedItemIds.length,
				successfulUpdates: successCount,
				failedUpdates: failureCount,
				successRate: `${((successCount / captionTextItems.length) * 100).toFixed(1)}%`,
				targetFont: bulkCaptionFont,
				targetFontFamily: fontFamily,
				targetFontUrl: fontUrl,
			});

			if (successCount === captionTextItems.length) {
				toast.success(
					`✅ Successfully updated font for all ${successCount} caption text items to ${bulkCaptionFont}`,
				);
				console.log(
					`✅ [BULK-FONT] SUCCESS: All ${successCount} caption text items updated to ${bulkCaptionFont}`,
				);
			} else {
				toast.error(
					`❌ Partial update: ${successCount}/${captionTextItems.length} captions updated. ${failureCount} failed.`,
				);
				console.error(
					`❌ [BULK-FONT] PARTIAL FAILURE: ${successCount}/${captionTextItems.length} updated, ${failureCount} failed`,
				);
			}
		}, 100); // Small delay to ensure store state is updated
	};

	return (
		<div className="flex flex-1 flex-col">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
				Text
			</div>
			<div className="flex flex-col gap-2 px-4">
				{/* Caption Region Selector */}
				<div className="flex flex-col gap-2">
					<label className="text-sm font-medium text-muted-foreground">
						Caption Region
					</label>
					<select
						value={captionRegion}
						onChange={(e) => setCaptionRegion(e.target.value as any)}
						className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm shadow-xs transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
						data-tour="caption-region-dropdown"
					>
						<option value="top_left">Top Left</option>
						<option value="top_right">Top Right</option>
						<option value="bottom_left">Bottom Left</option>
						<option value="bottom_right">Bottom Right</option>
						<option value="center">Center</option>
						<option value="bottom_center">Bottom Center</option>
					</select>
				</div>

				{/* Grid Layout Selector */}
				<div className="flex flex-col gap-2">
					<label className="text-sm font-medium text-muted-foreground">
						Grid Layout
					</label>
					<select
						value={gridLayout}
						onChange={(e) =>
							setGridLayout(e.target.value as "default" | "either_side")
						}
						className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm shadow-xs transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="default">Default (3×3 Grid)</option>
						<option value="either_side">Either Side - 1 Line</option>
					</select>
				</div>

				{/* Words at a time selector */}
				<div className="flex flex-col gap-2">
					<label className="text-sm font-medium text-muted-foreground">
						Words at a time
					</label>
					<select
						value={wordsAtATime}
						onChange={(e) => setWordsAtATime(Number(e.target.value))}
						className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm shadow-xs transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
						data-tour="words-at-time-dropdown"
					>
						<option value="1">1 word</option>
						<option value="2">2 words</option>
						<option value="3">3 words</option>
					</select>
				</div>

				{/* Default Caption Font Selector */}
				<div className="flex flex-col gap-2">
					<label className="text-sm font-medium text-muted-foreground">
						Default Caption Font
					</label>
					<select
						value={defaultCaptionFont}
						onChange={(e) => setDefaultCaptionFont(e.target.value)}
						className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm shadow-xs transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
						data-tour="default-caption-font-dropdown"
					>
						<option value="Inter">Inter</option>
						<option value="Montserrat">Montserrat</option>
						<option value="Cinzel">Cinzel</option>
						<option value="InstrumentSerif">InstrumentSerif</option>
						<option value="Anton">Anton</option>
						<option value="BadScript">BadScript</option>
					</select>
				</div>

				{/* Bulk Caption Font Change */}
				<div className="flex flex-col gap-2">
					<label className="text-sm font-medium text-muted-foreground">
						Change All Caption Fonts
					</label>
					<div className="flex gap-2">
						<select
							value={bulkCaptionFont}
							onChange={(e) => setBulkCaptionFont(e.target.value)}
							className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm shadow-xs transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
							data-tour="bulk-caption-font-dropdown"
						>
							<option value="Inter">Inter</option>
							<option value="Montserrat">Montserrat</option>
							<option value="Cinzel">Cinzel</option>
							<option value="InstrumentSerif">InstrumentSerif</option>
							<option value="Anton">Anton</option>
							<option value="BadScript">BadScript</option>
						</select>
						<Button
							size="sm"
							variant="outline"
							onClick={handleBulkCaptionFontChange}
							className="px-3 py-2 text-xs"
							data-tour="apply-bulk-font-button"
						>
							Apply
						</Button>
					</div>
				</div>

				<Draggable
					data={TEXT_ADD_PAYLOAD}
					renderCustomPreview={
						<Button variant="secondary" className="w-60">
							Add text
						</Button>
					}
					shouldDisplayPreview={!isDraggingOverTimeline}
				>
					<div
						onClick={handleAddText}
						className={cn(
							buttonVariants({ variant: "default" }),
							"cursor-pointer",
						)}
					>
						Add text
					</div>
				</Draggable>

				<Button
					variant="secondary"
					className="w-60 backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-200"
					onClick={handleAddCreativeCaptions}
					disabled={isLoadingCaptions}
					data-tour="add-creative-captions"
				>
					{isLoadingCaptions
						? "Processing..."
						: "Process video for transcription"}
				</Button>

				<Button
					variant="outline"
					className="w-60 backdrop-blur-sm bg-white/5 border border-white/20 hover:bg-white/15 transition-all duration-200"
					onClick={handleLoadCaptionsFromJSON}
					data-tour="load-captions"
				>
					Add captions
				</Button>

				{/* Transcript Popover */}
				{availableCaptions.length > 0 && (
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								className="w-60"
								onClick={() => {
									loadAvailableCaptions(); // Refresh captions when opening
								}}
							>
								Show transcript
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className="w-[600px] max-w-[90vw] p-0"
							style={{ backgroundColor: "#0b0b0b", borderColor: "#1f1f1f" }}
							align="start"
							side="right"
							sideOffset={10}
						>
							{/* Header */}
							<div className="p-4 border-b" style={{ borderColor: "#1f1f1f" }}>
								<h3 className="text-sm font-medium text-white">Transcript</h3>
								<p className="text-xs text-gray-400">
									{availableCaptions.length} words •
									{availableCaptions.filter((c: any) => c.vertical).length}{" "}
									vertical •
									{availableCaptions.filter((c: any) => !c.vertical).length}{" "}
									horizontal
								</p>

								{/* Filter Options */}
								<div className="flex gap-2 mt-3">
									<Button
										variant="outline"
										size="sm"
										className="text-xs h-7 px-3 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
										onClick={() => {
											// Show all words
											setAvailableCaptions(originalCaptions);
										}}
									>
										All
									</Button>
									<Button
										variant="outline"
										size="sm"
										className="text-xs h-7 px-3 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
										onClick={() => {
											// Filter to show only vertical words
											const verticalCaptions = originalCaptions.filter(
												(c: any) => c.vertical,
											);
											setAvailableCaptions(verticalCaptions);
										}}
									>
										Vertical
									</Button>
									<Button
										variant="outline"
										size="sm"
										className="text-xs h-7 px-3 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
										onClick={() => {
											// Filter to show only horizontal words
											const horizontalCaptions = originalCaptions.filter(
												(c: any) => !c.vertical,
											);
											setAvailableCaptions(horizontalCaptions);
										}}
									>
										Horizontal
									</Button>
								</div>
							</div>

							{/* Transcript Content - Row-based Layout */}
							<div
								className="max-h-96 overflow-y-auto"
								style={{ backgroundColor: "#0b0b0b" }}
							>
								{availableCaptions
									.sort((a: any, b: any) => a.startTime - b.startTime)
									.map((caption, index) => (
										<div
											key={caption.id || index}
											className="px-4 py-3 cursor-pointer transition-colors duration-200 hover:bg-gray-900 border-b"
											style={{
												borderColor: "#1f1f1f",
											}}
											onClick={() => {
												// Log caption details for debugging
											}}
										>
											{/* Main Row: Time | Word | Badges | End Time */}
											<div className="flex items-center gap-3 min-w-0">
												{/* Start Time */}
												<span className="text-xs font-mono text-white flex-shrink-0 w-12">
													{formatTime(caption.startTime)}
												</span>

												{/* Separator */}
												<span className="text-gray-500">|</span>

												{/* Word Text */}
												{editingWordIndex === index ? (
													<input
														className="text-lg text-white font-medium flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
														value={editingWordValue}
														autoFocus
														onChange={(e) =>
															setEditingWordValue(e.target.value)
														}
														onBlur={() => {
															// Save edit on blur
															const updatedCaption = {
																...caption,
																word: editingWordValue,
																text: editingWordValue,
															};

															// Update both availableCaptions and originalCaptions
															const updatedAvailable = [...availableCaptions];
															const updatedOriginal = [...originalCaptions];

															updatedAvailable[index] = updatedCaption;

															// Find and update in originalCaptions using originalIndex
															const originalIndex =
																caption.originalIndex !== undefined
																	? caption.originalIndex
																	: index;
															const originalCaptionIndex =
																updatedOriginal.findIndex(
																	(c) =>
																		(c.originalIndex !== undefined
																			? c.originalIndex
																			: updatedOriginal.indexOf(c)) ===
																		originalIndex,
																);

															if (originalCaptionIndex !== -1) {
																updatedOriginal[originalCaptionIndex] =
																	updatedCaption;
															}

															// Save to localStorage
															const saved = saveCaptionEditToLocalStorage(
																updatedCaption,
																originalIndex,
															);

															if (saved) {
																setAvailableCaptions(updatedAvailable);
																setOriginalCaptions(updatedOriginal);
																toast.success(
																	`Word updated: "${editingWordValue}"`,
																);
															} else {
																toast.error(
																	"Failed to save edit to localStorage",
																);
															}

															setEditingWordIndex(null);
														}}
														onKeyDown={(e) => {
															if (e.key === "Enter") {
																// Save edit on Enter
																const updatedCaption = {
																	...caption,
																	word: editingWordValue,
																	text: editingWordValue,
																};

																// Update both availableCaptions and originalCaptions
																const updatedAvailable = [...availableCaptions];
																const updatedOriginal = [...originalCaptions];

																updatedAvailable[index] = updatedCaption;

																// Find and update in originalCaptions using originalIndex
																const originalIndex =
																	caption.originalIndex !== undefined
																		? caption.originalIndex
																		: index;
																const originalCaptionIndex =
																	updatedOriginal.findIndex(
																		(c) =>
																			(c.originalIndex !== undefined
																				? c.originalIndex
																				: updatedOriginal.indexOf(c)) ===
																			originalIndex,
																	);

																if (originalCaptionIndex !== -1) {
																	updatedOriginal[originalCaptionIndex] =
																		updatedCaption;
																}

																// Save to localStorage
																const saved = saveCaptionEditToLocalStorage(
																	updatedCaption,
																	originalIndex,
																);

																if (saved) {
																	setAvailableCaptions(updatedAvailable);
																	setOriginalCaptions(updatedOriginal);
																	toast.success(
																		`Word updated: "${editingWordValue}"`,
																	);
																} else {
																	toast.error(
																		"Failed to save edit to localStorage",
																	);
																}

																setEditingWordIndex(null);
															} else if (e.key === "Escape") {
																setEditingWordIndex(null);
															}
														}}
													/>
												) : (
													<span className="text-lg text-white font-medium flex-1">
														"{caption.word || caption.text}"
														<button
															className="ml-2 p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
															title="Edit word"
															onClick={(e) => {
																e.stopPropagation();
																setEditingWordIndex(index);
																setEditingWordValue(
																	caption.word || caption.text || "",
																);
															}}
														>
															<Pencil className="w-4 h-4" />
														</button>
													</span>
												)}

												{/* Type Badge (H for horizontal, V for vertical) */}
												<span
													className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
														caption.vertical
															? "bg-blue-600 text-white"
															: "bg-green-600 text-white"
													}`}
												>
													{caption.vertical ? "V" : "H"}
												</span>

												{/* Index Badge */}
												<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-700 text-white">
													#
													{caption.originalIndex !== undefined
														? caption.originalIndex + 1
														: index + 1}
												</span>

												{/* Separator */}
												<span className="text-gray-500">|</span>

												{/* End Time */}
												<span className="text-xs font-mono text-white flex-shrink-0 w-12">
													{formatTime(caption.endTime)}
												</span>
											</div>

											{/* Duration row below */}
											<div className="mt-1 text-xs text-gray-400 ml-16">
												Duration:{" "}
												{formatTime(caption.endTime - caption.startTime)}
												{caption.confidence && (
													<span className="ml-3">
														Confidence: {Math.round(caption.confidence * 100)}%
													</span>
												)}
											</div>
										</div>
									))}
							</div>

							{/* Footer Actions */}
							<div
								className="p-4 border-t"
								style={{ borderColor: "#1f1f1f", backgroundColor: "#0b0b0b" }}
							>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										className="flex-1 text-xs bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
										onClick={() => {
											loadAvailableCaptions();
											toast.success("Transcript refreshed");
										}}
									>
										Refresh
									</Button>

									<Button
										variant="outline"
										size="sm"
										className="flex-1 text-xs bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
										onClick={() => {
											// Export transcript as text
											const transcriptText = availableCaptions
												.sort((a: any, b: any) => a.startTime - b.startTime)
												.map((caption: any) => {
													const timestamp = formatTime(caption.startTime);
													const word = caption.word || caption.text;
													const type = caption.vertical ? "[V]" : "[H]";
													return `${timestamp} ${type} ${word}`;
												})
												.join("\n");

											// Copy to clipboard
											navigator.clipboard
												.writeText(transcriptText)
												.then(() => {
													toast.success("Transcript copied to clipboard");
												})
												.catch(() => {
													toast.error("Failed to copy transcript");
												});
										}}
									>
										Copy Text
									</Button>
								</div>

								{/* Word Stats */}
								<div className="mt-3 text-xs text-gray-400 text-center">
									Total: {availableCaptions.length} words • Duration:{" "}
									{availableCaptions.length > 0
										? formatTime(
												Math.max(
													...availableCaptions.map((c: any) => c.endTime),
												) -
													Math.min(
														...availableCaptions.map((c: any) => c.startTime),
													),
											)
										: "0:00"}
								</div>
							</div>
						</PopoverContent>
					</Popover>
				)}

				{/* <Button variant="secondary" className="w-60" onClick={handleAddAudio}>
					Add audio
				</Button>
				<Button variant="secondary" className="w-60" onClick={handleAddImage}>
					Add image
				</Button> */}
			</div>
		</div>
	);
};
