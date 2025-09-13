import { ScrollArea } from "@/components/ui/scroll-area";
import { IBoxShadow, ITrackItem, IVideo } from "@designcombo/types";
import Outline from "./common/outline";
import Shadow from "./common/shadow";
import Opacity from "./common/opacity";
import Rounded from "./common/radius";
import AspectRatio from "./common/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Crop } from "lucide-react";
import Volume from "./common/volume";
import React, { useEffect, useState } from "react";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT, ADD_TEXT } from "@designcombo/state";
import Speed from "./common/speed";
import useLayoutStore from "../store/use-layout-store";
import { Label } from "@/components/ui/label";
import Squantre from "./common/squantre";
import useStore from "../store/use-store";
import { generateId } from "@designcombo/timeline";

const BasicVideo = ({
	trackItem,
	type,
}: {
	trackItem: ITrackItem & IVideo;
	type?: string;
}) => {
	const showAll = !type;
	const [properties, setProperties] = useState(trackItem);
	const { setCropTarget } = useLayoutStore();
	const { size } = useStore(); // Get canvas/composition size

	// Track muted state - consider video muted if volume is 0 and muted flag is set
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
						...(v === 0 ? { muted: true } : { muted: false }),
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
					...(v === 0 ? { muted: true } : { muted: false }),
				},
			};
		});
	};

	const handleMuteToggle = (muted: boolean) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						...trackItem.details,
						muted: muted,
					} as any,
				},
			},
		});

		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					muted: muted,
				} as any,
			};
		});
	};

	const onChangeBorderWidth = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						borderWidth: v,
					},
				},
			},
		});
		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					borderWidth: v,
				},
			};
		});
	};

	const onChangeBorderColor = (v: string) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						borderColor: v,
					},
				},
			},
		});
		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					borderColor: v,
				},
			};
		});
	};

	const handleChangeOpacity = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						opacity: v,
					},
				},
			},
		});

		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					opacity: v,
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

	const onChangeBorderRadius = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						borderRadius: v,
					},
				},
			},
		});
		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					borderRadius: v,
				},
			};
		});
	};

	const onChangeBoxShadow = (v: IBoxShadow) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						boxShadow: v,
					},
				},
			},
		});
		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					boxShadow: v,
				},
			};
		});
	};

	const openCropModal = () => {
		setCropTarget(trackItem);
	};

	// Handle Squantre transformation - make video small rounded square in center with white background
	const handleSquantreToggle = (enabled: boolean) => {
		if (enabled) {
			// Calculate center position and small square dimensions
			const squareSize = Math.min(size.width, size.height) * 0.25; // 25% of smallest dimension
			const centerX = (size.width - squareSize) / 2;
			const centerY = (size.height - squareSize) / 2;

			// First, create a white background object that covers the entire composition
			const whiteBackgroundId = generateId();

			dispatch(ADD_TEXT, {
				payload: {
					id: whiteBackgroundId,
					type: "text",
					resourceId: `squantre-bg-track-${trackItem.id}`, // Use unique resourceId for proper layering
					display: {
						from: 0,
						to: properties.display?.to || 5000, // Match video duration
					},
					details: {
						// Use a simple space character
						text: " ",
						// Position to cover entire canvas
						left: 0,
						top: 0,
						width: size.width,
						height: size.height,
						// White background - this is the key property
						backgroundColor: "#ffffff",
						// Make text transparent
						color: "rgba(255, 255, 255, 0)",
						// Use a reasonable font size
						fontSize: size.height,
						fontFamily: "Arial",
						// Text alignment and layout
						textAlign: "left",
						lineHeight: "1",
						wordWrap: "normal",
						// Ensure no borders or shadows interfere
						borderWidth: 0,
						borderColor: "transparent",
						boxShadow: {
							color: "transparent",
							x: 0,
							y: 0,
							blur: 0,
						},
						// Opacity to ensure it's visible
						opacity: 100,
						// Mark this as a squantre background for cleanup
						squantreBackground: true,
						squantreVideoId: trackItem.id,
					},
				},
				options: {},
			});

			// Then transform the video to squantre mode
			dispatch(EDIT_OBJECT, {
				payload: {
					[trackItem.id]: {
						details: {
							// Position in center
							left: centerX,
							top: centerY,
							// Set to square dimensions
							width: squareSize,
							height: squareSize,
							// Make it rounded (50% for perfect circle/rounded square)
							borderRadius: 25,
							// Ensure video scales to fit the square
							transform: "none", // Reset any existing transforms
							objectFit: "cover", // Cover the square area
							squantre: true, // Custom property to track this state
							squantreBackgroundId: whiteBackgroundId, // Reference to background
						},
					},
				},
			});

			setProperties((prev) => ({
				...prev,
				details: {
					...prev.details,
					left: centerX,
					top: centerY,
					width: squareSize,
					height: squareSize,
					borderRadius: 25,
					transform: "none",
					objectFit: "cover",
					squantre: true,
					squantreBackgroundId: whiteBackgroundId,
				} as any,
			}));
		} else {
			// Remove white background first if it exists
			const backgroundId = (properties.details as any).squantreBackgroundId;
			if (backgroundId) {
				// Find and remove the background object from the timeline
				const { trackItemsMap } = useStore.getState();
				if (trackItemsMap[backgroundId]) {
					// Use EDIT_OBJECT with undefined to remove the item
					dispatch(EDIT_OBJECT, {
						payload: {
							[backgroundId]: undefined,
						},
					});
				}
			}

			// Reset video properties (remove Squantre effect)
			dispatch(EDIT_OBJECT, {
				payload: {
					[trackItem.id]: {
						details: {
							// Reset border radius
							borderRadius: 0,
							// Remove custom squantre flag
							squantre: false,
							// Reset object fit
							objectFit: "contain",
							// Remove background reference
							squantreBackgroundId: undefined,
							// You could store original dimensions and restore them here
							// For now, we'll leave width/height/position as-is so user can adjust
						},
					},
				},
			});

			setProperties((prev) => ({
				...prev,
				details: {
					...prev.details,
					borderRadius: 0,
					squantre: false,
					objectFit: "contain",
					squantreBackgroundId: undefined,
				} as any,
			}));
		}
	};

	useEffect(() => {
		setProperties(trackItem);
	}, [trackItem]);

	const components = [
		{
			key: "crop",
			component: (
				<div className="flex gap-2">
					<div className="flex flex-1 items-center text-sm text-muted-foreground">
						Crop
					</div>
					<Button
						onClick={openCropModal}
						variant="ghost"
						className="flex h-8 w-8 items-center justify-center p-0"
					>
						<Crop className="h-4 w-4" />
					</Button>
				</div>
			),
		},
		{
			key: "basic",
			component: (
				<div className="flex flex-col gap-2">
					<AspectRatio />
					<Volume
						onChange={(v: number) => handleChangeVolume(v)}
						value={properties.details.volume ?? 100}
						isMuted={isMuted}
						onMuteToggle={handleMuteToggle}
					/>
					<Opacity
						onChange={(v: number) => handleChangeOpacity(v)}
						value={properties.details.opacity ?? 100}
					/>
					<Speed
						value={properties.playbackRate ?? 1}
						onChange={handleChangeSpeed}
					/>
					<Squantre
						value={(properties.details as any).squantre ?? false}
						onChange={handleSquantreToggle}
					/>
					<Rounded
						onChange={(v: number) => onChangeBorderRadius(v)}
						value={properties.details.borderRadius as number}
					/>
				</div>
			),
		},

		{
			key: "outline",
			component: (
				<Outline
					onChageBorderWidth={(v: number) => onChangeBorderWidth(v)}
					onChangeBorderColor={(v: string) => onChangeBorderColor(v)}
					valueBorderWidth={properties.details.borderWidth as number}
					valueBorderColor={properties.details.borderColor as string}
					label="Outline"
				/>
			),
		},
		{
			key: "shadow",
			component: (
				<Shadow
					onChange={(v: IBoxShadow) => onChangeBoxShadow(v)}
					value={
						properties.details.boxShadow ?? {
							color: "transparent",
							x: 0,
							y: 0,
							blur: 0,
						}
					}
					label="Shadow"
				/>
			),
		},
	];

	return (
		<div className="flex flex-1 flex-col">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
				Video
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

export default BasicVideo;
