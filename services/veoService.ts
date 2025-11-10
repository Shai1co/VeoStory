/**
 * Google Veo 3.1 Video Generation Service
 * Supports text-to-video and image-to-video generation
 */

import { GoogleGenAI, Type } from "@google/genai";

const getAIClient = () => {
  if (!process.env.API_KEY) {
      throw new Error("Veo API key not found. Please set API_KEY in your environment variables.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
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

export const generateChoices = async (storyContext: string): Promise<string[]> => {
  const ai = getAIClient();
  const prompt = `
    You are a game designer creating exciting action choices for a video game adventure. Based on the current story, suggest three dynamic and ACTION-ORIENTED choices.

    Story Scene: "${storyContext}"

    REQUIREMENTS for each choice:
    - Use STRONG ACTION VERBS (sprint, investigate, climb, leap, discover, confront, etc.)
    - Show MOVEMENT and EXPLORATION (the character must DO something active)
    - Make it feel like a game objective or quest
    - Create different types of actions: combat/bold, stealth/careful, exploration/curious
    - Keep under 10 words but make them exciting
    - Make the player WANT to see what happens next
    
    Good examples:
    - "Sprint toward the glowing portal before it closes"
    - "Sneak through the shadows to investigate the noise"
    - "Climb the ancient tower to survey the landscape"
    
    Bad examples (too passive):
    - "Look around"
    - "Wait and see"
    - "Go back"
    
    Return ONLY a JSON array of 3 action-packed choices.
  `;

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
            description: 'A dynamic, action-oriented choice for the character.'
          }
        },
        temperature: 0.8, // More creative choices
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

