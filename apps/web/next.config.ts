import type { NextConfig } from 'next';

const apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@motive-fashion/config',
    '@motive-fashion/types',
    '@motive-fashion/utils',
    '@motive-fashion/ui',
  ],
  images: { remotePatterns: [{ protocol: 'https', hostname: 'placehold.co' }] },
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${apiOrigin}/api/v1/:path*` }];
  },
};

export default nextConfig;
