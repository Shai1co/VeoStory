// services/geminiImageService.ts
import { extractBase64 } from '../utils/video';
import { getApiKey } from '../utils/apiKeys';

// Gemini API configuration
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Models that support image generation with Gemini API key
// Note: These models may require a paid API tier
const GEMINI_IMAGE_MODELS = [
  'gemini-2.0-flash-exp-image-generation',  // Experimental image generation (latest)
  'gemini-2.0-flash-preview-image-generation',  // Preview image generation
  'imagen-3.0-generate-002',  // Imagen 3 - more widely available
  'imagen-3.0-fast-generate-001',  // Imagen 3 Fast
  'imagen-3.0-generate-001',  // Imagen 3 Standard
] as const;

interface GeminiImageRequest {
  contents: Array<{
    role: 'user' | 'system' | 'model';
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig: {
    temperature: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    response_modalities?: string[];  // For image generation models
  };
}

interface GeminiImageResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
}

/**
 * Generate an image from a text prompt using Gemini/Imagen models
 * Supports Imagen 3.0 models (may require paid API tier)
 * All generated images include SynthID watermark
 * 
 * Note: If you get 404 errors, your API key may be on the free tier.
 * Use Flux Schnell (Replicate) as an alternative.
 */
export async function generateGeminiImage(
  prompt: string,
  options?: {
    aspectRatio?: '16:9' | '9:16' | '1:1';
    style?: 'photographic' | 'artistic' | 'realistic';
    quality?: 'standard' | 'high';
  }
): Promise<string> {
  console.log('🎨 [DEBUG] Starting Gemini/Imagen image generation...');
  console.log('🎨 [DEBUG] Prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
  console.log('🎨 [DEBUG] Options:', options);

  const apiKey = getApiKey('GEMINI_API_KEY');

  if (!apiKey) {
    console.error('❌ [DEBUG] GEMINI_API_KEY not configured');
    throw new Error('GEMINI_API_KEY is not set. Please configure your API keys.');
  }

  // Build the prompt with style and quality instructions
  const enhancedPrompt = buildImagePrompt(prompt, options);
  console.log('🎨 [DEBUG] Enhanced prompt length:', enhancedPrompt.length);

  const requestBody: GeminiImageRequest = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: enhancedPrompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      response_modalities: ['IMAGE', 'TEXT']  // Required for image generation models
    }
  };

  let lastError: Error | null = null;
  
  // First, try to discover available image models
  let modelsToTry: string[] = [...GEMINI_IMAGE_MODELS];
  try {
    console.log('🔍 [DEBUG] Discovering available image models...');
    const availableImageModels = await listAvailableModels();
    if (availableImageModels.length > 0) {
      console.log('✅ [DEBUG] Found available image models:', availableImageModels);
      // Prefer discovered models, fallback to hardcoded list, remove duplicates
      const combined = [...availableImageModels, ...GEMINI_IMAGE_MODELS];
      modelsToTry = Array.from(new Set(combined));
    } else {
      console.log('⚠️ [DEBUG] No image models discovered, using fallback list');
    }
  } catch (error) {
    console.warn('⚠️ [DEBUG] Could not discover models, using fallback list:', error);
  }
  
  console.log('🎨 [DEBUG] Models to try (deduplicated):', modelsToTry);

  // Try models in order of preference
  for (const modelName of modelsToTry) {
    try {
      console.log(`🎨 [DEBUG] Trying model: ${modelName}`);

      const response = await fetch(`${GEMINI_API_BASE}/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log(`🎨 [DEBUG] ${modelName} API response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = `${response.status} - ${errorData.error?.message || response.statusText}`;

        // If model not found or not available, try next one
        if (response.status === 404 || response.status === 403) {
          console.warn(`⚠️ [DEBUG] Model ${modelName} not available (${response.status}), trying next...`);
          lastError = new Error(errorMsg);
          continue;
        }

        console.error(`❌ [DEBUG] ${modelName} API error:`, errorMsg);
        throw new Error(`Gemini Image error: ${errorMsg}`);
      }

      const result: GeminiImageResponse = await response.json();
      console.log(`🎨 [DEBUG] ${modelName} response received, candidates:`, result.candidates?.length || 0);

      if (!result.candidates || result.candidates.length === 0) {
        console.error(`❌ [DEBUG] ${modelName} returned no candidates`);
        throw new Error('Gemini image generation failed to return a result.');
      }

      const candidate = result.candidates[0];
      console.log(`🎨 [DEBUG] ${modelName} candidate parts:`, candidate.content.parts?.length || 0);

      if (!candidate.content.parts || candidate.content.parts.length === 0) {
        console.error(`❌ [DEBUG] ${modelName} returned no content parts`);
        throw new Error('Gemini image generation failed to return image data.');
      }

      // Look for inline data (base64 image)
      // Log the full structure to understand what we're getting
      console.log(`🔍 [DEBUG] ${modelName} full parts structure:`, JSON.stringify(candidate.content.parts, null, 2));
      
      const imagePart = candidate.content.parts.find(part => part.inlineData);
      if (!imagePart?.inlineData) {
        console.error(`❌ [DEBUG] ${modelName} returned no inline data`);
        console.error(`❌ [DEBUG] Available parts:`, candidate.content.parts);
        
        // Try to find image in alternative formats
        const partWithImage = candidate.content.parts.find(part => 
          part && typeof part === 'object' && ('inlineData' in part || 'image' in part || 'imageData' in part)
        );
        
        if (partWithImage) {
          console.log('🔍 [DEBUG] Found alternative image format:', partWithImage);
        }
        
        // If model returns text description instead of image, skip to next model
        const hasOnlyText = candidate.content.parts.every(part => part.text && !part.inlineData);
        if (hasOnlyText) {
          console.warn(`⚠️ [DEBUG] ${modelName} returned only text, trying next model...`);
          lastError = new Error('Model returned text instead of image');
          continue;
        }
        
        throw new Error('Gemini did not return image data in the expected format.');
      }

      const { mimeType, data } = imagePart.inlineData;
      console.log(`✅ [DEBUG] ${modelName} image generated successfully, type: ${mimeType}, data size: ${data.length} chars`);

      // Return as data URL
      const dataUrl = `data:${mimeType};base64,${data}`;
      console.log('🎨 [DEBUG] Gemini image generation completed');
      return dataUrl;

    } catch (error) {
      console.warn(`⚠️ [DEBUG] Failed with ${modelName}:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      // Try next model
      continue;
    }
  }

  // All models failed
  console.error('❌ [DEBUG] All Gemini/Imagen models failed');
  
  // Provide helpful error message based on the last error
  const errorMessage = lastError?.message || '';
  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    throw new Error(
      'No Imagen models are accessible with your API key. This could be due to:\n' +
      '• Regional restrictions (some models only available in certain regions)\n' +
      '• Early access requirements (some models need whitelisting)\n' +
      '• API tier limitations\n\n' +
      'Try using Flux Schnell (Replicate) instead, or check https://aistudio.google.com for model availability in your region.'
    );
  }
  
  throw lastError || new Error('Failed to generate image with all available Gemini/Imagen models');
}

/**
 * Build enhanced prompt for image generation
 */
function buildImagePrompt(
  prompt: string, 
  options?: {
    aspectRatio?: '16:9' | '9:16' | '1:1';
    style?: 'photographic' | 'artistic' | 'realistic';
    quality?: 'standard' | 'high';
  }
): string {
  let enhancedPrompt = prompt;

  // Add aspect ratio instruction
  if (options?.aspectRatio) {
    const ratioMap = {
      '16:9': 'wide cinematic aspect ratio (16:9)',
      '9:16': 'vertical mobile aspect ratio (9:16)', 
      '1:1': 'square aspect ratio (1:1)'
    };
    enhancedPrompt += `, ${ratioMap[options.aspectRatio]}`;
  }

  // Add style instruction
  if (options?.style) {
    const styleMap = {
      'photographic': 'photographic style, realistic, high detail',
      'artistic': 'artistic style, creative, visually appealing',
      'realistic': 'realistic style, detailed, lifelike'
    };
    enhancedPrompt += `, ${styleMap[options.style]}`;
  }

  // Add quality instruction
  if (options?.quality === 'high') {
    enhancedPrompt += ', high quality, detailed, sharp focus';
  }

  // Add general quality improvements
  enhancedPrompt += ', well-lit, good composition, professional quality';

  return enhancedPrompt;
}

/**
 * Check if Gemini API key is available
 */
export function isGeminiAvailable(): boolean {
  return !!getApiKey('GEMINI_API_KEY');
}

/**
 * List all available models for the current API key
 * Useful for debugging which image generation models are accessible
 */
export async function listAvailableModels(): Promise<string[]> {
  const apiKey = getApiKey('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const models = result.models || [];
    
    console.log('📋 Available Gemini models:', models.map((m: any) => m.name));
    
    // Return model names that support image generation
    return models
      .filter((m: any) => {
        const name = m.name.replace('models/', '');
        return name.includes('imagen') || name.includes('image');
      })
      .map((m: any) => m.name.replace('models/', ''));
  } catch (error) {
    console.error('Failed to list models:', error);
    throw error;
  }
}
