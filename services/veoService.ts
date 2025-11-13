/**
 * Google Veo 3.1 Video Generation Service
 * Supports text-to-video and image-to-video generation
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

export const generateInitialVideo = async (prompt: string, model: string = 'veo-3.1-fast-generate-preview') => {
  const ai = getAIClient();
  return await ai.models.generateVideos({
    model: model,
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });
};

export const generateNextVideo = async (prompt: string, lastFrameBase64: string, model: string = 'veo-3.1-fast-generate-preview') => {
  const ai = getAIClient();
  // Remove data URL prefix e.g. "data:image/jpeg;base64,"
  const base64Data = lastFrameBase64.substring(lastFrameBase64.indexOf(',') + 1);

  return await ai.models.generateVideos({
    model: model,
    prompt: prompt,
    image: {
      imageBytes: base64Data,
      mimeType: 'image/jpeg',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });
};

export const pollVideoOperation = async (operation: any) => {
  const ai = getAIClient();
  let currentOperation = operation;
  while (!currentOperation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    currentOperation = await ai.operations.getVideosOperation({ operation: currentOperation });
  }
  if (currentOperation.error) {
    throw new Error(currentOperation.error.message);
  }
  return currentOperation;
};

export interface ChoiceGenerationOptions {
  storyContext: string;
  lastFrameBase64?: string;
  temperature?: number;
  antiPatterns?: string[];
  progressionHints?: string[];
  recentChoiceTypes?: string[];
  storyPhase?: string;
}

export const generateChoices = async (
  storyContext: string,
  lastFrameBase64?: string,
  options?: Partial<ChoiceGenerationOptions>
): Promise<string[]> => {
  const ai = getAIClient();
  
  const temperature = options?.temperature ?? 0.8;
  const antiPatterns = options?.antiPatterns ?? [];
  const progressionHints = options?.progressionHints ?? [];
  const recentChoiceTypes = options?.recentChoiceTypes ?? [];
  const storyPhase = options?.storyPhase ?? 'ongoing';
  
  // Build anti-pattern section
  let antiPatternSection = '';
  if (antiPatterns.length > 0) {
    antiPatternSection = `\n⛔ DO NOT REPEAT OR USE SIMILAR WORDING TO THESE (already generated/used):\n${antiPatterns.map(p => `- ${p}`).join('\n')}\n
CRITICAL: You MUST generate choices that are COMPLETELY DIFFERENT from the above list.
Do NOT use similar verbs, actions, or sentence structures as shown above.
Be creative and think of entirely new approaches that haven't been suggested yet.\n`;
  }
  
  // Build choice type diversity section
  let diversitySection = '';
  if (recentChoiceTypes.length > 0) {
    const typeSet = new Set(recentChoiceTypes);
    if (typeSet.size <= 2) {
      diversitySection = `\nRecent choices have been mostly: ${Array.from(typeSet).join(', ')}. 
IMPORTANT: Provide MORE VARIETY - include different action types!\n`;
    }
  }
  
  // Build progression hints section
  let progressionSection = '';
  if (progressionHints.length > 0) {
    progressionSection = `\nStory Progression Guidance (Story Phase: ${storyPhase}):\n${progressionHints.map(h => `- ${h}`).join('\n')}\n`;
  }
  
  const prompt = `
    You are a game designer creating exciting action choices for a video game adventure. Based on the current story, suggest three dynamic and ACTION-ORIENTED choices.

    Story Context: "${storyContext}"

    If a reference frame is provided, align the choices with the details in that scene (characters, environment, objects, mood).
    ${antiPatternSection}${diversitySection}${progressionSection}
    CRITICAL REQUIREMENTS for each choice:
    
    1. DIVERSITY - Each choice MUST represent a DIFFERENT approach:
       - Choice 1: BOLD/DIRECT (combat, confrontation, decisive action)
       - Choice 2: CAUTIOUS/TACTICAL (stealth, planning, careful approach)
       - Choice 3: CREATIVE/EXPLORATORY (investigation, discovery, unconventional solution)
    
    2. ACTION VERBS - Use powerful, specific verbs:
       ✓ sprint, investigate, climb, leap, discover, confront, strike, dodge, summon, examine
       ✗ go, look, try, think, consider, wonder
    
    3. STORY ADVANCEMENT - Each choice MUST move the story forward:
       ✓ Introduce new locations, challenges, or discoveries
       ✓ Change the situation significantly
       ✗ Circular actions (go back, wait, stay, return to start)
       ✗ Vague or passive actions
    
    4. SPECIFICITY - Be concrete and vivid:
       ✓ "Sprint toward the glowing portal before it closes"
       ✗ "Go somewhere"
    
    5. CONSEQUENCES - Each choice should imply different outcomes:
       - Different risks, rewards, and story paths
       - Make players genuinely curious what happens next
    
    6. LENGTH & STRUCTURE VARIETY - VARY the length and structure:
       - One choice should be SHORT (4-6 words): "Charge through the dark gate"
       - One choice should be MEDIUM (7-9 words): "Carefully investigate the glowing runes for hidden clues"
       - One choice should be DETAILED (10-12 words): "Sneak through the shadows to spy on the enemy camp below"
       - Use different sentence structures (imperative, compound, descriptive)
    
    Good examples (note the DIFFERENT lengths):
    - "Charge through the gate" (BOLD, 4 words - SHORT)
    - "Sneak through shadows to spy on the enemy camp" (CAUTIOUS, 9 words - MEDIUM)
    - "Investigate the mysterious glowing runes carved into the ancient wall" (CREATIVE, 11 words - DETAILED)
    
    Bad examples:
    - "Look around the area" (too vague, no story advancement)
    - "Go back to safety" (circular, retreating)
    - "Think about what to do next" (passive, no action)
    - "Try something" (not specific)
    - All three choices being 6-7 words each (lack of length variety)
    
    Return ONLY a JSON array of 3 distinctly different, action-packed choices.
  `;

  const parts: any[] = [{ text: prompt }];

  if (lastFrameBase64) {
    const commaIndex = lastFrameBase64.indexOf(',');
    const imageBytes = commaIndex >= 0 ? lastFrameBase64.slice(commaIndex + 1) : lastFrameBase64;
    parts.push({
      inlineData: {
        data: imageBytes,
        mimeType: 'image/jpeg',
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: 'A dynamic, action-oriented choice for the character.'
          }
        },
        temperature: temperature, // Dynamic temperature based on context
      },
    });

    // Extract text from response - handle various possible response formats
    let responseText: string;
    
    if (response.text && typeof response.text === 'string') {
      responseText = response.text;
    } 
    else if (response.candidates && Array.isArray(response.candidates) && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const text = candidate.content.parts[0].text;
        if (text && typeof text === 'string') {
          responseText = text;
        } else {
          throw new Error("No text in candidate parts");
        }
      } else {
        throw new Error("No content in candidate");
      }
    }
    else {
      throw new Error("Unexpected response format");
    }

    const choices = JSON.parse(responseText);
    if (Array.isArray(choices) && choices.every(c => typeof c === 'string')) {
      return choices.slice(0, 3); // Ensure only 3 choices
    }
    throw new Error("Invalid format for choices.");
  } catch (error) {
    console.error("Failed to generate choices, providing fallback options.", error);
    return [
      "Sprint forward to explore the unknown path",
      "Carefully investigate the mysterious surroundings",
      "Leap into action and face the challenge ahead"
    ];
  }
};

