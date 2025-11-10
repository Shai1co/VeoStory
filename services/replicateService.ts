/**
 * Replicate - Stable Video Diffusion Service
 * Uses Replicate's API to run Stable Video Diffusion model
 */

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
// Use proxied endpoint in development to avoid CORS issues
// In production, you would need a proper backend to handle this
const REPLICATE_API_BASE = '/replicate/v1';
const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 180; // 6 minutes max

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

/**
 * Model configuration interface
 */
interface ReplicateModelConfig {
  version: string;
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
    case 'replicate-svd':
      return {
        version: SVD_MODEL_VERSION,
        buildInput: (imageData: string, options: any) => ({
          input_image: imageData,
          frames: options.frames || 25,
          motion_bucket_id: options.motionStrength || 127,
          cond_aug: 0.02,
          decoding_t: 7,
          ...(options.seed !== undefined && { seed: options.seed })
        }),
        defaultOptions: { frames: 25, motionStrength: 127 }
      };

    case 'replicate-animatediff':
      return {
        version: ANIMATEDIFF_VERSION,
        buildInput: (imageData: string, options: any) => ({
          image: imageData,
          motion_module: 'v3_sd15_mm',
          steps: options.steps || 25,
          guidance_scale: options.guidanceScale || 7.5,
          ...(options.seed !== undefined && { seed: options.seed })
        }),
        defaultOptions: { steps: 25, guidanceScale: 7.5 }
      };

    case 'replicate-hotshot':
      return {
        version: HOTSHOT_VERSION,
        buildInput: (imageData: string, options: any) => ({
          image: imageData,
          fps: options.fps || 8,
          output_format: 'mp4',
          ...(options.seed !== undefined && { seed: options.seed })
        }),
        defaultOptions: { fps: 8 }
      };

    case 'replicate-hailuo-02':
      return {
        version: HAILUO_02_VERSION,
        buildInput: (imageData: string, options: any) => ({
          prompt: options.prompt || '',
          last_frame_image: imageData, // For I2V mode
          resolution: '768p', // Standard quality (lowest)
          duration: parseDuration(options.duration || '6s'), // 6s or 10s
          ...(options.seed !== undefined && { seed: options.seed })
        }),
        defaultOptions: { resolution: '768p', duration: '6s' }
      };

    case 'replicate-seedance-lite':
      return {
        version: SEEDANCE_LITE_VERSION,
        buildInput: (imageData: string, options: any) => ({
          prompt: options.prompt || '',
          image: imageData, // For I2V mode
          resolution: '480p', // Lowest resolution
          duration: parseDuration(options.duration || '5s'), // 5s or 10s
          ...(options.seed !== undefined && { seed: options.seed })
        }),
        defaultOptions: { resolution: '480p', duration: '5s' }
      };

    case 'replicate-seedance-pro-fast':
      return {
        version: SEEDANCE_PRO_FAST_VERSION,
        buildInput: (imageData: string, options: any) => ({
          prompt: options.prompt || '',
          image: imageData,
          resolution: '720p', // Lower resolution for fast variant
          duration: parseDuration(options.duration || '5s'),
          ...(options.seed !== undefined && { seed: options.seed })
        }),
        defaultOptions: { resolution: '720p', duration: '5s' }
      };

