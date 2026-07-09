import {
  BOARD_COLS,
  BOARD_ROWS,
  EMPTY_CELL,
  MATCH_LEN_RAINBOW,
  MATCH_LEN_STRIPE,
  POM_TYPE_COUNT,
  getColor,
  getSpecial,
  isSpecial,
  makeSpecial,
  type SpecialKind,
} from './constants';

export type Cell = number;

export interface Position {
  row: number;
  col: number;
}

export interface MatchRun {
  cells: Position[];
  color: number;
  orientation: 'h' | 'v';
}

export interface MatchResult {
  cells: Position[];
  runs: MatchRun[];
}

export function createEmptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => EMPTY_CELL),
  );
}

export function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.slice());
}

export function randomPomType(typeCount: number, exclude?: number): number {
  const count = Math.max(2, Math.min(typeCount, POM_TYPE_COUNT));
  let type = Math.floor(Math.random() * count);
  if (exclude !== undefined && count > 1) {
    let guard = 0;
    while (type === exclude && guard < 12) {
      type = Math.floor(Math.random() * count);
      guard++;
    }
  }
  return type;
}

/** Colors match if same base color, or either is rainbow (rainbow alone doesn't auto-match). */
function colorsMatch(a: number, b: number): boolean {
  if (a === EMPTY_CELL || b === EMPTY_CELL) return false;
  if (getSpecial(a) === 'rainbow' || getSpecial(b) === 'rainbow') return false;
  return getColor(a) === getColor(b);
}

/** Fill board with random poms that contain no initial matches. */
export function generateBoard(typeCount: number = POM_TYPE_COUNT): Cell[][] {
  const board = createEmptyBoard();

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      let type = randomPomType(typeCount);
      let attempts = 0;
      const maxAttempts = 24;

      while (attempts < maxAttempts) {
        const wouldMatchHoriz =
          col >= 2 &&
          colorsMatch(board[row][col - 1], type) &&
          colorsMatch(board[row][col - 2], type);
        const wouldMatchVert =
          row >= 2 &&
          colorsMatch(board[row - 1][col], type) &&
          colorsMatch(board[row - 2][col], type);

        if (!wouldMatchHoriz && !wouldMatchVert) {
          break;
        }
        type = randomPomType(typeCount, type);
        attempts++;
      }

      board[row][col] = type;
    }
  }

  return board;
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;
}

export function areAdjacent(a: Position, b: Position): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function swapCells(board: Cell[][], a: Position, b: Position): void {
  const temp = board[a.row][a.col];
  board[a.row][a.col] = board[b.row][b.col];
  board[b.row][b.col] = temp;
}

function collectRuns(board: Cell[][]): MatchRun[] {
  const runs: MatchRun[] = [];

  for (let row = 0; row < BOARD_ROWS; row++) {
    let runStart = 0;
    for (let col = 1; col <= BOARD_COLS; col++) {
      const same =
        col < BOARD_COLS && colorsMatch(board[row][col], board[row][runStart]);
      if (!same) {
        const runLen = col - runStart;
        if (runLen >= 3 && board[row][runStart] !== EMPTY_CELL) {
          const cells: Position[] = [];
          for (let c = runStart; c < col; c++) cells.push({ row, col: c });
          runs.push({
            cells,
            color: getColor(board[row][runStart]),
            orientation: 'h',
          });
        }
        runStart = col;
      }
    }
  }

  for (let col = 0; col < BOARD_COLS; col++) {
    let runStart = 0;
    for (let row = 1; row <= BOARD_ROWS; row++) {
      const same =
        row < BOARD_ROWS && colorsMatch(board[row][col], board[runStart][col]);
      if (!same) {
        const runLen = row - runStart;
        if (runLen >= 3 && board[runStart][col] !== EMPTY_CELL) {
          const cells: Position[] = [];
          for (let r = runStart; r < row; r++) cells.push({ row: r, col });
          runs.push({
            cells,
            color: getColor(board[runStart][col]),
            orientation: 'v',
          });
        }
        runStart = row;
      }
    }
  }

  return runs;
}

