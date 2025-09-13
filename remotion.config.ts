import { Config } from "@remotion/cli/config";

// Production-optimized Remotion configuration for VPS/headless environments
Config.setVideoImageFormat("jpeg");
Config.setPixelFormat("yuv420p");
Config.setCrf(18); // Good quality/size balance for production

// Set longer timeout for composition selection in production
Config.setTimeoutInMilliseconds(120000); // 2 minutes instead of 30 seconds

// Optimize bundle settings for production
Config.overrideWebpackConfig((currentConfiguration) => {
	return {
		...currentConfiguration,
		resolve: {
			...currentConfiguration.resolve,
			alias: {
				...currentConfiguration.resolve?.alias,
				// Ensure React consistency
				react: require.resolve("react"),
				"react-dom": require.resolve("react-dom"),
			},
			fallback: {
				...currentConfiguration.resolve?.fallback,
				// Polyfills for Node.js modules in browser environment
				fs: false,
				path: false,
				os: false,
				crypto: false,
				buffer: false,
				stream: false,
				util: false,
				url: false,
				assert: false,
				http: false,
				https: false,
				zlib: false,
			},
		},
		// Production optimizations
		optimization: {
			...currentConfiguration.optimization,
			minimize: false, // Disable minification to prevent bundling issues
		},
	};
});

// Set concurrency based on server resources (important for VPS)
Config.setConcurrency(1); // Use single worker to prevent memory issues

// Enable logging for debugging production issues
Config.setLevel("verbose");

// Set public dir
Config.setPublicDir("public");

export default Config;
