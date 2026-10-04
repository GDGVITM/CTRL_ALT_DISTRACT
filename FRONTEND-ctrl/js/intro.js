/**
 * CTRL ALT DISTRACT - Intro & Keyboard Interaction Flow
 * Handles:
 * 1. Intro screen -> Start transition
 * 2. Automated hint sequence (CTRL blinks -> ALT blinks -> D blinks -> All 3 together)
 * 3. Real keystroke detection for CTRL + ALT + D (3 times required)
 * 4. Staged visual feedback (1st, 2nd, 3rd)
 * 5. Glitch transition & redirect to main.html
 */

class IntroController {
  constructor() {
    this.comboCount = 0;
    this.requiredCombos = 3;
    this.isListening = false;
    this.isTransitioning = false;
    this.lastComboTime = 0;
    this.comboDebounceMs = 450;
    this.hintCycleTimeout = null;

    // Keys currently down
    this.activeKeys = {
      ctrl: false,
      alt: false,
      d: false
    };

    this.cacheDOM();
    this.bindEvents();
  }

  cacheDOM() {
    this.introScreen = document.getElementById('introScreen');
    this.keyboardStage = document.getElementById('keyboardStage');
    this.startBtn = document.getElementById('startBtn');
    this.instructionText = document.getElementById('instructionText');
    this.comboCounter = document.getElementById('comboCounter');
    this.glitchOverlay = document.getElementById('glitchOverlay');
    this.touchTriggerBtn = document.getElementById('touchTriggerBtn');

    // Individual Key elements
    this.layerCtrl = document.getElementById('keyCtrlLit');
    this.layerAlt = document.getElementById('keyAltLit');
    this.layerD = document.getElementById('keyDLit');
    this.layerLitAll = document.getElementById('keyboardLitFull');

    // Indicator LEDs
    this.leds = [
      document.getElementById('led1'),
      document.getElementById('led2'),
      document.getElementById('led3')
    ];

    // Audio button
    this.audioToggle = document.getElementById('audioToggle');
  }

