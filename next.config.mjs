import nextBundleAnalyzer from '@next/bundle-analyzer';

const withNextBundleAnalyzer = nextBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'react-hot-toast'],
  },
  // Reduce bundle size
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            chunks: 'all',
          },
        },
      };
    }
    return config;
  },
  // Add your custom domain
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Add cache-busting headers for API routes
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
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
      // Specific headers for API routes
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
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
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', port: '', pathname: '**' },
      { protocol: 'https', hostname: 'pbs.twimg.com', port: '', pathname: '**' },
      { protocol: 'https', hostname: 'images.unsplash.com', port: '', pathname: '**' },
      { protocol: 'https', hostname: 'logos-world.net', port: '', pathname: '**' },
      { protocol: 'https', hostname: 'utrvultsbtsywypztfnn.supabase.co', port: '', pathname: '**' }, // Supabase storage domain
      { protocol: 'http', hostname: '127.0.0.1', port: '54321', pathname: '**' },
      { protocol: 'http', hostname: 'localhost', port: '54321', pathname: '**' },
    ],
    // Add image optimization settings
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
};

export default withNextBundleAnalyzer(nextConfig);
