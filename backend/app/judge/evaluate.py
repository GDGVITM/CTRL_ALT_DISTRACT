"""Turn a raw Judge0 run into per-case verdicts and a cleaned-up compiler message."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .harness import BuiltSource
from .judge0 import (
    COMPILE_ERROR,
    EXEC_FORMAT_ERROR,
    INTERNAL_ERROR,
    RUNTIME_ERRORS,
    TIME_LIMIT,
    JudgeRun,
    judge_unavailable,
)
from .protocol import display_output_line, io_outputs_equal, normalize_output, outputs_equal

_MARKER = re.compile(r"@@CAD@@(\d+)@@(OK|ERR)@@([^\n]*)")
_PY_SYNTAX = re.compile(r"^\s*(?:SyntaxError|IndentationError|TabError)\b", re.MULTILINE)
_MAX_MESSAGE = 1800


@dataclass
class CompileInfo:
    message: str
    line: int | None
    file: str


@dataclass
class CaseOutcome:
    index: int
    status: str  # pass | fail | error | tle | not_run
    actual: str | None = None  # display form of the player's output
    message: str | None = None  # runtime error text


@dataclass
class Evaluation:
    compile: CompileInfo | None = None
    cases: list[CaseOutcome] = field(default_factory=list)
    time_ms: int | None = None
    memory_kb: int | None = None

    @property
    def passed(self) -> int:
        return sum(1 for c in self.cases if c.status == "pass")

    @property
    def total(self) -> int:
        return len(self.cases)

    @property
    def all_passed(self) -> bool:
        return self.compile is None and self.total > 0 and self.passed == self.total

    def headline(self) -> str:
        if self.compile:
            return "COMPILATION ERROR"
        first = next((c for c in self.cases if c.status != "pass"), None)
        return {
            None: "ACCEPTED",
            "fail": "WRONG ANSWER",
            "error": "RUNTIME ERROR",
            "tle": "TIME LIMIT EXCEEDED",
            "not_run": "RUNTIME ERROR",
        }[first.status if first else None]


def _compile_info(language: str, raw: str, built: BuiltSource, user_lines: int, filename: str) -> CompileInfo:
    text = raw.strip()[:_MAX_MESSAGE]
    line: int | None = None

    def clamp(n: int) -> int:
        return min(n, max(user_lines, 1))

    if language == "python":

        def py_remap(m: re.Match[str]) -> str:
            nonlocal line
            n = clamp(int(m.group(1)))
            line = n if line is None else line
            return f'File "{filename}", line {n}'

        text = re.sub(r'File "[^"]*\.py", line (\d+)', py_remap, text)
    else:

        def loc_remap(m: re.Match[str]) -> str:
            nonlocal line
            mapped = int(m.group(1)) - built.line_offset
            if mapped < 1:
                return filename
            mapped = clamp(mapped)
            line = mapped if line is None else line
            return f"{filename}:{mapped}"

        def gutter_remap(m: re.Match[str]) -> str:  # gcc prints "  6 |  code" under each diagnostic
            mapped = int(m.group(2)) - built.line_offset
            return f"{m.group(1)}{clamp(mapped) if mapped >= 1 else m.group(2)}{m.group(3)}"

        text = re.sub(r"(?:main\.(?:cpp|c)|Main\.java):(\d+)", loc_remap, text)
        text = re.sub(r"(?m)^(\s*)(\d+)( \|)", gutter_remap, text)
        text = re.sub(r"(?:main\.(?:cpp|c)|Main\.java)", filename, text)
    return CompileInfo(message=text, line=line, file=filename)


_CRASH_HINTS = (
    ("Segmentation fault", "Segmentation fault"),
    ("Floating point exception", "Floating point exception (division by zero?)"),
    ("Aborted", "Program aborted"),
    ("Killed", "Killed (out of memory or limits exceeded)"),
)


def _runtime_detail(run: JudgeRun) -> str:
    text = (run.stderr or run.message or "").strip()
    for needle, label in _CRASH_HINTS:
        if needle in text:
            return f"Runtime Error: {label}"
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    tail = lines[-1] if lines else ""
    return f"{run.status}: {tail}"[:300] if tail else run.status


def evaluate(
    *,
    language: str,
    returns: str,
    expected: list[str],
    run: JudgeRun,
    built: BuiltSource,
    user_code: str,
    filename: str,
) -> Evaluation:
    """Compare the per-case markers in stdout with `expected` (canonical output lines)."""
    if run.status_id in (INTERNAL_ERROR, EXEC_FORMAT_ERROR):
        raise judge_unavailable("The code judge hit an internal error. Please try again.")

    user_lines = user_code.count("\n") + 1
    markers = {int(m.group(1)): (m.group(2), m.group(3)) for m in _MARKER.finditer(run.stdout)}

    if run.status_id == COMPILE_ERROR:
        info = _compile_info(language, run.compile_output or run.message or run.stderr, built, user_lines, filename)
        return Evaluation(compile=info, cases=[CaseOutcome(i, "not_run") for i in range(len(expected))])

    # Python reports syntax errors at run time, before any case executes.
    if language == "python" and not markers and _PY_SYNTAX.search(run.stderr or ""):
        info = _compile_info(language, run.stderr, built, user_lines, filename)
        return Evaluation(compile=info, cases=[CaseOutcome(i, "not_run") for i in range(len(expected))])

    cases: list[CaseOutcome] = []
    interrupted = False
    for i, want in enumerate(expected):
        if i in markers:
            kind, payload = markers[i]
            if kind == "ERR":
                cases.append(CaseOutcome(i, "error", message=payload.strip()))
            elif outputs_equal(returns, want, payload):
                cases.append(CaseOutcome(i, "pass", actual=display_output_line(returns, payload)))
            else:
                cases.append(CaseOutcome(i, "fail", actual=display_output_line(returns, payload)))
            continue
        # No marker: the process stopped before this case (timeout / crash).
        if not interrupted:
            interrupted = True
            if run.status_id == TIME_LIMIT:
                cases.append(CaseOutcome(i, "tle", message="Time Limit Exceeded"))
            elif run.status_id in RUNTIME_ERRORS or run.status_id > TIME_LIMIT:
                cases.append(CaseOutcome(i, "error", message=_runtime_detail(run)))
            else:
                cases.append(CaseOutcome(i, "error", message="No output produced"))
        else:
            cases.append(CaseOutcome(i, "not_run"))

    return Evaluation(cases=cases, time_ms=run.time_ms, memory_kb=run.memory_kb)


_ACTUAL_MAX = 400


def evaluate_io_case(
    *, index: int, expected: str, run: JudgeRun, language: str, user_code: str, filename: str
) -> tuple[CaseOutcome, CompileInfo | None]:
    """Verdict for one run of a whole-program submission (one Judge0 run per test case)."""
    if run.status_id in (INTERNAL_ERROR, EXEC_FORMAT_ERROR):
        raise judge_unavailable("The code judge hit an internal error. Please try again.")

    no_prelude = BuiltSource("", 0)
    user_lines = user_code.count("\n") + 1
    if run.status_id == COMPILE_ERROR:
        info = _compile_info(language, run.compile_output or run.message or run.stderr, no_prelude, user_lines, filename)
        return CaseOutcome(index, "not_run"), info
    if language == "python" and not run.stdout and _PY_SYNTAX.search(run.stderr or ""):
        return CaseOutcome(index, "not_run"), _compile_info(language, run.stderr, no_prelude, user_lines, filename)

    if run.status_id == TIME_LIMIT:
        return CaseOutcome(index, "tle", message="Time Limit Exceeded"), None
    if run.status_id != 3:
        return CaseOutcome(index, "error", message=_runtime_detail(run)), None

    actual = normalize_output(run.stdout)
    shown = actual if len(actual) <= _ACTUAL_MAX else actual[:_ACTUAL_MAX] + "…"
    status = "pass" if io_outputs_equal(expected, run.stdout) else "fail"
    return CaseOutcome(index, status, actual=shown or "(no output)"), None
