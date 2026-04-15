/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Next.js 15: use remotePatterns instead of deprecated domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vendoriq-reports.s3.eu-north-1.amazonaws.com',
      },
    ],
  },
  // Suppress hydration warnings from browser extensions
  // Do NOT use suppressHydrationWarning on html - it masks real bugs
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  // Turbopack is stable in Next.js 15
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', 'framer-motion'],
  },
};

module.exports = nextConfig;
