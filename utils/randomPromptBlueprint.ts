import { GenerationIntent } from '../types';

interface WeightedEntry<T> {
  value: T;
  weight: number;
}

export interface AdventurePromptBlueprint {
  id: string;
  characterDescriptor: string;
  characterRole: string;
  objective: string;
  location: string;
  trigger: string;
  tone: string;
  styleLabel: string;
  styleDescription: string;
  intent: GenerationIntent;
}

export type ManualBlueprintCategoryKey =
  | 'character'
  | 'objective'
  | 'location'
  | 'trigger'
  | 'tone'
  | 'style';

export interface ManualBlueprintCharacterOption {
  id: string;
  label: string;
  descriptor: string;
  role: string;
}

export interface ManualBlueprintStringOption {
  id: string;
  label: string;
  value: string;
}

export interface ManualBlueprintStyleOption {
  id: string;
  label: string;
  description: string;
}

export type ManualBlueprintOptionMap = {
  character: ManualBlueprintCharacterOption;
  objective: ManualBlueprintStringOption;
  location: ManualBlueprintStringOption;
  trigger: ManualBlueprintStringOption;
  tone: ManualBlueprintStringOption;
  style: ManualBlueprintStyleOption;
};

export type ManualBlueprintSelections = {
  [K in ManualBlueprintCategoryKey]: ManualBlueprintOptionMap[K];
};

export interface ManualBlueprintCategoryDefinition<K extends ManualBlueprintCategoryKey> {
  key: K;
  label: string;
  options: ReadonlyArray<ManualBlueprintOptionMap[K]>;
  pickRandom: () => ManualBlueprintOptionMap[K];
}

type ManualBlueprintCategoryMap = {
  [K in ManualBlueprintCategoryKey]: ManualBlueprintCategoryDefinition<K>;
};

export const TARGET_PROMPT_CHARACTER_LIMIT = 220;

const RECENT_BLUEPRINT_HISTORY_LIMIT = 12;
const RECENT_PROMPT_HISTORY_LIMIT = 16;
const MAX_BLUEPRINT_ATTEMPTS = 9;
const BANNED_TERMS = ['tea', 'tea shop', 'barista', 'café', 'coffee shop'];

const recentBlueprintIds: string[] = [];
const recentPrompts: string[] = [];

interface CharacterArchetype {
  descriptor: string;
  role: string;
}

const CHARACTERS: Array<WeightedEntry<CharacterArchetype>> = [
  { value: { descriptor: 'Determined apprentice', role: 'mage' }, weight: 2 },
  { value: { descriptor: 'Seasoned ranger', role: 'scout' }, weight: 1 },
  { value: { descriptor: 'Quick-thinking mechanic', role: 'starship engineer' }, weight: 2 },
  { value: { descriptor: 'Charismatic captain', role: 'skyship pilot' }, weight: 1 },
  { value: { descriptor: 'Soft-spoken monk', role: 'spirit medium' }, weight: 1 },
  { value: { descriptor: 'Young diplomat', role: 'envoy' }, weight: 1 },
  { value: { descriptor: 'Wary treasure hunter', role: 'archaeologist' }, weight: 2 },
  { value: { descriptor: 'Lone survivor', role: 'wasteland courier' }, weight: 1 },
  { value: { descriptor: 'Curious tinkerer', role: 'inventor' }, weight: 1 },
  { value: { descriptor: 'Fearless stowaway', role: 'smuggler' }, weight: 1 },
  { value: { descriptor: 'Courageous cadet', role: 'dragon rider' }, weight: 1 },
  { value: { descriptor: 'Observant librarian', role: 'lore keeper' }, weight: 1 },
];

const OBJECTIVES: Array<WeightedEntry<string>> = [
  { value: 'secure a coded warning before time runs out', weight: 2 },
  { value: 'find their missing mentor before the mission fails', weight: 2 },
  { value: 'escort a fragile relic to the treaty table', weight: 1 },
  { value: 'gather allies for an expedition at dawn', weight: 1 },
  { value: 'expose sabotage inside the crew', weight: 1 },
  { value: 'prepare for a duel that ends a long feud', weight: 1 },
  { value: 'stop a plague sweeping nearby settlements', weight: 1 },
  { value: 'decode a fading prophecy', weight: 1 },
  { value: 'prove their innocence after a failed heist', weight: 1 },
  { value: 'guide refugees to a safe camp', weight: 1 },
];

