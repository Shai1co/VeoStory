import {
  BASE_MATCH_POINTS,
  COMBO_MULTIPLIER,
  EMPTY_CELL,
  FALL_DURATION_MS,
  POP_DURATION_MS,
  POM_STYLES,
  SPECIAL_BONUS_POINTS,
  SPECIAL_BURST_MS,
  SWAP_DURATION_MS,
  SWIPE_THRESHOLD_PX,
  getColor,
  getSpecial,
  isSpecial,
} from './constants';
import {
  applyGravity,
  areAdjacent,
  clearCells,
  cloneBoard,
  expandSpecialClears,
  findHint,
  findMatches,
  generateBoard,
  hasValidMoves,
  placeSpecials,
  planSpecialSpawns,
  rainbowSwapClears,
  swapCells,
  type Cell,
  type Position,
} from './board';
import { EffectsLayer } from './effects';
import { WebGLRenderer } from './renderer';
import {
  TOTAL_STORY_LEVELS,
  comboLineFor,
  getStoryLevel,
  type StoryLevel,
} from './story';

type GamePhase = 'idle' | 'animating' | 'won' | 'lost' | 'intro';

export interface HudElements {
  score: HTMLElement;
  moves: HTMLElement;
  goal: HTMLElement;
  level: HTMLElement;
  chapter: HTMLElement;
  toast: HTMLElement;
  overlay: HTMLElement;
  overlayTitle: HTMLElement;
  overlayMessage: HTMLElement;
  overlayScore: HTMLElement;
  overlayBtn: HTMLButtonElement;
  storyBanner: HTMLElement;
  storyTitle: HTMLElement;
  storyBlurb: HTMLElement;
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

function centroid(cells: Position[], layout: { originX: number; originY: number; cellSize: number }): {
  x: number;
  y: number;
} {
  let x = 0;
  let y = 0;
  for (const c of cells) {
    x += layout.originX + c.col * layout.cellSize + layout.cellSize / 2;
    y += layout.originY + c.row * layout.cellSize + layout.cellSize / 2;
  }
  const n = Math.max(1, cells.length);
  return { x: x / n, y: y / n };
}

export class Game {
  private board: Cell[][];
  private score = 0;
  private moves = 0;
  private levelIndex = 0;
  private level: StoryLevel;
  private phase: GamePhase = 'intro';
  private selected: Position | null = null;
  private pointerStart: { x: number; y: number; cell: Position } | null = null;
  private lastSwapFocus: Position | null = null;
  private readonly renderer: WebGLRenderer;
  private readonly effects: EffectsLayer;
  private readonly hud: HudElements;
  private running = false;
  private toastTimer = 0;

  constructor(canvas: HTMLCanvasElement, stage: HTMLElement, hud: HudElements) {
    this.renderer = new WebGLRenderer(canvas);
    this.effects = new EffectsLayer(stage);
    this.hud = hud;
    this.level = getStoryLevel(0);
    this.board = generateBoard(this.level.typeCount);
    this.moves = this.level.moves;
    this.bindInput(canvas);
    this.showLevelIntro(true);
  }

