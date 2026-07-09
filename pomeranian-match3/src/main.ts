import './styles.css';
import { ABILITIES, Game, type AbilityHudButton } from './game/game';
import type { AbilityId } from './game/abilities';

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

  const abilityButtons: AbilityHudButton[] = ABILITIES.map((def) => {
    const button = requireEl<HTMLButtonElement>(`ability-${def.id}`);
    const fill = button.querySelector('.ability-charge-fill');
    const cost = button.querySelector('.ability-cost');
    if (!fill || !cost) {
      throw new Error(`Ability button missing parts: ${def.id}`);
    }
    return {
      id: def.id as AbilityId,
      button,
      fill: fill as HTMLElement,
      cost: cost as HTMLElement,
    };
  });

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
    fluffFill: requireEl('fluff-fill'),
    fluffCharges: requireEl('fluff-charges'),
    abilityButtons,
    muteBtn: requireEl<HTMLButtonElement>('btn-mute'),
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
