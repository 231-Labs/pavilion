import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" } as any;
    }
    return config;
  },
};

export default nextConfig;
