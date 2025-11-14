/**
 * Gemini Text Service
 * Uses Gemini API for text generation (e.g., random creative prompts)
 */

import {
  buildFreeformGeminiInstruction,
  getNextBlueprint,
  getRecentCharacterNames,
  registerGeneratedPrompt,
  renderPromptFromBlueprint,
  shouldRejectGeneratedPrompt,
} from '../utils/randomPromptBlueprint';
import { getApiKey } from '../utils/apiKeys';
import { LLMModel } from '../types';
import { DEFAULT_LLM_MODEL } from '../config/llmModelMetadata';

// Gemini API configuration
const GEMINI_API_VERSION = 'v1beta';
const GEMINI_API_BASE = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}`;
const DEFAULT_GEMINI_TEXT_MODELS: readonly LLMModel[] = [
  'gemini-2.0-flash', // Try 2.0 first - may not have thinking token issues
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-pro'
] as const;
const FALLBACK_LLM_MODEL: LLMModel = DEFAULT_LLM_MODEL;

const buildModelCandidates = (preferredModel?: LLMModel): string[] => {
  const envModel = process.env.GEMINI_TEXT_MODEL?.trim();
  return [
    preferredModel,
    envModel,
    ...DEFAULT_GEMINI_TEXT_MODELS
  ]
    .filter((modelId): modelId is string => Boolean(modelId))
    .filter((modelId, index, list) => list.indexOf(modelId) === index);
};

// API timeout configuration
const API_TIMEOUT_MS = 10000; // 10 second timeout
const HTTP_STATUS_NOT_FOUND = 404;
const MAX_PROMPT_OUTPUT_TOKENS = 240;

class GeminiModelNotFoundError extends Error {
  public readonly modelId: string;

  constructor(modelId: string, message: string) {
    super(message);
    this.name = 'GeminiModelNotFoundError';
    this.modelId = modelId;
  }
}

interface GeminiTextRequest {
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

interface GeminiTextResponse {
  candidates: Array<{
    content?: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason?: string;
  }>;
}

/**
 * Generate a random creative story prompt using Gemini
 */
export async function getRandomPrompt(preferredModel?: LLMModel): Promise<string> {
  const apiKey = getApiKey('GEMINI_API_KEY');
  const modelCandidates = buildModelCandidates(preferredModel ?? FALLBACK_LLM_MODEL);
  const notFoundErrors: GeminiModelNotFoundError[] = [];
  let lastError: Error | null = null;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  // Get recent character names to avoid repetition
  const recentNames = getRecentCharacterNames();
  
  // Add a variety seed to make each request unique
  const varietySeed = Math.floor(Math.random() * 1000000);
  let systemPrompt = buildFreeformGeminiInstruction(recentNames);
  systemPrompt += ` [Variety seed: ${varietySeed}]`;

  const produceFallbackPrompt = () => {
    const fallbackBlueprint = getNextBlueprint();
    const fallbackPrompt = renderPromptFromBlueprint(fallbackBlueprint);
    registerGeneratedPrompt(fallbackPrompt);
    return fallbackPrompt;
  };

  const requestBody: GeminiTextRequest = {
    contents: [
      {
        parts: [
          {
            text: systemPrompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 1.5, // Maximum creativity for variety
      topK: 80,
      topP: 0.99,
      maxOutputTokens: MAX_PROMPT_OUTPUT_TOKENS // Encourage concise responses
    }
  };

  console.log('🎲 Generating random prompt with Gemini...');

  for (const modelId of modelCandidates) {
    try {
      const response = await invokeGemini(apiKey, modelId, requestBody);
      console.log(`✅ Generated random prompt with Gemini model ${modelId}:`, response);
      if (shouldRejectGeneratedPrompt(response)) {
        console.warn('Gemini prompt rejected due to repetition or banned terms. Using fallback blueprint.');
        return produceFallbackPrompt();
      }
      registerGeneratedPrompt(response);
      return response;
    } catch (error) {
      if (error instanceof GeminiModelNotFoundError) {
        notFoundErrors.push(error);
        continue;
      }
      const typedError = error instanceof Error ? error : new Error(String(error));
      if (typedError.message.includes('MAX_TOKENS')) {
        console.warn('⚠️ Gemini hit MAX_TOKENS while generating a random prompt. Using fallback blueprint instead.');
        return produceFallbackPrompt();
      }
      lastError = typedError;
      break;
    }
  }

  if (notFoundErrors.length > 0) {
    const attemptedModels = notFoundErrors.map((error) => error.modelId).join(', ');
    console.warn(
      `Gemini API could not find any of the requested models: ${attemptedModels}. ` +
      'Falling back to curated adventure prompt.'
    );
  }

  if (lastError) {
    console.warn('Gemini prompt generation failed, using fallback blueprint.', lastError);
  }

  return produceFallbackPrompt();
}

/**
 * Expand an existing prompt to make it more detailed and robust
 */
export async function expandPrompt(existingPrompt: string, preferredModel?: LLMModel): Promise<string> {
  const apiKey = getApiKey('GEMINI_API_KEY');
  const modelCandidates = buildModelCandidates(preferredModel ?? FALLBACK_LLM_MODEL);
  const notFoundErrors: GeminiModelNotFoundError[] = [];
  let lastError: Error | null = null;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  const systemPrompt = `You are a creative writing assistant helping to expand and enhance visual storytelling prompts. 
