// Context utility for loading available captions from localStorage.
// Returns the most recent captions array (or empty array) for use in other modules.

export function loadAvailableCaptionsFromLocalStorage(): any[] {
  try {
    const allKeys = Object.keys(localStorage);
    const captionsKeys = allKeys.filter(key => key.startsWith('captions_'));
    if (captionsKeys.length > 0) {
      // Sort keys by creation/update time if possible, else use last
      const sortedKeys = captionsKeys.sort((a, b) => {
        const aNum = parseInt(a.replace('captions_', ''));
        const bNum = parseInt(b.replace('captions_', ''));
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return a.localeCompare(b);
      });
      const mostRecentKey = sortedKeys[sortedKeys.length - 1];
      const captionsData = localStorage.getItem(mostRecentKey);
      if (captionsData) {
        try {
          const parsedData = JSON.parse(captionsData);
          // If the data is an array directly (legacy or alternate format)
          if (Array.isArray(parsedData)) {
            if (parsedData.length > 0 && typeof parsedData[0] === 'object' && 'word' in parsedData[0] && 'start' in parsedData[0] && 'end' in parsedData[0]) {
              return parsedData;
            } else {
              return [];
            }
          }
          // If the data is an object with a captions property (expected format)
          if (parsedData && Array.isArray(parsedData.captions)) {
            if (parsedData.captions.length > 0 && typeof parsedData.captions[0] === 'object' && 'word' in parsedData.captions[0] && 'start' in parsedData.captions[0] && 'end' in parsedData.captions[0]) {
              return parsedData.captions;
            } else {
              return [];
            }
          }
        } catch (parseError) {
          // Error handling preserved but console logs removed
        }
      }
    }
  } catch (error) {
    // Error handling preserved but console logs removed
  }
  return [];
} 

// New function to get the most recent caption job ID for B-roll timing
export function getMostRecentCaptionJobId(): string | null {
  try {
    const allKeys = Object.keys(localStorage);
    const captionsKeys = allKeys.filter(key => key.startsWith('captions_'));
    
    if (captionsKeys.length === 0) {
      return null;
    }
    
    // Sort keys to get the most recent one
    const sortedKeys = captionsKeys.sort((a, b) => {
      const aNum = parseInt(a.replace('captions_', ''));
      const bNum = parseInt(b.replace('captions_', ''));
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.localeCompare(b);
    });
    
    const mostRecentKey = sortedKeys[sortedKeys.length - 1];
    
    const captionsData = localStorage.getItem(mostRecentKey);
    if (captionsData) {
      try {
        const parsedData = JSON.parse(captionsData);
        
        // Return the jobId if it exists in the data (for both processing and completed states)
        if (parsedData && parsedData.jobId) {
          return parsedData.jobId;
        }
        
        // Fallback: extract job ID from the localStorage key itself
        const jobIdFromKey = mostRecentKey.replace('captions_', '');
        return jobIdFromKey;
        
      } catch (parseError) {
        // Fallback: extract job ID from the localStorage key itself
        const jobIdFromKey = mostRecentKey.replace('captions_', '');
        return jobIdFromKey;
      }
    }
    
    return null;
    
  } catch (error) {
    return null;
  }
} 