  bindEvents() {
    // START Button Click
    if (this.startBtn) {
      this.startBtn.addEventListener('click', () => this.handleStart());
    }

    // Audio Mute Toggle
    if (this.audioToggle) {
      this.audioToggle.addEventListener('click', () => {
        const isMuted = window.retroAudio.toggleMute();
        this.audioToggle.classList.toggle('muted', isMuted);
        const label = this.audioToggle.querySelector('.audio-label');
        if (label) label.textContent = isMuted ? 'SOUND: OFF' : 'SOUND: ON';
      });

      // Initial state
      if (window.retroAudio.isMuted) {
        this.audioToggle.classList.add('muted');
        const label = this.audioToggle.querySelector('.audio-label');
        if (label) label.textContent = 'SOUND: OFF';
      }
    }

    // Real Physical Keyboard Listeners
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    window.addEventListener('blur', () => this.resetActiveKeys());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.resetActiveKeys();
    });

    // Interactive Key Hitboxes
    const hitCtrl = document.getElementById('hitCtrl');
    const hitAlt = document.getElementById('hitAlt');
    const hitD = document.getElementById('hitD');

    if (hitCtrl) {
      hitCtrl.addEventListener('pointerdown', () => this.handleKeyTouch('ctrl'));
    }
    if (hitAlt) {
      hitAlt.addEventListener('pointerdown', () => this.handleKeyTouch('alt'));
    }
    if (hitD) {
      hitD.addEventListener('pointerdown', () => this.handleKeyTouch('d'));
    }

    // Mobile / Touch quick combo button
    if (this.touchTriggerBtn) {
      this.touchTriggerBtn.addEventListener('click', () => this.registerSuccessfulCombo());
    }
  }

  handleStart() {
    window.retroAudio.init();
    window.retroAudio.playStartTone();

    // Transition from intro to keyboard stage
    this.introScreen.classList.add('hidden');
    setTimeout(() => {
      this.introScreen.style.display = 'none';
      this.keyboardStage.classList.add('active');
      this.isListening = true;

      // Start the guide animation sequence after brief pause
      setTimeout(() => this.runGuideSequence(), 600);
    }, 450);
  }

  /**
   * Exact requirement:
   * "CTRL blinks -> returns to normal
   *  ALT blinks -> returns to normal
   *  D blinks -> returns to normal
   *  Then: CTRL + ALT + D briefly illuminate together."
   */
  runGuideSequence() {
    if (this.comboCount > 0 || this.isTransitioning) return;

    this.updateInstruction('WATCH INITIALIZATION SEQUENCE...');

    // 1. CTRL blinks
    this.setKeyLit('ctrl', true);
    window.retroAudio.playKeyGlow(330);
    setTimeout(() => {
      this.setKeyLit('ctrl', false);

      // 2. ALT blinks
      setTimeout(() => {
        if (this.comboCount > 0) return;
        this.setKeyLit('alt', true);
        window.retroAudio.playKeyGlow(440);
        setTimeout(() => {
          this.setKeyLit('alt', false);

          // 3. D blinks
          setTimeout(() => {
            if (this.comboCount > 0) return;
            this.setKeyLit('d', true);
            window.retroAudio.playKeyGlow(554);
            setTimeout(() => {
              this.setKeyLit('d', false);

              // 4. All three illuminate together
              setTimeout(() => {
                if (this.comboCount > 0) return;
                this.illuminateAllKeys(true);
                window.retroAudio.playKeyGlow(659);
                setTimeout(() => {
                  this.illuminateAllKeys(false);

                  // Ready for user input
                  this.updateInstruction('PRESS <span class="key-token">CTRL</span> + <span class="key-token">ALT</span> + <span class="key-token">D</span> (3X)');

                  // Repeat sequence periodically if user hasn't pressed yet
                  this.hintCycleTimeout = setTimeout(() => {
                    if (this.comboCount === 0 && !this.isTransitioning) {
                      this.runGuideSequence();
                    }
                  }, 7000);
                }, 500);
              }, 300);
            }, 320);
          }, 240);
        }, 320);
      }, 240);
    }, 320);
  }

  setKeyLit(key, isLit) {
    let layer = null;
    if (key === 'ctrl') layer = this.layerCtrl;
    else if (key === 'alt') layer = this.layerAlt;
    else if (key === 'd') layer = this.layerD;

    if (layer) {
      if (isLit) {
        layer.classList.add('active');
      } else {
        layer.classList.remove('active');
      }
    }
  }

  illuminateAllKeys(isLit) {
    this.setKeyLit('ctrl', isLit);
    this.setKeyLit('alt', isLit);
    this.setKeyLit('d', isLit);
    if (this.layerLitAll) {
      this.layerLitAll.style.opacity = isLit ? '1' : '0';
    }
  }

  handleKeyDown(e) {
    if (!this.isListening || this.isTransitioning) return;

    let recognized = false;

    // Track CTRL
    if (e.ctrlKey || e.key === 'Control') {
      this.activeKeys.ctrl = true;
      this.setKeyLit('ctrl', true);
      recognized = true;
    }

    // Track ALT (Option on Mac)
    if (e.altKey || e.key === 'Alt') {
      this.activeKeys.alt = true;
      this.setKeyLit('alt', true);
      recognized = true;
    }

    // Track D
    if (e.code === 'KeyD' || e.key === 'd' || e.key === 'D') {
      this.activeKeys.d = true;
      this.setKeyLit('d', true);
      recognized = true;
    }

    if (recognized) {
      window.retroAudio.playKeyClick();
    }

    // Check if the complete combo is actively held
    const isCtrl = e.ctrlKey || this.activeKeys.ctrl;
    const isAlt = e.altKey || this.activeKeys.alt;
    const isD = (e.code === 'KeyD' || e.key === 'd' || e.key === 'D') || this.activeKeys.d;

    if (isCtrl && isAlt && isD) {
      // Prevent browser default bookmark/save/devtools action if needed
      if (e.preventDefault) {
        e.preventDefault();
      }
      this.registerSuccessfulCombo();
    }
  }

  handleKeyUp(e) {
    if (!this.isListening) return;

    if (!e.ctrlKey && e.key === 'Control') {
      this.activeKeys.ctrl = false;
      this.setKeyLit('ctrl', false);
    }
    if (!e.altKey && e.key === 'Alt') {
      this.activeKeys.alt = false;
      this.setKeyLit('alt', false);
    }
    if (e.code === 'KeyD' || e.key === 'd' || e.key === 'D') {
      this.activeKeys.d = false;
      this.setKeyLit('d', false);
    }
  }

  resetActiveKeys() {
    this.activeKeys = { ctrl: false, alt: false, d: false };
    if (!this.isTransitioning) {
      this.illuminateAllKeys(false);
    }
  }

  handleKeyTouch(key) {
    if (!this.isListening || this.isTransitioning) return;

    window.retroAudio.playKeyClick();
    this.setKeyLit(key, true);
    this.activeKeys[key] = true;

    // Check if all three touched
    if (this.activeKeys.ctrl && this.activeKeys.alt && this.activeKeys.d) {
      this.registerSuccessfulCombo();
    } else {
      setTimeout(() => {
        this.setKeyLit(key, false);
        this.activeKeys[key] = false;
      }, 1200);
    }
  }

  registerSuccessfulCombo() {
    const now = Date.now();
    if (now - this.lastComboTime < this.comboDebounceMs) {
      return; // Debounce rapid key bounce
    }
    this.lastComboTime = now;

    if (this.hintCycleTimeout) {
      clearTimeout(this.hintCycleTimeout);
    }

    this.comboCount++;
    const current = this.comboCount;

    // Visual & audio feedback based on stage
    if (current === 1) {
      // 1st combination: CTRL/ALT/D briefly highlight
      this.triggerComboFeedback(1);
    } else if (current === 2) {
      // 2nd combination: slightly stronger feedback
      this.triggerComboFeedback(2);
    } else if (current >= 3) {
      // 3rd combination: final pulse and transition
      this.triggerComboFeedback(3);
      this.triggerGlitchTransition();
    }
  }

  triggerComboFeedback(stage) {
    window.retroAudio.playComboSuccess(stage);

    // Update LED indicators
    for (let i = 0; i < stage; i++) {
      if (this.leds[i]) {
        this.leds[i].classList.add('unlocked');
      }
    }

    // Update Counter
    if (this.comboCounter) {
      this.comboCounter.textContent = `${stage} / ${this.requiredCombos}`;
    }

    // Illuminate keys with strength proportional to stage
    this.illuminateAllKeys(true);

    if (stage === 1) {
      this.updateInstruction('COMBINATION 1/3 ACCEPTED. REPEAT SEQUENCE!');
      setTimeout(() => {
        this.illuminateAllKeys(false);
      }, 400);
    } else if (stage === 2) {
      this.updateInstruction('COMBINATION 2/3 CONFIRMED. ONE FINAL TIME!');
      // Slight chassis shake
      this.keyboardStage.classList.add('shake');
      setTimeout(() => {
        this.keyboardStage.classList.remove('shake');
        this.illuminateAllKeys(false);
      }, 550);
    } else {
      this.updateInstruction('ACCESS AUTHORIZED! SYSTEM ENGAGING...');
      this.keyboardStage.classList.add('shake');
    }
  }

  updateInstruction(html) {
    if (this.instructionText) {
      this.instructionText.innerHTML = html;
    }
  }

  /**
   * After the third successful CTRL + ALT + D:
   * 0.5–1 second CRT glitch transition:
   * - CRT distortion
   * - Scanline distortion
   * - Horizontal displacement
   * - Brief yellow flash
   * - Subtle screen shake
   * - Audio degauss zap
   * Resolves in-place directly on screen without navigating away.
   */
  triggerGlitchTransition() {
    this.isTransitioning = true;
    this.isListening = false;

    // Trigger degauss / glitch audio
    window.retroAudio.playGlitchSound();

    // Activate Glitch Overlay
    if (this.glitchOverlay) {
      this.glitchOverlay.classList.add('active');
    }

    // Screen Shake
    document.body.classList.add('shake');

    // After glitch concludes, resolve into the fully unlocked CRT state
    setTimeout(() => {
      if (this.glitchOverlay) {
        this.glitchOverlay.classList.remove('active');
      }
      document.body.classList.remove('shake');
      this.isTransitioning = false;

      // Lock keys in illuminated state matching reference image
      this.illuminateAllKeys(true);

      // Update UI to ACCESS GRANTED state
      this.updateInstruction('<span style="color:var(--accent-yellow)">ACCESS GRANTED // SYSTEM OVERRIDE COMPLETE</span>');
      if (this.comboCounter) {
        this.comboCounter.innerHTML = '<span style="color:var(--accent-yellow)">UNLOCKED [ 3 / 3 ]</span>';
      }

      // Convert touch/action button into a Reset / Replay button
      if (this.touchTriggerBtn) {
        this.touchTriggerBtn.textContent = 'RESET SEQUENCE';
        this.touchTriggerBtn.style.display = 'inline-flex';
        this.touchTriggerBtn.onclick = () => this.restartSequence();
      }
    }, 850);
  }

  restartSequence() {
    window.retroAudio.playStartTone();
    this.comboCount = 0;
    this.isTransitioning = false;
    this.isListening = true;

    // Reset LEDs
    this.leds.forEach(led => {
      if (led) led.classList.remove('unlocked');
    });

    // Reset Keys
    this.illuminateAllKeys(false);

    // Reset Text & Counter
    if (this.comboCounter) {
      this.comboCounter.textContent = `0 / ${this.requiredCombos}`;
    }

    if (this.touchTriggerBtn) {
      this.touchTriggerBtn.textContent = 'EXECUTE COMBO';
      this.touchTriggerBtn.onclick = () => this.registerSuccessfulCombo();
    }

    this.runGuideSequence();
  }
}

// Instantiate on load
document.addEventListener('DOMContentLoaded', () => {
  window.introCtrl = new IntroController();
});
