"""Import the event's question set from the organisers' "Coding Solutions" PDF.

The PDF holds, per question: the statement, one worked example, reference solutions in several
languages, and three hidden test cases. It is read at seed time and is NOT stored in the repository,
so neither the hidden tests nor the solutions are ever committed.

For extra safety the PDF's own Python solution is executed against every case in the PDF (example +
hidden) and must reproduce the expected output exactly; this catches parse errors and PDF typos
before anything reaches the database. It is then used as the oracle for a few additional generated
tests per question (kept inside the domain the statement clearly specifies).
"""

from __future__ import annotations

import random
import re
import string
import subprocess
import sys
import zlib
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from ..judge.protocol import io_outputs_equal, normalize_output

LANG_HEADINGS = {"C": "c", "C++": "cpp", "Java": "java", "Python": "python", "Go": "go", "JavaScript": "javascript"}


@dataclass
class ParsedQuestion:
    number: int
    title: str
    statement: str
    example_input: str
    example_output: str
    explanation: str
    technique: str
    solutions: dict[str, str] = field(default_factory=dict)
    hidden: list[tuple[str, str]] = field(default_factory=list)


# --------------------------------------------------------------------------- parsing


def _trim_blank(lines: list[str]) -> list[str]:
    while lines and not lines[0].strip():
        lines = lines[1:]
    while lines and not lines[-1].strip():
        lines = lines[:-1]
    return lines


def _block(lines: list[str]) -> str:
    return "\n".join(ln.rstrip() for ln in _trim_blank(lines))


def parse_questions(pdf_path: str | Path) -> list[ParsedQuestion]:
    from pypdf import PdfReader  # imported lazily: only needed when seeding from a PDF

    text = "\n".join((page.extract_text() or "") for page in PdfReader(str(pdf_path)).pages)
    chunks = re.split(r"(?m)^(?=Q\d+\. )", text)
    questions: list[ParsedQuestion] = []
    for chunk in chunks:
        lines = chunk.splitlines()
        head = re.match(r"Q(\d+)\.\s*(.+?)\s*$", lines[0]) if lines else None
        if not head:
            continue
        number, title = int(head.group(1)), head.group(2)

        def index_of(prefix: str, start: int = 0) -> int:
            for i in range(start, len(lines)):
                if lines[i].strip().startswith(prefix):
                    return i
            raise ValueError(f"Q{number}: missing '{prefix}'")

        ex = index_of("Example")
        in_i = index_of("Input:", ex)
        out_i = index_of("Output:", in_i)
        exp_i = index_of("Short explanation:", out_i)
        tech_i = index_of("Technique Applied:", exp_i)

        statement = " ".join(ln.strip() for ln in _trim_blank(lines[1:ex]))
        explanation = " ".join(
            [lines[exp_i].split(":", 1)[1].strip(), *[ln.strip() for ln in lines[exp_i + 1 : tech_i]]]
        ).strip()
        q = ParsedQuestion(
            number=number,
            title=title,
            statement=statement,
            example_input=_block(lines[in_i + 1 : out_i]),
            example_output=_block(lines[out_i + 1 : exp_i]),
            explanation=explanation,
            technique=lines[tech_i].split(":", 1)[1].strip(),
        )

        # Reference solutions, then hidden test cases.
        lang: str | None = None
        code: list[str] = []
        hidden_start: int | None = None

        def flush():
            if lang:
                q.solutions[lang] = "\n".join(ln.rstrip() for ln in _trim_blank(code)) + "\n"

        for i in range(tech_i + 1, len(lines)):
            stripped = lines[i].strip()
            if stripped == "Hidden Test Cases":
                flush()
                lang = None
                hidden_start = i + 1
                break
            if stripped in LANG_HEADINGS and not lines[i].startswith((" ", "\t")):
                flush()
                lang, code = LANG_HEADINGS[stripped], []
            elif lang:
                code.append(lines[i])
        else:
            flush()

        if hidden_start is not None:
            current: dict[str, list[str]] | None = None
            mode = ""
            cases: list[dict[str, list[str]]] = []
            for ln in lines[hidden_start:]:
                s = ln.strip()
                if re.fullmatch(r"Hidden Test Case \d+", s):
                    current = {"in": [], "out": []}
                    cases.append(current)
                    mode = ""
                elif s == "Input:":
                    mode = "in"
                elif s == "Expected Output:":
                    mode = "out"
                elif current is not None and mode:
                    current[mode].append(ln)
            q.hidden = [(_block(c["in"]), _block(c["out"])) for c in cases]
        questions.append(q)

    if not questions:
        raise ValueError("No questions found in the PDF (expected headings like 'Q1. Title').")
    return sorted(questions, key=lambda q: q.number)


# --------------------------------------------------------------------------- reference oracle


def run_python(code: str, stdin: str, timeout: float = 10.0) -> str:
    proc = subprocess.run(
        [sys.executable, "-c", code], input=stdin if stdin.endswith("\n") else stdin + "\n",
        capture_output=True, text=True, timeout=timeout,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"reference solution crashed: {proc.stderr.strip()[-300:]}")
    return proc.stdout


