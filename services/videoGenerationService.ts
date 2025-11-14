/**
 * Unified Video Generation Service
 * Routes requests to appropriate provider based on selected model
 */

import { VideoModel, ImageModel } from '../types';
import { getApiKey } from '../utils/apiKeys';
import * as veoService from './veoService';
import * as runwayService from './runwayService';
import * as stableVideoService from './stableVideoService';
import * as replicateService from './replicateService';

export interface VideoGenerationRequest {
  prompt: string;
  model: VideoModel;
  imageData?: string; // base64 data URL for image-to-video
  imageModel?: ImageModel; // Which model to use for text-to-image (when imageData is not provided)
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
  console.log('🎬 [DEBUG] Starting video generation...');
  console.log('🎬 [DEBUG] Request:', {
    model: request.model,
    promptLength: request.prompt.length,
    hasImageData: !!request.imageData,
    imageModel: request.imageModel
  });

  const provider = getProvider(request.model);
  console.log('🎬 [DEBUG] Selected provider:', provider);

  switch (provider) {
    case 'veo':
      console.log('🎬 [DEBUG] Routing to Veo service');
      return await generateVeoVideo(request);

    case 'runway':
      console.log('🎬 [DEBUG] Routing to Runway service');
      return await generateRunwayVideo(request);

    case 'stable-diffusion':
      console.log('🎬 [DEBUG] Routing to Stable Diffusion service');
      return await generateStableVideo(request);

    case 'replicate':
      console.log('🎬 [DEBUG] Routing to Replicate service');
      return await generateReplicateVideo(request);

    default:
      console.error('❌ [DEBUG] Unsupported provider:', provider);
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Generate video using Google Veo
 */
async function generateVeoVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  const { prompt, model, imageData } = request;

  console.log('🎬 [DEBUG] Veo: Starting video generation');
  console.log('🎬 [DEBUG] Veo: Has image data:', !!imageData);

  // Generate video
  console.log('🎬 [DEBUG] Veo: Calling veoService.generateVideo...');
  const initialOperation = imageData
    ? await veoService.generateNextVideo(prompt, imageData, model)
    : await veoService.generateInitialVideo(prompt, model);

  console.log('🎬 [DEBUG] Veo: Initial operation created, name:', initialOperation.name);

  // Poll until complete
  console.log('🎬 [DEBUG] Veo: Starting polling for completion...');
  const finalOperation = await veoService.pollVideoOperation(initialOperation);
  console.log('🎬 [DEBUG] Veo: Polling completed');

  const videoUri = finalOperation.response?.generatedVideos?.[0]?.video?.uri;
  console.log('🎬 [DEBUG] Veo: Video URI extracted:', !!videoUri);

  if (!videoUri) {
    console.error('❌ [DEBUG] Veo: No video URI in final operation');
    console.error('❌ [DEBUG] Veo: Final operation response:', finalOperation.response);
    throw new Error('Veo video generation failed to return a valid URI.');
  }

  // Fetch video blob
  const apiKey = getApiKey('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('❌ [DEBUG] Veo: GEMINI_API_KEY not configured');
    throw new Error('GEMINI_API_KEY is not set. Please configure your API keys.');
  }

  console.log('🎬 [DEBUG] Veo: Fetching video blob from URI...');
  const response = await fetch(`${videoUri}&key=${apiKey}`);
  console.log('🎬 [DEBUG] Veo: Video fetch response status:', response.status);

  if (!response.ok) {
    console.error('❌ [DEBUG] Veo: Failed to fetch video:', response.statusText);
    throw new Error(`Failed to fetch Veo video: ${response.statusText}`);
  }

  const videoBlob = await response.blob();
  console.log('🎬 [DEBUG] Veo: Video blob size:', videoBlob.size, 'bytes');

  console.log('✅ [DEBUG] Veo: Video generation completed');
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

  console.log('🎬 [DEBUG] Stable: Starting video generation');
  console.log('🎬 [DEBUG] Stable: Has image data:', !!imageData);

  let finalImageData = imageData;

  // If no image provided, generate one from the text prompt first
  if (!finalImageData) {
    console.log('📝 [DEBUG] Stable: No image provided - generating image from text prompt...');
    const { generateStableImage } = await import('./stableImageService');

    console.log('📝 [DEBUG] Stable: Calling generateStableImage...');
    finalImageData = await generateStableImage(prompt, {
      aspectRatio: '16:9',
      model: 'core', // Good balance of speed/quality
      negativePrompt: 'blurry, low quality, distorted, ugly'
    });

    console.log('✅ [DEBUG] Stable: Image generated, now creating video...');
  }

  // Generate video using SVD (image-to-video)
  console.log('🎬 [DEBUG] Stable: Calling stableVideoService.generateAndWaitStableVideo...');
  const videoBlob = await stableVideoService.generateAndWaitStableVideo(finalImageData);
  console.log('🎬 [DEBUG] Stable: Video blob size:', videoBlob.size, 'bytes');

  console.log('✅ [DEBUG] Stable: Video generation completed');
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
  const { prompt, imageData, model, imageModel = 'flux-schnell' } = request;

  console.log(`🎬 [DEBUG] Replicate: Starting video generation with ${model}`);
  console.log(`🎬 [DEBUG] Replicate: Has image data:`, !!imageData);
  console.log(`🎬 [DEBUG] Replicate: Image model:`, imageModel);

  let videoBlob: Blob;

  if (imageData) {
    // Image-to-video: Use existing image
    console.log(`📸 [DEBUG] Replicate: Using provided image for ${model}...`);
    console.log(`📸 [DEBUG] Replicate: Calling generateAndFetchReplicateVideo...`);
    videoBlob = await replicateService.generateAndFetchReplicateVideo(imageData, model);
  } else {
    // Text-to-video: Generate image first, then animate
    console.log(`📝 [DEBUG] Replicate: Using text-to-video workflow (${imageModel} + ${model})...`);
    console.log(`📝 [DEBUG] Replicate: Calling generateAndFetchReplicateVideoFromText...`);
    videoBlob = await replicateService.generateAndFetchReplicateVideoFromText(prompt, model, {}, imageModel);
  }

  console.log(`🎬 [DEBUG] Replicate: Video blob size:`, videoBlob.size, 'bytes');

  // Get metadata based on model
  const metadata = getReplicateModelMetadata(model);
  console.log(`🎬 [DEBUG] Replicate: Model metadata:`, metadata);

  console.log('✅ [DEBUG] Replicate: Video generation completed');
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
  // Most Replicate models use defaults, specific cases handled in model metadata
  return { duration: 5, resolution: '720p' };
}

/**
 * Check if a model is available (API key configured)
 */
export function isModelAvailable(model: VideoModel): boolean {
  const provider = getProvider(model);
  
  switch (provider) {
    case 'veo':
      return !!getApiKey('GEMINI_API_KEY');
    case 'runway':
      return !!getApiKey('RUNWAY_API_KEY');
    case 'stable-diffusion':
      return !!getApiKey('STABILITY_API_KEY');
    case 'replicate':
      return !!getApiKey('REPLICATE_API_KEY');
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

