import { useState } from "react";
import { Copy } from "lucide-react";
import type { Problem } from "../../lib/types";
import { cn, difficultyClasses, valueClass } from "../../lib/utils";

const TABS = ["DESCRIPTION", "EXAMPLES", "CONSTRAINTS", "HINTS"] as const;
type Tab = (typeof TABS)[number];

export function ProblemPanel({ problem, round }: { problem: Problem | null; round: number }) {
  const [tab, setTab] = useState<Tab>("DESCRIPTION");
  const [revealed, setRevealed] = useState<boolean[]>([]);

  if (!problem) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-panel font-body text-sm text-text-muted">
        Loading problem…
      </div>
    );
  }
  const isRevealed = (i: number) => revealed[i] === true;

  return (
    <div className="flex h-full flex-col bg-bg-panel">
      <div className="border-b border-border-hairline p-5">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-sm text-text-muted">
            {round.toString().padStart(2, "0")}
          </span>
          <h2 className="font-sans text-xl font-semibold text-text-primary">{problem.title}</h2>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={cn("flex items-center gap-1 rounded-xs px-2 py-0.5 font-label text-[16px]", difficultyClasses(problem.difficulty))}>
            ▲ {problem.difficulty}
          </span>
          <span className="rounded-xs bg-fill-brand px-2 py-0.5 font-mono text-[11px] text-accent-yellow">
            +{problem.points} PTS
          </span>
          {problem.tags.map((t) => (
            <span key={t} className="rounded-xs bg-bg-elevated px-2 py-0.5 font-body text-[11px] text-text-secondary">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex h-10 border-b border-border-hairline" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 border-b-2 font-label text-[16px] uppercase tracking-[0.04em] transition-colors sm:flex-none sm:px-5",
              tab === t
                ? "border-accent-cyan text-text-primary"
                : "border-transparent text-text-muted hover:bg-bg-hover hover:text-text-secondary",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-[80ch] font-body text-[15px] leading-relaxed text-text-primary">
          {(tab === "DESCRIPTION" || tab === "EXAMPLES") && (
            <>
              {tab === "DESCRIPTION" &&
                problem.description.map((p, i) => (
                  <p key={i} className="mb-4 text-text-secondary">
                    {p}
                  </p>
                ))}

              {tab === "DESCRIPTION" && (
                <>
                  <h4 className="mb-2 mt-6 font-sans text-base font-semibold text-text-primary">
                    Input format
                  </h4>
                  <p className="text-text-secondary">{problem.inputFormat}</p>
                  <h4 className="mb-2 mt-6 font-sans text-base font-semibold text-text-primary">
                    Output format
                  </h4>
                  <p className="text-text-secondary">{problem.outputFormat}</p>
                </>
              )}

              <h4 className="mb-3 mt-6 font-sans text-base font-semibold text-text-primary">
                Examples
              </h4>
              <div className="flex flex-col gap-4">
                {problem.examples.map((ex, i) => (
                  <div key={i} className="border border-border-default bg-bg-inset">
                    <div className="flex items-center justify-between border-b border-border-hairline px-3 py-2">
                      <span className="font-label text-[16px] uppercase tracking-[0.04em] text-text-muted">
                        Example {i + 1}
                      </span>
                      <button
                        aria-label="Copy input"
                        className="text-text-muted hover:text-text-primary"
                        onClick={() => navigator.clipboard?.writeText(ex.input)}
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 p-3 font-mono text-[13px]">
                      <div>
                        <span className="text-text-muted">Input: </span>
                        <span className={cn("text-text-primary", valueClass(ex.input))}>{ex.input}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Output: </span>
                        <span className={cn("text-text-primary", valueClass(ex.output))}>{ex.output}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">Explanation: </span>
                        <span className="text-text-secondary">{ex.explanation}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {((tab === "DESCRIPTION" && problem.constraints.length > 0) || tab === "CONSTRAINTS") && (
            <>
              <h4 className="mb-3 mt-6 font-sans text-base font-semibold text-text-primary">
                Constraints
              </h4>
              {problem.constraints.length === 0 ? (
                <p className="font-body text-sm text-text-muted">No extra constraints for this problem.</p>
              ) : (
                <ul className="flex flex-col gap-1.5 font-mono text-[13px] text-text-secondary">
                  {problem.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
            </>
          )}

          {tab === "HINTS" && (
            <div className="flex flex-col gap-3">
              {problem.hints.map((h, i) => (
                <div key={i} className="border border-border-default bg-bg-inset p-3">
                  {isRevealed(i) ? (
                    <p className="font-body text-sm text-text-secondary">{h}</p>
                  ) : (
                    <button
                      onClick={() =>
                        setRevealed((r) => { const next = [...r]; next[i] = true; return next; })
                      }
                      className="font-body text-sm text-text-secondary hover:text-text-primary"
                    >
                      Reveal hint {i + 1}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
