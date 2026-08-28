import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow accessing the dev server (and its HMR websocket) from other devices
  // on the local network (e.g. testing on a real phone via its LAN IP).
  allowedDevOrigins: ['192.168.1.169'],
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
