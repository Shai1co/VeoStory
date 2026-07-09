import {
  BOARD_COLS,
  BOARD_ROWS,
  EMPTY_CELL,
  POM_TYPE_COUNT,
} from './constants';

export type Cell = number;

export interface Position {
  row: number;
  col: number;
}

export interface MatchGroup {
  cells: Position[];
}

export function createEmptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => EMPTY_CELL),
  );
}

export function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.slice());
}

export function randomPomType(exclude?: number): number {
  let type = Math.floor(Math.random() * POM_TYPE_COUNT);
  if (exclude !== undefined && POM_TYPE_COUNT > 1) {
    while (type === exclude) {
      type = Math.floor(Math.random() * POM_TYPE_COUNT);
    }
  }
  return type;
}

/** Fill board with random poms that contain no initial matches. */
export function generateBoard(): Cell[][] {
  const board = createEmptyBoard();

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      let type = randomPomType();
      let attempts = 0;
      const maxAttempts = 20;

      while (attempts < maxAttempts) {
        const wouldMatchHoriz =
          col >= 2 &&
          board[row][col - 1] === type &&
          board[row][col - 2] === type;
        const wouldMatchVert =
          row >= 2 &&
          board[row - 1][col] === type &&
          board[row - 2][col] === type;

        if (!wouldMatchHoriz && !wouldMatchVert) {
          break;
        }
        type = randomPomType(type);
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

/** Find all match groups of 3+ in a row or column. */
export function findMatches(board: Cell[][]): MatchGroup[] {
  const matched = new Set<string>();
  const groups: MatchGroup[] = [];

  const key = (r: number, c: number) => `${r},${c}`;

  // Horizontal
  for (let row = 0; row < BOARD_ROWS; row++) {
    let runStart = 0;
    for (let col = 1; col <= BOARD_COLS; col++) {
      const same =
        col < BOARD_COLS &&
        board[row][col] !== EMPTY_CELL &&
        board[row][col] === board[row][runStart];

      if (!same) {
        const runLen = col - runStart;
        if (runLen >= 3 && board[row][runStart] !== EMPTY_CELL) {
          const cells: Position[] = [];
          for (let c = runStart; c < col; c++) {
            cells.push({ row, col: c });
            matched.add(key(row, c));
          }
          groups.push({ cells });
        }
        runStart = col;
      }
    }
  }

  // Vertical
  for (let col = 0; col < BOARD_COLS; col++) {
    let runStart = 0;
    for (let row = 1; row <= BOARD_ROWS; row++) {
      const same =
        row < BOARD_ROWS &&
        board[row][col] !== EMPTY_CELL &&
        board[row][col] === board[runStart][col];

      if (!same) {
        const runLen = row - runStart;
        if (runLen >= 3 && board[runStart][col] !== EMPTY_CELL) {
          const cells: Position[] = [];
          for (let r = runStart; r < row; r++) {
            cells.push({ row: r, col });
            matched.add(key(r, col));
          }
          groups.push({ cells });
        }
        runStart = row;
      }
    }
  }

  // Merge overlapping groups into unique cell set for clearing
  if (groups.length === 0) {
    return [];
  }

  const uniqueCells: Position[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const cell of group.cells) {
      const k = key(cell.row, cell.col);
      if (!seen.has(k)) {
        seen.add(k);
        uniqueCells.push(cell);
      }
    }
  }

  return [{ cells: uniqueCells }];
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
export function applyGravity(board: Cell[][]): {
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
      const type = randomPomType();
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
        swapCells(board, a, b);
        const matches = findMatches(board);
        swapCells(board, a, b);

        if (matches.length > 0) {
          return [a, b];
        }
      }
    }
  }

  return null;
}

/** True if any valid move exists. */
export function hasValidMoves(board: Cell[][]): boolean {
  return findHint(board) !== null;
}
