import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Img, Sequence, staticFile, prefetch, Video } from "remotion";
import { calculateContainerStyles, calculateTextStyles, calculateMediaStyles } from "../features/editor/player/styles";

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
const calculateFrames = (display: { from: number; to: number }, fps: number) => {
  const from = (display.from / 1000) * fps;
  const durationInFrames = (display.to / 1000) * fps - from;
  return { from, durationInFrames };
};

// Text component that matches frontend rendering with ominous text mix-blend-mode support
const TextItem: React.FC<{ item: TrackItem; fps: number }> = ({ item, fps }) => {
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
    console.log(`🎭 RENDERING ominous text with mix-blend-mode: difference - "${(details as any).text?.substring(0, 20)}..." (ID: ${item.id})`);
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
          mixBlendMode: isOminous ? 'difference' : 'normal',
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
const VideoItem: React.FC<{ item: TrackItem; fps: number }> = ({ item, fps }) => {
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

  // Use Remotion's prefetch for optimization (non-blocking)
  React.useEffect(() => {
    if (details.src) {
      console.log(`🚀 Prefetching video: ${details.src}`);
      prefetch(details.src);
    }
  }, [details.src]);

  const renderVideoContent = () => {
    try {
      // Try OffthreadVideo first (best performance for rendering)
      return (
        <OffthreadVideo
          startFrom={(item.trim?.from || 0) / 1000 * fps}
          endAt={(item.trim?.to || item.display.to) / 1000 * fps || 1 / fps}
          playbackRate={playbackRate}
          src={details.src}
          volume={effectiveVolume}
          // Enhanced error handling
          onError={(error) => {
            console.error(`❌ OffthreadVideo failed: ${details.src}`, error);
            console.log(`🔄 Video component will fallback to regular Video component`);
          }}
          // Add timeout config directly to OffthreadVideo
          transparent={false} // Disable transparency for performance
        />
      );
    } catch (error) {
      console.error(`❌ Error creating OffthreadVideo: ${details.src}`, error);
      // Fallback to regular Video component
      return (
        <Video
          startFrom={(item.trim?.from || 0) / 1000 * fps}
          endAt={(item.trim?.to || item.display.to) / 1000 * fps || 1 / fps}
          playbackRate={playbackRate}
          src={details.src}
          volume={effectiveVolume}
          onError={(error) => {
            console.error(`❌ Video component also failed: ${details.src}`, error);
          }}
        />
      );
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
          {details.src ? renderVideoContent() : (
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#333333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              textAlign: 'center'
            }}>
              No Video Source
            </div>
          )}
        </div>
      </AbsoluteFill>
    </Sequence>
  );
};

// Audio component that matches frontend rendering exactly  
const AudioItem: React.FC<{ item: TrackItem; fps: number }> = ({ item, fps }) => {
  const { details } = item;
  const { from, durationInFrames } = calculateFrames(item.display, fps);
  const playbackRate = item.playbackRate || 1;

  // Calculate effective volume - if muted is true, volume should be 0
  const isMuted = details.muted === true;
  const effectiveVolume = isMuted ? 0 : (details.volume || 0) / 100;

  return (
    <Sequence
      key={item.id}
      from={from}
      durationInFrames={durationInFrames || 1 / fps}
    >
      <Audio
        startFrom={(item.trim?.from || 0) / 1000 * fps}
        endAt={(item.trim?.to || item.display.to) / 1000 * fps || 1 / fps}
        playbackRate={playbackRate}
        src={details.src}
        volume={effectiveVolume}
      />
    </Sequence>
  );
};

// Image component that matches frontend rendering
const ImageItem: React.FC<{ item: TrackItem; fps: number }> = ({ item, fps }) => {
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
    return <AbsoluteFill style={{ backgroundColor: "#000000", width: 1080, height: 1920 }} />;
  }

  const fps = design.fps || 30;
  const backgroundColor = design.background?.value || "#000000";

  // Log composition details for debugging
  console.log(`🎬 TimelineVideo render started:`, {
    fps,
    backgroundColor,
    trackItemsCount: design.trackItems?.length || 0,
    videoItems: design.trackItems?.filter(item => item.type === 'video').length || 0,
    size: design.size
  });

  // Collect unique font families for @font-face injection
  const uniqueFontFamilies = Array.from(
    new Set(
      (design.trackItems || [])
        .filter(item => item.type === "text")
        .map((item) => item.details?.fontFamily)
        .filter(Boolean) as string[]
    )
  );

  // Optimize video loading with prefetch at composition level
  const videoSources = (design.trackItems || [])
    .filter(item => item.type === 'video')
    .map(item => ({ id: item.id, src: item.details?.src }));
  
  if (videoSources.length > 0) {
    console.log(`🎥 Video sources in composition:`, videoSources);
    
    // Prefetch all videos at composition level for better performance
    React.useEffect(() => {
      videoSources.forEach(({ src, id }) => {
        if (src) {
          console.log(`🚀 Composition-level prefetch: ${id} -> ${src}`);
          prefetch(src);
        }
      });
    }, []);
  }

  return (
    <AbsoluteFill style={{ 
      backgroundColor: backgroundColor, 
      width: design.size?.width || 1080, 
      height: design.size?.height || 1920 
    }}>
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