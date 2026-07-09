/** Grid dimensions */
export const BOARD_COLS = 8;
export const BOARD_ROWS = 8;

/** Base Pomeranian color types (not including special overlays) */
export const POM_TYPE_COUNT = 8;

/** Empty cell marker */
export const EMPTY_CELL = -1;

/** Special tile encoding bases (color = value % 10 for striped/bomb) */
export const SPECIAL_STRIPE_H = 100;
export const SPECIAL_STRIPE_V = 200;
export const SPECIAL_BOMB = 300;
export const SPECIAL_RAINBOW = 400;

/** Points */
export const BASE_MATCH_POINTS = 10;
export const COMBO_MULTIPLIER = 1.55;
export const SPECIAL_BONUS_POINTS = 25;

/** Animation timings in milliseconds */
export const SWAP_DURATION_MS = 170;
export const FALL_DURATION_MS = 210;
export const POP_DURATION_MS = 190;
export const SPECIAL_BURST_MS = 280;
export const HINT_PULSE_MS = 900;

/** Minimum swipe distance in CSS pixels to count as a swap gesture */
export const SWIPE_THRESHOLD_PX = 24;

/** Match lengths that create specials */
export const MATCH_LEN_STRIPE = 4;
export const MATCH_LEN_RAINBOW = 5;

export type SpecialKind = 'none' | 'stripe_h' | 'stripe_v' | 'bomb' | 'rainbow';

export interface PomStyle {
  name: string;
  fur: string;
  accent: string;
  ear: string;
  eye: string;
  accessory: 'none' | 'bow' | 'scarf' | 'shades' | 'flower' | 'star' | 'bandana' | 'crown';
  muzzle: string;
  cheek: string;
}

/** Distinct Pomeranian looks — each has unique colors + accessory */
export const POM_STYLES: readonly PomStyle[] = [
  {
    name: 'Luli Orange',
    fur: '#f4a460',
    accent: '#e07a3a',
    ear: '#c45c26',
    eye: '#2a1a12',
    accessory: 'bow',
    muzzle: '#fff4e8',
    cheek: '#ffb090',
  },
  {
    name: 'Cream Puff',
    fur: '#f7f1e4',
    accent: '#e0d2b8',
    ear: '#cfc0a0',
    eye: '#3a2a1a',
    accessory: 'flower',
    muzzle: '#fffaf4',
    cheek: '#f0c8c0',
  },
  {
    name: 'Choco Boop',
    fur: '#5c4033',
    accent: '#3d2b22',
    ear: '#2a1a12',
    eye: '#1a1008',
    accessory: 'bandana',
    muzzle: '#e8d8c8',
    cheek: '#a07060',
  },
  {
    name: 'Pink Cloud',
    fur: '#f0a0c0',
    accent: '#d4789c',
    ear: '#c45a82',
    eye: '#3a1a28',
    accessory: 'bow',
    muzzle: '#fff0f5',
    cheek: '#ff90b0',
  },
  {
    name: 'Sky Ball',
    fur: '#6eb8e0',
    accent: '#4a9bc4',
    ear: '#3d7aa8',
    eye: '#1a2a3a',
    accessory: 'shades',
    muzzle: '#eef8ff',
    cheek: '#90c8e8',
  },
  {
    name: 'Golden Star',
    fur: '#e0b84a',
    accent: '#c49828',
    ear: '#a87818',
    eye: '#2a2010',
    accessory: 'star',
    muzzle: '#fff8e0',
    cheek: '#f0c860',
  },
  {
    name: 'Mint Fluff',
    fur: '#7ecfb0',
    accent: '#4aaa88',
    ear: '#2e8868',
    eye: '#143028',
    accessory: 'scarf',
    muzzle: '#f0fff8',
    cheek: '#90e0c0',
  },
  {
    name: 'Violet Queen',
    fur: '#9a7ad0',
    accent: '#7a58b0',
    ear: '#5a3890',
    eye: '#201030',
    accessory: 'crown',
    muzzle: '#f8f0ff',
    cheek: '#c0a0e8',
  },
] as const;

export function getColor(cell: number): number {
  if (cell === EMPTY_CELL || cell === SPECIAL_RAINBOW) return EMPTY_CELL;
  if (cell >= SPECIAL_BOMB) return cell - SPECIAL_BOMB;
  if (cell >= SPECIAL_STRIPE_V) return cell - SPECIAL_STRIPE_V;
  if (cell >= SPECIAL_STRIPE_H) return cell - SPECIAL_STRIPE_H;
  return cell;
}

export function getSpecial(cell: number): SpecialKind {
  if (cell === EMPTY_CELL) return 'none';
  if (cell === SPECIAL_RAINBOW) return 'rainbow';
  if (cell >= SPECIAL_BOMB) return 'bomb';
  if (cell >= SPECIAL_STRIPE_V) return 'stripe_v';
  if (cell >= SPECIAL_STRIPE_H) return 'stripe_h';
  return 'none';
}

export function makeSpecial(color: number, kind: SpecialKind): number {
  switch (kind) {
    case 'stripe_h':
      return SPECIAL_STRIPE_H + color;
    case 'stripe_v':
      return SPECIAL_STRIPE_V + color;
    case 'bomb':
      return SPECIAL_BOMB + color;
    case 'rainbow':
      return SPECIAL_RAINBOW;
    default:
      return color;
  }
}

export function isSpecial(cell: number): boolean {
  return getSpecial(cell) !== 'none';
}

/** Atlas index for rendering (regular colors + special variants) */
export const ATLAS_REGULAR_COUNT = POM_TYPE_COUNT;
export const ATLAS_STRIPE_H_START = POM_TYPE_COUNT;
export const ATLAS_STRIPE_V_START = POM_TYPE_COUNT * 2;
export const ATLAS_BOMB_START = POM_TYPE_COUNT * 3;
export const ATLAS_RAINBOW_INDEX = POM_TYPE_COUNT * 4;
export const ATLAS_TOTAL = ATLAS_RAINBOW_INDEX + 1;

export function cellToAtlasIndex(cell: number): number {
  const special = getSpecial(cell);
  const color = getColor(cell);
  switch (special) {
    case 'stripe_h':
      return ATLAS_STRIPE_H_START + color;
    case 'stripe_v':
      return ATLAS_STRIPE_V_START + color;
    case 'bomb':
      return ATLAS_BOMB_START + color;
    case 'rainbow':
      return ATLAS_RAINBOW_INDEX;
    default:
      return Math.max(0, color);
  }
}
