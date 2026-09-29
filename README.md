# Ctrl Alt Distract — Frontend

Frontend-only implementation of the **Ctrl Alt Distract** competitive-programming arcade UI, built from the Stitch design spec (`design.md`) and screen set in this repo.

Stack: React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router. No backend — the Arena page uses local component state (and a small "Demo controls" panel) to walk through every documented state: distraction trigger/clear/timeout, run/submit outcomes, timer urgency levels, offline banner, and round transitions.

## Routes

| Route | Page |
|---|---|
| `/` | Redirects to `/login` |
| `/rules` | Public rulebook |
| `/login` | Auth (sign in / sign up) — the default page |
| `/dashboard` | Participant dashboard (state switcher for demo) |
| `/lobby` | Lobby + countdown overlay |
| `/arena` | Competition arena (HUD, editor, distraction system, transitions) |
| `/complete` | Completion screen |
| `/leaderboard` | Leaderboard |
| `/admin` | Admin console (start/end event, proctoring alerts, leaderboard) |
| `*` | 404 |

## Development

```bash
npm install
npm run dev
```

```bash
npm run build   # type-check + production build
npm run lint
```

Design tokens (color, type, spacing, motion, z-index) live in `src/index.css` under `@theme`, mirroring the design spec's Sections 3–7.
