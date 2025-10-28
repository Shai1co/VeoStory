
import React, { useState } from 'react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  disabled: boolean;
}

const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, disabled }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt.trim());
    }
  };
  
  const placeholders = [
    "A lone astronaut discovering a glowing alien forest...",
    "A cyberpunk detective walking through rain-soaked neon streets...",
    "A magical creature hatching from a crystal egg...",
    "A knight approaching a colossal, vine-covered castle...",
  ];

  const [placeholder, setPlaceholder] = useState(placeholders[0]);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
        setPlaceholder(placeholders[Math.floor(Math.random() * placeholders.length)]);
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRandomize = () => {
    const randomIndex = Math.floor(Math.random() * placeholders.length);
    setPrompt(placeholders[randomIndex]);
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-8">
      <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
        Veo Visual Novel
      </h1>
      <p className="text-center text-slate-400 mb-8 text-lg">
        Start your adventure. Describe the main character and the opening scene.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder}
          className="flex-grow bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={handleRandomize}
          className="bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-400 transition-colors duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed text-lg shadow-md"
          disabled={disabled}
        >
          Randomize
        </button>
        <button
          type="submit"
          className="bg-sky-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-sky-500 transition-colors duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed text-lg shadow-md"
          disabled={disabled || !prompt.trim()}
        >
          Begin
        </button>
      </form>
    </div>
  );
};

export default PromptInput;
