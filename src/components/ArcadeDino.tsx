import { useEffect, useRef } from "react";

const W = 720;
const H = 300;
const GROUND = 250;

const DINO_BODY = [
  "..............#######",
  "..............##.#####",
  "..............#######",
  "..............#######",
  "..............####...",
  "..............#######",
  "#............####....",
  "#...........######...",
  "##.........#######.#.",
  "##........##########.",
  "###.......########.#.",
  "####.....###########.",
  ".####....###########.",
  "..#################..",
  "...################..",
  "....##############...",
  ".....############....",
  "......###########....",
];
const DINO_LEGS_A = ["........###..###...", "........###..##....", "........##........."];
const DINO_LEGS_B = ["........###..###...", "........##...###...", "...........###...."];

const CACTUS = [
  "...##....",
  "...##....",
  "#..##....",
  "#..##..#.",
  "#..##..#.",
  "##.##..#.",
  ".#####.#.",
  "..#####..",
  "...##....",
  "...##....",
  "...##....",
  "...##....",
  "...##....",
];

const CLOUD = [
  "......####......",
  "....########....",
  "..############..",
  "################",
];

type Cactus = { x: number; count: number };
type Cloud = { x: number; y: number; s: number };

function drawSprite(
  ctx: CanvasRenderingContext2D,
  rows: string[],
  x: number,
  y: number,
  px: number,
  color: string,
  eye?: { col: number; row: number },
) {
  ctx.fillStyle = color;
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === "#") ctx.fillRect(Math.round(x + c * px), Math.round(y + r * px), px, px);
    }
  }
  if (eye) {
    ctx.fillStyle = "#000";
    ctx.fillRect(Math.round(x + eye.col * px), Math.round(y + eye.row * px), px, px);
  }
}

