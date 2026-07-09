import {
  BASE_MATCH_POINTS,
  COMBO_MULTIPLIER,
  EMPTY_CELL,
  FALL_DURATION_MS,
  POP_DURATION_MS,
  SCORE_GOAL,
  STARTING_MOVES,
  SWAP_DURATION_MS,
  SWIPE_THRESHOLD_PX,
} from './constants';
import {
  applyGravity,
  areAdjacent,
  cloneBoard,
  findHint,
  findMatches,
  generateBoard,
  hasValidMoves,
  swapCells,
  type Cell,
  type Position,
} from './board';
import { WebGLRenderer } from './renderer';

type GamePhase = 'idle' | 'animating' | 'won' | 'lost';

export interface HudElements {
  score: HTMLElement;
  moves: HTMLElement;
  goal: HTMLElement;
  toast: HTMLElement;
  overlay: HTMLElement;
  overlayTitle: HTMLElement;
  overlayMessage: HTMLElement;
  overlayScore: HTMLElement;
}

function animate(
  durationMs: number,
  onFrame: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      onFrame(progress);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}

export class Game {
  private board: Cell[][];
  private score = 0;
  private moves = STARTING_MOVES;
  private phase: GamePhase = 'idle';
  private selected: Position | null = null;
  private pointerStart: { x: number; y: number; cell: Position } | null = null;
  private readonly renderer: WebGLRenderer;
  private readonly hud: HudElements;
  private running = false;
  private comboToastTimer = 0;

  constructor(canvas: HTMLCanvasElement, hud: HudElements) {
    this.renderer = new WebGLRenderer(canvas);
    this.hud = hud;
    this.board = generateBoard();
    this.bindInput(canvas);
    this.updateHud();
  }

  start(): void {
    this.running = true;
    this.renderer.resize();
    const loop = (now: number) => {
      if (!this.running) return;
      this.renderer.selected = this.selected;
      this.renderer.render(this.board, now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    window.addEventListener('resize', () => this.renderer.resize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.renderer.resize(), 100);
    });
  }

  newGame(): void {
    this.board = generateBoard();
    this.score = 0;
    this.moves = STARTING_MOVES;
    this.phase = 'idle';
    this.selected = null;
    this.renderer.hint = null;
    this.renderer.clearAnimations();
    this.hideOverlay();
    this.updateHud();
    this.showToast('New pack of poms!');
  }

  showHint(): void {
    if (this.phase !== 'idle') return;
    const hint = findHint(this.board);
    if (!hint) {
      this.showToast('No moves — reshuffling…');
      void this.reshuffle();
      return;
    }
    this.renderer.hint = hint;
    this.showToast('Try swapping these!');
    window.setTimeout(() => {
      this.renderer.hint = null;
    }, 2000);
  }

