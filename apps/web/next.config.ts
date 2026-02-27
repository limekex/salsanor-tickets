import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Explicitly set Turbopack root to monorepo root
  // This prevents Next.js from inferring the wrong workspace root
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
