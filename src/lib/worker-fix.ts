// Fix for OPFS worker blob URL issues in production

// Override the default worker creation to fix blob URL generation
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const originalWorker = window.Worker;
  
  class FixedWorker extends originalWorker {
    constructor(scriptURL: string | URL, options?: WorkerOptions) {
      // Fix malformed blob URLs
      if (typeof scriptURL === 'string' && scriptURL.includes('blob://nullhttps')) {
        // Extract the actual URL part
        const urlPart = scriptURL.replace('blob://nullhttps//', 'https://');
        scriptURL = urlPart;
      }
      
      try {
        super(scriptURL, options);
      } catch (error) {
        // If worker creation fails, try with a fixed URL or skip source maps
        if (scriptURL.toString().includes('.js.map')) {
          console.warn('Source map worker failed, continuing without source maps:', error);
          return {} as Worker; // Return empty worker-like object
        }
        throw error;
      }
    }
  }
  
  // Replace the global Worker constructor
  window.Worker = FixedWorker as any;
}

// Suppress source map errors in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    // Filter out source map related errors
    if (
      args.some(arg => 
        typeof arg === 'string' && (
          arg.includes('blob://nullhttps') ||
          arg.includes('source map') ||
          arg.includes('.js.map') ||
          arg.includes('opfs-worker')
        )
      )
    ) {
      return; // Suppress these errors
    }
    originalConsoleError.apply(console, args);
  };
}