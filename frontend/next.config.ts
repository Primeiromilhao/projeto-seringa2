import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/projeto-seringa2',
  assetPrefix: '/projeto-seringa2/',
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
