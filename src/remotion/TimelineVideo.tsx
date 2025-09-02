import React from "react";
import {
	AbsoluteFill,
	Audio,
	OffthreadVideo,
	Img,
	Sequence,
	staticFile,
	prefetch,
	Video,
} from "remotion";
import {
	calculateContainerStyles,
	calculateTextStyles,
	calculateMediaStyles,
} from "../features/editor/player/styles";

interface TrackItemDetails {
	[key: string]: any;
}

interface TrackItem {
	id: string;
	type: "text" | "image" | "video" | "audio";
	display: { from: number; to: number };
	details: TrackItemDetails;
	trim?: { from: number; to: number };
	playbackRate?: number;
}

export interface TimelineVideoProps {
	design?: {
		size: { width: number; height: number };
		fps: number;
		duration?: number;
		background?: {
			type: "color" | "image";
			value: string;
		};
		trackItems: TrackItem[];
	};
}

// Helper function to calculate frames (same as frontend)
const calculateFrames = (
	display: { from: number; to: number },
	fps: number,
) => {
	const from = (display.from / 1000) * fps;
	const durationInFrames = (display.to / 1000) * fps - from;
	return { from, durationInFrames };
};

// Text component that matches frontend rendering with ominous text mix-blend-mode support
const TextItem: React.FC<{ item: TrackItem; fps: number }> = ({
	item,
	fps,
}) => {
	const { details } = item;
	const { from, durationInFrames } = calculateFrames(item.display, fps);

	const crop = details.crop || {
		x: 0,
		y: 0,
		width: details.width,
		height: details.height,
	};

	// Check if this text has ominous=true for mix-blend-mode styling
	const isOminous = (details as any).ominous === true;

	// Log ominous text rendering for debugging
	if (isOminous) {
		console.log(
			`🎭 RENDERING ominous text with mix-blend-mode: difference - "${(details as any).text?.substring(0, 20)}..." (ID: ${item.id})`,
		);
	}

	return (
		<Sequence
			key={item.id}
			from={from}
			durationInFrames={durationInFrames || 1 / fps}
		>
			<AbsoluteFill
				style={{
					...calculateContainerStyles(details, crop, {
						pointerEvents: "none",
					}),
					// Apply mix-blend-mode: difference to the container for ominous text during rendering
					mixBlendMode: isOminous ? "difference" : "normal",
				}}
			>
				<div
					style={{
						whiteSpace: "normal",
						...calculateTextStyles(details as any),
						// Use specific dimensions if available, otherwise default to 100%
						width: details.width ? `${details.width}px` : "100%",
						height: details.height ? `${details.height}px` : "100%",
					}}
				>
					{details.text}
				</div>
			</AbsoluteFill>
		</Sequence>
	);
};

