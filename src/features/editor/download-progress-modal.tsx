import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDownloadState } from "./store/use-download-state";
import { Button } from "@/components/ui/button";
import { CircleCheckIcon, XIcon, FileVideo } from "lucide-react";
import { DialogDescription, DialogTitle } from "@radix-ui/react-dialog";
import { download } from "@/utils/download";
import { RendersGallery } from "./renders-gallery";

const DownloadProgressModal = () => {
	const { progress, displayProgressModal, output, actions } =
		useDownloadState();
	const [rendersGalleryOpen, setRendersGalleryOpen] = useState(false);
	const isCompleted = progress === 100;

	// Log progress changes and modal state
	useEffect(() => {
		if (displayProgressModal) {
			console.log(
				`📊 [CineTune Progress] Modal opened - Progress: ${progress}%`,
			);
		}
	}, [displayProgressModal]);

	useEffect(() => {
		if (displayProgressModal && progress > 0) {
			console.log(
				`📊 [CineTune Progress] Update: ${progress}%${isCompleted ? " - Completed!" : ""}`,
			);
		}
	}, [progress, displayProgressModal, isCompleted]);

	const handleDownload = async () => {
		if (output?.url) {
			console.log(
				`📥 [CineTune Download] Starting file download from: ${output.url}`,
			);
			try {
				await download(output.url, "untitled.mp4");
				console.log(
					`✅ [CineTune Download] File download completed successfully`,
				);
			} catch (error) {
				console.error(`❌ [CineTune Download] Download failed:`, error);
			}
		} else {
			console.warn(
				`⚠️ [CineTune Download] No output URL available for download`,
			);
		}
	};
	return (
		<Dialog
			open={displayProgressModal}
			onOpenChange={actions.setDisplayProgressModal}
		>
			<DialogContent className="flex h-[627px] flex-col gap-0 bg-background p-0 sm:max-w-[844px]">
				<DialogTitle className="hidden" />
				<DialogDescription className="hidden" />
				<XIcon
					onClick={() => actions.setDisplayProgressModal(false)}
					className="absolute right-4 top-5 h-5 w-5 text-zinc-400 hover:cursor-pointer hover:text-zinc-500"
				/>
				<div className="flex h-16 items-center border-b px-4 font-medium">
					Download
				</div>
				{isCompleted ? (
					<div className="flex flex-1 flex-col items-center justify-center gap-2 space-y-4">
						<div className="flex flex-col items-center space-y-1 text-center">
							<div className="font-semibold">
								<CircleCheckIcon />
							</div>
							<div className="font-bold">Exported</div>
							<div className="text-muted-foreground">
								You can download the video to your device.
							</div>
						</div>
						<div className="flex gap-2">
							<Button onClick={handleDownload}>Download</Button>
							<Button
								variant="outline"
								onClick={() => setRendersGalleryOpen(true)}
								className="flex items-center gap-2"
							>
								<FileVideo className="h-4 w-4" />
								View All Renders
							</Button>
						</div>
					</div>
				) : (
					<div className="flex flex-1 flex-col items-center justify-center gap-4">
						<div className="text-5xl font-semibold">
							{Math.floor(progress)}%
						</div>
						<div className="font-bold">Exporting...</div>
						<div className="text-center text-zinc-500">
							<div>Closing the browser will not cancel the export.</div>
							<div>The video will be saved in your space.</div>
						</div>
						<Button variant={"outline"}>Cancel</Button>
					</div>
				)}
			</DialogContent>

			<RendersGallery
				open={rendersGalleryOpen}
				onOpenChange={setRendersGalleryOpen}
			/>
		</Dialog>
	);
};

export default DownloadProgressModal;
