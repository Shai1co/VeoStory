
import React from 'react';

interface ApiKeySelectorProps {
  onKeySelected: () => void;
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      onKeySelected();
    } catch (error) {
      console.error("Error opening API key selection:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h2 className="text-3xl font-bold mb-4 text-slate-100">Welcome to the Veo Visual Novel Game</h2>
      <p className="text-lg mb-6 text-slate-300 max-w-2xl">
        This app uses Google's Veo 3.1 model to generate video segments for an interactive story. To begin, you'll need to select a Google AI Studio API key.
      </p>
      <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
        <p className="mb-4 text-slate-400">
            For more information on billing, please see the{' '}
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">
                billing documentation
            </a>.
        </p>
        <button
          onClick={handleSelectKey}
          className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300 text-lg shadow-md focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75"
        >
          Select API Key
        </button>
      </div>
    </div>
  );
};

export default ApiKeySelector;