    case 'replicate-seedance-pro':
      return {
        version: SEEDANCE_PRO_VERSION,
        buildInput: (imageData: string, options: any) => ({
          prompt: options.prompt || '',
          image: imageData,
          resolution: '720p', // Lowest available for pro
          duration: parseDuration(options.duration || '5s'),
          ...(options.seed !== undefined && { seed: options.seed })
        }),
        defaultOptions: { resolution: '720p', duration: '5s' }
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
  
  // Note: API key is injected via Vite proxy, so we don't send it from the browser
  // This keeps the key secure and avoids CORS issues

  // Get model configuration
  const modelConfig = getReplicateModelConfig(modelId);
  
  // Merge options with defaults
  const finalOptions = { ...modelConfig.defaultOptions, ...options };

  const requestBody: ReplicateCreateRequest = {
    version: modelConfig.version,
    input: modelConfig.buildInput(imageData, finalOptions)
  };

  console.log('🎬 Replicate API Request:', {
    endpoint: `${REPLICATE_API_BASE}/predictions`,
    model: modelId,
    options: finalOptions
  });

  const response = await fetch(`${REPLICATE_API_BASE}/predictions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Authorization header is added by Vite proxy in development
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
  // Note: API key is injected via Vite proxy, so we don't send it from the browser

  let attempts = 0;

  console.log('⏳ Polling Replicate prediction:', predictionId);

  while (attempts < MAX_POLL_ATTEMPTS) {
    // Wait before polling
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    const response = await fetch(`${REPLICATE_API_BASE}/predictions/${predictionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
        // Authorization header is added by Vite proxy in development
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Poll failed:', response.status, errorText);
      throw new Error(`Failed to poll Replicate prediction: ${response.status} ${response.statusText}`);
    }

    const prediction: ReplicatePrediction = await response.json();
    
    console.log(`🔄 Polling (attempt ${attempts + 1}/${MAX_POLL_ATTEMPTS}):`, prediction.status);

    if (prediction.status === 'succeeded') {
      console.log('✅ Replicate prediction succeeded!');
      if (prediction.metrics?.predict_time) {
        console.log(`⏱️  Generation time: ${prediction.metrics.predict_time.toFixed(2)}s`);
      }
      return prediction;
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      const error = prediction.error || 'Unknown error';
      console.error('❌ Replicate prediction failed:', error);
      throw new Error(`Replicate video generation failed: ${error}`);
    }

    attempts++;
  }

  throw new Error('Replicate video generation timed out after 6 minutes');
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
  const response = await fetch(videoUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Replicate video: ${response.statusText}`);
  }

  return await response.blob();
}

/**
 * Generate image from text using FLUX Schnell (cheapest/free option on Replicate)
 */
async function generateImageWithFlux(prompt: string): Promise<string> {
  console.log('🎨 Generating image with FLUX Schnell (free)...');

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

  const response = await fetch(`${REPLICATE_API_BASE}/predictions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FLUX image generation failed: ${response.status} ${errorText}`);
  }

  const prediction: ReplicatePrediction = await response.json();
  console.log('⏳ FLUX prediction created:', prediction.id);

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
    throw new Error('FLUX image generation succeeded but returned no image URL');
  }

  console.log('✅ FLUX image generated:', imageUrl);
  
  // Fetch the image and convert to data URL
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch FLUX image: ${imageResponse.statusText}`);
  }
  
  const imageBlob = await imageResponse.blob();
  const reader = new FileReader();
  
  return new Promise((resolve, reject) => {
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(imageBlob);
  });
}

/**
 * Generate video from text prompt (text-to-video via image generation + model)
 * Uses FLUX Schnell (free) for image gen + specified Replicate model for animation
 */
export async function generateReplicateVideoFromText(
  prompt: string,
  modelId: string = 'replicate-svd',
  options: any = {}
): Promise<string> {

  console.log(`📝 Starting text-to-video with Replicate (FLUX + ${modelId})...`);

  // Step 1: Generate image from text using FLUX Schnell (cheapest option)
  console.log('🎨 Generating initial image from text prompt...');
  
  let imageData: string;
  
  try {
    // Use FLUX Schnell on Replicate (free/very cheap)
    imageData = await generateImageWithFlux(prompt);
    console.log('✅ Image generated with FLUX Schnell');
  } catch (fluxError) {
    console.warn('⚠️ FLUX failed, trying Stability AI...', fluxError);
    
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

  console.log(`✅ Image ready, now animating with ${modelId}...`);

  // Step 2: Generate video from the image
  return await generateReplicateVideo(imageData, modelId, options);
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
  options: any = {}
): Promise<Blob> {
  const videoUrl = await generateReplicateVideoFromText(prompt, modelId, options);
  return await fetchReplicateVideoBlob(videoUrl);
}

