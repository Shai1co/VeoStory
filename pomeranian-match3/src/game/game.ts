import {
  FALL_DURATION_MS,
  SWAP_DURATION_MS,
  getSpecial,
} from './constants';
import {
  applyGravity,
  areAdjacent,
  cloneBoard,
  findHint,
  findMatches,
  generateBoard,
  hasValidMoves,
  rainbowSwapClears,
  swapCells,
  type Cell,
  type Position,
} from './board';
import {
  ABILITIES,
  applyAbility,
  getAbility,
  isAbilityUnlocked,
  loadProgress,
  markLevelCleared,
  saveProgress,
  trySpendCharges,
  type AbilityId,
  type AbilityProgress,
} from './abilities';
import { dogAudio } from './audio';
import { clearWithEffects, resolveMatches, type CascadeHost } from './cascade';
import { EffectsLayer } from './effects';
import { spawnFxText, syncHud, type AbilityHudButton } from './hudSync';
import { bindBoardInput } from './input';
import { WebGLRenderer } from './renderer';
import { TOTAL_STORY_LEVELS, getStoryLevel, type StoryLevel } from './story';

type GamePhase = 'idle' | 'animating' | 'won' | 'lost' | 'intro';

export type { AbilityHudButton };

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
  fluffFill: HTMLElement;
  fluffCharges: HTMLElement;
  abilityButtons: AbilityHudButton[];
  muteBtn: HTMLButtonElement;
}

