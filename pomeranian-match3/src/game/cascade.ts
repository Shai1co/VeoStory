import {
  BASE_MATCH_POINTS,
  COMBO_MULTIPLIER,
  EMPTY_CELL,
  FALL_DURATION_MS,
  POP_DURATION_MS,
  POM_STYLES,
  SPECIAL_BONUS_POINTS,
  SPECIAL_BURST_MS,
  getColor,
  isSpecial,
} from './constants';
import {
  applyGravity,
  clearCells,
  expandSpecialClears,
  findMatches,
  placeSpecials,
  planSpecialSpawns,
  type Cell,
  type Position,
} from './board';
import { addFluff, type AbilityProgress } from './abilities';
import { dogAudio } from './audio';
import type { EffectsLayer } from './effects';
import type { WebGLRenderer } from './renderer';
import { comboLineFor } from './story';

export interface CascadeHost {
  board: Cell[][];
  score: number;
  progress: AbilityProgress;
  typeCount: number;
  lastSwapFocus: Position | null;
  renderer: WebGLRenderer;
  effects: EffectsLayer;
  updateHud: () => void;
  saveProgress: () => void;
  fxText: (
    message: string,
    tone?: 'combo' | 'special' | 'score' | 'story' | 'danger',
    scale?: number,
    life?: number,
  ) => void;
  onChargeEarned: () => void;
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

function centroid(
  cells: Position[],
  layout: { originX: number; originY: number; cellSize: number },
): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const c of cells) {
    x += layout.originX + c.col * layout.cellSize + layout.cellSize / 2;
    y += layout.originY + c.row * layout.cellSize + layout.cellSize / 2;
  }
  const n = Math.max(1, cells.length);
  return { x: x / n, y: y / n };
}

export async function resolveMatches(host: CascadeHost, combo: number): Promise<void> {
  const matches = findMatches(host.board);
  if (matches.cells.length === 0) return;

  const specialTriggers = matches.cells.filter((c) =>
    isSpecial(host.board[c.row][c.col]),
  );

  let clearSet = matches.cells;
  let activatedSpecials = false;
  let blastKind: 'stripe' | 'bomb' | 'rainbow' | 'generic' = 'generic';

  if (specialTriggers.length > 0) {
    const expanded = expandSpecialClears(host.board, specialTriggers);
    const set = new Set(clearSet.map((c) => `${c.row},${c.col}`));
    for (const c of expanded.cells) set.add(`${c.row},${c.col}`);
    clearSet = [...set].map((k) => {
      const [row, col] = k.split(',').map(Number);
      return { row, col };
    });
    activatedSpecials = expanded.activated.length > 0;
    if (expanded.activated.some((a) => a.kind === 'rainbow')) blastKind = 'rainbow';
    else if (expanded.activated.some((a) => a.kind === 'bomb')) blastKind = 'bomb';
    else if (
      expanded.activated.some((a) => a.kind === 'stripe_h' || a.kind === 'stripe_v')
    ) {
      blastKind = 'stripe';
    }
  }

  const spawns = planSpecialSpawns(matches, host.lastSwapFocus);

  if (activatedSpecials) {
    dogAudio.specialBlast(blastKind);
  }

  await clearWithEffects(host, clearSet, combo, activatedSpecials);

  if (spawns.length > 0) {
    placeSpecials(host.board, spawns);
    for (const s of spawns) {
      const layout = host.renderer.getLayout();
      const x = layout.originX + s.at.col * layout.cellSize + layout.cellSize / 2;
      const y = layout.originY + s.at.row * layout.cellSize + layout.cellSize / 2;
      const label =
        s.kind === 'rainbow' ? 'RAINBOW!' : s.kind === 'bomb' ? 'BOMB!' : 'STRIPE!';
      host.effects.spawnText(label, x, y, 'special', 1.2, 1200);
      host.effects.spawnBurst(x, y, '#ffe066', 16);
    }
    host.effects.flash('special');
    dogAudio.specialSpawn();
  }

  const { falls, spawns: gravitySpawns } = applyGravity(host.board, host.typeCount);

  await animate(FALL_DURATION_MS, (p) => {
    host.renderer.setFallAnimation(falls, gravitySpawns, p);
  });
  host.renderer.clearAnimations();
  if (falls.length + gravitySpawns.length > 0) {
    dogAudio.fall();
  }

  await resolveMatches(host, combo + 1);
}

export async function clearWithEffects(
  host: CascadeHost,
  cells: Position[],
  combo: number,
  specialBlast: boolean,
): Promise<void> {
  if (cells.length === 0) return;

  const types = cells.map((c) => host.board[c.row][c.col]);
  const layout = host.renderer.getLayout();
  const center = centroid(cells, layout);

  const duration = specialBlast ? SPECIAL_BURST_MS : POP_DURATION_MS;
  await animate(duration, (p) => {
    host.renderer.setPopAnimation(cells, types, p);
  });

  let specialCount = 0;
  for (const t of types) {
    if (isSpecial(t)) specialCount++;
  }

  clearCells(host.board, cells);
  host.renderer.clearAnimations();

  const points = Math.round(
    cells.length * BASE_MATCH_POINTS * Math.pow(COMBO_MULTIPLIER, combo - 1) +
      specialCount * SPECIAL_BONUS_POINTS,
  );
  host.score += points;

  const fluffGain = Math.round(points * 0.35 + cells.length * 2 + (combo - 1) * 8);
  const earnedCharges = addFluff(host.progress, fluffGain);
  host.saveProgress();
  if (earnedCharges > 0) {
    host.onChargeEarned();
  }

  host.updateHud();

  const colorIdx = getColor(types.find((t) => getColor(t) !== EMPTY_CELL) ?? 0);
  const burstColor =
    colorIdx >= 0 && colorIdx < POM_STYLES.length
      ? POM_STYLES[colorIdx].fur
      : '#ffe066';

  host.effects.spawnBurst(center.x, center.y, burstColor, 8 + cells.length);
  if (combo > 1 || specialBlast) {
    host.effects.spawnComboBurst(center.x, center.y, combo);
    host.effects.screenShake(120 + combo * 30);
    host.effects.flash(specialBlast ? 'special' : 'combo');
  }

  if (!specialBlast) {
    if (combo >= 3 || cells.length >= 6) dogAudio.woof();
    else if (combo > 1) dogAudio.happyCombo(combo);
    else dogAudio.yip();
  } else if (combo > 1) {
    dogAudio.happyCombo(combo);
  }

  const line = combo > 1 ? `${comboLineFor(combo)} x${combo}` : `+${points}`;
  host.effects.spawnText(
    line,
    center.x,
    center.y - 10,
    combo > 2 ? 'combo' : 'score',
    0.95 + combo * 0.12,
  );

  if (combo >= 3) {
    host.fxText(comboLineFor(combo), 'combo', 1.2 + combo * 0.05);
  } else if (cells.length >= 5) {
    host.fxText('Big Match!', 'special', 1.05);
  }
}
