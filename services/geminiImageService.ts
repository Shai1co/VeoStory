// services/geminiImageService.ts
import { extractBase64 } from '../utils/video';
import { getApiKey } from '../utils/apiKeys';

// Gemini API configuration
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image',  // Imagen 3 (Nano Banana) - best quality
  'gemini-2.0-flash-image'   // Fallback image-capable model
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
    topK: number;
    topP: number;
    maxOutputTokens: number;
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
 * Generate an image from a text prompt using Gemini Imagen 3 (Nano Banana)
 * Tries multiple models in order of preference for best quality
 */
export async function generateGeminiImage(
  prompt: string,
  options?: {
    aspectRatio?: '16:9' | '9:16' | '1:1';
    style?: 'photographic' | 'artistic' | 'realistic';
    quality?: 'standard' | 'high';
  }
): Promise<string> {
  console.log('🎨 [DEBUG] Starting Gemini image generation...');
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
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024
    }
  };

  let lastError: Error | null = null;
  console.log('🎨 [DEBUG] Available models to try:', GEMINI_IMAGE_MODELS);

  // Try models in order of preference
  for (const modelName of GEMINI_IMAGE_MODELS) {
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

        // If model not found, try next one
        if (response.status === 404) {
          console.warn(`⚠️ [DEBUG] Model ${modelName} not found, trying next...`);
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
      const imagePart = candidate.content.parts.find(part => part.inlineData);
      if (!imagePart?.inlineData) {
        console.error(`❌ [DEBUG] ${modelName} returned no inline data`);
        console.error(`❌ [DEBUG] Available parts:`, candidate.content.parts);
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
  console.error('❌ [DEBUG] All Gemini models failed');
  throw lastError || new Error('Failed to generate image with all available Gemini models');
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
