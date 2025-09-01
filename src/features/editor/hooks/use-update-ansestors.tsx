import { PlayerRef } from "@remotion/player";
import { RefObject, useEffect } from "react";
import useStore from "../store/use-store";
import { dispatch } from "@designcombo/events";
import { ENTER_EDIT_MODE } from "@designcombo/state";
import { getTargetById, getTypeFromClassName } from "../utils/target";

export default function useUpdateAnsestors({
	playing,
	playerRef,
}: {
	playing: boolean;
	playerRef: RefObject<PlayerRef> | null;
}) {
	const { trackItemIds, activeIds } = useStore();

	useEffect(() => {
		// Always update when trackItemIds change to ensure new vertical captions get styled
		updateAnsestorsPointerEvents();

		// Also run after a short delay to ensure DOM is fully updated
		const timeoutId = setTimeout(() => {
			updateAnsestorsPointerEvents();
		}, 100);

		return () => clearTimeout(timeoutId);
	}, [trackItemIds]);

	useEffect(() => {
		if (!playing) {
			updateAnsestorsPointerEvents();
		}
	}, [playing, activeIds]);

	// Ensure styling is always applied - add interval check for persistent styling
	useEffect(() => {
		// Initial application
		updateAnsestorsPointerEvents();

		// Set up interval to ensure styling persists (every 2 seconds)
		const intervalId = setInterval(() => {
			updateAnsestorsPointerEvents();
		}, 2000);

		// Add window focus and visibility change listeners with error handling
		const handleVisibilityChange = () => {
			try {
				if (!document.hidden) {
					// When tab becomes visible, reapply styling
					setTimeout(updateAnsestorsPointerEvents, 100);
				}
			} catch (error) {
				console.warn(`⚠️ Error in visibility change handler:`, error);
			}
		};

		const handleWindowFocus = () => {
			try {
				// When window gets focus, reapply styling
				setTimeout(updateAnsestorsPointerEvents, 100);
			} catch (error) {
				console.warn(`⚠️ Error in window focus handler:`, error);
			}
		};

		// Add global click listener to ensure styling persists after any click
		const handleGlobalClick = () => {
			try {
				setTimeout(updateAnsestorsPointerEvents, 50);
			} catch (error) {
				console.warn(`⚠️ Error in global click handler:`, error);
			}
		};

		// Add event listeners with error handling
		try {
			document.addEventListener("visibilitychange", handleVisibilityChange);
			window.addEventListener("focus", handleWindowFocus);
			document.addEventListener("click", handleGlobalClick, true); // Use capture phase
		} catch (error) {
			console.warn(`⚠️ Error adding global event listeners:`, error);
		}

		return () => {
			clearInterval(intervalId);

			// Remove event listeners with error handling
			try {
				document.removeEventListener(
					"visibilitychange",
					handleVisibilityChange,
				);
				window.removeEventListener("focus", handleWindowFocus);
				document.removeEventListener("click", handleGlobalClick, true);
			} catch (error) {
				console.warn(`⚠️ Error removing global event listeners:`, error);
			}
		};
	}, []);

	// Additional trigger for when playing state changes to true
	useEffect(() => {
		if (playing) {
			// Apply styling immediately when video starts playing
			updateAnsestorsPointerEvents();

			// Also apply after a short delay to ensure DOM is stable
			const timeoutId = setTimeout(() => {
				updateAnsestorsPointerEvents();
			}, 50);

			return () => clearTimeout(timeoutId);
		}
	}, [playing]);

	useEffect(() => {
		if (playerRef && playerRef.current) {
			const player = playerRef.current;

			try {
				// Add multiple event listeners to ensure styling persists
				const events = [
					"seeked",
					"play",
					"pause",
					"timeupdate",
					"loadeddata",
					"canplay",
				];
				const addedEvents: string[] = [];

				events.forEach((eventName) => {
					try {
						if (player && typeof player.addEventListener === "function") {
							player.addEventListener(
								eventName as any,
								updateAnsestorsPointerEvents,
							);
							addedEvents.push(eventName);
						}
					} catch (error) {
						console.warn(
							`⚠️ Failed to add event listener for ${eventName}:`,
							error,
						);
					}
				});

				// Also add DOM mutation observer to catch any DOM changes
				let observer: MutationObserver | null = null;
				try {
					observer = new MutationObserver(() => {
						// Debounce the mutation observer to avoid excessive calls
						setTimeout(updateAnsestorsPointerEvents, 100);
					});

					const playerContainer =
						player.getContainerNode && player.getContainerNode();
					if (playerContainer) {
						observer.observe(playerContainer, {
							childList: true,
							subtree: true,
							attributes: true,
							attributeFilter: ["style", "class"],
						});
					}
				} catch (error) {
					console.warn(`⚠️ Failed to set up mutation observer:`, error);
				}

				return () => {
					// Clean up event listeners
					addedEvents.forEach((eventName) => {
						try {
							if (player && typeof player.removeEventListener === "function") {
								player.removeEventListener(
									eventName as any,
									updateAnsestorsPointerEvents,
								);
							}
						} catch (error) {
							console.warn(
								`⚠️ Failed to remove event listener for ${eventName}:`,
								error,
							);
						}
					});

					// Clean up observer
					if (observer) {
						try {
							observer.disconnect();
						} catch (error) {
							console.warn(`⚠️ Failed to disconnect mutation observer:`, error);
						}
					}
				};
			} catch (error) {
				console.warn(`⚠️ Error setting up player event listeners:`, error);
			}
		}
	}, [playerRef]);

	useEffect(() => {
		if (activeIds.length !== 1) {
			dispatch(ENTER_EDIT_MODE, {
				payload: {
					id: null,
				},
			});
			return;
		}
		const element = getTargetById(activeIds[0]);
		if (!element) return;
		const handleDoubleClick = (e: MouseEvent) => {
			const type = getTypeFromClassName(element.className);
			if (type === "text") {
				dispatch(ENTER_EDIT_MODE, {
					payload: {
						id: activeIds[0],
					},
				});
				e.stopPropagation();
			}
		};
		element.addEventListener("dblclick", handleDoubleClick);
		return () => {
			element.removeEventListener("dblclick", handleDoubleClick);
		};
	}, [activeIds]);

	const updateAnsestorsPointerEvents = () => {
		try {
			const elements = document.querySelectorAll(
				'[data-track-item="transition-element"]',
			);

			elements.forEach((element) => {
				try {
					let currentElement = element;
					let outermostDiv = null;

					// Traverse up the DOM tree and collect the ancestors
					while (
						currentElement.parentElement?.className !== "__remotion-player"
					) {
						const parentElement = currentElement.parentElement;
						if (parentElement) {
							currentElement = parentElement;
							if (parentElement.style) {
								parentElement.style.pointerEvents = "none";
							}
							// Keep track of the outermost div (second div under __remotion-player)
							outermostDiv = parentElement;
							// if (parentElement.parentElement?.className !== "__remotion-player") {
							//   console.log("parentElement", parentElement);
							// }
						}
					}

					// Apply mix-blend-mode to the outermost div for ALL text elements with ominous=true
					if (
						outermostDiv &&
						element.classList &&
						element.classList.contains("designcombo-scene-item-type-text")
					) {
						// Check if this text has ominous=true for mix-blend-mode styling
						const itemId = element.id;
						const trackItem = trackItemIds.find((id) => id === itemId);
						let isOminous = false;
						let appliedMethod = "none";

						if (trackItem) {
							try {
								// Get the track item from store to check if it has ominous=true
								const storeState = useStore.getState();
								const item = storeState.trackItemsMap[trackItem];
								isOminous = item && (item.details as any).ominous === true;
								appliedMethod = "store";
							} catch (storeError) {
								console.warn(
									`⚠️ Error accessing store for ${itemId}:`,
									storeError,
								);
							}
						} else {
							// Fallback: check if element has ominous-related attributes
							try {
								const hasOminousAttribute =
									element.getAttribute("data-ominous") === "true";
								isOminous = hasOminousAttribute;
								appliedMethod = "fallback";

								if (!trackItem) {
									console.warn(
										`⚠️ Track item not found for element ${itemId}, using fallback detection`,
									);
								}
							} catch (fallbackError) {
								console.warn(
									`⚠️ Error in fallback detection for ${itemId}:`,
									fallbackError,
								);
							}
						}

						try {
							// Check current mix-blend-mode to see if it needs updating
							const currentBlendMode = outermostDiv.style.mixBlendMode;
							const targetBlendMode = isOminous ? "difference" : "normal";

							if (currentBlendMode !== targetBlendMode) {
								outermostDiv.style.mixBlendMode = targetBlendMode;

								if (isOminous) {
									const item = trackItem
										? useStore.getState().trackItemsMap[trackItem]
										: null;
									const text = item ? (item.details as any).text : "unknown";
									console.log(
										`🎭 Applied mix-blend-mode: difference to outermost div for ominous text "${text?.substring(0, 20)}..." (ID: ${itemId}, method: ${appliedMethod})`,
									);
								}
							}

							// Additional enforcement: Set important flag to prevent override
							if (isOminous) {
								outermostDiv.style.setProperty(
									"mix-blend-mode",
									"difference",
									"important",
								);
							} else {
								outermostDiv.style.setProperty(
									"mix-blend-mode",
									"normal",
									"important",
								);
							}
						} catch (styleError) {
							console.warn(
								`⚠️ Error applying styles for ${itemId}:`,
								styleError,
							);
						}
					}
				} catch (elementError) {
					console.warn(`⚠️ Error processing element:`, elementError);
				}
			});

			// Log summary
			try {
				const ominousCount = Array.from(elements).filter((el) => {
					try {
						const itemId = el.id;
						const trackItem = trackItemIds.find((id) => id === itemId);
						if (trackItem) {
							const storeState = useStore.getState();
							const item = storeState.trackItemsMap[trackItem];
							return item && (item.details as any).ominous === true;
						}
						return false;
					} catch (filterError) {
						return false;
					}
				}).length;
			} catch (summaryError) {
				console.warn(`⚠️ Error in summary logging:`, summaryError);
			}
		} catch (error) {
			console.warn(`⚠️ Error in updateAnsestorsPointerEvents:`, error);
		}
	};
}