const LOCATIONS: Array<WeightedEntry<string>> = [
  { value: 'floating city docks', weight: 2 },
  { value: 'forest village among giant trees', weight: 1 },
  { value: 'frontier starship command deck', weight: 2 },
  { value: 'sunken temple at low tide', weight: 1 },
  { value: 'ancient academy courtyard', weight: 1 },
  { value: 'neon bazaar at midnight', weight: 1 },
  { value: 'desert outpost carved in red stone', weight: 1 },
  { value: 'clifftop over a crystal sea', weight: 1 },
  { value: 'archive stacks fading into dark', weight: 1 },
  { value: 'research station observation dome', weight: 1 },
];

const TRIGGERS: Array<WeightedEntry<string>> = [
  { value: 'alarms signal a breach', weight: 1 },
  { value: 'an old rival brings uneasy news', weight: 1 },
  { value: 'a strange signal cuts through the horizon', weight: 2 },
  { value: 'a trusted ally shows a hidden agenda', weight: 1 },
  { value: 'the final transport is leaving now', weight: 1 },
  { value: 'a storm is about to ground travel', weight: 1 },
  { value: 'the crowd panics at a sharp omen', weight: 1 },
  { value: 'a hidden door slides open', weight: 1 },
  { value: 'authorities close in fast', weight: 1 },
  { value: 'the settlement waits for their call', weight: 1 },
];

const TONES: Array<WeightedEntry<string>> = [
  { value: 'steady and hopeful', weight: 2 },
  { value: 'sharp and tense', weight: 2 },
  { value: 'dry with a hint of danger', weight: 1 },
  { value: 'earnest and focused', weight: 1 },
  { value: 'calm and reverent', weight: 1 },
  { value: 'bright and urgent', weight: 1 },
];

const STYLE_PRESETS: Array<WeightedEntry<{ label: string; description: string }>> = [
  { value: { label: 'Golden Age Fantasy', description: 'bold magic and classic heroics' }, weight: 2 },
  { value: { label: 'Neon Noir', description: 'rainy streets and high-tech intrigue' }, weight: 1 },
  { value: { label: 'Dieselpunk Expedition', description: 'gritty engines and daring missions' }, weight: 1 },
  { value: { label: 'Mystic Eastern Epic', description: 'temples, spirits, and disciplined blades' }, weight: 1 },
  { value: { label: 'Sci-Fantasy Frontier', description: 'new worlds and inventive tech' }, weight: 2 },
  { value: { label: 'Arcane Academy', description: 'students, spells, and rival circles' }, weight: 1 },
  { value: { label: 'Post-Apocalyptic Hopepunk', description: 'resourceful rebuilders with heart' }, weight: 1 },
];

const normalizeIdSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const createOptionId = (prefix: string, raw: string) => {
  const normalized = normalizeIdSegment(raw);
  return normalized ? `${prefix}-${normalized}` : `${prefix}-option`;
};

const createCharacterOption = (archetype: CharacterArchetype): ManualBlueprintCharacterOption => {
  const id = createOptionId('character', `${archetype.descriptor}-${archetype.role}`);
  return {
    id,
    label: `${archetype.descriptor} (${archetype.role})`,
    descriptor: archetype.descriptor,
    role: archetype.role,
  };
};

const createStringOption = (prefix: string, value: string): ManualBlueprintStringOption => {
  const id = createOptionId(prefix, value);
  return {
    id,
    label: value,
    value,
  };
};

const createStyleOption = (style: { label: string; description: string }): ManualBlueprintStyleOption => ({
  id: createOptionId('style', style.label),
  label: style.label,
  description: style.description,
});

const cloneOption = <T>(option: T): T => ({ ...option });

