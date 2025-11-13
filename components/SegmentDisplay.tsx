import React from 'react';
import { GameState, VideoSegment } from '../types';
import VideoPlayer from './VideoPlayer';
import ChoiceOptions from './ChoiceOptions';
import { getNarrativeTypeById } from '../config/narrativeTypes';

interface SegmentDisplayProps {
  segment: VideoSegment;
  index: number;
  isCurrent: boolean;
  isLast: boolean;
  gameState: GameState;
  onSegmentSelect: () => void;
  onVideoEnd: (videoElement: HTMLVideoElement) => void;
  onVideoProgress?: (currentTime: number, duration: number) => void;
  onChoiceSelect: (choice: string) => void;
  onRegenerateChoices?: () => void;
  canRegenerateChoices: boolean;
  isRegeneratingChoices: boolean;
  regenerationError?: string | null;
  isChoiceLoading?: boolean;
  choiceLoadingTitle?: string;
  isCustomPromptOpen?: boolean;
  onCustomPromptToggle?: () => void;
  customPromptValue?: string;
  onCustomPromptChange?: (value: string) => void;
  onCustomPromptSubmit?: () => void;
  isCustomPromptSubmitting?: boolean;
  isGlobalMuted?: boolean;
}

const SegmentDisplay: React.FC<SegmentDisplayProps> = ({
  segment,
  index,
  isCurrent,
  isLast,
  gameState,
  onSegmentSelect,
  onVideoEnd,
  onVideoProgress,
  onChoiceSelect,
  onRegenerateChoices,
  canRegenerateChoices,
  isRegeneratingChoices,
  regenerationError = null,
  isChoiceLoading = false,
  choiceLoadingTitle = '',
  isCustomPromptOpen = false,
  onCustomPromptToggle,
  customPromptValue = '',
  onCustomPromptChange,
  onCustomPromptSubmit,
  isCustomPromptSubmitting = false,
  isGlobalMuted = false,
}) => {
  const promptLabel = index === 0 ? 'You began with:' : 'Then you chose:';
  const shouldShowOverlay = isCurrent && (segment.choices || isChoiceLoading);
  const narrativeType = segment.narrativeType ? getNarrativeTypeById(segment.narrativeType) : null;

  return (
    <div
      className={`relative w-full transition-all duration-500 ${
        isCurrent ? 'max-w-5xl' : 'max-w-3xl opacity-70 hover:opacity-100'
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <p className="text-center text-slate-400 italic">
          {promptLabel} "{segment.prompt}"
        </p>
        {narrativeType && (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-900/30 border border-indigo-700/50 rounded text-indigo-300"
            title={narrativeType.description}
          >
            {narrativeType.icon}
          </span>
        )}
      </div>
      <VideoPlayer
        videoSegment={segment}
        onVideoEnd={onVideoEnd}
        onProgress={onVideoProgress}
        isCurrent={isCurrent}
        segmentIndex={index}
        onClick={onSegmentSelect}
        isGlobalMuted={isGlobalMuted}
      />

      {shouldShowOverlay && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-4xl">
            {isChoiceLoading ? (
              <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-2xl bg-slate-950/40 px-6 py-5 shadow-xl shadow-slate-950/40 border border-slate-700/40 backdrop-blur">
                <div className="h-10 w-10 rounded-full border-4 border-sky-400/70 border-t-transparent animate-spin" />
                <div className="text-center text-sm font-medium text-slate-200">
                  {choiceLoadingTitle || 'Imagining what comes next...'}
                </div>
              </div>
            ) : (
              segment.choices && (
                <ChoiceOptions
                  choices={segment.choices}
                  onChoiceSelect={onChoiceSelect}
                  disabled={!isLast || gameState !== GameState.CHOICES}
                  selectedChoice={segment.selectedChoice}
                  variant="overlay"
                  onRegenerate={onRegenerateChoices}
                  canRegenerate={canRegenerateChoices}
                  isRegenerating={isRegeneratingChoices}
                  errorMessage={regenerationError}
                  onCustomPromptToggle={onCustomPromptToggle}
                  isCustomPromptOpen={isCustomPromptOpen}
                  customPromptValue={customPromptValue}
                  onCustomPromptChange={onCustomPromptChange}
                  onCustomPromptSubmit={onCustomPromptSubmit}
                  isCustomPromptSubmitting={isCustomPromptSubmitting}
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SegmentDisplay;

