/**
 * Image model metadata configuration for all supported image generation models
 */

import { ImageModelMetadata, ImageModel, ImageProvider } from '../types';

export const IMAGE_MODEL_METADATA: Record<ImageModel, ImageModelMetadata> = {
  'flux-schnell': {
    id: 'flux-schnell',
    provider: 'replicate',
    name: 'Flux Schnell',
    description: 'Fast image generation on Replicate - great for quick iterations',
    icon: '⚡',
    speed: '~5-10 seconds',
    quality: 'Good',
    costLevel: 1,
    requiresApiKey: 'REPLICATE_API_KEY'
  },
  
  'gemini-imagen-3': {
    id: 'gemini-imagen-3',
    provider: 'gemini',
    name: 'Imagen 3 (Paid Tier)',
    description: 'Google\'s Imagen 3 - requires paid Gemini API plan. Use Flux Schnell if you have free tier.',
    icon: '💎',
    speed: '~5-10 seconds',
    quality: 'Excellent',
    costLevel: 3,
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

