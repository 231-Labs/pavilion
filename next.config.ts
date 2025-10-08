import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" } as any;
    }
    return config;
  },
};

export default nextConfig;
