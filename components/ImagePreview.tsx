import React from 'react';

interface ImagePreviewProps {
  imageUrl: string;
  prompt: string;
  isRetrying: boolean;
  onAccept: () => void;
  onRetry: () => void;
  onDiscard: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  prompt,
  isRetrying,
  onAccept,
  onRetry,
  onDiscard
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 fade-in">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500 mb-2">
          Preview Your Scene
        </h2>
        <p className="text-slate-400 text-lg">
          Review the generated image before creating your video
        </p>
      </div>

      {/* Image Display */}
      <div className="bg-slate-800/50 border-2 border-slate-700 rounded-2xl overflow-hidden shadow-2xl mb-6">
        <div className="relative aspect-video bg-slate-900">
          <img
            src={imageUrl}
            alt="Generated scene preview"
            className="w-full h-full object-contain"
          />
          
          {/* Overlay with prompt */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
            <p className="text-sm text-slate-300 mb-1 font-semibold">Your Prompt:</p>
            <p className="text-slate-100 text-base">"{prompt}"</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch">
        {/* Discard Button */}
        <button
          onClick={onDiscard}
          disabled={isRetrying}
          className="flex-1 sm:flex-initial bg-slate-700 text-slate-200 font-bold py-4 px-8 rounded-lg hover:bg-slate-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md border border-slate-600 hover:border-slate-500"
        >
          ← Go Back
        </button>

        {/* Retry Button */}
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="flex-1 sm:flex-initial bg-amber-600 text-white font-bold py-4 px-8 rounded-lg hover:bg-amber-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md relative overflow-hidden"
        >
          {isRetrying ? (
            <>
              <span className="opacity-50">🔄 Retry Image</span>
              <span className="absolute inset-0 flex items-center justify-center">
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </span>
            </>
          ) : (
            '🔄 Retry Image'
          )}
        </button>

        {/* Accept Button */}
        <button
          onClick={onAccept}
          disabled={isRetrying}
          className="flex-1 sm:flex-initial bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold py-4 px-12 rounded-lg hover:from-sky-500 hover:to-indigo-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-105"
        >
          ✓ Accept & Continue
        </button>
      </div>

      {/* Info tip */}
      <div className="mt-6 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
        <p className="text-xs text-slate-400 text-center">
          <span className="text-sky-400 font-medium">💡 Tip:</span> This image will be used as the starting frame for your video. 
          Make sure it matches your vision before continuing!
        </p>
      </div>
    </div>
  );
};

export default ImagePreview;

