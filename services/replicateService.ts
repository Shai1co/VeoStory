/**
 * Replicate - Stable Video Diffusion Service
 * Uses Replicate's API to run Stable Video Diffusion model
 * 
 * CORS PROXY CONFIGURATION:
 * -------------------------
 * Replicate API does NOT support direct browser access due to CORS restrictions.
 * This service uses corsproxy.io to proxy requests from browser-based deployments
 * (like GitHub Pages). 
 * 
 * To disable CORS proxy (e.g., for server-side deployments):
 * Set USE_CORS_PROXY = false below
 * 
 * Alternative CORS proxies if corsproxy.io is down:
 * - https://cors-anywhere.herokuapp.com/
 * - https://api.allorigins.win/raw?url=
 * - Self-hosted proxy (recommended for production)
 */

import { getApiKey } from '../utils/apiKeys';

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[]; // Video URL(s)
  error?: string;
  logs?: string;
  metrics?: {
    predict_time?: number;
  };
}

interface ReplicateCreateRequest {
  version: string; // Model version hash
  input: {
    input_image: string; // Data URL or HTTP URL
    frames?: number; // Number of frames (default: 25)
    motion_bucket_id?: number; // Motion amount 1-255 (default: 127)
    cond_aug?: number; // Conditioning augmentation (default: 0.02)
    decoding_t?: number; // Number of frames decoded at a time (default: 7)
    seed?: number; // Random seed for reproducibility
  };
}

// Replicate API configuration
// NOTE: Replicate does NOT allow direct browser access (CORS restrictions)
// Using CORS proxy for browser-based deployments
const USE_CORS_PROXY = true; // Set to true for browser deployments (GitHub Pages, etc.)
const CORS_PROXY_PREFIX = 'https://corsproxy.io/?';
const REPLICATE_API_BASE = 'https://api.replicate.com/v1';
const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 180; // 6 minutes max

/**
 * Wraps a URL with CORS proxy if enabled
 */
function getCorsProxiedUrl(url: string): string {
  return USE_CORS_PROXY ? `${CORS_PROXY_PREFIX}${encodeURIComponent(url)}` : url;
}

/**
 * Model version hashes for Replicate
 * 
 * HOW TO UPDATE VERSION HASHES:
 * 1. Visit the model's Replicate page (URLs below)
 * 2. Click on the "API" tab
 * 3. Look for the "version" field in the example code
 * 4. Copy the full hash (64 character hexadecimal string)
 * 5. Replace the version constant below
 */

// Stable Video Diffusion (original)
// URL: https://replicate.com/stability-ai/stable-video-diffusion-img2vid-xt
// Last checked: [UPDATE THIS DATE]
const SVD_MODEL_VERSION = '3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438';

// AnimateDiff
// URL: https://replicate.com/lucataco/animate-diff
// Last checked: 10/29/2025
const ANIMATEDIFF_VERSION = 'beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f';

// HotShot-XL
// URL: https://replicate.com/lucataco/hotshot-xl
// Last checked: 10/29/2025
const HOTSHOT_VERSION = '78b3a6257e16e4b241245d65c8b2b81ea2e1ff7ed4c55306b511509ddbfd327a';

// Hailuo-02 Standard (768p)
// URL: https://replicate.com/minimax/hailuo-02
// Last checked: 2025-10-30
const HAILUO_02_VERSION = '155f1a7a8b1f92ab533dd0c0ad96956d07813807901fe117282c20c965b560ca';

// Seedance 1 Lite (480p/720p)
// URL: https://replicate.com/bytedance/seedance-1-lite
// Last checked: 2025-10-30
const SEEDANCE_LITE_VERSION = '6232c06a59259ea8a3f3f68ae6dd2ebf3d7c0470fa383ac120c851bb07a4821d';

// Seedance 1 Pro Fast
// URL: https://replicate.com/bytedance/seedance-1-pro-fast
// Last checked: 2025-10-30
const SEEDANCE_PRO_FAST_VERSION = '35d0e594f4ef1fcfebd9ba65c838254e6a7fbf23de7031c4aecbae793c362b60';

