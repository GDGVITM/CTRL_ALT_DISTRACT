"""Run the PDF's own reference solutions (C, C++, Java, Python) on a real Judge0 against the PDF's cases.

    python -m tests.live_io_check "<path to CTRL_ALT_ONE_All_15_Solutions.pdf>" [--seeded]

Without --seeded it compares each solution with the PDF's expected outputs (finds PDF defects).
With --seeded it uses the test cases stored in the database instead (validates the full pipeline).
"""

from __future__ import annotations

import asyncio
import sys

from app.judge.judge0 import Judge0Client
from app.judge.protocol import io_outputs_equal, normalize_output
from app.judge.service import JudgeCase, JudgeLanguage, judge_io
from app.seed.pdf_import import parse_questions

LANGS = {
    "python": JudgeLanguage("python", 71, "solution.py", 3),
    "cpp": JudgeLanguage("cpp", 54, "solution.cpp", 1),
    "c": JudgeLanguage("c", 50, "solution.c", 1),
    "java": JudgeLanguage("java", 62, "Solution.java", 2),
}


async def main(pdf: str, seeded: bool) -> int:
    questions = parse_questions(pdf)
    client = Judge0Client()
    db = None
    stored: dict[int, list[tuple[str, str]]] = {}
    if seeded:
        from app.db import db as database

        db = database
        await db.connect()
        async with db.acquire() as conn:
            rows = await conn.fetch(
                "SELECT p.round_no, t.stdin, t.expected FROM public.problem_tests t "
                "JOIN public.problems p ON p.id = t.problem_id ORDER BY p.round_no, t.ord"
            )
        for r in rows:
            stored.setdefault(r["round_no"], []).append((r["stdin"], r["expected"]))

    async def check(q, lang):
        if seeded:
            cases = stored[q.number]
        else:
            cases = [(q.example_input.rstrip("\n") + "\n\n", q.example_output)] + [
                (a.rstrip("\n") + "\n\n", b) for a, b in q.hidden
            ]
        ev = await judge_io(
            client, language=LANGS[lang], time_limit_ms=2000, memory_limit_kb=262144,
            cases=[JudgeCase(i, o) for i, o in cases], code=q.solutions[lang],
        )
        return q, lang, cases, ev

    sem = asyncio.Semaphore(3)

    async def guarded(q, lang):
        async with sem:
            return await check(q, lang)

    bad = 0
    try:
        results = await asyncio.gather(*[guarded(q, lang) for q in questions for lang in LANGS])
        for q, lang, cases, ev in results:
            if ev.all_passed:
                continue
            bad += 1
            detail = ev.compile.message[:150] if ev.compile else [
                f"case{c.index}:{c.status} got={c.actual!r} want={normalize_output(cases[c.index][1])!r} {c.message or ''}"
                for c in ev.cases if c.status != "pass"
            ]
            print(f"Q{q.number:>2} {q.title:<26} {lang:<7} {ev.passed}/{ev.total}  {detail}")
        print(f"\n{len(results) - bad}/{len(results)} solutions pass every case")
    finally:
        await client.close()
        if db:
            await db.close()
    return 1 if bad else 0


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    sys.exit(asyncio.run(main(args[0], "--seeded" in sys.argv)))
