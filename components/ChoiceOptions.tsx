import React, { useEffect, useState } from 'react';

interface ChoiceOptionsProps {
  choices: string[];
  onChoiceSelect: (choice: string) => void;
  disabled: boolean;
  selectedChoice?: string | null;
}

const ChoiceOptions: React.FC<ChoiceOptionsProps> = ({ choices, onChoiceSelect, disabled, selectedChoice }) => {
  const [visibleChoices, setVisibleChoices] = useState<boolean[]>([]);

  useEffect(() => {
    // Stagger animation for choices
    if (choices.length > 0 && !selectedChoice) {
      setVisibleChoices([]);
      choices.forEach((_, index) => {
        setTimeout(() => {
          setVisibleChoices(prev => {
            const newVisible = [...prev];
            newVisible[index] = true;
            return newVisible;
          });
        }, index * 150);
      });
    } else if (selectedChoice) {
      setVisibleChoices(choices.map(() => true));
    }
  }, [choices, selectedChoice]);

  if (choices.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 flex flex-col items-center gap-4 smooth-transition">
      <h3 className="text-2xl font-bold text-slate-200 mb-2 animate-pulse-subtle fade-in">
        {selectedChoice ? "Your Choice Was:" : "What happens next?"}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {choices.map((choice, index) => {
          const isSelected = choice === selectedChoice;
          const isVisible = visibleChoices[index];
          return (
            <button
              key={index}
              onClick={() => onChoiceSelect(choice)}
              disabled={disabled || !!selectedChoice}
              className={`w-full text-left bg-slate-800 border rounded-lg p-4 text-slate-300 smooth-transition relative
                ${isSelected ? 'border-sky-400 ring-2 ring-sky-400/50 shadow-lg shadow-sky-500/20 scale-in' : 'border-slate-700'}
                ${!selectedChoice && !disabled ? 'hover:bg-slate-700 hover:border-sky-500 hover:scale-105 hover:shadow-xl hover:shadow-sky-500/10' : ''}
                ${disabled || !!selectedChoice ? 'opacity-70 cursor-not-allowed' : ''}
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              {/* Keyboard shortcut hint */}
              {!selectedChoice && !disabled && (
                <span className="absolute top-2 right-2 w-6 h-6 bg-slate-700 border border-slate-600 rounded flex items-center justify-center text-xs font-mono text-slate-400 fade-in">
                  {index + 1}
                </span>
              )}
              
              <p className="font-semibold pr-8">{choice}</p>
            </button>
          )
        })}
      </div>
    </div>
  );
};

export default ChoiceOptions;
