import { useState } from "react";
import { Bug, X } from "lucide-react";
import { cn } from "../../lib/utils";

export function DevConsole({ actions }: { actions: Array<{ label: string; onClick: () => void }> }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-3 left-3 z-system">
      {open ? (
        <div className="w-64 border border-accent-cyan/40 bg-bg-elevated p-3 shadow-[0_24px_64px_rgba(0,0,0,0.8)]">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-label text-[15px] uppercase tracking-[0.04em] text-accent-cyan">
              <Bug size={12} /> Demo controls
            </span>
            <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">
              <X size={14} />
            </button>
          </div>
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={a.onClick}
                className={cn(
                  "rounded-xs border border-border-default px-2 py-1.5 text-left font-mono text-[11px] text-text-secondary hover:border-accent-cyan hover:text-text-primary",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-accent-cyan/40 bg-bg-elevated text-accent-cyan"
          aria-label="Open demo controls"
        >
          <Bug size={16} />
        </button>
      )}
    </div>
  );
}
