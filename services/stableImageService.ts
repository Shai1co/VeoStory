/**
 * Stability AI - Stable Image (Text-to-Image) Service
 * Generates images from text prompts using Stable Diffusion models
 * Used to create the first frame for text-to-video via SVD
 */

import { getApiKey } from '../utils/apiKeys';

export type StableImageModel = 'sd3' | 'sd3-5' | 'core' | 'ultra';

interface StableImageRequest {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: '16:9' | '1:1' | '21:9' | '2:3' | '3:2' | '4:5' | '5:4' | '9:16' | '9:21';
  seed?: number;
  output_format?: 'png' | 'jpeg' | 'webp';
  model?: StableImageModel;
}

// Direct API calls (CORS allowed by Stability AI)
const STABILITY_IMAGE_API_BASE = 'https://api.stability.ai/v2beta/stable-image/generate';

/**
 * Generate an image from a text prompt using Stable Diffusion
 * This can be used as the first step in text-to-video generation
 */
export async function generateStableImage(
  prompt: string,
  options: {
    negativePrompt?: string;
    aspectRatio?: '16:9' | '1:1' | '21:9' | '2:3' | '3:2' | '4:5' | '5:4' | '9:16' | '9:21';
    model?: StableImageModel;
    seed?: number;
  } = {}
): Promise<string> {
  console.log('🎨 [DEBUG] Starting Stable Diffusion image generation...');
  console.log('🎨 [DEBUG] Prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));

  const {
    negativePrompt = '',
    aspectRatio = '16:9', // Good for video generation
    model = 'core', // Good balance of speed/quality
    seed
  } = options;

  console.log('🎨 [DEBUG] Options:', { negativePrompt: negativePrompt.substring(0, 50) + (negativePrompt.length > 50 ? '...' : ''), aspectRatio, model, seed });

  // Choose the right endpoint based on model
  const endpoint = `${STABILITY_IMAGE_API_BASE}/${model}`;

  const formData = new FormData();
  formData.append('prompt', prompt);
  
  if (negativePrompt) {
    formData.append('negative_prompt', negativePrompt);
  }
  
  formData.append('aspect_ratio', aspectRatio);
  formData.append('output_format', 'png');
  
  if (seed !== undefined) {
    formData.append('seed', seed.toString());
  }

  const apiKey = getApiKey('STABILITY_API_KEY');
  if (!apiKey) {
    console.error('❌ [DEBUG] STABILITY_API_KEY not configured');
    throw new Error('STABILITY_API_KEY is not set. Please configure your API keys.');
  }

  console.log('🎨 [DEBUG] Sending request to Stability AI API...');
  console.log('🎨 [DEBUG] Endpoint:', endpoint);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'accept': 'image/*',
      'authorization': `Bearer ${apiKey}`,
    },
    body: formData
  });

  console.log('🎨 [DEBUG] Stability AI response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('❌ [DEBUG] Stability AI error:', response.status, errorText);
    throw new Error(
      `Stability AI Image Generation error: ${response.status} - ${errorText || response.statusText}`
    );
  }

  // Convert image blob to base64 data URL
  console.log('📥 [DEBUG] Converting response to blob...');
  const imageBlob = await response.blob();
  console.log('📥 [DEBUG] Image blob size:', imageBlob.size, 'bytes');

  console.log('🔄 [DEBUG] Converting blob to base64 data URL...');
  const result = await blobToBase64DataURL(imageBlob);
  console.log('✅ [DEBUG] Stability AI image generation completed');
  return result;
}

/**
 * Convert Blob to base64 data URL
 */
function blobToBase64DataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      console.log('🔄 [DEBUG] Base64 conversion completed, data URL length:', (reader.result as string).length);
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      console.error('❌ [DEBUG] FileReader error during base64 conversion:', error);
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate video from text prompt by chaining text-to-image + image-to-video
 * This provides effective text-to-video capability using Stability AI
 */
export async function generateVideoFromText(
  prompt: string,
  options: {
    negativePrompt?: string;
    model?: StableImageModel;
    motionStrength?: number;
    onImageGenerated?: (imageDataUrl: string) => void;
  } = {}
): Promise<{ imageDataUrl: string; generationId: string }> {
  const { negativePrompt, model, motionStrength = 127, onImageGenerated } = options;

  // Step 1: Generate image from text
  console.log('🎨 Generating initial image from text prompt...');
  const imageDataUrl = await generateStableImage(prompt, {
    negativePrompt,
    model,
    aspectRatio: '16:9'
  });

  // Notify caller that image is ready (optional callback for UI updates)
  if (onImageGenerated) {
    onImageGenerated(imageDataUrl);
  }

  // Step 2: Import SVD service and generate video from the image
  console.log('🎬 Animating image with Stable Video Diffusion...');
  const { generateStableVideo } = await import('./stableVideoService');
  const { generationId } = await generateStableVideo(imageDataUrl, motionStrength);

  return { imageDataUrl, generationId };
}

