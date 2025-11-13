import React from 'react';
import { NARRATIVE_TYPES, NarrativeType } from '../config/narrativeTypes';

interface NarrativeTypeSelectorProps {
  selectedType: NarrativeType | null;
  onTypeChange: (type: NarrativeType) => void;
  disabled?: boolean;
}

const NarrativeTypeSelector: React.FC<NarrativeTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  disabled = false,
}) => {
  return (
    <div className="mb-4 fade-in-up">
      <label className="block text-slate-300 text-sm font-semibold mb-3">
        Choose Narrative Type:
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {NARRATIVE_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => onTypeChange(type)}
            disabled={disabled}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              selectedType?.id === type.id
                ? 'bg-indigo-500 text-white ring-2 ring-indigo-400 shadow-lg scale-105'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:border-indigo-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={type.description}
          >
            <span className="mr-1">{type.icon}</span>
            {type.name}
          </button>
        ))}
      </div>
      {selectedType && (
        <p className="mt-2 text-xs text-slate-400 italic">
          {selectedType.description}
        </p>
      )}
    </div>
  );
};

export default NarrativeTypeSelector;

