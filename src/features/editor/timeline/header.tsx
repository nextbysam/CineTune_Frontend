import { Button } from "@/components/ui/button";
import { dispatch } from "@designcombo/events";
import { PLAYER_PAUSE, PLAYER_PLAY } from "../constants/events";
import { ACTIVE_SPLIT, LAYER_DELETE, EDIT_OBJECT } from "@designcombo/state";
import { TIMELINE_SCALE_CHANGED } from "../utils/timeline";
import { ITimelineScaleState } from "@designcombo/types";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import useStore from "../store/use-store";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import useUpdateAnsestors from "../hooks/use-update-ansestors";
import { useAutoComposition } from "../hooks/use-auto-composition";
import { frameToTimeString, timeToString } from "../utils/time";
import {
	getCurrentTime,
	getFitZoomLevel,
	getNextZoomLevel,
	getPreviousZoomLevel,
} from "../utils/timeline";
import { LayoutGrid, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect } from "react";

const IconPlayerPauseFilled = ({ size }: { size: number }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="currentColor"
		className="icon icon-tabler icons-tabler-filled icon-tabler-player-pause"
	>
		<path stroke="none" d="M0 0h24v24H0z" fill="none" />
		<path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
		<path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
	</svg>
);

const IconPlayerPlayFilled = ({ size }: { size: number }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="currentColor"
		className="icon icon-tabler icons-tabler-filled icon-tabler-player-play"
	>
		<path stroke="none" d="M0 0h24v24H0z" fill="none" />
		<path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" />
	</svg>
);

const IconPlayerSkipBack = ({ size }: { size: number }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className="icon icon-tabler icons-tabler-outline icon-tabler-player-skip-back"
	>
		<path stroke="none" d="M0 0h24v24H0z" fill="none" />
		<path d="M20 5v14l-12 -7z" />
		<path d="M4 5l0 14" />
	</svg>
);

