import { useEffect } from "react";
import { dispatch } from "@designcombo/events";
import { DESIGN_RESIZE } from "@designcombo/state";
import useStore from "../store/use-store";

export const useAutoComposition = () => {
	const { autoComposition, trackItemsMap } = useStore();

	// Get first video dimensions for auto composition
	const getFirstVideoDimensions = () => {
		const videoItems = Object.values(trackItemsMap).filter(
			(item) => item.type === "video",
		);

		if (videoItems.length > 0) {
			const firstVideo = videoItems[0];
			return {
				width: firstVideo.details.width,
				height: firstVideo.details.height,
			};
		}
		return null;
	};

	// Apply auto composition when enabled
	useEffect(() => {
		if (autoComposition) {
			const videoDimensions = getFirstVideoDimensions();
			if (videoDimensions) {
				console.log(
					"Auto composition: Resizing to video dimensions",
					videoDimensions,
				);
				dispatch(DESIGN_RESIZE, {
					payload: {
						width: videoDimensions.width,
						height: videoDimensions.height,
						name: "auto",
					},
				});
			} else {
				console.log("Auto composition: No video found in composition");
			}
		}
	}, [autoComposition, trackItemsMap]);

	return {
		getFirstVideoDimensions,
	};
};
