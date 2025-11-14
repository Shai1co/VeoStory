import React, { useState } from 'react';
import { VideoGeneration } from '../types';

interface GenerationSelectorProps {
  generations: Array<VideoGeneration & { videoUrl: string }>; // Generations with blob URLs
  activeGenerationId: string;
  onSelectGeneration: (generationId: string) => void;
  onDeleteGeneration: (generationId: string) => void;
  onRegenerateVideo: () => void;
  isRegenerating?: boolean;
  segmentIndex: number;
}

const GenerationSelector: React.FC<GenerationSelectorProps> = ({
  generations,
  activeGenerationId,
  onSelectGeneration,
  onDeleteGeneration,
  onRegenerateVideo,
  isRegenerating = false,
  segmentIndex,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!generations || generations.length === 0) {
    return null;
  }

  const activeGeneration = generations.find(g => g.generationId === activeGenerationId);
  const activeIndex = generations.findIndex(g => g.generationId === activeGenerationId);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleDelete = (generationId: string) => {
    if (confirmDelete === generationId) {
      onDeleteGeneration(generationId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(generationId);
      // Auto-cancel after 3 seconds
      setTimeout(() => {
        setConfirmDelete(null);
      }, 3000);
    }
  };

  return (
    <div className="absolute top-2 right-2 z-10">
      {/* Compact button when collapsed */}
      {!isExpanded && (
        <div className="flex items-center gap-2">
          {generations.length > 1 && (
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 rounded-lg border border-slate-600/50 shadow-lg backdrop-blur transition-colors"
              title={`${generations.length} versions available`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span className="text-xs">{activeIndex + 1}/{generations.length}</span>
            </button>
          )}
          
          <button
            onClick={onRegenerateVideo}
            disabled={isRegenerating}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-indigo-600/90 hover:bg-indigo-500/90 disabled:bg-slate-700/50 text-white rounded-lg shadow-lg backdrop-blur transition-colors disabled:cursor-not-allowed"
            title="Regenerate this video"
          >
            <svg 
              className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRegenerating ? 'Generating...' : 'Regenerate'}
          </button>
        </div>
      )}

      {/* Expanded panel */}
      {isExpanded && (
        <div className="w-80 bg-slate-900/95 backdrop-blur rounded-lg border border-slate-700/50 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <h3 className="text-sm font-semibold text-slate-200">
                Video Versions ({generations.length})
              </h3>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Regenerate button */}
          <div className="p-3 border-b border-slate-700/50">
            <button
              onClick={onRegenerateVideo}
              disabled={isRegenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700/50 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              <svg 
                className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRegenerating ? 'Generating New Version...' : 'Generate New Version'}
            </button>
          </div>

          {/* Generation list */}
          <div className="max-h-96 overflow-y-auto">
            {generations.slice().reverse().map((generation, reverseIdx) => {
              const idx = generations.length - 1 - reverseIdx;
              const isActive = generation.generationId === activeGenerationId;
              const isConfirmingDelete = confirmDelete === generation.generationId;

              return (
                <div
                  key={generation.generationId}
                  className={`relative border-b border-slate-700/30 last:border-b-0 ${
                    isActive ? 'bg-indigo-900/20' : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="p-3">
                    {/* Thumbnail and info */}
                    <div className="flex items-start gap-3">
                      {/* Video thumbnail */}
                      <div className="relative flex-shrink-0">
                        <video
                          src={generation.videoUrl}
                          className="w-20 h-14 object-cover rounded border border-slate-700/50"
                          muted
                          playsInline
                        />
                        {isActive && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-300">
                            Version {idx + 1}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {formatDate(generation.createdAt)}
                        </p>
                        {generation.model && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {generation.model}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1">
                        {!isActive && (
                          <>
                            <button
                              onClick={() => onSelectGeneration(generation.generationId)}
                              className="px-2 py-1 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
                              title="Use this version"
                            >
                              Use
                            </button>
                            <button
                              onClick={() => handleDelete(generation.generationId)}
                              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                                isConfirmingDelete
                                  ? 'bg-red-600 hover:bg-red-500 text-white'
                                  : 'bg-slate-700/50 hover:bg-red-600/20 text-slate-400 hover:text-red-400'
                              }`}
                              title={isConfirmingDelete ? 'Click again to confirm' : 'Delete this version'}
                            >
                              {isConfirmingDelete ? 'Confirm?' : 'Delete'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer info */}
          <div className="p-3 border-t border-slate-700/50 bg-slate-950/50">
            <p className="text-xs text-slate-400 text-center">
              Segment #{segmentIndex + 1} • {generations.length} version{generations.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerationSelector;

