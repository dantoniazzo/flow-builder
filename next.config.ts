import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable server actions for flow execution
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
