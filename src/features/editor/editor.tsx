"use client";
import {
	useEffect,
	useRef,
	useState,
	useMemo,
	useCallback,
	lazy,
	Suspense,
} from "react";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import useStore from "./store/use-store";
import Navbar from "./navbar";
import useTimelineEvents from "./hooks/use-timeline-events";
import { SceneRef } from "./scene/scene.types";
import StateManager, { DESIGN_LOAD } from "@designcombo/state";
import { getCompactFontData, loadFonts } from "./utils/fonts";
import { SECONDARY_FONT, SECONDARY_FONT_URL } from "./constants/constants";
import { createCompactFontsFromLocal } from "./utils/local-fonts";
import useDataState from "./store/use-data-state";
import { FONTS } from "./data/fonts";
import { useSceneStore } from "@/store/use-scene-store";
import { dispatch } from "@designcombo/events";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { ITrackItem } from "@designcombo/types";
import useLayoutStore from "./store/use-layout-store";
import { DemoButton } from "@/components/ui/demo-button";
import { useTourStore } from "./tour/tour-store";
import { TourOverlay } from "./tour/tour-overlay";

// Lazy load heavy components for better initial load performance
const Timeline = lazy(() => import("./timeline"));
const Scene = lazy(() => import("./scene"));
const MenuList = lazy(() => import("./menu-list"));
const MenuItem = lazy(() =>
	import("./menu-item").then((m) => ({ default: m.MenuItem })),
);
const ControlItem = lazy(() =>
	import("./control-item").then((m) => ({ default: m.ControlItem })),
);
const CropModal = lazy(() => import("./crop-modal/crop-modal"));
const MenuListHorizontal = lazy(() => import("./menu-list-horizontal"));
const ControlItemHorizontal = lazy(() => import("./control-item-horizontal"));

const stateManager = new StateManager({
	size: {
		width: 1080,
		height: 1920,
	},
});

