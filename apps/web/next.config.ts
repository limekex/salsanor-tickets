import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Explicitly set Turbopack root to monorepo root
  // This prevents Next.js from inferring the wrong workspace root
  // when multiple package-lock.json files exist
  experimental: {
    turbo: {
      root: path.resolve(__dirname, "../.."),
    },
  },
};

export default nextConfig;
