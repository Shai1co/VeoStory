import { SWIPE_THRESHOLD_PX } from './constants';
import { areAdjacent, type Position } from './board';
import { dogAudio } from './audio';

export interface InputHandlers {
  isIdle: () => boolean;
  cellAt: (x: number, y: number) => Position | null;
  onSwap: (a: Position, b: Position) => void;
  onSelect: (cell: Position | null) => void;
  getSelected: () => Position | null;
}

export function bindBoardInput(canvas: HTMLCanvasElement, handlers: InputHandlers): void {
  let pointerStart: { x: number; y: number; cell: Position } | null = null;

  const onDown = (clientX: number, clientY: number) => {
    dogAudio.unlock();
    if (!handlers.isIdle()) return;
    const cell = handlers.cellAt(clientX, clientY);
    if (!cell) return;
    pointerStart = { x: clientX, y: clientY, cell };
  };

  const onUp = (clientX: number, clientY: number) => {
    if (!handlers.isIdle() || !pointerStart) {
      pointerStart = null;
      return;
    }
    const start = pointerStart;
    pointerStart = null;
    const dx = clientX - start.x;
    const dy = clientY - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > SWIPE_THRESHOLD_PX || absDy > SWIPE_THRESHOLD_PX) {
      const target =
        absDx > absDy
          ? { row: start.cell.row, col: start.cell.col + (dx > 0 ? 1 : -1) }
          : { row: start.cell.row + (dy > 0 ? 1 : -1), col: start.cell.col };
      handlers.onSwap(start.cell, target);
      handlers.onSelect(null);
      return;
    }

    const cell = handlers.cellAt(clientX, clientY) ?? start.cell;
    const selected = handlers.getSelected();
    if (selected && areAdjacent(selected, cell)) {
      handlers.onSelect(null);
      handlers.onSwap(selected, cell);
    } else if (selected && selected.row === cell.row && selected.col === cell.col) {
      handlers.onSelect(null);
    } else {
      handlers.onSelect(cell);
      dogAudio.select();
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
    pointerStart = null;
  });
  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
}
