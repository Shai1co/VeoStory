// services/geminiImageService.ts
import { extractBase64 } from '../utils/video';

// Gemini API configuration
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-1.5-flash'; // Cheapest model for image generation

interface GeminiImageRequest {
  contents: Array<{
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
 * Generate an image from a text prompt using Gemini 1.5 Flash
 * This is the cheapest Gemini model for image generation
 */
export async function generateGeminiImage(
  prompt: string,
  options?: {
    aspectRatio?: '16:9' | '9:16' | '1:1';
    style?: 'photographic' | 'artistic' | 'realistic';
    quality?: 'standard' | 'high';
  }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  // Build the prompt with style and quality instructions
  const enhancedPrompt = buildImagePrompt(prompt, options);

  const requestBody: GeminiImageRequest = {
    contents: [
      {
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

  console.log('🎨 Generating image with Gemini 1.5 Flash:', { prompt, options });

  const response = await fetch(`${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Gemini Image error: ${response.status} - ${errorData.error?.message || response.statusText}`
    );
  }

  const result: GeminiImageResponse = await response.json();
  
  if (!result.candidates || result.candidates.length === 0) {
    throw new Error('Gemini image generation failed to return a result.');
  }

  const candidate = result.candidates[0];
  if (!candidate.content.parts || candidate.content.parts.length === 0) {
    throw new Error('Gemini image generation failed to return image data.');
  }

  // Look for inline data (base64 image)
  const imagePart = candidate.content.parts.find(part => part.inlineData);
  if (!imagePart?.inlineData) {
    throw new Error('Gemini did not return image data in the expected format.');
  }

  const { mimeType, data } = imagePart.inlineData;
  
  // Return as data URL
  return `data:${mimeType};base64,${data}`;
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
  return !!process.env.GEMINI_API_KEY;
}
