import React from 'react';
import { LLMModel } from '../types';
import {
  DEFAULT_LLM_MODEL,
  LLM_MODEL_METADATA,
  LLM_MODEL_ORDER,
  LLM_PROVIDER_NAMES,
  getLLMCostEstimate,
  getLLMCostSymbol,
} from '../config/llmModelMetadata';
import { isGeminiTextAvailable } from '../services/geminiTextService';

interface LLMModelSelectorProps {
  selectedModel: LLMModel;
  onModelChange: (model: LLMModel) => void;
  disabled?: boolean;
}

const FALLBACK_MODEL = DEFAULT_LLM_MODEL;

const LLMModelSelector: React.FC<LLMModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  disabled = false,
}) => {
  const hasGeminiKey = isGeminiTextAvailable();
  const isSelectionDisabled = disabled || !hasGeminiKey;

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-300 mb-3">
        Language Model
        <span className="ml-2 text-xs text-slate-500">(controls Gemini prompt writer)</span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {LLM_MODEL_ORDER.map((modelId) => {
          const metadata = LLM_MODEL_METADATA[modelId] ?? LLM_MODEL_METADATA[FALLBACK_MODEL];
          const isSelected = selectedModel === modelId;
          return (
            <button
              key={modelId}
              type="button"
              onClick={() => onModelChange(modelId)}
              disabled={isSelectionDisabled}
              className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-all text-left ${
                isSelected
                  ? 'border-sky-400 bg-sky-500/10 ring-2 ring-sky-400/40'
                  : 'border-slate-700 bg-slate-800/60 hover:border-slate-500 hover:bg-slate-800/80'
              } ${isSelectionDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{metadata.icon}</span>
                <div>
                  <p className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {metadata.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {LLM_PROVIDER_NAMES[metadata.provider]} • {metadata.latency} •{' '}
                    {getLLMCostSymbol(metadata.costLevel)} {getLLMCostEstimate(metadata.costLevel)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400">{metadata.description}</p>
              <div className="flex flex-wrap gap-1">
                {metadata.strengths.map((strength) => (
                  <span
                    key={strength}
                    className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-700/70 text-slate-300"
                  >
                    {strength}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-300">{metadata.recommendedUse}</p>
              {isSelected && (
                <span className="text-xs font-semibold text-sky-300 uppercase tracking-wide">
                  Active model
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!hasGeminiKey && (
        <p className="mt-3 text-xs text-amber-400">
          Gemini API key required to use AI prompt helpers. Add it in the settings panel.
        </p>
      )}
    </div>
  );
};

export default LLMModelSelector;

