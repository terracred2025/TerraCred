import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile hashconnect to ensure compatibility
  transpilePackages: ['hashconnect', '@hashgraph/sdk'],
};

export default nextConfig;
