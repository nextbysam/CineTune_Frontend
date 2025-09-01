import { useEffect, useRef, memo, useMemo } from "react";
import Composition from "./composition";
import { Player as RemotionPlayer, PlayerRef } from "@remotion/player";
import useStore from "../store/use-store";

const Player = memo(() => {
	const playerRef = useRef<PlayerRef>(null);
	const { setPlayerRef, duration, fps, size, background } = useStore();

	useEffect(() => {
		setPlayerRef(playerRef as React.RefObject<PlayerRef>);
	}, [setPlayerRef]);

	// Memoize computed values
	const durationInFrames = useMemo(
		() => Math.round((duration / 1000) * fps) || 1,
		[duration, fps],
	);
	const backgroundClass = useMemo(
		() => `h-full w-full bg-[${background.value}]`,
		[background.value],
	);

	return (
		<RemotionPlayer
			ref={playerRef}
			component={Composition}
			durationInFrames={durationInFrames}
			compositionWidth={size.width}
			compositionHeight={size.height}
			className={backgroundClass}
			fps={30}
			overflowVisible
		/>
	);
});

Player.displayName = "Player";

export default Player;
