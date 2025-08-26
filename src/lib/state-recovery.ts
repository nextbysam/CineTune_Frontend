// State recovery mechanism for missing state items

interface StateItem {
  id: string;
  type: string;
  data?: any;
}

class StateRecoveryManager {
  private missingItems = new Set<string>();
  private recoveredItems = new Map<string, StateItem>();
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeRecovery();
    }
  }
  
  private initializeRecovery() {
    // Listen for console errors about missing state items
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      this.handleConsoleError(args);
      originalConsoleError.apply(console, args);
    };
    
    // Set up periodic state check
    this.setupPeriodicCheck();
  }
  
  private handleConsoleError(args: any[]) {
    const errorMessage = args.join(' ');
    
    // Check if this is a missing state error
    if (errorMessage.includes('Missing from state')) {
      try {
        // Extract missing IDs from the error
        const match = errorMessage.match(/Missing from state \((\d+)\):/);
        if (match) {
          const count = parseInt(match[1]);
          console.warn(`Detected ${count} missing state items, attempting recovery...`);
          this.attemptStateRecovery();
        }
      } catch (error) {
        console.warn('Error parsing missing state items:', error);
      }
    }
  }
  
  private attemptStateRecovery() {
    try {
      // Try to recover from localStorage or sessionStorage
      const savedState = this.loadSavedState();
      if (savedState) {
        this.restoreState(savedState);
        console.log('State recovery successful');
        return;
      }
      
      // Fallback: Initialize empty state
      this.initializeEmptyState();
      console.log('Initialized empty state as fallback');
      
    } catch (error) {
      console.warn('State recovery failed:', error);
    }
  }
  
  private loadSavedState(): any {
    try {
      const stored = localStorage.getItem('video-editor-state') || 
                   sessionStorage.getItem('video-editor-state');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
  
  private restoreState(state: any) {
    // Dispatch a custom event to notify the application about state recovery
    window.dispatchEvent(new CustomEvent('stateRecovery', {
      detail: { state, recovered: true }
    }));
  }
  
  private initializeEmptyState() {
    const emptyState = {
      trackItems: {},
      tracks: [],
      activeIds: [],
      duration: 1000,
      fps: 30
    };
    
    window.dispatchEvent(new CustomEvent('stateRecovery', {
      detail: { state: emptyState, recovered: false }
    }));
  }
  
  private setupPeriodicCheck() {
    // Check for missing state every 5 seconds
    setInterval(() => {
      this.checkStateIntegrity();
    }, 5000);
  }
  
  private checkStateIntegrity() {
    // This would be implemented based on your specific state management
    // For now, we'll just save current state periodically
    try {
      const currentState = this.getCurrentState();
      if (currentState) {
        localStorage.setItem('video-editor-state', JSON.stringify(currentState));
      }
    } catch (error) {
      console.warn('Failed to save state for recovery:', error);
    }
  }
  
  private getCurrentState(): any {
    // Try to get current state from various sources
    try {
      // This would need to be adapted to your specific store implementation
      return window.store?.getState?.() || null;
    } catch {
      return null;
    }
  }
  
  // Public method to manually trigger recovery
  public recoverState() {
    this.attemptStateRecovery();
  }
  
  // Public method to save current state
  public saveState(state: any) {
    try {
      localStorage.setItem('video-editor-state', JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save state:', error);
    }
  }
}

// Initialize the recovery manager
let recoveryManager: StateRecoveryManager;

if (typeof window !== 'undefined') {
  recoveryManager = new StateRecoveryManager();
  
  // Make it globally available for debugging
  (window as any).stateRecoveryManager = recoveryManager;
}

export { StateRecoveryManager, recoveryManager };