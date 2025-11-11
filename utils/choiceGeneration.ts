import { generateChoices } from '../services/veoService';

const MAX_DISTINCT_CHOICE_ATTEMPTS = 5;

const normalizeChoice = (value: string) => value.trim().toLowerCase();

const hasAnyNewChoice = (candidate: string[], previous: Set<string>) =>
  candidate.some(choice => !previous.has(normalizeChoice(choice)));

const hasAllNewChoices = (candidate: string[], previous: Set<string>) =>
  candidate.every(choice => !previous.has(normalizeChoice(choice)));

interface DistinctChoiceRequest {
  storyContext: string;
  lastFrameDataUrl?: string | null;
  previousChoices: string[];
}

export const fetchDistinctChoices = async ({
  storyContext,
  lastFrameDataUrl,
  previousChoices,
}: DistinctChoiceRequest): Promise<string[]> => {
  const previousChoiceSet = new Set(previousChoices.map(normalizeChoice));
  let fallbackChoices: string[] | null = null;

  for (let attempt = 0; attempt < MAX_DISTINCT_CHOICE_ATTEMPTS; attempt += 1) {
    const candidate = await generateChoices(storyContext, lastFrameDataUrl);
    const normalizedCandidate = candidate.map(normalizeChoice);

    if (previousChoiceSet.size === 0) {
      return candidate;
    }

    if (hasAllNewChoices(candidate, previousChoiceSet)) {
      return candidate;
    }

    if (!fallbackChoices && hasAnyNewChoice(candidate, previousChoiceSet)) {
      fallbackChoices = candidate;
    }

    const candidateIsRepeated =
      normalizedCandidate.length === previousChoices.length &&
      normalizedCandidate.every(choice => previousChoiceSet.has(choice));

    if (!candidateIsRepeated && hasAnyNewChoice(candidate, previousChoiceSet)) {
      fallbackChoices = candidate;
    }
  }

  if (fallbackChoices) {
    return fallbackChoices;
  }

  throw new Error('Unable to generate distinct choices after multiple attempts.');
};

