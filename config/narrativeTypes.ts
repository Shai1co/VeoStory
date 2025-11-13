/**
 * Narrative Types Configuration
 * Defines narrative types that affect story generation and choices
 */

export interface NarrativeType {
  id: string;
  name: string;
  description: string;
  icon: string;
  enhancementHints: {
    initial: string[];
    continuation: string[];
    choiceGeneration: string[];
  };
}

// Narrative type definitions
export const NARRATIVE_TYPES: NarrativeType[] = [
  {
    id: 'adventure',
    name: 'Adventure',
    description: 'Exploration, discovery, and journey-focused storytelling',
    icon: '🗺️',
    enhancementHints: {
      initial: [
        'Emphasize exploration and discovery',
        'Create a sense of wonder and excitement',
        'Focus on journey and new experiences',
        'Include mysterious locations to explore',
        'Add elements of the unknown and discovery'
      ],
      continuation: [
        'Continue the journey with new discoveries',
        'Reveal hidden secrets and unexplored areas',
        'Create moments of awe and wonder',
        'Progress the adventure forward',
        'Introduce new mysteries to uncover'
      ],
      choiceGeneration: [
        'Include exploration and discovery options',
        'Offer paths to new locations or secrets',
        'Emphasize curiosity and investigation',
        'Create choices that expand the world',
        'Balance risk and reward in exploration'
      ]
    }
  },
  {
    id: 'combat',
    name: 'Combat',
    description: 'Action-oriented with enemies, battles, and tactical decisions',
    icon: '⚔️',
    enhancementHints: {
      initial: [
        'Establish clear threats and enemies',
        'Create action-oriented scenarios',
        'Include combat-ready characters',
        'Set up tactical situations',
        'Emphasize strength and combat prowess'
      ],
      continuation: [
        'Escalate combat intensity',
        'Introduce new enemies or challenges',
        'Create tactical combat scenarios',
        'Show consequences of battle',
        'Include victory or defeat moments'
      ],
      choiceGeneration: [
        'Offer aggressive and defensive options',
        'Include tactical combat choices',
        'Provide different fighting approaches',
        'Balance direct and strategic combat',
        'Create meaningful combat decisions'
      ]
    }
  },
  {
    id: 'mystery',
    name: 'Mystery',
    description: 'Investigation, puzzle-solving, and uncovering truth',
    icon: '🔍',
    enhancementHints: {
      initial: [
        'Introduce mysterious elements or questions',
        'Create intrigue and curiosity',
        'Set up puzzles or enigmas to solve',
        'Include clues and evidence',
        'Establish a mystery to unravel'
      ],
      continuation: [
        'Reveal new clues and evidence',
        'Deepen the mystery with complications',
        'Create "aha" moments of discovery',
        'Progress investigation forward',
        'Add layers to the puzzle'
      ],
      choiceGeneration: [
        'Include investigative options',
        'Offer analytical and deductive choices',
        'Provide clue-gathering opportunities',
        'Create puzzle-solving decisions',
        'Balance observation and action'
      ]
    }
  },
  {
    id: 'stealth',
    name: 'Stealth',
    description: 'Sneaking, tactical avoidance, and careful planning',
    icon: '🥷',
    enhancementHints: {
      initial: [
        'Create scenarios requiring caution',
        'Establish threats to avoid',
        'Set up stealth opportunities',
        'Emphasize careful observation',
        'Include hiding places and shadows'
      ],
      continuation: [
        'Increase tension and risk of detection',
        'Create close calls and narrow escapes',
        'Reward careful planning',
        'Show consequences of being detected',
        'Progress stealthily through challenges'
      ],
      choiceGeneration: [
        'Offer sneaky and cautious options',
        'Include avoidance and evasion choices',
        'Provide tactical planning opportunities',
        'Create risk/reward stealth decisions',
        'Balance hiding and moving forward'
      ]
    }
  },
  {
    id: 'social',
    name: 'Social',
    description: 'Dialogue, diplomacy, persuasion, and relationships',
    icon: '💬',
    enhancementHints: {
      initial: [
        'Introduce interesting characters',
        'Create social situations and interactions',
        'Establish relationships and dynamics',
        'Set up dialogue opportunities',
        'Emphasize communication and charisma'
      ],
      continuation: [
        'Deepen character relationships',
        'Create meaningful conversations',
        'Show consequences of social choices',
        'Develop alliances or conflicts',
        'Progress through dialogue and persuasion'
      ],
      choiceGeneration: [
        'Include dialogue and persuasion options',
        'Offer different social approaches',
        'Provide diplomatic solutions',
        'Create relationship-building choices',
        'Balance honesty and manipulation'
      ]
    }
  },
  {
    id: 'survival',
    name: 'Survival',
    description: 'Resource management, environmental challenges, and endurance',
    icon: '🏕️',
    enhancementHints: {
      initial: [
        'Establish harsh or challenging environment',
        'Introduce resource scarcity',
        'Create survival challenges',
        'Emphasize adaptation and resilience',
        'Set up environmental threats'
      ],
      continuation: [
        'Escalate survival difficulties',
        'Create resource management dilemmas',
        'Show effects of harsh conditions',
        'Introduce new environmental threats',
        'Test endurance and adaptability'
      ],
      choiceGeneration: [
        'Include resource management options',
        'Offer survival-focused choices',
        'Provide risk vs. safety decisions',
        'Create adaptation opportunities',
        'Balance immediate needs with long-term survival'
      ]
    }
  },
  {
    id: 'horror',
    name: 'Horror',
    description: 'Fear, tension, suspense, and terrifying situations',
    icon: '👻',
    enhancementHints: {
      initial: [
        'Create unsettling atmosphere',
        'Introduce elements of dread',
        'Establish sense of danger',
        'Use dark and ominous visuals',
        'Build tension and fear'
      ],
      continuation: [
        'Escalate fear and tension',
        'Create jump scares or reveals',
        'Deepen sense of dread',
        'Show horrifying consequences',
        'Build toward terror'
      ],
      choiceGeneration: [
        'Include escape and evasion options',
        'Offer desperate survival choices',
        'Provide fight or flight decisions',
        'Create high-tension moments',
        'Balance fear with hope'
      ]
    }
  },
  {
    id: 'romance',
    name: 'Romance',
    description: 'Emotional connections, relationships, and intimate moments',
    icon: '💕',
    enhancementHints: {
      initial: [
        'Introduce potential romantic interests',
        'Create emotionally charged situations',
        'Establish chemistry and connection',
        'Set romantic atmosphere',
        'Emphasize feelings and emotions'
      ],
      continuation: [
        'Deepen romantic connections',
        'Create intimate moments',
        'Show relationship development',
        'Build emotional tension',
        'Progress romantic storylines'
      ],
      choiceGeneration: [
        'Include emotionally expressive options',
        'Offer romantic gesture choices',
        'Provide relationship-building decisions',
        'Create meaningful emotional moments',
        'Balance vulnerability and confidence'
      ]
    }
  }
];

/**
 * Get a narrative type by ID
 */
export function getNarrativeTypeById(id: string): NarrativeType | undefined {
  return NARRATIVE_TYPES.find(type => type.id === id);
}

/**
 * Get the default narrative type
 */
export function getDefaultNarrativeType(): NarrativeType {
  return NARRATIVE_TYPES[0]; // 'adventure'
}

/**
 * Type union for all narrative type IDs
 */
export type NarrativeTypeId = 
  | 'adventure'
  | 'combat'
  | 'mystery'
  | 'stealth'
  | 'social'
  | 'survival'
  | 'horror'
  | 'romance';

