// Web Audio API Procedural Sound Synthesizer for Cubomb

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientTimer: NodeJS.Timeout | null = null;
  private ambientPadTimer: NodeJS.Timeout | null = null;
  private ambientMasterGain: GainNode | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cubomb_muted") || localStorage.getItem("3dminer_muted");
      if (saved !== null) {
        this.isMuted = saved === "true";
      }
    }
  }

  private initContext() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      localStorage.setItem("cubomb_muted", muted.toString());
    }
    if (muted) {
      this.stopAmbient();
    } else {
      this.startAmbient();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  // Soft, velvety warm celestial tone
  private playAmbientNote(freq: number, duration: number = 7.0) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.ambientMasterGain) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      // Very slow, soft swell and fade (zero clicks, zero sharpness)
      const attack = 2.4;
      voiceGain.gain.setValueAtTime(0.00001, now);
      voiceGain.gain.exponentialRampToValueAtTime(0.012, now + attack);
      voiceGain.gain.exponentialRampToValueAtTime(0.00001, now + duration);

      osc.connect(voiceGain);
      voiceGain.connect(this.ambientMasterGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Audio error ignored
    }
  }

  // Deep, warm background sub-pad
  private playAmbientPad(freq: number, duration: number = 14.0) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx || !this.ambientMasterGain) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const padGain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      const attack = 4.0;
      padGain.gain.setValueAtTime(0.00001, now);
      padGain.gain.exponentialRampToValueAtTime(0.008, now + attack);
      padGain.gain.exponentialRampToValueAtTime(0.00001, now + duration);

      osc.connect(padGain);
      padGain.connect(this.ambientMasterGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Audio error ignored
    }
  }

  // Procedural Chill Space Ambient Music (Warm Velvety Focus Soundscape)
  public startAmbient() {
    if (this.isMuted || this.ambientMasterGain) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      // Very gentle 240 Hz lowpass filter to remove all piercing high-frequency edge
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(240, ctx.currentTime);
      filter.Q.setValueAtTime(0.5, ctx.currentTime);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(1.0, ctx.currentTime);

      filter.connect(masterGain);
      masterGain.connect(ctx.destination);
      this.ambientMasterGain = masterGain;

      // Warm mid-low celestial notes (C3, D3, E3, G3, A3, C4) - zero high pitched ringing
      const NOTES = [130.81, 146.83, 164.81, 196.0, 220.0, 261.63];
      const ROOTS = [65.41, 73.42, 82.41, 98.0, 110.0]; // Deep warm sub-pads (C2, D2, E2, G2, A2)

      // Initial soft swell
      this.playAmbientPad(ROOTS[0], 14.0);
      setTimeout(() => {
        if (this.ambientMasterGain) this.playAmbientNote(NOTES[2], 7.0);
      }, 2000);

      // Generative melodic notes loop (every 6 to 9 seconds)
      const scheduleNextMelody = () => {
        if (!this.ambientMasterGain) return;
        const note = NOTES[Math.floor(Math.random() * NOTES.length)];
        this.playAmbientNote(note, 7.0);

        const delay = 6000 + Math.random() * 3500;
        this.ambientTimer = setTimeout(scheduleNextMelody, delay);
      };

      // Generative deep bass pad loop (every 14 seconds)
      const scheduleNextPad = () => {
        if (!this.ambientMasterGain) return;
        const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
        this.playAmbientPad(root, 14.0);
        this.ambientPadTimer = setTimeout(scheduleNextPad, 14000 + Math.random() * 3000);
      };

      this.ambientTimer = setTimeout(scheduleNextMelody, 4000);
      this.ambientPadTimer = setTimeout(scheduleNextPad, 14000);
    } catch {
      // Audio error ignored
    }
  }

  public stopAmbient() {
    if (this.ambientTimer) {
      clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
    if (this.ambientPadTimer) {
      clearTimeout(this.ambientPadTimer);
      this.ambientPadTimer = null;
    }
    if (this.ambientMasterGain) {
      try {
        this.ambientMasterGain.disconnect();
      } catch {
        // Ignored
      }
      this.ambientMasterGain = null;
    }
  }

  // Soft footstep sound for avatar walking
  public playStep() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const freq = 120 + Math.random() * 40;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio error ignored
    }
  }

  // Dig / reveal sound with pitch based on number of neighbors
  public playReveal(neighbors: number = 0, pitchOffset: number = 0) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pitch scales with numbers or cascade depth
      const baseFreq = 320 + neighbors * 60 + pitchOffset * 15;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Audio error ignored
    }
  }

  // Flag placement sound (metallic/digital ping)
  public playFlag(isPlacing: boolean) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      const f1 = isPlacing ? 520 : 680;
      const f2 = isPlacing ? 780 : 440;
      osc.frequency.setValueAtTime(f1, now);
      osc.frequency.setValueAtTime(f2, now + 0.04);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Audio error ignored
    }
  }

  // Mine explosion sound (deep rumble + noise burst)
  public playExplosion() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Low frequency rumble
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.7);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);

      // 2. White noise burst
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.4);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.45);
    } catch {
      // Audio error ignored
    }
  }

  // Victory fanfare synth arpeggio
  public playWin() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5]; // C major chord arpeggio
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const time = now + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.35);
      });
    } catch {
      // Audio error ignored
    }
  }

  // Soft UI click
  public playClick() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // Audio error ignored
    }
  }

  // Double-click / Chord reveal sound (harmonious dual chime)
  public playChord() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [587.33, 880.0].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.04);
        gain.gain.setValueAtTime(0.08, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.15);
      });
    } catch {
      // Audio error ignored
    }
  }
}

export const sound = new SoundEngine();
