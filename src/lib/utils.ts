export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function padScore(n: number, digits = 4) {
  const s = Math.abs(n).toString();
  return s.length >= digits ? s : "0".repeat(digits - s.length) + s;
}

export function formatMMSS(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

/** Tailwind classes for a difficulty chip. */
export function difficultyClasses(difficulty: string) {
  if (difficulty === "EASY") return "bg-fill-success text-success";
  if (difficulty === "HARD") return "bg-fill-danger text-danger";
  return "bg-fill-warning text-warning";
}

/** Multi-line sample values (whole-program problems) go on their own lines, preserving breaks. */
export function valueClass(value: string | null | undefined) {
  return value && value.includes("\n") ? "mt-1 block whitespace-pre-wrap" : "";
}