  start(): void {
    this.running = true;
    this.renderer.resize();
    this.effects.resize();
    const loop = (now: number) => {
      if (!this.running) return;
      this.renderer.selected = this.selected;
      this.renderer.render(this.board, now);
      this.effects.update(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.effects.resize();
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.renderer.resize();
        this.effects.resize();
      }, 100);
    });
  }

  /** Restart current level */
  retryLevel(): void {
    this.beginLevel(this.levelIndex, false);
  }

  /** Start story from level 1 */
  newGame(): void {
    this.beginLevel(0, true);
  }

  continueStory(): void {
    if (this.phase === 'won') {
      if (this.levelIndex >= TOTAL_STORY_LEVELS - 1) {
        this.beginLevel(0, true);
      } else {
        this.beginLevel(this.levelIndex + 1, true);
      }
      return;
    }
    if (this.phase === 'lost' || this.phase === 'intro') {
      this.beginLevel(this.levelIndex, false);
      return;
    }
    this.beginLevel(this.levelIndex, false);
  }

  showHint(): void {
    if (this.phase !== 'idle') return;
    const hint = findHint(this.board);
    if (!hint) {
      this.fxText('No moves!', 'danger');
      void this.reshuffle();
      return;
    }
    this.renderer.hint = hint;
    this.fxText('Try this!', 'story', 0.9);
    window.setTimeout(() => {
      this.renderer.hint = null;
    }, 2000);
  }

  private beginLevel(index: number, showIntro: boolean): void {
    this.levelIndex = index;
    this.level = getStoryLevel(index);
    this.board = generateBoard(this.level.typeCount);
    this.score = 0;
    this.moves = this.level.moves;
    this.selected = null;
    this.lastSwapFocus = null;
    this.renderer.hint = null;
    this.renderer.clearAnimations();
    this.effects.clear();
    this.hideOverlay();
    this.updateHud();

    if (showIntro) {
      this.showLevelIntro(false);
    } else {
      this.phase = 'idle';
      this.hud.storyBanner.hidden = true;
      this.fxText(this.level.title, 'story', 1.15, 1400);
    }
  }

  private showLevelIntro(isBoot: boolean): void {
    this.phase = 'intro';
    this.hud.storyBanner.hidden = false;
    this.hud.storyTitle.textContent = `${this.level.chapter} — ${this.level.title}`;
    this.hud.storyBlurb.textContent = this.level.blurb;
    this.updateHud();

    this.hud.overlayTitle.textContent = isBoot ? 'Luli Crush' : this.level.title;
    this.hud.overlayMessage.textContent = this.level.blurb;
    this.hud.overlayScore.textContent = `Goal ${this.level.goal} · ${this.level.moves} moves`;
    this.hud.overlayBtn.textContent = isBoot ? 'Start Story' : 'Play Level';
    this.hud.overlay.hidden = false;
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
    this.lastSwapFocus = a;

    const typeA = this.board[a.row][a.col];
    const typeB = this.board[b.row][b.col];
    const specialA = getSpecial(typeA);
    const specialB = getSpecial(typeB);

    await animate(SWAP_DURATION_MS, (p) => {
      this.renderer.setSwapAnimation(a, b, typeA, typeB, p);
    });

    swapCells(this.board, a, b);
    this.renderer.clearAnimations();

    // Rainbow swap with a color → clear that color
    if (specialA === 'rainbow' || specialB === 'rainbow') {
      const rPos = specialA === 'rainbow' ? b : a;
      const cPos = specialA === 'rainbow' ? a : b;

      this.moves -= 1;
      this.updateHud();

      const clears = rainbowSwapClears(this.board, rPos, cPos);
      await this.clearWithEffects(clears, 1, true);
      await this.afterCascade();
      return;
    }

    const matches = findMatches(this.board);
    if (matches.cells.length === 0) {
      await animate(SWAP_DURATION_MS, (p) => {
        this.renderer.setSwapAnimation(a, b, typeB, typeA, p);
      });
      swapCells(this.board, a, b);
      this.renderer.clearAnimations();
      this.phase = 'idle';
      this.fxText('Nope!', 'danger', 0.85);
      return;
    }

    this.moves -= 1;
    this.updateHud();

    await this.resolveMatches(1);
    await this.afterCascade();
  }

  private async afterCascade(): Promise<void> {
    if (this.score >= this.level.goal) {
      this.phase = 'won';
      this.effects.flash('win');
      this.effects.screenShake(300);
      const layout = this.renderer.getLayout();
      this.effects.spawnComboBurst(
        layout.originX + layout.boardPixelW / 2,
        layout.originY + layout.boardPixelH / 2,
        6,
      );
      this.fxText('LEVEL CLEAR!', 'story', 1.4, 1600);

      const isFinale = this.levelIndex >= TOTAL_STORY_LEVELS - 1;
      this.showOverlay(
        isFinale ? 'Luli is Legend!' : 'Level Clear!',
        this.level.winLine,
        this.score,
        isFinale ? 'Play Story Again' : 'Next Chapter',
      );
      return;
    }

    if (this.moves <= 0) {
      this.phase = 'lost';
      this.fxText('Out of moves…', 'danger', 1.1, 1400);
      this.showOverlay(
        'Fluff Overwhelmed',
        'The poms held the line. Try again, crusher!',
        this.score,
        'Retry Level',
      );
      return;
    }

    if (!hasValidMoves(this.board)) {
      this.fxText('Reshuffle!', 'story');
      await this.reshuffle();
    }

    this.phase = 'idle';
  }

  private async resolveMatches(combo: number): Promise<void> {
    const matches = findMatches(this.board);
    if (matches.cells.length === 0) return;

    // Include specials that are part of the match for chain blasts
    const specialTriggers = matches.cells.filter((c) =>
      isSpecial(this.board[c.row][c.col]),
    );

    let clearSet = matches.cells;
    let activatedSpecials = false;

    if (specialTriggers.length > 0) {
      const expanded = expandSpecialClears(this.board, specialTriggers);
      // Union with match cells
      const set = new Set(clearSet.map((c) => `${c.row},${c.col}`));
      for (const c of expanded.cells) set.add(`${c.row},${c.col}`);
      clearSet = [...set].map((k) => {
        const [row, col] = k.split(',').map(Number);
        return { row, col };
      });
      activatedSpecials = expanded.activated.length > 0;
    }

    const spawns = planSpecialSpawns(matches, this.lastSwapFocus);

    await this.clearWithEffects(clearSet, combo, activatedSpecials);

    // Place new specials in emptied cells
    if (spawns.length > 0) {
      placeSpecials(this.board, spawns);
      for (const s of spawns) {
        const layout = this.renderer.getLayout();
        const x = layout.originX + s.at.col * layout.cellSize + layout.cellSize / 2;
        const y = layout.originY + s.at.row * layout.cellSize + layout.cellSize / 2;
        const label =
          s.kind === 'rainbow'
            ? 'RAINBOW!'
            : s.kind === 'bomb'
              ? 'BOMB!'
              : 'STRIPE!';
        this.effects.spawnText(label, x, y, 'special', 1.2, 1200);
        this.effects.spawnBurst(x, y, '#ffe066', 16);
      }
      this.effects.flash('special');
    }

    const { falls, spawns: gravitySpawns } = applyGravity(
      this.board,
      this.level.typeCount,
    );

    await animate(FALL_DURATION_MS, (p) => {
      this.renderer.setFallAnimation(falls, gravitySpawns, p);
    });
    this.renderer.clearAnimations();

    await this.resolveMatches(combo + 1);
  }

  private async clearWithEffects(
    cells: Position[],
    combo: number,
    specialBlast: boolean,
  ): Promise<void> {
    if (cells.length === 0) return;

    const types = cells.map((c) => this.board[c.row][c.col]);
    const layout = this.renderer.getLayout();
    const center = centroid(cells, layout);

    const duration = specialBlast ? SPECIAL_BURST_MS : POP_DURATION_MS;
    await animate(duration, (p) => {
      this.renderer.setPopAnimation(cells, types, p);
    });

    let specialCount = 0;
    for (const t of types) {
      if (isSpecial(t)) specialCount++;
    }

    clearCells(this.board, cells);
    this.renderer.clearAnimations();

    const points = Math.round(
      cells.length * BASE_MATCH_POINTS * Math.pow(COMBO_MULTIPLIER, combo - 1) +
        specialCount * SPECIAL_BONUS_POINTS,
    );
    this.score += points;
    this.updateHud();

    // Visual juice
    const colorIdx = getColor(types.find((t) => getColor(t) !== EMPTY_CELL) ?? 0);
    const burstColor =
      colorIdx >= 0 && colorIdx < POM_STYLES.length
        ? POM_STYLES[colorIdx].fur
        : '#ffe066';

    this.effects.spawnBurst(center.x, center.y, burstColor, 8 + cells.length);
    if (combo > 1 || specialBlast) {
      this.effects.spawnComboBurst(center.x, center.y, combo);
      this.effects.screenShake(120 + combo * 30);
      this.effects.flash(specialBlast ? 'special' : 'combo');
    }

    const line = combo > 1 ? `${comboLineFor(combo)} x${combo}` : `+${points}`;
    this.effects.spawnText(line, center.x, center.y - 10, combo > 2 ? 'combo' : 'score', 0.95 + combo * 0.12);

    if (combo >= 3) {
      this.fxText(comboLineFor(combo), 'combo', 1.2 + combo * 0.05);
    } else if (cells.length >= 5) {
      this.fxText('Big Match!', 'special', 1.05);
    }
  }

  private async reshuffle(): Promise<void> {
    this.phase = 'animating';
    let attempts = 0;
    do {
      this.board = generateBoard(this.level.typeCount);
      attempts++;
    } while (!hasValidMoves(this.board) && attempts < 30);

    this.renderer.clearAnimations();
    this.phase = 'idle';
  }

  private updateHud(): void {
    this.hud.score.textContent = String(this.score);
    this.hud.moves.textContent = String(this.moves);
    this.hud.goal.textContent = String(this.level.goal);
    this.hud.level.textContent = String(this.level.id);
    this.hud.chapter.textContent = this.level.chapter;
  }

  private fxText(
    message: string,
    tone: 'combo' | 'special' | 'score' | 'story' | 'danger' = 'combo',
    scale = 1,
    life = 1200,
  ): void {
    const layout = this.renderer.getLayout();
    const x = layout.originX + layout.boardPixelW / 2;
    const y = layout.originY + layout.boardPixelH * 0.28;
    this.effects.spawnText(message, x, y, tone, scale, life);

    // Also brief toast for accessibility
    const el = this.hud.toast;
    el.textContent = message;
    el.hidden = false;
    el.classList.remove('toast-show');
    void el.offsetWidth;
    el.classList.add('toast-show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      el.hidden = true;
      el.classList.remove('toast-show');
    }, 1200);
  }

  private showOverlay(
    title: string,
    message: string,
    score: number,
    buttonLabel: string,
  ): void {
    this.hud.overlayTitle.textContent = title;
    this.hud.overlayMessage.textContent = message;
    this.hud.overlayScore.textContent = `Score: ${score}`;
    this.hud.overlayBtn.textContent = buttonLabel;
    this.hud.overlay.hidden = false;
  }

  private hideOverlay(): void {
    this.hud.overlay.hidden = true;
  }

  getBoardSnapshot(): Cell[][] {
    return cloneBoard(this.board);
  }
}
