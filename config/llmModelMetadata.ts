import { LLMModel, LLMModelMetadata, LLMProvider } from '../types';

const COST_SYMBOL = '$';
const PROVIDER_GEMINI: LLMProvider = 'gemini';

export const LLM_PROVIDER_NAMES: Record<LLMProvider, string> = {
  gemini: 'Google Gemini',
};

export const DEFAULT_LLM_MODEL: LLMModel = 'gemini-2.5-flash';

export const LLM_MODEL_ORDER: LLMModel[] = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-pro',
];

export const LLM_MODEL_METADATA: Record<LLMModel, LLMModelMetadata> = {
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    provider: PROVIDER_GEMINI,
    name: 'Gemini 2.5 Flash',
    description: 'Balanced creativity and cost. Great all-rounder for story prompts.',
    icon: '⚡',
    latency: '~3s',
    costLevel: 1,
    strengths: ['Creative writing', 'Fast iteration', 'Low cost'],
    recommendedUse: 'Default pick for story exploration and frequent generations.',
  },
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    provider: PROVIDER_GEMINI,
    name: 'Gemini 2.0 Flash',
    description: 'Stable responses with slightly lower creativity than 2.5.',
    icon: '🚀',
    latency: '~3s',
    costLevel: 1,
    strengths: ['Reliable formatting', 'Lower hallucination risk', 'Budget friendly'],
    recommendedUse: 'Use when you want predictable structure for prompts.',
  },
  'gemini-2.0-flash-lite': {
    id: 'gemini-2.0-flash-lite',
    provider: PROVIDER_GEMINI,
    name: 'Gemini 2.0 Flash Lite',
    description: 'Fastest and cheapest option with shorter outputs.',
    icon: '💨',
    latency: '~2s',
    costLevel: 1,
    strengths: ['Ultra fast', 'Lowest cost', 'Good for drafts'],
    recommendedUse: 'Best when you need rapid iteration or minimal detail.',
  },
  'gemini-flash-latest': {
    id: 'gemini-flash-latest',
    provider: PROVIDER_GEMINI,
    name: 'Gemini Flash Latest',
    description: 'Always points to Google’s newest flash release.',
    icon: '🧠',
    latency: '~3s',
    costLevel: 1,
    strengths: ['Latest capabilities', 'Balanced performance', 'Future proof'],
    recommendedUse: 'Pick if you want auto-upgrades to the newest flash build.',
  },
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    provider: PROVIDER_GEMINI,
    name: 'Gemini 2.5 Pro',
    description: 'Highest quality reasoning with deeper narrative coherence.',
    icon: '🎯',
    latency: '~5s',
    costLevel: 3,
    strengths: ['Long-form coherence', 'Complex reasoning', 'Rich detail'],
    recommendedUse: 'Use for premium sessions where quality matters most.',
  },
};

export function getLLMCostSymbol(costLevel: number): string {
  const normalizedLevel = Math.max(1, Math.round(costLevel));
  return COST_SYMBOL.repeat(normalizedLevel);
}

export function getLLMCostEstimate(costLevel: number): string {
  if (costLevel <= 1) {
    return '~$0.02-0.04';
  }
  if (costLevel === 2) {
    return '~$0.05-0.08';
  }
  if (costLevel >= 3) {
    return '~$0.10+';
  }
  return '~$0.04';
}

