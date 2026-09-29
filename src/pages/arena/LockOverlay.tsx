import { Lock } from "lucide-react";

export function LockOverlay() {
  return (
    <div
      className="hazard-stripes crt-scanlines absolute inset-0 z-lock bg-black/62"
      style={{ cursor: "not-allowed" }}
    >
      <div className="flex justify-center pt-4">
        <div className="flex items-center gap-2 border border-accent-magenta bg-bg-elevated px-3 py-2">
          <Lock size={14} className="text-accent-magenta" />
          <div>
            <div className="font-label text-[11px] uppercase tracking-wide text-text-primary">
              Workspace locked
            </div>
            <div className="font-body text-[11px] text-text-secondary">
              Clear the distraction to continue
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