# --------------------------------------------------------------------------- hand-written metadata
# Difficulty and the input/output descriptions are not in the PDF; they are derived from the
# statements and examples. Edit here to relabel.

META: dict[int, tuple[str, str, str]] = {
    1: ("EASY", "A single integer on one line.", "Three lines: Odd Sum, Even Sum and Winner (ODD, EVEN or TIE)."),
    2: ("EASY", "N, then N integers on the next line.", "The most frequent value and its count, separated by a space."),
    3: ("EASY", "A single string with no spaces.", "Four lines: Uppercase, Lowercase, Digits and Special counts."),
    4: ("MEDIUM", "N, then N integers, then K.", "The rotated array, space separated."),
    5: ("MEDIUM", "N, then N integers on the next line.", "A single integer: second smallest + second largest distinct values."),
    6: ("EASY", "N, then the N-1 numbers that are present.", "The missing number."),
    7: ("EASY", "The current signal (RED, GREEN or YELLOW), then the number of transitions.", "The signal after those transitions."),
    8: ("EASY", "N, then N integers on the next line.", "A single integer: the longest strictly increasing run."),
    9: ("MEDIUM", "N, then N integers, then the target K.", "A single integer: the number of unique pairs summing to K."),
    10: ("MEDIUM", "N, then N scores on the next line.", "The rank of each player, space separated."),
    11: ("MEDIUM", "A single string.", "A single integer: the length of the longest substring without repeats."),
    12: ("EASY", "N, then N integers on the next line.", "YES if the array is a mountain, otherwise NO."),
    13: ("EASY", "R and C, then R rows of C integers.", "A single integer: the sum of the border elements."),
    14: ("EASY", "A single password string.", "VALID, SPECIAL or INVALID."),
    15: ("EASY", "N, then N integers on the next line.", "A single integer: the difference between the two sums."),
}


# --------------------------------------------------------------------------- extra test generators
# Inputs stay inside what each statement clearly defines (no empty arrays, no ambiguous ties, ...).


def _nums(r: random.Random, n: int, lo: int, hi: int) -> list[int]:
    return [r.randint(lo, hi) for _ in range(n)]


def _line(values) -> str:
    return " ".join(str(v) for v in values)


def _g1(r):
    return str(r.randint(1, 9)) + "".join(str(r.randint(0, 9)) for _ in range(r.randint(0, 11)))


def _g2(r):
    n = r.randint(1, 15)
    return f"{n}\n{_line(_nums(r, n, 1, 6))}"


def _g3(r):
    pool = string.ascii_letters + string.digits + "!@#$%^&*()-_=+[]{};:,.<>/?"
    return "".join(r.choice(pool) for _ in range(r.randint(1, 20)))


def _g4(r):
    n = r.randint(2, 12)
    return f"{n}\n{_line(_nums(r, n, 1, 50))}\n{r.randint(1, n - 1)}"


def _g5(r):
    while True:
        n = r.randint(3, 12)
        a = _nums(r, n, 1, 30)
        if len(set(a)) >= 3:
            return f"{n}\n{_line(a)}"


def _g6(r):
    n = r.randint(2, 20)
    present = list(range(1, n + 1))
    present.remove(r.randint(1, n))
    r.shuffle(present)
    return f"{n}\n{_line(present)}"


def _g7(r):
    return f"{r.choice(['RED', 'GREEN', 'YELLOW'])}\n{r.randint(1, 30)}"


def _g8(r):
    n = r.randint(1, 15)
    return f"{n}\n{_line(_nums(r, n, 1, 10))}"


def _g9(r):
    n = r.randint(2, 12)
    return f"{n}\n{_line(_nums(r, n, -5, 9))}\n{r.randint(0, 10)}"


def _g10(r):
    n = r.randint(1, 10)
    return f"{n}\n{_line(sorted(_nums(r, n, 10, 100), reverse=True))}"


def _g11(r):
    return "".join(r.choice(string.ascii_lowercase[: r.randint(2, 8)]) for _ in range(r.randint(1, 20)))


def _g12(r):
    n = r.randint(3, 10)
    peak = r.randint(1, n - 2)
    vals = sorted(r.sample(range(1, 60), n), reverse=True)
    top, rest = vals[0], vals[1:]
    r.shuffle(rest)
    arr = sorted(rest[:peak]) + [top] + sorted(rest[peak:], reverse=True)
    if r.random() < 0.5:  # a plateau makes it "not strictly" increasing/decreasing
        i = r.randint(1, n - 1)
        arr[i] = arr[i - 1]
    return f"{n}\n{_line(arr)}"


def _g13(r):
    rows, cols = r.randint(2, 5), r.randint(2, 5)
    grid = "\n".join(_line(_nums(r, cols, 1, 20)) for _ in range(rows))
    return f"{rows} {cols}\n{grid}"


def _g14(r):
    pools = [string.ascii_uppercase, string.ascii_lowercase, string.digits, "!@#$%^&*"]
    chosen = [c for c in pools if r.random() < 0.8] or [string.ascii_lowercase]
    return "".join(r.choice(r.choice(chosen)) for _ in range(r.randint(4, 12)))


