import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@xenova/transformers'],
  },
};

export default nextConfig;
