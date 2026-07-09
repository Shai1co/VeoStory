import {
  BOARD_COLS,
  BOARD_ROWS,
  EMPTY_CELL,
  POM_TYPE_COUNT,
  getColor,
  makeSpecial,
} from './constants';
import { randomPomType, type Cell, type Position } from './board';

export type AbilityId = 'shuffle' | 'treat_bomb' | 'zoomies' | 'super_bark';

export interface AbilityDef {
  id: AbilityId;
  name: string;
  short: string;
  description: string;
  /** Story level id (1-based) required to unlock permanently */
  unlockLevel: number;
  /** Fluff charges required to cast */
  chargeCost: number;
  icon: string;
}

export const ABILITIES: readonly AbilityDef[] = [
  {
    id: 'shuffle',
    name: 'Puppy Shuffle',
    short: 'Shuffle',
    description: 'Reshuffle the board into a fresh pack of poms.',
    unlockLevel: 1,
    chargeCost: 1,
    icon: '🔄',
  },
  {
    id: 'treat_bomb',
    name: 'Treat Bomb',
    short: 'Bomb',
    description: 'Drop a bomb pom onto a random tile.',
    unlockLevel: 2,
    chargeCost: 1,
    icon: '💣',
  },
  {
    id: 'zoomies',
    name: 'Zoomies',
    short: 'Zoomies',
    description: 'Luli dashes — clear a full row and column.',
    unlockLevel: 4,
    chargeCost: 1,
    icon: '💨',
  },
  {
    id: 'super_bark',
    name: 'Super Bark',
    short: 'Bark',
    description: 'A mighty bark clears every pom of one color.',
    unlockLevel: 6,
    chargeCost: 2,
    icon: '🔊',
  },
] as const;

const STORAGE_KEY = 'luli-crush-abilities';
const MAX_CHARGES = 4;
/** Fluff meter points needed for +1 charge */
export const FLUFF_PER_CHARGE = 100;

export interface AbilityProgress {
  /** Highest story level id cleared (0 = none) */
  highestCleared: number;
  /** Spendable ability charges */
  charges: number;
  /** Progress toward next charge (0..FLUFF_PER_CHARGE) */
  fluffMeter: number;
}

function defaultProgress(): AbilityProgress {
  return { highestCleared: 0, charges: 1, fluffMeter: 0 };
}

export function loadProgress(): AbilityProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Partial<AbilityProgress>;
    return {
      highestCleared: Math.max(0, Number(parsed.highestCleared) || 0),
      charges: Math.min(MAX_CHARGES, Math.max(0, Number(parsed.charges) || 0)),
      fluffMeter: Math.min(FLUFF_PER_CHARGE, Math.max(0, Number(parsed.fluffMeter) || 0)),
    };
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress: AbilityProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore quota / private mode
  }
}

export function isAbilityUnlocked(id: AbilityId, highestCleared: number): boolean {
  const def = ABILITIES.find((a) => a.id === id);
  if (!def) return false;
  // Unlock when player has reached that story level (cleared previous, or level 1 always)
  if (def.unlockLevel <= 1) return true;
  return highestCleared >= def.unlockLevel - 1;
}

export function getAbility(id: AbilityId): AbilityDef {
  const def = ABILITIES.find((a) => a.id === id);
  if (!def) throw new Error(`Unknown ability ${id}`);
  return def;
}

/** Add fluff from a clear; returns how many new charges were earned. */
export function addFluff(progress: AbilityProgress, amount: number): number {
  progress.fluffMeter += amount;
  let earned = 0;
  while (progress.fluffMeter >= FLUFF_PER_CHARGE && progress.charges < MAX_CHARGES) {
    progress.fluffMeter -= FLUFF_PER_CHARGE;
    progress.charges += 1;
    earned += 1;
  }
  if (progress.charges >= MAX_CHARGES) {
    progress.fluffMeter = Math.min(progress.fluffMeter, FLUFF_PER_CHARGE - 1);
  }
  return earned;
}

