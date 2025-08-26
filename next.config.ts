import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactStrictMode: false,
	output: 'standalone',
	serverExternalPackages: ['@remotion/renderer', '@remotion/cli'],
	images: {
		domains: ['localhost', 'cinetune-llh0.onrender.com'],
		unoptimized: true
	},
	productionBrowserSourceMaps: false, // Disable source maps in production
	webpack: (config, { isServer, dev }) => {
		if (isServer) {
			config.externals.push('@remotion/renderer');
		}
		
		// Fix worker source map issues
		if (!dev && !isServer) {
			config.devtool = false; // Disable source maps for client in production
			
			// Handle OPFS worker files properly
			config.module.rules.push({
				test: /\.worker\.(js|ts)$/,
				use: {
					loader: 'worker-loader',
					options: {
						filename: 'static/[hash].worker.js',
						publicPath: '/_next/'
					}
				}
			});
			
			// Fix blob URL generation for workers
			config.output = {
				...config.output,
				globalObject: 'self', // Ensure workers have proper global context
				publicPath: process.env.NODE_ENV === 'production' ? '/_next/' : '/_next/',
			};
		}
		
		return config;
	},
	env: {
		CUSTOM_KEY: process.env.CUSTOM_KEY,
	}
};

export default nextConfig;
