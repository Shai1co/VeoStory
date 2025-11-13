/**
 * Prompt Enhancement Service
 * Uses Gemini 2.5 Flash to enhance user prompts to be more game-like and adventurous
 */

import { GoogleGenAI, Type } from "@google/genai";
import { getApiKey } from '../utils/apiKeys';

const getAIClient = () => {
  const apiKey = getApiKey('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error("Gemini API key not found. Please configure your API keys.");
  }
  return new GoogleGenAI({ apiKey });
};

interface EnhancedPromptResult {
  enhancedPrompt: string;
  mainCharacter: string;
}

/**
 * Enhances a user prompt to be more game-like and adventurous
 * - Adds dynamic movement and action
 * - Creates a main character with personality
 * - Makes scenarios more detailed and exciting
 * - Adds "juice" and adventure aesthetics
 */
export async function enhancePrompt(
  userPrompt: string,
  context?: {
    isInitial?: boolean;
    previousContext?: string;
  }
): Promise<string> {
  const ai = getAIClient();
  
  const systemPrompt = context?.isInitial
    ? `You are a game scenario writer. Transform the user's input into an exciting, game-like video scene description.

REQUIREMENTS:
- Create a vivid main character with personality and appearance
- Make the character MOVE and DO interesting things (don't just stand there!)
- Add dynamic action, adventure, and exploration
- Include game aesthetics: vibrant colors, dramatic lighting, cinematic camera work
- Make it feel like a playable game or interactive adventure
- Add sensory details: sounds, atmosphere, movement
- Keep it under 200 characters but pack it with energy and detail
- Use present tense for immediacy
- Make it visual and cinematic

Example transformations:
"A wizard in a forest" → "A determined young wizard with glowing staff sprints through an ancient mystical forest, dodging floating orbs of light as magical creatures scatter, dramatic sunset rays piercing through canopy, dynamic third-person camera tracking the action"

"A space explorer" → "A bold space explorer in sleek armor leaps across floating asteroids toward a mysterious glowing portal, rockets firing from boots, colorful nebula swirling in background, epic orchestral energy"

Now enhance this prompt: "${userPrompt}"`
    : `You are a game scenario writer. The story continues. Transform this choice into an exciting game-like video scene.

Previous context: ${context?.previousContext || 'Adventure in progress'}

REQUIREMENTS:
- Continue the adventure with the established character
- Show DYNAMIC MOVEMENT and exciting action
- Create a "wow" moment or interesting twist
- Maintain game aesthetics: vibrant, cinematic, energetic
- Make the character explore, discover, react, or overcome challenges
- Add environmental details and atmosphere
- Keep under 200 characters but make every word count
- Use present tense for immediacy

Now enhance this next scene: "${userPrompt}"`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt,
      config: {
        temperature: 0.8, // Creative but controlled
        maxOutputTokens: 150,
      },
    });

    // Debug: Log the response structure to understand the API
    console.log("Response structure:", JSON.stringify(response, null, 2));
    
    // Extract text from response - handle various possible response formats
    let enhanced: string;
    
    // Try response.text first (most common format)
    if (response.text && typeof response.text === 'string') {
      enhanced = response.text.trim();
    } 
    // Try response.candidates if available
    else if (response.candidates && Array.isArray(response.candidates) && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const text = candidate.content.parts[0].text;
        if (text && typeof text === 'string') {
          enhanced = text.trim();
        } else {
          console.warn("No text in candidate parts");
          return userPrompt;
        }
      } else {
        console.warn("No content in candidate");
        return userPrompt;
      }
    }
    // Fallback: try to stringify and parse
    else {
      console.warn("Unexpected response format:", response);
      return userPrompt;
    }
    
    // Validate output isn't empty and isn't too similar to system prompt
    if (!enhanced || enhanced.length < 20) {
      console.warn("Enhancement produced short output, using original:", enhanced);
      return userPrompt;
    }
    
    console.log("✨ Prompt enhanced:", { original: userPrompt, enhanced });
    return enhanced;
    
  } catch (error) {
    console.error("Failed to enhance prompt, using original:", error);
    // Graceful fallback - use original prompt if enhancement fails
    return userPrompt;
  }
}

/**
 * Enhances choice options to be more action-oriented and game-like
 */
export async function enhanceChoices(choices: string[], storyContext: string): Promise<string[]> {
  const ai = getAIClient();
  
  const prompt = `You are a game scenario writer. Make these story choices more exciting and action-oriented.

Current story: ${storyContext}

Current choices:
${choices.map((c, i) => `${i + 1}. ${c}`).join('\n')}

REQUIREMENTS:
- Keep each choice under 10 words
- Make them ACTION-ORIENTED (use strong verbs)
- Show movement, exploration, or interaction
- Make them feel like game objectives or quests
- Keep the same general meaning but add energy
- Make the player WANT to pick each one

Return ONLY a JSON array of 3 enhanced choices, nothing else.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          }
        },
        temperature: 0.7,
      },
    });

    // Extract text from response - handle various possible response formats
    let responseText: string;
    
    // Try response.text first (most common format)
    if (response.text && typeof response.text === 'string') {
      responseText = response.text;
    } 
    // Try response.candidates if available
    else if (response.candidates && Array.isArray(response.candidates) && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const text = candidate.content.parts[0].text;
        if (text && typeof text === 'string') {
          responseText = text;
        } else {
          console.warn("No text in candidate parts");
          return choices;
        }
      } else {
        console.warn("No content in candidate");
        return choices;
      }
    }
    // Fallback: unexpected format
    else {
      console.warn("Unexpected response format for choices:", response);
      return choices;
    }

    const enhanced = JSON.parse(responseText);
    if (Array.isArray(enhanced) && enhanced.length === 3 && enhanced.every(c => typeof c === 'string')) {
      console.log("✨ Choices enhanced:", { original: choices, enhanced });
      return enhanced;
    }
    
    console.warn("Enhancement produced invalid format, using original choices");
    return choices;
    
  } catch (error) {
    console.error("Failed to enhance choices, using original:", error);
    return choices;
  }
}

