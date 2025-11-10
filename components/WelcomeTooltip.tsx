import React, { useState, useEffect } from 'react';

interface WelcomeTooltipProps {
  onDismiss: () => void;
}

const WelcomeTooltip: React.FC<WelcomeTooltipProps> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 500);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className={`bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-sky-500 rounded-xl shadow-2xl p-6 max-w-lg w-full transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500 mb-2">
            Welcome to Veo Visual Novel!
          </h2>
          <p className="text-slate-300">
            Create your own interactive story with AI-generated videos
          </p>
        </div>

        <div className="space-y-4 mb-6 text-left">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400">
              1
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Choose Model & Describe Scene</h3>
              <p className="text-slate-400 text-sm">Select Fast (⚡) or Standard (✨) model, then describe your opening scene</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400">
              2
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Watch & Choose</h3>
              <p className="text-slate-400 text-sm">Watch the AI-generated video, then pick what happens next</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400">
              3
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Build Your Story</h3>
              <p className="text-slate-400 text-sm">Continue making choices to create a unique adventure</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
          <h4 className="text-sky-400 font-semibold mb-2 text-sm">Quick Tips:</h4>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>• Press <kbd className="px-2 py-0.5 bg-slate-600 rounded text-xs">S</kbd> to toggle story timeline</li>
            <li>• Use <kbd className="px-2 py-0.5 bg-slate-600 rounded text-xs">1-3</kbd> to quickly select choices</li>
            <li>• Press <kbd className="px-2 py-0.5 bg-slate-600 rounded text-xs">?</kbd> to see all keyboard shortcuts</li>
          </ul>
        </div>

        <button
          onClick={handleDismiss}
          className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg"
        >
          Let's Begin!
        </button>
      </div>
    </div>
  );
};

export default WelcomeTooltip;

