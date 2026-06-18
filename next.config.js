/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: (() => {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        if (!appUrl) return [];
        try { return [new URL(appUrl).host]; } catch { return []; }
      })(),
    },
  },
};

module.exports = nextConfig;
