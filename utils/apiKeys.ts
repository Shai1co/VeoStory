/**
 * API Key Management
 * Stores and retrieves API keys from localStorage
 */

export type ApiKeyName = 
  | 'GEMINI_API_KEY'
  | 'REPLICATE_API_KEY'
  | 'RUNWAY_API_KEY'
  | 'STABILITY_API_KEY';

const API_KEYS_STORAGE_KEY = 'veo-visual-novel-api-keys';

interface ApiKeys {
  GEMINI_API_KEY?: string;
  REPLICATE_API_KEY?: string;
  RUNWAY_API_KEY?: string;
  STABILITY_API_KEY?: string;
}

/**
 * Get all stored API keys from localStorage
 */
export function getAllApiKeys(): ApiKeys {
  try {
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    if (!stored) {
      return {};
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load API keys from localStorage:', error);
    return {};
  }
}

/**
 * Get a specific API key from localStorage
 */
export function getApiKey(keyName: ApiKeyName): string | null {
  const keys = getAllApiKeys();
  return keys[keyName] || null;
}

/**
 * Set a specific API key in localStorage
 */
export function setApiKey(keyName: ApiKeyName, value: string): void {
  const keys = getAllApiKeys();
  keys[keyName] = value;
  localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
}

/**
 * Set multiple API keys at once
 */
export function setAllApiKeys(newKeys: Partial<ApiKeys>): void {
  const keys = getAllApiKeys();
  const updated = { ...keys, ...newKeys };
  // Remove empty values
  Object.keys(updated).forEach(key => {
    if (!updated[key as ApiKeyName]) {
      delete updated[key as ApiKeyName];
    }
  });
  localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Check if a specific API key exists
 */
export function hasApiKey(keyName: ApiKeyName): boolean {
  const key = getApiKey(keyName);
  return !!(key && key.trim().length > 0);
}

/**
 * Check if required API keys exist
 * Gemini API key is required for the app to function
 */
export function hasRequiredApiKeys(): boolean {
  return hasApiKey('GEMINI_API_KEY');
}

/**
 * Clear all API keys from localStorage
 */
export function clearApiKeys(): void {
  localStorage.removeItem(API_KEYS_STORAGE_KEY);
}

/**
 * Clear a specific API key
 */
export function clearApiKey(keyName: ApiKeyName): void {
  const keys = getAllApiKeys();
  delete keys[keyName];
  localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
}

/**
 * API key provider information
 */
export interface ApiKeyProvider {
  name: string;
  keyName: ApiKeyName;
  description: string;
  required: boolean;
  getKeyUrl: string;
  docsUrl: string;
  placeholder: string;
}

export const API_KEY_PROVIDERS: ApiKeyProvider[] = [
  {
    name: 'Google AI (Gemini)',
    keyName: 'GEMINI_API_KEY',
    description: 'Required for video generation (Veo), image generation (Imagen), text generation, and story choices.',
    required: true,
    getKeyUrl: 'https://aistudio.google.com/apikey',
    docsUrl: 'https://ai.google.dev/gemini-api/docs/api-key',
    placeholder: 'AIza...',
  },
  {
    name: 'Replicate',
    keyName: 'REPLICATE_API_KEY',
    description: 'Optional: Enables additional video models (Wan 2.5, Veo via Replicate) and FLUX image generation.',
    required: false,
    getKeyUrl: 'https://replicate.com/account/api-tokens',
    docsUrl: 'https://replicate.com/docs/reference/http',
    placeholder: 'r8_...',
  },
  {
    name: 'Runway ML',
    keyName: 'RUNWAY_API_KEY',
    description: 'Optional: Enables Runway Gen-3 and Gen-4 video models.',
    required: false,
    getKeyUrl: 'https://app.runwayml.com/settings/api-keys',
    docsUrl: 'https://docs.runwayml.com/reference/authentication',
    placeholder: 'rw_...',
  },
  {
    name: 'Stability AI',
    keyName: 'STABILITY_API_KEY',
    description: 'Optional: Enables Stable Diffusion image and Stable Video Diffusion models.',
    required: false,
    getKeyUrl: 'https://platform.stability.ai/account/keys',
    docsUrl: 'https://platform.stability.ai/docs/getting-started/authentication',
    placeholder: 'sk-...',
  },
];

