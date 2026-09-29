import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type Tone = "cyan" | "warning" | "danger" | "muted" | "success" | "yellow";

const toneClasses: Record<Tone, string> = {
  cyan: "text-accent-cyan bg-fill-info border-accent-cyan/30",
  warning: "text-warning bg-fill-warning border-warning/30",
  danger: "text-danger bg-fill-danger border-danger/40",
  muted: "text-text-muted bg-white/5 border-border-default",
  success: "text-success bg-fill-success border-success/35",
  yellow: "text-accent-yellow bg-fill-brand border-accent-yellow/35",
};

export function StatusBadge({
  tone,
  icon,
  pulse,
  children,
}: {
  tone: Tone;
  icon?: ReactNode;
  pulse?: "slow" | "fast";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 font-label text-[11px] tracking-[0.08em] uppercase",
        toneClasses[tone],
      )}
    >
      <span
        className={cn(
          pulse === "slow" && "animate-pulse-slow",
          pulse === "fast" && "animate-pulse-fast",
        )}
      >
        {icon}
      </span>
      {children}
    </span>
  );
}
