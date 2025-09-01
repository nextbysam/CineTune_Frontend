/**
 * Audio Extraction Utility for Caption Generation
 * Extracts audio track from video files for efficient caption processing
 * This significantly reduces upload size and processing time while maintaining transcription quality
 */

export interface AudioExtractionOptions {
	audioBitrate?: number; // Audio bitrate in kbps (default: 128kbps)
	audioFormat?: "mp3" | "wav" | "webm"; // Output format (default: 'mp3')
	maxDurationSeconds?: number; // Maximum audio duration (default: 300s = 5min)
	sampleRate?: number; // Sample rate in Hz (default: 44100Hz)
}

export interface AudioExtractionResult {
	audioFile: File;
	originalVideoSize: number;
	audioSize: number;
	compressionRatio: number;
	duration: number;
	processingTime: number;
	wasExtracted: boolean;
}

/**
 * Checks if we should extract audio instead of sending full video
 */
export function shouldExtractAudio(
	videoFile: File,
	minVideoSizeMB: number = 10, // Extract audio for videos > 10MB
): boolean {
	const sizeInMB = videoFile.size / (1024 * 1024);
	const shouldExtract = sizeInMB > minVideoSizeMB;

	console.log(
		`🎵 [AUDIO-EXTRACT] Size check: ${videoFile.name} = ${sizeInMB.toFixed(2)}MB`,
	);
	console.log(
		`🎵 [AUDIO-EXTRACT] Threshold: ${minVideoSizeMB}MB, Should extract audio: ${shouldExtract}`,
	);

	return shouldExtract;
}

/**
 * Extracts audio from video file for caption generation
 */
export async function extractAudioForCaptions(
	videoFile: File,
	options: AudioExtractionOptions = {},
): Promise<AudioExtractionResult> {
	const startTime = Date.now();

	console.log(`🎵 [AUDIO-EXTRACT] ═══ Starting Audio Extraction ═══`);
	console.log(
		`📁 [AUDIO-EXTRACT] Input: ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(2)}MB)`,
	);

	const {
		audioBitrate = 128,
		audioFormat = "mp3",
		maxDurationSeconds = 300, // 5 minutes max
		sampleRate = 44100,
	} = options;

	try {
		// Create video element for audio extraction
		console.log(`🎥 [AUDIO-EXTRACT] Creating video element for processing`);
		const video = document.createElement("video");
		const videoUrl = URL.createObjectURL(videoFile);
		video.src = videoUrl;
		video.muted = false; // Keep audio enabled
		video.preload = "metadata";

		// Wait for video metadata
		console.log(`⏳ [AUDIO-EXTRACT] Loading video metadata...`);
		await new Promise<void>((resolve, reject) => {
			video.onloadedmetadata = () => {
				console.log(
					`✅ [AUDIO-EXTRACT] Metadata loaded - Duration: ${video.duration.toFixed(2)}s`,
				);
				resolve();
			};
			video.onerror = (error) => {
				console.error(
					`❌ [AUDIO-EXTRACT] Failed to load video metadata:`,
					error,
				);
				reject(new Error("Failed to load video metadata"));
			};
		});

		// Check if video has audio
		const hasAudio = await checkVideoHasAudio(video);
		if (!hasAudio) {
			console.warn(
				`⚠️ [AUDIO-EXTRACT] Video has no audio track, returning original file`,
			);
			URL.revokeObjectURL(videoUrl);
			return {
				audioFile: videoFile,
				originalVideoSize: videoFile.size,
				audioSize: videoFile.size,
				compressionRatio: 0,
				duration: video.duration,
				processingTime: Date.now() - startTime,
				wasExtracted: false,
			};
		}

		// Extract audio using MediaRecorder
		console.log(
			`🎙️ [AUDIO-EXTRACT] Starting audio extraction with MediaRecorder`,
		);
		const audioFile = await extractAudioWithMediaRecorder(
			video,
			audioBitrate,
			audioFormat,
			maxDurationSeconds,
			sampleRate,
			videoFile.name,
		);

		// Cleanup
		URL.revokeObjectURL(videoUrl);

		const compressionRatio = Math.round(
			((videoFile.size - audioFile.size) / videoFile.size) * 100,
		);
		const processingTime = Date.now() - startTime;

		console.log(`📊 [AUDIO-EXTRACT] Extraction complete:`);
		console.log(
			`   📏 Original video: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB`,
		);
		console.log(
			`   🎵 Extracted audio: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`,
		);
		console.log(`   📉 Size reduction: ${compressionRatio}%`);
		console.log(`   ⏱️ Processing time: ${(processingTime / 1000).toFixed(1)}s`);

		return {
			audioFile,
			originalVideoSize: videoFile.size,
			audioSize: audioFile.size,
			compressionRatio,
			duration: video.duration,
			processingTime,
			wasExtracted: true,
		};
	} catch (error) {
		console.error(`❌ [AUDIO-EXTRACT] Audio extraction failed:`, error);

		// Fallback: return original video file
		const processingTime = Date.now() - startTime;
		console.log(`🔄 [AUDIO-EXTRACT] Falling back to original video file`);

		return {
			audioFile: videoFile,
			originalVideoSize: videoFile.size,
			audioSize: videoFile.size,
			compressionRatio: 0,
			duration: 0,
			processingTime,
			wasExtracted: false,
		};
	}
}