export function trySpendCharges(progress: AbilityProgress, cost: number): boolean {
  if (progress.charges < cost) return false;
  progress.charges -= cost;
  return true;
}

export function markLevelCleared(progress: AbilityProgress, levelId: number): AbilityId[] {
  const newlyUnlocked: AbilityId[] = [];
  const prev = progress.highestCleared;
  if (levelId > progress.highestCleared) {
    progress.highestCleared = levelId;
  }
  for (const ability of ABILITIES) {
    const wasLocked = !isAbilityUnlocked(ability.id, prev);
    const nowOpen = isAbilityUnlocked(ability.id, progress.highestCleared);
    if (wasLocked && nowOpen) {
      newlyUnlocked.push(ability.id);
    }
  }
  // Bonus charge on clear
  if (progress.charges < MAX_CHARGES) {
    progress.charges += 1;
  }
  return newlyUnlocked;
}

export interface AbilityEffectResult {
  cleared: Position[];
  placed: { at: Position; cell: number }[];
  reshuffled: boolean;
  label: string;
}

/** Apply an ability to the board. Mutates board. */
export function applyAbility(
  board: Cell[][],
  id: AbilityId,
  typeCount: number,
): AbilityEffectResult {
  const cleared: Position[] = [];
  const placed: { at: Position; cell: number }[] = [];

  if (id === 'shuffle') {
    // Caller will regenerate; mark reshuffled
    return { cleared, placed, reshuffled: true, label: 'Puppy Shuffle!' };
  }

  if (id === 'treat_bomb') {
    // Prefer a non-special filled cell
    const candidates: Position[] = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (board[r][c] !== EMPTY_CELL && board[r][c] < 100) {
          candidates.push({ row: r, col: c });
        }
      }
    }
    if (candidates.length === 0) {
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          if (board[r][c] !== EMPTY_CELL) candidates.push({ row: r, col: c });
        }
      }
    }
    if (candidates.length > 0) {
      const at = candidates[Math.floor(Math.random() * candidates.length)];
      const color = Math.max(0, getColor(board[at.row][at.col]));
      const cell = makeSpecial(color % POM_TYPE_COUNT, 'bomb');
      board[at.row][at.col] = cell;
      placed.push({ at, cell });
    }
    return { cleared, placed, reshuffled: false, label: 'Treat Bomb!' };
  }

  if (id === 'zoomies') {
    const row = Math.floor(Math.random() * BOARD_ROWS);
    const col = Math.floor(Math.random() * BOARD_COLS);
    const seen = new Set<string>();
    for (let c = 0; c < BOARD_COLS; c++) {
      const k = `${row},${c}`;
      if (!seen.has(k)) {
        seen.add(k);
        cleared.push({ row, col: c });
      }
    }
    for (let r = 0; r < BOARD_ROWS; r++) {
      const k = `${r},${col}`;
      if (!seen.has(k)) {
        seen.add(k);
        cleared.push({ row: r, col });
      }
    }
    return { cleared, placed, reshuffled: false, label: 'Zoomies!' };
  }

  // super_bark — clear most common color
  const counts = new Array(POM_TYPE_COUNT).fill(0);
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const color = getColor(board[r][c]);
      if (color !== EMPTY_CELL && color >= 0 && color < POM_TYPE_COUNT) {
        counts[color]++;
      }
    }
  }
  let best = 0;
  for (let i = 1; i < counts.length; i++) {
    if (counts[i] > counts[best]) best = i;
  }
  // If empty-ish, pick a random available type
  if (counts[best] === 0) {
    best = randomPomType(typeCount);
  }
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (getColor(board[r][c]) === best) {
        cleared.push({ row: r, col: c });
      }
    }
  }
  return { cleared, placed, reshuffled: false, label: 'Super Bark!' };
}

export function abilityUnlockBlurb(id: AbilityId): string {
  const def = getAbility(id);
  return `New ability: ${def.name}!`;
}
