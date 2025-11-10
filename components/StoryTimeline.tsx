import React, { useState } from 'react';
import { VideoSegment } from '../types';

interface StoryTimelineProps {
  segments: VideoSegment[];
  currentSegmentId: number | null;
  onSegmentClick: (segmentId: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const StoryTimeline: React.FC<StoryTimelineProps> = ({ 
  segments, 
  currentSegmentId, 
  onSegmentClick,
  isOpen,
  onToggle
}) => {
  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed left-4 top-24 z-40 bg-slate-800 hover:bg-slate-700 text-slate-200 p-3 rounded-lg shadow-lg transition-all duration-300 border border-slate-600 hover:border-sky-500"
        title="Toggle Story Timeline (S)"
      >
        <svg 
          className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-full bg-slate-900/95 backdrop-blur-md border-r border-slate-700 z-30 smooth-transition overflow-hidden ${
          isOpen ? 'w-80' : 'w-0'
        }`}
      >
        <div className="p-4 pt-24 h-full overflow-y-auto smooth-transition">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500 mb-4">
            Story Timeline
          </h2>
          
          {segments.length === 0 ? (
            <p className="text-slate-400 text-sm">No story segments yet...</p>
          ) : (
            <div className="space-y-3">
              {segments.map((segment, index) => {
                const isCurrent = segment.id === currentSegmentId;
                const hasChoices = segment.choices && segment.choices.length > 0;
                
                return (
                  <div key={segment.id} className="relative">
                    {/* Connector line */}
                    {index < segments.length - 1 && (
                      <div className="absolute left-4 top-16 w-0.5 h-8 bg-slate-600" />
                    )}
                    
                    <button
                      onClick={() => onSegmentClick(segment.id)}
                      className={`w-full text-left rounded-lg p-3 smooth-transition-fast ${
                        isCurrent 
                          ? 'bg-sky-600/30 border-2 border-sky-400 shadow-lg scale-in' 
                          : 'bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Segment Number */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isCurrent 
                            ? 'bg-sky-500 text-white' 
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {index + 1}
                        </div>
                        
                        {/* Segment Info */}
                        <div className="flex-grow min-w-0">
                          <p className={`text-xs mb-1 ${
                            isCurrent ? 'text-sky-300' : 'text-slate-500'
                          }`}>
                            {index === 0 ? 'Opening' : 'Choice Made'}
                          </p>
                          <p className={`text-sm line-clamp-2 ${
                            isCurrent ? 'text-slate-100' : 'text-slate-300'
                          }`}>
                            {segment.prompt}
                          </p>
                          
                          {/* Choice indicator */}
                          {hasChoices && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              {segment.selectedChoice ? 'Continued' : `${segment.choices.length} choices`}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default StoryTimeline;

