/**
 * Model metadata configuration for all supported video generation models
 */

import { VideoModelMetadata, VideoModel } from '../types';

export const MODEL_METADATA: Record<VideoModel, VideoModelMetadata> = {
  'veo-3.1-fast-generate-preview': {
    id: 'veo-3.1-fast-generate-preview',
    provider: 'veo',
    name: 'Veo 3.1 Fast',
    description: 'Quick generation (~1 min) - ideal for prototyping and iterations',
    icon: '⚡',
    speed: '~1 minute',
    quality: 'Good',
    costLevel: 1,
    features: ['Text-to-video', 'Image-to-video', '720p resolution', '~8s duration'],
    requiresApiKey: 'API_KEY'
  },
  
  'veo-3.1-generate-preview': {
    id: 'veo-3.1-generate-preview',
    provider: 'veo',
    name: 'Veo 3.1 Standard',
    description: 'Highest quality (~2-3 min) - best for final production',
    icon: '✨',
    speed: '~2-3 minutes',
    quality: 'Excellent',
    costLevel: 2,
    features: ['Text-to-video', 'Image-to-video', '720p resolution', '~8s duration'],
    requiresApiKey: 'API_KEY'
  },
  
  'runway-gen-3-alpha': {
    id: 'runway-gen-3-alpha',
    provider: 'runway',
    name: 'Runway Gen-3 Alpha',
    description: 'Professional cinematic quality (~45s generation)',
    icon: '🎬',
    speed: '~45 seconds',
    quality: 'Professional',
    costLevel: 3,
    features: ['Text-to-video', 'Image-to-video', '720p resolution', '5-10s duration', 'Cinematic controls'],
    limitations: ['Higher cost per generation', 'Ready for testing - API format updated'],
    requiresApiKey: 'RUNWAY_API_KEY'
  },
  
  'runway-gen-4-turbo': {
    id: 'runway-gen-4-turbo',
    provider: 'runway',
    name: 'Runway Gen-3 Alpha Turbo',
    description: 'Ultra-fast professional quality (~30s generation)',
    icon: '🚀',
    speed: '~30 seconds',
    quality: 'Professional',
    costLevel: 4,
    features: ['Text-to-video', 'Image-to-video', '720p resolution', '5-10s duration', 'Faster generation', 'Advanced controls'],
    limitations: ['Premium pricing', 'Ready for testing - API format updated'],
    requiresApiKey: 'RUNWAY_API_KEY'
  },
  
  'stable-video-diffusion-img2vid': {
    id: 'stable-video-diffusion-img2vid',
    provider: 'stable-diffusion',
    name: 'Stable Video Diffusion',
    description: 'Cost-effective video generation (~55s total: 15s image + 40s video)',
    icon: '🎨',
    speed: '~55 seconds',
    quality: 'Good',
    costLevel: 1,
    features: ['Text-to-video (via SD3)', 'Image-to-video', '576p resolution', 'Smooth motion', 'Open-source'],
    limitations: ['Only 2-second videos', 'Lower resolution', 'Two-step process for text-to-video'],
    requiresApiKey: 'STABILITY_API_KEY'
  },
  
  'replicate-svd': {
    id: 'replicate-svd',
    provider: 'replicate',
    name: 'Replicate SVD',
    description: 'Stable Video Diffusion via Replicate (~55-85s total: 15s image + 40-70s video)',
    icon: '🔄',
    speed: '~55-85 seconds',
    quality: 'Good',
    costLevel: 1,
    features: ['Text-to-video (via Stability AI/Placeholder)', 'Image-to-video', '576p resolution', 'Smooth motion', '25 frames', 'Reliable API'],
    limitations: ['~1 second videos', 'Two-step process for text-to-video'],
    requiresApiKey: 'REPLICATE_API_KEY'
  },

  'replicate-animatediff': {
    id: 'replicate-animatediff',
    provider: 'replicate',
    name: 'AnimateDiff',
    description: 'High-quality motion animation (~40s generation)',
    icon: '✨',
    speed: '~40 seconds',
    quality: 'Excellent',
    costLevel: 1,
    features: ['Text-to-video (via FLUX)', 'Image-to-video', '512x512 resolution', 'Smooth animations', '2-4 second videos', 'Creative motion'],
    limitations: ['Square format', 'Two-step process for text-to-video'],
    requiresApiKey: 'REPLICATE_API_KEY'
  },

  'replicate-hotshot': {
    id: 'replicate-hotshot',
    provider: 'replicate',
    name: 'HotShot',
    description: 'Ultra-fast GIF-style animations (~25s generation)',
    icon: '⚡',
    speed: '~25 seconds',
    quality: 'Good',
    costLevel: 1,
    features: ['Text-to-video (via FLUX)', 'Image-to-video', 'GIF-style loops', '1-2 second videos', 'Fast iterations', 'Artistic styles'],
    limitations: ['Very short duration', 'Two-step process for text-to-video'],
    requiresApiKey: 'REPLICATE_API_KEY'
  },

  'replicate-hailuo-02': {
    id: 'replicate-hailuo-02',
    provider: 'replicate',
    name: 'Hailuo 02 Standard',
    description: 'High-quality physics simulation at 768p (6-10s videos)',
    icon: '🎬',
    speed: '~60-90 seconds',
    quality: 'Excellent',
    costLevel: 2,
    features: ['Text-to-video (via FLUX)', 'Image-to-video', '768p resolution', '6-10 second videos', 'Realistic physics', 'Complex motion'],
    limitations: ['Two-step process for text-to-video', 'Higher cost'],
    requiresApiKey: 'REPLICATE_API_KEY'
  },

  'replicate-seedance-lite': {
    id: 'replicate-seedance-lite',
    provider: 'replicate',
    name: 'Seedance Lite',
    description: 'Fast cinematic video generation at 480p (5-10s videos)',
    icon: '🎥',
    speed: '~40-60 seconds',
    quality: 'Good',
    costLevel: 1,
    features: ['Text-to-video (via FLUX)', 'Image-to-video', '480p resolution', '5-10 second videos', 'Multi-shot support', 'Cinematic quality'],
    limitations: ['Lower resolution', 'Two-step process for text-to-video'],
    requiresApiKey: 'REPLICATE_API_KEY'
  },

  'replicate-seedance-pro-fast': {
    id: 'replicate-seedance-pro-fast',
    provider: 'replicate',
    name: 'Seedance Pro Fast',
    description: 'Faster pro-quality generation at 720p (5-10s videos)',
    icon: '⚡',
    speed: '~50-70 seconds',
    quality: 'Very Good',
    costLevel: 2,
    features: ['Text-to-video (via FLUX)', 'Image-to-video', '720p resolution', '5-10 second videos', 'Fast inference', 'Cinematic quality'],
    limitations: ['Two-step process for text-to-video', 'Moderate cost'],
    requiresApiKey: 'REPLICATE_API_KEY'
  },

  'replicate-seedance-pro': {
    id: 'replicate-seedance-pro',
    provider: 'replicate',
    name: 'Seedance Pro',
    description: 'Premium cinematic quality at 720p (5-10s videos)',
    icon: '🎯',
    speed: '~70-100 seconds',
    quality: 'Excellent',
    costLevel: 3,
    features: ['Text-to-video (via FLUX)', 'Image-to-video', '720p resolution', '5-10 second videos', 'Multi-shot support', 'Premium quality'],
    limitations: ['Slower generation', 'Higher cost', 'Two-step process for text-to-video'],
    requiresApiKey: 'REPLICATE_API_KEY'
  }
};

