// Simple user session management for render isolation
export const getUserId = (): string => {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    return 'server_user';
  }

  // Try to get existing session from localStorage
  let userId = localStorage.getItem('cinetune_user_id');
  
  if (!userId) {
    // Generate simple user ID: timestamp + random
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    userId = `user_${timestamp}_${random}`;
    
    // Store in localStorage
    localStorage.setItem('cinetune_user_id', userId);
    console.log(`[user-session] Created new user ID: ${userId}`);
  }
  
  return userId;
};

// Get user ID from request (server-side)
export const getUserIdFromRequest = (request: Request): string => {
  // Try to get user ID from custom header
  const userIdHeader = request.headers.get('x-cinetune-user-id');
  if (userIdHeader) {
    return userIdHeader;
  }
  
  // Fallback: use a simple hash of user agent for basic session
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const hash = userAgent.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return `guest_${Math.abs(hash)}`;
};

// Sanitize user ID for safe file system usage
export const sanitizeUserId = (userId: string): string => {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
};