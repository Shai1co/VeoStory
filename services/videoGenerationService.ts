/**
 * Unified Video Generation Service
 * Routes requests to appropriate provider based on selected model
 */

import { VideoModel } from '../types';
import * as veoService from './veoService';
import * as runwayService from './runwayService';
import * as stableVideoService from './stableVideoService';
import * as replicateService from './replicateService';

export interface VideoGenerationRequest {
  prompt: string;
  model: VideoModel;
  imageData?: string; // base64 data URL for image-to-video
}

export interface VideoGenerationResponse {
  videoBlob: Blob;
  metadata: {
    model: VideoModel;
    duration: number;
    resolution: string;
  };
}

/**
 * Determine which provider to use based on model ID
 */
function getProvider(model: VideoModel): 'veo' | 'runway' | 'stable-diffusion' | 'replicate' {
  if (model.startsWith('veo-')) return 'veo';
  if (model.startsWith('runway-')) return 'runway';
  if (model.startsWith('stable-video')) return 'stable-diffusion';
  if (model.startsWith('replicate-')) return 'replicate';
  throw new Error(`Unknown model provider for: ${model}`);
}

/**
 * Main video generation function - routes to appropriate service
 */
export async function generateVideo(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  const provider = getProvider(request.model);

  switch (provider) {
    case 'veo':
      return await generateVeoVideo(request);
    
    case 'runway':
      return await generateRunwayVideo(request);
    
    case 'stable-diffusion':
      return await generateStableVideo(request);
    
    case 'replicate':
      return await generateReplicateVideo(request);
    
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Generate video using Google Veo
 */
async function generateVeoVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  const { prompt, model, imageData } = request;

  // Generate video
  const initialOperation = imageData
    ? await veoService.generateNextVideo(prompt, imageData, model)
    : await veoService.generateInitialVideo(prompt, model);
  
  // Poll until complete
  const finalOperation = await veoService.pollVideoOperation(initialOperation);
  const videoUri = finalOperation.response?.generatedVideos?.[0]?.video?.uri;

  if (!videoUri) {
    throw new Error('Veo video generation failed to return a valid URI.');
  }
  
  // Fetch video blob
  const response = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch Veo video: ${response.statusText}`);
  }
  const videoBlob = await response.blob();

  return {
    videoBlob,
    metadata: {
      model,
      duration: 8, // Veo generates ~8 second videos
      resolution: '720p'
    }
  };
}

/**
 * Generate video using Runway ML
 * Now using updated API format based on official SDK
 */
async function generateRunwayVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  const { prompt, model, imageData } = request;

  console.log('🎬 Generating Runway video...', { model, hasImage: !!imageData });

  const task = await runwayService.generateRunwayVideo(
    prompt,
    imageData,
    model as 'runway-gen-3-alpha' | 'runway-gen-4-turbo'
  );
  
  const completedTask = await runwayService.pollRunwayOperation(task);
  
  // Get video URL from task output
  let videoUrl: string | undefined;
  
  if (completedTask.output && completedTask.output.length > 0) {
    videoUrl = completedTask.output[0];
  } else if (completedTask.artifacts && completedTask.artifacts.length > 0) {
    // Alternative response format
    videoUrl = completedTask.artifacts[0].url || completedTask.artifacts[0];
  }
  
  if (!videoUrl) {
    console.error('❌ No video URL in completed task:', completedTask);
    throw new Error('Runway video generation failed to return a video URL.');
  }

  console.log('📥 Fetching Runway video from:', videoUrl);
  const videoBlob = await runwayService.fetchRunwayVideoBlob(videoUrl);

  return {
    videoBlob,
    metadata: {
      model,
      duration: 5, // Runway Gen-3 generates 5-second videos by default
      resolution: '720p'
    }
  };
}

/**
 * Generate video using Stable Video Diffusion
 * Supports both image-to-video and text-to-video (via text-to-image chaining)
 */
async function generateStableVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  const { prompt, imageData } = request;

  let finalImageData = imageData;

  // If no image provided, generate one from the text prompt first
  if (!finalImageData) {
    console.log('📝 No image provided - generating image from text prompt...');
    const { generateStableImage } = await import('./stableImageService');
    
    finalImageData = await generateStableImage(prompt, {
      aspectRatio: '16:9',
      model: 'core', // Good balance of speed/quality
      negativePrompt: 'blurry, low quality, distorted, ugly'
    });
    
    console.log('✅ Image generated, now creating video...');
  }

  // Generate video using SVD (image-to-video)
  const videoBlob = await stableVideoService.generateAndWaitStableVideo(finalImageData);

  return {
    videoBlob,
    metadata: {
      model: request.model,
      duration: 2, // SVD generates 2-second videos
      resolution: '576p'
    }
  };
}

/**
 * Generate video using Replicate models
 * Supports multiple models: SVD, AnimateDiff, HotShot, I2VGen-XL, SVD-XT 1.1, CogVideoX
 */
async function generateReplicateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  const { prompt, imageData, model } = request;

  console.log(`🔄 Generating Replicate video with ${model}...`);

  let videoBlob: Blob;

  if (imageData) {
    // Image-to-video: Use existing image
    console.log(`📸 Using provided image for ${model}...`);
    videoBlob = await replicateService.generateAndFetchReplicateVideo(imageData, model);
  } else {
    // Text-to-video: Generate image first, then animate
    console.log(`📝 Using text-to-video workflow (FLUX + ${model})...`);
    videoBlob = await replicateService.generateAndFetchReplicateVideoFromText(prompt, model);
  }

  // Get metadata based on model
  const metadata = getReplicateModelMetadata(model);

  return {
    videoBlob,
    metadata: {
      model: model,
      duration: metadata.duration,
      resolution: metadata.resolution
    }
  };
}

/**
 * Get model-specific metadata for Replicate models
 */
function getReplicateModelMetadata(model: VideoModel): { duration: number; resolution: string } {
  switch (model) {
    case 'replicate-svd':
      return { duration: 1, resolution: '576p' };
    
    case 'replicate-animatediff':
      return { duration: 3, resolution: '512x512' };
    
    case 'replicate-hotshot':
      return { duration: 1.5, resolution: '512x512' };
    
    case 'replicate-hailuo-02':
      return { duration: 6, resolution: '768p' };
    
    case 'replicate-seedance-lite':
      return { duration: 5, resolution: '480p' };
    
    case 'replicate-seedance-pro-fast':
      return { duration: 5, resolution: '720p' };
    
    case 'replicate-seedance-pro':
      return { duration: 5, resolution: '720p' };
    
    default:
      return { duration: 2, resolution: '576p' };
  }
}

/**
 * Check if a model is available (API key configured)
 */
export function isModelAvailable(model: VideoModel): boolean {
  const provider = getProvider(model);
  
  switch (provider) {
    case 'veo':
      return !!process.env.API_KEY;
    case 'runway':
      return !!process.env.RUNWAY_API_KEY;
    case 'stable-diffusion':
      return !!process.env.STABILITY_API_KEY;
    case 'replicate':
      return !!process.env.REPLICATE_API_KEY;
    default:
      return false;
  }
}

/**
 * Get user-friendly error message for provider
 */
export function getProviderErrorMessage(model: VideoModel, error: Error): string {
  const provider = getProvider(model);
  const errorMsg = error.message.toLowerCase();

  // Rate limit errors
  if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
    return `${provider} rate limit exceeded. Please wait a few minutes before trying again.`;
  }

  // Quota/billing errors
  if (errorMsg.includes('quota') || errorMsg.includes('insufficient') || errorMsg.includes('billing')) {
    return `${provider} quota exceeded or billing issue. Please check your account at the provider's website.`;
  }

  // Authentication errors
  if (errorMsg.includes('unauthorized') || errorMsg.includes('401') || errorMsg.includes('api key')) {
    return `${provider} API key is invalid or not set. Please configure your API key.`;
  }

  // Generic error
  return `${provider} error: ${error.message}`;
}

