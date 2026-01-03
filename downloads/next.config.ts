// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript Build-Errors temporär ignorieren
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Cache-Kontrolle für Entwicklung/Preview
  headers: async () => {
    return [
      {
        // Für alle V7-Seiten: Kein Caching
        source: '/v7/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
