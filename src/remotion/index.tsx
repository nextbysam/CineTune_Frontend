import React from "react";
import { Composition, registerRoot } from "remotion";
import { TimelineVideo } from "./TimelineVideo";

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TimelineComposition"
        component={TimelineVideo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          design: {
            size: { width: 1080, height: 1920 },
            fps: 30,
            duration: 10000,
            trackItems: [],
          }
        }}
        calculateMetadata={({ props }) => {
          const design = (props as any).design;
          const fps = design?.fps || 30;
          let duration = design?.duration || 10000;
          
          if (!duration && design?.trackItems && design.trackItems.length > 0) {
            const maxTo = design.trackItems.reduce((acc: number, item: any) => 
              Math.max(acc, item.display?.to || 0), 0);
            duration = Math.max(maxTo, 1000);
          }
          
          return {
            durationInFrames: Math.ceil((duration / 1000) * fps),
            fps: fps,
            width: design?.size?.width || 1080,
            height: design?.size?.height || 1920,
          };
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot); 