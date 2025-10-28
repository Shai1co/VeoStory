import React from 'react';

interface ChoiceOptionsProps {
  choices: string[];
  onChoiceSelect: (choice: string) => void;
  disabled: boolean;
  selectedChoice?: string | null;
}

const ChoiceOptions: React.FC<ChoiceOptionsProps> = ({ choices, onChoiceSelect, disabled, selectedChoice }) => {
  if (choices.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 flex flex-col items-center gap-4">
      <h3 className="text-2xl font-bold text-slate-200 mb-2">
        {selectedChoice ? "Your Choice Was:" : "What happens next?"}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {choices.map((choice, index) => {
          const isSelected = choice === selectedChoice;
          return (
            <button
              key={index}
              onClick={() => onChoiceSelect(choice)}
              disabled={disabled || !!selectedChoice}
              className={`w-full text-left bg-slate-800 border rounded-lg p-4 text-slate-300 transition-all duration-300
                ${isSelected ? 'border-sky-400 ring-2 ring-sky-400/50' : 'border-slate-700'}
                ${!selectedChoice && !disabled ? 'hover:bg-slate-700 hover:border-sky-500' : ''}
                ${disabled || !!selectedChoice ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              <p className="font-semibold">{choice}</p>
            </button>
          )
        })}
      </div>
    </div>
  );
};

export default ChoiceOptions;
