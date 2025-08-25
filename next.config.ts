import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactStrictMode: false,
	output: 'standalone',
	serverExternalPackages: ['@remotion/renderer', '@remotion/cli'],
	images: {
		domains: ['localhost', 'cinetune-llh0.onrender.com'],
		unoptimized: true
	},
	webpack: (config, { isServer }) => {
		if (isServer) {
			config.externals.push('@remotion/renderer');
		}
		return config;
	},
	env: {
		CUSTOM_KEY: process.env.CUSTOM_KEY,
	}
};

export default nextConfig;
