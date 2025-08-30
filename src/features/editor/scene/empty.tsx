import useStore from "../store/use-store";
import { useEffect, useRef, useState } from "react";
import { Droppable } from "@/components/ui/droppable";
import { PlusIcon } from "lucide-react";
import { DroppableArea } from "./droppable";
import useUploadStore from "../store/use-upload-store";
import { extractVideoThumbnail } from "@/components/modal-upload";
import { nanoid } from "nanoid";

const SceneEmpty = () => {
	const [isLoading, setIsLoading] = useState(true);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isDraggingOver, setIsDraggingOver] = useState(false);
	const [desiredSize, setDesiredSize] = useState({ width: 0, height: 0 });
	const { size } = useStore();
	const { addPendingUploads, processUploads } = useUploadStore();

	useEffect(() => {
		const container = containerRef.current!;
		const PADDING = 96;
		const containerHeight = container.clientHeight - PADDING;
		const containerWidth = container.clientWidth - PADDING;
		const { width, height } = size;

		const desiredZoom = Math.min(
			containerWidth / width,
			containerHeight / height,
		);
		setDesiredSize({
			width: width * desiredZoom,
			height: height * desiredZoom,
		});
		setIsLoading(false);
	}, [size]);

	const onSelectFiles = async (files: File[]) => {
		console.log('Files dropped on canvas:', { files });

		// Generate thumbnails for video files first
		const videoThumbnailPromises = files
			.filter((file) => file.type.startsWith("video/"))
			.map(async (file) => ({
				fileName: file.name,
				thumbnail: await extractVideoThumbnail(file)
			}));
		
		const thumbnailData = await Promise.all(videoThumbnailPromises);
		const thumbnailMap = Object.fromEntries(
			thumbnailData.map(({ fileName, thumbnail }) => [fileName, thumbnail])
		);

		// Prepare UploadFile objects for the upload system
		const uploads = files.map((file) => ({
			id: nanoid(),
			file,
			type: file.type,
			status: "pending" as const,
			progress: 0,
			aRollType: 'a-roll' as const, // Default to A-roll for canvas drops
			metadata: {
				aRollType: 'a-roll' as const,
				uploadedAt: new Date().toISOString(),
				thumbnailUrl: thumbnailMap[file.name] || null,
				fileName: file.name,
			}
		}));

		// Add to upload queue and start processing
		addPendingUploads(uploads);
		processUploads();
	};

	return (
		<div ref={containerRef} className="absolute z-50 flex h-full w-full flex-1">
			{!isLoading ? (
				<Droppable
					maxFileCount={4}
					accept={{
						"video/*": [],
						"image/*": [],
						"audio/*": []
					}}
					allowLargeVideos={true}
					disabled={false}
					onValueChange={onSelectFiles}
					className="h-full w-full flex-1 bg-background"
				>
					<DroppableArea
						onDragStateChange={setIsDraggingOver}
						className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform items-center justify-center border border-dashed text-center transition-colors duration-200 ease-in-out ${
							isDraggingOver ? "border-white bg-white/10" : "border-white/15"
						}`}
						style={{
							width: desiredSize.width,
							height: desiredSize.height,
						}}
					>
						<div className="flex flex-col items-center justify-center gap-4 pb-12">
							<div className="hover:bg-primary-dark cursor-pointer rounded-md border bg-primary p-2 text-secondary transition-colors duration-200">
								<PlusIcon className="h-5 w-5" aria-hidden="true" />
							</div>
							<div className="flex flex-col gap-px">
								<p className="text-sm text-muted-foreground">Click to upload</p>
								<p className="text-xs text-muted-foreground/70">
									Or drag and drop files here
								</p>
							</div>
						</div>
					</DroppableArea>
				</Droppable>
			) : (
				<div className="flex flex-1 items-center justify-center bg-background-subtle text-sm text-muted-foreground">
					Loading...
				</div>
			)}
		</div>
	);
};

export default SceneEmpty;