The user has written: "${existingPrompt}"

Your task is to expand this prompt into a more detailed, vivid, and cinematically rich description suitable for AI video generation. 

Guidelines:
- Keep the core concept and intent of the original prompt
- Add more sensory details, atmosphere, mood, and visual elements
- Include camera angles, lighting, movement, or cinematic details where appropriate
- Make it more specific and descriptive while maintaining coherence
- Keep it CONCISE - aim for 2-3 sentences, similar in length to the original but with richer detail
- Write in a flowing narrative style, not as a list
- Do NOT add quotes around your response

Respond with ONLY the expanded prompt, nothing else.`;

  const requestBody: GeminiTextRequest = {
    contents: [
      {
        parts: [
          {
            text: systemPrompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.8, // Moderate creativity
      topK: 40,
      topP: 0.9,
      maxOutputTokens: MAX_PROMPT_OUTPUT_TOKENS // Keep it concise like random prompts
    }
  };

  console.log('✨ Expanding prompt with Gemini...');

  for (const modelId of modelCandidates) {
    try {
      const response = await invokeGemini(apiKey, modelId, requestBody);
      console.log(`✅ Expanded prompt with Gemini model ${modelId}:`, response);
      return response;
    } catch (error) {
      if (error instanceof GeminiModelNotFoundError) {
        notFoundErrors.push(error);
        continue;
      }
      lastError = error instanceof Error ? error : new Error(String(error));
      break;
    }
  }

  if (notFoundErrors.length > 0) {
    const attemptedModels = notFoundErrors.map((error) => error.modelId).join(', ');
    throw new Error(
      `Gemini API could not find any of the requested models: ${attemptedModels}`
    );
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Failed to expand prompt with Gemini');
}

/**
 * Check if Gemini Text API is available
 */
export function isGeminiTextAvailable(): boolean {
  return !!getApiKey('GEMINI_API_KEY');
}

async function invokeGemini(
  apiKey: string,
  modelId: string,
  requestBody: GeminiTextRequest
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    const errorData = !response.ok ? await response.json().catch(() => ({})) : null;

    if (response.status === HTTP_STATUS_NOT_FOUND) {
      throw new GeminiModelNotFoundError(
        modelId,
        `Gemini API error: ${response.status} - ${errorData?.error?.message || response.statusText}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `Gemini API error: ${response.status} - ${errorData?.error?.message || response.statusText}`
      );
    }

    const result: GeminiTextResponse = await response.json();

    if (!result.candidates || result.candidates.length === 0) {
      throw new Error('Gemini failed to generate a random prompt.');
    }

    const candidate = result.candidates[0];
    const hasContent = candidate.content && candidate.content.parts && candidate.content.parts.length > 0;
    const rawText = hasContent ? candidate.content!.parts[0].text ?? '' : '';
    let generatedText = rawText.trim();

    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      if (generatedText.length > 0) {
        console.warn(
          `⚠️ Gemini generation finished with ${candidate.finishReason}, using partial text output.`,
        );
      } else {
        throw new Error(
          `Gemini generation stopped due to: ${candidate.finishReason}. Try adjusting the prompt or token limits.`,
        );
      }
    }

    if (!generatedText) {
      throw new Error('Gemini response has no text content.');
    }

    // Clean up the text - remove quotes if wrapped
    let cleanedText = generatedText;
    if (cleanedText.startsWith('"') && cleanedText.endsWith('"')) {
      cleanedText = cleanedText.slice(1, -1);
    }
    if (cleanedText.startsWith("'") && cleanedText.endsWith("'")) {
      cleanedText = cleanedText.slice(1, -1);
    }

    return cleanedText;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Gemini API request timed out');
    }

    throw error;
  }
}

