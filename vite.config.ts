import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isDev = mode === 'development';
    
    return {
      // GitHub Pages deployment configuration
      // Update 'VeoStory' to match your repository name
      base: process.env.VITE_BASE_PATH || '/',
      
      server: {
        port: 3000,
        host: '0.0.0.0',
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'credentialless',
        },
        // Proxy only in development mode (not needed for production)
        ...(isDev && {
          proxy: {
            // Proxy Runway ML API to avoid CORS and attach auth headers in dev
            '/runway': {
              target: 'https://api.dev.runwayml.com',
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/runway/, ''),
              headers: {
                Authorization: `Bearer ${env.RUNWAY_API_KEY || env.RUNWAYML_API_SECRET || ''}`,
                'X-Runway-Version': '2024-11-06',
              },
            },
            // Proxy Stability AI API to avoid CORS and attach auth headers in dev
            '/stability': {
              target: 'https://api.stability.ai',
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/stability/, ''),
              headers: {
                Authorization: `Bearer ${env.STABILITY_API_KEY || ''}`,
              },
            },
            // Proxy Replicate API to avoid CORS and attach auth headers in dev
            '/replicate': {
              target: 'https://api.replicate.com',
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/replicate/, ''),
              headers: {
                Authorization: `Token ${env.REPLICATE_API_KEY || ''}`,
              },
            },
          },
        }),
      },
      plugins: [react()],
      // Remove process.env defines - we're using localStorage now
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
      },
      worker: {
        format: 'es'
      }
    };
});
