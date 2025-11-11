import React, { useEffect, useState } from 'react';

type ChoiceOptionsVariant = 'default' | 'overlay';

interface ChoiceOptionsProps {
  choices: string[];
  onChoiceSelect: (choice: string) => void;
  disabled: boolean;
  selectedChoice?: string | null;
  variant?: ChoiceOptionsVariant;
  onRegenerate?: () => void;
  canRegenerate?: boolean;
  isRegenerating?: boolean;
  errorMessage?: string | null;
  onCustomPromptToggle?: () => void;
  isCustomPromptOpen?: boolean;
}

const ChoiceOptions: React.FC<ChoiceOptionsProps> = ({
  choices,
  onChoiceSelect,
  disabled,
  selectedChoice,
  variant = 'default',
  onRegenerate,
  canRegenerate = false,
  isRegenerating = false,
  errorMessage = null,
  onCustomPromptToggle,
  isCustomPromptOpen = false,
}) => {
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

  const containerClassName =
    variant === 'overlay'
      ? 'w-full mx-auto flex flex-col items-center sm:items-stretch gap-3 smooth-transition'
      : 'w-full max-w-4xl mx-auto p-4 flex flex-col items-center gap-4 smooth-transition';

  const titleClassName =
    variant === 'overlay'
      ? 'sr-only'
      : 'text-2xl font-bold text-slate-200 mb-2 animate-pulse-subtle fade-in';

  const gridClassName =
    variant === 'overlay'
      ? 'grid grid-cols-1 md:grid-cols-3 gap-3 w-full sm:gap-4'
      : 'grid grid-cols-1 md:grid-cols-3 gap-4 w-full';

  const baseButtonClassName =
    'w-full text-left border rounded-lg p-4 text-slate-300 smooth-transition relative';

  const variantButtonClassName =
    variant === 'overlay'
      ? 'bg-slate-900/60 border-slate-500/50 shadow-lg shadow-slate-900/30'
      : 'bg-slate-800 border-slate-700';

  return (
    <div className={containerClassName}>
      <h3 className={`${titleClassName} ${variant === 'overlay' ? '' : 'mb-2'}`}>
        {selectedChoice ? "Your Choice Was:" : "What happens next?"}
      </h3>
      <div className={gridClassName}>
        {choices.map((choice, index) => {
          const isSelected = choice === selectedChoice;
          const isVisible = visibleChoices[index];
          const shouldDisable = disabled || !!selectedChoice || isRegenerating;
          const canHover = !selectedChoice && !disabled && !isRegenerating;
          const hoverClassName = canHover
              ? variant === 'overlay'
              ? 'hover:border-sky-300/80 hover:bg-slate-900/75 hover:shadow-xl hover:shadow-sky-500/40 hover:scale-105'
                : 'hover:bg-slate-700 hover:border-sky-500 hover:scale-105 hover:shadow-xl hover:shadow-sky-500/10'
            : '';
          return (
            <button
              key={index}
              onClick={() => onChoiceSelect(choice)}
              disabled={shouldDisable}
              className={`${baseButtonClassName} ${variantButtonClassName}
                ${isSelected ? 'border-sky-400 ring-2 ring-sky-400/50 shadow-lg shadow-sky-500/20 scale-in' : ''}
                ${hoverClassName}
                ${shouldDisable ? 'opacity-70 cursor-not-allowed' : ''}
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
      {variant === 'overlay' && (onRegenerate || onCustomPromptToggle) && (
        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {errorMessage && (
            <span className="text-sm text-rose-200 font-medium sm:mr-auto">
              {errorMessage}
            </span>
          )}
          <div className="flex w-full sm:w-auto items-center gap-2">
            {onCustomPromptToggle && (
              <button
                onClick={onCustomPromptToggle}
                className={`inline-flex items-center justify-center rounded-lg border border-slate-500/40 bg-slate-900/50 p-2 text-slate-100 shadow-md shadow-slate-900/30 transition-all ${
                  isCustomPromptOpen
                    ? 'ring-2 ring-sky-400 bg-slate-900/70 border-sky-400/60'
                    : 'hover:bg-slate-900/65 hover:border-sky-300'
                }`}
                aria-label={isCustomPromptOpen ? 'Close custom prompt input' : 'Open custom prompt input'}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 7h10M7 12h5M7 17h10"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 15.5l3 3 2.5-6"
                  />
                </svg>
              </button>
            )}
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={!canRegenerate || isRegenerating}
                className={`inline-flex items-center justify-center rounded-lg border border-sky-500/40 bg-slate-900/50 p-2 text-sky-100 shadow-md shadow-slate-900/30 transition-all
                  ${canRegenerate && !isRegenerating ? 'hover:bg-slate-900/65 hover:border-sky-300 hover:-translate-y-0.5' : 'opacity-70 cursor-not-allowed'}
                `}
                aria-label="Regenerate choices"
              >
                <svg
                  className={`h-5 w-5 ${isRegenerating ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v6h6M20 20v-6h-6"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 8a8 8 0 00-13.856-4.9M4 16a8 8 0 0013.856 4.9"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChoiceOptions;
