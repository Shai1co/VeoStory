import type { AbilityId } from './abilities';
import {
  FLUFF_PER_CHARGE,
  getAbility,
  isAbilityUnlocked,
  type AbilityProgress,
} from './abilities';
import type { StoryLevel } from './story';
import type { EffectsLayer } from './effects';
import type { WebGLRenderer } from './renderer';

export interface AbilityHudButton {
  id: AbilityId;
  button: HTMLButtonElement;
  fill: HTMLElement;
  cost: HTMLElement;
}

export interface HudSyncTarget {
  score: HTMLElement;
  moves: HTMLElement;
  goal: HTMLElement;
  level: HTMLElement;
  chapter: HTMLElement;
  fluffFill: HTMLElement;
  fluffCharges: HTMLElement;
  abilityButtons: AbilityHudButton[];
  toast: HTMLElement;
}

export function syncHud(args: {
  hud: HudSyncTarget;
  score: number;
  moves: number;
  level: StoryLevel;
  progress: AbilityProgress;
  phaseIdle: boolean;
}): void {
  const { hud, score, moves, level, progress, phaseIdle } = args;
  hud.score.textContent = String(score);
  hud.moves.textContent = String(moves);
  hud.goal.textContent = String(level.goal);
  hud.level.textContent = String(level.id);
  hud.chapter.textContent = level.chapter;
  hud.fluffFill.style.width = `${Math.round((progress.fluffMeter / FLUFF_PER_CHARGE) * 100)}%`;
  hud.fluffCharges.textContent = String(progress.charges);

  for (const entry of hud.abilityButtons) {
    const def = getAbility(entry.id);
    const unlocked = isAbilityUnlocked(entry.id, progress.highestCleared);
    const canCast = unlocked && progress.charges >= def.chargeCost && phaseIdle;
    entry.button.disabled = !canCast;
    entry.button.classList.toggle('ability--locked', !unlocked);
    entry.button.classList.toggle('ability--ready', canCast);
    entry.cost.textContent = unlocked ? `×${def.chargeCost}` : `Lv${def.unlockLevel}`;
    entry.fill.style.width = unlocked
      ? `${Math.min(100, (progress.charges / def.chargeCost) * 100)}%`
      : '0%';
    entry.button.title = unlocked
      ? `${def.name}: ${def.description}`
      : `Unlock by reaching level ${def.unlockLevel}`;
  }
}

export function spawnFxText(
  renderer: WebGLRenderer,
  effects: EffectsLayer,
  toast: HTMLElement,
  message: string,
  tone: 'combo' | 'special' | 'score' | 'story' | 'danger',
  scale: number,
  life: number,
  onTimer: (id: number) => void,
): void {
  const layout = renderer.getLayout();
  effects.spawnText(
    message,
    layout.originX + layout.boardPixelW / 2,
    layout.originY + layout.boardPixelH * 0.28,
    tone,
    scale,
    life,
  );
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.remove('toast-show');
  void toast.offsetWidth;
  toast.classList.add('toast-show');
  onTimer(
    window.setTimeout(() => {
      toast.hidden = true;
      toast.classList.remove('toast-show');
    }, 1200),
  );
}
