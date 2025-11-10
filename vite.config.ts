import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'credentialless',
        },
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
          // Handles both text-to-image (SD3) and image-to-video (SVD)
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
      },
      plugins: [react()],
      define: {
        // Veo (Gemini) API key mapping
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // Runway ML API key (support both names)
        'process.env.RUNWAY_API_KEY': JSON.stringify(env.RUNWAY_API_KEY || env.RUNWAYML_API_SECRET),
        'process.env.RUNWAYML_API_SECRET': JSON.stringify(env.RUNWAYML_API_SECRET),
        // Stability AI API key (Stable Diffusion 3 + Stable Video Diffusion)
        'process.env.STABILITY_API_KEY': JSON.stringify(env.STABILITY_API_KEY),
        // Replicate API key (Stable Video Diffusion via Replicate)
        'process.env.REPLICATE_API_KEY': JSON.stringify(env.REPLICATE_API_KEY)
      },
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
