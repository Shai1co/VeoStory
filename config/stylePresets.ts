/**
 * Style Presets Configuration
 * Defines visual styles that can be applied to prompts
 */

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  suffix: string;
  icon: string;
}

// Animation duration constants
export const PRESET_TRANSITION_DURATION_MS = 200;

// Style preset definitions
export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'none',
    name: 'None',
    description: 'No style applied',
    suffix: '',
    icon: '✨'
  },
  {
    id: 'realistic',
    name: 'Realistic',
    description: 'Photorealistic, lifelike rendering',
    suffix: ', photorealistic style, high detail, cinematic lighting, professional cinematography, 8k quality',
    icon: '📷'
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    description: 'Animated cartoon style',
    suffix: ', cartoon animation style, vibrant colors, smooth animation, Disney/Pixar quality',
    icon: '🎨'
  },
  {
    id: 'anime',
    name: 'Anime',
    description: 'Japanese anime style',
    suffix: ', anime style, detailed animation, Studio Ghibli aesthetic, expressive characters',
    icon: '🎌'
  },
  {
    id: 'video-game',
    name: 'Video Game',
    description: 'Modern video game graphics',
    suffix: ', modern video game graphics, 3D rendered, game engine quality, dynamic lighting',
    icon: '🎮'
  },
  {
    id: 'retro-game',
    name: 'Retro Game',
    description: 'Pixel art and retro gaming style',
    suffix: ', retro pixel art style, 16-bit graphics, nostalgic gaming aesthetic, limited color palette',
    icon: '🕹️'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon-lit futuristic cyberpunk',
    suffix: ', cyberpunk style, neon lights, dark atmosphere, futuristic cityscape, blade runner aesthetic',
    icon: '🌃'
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Epic fantasy art style',
    suffix: ', fantasy art style, magical atmosphere, epic scale, detailed environments, concept art quality',
    icon: '🧙'
  },
  {
    id: 'film-noir',
    name: 'Film Noir',
    description: 'Classic black and white noir',
    suffix: ', film noir style, black and white, dramatic shadows, 1940s aesthetic, moody lighting',
    icon: '🎬'
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    description: 'Soft watercolor painting',
    suffix: ', watercolor painting style, soft edges, artistic, hand-painted aesthetic, gentle colors',
    icon: '🖌️'
  }
];

/**
 * Get a style preset by ID
 */
export function getStylePresetById(id: string): StylePreset | undefined {
  return STYLE_PRESETS.find(preset => preset.id === id);
}

/**
 * Get the default style preset
 */
export function getDefaultStylePreset(): StylePreset {
  return STYLE_PRESETS[0]; // 'none'
}

