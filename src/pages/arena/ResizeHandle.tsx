import { useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { cn } from "../../lib/utils";

const KEY_STEP = 24;

/** Drag handle on the top edge of the result panel. It resizes the panel from the bottom of `containerRef`. */
export function ResizeHandle({
  containerRef,
  height,
  onChange,
  min = 120,
  minOther = 150,
  initial = 240,
  disabled,
}: {
  containerRef: RefObject<HTMLElement | null>;
  height: number;
  onChange: (h: number) => void;
  min?: number;
  minOther?: number;
  initial?: number;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);

  const clamp = (h: number) => {
    const total = containerRef.current?.getBoundingClientRect().height ?? 900;
    return Math.round(Math.min(Math.max(h, min), Math.max(min, total - minOther)));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    onChange(clamp(rect.bottom - e.clientY));
  };
  const stop = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === "ArrowUp") onChange(clamp(height + KEY_STEP));
    else if (e.key === "ArrowDown") onChange(clamp(height - KEY_STEP));
    else if (e.key === "Home") onChange(clamp(9999));
    else if (e.key === "End") onChange(min);
    else return;
    e.preventDefault();
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize testcases and output panel"
      aria-valuenow={height}
      aria-valuemin={min}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onDoubleClick={() => onChange(clamp(initial))}
      onKeyDown={onKeyDown}
      className={cn(
        "group absolute inset-x-0 -top-[3px] z-20 hidden h-[7px] touch-none lg:block",
        disabled ? "cursor-not-allowed" : "cursor-row-resize",
      )}
    >
      <span
        className={cn(
          "absolute inset-x-0 top-[3px] h-px transition-colors",
          dragging ? "h-[2px] bg-accent-cyan" : "bg-border-default group-hover:bg-accent-cyan group-focus-visible:bg-accent-cyan",
        )}
      />
      <span
        className={cn(
          "absolute left-1/2 top-[1px] h-[5px] w-10 -translate-x-1/2 rounded-full bg-border-strong transition-colors",
          dragging && "bg-accent-cyan",
          "group-hover:bg-accent-cyan",
        )}
      />
    </div>
  );
}
