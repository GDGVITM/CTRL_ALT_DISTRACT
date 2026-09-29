/**
 * DistractionOverlay — drop this ONE file into any frontend (React, plain JS, whatever).
 *
 * Usage:
 *   const result = await DistractionOverlay.launch('games/03-math-sprint.html', { duration: 150 });
 *   // result = { status: 'pass' | 'fail', timeTakenMs: number }
 *   if (result.status === 'pass') resumeCoding();
 *   else zeroOutCurrentProblem();
 *
 * In React just call it inside an async handler/useEffect — no wrapper component needed.
 * It is unskippable: fullscreen, blocks Escape, and has its own fail-safe timer in case
 * a game misbehaves or never reports back.
 */
(function () {
  function launchDistraction(gameUrl, options) {
    options = options || {};
    const duration = options.duration || 150; // seconds

    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.id = 'distraction-overlay';
      Object.assign(overlay.style, {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.97)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      });

      const iframe = document.createElement('iframe');
      const sep = gameUrl.includes('?') ? '&' : '?';
      iframe.src = gameUrl + sep + 'duration=' + duration;
      Object.assign(iframe.style, { width: '100%', height: '100%', border: 'none' });
      iframe.addEventListener('load', () => { try { iframe.contentWindow.focus(); } catch (e) {} });
      overlay.appendChild(iframe);
      document.body.appendChild(overlay);

      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Fail-safe: if the game never reports back (crash/bug), auto-fail shortly after its timer should end
      const failSafe = setTimeout(() => cleanup('fail', null), (duration + 5) * 1000);

      function onMessage(e) {
        if (!e.data || e.data.type !== 'DISTRACTION_RESULT') return;
        cleanup(e.data.status, e.data.timeTakenMs);
      }
      window.addEventListener('message', onMessage);

      // Block the obvious escape key; can't block everything a browser allows, but covers the common case
      function blockKeys(e) {
        if (e.key === 'Escape') e.preventDefault();
      }
      window.addEventListener('keydown', blockKeys, true);

      function cleanup(status, timeTakenMs) {
        clearTimeout(failSafe);
        window.removeEventListener('message', onMessage);
        window.removeEventListener('keydown', blockKeys, true);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.body.style.overflow = prevOverflow;
        resolve({ status: status || 'fail', timeTakenMs: timeTakenMs || null });
      }
    });
  }

  window.DistractionOverlay = { launch: launchDistraction };
})();
