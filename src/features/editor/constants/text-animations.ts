export interface TextAnimationKeyframe {
	frame: number;
	opacity?: number;
	transform?: string;
	easing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
}

export interface TextAnimationPreset {
	id: string;
	name: string;
	description: string;
	icon: string;
	category: "entrance" | "exit" | "emphasis";
	keyframes: TextAnimationKeyframe[];
	duration: number; // Duration in frames (at 30fps)
}

export const TEXT_ANIMATION_PRESETS: TextAnimationPreset[] = [
	// Entrance Animations
	{
		id: "fade-in",
		name: "Fade In",
		description: "Smooth fade in effect",
		icon: "↗️",
		category: "entrance",
		duration: 30, // 1 second at 30fps
		keyframes: [
			{ frame: 0, opacity: 0, easing: "ease-out" },
			{ frame: 30, opacity: 1 },
		],
	},
	{
		id: "slide-up",
		name: "Slide Up",
		description: "Slide in from bottom",
		icon: "⬆️",
		category: "entrance",
		duration: 45, // 1.5 seconds at 30fps
		keyframes: [
			{
				frame: 0,
				opacity: 0,
				transform: "translateY(50px)",
				easing: "ease-out",
			},
			{ frame: 45, opacity: 1, transform: "translateY(0px)" },
		],
	},
	{
		id: "slide-down",
		name: "Slide Down",
		description: "Slide in from top",
		icon: "⬇️",
		category: "entrance",
		duration: 45,
		keyframes: [
			{
				frame: 0,
				opacity: 0,
				transform: "translateY(-50px)",
				easing: "ease-out",
			},
			{ frame: 45, opacity: 1, transform: "translateY(0px)" },
		],
	},
	{
		id: "slide-left",
		name: "Slide Left",
		description: "Slide in from right",
		icon: "⬅️",
		category: "entrance",
		duration: 45,
		keyframes: [
			{
				frame: 0,
				opacity: 0,
				transform: "translateX(50px)",
				easing: "ease-out",
			},
			{ frame: 45, opacity: 1, transform: "translateX(0px)" },
		],
	},
	{
		id: "slide-right",
		name: "Slide Right",
		description: "Slide in from left",
		icon: "➡️",
		category: "entrance",
		duration: 45,
		keyframes: [
			{
				frame: 0,
				opacity: 0,
				transform: "translateX(-50px)",
				easing: "ease-out",
			},
			{ frame: 45, opacity: 1, transform: "translateX(0px)" },
		],
	},
	{
		id: "pop-in",
		name: "Pop In",
		description: "Scale up with bounce effect",
		icon: "💥",
		category: "entrance",
		duration: 60, // 2 seconds at 30fps
		keyframes: [
			{ frame: 0, opacity: 0, transform: "scale(0)", easing: "ease-out" },
			{ frame: 30, opacity: 1, transform: "scale(1.1)", easing: "ease-in-out" },
			{ frame: 60, opacity: 1, transform: "scale(1)" },
		],
	},
	{
		id: "zoom-in",
		name: "Zoom In",
		description: "Scale up smoothly",
		icon: "🔍",
		category: "entrance",
		duration: 45,
		keyframes: [
			{ frame: 0, opacity: 0, transform: "scale(0.3)", easing: "ease-out" },
			{ frame: 45, opacity: 1, transform: "scale(1)" },
		],
	},
	{
		id: "rotate-in",
		name: "Rotate In",
		description: "Rotate and fade in",
		icon: "🔄",
		category: "entrance",
		duration: 45,
		keyframes: [
			{
				frame: 0,
				opacity: 0,
				transform: "rotate(-180deg) scale(0.3)",
				easing: "ease-out",
			},
			{ frame: 45, opacity: 1, transform: "rotate(0deg) scale(1)" },
		],
	},
	{
		id: "flip-in",
		name: "Flip In",
		description: "Flip horizontally into view",
		icon: "🔁",
		category: "entrance",
		duration: 45,
		keyframes: [
			{
				frame: 0,
				opacity: 0,
				transform: "rotateY(-90deg)",
				easing: "ease-out",
			},
			{ frame: 45, opacity: 1, transform: "rotateY(0deg)" },
		],
	},
	{
		id: "handwriting",
		name: "Handwriting",
		description: "Text appears as if being written by hand",
		icon: "✍️",
		category: "entrance",
		duration: 90, // 3 seconds at 30fps - longer for handwriting effect
		keyframes: [
			{ frame: 0, opacity: 1, easing: "linear" },
			{ frame: 90, opacity: 1 },
		],
	},

	// Exit Animations
	{
		id: "fade-out",
		name: "Fade Out",
		description: "Smooth fade out effect",
		icon: "↘️",
		category: "exit",
		duration: 30,
		keyframes: [
			{ frame: 0, opacity: 1, easing: "ease-in" },
			{ frame: 30, opacity: 0 },
		],
	},
	{
		id: "slide-up-out",
		name: "Slide Up Out",
		description: "Slide out to top",
		icon: "⬆️",
		category: "exit",
		duration: 45,
		keyframes: [
			{ frame: 0, opacity: 1, transform: "translateY(0px)", easing: "ease-in" },
			{ frame: 45, opacity: 0, transform: "translateY(-50px)" },
		],
	},
	{
		id: "slide-down-out",
		name: "Slide Down Out",
		description: "Slide out to bottom",
		icon: "⬇️",
		category: "exit",
		duration: 45,
		keyframes: [
			{ frame: 0, opacity: 1, transform: "translateY(0px)", easing: "ease-in" },
			{ frame: 45, opacity: 0, transform: "translateY(50px)" },
		],
	},
	{
		id: "zoom-out",
		name: "Zoom Out",
		description: "Scale down and fade out",
		icon: "🔍",
		category: "exit",
		duration: 45,
		keyframes: [
			{ frame: 0, opacity: 1, transform: "scale(1)", easing: "ease-in" },
			{ frame: 45, opacity: 0, transform: "scale(0.3)" },
		],
	},
	{
		id: "rotate-out",
		name: "Rotate Out",
		description: "Rotate and fade out",
		icon: "🔄",
		category: "exit",
		duration: 45,
		keyframes: [
			{
				frame: 0,
				opacity: 1,
				transform: "rotate(0deg) scale(1)",
				easing: "ease-in",
			},
			{ frame: 45, opacity: 0, transform: "rotate(180deg) scale(0.3)" },
		],
	},

	// Emphasis Animations
	{
		id: "pulse",
		name: "Pulse",
		description: "Subtle scale pulse effect",
		icon: "💗",
		category: "emphasis",
		duration: 60, // 2 seconds at 30fps
		keyframes: [
			{ frame: 0, transform: "scale(1)", easing: "ease-in-out" },
			{ frame: 30, transform: "scale(1.05)" },
			{ frame: 60, transform: "scale(1)" },
		],
	},
	{
		id: "bounce",
		name: "Bounce",
		description: "Bounce up and down",
		icon: "⬆️⬇️",
		category: "emphasis",
		duration: 90, // 3 seconds at 30fps
		keyframes: [
			{ frame: 0, transform: "translateY(0px)", easing: "ease-out" },
			{ frame: 15, transform: "translateY(-10px)", easing: "ease-in" },
			{ frame: 30, transform: "translateY(0px)", easing: "ease-out" },
			{ frame: 45, transform: "translateY(-5px)", easing: "ease-in" },
			{ frame: 60, transform: "translateY(0px)", easing: "ease-out" },
			{ frame: 75, transform: "translateY(-2px)", easing: "ease-in" },
			{ frame: 90, transform: "translateY(0px)" },
		],
	},
	{
		id: "shake",
		name: "Shake",
		description: "Horizontal shake effect",
		icon: "〰️",
		category: "emphasis",
		duration: 60,
		keyframes: [
			{ frame: 0, transform: "translateX(0px)" },
			{ frame: 10, transform: "translateX(-5px)" },
			{ frame: 20, transform: "translateX(5px)" },
			{ frame: 30, transform: "translateX(-5px)" },
			{ frame: 40, transform: "translateX(5px)" },
			{ frame: 50, transform: "translateX(-2px)" },
			{ frame: 60, transform: "translateX(0px)" },
		],
	},
	{
		id: "glow",
		name: "Glow",
		description: "Pulsing glow effect",
		icon: "✨",
		category: "emphasis",
		duration: 90,
		keyframes: [
			{ frame: 0, transform: "scale(1)", easing: "ease-in-out" },
			{ frame: 45, transform: "scale(1.02)" },
			{ frame: 90, transform: "scale(1)" },
		],
	},
];

export const ANIMATION_CATEGORIES = {
	entrance: "Entrance",
	exit: "Exit",
	emphasis: "Emphasis",
} as const;

export type AnimationCategory = keyof typeof ANIMATION_CATEGORIES;

export const getAnimationsByCategory = (category: AnimationCategory) =>
	TEXT_ANIMATION_PRESETS.filter((preset) => preset.category === category);

export const getAnimationById = (id: string) =>
	TEXT_ANIMATION_PRESETS.find((preset) => preset.id === id);
