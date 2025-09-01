"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 15 * 60 * 1000, // 15 minutes (increased)
						gcTime: 30 * 60 * 1000, // 30 minutes (increased)
						retry: (failureCount, error) => {
							// Don't retry 4xx errors, only network errors
							if (error instanceof Error && 'status' in error) {
								const status = (error as any).status;
								if (status >= 400 && status < 500) return false;
							}
							return failureCount < 2;
						},
						retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
						refetchOnWindowFocus: false,
						refetchOnReconnect: 'always',
						refetchInterval: false,
					},
					mutations: {
						retry: 1,
						retryDelay: 1000,
					},
				},
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
