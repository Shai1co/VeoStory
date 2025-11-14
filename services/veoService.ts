/**
 * Google Veo 3.1 Video Generation Service
 * Supports text-to-video and image-to-video generation
 */

import { GoogleGenAI, Type } from "@google/genai";
import { getApiKey } from '../utils/apiKeys';
import { NarrativeType, NarrativeTypeId } from '../config/narrativeTypes';
import { LLMModel } from '../types';
import { DEFAULT_LLM_MODEL } from '../config/llmModelMetadata';

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
  narrativeType?: NarrativeType;
  llmModel?: LLMModel;
}

const NARRATIVE_CHOICE_DIRECTIVES: Record<NarrativeTypeId, string[]> = {
  adventure: [
    'Every choice must push the party deeper into unexplored terrain, curiosities, or discoveries.',
    'Reference landmarks, relics, clues, or vistas that reward exploration.',
    'Provide one bold expedition, one careful scouting/surveying action, and one creative environmental interaction.'
  ],
  combat: [
    'Each choice must involve an explicit opponent, threat, or battlefield obstacle.',
    'Use combat verbs (strike, parry, unleash, counter, flank, shield, detonate) and mention weapons, powers, or tactics.',
    'Choice 1 = aggressive power move, Choice 2 = defensive or tactical repositioning, Choice 3 = special technique, combo, or environmental exploitation.'
  ],
  mystery: [
    'All choices must revolve around uncovering truth via clues, evidence, interrogation, or deduction.',
    'Reference suspects, contradictions, artifacts, riddles, or forensic techniques.',
    'Ensure at least one choice analyses clues, one questions someone, and one inspects a suspicious location/object.'
  ],
  stealth: [
    'Keep every choice quiet, unseen, and precise—emphasize shadows, disguises, and misdirection.',
    'Mention hiding spots, silent takedowns, disabling alarms, or slipping past sentries.',
    'Provide one evasive route, one surgical silent action, and one clever distraction or sabotage.'
  ],
  social: [
    'All choices must be conversational maneuvers: persuasion, intimidation, charm, negotiation, or emotional appeals.',
    'Explicitly mention tone, body language, or rhetorical strategy.',
    'Include options that sway allies, defuse hostility, or forge alliances.'
  ],
  survival: [
    'Center every choice on enduring the environment: supplies, shelter, health, or weather.',
    'Reference specific resources (water, rations, tools, fire, medicine) and natural hazards.',
    'Provide one choice securing resources, one reinforcing safety, and one high-risk gamble for long-term survival.'
  ],
  horror: [
    'Keep the tone tense and fearful—mention lurking horrors, whispers, corrupted environments, or sanity slipping.',
    'Choices should involve desperate escape, risky confrontation of the terror, or coping with dread.',
    'Use anxious verbs (bolt, barricade, banish, pray, steady breathing) and highlight consequences of failure.'
  ],
  romance: [
    'All choices must revolve around emotional connection, vulnerability, or relationship momentum.',
    'Describe gestures, confessions, support, or shared memories; mention feelings explicitly.',
    'Offer one bold romantic move, one tender reassuring act, and one cautious but heartfelt step.'
  ],
};

const buildNarrativeChoiceDirectives = (narrativeType?: NarrativeType): string => {
  if (!narrativeType) {
    return '';
  }

  const directives = NARRATIVE_CHOICE_DIRECTIVES[narrativeType.id as NarrativeTypeId] ?? [
    'Ensure each choice clearly embodies the described narrative type and would satisfy fans of that genre.'
  ];

  return `
CRITICAL ${narrativeType.name.toUpperCase()} ALIGNMENT:
- The entire response must feel like ${narrativeType.description}.
${directives.map(d => `- ${d}`).join('\n')}
`;
};

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
  const narrativeType = options?.narrativeType;
  
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
  
  // Build narrative type section
  let narrativeSection = '';
  if (narrativeType) {
    const hints = narrativeType.enhancementHints.choiceGeneration;
    narrativeSection = `\n🎭 NARRATIVE TYPE: ${narrativeType.name.toUpperCase()} - ${narrativeType.description}
Guidance for this narrative type:
${hints.map(h => `- ${h}`).join('\n')}\n`;
  }
  const narrativeDirectives = buildNarrativeChoiceDirectives(narrativeType);
  
  const prompt = `
    You are a game designer creating exciting action choices for a video game adventure. Based on the current story, suggest three dynamic and ACTION-ORIENTED choices.

    Story Context: "${storyContext}"

    If a reference frame is provided, align the choices with the details in that scene (characters, environment, objects, mood).
    ${narrativeSection}${narrativeDirectives}${antiPatternSection}${diversitySection}${progressionSection}
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
    const llmModel = options?.llmModel ?? DEFAULT_LLM_MODEL;
    const response = await ai.models.generateContent({
      model: llmModel,
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

