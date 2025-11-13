
import React, { useState, useRef, useEffect } from 'react';
import { STYLE_PRESETS, StylePreset } from '../config/stylePresets';
import { NARRATIVE_TYPES, NarrativeType, getDefaultNarrativeType } from '../config/narrativeTypes';
import { getRandomPrompt, isGeminiTextAvailable, expandPrompt } from '../services/geminiTextService';
import ManualPromptBuilder from './ManualPromptBuilder';
import NarrativeTypeSelector from './NarrativeTypeSelector';
import {
  buildBlueprintFromManualSelections,
  createManualRandomPrompt,
  createRandomManualSelections,
  ManualBlueprintSelections,
  renderPromptFromBlueprint,
} from '../utils/randomPromptBlueprint';

interface PromptInputProps {
  onSubmit: (prompt: string, stylePreset: StylePreset | null, narrativeType: NarrativeType) => void;
  disabled: boolean;
}

// UI Constants
const MIN_TEXTAREA_HEIGHT = 120;
const MAX_TEXTAREA_HEIGHT = 400;
const RECOMMENDED_PROMPT_LENGTH = 500;

const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, disabled }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<StylePreset | null>(STYLE_PRESETS[0]);
  const [selectedNarrativeType, setSelectedNarrativeType] = useState<NarrativeType>(getDefaultNarrativeType());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);
  const [isLoadingExpansion, setIsLoadingExpansion] = useState(false);
  const [originalPromptBeforeExpansion, setOriginalPromptBeforeExpansion] = useState<string | null>(null);
  const [isManualBuilderOpen, setIsManualBuilderOpen] = useState(false);
  const [manualSelections, setManualSelections] = useState<ManualBlueprintSelections>(() =>
    createRandomManualSelections(),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt.trim(), selectedPreset, selectedNarrativeType);
    }
  };
  
  const placeholders = [
    "A lone astronaut discovering a glowing alien forest...",
    "A cyberpunk detective walking through rain-soaked neon streets...",
    "A magical creature hatching from a crystal egg...",
    "A knight approaching a colossal, vine-covered castle...",
    "A pirate ship sailing through clouds toward a floating island...",
    "A young wizard opening an ancient spellbook in a dusty library...",
    "A time traveler stepping out of a portal in Victorian London...",
    "A robot gardener tending to flowers in a post-apocalyptic garden...",
    "A deep-sea diver encountering a glowing underwater city...",
    "A samurai standing at the edge of a cherry blossom cliff at sunset...",
    "A steampunk airship crew spotting a mysterious storm ahead...",
    "A lone traveler discovering a hidden temple in the jungle...",
    "A street artist painting a mural that comes to life...",
    "A space merchant landing on a bustling alien marketplace...",
    "A dragon hatchling taking its first flight over mountain peaks...",
  ];

  const [placeholder, setPlaceholder] = useState(placeholders[0]);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
        setPlaceholder(placeholders[Math.floor(Math.random() * placeholders.length)]);
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRandomize = async () => {
    setIsLoadingRandom(true);
    
    try {
      // Try to use Gemini API for creative random prompts
      if (isGeminiTextAvailable()) {
        const randomPrompt = await getRandomPrompt();
        setPrompt(randomPrompt);
      } else {
        const manualPrompt = createManualRandomPrompt();
        setPrompt(manualPrompt);
      }
    } catch (error) {
      console.warn('Failed to get Gemini random prompt, using fallback:', error);
      const manualPrompt = createManualRandomPrompt();
      setPrompt(manualPrompt);
    } finally {
      setIsLoadingRandom(false);
    }
  };

  const handleOpenManualBuilder = () => {
    setIsManualBuilderOpen(true);
  };

  const handleManualBuilderApply = (selections: ManualBlueprintSelections) => {
    setManualSelections(selections);
    const blueprint = buildBlueprintFromManualSelections(selections);
    const manualPrompt = renderPromptFromBlueprint(blueprint);
    setPrompt(manualPrompt);
    setIsManualBuilderOpen(false);
    setIsExpanded(false);
  };

  const handleExpandWithAI = async () => {
    if (!prompt.trim()) {
      return;
    }

    setIsLoadingExpansion(true);
    try {
      // Save the original prompt before expansion
      setOriginalPromptBeforeExpansion(prompt);
      
      // Expand the prompt using Gemini
      const expandedPrompt = await expandPrompt(prompt);
      setPrompt(expandedPrompt);
    } catch (error) {
      console.error('Failed to expand prompt:', error);
      alert('Failed to expand prompt. Please check your Gemini API key and try again.');
      // Don't save original if expansion failed
      setOriginalPromptBeforeExpansion(null);
    } finally {
      setIsLoadingExpansion(false);
    }
  };

  const handleRevertExpansion = () => {
    if (originalPromptBeforeExpansion !== null) {
      setPrompt(originalPromptBeforeExpansion);
      setOriginalPromptBeforeExpansion(null);
    }
  };

  // Auto-grow textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(
        Math.max(textareaRef.current.scrollHeight, MIN_TEXTAREA_HEIGHT),
        MAX_TEXTAREA_HEIGHT
      );
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [prompt]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  const isPromptLong = prompt.length > RECOMMENDED_PROMPT_LENGTH;
  const hasGemini = isGeminiTextAvailable();

  return (
    <>
      <div className="w-full max-w-3xl mx-auto p-4 md:p-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
          Veo Visual Novel
        </h1>
        <p className="text-center text-slate-400 mb-8 text-lg">
          Start your adventure. Describe the main character and the opening scene.
        </p>

        {/* Narrative Type Selector */}
        <NarrativeTypeSelector
          selectedType={selectedNarrativeType}
          onTypeChange={setSelectedNarrativeType}
          disabled={disabled}
        />

        {/* Style Preset Chips */}
        <div className="mb-4 fade-in-up">
          <label className="block text-slate-300 text-sm font-semibold mb-3">
            Choose a Style:
          </label>
          <div className="flex flex-wrap gap-2">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedPreset(preset)}
                disabled={disabled}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedPreset?.id === preset.id
                    ? 'bg-sky-500 text-white ring-2 ring-sky-400 shadow-lg scale-105'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:border-sky-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="mr-1">{preset.icon}</span>
                {preset.name}
              </button>
            ))}
          </div>
          {selectedPreset && selectedPreset.id !== 'none' && (
            <p className="mt-2 text-xs text-slate-400 italic">
              {selectedPreset.description}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Textarea with auto-grow */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={handlePromptChange}
              placeholder={placeholder}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow resize-none overflow-y-auto"
              disabled={disabled}
              style={{ minHeight: `${MIN_TEXTAREA_HEIGHT}px` }}
            />
            
            {/* Character count and expand button */}
            <div className="flex justify-between items-center mt-2">
              <div className="text-xs text-slate-400">
                {prompt.length} characters
                {isPromptLong && (
                  <span className="ml-2 text-amber-400">
                    (Longer prompts may be truncated by some models)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                disabled={disabled}
              >
                Expand ⤢
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleOpenManualBuilder}
              className="bg-slate-700 text-slate-200 font-bold py-3 px-6 rounded-lg hover:bg-slate-600 transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed text-lg shadow-md"
              disabled={disabled}
            >
              🛠️ Manual Builder
            </button>
            <button
              type="button"
              onClick={handleRandomize}
              className="bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-400 transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed text-lg shadow-md relative overflow-hidden"
              disabled={disabled || isLoadingRandom}
            >
              {isLoadingRandom ? (
                <>
                  <span className="opacity-50">Randomize</span>
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </span>
                </>
              ) : (
                <>
                  🎲 Randomize
                  {hasGemini && <span className="ml-1 text-xs opacity-75">(AI)</span>}
                </>
              )}
            </button>
            <button
              type="submit"
              className="flex-grow bg-sky-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-sky-500 transition-colors duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed text-lg shadow-md"
              disabled={disabled || !prompt.trim()}
            >
              ✨ Begin
            </button>
          </div>
        </form>
      </div>

      {/* Expanded Modal Editor */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-700 scale-in">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
                Edit Prompt
              </h2>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-grow p-6 overflow-y-auto">
              <textarea
                value={prompt}
                onChange={handlePromptChange}
                placeholder={placeholder}
                className="w-full h-full min-h-[400px] bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 text-xl focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                autoFocus
              />
              <div className="mt-3 text-sm text-slate-400">
                {prompt.length} characters
                {isPromptLong && (
                  <span className="ml-2 text-amber-400">
                    ⚠ Longer prompts may be truncated by some models
                  </span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-slate-700 flex flex-col sm:flex-row gap-3">
              {hasGemini && (
                <button
                  onClick={handleExpandWithAI}
                  disabled={!prompt.trim() || isLoadingExpansion}
                  className="bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-400 transition-all duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50 relative overflow-hidden"
                >
                  {isLoadingExpansion ? (
                    <>
                      <span className="opacity-50">✨ Expand with AI</span>
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </span>
                    </>
                  ) : (
                    '✨ Expand with AI'
                  )}
                </button>
              )}
              
              {originalPromptBeforeExpansion !== null && (
                <button
                  onClick={handleRevertExpansion}
                  className="bg-amber-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-amber-500 transition-colors"
                >
                  ↶ Revert
                </button>
              )}
              
              <button
                onClick={() => setIsExpanded(false)}
                className="flex-grow bg-slate-700 text-slate-200 font-bold py-3 px-6 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {isManualBuilderOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col border border-slate-700 scale-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
                Build Prompt Manually
              </h2>
              <button
                onClick={() => setIsManualBuilderOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-grow p-6 overflow-y-auto">
              <ManualPromptBuilder
                initialSelections={manualSelections}
                onApply={handleManualBuilderApply}
                onCancel={() => setIsManualBuilderOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PromptInput;
