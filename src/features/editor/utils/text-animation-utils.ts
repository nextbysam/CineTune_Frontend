import { TextAnimationKeyframe } from "../constants/text-animations";

export interface AnimationState {
	opacity: number;
	transform: string;
}

export function interpolateKeyframes(
	keyframes: TextAnimationKeyframe[],
	currentFrame: number,
): AnimationState {
	if (keyframes.length === 0) {
		return { opacity: 1, transform: "" };
	}

	if (keyframes.length === 1) {
		return {
			opacity: keyframes[0].opacity ?? 1,
			transform: keyframes[0].transform ?? "",
		};
	}

	// Sort keyframes by frame
	const sortedKeyframes = [...keyframes].sort((a, b) => a.frame - b.frame);

	// Find the appropriate keyframe range
	let startKeyframe = sortedKeyframes[0];
	let endKeyframe = sortedKeyframes[sortedKeyframes.length - 1];

	for (let i = 0; i < sortedKeyframes.length - 1; i++) {
		if (
			currentFrame >= sortedKeyframes[i].frame &&
			currentFrame <= sortedKeyframes[i + 1].frame
		) {
			startKeyframe = sortedKeyframes[i];
			endKeyframe = sortedKeyframes[i + 1];
			break;
		}
	}

	// If currentFrame is before first keyframe, use first keyframe
	if (currentFrame <= sortedKeyframes[0].frame) {
		return {
			opacity: startKeyframe.opacity ?? 1,
			transform: startKeyframe.transform ?? "",
		};
	}

	// If currentFrame is after last keyframe, use last keyframe
	if (currentFrame >= sortedKeyframes[sortedKeyframes.length - 1].frame) {
		return {
			opacity: endKeyframe.opacity ?? 1,
			transform: endKeyframe.transform ?? "",
		};
	}

	// Interpolate between keyframes
	const progress =
		(currentFrame - startKeyframe.frame) /
		(endKeyframe.frame - startKeyframe.frame);
	const easedProgress = applyEasing(progress, endKeyframe.easing || "linear");

	// Interpolate opacity
	const startOpacity = startKeyframe.opacity ?? 1;
	const endOpacity = endKeyframe.opacity ?? 1;
	const interpolatedOpacity =
		startOpacity + (endOpacity - startOpacity) * easedProgress;

	// For transforms, we need to interpolate more intelligently
	let transform = "";

	if (startKeyframe.transform && endKeyframe.transform) {
		// Try to interpolate numeric values in transforms
		transform = interpolateTransforms(
			startKeyframe.transform,
			endKeyframe.transform,
			easedProgress,
		);
	} else {
		// Use whichever transform exists
		transform = endKeyframe.transform ?? startKeyframe.transform ?? "";
	}

	return {
		opacity: interpolatedOpacity,
		transform,
	};
}

function applyEasing(progress: number, easing: string): number {
	switch (easing) {
		case "ease":
			return cubicBezier(0.25, 0.1, 0.25, 1.0)(progress);
		case "ease-in":
			return cubicBezier(0.42, 0, 1.0, 1.0)(progress);
		case "ease-out":
			return cubicBezier(0, 0, 0.58, 1.0)(progress);
		case "ease-in-out":
			return cubicBezier(0.42, 0, 0.58, 1.0)(progress);
		case "linear":
		default:
			return progress;
	}
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
	return (t: number): number => {
		if (t <= 0) return 0;
		if (t >= 1) return 1;

		// Simplified cubic bezier approximation
		// This is not a full implementation but works for basic easing
		const t2 = t * t;
		const t3 = t2 * t;
		const u = 1 - t;
		const u2 = u * u;
		const u3 = u2 * u;

		return 3 * u2 * t * y1 + 3 * u * t2 * y2 + t3;
	};
}

