import React, { useEffect, useRef, useState } from 'react';
import { MODEL_METADATA } from '../config/modelMetadata';
import { VideoModel } from '../types';
import ModelSelector from './ModelSelector';

interface StoryModelControlsProps {
  selectedModel: VideoModel;
  onModelChange: (model: VideoModel) => void;
  pendingGenerationCount: number;
  disabled?: boolean;
}

const CLOSE_DELAY_MS = 150;

const StoryModelControls: React.FC<StoryModelControlsProps> = ({
  selectedModel,
  onModelChange,
  pendingGenerationCount,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const metadata = MODEL_METADATA[selectedModel];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) {
      return;
    }
    setIsOpen((prev) => !prev);
  };

  const handleModelChange = (model: VideoModel) => {
    onModelChange(model);
    window.setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS);
  };

  const pendingBadge =
    pendingGenerationCount > 0 ? (
      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-sky-500/20 text-sky-300">
        {pendingGenerationCount} generating
      </span>
    ) : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800/70 text-slate-200 hover:text-white hover:border-sky-500 hover:bg-slate-700/70 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        title="Change the model for future generations"
      >
        <span className="text-lg">{metadata.icon}</span>
        <span className="text-sm font-medium">
          {metadata.name}
        </span>
        {pendingBadge}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0l-4.24-4.25a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[min(420px,80vw)] z-30">
          <div className="bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-sm p-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-slate-300">
                Choose a model. Changes apply to upcoming scenes.
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                aria-label="Close model selector"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryModelControls;

