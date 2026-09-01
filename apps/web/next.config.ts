import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@motive-fashion/config',
    '@motive-fashion/types',
    '@motive-fashion/utils',
    '@motive-fashion/ui',
  ],
  images: { remotePatterns: [{ protocol: 'https', hostname: 'placehold.co' }] },
};

export default nextConfig;
