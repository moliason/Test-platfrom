const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return process.env.DEV_BACKEND_ORIGIN
      ? [{ source: '/api/:path*', destination: `${process.env.DEV_BACKEND_ORIGIN}/api/:path*` }]
      : [];
  },
};

module.exports = withNextIntl(nextConfig);