/**
 * Checks if video has audio track
 */
async function checkVideoHasAudio(video: HTMLVideoElement): Promise<boolean> {
	console.log(`🔍 [AUDIO-EXTRACT] Checking for audio tracks...`);

	try {
		// Method 1: Check audioTracks if available
		const anyVideo = video as any;
		if (anyVideo.audioTracks && anyVideo.audioTracks.length > 0) {
			console.log(
				`✅ [AUDIO-EXTRACT] Audio detected via audioTracks API (${anyVideo.audioTracks.length} tracks)`,
			);
			return true;
		}

		// Method 2: Mozilla-specific check
		if (typeof anyVideo.mozHasAudio !== "undefined") {
			const hasAudio = anyVideo.mozHasAudio;
			console.log(
				`✅ [AUDIO-EXTRACT] Audio detected via mozHasAudio: ${hasAudio}`,
			);
			return hasAudio;
		}

		// Method 3: WebKit-specific check
		if (typeof anyVideo.webkitAudioDecodedByteCount !== "undefined") {
			const hasAudio = anyVideo.webkitAudioDecodedByteCount > 0;
			console.log(
				`✅ [AUDIO-EXTRACT] Audio detected via webkitAudioDecodedByteCount: ${hasAudio}`,
			);
			return hasAudio;
		}

		// Method 4: Create audio context to detect audio
		console.log(`🔍 [AUDIO-EXTRACT] Using AudioContext to detect audio...`);
		const audioContext = new (
			window.AudioContext || (window as any).webkitAudioContext
		)();
		const source = audioContext.createMediaElementSource(video);
		const analyzer = audioContext.createAnalyser();
		source.connect(analyzer);

		// Play video briefly to check for audio data
		video.currentTime = Math.min(1, video.duration * 0.1);
		await video.play();

		// Check for audio data
		const bufferLength = analyzer.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		analyzer.getByteFrequencyData(dataArray);

		// Look for non-zero audio data
		const hasAudioData = dataArray.some((value) => value > 0);

		video.pause();
		audioContext.close();

		console.log(
			`🔍 [AUDIO-EXTRACT] AudioContext detection result: ${hasAudioData}`,
		);
		return hasAudioData;
	} catch (error) {
		console.warn(
			`⚠️ [AUDIO-EXTRACT] Audio detection failed, assuming audio exists:`,
			error,
		);
		return true; // Assume audio exists if we can't detect
	}
}

/**
 * Extracts audio using MediaRecorder API
 */
