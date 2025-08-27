import { IAudio } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { Audio as RemotionAudio } from "remotion";

export default function Audio({
	item,
	options,
}: {
	item: IAudio;
	options: SequenceItemOptions;
}) {
	const { fps } = options;
	const { details } = item;
	const playbackRate = item.playbackRate || 1;

	// Calculate effective volume - if muted is true, volume should be 0
	const isMuted = (details as any).muted === true;
	const effectiveVolume = isMuted ? 0 : (details.volume || 0) / 100;

	const children = (
		<RemotionAudio
			startFrom={(item.trim?.from! / 1000) * fps}
			endAt={(item.trim?.to! / 1000) * fps || 1 / fps}
			playbackRate={playbackRate}
			src={details.src}
			volume={effectiveVolume}
		/>
	);
	return BaseSequence({ item, options, children });
}
