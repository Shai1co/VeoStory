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

  const game = new Game(canvas, {
    score: requireEl('score'),
    moves: requireEl('moves'),
    goal: requireEl('goal'),
    toast: requireEl('toast'),
    overlay: requireEl('overlay'),
    overlayTitle: requireEl('overlay-title'),
    overlayMessage: requireEl('overlay-message'),
    overlayScore: requireEl('overlay-score'),
  });

  requireEl<HTMLButtonElement>('btn-new').addEventListener('click', () => {
    game.newGame();
  });

  requireEl<HTMLButtonElement>('btn-hint').addEventListener('click', () => {
    game.showHint();
  });

  requireEl<HTMLButtonElement>('btn-overlay').addEventListener('click', () => {
    game.newGame();
  });

  game.start();
}

boot();
