import React, { ReactNode, useEffect, useRef, useState } from 'react';

const TOOLTIP_DELAY_MS = 500;
const CUSTOM_PROMPT_PLACEHOLDER = 'Describe your custom action...';
const CUSTOM_PROMPT_LABEL = 'Describe your next move';
const CUSTOM_PROMPT_TOOLTIP = 'Write a custom prompt';
const REGENERATE_TOOLTIP_IDLE = 'Regenerate choices';
const REGENERATE_TOOLTIP_BUSY = 'Generating new choices...';

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
  customPromptValue?: string;
  onCustomPromptChange?: (value: string) => void;
  onCustomPromptSubmit?: () => void;
  isCustomPromptSubmitting?: boolean;
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
  customPromptValue = '',
  onCustomPromptChange,
  onCustomPromptSubmit,
  isCustomPromptSubmitting = false,
}) => {
  const [visibleChoices, setVisibleChoices] = useState<boolean[]>([]);
  const customPromptInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isCustomPromptOpen && customPromptInputRef.current) {
      const input = customPromptInputRef.current;
      const focusTimer = window.setTimeout(() => {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }, 0);
      return () => window.clearTimeout(focusTimer);
    }
    return undefined;
  }, [isCustomPromptOpen]);

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

  const regenerateTooltip = isRegenerating ? REGENERATE_TOOLTIP_BUSY : REGENERATE_TOOLTIP_IDLE;

  interface IconButtonWithTooltipProps {
    label: string;
    onClick?: () => void;
    icon: ReactNode;
    disabled?: boolean;
    isActive?: boolean;
    ariaExpanded?: boolean;
  }

  const IconButtonWithTooltip: React.FC<IconButtonWithTooltipProps> = ({
    label,
    onClick,
    icon,
    disabled = false,
    isActive = false,
    ariaExpanded,
  }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const hoverTimer = useRef<number | null>(null);

    const clearTimer = () => {
      if (hoverTimer.current !== null) {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
    };

    const handlePointerEnter = () => {
      if (disabled) return;
      clearTimer();
      hoverTimer.current = window.setTimeout(() => setShowTooltip(true), TOOLTIP_DELAY_MS);
    };

    const handlePointerLeave = () => {
      clearTimer();
      setShowTooltip(false);
    };

    useEffect(() => () => clearTimer(), []);

    return (
      <div className="relative">
        <button
          type="button"
          className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
            disabled
              ? 'border-slate-700/40 bg-slate-900/40 text-slate-500 cursor-not-allowed'
              : isActive
                ? 'border-sky-400/60 bg-slate-900/70 text-sky-200 shadow-md shadow-slate-900/40'
                : 'border-slate-600/40 bg-slate-900/50 text-slate-100 shadow-md shadow-slate-900/30 hover:bg-slate-900/65 hover:border-sky-300/60'
          }`}
          onClick={disabled ? undefined : onClick}
          onMouseEnter={handlePointerEnter}
          onMouseLeave={handlePointerLeave}
          onFocus={() => !disabled && setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
          aria-label={label}
          aria-expanded={ariaExpanded}
          disabled={disabled}
        >
          {icon}
        </button>
        {showTooltip && !disabled && (
          <div className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700/60 bg-slate-950/95 px-3 py-1 text-xs font-medium text-slate-100 shadow-lg shadow-slate-950/40">
            {label}
          </div>
        )}
      </div>
    );
  };

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

  const isInteractionBusy = isRegenerating || isCustomPromptSubmitting;
  const isRegenerateDisabled = !canRegenerate || isRegenerating || isCustomPromptSubmitting;
  const isCustomPromptButtonDisabled = !canRegenerate || isInteractionBusy;
  const shouldRenderCustomPromptInput =
    variant === 'overlay' && isCustomPromptOpen && onCustomPromptChange && onCustomPromptSubmit;

  return (
    <div className={containerClassName}>
      <h3 className={`${titleClassName} ${variant === 'overlay' ? '' : 'mb-2'}`}>
        {selectedChoice ? "Your Choice Was:" : "What happens next?"}
      </h3>
      <div className={gridClassName}>
        {choices.map((choice, index) => {
          const isSelected = choice === selectedChoice;
          const isVisible = visibleChoices[index];
          const shouldDisable = disabled || !!selectedChoice || isInteractionBusy;
          const canHover = !selectedChoice && !disabled && !isInteractionBusy;
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
              <IconButtonWithTooltip
                label={CUSTOM_PROMPT_TOOLTIP}
                onClick={isCustomPromptButtonDisabled ? undefined : onCustomPromptToggle}
                icon={
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
                      d="M5 5h9a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 9h5M9 13h3"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 4l4 4-6.5 6.5L9 15l.5-3.5L16 4z"
                    />
                  </svg>
                }
                disabled={isCustomPromptButtonDisabled}
                isActive={isCustomPromptOpen}
                ariaExpanded={isCustomPromptOpen}
              />
            )}
            {onRegenerate && (
              <IconButtonWithTooltip
                label={regenerateTooltip}
                onClick={isRegenerateDisabled ? undefined : onRegenerate}
                icon={
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
                }
                disabled={isRegenerateDisabled}
              />
            )}
          </div>
        </div>
      )}
      {shouldRenderCustomPromptInput && (
        <form
          className="w-full rounded-xl border border-slate-600/40 bg-slate-900/60 p-4 shadow-lg shadow-slate-900/30 backdrop-blur"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isCustomPromptSubmitting && onCustomPromptSubmit) {
              onCustomPromptSubmit();
            }
          }}
        >
          <label className="mb-2 block text-sm font-semibold text-slate-200">
            {CUSTOM_PROMPT_LABEL}
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <textarea
              ref={customPromptInputRef}
              value={customPromptValue}
              onChange={(event) => onCustomPromptChange?.(event.target.value)}
              placeholder={CUSTOM_PROMPT_PLACEHOLDER}
              className="min-h-[3.5rem] flex-1 resize-none rounded-lg border border-slate-600/60 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none transition-all focus:border-sky-400 focus:ring-1 focus:ring-sky-400/50 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isCustomPromptSubmitting}
            />
            <button
              type="submit"
              className={`inline-flex items-center justify-center gap-2 rounded-lg border border-sky-500/60 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-sky-100 shadow-md shadow-slate-900/30 transition-all ${
                isCustomPromptSubmitting
                  ? 'cursor-wait opacity-70'
                  : 'hover:-translate-y-0.5 hover:border-sky-300 hover:bg-slate-900/80'
              }`}
              disabled={isCustomPromptSubmitting}
            >
              <svg
                className={`h-5 w-5 ${isCustomPromptSubmitting ? 'animate-pulse' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12h14"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 6l6 6-6 6"
                />
              </svg>
              <span>Send</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ChoiceOptions;
