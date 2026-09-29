import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

interface Entry {
  rank: number;
  id: string;
  name: string;
  total: number;
  self?: boolean;
}

const META: Record<number, { label: string; color: string; border: string; glow: string; delay: number; height: string }> = {
  1: { label: "1ST", color: "text-accent-yellow", border: "border-accent-yellow", glow: "shadow-[0_0_24px_rgba(255,210,63,0.18)]", delay: 500, height: "min-h-[210px]" },
  2: { label: "2ND", color: "text-[#D6D9E0]", border: "border-border-strong", glow: "", delay: 250, height: "min-h-[180px]" },
  3: { label: "3RD", color: "text-[#E09A5B]", border: "border-border-strong", glow: "", delay: 0, height: "min-h-[180px]" },
};

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
    }, delay + 300);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, delay, duration]);
  return value;
}

function PodiumBlock({ p }: { p: Entry }) {
  const m = META[p.rank];
  const score = useCountUp(p.total, m.delay);
  const first = p.rank === 1;

  return (
    <div
      className={cn(
        "podium-rise flex w-[30%] min-w-[104px] max-w-[200px] flex-col items-center border bg-bg-panel px-2 pb-5 pt-4 text-center sm:px-4",
        m.border,
        m.glow,
        m.height,
      )}
      style={{ animationDelay: `${m.delay}ms` }}
    >
      <span className={cn("mb-1 h-6 text-xl leading-6", !first && "invisible")} aria-hidden="true">
        <span className="podium-crown inline-block" style={{ animationDelay: `${m.delay + 700}ms` }}>
          👑
        </span>
      </span>
      <span className={cn("font-pixel text-xs leading-4 sm:text-sm", m.color)}>{m.label}</span>
      <span className="mt-3 flex h-10 w-10 items-center justify-center rounded-xs bg-bg-elevated font-mono text-xs font-bold text-text-secondary">
        {p.id}
      </span>
      <span className="mt-2 w-full truncate font-body text-sm font-medium leading-5 text-text-primary">
        {p.name}
      </span>
      <span className="mt-auto pt-3 font-mono text-xl font-bold leading-7 text-accent-yellow font-tnum sm:text-2xl">
        {score}
      </span>
    </div>
  );
}

export function Podium({ entries }: { entries: Entry[] }) {
  const [first, second, third] = entries;
  return (
    <div className="mb-10 flex items-end justify-center gap-2 sm:gap-4" aria-label="Top three players">
      <PodiumBlock p={second} />
      <PodiumBlock p={first} />
      <PodiumBlock p={third} />
    </div>
  );
}
