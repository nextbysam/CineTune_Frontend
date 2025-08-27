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
					trackItemsCount: Array.isArray((payload as any).trackItems) ? (payload as any).trackItems.length : Object.keys((payload as any).trackItemsMap || {}).length
				});

				// Get current background from store
				const { background } = useStore.getState();

				// Get user session ID
				const sessionId = getUserSessionId();
				console.log(`🔑 [CineTune Render] Using session ID: ${sessionId}`);

				// Simulate initial progress
				get().actions.setProgress(5);

				// Call local Remotion renderer
				console.log(`🌐 [CineTune Render] Calling API endpoint: /api/render/local`);
				const startTime = Date.now();
				const res = await fetch(`/api/render/local`, {
					method: "POST",
					headers: { 
						"Content-Type": "application/json",
						"x-cinetune-session": sessionId,
					},
					body: JSON.stringify({ design: {
						id: payload.id,
						size: payload.size,
						fps: payload.fps || 30,
						duration: payload.duration,
						background: background,
						trackItems: Array.isArray((payload as any).trackItems) ? (payload as any).trackItems : Object.values((payload as any).trackItemsMap || {}),
						tracks: (payload as any).tracks || [],
						transitionsMap: (payload as any).transitionsMap || {},
					}}),
				});

				if (!res.ok) {
					let info: any = {};
					try { info = await res.json(); } catch {}
					console.error(`❌ [CineTune Render] API call failed (${res.status}):`, info);
					console.error(`❌ [CineTune Render] Request details:`, {
						url: "/api/render/local",
						status: res.status,
						statusText: res.statusText,
						headers: Object.fromEntries(res.headers.entries())
					});
					throw new Error(info?.message || `Local render failed with status ${res.status}`);
				}

				get().actions.setProgress(95);
				const responseData = await res.json();
				const { url } = responseData;
				
				const endTime = Date.now();
				const duration = (endTime - startTime) / 1000;
				
				console.log(`✅ [CineTune Render] Render completed successfully!`);
				console.log(`⏱️ [CineTune Render] Total render time: ${duration.toFixed(2)} seconds`);
				console.log(`🎥 [CineTune Render] Video URL: ${url}`);
				console.log(`📊 [CineTune Render] Final response:`, responseData);
				
				get().actions.setProgress(100);
				set({ exporting: false, output: { url, type: get().exportType } });
			} catch (error) {
				console.error(`💥 [CineTune Render] Export failed:`, error);
				console.error(`💥 [CineTune Render] Error details:`, {
					message: (error as Error)?.message,
					stack: (error as Error)?.stack,
					name: (error as Error)?.name
				});
				set({ exporting: false, progress: 0 });
			}
		},
	},
}));