// Seedance 1 Pro
// URL: https://replicate.com/bytedance/seedance-1-pro
// Last checked: 2025-10-30
const SEEDANCE_PRO_VERSION = '1f8e5a9881ddd2e19896e97120de117abbf4accdf0e2884c9fd3f87d55d3dc9b';

// FLUX Schnell - Fast, free image generation on Replicate
// URL: https://replicate.com/black-forest-labs/flux-schnell
// Last checked: 2025-10-30
const FLUX_SCHNELL_VERSION = 'c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e';

// ==============================================================================
// NEW MODELS: Using model paths instead of version hashes
// This automatically uses the latest version of each model
// ==============================================================================

// Model paths for new models (no version hash needed)
// These will automatically use the latest version

// Wan 2.5 I2V - Image to video with audio
// URL: https://replicate.com/wan-video/wan-2.5-i2v
// Typical cost: ~$0.08-0.12 per run (based on 60-80s runtime on A100)
const WAN_2_5_I2V_MODEL = 'wan-video/wan-2.5-i2v';

// Wan 2.5 I2V Fast - Faster version with audio
// URL: https://replicate.com/wan-video/wan-2.5-i2v-fast
// Typical cost: ~$0.04-0.06 per run (based on 30-40s runtime on A100)
const WAN_2_5_I2V_FAST_MODEL = 'wan-video/wan-2.5-i2v-fast';

// Google Veo 3.1 - Text/Image to video with context-aware audio
// URL: https://replicate.com/google/veo-3.1
// Typical cost: ~$0.20-0.30 per run (premium model)
const VEO_3_1_MODEL = 'google/veo-3.1';

// Google Veo 3.1 Fast - Faster version with audio
// URL: https://replicate.com/google/veo-3.1-fast
// Typical cost: ~$0.10-0.15 per run (premium model, faster)
const VEO_3_1_FAST_MODEL = 'google/veo-3.1-fast';

// Google Veo 3 - Text/Image to video with audio
// URL: https://replicate.com/google/veo-3
// Typical cost: ~$0.20-0.30 per run (premium model)
const VEO_3_MODEL = 'google/veo-3';

// Google Veo 3 Fast - Faster version with audio
// URL: https://replicate.com/google/veo-3-fast
// Typical cost: ~$0.10-0.15 per run (premium model, faster)
const VEO_3_FAST_MODEL = 'google/veo-3-fast';

/**
 * Model configuration interface
 */
interface ReplicateModelConfig {
  version?: string; // Optional - used for old models
  model?: string; // Optional - used for new models (owner/name format)
  buildInput: (imageData: string, options: any) => any;
  defaultOptions: any;
}

/**
 * Convert duration string to integer for Replicate API
 */
function parseDuration(duration: string | number): number {
  if (typeof duration === 'number') {
    return duration;
  }
  
  // Extract number from strings like '6s', '5s', '10s'
  const match = duration.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 5; // Default to 5 seconds
}

/**
 * Get model configuration based on model ID
 */
