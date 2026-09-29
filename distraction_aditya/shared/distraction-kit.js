/**
 * DistractionKit — shared helper for every distraction mini-game.
 *   DistractionKit.startTimer(barEl, textEl) -> visible countdown
 *   DistractionKit.whenReady(fn)             -> "click / press any key to start" gate (gives the iframe keyboard focus)
 *   DistractionKit.finish('pass'|'fail')     -> reports result to the parent overlay
 *   DistractionKit.setOnTimeout(fn)          -> optional cleanup when time runs out
 */
(function () {
  const params = new URLSearchParams(window.location.search);
  const duration = parseInt(params.get('duration'), 10) || 150;
  let startTime = Date.now(), finished = false, timerInterval = null, onTimeoutFn = null;

  function finish(status) {
    if (finished) return;
    finished = true;
    if (timerInterval) clearInterval(timerInterval);
    try {
      window.parent.postMessage({ type: 'DISTRACTION_RESULT', status, timeTakenMs: Date.now() - startTime }, '*');
    } catch (e) { console.error('DistractionKit: postMessage failed', e); }
  }

  function startTimer(barFillEl, textEl) {
    let remaining = duration;
    render();
    timerInterval = setInterval(() => {
      remaining -= 1;
      render();
      if (remaining <= 0) {
        clearInterval(timerInterval);
        if (typeof onTimeoutFn === 'function') onTimeoutFn();
        finish('fail');
      }
    }, 1000);
    function render() {
      if (barFillEl) barFillEl.style.width = Math.max(0, (remaining / duration) * 100) + '%';
      if (textEl) textEl.textContent = Math.max(0, remaining) + 's left';
    }
  }

  function whenReady(fn, label) {
    const gate = document.createElement('div');
    gate.className = 'start-gate';
    gate.textContent = label || 'Click or press any key to start';
    document.body.appendChild(gate);
    let done = false;
    function go(e) {
      if (done) return;
      done = true;
      window.removeEventListener('keydown', go, true);
      gate.remove();
      fn();
    }
    window.addEventListener('keydown', go, true);
    gate.addEventListener('click', go);
    window.focus();
  }

  window.DistractionKit = { duration, finish, startTimer, whenReady, setOnTimeout: (fn) => { onTimeoutFn = fn; } };
})();
