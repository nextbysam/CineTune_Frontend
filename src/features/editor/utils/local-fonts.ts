import { ICompactFont, IFont } from "../interfaces/editor";
import { nanoid } from "nanoid";

// Local font mapping for captions
export const LOCAL_FONT_MAPPING: Record<string, { url: string; postScriptName: string }> = {
	// Montserrat fonts
	"Montserrat": { url: "/fonts/Montserrat-Regular.ttf", postScriptName: "Montserrat-Regular" },
	"Montserrat-Regular": { url: "/fonts/Montserrat-Regular.ttf", postScriptName: "Montserrat-Regular" },
	"Montserrat-Bold": { url: "/fonts/Montserrat-Bold.ttf", postScriptName: "Montserrat-Bold" },
	"Montserrat-SemiBold": { url: "/fonts/Montserrat-SemiBold.ttf", postScriptName: "Montserrat-SemiBold" },
	"Montserrat-Medium": { url: "/fonts/Montserrat-Medium.ttf", postScriptName: "Montserrat-Medium" },
	"Montserrat-Light": { url: "/fonts/Montserrat-Light.ttf", postScriptName: "Montserrat-Light" },
	"Montserrat-ExtraLight": { url: "/fonts/Montserrat-ExtraLight.ttf", postScriptName: "Montserrat-ExtraLight" },
	"Montserrat-ExtraBold": { url: "/fonts/Montserrat-ExtraBold.ttf", postScriptName: "Montserrat-ExtraBold" },
	"Montserrat-Black": { url: "/fonts/Montserrat-Black.ttf", postScriptName: "Montserrat-Black" },
	"Montserrat-Thin": { url: "/fonts/Montserrat-Thin.ttf", postScriptName: "Montserrat-Thin" },
	
	// Inter fonts
	"Inter": { url: "/fonts/Inter_28pt-Regular.ttf", postScriptName: "Inter_28pt-Regular" },
	"Inter_28pt": { url: "/fonts/Inter_28pt-Regular.ttf", postScriptName: "Inter_28pt-Regular" },
	"Inter_28pt-Regular": { url: "/fonts/Inter_28pt-Regular.ttf", postScriptName: "Inter_28pt-Regular" },
	"Inter_28pt-Bold": { url: "/fonts/Inter_28pt-SemiBold.ttf", postScriptName: "Inter_28pt-SemiBold" },
	"Inter-Bold": { url: "/fonts/Inter_28pt-SemiBold.ttf", postScriptName: "Inter_28pt-SemiBold" },
	"Inter_28pt-SemiBold": { url: "/fonts/Inter_28pt-SemiBold.ttf", postScriptName: "Inter_28pt-SemiBold" },
	"Inter_28pt-Thin": { url: "/fonts/Inter_28pt-Thin.ttf", postScriptName: "Inter_28pt-Thin" },
	
	// InstrumentSerif fonts
	"InstrumentSerif": { url: "/fonts/InstrumentSerif-Regular.ttf", postScriptName: "InstrumentSerif-Regular" },
	"InstrumentSerif-Regular": { url: "/fonts/InstrumentSerif-Regular.ttf", postScriptName: "InstrumentSerif-Regular" },
	"InstrumentSerif-Italic": { url: "/fonts/InstrumentSerif-Italic.ttf", postScriptName: "InstrumentSerif-Italic" },
	
	// Cinzel fonts
	"Cinzel": { url: "/fonts/Cinzel-Regular.ttf", postScriptName: "Cinzel-Regular" },
	"Cinzel-Regular": { url: "/fonts/Cinzel-Regular.ttf", postScriptName: "Cinzel-Regular" },
	"Cinzel-Bold": { url: "/fonts/Cinzel-Bold.ttf", postScriptName: "Cinzel-Bold" },
	"Cinzel-SemiBold": { url: "/fonts/Cinzel-SemiBold.ttf", postScriptName: "Cinzel-SemiBold" },
	"Cinzel-Medium": { url: "/fonts/Cinzel-Medium.ttf", postScriptName: "Cinzel-Medium" },
	"Cinzel-ExtraBold": { url: "/fonts/Cinzel-ExtraBold.ttf", postScriptName: "Cinzel-ExtraBold" },
	"Cinzel-Black": { url: "/fonts/Cinzel-Black.ttf", postScriptName: "Cinzel-Black" },
	
	// Other fonts
	"BadScript": { url: "/fonts/BadScript-Regular.ttf", postScriptName: "BadScript-Regular" },
	"BadScript-Regular": { url: "/fonts/BadScript-Regular.ttf", postScriptName: "BadScript-Regular" },
	"Anton": { url: "/fonts/Anton-Regular.ttf", postScriptName: "Anton-Regular" },
	"Anton-Regular": { url: "/fonts/Anton-Regular.ttf", postScriptName: "Anton-Regular" },
};

// Convert LOCAL_FONT_MAPPING to compact fonts format
export function createCompactFontsFromLocal(): ICompactFont[] {
	const familyGroups: Record<string, IFont[]> = {};
	
	// Group fonts by family
	Object.entries(LOCAL_FONT_MAPPING).forEach(([key, fontData]) => {
		const family = extractFontFamily(key);
		const style = extractFontStyle(key);
		
		const font: IFont = {
			id: nanoid(),
			family: family,
			fullName: key,
			postScriptName: fontData.postScriptName,
			preview: "",
			style: style,
			url: fontData.url,
			category: "local",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			userId: null,
		};
		
		if (!familyGroups[family]) {
			familyGroups[family] = [];
		}
		familyGroups[family].push(font);
	});
	
	// Convert to compact fonts format
	return Object.entries(familyGroups).map(([family, fonts]) => {
		const defaultFont = fonts.find(f => f.style === "Regular") || fonts[0];
		
		return {
			family: family,
			styles: fonts,
			default: defaultFont,
			name: family,
		};
	});
}

function extractFontFamily(fontName: string): string {
	// Remove style suffixes to get base family name
	if (fontName.includes("Montserrat")) return "Montserrat";
	if (fontName.includes("Inter")) return "Inter";
	if (fontName.includes("InstrumentSerif")) return "InstrumentSerif";
	if (fontName.includes("Cinzel")) return "Cinzel";
	if (fontName.includes("BadScript")) return "BadScript";
	if (fontName.includes("Anton")) return "Anton";
	
	// Fallback: split on dash and take first part
	return fontName.split("-")[0];
}

function extractFontStyle(fontName: string): string {
	// Extract style from font name
	if (fontName.includes("-")) {
		const parts = fontName.split("-");
		const style = parts[parts.length - 1];
		// Map common style variations
		if (style === "SemiBold") return "SemiBold";
		if (style === "ExtraBold") return "ExtraBold";
		if (style === "ExtraLight") return "ExtraLight";
		return style;
	}
	return "Regular";
}