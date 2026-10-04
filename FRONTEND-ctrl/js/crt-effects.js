/**
 * CTRL ALT DISTRACT - CRT Effects Engine
 * Renders subtle analog noise, scanline interference, and glitch triggers.
 */

class CRTEffectsEngine {
  constructor(canvasId = 'noiseCanvas') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d', { alpha: true }) : null;
    this.animId = null;
    this.lastFrame = 0;
    this.fps = 20; // Throttled for battery & performance
    this.interval = 1000 / this.fps;
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();
  }

  init() {
    if (!this.canvas || !this.ctx || this.isReducedMotion) return;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else {
        this.start();
      }
    });

    this.start();
  }

  resize() {
    if (!this.canvas) return;
    // Lower internal resolution for authentic retro grain & high performance
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.width = Math.floor(window.innerWidth / 3);
    this.height = Math.floor(window.innerHeight / 3);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  start() {
    if (this.animId || this.isReducedMotion) return;
    const loop = (timestamp) => {
      this.animId = requestAnimationFrame(loop);
      if (timestamp - this.lastFrame >= this.interval) {
        this.lastFrame = timestamp;
        this.renderNoise();
      }
    };
    this.animId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  renderNoise() {
    if (!this.ctx) return;
    const w = this.width;
    const h = this.height;
    if (w <= 0 || h <= 0) return;

    const imgData = this.ctx.createImageData(w, h);
    const buffer = new Uint32Array(imgData.data.buffer);
    const len = buffer.length;

    // Fast 32-bit pixel population
    for (let i = 0; i < len; i++) {
      // Occasional analog noise spikes
      if (Math.random() < 0.12) {
        const grey = (Math.random() * 255) | 0;
        // White-grey noise with low alpha
        buffer[i] = (25 << 24) | (grey << 16) | (grey << 8) | grey;
      }
    }

    // Occasional subtle horizontal interference line
    if (Math.random() < 0.25) {
      const lineY = (Math.random() * h) | 0;
      const startIdx = lineY * w;
      for (let x = 0; x < w; x++) {
        buffer[startIdx + x] = (60 << 24) | (200 << 16) | (200 << 8) | 200;
      }
    }

    this.ctx.putImageData(imgData, 0, 0);
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.crtEffects = new CRTEffectsEngine('noiseCanvas');
});
