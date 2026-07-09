import { defineConfig } from 'vite';

export default defineConfig({
  // Relative by default; GitHub Pages sets VITE_BASE_PATH=/VeoStory/luli-crush/
  base: process.env.VITE_BASE_PATH || './',
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