export function calculateRelativeFrame(
	currentFrame: number,
	itemStartFrame: number,
	itemEndFrame: number,
	animationType: "entrance" | "exit" | "emphasis",
	animationDuration: number,
): number {
	const itemDuration = itemEndFrame - itemStartFrame;

	switch (animationType) {
		case "entrance":
			// Entrance animations play at the beginning of the item
			return Math.max(0, currentFrame - itemStartFrame);

		case "exit": {
			// Exit animations play at the end of the item
			const exitStartFrame = itemEndFrame - animationDuration;
			return Math.max(0, currentFrame - exitStartFrame);
		}

		case "emphasis": {
			// Emphasis animations loop throughout the item duration
			const relativeFrame = (currentFrame - itemStartFrame) % animationDuration;
			return Math.max(0, relativeFrame);
		}

		default:
			return Math.max(0, currentFrame - itemStartFrame);
	}
}

export function shouldAnimationPlay(
	currentFrame: number,
	itemStartFrame: number,
	itemEndFrame: number,
	animationType: "entrance" | "exit" | "emphasis",
	animationDuration: number,
): boolean {
	// Check if we're within the item's duration
	if (currentFrame < itemStartFrame || currentFrame >= itemEndFrame) {
		return false;
	}

	const itemDuration = itemEndFrame - itemStartFrame;

	switch (animationType) {
		case "entrance":
			// Entrance plays only at the beginning
			return currentFrame - itemStartFrame < animationDuration;

		case "exit":
			// Exit plays only at the end
			return currentFrame - itemStartFrame >= itemDuration - animationDuration;

		case "emphasis":
			// Emphasis plays throughout the duration (loops)
			return true;

		default:
			return false;
	}
}

function interpolateTransforms(
	startTransform: string,
	endTransform: string,
	progress: number,
): string {
	// Simple transform interpolation for common cases
	// This handles translateX, translateY, scale, rotate, etc.

	const interpolateValue = (start: number, end: number): number => {
		return start + (end - start) * progress;
	};

	// Extract and interpolate translateX
	const translateXStart = extractTransformValue(startTransform, "translateX");
	const translateXEnd = extractTransformValue(endTransform, "translateX");

	// Extract and interpolate translateY
	const translateYStart = extractTransformValue(startTransform, "translateY");
	const translateYEnd = extractTransformValue(endTransform, "translateY");

	// Extract and interpolate scale
	const scaleStart = extractTransformValue(startTransform, "scale");
	const scaleEnd = extractTransformValue(endTransform, "scale");

	// Extract and interpolate rotate
	const rotateStart = extractTransformValue(startTransform, "rotate");
	const rotateEnd = extractTransformValue(endTransform, "rotate");

	const parts: string[] = [];

	if (translateXStart !== null || translateXEnd !== null) {
		const interpolated = interpolateValue(
			translateXStart ?? 0,
			translateXEnd ?? 0,
		);
		parts.push(`translateX(${interpolated}px)`);
	}

	if (translateYStart !== null || translateYEnd !== null) {
		const interpolated = interpolateValue(
			translateYStart ?? 0,
			translateYEnd ?? 0,
		);
		parts.push(`translateY(${interpolated}px)`);
	}

	if (scaleStart !== null || scaleEnd !== null) {
		const interpolated = interpolateValue(scaleStart ?? 1, scaleEnd ?? 1);
		parts.push(`scale(${interpolated})`);
	}

	if (rotateStart !== null || rotateEnd !== null) {
		const interpolated = interpolateValue(rotateStart ?? 0, rotateEnd ?? 0);
		parts.push(`rotate(${interpolated}deg)`);
	}

	return parts.length > 0 ? parts.join(" ") : "";
}

function extractTransformValue(
	transform: string,
	property: string,
): number | null {
	const regex = new RegExp(`${property}\\(([^)]+)\\)`);
	const match = transform.match(regex);

	if (!match) return null;

	const value = match[1];
	const numericValue = parseFloat(value);

	return isNaN(numericValue) ? null : numericValue;
}
