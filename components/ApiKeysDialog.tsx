import React, { useState, useEffect } from 'react';
import { getAllApiKeys, setAllApiKeys, API_KEY_PROVIDERS, ApiKeyName, hasRequiredApiKeys } from '../utils/apiKeys';

interface ApiKeysDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  canClose?: boolean; // If false, user must enter required keys before closing
}

const ApiKeysDialog: React.FC<ApiKeysDialogProps> = ({ isOpen, onClose, onSave, canClose = true }) => {
  const [apiKeys, setApiKeysState] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getAllApiKeys();
      setApiKeysState({
        GEMINI_API_KEY: stored.GEMINI_API_KEY || '',
        REPLICATE_API_KEY: stored.REPLICATE_API_KEY || '',
        RUNWAY_API_KEY: stored.RUNWAY_API_KEY || '',
        STABILITY_API_KEY: stored.STABILITY_API_KEY || '',
      });
    }
  }, [isOpen]);

  const handleInputChange = (keyName: string, value: string) => {
    setApiKeysState(prev => ({ ...prev, [keyName]: value }));
    setValidationError(null);
  };

  const toggleShowKey = (keyName: string) => {
    setShowKeys(prev => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  const handleSave = () => {
    // Validate required keys
    const requiredKeys = API_KEY_PROVIDERS.filter(p => p.required);
    const missingRequired = requiredKeys.filter(p => !apiKeys[p.keyName]?.trim());
    
    if (missingRequired.length > 0) {
      setValidationError(
        `Please provide the required API key: ${missingRequired.map(p => p.name).join(', ')}`
      );
      return;
    }

    // Save to localStorage
    const keysToSave: Record<string, string> = {};
    Object.entries(apiKeys).forEach(([key, value]) => {
      if (value && value.trim()) {
        keysToSave[key] = value.trim();
      }
    });

    setAllApiKeys(keysToSave as Record<ApiKeyName, string>);
    onSave();
    onClose();
  };

  const handleCancel = () => {
    if (!canClose && !hasRequiredApiKeys()) {
      setValidationError('You must provide at least the required API keys to use the app.');
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-slate-700 p-6">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
            API Keys Configuration
          </h2>
          <p className="text-slate-400 mt-2">
            Your API keys are stored locally in your browser and never sent to any server except the respective API providers.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {API_KEY_PROVIDERS.map((provider) => (
            <div key={provider.keyName} className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-200">
                      {provider.name}
                    </h3>
                    {provider.required && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/40 rounded">
                        Required
                      </span>
                    )}
                    {!provider.required && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-slate-700 text-slate-400 border border-slate-600 rounded">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    {provider.description}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <a
                      href={provider.getKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-sky-400 hover:text-sky-300 underline"
                    >
                      Get API Key ↗
                    </a>
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:text-slate-300 underline"
                    >
                      Documentation ↗
                    </a>
                  </div>
                </div>
              </div>

              <div className="relative">
                <input
                  type={showKeys[provider.keyName] ? 'text' : 'password'}
                  value={apiKeys[provider.keyName] || ''}
                  onChange={(e) => handleInputChange(provider.keyName, e.target.value)}
                  placeholder={provider.placeholder}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent pr-24"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey(provider.keyName)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showKeys[provider.keyName] ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          ))}

          {validationError && (
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
              {validationError}
            </div>
          )}

          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-slate-300">💡 Tips:</h4>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>At minimum, you need a Google AI (Gemini) API key to use the app</li>
              <li>Optional keys unlock additional video and image generation models</li>
              <li>API keys are stored only in your browser's localStorage</li>
              <li>You can update your keys anytime from the settings menu</li>
              <li>Be mindful of API costs - each provider has different pricing</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-800 border-t border-slate-700 p-6 flex justify-end gap-3">
          {canClose && (
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold rounded-lg transition-all shadow-lg"
          >
            Save API Keys
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeysDialog;

