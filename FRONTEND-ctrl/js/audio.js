/**
 * CTRL ALT DISTRACT - 8-Bit Web Audio Synthesizer
 * Zero external audio files required. Generates authentic arcade / CRT sound effects.
 */

class RetroAudioSystem {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('cad_muted') === 'true';
    this.hasUnlocked = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.hasUnlocked = true;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('cad_muted', this.isMuted.toString());
    return this.isMuted;
  }

  // Tactical click when key is pressed
  playKeyClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.04);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  // Key illuminating pulse (warm CRT terminal blip)
  playKeyGlow(noteFreq = 440) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'square';
      osc.frequency.setValueAtTime(noteFreq, t);

      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.19);
    } catch (e) {
      console.warn(e);
    }
  }

  // Start button arcade press
  playStartTone() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [220, 330, 440, 660];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.05;

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.09);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  // Combo feedback for stages 1, 2, and 3
  playComboSuccess(stage) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const stageFreqs = {
        1: [440, 554, 659],
        2: [554, 659, 880, 1108],
        3: [659, 880, 1108, 1318, 1760]
      };
      const freqs = stageFreqs[stage] || stageFreqs[1];
      const speed = stage === 3 ? 0.04 : 0.06;

      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * speed;

        osc.type = stage === 3 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(freq, t);

        const vol = 0.08 + stage * 0.03;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + speed * 1.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + speed * 1.6);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  // CRT degauss and zap glitch sound
  playGlitchSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // White noise buffer for degauss surge
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(120, t + 0.35);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(t);

      // Deep CRT coil tone
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(150, t);
      sub.frequency.exponentialRampToValueAtTime(30, t + 0.4);

      subGain.gain.setValueAtTime(0.2, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      sub.connect(subGain);
      subGain.connect(this.ctx.destination);

      sub.start(t);
      sub.stop(t + 0.42);
    } catch (e) {
      console.warn(e);
    }
  }

  // Terminal keystroke chirp
  playTerminalBeep() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880 + Math.random() * 80, t);

      gain.gain.setValueAtTime(0.03, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.035);
    } catch (e) {
      console.warn(e);
    }
  }
}

// Global instance
window.retroAudio = new RetroAudioSystem();
