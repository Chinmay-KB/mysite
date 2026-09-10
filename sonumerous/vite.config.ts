import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiPort = process.env.SONUMEROUS_API_PORT ?? '8791';
const apiOrigin = `http://127.0.0.1:${apiPort}`;

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    {
      name: 'landing-at-root',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url?.split('?')[0] ?? '';
          if (url === '/' || url === '/index.html') {
            req.url = '/index.html';
          }
          next();
        });
      },
    },
  ],
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, 'app/index.html'),
        landing: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': apiOrigin,
      '/media': apiOrigin,
      '/public': apiOrigin,
    },
  },
});