function animate(durationMs: number, onFrame: (progress: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      onFrame(progress);
      if (progress < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

export class Game {
  private board: Cell[][];
  private score = 0;
  private moves = 0;
  private levelIndex = 0;
  private level: StoryLevel;
  private phase: GamePhase = 'intro';
  private selected: Position | null = null;
  private lastSwapFocus: Position | null = null;
  private readonly renderer: WebGLRenderer;
  private readonly effects: EffectsLayer;
  private readonly hud: HudElements;
  private progress: AbilityProgress;
  private running = false;
  private toastTimer = 0;

  constructor(canvas: HTMLCanvasElement, stage: HTMLElement, hud: HudElements) {
    this.renderer = new WebGLRenderer(canvas);
    this.effects = new EffectsLayer(stage);
    this.hud = hud;
    this.progress = loadProgress();
    this.level = getStoryLevel(0);
    this.board = generateBoard(this.level.typeCount);
    this.moves = this.level.moves;
    bindBoardInput(canvas, {
      isIdle: () => this.phase === 'idle',
      cellAt: (x, y) => this.renderer.cellAt(x, y),
      onSwap: (a, b) => {
        void this.trySwap(a, b);
      },
      onSelect: (cell) => {
        this.selected = cell;
      },
      getSelected: () => this.selected,
    });
    this.bindAbilityUi();
    this.updateHud();
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

  newGame(): void {
    dogAudio.unlock();
    dogAudio.uiTap();
    this.beginLevel(0, true);
  }

  continueStory(): void {
    dogAudio.unlock();
    dogAudio.uiTap();
    if (this.phase === 'won') {
      this.beginLevel(
        this.levelIndex >= TOTAL_STORY_LEVELS - 1 ? 0 : this.levelIndex + 1,
        true,
      );
      return;
    }
    this.beginLevel(this.levelIndex, false);
  }

  showHint(): void {
    dogAudio.unlock();
    dogAudio.uiTap();
    if (this.phase !== 'idle') return;
    const hint = findHint(this.board);
    if (!hint) {
      this.fxText('No moves!', 'danger');
      void this.reshuffle();
      return;
    }
    this.renderer.hint = hint;
    this.fxText('Try this!', 'story', 0.9);
    dogAudio.yip();
    window.setTimeout(() => {
      this.renderer.hint = null;
    }, 2000);
  }

  toggleMute(): void {
    dogAudio.unlock();
    const muted = dogAudio.toggleMute();
    this.hud.muteBtn.textContent = muted ? '🔇' : '🔊';
    this.hud.muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  }

  private host(): CascadeHost {
    const game = this;
    return {
      get board() {
        return game.board;
      },
      set board(v: Cell[][]) {
        game.board = v;
      },
      get score() {
        return game.score;
      },
      set score(v: number) {
        game.score = v;
      },
      get progress() {
        return game.progress;
      },
      get typeCount() {
        return game.level.typeCount;
      },
      get lastSwapFocus() {
        return game.lastSwapFocus;
      },
      renderer: game.renderer,
      effects: game.effects,
      updateHud: () => game.updateHud(),
      saveProgress: () => saveProgress(game.progress),
      fxText: (m, t, s, l) => game.fxText(m, t, s, l),
      onChargeEarned: () => {
        dogAudio.abilityReady();
        game.fxText('Charge ready!', 'special', 1.05);
      },
    };
  }

  private bindAbilityUi(): void {
    for (const entry of this.hud.abilityButtons) {
      entry.button.addEventListener('click', () => {
        dogAudio.unlock();
        void this.castAbility(entry.id);
      });
    }
    this.hud.muteBtn.addEventListener('click', () => this.toggleMute());
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
      dogAudio.yip();
      this.updateHud();
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

  private async castAbility(id: AbilityId): Promise<void> {
    if (this.phase !== 'idle') return;
    if (!isAbilityUnlocked(id, this.progress.highestCleared)) {
      this.fxText(`Unlock at Lv ${getAbility(id).unlockLevel}`, 'danger', 0.9);
      dogAudio.whimper();
      return;
    }
    const def = getAbility(id);
    if (!trySpendCharges(this.progress, def.chargeCost)) {
      this.fxText('Need more fluff!', 'danger', 0.9);
      dogAudio.whimper();
      return;
    }
    saveProgress(this.progress);
    this.updateHud();
    this.phase = 'animating';
    this.selected = null;
    this.renderer.hint = null;
    dogAudio.abilityCast();
    this.effects.flash('special');
    this.effects.screenShake(180);

    const result = applyAbility(this.board, id, this.level.typeCount);
    this.fxText(result.label, 'special', 1.2, 1300);

    if (result.reshuffled) {
      await this.reshuffle();
      this.phase = 'idle';
      this.updateHud();
      return;
    }
    if (result.placed.length > 0) {
      for (const p of result.placed) {
        const layout = this.renderer.getLayout();
        const x = layout.originX + p.at.col * layout.cellSize + layout.cellSize / 2;
        const y = layout.originY + p.at.row * layout.cellSize + layout.cellSize / 2;
        this.effects.spawnBurst(x, y, '#ff9040', 18);
        this.effects.spawnText('BOMB!', x, y, 'special', 1.1);
      }
      dogAudio.specialSpawn();
      await resolveMatches(this.host(), 1);
      await this.afterCascade();
      return;
    }
    if (result.cleared.length > 0) {
      await clearWithEffects(this.host(), result.cleared, 1, true);
      const { falls, spawns } = applyGravity(this.board, this.level.typeCount);
      await animate(FALL_DURATION_MS, (p) => this.renderer.setFallAnimation(falls, spawns, p));
      this.renderer.clearAnimations();
      dogAudio.fall();
      await resolveMatches(this.host(), 1);
      await this.afterCascade();
      return;
    }
    this.phase = 'idle';
    this.updateHud();
  }

  private async trySwap(a: Position, b: Position): Promise<void> {
    if (this.phase !== 'idle' || !areAdjacent(a, b)) return;
    this.phase = 'animating';
    this.renderer.hint = null;
    this.lastSwapFocus = a;
    const typeA = this.board[a.row][a.col];
    const typeB = this.board[b.row][b.col];
    const specialA = getSpecial(typeA);
    const specialB = getSpecial(typeB);

    await animate(SWAP_DURATION_MS, (p) => this.renderer.setSwapAnimation(a, b, typeA, typeB, p));
    swapCells(this.board, a, b);
    this.renderer.clearAnimations();

    if (specialA === 'rainbow' || specialB === 'rainbow') {
      const rPos = specialA === 'rainbow' ? b : a;
      const cPos = specialA === 'rainbow' ? a : b;
      this.moves -= 1;
      this.updateHud();
      dogAudio.specialBlast('rainbow');
      await clearWithEffects(this.host(), rainbowSwapClears(this.board, rPos, cPos), 1, true);
      await this.afterCascade();
      return;
    }

    if (findMatches(this.board).cells.length === 0) {
      await animate(SWAP_DURATION_MS, (p) => this.renderer.setSwapAnimation(a, b, typeB, typeA, p));
      swapCells(this.board, a, b);
      this.renderer.clearAnimations();
      this.phase = 'idle';
      this.fxText('Nope!', 'danger', 0.85);
      dogAudio.whimper();
      this.updateHud();
      return;
    }

    this.moves -= 1;
    this.updateHud();
    await resolveMatches(this.host(), 1);
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
      dogAudio.win();
      const newlyUnlocked = markLevelCleared(this.progress, this.level.id);
      saveProgress(this.progress);
      this.updateHud();
      for (const id of newlyUnlocked) {
        this.fxText(`Unlocked: ${getAbility(id).name}!`, 'special', 1.15, 1600);
        dogAudio.abilityReady();
      }
      const isFinale = this.levelIndex >= TOTAL_STORY_LEVELS - 1;
      const unlockNote =
        newlyUnlocked.length > 0
          ? ` ${newlyUnlocked.map((id) => getAbility(id).name).join(', ')} unlocked!`
          : '';
      this.showOverlay(
        isFinale ? 'Luli is Legend!' : 'Level Clear!',
        this.level.winLine + unlockNote,
        this.score,
        isFinale ? 'Play Story Again' : 'Next Chapter',
      );
      return;
    }

    if (this.moves <= 0) {
      this.phase = 'lost';
      this.fxText('Out of moves…', 'danger', 1.1, 1400);
      dogAudio.lose();
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
    this.updateHud();
  }

  private async reshuffle(): Promise<void> {
    this.phase = 'animating';
    let attempts = 0;
    do {
      this.board = generateBoard(this.level.typeCount);
      attempts++;
    } while (!hasValidMoves(this.board) && attempts < 30);
    this.renderer.clearAnimations();
    dogAudio.bark();
    this.phase = 'idle';
  }

  private updateHud(): void {
    syncHud({
      hud: this.hud,
      score: this.score,
      moves: this.moves,
      level: this.level,
      progress: this.progress,
      phaseIdle: this.phase === 'idle',
    });
  }

  private fxText(
    message: string,
    tone: 'combo' | 'special' | 'score' | 'story' | 'danger' = 'combo',
    scale = 1,
    life = 1200,
  ): void {
    window.clearTimeout(this.toastTimer);
    spawnFxText(this.renderer, this.effects, this.hud.toast, message, tone, scale, life, (id) => {
      this.toastTimer = id;
    });
  }

  private showOverlay(title: string, message: string, score: number, buttonLabel: string): void {
    this.hud.overlayTitle.textContent = title;
    this.hud.overlayMessage.textContent = message;
    this.hud.overlayScore.textContent = `Score: ${score}`;
    this.hud.overlayBtn.textContent = buttonLabel;
    this.hud.overlay.hidden = false;
    this.updateHud();
  }

  private hideOverlay(): void {
    this.hud.overlay.hidden = true;
  }

  getBoardSnapshot(): Cell[][] {
    return cloneBoard(this.board);
  }
}

export { ABILITIES };
