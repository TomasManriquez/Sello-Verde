/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    typedRoutes: false,
  },
  async rewrites() {
    // NEXT_INTERNAL_API_URL  → solo server-side (no se bake en el bundle del browser).
    // En Docker producción se resuelve como "http://backend:3001" (DNS interno de Docker).
    // En desarrollo local cae al fallback de localhost.
    const apiBase =
      process.env.NEXT_INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3001';

    return [
      // Proxy de la API REST
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
      // Proxy de los archivos estáticos servidos por NestJS ServeStaticModule
      {
        source: '/uploads/:path*',
        destination: `${apiBase}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