def _g15(r):
    n = r.randint(1, 10)
    return f"{n}\n{_line(_nums(r, n, 1, 20))}"


GENERATORS: dict[int, Callable[[random.Random], str]] = {
    1: _g1, 2: _g2, 3: _g3, 4: _g4, 5: _g5, 6: _g6, 7: _g7, 8: _g8,
    9: _g9, 10: _g10, 11: _g11, 12: _g12, 13: _g13, 14: _g14, 15: _g15,
}
EXTRA_TESTS = 4


# --------------------------------------------------------------------------- oracles


def _competition_rank(stdin: str) -> str:
    """Q10: "1224" ranking. The PDF's Python/C++/Java solutions compute dense ranks (1223), which
    contradicts both its statement and its expected outputs; its C solution is correct."""
    tokens = stdin.split()
    n = int(tokens[0])
    scores = [int(t) for t in tokens[1 : 1 + n]]
    return " ".join(str(1 + sum(1 for other in scores if other > x)) for x in scores)


ORACLE_OVERRIDES: dict[int, Callable[[str], str]] = {10: _competition_rank}


def oracle_output(q: ParsedQuestion, stdin: str) -> str:
    override = ORACLE_OVERRIDES.get(q.number)
    return override(stdin) if override else run_python(q.solutions["python"], stdin)


def to_stdin(given: str) -> str:
    """Test input as fed to the program. A trailing blank line keeps `input()`-style programs from
    hitting EOF when an array is empty (e.g. N=1 with nothing listed)."""
    return given.rstrip("\n") + "\n\n"


# --------------------------------------------------------------------------- build rows


def build_rows(
    questions: list[ParsedQuestion], *, trust_oracle: bool = False
) -> tuple[list[tuple[dict, list[dict]]], list[str]]:
    """(problem row, test rows) per question, plus a human-readable list of corrections applied.

    Every PDF case (example + hidden) is run through the oracle. A disagreement means the PDF
    contradicts itself, so by default the import refuses; with ``trust_oracle`` the oracle's output
    (which matches the statement and the worked example) replaces the PDF's expectation.
    """
    out: list[tuple[dict, list[dict]]] = []
    notes: list[str] = []
    problems: list[str] = []
    for q in questions:
        if "python" not in q.solutions:
            raise ValueError(f"Q{q.number}: no Python reference solution in the PDF")
        if not q.hidden:
            raise ValueError(f"Q{q.number}: no hidden test cases in the PDF")

        # 1) The PDF must agree with itself; disagreements are recorded, never ignored.
        pdf_cases: list[tuple[str, str]] = []
        for label, given, expected in [("example", q.example_input, q.example_output)] + [
            (f"hidden {i + 1}", a, b) for i, (a, b) in enumerate(q.hidden)
        ]:
            got = normalize_output(oracle_output(q, to_stdin(given)))
            if not io_outputs_equal(expected, got):
                msg = f"Q{q.number} {q.title} [{label}] input={given!r}: PDF expects {normalize_output(expected)!r}, statement-consistent answer is {got!r}"
                problems.append(msg)
                notes.append(msg)
                expected = got
            pdf_cases.append((given, expected))

        # 2) Extra generated cases, expected output taken from the oracle.
        rng = random.Random(zlib.crc32(f"q{q.number}".encode()))
        seen = {given for given, _ in pdf_cases}
        extra: list[tuple[str, str]] = []
        gen = GENERATORS[q.number]
        attempts = 0
        while len(extra) < EXTRA_TESTS and attempts < 200:
            attempts += 1
            given = gen(rng)
            if given in seen:
                continue
            seen.add(given)
            extra.append((given, normalize_output(oracle_output(q, to_stdin(given)))))

        tests = []
        for ordinal, (given, expected) in enumerate([*pdf_cases, *extra]):
            tests.append(
                {
                    "stdin": to_stdin(given),
                    "expected": normalize_output(expected),
                    "is_sample": ordinal == 0,
                    "display_input": given if ordinal == 0 else None,
                    "display_expected": normalize_output(expected) if ordinal == 0 else None,
                }
            )

        difficulty, input_format, output_format = META[q.number]
        row = {
            "round_no": q.number,
            "slug": re.sub(r"[^a-z0-9]+", "-", q.title.lower()).strip("-"),
            "title": q.title,
            "difficulty": difficulty,
            "tags": [t.strip() for t in re.split(r"\s*/\s*|\s*\+\s*", q.technique) if t.strip()],
            "description": [q.statement],
            "input_format": input_format,
            "output_format": output_format,
            "examples": [{"input": q.example_input, "output": q.example_output, "explanation": q.explanation}],
            "constraints": [],
            "hints": [f"Technique: {q.technique}."],
            "signature": None,
            "mode": "io",
            "time_limit_ms": 2000,
        }
        out.append((row, tests))

    if problems and not trust_oracle:
        raise ValueError(
            "The PDF contradicts its own statements/solutions in {} place(s):\n  - {}\n"
            "Fix the PDF, or re-run with --trust-oracle to use the statement-consistent answers.".format(
                len(problems), "\n  - ".join(problems)
            )
        )
    return out, notes
