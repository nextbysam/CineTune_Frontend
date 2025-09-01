// Context utility for loading available captions from localStorage.
// Returns the most recent captions array (or empty array) for use in other modules.

export function loadAvailableCaptionsFromLocalStorage(): any[] {
	try {
		const allKeys = Object.keys(localStorage);
		const captionsKeys = allKeys.filter((key) => key.startsWith("captions_"));
		console.log(
			"%c🟦 [Captions Loader] Found keys:",
			"color: #1976d2; font-weight: bold;",
			allKeys,
		);
		console.log(
			"%c🟨 [Captions Loader] Filtered captions keys:",
			"color: #fbc02d; font-weight: bold;",
			captionsKeys,
		);
		if (captionsKeys.length > 0) {
			// Sort keys by creation/update time if possible, else use last
			const sortedKeys = captionsKeys.sort((a, b) => {
				const aNum = parseInt(a.replace("captions_", ""));
				const bNum = parseInt(b.replace("captions_", ""));
				if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
				return a.localeCompare(b);
			});
			const mostRecentKey = sortedKeys[sortedKeys.length - 1];
			console.log(
				"%c🟩 [Captions Loader] Using most recent key:",
				"color: #388e3c; font-weight: bold;",
				mostRecentKey,
			);
			const captionsData = localStorage.getItem(mostRecentKey);
			if (captionsData) {
				try {
					const parsedData = JSON.parse(captionsData);
					console.log(
						"%c🟦 [Captions Loader] Parsed data:",
						"color: #1976d2; font-weight: bold;",
						parsedData,
					);
					// If the data is an array directly (legacy or alternate format)
					if (Array.isArray(parsedData)) {
						if (
							parsedData.length > 0 &&
							typeof parsedData[0] === "object" &&
							"word" in parsedData[0] &&
							"start" in parsedData[0] &&
							"end" in parsedData[0]
						) {
							console.log(
								"%c✅ [Captions Loader] Returning direct captions array.",
								"color: #388e3c; font-weight: bold;",
								parsedData,
							);
							return parsedData;
						} else {
							console.warn(
								"%c⚠️ [Captions Loader] Array in localStorage does not match expected caption format:",
								"color: #f57c00; font-weight: bold;",
								parsedData,
							);
							return [];
						}
					}
					// If the data is an object with a captions property (expected format)
					if (parsedData && Array.isArray(parsedData.captions)) {
						if (
							parsedData.captions.length > 0 &&
							typeof parsedData.captions[0] === "object" &&
							"word" in parsedData.captions[0] &&
							"start" in parsedData.captions[0] &&
							"end" in parsedData.captions[0]
						) {
							console.log(
								"%c✅ [Captions Loader] Returning captions from object property.",
								"color: #388e3c; font-weight: bold;",
								parsedData.captions,
							);
							return parsedData.captions;
						} else {
							console.warn(
								"%c⚠️ [Captions Loader] captions property in localStorage does not match expected caption format:",
								"color: #f57c00; font-weight: bold;",
								parsedData.captions,
							);
							return [];
						}
					}
					console.warn(
						"%c❓ [Captions Loader] Parsed captions data is not in a recognized format:",
						"color: #d32f2f; font-weight: bold;",
						parsedData,
					);
				} catch (parseError) {
					console.error(
						"%c🛑 [Captions Loader] Failed to parse captions data from localStorage:",
						"color: #d32f2f; font-weight: bold;",
						parseError,
						captionsData,
					);
				}
			} else {
				console.warn(
					"%c⚠️ [Captions Loader] No captions data found for key:",
					"color: #f57c00; font-weight: bold;",
					mostRecentKey,
				);
			}
		} else {
			console.info(
				"%cℹ️ [Captions Loader] No captions_* keys found in localStorage.",
				"color: #0288d1; font-weight: bold;",
			);
		}
	} catch (error) {
		console.error(
			"%c🛑 [Captions Loader] Error loading available captions:",
			"color: #d32f2f; font-weight: bold;",
			error,
		);
	}
	return [];
}

// New function to get the most recent caption job ID for B-roll timing
export function getMostRecentCaptionJobId(): string | null {
	try {
		const allKeys = Object.keys(localStorage);
		const captionsKeys = allKeys.filter((key) => key.startsWith("captions_"));
		console.log(
			"%c🟦 [Caption Job ID] Found captions keys:",
			"color: #1976d2; font-weight: bold;",
			captionsKeys,
		);

		if (captionsKeys.length === 0) {
			console.log(
				"%c⚠️ [Caption Job ID] No caption keys found in localStorage",
				"color: #f57c00; font-weight: bold;",
			);
			return null;
		}

		// Sort keys to get the most recent one
		const sortedKeys = captionsKeys.sort((a, b) => {
			const aNum = parseInt(a.replace("captions_", ""));
			const bNum = parseInt(b.replace("captions_", ""));
			if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
			return a.localeCompare(b);
		});

		const mostRecentKey = sortedKeys[sortedKeys.length - 1];
		console.log(
			"%c🟩 [Caption Job ID] Using most recent key:",
			"color: #388e3c; font-weight: bold;",
			mostRecentKey,
		);

		const captionsData = localStorage.getItem(mostRecentKey);
		if (captionsData) {
			try {
				const parsedData = JSON.parse(captionsData);
				console.log(
					"%c🟦 [Caption Job ID] Parsed data:",
					"color: #1976d2; font-weight: bold;",
					parsedData,
				);

				// Return the jobId if it exists in the data (for both processing and completed states)
				if (parsedData && parsedData.jobId) {
					console.log(
						"%c✅ [Caption Job ID] Found job ID:",
						"color: #388e3c; font-weight: bold;",
						parsedData.jobId,
					);
					console.log(
						"%c📊 [Caption Job ID] Job status:",
						"color: #1976d2; font-weight: bold;",
						parsedData.status || "unknown",
					);
					return parsedData.jobId;
				}

				// Fallback: extract job ID from the localStorage key itself
				const jobIdFromKey = mostRecentKey.replace("captions_", "");
				console.log(
					"%c🔄 [Caption Job ID] Using job ID from key:",
					"color: #ff9800; font-weight: bold;",
					jobIdFromKey,
				);
				return jobIdFromKey;
			} catch (parseError) {
				console.error(
					"%c❌ [Caption Job ID] Error parsing captions data:",
					"color: #d32f2f; font-weight: bold;",
					parseError,
				);
				// Fallback: extract job ID from the localStorage key itself
				const jobIdFromKey = mostRecentKey.replace("captions_", "");
				console.log(
					"%c🔄 [Caption Job ID] Fallback - using job ID from key:",
					"color: #ff9800; font-weight: bold;",
					jobIdFromKey,
				);
				return jobIdFromKey;
			}
		}

		console.log(
			"%c⚠️ [Caption Job ID] No captions data found for key:",
			"color: #f57c00; font-weight: bold;",
			mostRecentKey,
		);
		return null;
	} catch (error) {
		console.error(
			"%c❌ [Caption Job ID] Error getting caption job ID:",
			"color: #d32f2f; font-weight: bold;",
			error,
		);
		return null;
	}
}
