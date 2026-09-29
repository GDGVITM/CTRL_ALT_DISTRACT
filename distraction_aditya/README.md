# Ctrl Alt One — Distraction Module

Built by: Aditya Chavan (+ Heet, Supriya)

## What this is
10 lightweight, self-contained mini-games that hijack the screen mid-problem.
No build step, no dependencies, no framework required — plain HTML/CSS/JS.
This is deliberately **framework-agnostic** so it plugs into whatever the
Frontend team ends up using (React, plain JS, anything).

## Folder structure
```
distractions/
  overlay/
    distraction-overlay.js   <- the ONE file Frontend/Backend needs to import
    demo.html                <- standalone demo, test everything without the real app
  shared/
    distraction-kit.js       <- countdown timer + result reporting, used inside each game
    styles.css                <- shared dark theme
  games/
    01-snake.html
    02-bug-hopper.html
    03-bug-storm.html
    04-brick-breaker.html
    05-maze-runner.html
    06-whack-a-mole.html
    07-emoji-memory.html
    08-lights-out.html
    09-trivia-quickfire.html
    10-code-rain.html
```

## Try it right now
Just open `overlay/demo.html` in a browser (double-click it, or run a local
static server). Click any game and play it exactly as it'll appear in the
real event — fullscreen, unskippable, with a countdown bar.

## How the Frontend team integrates this (any stack)
1. Copy the whole `distractions/` folder into the main project (e.g. as
   `public/distractions/` or `static/distractions/`).
2. In their code, whenever problem N's timer should trigger a distraction:

```js
const gameFiles = [
  'distractions/games/01-snake.html',
  'distractions/games/02-bug-hopper.html',
  // ... pick which one fires, e.g. randomly or in order
];

const result = await DistractionOverlay.launch(gameFiles[i], { duration: 150 });
// result = { status: 'pass' | 'fail', timeTakenMs: number }

if (result.status === 'pass') {
  resumeCodingTimer();
} else {
  markProblemAsZero(); // failed distraction -> 0 points for this problem
}
```

That's it — one `<script src="distractions/overlay/distraction-overlay.js">`
tag and one function call. Works identically inside a React component
(call it in an event handler or `useEffect`) since it's just a global
function, not a React component.

## How the Backend team hooks in
`DistractionOverlay.launch()` resolves with `{ status, timeTakenMs }` on the
frontend. Whoever wires it up should immediately POST that to the backend,
e.g.:

```
POST /api/attempt/:problemId/distraction
{ "status": "pass" | "fail", "timeTakenMs": 4231 }
```

Backend then:
- `pass` → problem's coding timer resumes as normal, score stands.
- `fail` → problem is locked in at 0 points, participant can still see it
  but scoring for that problem is done.

## Design decisions (for when you explain this to leads)
- **No dependencies** — each game is a single `.html` file, loads instantly
  in an iframe, nothing to `npm install`.
- **postMessage contract** — games never talk to your main app directly,
  only to the overlay via `postMessage`. Clean separation: Frontend/Backend
  don't need to know how any individual game works internally.
- **Fail-safe timer** — the overlay has its own timeout slightly longer
  than the game's, so if a game ever hangs or crashes, the participant
  still gets auto-failed instead of getting stuck forever.
- **Consistent visual language** — every game shares the same dark theme
  and countdown bar (`shared/styles.css`, `shared/distraction-kit.js`), so
  the 10 games feel like one cohesive product instead of 10 random pages.
- **Configurable duration** — `?duration=X` (seconds) is passed automatically
  by the overlay, so tightening/loosening the distraction timer for balance
  testing is a one-line change, no code edits in the games themselves.

## The 10 distractions
Every game opens with a "click or press any key to start" gate so keyboard controls get focus inside the iframe.

| # | Game | Type |
|---|------|------|
| 1 | Snake Sprint | Arcade (keyboard) |
| 2 | Bug Hopper | Flappy-style timing |
| 3 | Bug Storm | Dodge / survival |
| 4 | Brick Breaker | Arcade (mouse/keys) |
| 5 | Maze Runner | Navigation (random maze each time) |
| 6 | Whack the Bug | Reflex/accuracy |
| 7 | Memory Match | Pattern memory |
| 8 | Lights Out | Logic puzzle |
| 9 | Quickfire Trivia | Tech trivia |
| 10 | Code Rain | Typing under pressure |

## Possible next steps / stretch goals
- Swap `Math.random()` picks for a **no-repeat shuffle** so a participant
  doesn't see the same distraction twice across their 10 problems.
- Add sound effects (short, quiet) for extra polish — currently silent by design.
- Add a difficulty ramp (e.g. shorter `duration` for problems 8–10).
