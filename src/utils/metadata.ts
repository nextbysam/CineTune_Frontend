import type { Metadata } from "next/types";

export function createMetadata(override: Metadata): Metadata {
	return {
		...override,
		openGraph: {
			title: override.title ?? undefined,
			description: override.description ?? undefined,
			url: "https://designcombo.dev",
			images: "/banner.png",
			siteName: "CineTune",
			...override.openGraph,
		},
		twitter: {
			card: "summary_large_image",
			creator: "@CineTune",
			title: override.title ?? undefined,
			description: override.description ?? undefined,
			images: "/banner.png",
			...override.twitter,
		},
		icons: {
			icon: "/favicon.ico",
		},
	};
}

export const baseUrl =
	process.env.NODE_ENV === "development"
		? new URL("https://cinetune-llh0.onrender.com")
		: new URL("https://designcombo.dev");
