import React, { useState } from 'react';
import { ImageModel, ImageProvider } from '../types';
import { 
  IMAGE_MODEL_METADATA, 
  getImageModelsByProvider, 
  getImageCostSymbol, 
  getImageCostEstimate, 
  IMAGE_PROVIDER_NAMES 
} from '../config/imageModelMetadata';

interface ImageModelSelectorProps {
  selectedModel: ImageModel;
  onModelChange: (model: ImageModel) => void;
  disabled?: boolean;
}

const ImageModelSelector: React.FC<ImageModelSelectorProps> = ({ 
  selectedModel, 
  onModelChange, 
  disabled = false 
}) => {
  const [expandedProviders, setExpandedProviders] = useState<Set<ImageProvider>>(
    new Set(['replicate']) // Replicate expanded by default
  );

  const modelsByProvider = getImageModelsByProvider();

  const toggleProvider = (provider: ImageProvider) => {
    const newExpanded = new Set(expandedProviders);
    if (newExpanded.has(provider)) {
      newExpanded.delete(provider);
    } else {
      newExpanded.add(provider);
    }
    setExpandedProviders(newExpanded);
  };

  const isModelAvailable = (model: ImageModel): boolean => {
    const metadata = IMAGE_MODEL_METADATA[model];
    if (!metadata.requiresApiKey) return true;
    return !!process.env[metadata.requiresApiKey];
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-300 mb-3">
        Image Generation Model
        <span className="ml-2 text-xs text-slate-500">(for text-to-video)</span>
      </label>

      <div className="space-y-3">
        {/* Replicate */}
        <ProviderSection
          provider="replicate"
          displayName={IMAGE_PROVIDER_NAMES.replicate}
          models={modelsByProvider.replicate}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          isExpanded={expandedProviders.has('replicate')}
          onToggle={() => toggleProvider('replicate')}
          disabled={disabled}
          isModelAvailable={isModelAvailable}
        />

        {/* Gemini */}
        <ProviderSection
          provider="gemini"
          displayName={IMAGE_PROVIDER_NAMES.gemini}
          models={modelsByProvider.gemini}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          isExpanded={expandedProviders.has('gemini')}
          onToggle={() => toggleProvider('gemini')}
          disabled={disabled}
          isModelAvailable={isModelAvailable}
        />
      </div>

      {/* Info tip */}
      <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
        <p className="text-xs text-slate-400">
          <span className="text-sky-400 font-medium">💡 Tip:</span> This model generates the reference image when using text-to-video. 
          For image-to-video, this setting is ignored.
        </p>
      </div>
    </div>
  );
};

interface ProviderSectionProps {
  provider: ImageProvider;
  displayName: string;
  models: any[];
  selectedModel: ImageModel;
  onModelChange: (model: ImageModel) => void;
  isExpanded: boolean;
  onToggle: () => void;
  disabled: boolean;
  isModelAvailable: (model: ImageModel) => boolean;
}

const ProviderSection: React.FC<ProviderSectionProps> = ({
  provider,
  displayName,
  models,
  selectedModel,
  onModelChange,
  isExpanded,
  onToggle,
  disabled,
  isModelAvailable
}) => {
  const hasSelectedModel = models.some(m => m.id === selectedModel);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800/30">
      {/* Provider Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <span className={`font-semibold ${hasSelectedModel ? 'text-sky-400' : 'text-slate-300'}`}>
            {displayName}
          </span>
          {hasSelectedModel && (
            <span className="text-xs px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded-full">
              Active
            </span>
          )}
        </div>
      </button>

      {/* Provider Models */}
      {isExpanded && (
        <div className="border-t border-slate-700 p-2 space-y-2">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              isSelected={selectedModel === model.id}
              onSelect={() => !disabled && onModelChange(model.id)}
              disabled={disabled}
              isAvailable={isModelAvailable(model.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ModelCardProps {
  model: any;
  isSelected: boolean;
  onSelect: () => void;
  disabled: boolean;
  isAvailable: boolean;
}

const ModelCard: React.FC<ModelCardProps> = ({ model, isSelected, onSelect, disabled, isAvailable }) => {
  return (
    <button
      onClick={onSelect}
      disabled={disabled || !isAvailable}
      className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${
        isSelected
          ? 'border-sky-400 bg-sky-500/10 ring-2 ring-sky-400/30'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-700/50'
      } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {/* Model Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{model.icon}</span>
          <div>
            <h3 className={`font-semibold ${isSelected ? 'text-sky-300' : 'text-slate-200'}`}>
              {model.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">{model.speed}</span>
              <span className="text-xs text-amber-400">{getImageCostSymbol(model.costLevel)} {getImageCostEstimate(model.costLevel)}</span>
            </div>
          </div>
        </div>
        
        {/* Selected indicator */}
        {isSelected && (
          <svg className="w-5 h-5 text-sky-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}

        {/* Not available indicator */}
        {!isAvailable && (
          <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full flex-shrink-0">
            No API Key
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 mb-2">
        {model.description}
      </p>

      {/* Quality badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded">
          {model.quality} Quality
        </span>
      </div>
    </button>
  );
};

export default ImageModelSelector;

