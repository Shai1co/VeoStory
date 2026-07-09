import './styles.css';
import { Game } from './game/game';

function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing element #${id}`);
  }
  return el as T;
}

function boot(): void {
  const canvas = requireEl<HTMLCanvasElement>('game-canvas');
  const stage = requireEl<HTMLElement>('stage');

  const game = new Game(canvas, stage, {
    score: requireEl('score'),
    moves: requireEl('moves'),
    goal: requireEl('goal'),
    level: requireEl('level'),
    chapter: requireEl('chapter'),
    toast: requireEl('toast'),
    overlay: requireEl('overlay'),
    overlayTitle: requireEl('overlay-title'),
    overlayMessage: requireEl('overlay-message'),
    overlayScore: requireEl('overlay-score'),
    overlayBtn: requireEl<HTMLButtonElement>('btn-overlay'),
    storyBanner: requireEl('story-banner'),
    storyTitle: requireEl('story-title'),
    storyBlurb: requireEl('story-blurb'),
  });

  requireEl<HTMLButtonElement>('btn-new').addEventListener('click', () => {
    game.newGame();
  });

  requireEl<HTMLButtonElement>('btn-hint').addEventListener('click', () => {
    game.showHint();
  });

  requireEl<HTMLButtonElement>('btn-overlay').addEventListener('click', () => {
    game.continueStory();
  });

  game.start();
}

boot();
