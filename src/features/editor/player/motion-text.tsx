import { useEffect, useRef, useState } from "react";
import { ITextDetails } from "@designcombo/types";

const TextLayer: React.FC<{
	id: string;
	content: string;
	onChange?: (id: string, content: string) => void;
	onBlur?: (id: string, content: string) => void;
	style?: React.CSSProperties;
	editable?: boolean;
}> = ({ id, content, editable, style = {}, onChange, onBlur }) => {
	const [data, setData] = useState(content);
	const divRef = useRef<HTMLDivElement>(null);
	const preservedStylesRef = useRef<Partial<CSSStyleDeclaration>>({});
	const lastStylePropsRef = useRef<React.CSSProperties>({});

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