const CHARACTER_OPTIONS: ReadonlyArray<ManualBlueprintCharacterOption> = CHARACTERS.map((entry) =>
  createCharacterOption(entry.value),
);
const OBJECTIVE_OPTIONS: ReadonlyArray<ManualBlueprintStringOption> = OBJECTIVES.map((entry) =>
  createStringOption('objective', entry.value),
);
const LOCATION_OPTIONS: ReadonlyArray<ManualBlueprintStringOption> = LOCATIONS.map((entry) =>
  createStringOption('location', entry.value),
);
const TRIGGER_OPTIONS: ReadonlyArray<ManualBlueprintStringOption> = TRIGGERS.map((entry) =>
  createStringOption('trigger', entry.value),
);
const TONE_OPTIONS: ReadonlyArray<ManualBlueprintStringOption> = TONES.map((entry) =>
  createStringOption('tone', entry.value),
);
const STYLE_OPTIONS: ReadonlyArray<ManualBlueprintStyleOption> = STYLE_PRESETS.map((entry) =>
  createStyleOption(entry.value),
);

const createCharacterKey = (character: CharacterArchetype) => `${character.descriptor}|${character.role}`;

const characterOptionByKey = new Map<string, ManualBlueprintCharacterOption>();
CHARACTER_OPTIONS.forEach((option) => {
  characterOptionByKey.set(createCharacterKey({ descriptor: option.descriptor, role: option.role }), option);
});

const findStringOption = (
  options: ReadonlyArray<ManualBlueprintStringOption>,
  value: string,
  fallbackPrefix: string,
) => {
  const option = options.find((item) => item.value === value);
  return option ?? createStringOption(fallbackPrefix, value);
};

const findStyleOption = (label: string, description: string) => {
  const option = STYLE_OPTIONS.find((item) => item.label === label);
  return option ?? { id: createOptionId('style', label), label, description };
};

const manualCharacterCategory: ManualBlueprintCategoryDefinition<'character'> = {
  key: 'character',
  label: 'Hero',
  options: CHARACTER_OPTIONS,
  pickRandom: () => {
    const value = chooseWeighted(CHARACTERS);
    const stored = characterOptionByKey.get(createCharacterKey(value));
    return cloneOption(stored ?? createCharacterOption(value));
  },
};

const manualObjectiveCategory: ManualBlueprintCategoryDefinition<'objective'> = {
  key: 'objective',
  label: 'Objective',
  options: OBJECTIVE_OPTIONS,
  pickRandom: () => {
    const value = chooseWeighted(OBJECTIVES);
    return cloneOption(findStringOption(OBJECTIVE_OPTIONS, value, 'objective'));
  },
};

const manualLocationCategory: ManualBlueprintCategoryDefinition<'location'> = {
  key: 'location',
  label: 'Location',
  options: LOCATION_OPTIONS,
  pickRandom: () => {
    const value = chooseWeighted(LOCATIONS);
    return cloneOption(findStringOption(LOCATION_OPTIONS, value, 'location'));
  },
};

const manualTriggerCategory: ManualBlueprintCategoryDefinition<'trigger'> = {
  key: 'trigger',
  label: 'Trigger',
  options: TRIGGER_OPTIONS,
  pickRandom: () => {
    const value = chooseWeighted(TRIGGERS);
    return cloneOption(findStringOption(TRIGGER_OPTIONS, value, 'trigger'));
  },
};

const manualToneCategory: ManualBlueprintCategoryDefinition<'tone'> = {
  key: 'tone',
  label: 'Tone',
  options: TONE_OPTIONS,
  pickRandom: () => {
    const value = chooseWeighted(TONES);
    return cloneOption(findStringOption(TONE_OPTIONS, value, 'tone'));
  },
};

const manualStyleCategory: ManualBlueprintCategoryDefinition<'style'> = {
  key: 'style',
  label: 'Style',
  options: STYLE_OPTIONS,
  pickRandom: () => {
    const value = chooseWeighted(STYLE_PRESETS);
    return cloneOption(findStyleOption(value.label, value.description));
  },
};

const MANUAL_CATEGORY_ARRAY = [
  manualCharacterCategory,
  manualObjectiveCategory,
  manualLocationCategory,
  manualTriggerCategory,
  manualToneCategory,
  manualStyleCategory,
] as const;

const MANUAL_CATEGORY_MAP: ManualBlueprintCategoryMap = {
  character: manualCharacterCategory,
  objective: manualObjectiveCategory,
  location: manualLocationCategory,
  trigger: manualTriggerCategory,
  tone: manualToneCategory,
  style: manualStyleCategory,
};

