/**
 * Story Context Builder
 * Analyzes video segments to build rich context for choice generation
 */

import { VideoSegment } from '../types';

export interface StoryContext {
  fullNarrative: string;
  recentActions: string[];
  storyArcPhase: 'beginning' | 'rising' | 'climax' | 'resolution';
  segmentCount: number;
  themes: string[];
  recentChoiceTypes: string[];
  progressionHints: string[];
}

const BEGINNING_PHASE_MAX = 2;
const RISING_PHASE_MAX = 5;
const CLIMAX_PHASE_MAX = 8;

/**
 * Categorizes choice types for pattern tracking
 */
export const categorizeChoice = (choice: string): string => {
  const lowerChoice = choice.toLowerCase();
  
  // Combat/Confrontation
  if (/(attack|fight|confront|battle|strike|combat|defeat|challenge)/i.test(lowerChoice)) {
    return 'combat';
  }
  
  // Stealth/Careful
  if (/(sneak|hide|careful|quiet|stealth|shadow|avoid|dodge)/i.test(lowerChoice)) {
    return 'stealth';
  }
  
  // Exploration/Discovery
  if (/(explore|investigate|discover|search|examine|look|find|survey)/i.test(lowerChoice)) {
    return 'exploration';
  }
  
  // Movement/Navigation
  if (/(run|sprint|climb|jump|leap|move|travel|go|enter|exit)/i.test(lowerChoice)) {
    return 'movement';
  }
  
  // Interaction/Social
  if (/(talk|speak|communicate|help|ask|tell|call|meet)/i.test(lowerChoice)) {
    return 'interaction';
  }
  
  // Magic/Special
  if (/(cast|magic|spell|power|ability|summon|transform)/i.test(lowerChoice)) {
    return 'magic';
  }
  
  // Strategic/Planning
  if (/(plan|prepare|wait|observe|think|analyze|strategy)/i.test(lowerChoice)) {
    return 'strategic';
  }
  
  return 'other';
};

/**
 * Extracts key themes from the story
 */
const extractThemes = (segments: VideoSegment[]): string[] => {
  const allText = segments.map(s => s.prompt + ' ' + (s.selectedChoice || '')).join(' ').toLowerCase();
  const themes: string[] = [];
  
  // Check for common adventure themes
  if (/(magic|wizard|spell|enchant|mystical)/i.test(allText)) {
    themes.push('magic');
  }
  if (/(fight|battle|combat|warrior|sword|weapon)/i.test(allText)) {
    themes.push('combat');
  }
  if (/(explore|discover|adventure|journey|quest)/i.test(allText)) {
    themes.push('exploration');
  }
  if (/(mystery|secret|hidden|unknown|puzzle)/i.test(allText)) {
    themes.push('mystery');
  }
  if (/(danger|threat|enemy|villain|dark)/i.test(allText)) {
    themes.push('danger');
  }
  if (/(nature|forest|mountain|ocean|wild)/i.test(allText)) {
    themes.push('nature');
  }
  if (/(technology|machine|robot|cyber|future)/i.test(allText)) {
    themes.push('technology');
  }
  if (/(friend|ally|companion|help|together)/i.test(allText)) {
    themes.push('friendship');
  }
  
  return themes.length > 0 ? themes : ['adventure'];
};

/**
 * Determines story arc phase based on segment count and content
 */
const determineStoryArcPhase = (segmentCount: number): 'beginning' | 'rising' | 'climax' | 'resolution' => {
  if (segmentCount <= BEGINNING_PHASE_MAX) {
    return 'beginning';
  } else if (segmentCount <= RISING_PHASE_MAX) {
    return 'rising';
  } else if (segmentCount <= CLIMAX_PHASE_MAX) {
    return 'climax';
  } else {
    return 'resolution';
  }
};

/**
 * Generates progression hints based on story phase
 */
const generateProgressionHints = (
  phase: 'beginning' | 'rising' | 'climax' | 'resolution',
  themes: string[],
  recentChoiceTypes: string[]
): string[] => {
  const hints: string[] = [];
  
  // Phase-specific hints
  switch (phase) {
    case 'beginning':
      hints.push('Introduce new elements or discoveries');
      hints.push('Establish the setting and initial challenge');
      hints.push('Build curiosity and momentum');
      break;
    case 'rising':
      hints.push('Escalate challenges and stakes');
      hints.push('Introduce complications or obstacles');
      hints.push('Deepen the adventure');
      break;
    case 'climax':
      hints.push('Face major challenges or revelations');
      hints.push('Make bold, consequential decisions');
      hints.push('Push toward resolution of conflicts');
      break;
    case 'resolution':
      hints.push('Resolve ongoing conflicts');
      hints.push('Explore consequences of previous actions');
      hints.push('Bring narrative threads together');
      break;
  }
  
  // Avoid repeating recent choice types
  const recentTypeSet = new Set(recentChoiceTypes);
  if (recentTypeSet.size === 1) {
    const repeatedType = recentChoiceTypes[0];
    hints.push(`Avoid only ${repeatedType} actions - try different approaches`);
  }
  
  // Theme-specific hints
  if (themes.includes('mystery') && !recentTypeSet.has('exploration')) {
    hints.push('Include investigative or discovery options');
  }
  if (themes.includes('combat') && !recentTypeSet.has('strategic')) {
    hints.push('Offer tactical or planning alternatives to direct combat');
  }
  
  return hints;
};

/**
 * Builds comprehensive story context from video segments
 */
export const buildStoryContext = (segments: VideoSegment[]): StoryContext => {
  const segmentCount = segments.length;
  const fullNarrative = segments.map(s => s.prompt).join(' Then, ');
  
  // Extract recent actions (last 3 selected choices)
  const recentActions = segments
    .slice(-3)
    .filter(s => s.selectedChoice)
    .map(s => s.selectedChoice!);
  
  // Categorize recent choice types
  const recentChoiceTypes = segments
    .slice(-4)
    .flatMap(s => s.choices || [])
    .map(categorizeChoice);
  
  const themes = extractThemes(segments);
  const storyArcPhase = determineStoryArcPhase(segmentCount);
  const progressionHints = generateProgressionHints(storyArcPhase, themes, recentChoiceTypes);
  
  return {
    fullNarrative,
    recentActions,
    storyArcPhase,
    segmentCount,
    themes,
    recentChoiceTypes,
    progressionHints,
  };
};

/**
 * Formats story context for AI prompt
 */
export const formatStoryContextForPrompt = (context: StoryContext): string => {
  let formatted = `Story so far: ${context.fullNarrative}\n\n`;
  
  if (context.recentActions.length > 0) {
    formatted += `Recent player actions:\n${context.recentActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\n`;
  }
  
  formatted += `Story phase: ${context.storyArcPhase} (segment ${context.segmentCount})\n`;
  formatted += `Themes: ${context.themes.join(', ')}\n\n`;
  
  if (context.progressionHints.length > 0) {
    formatted += `Story progression guidance:\n${context.progressionHints.map(h => `- ${h}`).join('\n')}\n`;
  }
  
  return formatted;
};

