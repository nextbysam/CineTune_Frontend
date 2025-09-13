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
	// Check if this is a vertical caption
	const isVertical = (details as any).isVertical === true;

	// Log ominous text rendering for debugging
	if (isOminous) {
		console.log(
			`🎭 RENDERING ominous text with mix-blend-mode: difference - "${(details as any).text?.substring(0, 20)}..." (ID: ${item.id})`,
		);
	}

	// Log all text rendering for debugging with comprehensive details
	console.log(`🎯 TEXT RENDER DEBUG:`, {
		id: item.id,
		text: (details as any).text?.substring(0, 30),
		isVertical: isVertical,
		isOminous: isOminous,
		dimensions: {
			width: details.width,
			height: details.height,
			left: details.left,
			top: details.top,
		},
		containerDimensions: {
			cropWidth: crop.width,
			cropHeight: crop.height,
		},
		timing: {
			from: from,
			durationInFrames: durationInFrames,
			displayFrom: item.display.from,
			displayTo: item.display.to,
		},
		styling: {
			fontSize: details.fontSize,
			textAlign: details.textAlign,
			color: details.color,
			transform: details.transform,
		}
	});

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
						whiteSpace: isVertical ? "nowrap" : "normal", // Prevent wrapping for vertical captions
						...calculateTextStyles(details as any),
						// Use consistent dimensions - match container dimensions or default appropriately
						width: details.width ? `${details.width}px` : "100%",
						height: details.height ? `${details.height}px` : "auto",
						// For vertical captions, use simple positioning; for others use flex
						...(isVertical ? {
							// Vertical captions: simple positioning with center alignment
							textAlign: "center",
						} : {
							// Non-vertical captions: flex layout for better alignment
							display: "flex",
							alignItems: "center",
							justifyContent: details.textAlign === "center" ? "center" : details.textAlign === "right" ? "flex-end" : "flex-start",
						}),
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

	// Production-safe video loading - avoid blocking operations during composition selection
	const isProductionRender =
		typeof window === "undefined" || typeof document === "undefined";

	React.useEffect(() => {
		if (details.src && !isProductionRender) {
			console.log(
				`📹 Video will load on-demand: ${details.src.substring(0, 50)}...`,
			);
		} else if (details.src && isProductionRender) {
			console.log(
				`📹 Production render - video loading optimized: ${details.src.substring(0, 30)}...`,
			);
		}
	}, [details.src, isProductionRender]);

	// Check if this is a potentially problematic format
	const isProblematicFormat = (src: string) => {
		const url = src.toLowerCase();
		return (
			url.includes(".mov") || url.includes("quicktime") || url.includes(".m4v")
		);
	};

	// Enhanced error handling state
	const [hasVideoError, setHasVideoError] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState<string>("");

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
						width: "100%",
						height: "100%",
						backgroundColor: "#2a2a2a",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						color: "#ff6b6b",
						fontSize: "16px",
						textAlign: "center",
						padding: "20px",
						borderRadius: "8px",
						border: "2px dashed #ff6b6b",
					}}
				>
					<div style={{ fontSize: "48px", marginBottom: "10px" }}>⚠️</div>
					<div>Video Format Error</div>
					<div style={{ fontSize: "12px", marginTop: "5px", opacity: 0.8 }}>
						{errorMessage}
					</div>
					<div style={{ fontSize: "12px", marginTop: "5px", opacity: 0.6 }}>
						Try converting to MP4 format
					</div>
				</div>
			);
		}

		try {
			// For problematic formats, use regular Video component with enhanced error handling
			if (isProblematicFormat(details.src)) {
				console.warn(
					`⚠️ Detected potentially problematic format, using fallback Video component`,
				);
				return (
					<Video
						startFrom={((item.trim?.from || 0) / 1000) * fps}
						endAt={((item.trim?.to || item.display.to) / 1000) * fps || 1 / fps}
						playbackRate={playbackRate}
						src={details.src}
						volume={effectiveVolume}
						onError={(error) =>
							handleVideoError(error, "Video (problematic format)")
						}
						muted={isMuted}
					/>
				);
			}

			// In production, prefer regular Video component for better stability
			if (isProductionRender) {
				return (
					<Video
						startFrom={((item.trim?.from || 0) / 1000) * fps}
						endAt={((item.trim?.to || item.display.to) / 1000) * fps || 1 / fps}
						playbackRate={playbackRate}
						src={details.src}
						volume={effectiveVolume}
						onError={(error) => handleVideoError(error, "Video (production)")}
						muted={isMuted}
					/>
				);
			}

			// Try OffthreadVideo for development (best performance for rendering)
			return (
				<OffthreadVideo
					startFrom={((item.trim?.from || 0) / 1000) * fps}
					endAt={((item.trim?.to || item.display.to) / 1000) * fps || 1 / fps}
					playbackRate={playbackRate}
					src={details.src}
					volume={effectiveVolume}
					onError={(error) => handleVideoError(error, "OffthreadVideo")}
					transparent={false} // Disable transparency for performance
				/>
			);
		} catch (error) {
			console.error(
				`❌ Error creating video component:`,
				(error as any)?.message || String(error),
			);
			handleVideoError(error, "Video Creation");
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
		return (
			url.includes(".mov") || url.includes(".m4v") || url.includes("quicktime")
		);
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
	// Early return with simple black background if no design
	if (!design) {
		console.log(
			"🎬 TimelineVideo: No design provided, rendering black background",
		);
		return (
			<AbsoluteFill
				style={{ backgroundColor: "#000000", width: 1080, height: 1920 }}
			/>
		);
	}

	const fps = design.fps || 30;
	const backgroundColor = design.background?.value || "#000000";

	// Enhanced logging with production environment detection
	const isProductionRender =
		typeof window === "undefined" || typeof document === "undefined";

	console.log(`🎬 TimelineVideo render started:`, {
		fps,
		backgroundColor,
		trackItemsCount: design.trackItems?.length || 0,
		videoItems:
			design.trackItems?.filter((item) => item.type === "video").length || 0,
		textItems:
			design.trackItems?.filter((item) => item.type === "text").length || 0,
		size: design.size,
		videoOrientation: (design.size?.width || 1080) > (design.size?.height || 1920) ? "horizontal" : "vertical",
		isProductionRender,
		environment: isProductionRender ? "server" : "browser",
		nodeEnv: process.env.NODE_ENV,
	});

	// Collect unique font families for @font-face injection
	const uniqueFontFamilies = React.useMemo(() => {
		return Array.from(
			new Set(
				(design.trackItems || [])
					.filter((item) => item.type === "text")
					.map((item) => item.details?.fontFamily)
					.filter(Boolean) as string[],
			),
		);
	}, [design.trackItems]);

	// Optimize video loading with prefetch at composition level (with error handling)
	const videoSources = React.useMemo(() => {
		return (design.trackItems || [])
			.filter((item) => item.type === "video")
			.map((item) => ({ id: item.id, src: item.details?.src }));
	}, [design.trackItems]);

	// Analyze video formats for potential issues but don't block rendering
	React.useEffect(() => {
		if (videoSources.length > 0) {
			console.log(
				`🎥 Video sources in composition:`,
				videoSources.length,
				"videos",
			);

			// Analyze video formats for potential issues
			const problematicVideos = videoSources.filter(({ src }) => {
				if (!src) return false;
				const url = src.toLowerCase();
				return (
					url.includes(".mov") ||
					url.includes(".m4v") ||
					url.includes("quicktime")
				);
			});

			if (problematicVideos.length > 0) {
				console.warn(
					`⚠️ Detected ${problematicVideos.length} potentially problematic video formats - will attempt graceful fallback`,
				);
				problematicVideos.forEach(({ id, src }) => {
					console.warn(`  - ${id}: ${src.substring(0, 50)}...`);
				});
			}

			// In production/server rendering, skip complex prefetch operations
			if (isProductionRender) {
				console.log(
					`🎬 Production environment detected - skipping video prefetch to prevent timeouts`,
				);
			} else {
				console.log(`📹 Development environment - videos will load on-demand`);
			}
		}
	}, [videoSources, isProductionRender]);

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
