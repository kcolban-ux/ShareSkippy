const nextConfig = {
  reactStrictMode: true,
  // Temporarily disable ESLint during build for production deployment
  eslint: {
    ignoreDuringBuilds: true,
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
        ],
      },
    ];
  },
  images: {
    domains: [
      // NextJS <Image> component needs to whitelist domains for src={}
      "lh3.googleusercontent.com",
      "pbs.twimg.com",
      "images.unsplash.com",
      "logos-world.net",
    ],
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
