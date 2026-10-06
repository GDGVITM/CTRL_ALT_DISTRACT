"""Live end-to-end check of the harnesses against a real Judge0 (no database needed).

    python -m tests.live_judge_check            # all solutions x all languages
    python -m tests.live_judge_check negatives  # failure-mode behaviour only
"""

from __future__ import annotations

import asyncio
import sys
import time

from app.judge.judge0 import Judge0Client
from app.judge.service import JudgeCase, JudgeLanguage, judge
from app.seed.loader import build_problem
from app.seed.problems import PROBLEMS

from .solutions import SOLUTIONS

LANGS = {
    "python": JudgeLanguage("python", 71, "solution.py", 3),
    "cpp": JudgeLanguage("cpp", 54, "solution.cpp", 1),
    "c": JudgeLanguage("c", 50, "solution.c", 1),
    "java": JudgeLanguage("java", 62, "Solution.java", 2),
}
BY_SLUG = {p.slug: p for p in PROBLEMS}


def _cases(slug: str, samples_only: bool = False) -> tuple[dict, list[JudgeCase]]:
    row, tests = build_problem(BY_SLUG[slug])
    tests = [t for t in tests if t["is_sample"]] if samples_only else tests
    return row, [JudgeCase(t["stdin"], t["expected"]) for t in tests]


async def positives(client: Judge0Client) -> int:
    failures = 0
    jobs = []
    for slug, per_lang in SOLUTIONS.items():
        row, cases = _cases(slug)
        for lang, code in per_lang.items():
            jobs.append((slug, lang, row, cases, code))

    async def one(slug, lang, row, cases, code):
        t = time.monotonic()
        ev = await judge(
            client, language=LANGS[lang], signature=row["signature"], time_limit_ms=row["time_limit_ms"],
            memory_limit_kb=262144, cases=cases, code=code,
        )
        return slug, lang, ev, time.monotonic() - t

    for slug, lang, ev, secs in await asyncio.gather(*[one(*j) for j in jobs]):
        ok = ev.all_passed
        failures += 0 if ok else 1
        extra = "" if ok else f"  <-- {ev.headline()} compile={ev.compile} first_bad={next((c for c in ev.cases if c.status != 'pass'), None)}"
        print(f"{'PASS' if ok else 'FAIL'} {slug:<26} {lang:<7} {ev.passed}/{ev.total}  {secs:5.1f}s  cpu={ev.time_ms}ms mem={ev.memory_kb}KB{extra}")
    return failures


NEGATIVES = {
    "wrong answer (py)": ("python", "second-largest-element", "class Solution:\n    def secondLargest(self, nums):\n        return -999\n", "WRONG ANSWER"),
    "runtime error (py)": ("python", "find-missing-number", "class Solution:\n    def missingNumber(self, nums):\n        return 1 // 0\n", "RUNTIME ERROR"),
    "syntax error (py)": ("python", "find-missing-number", "class Solution:\n    def missingNumber(self, nums)\n        return 1\n", "COMPILATION ERROR"),
    "tle (py)": ("python", "find-missing-number", "class Solution:\n    def missingNumber(self, nums):\n        while True:\n            pass\n", "TIME LIMIT EXCEEDED"),
    "stray prints (py)": ("python", "find-missing-number", "class Solution:\n    def missingNumber(self, nums):\n        print('debug', len(nums))\n        n = len(nums)\n        return n * (n + 1) // 2 - sum(nums)\n", "ACCEPTED"),
    "compile error (cpp)": ("cpp", "find-missing-number", "class Solution {\npublic:\n    int missingNumber(vector<int>& nums) {\n        return n\n    }\n};\n", "COMPILATION ERROR"),
    "compile error (c)": ("c", "find-missing-number", "int missingNumber(int* nums, int numsSize) {\n    return undefined_symbol;\n}\n", "COMPILATION ERROR"),
    "compile error (java)": ("java", "find-missing-number", "class Solution {\n    public int missingNumber(int[] nums) {\n        return \"x\";\n    }\n}\n", "COMPILATION ERROR"),
    "public class (java)": ("java", "find-missing-number", "public class Solution {\n    public int missingNumber(int[] nums) {\n        return -1;\n    }\n}\n", "WRONG ANSWER"),
    "exception (java)": ("java", "find-missing-number", "class Solution {\n    public int missingNumber(int[] nums) {\n        int[] a = new int[1];\n        return a[5];\n    }\n}\n", "RUNTIME ERROR"),
    "segfault (c)": ("c", "find-missing-number", "int missingNumber(int* nums, int numsSize) {\n    int* p = 0;\n    return *p;\n}\n", "RUNTIME ERROR"),
    "tle (cpp)": ("cpp", "find-missing-number", "class Solution {\npublic:\n    int missingNumber(vector<int>& nums) {\n        while (true) {}\n        return 0;\n    }\n};\n", "TIME LIMIT EXCEEDED"),
}


async def negatives(client: Judge0Client) -> int:
    failures = 0

    async def one(name, lang, slug, code, want):
        row, cases = _cases(slug, samples_only=False)
        ev = await judge(
            client, language=LANGS[lang], signature=row["signature"], time_limit_ms=row["time_limit_ms"],
            memory_limit_kb=262144, cases=cases, code=code,
        )
        return name, want, ev

    for name, want, ev in await asyncio.gather(*[one(n, *v) for n, v in NEGATIVES.items()]):
        ok = ev.headline() == want
        failures += 0 if ok else 1
        print(f"{'PASS' if ok else 'FAIL'} {name:<22} -> {ev.headline():<20} {ev.passed}/{ev.total}")
        if ev.compile:
            print(f"       compile line={ev.compile.line} file={ev.compile.file}\n       " + ev.compile.message.replace("\n", "\n       ")[:400])
        bad = next((c for c in ev.cases if c.status not in ("pass", "not_run")), None)
        if bad and not ev.compile:
            print(f"       first non-pass: {bad}")
    return failures


async def main() -> int:
    client = Judge0Client()
    try:
        mode = sys.argv[1] if len(sys.argv) > 1 else "all"
        failures = 0
        if mode in ("all", "positives"):
            failures += await positives(client)
        if mode in ("all", "negatives"):
            failures += await negatives(client)
        print("\nfailures:", failures)
        return 1 if failures else 0
    finally:
        await client.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
