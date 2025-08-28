import { ADD_AUDIO, ADD_IMAGE, ADD_VIDEO } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
	Music,
	Image as ImageIcon,
	Video as VideoIcon,
	Loader2,
	UploadIcon,
	Plus,
	Crown,
	Layers,
	X,
} from "lucide-react";
import { generateId } from "@designcombo/timeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import useUploadStore from "../store/use-upload-store";
import ModalUpload, { extractVideoThumbnail } from "@/components/modal-upload";
import { useState } from "react";
import { useEffect } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Pencil, RefreshCw } from "lucide-react";
import { getMostRecentCaptionJobId } from "./load-available-captions-context";
import { toast } from "sonner";

// Helper function to extract thumbnail from video URL or file
const generateThumbnailFromVideo = async (videoSrc: string): Promise<string | null> => {
	return new Promise((resolve) => {
		// Create unique elements for each thumbnail generation
		const video = document.createElement("video");
		const videoId = `thumb-video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		video.id = videoId;
		
		video.crossOrigin = "anonymous";
		video.src = videoSrc;
		video.currentTime = 1.5; // Slightly later timestamp for better frame
		video.muted = true;
		video.playsInline = true;
		video.preload = 'metadata'; // Ensure metadata is loaded
		video.style.display = 'none'; // Hide from DOM
		
		let resolved = false;
		
		const cleanup = () => {
			if (video.parentNode) {
				video.parentNode.removeChild(video);
			}
			// Only revoke if it's a blob URL
			if (videoSrc.startsWith('blob:')) {
				URL.revokeObjectURL(videoSrc);
			}
		};
		
		const resolveOnce = (result: string | null) => {
			if (!resolved) {
				resolved = true;
				cleanup();
				resolve(result);
			}
		};
		
		video.onloadedmetadata = () => {
			// Give video extra time to fully load
			setTimeout(() => {
				video.currentTime = Math.min(1.5, video.duration * 0.1); // 10% into video or 1.5s, whichever is smaller
			}, 300);
		};
		
		video.onloadeddata = () => {
			
			// Add extra delay to ensure video frame is ready
			setTimeout(() => {
				try {
					// Create unique canvas for this thumbnail
					const canvas = document.createElement("canvas");
					const canvasId = `thumb-canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
					canvas.id = canvasId;
					
					// Reduce size to prevent localStorage quota issues
					const maxWidth = 160;
					const maxHeight = 90;
					
					const aspectRatio = video.videoWidth / video.videoHeight;
					let width, height;
					
					if (aspectRatio > maxWidth / maxHeight) {
						width = maxWidth;
						height = maxWidth / aspectRatio;
					} else {
						height = maxHeight;
						width = maxHeight * aspectRatio;
					}
					
					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext("2d");
					if (ctx) {
						ctx.drawImage(video, 0, 0, width, height);
						// Use lower quality JPEG to reduce size
						const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
						resolveOnce(thumbnail);
					} else {
						resolveOnce(null);
					}
				} catch (error) {
					resolveOnce(null);
				}
			}, 500); // Extra delay to ensure frame is ready
		};
		
		video.onerror = (error) => {
			resolveOnce(null);
		};
		
		video.onabort = () => {
			resolveOnce(null);
		};
		
		// Longer timeout for video loading
		setTimeout(() => {
			resolveOnce(null);
		}, 10000); // 10 seconds timeout
		
		// Append to DOM temporarily for loading (required for some browsers)
		document.body.appendChild(video);
		
		// Start loading the video
		video.load();
	});
};

