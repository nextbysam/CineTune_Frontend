import { getUserSessionId } from "@/utils/session";

export const download = (url: string, filename: string) => {
	const sessionId = getUserSessionId();

	console.log("📥 [CineTune Download] Starting file download from:", url);

	fetch(url, {
		headers: {
			"x-cinetune-session": sessionId,
		},
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			return response.blob();
		})
		.then((blob) => {
			console.log(
				"✅ [CineTune Download] File download completed successfully",
			);
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", `${filename}.mp4`); // Specify the filename for the downloaded video
			document.body.appendChild(link);
			link.click();
			link.parentNode?.removeChild(link);
			window.URL.revokeObjectURL(url);
		})
		.catch((error) => {
			console.error("❌ [CineTune Download] Download error:", error);
		});
};
