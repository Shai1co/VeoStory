/**
 * Stability AI - Stable Video Diffusion Service
 * Generates 2-second videos from images using SVD
 */

import { getApiKey } from '../utils/apiKeys';

interface StableVideoRequest {
  image: string; // base64 encoded image
  cfg_scale?: number; // 0-10, controls how much the video sticks to the image
  motion_bucket_id?: number; // 1-255, controls amount of motion
  seed?: number; // Random seed for reproducibility
}

interface StableVideoResponse {
  id: string;
  video?: string; // base64 encoded video
  finish_reason?: string;
}

// Direct API calls (CORS allowed by Stability AI)
const STABILITY_API_BASE = 'https://api.stability.ai/v2alpha/generation/image-to-video';
const POLL_INTERVAL_MS = 10000; // Poll every 10 seconds
const MAX_POLL_ATTEMPTS = 60; // 10 minutes max

// API key is attached by Vite proxy in development. For production, calls should
// go through a backend that appends the Authorization header.

/**
 * Convert base64 data URL to raw base64 string
 */
function extractBase64(dataUrl: string): string {
  if (dataUrl.includes(',')) {
    return dataUrl.split(',')[1];
  }
  return dataUrl;
}

/**
 * Generate video using Stable Video Diffusion
 * NOTE: SVD generates 2-second videos (25 frames) by default
 */
export async function generateStableVideo(
  imageData: string,
  motionStrength: number = 127
): Promise<{ generationId: string }> {
  
  // Remove data URL prefix if present
  const base64Image = extractBase64(imageData);

  const formData = new FormData();
  formData.append('image', base64Image);
  formData.append('cfg_scale', '1.8');
  formData.append('motion_bucket_id', motionStrength.toString());
  formData.append('seed', Math.floor(Math.random() * 1000000).toString());

  const apiKey = getApiKey('STABILITY_API_KEY');
  if (!apiKey) {
    throw new Error('STABILITY_API_KEY is not set. Please configure your API keys.');
  }

  const response = await fetch(STABILITY_API_BASE, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Stability AI error: ${response.status} - ${errorData.message || errorData.name || response.statusText}`
    );
  }

  const result = await response.json();
  return { generationId: result.id };
}

/**
 * Poll Stability AI for video generation result
 */
export async function pollStableVideoOperation(generationId: string): Promise<Blob> {
  const apiKey = getApiKey('STABILITY_API_KEY');
  if (!apiKey) {
    throw new Error('STABILITY_API_KEY is not set. Please configure your API keys.');
  }

  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    // Wait before polling
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    const response = await fetch(`${STABILITY_API_BASE}/result/${generationId}`, {
      method: 'GET',
      headers: {
        'accept': 'video/*', // Accept video response
        'authorization': `Bearer ${apiKey}`,
      }
    });

    if (response.status === 202) {
      // Still processing
      attempts++;
      continue;
    }

    if (response.ok) {
      // Video is ready
      const videoBlob = await response.blob();
      return videoBlob;
    }

    if (response.status === 404) {
      throw new Error('Stability AI generation not found');
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Stability AI error: ${response.status} - ${errorData.message || response.statusText}`
    );
  }

  throw new Error('Stability AI video generation timed out after 10 minutes');
}

/**
 * Generate video and wait for completion (convenience function)
 */
export async function generateAndWaitStableVideo(
  imageData: string,
  motionStrength: number = 127
): Promise<Blob> {
  const { generationId } = await generateStableVideo(imageData, motionStrength);
  return await pollStableVideoOperation(generationId);
}

