import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./landing.css";

// --- 8-Bit Web Audio Synthesizer ---
class RetroAudioSynth {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  constructor() {
    this.isMuted = typeof window !== "undefined" && localStorage.getItem("cad_muted") === "true";
  }

  public init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("cad_muted", this.isMuted.toString());
    }
    return this.isMuted;
  }

  public playKeyClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.04);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public playKeyGlow(noteFreq = 440) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = "square";
      osc.frequency.setValueAtTime(noteFreq, t);

      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.19);
    } catch {
      // Audio fallback
    }
  }

  public playStartTone() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [220, 330, 440, 660];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * 0.05;

        osc.type = "square";
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.09);
      });
    } catch {
      // Audio fallback
    }
  }

  public playComboSuccess(stage: number) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const stageFreqs: Record<number, number[]> = {
        1: [440, 554, 659],
        2: [554, 659, 880, 1108],
        3: [659, 880, 1108, 1318, 1760],
      };
      const freqs = stageFreqs[stage] || stageFreqs[1];
      const speed = stage === 3 ? 0.04 : 0.06;

      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime + idx * speed;

        osc.type = stage === 3 ? "sawtooth" : "square";
        osc.frequency.setValueAtTime(freq, t);

        const vol = 0.08 + stage * 0.03;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + speed * 1.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + speed * 1.6);
      });
    } catch {
      // Audio fallback
    }
  }

  public playGlitchSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(120, t + 0.35);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noise.start(t);

      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = "sawtooth";
      sub.frequency.setValueAtTime(150, t);
      sub.frequency.exponentialRampToValueAtTime(30, t + 0.4);

      subGain.gain.setValueAtTime(0.2, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      sub.connect(subGain);
      subGain.connect(this.ctx.destination);

      sub.start(t);
      sub.stop(t + 0.42);
    } catch {
      // Audio fallback
    }
  }
}

const audio = new RetroAudioSynth();

