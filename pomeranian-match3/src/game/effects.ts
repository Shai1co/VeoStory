export type FxTone = 'combo' | 'special' | 'score' | 'story' | 'danger';

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  born: number;
  life: number;
  tone: FxTone;
  scale: number;
}

export interface BurstParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  color: string;
  size: number;
}

const COMBO_COLORS = ['#ffe066', '#ff922b', '#ff6b9a', '#da77f2', '#74c0fc', '#69db7c'];

export class EffectsLayer {
  private readonly root: HTMLElement;
  private readonly textLayer: HTMLElement;
  private readonly particleCanvas: HTMLCanvasElement;
  private readonly pctx: CanvasRenderingContext2D;
  private texts: FloatingText[] = [];
  private particles: BurstParticle[] = [];
  private nextId = 1;
  private screenShakeUntil = 0;
  private flashEl: HTMLElement;

  constructor(stage: HTMLElement) {
    this.root = stage;

    this.textLayer = document.createElement('div');
    this.textLayer.className = 'fx-text-layer';
    this.textLayer.setAttribute('aria-hidden', 'true');
    stage.appendChild(this.textLayer);

    this.particleCanvas = document.createElement('canvas');
    this.particleCanvas.className = 'fx-particles';
    stage.appendChild(this.particleCanvas);
    const ctx = this.particleCanvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context for effects');
    this.pctx = ctx;

    this.flashEl = document.createElement('div');
    this.flashEl.className = 'fx-flash';
    stage.appendChild(this.flashEl);

    this.resize();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    this.particleCanvas.width = Math.floor(w * dpr);
    this.particleCanvas.height = Math.floor(h * dpr);
    this.particleCanvas.style.width = `${w}px`;
    this.particleCanvas.style.height = `${h}px`;
    this.pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  spawnText(
    text: string,
    x: number,
    y: number,
    tone: FxTone = 'combo',
    scale = 1,
    life = 1100,
  ): void {
    const id = this.nextId++;
    this.texts.push({ id, text, x, y, born: performance.now(), life, tone, scale });

    const el = document.createElement('div');
    el.className = `fx-float fx-float--${tone}`;
    el.dataset.id = String(id);
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty('--fx-scale', String(scale));
    this.textLayer.appendChild(el);
  }

  spawnBurst(x: number, y: number, color: string, count = 14): void {
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 60 + Math.random() * 140;
      this.particles.push({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        born: now,
        life: 450 + Math.random() * 350,
        color,
        size: 3 + Math.random() * 5,
      });
    }
  }

  spawnComboBurst(x: number, y: number, combo: number): void {
    const count = 10 + combo * 4;
    for (let i = 0; i < count; i++) {
      const color = COMBO_COLORS[i % COMBO_COLORS.length];
      this.spawnBurst(x, y, color, 1);
    }
    // Extra ring
    this.spawnBurst(x, y, '#ffffff', 6 + combo);
  }

  screenShake(ms = 220): void {
    this.screenShakeUntil = performance.now() + ms;
    this.root.classList.add('fx-shake');
    window.setTimeout(() => {
      if (performance.now() >= this.screenShakeUntil) {
        this.root.classList.remove('fx-shake');
      }
    }, ms + 30);
  }

  flash(tone: 'special' | 'combo' | 'win' = 'special'): void {
    this.flashEl.className = `fx-flash fx-flash--${tone} fx-flash-on`;
    window.setTimeout(() => {
      this.flashEl.classList.remove('fx-flash-on');
    }, 280);
  }

  update(now: number): void {
    // Texts
    const alive: FloatingText[] = [];
    for (const t of this.texts) {
      const age = now - t.born;
      if (age < t.life) {
        alive.push(t);
        const el = this.textLayer.querySelector(`[data-id="${t.id}"]`) as HTMLElement | null;
        if (el) {
          const p = age / t.life;
          const rise = -28 - p * 48;
          const opacity = p < 0.15 ? p / 0.15 : p > 0.7 ? (1 - p) / 0.3 : 1;
          const squash = 1 + Math.sin(Math.min(1, p * 6) * Math.PI) * 0.18;
          el.style.opacity = String(Math.max(0, opacity));
          el.style.transform = `translate(-50%, -50%) translateY(${rise}px) scale(${t.scale * squash})`;
        }
      } else {
        const el = this.textLayer.querySelector(`[data-id="${t.id}"]`);
        el?.remove();
      }
    }
    this.texts = alive;

    // Particles
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    this.pctx.clearRect(0, 0, w, h);

    const nextParticles: BurstParticle[] = [];
    for (const p of this.particles) {
      const age = now - p.born;
      if (age >= p.life) continue;
      const t = age / p.life;
      const dt = 1 / 60;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 280 * dt;
      const alpha = 1 - t;
      this.pctx.globalAlpha = alpha;
      this.pctx.fillStyle = p.color;
      this.pctx.beginPath();
      this.pctx.arc(p.x, p.y, p.size * (1 - t * 0.4), 0, Math.PI * 2);
      this.pctx.fill();
      nextParticles.push(p);
    }
    this.particles = nextParticles;
    this.pctx.globalAlpha = 1;
  }

  clear(): void {
    this.texts = [];
    this.particles = [];
    this.textLayer.innerHTML = '';
    this.pctx.clearRect(0, 0, this.root.clientWidth, this.root.clientHeight);
    this.root.classList.remove('fx-shake');
  }
}
