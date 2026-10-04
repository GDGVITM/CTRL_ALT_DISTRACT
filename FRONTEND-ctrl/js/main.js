/**
 * CTRL ALT DISTRACT - Main Website Controller
 * Handles interactive terminal, vault filters, telemetry updates, and arcade actions.
 */

document.addEventListener('DOMContentLoaded', () => {
  initAudio();
  initTerminal();
  initVaultFilters();
  initTelemetryTicker();
  initNav();
  initRebootAction();
});

// Sound toggle initialization
function initAudio() {
  const toggle = document.getElementById('audioToggle');
  if (!toggle) return;

  const updateUI = () => {
    const isMuted = window.retroAudio.isMuted;
    toggle.classList.toggle('muted', isMuted);
    const label = toggle.querySelector('.audio-label');
    if (label) label.textContent = isMuted ? 'SOUND: OFF' : 'SOUND: ON';
  };

  updateUI();

  toggle.addEventListener('click', () => {
    window.retroAudio.toggleMute();
    updateUI();
  });
}

// Reboot back to intro experience
function initRebootAction() {
  const rebootBtns = document.querySelectorAll('.reboot-btn, #rebootSysBtn');
  rebootBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.retroAudio.playGlitchSound();
      const overlay = document.getElementById('glitchOverlay');
      if (overlay) overlay.classList.add('active');
      document.body.classList.add('shake');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 700);
    });
  });
}

// Navigation & Mobile menu
function initNav() {
  const toggle = document.getElementById('mobileNavToggle');
  const nav = document.getElementById('arcadeNav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('open');
      window.retroAudio.playKeyClick();
    });
  }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        window.retroAudio.playKeyClick();
        target.scrollIntoView({ behavior: 'smooth' });
        if (nav) nav.classList.remove('open');
      }
    });
  });
}

// Vault Filters
function initVaultFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.vault-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      window.retroAudio.playKeyClick();
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      cards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Vault launch buttons
  document.querySelectorAll('.card-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.retroAudio.playKeyClick();
      const title = btn.closest('.vault-card').querySelector('.card-title').textContent;
      alert(`[SYSTEM NOTICE]\nProtocol "${title}" is engaged in hardware background.`);
    });
  });
}

// Interactive Terminal
function initTerminal() {
  const input = document.getElementById('terminalInput');
  const output = document.getElementById('terminalOutput');
  const body = document.getElementById('terminalBody');

  if (!input || !output) return;

  const printLine = (text, type = 'normal') => {
    const div = document.createElement('div');
    if (type === 'accent') div.className = 'term-line-accent';
    else if (type === 'dim') div.className = 'term-line-dim';
    div.textContent = text;
    output.appendChild(div);
    if (body) body.scrollTop = body.scrollHeight;
  };

  input.addEventListener('keydown', (e) => {
    window.retroAudio.playTerminalBeep();

    if (e.key === 'Enter') {
      const cmd = input.value.trim().toLowerCase();
      input.value = '';
      if (!cmd) return;

      printLine(`CAD_OS:~$ ${cmd}`, 'dim');

      switch (cmd) {
        case 'help':
          printLine('AVAILABLE COMMANDS:', 'accent');
          printLine('  help      - Display this list of protocols');
          printLine('  vault     - List active interactive modules');
          printLine('  manifesto - Print core engineering philosophy');
          printLine('  distract  - Run anti-distraction diagnostics');
          printLine('  stats     - Print system telemetry & memory state');
          printLine('  play      - Launch terminal reaction test');
          printLine('  reboot    - Degauss CRT and return to intro sequence');
          printLine('  clear     - Clear terminal buffer');
          break;

        case 'vault':
          printLine('ACTIVE MODULES IN VAULT:', 'accent');
          printLine('  01: FOCUS BREAKER [STATUS: DEPLOYED]');
          printLine('  02: NEON DETOUR   [STATUS: BETA]');
          printLine('  03: SYNAPSE PURGE [STATUS: CALIBRATED]');
          printLine('  04: ANALOG DRIFT  [STATUS: 8-BIT STEREO]');
          break;

        case 'manifesto':
          printLine('CTRL ALT DISTRACT MANIFESTO:', 'accent');
          printLine('"In a world of automated dopaminergic dopamine loops,');
          printLine(' deliberate friction is the ultimate form of rebellion."');
          break;

        case 'distract':
          printLine('SCANNING ENVIRONMENT...', 'dim');
          setTimeout(() => {
            printLine('[RESULT] Dopamine loop intercepted. Cognitive clarity: 99.4%', 'accent');
          }, 400);
          break;

        case 'stats':
          printLine('TELEMETRY DIAGNOSTICS:', 'accent');
          printLine(`  UPTIME: 99.98% // ARCH: CRT-X86`);
          printLine(`  REFRESH: 60Hz ANALOG SCAN`);
          printLine(`  LATENCY: 12ms // MEMORY: 640KB`);
          break;

        case 'play':
          printLine('PREPARE FOR REACTION TRIGGER...', 'accent');
          const delay = 1500 + Math.random() * 2000;
          setTimeout(() => {
            printLine('>>> PRESS ENTER RIGHT NOW! <<<', 'accent');
            const startTest = Date.now();
            const reactionHandler = (evt) => {
              if (evt.key === 'Enter') {
                const diff = Date.now() - startTest;
                printLine(`EXCELLENT! Reaction time: ${diff}ms`, 'accent');
                window.removeEventListener('keydown', reactionHandler);
              }
            };
            window.addEventListener('keydown', reactionHandler, { once: true });
          }, delay);
          break;

        case 'reboot':
          printLine('INITIATING CRT DEGAUSS REBOOT...', 'accent');
          setTimeout(() => {
            const rebootBtn = document.getElementById('rebootSysBtn');
            if (rebootBtn) rebootBtn.click();
          }, 400);
          break;

        case 'clear':
          output.innerHTML = '';
          break;

        default:
          printLine(`Command not recognized: "${cmd}". Type "help" for valid directives.`, 'dim');
      }
    }
  });
}

// Live Telemetry Ticker
function initTelemetryTicker() {
  const clockEl = document.getElementById('telemetryClock');
  const tickEl = document.getElementById('telemetryTicks');

  let ticks = 10420;

  setInterval(() => {
    ticks += 1;
    if (tickEl) tickEl.textContent = ticks.toLocaleString();

    if (clockEl) {
      const now = new Date();
      clockEl.textContent = now.toTimeString().split(' ')[0];
    }
  }, 1000);
}