async function extractAudioWithMediaRecorder(
	video: HTMLVideoElement,
	audioBitrate: number,
	audioFormat: string,
	maxDuration: number,
	sampleRate: number,
	originalFileName: string,
): Promise<File> {
	console.log(`🎙️ [MEDIA-REC-AUDIO] Starting MediaRecorder audio extraction`);
	console.log(
		`⚙️ [MEDIA-REC-AUDIO] Settings: ${audioBitrate}kbps, format: ${audioFormat}, max: ${maxDuration}s`,
	);

	return new Promise((resolve, reject) => {
		try {
			// Create audio context for processing
			console.log(`🎵 [MEDIA-REC-AUDIO] Creating audio context`);
			const audioContext = new (
				window.AudioContext || (window as any).webkitAudioContext
			)();
			const source = audioContext.createMediaElementSource(video);
			const destination = audioContext.createMediaStreamDestination();

			// Connect audio source to destination
			source.connect(destination);
			console.log(`🔗 [MEDIA-REC-AUDIO] Audio routing established`);

			// Configure MediaRecorder for audio only
			const mimeType = getAudioMimeType(audioFormat);
			console.log(`🎵 [MEDIA-REC-AUDIO] Using MIME type: ${mimeType}`);

			const mediaRecorder = new MediaRecorder(destination.stream, {
				mimeType,
				audioBitsPerSecond: audioBitrate * 1000,
			});

			const chunks: BlobPart[] = [];
			let recordingStartTime = Date.now();

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					console.log(
						`📦 [MEDIA-REC-AUDIO] Received audio chunk: ${(event.data.size / 1024).toFixed(1)}KB`,
					);
					chunks.push(event.data);
				}
			};

			mediaRecorder.onstop = () => {
				console.log(
					`🛑 [MEDIA-REC-AUDIO] Recording stopped, processing ${chunks.length} chunks`,
				);

				try {
					// Cleanup audio context
					audioContext.close();

					// Create audio file
					const blob = new Blob(chunks, { type: mimeType });
					const fileName = originalFileName.replace(
						/\.[^/.]+$/,
						`_audio.${audioFormat}`,
					);
					const audioFile = new File([blob], fileName, { type: mimeType });

					console.log(
						`✅ [MEDIA-REC-AUDIO] Audio file created: ${fileName} (${(blob.size / 1024 / 1024).toFixed(2)}MB)`,
					);
					resolve(audioFile);
				} catch (error) {
					console.error(
						`❌ [MEDIA-REC-AUDIO] Error creating audio file:`,
						error,
					);
					reject(error);
				}
			};

			mediaRecorder.onerror = (error) => {
				console.error(`❌ [MEDIA-REC-AUDIO] MediaRecorder error:`, error);
				audioContext.close();
				reject(error);
			};

			// Start recording
			console.log(`🎬 [MEDIA-REC-AUDIO] Starting audio recording`);
			mediaRecorder.start(1000); // 1 second chunks

			// Start video playback
			video.currentTime = 0;
			video
				.play()
				.then(() => {
					console.log(
						`▶️ [MEDIA-REC-AUDIO] Video playback started for audio extraction`,
					);
				})
				.catch(reject);

			// Stop recording when video ends or max duration reached
			video.onended = () => {
				console.log(
					`🏁 [MEDIA-REC-AUDIO] Video ended, stopping audio recording`,
				);
				setTimeout(() => mediaRecorder.stop(), 100);
			};

			// Safety timeout for max duration
			setTimeout(() => {
				if (mediaRecorder.state === "recording") {
					console.log(
						`⏰ [MEDIA-REC-AUDIO] Max duration (${maxDuration}s) reached, stopping recording`,
					);
					video.pause();
					mediaRecorder.stop();
				}
			}, maxDuration * 1000);
		} catch (error) {
			console.error(`❌ [MEDIA-REC-AUDIO] Setup error:`, error);
			reject(error);
		}
	});
}

/**
 * Get appropriate MIME type for audio format
 */
function getAudioMimeType(format: string): string {
	const mimeTypes: Record<string, string[]> = {
		mp3: ["audio/mp3", "audio/mpeg"],
		wav: ["audio/wav", "audio/wave"],
		webm: ["audio/webm", "audio/webm;codecs=opus"],
	};

	const possibleTypes = mimeTypes[format] || mimeTypes.mp3;

	for (const type of possibleTypes) {
		if (MediaRecorder.isTypeSupported(type)) {
			console.log(`✅ [AUDIO-EXTRACT] Using supported MIME type: ${type}`);
			return type;
		}
	}

	// Fallback
	console.warn(
		`⚠️ [AUDIO-EXTRACT] No supported MIME type found, using fallback: audio/webm`,
	);
	return "audio/webm";
}

/**
 * Utility to estimate audio file size
 */
export function estimateAudioSize(
	durationSeconds: number,
	audioBitrate: number = 128,
): number {
	// Estimate: bitrate * duration / 8 (convert bits to bytes)
	// Add 10% overhead for container format
	const estimatedBytes = ((audioBitrate * 1000 * durationSeconds) / 8) * 1.1;
	return Math.round(estimatedBytes);
}

/**
 * Format file sizes for display
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
