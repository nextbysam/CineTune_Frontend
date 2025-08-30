import { IText } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { calculateTextStyles } from "../styles";
import MotionText from "../motion-text";
import { calculateFrames } from "../../utils/frames";

export default function Text({
	item,
	options,
}: {
	item: IText;
	options: SequenceItemOptions;
}) {
	const { handleTextChange, onTextBlur, fps, editableTextId } = options;
	const { id, details, animations } = item as IText;

	// Calculate frame bounds for animations
	const { from: itemStartFrame, durationInFrames } = calculateFrames(
		{
			from: item.display.from,
			to: item.display.to,
		},
		fps
	);
	const itemEndFrame = itemStartFrame + durationInFrames;

	// Extract animations from details
	const textAnimations = (details as any).animations;

	const children = (
		<MotionText
			key={id}
			id={id}
			content={details.text}
			editable={editableTextId === id}
			onChange={handleTextChange}
			onBlur={onTextBlur}
			style={calculateTextStyles(details)}
			animations={textAnimations}
			itemStartFrame={itemStartFrame}
			itemEndFrame={itemEndFrame}
		/>
	);
	return BaseSequence({ item, options, children });
}
