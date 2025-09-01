import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactStrictMode: false,
	output: "standalone",
	trailingSlash: false,
	assetPrefix: process.env.NODE_ENV === "production" ? undefined : undefined,
	serverExternalPackages: ["@remotion/renderer", "@remotion/cli"],
	images: {
		domains: ["localhost", "cinetune-llh0.onrender.com", "app.thecinetune.com"],
		unoptimized: true,
	},
	productionBrowserSourceMaps: false, // Disable source maps in production

	// Configure static file generation
	generateStaticParams: false,

	webpack: (config, { isServer, dev }) => {
		if (isServer) {
			config.externals.push("@remotion/renderer");
		}

		// Fix worker source map issues
		if (!dev && !isServer) {
			config.devtool = false; // Disable source maps for client in production

			// Handle OPFS worker files properly
			config.module.rules.push({
				test: /\.worker\.(js|ts)$/,
				use: {
					loader: "worker-loader",
					options: {
						filename: "static/[hash].worker.js",
						publicPath: "/_next/",
					},
				},
			});

			// Fix blob URL generation for workers and static files
			config.output = {
				...config.output,
				globalObject: "self", // Ensure workers have proper global context
				publicPath: "/_next/",
			};
		}

		return config;
	},
	env: {
		CUSTOM_KEY: process.env.CUSTOM_KEY,
	},
};

export default nextConfig;
