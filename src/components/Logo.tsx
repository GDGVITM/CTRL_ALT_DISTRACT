import { cn } from "../lib/utils";

function Keycap({
  label,
  size,
  yellow,
  pressed,
}: {
  label: string;
  size: number;
  yellow?: boolean;
  pressed?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xs border font-keycap transition-transform duration-100",
        yellow
          ? "bg-accent-yellow border-accent-yellow-deep text-black"
          : "bg-bg-elevated border-border-strong text-text-secondary",
        pressed && "translate-y-[2px]",
      )}
      style={{
        width: label === "DISTRACT" ? size * 2.65 : size,
        height: size,
        fontSize: Math.max(7, size * 0.32),
        boxShadow: yellow
          ? `0 ${Math.max(2, size * 0.09)}px 0 0 #8A6A0E`
          : `0 ${Math.max(2, size * 0.09)}px 0 0 #05060a`,
      }}
    >
      {label}
    </span>
  );
}

export function Logo({
  size = 24,
  wordmark = true,
  className,
  wordmarkClassName,
  as: As = "div",
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
  as?: "div" | "span";
}) {
  return (
    <As aria-label="Ctrl Alt Distract" className={cn("inline-flex items-center gap-2", className)}>
      <span className="inline-flex items-center gap-1">
        <Keycap label="CTRL" size={size} />
        <Keycap label="ALT" size={size} />
        <Keycap label="DISTRACT" size={size} yellow />
      </span>
      {wordmark && (
        <span
          className={cn(
            "font-pixel text-text-primary hidden sm:inline",
            wordmarkClassName,
          )}
          style={{ fontSize: Math.max(9, size * 0.42) }}
        >
          CTRL ALT DISTRACT
        </span>
      )}
    </As>
  );
}

export function KeycapStand({ size = 48 }: { size?: number }) {
  return (
    <div className="inline-flex items-center gap-2">
      <Keycap label="CTRL" size={size} />
      <Keycap label="ALT" size={size} />
      <Keycap label="DISTRACT" size={size} yellow />
    </div>
  );
}
