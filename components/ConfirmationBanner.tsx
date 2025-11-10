import React, { useEffect, useState } from 'react';

interface ConfirmationBannerProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'info' | 'error';
}

const ConfirmationBanner: React.FC<ConfirmationBannerProps> = ({ 
  message, 
  onConfirm, 
  onCancel, 
  type = 'warning' 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleConfirm = () => {
    setIsVisible(false);
    setTimeout(onConfirm, 300);
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(onCancel, 300);
  };

  const bgColor = {
    warning: 'bg-amber-600/95',
    info: 'bg-blue-600/95',
    error: 'bg-red-600/95'
  }[type];

  const borderColor = {
    warning: 'border-amber-400',
    info: 'border-blue-400',
    error: 'border-red-400'
  }[type];

  return (
    <div 
      className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className={`${bgColor} ${borderColor} border-2 backdrop-blur-sm rounded-lg shadow-2xl p-4 flex items-center gap-4 min-w-[400px] max-w-[600px]`}>
        <div className="flex-grow text-white font-medium">
          {message}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-lg font-semibold transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationBanner;

