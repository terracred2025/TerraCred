import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile hashconnect to ensure compatibility
  transpilePackages: ['hashconnect', '@hashgraph/sdk'],

  // Webpack configuration for better hashconnect handling
  // Note: Using webpack instead of Turbopack to avoid minification bugs
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Ensure proper handling of hashconnect and related packages
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Configure Terser to avoid identifier collisions
    if (!dev) {
      const TerserPlugin = require('terser-webpack-plugin');

      config.optimization = {
        ...config.optimization,
        minimize: true,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              compress: {
                comparisons: false,
                inline: 2,
              },
              mangle: {
                safari10: true,
                // Use longer variable names to avoid collisions
                keep_fnames: false,
              },
              output: {
                comments: false,
                ascii_only: true,
              },
            },
          }),
        ],
        concatenateModules: false, // Disable scope hoisting to prevent conflicts
      };
    }

    return config;
  },
};

export default nextConfig;
