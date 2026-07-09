import { POM_PALETTES, POM_TYPE_COUNT } from './constants';

const SPRITE_SIZE = 128;

function drawPomFace(
  ctx: CanvasRenderingContext2D,
  palette: Readonly<[string, string, string, string]>,
): void {
  const [fur, accent, ear, eye] = palette;
  const cx = SPRITE_SIZE / 2;
  const cy = SPRITE_SIZE / 2 + 4;
  const bodyR = 42;

  // Soft shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + bodyR - 4, bodyR * 0.85, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = ear;
  ctx.beginPath();
  ctx.moveTo(cx - 38, cy - 10);
  ctx.quadraticCurveTo(cx - 52, cy - 48, cx - 18, cy - 36);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 38, cy - 10);
  ctx.quadraticCurveTo(cx + 52, cy - 48, cx + 18, cy - 36);
  ctx.closePath();
  ctx.fill();

  // Inner ears
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(cx - 34, cy - 12);
  ctx.quadraticCurveTo(cx - 44, cy - 38, cx - 22, cy - 30);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 34, cy - 12);
  ctx.quadraticCurveTo(cx + 44, cy - 38, cx + 22, cy - 30);
  ctx.closePath();
  ctx.fill();

  // Fluffy body / head
  const gradient = ctx.createRadialGradient(cx - 10, cy - 12, 8, cx, cy, bodyR);
  gradient.addColorStop(0, fur);
  gradient.addColorStop(0.7, fur);
  gradient.addColorStop(1, accent);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
  ctx.fill();

  // Cheek fluff tufts
  ctx.fillStyle = fur;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * 36, cy + 6, 14, 18, side * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Muzzle
  ctx.fillStyle = '#fff8f0';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 14, 18, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = eye;
  ctx.beginPath();
  ctx.arc(cx - 14, cy - 2, 6, 0, Math.PI * 2);
  ctx.arc(cx + 14, cy - 2, 6, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - 12, cy - 4, 2.2, 0, Math.PI * 2);
  ctx.arc(cx + 16, cy - 4, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = '#2a1a12';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#2a1a12';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy + 14, 8, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // Tiny tongue
  ctx.fillStyle = '#e87a8a';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 24, 4, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Build an atlas canvas with one Pomeranian sprite per type. */
export function createPomAtlas(): {
  canvas: HTMLCanvasElement;
  size: number;
  typeCount: number;
} {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE * POM_TYPE_COUNT;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create 2D context for Pomeranian atlas');
  }

  for (let i = 0; i < POM_TYPE_COUNT; i++) {
    ctx.save();
    ctx.translate(i * SPRITE_SIZE, 0);
    // Clear transparent
    ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    drawPomFace(ctx, POM_PALETTES[i]);
    ctx.restore();
  }

  return { canvas, size: SPRITE_SIZE, typeCount: POM_TYPE_COUNT };
}

export function getAtlasUv(type: number, typeCount: number): {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
} {
  const u0 = type / typeCount;
  const u1 = (type + 1) / typeCount;
  return { u0, v0: 0, u1, v1: 1 };
}
