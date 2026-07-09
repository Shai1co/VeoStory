export interface StoryLevel {
  id: number;
  title: string;
  chapter: string;
  blurb: string;
  goal: number;
  moves: number;
  /** How many pom colors appear on this level (4–8) */
  typeCount: number;
  winLine: string;
}

/** Story campaign — difficulty ramps via fewer moves, higher goals, more colors */
export const STORY_LEVELS: readonly StoryLevel[] = [
  {
    id: 1,
    title: 'Park Debut',
    chapter: 'Chapter 1',
    blurb: 'Luli discovers a sunny park full of fluffy friends. Match three to start the adventure!',
    goal: 400,
    moves: 28,
    typeCount: 5,
    winLine: 'The park cheers for Luli!',
  },
  {
    id: 2,
    title: 'Bakery Dash',
    chapter: 'Chapter 1',
    blurb: 'Pastries everywhere! Clear the cream puffs before Luli eats them all.',
    goal: 650,
    moves: 26,
    typeCount: 5,
    winLine: 'Luli saved the bakery!',
  },
  {
    id: 3,
    title: 'Rainbow Bridge',
    chapter: 'Chapter 2',
    blurb: 'A shimmering bridge appears. Longer matches awaken special poms!',
    goal: 900,
    moves: 24,
    typeCount: 6,
    winLine: 'The bridge sparkles open.',
  },
  {
    id: 4,
    title: 'Stormy Fluff',
    chapter: 'Chapter 2',
    blurb: 'Wind scatters the pack. More colors, tighter moves — stay sharp!',
    goal: 1200,
    moves: 22,
    typeCount: 6,
    winLine: 'Luli braved the storm!',
  },
  {
    id: 5,
    title: 'Moonlit Parade',
    chapter: 'Chapter 3',
    blurb: 'Night festival! Combos light the sky. Aim for big chains.',
    goal: 1500,
    moves: 22,
    typeCount: 7,
    winLine: 'The parade crowns Luli.',
  },
  {
    id: 6,
    title: 'Crystal Kennel',
    chapter: 'Chapter 3',
    blurb: 'Icy floors and rare violet queens. Specials are your best friends.',
    goal: 1900,
    moves: 20,
    typeCount: 7,
    winLine: 'Crystals sing for Luli!',
  },
  {
    id: 7,
    title: 'Sky Castle',
    chapter: 'Chapter 4',
    blurb: 'All eight fluff dynasties gather. Only a true crusher passes.',
    goal: 2400,
    moves: 20,
    typeCount: 8,
    winLine: 'The castle gates open!',
  },
  {
    id: 8,
    title: 'Luli Legend',
    chapter: 'Finale',
    blurb: 'The final trial. Crush with style — become the fluff legend.',
    goal: 3000,
    moves: 18,
    typeCount: 8,
    winLine: 'Luli is legend forever!',
  },
];

export const TOTAL_STORY_LEVELS = STORY_LEVELS.length;

export function getStoryLevel(index: number): StoryLevel {
  const clamped = Math.max(0, Math.min(index, STORY_LEVELS.length - 1));
  return STORY_LEVELS[clamped];
}

export const COMBO_LINES = [
  'Nice!',
  'Sweet!',
  'Luli!',
  'Fluffy!',
  'Crushin!',
  'Divine!',
  'Legendary!',
  'UNSTOPPABLE!',
] as const;

export function comboLineFor(combo: number): string {
  const idx = Math.min(COMBO_LINES.length - 1, Math.max(0, combo - 1));
  return COMBO_LINES[idx];
}
