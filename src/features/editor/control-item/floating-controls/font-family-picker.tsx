import { useRef, useState } from "react";
import useDataState from "../../store/use-data-state";
import { SearchIcon, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Draggable from "react-draggable";
import useLayoutStore from "../../store/use-layout-store";
import useClickOutside from "../../hooks/useClickOutside";
import { ICompactFont, IFont } from "../../interfaces/editor";
import { loadFonts } from "../../utils/fonts";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { ITrackItem } from "@designcombo/types";

export const onChangeFontFamily = async (
	font: ICompactFont,
	trackItem: ITrackItem,
) => {
	const fontName = font.default.postScriptName;
	const fontUrl = font.default.url;

	await loadFonts([
		{
			name: fontName,
			url: fontUrl,
		},
	]);

	dispatch(EDIT_OBJECT, {
		payload: {
			[trackItem?.id as string]: {
				details: {
					fontFamily: fontName,
					fontUrl: fontUrl,
				},
			},
		},
	});
};
export default function FontFamilyPicker() {
	const { compactFonts } = useDataState();
	const [search, setSearch] = useState("");
	const { setFloatingControl, trackItem } = useLayoutStore();

	// Get current font from trackItem
	const currentFontFamily = trackItem?.details?.fontFamily;
	
	// Find current font in compactFonts to highlight it
	const currentFont = compactFonts.find((font) => 
		font.styles.some(style => style.postScriptName === currentFontFamily) ||
		font.family === currentFontFamily ||
		font.default.postScriptName === currentFontFamily
	);

	const filteredFonts = compactFonts.filter((font) =>
		font.family.toLowerCase().includes(search.toLowerCase()),
	);

	const floatingRef = useRef<HTMLDivElement>(null);
	useClickOutside(floatingRef as React.RefObject<HTMLElement>, () =>
		setFloatingControl(""),
	);

	return (
		<div
			ref={floatingRef}
			className="absolute right-2 top-2 z-[200] w-56 border bg-sidebar p-0"
		>
			<div className="handle flex cursor-grab justify-between px-2 py-4">
				<div className="flex flex-col">
					<p className="text-sm font-bold">Fonts</p>
					{currentFont && (
						<p className="text-xs text-muted-foreground">Current: {currentFont.family}</p>
					)}
				</div>
				<div className="h-4 w-4" onClick={() => setFloatingControl("")}>
					<X className="h-4 w-4 cursor-pointer font-extrabold text-muted-foreground" />
				</div>
			</div>
			<div className="flex items-center p-2">
				<SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
				<input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Search font..."
					className="w-full rounded-md bg-transparent p-1 text-sm text-muted-foreground outline-none"
				/>
			</div>
			<ScrollArea className="h-[400px] w-full py-2">
				{filteredFonts.length > 0 ? (
					filteredFonts.map((font, index) => {
						// Check if this font is the currently selected one
						const isCurrentFont = currentFont && (
							font.family === currentFont.family ||
							font.styles.some(style => style.postScriptName === currentFontFamily) ||
							font.default.postScriptName === currentFontFamily
						);
						
						return (
							<div
								key={index}
								onClick={() => {
									if (trackItem) {
										onChangeFontFamily(font, trackItem);
									}
								}}
								className={`cursor-pointer px-2 py-1 hover:bg-zinc-800/50 ${
									isCurrentFont ? 'bg-blue-600/20 border-l-2 border-blue-500' : ''
								}`}
							>
							{font.default.preview ? (
							<img
								style={{ filter: "invert(100%)" }}
								src={font.default.preview}
								alt={font.family}
							/>
							) : (
								<div className="flex items-center gap-2 py-1">
									<div className="h-5 w-5 rounded border border-zinc-600" />
									<div className="text-xs text-muted-foreground">
										{font.family} {font.default?.style ? `• ${font.default.style}` : ""}
									</div>
								</div>
							)}
						</div>
						);
					})
				) : (
					<p className="py-2 text-center text-sm text-muted-foreground">
						No font found
					</p>
				)}
			</ScrollArea>
		</div>
	);
}
