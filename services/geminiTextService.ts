/**
 * Gemini Text Service
 * Uses Gemini API for text generation (e.g., random creative prompts)
 */

// Gemini API configuration
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_TEXT_MODEL = 'gemini-1.5-flash-latest'; // Fastest text model

// API timeout configuration
const API_TIMEOUT_MS = 10000; // 10 second timeout

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
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

/**
 * Generate a random creative story prompt using Gemini
 */
export async function getRandomPrompt(): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  const systemPrompt = `Generate a single creative and engaging story prompt for a visual novel or interactive story. 
The prompt should describe a vivid opening scene with a character and setting. 
Keep it to 1-2 sentences, be specific and cinematic. 
Examples: "A lone astronaut discovering a glowing alien forest" or "A cyberpunk detective walking through rain-soaked neon streets".
Only return the prompt itself, no additional text or formatting.`;

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
      maxOutputTokens: 100 // Short prompt
    }
  };

  console.log('🎲 Generating random prompt with Gemini...');

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`,
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`
      );
    }

    const result: GeminiTextResponse = await response.json();
    
    if (!result.candidates || result.candidates.length === 0) {
      throw new Error('Gemini failed to generate a random prompt.');
    }

    const candidate = result.candidates[0];
    if (!candidate.content.parts || candidate.content.parts.length === 0) {
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

    console.log('✅ Generated random prompt:', cleanedText);
    return cleanedText;

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Gemini API request timed out');
    }
    
    throw error;
  }
}

/**
 * Check if Gemini Text API is available
 */
export function isGeminiTextAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