/** Find all matched cells from line matches of 3+. */
export function findMatches(board: Cell[][]): MatchResult {
  const runs = collectRuns(board);
  if (runs.length === 0) {
    return { cells: [], runs: [] };
  }

  const uniqueCells: Position[] = [];
  const seen = new Set<string>();
  for (const run of runs) {
    for (const cell of run.cells) {
      const k = `${cell.row},${cell.col}`;
      if (!seen.has(k)) {
        seen.add(k);
        uniqueCells.push(cell);
      }
    }
  }

  return { cells: uniqueCells, runs };
}

export interface SpecialSpawn {
  at: Position;
  cell: number;
  kind: SpecialKind;
}

/** Decide which specials to create from match runs. */
export function planSpecialSpawns(
  result: MatchResult,
  swapFocus: Position | null,
): SpecialSpawn[] {
  const spawns: SpecialSpawn[] = [];
  const used = new Set<string>();

  const cellKey = (p: Position) => `${p.row},${p.col}`;

  // Track cells that appear in both H and V runs → bomb
  const cellRunCount = new Map<string, { h: boolean; v: boolean; color: number }>();
  for (const run of result.runs) {
    for (const cell of run.cells) {
      const k = cellKey(cell);
      const entry = cellRunCount.get(k) ?? { h: false, v: false, color: run.color };
      if (run.orientation === 'h') entry.h = true;
      else entry.v = true;
      cellRunCount.set(k, entry);
    }
  }

  for (const [k, info] of cellRunCount) {
    if (info.h && info.v && info.color !== EMPTY_CELL) {
      const [rs, cs] = k.split(',').map(Number);
      const at = { row: rs, col: cs };
      spawns.push({ at, cell: makeSpecial(info.color, 'bomb'), kind: 'bomb' });
      used.add(k);
    }
  }

  for (const run of result.runs) {
    if (run.cells.length < MATCH_LEN_STRIPE) continue;

    let kind: SpecialKind = 'none';
    if (run.cells.length >= MATCH_LEN_RAINBOW) {
      kind = 'rainbow';
    } else if (run.cells.length >= MATCH_LEN_STRIPE) {
      kind = run.orientation === 'h' ? 'stripe_h' : 'stripe_v';
    }
    if (kind === 'none') continue;

    // Prefer swap focus if in this run, else center of run
    let at = run.cells[Math.floor(run.cells.length / 2)];
    if (swapFocus) {
      const inRun = run.cells.find(
        (c) => c.row === swapFocus.row && c.col === swapFocus.col,
      );
      if (inRun) at = inRun;
    }

    if (used.has(cellKey(at))) continue;
    // Skip if already placing bomb nearby from cross
    const color = kind === 'rainbow' ? 0 : run.color;
    spawns.push({ at, cell: makeSpecial(color, kind), kind });
    used.add(cellKey(at));
  }

  // Don't spawn on cells that weren't matched (safety)
  return spawns.filter((s) =>
    result.cells.some((c) => c.row === s.at.row && c.col === s.at.col),
  );
}

export function clearCells(board: Cell[][], cells: Position[]): void {
  for (const { row, col } of cells) {
    board[row][col] = EMPTY_CELL;
  }
}

export function placeSpecials(board: Cell[][], spawns: SpecialSpawn[]): void {
  for (const spawn of spawns) {
    board[spawn.at.row][spawn.at.col] = spawn.cell;
  }
}

