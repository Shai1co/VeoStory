/** Grid dimensions */
export const BOARD_COLS = 8;
export const BOARD_ROWS = 8;

/** Number of distinct Pomeranian types */
export const POM_TYPE_COUNT = 6;

/** Starting moves and score goal for a level */
export const STARTING_MOVES = 30;
export const SCORE_GOAL = 500;

/** Points awarded per matched tile (scales with combo) */
export const BASE_MATCH_POINTS = 10;
export const COMBO_MULTIPLIER = 1.5;

/** Animation timings in milliseconds */
export const SWAP_DURATION_MS = 180;
export const FALL_DURATION_MS = 220;
export const POP_DURATION_MS = 200;
export const HINT_PULSE_MS = 900;

/** Minimum swipe distance in CSS pixels to count as a swap gesture */
export const SWIPE_THRESHOLD_PX = 24;

/** Empty cell marker */
export const EMPTY_CELL = -1;

/** Pomeranian color palettes (fur, accent, ear, eye) for procedural sprites */
export const POM_PALETTES: ReadonlyArray<Readonly<[string, string, string, string]>> = [
  ['#f4a460', '#e07a3a', '#c45c26', '#2a1a12'], // orange
  ['#f5f0e6', '#d4c4a8', '#c9b896', '#3a2a1a'], // cream
  ['#5c4033', '#3d2b22', '#2a1a12', '#1a1008'], // chocolate
  ['#e8a0bf', '#d4789c', '#c45a82', '#3a1a28'], // pink
  ['#7eb8da', '#5a9bc4', '#3d7aa8', '#1a2a3a'], // sky
  ['#c4a35a', '#a8883a', '#8a6a28', '#2a2010'], // golden
];

export const POM_NAMES = [
  'Orange Fluff',
  'Cream Puff',
  'Choco Pom',
  'Pink Cloud',
  'Sky Ball',
  'Golden Boop',
] as const;
