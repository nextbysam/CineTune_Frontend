import { IDesign } from "@designcombo/types";
import { create } from "zustand";
import useStore from "./use-store";
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
		setProgress: (progress) => set({ progress }),
		setState: (state) => set({ ...state }),
		setOutput: (output) => set({ output }),
		setDisplayProgressModal: (displayProgressModal) =>
			set({ displayProgressModal }),
		startExport: async () => {
			try {
				set({ exporting: true, displayProgressModal: true });
				const { payload } = get();
				if (!payload) throw new Error("Payload is not defined");

				// Get current background from store
				const { background } = useStore.getState();

				// Call local Remotion renderer
				const res = await fetch(`/api/render/local`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
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
					console.error("/api/render/local failed:", info);
					throw new Error(info?.message || "Local render failed");
				}

				const { url } = await res.json();
				set({ exporting: false, output: { url, type: get().exportType } });
			} catch (error) {
				console.error(error);
				set({ exporting: false });
			}
		},
	},
}));
