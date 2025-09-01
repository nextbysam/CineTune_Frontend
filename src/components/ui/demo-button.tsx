"use client";

import { useState } from "react";
import { HelpCircle, Play, X } from "lucide-react";
import { Button } from "./button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./tooltip";
import { motion, AnimatePresence } from "framer-motion";

interface DemoButtonProps {
	onStartTour: () => void;
	isTourActive: boolean;
	onEndTour: () => void;
}

export function DemoButton({
	onStartTour,
	isTourActive,
	onEndTour,
}: DemoButtonProps) {
	const [isHovered, setIsHovered] = useState(false);

	if (isTourActive) {
		return (
			<motion.div
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				exit={{ scale: 0 }}
				className="fixed bottom-6 right-6 z-[9998]"
			>
				<Button
					onClick={onEndTour}
					variant="destructive"
					size="icon"
					className="h-12 w-12 rounded-full shadow-lg"
				>
					<X className="h-5 w-5" />
				</Button>
			</motion.div>
		);
	}

	return (
		<TooltipProvider>
			<motion.div
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				exit={{ scale: 0 }}
				className="fixed bottom-6 right-6 z-[9998]"
				onHoverStart={() => setIsHovered(true)}
				onHoverEnd={() => setIsHovered(false)}
			>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							onClick={onStartTour}
							variant="default"
							size="icon"
							className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-200"
						>
							<AnimatePresence mode="wait">
								{isHovered ? (
									<motion.div
										key="play"
										initial={{ rotate: -90, opacity: 0 }}
										animate={{ rotate: 0, opacity: 1 }}
										exit={{ rotate: 90, opacity: 0 }}
										transition={{ duration: 0.2 }}
									>
										<Play className="h-5 w-5" />
									</motion.div>
								) : (
									<motion.div
										key="help"
										initial={{ rotate: -90, opacity: 0 }}
										animate={{ rotate: 0, opacity: 1 }}
										exit={{ rotate: 90, opacity: 0 }}
										transition={{ duration: 0.2 }}
									>
										<HelpCircle className="h-5 w-5" />
									</motion.div>
								)}
							</AnimatePresence>
						</Button>
					</TooltipTrigger>
					<TooltipContent side="left" className="max-w-xs">
						<div className="space-y-1">
							<p className="font-medium">Take a Tour</p>
							<p className="text-sm text-muted-foreground">
								Learn how to use the video editor with an interactive
								walkthrough
							</p>
						</div>
					</TooltipContent>
				</Tooltip>
			</motion.div>
		</TooltipProvider>
	);
}
