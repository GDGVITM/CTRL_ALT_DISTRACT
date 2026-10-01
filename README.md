# Ctrl Alt Distract

A live DSA competition: ten timed rounds, a LeetCode-style judge (Judge0), and a random "distraction" mini-game that interrupts each round.

- **Frontend** — React 19 + TypeScript + Vite + Tailwind v4 (`src/`)
- **Backend** — FastAPI + asyncpg (`backend/app/`), the only writer to the database
- **Database / auth** — Supabase (Postgres + Auth + Realtime)
- **Code execution** — Judge0 (Python, C++, C, Java)

Nothing on the site is hardcoded: event settings, problems, players, scores, the leaderboard and proctoring alerts all come from the database through the API.

## Architecture

```
Browser ──JWT──▶ FastAPI ──asyncpg──▶ Supabase Postgres
   │                │
   │                └──HTTPS──▶ Judge0
   └──Realtime──▶ Supabase (event status pushes: lobby → live → ended)
```

- The **server owns the clock, scores and round order**. Timers are computed from Postgres `now()`; a distraction freezes the clock server-side. Refreshing or opening a second tab always resumes the true state.
- Every scoring action locks the player's row, so double-clicks and parallel tabs cannot double-score.
- **Judging** has two modes per problem. *io* (the event questions): the player writes a whole program; each test case is one Judge0 run and stdout is compared line by line (trailing spaces/blank lines ignored). *function*: the player's `Solution` class is wrapped in a generated driver (`backend/app/judge/harness.py`) that runs every case in one process. Run uses the sample case(s); Submit uses all cases. Hidden test data never leaves the server.
- The browser cannot read tables directly: RLS is on everywhere with no policies, except `event_config` (read-only, for Realtime).

## Setup

1. **Environment files** (both are gitignored):
   ```bash
   cp .env.example .env                  # frontend: Supabase URL + publishable key + API URL
   cp backend/.env.example backend/.env  # backend: DATABASE_URL, Judge0, CORS ...
   ```
   Use the Supabase **session pooler** connection string for `DATABASE_URL` — the direct `db.<ref>.supabase.co` host is IPv6-only and fails on many networks. URL-encode special characters in the password (`@` → `%40`).

2. **Backend**
   ```bash
   cd backend
   python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\activate
   pip install -r requirements-dev.txt
   python -m app.cli migrate        # apply supabase/migrations/*.sql
   python -m app.cli seed --pdf "<Coding Solutions>.pdf" --trust-oracle --rounds 10   # load the question pool; each player plays 10 (see Content)
   python -m app.cli make-admin you@example.com   # the user must have signed up first
   uvicorn app.main:app --reload    # http://localhost:8000  (docs at /docs)
   ```

3. **Frontend**
   ```bash
   npm install
   npm run dev                      # http://localhost:5173
   ```

Docker: `docker compose up --build` runs the backend using `backend/.env`.

## Running an event

1. Players sign up, tick the checklist on the dashboard and **Join**. They wait in the lobby.
2. An admin opens `/admin` and presses **Start event**. Every lobby gets a 3-2-1 countdown and Round 1 begins.
3. **End event** closes all open rounds and sends everyone to their results. **Reset event** (only after the event ended) wipes progress so the lobby reopens.

Admins are promoted server-side with `make-admin`; the signup form cannot grant the role.

## Judge0

Defaults to the public `https://ce.judge0.com` (rate limited — fine for development). For a real event run your own instance ([github.com/judge0/judge0](https://github.com/judge0/judge0)) or a RapidAPI plan, and set `JUDGE0_URL`, `JUDGE0_API_KEY`, `JUDGE0_API_KEY_HEADER` in `backend/.env`. Language ids and time multipliers live in the `languages` table.

## Content

- The event questions are imported straight from the organisers' PDF (`python -m app.cli seed --pdf ...`): statement, example, 3 hidden cases each, plus 4 generated cases per question. The PDF is read at seed time and **never stored in the repo**, so hidden tests and solutions are not committed. Each PDF case is checked against the PDF's own solution; if they disagree the import refuses and lists the contradictions, and `--trust-oracle` replaces the PDF's expectation with the statement-consistent answer. Difficulty labels and the input/output descriptions are in `backend/app/seed/pdf_import.py` (`META`). Seeding is refused once anyone has played. **Each player is dealt a random selection (and order) of the pool**: `--rounds N` sets how many (the event is currently 10 of 15). The selection is drawn once, when the player joins, and stored on their participation, so it can't be re-rolled by rejoining.
- `backend/app/seed/problems.py` holds a small function-style demo set (`seed --demo`) used by the automated tests.
- Event settings (rounds, round length, points, distraction timing, date, organiser) are the single row in `event_config`.

## Tests

```bash
cd backend
python -m pytest                       # offline: protocol, harnesses, evaluator, JWT verification
python -m tests.live_judge_check       # every solution × every language on a real Judge0
python -m tests.e2e_io "<questions>.pdf"          # plays all rounds of the seeded question set on the real DB + Judge0
python -m tests.live_io_check "<questions>.pdf"   # the PDF's own C/C++/Java/Python solutions on Judge0 (add --seeded to use the stored tests)
python -m tests.e2e_flow "<questions>.pdf"        # full API walkthrough using the demo set; restores the real set afterwards
# (e2e scripts create and delete throwaway users and refuse to run if real participants exist)
```

`tests/ui_harness.py` serves the API with the token check replaced so the UI can be driven without a Supabase login. It disables authentication — development only.

```bash
npm run build   # type-check + production build
npm run lint
```

## Routes

| Route | Page |
|---|---|
| `/login` | Sign in / sign up |
| `/rules` | Public rulebook |
| `/dashboard` | Join the event, progress, rulebook |
| `/lobby` | Live roster + countdown |
| `/arena` | Problem, editor, Run/Submit, distractions |
| `/complete` | Results |
| `/leaderboard` | Live standings |
| `/admin` | Event control, proctoring alerts, top 10 (admin only) |

Design tokens live in `src/index.css` under `@theme`.