export default function Landing() {
  const navigate = useNavigate();

  // Screen & Stage states
  const [started, setStarted] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [instructionText, setInstructionText] = useState("WATCH INITIALIZATION SEQUENCE...");
  const [isGlitching, setIsGlitching] = useState(false);
  const [stageShaking, setStageShaking] = useState(false);
  const [screenShaking, setScreenShaking] = useState(false);
  const [isMuted, setIsMuted] = useState(audio.isMuted);

  // Lit Key states
  const [ctrlLit, setCtrlLit] = useState(false);
  const [altLit, setAltLit] = useState(false);
  const [dLit, setDLit] = useState(false);
  const [fullLit, setFullLit] = useState(false);

  // Tracking keys held
  const activeKeysRef = useRef({ ctrl: false, alt: false, d: false });
  const comboCountRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const isListeningRef = useRef(false);
  const lastComboTimeRef = useRef(0);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Synchronize ref
  useEffect(() => {
    comboCountRef.current = comboCount;
  }, [comboCount]);

  // Noise Canvas generator
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let lastFrame = 0;
    const fps = 20;
    const interval = 1000 / fps;

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth / 3);
      canvas.height = Math.floor(window.innerHeight / 3);
    };

    resize();
    window.addEventListener("resize", resize);

    const renderNoise = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w <= 0 || h <= 0) return;

      const imgData = ctx.createImageData(w, h);
      const buffer = new Uint32Array(imgData.data.buffer);
      const len = buffer.length;

      for (let i = 0; i < len; i++) {
        if (Math.random() < 0.12) {
          const grey = (Math.random() * 255) | 0;
          buffer[i] = (25 << 24) | (grey << 16) | (grey << 8) | grey;
        }
      }

      if (Math.random() < 0.25) {
        const lineY = (Math.random() * h) | 0;
        const startIdx = lineY * w;
        for (let x = 0; x < w; x++) {
          buffer[startIdx + x] = (60 << 24) | (200 << 16) | (200 << 8) | 200;
        }
      }

      ctx.putImageData(imgData, 0, 0);
    };

    const loop = (timestamp: number) => {
      animId = requestAnimationFrame(loop);
      if (timestamp - lastFrame >= interval) {
        lastFrame = timestamp;
        renderNoise();
      }
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const illuminateAll = useCallback((isLit: boolean) => {
    setCtrlLit(isLit);
    setAltLit(isLit);
    setDLit(isLit);
    setFullLit(isLit);
  }, []);

  const guideSeqRef = useRef<() => void>(() => {});

  // Hint Guided Sequence: CTRL blinks -> ALT blinks -> D blinks -> All 3 together
  const runGuideSequence = useCallback(() => {
    if (comboCountRef.current > 0 || isTransitioningRef.current) return;

    setInstructionText("WATCH INITIALIZATION SEQUENCE...");

    // 1. CTRL blinks
    setCtrlLit(true);
    audio.playKeyGlow(330);

    setTimeout(() => {
      setCtrlLit(false);

      // 2. ALT blinks
      setTimeout(() => {
        if (comboCountRef.current > 0) return;
        setAltLit(true);
        audio.playKeyGlow(440);

        setTimeout(() => {
          setAltLit(false);

          // 3. D blinks
          setTimeout(() => {
            if (comboCountRef.current > 0) return;
            setDLit(true);
            audio.playKeyGlow(554);

            setTimeout(() => {
              setDLit(false);

              // 4. All three together
              setTimeout(() => {
                if (comboCountRef.current > 0) return;
                illuminateAll(true);
                audio.playKeyGlow(659);

                setTimeout(() => {
                  illuminateAll(false);
                  setInstructionText("PRESS CTRL + ALT + D (3X)");

                  hintTimeoutRef.current = setTimeout(() => {
                    if (comboCountRef.current === 0 && !isTransitioningRef.current) {
                      guideSeqRef.current();
                    }
                  }, 7000);
                }, 500);
              }, 300);
            }, 320);
          }, 240);
        }, 320);
      }, 240);
    }, 320);
  }, [illuminateAll]);

  useEffect(() => {
    guideSeqRef.current = runGuideSequence;
  }, [runGuideSequence]);

  // Execute combo success
  const registerCombo = useCallback(() => {
    const now = Date.now();
    if (now - lastComboTimeRef.current < 450) return;
    lastComboTimeRef.current = now;

    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
    }

    const nextCount = comboCountRef.current + 1;
    comboCountRef.current = nextCount;
    setComboCount(nextCount);

    audio.playComboSuccess(nextCount);
    illuminateAll(true);

    if (nextCount === 1) {
      setInstructionText("COMBINATION 1/3 ACCEPTED. REPEAT SEQUENCE!");
      setTimeout(() => {
        illuminateAll(false);
      }, 400);
    } else if (nextCount === 2) {
      setInstructionText("COMBINATION 2/3 CONFIRMED. ONE FINAL TIME!");
      setStageShaking(true);
      setTimeout(() => {
        setStageShaking(false);
        illuminateAll(false);
      }, 550);
    } else if (nextCount >= 3) {
      // Third combo reached: Trigger the last glitch transition!
      isTransitioningRef.current = true;
      isListeningRef.current = false;

      setInstructionText("ACCESS AUTHORIZED! SYSTEM ENGAGING...");
      setStageShaking(true);

      // Play dramatic CRT glitch zap
      audio.playGlitchSound();
      setIsGlitching(true);
      setScreenShaking(true);

      // After the last glitch concludes, transition directly to the original login UI
      setTimeout(() => {
        navigate("/login");
      }, 900);
    }
  }, [illuminateAll, navigate]);

  // Start button handler
  const handleStart = () => {
    audio.init();
    audio.playStartTone();
    setStarted(true);

    setTimeout(() => {
      isListeningRef.current = true;
      setTimeout(() => {
        runGuideSequence();
      }, 600);
    }, 450);
  };

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isListeningRef.current || isTransitioningRef.current) return;

      let recognized = false;

      if (e.ctrlKey || e.key === "Control") {
        activeKeysRef.current.ctrl = true;
        setCtrlLit(true);
        recognized = true;
      }
      if (e.altKey || e.key === "Alt") {
        activeKeysRef.current.alt = true;
        setAltLit(true);
        recognized = true;
      }
      if (e.code === "KeyD" || e.key === "d" || e.key === "D") {
        activeKeysRef.current.d = true;
        setDLit(true);
        recognized = true;
      }

      if (recognized) {
        audio.playKeyClick();
      }

      const isCtrl = e.ctrlKey || activeKeysRef.current.ctrl;
      const isAlt = e.altKey || activeKeysRef.current.alt;
      const isD = e.code === "KeyD" || e.key === "d" || e.key === "D" || activeKeysRef.current.d;

      if (isCtrl && isAlt && isD) {
        if (e.preventDefault) {
          e.preventDefault();
        }
        registerCombo();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isListeningRef.current) return;

      if (!e.ctrlKey && e.key === "Control") {
        activeKeysRef.current.ctrl = false;
        setCtrlLit(false);
      }
      if (!e.altKey && e.key === "Alt") {
        activeKeysRef.current.alt = false;
        setAltLit(false);
      }
      if (e.code === "KeyD" || e.key === "d" || e.key === "D") {
        activeKeysRef.current.d = false;
        setDLit(false);
      }
    };

    const resetKeys = () => {
      activeKeysRef.current = { ctrl: false, alt: false, d: false };
      if (!isTransitioningRef.current) {
        illuminateAll(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", resetKeys);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", resetKeys);
    };
  }, [illuminateAll, registerCombo]);

  const handleTouchKey = (key: "ctrl" | "alt" | "d") => {
    if (!isListeningRef.current || isTransitioningRef.current) return;
    audio.playKeyClick();

    if (key === "ctrl") setCtrlLit(true);
    if (key === "alt") setAltLit(true);
    if (key === "d") setDLit(true);

    activeKeysRef.current[key] = true;

    if (activeKeysRef.current.ctrl && activeKeysRef.current.alt && activeKeysRef.current.d) {
      registerCombo();
    } else {
      setTimeout(() => {
        if (key === "ctrl") setCtrlLit(false);
        if (key === "alt") setAltLit(false);
        if (key === "d") setDLit(false);
        activeKeysRef.current[key] = false;
      }, 1200);
    }
  };

  const toggleSound = () => {
    const next = audio.toggleMute();
    setIsMuted(next);
  };

  return (
    <div className={`landing-page-root ${screenShaking ? "shake" : ""}`}>
      {/* CRT Atmosphere Overlays */}
      <div className="crt-overlay-wrapper">
        <div className="crt-scanlines" />
        <div className="crt-vignette" />
        <div className="crt-flicker" />
      </div>
      <canvas id="landingNoiseCanvas" ref={canvasRef} />
      {!started && <div className="retro-grid-bg" />}

      {/* Floating Controls for Intro Screen Only */}
      {!started && (
        <>
          <button
            type="button"
            className="bypass-login-btn"
            onClick={() => navigate("/login")}
            title="Direct access to login"
          >
            [ BYPASS TO LOGIN ]
          </button>

          <div
            className={`sys-audio-control ${isMuted ? "muted" : ""}`}
            onClick={toggleSound}
            title="Toggle 8-bit arcade sound effects"
            role="button"
            tabIndex={0}
          >
            <div className="audio-led" />
            <span className="audio-label">{isMuted ? "SOUND: OFF" : "SOUND: ON"}</span>
          </div>
        </>
      )}

      <main className="experience-container">
        {/* ================= 1. INTRO SCREEN ================= */}
        <section
          className={`intro-screen ${started ? "hidden" : ""}`}
          aria-label="System Initialization"
          style={{ display: started ? "none" : "flex" }}
        >
          {/* HUD Corner Markings */}
          <div className="hud-corner top-left">
            <div>SYS_NODE // <span className="accent-txt">0x7F</span></div>
            <div>MEM: 640KB OK</div>
          </div>
          <div className="hud-corner top-right">
            <div>FREQ: <span className="accent-txt">60Hz CRT</span></div>
            <div>0 0 0 0 0 0 0 0 0</div>
          </div>
          <div className="hud-corner bottom-left">
            <span>[+]</span>
            <span>ARCADE CHASSIS // READY</span>
          </div>
          <div className="hud-corner bottom-right">
            <div>SIGNAL: <span className="accent-txt">LOCKED</span></div>
            <div>CAD_TERMINAL_V2.4</div>
          </div>

          {/* Centered Intro Card */}
          <div className="intro-content">
            <div className="sys-init-tag">
              <div className="tag-dot" />
              <span>SYSTEM // INITIALIZATION</span>
            </div>

            <h1 className="intro-heading-main">YOU READY?</h1>
            <h2 className="intro-heading-sub">LET&apos;S BEGIN</h2>

            <button
              className="arcade-btn intro-start-btn"
              type="button"
              onClick={handleStart}
            >
              START
            </button>

            <p className="intro-hint">PRESS START TO INITIALIZE CRT TERMINAL</p>
          </div>
        </section>

        {/* ================= 2. KEYBOARD STAGE ================= */}
        <section
          className={`keyboard-stage ${started ? "active" : ""} ${stageShaking ? "shake" : ""}`}
          aria-label="Command Keyboard Terminal"
        >
          {/* Top Telemetry Bar */}
          <div className="stage-telemetry-bar">
            <div>
              <span className="proto-name">MATRIX // </span>
              <span>SECRET COMMAND INTERFACE</span>
            </div>
            <div className="stage-top-right">
              <div className="stage-leds">
                <div className={`stage-led ${comboCount >= 1 ? "unlocked" : ""}`}>
                  <div className="led-pip" />
                  <span>STG.01</span>
                </div>
                <div className={`stage-led ${comboCount >= 2 ? "unlocked" : ""}`}>
                  <div className="led-pip" />
                  <span>STG.02</span>
                </div>
                <div className={`stage-led ${comboCount >= 3 ? "unlocked" : ""}`}>
                  <div className="led-pip" />
                  <span>STG.03</span>
                </div>
              </div>
              <button
                type="button"
                className="stage-bypass-btn"
                onClick={() => navigate("/login")}
                title="Direct access to login"
              >
                [ BYPASS TO LOGIN ]
              </button>
            </div>
          </div>

          {/* Keyboard Main Chassis */}
          <div className="keyboard-chassis">
            {/* Viewport with Layered Keyboard Graphics */}
            <div className="keyboard-viewport">
              {/* Base unlit keyboard */}
              <img
                src="/assets/keyboard-base.jpg"
                className="keyboard-img base"
                alt="CTRL ALT DISTRACT Keyboard"
              />

              {/* Full lit layer */}
              <img
                src="/assets/keyboard-lit.jpg"
                className="keyboard-img lit-full"
                style={{ opacity: fullLit ? 1 : 0 }}
                alt=""
              />

              {/* Individual illuminated keys */}
              <div className={`key-lit-layer key-ctrl ${ctrlLit ? "active" : ""}`}>
                <img src="/assets/key-ctrl-lit.png" alt="CTRL Lit" />
              </div>
              <div className={`key-lit-layer key-alt ${altLit ? "active" : ""}`}>
                <img src="/assets/key-alt-lit.png" alt="ALT Lit" />
              </div>
              <div className={`key-lit-layer key-d ${dLit ? "active" : ""}`}>
                <img src="/assets/key-d-lit.png" alt="D Lit" />
              </div>

              {/* Interactive Hitboxes */}
              <div
                className="key-hitbox hit-ctrl"
                onClick={() => handleTouchKey("ctrl")}
                title="Click or Press CTRL"
                role="button"
                tabIndex={0}
              />
              <div
                className="key-hitbox hit-alt"
                onClick={() => handleTouchKey("alt")}
                title="Click or Press ALT"
                role="button"
                tabIndex={0}
              />
              <div
                className="key-hitbox hit-d"
                onClick={() => handleTouchKey("d")}
                title="Click or Press D"
                role="button"
                tabIndex={0}
              />
            </div>
          </div>

          {/* Bottom Feedback Banner */}
          <div className="stage-instruction-box">
            <div className="instruction-prompt">
              <div className="status-badge-live">
                <div className="pulse-dot" />
                <span>DETECTING</span>
              </div>
              <div
                className="instruction-text"
                dangerouslySetInnerHTML={{ __html: instructionText }}
              />
            </div>

            <div className="instruction-meta">
              <div className="combo-counter-box">
                SEQUENCE: <span className="combo-num">{comboCount} / 3</span>
              </div>
              <button
                className="arcade-btn-secondary touch-trigger-btn"
                type="button"
                onClick={registerCombo}
              >
                EXECUTE COMBO
              </button>
              <div
                className={`stage-audio-control ${isMuted ? "muted" : ""}`}
                onClick={toggleSound}
                title="Toggle 8-bit sound synthesizers"
                role="button"
                tabIndex={0}
              >
                <div className="audio-led" />
                <span className="audio-label">{isMuted ? "SOUND: OFF" : "SOUND: ON"}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ================= 3. GLITCH TRANSITION OVERLAY ================= */}
      <div className={`glitch-transition-overlay ${isGlitching ? "active" : ""}`} aria-hidden="true">
        <div className="glitch-flash" />
        <div className="glitch-slice glitch-slice-1" />
        <div className="glitch-slice glitch-slice-2" />
        <div className="glitch-slice glitch-slice-3" />
        <div className="crt-pinch-line" />
      </div>
    </div>
  );
}
