import type { NextConfig } from 'next';
if (process.env.VERCEL && !process.env.API_URL) {
    throw new Error('Configura API_URL con la URL HTTPS del proyecto NestJS antes de desplegar el frontend en Vercel.');
}
const apiUrl = new URL(process.env.API_URL || 'http://127.0.0.1:3001');
if (!['http:', 'https:'].includes(apiUrl.protocol) || apiUrl.username || apiUrl.password || apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash) {
    throw new Error('API_URL debe contener solo el origen de NestJS, por ejemplo https://mesa-api.vercel.app, sin /api ni credenciales.');
}
const config: NextConfig = {
    async rewrites() {
        return [{ source: '/api/:path*', destination: `${apiUrl.origin}/api/:path*` }];
    },
};
export default config;
