import { Button, buttonVariants } from "@/components/ui/button";
import { ADD_AUDIO, ADD_IMAGE, ADD_TEXT, ADD_ITEMS, ENTER_EDIT_MODE } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import Draggable from "@/components/shared/draggable";
import { TEXT_ADD_PAYLOAD } from "../constants/payload";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import { generateId } from "@designcombo/timeline";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import useStore from "../store/use-store";
import { Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import useUploadStore from "../store/use-upload-store";
import { LOCAL_FONT_MAPPING } from "../utils/local-fonts";

// Canonical mapping and normalization
const FONT_FAMILY_CANONICAL_MAP: Record<string, string> = {
	inter: 'Inter',
	inter_28pt: 'Inter',
	'inter_28pt-regular': 'Inter',
	'inter_28pt-semibold': 'Inter',
	'inter_28pt-thin': 'Inter',

	instrumentserif: 'InstrumentSerif-Regular',
	'instrumentserif-regular': 'InstrumentSerif-Regular',
	'instrumentserif-italic': 'InstrumentSerif-Italic',

	montserrat: 'Montserrat',
	'montserrat-regular': 'Montserrat',
	'montserrat-medium': 'Montserrat',
	'montserrat-semibold': 'Montserrat',
	'montserrat-bold': 'Montserrat',
	'montserrat-extrabold': 'Montserrat',
	'montserrat-black': 'Montserrat',

	cinzel: 'Cinzel',
	'cinzel-regular': 'Cinzel',
	'cinzel-medium': 'Cinzel',
	'cinzel-semibold': 'Cinzel',
	'cinzel-bold': 'Cinzel',
	'cinzel-extrabold': 'Cinzel',
	'cinzel-black': 'Cinzel',

	anton: 'Anton',
	'anton-regular': 'Anton',

	badscript: 'BadScript-Regular',
	'badscript-regular': 'BadScript-Regular',

	bebasneue: 'BebasNeue',
	cormorantgaramond: 'CormorantGaramond',
};

const normalizeFontFamilyName = (fontFamily?: string): string => {
	if (!fontFamily) return 'Inter';
	const key = fontFamily.trim().toLowerCase();
	const stripped = key.replace(/-?(regular|italic|medium|semibold|semi-bold|bold|extrabold|extra-bold|black)$/i, '');
	return FONT_FAMILY_CANONICAL_MAP[key] || FONT_FAMILY_CANONICAL_MAP[stripped] || fontFamily;
};

const getFontFamilyCanonical = (fontFamily: string, isVertical = false): string => {
	const mapped = normalizeFontFamilyName(fontFamily) || 'Inter';
	return mapped;
};

const getFontWeightNumeric = (weight?: string, isVertical = false): number => {
	const w = (weight || '').toLowerCase().trim();
	const table: Record<string, string> = {
		thin: '100', extralight: '200', 'extra-light': '200', light: '300',
		regular: '400', normal: '400', book: '400', medium: '500',
		semibold: '600', 'semi-bold': '600', demibold: '600',
		bold: '700', extrabold: '800', 'extra-bold': '800',
		black: '900', heavy: '900'
	};
	let mapped = table[w] || (w.match(/(100|200|300|400|500|600|700|800|900)/)?.[0] || '400');
	// Don't force weight for vertical - use the actual weight from JSON
	return parseInt(mapped, 10);
};

// Resolve JSON font -> local font url + postScriptName
const resolveLocalFontFromJson = (fontFamily?: string, fontWeight?: string, isVertical = false): { url: string; postScriptName: string } | null => {
	if (!fontFamily) return null;
	const canonical = getFontFamilyCanonical(fontFamily, isVertical);
	const weight = getFontWeightNumeric(fontWeight, isVertical);
	// Family-specific mapping to variant keys present in LOCAL_FONT_MAPPING
	const pickVariant = (family: string, w: number): { key: string } => {
		switch (family) {
			case 'Inter':
				if (w <= 300) return { key: 'Inter_28pt-Thin' };
				if (w >= 600) return { key: 'Inter_28pt-SemiBold' };
				return { key: 'Inter_28pt-Regular' };
			case 'Montserrat':
				if (w <= 100) return { key: 'Montserrat-Thin' };
				if (w <= 200) return { key: 'Montserrat-ExtraLight' };
				if (w <= 300) return { key: 'Montserrat-Light' };
				if (w <= 400) return { key: 'Montserrat-Regular' };
				if (w <= 500) return { key: 'Montserrat-Medium' };
				if (w <= 600) return { key: 'Montserrat-SemiBold' };
				if (w <= 700) return { key: 'Montserrat-Bold' };
				if (w <= 800) return { key: 'Montserrat-ExtraBold' };
				return { key: 'Montserrat-Black' };
			case 'Cinzel':
				if (w <= 400) return { key: 'Cinzel-Regular' };
				if (w <= 500) return { key: 'Cinzel-Medium' };
				if (w <= 600) return { key: 'Cinzel-SemiBold' };
				if (w <= 700) return { key: 'Cinzel-Bold' };
				if (w <= 800) return { key: 'Cinzel-ExtraBold' };
				return { key: 'Cinzel-Black' };
			case 'InstrumentSerif-Regular':
				return { key: 'InstrumentSerif-Regular' };
			case 'InstrumentSerif-Italic':
				return { key: 'InstrumentSerif-Italic' };
			case 'Anton':
				return { key: 'Anton-Regular' };
			case 'BadScript-Regular':
				return { key: 'BadScript-Regular' };
			default:
				// Default to Inter
				if (w <= 300) return { key: 'Inter_28pt-Thin' };
				if (w >= 600) return { key: 'Inter_28pt-SemiBold' };
				return { key: 'Inter_28pt-Regular' };
		}
	};
	const { key } = pickVariant(canonical, weight);
	const direct = LOCAL_FONT_MAPPING[key];
	if (direct) return direct;
	// Fallback: construct url/postScriptName by convention
	if (key.startsWith('Inter_28pt-')) return { url: `/fonts/${key}.ttf`, postScriptName: key };
	if (key.startsWith('Montserrat-')) return { url: `/fonts/${key}.ttf`, postScriptName: key };
	if (key.startsWith('Cinzel-')) return { url: `/fonts/${key}.ttf`, postScriptName: key };
	if (key.startsWith('InstrumentSerif-')) return { url: `/fonts/InstrumentSerif-Regular.ttf`, postScriptName: 'InstrumentSerif-Regular' };
	if (key.startsWith('Anton-')) return { url: `/fonts/Anton-Regular.ttf`, postScriptName: 'Anton-Regular' };
	if (key.startsWith('BadScript-')) return { url: `/fonts/BadScript-Regular.ttf`, postScriptName: 'BadScript-Regular' };
	return null;
};

export const Texts = () => {
	const isDraggingOverTimeline = useIsDraggingOverTimeline();
	const [isLoadingCaptions, setIsLoadingCaptions] = useState(false);
	const [captionRegion, setCaptionRegion] = useState<'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center' | 'bottom_center'>('top_left');
	const [wordsAtATime, setWordsAtATime] = useState<number>(1);
	const [gridLayout, setGridLayout] = useState<'default' | 'either_side'>('default');
	const [availableCaptions, setAvailableCaptions] = useState<any[]>([]);
	const [originalCaptions, setOriginalCaptions] = useState<any[]>([]); // Store original data for filtering
	const { trackItemsMap, activeIds } = useStore();
	const { uploads } = useUploadStore();
	const [editingWordIndex, setEditingWordIndex] = useState<number | null>(null);
	const [editingWordValue, setEditingWordValue] = useState<string>("");

	// Load available captions from localStorage on component mount
	useEffect(() => {
		loadAvailableCaptions();
	}, []);

	const loadAvailableCaptions = () => {
		try {
			const allKeys = Object.keys(localStorage);
			const captionsKeys = allKeys.filter(key => key.startsWith('captions_'));
			
			if (captionsKeys.length > 0) {
				const mostRecentKey = captionsKeys[captionsKeys.length - 1];
				const captionsData = localStorage.getItem(mostRecentKey);
				
				if (captionsData) {
					const parsedData = JSON.parse(captionsData);
					if (parsedData.captions && Array.isArray(parsedData.captions)) {
						// Transform captions to ensure consistent format for transcript display
						const transformedCaptions = parsedData.captions.map((caption: any, index: number) => ({
							id: caption.id || `caption-${index}`,
							word: caption.word || caption.text || '',
							text: caption.word || caption.text || '',
							start: caption.start || caption.startTime || 0,
							end: caption.end || caption.endTime || (caption.start || caption.startTime || 0) + 1,
							startTime: (caption.start || caption.startTime || 0) * 1000, // Convert to ms for display
							endTime: (caption.end || caption.endTime || (caption.start || caption.startTime || 0) + 1) * 1000, // Convert to ms for display
							vertical: caption.vertical || false,
							confidence: caption.confidence,
							originalIndex: index,
							style: caption.style || {},
							fontFamily: caption.fontFamily || caption.style?.fontFamily,
							...caption
						}));
						
						
						setAvailableCaptions(transformedCaptions);
						setOriginalCaptions(transformedCaptions);
					}
				}
			}
		} catch (error) {
			console.error('Error loading available captions:', error);
		}
	};

	// Function to save caption edits back to localStorage
	const saveCaptionEditToLocalStorage = (editedCaption: any, originalIndex: number) => {
		try {
			const allKeys = Object.keys(localStorage);
			const captionsKeys = allKeys.filter(key => key.startsWith('captions_'));
			
			if (captionsKeys.length > 0) {
				const mostRecentKey = captionsKeys[captionsKeys.length - 1];
				const captionsData = localStorage.getItem(mostRecentKey);
				
				if (captionsData) {
					const parsedData = JSON.parse(captionsData);
					
					if (parsedData.captions && Array.isArray(parsedData.captions)) {
						// Find and update the caption at the original index
						if (originalIndex >= 0 && originalIndex < parsedData.captions.length) {
							const oldCaption = parsedData.captions[originalIndex];
							const oldWord = oldCaption.word || oldCaption.text || '';
							
							// Update both word and text fields to ensure consistency
							parsedData.captions[originalIndex] = {
								...parsedData.captions[originalIndex],
								word: editedCaption.word,
								text: editedCaption.text || editedCaption.word
							};
							
							// Update timestamp to track when edit was made
							parsedData.updatedAt = new Date().toISOString();
							
							// Save back to localStorage
							localStorage.setItem(mostRecentKey, JSON.stringify(parsedData));
							
							
							return true;
						} else {
							console.error('❌ Invalid original index for caption edit:', originalIndex);
							return false;
						}
					}
				}
			}
		} catch (error) {
			console.error('❌ Error saving caption edit to localStorage:', error);
			return false;
		}
		return false;
	};

	const formatTime = (timeMs: number): string => {
		const seconds = Math.floor(timeMs / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
	};

	// Get video dimensions from timeline
	const getVideoDimensions = (): { width: number; height: number } => {
		try {
			// Find video items in the timeline
			const videoItems = Object.values(trackItemsMap).filter(
				(item) => item.type === "video"
			);
			
			if (videoItems.length > 0) {
				const firstVideo = videoItems[0];
				// Try to get dimensions from video metadata
				if (firstVideo.metadata?.width && firstVideo.metadata?.height) {
						return {
						width: firstVideo.metadata.width,
						height: firstVideo.metadata.height
					};
				}
				// Try to get dimensions from details
				if (firstVideo.details?.width && firstVideo.details?.height) {
						return {
						width: firstVideo.details.width,
						height: firstVideo.details.height
					};
				}
			}
			
			return { width: 1080, height: 1920 }; // Default to vertical
		} catch (error) {
			console.warn('🎥 Error getting video dimensions:', error);
			return { width: 1080, height: 1920 }; // Default to vertical
		}
	};

	// Calculate positioning based on selected region
	const calculateRegionPosition = (region: string, baseLeft: number, baseTop: number, fontSize: number, videoDimensions?: { width: number; height: number }): { left: number; top: number } => {
		const dimensions = videoDimensions || getVideoDimensions();
		const videoWidth = dimensions.width;
		const videoHeight = dimensions.height;
		const margin = 24;
		const lineHeight = Math.round(fontSize * 1.2);
		
		switch (region) {
			case 'top_left':
				return { left: margin + baseLeft, top: margin + baseTop };
			case 'top_right':
				return { left: videoWidth - margin - baseLeft, top: margin + baseTop };
			case 'bottom_left':
				return { left: margin + baseLeft, top: videoHeight - margin - baseTop };
			case 'bottom_right':
				return { left: videoWidth - margin - baseLeft, top: videoHeight - margin - baseTop };
			case 'center':
				return { left: (videoWidth / 2) + baseLeft, top: (videoHeight / 2) + baseTop };
			case 'bottom_center':
				return { left: (videoWidth / 2) + baseLeft, top: videoHeight - margin - baseTop };
			case 'left_center':
				return { left: margin + baseLeft, top: (videoHeight / 2) + baseTop };
			case 'right_center':
				return { left: videoWidth - margin - baseLeft, top: (videoHeight / 2) + baseTop };
			default:
				return { left: margin + baseLeft, top: margin + baseTop };
		}
	};

	// Calculate optimal font size for vertical captions to prevent word wrapping
	const calculateOptimalFontSize = (text: string, maxWidth: number = 1080, maxFontSize: number = 85): number => {
		// Remove any extra whitespace and get the actual word
		const cleanText = text.trim();
		if (!cleanText) return maxFontSize;
		
		// Estimated character width ratio (varies by font, but good approximation)
		const CHAR_WIDTH_RATIO = 0.6; // Characters are approximately 60% of font size width
		const SAFETY_MARGIN = 0.9; // Use 90% of available width for safety
		
		// Calculate estimated text width at max font size
		const estimatedWidthAtMaxFont = cleanText.length * (maxFontSize * CHAR_WIDTH_RATIO);
		const availableWidth = maxWidth * SAFETY_MARGIN;
		
		// If text fits at max font size, use it
		if (estimatedWidthAtMaxFont <= availableWidth) {
			return maxFontSize;
		}
		
		// Calculate optimal font size to fit the text
		const optimalFontSize = Math.floor((availableWidth / cleanText.length) / CHAR_WIDTH_RATIO);
		const finalFontSize = Math.max(24, Math.min(optimalFontSize, maxFontSize)); // Min 24px, max original size
		
		
		return finalFontSize;
	};

	// Unified text creation function to ensure consistency across all text addition methods
	const createUniformTextPayload = (options: {
		text?: string;
		startTimeMs?: number;
		endTimeMs?: number;
		isVertical?: boolean;
		originalIndex?: number;
		fontFamily?: string;
		fontUrl?: string;
		applyRegionPositioning?: boolean;
		isFromCaption?: boolean; // New flag to identify caption text
		fontSize?: number; // Dynamic font size for Either Side layout
	} = {}) => {
		const {
			text = "Heading and some body",
			startTimeMs = 0,
			endTimeMs = 5000,
			isVertical = false,
			originalIndex,
			fontFamily,
			fontUrl,
			applyRegionPositioning = false,
			isFromCaption = false,
			fontSize // Dynamic font size for Either Side layout
		} = options;

		// For captions, don't use demo text if text is empty or undefined
		const finalText = isFromCaption && (!text || text.trim() === "" || text === "Heading and some body") 
			? "Caption text" 
			: text;

		// Calculate position and font size if needed
		let positionOverrides = {};
		let fontSizeOverride = TEXT_ADD_PAYLOAD.details.fontSize; // Default from payload
		
		if (isVertical) {
			// VERTICAL CAPTIONS: Prevent word wrapping with dynamic font sizing
			
			// Calculate optimal font size to prevent word breaking - using 85px as max for vertical captions
			const optimalFontSize = calculateOptimalFontSize(finalText, 1080, 85);
			fontSizeOverride = optimalFontSize;
			
			// Vertical captions always go to center with no word wrapping
			positionOverrides = {
				left: 540,   // Center X (1080/2)
				top: 960,    // Center Y (1920/2)
				textAlign: 'center',
				transform: 'translate(-50%, -50%)',
				isVertical: true,
				fontSize: optimalFontSize, // Dynamic font size
				whiteSpace: 'nowrap', // CRITICAL: Prevent word wrapping
				wordWrap: 'normal', // Override default break-word
				overflow: 'visible', // Allow text to be visible even if slightly larger
				maxWidth: 'none' // Remove any width constraints that could cause wrapping
			};
			
		} else {
			// For non-vertical captions, use dynamic font size if provided (for Either Side layout), otherwise default to 40px
			fontSizeOverride = fontSize || 40;
			
			if (applyRegionPositioning && originalIndex !== undefined) {
				// Apply regional positioning for non-vertical captions with uniform grid offset
				// This will be overridden by specific layout positions if calculated
				const basePosition = calculateRegionPosition(captionRegion, 0, 0, fontSize || 40);
				positionOverrides = {
					left: basePosition.left,
					top: basePosition.top,
					textAlign: 'left'
				};
			} else if (applyRegionPositioning) {
				// Apply regional positioning for regular text when requested
				const basePosition = calculateRegionPosition(captionRegion, 0, 0, fontSize || 40);
				positionOverrides = {
					left: basePosition.left,
					top: basePosition.top,
					textAlign: captionRegion.includes('center') ? 'center' : 'left'
				};
			}
		}

		// Font resolution
		let fontOverrides = {};
		if (fontFamily && fontUrl) {
			fontOverrides = { fontFamily, fontUrl };
		}

		const payload = {
			...TEXT_ADD_PAYLOAD,
			id: generateId(),
			display: {
				from: Math.max(0, startTimeMs),
				to: Math.max(startTimeMs + 100, endTimeMs),
			},
			details: {
				...TEXT_ADD_PAYLOAD.details,
				text: finalText,
				fontSize: fontSizeOverride, // Apply dynamic font size
				...(originalIndex !== undefined && { originalIndex }),
				...fontOverrides,
			},
		};

		// Apply position overrides safely
		if (payload.details && typeof payload.details === 'object') {
			Object.assign(payload.details as any, positionOverrides);
		}

		return payload;
	};

	const handleAddText = () => {
		
		// Get current state before dispatch
		const stateBefore = useStore.getState();
		const trackItemsCountBefore = Object.keys(stateBefore.trackItemsMap).length;
		
		
		// Create uniform text payload with optional region positioning
		const textPayload = createUniformTextPayload({
			text: "Heading and some body",
			applyRegionPositioning: true // Apply user-selected region for consistency
		});
		
		
		dispatch(ADD_TEXT, {
			payload: textPayload,
			options: {},
		});
		
		// Automatically trigger edit mode for the newly added text
		setTimeout(() => {
			dispatch(ENTER_EDIT_MODE, {
				payload: {
					id: textPayload.id,
				},
			});
		}, 100); // Small delay to ensure the text is rendered first
		
		// Check state after dispatch
		const stateAfter = useStore.getState();
		const trackItemsCountAfter = Object.keys(stateAfter.trackItemsMap).length;
		
		
		if (trackItemsCountAfter > trackItemsCountBefore) {
		} else {
			console.error('❌ Regular add text failed - count didn\'t increase');
		}
	};

	const handleLoadCaptionsFromJSON = async () => {
		
		try {
			// Step 1: Find captions in localStorage
			
			const allKeys = Object.keys(localStorage);
			const captionsKeys = allKeys.filter(key => key.startsWith('captions_'));
			
			
			if (captionsKeys.length === 0) {
				console.error('❌ ==========================================');
				console.error('❌ NO CAPTIONS FOUND IN LOCALSTORAGE');
				console.error('❌ ==========================================');
				console.error('❌ Available keys:', allKeys);
				toast.error("No captions found. Please generate captions first.");
				return;
			}
			
			// Step 2: Select the most recent captions
			
			const mostRecentKey = captionsKeys[captionsKeys.length - 1];
			
			// Step 3: Load and parse captions data
			
			const captionsData = localStorage.getItem(mostRecentKey);
			
			if (!captionsData) {
				console.error('❌ ==========================================');
				console.error('❌ NO CAPTIONS DATA FOUND FOR KEY:', mostRecentKey);
				console.error('❌ ==========================================');
				toast.error("No captions data found. Please generate captions first.");
				return;
			}
			
			
			const parsedData = JSON.parse(captionsData);
			
			if (!parsedData.captions || !Array.isArray(parsedData.captions)) {
				console.error('❌ ==========================================');
				console.error('❌ INVALID CAPTIONS DATA STRUCTURE');
				console.error('❌ ==========================================');
				console.error('❌ Expected structure: { captions: [...] }');
				console.error('❌ Actual structure:', parsedData);
				console.error('❌ Captions property type:', typeof parsedData.captions);
				console.error('❌ Captions property value:', parsedData.captions);
				toast.error("Invalid captions data structure.");
				return;
			}
			
			// Step 4: Validate captions structure
			
			const totalCaptions = parsedData.captions.length;
			
			// Prepare horizontal layout: top-left anchor, max 3 words per line, max 3 lines, repeat in cycles
			const layoutPositions: Record<number, { left: number; top: number }> = {};
			// Store dynamic font sizes for Either Side layout groups (groupIndex -> fontSize)
			const eitherSideFontSizes = new Map<number, number>();
			// Also map original caption index -> cycle, and compute cycle end times from last word in cycle
			const indexToCycle: Record<number, number> = {};
			const cycleToOriginalIndices: Record<number, number[]> = {};
			const cycleEndMsByCycle: Record<number, number> = {};
			try {
				const maxWordsPerLine = 3;
				const maxLines = 3;
				const slotsPerCycle = maxWordsPerLine * maxLines; // 9
				
				// UNIFORM SPACING CONSTANTS - Optimized to prevent overlap with 85px font size
				const UNIFORM_HORIZONTAL_SPACING = 200; // Fixed horizontal spacing - prevents overlap for long words
				const UNIFORM_VERTICAL_SPACING = 115; // Fixed vertical spacing - prevents vertical overlap
				
				
				// Build a sequence of non-vertical captions ordered by start time and group by wordsAtATime
				const nonVerticalIndices = parsedData.captions
					.map((c: any, idx: number) => ({ idx, start: c.start ?? c.startTime ?? 0, vertical: !!c.vertical }))
					.filter((it: any) => !it.vertical)
					.sort((a: any, b: any) => (a.start - b.start))
					.map((it: any) => it.idx);
				
				
				// Group indices by wordsAtATime for positioning
				const groupedIndicesForPositioning: number[][] = [];
				for (let i = 0; i < nonVerticalIndices.length; i += wordsAtATime) {
					const group = nonVerticalIndices.slice(i, i + wordsAtATime);
					groupedIndicesForPositioning.push(group);
				}
				
				
				// Use the outer font sizes map for Either Side layout
				
				groupedIndicesForPositioning.forEach((groupIndices: number[], groupSeqIndex: number) => {
					// Use the first caption in the group for positioning reference
					const firstCaptionIdx = groupIndices[0];
					const caption = parsedData.captions[firstCaptionIdx];
					const allTexts = groupIndices.map(idx => parsedData.captions[idx].word || parsedData.captions[idx].text || "").join(" ");
					
					let position;
					let cycle;
					let offsetX, baseTop;
					
					if (gridLayout === 'either_side') {
						// EITHER SIDE LAYOUT: Four words per section (2 left, 2 right) with absolute vertical centering
						// Get actual video dimensions
						const videoDimensions = getVideoDimensions();
						const edgePadding = 24; // Padding from screen edges
						const centerClearWidth = Math.round(videoDimensions.width * 0.4); // 40% of screen width kept clear in center
						const sideWidth = (videoDimensions.width - centerClearWidth - (edgePadding * 2)) / 2; // Available width per side
						
						// Define side boundaries
						const leftSideStart = edgePadding;
						const leftSideEnd = edgePadding + sideWidth;
						const rightSideStart = videoDimensions.width - edgePadding - sideWidth;
						const rightSideEnd = videoDimensions.width - edgePadding;
						
						// Four words per section: indices 0,1 go left, indices 2,3 go right
						const isLeftSide = (groupSeqIndex % 4) < 2; // First 2 of every 4 go left
						const sidePosition = groupSeqIndex % 2; // Position within side (0 or 1)
						const sectionIndex = Math.floor(groupSeqIndex / 4); // Which section (0, 1, 2, ...)
						
						const FONT_SIZE = 40;
						const currentWordText = allTexts.trim() || "";
						const WORD_MARGIN = 25; // Exactly 25px margin between word end and next word start
						
						// Calculate word width (simplified)
						const CHAR_WIDTH_RATIO = 0.6;
						const currentWordWidth = currentWordText.length * (FONT_SIZE * CHAR_WIDTH_RATIO);
						
						// Store font size for this group
						eitherSideFontSizes.set(groupSeqIndex, FONT_SIZE);
						
						let finalLeft, finalTop;
						// ABSOLUTE VERTICAL CENTER - no line wrapping, always center
						finalTop = Math.round(videoDimensions.height / 2);
						
						if (isLeftSide) {
							// LEFT SIDE: Position words with exact 25px margin between them
							if (sidePosition === 0) {
								// First word on left side - start from edge
								finalLeft = leftSideStart;
							} else {
								// Second word on left side - need to find where first word ended
								// Look for the previous word (groupSeqIndex - 1) which should be on left side too
								const prevGroupIndex = groupSeqIndex - 1;
								if (prevGroupIndex >= 0) {
									const prevGroup = groupedIndicesForPositioning[prevGroupIndex];
									if (prevGroup) {
										const prevWordText = prevGroup.map(idx => parsedData.captions[idx].word || parsedData.captions[idx].text || "").join(" ").trim();
										const prevWordWidth = prevWordText.length * (FONT_SIZE * CHAR_WIDTH_RATIO);
										const prevWordEnd = leftSideStart + prevWordWidth;
										finalLeft = prevWordEnd + WORD_MARGIN; // Exact 25px after previous word ends
									} else {
										finalLeft = leftSideStart + WORD_MARGIN; // Fallback
									}
								} else {
									finalLeft = leftSideStart + WORD_MARGIN; // Fallback
								}
							}
							
							// Ensure word stays within left side boundaries
							finalLeft = Math.max(leftSideStart, Math.min(finalLeft, leftSideEnd - currentWordWidth));
						} else {
							// RIGHT SIDE: Position words with exact 25px margin between them
							if (sidePosition === 0) {
								// First word on right side - start from right side edge
								finalLeft = rightSideStart;
							} else {
								// Second word on right side - need to find where first word ended
								// Look for the previous word (groupSeqIndex - 1) which should be on right side too
								const prevGroupIndex = groupSeqIndex - 1;
								if (prevGroupIndex >= 0) {
									const prevGroup = groupedIndicesForPositioning[prevGroupIndex];
									if (prevGroup) {
										const prevWordText = prevGroup.map(idx => parsedData.captions[idx].word || parsedData.captions[idx].text || "").join(" ").trim();
										const prevWordWidth = prevWordText.length * (FONT_SIZE * CHAR_WIDTH_RATIO);
										const prevWordEnd = rightSideStart + prevWordWidth;
										finalLeft = prevWordEnd + WORD_MARGIN; // Exact 25px after previous word ends
									} else {
										finalLeft = rightSideStart + WORD_MARGIN; // Fallback
									}
								} else {
									finalLeft = rightSideStart + WORD_MARGIN; // Fallback
								}
							}
							
							// Ensure word stays within right side boundaries
							finalLeft = Math.max(rightSideStart, Math.min(finalLeft, rightSideEnd - currentWordWidth));
						}
						
						position = { left: finalLeft, top: finalTop };
						cycle = sectionIndex; // Each section is a cycle (4 words per cycle)
					} else {
						// DEFAULT GRID LAYOUT (3x3 grid pattern)
						cycle = Math.floor(groupSeqIndex / slotsPerCycle);
						const slot = groupSeqIndex % slotsPerCycle; // 0..8
						const line = Math.floor(slot / maxWordsPerLine); // 0..2
						const col = slot % maxWordsPerLine; // 0..2
						
						// UNIFORM GRID POSITIONING
						offsetX = col * UNIFORM_HORIZONTAL_SPACING;
						baseTop = line * UNIFORM_VERTICAL_SPACING;
						
						position = calculateRegionPosition(captionRegion, offsetX, baseTop, 40);
						
						}
					
					// Assign the position to the first caption in group (which will be used during processing)
					layoutPositions[firstCaptionIdx] = position;
					
					// Map all indices in the group to the same cycle
					for (const originalIdx of groupIndices) {
						indexToCycle[originalIdx] = cycle;
						if (!cycleToOriginalIndices[cycle]) cycleToOriginalIndices[cycle] = [];
						cycleToOriginalIndices[cycle].push(originalIdx);
					}
				});
				
				// Compute end time (ms) for each cycle from the last word in that cycle
				// For either side layout, use simplified timing (same as default)
				for (const [cycleStr, indices] of Object.entries(cycleToOriginalIndices)) {
					if (!indices || indices.length === 0) continue;
					const lastIdx = indices[indices.length - 1];
					const c = parsedData.captions[lastIdx];
					const endSeconds = (c.end ?? c.endTime ?? ((c.start ?? c.startTime ?? 0) + 3));
					cycleEndMsByCycle[Number(cycleStr)] = Math.round(endSeconds * 1000);
				}
				
				// Layout positioning complete
			} catch (layoutErr) {
				console.warn('⚠️ Failed to prepare horizontal layout positions:', layoutErr);
			}
			
			// Sample first few captions for validation
			const sampleCaptions = parsedData.captions.slice(0, 3);
			sampleCaptions.forEach((caption: any, index: number) => {
			});
			
			// Step 5: Process each caption and add to timeline
				
			let processedCount = 0;
			let skippedCount = 0;
			let errorCount = 0;
			
			// Get initial state
			const initialState = useStore.getState();
			
			// Build all caption payloads first
			const captionPayloads: any[] = [];
			const usedFonts = new Set<string>();
			
			// Track which original indices we've processed to ensure nothing is missed
			const processedIndices = new Set<number>();
			const skippedIndices = new Set<number>();
			const errorIndices = new Set<number>();
			
			// First, separate vertical and non-vertical captions
			const verticalCaptions: any[] = [];
			const nonVerticalCaptions: any[] = [];
			
			for (let index = 0; index < parsedData.captions.length; index++) {
				const caption = parsedData.captions[index];
				const hasVerticalProperty = caption.vertical === true || caption.vertical === "true";
				
				// If wordsAtATime > 1, treat all captions as non-vertical for grouping purposes
				// Otherwise, respect the original vertical property
				const treatAsVertical = hasVerticalProperty && wordsAtATime === 1;
				
				
				if (treatAsVertical) {
					verticalCaptions.push({ ...caption, originalIndex: index });
				} else {
					// For grouping purposes, treat as non-vertical but preserve original vertical property
					nonVerticalCaptions.push({ ...caption, originalIndex: index, originalVertical: hasVerticalProperty });
				}
			}
			
			
			// Process vertical captions individually with strict timing adherence
			if (verticalCaptions.length > 0) {
				
				for (let i = 0; i < verticalCaptions.length; i++) {
					const caption = verticalCaptions[i];
					
					try {
						// Extract timing information with strict adherence to start/end attributes
						const startSeconds = caption.start || caption.startTime || 0;
						const endSeconds = caption.end || caption.endTime || (startSeconds + 1); // Default 1 second duration if no end time
						
						// Convert to milliseconds for timeline
						const startTimeMs = Math.round(startSeconds * 1000);
						let endTimeMs = Math.round(endSeconds * 1000);
						
						// Extract text content with fallbacks
						const captionText = caption.word || caption.text || "Vertical Caption";
						
						
						// Validate timing - ensure minimum duration but respect original timing
						if (startTimeMs >= endTimeMs) {
							console.warn(`⚠️   Invalid timing for vertical caption ${i + 1}, using minimum duration while preserving start time`);
							endTimeMs = startTimeMs + 500; // Minimum 500ms duration for vertical captions
							console.warn(`⚠️   Fixed timing: ${startTimeMs}ms → ${endTimeMs}ms`);
						}
						
						// Always mark as processed (strict timing adherence)
						processedIndices.add(caption.originalIndex);
						
						// Get font details from caption
						const requestedFontFamily = caption.fontFamily || caption.style?.fontFamily;
						const fontDetails = resolveLocalFontFromJson(requestedFontFamily, caption.style?.fontWeight || caption.weight, true);
						
						if (requestedFontFamily) {
							if (fontDetails) {
								usedFonts.add(fontDetails.postScriptName);
							} else {
							}
						}
						
						// Resolve font directly from JSON font fields (supports snake_case and camelCase)
						const jsonFontNameRaw =
							caption.font_name ||
							caption.fontFamily ||
							caption.font_family ||
							caption.style?.font_family ||
							caption.style?.fontFamily;
						let fontFamilyToUse: string | undefined;
						let fontUrlToUse: string | undefined;
						if (jsonFontNameRaw && typeof jsonFontNameRaw === 'string') {
							const cleanFontBase = jsonFontNameRaw.trim().replace(/\.ttf$/i, '');
							fontFamilyToUse = cleanFontBase;
							fontUrlToUse = `/fonts/${cleanFontBase}.ttf`;
						} else {
						}
						
						// Create uniform text payload with STRICT timing from localStorage
						const textPayload = createUniformTextPayload({
							text: captionText,
							startTimeMs: Math.max(0, startTimeMs),
							endTimeMs: Math.max(startTimeMs + 100, endTimeMs),
							isVertical: true,
							originalIndex: caption.originalIndex,
							fontFamily: fontFamilyToUse,
							fontUrl: fontUrlToUse,
							isFromCaption: true
						});
						
						// Add vertical-specific properties (word wrap prevention is now handled in createUniformTextPayload)
						if (textPayload.details && typeof textPayload.details === 'object') {
							// Preserve ominous property from caption
							(textPayload.details as any).ominous = caption.ominous === true || caption.ominous === "true";
						}
						
						
						captionPayloads.push(textPayload);
						processedCount++;
						
					} catch (captionError) {
						console.error(`❌   Error processing vertical caption ${i + 1}:`, captionError);
						errorIndices.add(caption.originalIndex);
						errorCount++;
						
						// Even if there's an error, try to create a basic payload with strict timing
						try {
							const fallbackText = caption.word || caption.text || `Vertical Caption ${i + 1}`;
							const fallbackStartMs = Math.round((caption.start || caption.startTime || 0) * 1000);
							const fallbackEndMs = Math.round((caption.end || caption.endTime || (caption.start || caption.startTime || 0) + 1) * 1000);
							
							const fallbackPayload = createUniformTextPayload({
								text: fallbackText,
								startTimeMs: Math.max(0, fallbackStartMs),
								endTimeMs: Math.max(fallbackStartMs + 500, fallbackEndMs),
								isVertical: true,
								originalIndex: caption.originalIndex,
								isFromCaption: true
							});
							
							// Note: word wrap prevention is now handled in createUniformTextPayload for vertical captions
							
							captionPayloads.push(fallbackPayload);
							processedIndices.add(caption.originalIndex);
							console.warn(`⚠️   Created fallback payload for vertical caption ${i + 1} with strict timing`);
						} catch (fallbackError) {
							console.error(`❌   Failed to create fallback payload for vertical caption ${i + 1}:`, fallbackError);
						}
					}
				}
			}
			
			// Process non-vertical captions with words-at-a-time grouping
			
			if (nonVerticalCaptions.length === 0) {
			} else {
				// Group non-vertical captions by wordsAtATime setting
				const captionGroups: any[][] = [];
				for (let i = 0; i < nonVerticalCaptions.length; i += wordsAtATime) {
					const group = nonVerticalCaptions.slice(i, i + wordsAtATime);
					captionGroups.push(group);
				}
				
			
			for (let groupIndex = 0; groupIndex < captionGroups.length; groupIndex++) {
				const captionGroup = captionGroups[groupIndex];
				
				try {
					// Extract timing information from first and last caption in group
					const firstCaption = captionGroup[0];
					const lastCaption = captionGroup[captionGroup.length - 1];
					
					const startSeconds = firstCaption.start || firstCaption.startTime || 0;
					const endSeconds = lastCaption.end || lastCaption.endTime || (lastCaption.start || lastCaption.startTime || 0) + 3;
					
					// Convert to milliseconds for timeline
					const startTimeMs = Math.round(startSeconds * 1000);
					let endTimeMs = Math.round(endSeconds * 1000);
					
					// If any caption in group is part of a cycle, extend end to cycle's end
					for (const caption of captionGroup) {
						const cycle = indexToCycle[caption.originalIndex];
						if (cycle !== undefined && cycleEndMsByCycle[cycle] !== undefined) {
							endTimeMs = Math.max(endTimeMs, cycleEndMsByCycle[cycle]);
						}
					}
					
					// Combine text content from all captions in the group
					const captionTexts = captionGroup.map(caption => caption.word || caption.text || "Caption text");
					const captionText = captionTexts.join(" ");
					
					
					
					// Validate timing - but be more lenient and fix issues instead of skipping
					if (startTimeMs >= endTimeMs) {
						console.warn(`⚠️   Invalid timing for caption group ${groupIndex + 1}, fixing with minimum duration`);
						endTimeMs = startTimeMs + 1000; // Add 1 second minimum duration
						console.warn(`⚠️   Fixed timing: ${startTimeMs}ms → ${endTimeMs}ms`);
					}
					
					// Mark all captions in the group as processed
					for (const caption of captionGroup) {
						processedIndices.add(caption.originalIndex);
					}
					
					// Get font details from the first caption in the group
					const firstCaptionForFont = captionGroup[0];
					const requestedFontFamily = firstCaptionForFont.fontFamily || firstCaptionForFont.style?.fontFamily;
					const fontDetails = resolveLocalFontFromJson(requestedFontFamily, firstCaptionForFont.style?.fontWeight || firstCaptionForFont.weight, false);
					
					if (requestedFontFamily) {
						if (fontDetails) {
							usedFonts.add(fontDetails.postScriptName);
						} else {
						}
					}
					
					// Resolve font directly from JSON font fields (supports snake_case and camelCase)
					// Fonts are located in /public/fonts; we append .ttf
					const jsonFontNameRaw =
						firstCaptionForFont.font_name ||
						firstCaptionForFont.fontFamily ||
						firstCaptionForFont.font_family ||
						firstCaptionForFont.style?.font_family ||
						firstCaptionForFont.style?.fontFamily;
					let fontFamilyToUse: string | undefined;
					let fontUrlToUse: string | undefined;
					if (jsonFontNameRaw && typeof jsonFontNameRaw === 'string') {
						// ensure .ttf once
						const cleanFontBase = jsonFontNameRaw.trim().replace(/\.ttf$/i, '');
						fontFamilyToUse = cleanFontBase;
						fontUrlToUse = `/fonts/${cleanFontBase}.ttf`;
					} else {
					}
					
					// Check if any caption in the group was originally vertical
					const anyOriginallyVertical = captionGroup.some(caption => caption.originalVertical === true);
					
					// Get dynamic font size for Either Side layout if available
					const dynamicFontSize = eitherSideFontSizes.get(groupIndex);
					
					// Create uniform text payload with proper timing and font from JSON if resolvable
					const textPayload = createUniformTextPayload({
						text: captionText,
						startTimeMs: Math.max(0, startTimeMs),
						endTimeMs: Math.max(startTimeMs + 100, endTimeMs),
						isVertical: anyOriginallyVertical, // Use vertical styling if any caption was originally vertical
						originalIndex: firstCaption.originalIndex, // Use first caption's index for reference
						fontFamily: fontFamilyToUse,
						fontUrl: fontUrlToUse,
						applyRegionPositioning: !anyOriginallyVertical, // Only apply region positioning if not originally vertical
						isFromCaption: true,
						fontSize: dynamicFontSize // Apply dynamic font size for Either Side layout
					});
					
					
					// Apply layout position only if not originally vertical (vertical captions use center positioning)
					if (!anyOriginallyVertical && layoutPositions[firstCaption.originalIndex] && textPayload.details && typeof textPayload.details === 'object') {
						(textPayload.details as any).left = layoutPositions[firstCaption.originalIndex].left;
						(textPayload.details as any).top = layoutPositions[firstCaption.originalIndex].top;
						(textPayload.details as any).textAlign = 'left';
					} else if (anyOriginallyVertical) {
					}
					
					
					captionPayloads.push(textPayload);
					processedCount++;
					
				} catch (captionError) {
					console.error(`❌   Error processing caption group ${groupIndex + 1}:`, captionError);
					// Mark all captions in the group as having errors
					for (const caption of captionGroup) {
						errorIndices.add(caption.originalIndex);
					}
					errorCount++;
					
					// Even if there's an error, try to create a basic payload to avoid losing the captions
					try {
						// Create fallback with combined text from the group
						const fallbackTexts = captionGroup.map(caption => caption.word || caption.text || `Caption ${caption.originalIndex + 1}`);
						const fallbackText = fallbackTexts.join(" ");
						const anyOriginallyVerticalFallback = captionGroup.some(caption => caption.originalVertical === true);
						const firstCaptionFallback = captionGroup[0];
						// Get dynamic font size for fallback as well
						const fallbackDynamicFontSize = eitherSideFontSizes.get(groupIndex);
						
						const fallbackPayload = createUniformTextPayload({
							text: fallbackText,
							startTimeMs: Math.max(0, (firstCaptionFallback.originalIndex * 1000)),
							endTimeMs: Math.max(1000, (firstCaptionFallback.originalIndex * 1000) + 2000),
							isVertical: anyOriginallyVerticalFallback,
							originalIndex: firstCaptionFallback.originalIndex,
							applyRegionPositioning: !anyOriginallyVerticalFallback,
							isFromCaption: true,
							fontSize: fallbackDynamicFontSize // Apply dynamic font size for fallback payloads too
						});
						
						captionPayloads.push(fallbackPayload);
						// Mark all captions in the group as processed even in fallback
						for (const caption of captionGroup) {
							processedIndices.add(caption.originalIndex);
						}
						console.warn(`⚠️   Created fallback payload for caption group ${groupIndex + 1} with ${captionGroup.length} words`);
					} catch (fallbackError) {
						console.error(`❌   Failed to create fallback payload for caption group ${groupIndex + 1}:`, fallbackError);
					}
				}
			}
			} // End of else block for non-vertical captions processing
			
			// Comprehensive validation: Check if we've processed every caption
			
			// Find any missing indices
			const allIndices = new Set(Array.from({ length: parsedData.captions.length }, (_, i) => i));
			const missingIndices = Array.from(allIndices).filter(i => !processedIndices.has(i));
			
			if (missingIndices.length > 0) {
				console.error(`❌   MISSING INDICES DETECTED: [${missingIndices.join(', ')}]`);
				console.error(`❌   These captions were not processed and will be lost!`);
				
				// Try to process missing captions with basic fallback
				for (const missingIndex of missingIndices) {
					const missingCaption = parsedData.captions[missingIndex];
					console.warn(`⚠️   Creating emergency fallback for missing caption ${missingIndex + 1}`);
					
					try {
						const emergencyText = missingCaption?.word || missingCaption?.text || `Missing caption ${missingIndex + 1}`;
						const emergencyPayload = createUniformTextPayload({
							text: emergencyText,
							startTimeMs: Math.max(0, missingIndex * 1000),
							endTimeMs: Math.max(1000, (missingIndex * 1000) + 2000),
							isVertical: false,
							originalIndex: missingIndex,
							applyRegionPositioning: true,
							isFromCaption: true
						});
						
						captionPayloads.push(emergencyPayload);
						processedIndices.add(missingIndex);
						console.warn(`⚠️   Emergency payload created for index ${missingIndex}`);
					} catch (emergencyError) {
						console.error(`❌   Failed to create emergency payload for index ${missingIndex}:`, emergencyError);
					}
				}
			} else {
			}
			
			// Add all captions using PRODUCTION-OPTIMIZED sequential dispatch system
			if (captionPayloads.length > 0) {
				// CRITICAL: Temporarily disable auto-composition during bulk caption loading
				// This prevents DESIGN_RESIZE from interfering with ADD_TEXT dispatches
				const stateBefore = useStore.getState();
				const trackItemsCountBefore = Object.keys(stateBefore.trackItemsMap).length;
				const originalAutoComposition = stateBefore.autoComposition;
				
				try {
					if (originalAutoComposition) {
						console.log(`⚠️ Temporarily disabling auto-composition to prevent interference...`);
						useStore.getState().setAutoComposition(false);
					}
					
					console.log(`🎬 PRODUCTION: Adding ${captionPayloads.length} captions to timeline...`);
					console.log(`🔍 Environment check:`, {
						NODE_ENV: typeof process !== 'undefined' ? process.env.NODE_ENV : 'unknown',
						isProduction: typeof window !== 'undefined' ? window.location.hostname !== 'localhost' : false,
						initialItemCount: trackItemsCountBefore,
						autoCompositionDisabled: originalAutoComposition ? 'YES (was enabled)' : 'NO (was disabled)'
					});
					
					// Debug first payload structure
					if (captionPayloads.length > 0) {
						console.log(`🔍 Sample payload:`, {
							id: captionPayloads[0].id,
							type: captionPayloads[0].type,
							hasDetails: !!captionPayloads[0].details,
							text: captionPayloads[0].details?.text,
							fontSize: captionPayloads[0].details?.fontSize,
							timing: captionPayloads[0].display
						});
					}
					
					// PRODUCTION STRATEGY: Sequential dispatch with state verification after each addition
					let successCount = 0;
					let failureCount = 0;
					const failedPayloads: any[] = [];
					const addedIds: string[] = [];
					
					console.log(`🚀 SEQUENTIAL DISPATCH: Processing ${captionPayloads.length} captions one by one...`);
					
					for (let i = 0; i < captionPayloads.length; i++) {
						const payload = captionPayloads[i];
						const captionNum = i + 1;
						
						try {
							console.log(`📤 [${captionNum}/${captionPayloads.length}] Dispatching: "${payload.details?.text}" (ID: ${payload.id})`);
							
							// Validate payload before dispatch
							if (!payload.id || !payload.type || !payload.details || !payload.details.text) {
								throw new Error(`Invalid payload structure: missing ${!payload.id ? 'id' : !payload.type ? 'type' : 'details/text'}`);
							}
							
							// Get state snapshot before this dispatch
							const preDispatchState = useStore.getState();
							const preDispatchCount = Object.keys(preDispatchState.trackItemsMap).length;
							
							// Dispatch the caption
							dispatch(ADD_TEXT, {
								payload: payload,
								options: {},
							});
							
							// Wait for state to update (production needs longer delays)
							await new Promise(resolve => setTimeout(resolve, 250));
							
							// Verify this specific caption was added
							const postDispatchState = useStore.getState();
							const postDispatchCount = Object.keys(postDispatchState.trackItemsMap).length;
							const wasAdded = postDispatchState.trackItemsMap[payload.id];
							
							if (wasAdded) {
								successCount++;
								addedIds.push(payload.id);
								console.log(`✅ [${captionNum}/${captionPayloads.length}] SUCCESS: "${payload.details?.text}" added (count: ${preDispatchCount} → ${postDispatchCount})`);
							} else {
								failureCount++;
								failedPayloads.push({ payload, attempt: 1, reason: 'Not found in state after dispatch' });
								console.warn(`⚠️ [${captionNum}/${captionPayloads.length}] FAILED: "${payload.details?.text}" not in state (count: ${preDispatchCount} → ${postDispatchCount})`);
							}
							
						} catch (error) {
							failureCount++;
							const errorMessage = error instanceof Error ? error.message : String(error);
							failedPayloads.push({ payload, attempt: 1, reason: errorMessage });
							console.error(`❌ [${captionNum}/${captionPayloads.length}] ERROR dispatching "${payload.details?.text}":`, error);
						}
					}
					
					console.log(`📊 FIRST PASS RESULTS: ${successCount} success, ${failureCount} failed`);
					
					// RETRY FAILED CAPTIONS (up to 2 more attempts)
					if (failedPayloads.length > 0) {
						console.log(`🔄 RETRY: Attempting to recover ${failedPayloads.length} failed captions...`);
						
						for (let attempt = 2; attempt <= 3; attempt++) {
							const stillFailed: any[] = [];
							
							for (const failedItem of failedPayloads) {
								if (failedItem.attempt >= attempt) continue; // Skip if already attempted
								
								const { payload } = failedItem;
								
								try {
									console.log(`🔄 [Attempt ${attempt}] Retrying: "${payload.details?.text}" (ID: ${payload.id})`);
									
									// Check if somehow it exists now
									const currentState = useStore.getState();
									if (currentState.trackItemsMap[payload.id]) {
										console.log(`✅ [Attempt ${attempt}] RECOVERED: "${payload.details?.text}" found in state`);
										successCount++;
										addedIds.push(payload.id);
										continue;
									}
									
									// Re-dispatch with longer delay
									dispatch(ADD_TEXT, {
										payload: payload,
										options: {},
									});
									
									// Longer wait for retries
									await new Promise(resolve => setTimeout(resolve, 500));
									
									// Check if it worked
									const newState = useStore.getState();
									if (newState.trackItemsMap[payload.id]) {
										console.log(`✅ [Attempt ${attempt}] RETRY SUCCESS: "${payload.details?.text}"`);
										successCount++;
										addedIds.push(payload.id);
									} else {
										failedItem.attempt = attempt;
										stillFailed.push(failedItem);
										console.warn(`⚠️ [Attempt ${attempt}] RETRY FAILED: "${payload.details?.text}"`);
									}
									
								} catch (retryError) {
									failedItem.attempt = attempt;
									failedItem.reason = retryError instanceof Error ? retryError.message : String(retryError);
									stillFailed.push(failedItem);
									console.error(`❌ [Attempt ${attempt}] RETRY ERROR: "${payload.details?.text}":`, retryError);
								}
							}
							
							// Update failed list
							failedPayloads.length = 0;
							failedPayloads.push(...stillFailed);
							
							if (failedPayloads.length === 0) {
								console.log(`🎉 All captions recovered after ${attempt} attempts!`);
								break;
							}
						}
					}
					
					// FINAL STATE VERIFICATION
					const finalState = useStore.getState();
					const finalCount = Object.keys(finalState.trackItemsMap).length;
					const actuallyAdded = finalCount - trackItemsCountBefore;
					
					console.log(`📊 FINAL RESULTS:`);
					console.log(`   Initial items: ${trackItemsCountBefore}`);
					console.log(`   Final items: ${finalCount}`);
					console.log(`   Actually added: ${actuallyAdded}`);
					console.log(`   Expected: ${captionPayloads.length}`);
					console.log(`   Success rate: ${successCount}/${captionPayloads.length} (${Math.round(successCount/captionPayloads.length*100)}%)`);
					
					if (failedPayloads.length > 0) {
						console.error(`❌ PERMANENTLY FAILED (${failedPayloads.length}):`, 
							failedPayloads.map(f => ({ 
								text: f.payload.details?.text, 
								id: f.payload.id, 
								reason: f.reason 
							}))
						);
					}
					
					// Update error tracking
					errorCount = failedPayloads.length;
					
					// Re-enable auto-composition if it was originally enabled
					if (originalAutoComposition) {
						console.log(`✅ Re-enabling auto-composition after caption loading...`);
						useStore.getState().setAutoComposition(true);
					}
					
				} catch (dispatchError) {
					console.error(`❌ CRITICAL ERROR in dispatch system:`, dispatchError);
					errorCount = captionPayloads.length;
					
					// Re-enable auto-composition even on error
					if (originalAutoComposition) {
						console.log(`⚠️ Re-enabling auto-composition after error...`);
						useStore.getState().setAutoComposition(true);
					}
				} finally {
					// Always re-enable auto-composition in finally block to ensure cleanup
					if (originalAutoComposition && !useStore.getState().autoComposition) {
						console.log(`🔄 [CLEANUP] Re-enabling auto-composition in finally block...`);
						useStore.getState().setAutoComposition(true);
					}
				}
			} else {
				console.error(`❌ No caption payloads were created! All captions were lost.`);
				errorCount = totalCaptions;
			}
			
			// Step 6: Summary and completion
			
			if (processedIndices.size > 0) {
						toast.success(`Successfully processed ${processedIndices.size}/${totalCaptions} captions from JSON!`);
				// Refresh transcript view to show newly loaded captions
				loadAvailableCaptions();
			} else {
				console.error('❌ ==========================================');
				console.error('❌ NO CAPTIONS WERE PROCESSED SUCCESSFULLY');
				console.error('❌ ==========================================');
				toast.error("No captions were processed successfully. Check console for details.");
			}
			
		} catch (error) {
			console.error('❌ ==========================================');
			console.error('❌ ERROR LOADING CAPTIONS FROM JSON');
			console.error('❌ ==========================================');
			console.error('❌ Error type:', error instanceof Error ? error.constructor.name : typeof error);
			console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
			console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
			console.error('❌ Full error object:', error);
			toast.error(`Failed to load captions: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	};

	const handleAddCreativeCaptions = async () => {
		setIsLoadingCaptions(true);
		toast.info("Processing video for creative captions...");

		let data: any = null; // Declare data variable to be accessible in catch block

		try {
			// Step 1: Check if all B-roll videos have context
			const videosB = uploads.filter(
				(upload) => (upload.type?.startsWith("video/") || upload.type === "video") && upload.aRollType === "b-roll"
			);
			
			if (videosB.length > 0) {
				const videosWithoutContext = videosB.filter(video => !video.metadata?.context || video.metadata.context.trim() === "");
				
				if (videosWithoutContext.length > 0) {
						setIsLoadingCaptions(false);
					toast.error(`Please add context for all B-roll videos before generating captions. ${videosWithoutContext.length} B-roll video(s) missing context.`);
					return;
				}
				
			}

			// Step 2: Get video files from the timeline
			const videoItems = Object.values(trackItemsMap).filter(
				(item) => item.type === "video"
			);

			// Step 2b: Get audio files from the timeline
			const audioItems = Object.values(trackItemsMap).filter(
				(item) => item.type === "audio"
			);

			console.log(`🎵 Found ${audioItems.length} audio item(s) in timeline`);
			audioItems.forEach((audio, index) => {
				console.log(`   Audio ${index + 1}: ${audio.details?.src || 'No source'}`);
			});

			if (videoItems.length === 0) {
				console.error('❌ No videos found in timeline');
				toast.error("No video found in timeline. Please add a video first.");
				return;
			}

			// Try to use the selected video first, then fall back to the first video
			let videoItem = null;
			
			// Check if any video is currently selected
			if (activeIds.length > 0) {
				for (const activeId of activeIds) {
					const activeItem = trackItemsMap[activeId];
					if (activeItem && activeItem.type === "video") {
						videoItem = activeItem;
						break;
					}
				}
			}
			
			// If no video is selected or selected item is not a video, use the first video
			if (!videoItem) {
				videoItem = videoItems[0];
			}
			
			const videoUrl = videoItem.details.src;


			// Step 3: Prepare B-roll context data for API
			const brollContextData = videosB.map(video => ({
				videoId: video.id,
				fileName: video.fileName || video.file?.name || 'Unknown',
				context: video.metadata?.context || ''
			}));


			// Step 4: Fetch video and prepare for upload

			let finalVideoUrl = videoUrl;

			// Check if video has a local URL already available
			const existingLocalUrl = videoItem.metadata?.localUrl;
			if (existingLocalUrl && existingLocalUrl.startsWith('https://cinetune-llh0.onrender.com')) {
				finalVideoUrl = existingLocalUrl;
			} else if (videoUrl?.startsWith('blob:') || videoUrl?.startsWith('data:')) {
				throw new Error('Blob/data URLs require special handling. Please use uploaded video files with HTTP URLs.');
			}

			// Fetch video and create FormData

			const localVideoResponse = await fetch(finalVideoUrl);

			if (!localVideoResponse.ok) {
				const localVideoError = await localVideoResponse.text();
				console.error('❌ Failed to fetch video:', localVideoError);
				throw new Error(`Failed to fetch video: ${localVideoResponse.status} - ${localVideoError}`);
			}

			const videoBlob = await localVideoResponse.blob();

			if (videoBlob.size === 0) {
				throw new Error('Video blob is empty (0 bytes)');
			}

			// Create File object
			const filename = videoUrl.split('/').pop() || `video_${videoItem.id}.mp4`;
			const videoFile = new File([videoBlob], filename, { type: videoBlob.type || 'video/mp4' });

			// --- AUDIO TRACK CHECK ---
			let audioCheckDone = false;
			let videoOrientation: 'vertical' | 'horizontal' = 'vertical'; // default
			try {
				const videoForCheck = document.createElement('video');
				videoForCheck.preload = 'metadata';
				videoForCheck.src = URL.createObjectURL(videoFile);
				videoForCheck.muted = true;
				await new Promise<void>((resolve, reject) => {
					videoForCheck.onloadedmetadata = () => {
						let hasAudio = false;
						const anyVideo = videoForCheck as any;
						if (anyVideo.audioTracks && anyVideo.audioTracks.length > 0) {
							hasAudio = true;
						}
						else if (typeof anyVideo.mozHasAudio !== 'undefined') {
							hasAudio = anyVideo.mozHasAudio;
						}
						else if (typeof anyVideo.webkitAudioDecodedByteCount !== 'undefined') {
							hasAudio = anyVideo.webkitAudioDecodedByteCount > 0;
						}
						if (!hasAudio) {
							console.warn('⚠️ The selected video does NOT have an audio track!');
							toast.warning('Warning: The selected video does NOT have an audio track. Captions will be generated, but no audio will be sent.');
						} else {
							}
						// Orientation check
						if (videoForCheck.videoHeight > videoForCheck.videoWidth) {
							videoOrientation = 'vertical';
							} else {
							videoOrientation = 'horizontal';
							}
						URL.revokeObjectURL(videoForCheck.src);
						resolve();
					};
					videoForCheck.onerror = () => {
						console.warn('⚠️ Could not check audio track or orientation (possibly due to CORS or unsupported browser). Proceeding anyway.');
						resolve();
					};
				});
				audioCheckDone = true;
			} catch (audioCheckErr) {
				console.warn('⚠️ Audio/Orientation check failed:', audioCheckErr);
			}
			if (!audioCheckDone) {
				console.warn('⚠️ Audio/Orientation check was not completed. Defaulting to vertical.');
			}
			// --- END AUDIO TRACK & ORIENTATION CHECK ---

			const captionFormData = new FormData();
			captionFormData.append('video', videoFile);
			captionFormData.append('orientation', videoOrientation); // Now dynamic
			
			// Step 5: Add audio files from timeline if any exist
			if (audioItems.length > 0) {
				console.log(`🎵 Processing ${audioItems.length} audio file(s) from timeline...`);
				
				for (let i = 0; i < audioItems.length; i++) {
					const audioItem = audioItems[i];
					const audioUrl = audioItem.details?.src;
					
					if (!audioUrl) {
						console.warn(`⚠️ Audio item ${i + 1} has no source URL, skipping`);
						continue;
					}
					
					try {
						console.log(`🎵 Fetching audio ${i + 1}: ${audioUrl}`);
						
						// Fetch audio file
						const audioResponse = await fetch(audioUrl);
						if (!audioResponse.ok) {
							console.error(`❌ Failed to fetch audio ${i + 1}: ${audioResponse.status}`);
							continue;
						}
						
						const audioBlob = await audioResponse.blob();
						if (audioBlob.size === 0) {
							console.warn(`⚠️ Audio ${i + 1} blob is empty, skipping`);
							continue;
						}
						
						// Create audio file object with appropriate name
						const audioFilename = audioUrl.split('/').pop() || `audio_${audioItem.id}.mp3`;
						const audioFile = new File([audioBlob], audioFilename, { 
							type: audioBlob.type || 'audio/mpeg' 
						});
						
						// Append to FormData with index for multiple audio files
						captionFormData.append(`audio_${i}`, audioFile);
						console.log(`✅ Added audio ${i + 1} to FormData: ${audioFilename} (${audioBlob.size} bytes)`);
						
					} catch (audioError) {
						console.error(`❌ Error processing audio ${i + 1}:`, audioError);
					}
				}
			} else {
				console.log(`ℹ️ No audio files found in timeline`);
			}
			
			// Add basic metadata (B-roll context is now handled separately via Sync B-roll button)
				const metadata = {
					videoUrl: videoUrl,
				videoId: videoItem.id,
				audioCount: audioItems.length
				};
				captionFormData.append('metadata', JSON.stringify(metadata));


			// Send to caption generation API (absolute URL)
			const response = await fetch('https://cinetune-llh0.onrender.com/api/generate-captions', {
				method: 'POST',
				body: captionFormData,
			});


			if (!response.ok) {
				let errorText = '';
				let errorJson = null;
				try {
					const responseText = await response.text();
					errorText = responseText;
					try {
						errorJson = JSON.parse(responseText);
						if (errorJson.error) {
							console.error('❌ Backend error:', errorJson.error);
						}
					} catch (jsonParseError) {
						console.error('❌ Error response is not JSON');
					}
				} catch (textReadError) {
					console.error('❌ Failed to read error response');
					errorText = 'Failed to read error response';
				}
				let errorMessage = `HTTP error! status: ${response.status}`;
				if (errorJson?.error) {
					errorMessage += ` - Backend error: ${errorJson.error}`;
				} else if (errorText) {
					errorMessage += ` - Response: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`;
				}
				throw new Error(errorMessage);
			}

			// Parse successful response
			try {
				const responseText = await response.text();
				data = JSON.parse(responseText);
			} catch (jsonError) {
				console.error('❌ Failed to parse response as JSON:', jsonError);
				throw new Error('Backend returned invalid JSON response');
			}


			if (!data.id) {
				console.error('❌ No job ID received from server');
				throw new Error('No job ID received from server');
			}

			
			// Save jobID immediately to localStorage for B-roll sync
			try {
				const immediateJobData = {
					jobId: data.id,
					status: 'processing',
					createdAt: new Date().toISOString(),
					videoUrl: videoUrl,
					videoId: videoItem.id
				};
				const jobKey = `captions_${data.id}`;
				localStorage.setItem(jobKey, JSON.stringify(immediateJobData));
			} catch (jobSaveError) {
				console.warn('⚠️ Failed to save job ID to localStorage:', jobSaveError);
			}
			
			toast.info("Video processing started. Retrieving captions...");

			// Step 4: Poll for captions using the jobId (absolute URLs)
			let captions = null;
			let attempts = 0;
			const maxAttempts = 1500; // 1500 seconds timeout

			while (!captions && attempts < maxAttempts) {
				await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
				try {
					const captionsResponse = await fetch(`https://cinetune-llh0.onrender.com/api/processing-status/${data.id}`);
					if (captionsResponse.ok) {
						const captionsData = await captionsResponse.json();
						if (captionsData.status === 'completed') {
							try {
								const captionsFetchResponse = await fetch(`https://cinetune-llh0.onrender.com/api/captions/${data.id}`);
								if (captionsFetchResponse.ok) {
									const captionsResult = await captionsFetchResponse.json();
									if (captionsResult.captions) {
										captions = captionsResult.captions;
										break;
									} else {
										console.error('❌ No captions data in response');
										throw new Error('No captions data received');
									}
								} else {
									console.error('❌ Failed to fetch captions data:', captionsFetchResponse.status);
									throw new Error(`Failed to fetch captions: ${captionsFetchResponse.status}`);
								}
							} catch (captionsFetchError) {
								console.error('❌ Error fetching captions data:', captionsFetchError);
								throw captionsFetchError;
							}
						} else if (captionsData.status === 'processing') {
							if (attempts % 10 === 0) {
								toast.info("Still processing video...");
							}
						} else if (captionsData.status === 'failed') {
							console.error('❌ Caption generation failed:', captionsData.error);
							throw new Error(`Caption generation failed: ${captionsData.error}`);
						}
					} else {
						console.error('❌ Processing status response not ok:', captionsResponse.status);
					}
				} catch (error) {
					console.error('❌ Polling attempt failed:', error);
				}
				attempts++;
			}

			if (!captions) {
				console.error('❌ Caption generation timed out after', maxAttempts, 'attempts');
				throw new Error('Caption generation timed out');
			}

			// Step 5: Save captions and add to timeline

			if (Array.isArray(captions)) {
				// Create a comprehensive captions data structure for later styling
				const captionsData = {
					jobId: data.id,
					videoUrl: videoUrl,
					videoId: videoItem.id,
					captions: captions.map((caption: any, index: number) => ({
						id: caption.id || `caption-${index + 1}`,
						word: caption.word || caption.text,
						start: caption.start || caption.startTime,
						end: caption.end || caption.endTime,
						style: caption.style || {},
						vertical: caption.vertical || false,
						text: caption.text,
						startTime: caption.startTime,
						endTime: caption.endTime,
						...caption
					})),
					metadata: {
						totalDuration: Math.max(...captions.map((c: any) => (c.end || c.endTime || 0) * 1000)),
						fps: 30,
						videoWidth: 1080,
						videoHeight: 1920,
						processingTime: Date.now(),
						model: "whisper-large-v3",
						language: "en"
					},
					status: "completed",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				};

				// Save captions data to localStorage
				try {
					const allKeys = Object.keys(localStorage);
					const oldCaptionKeys = allKeys.filter((key) => key.startsWith('captions_') && key !== `captions_${data.id}`);
					if (oldCaptionKeys.length > 0) {
						oldCaptionKeys.forEach((key) => localStorage.removeItem(key));
					}
				} catch (cleanupError) {
					console.warn('⚠️ Failed to clean up old captions keys:', cleanupError);
				}

				const captionsKey = `captions_${data.id}`;

				localStorage.setItem(captionsKey, JSON.stringify(captionsData));

				toast.success(`Successfully generated ${captions.length} creative captions! Use "Load captions from JSON" to add them to the timeline.`);
				// Refresh transcript view to show newly generated captions
				loadAvailableCaptions();
			} else {
				console.warn('⚠️ No captions array received');
				toast.warning("No captions were generated. Please try again.");
			}
		} catch (error) {
			console.error('❌ Error in creative captions process:', error);
			toast.error(`Failed to generate creative captions: ${error instanceof Error ? error.message : 'Unknown error'}`);
			
			// Clean up the localStorage entry if it was created but processing failed
			try {
				const errorJobId = data && data.id ? data.id : null;
				if (errorJobId) {
					const errorJobKey = `captions_${errorJobId}`;
					const existingData = localStorage.getItem(errorJobKey);
					if (existingData) {
						const parsedData = JSON.parse(existingData);
						if (parsedData.status === 'processing') {
							// Update status to failed instead of removing completely
							parsedData.status = 'failed';
							parsedData.error = error instanceof Error ? error.message : 'Unknown error';
							parsedData.updatedAt = new Date().toISOString();
							localStorage.setItem(errorJobKey, JSON.stringify(parsedData));
							}
					}
				}
			} catch (cleanupError) {
				console.warn('⚠️ Failed to update failed job status in localStorage:', cleanupError);
			}
		} finally {
			setIsLoadingCaptions(false);
		}
	};

	const handleAddAudio = () => {
		dispatch(ADD_AUDIO, {
			payload: {
				id: nanoid(),
				details: {
					src: "https://cdn.designcombo.dev/quick-brown.mp3",
				},
			},
			options: {},
		});
	};
	// https://cdn.designcombo.dev/rect-gray.png

	const handleAddImage = () => {
		dispatch(ADD_IMAGE, {
			payload: {
				id: nanoid(),
				details: {
					src: "https://cdn.designcombo.dev/rect-gray.png",
				},
			},
			options: {},
		});
	};

	return (
		<div className="flex flex-1 flex-col">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
				Text
			</div>
			<div className="flex flex-col gap-2 px-4">
				{/* Caption Region Selector */}
				<div className="flex flex-col gap-2">
					<label className="text-sm font-medium text-muted-foreground">
						Caption Region
					</label>
					<select
						value={captionRegion}
						onChange={(e) => setCaptionRegion(e.target.value as any)}
						className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm shadow-xs transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="top_left">Top Left</option>
						<option value="top_right">Top Right</option>
						<option value="bottom_left">Bottom Left</option>
						<option value="bottom_right">Bottom Right</option>
						<option value="center">Center</option>
						<option value="bottom_center">Bottom Center</option>
					</select>
				</div>

				{/* Grid Layout Selector */}
				<div className="flex flex-col gap-2">
					<label className="text-sm font-medium text-muted-foreground">
						Grid Layout
					</label>
					<select
						value={gridLayout}
						onChange={(e) => setGridLayout(e.target.value as 'default' | 'either_side')}
						className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm shadow-xs transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="default">Default (3×3 Grid)</option>
						<option value="either_side">Either Side - 1 Line</option>
					</select>
				</div>

				{/* Words at a time selector */}
				<div className="flex flex-col gap-2">
					<label className="text-sm font-medium text-muted-foreground">
						Words at a time
					</label>
					<select
						value={wordsAtATime}
						onChange={(e) => setWordsAtATime(Number(e.target.value))}
						className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm shadow-xs transition-colors hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="1">1 word</option>
						<option value="2">2 words</option>
						<option value="3">3 words</option>
					</select>
				</div>

				<Draggable
					data={TEXT_ADD_PAYLOAD}
					renderCustomPreview={
						<Button variant="secondary" className="w-60">
							Add text
						</Button>
					}
					shouldDisplayPreview={!isDraggingOverTimeline}
				>
					<div
						onClick={handleAddText}
						className={cn(
							buttonVariants({ variant: "default" }),
							"cursor-pointer",
						)}
					>
						Add text
					</div>
				</Draggable>
				
				<Button 
					variant="secondary" 
					className="w-60" 
					onClick={handleAddCreativeCaptions}
					disabled={isLoadingCaptions}
				>
					{isLoadingCaptions ? "Processing..." : "Add creative captions"}
				</Button>
				
				<Button 
					variant="outline" 
					className="w-60" 
					onClick={handleLoadCaptionsFromJSON}
				>
					Load captions from JSON
				</Button>

				{/* Transcript Popover */}
				{availableCaptions.length > 0 && (
					<Popover>
						<PopoverTrigger asChild>
							<Button 
								variant="ghost" 
								className="w-60"
								onClick={() => {
									loadAvailableCaptions(); // Refresh captions when opening
								}}
							>
								Show transcript
							</Button>
						</PopoverTrigger>
						<PopoverContent 
							className="w-[600px] max-w-[90vw] p-0"
							style={{ backgroundColor: '#0b0b0b', borderColor: '#1f1f1f' }}
							align="start"
							side="right"
							sideOffset={10}
						>
							{/* Header */}
							<div className="p-4 border-b" style={{ borderColor: '#1f1f1f' }}>
								<h3 className="text-sm font-medium text-white">Transcript</h3>
								<p className="text-xs text-gray-400">
									{availableCaptions.length} words • 
									{availableCaptions.filter((c: any) => c.vertical).length} vertical • 
									{availableCaptions.filter((c: any) => !c.vertical).length} horizontal
								</p>
								
								{/* Filter Options */}
								<div className="flex gap-2 mt-3">
									<Button 
										variant="outline" 
										size="sm"
										className="text-xs h-7 px-3 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
										onClick={() => {
											// Show all words
											setAvailableCaptions(originalCaptions);
										}}
									>
										All
									</Button>
									<Button 
										variant="outline" 
										size="sm"
										className="text-xs h-7 px-3 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
										onClick={() => {
											// Filter to show only vertical words
											const verticalCaptions = originalCaptions.filter((c: any) => c.vertical);
											setAvailableCaptions(verticalCaptions);
										}}
									>
										Vertical
									</Button>
									<Button 
										variant="outline" 
										size="sm"
										className="text-xs h-7 px-3 bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
										onClick={() => {
											// Filter to show only horizontal words
											const horizontalCaptions = originalCaptions.filter((c: any) => !c.vertical);
											setAvailableCaptions(horizontalCaptions);
										}}
									>
										Horizontal
									</Button>
								</div>
							</div>
							
							{/* Transcript Content - Row-based Layout */}
							<div className="max-h-96 overflow-y-auto" style={{ backgroundColor: '#0b0b0b' }}>
								{availableCaptions
									.sort((a: any, b: any) => a.startTime - b.startTime)
									.map((caption, index) => (
									<div 
										key={caption.id || index}
										className="px-4 py-3 cursor-pointer transition-colors duration-200 hover:bg-gray-900 border-b"
										style={{ 
											borderColor: '#1f1f1f'
										}}
										onClick={() => {
											// Log caption details for debugging
										}}
									>
										{/* Main Row: Time | Word | Badges | End Time */}
										<div className="flex items-center gap-3 min-w-0">
											{/* Start Time */}
											<span className="text-xs font-mono text-white flex-shrink-0 w-12">
												{formatTime(caption.startTime)}
											</span>
											
											{/* Separator */}
											<span className="text-gray-500">|</span>
											
											{/* Word Text */}
											{editingWordIndex === index ? (
												<input
													className="text-lg text-white font-medium flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
													value={editingWordValue}
													autoFocus
													onChange={e => setEditingWordValue(e.target.value)}
													onBlur={() => {
														// Save edit on blur
														const updatedCaption = { 
															...caption, 
															word: editingWordValue, 
															text: editingWordValue 
														};
														
														// Update both availableCaptions and originalCaptions
														const updatedAvailable = [...availableCaptions];
														const updatedOriginal = [...originalCaptions];
														
														updatedAvailable[index] = updatedCaption;
														
														// Find and update in originalCaptions using originalIndex
														const originalIndex = caption.originalIndex !== undefined ? caption.originalIndex : index;
														const originalCaptionIndex = updatedOriginal.findIndex(c => 
															(c.originalIndex !== undefined ? c.originalIndex : updatedOriginal.indexOf(c)) === originalIndex
														);
														
														if (originalCaptionIndex !== -1) {
															updatedOriginal[originalCaptionIndex] = updatedCaption;
														}
														
														// Save to localStorage
														const saved = saveCaptionEditToLocalStorage(updatedCaption, originalIndex);
														
														if (saved) {
															setAvailableCaptions(updatedAvailable);
															setOriginalCaptions(updatedOriginal);
															toast.success(`Word updated: "${editingWordValue}"`);
														} else {
															toast.error("Failed to save edit to localStorage");
														}
														
														setEditingWordIndex(null);
													}}
													onKeyDown={e => {
														if (e.key === 'Enter') {
															// Save edit on Enter
															const updatedCaption = { 
																...caption, 
																word: editingWordValue, 
																text: editingWordValue 
															};
															
															// Update both availableCaptions and originalCaptions
															const updatedAvailable = [...availableCaptions];
															const updatedOriginal = [...originalCaptions];
															
															updatedAvailable[index] = updatedCaption;
															
															// Find and update in originalCaptions using originalIndex
															const originalIndex = caption.originalIndex !== undefined ? caption.originalIndex : index;
															const originalCaptionIndex = updatedOriginal.findIndex(c => 
																(c.originalIndex !== undefined ? c.originalIndex : updatedOriginal.indexOf(c)) === originalIndex
															);
															
															if (originalCaptionIndex !== -1) {
																updatedOriginal[originalCaptionIndex] = updatedCaption;
															}
															
															// Save to localStorage
															const saved = saveCaptionEditToLocalStorage(updatedCaption, originalIndex);
															
															if (saved) {
																setAvailableCaptions(updatedAvailable);
																setOriginalCaptions(updatedOriginal);
																toast.success(`Word updated: "${editingWordValue}"`);
															} else {
																toast.error("Failed to save edit to localStorage");
															}
															
															setEditingWordIndex(null);
														} else if (e.key === 'Escape') {
															setEditingWordIndex(null);
														}
													}}
												/>
											) : (
												<span className="text-lg text-white font-medium flex-1">
													"{caption.word || caption.text}"
													<button
														className="ml-2 p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
														title="Edit word"
														onClick={e => {
															e.stopPropagation();
															setEditingWordIndex(index);
															setEditingWordValue(caption.word || caption.text || "");
														}}
													>
														<Pencil className="w-4 h-4" />
													</button>
												</span>
											)}
											
											{/* Type Badge (H for horizontal, V for vertical) */}
											<span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
												caption.vertical 
													? 'bg-blue-600 text-white' 
													: 'bg-green-600 text-white'
											}`}>
												{caption.vertical ? 'V' : 'H'}
											</span>
											
											{/* Index Badge */}
											<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-700 text-white">
												#{caption.originalIndex !== undefined ? caption.originalIndex + 1 : index + 1}
											</span>
											
											{/* Separator */}
											<span className="text-gray-500">|</span>
											
											{/* End Time */}
											<span className="text-xs font-mono text-white flex-shrink-0 w-12">
												{formatTime(caption.endTime)}
											</span>
										</div>
										
										{/* Duration row below */}
										<div className="mt-1 text-xs text-gray-400 ml-16">
											Duration: {formatTime(caption.endTime - caption.startTime)}
											{caption.confidence && (
												<span className="ml-3">
													Confidence: {Math.round(caption.confidence * 100)}%
												</span>
											)}
										</div>
									</div>
								))}
							</div>
							
							{/* Footer Actions */}
							<div className="p-4 border-t" style={{ borderColor: '#1f1f1f', backgroundColor: '#0b0b0b' }}>
								<div className="flex gap-2">
									<Button 
										variant="outline" 
										size="sm"
										className="flex-1 text-xs bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
										onClick={() => {
											loadAvailableCaptions();
											toast.success("Transcript refreshed");
										}}
									>
										Refresh
									</Button>
									
									<Button 
										variant="outline" 
										size="sm"
										className="flex-1 text-xs bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
										onClick={() => {
											// Export transcript as text
											const transcriptText = availableCaptions
												.sort((a: any, b: any) => a.startTime - b.startTime)
												.map((caption: any) => {
													const timestamp = formatTime(caption.startTime);
													const word = caption.word || caption.text;
													const type = caption.vertical ? '[V]' : '[H]';
													return `${timestamp} ${type} ${word}`;
												})
												.join('\n');
											
											// Copy to clipboard
											navigator.clipboard.writeText(transcriptText).then(() => {
												toast.success("Transcript copied to clipboard");
											}).catch(() => {
												toast.error("Failed to copy transcript");
											});
										}}
									>
										Copy Text
									</Button>
								</div>
								
								{/* Word Stats */}
								<div className="mt-3 text-xs text-gray-400 text-center">
									Total: {availableCaptions.length} words • 
									Duration: {availableCaptions.length > 0 ? formatTime(
										Math.max(...availableCaptions.map((c: any) => c.endTime)) - 
										Math.min(...availableCaptions.map((c: any) => c.startTime))
									) : '0:00'}
								</div>
							</div>
						</PopoverContent>
					</Popover>
				)}
				
				{/* <Button variant="secondary" className="w-60" onClick={handleAddAudio}>
					Add audio
				</Button>
				<Button variant="secondary" className="w-60" onClick={handleAddImage}>
					Add image
				</Button> */}
			</div>
		</div>
	);
};
