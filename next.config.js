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
  // maplibre-gl is a browser-only package — tell Next.js/webpack about it
  transpilePackages: ['maplibre-gl'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't try to bundle maplibre-gl on the server — it uses window/WebGL
      config.externals = [...(config.externals ?? []), 'maplibre-gl'];
    }

    // maplibre-gl references these Node built-ins on the client bundle; stub them
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },
};
module.exports = nextConfig;
