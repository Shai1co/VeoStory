import React from 'react';

interface JumpToLatestProps {
  isVisible: boolean;
  onClick: () => void;
}

const JumpToLatest: React.FC<JumpToLatestProps> = ({ isVisible, onClick }) => {
  if (!isVisible) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 z-30 bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 px-6 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center gap-2 animate-bounce-subtle"
    >
      <span>Jump to Latest</span>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </button>
  );
};

export default JumpToLatest;

