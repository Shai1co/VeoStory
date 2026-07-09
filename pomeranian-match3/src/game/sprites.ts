import {
  ATLAS_BOMB_START,
  ATLAS_RAINBOW_INDEX,
  ATLAS_STRIPE_H_START,
  ATLAS_STRIPE_V_START,
  ATLAS_TOTAL,
  POM_STYLES,
  POM_TYPE_COUNT,
  type PomStyle,
} from './constants';

const SPRITE_SIZE = 128;

function drawAccessory(
  ctx: CanvasRenderingContext2D,
  style: PomStyle,
  cx: number,
  cy: number,
): void {
  switch (style.accessory) {
    case 'bow': {
      ctx.fillStyle = '#e04070';
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - 40);
      ctx.lineTo(cx - 4, cy - 34);
      ctx.lineTo(cx - 18, cy - 28);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 18, cy - 40);
      ctx.lineTo(cx + 4, cy - 34);
      ctx.lineTo(cx + 18, cy - 28);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy - 34, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'flower': {
      ctx.fillStyle = '#ff6b9a';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * 8, cy - 42 + Math.sin(a) * 8, 6, 4, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(cx, cy - 42, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bandana': {
      ctx.fillStyle = '#e05030';
      ctx.beginPath();
      ctx.moveTo(cx - 28, cy + 8);
      ctx.quadraticCurveTo(cx, cy + 28, cx + 28, cy + 8);
      ctx.lineTo(cx + 22, cy + 2);
      ctx.quadraticCurveTo(cx, cy + 18, cx - 22, cy + 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'shades': {
      ctx.fillStyle = '#1a1a22';
      ctx.fillRect(cx - 24, cy - 8, 20, 12);
      ctx.fillRect(cx + 4, cy - 8, 20, 12);
      ctx.fillRect(cx - 4, cy - 4, 8, 3);
      ctx.fillStyle = 'rgba(120,180,255,0.35)';
      ctx.fillRect(cx - 22, cy - 6, 16, 4);
      ctx.fillRect(cx + 6, cy - 6, 16, 4);
      break;
    }
    case 'star': {
      ctx.fillStyle = '#ffe566';
      ctx.strokeStyle = '#e0a020';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 12 : 5;
        const x = cx + Math.cos(a) * r;
        const y = cy - 44 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      // Proper star path
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 11 : 5;
        const x = cx + Math.cos(a) * r;
        const y = cy - 44 + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'scarf': {
      ctx.fillStyle = '#e86040';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 32, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx + 10, cy + 28, 10, 22);
      ctx.fillStyle = '#fff8f0';
      ctx.fillRect(cx + 12, cy + 32, 6, 3);
      ctx.fillRect(cx + 12, cy + 38, 6, 3);
      break;
    }
    case 'crown': {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy - 30);
      ctx.lineTo(cx - 14, cy - 48);
      ctx.lineTo(cx - 6, cy - 34);
      ctx.lineTo(cx, cy - 52);
      ctx.lineTo(cx + 6, cy - 34);
      ctx.lineTo(cx + 14, cy - 48);
      ctx.lineTo(cx + 20, cy - 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath();
      ctx.arc(cx, cy - 38, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default:
      break;
  }
}

function drawPomFace(ctx: CanvasRenderingContext2D, style: PomStyle): void {
  const cx = SPRITE_SIZE / 2;
  const cy = SPRITE_SIZE / 2 + 4;
  const bodyR = 42;

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + bodyR - 4, bodyR * 0.85, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears — slightly different tilt per accessory for variety
  ctx.fillStyle = style.ear;
  ctx.beginPath();
  ctx.moveTo(cx - 38, cy - 10);
  ctx.quadraticCurveTo(cx - 54, cy - 50, cx - 16, cy - 38);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 38, cy - 10);
  ctx.quadraticCurveTo(cx + 54, cy - 50, cx + 16, cy - 38);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = style.accent;
  ctx.beginPath();
  ctx.moveTo(cx - 34, cy - 12);
  ctx.quadraticCurveTo(cx - 46, cy - 40, cx - 20, cy - 32);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 34, cy - 12);
  ctx.quadraticCurveTo(cx + 46, cy - 40, cx + 20, cy - 32);
  ctx.closePath();
  ctx.fill();

  const gradient = ctx.createRadialGradient(cx - 10, cy - 12, 8, cx, cy, bodyR);
  gradient.addColorStop(0, style.fur);
  gradient.addColorStop(0.65, style.fur);
  gradient.addColorStop(1, style.accent);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
  ctx.fill();

  // Cheek fluff
  ctx.fillStyle = style.fur;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * 36, cy + 6, 14, 18, side * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Blush
  ctx.fillStyle = style.cheek;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(cx - 22, cy + 8, 8, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 22, cy + 8, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Muzzle
  ctx.fillStyle = style.muzzle;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 14, 18, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  if (style.accessory !== 'shades') {
    ctx.fillStyle = style.eye;
    ctx.beginPath();
    ctx.arc(cx - 14, cy - 2, 6, 0, Math.PI * 2);
    ctx.arc(cx + 14, cy - 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 12, cy - 4, 2.2, 0, Math.PI * 2);
    ctx.arc(cx + 16, cy - 4, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#2a1a12';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#2a1a12';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy + 14, 8, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = '#e87a8a';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 24, 4, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  drawAccessory(ctx, style, cx, cy);
}

function drawStripeOverlay(
  ctx: CanvasRenderingContext2D,
  horizontal: boolean,
): void {
  ctx.save();
  ctx.globalAlpha = 0.85;
  const stripeColor = '#fff8e0';
  const glow = '#ffd060';
  if (horizontal) {
    for (const y of [44, 64, 84]) {
      ctx.fillStyle = glow;
      ctx.fillRect(18, y - 5, 92, 10);
      ctx.fillStyle = stripeColor;
      ctx.fillRect(20, y - 3, 88, 6);
    }
  } else {
    for (const x of [44, 64, 84]) {
      ctx.fillStyle = glow;
      ctx.fillRect(x - 5, 18, 10, 92);
      ctx.fillStyle = stripeColor;
      ctx.fillRect(x - 3, 20, 6, 88);
    }
  }
  // Sparkle corners
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(24, 24, 3, 0, Math.PI * 2);
  ctx.arc(104, 104, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBombOverlay(ctx: CanvasRenderingContext2D): void {
  const cx = SPRITE_SIZE / 2;
  const cy = SPRITE_SIZE / 2;
  ctx.save();
  // Outer ring
  ctx.strokeStyle = '#ffef80';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ff9040';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 42, 0, Math.PI * 2);
  ctx.stroke();
  // Fuse spark
  ctx.fillStyle = '#ff6040';
  ctx.beginPath();
  ctx.arc(cx + 30, cy - 34, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe080';
  ctx.beginPath();
  ctx.arc(cx + 30, cy - 34, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRainbowPom(ctx: CanvasRenderingContext2D): void {
  const cx = SPRITE_SIZE / 2;
  const cy = SPRITE_SIZE / 2 + 2;
  const colors = ['#ff6b6b', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#b197fc'];

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 38, 36, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rainbow ring body
  for (let i = 0; i < colors.length; i++) {
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, 40 - i * 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Center cream face
  const g = ctx.createRadialGradient(cx - 6, cy - 8, 4, cx, cy, 28);
  g.addColorStop(0, '#fff8f0');
  g.addColorStop(1, '#f0e0d0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2a1a12';
  ctx.beginPath();
  ctx.arc(cx - 9, cy - 2, 4, 0, Math.PI * 2);
  ctx.arc(cx + 9, cy - 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx - 8, cy - 3, 1.5, 0, Math.PI * 2);
  ctx.arc(cx + 10, cy - 3, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2a1a12';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 6, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#2a1a12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy + 8, 7, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();

  // Sparkles
  ctx.fillStyle = '#fff';
  for (const [x, y] of [
    [20, 24],
    [108, 30],
    [24, 100],
    [104, 96],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Build atlas: regular poms, H-stripes, V-stripes, bombs, rainbow. */
export function createPomAtlas(): {
  canvas: HTMLCanvasElement;
  size: number;
  typeCount: number;
} {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE * ATLAS_TOTAL;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create 2D context for Pomeranian atlas');
  }

  const drawAt = (index: number, draw: () => void) => {
    ctx.save();
    ctx.translate(index * SPRITE_SIZE, 0);
    ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    draw();
    ctx.restore();
  };

  for (let i = 0; i < POM_TYPE_COUNT; i++) {
    drawAt(i, () => drawPomFace(ctx, POM_STYLES[i]));
    drawAt(ATLAS_STRIPE_H_START + i, () => {
      drawPomFace(ctx, POM_STYLES[i]);
      drawStripeOverlay(ctx, true);
    });
    drawAt(ATLAS_STRIPE_V_START + i, () => {
      drawPomFace(ctx, POM_STYLES[i]);
      drawStripeOverlay(ctx, false);
    });
    drawAt(ATLAS_BOMB_START + i, () => {
      drawPomFace(ctx, POM_STYLES[i]);
      drawBombOverlay(ctx);
    });
  }

  drawAt(ATLAS_RAINBOW_INDEX, () => drawRainbowPom(ctx));

  return { canvas, size: SPRITE_SIZE, typeCount: ATLAS_TOTAL };
}

export function getAtlasUv(
  atlasIndex: number,
  typeCount: number,
): { u0: number; v0: number; u1: number; v1: number } {
  const u0 = atlasIndex / typeCount;
  const u1 = (atlasIndex + 1) / typeCount;
  return { u0, v0: 0, u1, v1: 1 };
}
