import { create } from "zustand";
import { persist } from "zustand/middleware";
import { processUpload, type UploadCallbacks } from "@/utils/upload-service";

interface UploadFile {
	id: string;
	file?: File;
	url?: string;
	type?: string;
	status?: 'pending' | 'uploading' | 'uploaded' | 'failed';
	progress?: number;
	error?: string;
	aRollType?: 'a-roll' | 'b-roll'; // NEW: distinguish A/B roll
	userId?: string; // NEW: user identification for Google Drive
	metadata?: {
		aRollType?: 'a-roll' | 'b-roll';
		userId?: string;
		uploadedAt?: string;
		thumbnailUrl?: string | null; // For video thumbnail display
		fileName?: string; // Original file name
		localUrl?: string; // Local URL for processing
		uploadedUrl?: string; // External URL after upload
		[key: string]: any; // Allow additional metadata
	};
}

interface IUploadStore {
	showUploadModal: boolean;
	setShowUploadModal: (showUploadModal: boolean) => void;
	uploadProgress: Record<string, number>;
	setUploadProgress: (uploadProgress: Record<string, number>) => void;
	uploadsVideos: any[];
	setUploadsVideos: (uploadsVideos: any[]) => void;
	uploadsAudios: any[];
	setUploadsAudios: (uploadsAudios: any[]) => void;
	uploadsImages: any[];
	setUploadsImages: (uploadsImages: any[]) => void;
	files: UploadFile[];
	setFiles: (
		files: UploadFile[] | ((prev: UploadFile[]) => UploadFile[]),
	) => void;

	pendingUploads: UploadFile[];
	addPendingUploads: (uploads: UploadFile[]) => void;
	clearPendingUploads: () => void;
	activeUploads: UploadFile[];
	processUploads: () => void;
	updateUploadProgress: (id: string, progress: number) => void;
	setUploadStatus: (id: string, status: UploadFile['status'], error?: string) => void;
	removeUpload: (id: string) => void;
	uploads: any[];
	setUploads: (uploads: any[] | ((prev: any[]) => any[])) => void;
}

const useUploadStore = create<IUploadStore>()(
	persist(
		(set, get) => ({
			showUploadModal: false,
			setShowUploadModal: (showUploadModal: boolean) => set({ showUploadModal }),

			uploadProgress: {},
			setUploadProgress: (uploadProgress: Record<string, number>) => set({ uploadProgress }),

			uploadsVideos: [],
			setUploadsVideos: (uploadsVideos: any[]) => set({ uploadsVideos }),

			uploadsAudios: [],
			setUploadsAudios: (uploadsAudios: any[]) => set({ uploadsAudios }),

			uploadsImages: [],
			setUploadsImages: (uploadsImages: any[]) => set({ uploadsImages }),

			files: [],
			setFiles: (files: UploadFile[] | ((prev: UploadFile[]) => UploadFile[])) =>
				set((state) => ({
					files:
						typeof files === "function"
							? (files as (prev: UploadFile[]) => UploadFile[])(state.files)
							: files,
				})),

			pendingUploads: [],
			addPendingUploads: (uploads: UploadFile[]) => {
				set((state) => ({
					pendingUploads: [...state.pendingUploads, ...uploads],
				}));
			},
			clearPendingUploads: () => set({ pendingUploads: [] }),

			activeUploads: [],
			processUploads: () => {
				const { pendingUploads, activeUploads, updateUploadProgress, setUploadStatus, removeUpload, setUploads } = get();
				
				// Move pending uploads to active with 'uploading' status
				if (pendingUploads.length > 0) {
					set((state) => ({
						activeUploads: [
							...state.activeUploads,
							...pendingUploads.map(u => ({ ...u, status: 'uploading' as const, progress: 0 })),
						],
						pendingUploads: [],
					}));
				}

				// Get updated activeUploads after moving pending ones
				const currentActiveUploads = get().activeUploads;
				
				const callbacks: UploadCallbacks = {
					onProgress: (uploadId, progress) => {
						console.log("progress", progress, uploadId);
						updateUploadProgress(uploadId, progress);
					},
					onStatus: (uploadId, status, error) => {
						setUploadStatus(uploadId, status, error);
						if (status === 'uploaded') {
							// Remove from active uploads after a delay to show final status
							setTimeout(() => removeUpload(uploadId), 3000);
						} else if (status === 'failed') {
							// Remove from active uploads after a delay to show final status
							setTimeout(() => removeUpload(uploadId), 3000);
						}
					},
				};

				console.log("activeUploads", currentActiveUploads);
				// Process all uploading items
				for (const upload of currentActiveUploads.filter(upload => upload.status === 'uploading')) {
					console.log("upload", upload);
					processUpload(upload.id, { file: upload.file, url: upload.url }, callbacks)
						.then((uploadData) => {
							// Add the complete upload data to the uploads array
							if (uploadData) {
								// Find the original upload data to preserve thumbnail and metadata
								const originalUpload = currentActiveUploads.find(u => u.id === upload.id);
								
								if (Array.isArray(uploadData)) {
									// URL uploads return an array - merge metadata for each item
									const enhancedUploads = uploadData.map(data => ({
										...data,
										aRollType: originalUpload?.aRollType,
										userId: originalUpload?.userId,
										metadata: {
											...data.metadata,
											...originalUpload?.metadata,
											aRollType: originalUpload?.aRollType,
											userId: originalUpload?.userId,
											thumbnailUrl: originalUpload?.metadata?.thumbnailUrl,
											fileName: originalUpload?.metadata?.fileName || data.fileName,
										},
									}));
									setUploads((prev) => [...prev, ...enhancedUploads]);
								} else {
									// File uploads return a single object - merge metadata
									const enhancedUpload = {
										...uploadData,
										aRollType: originalUpload?.aRollType,
										userId: originalUpload?.userId,
										metadata: {
											...uploadData.metadata,
											...originalUpload?.metadata,
											aRollType: originalUpload?.aRollType,
											userId: originalUpload?.userId,
											thumbnailUrl: originalUpload?.metadata?.thumbnailUrl,
											fileName: originalUpload?.metadata?.fileName || uploadData.fileName,
										},
									};
									setUploads((prev) => [...prev, enhancedUpload]);
								}
							}
						})
						.catch((error) => {
							console.error("Upload failed:", error);
						});
				}
			},
			updateUploadProgress: (id: string, progress: number) => set((state) => ({
				activeUploads: state.activeUploads.map(u => u.id === id ? { ...u, progress } : u),
			})),
			setUploadStatus: (id: string, status: UploadFile['status'], error?: string) => set((state) => ({
				activeUploads: state.activeUploads.map(u => u.id === id ? { ...u, status, error } : u),
			})),
			removeUpload: (id: string) => set((state) => ({
				activeUploads: state.activeUploads.filter(u => u.id !== id),
			})),
			uploads: [],
			setUploads: (uploads: any[] | ((prev: any[]) => any[])) =>
				set((state) => ({
					uploads:
						typeof uploads === "function"
							? (uploads as (prev: any[]) => any[])(state.uploads)
							: uploads,
				})),
		}),
		{
			name: 'upload-store',
			partialize: (state) => ({ 
				uploads: state.uploads.map(upload => ({
					...upload,
					metadata: upload.metadata ? {
						...upload.metadata,
						thumbnailUrl: undefined, // Don't persist large thumbnail data
						localUrl: upload.metadata.localUrl?.startsWith('blob:') ? undefined : upload.metadata.localUrl, // Filter out blob URLs
					} : undefined
				}))
			}),
		}
	)
);

export type { UploadFile };
export default useUploadStore;
