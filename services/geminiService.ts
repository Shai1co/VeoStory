import { GoogleGenAI, Type } from "@google/genai";

// FIX: Removed duplicate AIStudio interface and global window augmentation.
// The type for `window.aistudio` is now defined in `types.ts`.

const getAIClient = () => {
  if (!process.env.API_KEY) {
      throw new Error("API key not found. Please select an API key.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateInitialVideo = async (prompt: string) => {
  const ai = getAIClient();
  return await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });
};

export const generateNextVideo = async (prompt: string, lastFrameBase64: string) => {
  const ai = getAIClient();
  // Remove data URL prefix e.g. "data:image/jpeg;base64,"
  const base64Data = lastFrameBase64.substring(lastFrameBase64.indexOf(',') + 1);

  return await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
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
    Based on this video game story scene, suggest three creative and distinct actions the character could take next. Keep each action concise (under 10 words).
    Story Scene: "${storyContext}"
    Return the actions as a JSON array of strings. For example: ["Explore the glowing cave", "Follow the mysterious tracks", "Build a shelter for the night"]
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
            description: 'A single action the character can take next.'
          }
        },
      },
    });

    const choices = JSON.parse(response.text);
    if (Array.isArray(choices) && choices.every(c => typeof c === 'string')) {
      return choices.slice(0, 3); // Ensure only 3 choices
    }
    throw new Error("Invalid format for choices.");
  } catch (error) {
    console.error("Failed to generate choices, providing fallback options.", error);
    return [
      "Look for clues in the area.",
      "Wait and see what happens.",
      "Try to go back the way you came."
    ];
  }
};