/**
 * Gemini Text Service
 * Uses Gemini API for text generation (e.g., random creative prompts)
 */

import {
  buildFreeformGeminiInstruction,
  getNextBlueprint,
  registerGeneratedPrompt,
  renderPromptFromBlueprint,
  shouldRejectGeneratedPrompt,
} from '../utils/randomPromptBlueprint';

// Gemini API configuration
const GEMINI_API_VERSION = 'v1beta';
const GEMINI_API_BASE = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}`;
const DEFAULT_GEMINI_TEXT_MODELS = [
  'gemini-2.0-flash', // Try 2.0 first - may not have thinking token issues
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-pro'
] as const;

// API timeout configuration
const API_TIMEOUT_MS = 10000; // 10 second timeout
const HTTP_STATUS_NOT_FOUND = 404;
const MAX_PROMPT_OUTPUT_TOKENS = 180;

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
export async function getRandomPrompt(): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const configuredModel = process.env.GEMINI_TEXT_MODEL?.trim();
  const modelCandidates = [
    ...(configuredModel ? [configuredModel] : []),
    ...DEFAULT_GEMINI_TEXT_MODELS
  ].filter((modelId, index, list) => modelId && list.indexOf(modelId) === index);
  const notFoundErrors: GeminiModelNotFoundError[] = [];
  let lastError: Error | null = null;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  const systemPrompt = buildFreeformGeminiInstruction();

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
      temperature: 1.0, // High creativity
      topK: 50,
      topP: 0.95,
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
      lastError = error instanceof Error ? error : new Error(String(error));
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
 * Check if Gemini Text API is available
 */
export function isGeminiTextAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
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

    // Check if the model finished due to hitting token limit or other non-success reasons
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(`Gemini generation stopped due to: ${candidate.finishReason}. Try adjusting the prompt or token limits.`);
    }

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      throw new Error('Gemini response has no text content.');
    }

    const generatedText = candidate.content.parts[0].text.trim();

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

