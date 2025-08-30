import { useEffect, useRef, useState } from "react";
import { ITextDetails } from "@designcombo/types";
import { useCurrentFrame } from "remotion";
import { interpolateKeyframes, calculateRelativeFrame, shouldAnimationPlay, AnimationState } from "../utils/text-animation-utils";

interface TextAnimationData {
	id: string;
	name: string;
	keyframes: Array<{
		frame: number;
		opacity?: number;
		transform?: string;
		easing?: string;
	}>;
	duration: number;
	category: 'entrance' | 'exit' | 'emphasis';
}

const TextLayer: React.FC<{
	id: string;
	content: string;
	onChange?: (id: string, content: string) => void;
	onBlur?: (id: string, content: string) => void;
	style?: React.CSSProperties;
	editable?: boolean;
	animations?: {
		entrance?: TextAnimationData;
		exit?: TextAnimationData;
		emphasis?: TextAnimationData;
	};
	itemStartFrame?: number;
	itemEndFrame?: number;
}> = ({ id, content, editable, style = {}, onChange, onBlur, animations, itemStartFrame = 0, itemEndFrame = 100 }) => {
	const [data, setData] = useState(content);
	const divRef = useRef<HTMLDivElement>(null);
	const preservedStylesRef = useRef<Partial<CSSStyleDeclaration>>({});
	const lastStylePropsRef = useRef<React.CSSProperties>({});
	const currentFrame = useCurrentFrame();

	// Calculate animation styles
	const getAnimationStyles = (): { opacity: number; transform: string; clipPath?: string } => {
		if (!animations) {
			return { opacity: 1, transform: '' };
		}

		let finalOpacity = 1;
		const transforms: string[] = [];
		let clipPath: string | undefined;

		// Process each animation type in priority order (entrance, emphasis, exit)
		const animationOrder: Array<'entrance' | 'exit' | 'emphasis'> = ['entrance', 'emphasis', 'exit'];
		
		for (const animationType of animationOrder) {
			const animationData = animations[animationType];
			if (!animationData) continue;

			const shouldPlay = shouldAnimationPlay(
				currentFrame,
				itemStartFrame,
				itemEndFrame,
				animationType,
				animationData.duration
			);

			if (shouldPlay) {
				const relativeFrame = calculateRelativeFrame(
					currentFrame,
					itemStartFrame,
					itemEndFrame,
					animationType,
					animationData.duration
				);

				// Special handling for handwriting effect
				if (animationData.id === 'handwriting') {
					const progress = relativeFrame / animationData.duration;
					const clampedProgress = Math.max(0, Math.min(1, progress));
					
					// Create a smoother clip-path that reveals text from left to right
					// Add a small feather edge for smoother appearance
					const revealPercentage = clampedProgress * 100;
					const featherAmount = 2; // Small feather for smooth edge
					const rightInset = Math.max(0, 100 - revealPercentage - featherAmount);
					
					clipPath = `inset(0 ${rightInset}% 0 0)`;
					
					// Keep full opacity for handwriting
					finalOpacity = 1;
				} else {
					// Normal animation processing
					const animationState = interpolateKeyframes(animationData.keyframes as any, relativeFrame);
					
					// For entrance/exit animations, we want to override opacity completely
					// For emphasis animations, we might want to multiply
					if (animationType === 'entrance' || animationType === 'exit') {
						finalOpacity = animationState.opacity;
					} else if (animationType === 'emphasis') {
						finalOpacity *= animationState.opacity;
					}
					
					// Add transform if it exists
					if (animationState.transform && animationState.transform.trim()) {
						transforms.push(animationState.transform);
					}
				}
			} else if (animationType === 'entrance') {
				// Special handling for handwriting when not playing
				if (animationData.id === 'handwriting') {
					if (currentFrame < itemStartFrame) {
						// Before handwriting starts - hide text
						clipPath = `inset(0 100% 0 0)`;
					} else {
						// After handwriting completes - show all text
						clipPath = `inset(0 0% 0 0)`;
					}
				} else {
					// Normal entrance animation handling
					// Check if we're before the entrance animation starts
					if (currentFrame < itemStartFrame) {
						// We're before the item starts, so hide the text
						finalOpacity = 0;
					}
					// If we're after the entrance animation completes, text should be visible (opacity = 1)
				}
			} else if (animationType === 'exit') {
				// Exit animation is not currently playing
				// Check if we're after the exit animation completes
				const exitStartFrame = itemEndFrame - animationData.duration;
				if (currentFrame > exitStartFrame + animationData.duration) {
					// We're after the exit animation completes, so hide the text
					finalOpacity = 0;
				}
			}
		}

		return { opacity: finalOpacity, transform: transforms.join(' '), clipPath };
	};

	const animationStyles = getAnimationStyles();

	useEffect(() => {
		if (editable && divRef.current) {
			const element = divRef.current;
			element.focus();
			const selection = window.getSelection();
			const range = document.createRange();
			range.selectNodeContents(element);
			selection?.removeAllRanges();
			selection?.addRange(range);
		} else {
			const selection = window.getSelection();
			selection?.removeAllRanges();
		}
	}, [editable]);

	useEffect(() => {
		if (data !== content) {
			setData(content);
		}
	}, [content]);

	// Clear preserved styles when new style props come in (from sidebar changes)
	useEffect(() => {
		const currentStyleString = JSON.stringify(style);
		const lastStyleString = JSON.stringify(lastStylePropsRef.current);
		
		if (currentStyleString !== lastStyleString) {
			// Style props changed - clear preserved styles to allow new changes
			preservedStylesRef.current = {};
			lastStylePropsRef.current = { ...style };
		}
	}, [style]);

	// Preserve manual style changes made by moveable interactions
	useEffect(() => {
		if (!divRef.current) return;
		
		const element = divRef.current;
		
		// Create a MutationObserver to watch for style changes
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
					// Capture manual style changes that might be applied by moveable
					const currentStyle = element.style;
					
					// Preserve specific properties that get manually changed by interactions
					if (currentStyle.width && currentStyle.width !== preservedStylesRef.current.width) {
						preservedStylesRef.current.width = currentStyle.width;
					}
					if (currentStyle.height && currentStyle.height !== preservedStylesRef.current.height) {
						preservedStylesRef.current.height = currentStyle.height;
					}
					if (currentStyle.fontSize && currentStyle.fontSize !== preservedStylesRef.current.fontSize) {
						preservedStylesRef.current.fontSize = currentStyle.fontSize;
					}
				}
			});
		});
		
		// Start observing
		observer.observe(element, {
			attributes: true,
			attributeFilter: ['style']
		});
		
		return () => {
			observer.disconnect();
		};
	}, []);

	// Apply preserved styles after React re-renders
	useEffect(() => {
		if (!divRef.current) return;
		
		const element = divRef.current;
		
		// Reapply preserved manual styles after React overwrites them
		Object.entries(preservedStylesRef.current).forEach(([property, value]) => {
			if (value) {
				(element.style as any)[property] = value;
			}
		});
	});
	// Function to move caret to the end
	const moveCaretToEnd = () => {
		if (divRef.current) {
			const selection = window.getSelection();
			const range = document.createRange();
			range.selectNodeContents(divRef.current);
			range.collapse(false); // Collapse the range to the end of the content
			selection?.removeAllRanges();
			selection?.addRange(range);
		}
	};

	// OnClick handler to move caret if all text is selected
	const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
		e.stopPropagation();
		const selection = window.getSelection();
		const element = divRef.current;

		if (selection?.rangeCount && element) {
			const range = selection.getRangeAt(0);
			if (range.endOffset - range.startOffset === element.textContent?.length) {
				// All text is selected, move caret to the end
				moveCaretToEnd();
			}
		}
	};
	return (
		<div
			data-text-id={id}
			ref={divRef}
			contentEditable={editable}
			onClick={handleClick}
			onInput={(ev) => onChange?.(id, (ev.target as any).innerText)}
			onBlur={(ev) => onBlur?.(id, (ev.target as any).innerText)}
			style={{
				boxShadow: "none",
				outline: editable ? "2px solid #00d8d6" : "none",
				border: editable ? "1px dashed #00d8d6" : "none",
				background: editable ? "rgba(0, 216, 214, 0.05)" : "transparent",
				borderRadius: editable ? "4px" : "0",
				padding: editable ? "4px" : "0",
				pointerEvents: editable ? "auto" : "none",
				whiteSpace: "normal",
				// Apply base style props
				...style,
				// Smart override: use preserved styles only if they exist, otherwise use style props with defaults
				width: preservedStylesRef.current.width || style.width || "100%",
				height: preservedStylesRef.current.height || style.height || "100%",
				fontSize: preservedStylesRef.current.fontSize || style.fontSize,
				// Apply animation styles
				opacity: (typeof style.opacity === 'number' ? style.opacity : 1) * animationStyles.opacity,
				transform: [style.transform, animationStyles.transform].filter(Boolean).join(' '),
				transformOrigin: 'center center',
				clipPath: animationStyles.clipPath,
				// Add transition for smoother handwriting effect
				...(animationStyles.clipPath && {
					transition: 'none', // Disable transitions during animation for smoother control
				}),
			}}
			suppressContentEditableWarning
			// dangerouslySetInnerHTML={{ __html: content }}
			className="designcombo_textLayer"
		>
			{content}
		</div>
	);
};

export default TextLayer;
