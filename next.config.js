/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  /** Avoid macOS EMFILE (too many open files) breaking route discovery in dev. */
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/icon.svg' }]
  },
}

module.exports = nextConfig
