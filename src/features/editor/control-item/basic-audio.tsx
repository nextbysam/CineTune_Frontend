import { ScrollArea } from "@/components/ui/scroll-area";
import { IAudio, ITrackItem } from "@designcombo/types";
import Volume from "./common/volume";
import Speed from "./common/speed";
import React, { useState } from "react";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT, LAYER_REPLACE } from "@designcombo/state";
import { Button } from "@/components/ui/button";

const BasicAudio = ({
	trackItem,
	type,
}: {
	trackItem: ITrackItem & IAudio;
	type?: string;
}) => {
	const showAll = !type;
	const [properties, setProperties] = useState(trackItem);

	// Track muted state - consider audio muted if volume is 0 and muted flag is set
	const isMuted =
		(properties.details as any).muted === true ||
		(properties.details.volume === 0 &&
			(properties.details as any).muted !== false);

	const handleChangeVolume = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						volume: v,
						// Clear muted flag when volume is manually changed
						muted: v === 0 ? true : false,
					},
				},
			},
		});

		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					volume: v,
					muted: v === 0 ? true : false,
				},
			};
		});
	};

	const handleMuteToggle = (muted: boolean) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						muted: muted,
					},
				},
			},
		});

		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					muted: muted,
				},
			};
		});
	};

	const handleChangeSpeed = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					playbackRate: v,
				},
			},
		});

		setProperties((prev) => {
			return {
				...prev,
				playbackRate: v,
			};
		});
	};

	const components = [
		{
			key: "speed",
			component: (
				<Speed
					value={properties.playbackRate ?? 1}
					onChange={handleChangeSpeed}
				/>
			),
		},
		{
			key: "volume",
			component: (
				<Volume
					onChange={(v: number) => handleChangeVolume(v)}
					value={properties.details.volume ?? 100}
					isMuted={isMuted}
					onMuteToggle={handleMuteToggle}
				/>
			),
		},
	];

	return (
		<div className="flex flex-1 flex-col">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
				Audio
			</div>
			<ScrollArea className="h-full">
				<div className="flex flex-col gap-2 px-4 py-4">
					{components
						.filter((comp) => showAll || comp.key === type)
						.map((comp) => (
							<React.Fragment key={comp.key}>{comp.component}</React.Fragment>
						))}
				</div>
			</ScrollArea>
		</div>
	);
};

export default BasicAudio;