/**
 * Get models grouped by provider
 */
export function getModelsByProvider() {
  return {
    veo: [
      MODEL_METADATA['veo-3.1-fast-generate-preview'],
      MODEL_METADATA['veo-3.1-generate-preview']
    ],
    runway: [
      MODEL_METADATA['runway-gen-3-alpha'],
      MODEL_METADATA['runway-gen-4-turbo']
    ],
    'stable-diffusion': [
      MODEL_METADATA['stable-video-diffusion-img2vid']
    ],
    replicate: [
      MODEL_METADATA['replicate-svd'],
      MODEL_METADATA['replicate-animatediff'],
      MODEL_METADATA['replicate-hotshot'],
      MODEL_METADATA['replicate-hailuo-02'],
      MODEL_METADATA['replicate-seedance-lite'],
      MODEL_METADATA['replicate-seedance-pro-fast'],
      MODEL_METADATA['replicate-seedance-pro']
    ]
  };
}

/**
 * Get cost indicator symbols
 */
export function getCostSymbol(costLevel: number): string {
  return '$'.repeat(costLevel);
}

/**
 * Provider display names
 */
export const PROVIDER_NAMES = {
  veo: 'Google Veo',
  runway: 'Runway ML',
  'stable-diffusion': 'Stability AI',
  replicate: 'Replicate'
};

