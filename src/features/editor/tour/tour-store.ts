import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position: "top" | "bottom" | "left" | "right";
  action?: "click" | "hover" | "input";
  validation?: () => boolean;
  onEnter?: () => void;
  onExit?: () => void;
}

interface TourState {
  isActive: boolean;
  currentStep: number;
  completedSteps: string[];
  hasCompletedTour: boolean;
  tourSteps: TourStep[];
  
  startTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  endTour: () => void;
  setStep: (step: number) => void;
  setTourSteps: (steps: TourStep[]) => void;
}

const defaultTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to CineTune!",
    content: "Let's take a comprehensive tour of the video editor. You'll learn about uploads, captions, color grading, and more. You can skip this tour at any time by clicking the X button.",
    target: "body",
    position: "bottom"
  },
  {
    id: "timeline",
    title: "Timeline - Your Editing Workspace",
    content: "This is your timeline where you arrange and edit video clips, audio, text, and captions. Drag elements here from the sidebar or use the add buttons to place content precisely where you want it.",
    target: "[data-tour='timeline']",
    position: "top"
  },
  {
    id: "scene",
    title: "Preview Canvas - Real-Time Preview",
    content: "This canvas shows a live preview of your video composition. You can see exactly how your final video will look, with all effects, text overlays, and color grading applied in real-time.",
    target: "[data-tour='scene']",
    position: "left"
  },
  {
    id: "menu",
    title: "Media Library - Content & Tools",
    content: "This sidebar contains five powerful sections: Uploads (A-Roll/B-Roll videos), Texts (captions & text elements), Videos (stock footage), Color Grade (cinematic effects), and Audios (background music).",
    target: "[data-tour='menu']",
    position: "right"
  },
  {
    id: "texts-section",
    title: "Text & Captions Workflow",
    content: "Let's explore the Texts section! I'll show you the caption configuration dropdowns and buttons. The dropdowns control where captions appear and how many words show at once.",
    target: "[data-tour='caption-region-dropdown']",
    position: "right",
    onEnter: () => {
      // Switch to texts section when entering this step
      const layoutStore = (window as any).__tourLayoutStore;
      if (layoutStore) {
        layoutStore.getState().setActiveMenuItem('texts');
      }
    }
  },
  {
    id: "caption-buttons",
    title: "Caption Generation Buttons",
    content: "Add Creative Captions processes your audio/video to generate automatic subtitles (requires content in timeline and takes time to process). Load Captions adds the processed captions directly to your timeline.",
    target: "[data-tour='add-creative-captions']",
    position: "right",
    onEnter: () => {
      // Ensure texts section is active
      const layoutStore = (window as any).__tourLayoutStore;
      if (layoutStore) {
        layoutStore.getState().setActiveMenuItem('texts');
      }
    }
  },
  {
    id: "color-grading-section",
    title: "Color Grading - Cinematic Effects",
    content: "Now let's look at the Color Grade section! This Cinematic Grading button detects videos in your timeline and generates preview frames with different professional color effects.",
    target: "[data-tour='cinematic-grading-button']",
    position: "right",
    onEnter: () => {
      // Switch to images/color grade section
      const layoutStore = (window as any).__tourLayoutStore;
      if (layoutStore) {
        layoutStore.getState().setActiveMenuItem('images');
      }
    }
  },
  {
    id: "uploads-section",
    title: "A-Roll & B-Roll Organization",
    content: "The Uploads section organizes your content: A-Roll (main videos with blue crown badges) for primary content, and B-Roll (secondary videos with green layer badges) for supporting footage. Click section headers to upload content to specific categories.",
    target: "[data-tour='menu']",
    position: "right",
    onEnter: () => {
      // Switch to uploads section
      const layoutStore = (window as any).__tourLayoutStore;
      if (layoutStore) {
        layoutStore.getState().setActiveMenuItem('uploads');
      }
    }
  },
  {
    id: "controls",
    title: "Property Controls - Fine-Tune Everything",
    content: "When you select any element on the timeline or canvas, its properties appear here. Adjust colors, fonts, effects, positioning, timing, and more. This is where you perfect every detail of your video.",
    target: "[data-tour='controls']",
    position: "left"
  },
  {
    id: "navbar",
    title: "Project Management & Export",
    content: "The navbar contains project controls, preview playback, and most importantly - the export button to render your final video. You can also save your project here and manage rendering settings.",
    target: "[data-tour='navbar']",
    position: "bottom"
  }
];

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStep: 0,
      completedSteps: [],
      hasCompletedTour: false,
      tourSteps: defaultTourSteps,

      startTour: () => {
        const { tourSteps } = get();
        set({
          isActive: true,
          currentStep: 0,
          completedSteps: []
        });
        
        // Execute onEnter for first step if it exists
        if (tourSteps[0]?.onEnter) {
          tourSteps[0].onEnter();
        }
      },

      nextStep: () => {
        const { currentStep, tourSteps, completedSteps } = get();
        const nextStepIndex = currentStep + 1;
        
        // Execute onExit for current step
        if (tourSteps[currentStep]?.onExit) {
          tourSteps[currentStep].onExit();
        }
        
        // Mark current step as completed
        const newCompletedSteps = [...completedSteps];
        if (!newCompletedSteps.includes(tourSteps[currentStep].id)) {
          newCompletedSteps.push(tourSteps[currentStep].id);
        }
        
        if (nextStepIndex >= tourSteps.length) {
          // Tour completed
          set({
            isActive: false,
            hasCompletedTour: true,
            completedSteps: newCompletedSteps
          });
        } else {
          set({
            currentStep: nextStepIndex,
            completedSteps: newCompletedSteps
          });
          
          // Execute onEnter for next step
          if (tourSteps[nextStepIndex]?.onEnter) {
            tourSteps[nextStepIndex].onEnter();
          }
        }
      },

      previousStep: () => {
        const { currentStep, tourSteps } = get();
        if (currentStep > 0) {
          // Execute onExit for current step
          if (tourSteps[currentStep]?.onExit) {
            tourSteps[currentStep].onExit();
          }
          
          const previousStepIndex = currentStep - 1;
          set({ currentStep: previousStepIndex });
          
          // Execute onEnter for previous step
          if (tourSteps[previousStepIndex]?.onEnter) {
            tourSteps[previousStepIndex].onEnter();
          }
        }
      },

      skipTour: () => {
        const { currentStep, tourSteps } = get();
        
        // Execute onExit for current step
        if (tourSteps[currentStep]?.onExit) {
          tourSteps[currentStep].onExit();
        }
        
        set({
          isActive: false,
          currentStep: 0
        });
      },

      completeTour: () => {
        const { tourSteps, completedSteps } = get();
        const allStepIds = tourSteps.map(step => step.id);
        
        set({
          isActive: false,
          hasCompletedTour: true,
          completedSteps: [...new Set([...completedSteps, ...allStepIds])],
          currentStep: 0
        });
      },

      endTour: () => {
        const { currentStep, tourSteps } = get();
        
        // Execute onExit for current step
        if (tourSteps[currentStep]?.onExit) {
          tourSteps[currentStep].onExit();
        }
        
        set({
          isActive: false,
          currentStep: 0
        });
      },

      setStep: (step: number) => {
        const { tourSteps, currentStep } = get();
        
        if (step >= 0 && step < tourSteps.length) {
          // Execute onExit for current step
          if (tourSteps[currentStep]?.onExit) {
            tourSteps[currentStep].onExit();
          }
          
          set({ currentStep: step });
          
          // Execute onEnter for new step
          if (tourSteps[step]?.onEnter) {
            tourSteps[step].onEnter();
          }
        }
      },

      setTourSteps: (steps: TourStep[]) => {
        set({ tourSteps: steps });
      }
    }),
    {
      name: "tour-storage",
      partialize: (state) => ({
        hasCompletedTour: state.hasCompletedTour,
        completedSteps: state.completedSteps
      })
    }
  )
);