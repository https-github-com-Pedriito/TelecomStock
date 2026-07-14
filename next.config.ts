import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: '**.ibb.co' },
    ],
  },
  // TypeORM ships optional drivers (expo, react-native, etc.) that webpack can't resolve.
  // Marking typeorm as a server-side external lets Node resolve it natively at runtime.
  serverExternalPackages: ['typeorm', 'reflect-metadata', 'pg'],
};

export default nextConfig;
