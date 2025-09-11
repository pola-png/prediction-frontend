
import type {NextConfig} from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Aliases for client and server
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    
    // In a monorepo, you might need to transpile packages from the workspace
    // Example: config.transpilePackages = ['@my/shared-ui-package'];
    
    return config;
  },
};

export default nextConfig;
