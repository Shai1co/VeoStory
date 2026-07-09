/**
 * Procedural cute dog SFX via Web Audio API — no asset files needed.
 */

type NoiseType = 'white' | 'pink';

const MASTER_GAIN = 0.22;

export class DogAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  /** Call from a user gesture so mobile browsers allow audio. */
  unlock(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) {
      this.master.gain.value = muted ? 0 : MASTER_GAIN;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_GAIN;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  private noiseBuffer(duration: number, type: NoiseType = 'white'): AudioBuffer | null {
    const ctx = this.ensure();
    if (!ctx) return null;
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    let pink = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'pink') {
        pink = 0.98 * pink + 0.02 * white;
        data[i] = pink * 2.5;
      } else {
        data[i] = white;
      }
    }
    return buffer;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    when = 0,
    slideTo?: number,
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = this.now() + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + duration);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noiseBurst(
    duration: number,
    gain: number,
    type: NoiseType,
    when = 0,
    filterFreq = 1200,
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const buffer = this.noiseBuffer(duration + 0.05, type);
    if (!buffer) return;
    const t0 = this.now() + when;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + duration + 0.03);
  }

  /** Soft nose-boop when selecting a tile */
  select(): void {
    this.tone(520, 0.06, 'sine', 0.18);
    this.tone(780, 0.05, 'triangle', 0.08, 0.02);
  }

  /** Short cute yip on match pop */
  yip(): void {
    this.tone(680, 0.09, 'square', 0.12);
    this.tone(920, 0.08, 'triangle', 0.14, 0.04, 1100);
    this.noiseBurst(0.05, 0.06, 'pink', 0.02, 1800);
  }

  /** Classic little bark */
  bark(): void {
    this.tone(240, 0.11, 'sawtooth', 0.1, 0, 160);
    this.tone(420, 0.09, 'square', 0.12, 0.02, 300);
    this.noiseBurst(0.08, 0.1, 'pink', 0, 900);
  }

  /** Deeper woof for bigger clears */
  woof(): void {
    this.tone(160, 0.16, 'sawtooth', 0.12, 0, 110);
    this.tone(280, 0.12, 'square', 0.1, 0.03, 180);
    this.noiseBurst(0.12, 0.12, 'pink', 0, 700);
  }

  /** Happy double-yip for combos */
  happyCombo(level: number): void {
    const n = Math.min(4, 1 + level);
    for (let i = 0; i < n; i++) {
      const bump = i * 80;
      this.tone(700 + bump, 0.07, 'triangle', 0.11, i * 0.07, 900 + bump);
      this.tone(980 + bump, 0.06, 'sine', 0.08, i * 0.07 + 0.03);
    }
  }

  /** Soft whimper for invalid swap */
  whimper(): void {
    this.tone(380, 0.14, 'sine', 0.1, 0, 260);
    this.tone(300, 0.12, 'triangle', 0.06, 0.05, 220);
  }

  /** Special tile spawn sparkle + yip */
  specialSpawn(): void {
    this.tone(880, 0.08, 'sine', 0.1);
    this.tone(1180, 0.1, 'triangle', 0.12, 0.05);
    this.tone(1480, 0.08, 'sine', 0.08, 0.1);
    this.yip();
  }

  /** Stripe / bomb / rainbow blast */
  specialBlast(kind: 'stripe' | 'bomb' | 'rainbow' | 'generic' = 'generic'): void {
    if (kind === 'stripe') {
      this.noiseBurst(0.18, 0.14, 'white', 0, 2000);
      this.tone(500, 0.12, 'sawtooth', 0.08, 0, 200);
      this.bark();
    } else if (kind === 'bomb') {
      this.noiseBurst(0.22, 0.18, 'pink', 0, 400);
      this.tone(120, 0.2, 'sawtooth', 0.14, 0, 60);
      this.woof();
    } else if (kind === 'rainbow') {
      for (let i = 0; i < 5; i++) {
        this.tone(500 + i * 160, 0.1, 'triangle', 0.09, i * 0.05);
      }
      this.happyCombo(3);
    } else {
      this.bark();
      this.noiseBurst(0.12, 0.1, 'pink', 0, 1000);
    }
  }

  /** Ability ready chime */
  abilityReady(): void {
    this.tone(660, 0.08, 'sine', 0.1);
    this.tone(880, 0.1, 'triangle', 0.12, 0.07);
    this.tone(1320, 0.12, 'sine', 0.1, 0.14);
  }

  /** Ability cast */
  abilityCast(): void {
    this.tone(200, 0.15, 'sawtooth', 0.1, 0, 400);
    this.bark();
    this.tone(900, 0.1, 'triangle', 0.1, 0.08);
    this.noiseBurst(0.15, 0.12, 'white', 0.05, 1600);
  }

  /** Level clear howl-ish arpeggio */
  win(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => {
      this.tone(f, 0.22, 'triangle', 0.12, i * 0.1);
      this.tone(f * 1.5, 0.18, 'sine', 0.05, i * 0.1 + 0.04);
    });
    this.noiseBurst(0.2, 0.06, 'pink', 0.35, 1400);
  }

  /** Soft lose sigh */
  lose(): void {
    this.tone(360, 0.25, 'sine', 0.1, 0, 180);
    this.tone(280, 0.3, 'triangle', 0.08, 0.1, 140);
  }

  /** UI button tap */
  uiTap(): void {
    this.tone(640, 0.04, 'sine', 0.1);
  }

  /** Fall / refill soft ticks */
  fall(): void {
    this.tone(420, 0.03, 'sine', 0.04);
  }
}

export const dogAudio = new DogAudio();
