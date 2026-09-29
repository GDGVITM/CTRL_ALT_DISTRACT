# CTRL ALT ONE // Distraction Disruption Protocol Engine

A high-performance, esports-styled competitive coding distraction challenge system built for the **Ctrl Alt One** tournament prototype.

---

## 🚀 Key Highlights

1. **10 Complete Interactive Distraction Mini-Games:**
   - **01. Reaction Test (`REFLEX PROTOCOL`)**: Random intercept delay, millisecond precision reaction clock, false-start penalty strikes, S-tier/A-tier ranking.
   - **02. Memory Match (`SYNAPSE MATRIX`)**: 3D card flipping matrix with 12 cyber node cards (6 pairs), 1.5s initial memory peek, mismatch shake feedback.
   - **03. Quick Math (`ALGO ARITHMETIC`)**: Rapid arithmetic generator (multiplication, division, modular algebra) with 4 options, keyboard shortcuts `[1-4]`, streak bonuses.
   - **04. Color Trap (`STROOP OVERLOAD`)**: Stroop effect cognitive disruptor with dynamic directives (Ink Color vs Word Text), high-contrast cyber palette, 5 strikes to pass.
   - **05. Pattern Puzzle (`SEQUENCE LOGIC`)**: Powers of 2, Fibonacci, Hexadecimal offsets, Binary bitshifts, and geometric glyph increments.
   - **06. Odd One Out (`ANOMALY DETECTOR`)**: Visual glyph anomaly radar grid (3x3 to 4x4) with subtle orientation, binary bit, and syntax deviations.
   - **07. Simon Says (`NEURAL SEQUENCE`)**: Quad-core cyber nodes (Alpha, Beta, Gamma, Delta) with escalating sequence playback and synthesized melodic audio tones.
   - **08. Trivia Blitz (`TECH ARCHIVES`)**: Fast-paced computer science, algorithm complexity, networking, and hacker history questions with instant explanation tooltips.
   - **09. Typing Challenge (`TERMINAL INJECTION`)**: Syntax-highlighted live code typing console with real-time WPM, Accuracy %, character gauges, and error detection.
   - **10. Catch The Object (`PACKET INTERCEPTOR`)**: Dynamic tactical radar arena with floating rogue data nodes and golden bonus packets before decay.

2. **Common Unskippable Modal Architecture (`DistractionModal`):**
   - Full-screen takeover with dark background blur, cyber grid, and scanlines.
   - Blocks ESC key, disables backdrop click-off, eliminates accidental dismissals.
   - Phase lifecycle: **Warning Breach Banner → 3-2-1 Countdown → Active Game + 120s Timer → Result Screen & Telemetry Payload**.

3. **Centralized 120s Urgency Timer (`DistractionTimer`):**
   - Non-resetting global countdown formatted `MM:SS`.
   - Visual heartbeat pulse & crimson alert mode when `<= 10s` remaining.
   - Automatic `onTimeout()` triggering at `00:00` with 0 problem points recorded.

4. **Web Audio API Synth Effects (`sound.ts`):**
   - 100% self-contained synthesized sounds for countdown ticks, engage whoosh, clicks, correct arpeggios, wrong strikes, and victory fanfare (zero external audio file dependencies).
   - Audio mute/unmute toggle in header.

5. **Competitive Preview Dashboard (`DistractionLab`):**
   - 10 interactive challenge cards with difficulty badges, stats, and real-time pass/fail states.
   - **"RUN ALL 10"** Tournament Mode for sequential end-to-end demonstrations.
   - **Simulated Coding IDE** backdrop with problem statement, test cases, and a "Trigger Disruption Ambush" button.
   - **API Payload Inspector** modal displaying dispatched JSON payloads for backend engineers.

---

## 🛠️ How to Run Locally

```bash
# 1. Navigate to the project directory
cd ctrl-alt-one

# 2. Install dependencies (if not already installed)
npm install

# 3. Start the development server
npm run dev
```

Open your browser at **`http://localhost:5173/`** to access the **Distraction Lab**.

To run a production build:
```bash
npm run build
```

---

## 🔌 Backend Integration Specification

The distraction engine emits structured payloads on `onSuccess`, `onFailure`, and `onTimeout`:

```typescript
export interface DistractionResultPayload {
  problemId: number;
  distractionId: string;
  result: 'passed' | 'failed' | 'timeout';
  timeTakenSeconds: number;
  score?: number;
  metrics?: Record<string, string | number | boolean>;
  timestamp: string;
}
```

### Example Emitted Payloads:

```json
{
  "problemId": 3,
  "distractionId": "reaction-test",
  "result": "passed",
  "timeTakenSeconds": 4.8,
  "metrics": {
    "reactionTimeMs": 242,
    "grade": "S+"
  },
  "timestamp": "2026-09-29T02:40:00.000Z"
}
```

```json
{
  "problemId": 5,
  "distractionId": "typing-challenge",
  "result": "passed",
  "timeTakenSeconds": 14.2,
  "metrics": {
    "accuracy": "96%",
    "wpm": 68
  },
  "timestamp": "2026-09-29T02:41:00.000Z"
}
```

---

## 📁 Project Structure

```
ctrl-alt-one/
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── DistractionLab.tsx       # Main tournament preview dashboard
│   │   │   └── CodingIdeMock.tsx        # Simulated background coding platform
│   │   ├── distractions/
│   │   │   ├── DistractionModal.tsx     # Master unskippable takeover container
│   │   │   ├── DistractionTimer.tsx     # 120s timer countdown with urgency pulses
│   │   │   ├── DistractionIntro.tsx     # 3-2-1 countdown & breach alert banner
│   │   │   └── DistractionResult.tsx    # Victory/Defeat screen + confetti & telemetry
│   │   └── games/
│   │       ├── GameFactory.tsx          # Dynamic distraction router
│   │       ├── ReactionTest.tsx         # Mini-Game 01
│   │       ├── MemoryMatch.tsx          # Mini-Game 02
│   │       ├── QuickMath.tsx            # Mini-Game 03
│   │       ├── ColorTrap.tsx            # Mini-Game 04
│   │       ├── PatternPuzzle.tsx        # Mini-Game 05
│   │       ├── OddOneOut.tsx            # Mini-Game 06
│   │       ├── SimonSays.tsx            # Mini-Game 07
│   │       ├── TriviaBlitz.tsx          # Mini-Game 08
│   │       ├── TypingChallenge.tsx      # Mini-Game 09
│   │       └── CatchObject.tsx          # Mini-Game 10
│   ├── types/
│   │   └── distraction.ts               # TypeScript interfaces & payload models
│   ├── utils/
│   │   ├── distractionRegistry.ts       # 10 distractions metadata registry
│   │   └── sound.ts                     # Web Audio API synthesizer for SFX
│   ├── App.tsx                          # Root application entry
│   ├── index.css                        # Tailwind v4 theme, cyber grid & glows
│   └── main.tsx                         # React 19 / Vite root mount
├── package.json
└── vite.config.ts
```