function getReplicateModelConfig(modelId: string): ReplicateModelConfig {
  switch (modelId) {
    case 'replicate-wan-2.5-i2v':
      return {
        model: WAN_2_5_I2V_MODEL,
        buildInput: (imageData: string, options: any) => ({
          image: imageData,
          prompt: options.prompt || '',
          duration: parseDuration(options.duration || '5s'),
          resolution: '720p',
          ...(options.seed !== undefined && { seed: options.seed })
        }),
        defaultOptions: { duration: '5s', resolution: '720p' }
      };

    case 'replicate-wan-2.5-i2v-fast':
      return {
        model: WAN_2_5_I2V_FAST_MODEL,
        buildInput: (imageData: string, options: any) => ({
          image: imageData,
          prompt: options.prompt || '',
          duration: parseDuration(options.duration || '5s'),
          resolution: '720p',
          ...(options.seed !== undefined && { seed: options.seed })
        }),
        defaultOptions: { duration: '5s', resolution: '720p' }
      };

    case 'replicate-veo-3.1':
      return {
        model: VEO_3_1_MODEL,
        buildInput: (imageData: string, options: any) => ({
          prompt: options.prompt || '',
          image: imageData, // For I2V mode
          ...(options.seed !== undefined && { seed: options.seed })
        }),
        defaultOptions: {}
      };

    case 'replicate-veo-3.1-fast':
      return {
        model: VEO_3_1_FAST_MODEL,
        buildInput: (imageData: string, options: any) => ({
          prompt: options.prompt || '',
          image: imageData, // For I2V mode
          ...(options.seed !== undefined && { seed: options.seed })
        }),
        defaultOptions: {}
      };

    case 'replicate-veo-3':
      return {
        model: VEO_3_MODEL,
        buildInput: (imageData: string, options: any) => ({
          prompt: options.prompt || '',
          image: imageData, // For I2V mode
          ...(options.seed !== undefined && { seed: options.seed })
        }),
        defaultOptions: {}
      };

    case 'replicate-veo-3-fast':
      return {
        model: VEO_3_FAST_MODEL,
        buildInput: (imageData: string, options: any) => ({
          prompt: options.prompt || '',
          image: imageData, // For I2V mode
          ...(options.seed !== undefined && { seed: options.seed })
        }),
        defaultOptions: {}
      };

    default:
      throw new Error(`Unknown Replicate model: ${modelId}`);
  }
}

/**
 * Create a prediction (start video generation)
 */