/** Expand special activations into cells to clear. */
export function expandSpecialClears(
  board: Cell[][],
  triggerCells: Position[],
): { cells: Position[]; activated: { pos: Position; kind: SpecialKind }[] } {
  const toClear = new Set<string>();
  const activated: { pos: Position; kind: SpecialKind }[] = [];
  const queue: Position[] = [...triggerCells];
  const queued = new Set(triggerCells.map((c) => `${c.row},${c.col}`));

  const add = (row: number, col: number) => {
    if (!inBounds(row, col)) return;
    const k = `${row},${col}`;
    if (toClear.has(k)) return;
    toClear.add(k);
    const cell = board[row][col];
    if (cell !== EMPTY_CELL && isSpecial(cell) && !queued.has(k)) {
      // Chain reaction for specials hit by blast
      queued.add(k);
      queue.push({ row, col });
    }
  };

  while (queue.length > 0) {
    const pos = queue.shift()!;
    const cell = board[pos.row][pos.col];
    if (cell === EMPTY_CELL) {
      add(pos.row, pos.col);
      continue;
    }

    const kind = getSpecial(cell);
    add(pos.row, pos.col);

    if (kind === 'none') continue;
    activated.push({ pos, kind });

    if (kind === 'stripe_h') {
      for (let c = 0; c < BOARD_COLS; c++) add(pos.row, c);
    } else if (kind === 'stripe_v') {
      for (let r = 0; r < BOARD_ROWS; r++) add(r, pos.col);
    } else if (kind === 'bomb') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          add(pos.row + dr, pos.col + dc);
        }
      }
    } else if (kind === 'rainbow') {
      // Clear most common color on board (excluding self)
      const counts = new Array(POM_TYPE_COUNT).fill(0);
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          const colr = getColor(board[r][c]);
          if (colr !== EMPTY_CELL) counts[colr]++;
        }
      }
      let best = 0;
      for (let i = 1; i < counts.length; i++) {
        if (counts[i] > counts[best]) best = i;
      }
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          if (getColor(board[r][c]) === best) add(r, c);
        }
      }
    }
  }

  const cells: Position[] = [];
  for (const k of toClear) {
    const [row, col] = k.split(',').map(Number);
    cells.push({ row, col });
  }
  return { cells, activated };
}

/**
 * When swapping a rainbow with a colored pom, clear all of that color (+ rainbow).
 */
export function rainbowSwapClears(
  board: Cell[][],
  rainbowPos: Position,
  colorPos: Position,
): Position[] {
  const targetColor = getColor(board[colorPos.row][colorPos.col]);
  const cells: Position[] = [rainbowPos, colorPos];
  if (targetColor === EMPTY_CELL) return cells;

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (getColor(board[r][c]) === targetColor) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

export interface FallStep {
  fromRow: number;
  toRow: number;
  col: number;
  type: number;
}

export interface SpawnStep {
  row: number;
  col: number;
  type: number;
  fromRow: number;
}

/** Apply gravity and spawn new tiles. Returns animation descriptors. */
export function applyGravity(
  board: Cell[][],
  typeCount: number,
): {
  falls: FallStep[];
  spawns: SpawnStep[];
} {
  const falls: FallStep[] = [];
  const spawns: SpawnStep[] = [];

  for (let col = 0; col < BOARD_COLS; col++) {
    const stack: { type: number; fromRow: number }[] = [];

    for (let row = BOARD_ROWS - 1; row >= 0; row--) {
      if (board[row][col] !== EMPTY_CELL) {
        stack.push({ type: board[row][col], fromRow: row });
        board[row][col] = EMPTY_CELL;
      }
    }

    let writeRow = BOARD_ROWS - 1;
    for (const item of stack) {
      board[writeRow][col] = item.type;
      if (item.fromRow !== writeRow) {
        falls.push({
          fromRow: item.fromRow,
          toRow: writeRow,
          col,
          type: item.type,
        });
      }
      writeRow--;
    }

    let spawnIndex = 0;
    while (writeRow >= 0) {
      const type = randomPomType(typeCount);
      board[writeRow][col] = type;
      const fromRow = -1 - spawnIndex;
      spawns.push({ row: writeRow, col, type, fromRow });
      writeRow--;
      spawnIndex++;
    }
  }

  return { falls, spawns };
}

/** Find one valid swap that creates a match, or null. */
export function findHint(board: Cell[][]): [Position, Position] | null {
  const directions: Position[] = [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
  ];

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      for (const dir of directions) {
        const nr = row + dir.row;
        const nc = col + dir.col;
        if (!inBounds(nr, nc)) continue;

        const a = { row, col };
        const b = { row: nr, col: nc };

        // Rainbow next to anything is always a valid play
        if (
          getSpecial(board[a.row][a.col]) === 'rainbow' ||
          getSpecial(board[b.row][b.col]) === 'rainbow'
        ) {
          return [a, b];
        }

        swapCells(board, a, b);
        const matches = findMatches(board);
        swapCells(board, a, b);

        if (matches.cells.length > 0) {
          return [a, b];
        }
      }
    }
  }

  return null;
}

export function hasValidMoves(board: Cell[][]): boolean {
  return findHint(board) !== null;
}
