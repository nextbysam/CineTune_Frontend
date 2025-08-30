import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { IText, ITrackItem } from "@designcombo/types";
import React, { useState, useEffect } from "react";
import {
	ANIMATION_CATEGORIES,
	AnimationCategory,
	TEXT_ANIMATION_PRESETS,
	TextAnimationPreset,
	getAnimationsByCategory,
} from "../../constants/text-animations";

interface TextAnimationsProps {
	trackItem: ITrackItem & IText;
}

const TextAnimations: React.FC<TextAnimationsProps> = ({ trackItem }) => {
	const [selectedCategory, setSelectedCategory] =
		useState<AnimationCategory>("entrance");
	const [selectedAnimations, setSelectedAnimations] = useState<{
		entrance?: string;
		exit?: string;
		emphasis?: string;
	}>({});

	useEffect(() => {
		// Load existing animations from trackItem
		const animations = (trackItem.details as any).animations || {};
		setSelectedAnimations({
			entrance: animations.entrance?.id,
			exit: animations.exit?.id,
			emphasis: animations.emphasis?.id,
		});
	}, [trackItem.id, trackItem.details]);

	const handleSelectAnimation = (preset: TextAnimationPreset) => {
		const category = preset.category;

		// Update local state
		setSelectedAnimations((prev) => {
			const newSelection = {
				...prev,
				[category]: prev[category] === preset.id ? undefined : preset.id,
			};

			// Update track item with animation data
			const currentAnimations = (trackItem.details as any).animations || {};
			const newAnimations = {
				...currentAnimations,
				[category]:
					prev[category] === preset.id
						? null
						: {
								id: preset.id,
								name: preset.name,
								keyframes: preset.keyframes,
								duration: preset.duration,
								category: preset.category,
							},
			};

			// Clean up null values
			for (const key of Object.keys(newAnimations)) {
				if (newAnimations[key] === null) {
					delete newAnimations[key];
				}
			}

			dispatch(EDIT_OBJECT, {
				payload: {
					[trackItem.id]: {
						details: {
							animations: newAnimations,
						},
					},
				},
			});

			return newSelection;
		});
	};

	const handleClearAnimations = () => {
		setSelectedAnimations({});
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						animations: {},
					},
				},
			},
		});
	};

	const categoryAnimations = getAnimationsByCategory(selectedCategory);
	const hasAnyAnimations = Object.values(selectedAnimations).some(Boolean);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-medium">Text Animations</h4>
				{hasAnyAnimations && (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClearAnimations}
						className="text-xs text-muted-foreground hover:text-foreground"
					>
						Clear All
					</Button>
				)}
			</div>

			{/* Category Tabs */}
			<div className="flex space-x-1">
				{Object.entries(ANIMATION_CATEGORIES).map(([key, label]) => (
					<Button
						key={key}
						variant={selectedCategory === key ? "default" : "ghost"}
						size="sm"
						onClick={() => setSelectedCategory(key as AnimationCategory)}
						className="text-xs"
					>
						{label}
						{selectedAnimations[key as AnimationCategory] && (
							<Badge
								variant="secondary"
								className="ml-1 h-4 w-4 p-0 text-[10px]"
							>
								✓
							</Badge>
						)}
					</Button>
				))}
			</div>

			<Separator />

			{/* Animation Presets */}
			<ScrollArea className="h-[200px]">
				<div className="grid grid-cols-2 gap-2">
					{categoryAnimations.map((preset) => {
						const isSelected =
							selectedAnimations[preset.category] === preset.id;

						return (
							<Button
								key={preset.id}
								variant={isSelected ? "default" : "outline"}
								size="sm"
								onClick={() => handleSelectAnimation(preset)}
								className="h-auto p-3 flex flex-col items-center space-y-1"
							>
								<span className="text-lg">{preset.icon}</span>
								<span className="text-xs font-medium">{preset.name}</span>
								<span className="text-[10px] text-muted-foreground text-center leading-tight">
									{preset.description}
								</span>
							</Button>
						);
					})}
				</div>
			</ScrollArea>

			{/* Selected Animations Summary */}
			{hasAnyAnimations && (
				<>
					<Separator />
					<div className="space-y-2">
						<h5 className="text-xs font-medium text-muted-foreground">
							Active Animations
						</h5>
						<div className="flex flex-wrap gap-1">
							{Object.entries(selectedAnimations).map(
								([category, animationId]) => {
									if (!animationId) return null;

									const preset = TEXT_ANIMATION_PRESETS.find(
										(p) => p.id === animationId,
									);
									if (!preset) return null;

									return (
										<Badge
											key={category}
											variant="secondary"
											className="text-xs"
										>
											{preset.icon} {preset.name}
										</Badge>
									);
								},
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default TextAnimations;