export async function createReplicatePrediction(
  imageData: string,
  modelId: string = 'replicate-svd',
  options: any = {}
): Promise<ReplicatePrediction> {
  
  const apiKey = getApiKey('REPLICATE_API_KEY');
  if (!apiKey) {
    throw new Error('REPLICATE_API_KEY is not set. Please configure your API keys.');
  }

  // Get model configuration
  const modelConfig = getReplicateModelConfig(modelId);
  
  // Merge options with defaults
  const finalOptions = { ...modelConfig.defaultOptions, ...options };

  // Determine endpoint and request body based on whether we're using version or model path
  let endpoint: string;
  let requestBody: any;

  if (modelConfig.model) {
    // New approach: Use model path (automatically uses latest version)
    endpoint = `${REPLICATE_API_BASE}/models/${modelConfig.model}/predictions`;
    requestBody = {
      input: modelConfig.buildInput(imageData, finalOptions)
    };
  } else if (modelConfig.version) {
    // Old approach: Use specific version
    endpoint = `${REPLICATE_API_BASE}/predictions`;
    requestBody = {
      version: modelConfig.version,
      input: modelConfig.buildInput(imageData, finalOptions)
    };
  } else {
    throw new Error(`Model configuration for ${modelId} must specify either 'model' or 'version'`);
  }

  console.log('🎬 Replicate API Request:', {
    endpoint,
    model: modelId,
    modelPath: modelConfig.model || `version: ${modelConfig.version}`,
    options: finalOptions
  });

  const url = getCorsProxiedUrl(endpoint);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${apiKey}`,
    },
    body: JSON.stringify(requestBody)
  });

  console.log('📡 Replicate Response Status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    let errorData: any = {};
    
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }

    console.error('❌ Replicate API Error:', errorData);
    throw new Error(
      `Replicate API error (${response.status}): ${errorData.detail || errorData.message || response.statusText}`
    );
  }

  const prediction: ReplicatePrediction = await response.json();
  console.log('✅ Replicate Prediction Created:', prediction.id);
  
  return prediction;
}

/**
 * Poll prediction until completion
 */
export async function pollReplicatePrediction(predictionId: string): Promise<ReplicatePrediction> {
  const apiKey = getApiKey('REPLICATE_API_KEY');
  if (!apiKey) {
    console.error('❌ [DEBUG] REPLICATE_API_KEY not configured for polling');
    throw new Error('REPLICATE_API_KEY is not set. Please configure your API keys.');
  }

  let attempts = 0;
  const startTime = Date.now();

  console.log('⏳ [DEBUG] Starting polling for Replicate prediction:', predictionId);
  console.log('⏳ [DEBUG] Max attempts:', MAX_POLL_ATTEMPTS, 'Poll interval:', POLL_INTERVAL_MS + 'ms');

  while (attempts < MAX_POLL_ATTEMPTS) {
    // Wait before polling (except first attempt)
    if (attempts > 0) {
      console.log(`⏳ [DEBUG] Waiting ${POLL_INTERVAL_MS}ms before next poll attempt...`);
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    const elapsedTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`🔄 [DEBUG] Poll attempt ${attempts + 1}/${MAX_POLL_ATTEMPTS} (elapsed: ${elapsedTime}s)`);

    const url = getCorsProxiedUrl(`${REPLICATE_API_BASE}/predictions/${predictionId}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`,
      }
    });

    console.log(`🔄 [DEBUG] Poll response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [DEBUG] Poll request failed:', response.status, errorText);
      throw new Error(`Failed to poll Replicate prediction: ${response.status} ${response.statusText}`);
    }

    const prediction: ReplicatePrediction = await response.json();
    
    console.log(`🔄 [DEBUG] Prediction status: ${prediction.status}`);
    if (prediction.status !== 'starting' && prediction.status !== 'processing') {
      console.log(`🔄 [DEBUG] Prediction details:`, {
        status: prediction.status,
        error: prediction.error,
        hasOutput: !!prediction.output,
        metrics: prediction.metrics
      });
    }

    if (prediction.status === 'succeeded') {
      const totalTime = Math.round((Date.now() - startTime) / 1000);
      console.log('✅ [DEBUG] Replicate prediction succeeded!');
      console.log(`⏱️ [DEBUG] Total time: ${totalTime}s`);
      if (prediction.metrics?.predict_time) {
        console.log(`⏱️ [DEBUG] Prediction time: ${prediction.metrics.predict_time.toFixed(2)}s`);
      }
      return prediction;
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      const error = prediction.error || 'Unknown error';
      console.error('❌ [DEBUG] Replicate prediction failed:', error);
      console.error('❌ [DEBUG] Final prediction state:', prediction);
      throw new Error(`Replicate generation failed: ${error}`);
    }

    attempts++;
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  console.error(`❌ [DEBUG] Replicate polling timed out after ${MAX_POLL_ATTEMPTS} attempts (${totalTime}s)`);
  throw new Error(`Replicate generation timed out after ${totalTime}s`);
}

/**
 * Create prediction and wait for completion (convenience function)
 */
export async function generateReplicateVideo(
  imageData: string,
  modelId: string = 'replicate-svd',
  options: any = {}
): Promise<string> {
  
  // Create prediction
  const prediction = await createReplicatePrediction(imageData, modelId, options);
  
  // Poll until complete
  const completedPrediction = await pollReplicatePrediction(prediction.id);
  
  // Get video URL from output
  let videoUrl: string | undefined;
  
  if (typeof completedPrediction.output === 'string') {
    videoUrl = completedPrediction.output;
  } else if (Array.isArray(completedPrediction.output) && completedPrediction.output.length > 0) {
    videoUrl = completedPrediction.output[0];
  }
  
  if (!videoUrl) {
    throw new Error('Replicate prediction succeeded but returned no video URL');
  }
  
  console.log('📥 Video URL:', videoUrl);
  return videoUrl;
}

/**
 * Fetch video blob from URL
 */
