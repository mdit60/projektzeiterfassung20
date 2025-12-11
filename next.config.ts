// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript Build-Errors temporär ignorieren
  typescript: {
    ignoreBuildErrors: true,
  },
  // keine experimental turbo settings nötig
};

export default nextConfig;