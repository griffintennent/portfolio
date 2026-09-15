import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Local API dev server (see scripts/dev-api-server.ts) — run
    // `npm run dev:api` alongside `npm run dev` to test /api/* locally.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
