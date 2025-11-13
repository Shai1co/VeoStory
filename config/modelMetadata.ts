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
    requiresApiKey: 'API_KEY',
    estimatedSeconds: 60
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
    requiresApiKey: 'API_KEY',
    estimatedSeconds: 150
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
    requiresApiKey: 'RUNWAY_API_KEY',
    estimatedSeconds: 45
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
    requiresApiKey: 'RUNWAY_API_KEY',
    estimatedSeconds: 30
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
    requiresApiKey: 'STABILITY_API_KEY',
    estimatedSeconds: 55
  },
  
  'replicate-wan-2.5-i2v': {
    id: 'replicate-wan-2.5-i2v',
    provider: 'replicate',
    name: 'Wan 2.5 I2V',
    description: 'Alibaba Wan 2.5 with background audio generation (~60-90s)',
    icon: '🎵',
    speed: '~60-90 seconds',
    quality: 'Excellent',
    costLevel: 2,
    features: ['Image-to-video', '720p resolution', 'Background audio', '5-8 second videos', 'High quality'],
    requiresApiKey: 'REPLICATE_API_KEY',
    estimatedSeconds: 75
  },

  'replicate-wan-2.5-i2v-fast': {
    id: 'replicate-wan-2.5-i2v-fast',
    provider: 'replicate',
    name: 'Wan 2.5 I2V Fast',
    description: 'Wan 2.5 optimized for speed with audio (~40-60s)',
    icon: '⚡',
    speed: '~40-60 seconds',
    quality: 'Very Good',
    costLevel: 1,
    features: ['Image-to-video', '720p resolution', 'Background audio', '5-8 second videos', 'Fast generation'],
    requiresApiKey: 'REPLICATE_API_KEY',
    estimatedSeconds: 50
  },

  'replicate-veo-3.1': {
    id: 'replicate-veo-3.1',
    provider: 'replicate',
    name: 'Veo 3.1 (Replicate)',
    description: 'Google Veo 3.1 via Replicate with context-aware audio (~120-180s)',
    icon: '✨',
    speed: '~2-3 minutes',
    quality: 'Excellent',
    costLevel: 3,
    features: ['Text-to-video', 'Image-to-video', '720p resolution', 'Context-aware audio', 'Reference image support', 'Last frame support'],
    requiresApiKey: 'REPLICATE_API_KEY',
    estimatedSeconds: 150
  },

  'replicate-veo-3.1-fast': {
    id: 'replicate-veo-3.1-fast',
    provider: 'replicate',
    name: 'Veo 3.1 Fast (Replicate)',
    description: 'Google Veo 3.1 Fast via Replicate with audio (~60-90s)',
    icon: '⚡',
    speed: '~1-1.5 minutes',
    quality: 'Very Good',
    costLevel: 2,
    features: ['Text-to-video', 'Image-to-video', '720p resolution', 'Context-aware audio', 'Last frame support'],
    requiresApiKey: 'REPLICATE_API_KEY',
    estimatedSeconds: 75
  },

  'replicate-veo-3': {
    id: 'replicate-veo-3',
    provider: 'replicate',
    name: 'Veo 3 (Replicate)',
    description: 'Google Veo 3 via Replicate with audio generation (~120-180s)',
    icon: '🎬',
    speed: '~2-3 minutes',
    quality: 'Excellent',
    costLevel: 3,
    features: ['Text-to-video', 'Image-to-video', '720p resolution', 'Audio generation', 'Cinematic quality'],
    requiresApiKey: 'REPLICATE_API_KEY',
    estimatedSeconds: 150
  },

  'replicate-veo-3-fast': {
    id: 'replicate-veo-3-fast',
    provider: 'replicate',
    name: 'Veo 3 Fast (Replicate)',
    description: 'Google Veo 3 Fast via Replicate with audio (~60-90s)',
    icon: '🚀',
    speed: '~1-1.5 minutes',
    quality: 'Very Good',
    costLevel: 2,
    features: ['Text-to-video', 'Image-to-video', '720p resolution', 'Audio generation', 'Fast generation'],
    requiresApiKey: 'REPLICATE_API_KEY',
    estimatedSeconds: 75
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
      MODEL_METADATA['replicate-wan-2.5-i2v'],
      MODEL_METADATA['replicate-wan-2.5-i2v-fast'],
      MODEL_METADATA['replicate-veo-3.1'],
      MODEL_METADATA['replicate-veo-3.1-fast'],
      MODEL_METADATA['replicate-veo-3'],
      MODEL_METADATA['replicate-veo-3-fast']
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
 * Get approximate cost estimate based on cost level
 * These estimates are based on typical Replicate pricing as of Nov 2024
 * Actual costs may vary based on runtime and hardware
 */
export function getCostEstimate(costLevel: number): string {
  switch (costLevel) {
    case 1:
      return '~$0.04-0.06';
    case 2:
      return '~$0.08-0.15';
    case 3:
      return '~$0.20-0.30';
    case 4:
      return '~$0.40-0.50';
    default:
      return '~$0.10';
  }
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