export async function fetchReplicateVideoBlob(videoUrl: string): Promise<Blob> {
  const url = getCorsProxiedUrl(videoUrl);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Replicate video: ${response.statusText}`);
  }

  return await response.blob();
}

/**
 * Generate image from text using FLUX Schnell (cheapest/free option on Replicate)
 */
async function generateImageWithFlux(prompt: string): Promise<string> {
  const apiKey = getApiKey('REPLICATE_API_KEY');
  if (!apiKey) {
    console.error('❌ REPLICATE_API_KEY not configured');
    throw new Error('REPLICATE_API_KEY is not set. Please configure your API keys.');
  }

  console.log('🎨 [DEBUG] Starting FLUX image generation...');
  console.log('🎨 [DEBUG] Prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));

  const requestBody = {
    version: FLUX_SCHNELL_VERSION,
    input: {
      prompt: prompt,
      go_fast: true,
      num_outputs: 1,
      aspect_ratio: '16:9',
      output_format: 'png',
      output_quality: 80
    }
  };

  console.log('🎨 [DEBUG] Sending request to Replicate API...');
  const url = getCorsProxiedUrl(`${REPLICATE_API_BASE}/predictions`);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${apiKey}`,
    },
    body: JSON.stringify(requestBody)
  });

  console.log('🎨 [DEBUG] Replicate API response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ [DEBUG] FLUX API error:', response.status, errorText);
    throw new Error(`FLUX image generation failed: ${response.status} ${errorText}`);
  }

  const prediction: ReplicatePrediction = await response.json();
  console.log('⏳ [DEBUG] FLUX prediction created with ID:', prediction.id);
  console.log('⏳ [DEBUG] Initial prediction status:', prediction.status);

  // Poll for completion
  const completedPrediction = await pollReplicatePrediction(prediction.id);

  // Get image URL
  let imageUrl: string | undefined;
  if (typeof completedPrediction.output === 'string') {
    imageUrl = completedPrediction.output;
  } else if (Array.isArray(completedPrediction.output) && completedPrediction.output.length > 0) {
    imageUrl = completedPrediction.output[0];
  }

  if (!imageUrl) {
    console.error('❌ [DEBUG] FLUX generation succeeded but no image URL returned');
    throw new Error('FLUX image generation succeeded but returned no image URL');
  }

  console.log('✅ [DEBUG] FLUX image generated, URL:', imageUrl);
  
  // Fetch the image and convert to data URL
  console.log('📥 [DEBUG] Fetching FLUX image from URL...');
  const url = getCorsProxiedUrl(imageUrl);
  const imageResponse = await fetch(url);
  console.log('📥 [DEBUG] Image fetch response status:', imageResponse.status);

  if (!imageResponse.ok) {
    console.error('❌ [DEBUG] Failed to fetch FLUX image:', imageResponse.statusText);
    throw new Error(`Failed to fetch FLUX image: ${imageResponse.statusText}`);
  }
  
  const imageBlob = await imageResponse.blob();
  console.log('📥 [DEBUG] Image blob size:', imageBlob.size, 'bytes');
  console.log('🔄 [DEBUG] Converting blob to base64 data URL...');
  const reader = new FileReader();
  
  return new Promise((resolve, reject) => {
    reader.onloadend = () => {
      console.log('✅ [DEBUG] FLUX image generation completed successfully');
      resolve(reader.result as string);
    };
    reader.onerror = (error) => {
      console.error('❌ [DEBUG] FileReader error during base64 conversion:', error);
      reject(error);
    };
    reader.readAsDataURL(imageBlob);
  });
}

/**
 * Generate video from text prompt (text-to-video via image generation + model)
 * Supports Flux Schnell (free) or Gemini Imagen 3 for image generation
 */