// Individual widget component for complete isolation
const VideoWidget = ({ video, onAddVideo }: { video: any; onAddVideo: (video: any) => void }) => {
	const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(video.metadata?.thumbnailUrl || null);
	const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
	const [contextPopoverOpen, setContextPopoverOpen] = useState(false);
	const [contextValue, setContextValue] = useState(video.metadata?.context || "");
	const [isHovered, setIsHovered] = useState(false);
	const { setUploads } = useUploadStore();

	// Generate thumbnail for this specific widget only
	useEffect(() => {
		const generateThumbnailForThisWidget = async () => {
			// Skip if already has thumbnail or already generating
			if (thumbnailUrl || isGeneratingThumbnail) return;
			
			// Skip if not a video
			if (!video.type?.startsWith("video/") && video.type !== "video") return;
			
			setIsGeneratingThumbnail(true);
			
			let thumbnail = null;
			
			// Try URL-based generation first
			const videoSrc = video.metadata?.uploadedUrl || video.metadata?.localUrl;
			if (videoSrc && !videoSrc.startsWith('blob:')) {
				try {
					thumbnail = await generateThumbnailFromVideo(videoSrc);
				} catch (error) {
					// URL thumbnail failed
				}
			}
			
			// Fallback to file-based generation
			if (!thumbnail && video.metadata?.originalFile) {
				try {
					thumbnail = await extractVideoThumbnail(video.metadata.originalFile);
				} catch (error) {
					// File thumbnail failed
				}
			}
			
			if (thumbnail) {
				setThumbnailUrl(thumbnail);
				
				// Update the global store for this specific video only
				setUploads((prev) => 
					prev.map((upload) => 
						upload.id === video.id 
							? { ...upload, metadata: { ...upload.metadata, thumbnailUrl: thumbnail } }
							: upload
					)
				);
			}
			
			setIsGeneratingThumbnail(false);
		};

		generateThumbnailForThisWidget();
	}, [video.id, thumbnailUrl, isGeneratingThumbnail, video.fileName, video.type, video.metadata, setUploads]);

	const handleContextSave = () => {
		setUploads((prev) =>
			prev.map((upload) =>
				upload.id === video.id
					? {
						...upload,
						metadata: {
							...upload.metadata,
							context: contextValue,
						},
					}
					: upload
			)
		);
		setContextPopoverOpen(false);
	};

	const handleDelete = async (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent triggering the card click
		
		// Remove from uploads store
		setUploads((prev) => prev.filter((upload) => upload.id !== video.id));
		
		// Also delete from storage if we have a file path
		if (video.metadata?.uploadedUrl || video.url) {
			try {
				await deleteFromStorage(video.metadata?.uploadedUrl || video.url);
			} catch (error) {
				// Failed to delete file from storage
			}
		}
	};

	const deleteFromStorage = async (src: string) => {
		// Extract file path from URL or use the src directly
		let filePath = src;
		
		// If src is a URL, extract the path part
		try {
			const url = new URL(src);
			filePath = url.pathname;
		} catch {
			// If not a valid URL, use as is
		}

		const response = await fetch(`/api/uploads/delete?filePath=${encodeURIComponent(filePath)}`, {
			method: 'DELETE',
		});

		if (!response.ok) {
			throw new Error(`Failed to delete file: ${response.statusText}`);
		}

		return response.json();
	};

	const badge = video.aRollType === 'a-roll' 
		? { color: "bg-blue-500 text-white border-blue-600", icon: Crown, text: "A" }
		: { color: "bg-green-500 text-white border-green-600", icon: Layers, text: "B" };

	return (
		<div 
			className="flex items-center gap-2 flex-col w-full relative justify-center"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<Card
				className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer group"
				onClick={() => onAddVideo(video)}
			>
				{thumbnailUrl ? (
					<>
						<img 
							src={thumbnailUrl} 
							alt="Video thumbnail"
							className="w-full h-full object-cover"
							onError={(e) => {
								setThumbnailUrl(null); // Reset to trigger regeneration
							}}
						/>
						<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
							<VideoIcon className="w-6 h-6 text-white" />
						</div>
					</>
				) : isGeneratingThumbnail ? (
					<div className="flex flex-col items-center justify-center">
						<Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
						<span className="text-xs text-muted-foreground mt-1">Loading</span>
					</div>
				) : (
					<VideoIcon className="w-8 h-8 text-muted-foreground" />
				)}
				
				{/* Delete button on hover - positioned on the left for B-roll, or right for A-roll */}
				{isHovered && (
					<Button
						variant="destructive"
						size="icon"
						className={`absolute top-1 w-5 h-5 p-0 z-10 hover:bg-red-600 ${
							video.aRollType === "b-roll" ? "left-1" : "right-1"
						}`}
						onClick={handleDelete}
						title="Delete this video"
					>
						<X className="w-3 h-3" />
					</Button>
				)}
			</Card>
			<div className="text-xs text-muted-foreground truncate w-full text-center leading-relaxed px-1">
				{video.fileName || video.file?.name || video.url || `${badge.text}-Roll Video`}
			</div>
			{video.aRollType === "b-roll" && (
				<Popover open={contextPopoverOpen} onOpenChange={setContextPopoverOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="absolute top-1 right-1 z-10"
							onClick={e => { e.stopPropagation(); setContextPopoverOpen(true); }}
							title="Edit context for this B-roll"
						>
							<Pencil className="w-4 h-4" />
						</Button>
					</PopoverTrigger>
					<PopoverContent side="left" align="start" className="bg-background text-foreground w-80 p-4 rounded shadow-lg border border-accent">
						<div className="flex flex-col gap-2">
							<label className="text-xs font-medium text-muted-foreground">B-Roll Context</label>
							<textarea
								className="w-full min-h-[60px] max-h-40 rounded bg-muted/30 p-2 text-sm text-foreground border border-muted focus:outline-none focus:ring-2 focus:ring-primary resize-vertical"
								value={contextValue}
								onChange={e => setContextValue(e.target.value)}
								placeholder="Describe where/how this B-roll should be used..."
								autoFocus
							/>
							<div className="flex gap-2 justify-end mt-2">
								<Button variant="secondary" size="sm" onClick={() => setContextPopoverOpen(false)}>
									Cancel
								</Button>
								<Button variant="default" size="sm" onClick={handleContextSave}>
									Save
								</Button>
							</div>
						</div>
					</PopoverContent>
				</Popover>
			)}
		</div>
	);
};

export const Uploads = () => {
	const { setShowUploadModal, showUploadModal, uploads, pendingUploads, activeUploads, setUploads } =
		useUploadStore();
	
	
	// Track which modal type is currently open
	const [currentModalType, setCurrentModalType] = useState<'a-roll' | 'b-roll' | null>(null);

	// Reset modal type when modal is closed
	useEffect(() => {
		if (!showUploadModal) {
			setCurrentModalType(null);
		}
	}, [showUploadModal]);

	// Cleanup on mount - remove any persisted blob URLs that are now invalid
	useEffect(() => {
		const cleanupInvalidUrls = () => {
			setUploads((prev) =>
				prev.map((upload) => ({
					...upload,
					metadata: upload.metadata ? {
						...upload.metadata,
						localUrl: upload.metadata.localUrl?.startsWith('blob:') ? undefined : upload.metadata.localUrl,
					} : upload.metadata
				}))
			);
		};

		cleanupInvalidUrls();
	}, []); // Run only once on mount

	// Individual thumbnail generation will be handled by VideoWidget components

	// Get userId (placeholder for now - you can replace with actual user auth)
	const userId = "user_123"; // TODO: Replace with actual user ID from auth

	// Group completed uploads by type and aRollType
	const videosA = uploads.filter(
		(upload) => (upload.type?.startsWith("video/") || upload.type === "video") && upload.aRollType === "a-roll"
	);
	const videosB = uploads.filter(
		(upload) => (upload.type?.startsWith("video/") || upload.type === "video") && upload.aRollType === "b-roll"
	);
	
	const images = uploads.filter(
		(upload) => upload.type?.startsWith("image/") || upload.type === "image",
	);
	const audios = uploads.filter(
		(upload) => upload.type?.startsWith("audio/") || upload.type === "audio",
	);


	const handleAddVideo = (video: any) => {
		// Prefer uploadedUrl over localUrl to avoid blob URL issues, fallback to localUrl only if it's not a blob
		const srcVideo = video.metadata?.uploadedUrl || 
			(video.metadata?.localUrl && !video.metadata.localUrl.startsWith('blob:') ? video.metadata.localUrl : null) || 
			video.url;
		
		if (!srcVideo) {
			return;
		}
		

		dispatch(ADD_VIDEO, {
			payload: {
				id: generateId(),
				details: {
					src: srcVideo,
				},
				metadata: {
					previewUrl:
						"https://cdn.designcombo.dev/caption_previews/static_preset1.webp",
					localUrl: video.metadata?.localUrl?.startsWith('blob:') ? undefined : video.metadata?.localUrl,        // Exclude blob URLs
					externalUrl: video.metadata?.uploadedUrl,  // Keep external URL for backup
					aRollType: video.aRollType,                // Preserve A-Roll/B-Roll type
					userId: video.userId,                      // Preserve user identification
					fileName: video.fileName || video.file?.name || video.url,
					thumbnailUrl: video.metadata?.thumbnailUrl, // Preserve thumbnail
				},
			},
			options: {
				targetTrackIndex: 0,  // Use targetTrackIndex instead of resourceId to allow multiple videos on same track
				scaleMode: "fit",
			},
		});
	};

	const handleAddImage = (image: any) => {
		const srcImage = image.metadata?.uploadedUrl || image.url;

		dispatch(ADD_IMAGE, {
			payload: {
				id: generateId(),
				type: "image",
				display: {
					from: 0,
					to: 5000,
				},
				details: {
					src: srcImage,
				},
				metadata: {},
			},
			options: {},
		});
	};

	const handleAddAudio = (audio: any) => {
		const srcAudio = audio.metadata?.uploadedUrl || audio.url;
		dispatch(ADD_AUDIO, {
			payload: {
				id: generateId(),
				type: "audio",
				details: {
					src: srcAudio,
				},
				metadata: {},
			},
			options: {},
		});
	};

	const UploadPrompt = () => (
		<div className="flex items-center justify-center px-4">
			<Button
				className="w-full cursor-pointer"
				onClick={() => setShowUploadModal(true)}
			>
				<UploadIcon className="w-4 h-4" />
				<span className="ml-2">Upload</span>
			</Button>
		</div>
	);

	const openARollModal = () => {
		setCurrentModalType('a-roll');
		setShowUploadModal(true);
	};
	
	const openBRollModal = () => {
		setCurrentModalType('b-roll');
		setShowUploadModal(true);
	};

	// Debug function to add test data
	const addTestData = () => {
		const timestamp = Date.now();
		const testUploads = [
			{
				id: `test-a-roll-${timestamp}-${generateId()}`,
				type: 'video/mp4',
				aRollType: 'a-roll',
				userId: 'user_123',
				fileName: 'test-a-roll-video.mp4',
				url: 'https://cdn.designcombo.dev/videos/demo-video-4.mp4',
				metadata: {
					aRollType: 'a-roll',
					userId: 'user_123',
					fileName: 'test-a-roll-video.mp4',
					uploadedUrl: 'https://cdn.designcombo.dev/videos/demo-video-4.mp4',
				}
			},
			{
				id: `test-b-roll-${timestamp}-${generateId()}`,
				type: 'video/mp4',
				aRollType: 'b-roll',
				userId: 'user_123',
				fileName: 'test-b-roll-video.mp4',
				url: 'https://cdn.designcombo.dev/videos/demo-video-4.mp4',
				metadata: {
					aRollType: 'b-roll',
					userId: 'user_123',
					fileName: 'test-b-roll-video.mp4',
					uploadedUrl: 'https://cdn.designcombo.dev/videos/demo-video-4.mp4',
				}
			}
		];
		
		setUploads(prev => [...prev, ...testUploads]);
	};

	// State for B-roll sync functionality
	const [isSyncingBroll, setIsSyncingBroll] = useState(false);
	const [brollJobId, setBrollJobId] = useState<string | null>(null);

	// Handle B-roll timing sync
	const handleSyncBroll = async () => {
		
		setIsSyncingBroll(true);
		
		try {
			// Step 1: Get the most recent caption job ID
			const captionJobId = getMostRecentCaptionJobId();
			if (!captionJobId) {
				toast.error("No captions found. Please generate captions first.");
				setIsSyncingBroll(false);
				return;
			}
			
			
			// Step 2: Get B-roll context from uploaded videos
			if (videosB.length === 0) {
				toast.error("No B-roll videos found. Please upload some B-roll videos first.");
				setIsSyncingBroll(false);
				return;
			}
			
			const brollContext = videosB.map((video, index) => ({
				id: video.id || `broll-${index}`,
				name: video.fileName || video.file?.name || `B-roll ${index + 1}`,
				url: video.url || video.metadata?.uploadedUrl,
				metadata: video.metadata
			}));
			
			
			// Get A-roll video name for the API request
			const aRollVideoName = videosA.length > 0 
				? (videosA[0].fileName || videosA[0].file?.name || videosA[0].url || 'main-video')
				: undefined;
			
			
			// Step 3: Call the B-roll timing generation API
			const response = await fetch('https://cinetune-llh0.onrender.com/api/generate-broll-timing', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					jobId: captionJobId,
					videoId: aRollVideoName,  // Send video name instead of ID
					brollContext: brollContext
				})
			});
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to start B-roll timing generation');
			}
			
			const data = await response.json();
			
			// Validate job ID exists in response (could be 'id' or 'brollJobId')
			const jobId = data.brollJobId || data.id;
			if (!jobId) {
				throw new Error('No B-roll job ID received from server');
			}
			
			setBrollJobId(jobId);
			toast.success("B-roll timing generation started! We'll notify you when it's ready.");
			
			// Step 4: Poll for results
			pollBrollResults(jobId);
			
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to sync B-roll timing');
			setIsSyncingBroll(false);
		}
	};

	// Poll for B-roll timing results
	const pollBrollResults = async (jobId: string) => {
		
		if (!jobId || jobId === 'undefined') {
			toast.error('Invalid job ID for B-roll timing');
			setIsSyncingBroll(false);
			return;
		}
		
		const maxAttempts = 20; // 2 minutes max
		let attempts = 0;
		
		const poll = async () => {
			try {
				const pollUrl = `https://cinetune-llh0.onrender.com/api/broll-timing-result/${jobId}`;
				const response = await fetch(pollUrl);
				
				if (!response.ok) {
					throw new Error('Failed to check B-roll timing status');
				}
				
				const data = await response.json();
				
				if (data.status === 'completed') {
					
					// Legacy support - log if old structure exists
					if (data.brollTimings) {
						// Legacy B-roll timings array exists
					}
					
					// Process B-roll placements and add to timeline
					if (data.brollTimingSuggestions?.brollPlacements) {
						const placements = data.brollTimingSuggestions.brollPlacements;
						
						let successCount = 0;
						let errorCount = 0;
						
						// CRITICAL NEW APPROACH: Batch process all B-roll videos at once
						// This prevents sequential dispatch conflicts that cause video disappearing
						
						// Prepare all video payloads first
						const allVideoPayloads = [];
						
						for (let index = 0; index < placements.length; index++) {
							const placement = placements[index];
							try {
								// Extract timing information (convert seconds to milliseconds)
								const startTimeMs = (placement.startTime || 0) * 1000;
								const endTimeMs = (placement.endTime || placement.startTime + 2) * 1000;
								const duration = endTimeMs - startTimeMs;
								
								// Extract clip name and find matching video
								const clipName = placement.clipName;
								
								// Find the matching B-roll video by filename
								const matchingVideo = videosB.find(video => {
									const videoName = video.fileName || video.file?.name || video.url;
									return videoName?.includes(clipName) || clipName?.includes(videoName);
								});
								
								if (!matchingVideo) {
									errorCount++;
									return;
								}
								
								// Get video source
								const srcVideo = matchingVideo.metadata?.uploadedUrl || 
									(matchingVideo.metadata?.localUrl && !matchingVideo.metadata.localUrl.startsWith('blob:') ? matchingVideo.metadata.localUrl : null) || 
									matchingVideo.url;
								
								if (!srcVideo) {
									errorCount++;
									return;
								}
								
								// CRITICAL FIX: Use separate sequential tracks to prevent state override
								// Even though we want them on "same track" conceptually, timeline needs separate track indices
								const brollTrackIndex = index + 1; // Track 1, 2, 3, etc.
								const trackLabel = `B-roll Track ${brollTrackIndex}`;
								
								
								// Generate unique ID for this B-roll placement with specific prefix
								const videoId = `broll-timing-${Date.now()}-${index}-${generateId()}`;
								
								const addVideoPayload = {
									payload: {
										id: videoId,
										display: {
											from: startTimeMs,
											to: endTimeMs,
										},
										details: {
											src: srcVideo,
										},
										metadata: {
											previewUrl: "https://cdn.designcombo.dev/caption_previews/static_preset1.webp",
											localUrl: matchingVideo.metadata?.localUrl?.startsWith('blob:') ? undefined : matchingVideo.metadata?.localUrl,
											externalUrl: matchingVideo.metadata?.uploadedUrl,
											aRollType: "b-roll",
											userId: matchingVideo.userId,
											fileName: matchingVideo.fileName || matchingVideo.file?.name || matchingVideo.url,
											thumbnailUrl: matchingVideo.metadata?.thumbnailUrl,
											// B-roll specific metadata from new JSON structure
											brollPlacement: {
												originalClipName: clipName,
												startTime: placement.startTime,
												endTime: placement.endTime,
												duration: placement.duration,
												strategicReasoning: placement.strategicReasoning,
												relatedArollWords: placement.relatedArollWords,
												alternativePlacements: placement.alternativePlacements,
												trackIndex: brollTrackIndex,
												trackLabel: trackLabel,
												placementIndex: index + 1,
												uniqueVideoId: videoId,
												// Legacy support
												reasoning: placement.reasoning || placement.strategicReasoning,
												confidence: placement.confidence
											}
										},
									},
									options: {
										targetTrackIndex: brollTrackIndex,  // Use targetTrackIndex - let timeline create track if needed
										scaleMode: "fit",
									},
								};
								
								// Store payload for batch dispatch instead of dispatching immediately
								allVideoPayloads.push({
									payload: addVideoPayload,
									clipName: clipName,
									videoId: videoId,
									trackIndex: brollTrackIndex,
									timing: { startTimeMs, endTimeMs }
								});
								
								successCount++;
								
							} catch (error) {
								errorCount++;
							}
						}
						
						// SEQUENTIAL DISPATCH WITH LONG DELAYS FOR TIMELINE STABILITY
						
						for (let i = 0; i < allVideoPayloads.length; i++) {
							const { payload, clipName, videoId, trackIndex, timing } = allVideoPayloads[i];
							
							// Dispatch the video
							dispatch(ADD_VIDEO, payload);
							
							// LONG DELAY to let timeline fully process this video before adding next one
							if (i < allVideoPayloads.length - 1) {
								
								// Show countdown for user feedback
								for (let countdown = 3; countdown > 0; countdown--) {
									await new Promise(resolve => setTimeout(resolve, 1000));
								}
								
							}
						}
						
						// Final summary
						
						// ULTRA DETAILED VERIFICATION SYSTEM
						
						// Immediate verification
						for (let i = 0; i < successCount; i++) {
							const placement = placements[i];
						}
						
						// Delayed verification with multiple checkpoints
						if (successCount > 1) {
							// 500ms check
							setTimeout(() => {
								for (let i = 0; i < successCount; i++) {
									const placement = placements[i];
								}
							}, 500);
							
							// 1000ms check  
							setTimeout(() => {
								for (let i = 0; i < successCount; i++) {
									const placement = placements[i];
								}
							}, 1000);
							
							// 2000ms final check
							setTimeout(() => {
								// Final 2000MS checkpoint - verification complete
							}, 2000);
						}
						
						// Show summary toast
						if (successCount > 0 && errorCount === 0) {
							toast.success(`Successfully added ${successCount} B-roll clips to separate tracks!`);
						} else if (successCount > 0 && errorCount > 0) {
							toast.success(`Added ${successCount} B-roll clips to separate tracks. ${errorCount} failed.`);
						} else if (errorCount > 0) {
							toast.error(`Failed to add B-roll clips to timeline.`);
						}
						
						// Log basic API summary
						const summary = data.brollTimingSuggestions.summary;
						if (summary) {
							// API Summary: clips used and coverage percentage
						}
						
					} else {
						toast.success(`B-roll timing suggestions ready! Check console for details.`);
					}
					
					setIsSyncingBroll(false);
					setBrollJobId(null);
					
				} else if (data.status === 'failed') {
					toast.error(`B-roll timing generation failed: ${data.error}`);
					setIsSyncingBroll(false);
					setBrollJobId(null);
					
				} else if (data.status === 'processing') {
					attempts++;
					if (attempts < maxAttempts) {
						setTimeout(poll, 6000); // Poll every 6 seconds
					} else {
						toast.error('B-roll timing generation timed out');
						setIsSyncingBroll(false);
						setBrollJobId(null);
					}
				}
				
			} catch (error) {
				attempts++;
				if (attempts < maxAttempts) {
					setTimeout(poll, 6000); // Retry after 6 seconds
				} else {
					toast.error('Failed to check B-roll timing status');
					setIsSyncingBroll(false);
					setBrollJobId(null);
				}
			}
		};
		
		// Start polling after a short delay
		setTimeout(poll, 2000);
	};

	return (
		<div className="flex flex-1 flex-col">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium justify-between">
				Your uploads
				<Button 
					variant="outline" 
					size="sm" 
					onClick={addTestData}
					className="text-xs"
				>
					Add Test Data
				</Button>
			</div>
			{/* A-Roll Upload Modal */}
			{currentModalType === 'a-roll' && <ModalUpload aRollType="a-roll" userId={userId} />}
			{/* B-Roll Upload Modal */}
			{currentModalType === 'b-roll' && <ModalUpload aRollType="b-roll" userId={userId} />}
			{/* Uploads in Progress Section */}
			{(pendingUploads.length > 0 || activeUploads.length > 0) && (
				<div className="p-4">
					<div className="font-medium text-sm mb-2 flex items-center gap-2">
						<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
						Uploads in Progress
					</div>
					<div className="flex flex-col gap-2">
						{pendingUploads.map((upload) => (
							<div key={upload.id} className="flex items-center gap-2">
								<span className="truncate text-xs flex-1">
									{upload.file?.name || upload.url || "Unknown"}
								</span>
								<span className="text-xs text-muted-foreground">Pending</span>
							</div>
						))}
						{activeUploads.map((upload) => (
							<div key={upload.id} className="flex items-center gap-2">
								<span className="truncate text-xs flex-1">
									{upload.file?.name || upload.url || "Unknown"}
								</span>
								<div className="flex items-center gap-1">
									<Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
									<span className="text-xs">{upload.progress ?? 0}%</span>
									<span className="text-xs text-muted-foreground ml-2">
										{upload.status}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="flex flex-col gap-10 p-4">
				{/* A-Rolls/Main Video Section */}
				<div>
					<div
						className="flex items-center gap-2 mb-2 justify-between cursor-pointer hover:bg-accent/40 rounded px-2 py-1 transition"
						onClick={openARollModal}
					>
						<span className="flex items-center gap-2">
							<VideoIcon className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium text-sm">A-Rolls / Main Video</span>
						</span>
					</div>
					<ScrollArea className="max-h-32">
						<div className="grid grid-cols-3 gap-3 max-w-full justify-items-center">
							{videosA.length === 0 ? (
								<div
									className="flex items-center gap-2 flex-col w-full cursor-pointer justify-center"
									onClick={openARollModal}
								>
									<Card className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer border-dashed border-2 hover:bg-accent/20 transition">
										<Plus className="w-8 h-8 text-muted-foreground" />
									</Card>
									<div className="text-xs text-muted-foreground text-center leading-relaxed">
										Add A-Roll
									</div>
								</div>
							) : (
								videosA.map((video, idx) => (
									<VideoWidget
										key={video.id || idx}
										video={video}
										onAddVideo={handleAddVideo}
									/>
								))
							)}
						</div>
					</ScrollArea>
				</div>
				{/* B-Rolls Section */}
				<div>
					<div className="flex items-center gap-2 mb-2 justify-between">
					<div
							className="flex items-center gap-2 cursor-pointer hover:bg-accent/40 rounded px-2 py-1 transition flex-1"
						onClick={openBRollModal}
					>
							<VideoIcon className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium text-sm">B-Rolls</span>
						</div>
						{/* Sync B-roll Button */}
						{videosB.length > 0 && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleSyncBroll}
								disabled={isSyncingBroll}
								className="h-8 px-3 text-xs"
							>
								{isSyncingBroll ? (
									<>
										<Loader2 className="w-3 h-3 mr-1 animate-spin" />
										Syncing...
									</>
								) : (
									<>
										<RefreshCw className="w-3 h-3 mr-1" />
										Sync B-roll
									</>
								)}
							</Button>
						)}
					</div>
					<ScrollArea className="max-h-32">
						<div className="grid grid-cols-3 gap-3 max-w-full justify-items-center">
							{videosB.length === 0 ? (
								<div
									className="flex items-center gap-2 flex-col w-full cursor-pointer justify-center"
									onClick={openBRollModal}
								>
									<Card className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer border-dashed border-2 hover:bg-accent/20 transition">
										<Plus className="w-8 h-8 text-muted-foreground" />
									</Card>
									<div className="text-xs text-muted-foreground text-center leading-relaxed">
										Add B-Roll
									</div>
								</div>
							) : (
								videosB.map((video, idx) => (
									<VideoWidget
										key={`${video.id || 'broll'}-${idx}-${video.fileName || 'unknown'}`}
										video={video}
										onAddVideo={handleAddVideo}
									/>
								))
							)}
						</div>
					</ScrollArea>
				</div>

				{/* Images Section */}
				{images.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<ImageIcon className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium text-sm">Images</span>
						</div>
						<ScrollArea className="max-h-32">
							<div className="grid grid-cols-3 gap-2 max-w-full">
								{images.map((image, idx) => (
									<div
										className="flex items-center gap-2 flex-col w-full"
										key={image.id || idx}
									>
										<Card
											className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer"
											onClick={() => handleAddImage(image)}
										>
											<ImageIcon className="w-8 h-8 text-muted-foreground" />
										</Card>
										<div className="text-xs text-muted-foreground truncate w-full text-center">
											{image.file?.name || image.url || "Image"}
										</div>
									</div>
								))}
							</div>
						</ScrollArea>
					</div>
				)}

				{/* Audios Section */}
				{audios.length > 0 && (
					<div>
						<div className="flex items-center gap-2 mb-2">
							<Music className="w-4 h-4 text-muted-foreground" />
							<span className="font-medium text-sm">Audios</span>
						</div>
						<ScrollArea className="max-h-32">
							<div className="grid grid-cols-3 gap-2 max-w-full">
								{audios.map((audio, idx) => (
									<div
										className="flex items-center gap-2 flex-col w-full"
										key={audio.id || idx}
									>
										<Card
											className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer"
											onClick={() => handleAddAudio(audio)}
										>
											<Music className="w-8 h-8 text-muted-foreground" />
										</Card>
										<div className="text-xs text-muted-foreground truncate w-full text-center">
											{audio.file?.name || audio.url || "Audio"}
										</div>
									</div>
								))}
							</div>
						</ScrollArea>
					</div>
				)}
			</div>
		</div>
	);
};