  private bindInput(canvas: HTMLCanvasElement): void {
    const onDown = (clientX: number, clientY: number) => {
      if (this.phase !== 'idle') return;
      const cell = this.renderer.cellAt(clientX, clientY);
      if (!cell) return;
      this.pointerStart = { x: clientX, y: clientY, cell };
    };

    const onUp = (clientX: number, clientY: number) => {
      if (this.phase !== 'idle' || !this.pointerStart) {
        this.pointerStart = null;
        return;
      }

      const start = this.pointerStart;
      this.pointerStart = null;

      const dx = clientX - start.x;
      const dy = clientY - start.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Swipe gesture
      if (absDx > SWIPE_THRESHOLD_PX || absDy > SWIPE_THRESHOLD_PX) {
        let target: Position;
        if (absDx > absDy) {
          target = {
            row: start.cell.row,
            col: start.cell.col + (dx > 0 ? 1 : -1),
          };
        } else {
          target = {
            row: start.cell.row + (dy > 0 ? 1 : -1),
            col: start.cell.col,
          };
        }
        void this.trySwap(start.cell, target);
        this.selected = null;
        return;
      }

      // Tap / click select-then-swap
      const cell = this.renderer.cellAt(clientX, clientY) ?? start.cell;
      if (this.selected && areAdjacent(this.selected, cell)) {
        const from = this.selected;
        this.selected = null;
        void this.trySwap(from, cell);
      } else if (
        this.selected &&
        this.selected.row === cell.row &&
        this.selected.col === cell.col
      ) {
        this.selected = null;
      } else {
        this.selected = cell;
      }
    };

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      onDown(e.clientX, e.clientY);
    });

    canvas.addEventListener('pointerup', (e) => {
      e.preventDefault();
      onUp(e.clientX, e.clientY);
    });

    canvas.addEventListener('pointercancel', () => {
      this.pointerStart = null;
    });

    // Prevent scroll/zoom gestures on the canvas
    canvas.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
      },
      { passive: false },
    );
  }

  private async trySwap(a: Position, b: Position): Promise<void> {
    if (this.phase !== 'idle') return;
    if (!areAdjacent(a, b)) return;

    this.phase = 'animating';
    this.renderer.hint = null;

    const typeA = this.board[a.row][a.col];
    const typeB = this.board[b.row][b.col];

    await animate(SWAP_DURATION_MS, (p) => {
      this.renderer.setSwapAnimation(a, b, typeA, typeB, p);
    });

    swapCells(this.board, a, b);
    this.renderer.clearAnimations();

    const matches = findMatches(this.board);
    if (matches.length === 0) {
      // Invalid — swap back
      await animate(SWAP_DURATION_MS, (p) => {
        this.renderer.setSwapAnimation(a, b, typeB, typeA, p);
      });
      swapCells(this.board, a, b);
      this.renderer.clearAnimations();
      this.phase = 'idle';
      this.showToast('No match!');
      return;
    }

    this.moves -= 1;
    this.updateHud();

    await this.resolveMatches(1);

    if (this.score >= SCORE_GOAL) {
      this.phase = 'won';
      this.showOverlay(
        'Level Complete!',
        'Those Pomeranians are thoroughly crushed.',
        this.score,
      );
      return;
    }

    if (this.moves <= 0) {
      this.phase = 'lost';
      this.showOverlay(
        'Out of Moves',
        'The fluff army lives another day.',
        this.score,
      );
      return;
    }

    if (!hasValidMoves(this.board)) {
      this.showToast('No moves — reshuffling…');
      await this.reshuffle();
    }

    this.phase = 'idle';
  }

  private async resolveMatches(combo: number): Promise<void> {
    const matches = findMatches(this.board);
    if (matches.length === 0) return;

    const cells = matches[0].cells;
    const types = cells.map((c) => this.board[c.row][c.col]);

    await animate(POP_DURATION_MS, (p) => {
      this.renderer.setPopAnimation(cells, types, p);
    });

    const cleared = cells.length;
    for (const { row, col } of cells) {
      this.board[row][col] = EMPTY_CELL;
    }

    const points = Math.round(
      cleared * BASE_MATCH_POINTS * Math.pow(COMBO_MULTIPLIER, combo - 1),
    );
    this.score += points;
    this.updateHud();

    if (combo > 1) {
      this.showToast(`Combo x${combo}! +${points}`);
    } else if (cleared >= 5) {
      this.showToast(`Pom-tastic! +${points}`);
    }

    this.renderer.clearAnimations();

    const { falls, spawns } = applyGravity(this.board);

    await animate(FALL_DURATION_MS, (p) => {
      this.renderer.setFallAnimation(falls, spawns, p);
    });
    this.renderer.clearAnimations();

    await this.resolveMatches(combo + 1);
  }

  private async reshuffle(): Promise<void> {
    this.phase = 'animating';
    // Keep reshuffling until a playable board appears
    let attempts = 0;
    do {
      this.board = generateBoard();
      attempts++;
    } while (!hasValidMoves(this.board) && attempts < 30);

    this.renderer.clearAnimations();
    this.phase = 'idle';
  }

  private updateHud(): void {
    this.hud.score.textContent = String(this.score);
    this.hud.moves.textContent = String(this.moves);
    this.hud.goal.textContent = String(SCORE_GOAL);
  }

  private showToast(message: string): void {
    const el = this.hud.toast;
    el.textContent = message;
    el.hidden = false;
    el.classList.remove('toast-show');
    // Force reflow for restart animation
    void el.offsetWidth;
    el.classList.add('toast-show');
    window.clearTimeout(this.comboToastTimer);
    this.comboToastTimer = window.setTimeout(() => {
      el.hidden = true;
      el.classList.remove('toast-show');
    }, 1400);
  }

  private showOverlay(title: string, message: string, score: number): void {
    this.hud.overlayTitle.textContent = title;
    this.hud.overlayMessage.textContent = message;
    this.hud.overlayScore.textContent = `Score: ${score}`;
    this.hud.overlay.hidden = false;
  }

  private hideOverlay(): void {
    this.hud.overlay.hidden = true;
  }

  /** Expose board clone for tests / debug */
  getBoardSnapshot(): Cell[][] {
    return cloneBoard(this.board);
  }
}