export async function generateReplicateVideoFromText(
  prompt: string,
  modelId: string = 'replicate-svd',
  options: any = {},
  imageModel: 'flux-schnell' | 'gemini-imagen-3' = 'flux-schnell'
): Promise<string> {

  console.log(`📝 Starting text-to-video with Replicate (${imageModel} + ${modelId})...`);

  // Step 1: Generate image from text using selected image model
  console.log(`🎨 Generating initial image from text prompt with ${imageModel}...`);
  
  let imageData: string;
  
  if (imageModel === 'gemini-imagen-3') {
    // Use Gemini Imagen 3 (Nano Banana)
    try {
      const { generateGeminiImage } = await import('./geminiImageService');
      imageData = await generateGeminiImage(prompt, {
        aspectRatio: '16:9',
        style: 'photographic',
        quality: 'high'
      });
      console.log('✅ Image generated with Gemini Imagen 3 (Nano Banana)');
    } catch (geminiError) {
      console.warn('⚠️ Gemini failed, falling back to FLUX...', geminiError);
      imageData = await generateImageWithFlux(prompt);
      console.log('✅ Image generated with FLUX Schnell (fallback)');
    }
  } else {
    // Use FLUX Schnell (default)
    try {
      imageData = await generateImageWithFlux(prompt);
      console.log('✅ Image generated with FLUX Schnell');
    } catch (fluxError) {
      console.warn('⚠️ FLUX failed, trying Gemini...', fluxError);
      
      try {
        // Fallback to Gemini if available
        const { generateGeminiImage, isGeminiAvailable } = await import('./geminiImageService');
        if (isGeminiAvailable()) {
          imageData = await generateGeminiImage(prompt, {
            aspectRatio: '16:9',
            style: 'photographic',
            quality: 'high'
          });
          console.log('✅ Image generated with Gemini (fallback)');
        } else {
          throw new Error('Gemini not available');
        }
      } catch (geminiError) {
        console.warn('⚠️ Gemini also failed, trying Stability AI...', geminiError);
        
        try {
          // Fallback to Stability AI
          const { generateStableImage } = await import('./stableImageService');
          imageData = await generateStableImage(prompt, {
            aspectRatio: '16:9',
            model: 'core',
            negativePrompt: 'blurry, low quality, distorted, ugly'
          });
          console.log('✅ Image generated with Stability AI');
        } catch (stabilityError) {
          console.warn('⚠️ Stability AI also failed, using placeholder...', stabilityError);
          
          // Last resort: Create a placeholder image
          const { generatePlaceholderImage } = await import('./placeholderImageService');
          imageData = await generatePlaceholderImage(prompt, {
            aspectRatio: '16:9',
            width: 640,
            height: 360
          });
          console.log('✅ Placeholder image created as fallback');
        }
      }
    }
  }

  console.log(`✅ Image ready, now animating with ${modelId}...`);

  // Step 2: Generate video from the image
  return await generateReplicateVideo(imageData, modelId, options);
}

/**
 * Generate just the image for preview (used in initial image preview step)
 */
export async function generateImageForPreview(
  prompt: string,
  imageModel: 'flux-schnell' | 'gemini-imagen-3' = 'flux-schnell'
): Promise<string> {
  if (imageModel === 'gemini-imagen-3') {
    // Use Gemini Imagen 3
    const { generateGeminiImage } = await import('./geminiImageService');
    return await generateGeminiImage(prompt, {
      aspectRatio: '16:9',
      style: 'photographic',
      quality: 'high'
    });
  } else {
    // Use Flux Schnell (default)
    return await generateImageWithFlux(prompt);
  }
}

/**
 * Generate video and return blob (full workflow)
 */
export async function generateAndFetchReplicateVideo(
  imageData: string,
  modelId: string = 'replicate-svd',
  options: any = {}
): Promise<Blob> {
  const videoUrl = await generateReplicateVideo(imageData, modelId, options);
  return await fetchReplicateVideoBlob(videoUrl);
}

/**
 * Generate video from text and return blob (text-to-video workflow)
 */
export async function generateAndFetchReplicateVideoFromText(
  prompt: string,
  modelId: string = 'replicate-svd',
  options: any = {},
  imageModel: 'flux-schnell' | 'gemini-imagen-3' = 'flux-schnell'
): Promise<Blob> {
  const videoUrl = await generateReplicateVideoFromText(prompt, modelId, options, imageModel);
  return await fetchReplicateVideoBlob(videoUrl);
}