export const MANUAL_BLUEPRINT_CATEGORIES: ReadonlyArray<
  ManualBlueprintCategoryDefinition<ManualBlueprintCategoryKey>
> = MANUAL_CATEGORY_ARRAY;

export const getManualBlueprintCategory = <K extends ManualBlueprintCategoryKey>(
  key: K,
): ManualBlueprintCategoryDefinition<K> => MANUAL_CATEGORY_MAP[key];

export const getRandomManualOption = <K extends ManualBlueprintCategoryKey>(key: K): ManualBlueprintOptionMap[K] =>
  MANUAL_CATEGORY_MAP[key].pickRandom();

export const createRandomManualSelections = (): ManualBlueprintSelections => ({
  character: MANUAL_CATEGORY_MAP.character.pickRandom(),
  objective: MANUAL_CATEGORY_MAP.objective.pickRandom(),
  location: MANUAL_CATEGORY_MAP.location.pickRandom(),
  trigger: MANUAL_CATEGORY_MAP.trigger.pickRandom(),
  tone: MANUAL_CATEGORY_MAP.tone.pickRandom(),
  style: MANUAL_CATEGORY_MAP.style.pickRandom(),
});

export const buildBlueprintFromManualSelections = (
  selections: ManualBlueprintSelections,
): AdventurePromptBlueprint => {
  const base: Omit<AdventurePromptBlueprint, 'id'> = {
    characterDescriptor: selections.character.descriptor,
    characterRole: selections.character.role,
    objective: selections.objective.value,
    location: selections.location.value,
    trigger: selections.trigger.value,
    tone: selections.tone.value,
    styleLabel: selections.style.label,
    styleDescription: selections.style.description,
    intent: 'initial',
  };
  const id = createBlueprintId(base);
  return { ...base, id };
};

export const createSelectionsFromBlueprint = (
  blueprint: AdventurePromptBlueprint,
): ManualBlueprintSelections => ({
  character:
    characterOptionByKey.get(createCharacterKey({ descriptor: blueprint.characterDescriptor, role: blueprint.characterRole })) ??
    createCharacterOption({ descriptor: blueprint.characterDescriptor, role: blueprint.characterRole }),
  objective: findStringOption(OBJECTIVE_OPTIONS, blueprint.objective, 'objective'),
  location: findStringOption(LOCATION_OPTIONS, blueprint.location, 'location'),
  trigger: findStringOption(TRIGGER_OPTIONS, blueprint.trigger, 'trigger'),
  tone: findStringOption(TONE_OPTIONS, blueprint.tone, 'tone'),
  style: findStyleOption(blueprint.styleLabel, blueprint.styleDescription),
});

const chooseWeighted = <T,>(entries: Array<WeightedEntry<T>>): T => {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const threshold = Math.random() * totalWeight;
  let cumulative = 0;

  for (const entry of entries) {
    cumulative += entry.weight;
    if (threshold <= cumulative) {
      return entry.value;
    }
  }

  return entries[entries.length - 1].value;
};

const createBlueprintId = (blueprint: Omit<AdventurePromptBlueprint, 'id'>) =>
  [
    blueprint.characterDescriptor,
    blueprint.characterRole,
    blueprint.objective,
    blueprint.location,
    blueprint.trigger,
  ].join('|');

const pushWithLimit = (list: string[], value: string, limit: number) => {
  list.push(value);
  if (list.length > limit) {
    list.shift();
  }
};

