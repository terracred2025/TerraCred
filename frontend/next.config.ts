import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile hashconnect to ensure compatibility
  transpilePackages: ['hashconnect', '@hashgraph/sdk'],

  // Webpack configuration for better hashconnect handling
  // Note: Using webpack instead of Turbopack to avoid minification bugs
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure proper handling of hashconnect and related packages
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Optimize module resolution for hashconnect
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
    };

    return config;
  },
};

export default nextConfig;
