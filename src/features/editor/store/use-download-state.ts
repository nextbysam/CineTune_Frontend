import { IDesign } from "@designcombo/types";
import { create } from "zustand";
import useStore from "./use-store";
import { getUserSessionId } from "@/utils/session";
interface Output {
	url: string;
	type: string;
}

interface DownloadState {
	projectId: string;
	exporting: boolean;
	exportType: "json" | "mp4";
	progress: number;
	output?: Output;
	payload?: IDesign;
	displayProgressModal: boolean;
	actions: {
		setProjectId: (projectId: string) => void;
		setExporting: (exporting: boolean) => void;
		setExportType: (exportType: "json" | "mp4") => void;
		setProgress: (progress: number) => void;
		setState: (state: Partial<DownloadState>) => void;
		setOutput: (output: Output) => void;
		startExport: () => void;
		setDisplayProgressModal: (displayProgressModal: boolean) => void;
	};
}

//const baseUrl = "https://api.combo.sh/v1";

export const useDownloadState = create<DownloadState>((set, get) => ({
	projectId: "",
	exporting: false,
	exportType: "mp4",
	progress: 0,
	displayProgressModal: false,
	actions: {
		setProjectId: (projectId) => set({ projectId }),
		setExporting: (exporting) => set({ exporting }),
		setExportType: (exportType) => set({ exportType }),
		setProgress: (progress) => {
			console.log(`🎬 [CineTune Render] Progress: ${progress}%`);
			set({ progress });
		},
		setState: (state) => set({ ...state }),
		setOutput: (output) => set({ output }),
		setDisplayProgressModal: (displayProgressModal) =>
			set({ displayProgressModal }),
		startExport: async () => {
			try {
				console.log(`🚀 [CineTune Render] Starting export process...`);
				set({ exporting: true, displayProgressModal: true, progress: 0 });
				const { payload } = get();
				if (!payload) {
					console.error(`❌ [CineTune Render] Payload is not defined`);
					throw new Error("Payload is not defined");
				}

				console.log(`📋 [CineTune Render] Export payload:`, {
					id: payload.id,
					size: payload.size,
					fps: payload.fps || 30,
					duration: payload.duration,
					trackItemsCount: Array.isArray((payload as any).trackItems)
						? (payload as any).trackItems.length
						: Object.keys((payload as any).trackItemsMap || {}).length,
				});

				// Get current background from store
				const { background } = useStore.getState();

				// Get user session ID
				const sessionId = getUserSessionId();
				console.log(`🔑 [CineTune Render] Using session ID: ${sessionId}`);

				// Start async render
				console.log(
					`🌐 [CineTune Render] Starting async render via /api/render/start`,
				);
				const startTime = Date.now();
				const startRes = await fetch(`/api/render/start`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-cinetune-session": sessionId,
					},
					body: JSON.stringify({
						design: {
							id: payload.id,
							size: payload.size,
							fps: payload.fps || 30,
							duration: payload.duration,
							background: background,
							trackItems: Array.isArray((payload as any).trackItems)
								? (payload as any).trackItems
								: Object.values((payload as any).trackItemsMap || {}),
							tracks: (payload as any).tracks || [],
							transitionsMap: (payload as any).transitionsMap || {},
						},
					}),
				});

				if (!startRes.ok) {
					let info: any = {};
					try {
						info = await startRes.json();
					} catch (parseError) {
						console.error(
							`❌ [CineTune Render] Failed to parse error response:`,
							parseError,
						);
					}

					console.error(
						`❌ [CineTune Render] Start API call failed (${startRes.status}):`,
						info,
					);

					// Log detailed error information for debugging
					console.error(`❌ [CineTune Render] Detailed error info:`, {
						status: startRes.status,
						statusText: startRes.statusText,
						url: startRes.url,
						headers: Object.fromEntries(startRes.headers.entries()),
						body: info,
						timestamp: new Date().toISOString(),
					});

					throw new Error(
						info?.message ||
							`Render start failed with status ${startRes.status}`,
					);
				}

				const { renderId } = await startRes.json();
				console.log(`🔄 [CineTune Render] Render started with ID: ${renderId}`);

				// Poll for progress updates
				const pollInterval = setInterval(async () => {
					try {
						const progressRes = await fetch(`/api/render/start?id=${renderId}`);
						if (!progressRes.ok) {
							let errorInfo: any = {};
							try {
								errorInfo = await progressRes.json();
							} catch (parseError) {
								console.error(
									`❌ [CineTune Render] Failed to parse progress error response:`,
									parseError,
								);
							}

							console.error(
								`❌ [CineTune Render] Progress poll failed (${progressRes.status}):`,
								errorInfo,
							);

							// Log detailed progress poll error
							console.error(
								`❌ [CineTune Render] Progress poll error details:`,
								{
									status: progressRes.status,
									statusText: progressRes.statusText,
									url: progressRes.url,
									body: errorInfo,
									renderId: renderId,
									timestamp: new Date().toISOString(),
								},
							);
							return;
						}

						const progressData = await progressRes.json();
						console.log(`📊 [CineTune Render] Progress update:`, {
							status: progressData.status,
							progress: progressData.progress,
							elapsed: progressData.elapsed,
						});

						// Update progress
						if (progressData.progress !== undefined) {
							get().actions.setProgress(progressData.progress);
						}

						// Handle completion
						if (progressData.status === "completed") {
							clearInterval(pollInterval);

							const endTime = Date.now();
							const duration = (endTime - startTime) / 1000;

							console.log(
								`✅ [CineTune Render] Render completed successfully!`,
							);
							console.log(
								`⏱️ [CineTune Render] Total render time: ${duration.toFixed(2)} seconds`,
							);
							console.log(
								`🎥 [CineTune Render] Video URL: ${progressData.url}`,
							);

							get().actions.setProgress(100);
							set({
								exporting: false,
								output: { url: progressData.url, type: get().exportType },
							});
						}

						// Handle errors
						if (progressData.status === "error") {
							clearInterval(pollInterval);

							// Log comprehensive error information
							console.error(
								`❌ [CineTune Render] Render failed:`,
								progressData.error,
							);
							console.error(`❌ [CineTune Render] Server error details:`, {
								error: progressData.error,
								stderr: progressData.stderr,
								renderId: renderId,
								elapsed: progressData.elapsed,
								startTime: progressData.startTime,
								timestamp: new Date().toISOString(),
							});

							// Log stderr output if available (contains script errors)
							if (progressData.stderr) {
								console.error(
									`❌ [CineTune Render] Server stderr output:`,
									progressData.stderr,
								);
							}

							throw new Error(progressData.error || "Render failed");
						}
					} catch (pollError) {
						console.error(
							`❌ [CineTune Render] Progress polling failed:`,
							pollError,
						);
						// Continue polling unless it's a critical error
					}
				}, 1000); // Poll every second

				// Set timeout to prevent infinite polling
				setTimeout(() => {
					clearInterval(pollInterval);
					if (get().exporting) {
						console.error(
							`⏰ [CineTune Render] Render timeout after 10 minutes`,
						);
						set({ exporting: false, progress: 0 });
					}
				}, 600000); // 10 minute timeout
			} catch (error) {
				console.error(`💥 [CineTune Render] Export failed:`, error);
				console.error(`💥 [CineTune Render] Error details:`, {
					message: (error as Error)?.message,
					stack: (error as Error)?.stack,
					name: (error as Error)?.name,
				});
				set({ exporting: false, progress: 0 });
			}
		},
	},
}));
