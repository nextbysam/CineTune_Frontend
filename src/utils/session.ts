// Simple session-based user identification for render isolation
export const getUserSessionId = (): string => {
	// Check if we're in browser environment
	if (typeof window === "undefined") {
		return "server-session";
	}

	// Try to get existing session from localStorage
	let sessionId = localStorage.getItem("cinetune_session_id");

	if (!sessionId) {
		// Generate new session ID: timestamp + random string
		const timestamp = Date.now().toString();
		const randomStr = Math.random().toString(36).substring(2, 8);
		sessionId = `session_${timestamp}_${randomStr}`;

		// Store in localStorage for persistence across page reloads
		localStorage.setItem("cinetune_session_id", sessionId);
	}

	return sessionId;
};

// Get user session from request headers or generate new one
export const getServerSessionId = (request: Request): string => {
	// Try to get session from custom header (if frontend sends it)
	const sessionHeader = request.headers.get("x-cinetune-session");
	if (sessionHeader) {
		return sessionHeader;
	}

	// Fallback: generate a simple session based on user agent + IP (basic fingerprinting)
	const userAgent = request.headers.get("user-agent") || "";
	const forwardedFor = request.headers.get("x-forwarded-for") || "";
	const realIp = request.headers.get("x-real-ip") || "";

	// Create a simple hash-like identifier
	const fingerprint = `${userAgent}_${forwardedFor}_${realIp}`;
	const hash = fingerprint.split("").reduce((a, b) => {
		a = (a << 5) - a + b.charCodeAt(0);
		return a & a;
	}, 0);

	return `session_${Math.abs(hash)}`;
};

// Sanitize session ID for safe file system usage
export const sanitizeSessionId = (sessionId: string): string => {
	return sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
};
