import { ISize, ITrackItem } from "@designcombo/types";
import { AbsoluteFill, Sequence } from "remotion";
import { calculateFrames } from "../utils/frames";
import { calculateContainerStyles } from "./styles";

export interface SequenceItemOptions {
	handleTextChange?: (id: string, text: string) => void;
	fps: number;
	editableTextId?: string | null;
	currentTime?: number;
	zIndex?: number;
	onTextBlur?: (id: string, text: string) => void;
	size?: ISize;
	frame?: number;
	isTransition?: boolean;
}

export const BaseSequence = ({
	item,
	options,
	children,
}: {
	item: ITrackItem;
	options: SequenceItemOptions;
	children: React.ReactNode;
}) => {
	const { details } = item as ITrackItem;
	const { fps, isTransition, frame = 0 } = options;
	const { from, durationInFrames } = calculateFrames(
		{
			from: item.display.from,
			to: item.display.to,
		},
		fps,
	);
	const crop = details.crop || {
		x: 0,
		y: 0,
		width: item.details.width,
		height: item.details.height,
	};

	// Check if this text has ominous property for data attribute
	const isOminous = (details as any).ominous === true;
	
	// For text items, check if current frame is within the item's duration
	const isTextItem = item.type === "text";
	const isWithinDuration = frame >= from && frame < (from + durationInFrames);
	
	// Text items always render to preserve DOM state, but use opacity for visibility
	// Other items use normal Sequence behavior
	if (isTextItem) {
		return (
			<AbsoluteFill
				id={item.id}
				data-track-item="transition-element"
				data-ominous={isOminous ? "true" : "false"}
				className={`designcombo-scene-item id-${item.id} designcombo-scene-item-type-${item.type}${isOminous ? ' ominous-text' : ''}`}
				style={{
					...calculateContainerStyles(details, crop, {
						pointerEvents: item.type === "audio" ? "none" : "auto",
					}),
					opacity: isWithinDuration ? 1 : 0,
					pointerEvents: isWithinDuration ? "auto" : "none",
					// Apply ominous mix-blend-mode to the container for text items
					mixBlendMode: isOminous ? 'difference' : 'normal',
				}}
			>
				{children}
			</AbsoluteFill>
		);
	}
	
	// Original sequence behavior for non-text items
	return (
		<Sequence
			key={item.id}
			from={from}
			durationInFrames={durationInFrames || 1 / fps}
			style={{
				pointerEvents: "none",
			}}
		>
			<AbsoluteFill
				id={item.id}
				data-track-item="transition-element"
				data-ominous={isOminous ? "true" : "false"}
				className={`designcombo-scene-item id-${item.id} designcombo-scene-item-type-${item.type}${isOminous ? ' ominous-text' : ''}`}
				style={{
					...calculateContainerStyles(details, crop, {
						pointerEvents: item.type === "audio" ? "none" : "auto",
					}),
					// Apply ominous mix-blend-mode to the container
					mixBlendMode: isOminous ? 'difference' : 'normal',
				}}
			>
				{children}
			</AbsoluteFill>
		</Sequence>
	);
};
