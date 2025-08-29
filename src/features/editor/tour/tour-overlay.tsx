"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTourStore, TourStep } from "./tour-store";

interface TourOverlayProps {
  step: TourStep;
  stepNumber: number;
  totalSteps: number;
}

export function TourOverlay({ step, stepNumber, totalSteps }: TourOverlayProps) {
  const { nextStep, previousStep, skipTour, endTour } = useTourStore();
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const findTarget = () => {
      let element: HTMLElement | null = null;
      
      if (step.target === "body") {
        element = document.body;
      } else {
        element = document.querySelector(step.target);
        
        // Fallback to sidebar menu if specific element not found
        if (!element && step.target.includes('data-tour=')) {
          element = document.querySelector('[data-tour="menu"]');
        }
      }
      
      if (element) {
        setTargetElement(element);
        const rect = element.getBoundingClientRect();
        setPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });
      } else {
        console.warn(`Tour target not found: ${step.target}`);
        // Fallback to body if target not found
        element = document.body;
        setTargetElement(element);
        setPosition({
          top: window.innerHeight / 2,
          left: window.innerWidth / 2,
          width: 0,
          height: 0
        });
      }
    };

    // Find target immediately and then observe for changes
    findTarget();
    
    const observer = new MutationObserver(() => {
      setTimeout(findTarget, 100);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    // Also listen for resize
    const handleResize = () => {
      setTimeout(findTarget, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [step.target]);

  const getTooltipPosition = () => {
    if (!targetElement) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const tooltip = overlayRef.current;
    if (!tooltip) return {};

    const tooltipRect = tooltip.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;
    let transform = "";

    switch (step.position) {
      case "top":
        top = targetRect.top - tooltipRect.height - 16;
        left = targetRect.left + targetRect.width / 2;
        transform = "translateX(-50%)";
        break;
      case "bottom":
        top = targetRect.bottom + 16;
        left = targetRect.left + targetRect.width / 2;
        transform = "translateX(-50%)";
        break;
      case "left":
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - tooltipRect.width - 16;
        transform = "translateY(-50%)";
        break;
      case "right":
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + 16;
        transform = "translateY(-50%)";
        break;
    }

    // Boundary checks
    if (left < 16) left = 16;
    if (left + tooltipRect.width > viewportWidth - 16) {
      left = viewportWidth - tooltipRect.width - 16;
    }
    if (top < 16) top = 16;
    if (top + tooltipRect.height > viewportHeight - 16) {
      top = viewportHeight - tooltipRect.height - 16;
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
      transform
    };
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      endTour();
    } else if (e.key === "ArrowRight" || e.key === "Enter") {
      nextStep();
    } else if (e.key === "ArrowLeft") {
      previousStep();
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!targetElement) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] pointer-events-none"
      >
        {/* Backdrop with spotlight */}
        <div className="absolute inset-0 bg-black/60">
          {step.target !== "body" && (
            <div
              className="absolute border-2 border-primary rounded-lg pointer-events-auto"
              style={{
                top: position.top - 4,
                left: position.left - 4,
                width: position.width + 8,
                height: position.height + 8,
                boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.5)`,
              }}
            />
          )}
        </div>

        {/* Tooltip */}
        <motion.div
          ref={overlayRef}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="absolute pointer-events-auto bg-background border border-border rounded-lg shadow-2xl p-6 max-w-sm z-[10000]"
          style={getTooltipPosition()}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={endTour}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Content */}
          <div className="space-y-4 pr-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{step.title}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {stepNumber + 1} / {totalSteps}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.content}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                {stepNumber > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={previousStep}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Back
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipTour}
                  className="flex items-center gap-1 text-muted-foreground"
                >
                  <SkipForward className="h-3 w-3" />
                  Skip Tour
                </Button>
              </div>

              <Button
                onClick={nextStep}
                size="sm"
                className="flex items-center gap-1"
              >
                {stepNumber === totalSteps - 1 ? (
                  "Finish"
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-3 w-3" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-lg overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${((stepNumber + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}