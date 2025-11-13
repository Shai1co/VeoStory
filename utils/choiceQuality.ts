/**
 * Choice Quality Validation
 * Scores and filters choices to ensure they are action-oriented and story-advancing
 */

interface ChoiceScore {
  choice: string;
  score: number;
  reasons: string[];
}

const STRONG_ACTION_VERBS = [
  'sprint', 'charge', 'leap', 'climb', 'strike', 'confront', 'battle',
  'investigate', 'examine', 'discover', 'explore', 'search', 'uncover',
  'sneak', 'dodge', 'evade', 'hide', 'ambush', 'pursue',
  'summon', 'cast', 'transform', 'conjure', 'enchant',
  'break', 'shatter', 'destroy', 'build', 'create',
  'rescue', 'defend', 'protect', 'attack', 'challenge'
];

const WEAK_ACTION_VERBS = [
  'go', 'look', 'see', 'try', 'think', 'consider',
  'wonder', 'feel', 'seem', 'appear', 'be', 'stay'
];

const PASSIVE_PATTERNS = [
  /wait and see/i,
  /look around/i,
  /go back/i,
  /return to/i,
  /stay here/i,
  /do nothing/i,
  /stand still/i,
  /remain in place/i,
];

const CIRCULAR_PATTERNS = [
  /go back to the start/i,
  /return to where/i,
  /retreat to/i,
  /go home/i,
];

const VAGUE_PATTERNS = [
  /something/i,
  /somewhere/i,
  /whatever/i,
  /maybe/i,
  /perhaps/i,
];

const MIN_ACCEPTABLE_SCORE = 50;

/**
 * Scores a choice based on quality criteria
 */
export const scoreChoice = (choice: string): ChoiceScore => {
  let score = 50; // Base score
  const reasons: string[] = [];
  const lowerChoice = choice.toLowerCase();
  const words = lowerChoice.split(/\s+/);

  // Check for strong action verbs (positive)
  const hasStrongVerb = STRONG_ACTION_VERBS.some(verb => lowerChoice.includes(verb));
  if (hasStrongVerb) {
    score += 20;
    reasons.push('Contains strong action verb');
  } else {
    score -= 10;
    reasons.push('Missing strong action verb');
  }

  // Check for weak action verbs (negative)
  const hasWeakVerb = WEAK_ACTION_VERBS.some(verb => {
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    return regex.test(lowerChoice);
  });
  if (hasWeakVerb) {
    score -= 15;
    reasons.push('Contains weak action verb');
  }

  // Check for passive patterns (very negative)
  const isPassive = PASSIVE_PATTERNS.some(pattern => pattern.test(lowerChoice));
  if (isPassive) {
    score -= 30;
    reasons.push('Passive or non-advancing action');
  }

  // Check for circular patterns (very negative)
  const isCircular = CIRCULAR_PATTERNS.some(pattern => pattern.test(lowerChoice));
  if (isCircular) {
    score -= 25;
    reasons.push('Circular action (going backwards)');
  }

  // Check for vagueness (negative)
  const isVague = VAGUE_PATTERNS.some(pattern => pattern.test(lowerChoice));
  if (isVague) {
    score -= 20;
    reasons.push('Too vague or non-specific');
  }

  // Check length (should be substantial but concise)
  if (words.length >= 4 && words.length <= 10) {
    score += 10;
    reasons.push('Good length');
  } else if (words.length < 3) {
    score -= 10;
    reasons.push('Too short/vague');
  } else if (words.length > 12) {
    score -= 5;
    reasons.push('Too long');
  }

  // Check for specificity (mentions specific objects, locations, actions)
  const hasSpecificNouns = /\b(portal|tower|gate|enemy|shadow|door|path|mountain|forest|cave|guardian|weapon|spell|treasure|secret|mystery)\b/i.test(lowerChoice);
  if (hasSpecificNouns) {
    score += 15;
    reasons.push('Specific and concrete');
  }

  // Check for urgency/excitement (positive indicators)
  const hasUrgency = /\b(before|quickly|now|immediate|urgent|fast|rush)\b/i.test(lowerChoice);
  if (hasUrgency) {
    score += 10;
    reasons.push('Creates urgency');
  }

  // Check for variety indicators (different approach types)
  const hasStealthIndicator = /\b(sneak|stealth|shadow|quiet|careful|hide)\b/i.test(lowerChoice);
  const hasCombatIndicator = /\b(fight|attack|charge|battle|strike|confront)\b/i.test(lowerChoice);
  const hasExplorationIndicator = /\b(explore|investigate|discover|examine|search)\b/i.test(lowerChoice);
  
  if (hasStealthIndicator || hasCombatIndicator || hasExplorationIndicator) {
    score += 10;
    reasons.push('Clear action archetype');
  }

  return {
    choice,
    score: Math.max(0, Math.min(100, score)), // Clamp between 0-100
    reasons,
  };
};

/**
 * Validates if choices meet minimum quality standards
 */
export const validateChoices = (choices: string[]): { valid: boolean; scores: ChoiceScore[] } => {
  const scores = choices.map(scoreChoice);
  const allMeetMinimum = scores.every(s => s.score >= MIN_ACCEPTABLE_SCORE);
  
  return {
    valid: allMeetMinimum,
    scores,
  };
};

/**
 * Filters out low-quality choices and provides feedback
 */
export const filterQualityChoices = (choices: string[]): string[] => {
  const scores = choices.map(scoreChoice);
  
  // Log scores for debugging
  scores.forEach(s => {
    console.log(`Choice: "${s.choice}" - Score: ${s.score} - ${s.reasons.join(', ')}`);
  });
  
  // Filter choices that meet minimum score
  const qualityChoices = scores
    .filter(s => s.score >= MIN_ACCEPTABLE_SCORE)
    .map(s => s.choice);
  
  if (qualityChoices.length < choices.length) {
    console.warn(`Filtered out ${choices.length - qualityChoices.length} low-quality choice(s)`);
  }
  
  return qualityChoices;
};

/**
 * Checks if choices are sufficiently different from each other
 */
export const checkChoiceDiversity = (choices: string[]): boolean => {
  if (choices.length < 2) return true;
  
  // Check for similar starting words
  const firstWords = choices.map(c => c.split(/\s+/)[0].toLowerCase());
  const uniqueFirstWords = new Set(firstWords);
  
  if (uniqueFirstWords.size < choices.length) {
    console.warn('Choices have similar starting patterns');
    return false;
  }
  
  // Check for similar lengths - more lenient now (within 2 words is acceptable)
  const lengths = choices.map(c => c.split(/\s+/).length);
  const minLength = Math.min(...lengths);
  const maxLength = Math.max(...lengths);
  const lengthRange = maxLength - minLength;
  
  // Only fail if ALL choices are exactly the same length OR within very narrow range
  if (lengthRange === 0) {
    console.warn('All choices have identical length');
    return false;
  }
  
  // Additional check: if length range is too small (≤1) AND all choices are similar length
  if (lengthRange <= 1 && choices.length > 2) {
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const allVerySimilar = lengths.every(l => Math.abs(l - avgLength) <= 0.67);
    
    if (allVerySimilar) {
      console.warn('All choices have similar length/structure');
      return false;
    }
  }
  
  return true;
};

