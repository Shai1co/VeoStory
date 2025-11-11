import React, { useEffect, useMemo, useState } from 'react';
import {
  MANUAL_BLUEPRINT_CATEGORIES,
  ManualBlueprintCategoryDefinition,
  ManualBlueprintCategoryKey,
  ManualBlueprintOptionMap,
  ManualBlueprintSelections,
  buildBlueprintFromManualSelections,
  createRandomManualSelections,
  getManualBlueprintCategory,
  getRandomManualOption,
  renderPromptFromBlueprint,
} from '../utils/randomPromptBlueprint';

interface ManualPromptBuilderProps {
  initialSelections?: ManualBlueprintSelections;
  onApply: (selections: ManualBlueprintSelections) => void;
  onCancel: () => void;
}

const cloneSelections = (source: ManualBlueprintSelections): ManualBlueprintSelections => {
  const next = {} as ManualBlueprintSelections;
  MANUAL_BLUEPRINT_CATEGORIES.forEach((category) => {
    next[category.key] = { ...source[category.key] } as ManualBlueprintOptionMap[typeof category.key];
  });
  return next;
};

const ManualPromptBuilder: React.FC<ManualPromptBuilderProps> = ({
  initialSelections,
  onApply,
  onCancel,
}) => {
  const [selections, setSelections] = useState<ManualBlueprintSelections>(() =>
    initialSelections ? cloneSelections(initialSelections) : createRandomManualSelections(),
  );

  useEffect(() => {
    if (initialSelections) {
      setSelections(cloneSelections(initialSelections));
    }
  }, [initialSelections]);

  const blueprintPreview = useMemo(
    () => buildBlueprintFromManualSelections(selections),
    [selections],
  );

  const promptPreview = useMemo(() => renderPromptFromBlueprint(blueprintPreview), [blueprintPreview]);

  const handleSelectOption = <K extends ManualBlueprintCategoryKey>(key: K, optionId: string) => {
    const category = getManualBlueprintCategory(key);
    const selectedOption = category.options.find((option) => option.id === optionId);
    if (!selectedOption) {
      return;
    }
    setSelections((previous) => ({
      ...previous,
      [key]: { ...selectedOption },
    }));
  };

  const handleRandomizeCategory = <K extends ManualBlueprintCategoryKey>(key: K) => {
    setSelections((previous) => ({
      ...previous,
      [key]: getRandomManualOption(key),
    }));
  };

  const handleRandomizeAll = () => {
    setSelections(createRandomManualSelections());
  };

  const handleReset = () => {
    if (initialSelections) {
      setSelections(cloneSelections(initialSelections));
      return;
    }
    setSelections(createRandomManualSelections());
  };

  const handleApply = () => {
    onApply(cloneSelections(selections));
  };

  const renderOptionDetails = (
    category: ManualBlueprintCategoryDefinition<ManualBlueprintCategoryKey>,
  ) => {
    const selected = selections[category.key];
    if (category.key === 'character') {
      return (
        <p className="mt-2 text-xs text-slate-400">
          {selected.descriptor} - role: {selected.role}
        </p>
      );
    }
    if (category.key === 'style') {
      return (
        <>
          <p className="mt-2 text-xs text-slate-300 font-semibold">{selected.label}</p>
          <p className="mt-1 text-xs text-slate-400">{selected.description}</p>
        </>
      );
    }
    return (
      <p className="mt-2 text-xs text-slate-400">
        {selected.value}
      </p>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-200">Manual Prompt Builder</h3>
          <p className="text-sm text-slate-400">
            Mix and match story elements or randomize individual categories for fine control.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleRandomizeAll}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"
          >
            🎲 Randomize All
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {MANUAL_BLUEPRINT_CATEGORIES.map((category) => (
          <div
            key={category.key}
            className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="text-lg font-semibold text-slate-200">{category.label}</h4>
              <button
                type="button"
                onClick={() => handleRandomizeCategory(category.key)}
                className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-full transition-colors"
              >
                Random
              </button>
            </div>
            <label className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Choose Option
            </label>
            <select
              value={selections[category.key].id}
              onChange={(event) => handleSelectOption(category.key, event.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {category.options.map((option) => {
                const optionLabel =
                  category.key === 'character'
                    ? option.label
                    : category.key === 'style'
                    ? `${option.label} - ${option.description}`
                    : option.label;
                return (
                  <option key={option.id} value={option.id}>
                    {optionLabel}
                  </option>
                );
              })}
            </select>
            {renderOptionDetails(category)}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-semibold text-slate-200">Prompt Preview</h4>
          <span className="text-xs text-slate-400">
            {promptPreview.length} characters
          </span>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">{promptPreview}</p>
        <p className="mt-2 text-xs text-slate-500">
          Style: {selections.style.label} - {selections.style.description}
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-6 py-2 text-sm font-bold rounded-lg bg-sky-600 text-white hover:bg-sky-500 transition-colors"
        >
          Apply Prompt
        </button>
      </div>
    </div>
  );
};

export default ManualPromptBuilder;

