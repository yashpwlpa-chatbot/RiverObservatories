import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  // Share the root .env with Docker Compose and local Vite development.
  envDir: '..',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 3000,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 3000,
    allowedHosts: true,
  },
});
