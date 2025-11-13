/**
 * Image model metadata configuration for all supported image generation models
 */

import { ImageModelMetadata, ImageModel, ImageProvider } from '../types';

export const IMAGE_MODEL_METADATA: Record<ImageModel, ImageModelMetadata> = {
  'flux-schnell': {
    id: 'flux-schnell',
    provider: 'replicate',
    name: 'Flux Schnell',
    description: 'Fast, free image generation on Replicate - great for quick iterations',
    icon: '⚡',
    speed: '~5-10 seconds',
    quality: 'Good',
    costLevel: 1,
    requiresApiKey: undefined // Free/no key required
  },
  
  'gemini-imagen-3': {
    id: 'gemini-imagen-3',
    provider: 'gemini',
    name: 'Imagen 3 (Nano Banana)',
    description: 'Google\'s Imagen 3 via Gemini - photorealistic, high-quality images',
    icon: '🍌',
    speed: '~5-10 seconds',
    quality: 'Excellent',
    costLevel: 2,
    requiresApiKey: 'GEMINI_API_KEY'
  }
};

/**
 * Get models grouped by provider
 */
export function getImageModelsByProvider() {
  return {
    replicate: [
      IMAGE_MODEL_METADATA['flux-schnell']
    ],
    gemini: [
      IMAGE_MODEL_METADATA['gemini-imagen-3']
    ]
  };
}

/**
 * Get cost indicator symbols
 */
export function getImageCostSymbol(costLevel: number): string {
  return '$'.repeat(costLevel);
}

/**
 * Get approximate cost estimate based on cost level
 */
export function getImageCostEstimate(costLevel: number): string {
  switch (costLevel) {
    case 1:
      return 'Free/Very Low';
    case 2:
      return '~$0.04 per image';
    case 3:
      return '~$0.10 per image';
    default:
      return 'Variable';
  }
}

/**
 * Provider display names
 */
export const IMAGE_PROVIDER_NAMES: Record<ImageProvider, string> = {
  replicate: 'Replicate',
  gemini: 'Google Gemini'
};

