import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "../../lib/utils";
import { CHARACTERS, PixelSprite, type CharacterKey } from "./sprites";

interface Entry {
  rank: number;
  id: string;
  name: string;
  total: number;
  self?: boolean;
}

// Pipe height is set by rank (px on desktop, scaled down on phones via CSS).
const META: Record<
  number,
  { label: string; color: string; pipeH: number; delay: number; character: CharacterKey; anim: string }
> = {
  1: { label: "1ST", color: "text-accent-yellow", pipeH: 250, delay: 600, character: "mario", anim: "char-celebrate" },
  2: { label: "2ND", color: "text-[#D6D9E0]", pipeH: 180, delay: 300, character: "luigi", anim: "char-celebrate" },
  3: { label: "3RD", color: "text-[#E09A5B]", pipeH: 120, delay: 0, character: "peach", anim: "char-float" },
};
const GROW_MS = 1100;

function useCountUp(target: number, delay: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const timer = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setValue(Math.round((1 - Math.pow(1 - t, 3)) * target));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, delay, duration]);
  return value;
}

function PodiumColumn({ p }: { p: Entry }) {
  const m = META[p.rank];
  const score = useCountUp(p.total, m.delay + GROW_MS - 300);
  const first = p.rank === 1;
  const ch = CHARACTERS[m.character];
  const landAt = m.delay + GROW_MS;

  return (
    <div
      className="flex w-[30%] min-w-[96px] max-w-[170px] flex-col items-center justify-end"
      data-rank={p.rank}
    >
      {/* Rank, then name + score, above the character */}
      <div className="relative z-[3] mb-9 flex w-full flex-col items-center text-center">
        <span className={cn("font-display text-2xl leading-6 sm:text-3xl", m.color)}>
          {first && (
            <span className="podium-crown mr-1 inline-block align-middle text-lg" aria-hidden="true" style={{ animationDelay: `${landAt - 200}ms` }}>
              👑
            </span>
          )}
          {m.label}
        </span>
        <span className="mt-1 w-full truncate font-body text-sm font-semibold leading-5 text-text-primary">
          {p.name}
        </span>
        <span className="font-mono text-xl font-bold leading-7 text-accent-yellow font-tnum sm:text-2xl">
          {score}
        </span>
      </div>

      {/* Character standing on the pipe; rides up as the pipe grows, then celebrates */}
      <div
        className="relative z-[2] -mb-[7px] w-[64px] sm:w-[84px]"
        role="img"
        aria-label={`${ch.label} stands on the ${m.label} place pipe`}
      >
        <div
          className={cn("char-body", m.anim)}
          style={{ animationDelay: `${landAt}ms`, "--land": `${landAt}ms` } as CSSProperties}
        >
          <div className="relative">
            <PixelSprite rows={ch.frames[0]} palette={ch.palette} className="char-frame-a block w-full" />
            <PixelSprite
              rows={ch.frames[1]}
              palette={ch.palette}
              className="char-frame-b absolute inset-0 block w-full"
            />
            <span className="char-shadow" />
          </div>
        </div>
      </div>

      {/* The pipe: lip + body, growing up from the floor */}
      <div className="flex w-full flex-col items-center">
        <div className="pipe-lip w-full" />
        <div
          className="pipe-body pipe-grow"
          style={
            {
              "--pipe-h": `${m.pipeH}px`,
              animationDelay: `${m.delay}ms`,
              animationDuration: `${GROW_MS}ms`,
            } as CSSProperties
          }
        />
      </div>
    </div>
  );
}

export function Podium({ entries }: { entries: Entry[] }) {
  const [first, second, third] = entries;
  if (!first) return null;
  return (
    <div className="mb-6" aria-label="Leading players">
      <div className="flex items-end justify-center gap-3 sm:gap-6">
        {second && <PodiumColumn p={second} />}
        <PodiumColumn p={first} />
        {third && <PodiumColumn p={third} />}
      </div>
      <div className="pipe-floor mx-auto max-w-[620px]" aria-hidden="true" />
    </div>
  );
}
