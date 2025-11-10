import React, { useEffect, useState } from 'react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', description: 'Play/Pause current video' },
    { key: '↑ / ↓', description: 'Navigate between segments' },
    { key: '1, 2, 3', description: 'Select choice options' },
    { key: 'S', description: 'Toggle story timeline' },
    { key: 'Esc', description: 'Close dialogs' },
    { key: '?', description: 'Show keyboard shortcuts' },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className={`bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-6 max-w-md w-full transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500 mb-4">
          Keyboard Shortcuts
        </h2>
        
        <div className="space-y-3 mb-6">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-slate-300">{shortcut.description}</span>
              <kbd className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 font-mono text-sm">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;