const IconPlayerSkipForward = ({ size }: { size: number }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className="icon icon-tabler icons-tabler-outline icon-tabler-player-skip-forward"
	>
		<path stroke="none" d="M0 0h24v24H0z" fill="none" />

		<path d="M4 5v14l12 -7z" />
		<path d="M20 5l0 14" />
	</svg>
);
const Header = () => {
	const [playing, setPlaying] = useState(false);
	const {
		scale,
		setScale,
		duration,
		playerRef,
		fps,
		activeIds,
		autoComposition,
		setAutoComposition,
		trackItemsMap,
	} = useStore();
	const currentFrame = useCurrentPlayerFrame(playerRef);
	const isLargeScreen = useIsLargeScreen();
	const timelineOffsetX = useTimelineOffsetX();
	useUpdateAnsestors({ playing, playerRef });

	// Use auto composition hook
	useAutoComposition();

	// Get selected video items for mute functionality
	const selectedVideoItems = activeIds
		.map((id) => trackItemsMap[id])
		.filter((item) => item && (item.type === "video" || item.type === "audio"));

	// Check if any selected videos are muted
	const hasSelectedVideos = selectedVideoItems.length > 0;
	const selectedVideosMuted = selectedVideoItems.some(
		(item) =>
			(item.details as any)?.muted === true ||
			(item.details?.volume === 0 && (item.details as any)?.muted !== false),
	);

	const changeScale = (newScale: ITimelineScaleState) => {
		setScale(newScale);
		dispatch(TIMELINE_SCALE_CHANGED, {
			payload: newScale,
		});
	};

	const handlePlay = () => {
		dispatch(PLAYER_PLAY);
	};

	const handlePause = () => {
		dispatch(PLAYER_PAUSE);
	};

	const doActiveSplit = () => {
		dispatch(ACTIVE_SPLIT, {
			payload: {},
			options: {
				time: getCurrentTime(),
			},
		});
	};

	const doActiveDelete = () => {
		dispatch(LAYER_DELETE);
	};

	// Mute/unmute selected video items
	const handleMuteToggle = () => {
		if (!hasSelectedVideos) return;

		// If any are muted, unmute all. If all are unmuted, mute all.
		const shouldMute = !selectedVideosMuted;

		selectedVideoItems.forEach((item) => {
			dispatch(EDIT_OBJECT, {
				payload: {
					[item.id]: {
						details: {
							muted: shouldMute,
							// When unmuting, restore volume to 100 if it was 0
							...(shouldMute
								? { volume: 0 }
								: { volume: item.details?.volume || 100 }),
						},
					},
				},
			});
		});
	};

	// Auto composition logic
	const handleAutoCompositionToggle = () => {
		setAutoComposition(!autoComposition);
	};

	// Handle player play/pause events
	useEffect(() => {
		playerRef?.current?.addEventListener("play", () => {
			setPlaying(true);
		});
		playerRef?.current?.addEventListener("pause", () => {
			setPlaying(false);
		});
		return () => {
			playerRef?.current?.removeEventListener("play", () => {
				setPlaying(true);
			});
			playerRef?.current?.removeEventListener("pause", () => {
				setPlaying(false);
			});
		};
	}, [playerRef]);

	return (
		<div
			style={{
				position: "relative",
				height: "50px",
				display: "grid",
				gridTemplateColumns: "1fr 1fr 1fr",
				alignItems: "center",
				borderBottom: "1px solid rgb(30 30 30 / 1)",
				paddingLeft: timelineOffsetX,
			}}
		>
			<div className="flex items-center justify-start gap-4">
				<div className="flex items-center">
					<Button
						onClick={doActiveDelete}
						variant={"ghost"}
						size={"sm"}
						className="h-8 px-3"
					>
						<span className="hidden lg:block">Delete</span>
					</Button>
				</div>
				<div className="flex items-center">
					<Button
						onClick={doActiveSplit}
						variant={"ghost"}
						size={"sm"}
						className="h-8 px-3"
					>
						<span className="hidden lg:block">Clone</span>
					</Button>
				</div>
				{/* Mute/Unmute Button */}
				{hasSelectedVideos && (
					<div className="flex items-center">
						<Button
							onClick={handleMuteToggle}
							variant={selectedVideosMuted ? "default" : "ghost"}
							size={"sm"}
							className="h-8 px-3"
							title={
								selectedVideosMuted
									? "Unmute selected videos"
									: "Mute selected videos"
							}
						>
							<span className="hidden lg:block">
								{selectedVideosMuted ? "Unmute" : "Mute"}
							</span>
						</Button>
					</div>
				)}
			</div>

			<div className="flex items-center justify-center">
				<div>
					<Button
						className="hidden lg:inline-flex"
						onClick={doActiveDelete}
						variant={"ghost"}
						size={"icon"}
					>
						<IconPlayerSkipBack size={14} />
					</Button>
					<Button
						onClick={() => {
							if (playing) {
								return handlePause();
							}
							handlePlay();
						}}
						variant={"ghost"}
						size={"icon"}
					>
						{playing ? (
							<IconPlayerPauseFilled size={14} />
						) : (
							<IconPlayerPlayFilled size={14} />
						)}
					</Button>
					<Button
						className="hidden lg:inline-flex"
						onClick={doActiveSplit}
						variant={"ghost"}
						size={"icon"}
					>
						<IconPlayerSkipForward size={14} />
					</Button>
				</div>
				<div
					className="text-xs font-light flex"
					style={{
						alignItems: "center",
						gridTemplateColumns: "54px 4px 54px",
						paddingTop: "2px",
						justifyContent: "center",
					}}
				>
					<div
						className="font-medium text-zinc-200"
						style={{
							display: "flex",
							justifyContent: "center",
						}}
						data-current-time={currentFrame / fps}
						id="video-current-time"
					>
						{frameToTimeString({ frame: currentFrame }, { fps })}
					</div>
					<span className="px-1">|</span>
					<div
						className="text-muted-foreground hidden lg:block"
						style={{
							display: "flex",
							justifyContent: "center",
						}}
					>
						{timeToString({ time: duration })}
					</div>
				</div>
			</div>

			<div className="flex items-center justify-end gap-2">
				{/* Auto Composition Toggle Button */}
				<Button
					onClick={handleAutoCompositionToggle}
					variant={autoComposition ? "default" : "ghost"}
					size={"icon"}
					className="h-6 w-6"
					title={
						autoComposition
							? "Auto composition enabled"
							: "Auto composition disabled"
					}
				>
					<LayoutGrid size={14} />
				</Button>

				<ZoomControl
					scale={scale}
					onChangeTimelineScale={changeScale}
					duration={duration}
				/>
			</div>
		</div>
	);
};

const ZoomControl = ({
	scale,
	onChangeTimelineScale,
	duration,
}: {
	scale: ITimelineScaleState;
	onChangeTimelineScale: (scale: ITimelineScaleState) => void;
	duration: number;
}) => {
	const timelineOffsetX = useTimelineOffsetX();

	const handleZoomIn = () => {
		const nextZoom = getNextZoomLevel(scale);
		onChangeTimelineScale(nextZoom);
	};

	const handleZoomOut = () => {
		const prevZoom = getPreviousZoomLevel(scale);
		onChangeTimelineScale(prevZoom);
	};

	const handleZoomFit = () => {
		const fitZoom = getFitZoomLevel(duration, scale.zoom, timelineOffsetX);
		onChangeTimelineScale(fitZoom);
	};

	return (
		<div className="flex items-center gap-2">
			<Button
				onClick={handleZoomOut}
				variant={"ghost"}
				size={"icon"}
				className="h-6 w-6"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="lucide lucide-zoom-out"
				>
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.35-4.35" />
					<path d="M8 11h6" />
				</svg>
			</Button>
			<Button
				onClick={handleZoomFit}
				variant={"ghost"}
				size={"sm"}
				className="h-6 px-2 text-xs"
			>
				Fit
			</Button>
			<Button
				onClick={handleZoomIn}
				variant={"ghost"}
				size={"icon"}
				className="h-6 w-6"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="lucide lucide-zoom-in"
				>
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.35-4.35" />
					<path d="M11 8v6" />
					<path d="M8 11h6" />
				</svg>
			</Button>
		</div>
	);
};

export default Header;