export function ArcadeDino({ busy = false }: { busy?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLSpanElement>(null);
  const stickRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const PX = 4;
    const CPX = 5;
    const dinoW = 22 * PX;
    const dinoH = (DINO_BODY.length + 3) * PX;
    const dinoX = 90;

    let speed = 6;
    let dinoY = GROUND - dinoH;
    let vy = 0;
    let onGround = true;
    let score = 0;
    let hi = 420;
    let frame = 0;
    let cacti: Cactus[] = [{ x: W + 200, count: 1 }];
    let clouds: Cloud[] = [
      { x: 120, y: 40, s: 3 },
      { x: 420, y: 70, s: 2 },
      { x: 640, y: 30, s: 3 },
    ];
    let groundOffset = 0;
    let pressTimer = 0;
    const bumps = Array.from({ length: 40 }, (_, i) => ({
      x: i * 47 + ((i * 31) % 23),
      w: 2 + (i % 3) * 2,
      y: GROUND + 6 + (i % 4) * 4,
    }));

    const cactusW = (c: Cactus) => (9 * CPX + 6) * c.count;
    const cactusH = CACTUS.length * CPX;

    function jump() {
      if (!onGround) return;
      vy = -15;
      onGround = false;
      pressTimer = 10;
    }

    function update(dt: number) {
      frame += dt;
      score += 0.18 * dt * (speed / 6);
      speed = Math.min(10, speed + 0.0009 * dt);
      groundOffset = (groundOffset + speed * dt) % 940;

      for (const c of cacti) c.x -= speed * dt;
      const last = cacti[cacti.length - 1];
      if (last.x < W - 260 - Math.random() * 260) {
        cacti.push({ x: W + 40, count: Math.random() < 0.3 ? 2 : 1 });
      }
      cacti = cacti.filter((c) => c.x + cactusW(c) > -20);

      for (const cl of clouds) {
        cl.x -= speed * 0.25 * dt;
        if (cl.x < -80) {
          cl.x = W + 20 + Math.random() * 120;
          cl.y = 24 + Math.random() * 60;
        }
      }

      // autoplay: jump when the next cactus is close enough for the current speed
      const next = cacti.find((c) => c.x + cactusW(c) > dinoX);
      if (next && onGround) {
        const dist = next.x - (dinoX + dinoW);
        // start the jump so the apex lands mid-way over the cactus
        const trigger = (15 / 0.65) * speed - (dinoW + cactusW(next)) / 2;
        if (dist <= trigger && dist > -10) jump();
      }

      if (!onGround) {
        vy += 0.65 * dt;
        dinoY += vy * dt;
        if (dinoY >= GROUND - dinoH) {
          dinoY = GROUND - dinoH;
          vy = 0;
          onGround = true;
        }
      }

      if (Math.floor(score) >= 99999) score = 0;
      if (pressTimer > 0) pressTimer -= dt;
    }

    function drawScene() {
      ctx!.clearRect(0, 0, W, H);

      for (const cl of clouds) drawSprite(ctx!, CLOUD, cl.x, cl.y + 20, cl.s + 1, "#2A2C36");

      // ground line + bumps
      ctx!.fillStyle = "#3A3D48";
      ctx!.fillRect(0, GROUND + 2, W, 2);
      ctx!.fillStyle = "#24262E";
      for (const b of bumps) {
        const x = ((b.x - groundOffset) % 1880 + 1880) % 1880;
        if (x < W) ctx!.fillRect(Math.round(x), b.y, b.w, 2);
      }

      for (const c of cacti) {
        for (let i = 0; i < c.count; i++) {
          drawSprite(ctx!, CACTUS, c.x + i * (9 * CPX + 6), GROUND + 3 - cactusH, CPX, "#2EE59D");
        }
      }

      const legs = onGround ? (Math.floor(frame / 5) % 2 === 0 ? DINO_LEGS_A : DINO_LEGS_B) : DINO_LEGS_A;
      drawSprite(ctx!, [...DINO_BODY, ...legs], dinoX, dinoY, PX, "#F4F5F7", { col: 16, row: 1 });

      ctx!.font = "700 20px 'JetBrains Mono', monospace";
      ctx!.textAlign = "right";
      ctx!.fillStyle = "#6E7383";
      ctx!.fillText(`HI ${Math.floor(hi).toString().padStart(5, "0")}`, W - 130, 34);
      ctx!.fillStyle = "#FFD23F";
      ctx!.fillText(Math.floor(score).toString().padStart(5, "0"), W - 24, 34);
      if (score > hi) hi = score;
    }

    if (reduced) {
      cacti = [{ x: 460, count: 1 }];
      dinoY = GROUND - dinoH - 70;
      score = 420;
      drawScene();
      return;
    }

    let raf = 0;
    let lastT = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(3, (now - lastT) / 16.667);
      lastT = now;
      update(dt);
      drawScene();

      if (buttonRef.current) {
        buttonRef.current.style.transform = pressTimer > 0 ? "translateY(3px)" : "translateY(0)";
      }
      if (stickRef.current) {
        stickRef.current.style.transform = `rotate(${pressTimer > 0 ? 12 : 0}deg)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[760px]" aria-hidden="true">
      {/* Marquee */}
      <div className="border border-border-strong bg-bg-elevated px-4 py-4 text-center chamfer">
        <span className="font-pixel text-base text-accent-yellow sm:text-2xl">
          CTRL ALT <span className="text-text-primary">ONE</span>
        </span>
      </div>

      {/* Cabinet body */}
      <div className="mx-4 border-x border-border-strong bg-bg-panel px-4 pb-5 pt-5">
        {/* Bezel + screen */}
        <div className="border border-border-strong bg-black p-4" style={{ boxShadow: "inset 0 0 0 2px #05060a" }}>
          <div
            className="crt-scanlines relative overflow-hidden bg-bg-inset"
            style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,0.9)", aspectRatio: `${W} / ${H}` }}
          >
            <canvas ref={canvasRef} className="block h-full w-full" style={{ imageRendering: "pixelated" }} />
            <div className="crt-vignette absolute inset-0 z-[2]" />
            {busy && (
              <div className="absolute inset-0 z-[3] flex items-center justify-center bg-black/60">
                <span className="animate-blink font-pixel text-sm text-accent-yellow">LOADING…</span>
              </div>
            )}
          </div>
        </div>

        {/* Control panel */}
        <div className="mt-5 flex items-center justify-between border border-border-default bg-bg-elevated px-8 py-5">
          {/* Joystick */}
          <div className="relative flex h-20 w-20 items-end justify-center">
            <span className="absolute bottom-0 h-4 w-20 rounded-xs bg-bg-inset" />
            <span
              ref={stickRef}
              className="absolute bottom-3 flex origin-bottom flex-col items-center transition-transform duration-100"
            >
              <span className="h-6 w-6 rounded-full bg-accent-magenta shadow-[0_0_10px_rgba(255,62,165,0.5)]" />
              <span className="h-8 w-2 bg-border-strong" />
            </span>
          </div>

          <span className="animate-pulse-slow font-label text-xs uppercase tracking-wide text-text-muted">
            Insert coin
          </span>

          {/* Buttons */}
          <div className="flex items-center gap-5">
            <span className="h-10 w-10 rounded-full bg-accent-cyan/70 shadow-[0_3px_0_0_#0a5b6b]" />
            <span
              ref={buttonRef}
              className="h-10 w-10 rounded-full bg-accent-yellow shadow-[0_3px_0_0_#8A6A0E] transition-transform duration-75"
            />
          </div>
        </div>
      </div>

      {/* Base */}
      <div className="mx-1 h-5 border border-border-strong bg-bg-elevated" />
    </div>
  );
}
