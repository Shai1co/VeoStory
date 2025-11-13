import { generateChoices } from '../services/veoService';
import { validateChoices, checkChoiceDiversity } from './choiceQuality';

const MAX_DISTINCT_CHOICE_ATTEMPTS = 5;
const BASE_TEMPERATURE = 0.8;
const TEMPERATURE_INCREMENT = 0.075;
const MAX_TEMPERATURE = 1.15;

const normalizeChoice = (value: string) => value.trim().toLowerCase();

const hasAnyNewChoice = (candidate: string[], previous: Set<string>) =>
  candidate.some(choice => !previous.has(normalizeChoice(choice)));

const hasAllNewChoices = (candidate: string[], previous: Set<string>) =>
  candidate.every(choice => !previous.has(normalizeChoice(choice)));

interface DistinctChoiceRequest {
  storyContext: string;
  lastFrameDataUrl?: string | null;
  previousChoices: string[];
  progressionHints?: string[];
  recentChoiceTypes?: string[];
  storyPhase?: string;
}

/**
 * Calculates temperature for the current attempt
 * Gradually increases temperature to get more creative/different results
 */
const calculateTemperature = (attemptNumber: number): number => {
  const temperature = BASE_TEMPERATURE + (attemptNumber * TEMPERATURE_INCREMENT);
  return Math.min(temperature, MAX_TEMPERATURE);
};

/**
 * Builds anti-patterns list based on previous choices and attempt number
 */
const buildAntiPatterns = (previousChoices: string[], attemptNumber: number): string[] => {
  const antiPatterns: string[] = [];
  
  // Add previous choices as anti-patterns
  if (previousChoices.length > 0) {
    antiPatterns.push(...previousChoices.map(c => `"${c}" (or similar wording)`));
  }
  
  // Add stronger warnings on later attempts
  if (attemptNumber >= 2) {
    antiPatterns.push('Any variation of previously suggested actions');
    antiPatterns.push('Similar sentence structures to what was already offered');
  }
  
  if (attemptNumber >= 3) {
    antiPatterns.push('CRITICAL: Be radically different - use completely different verbs, locations, and approaches');
  }
  
  return antiPatterns;
};

export const fetchDistinctChoices = async ({
  storyContext,
  lastFrameDataUrl,
  previousChoices,
  progressionHints = [],
  recentChoiceTypes = [],
  storyPhase = 'ongoing',
}: DistinctChoiceRequest): Promise<string[]> => {
  const previousChoiceSet = new Set(previousChoices.map(normalizeChoice));
  let fallbackChoices: string[] | null = null;
  const failedAttempts: string[][] = []; // Track all failed attempts

  for (let attempt = 0; attempt < MAX_DISTINCT_CHOICE_ATTEMPTS; attempt += 1) {
    const temperature = calculateTemperature(attempt);
    // Include both previous choices AND all failed attempts from this generation session
    const allChoicesToAvoid = [
      ...previousChoices,
      ...failedAttempts.flat()
    ];
    const antiPatterns = buildAntiPatterns(allChoicesToAvoid, attempt);
    
    console.log(`Choice generation attempt ${attempt + 1}/${MAX_DISTINCT_CHOICE_ATTEMPTS} (temperature: ${temperature.toFixed(2)})`);
    if (failedAttempts.length > 0) {
      console.log(`Avoiding ${failedAttempts.flat().length} previously generated choices from this session`);
    }
    
    const candidate = await generateChoices(storyContext, lastFrameDataUrl, {
      temperature,
      antiPatterns,
      progressionHints,
      recentChoiceTypes,
      storyPhase,
    });
    
    // Validate choice quality
    const qualityCheck = validateChoices(candidate);
    if (!qualityCheck.valid) {
      console.log(`✗ Quality check failed - ${qualityCheck.scores.filter(s => s.score < 50).length} low-quality choices`);
      failedAttempts.push(candidate); // Track failed attempt
      continue; // Try again with higher temperature
    }
    
    // Check diversity between choices
    const isDiverse = checkChoiceDiversity(candidate);
    if (!isDiverse) {
      console.log('✗ Choices lack diversity - retrying');
      failedAttempts.push(candidate); // Track failed attempt
      continue;
    }
    
    const normalizedCandidate = candidate.map(normalizeChoice);

    // If no previous choices, accept immediately
    if (previousChoiceSet.size === 0) {
      console.log('✓ First choice generation - accepted (quality passed)');
      return candidate;
    }

    // Check if all choices are new
    if (hasAllNewChoices(candidate, previousChoiceSet)) {
      console.log('✓ All choices are new - accepted');
      return candidate;
    }

    // Keep as fallback if it has at least some new choices
    if (!fallbackChoices && hasAnyNewChoice(candidate, previousChoiceSet)) {
      fallbackChoices = candidate;
      console.log('↻ Some new choices found - keeping as fallback');
    }

    // Check if completely identical
    const candidateIsRepeated =
      normalizedCandidate.length === previousChoices.length &&
      normalizedCandidate.every(choice => previousChoiceSet.has(choice));

    if (!candidateIsRepeated && hasAnyNewChoice(candidate, previousChoiceSet)) {
      if (!fallbackChoices) {
        fallbackChoices = candidate;
        console.log('↻ Partial match found - keeping as fallback');
      }
      // Track this as a failed attempt since it has duplicates
      failedAttempts.push(candidate);
    } else if (candidateIsRepeated) {
      console.log('✗ Exact duplicate detected - retrying with higher temperature');
      failedAttempts.push(candidate); // Track failed attempt
    }
  }

  if (fallbackChoices) {
    console.log('⚠ Using fallback choices (had some new options)');
    return fallbackChoices;
  }

  console.error('✗ Failed to generate distinct choices after all attempts');
  throw new Error('Unable to generate distinct choices after multiple attempts.');
};