const Editor = ({ tempId, id }: { tempId?: string; id?: string }) => {
	const [projectName, setProjectName] = useState<string>("Untitled video");
	const { scene } = useSceneStore();
	const timelinePanelRef = useRef<ImperativePanelHandle>(null);
	const sceneRef = useRef<SceneRef>(null);
	const { timeline, playerRef } = useStore();
	const { activeIds, trackItemsMap, transitionsMap } = useStore();
	const [loaded, setLoaded] = useState(false);
	const [trackItem, setTrackItem] = useState<ITrackItem | null>(null);
	const {
		setTrackItem: setLayoutTrackItem,
		setFloatingControl,
		setLabelControlItem,
		setTypeControlItem,
	} = useLayoutStore();
	const isLargeScreen = useIsLargeScreen();
	const { isActive, currentStep, tourSteps, startTour, endTour } =
		useTourStore();
	const layoutStore = useLayoutStore;

	useTimelineEvents();

	const { setCompactFonts, setFonts } = useDataState();

	useEffect(() => {
		if (tempId) {
			const fetchVideoJson = async () => {
				try {
					const response = await fetch(
						`https://scheme.combo.sh/video-json/${id}`,
					);
					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}
					const data = await response.json();

					const payload = data.videoJson.json;
					if (payload) {
						dispatch(DESIGN_LOAD, { payload });
					}
				} catch (error) {
					console.error("Error fetching video JSON:", error);
				}
			};
			fetchVideoJson();
		}

		if (id) {
			const fetchSceneById = async () => {
				try {
					const response = await fetch(`/api/scene/${id}`);
					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}
					const data = await response.json();
					console.log("Fetched scene data:", data);

					if (data.success && data.scene) {
						// Set project name if available
						if (data.project?.name) {
							setProjectName(data.project.name);
						}

						// Load the scene content into the editor
						if (data.scene.content) {
							dispatch(DESIGN_LOAD, { payload: data.scene.content });
						}
					} else {
						console.error("Failed to fetch scene:", data.error);
					}
				} catch (error) {
					console.error("Error fetching scene by ID:", error);
				}
			};
			fetchSceneById();
		}
	}, [id, tempId]);

	useEffect(() => {
		console.log("scene", scene);
		console.log("timeline", timeline);
		if (scene && timeline) {
			console.log("scene", scene);
			dispatch(DESIGN_LOAD, { payload: scene });
		}
	}, [scene, timeline]);

	// Memoize font processing to prevent recalculation
	const fontsData = useMemo(() => {
		const localCompactFonts = createCompactFontsFromLocal();
		const existingCompactFonts = getCompactFontData(FONTS);
		const allCompactFonts = [...localCompactFonts, ...existingCompactFonts];
		const allFonts = allCompactFonts.flatMap(
			(compactFont) => compactFont.styles,
		);
		return { allCompactFonts, allFonts };
	}, []);

	useEffect(() => {
		setCompactFonts(fontsData.allCompactFonts);
		setFonts([...FONTS, ...fontsData.allFonts]);
	}, [fontsData, setCompactFonts, setFonts]);

	useEffect(() => {
		loadFonts([
			{
				name: SECONDARY_FONT,
				url: SECONDARY_FONT_URL,
			},
		]);
	}, []);

	useEffect(() => {
		const screenHeight = window.innerHeight;
		const desiredHeight = 300;
		const percentage = (desiredHeight / screenHeight) * 100;
		timelinePanelRef.current?.resize(percentage);
	}, []);

	const handleTimelineResize = useCallback(() => {
		const timelineContainer = document.getElementById("timeline-container");
		if (!timelineContainer) return;

		timeline?.resize(
			{
				height: timelineContainer.clientHeight - 90,
				width: timelineContainer.clientWidth - 40,
			},
			{
				force: true,
			},
		);

		// Use requestAnimationFrame for better performance than setTimeout
		requestAnimationFrame(() => {
			sceneRef.current?.recalculateZoom();
		});
	}, [timeline]);

	useEffect(() => {
		const onResize = () => handleTimelineResize();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [timeline]);

	useEffect(() => {
		if (activeIds.length === 1) {
			const [id] = activeIds;
			const trackItem = trackItemsMap[id];
			if (trackItem) {
				setTrackItem(trackItem);
				setLayoutTrackItem(trackItem);
			} else console.log(transitionsMap[id]);
		} else {
			setTrackItem(null);
			setLayoutTrackItem(null);
		}
	}, [activeIds, trackItemsMap]);

	useEffect(() => {
		setFloatingControl("");
		setLabelControlItem("");
		setTypeControlItem("");
	}, [isLargeScreen]);

	useEffect(() => {
		setLoaded(true);
		// Make layout store available to tour system
		(window as any).__tourLayoutStore = layoutStore;
	}, [layoutStore]);

	return (
		<div className="flex h-screen w-screen flex-col">
			<div data-tour="navbar">
				<Navbar
					projectName={projectName}
					user={null}
					stateManager={stateManager}
					setProjectName={setProjectName}
				/>
			</div>
			<div className="flex flex-1">
				{isLargeScreen && (
					<div
						data-tour="menu"
						className="bg-muted  flex flex-none border-r border-border/80 h-[calc(100vh-44px)]"
					>
						<Suspense
							fallback={<div className="w-60 bg-muted animate-pulse" />}
						>
							<MenuList />
							<MenuItem />
						</Suspense>
					</div>
				)}
				<ResizablePanelGroup style={{ flex: 1 }} direction="vertical">
					<ResizablePanel className="relative" defaultSize={70}>
						<div className="flex h-full flex-1">
							<div
								data-tour="scene"
								style={{
									width: "100%",
									height: "100%",
									position: "relative",
									flex: 1,
									overflow: "hidden",
								}}
							>
								<Suspense
									fallback={
										<div className="absolute inset-0 bg-black animate-pulse" />
									}
								>
									<CropModal />
									<Scene ref={sceneRef} stateManager={stateManager} />
								</Suspense>
							</div>
						</div>
					</ResizablePanel>
					<ResizableHandle />
					<ResizablePanel
						className="min-h-[50px]"
						ref={timelinePanelRef}
						defaultSize={30}
						onResize={handleTimelineResize}
						data-tour="timeline"
					>
						{playerRef && (
							<Suspense
								fallback={<div className="h-full bg-muted animate-pulse" />}
							>
								<Timeline stateManager={stateManager} />
							</Suspense>
						)}
					</ResizablePanel>
					{!isLargeScreen && !trackItem && loaded && (
						<Suspense
							fallback={<div className="h-20 bg-muted animate-pulse" />}
						>
							<MenuListHorizontal />
						</Suspense>
					)}
					{!isLargeScreen && trackItem && (
						<Suspense
							fallback={<div className="h-20 bg-muted animate-pulse" />}
						>
							<ControlItemHorizontal />
						</Suspense>
					)}
				</ResizablePanelGroup>
				<div data-tour="controls">
					<Suspense fallback={<div className="w-80 bg-muted animate-pulse" />}>
						<ControlItem />
					</Suspense>
				</div>
			</div>

			{/* Tour System */}
			<DemoButton
				onStartTour={startTour}
				isTourActive={isActive}
				onEndTour={endTour}
			/>

			{isActive && tourSteps[currentStep] && (
				<TourOverlay
					step={tourSteps[currentStep]}
					stepNumber={currentStep}
					totalSteps={tourSteps.length}
				/>
			)}
		</div>
	);
};

export default Editor;