// Optimized Video component using Remotion's native capabilities
const VideoItem: React.FC<{ item: TrackItem; fps: number }> = ({
	item,
	fps,
}) => {
	const { details } = item;
	const { from, durationInFrames } = calculateFrames(item.display, fps);
	const playbackRate = item.playbackRate || 1;

	const crop = details.crop || {
		x: 0,
		y: 0,
		width: details.width,
		height: details.height,
	};

	// Calculate effective volume - if muted is true, volume should be 0
	const isMuted = details.muted === true;
	const effectiveVolume = isMuted ? 0 : (details.volume || 0) / 100;

	// Use Remotion's prefetch for optimization (non-blocking) with error handling
	React.useEffect(() => {
		if (details.src) {
			console.log(`🚀 Prefetching video: ${details.src}`);
			try {
				prefetch(details.src);
			} catch (prefetchError) {
				console.warn(`⚠️ Prefetch failed for ${details.src}:`, prefetchError);
			}
		}
	}, [details.src]);

	// Check if this is a potentially problematic format
	const isProblematicFormat = (src: string) => {
		const url = src.toLowerCase();
		return url.includes('.mov') || url.includes('quicktime') || url.includes('.m4v');
	};

	// Enhanced error handling state
	const [hasVideoError, setHasVideoError] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string>('');

	const handleVideoError = (error: any, component: string) => {
		console.error(`❌ ${component} failed for ${details.src}:`, error);
		setHasVideoError(true);
		setErrorMessage(`Video format not supported: ${component} failed`);
	};

	const renderVideoContent = () => {
		// If we already encountered an error, show error placeholder
		if (hasVideoError) {
			return (
				<div
					style={{
						width: '100%',
						height: '100%',
						backgroundColor: '#2a2a2a',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						color: '#ff6b6b',
						fontSize: '16px',
						textAlign: 'center',
						padding: '20px',
						borderRadius: '8px',
						border: '2px dashed #ff6b6b',
					}}
				>
					<div style={{ fontSize: '48px', marginBottom: '10px' }}>⚠️</div>
					<div>Video Format Error</div>
					<div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>
						{errorMessage}
					</div>
					<div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.6 }}>
						Try converting to MP4 format
					</div>
				</div>
			);
		}

		try {
			// For problematic formats, use regular Video component with enhanced error handling
			if (isProblematicFormat(details.src)) {
				console.warn(`⚠️ Detected potentially problematic format: ${details.src}`);
				return (
					<Video
						startFrom={((item.trim?.from || 0) / 1000) * fps}
						endAt={((item.trim?.to || item.display.to) / 1000) * fps || 1 / fps}
						playbackRate={playbackRate}
						src={details.src}
						volume={effectiveVolume} // Use calculated volume instead of forcing mute
						onError={(error) => handleVideoError(error, 'Video (problematic format)')}
						muted={isMuted} // Use calculated muted state
					/>
				);
			}

			// Try OffthreadVideo first (best performance for rendering)
			return (
				<OffthreadVideo
					startFrom={((item.trim?.from || 0) / 1000) * fps}
					endAt={((item.trim?.to || item.display.to) / 1000) * fps || 1 / fps}
					playbackRate={playbackRate}
					src={details.src}
					volume={effectiveVolume}
					onError={(error) => handleVideoError(error, 'OffthreadVideo')}
					transparent={false} // Disable transparency for performance
				/>
			);
		} catch (error) {
			console.error(`❌ Error creating video component: ${details.src}`, error);
			handleVideoError(error, 'Video Creation');
			return null;
		}
	};

	return (
		<Sequence
			key={item.id}
			from={from}
			durationInFrames={durationInFrames || 1 / fps}
		>
			<AbsoluteFill
				style={calculateContainerStyles(details, crop, {
					pointerEvents: "none",
				})}
			>
				<div style={calculateMediaStyles(details, crop)}>
					{details.src ? (
						renderVideoContent()
					) : (
						<div
							style={{
								width: "100%",
								height: "100%",
								backgroundColor: "#333333",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: "white",
								fontSize: "24px",
								textAlign: "center",
							}}
						>
							No Video Source
						</div>
					)}
				</div>
			</AbsoluteFill>
		</Sequence>
	);
};

// Audio component with enhanced error handling for problematic formats
const AudioItem: React.FC<{ item: TrackItem; fps: number }> = ({
	item,
	fps,
}) => {
	const { details } = item;
	const { from, durationInFrames } = calculateFrames(item.display, fps);
	const playbackRate = item.playbackRate || 1;

	// Calculate effective volume - if muted is true, volume should be 0
	const isMuted = details.muted === true;
	const effectiveVolume = isMuted ? 0 : (details.volume || 0) / 100;

	// Enhanced error handling state for audio
	const [hasAudioError, setHasAudioError] = React.useState(false);

	// Check if this is a potentially problematic audio format
	const isProblematicAudioFormat = (src: string) => {
		const url = src.toLowerCase();
		return url.includes('.mov') || url.includes('.m4v') || url.includes('quicktime');
	};

	const handleAudioError = (error: any) => {
		console.error(`❌ Audio decoding failed for ${details.src}:`, error);
		console.warn(`⚠️ Skipping problematic audio track: ${details.src}`);
		setHasAudioError(true);
	};

	// Skip audio rendering if we know it's problematic or if there was an error
	if (hasAudioError || isProblematicAudioFormat(details.src)) {
		console.log(`🔇 Skipping audio for problematic format: ${details.src}`);
		return null; // Don't render audio component for problematic formats
	}

	try {
		return (
			<Sequence
				key={item.id}
				from={from}
				durationInFrames={durationInFrames || 1 / fps}
			>
				<Audio
					startFrom={((item.trim?.from || 0) / 1000) * fps}
					endAt={((item.trim?.to || item.display.to) / 1000) * fps || 1 / fps}
					playbackRate={playbackRate}
					src={details.src}
					volume={effectiveVolume}
					onError={handleAudioError}
				/>
			</Sequence>
		);
	} catch (error) {
		console.error(`❌ Error creating audio component: ${details.src}`, error);
		return null;
	}
};

