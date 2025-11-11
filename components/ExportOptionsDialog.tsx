import React from 'react';

interface ExportOptionsDialogProps {
  onExportWithOverlays: () => void;
  onExportSimple: () => void;
  onCancel: () => void;
}

const ExportOptionsDialog: React.FC<ExportOptionsDialogProps> = ({
  onExportWithOverlays,
  onExportSimple,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-6 max-w-2xl mx-4 smooth-transition scale-in">
        <h2 className="text-2xl font-bold text-slate-100 mb-4">
          Choose Export Mode
        </h2>
        
        <p className="text-slate-300 mb-6">
          How would you like to export your video?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Export with Overlays Option */}
          <button
            onClick={onExportWithOverlays}
            className="group relative bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30"
          >
            <div className="flex flex-col items-center text-center">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
              <h3 className="text-lg font-bold mb-2">With Choice Overlays</h3>
              <p className="text-sm text-purple-100">
                Show choices on screen and highlight your selections with animations
              </p>
              <div className="mt-3 px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                Recommended
              </div>
            </div>
          </button>

          {/* Export Simple Option */}
          <button
            onClick={onExportSimple}
            className="group relative bg-slate-700 hover:bg-slate-600 text-white rounded-lg p-6 transition-all duration-300 transform hover:scale-105 hover:shadow-xl border border-slate-600"
          >
            <div className="flex flex-col items-center text-center">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-bold mb-2">Simple Export</h3>
              <p className="text-sm text-slate-300">
                Just the videos without any overlays or choice displays
              </p>
              <div className="mt-3 px-3 py-1 bg-slate-600 rounded-full text-xs font-medium">
                Faster
              </div>
            </div>
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-slate-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportOptionsDialog;

