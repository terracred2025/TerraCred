import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to allow webpack config
  turbopack: {},

  webpack: (config, { isServer }) => {
    // Handle hashconnect and its dependencies properly
    if (!isServer) {
      // Client-side configuration
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
      };
    }

    // More aggressive deduplication - prevent any module from being loaded twice
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Force hashconnect and related packages into a single chunk
          hashconnect: {
            test: /[\\/]node_modules[\\/](hashconnect|@hashgraph[\\/]sdk|eventemitter3|valtio)[\\/]/,
            name: 'hashconnect',
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      },
    };

    return config;
  },
  // Transpile hashconnect to ensure compatibility
  transpilePackages: ['hashconnect', '@hashgraph/sdk', 'eventemitter3', 'valtio'],
};

export default nextConfig;