// Image component that matches frontend rendering
const ImageItem: React.FC<{ item: TrackItem; fps: number }> = ({
	item,
	fps,
}) => {
	const { details } = item;
	const { from, durationInFrames } = calculateFrames(item.display, fps);

	const crop = details.crop || {
		x: 0,
		y: 0,
		width: details.width,
		height: details.height,
	};

	return (
		<Sequence
			key={item.id}
			from={from}
			durationInFrames={durationInFrames || 1 / fps}
		>
			<AbsoluteFill
				style={calculateContainerStyles(details, crop, {
					pointerEvents: "none",
				})}
			>
				<div style={calculateMediaStyles(details, crop)}>
					<Img src={details.src} />
				</div>
			</AbsoluteFill>
		</Sequence>
	);
};

export const TimelineVideo: React.FC<TimelineVideoProps> = ({ design }) => {
	if (!design) {
		return (
			<AbsoluteFill
				style={{ backgroundColor: "#000000", width: 1080, height: 1920 }}
			/>
		);
	}

	const fps = design.fps || 30;
	const backgroundColor = design.background?.value || "#000000";

	// Log composition details for debugging
	console.log(`🎬 TimelineVideo render started:`, {
		fps,
		backgroundColor,
		trackItemsCount: design.trackItems?.length || 0,
		videoItems:
			design.trackItems?.filter((item) => item.type === "video").length || 0,
		size: design.size,
	});

	// Collect unique font families for @font-face injection
	const uniqueFontFamilies = Array.from(
		new Set(
			(design.trackItems || [])
				.filter((item) => item.type === "text")
				.map((item) => item.details?.fontFamily)
				.filter(Boolean) as string[],
		),
	);

	// Optimize video loading with prefetch at composition level (with error handling)
	const videoSources = (design.trackItems || [])
		.filter((item) => item.type === "video")
		.map((item) => ({ id: item.id, src: item.details?.src }));

	if (videoSources.length > 0) {
		console.log(`🎥 Video sources in composition:`, videoSources);

		// Analyze video formats for potential issues
		const problematicVideos = videoSources.filter(({ src }) => {
			if (!src) return false;
			const url = src.toLowerCase();
			return url.includes('.mov') || url.includes('.m4v') || url.includes('quicktime');
		});

		if (problematicVideos.length > 0) {
			console.warn(`⚠️ Detected ${problematicVideos.length} potentially problematic video formats:`);
			problematicVideos.forEach(({ id, src }) => {
				console.warn(`  - ${id}: ${src}`);
			});
			console.log(`💡 Consider converting these videos to MP4 format for better compatibility`);
		}

		// Prefetch all videos at composition level for better performance
		React.useEffect(() => {
			videoSources.forEach(({ src, id }) => {
				if (src) {
					console.log(`🚀 Composition-level prefetch: ${id} -> ${src}`);
					try {
						prefetch(src);
					} catch (prefetchError) {
						console.warn(`⚠️ Composition prefetch failed for ${id}:`, prefetchError);
					}
				}
			});
		}, []);
	}

	return (
		<AbsoluteFill
			style={{
				backgroundColor: backgroundColor,
				width: design.size?.width || 1080,
				height: design.size?.height || 1920,
			}}
		>
			{/* Inject @font-face for each custom family */}
			{uniqueFontFamilies.map((family) => {
				const url = staticFile(`fonts/${family}.ttf`);
				return (
					<style key={family}>
						{`@font-face{font-family:'${family}';src:url('${url}') format('truetype');font-weight:normal;font-style:normal;}`}
					</style>
				);
			})}

			{/* Render all track items using proper Sequence components */}
			{(design.trackItems || []).map((item) => {
				switch (item.type) {
					case "text":
						return <TextItem key={item.id} item={item} fps={fps} />;
					case "video":
						return <VideoItem key={item.id} item={item} fps={fps} />;
					case "audio":
						return <AudioItem key={item.id} item={item} fps={fps} />;
					case "image":
						return <ImageItem key={item.id} item={item} fps={fps} />;
					default:
						return null;
				}
			})}
		</AbsoluteFill>
	);
};