export const getNextBlueprint = (): AdventurePromptBlueprint => {
  for (let attempt = 0; attempt < MAX_BLUEPRINT_ATTEMPTS; attempt += 1) {
    const character = chooseWeighted(CHARACTERS);
    const objective = chooseWeighted(OBJECTIVES);
    const location = chooseWeighted(LOCATIONS);
    const trigger = chooseWeighted(TRIGGERS);
    const tone = chooseWeighted(TONES);
    const style = chooseWeighted(STYLE_PRESETS);

    const blueprintCandidate: Omit<AdventurePromptBlueprint, 'id'> = {
      characterDescriptor: character.descriptor,
      characterRole: character.role,
      objective,
      location,
      trigger,
      tone,
      styleLabel: style.label,
      styleDescription: style.description,
      intent: 'initial',
    };

    const candidateId = createBlueprintId(blueprintCandidate);

    if (!recentBlueprintIds.includes(candidateId)) {
      pushWithLimit(recentBlueprintIds, candidateId, RECENT_BLUEPRINT_HISTORY_LIMIT);
      return { ...blueprintCandidate, id: candidateId };
    }
  }

  const character = chooseWeighted(CHARACTERS);
  const objective = chooseWeighted(OBJECTIVES);
  const location = chooseWeighted(LOCATIONS);
  const trigger = chooseWeighted(TRIGGERS);
  const tone = chooseWeighted(TONES);
  const style = chooseWeighted(STYLE_PRESETS);
  const fallback: Omit<AdventurePromptBlueprint, 'id'> = {
    characterDescriptor: character.descriptor,
    characterRole: character.role,
    objective,
    location,
    trigger,
    tone,
    styleLabel: style.label,
    styleDescription: style.description,
    intent: 'initial',
  };
  const id = createBlueprintId(fallback);
  pushWithLimit(recentBlueprintIds, id, RECENT_BLUEPRINT_HISTORY_LIMIT);
  return { ...fallback, id };
};

const capitalizeFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const renderPromptFromBlueprint = (blueprint: AdventurePromptBlueprint): string => {
  const intro = `${capitalizeFirst(blueprint.characterDescriptor)} ${blueprint.characterRole}`;
  const firstSentence = `${intro} must ${blueprint.objective}.`;
  const detailedSecondSentence = `At ${blueprint.location}, ${blueprint.trigger} while keeping a ${blueprint.tone} tone.`;
  let prompt = `${firstSentence} ${detailedSecondSentence}`;

  if (prompt.length > TARGET_PROMPT_CHARACTER_LIMIT) {
    const compactSecondSentence = `At ${blueprint.location}, ${blueprint.trigger}.`;
    prompt = `${firstSentence} ${compactSecondSentence}`;
  }

  return prompt;
};

export const buildFreeformGeminiInstruction = (): string => {
  return [
    'Imagine you are crafting a cinematic hook for a brand-new interactive adventure video.',
    `Write two short sentences totaling fewer than ${TARGET_PROMPT_CHARACTER_LIMIT} characters.`,
    'Return exactly one prompt composed of two sentences—do not number, label, or provide alternatives.',
    'Present a distinct main character with a vivid descriptor and role, establish the environment, and hint at the immediate tension.',
    'Keep the language concrete and playable while avoiding any mention of tea, cafes, or shopkeeping.',
    'Answer with the finished prompt only—no lists, headers, or commentary.',
  ].join(' ');
};

export const buildGeminiInstruction = (blueprint: AdventurePromptBlueprint): string => {
  return [
    'Write two short sentences for an interactive adventure hook.',
    'Use second-person or close third-person voice.',
    `Sentence 1 must introduce the hero as "${capitalizeFirst(blueprint.characterDescriptor)} ${blueprint.characterRole}" and state that they must ${blueprint.objective}.`,
    `Sentence 2 must place the scene at ${blueprint.location} and note that ${blueprint.trigger} while keeping a ${blueprint.tone} tone.`,
    `Stay in the spirit of the "${blueprint.styleLabel}" style, described as ${blueprint.styleDescription}.`,
    `Keep the total length below ${TARGET_PROMPT_CHARACTER_LIMIT} characters.`,
    'Stay concrete and playable; avoid filler or vague language.',
    'Avoid mentioning tea, cafes, or shopkeeping.',
    'Return only the prompt text without quotes.',
  ].join(' ');
};

export const shouldRejectGeneratedPrompt = (prompt: string): boolean => {
  if (!prompt) {
    return true;
  }
  const lower = prompt.toLowerCase();
  if (BANNED_TERMS.some((term) => lower.includes(term))) {
    return true;
  }
  if (recentPrompts.some((recent) => recent.toLowerCase() === lower)) {
    return true;
  }
  return false;
};

export const registerGeneratedPrompt = (prompt: string) => {
  if (!prompt) {
    return;
  }
  pushWithLimit(recentPrompts, prompt, RECENT_PROMPT_HISTORY_LIMIT);
};

export const createManualRandomPrompt = (): string => {
  const blueprint = getNextBlueprint();
  const prompt = renderPromptFromBlueprint(blueprint);
  registerGeneratedPrompt(prompt);
  return prompt;
};

