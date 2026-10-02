"""Problems and their test cases, cached in memory (they only change when re-seeded)."""

from __future__ import annotations

import time
from dataclasses import dataclass

import asyncpg

from ..db import db
from ..errors import ApiError, bad_request
from ..judge.harness import SUPPORTED_LANGUAGES, starter_code, starter_code_io
from ..judge.service import JudgeCase, JudgeLanguage
from ..schemas import Example, ProblemPublic, SampleCase
from . import event as event_service
from .scoring import DIFFICULTY_POINTS

_TTL_S = 120.0


@dataclass(frozen=True)
class Problem:
    id: int
    round_no: int
    row: asyncpg.Record
    public: ProblemPublic

    @property
    def signature(self) -> dict | None:
        return self.row["signature"]

    @property
    def mode(self) -> str:
        return self.row["mode"]


_problems: tuple[float, dict[int, Problem]] | None = None
_tests: dict[int, tuple[float, list[asyncpg.Record]]] = {}


async def _load_problems() -> dict[int, Problem]:
    global _problems
    now = time.monotonic()
    if _problems and _problems[0] > now:
        return _problems[1]
    async with db.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM public.problems WHERE is_active ORDER BY round_no")
        sample_rows = await conn.fetch(
            "SELECT problem_id, display_input, display_expected FROM public.problem_tests WHERE is_sample ORDER BY problem_id, ord"
        )
    samples: dict[int, list[SampleCase]] = {}
    for sr in sample_rows:
        samples.setdefault(sr["problem_id"], []).append(
            SampleCase(input=sr["display_input"] or "", expected=sr["display_expected"] or "")
        )
    out: dict[int, Problem] = {}
    for r in rows:
        public = ProblemPublic(
            round=r["round_no"],
            title=r["title"],
            difficulty=r["difficulty"],
            points=DIFFICULTY_POINTS[r["difficulty"]],
            tags=r["tags"],
            description=r["description"],
            input_format=r["input_format"],
            output_format=r["output_format"],
            examples=[Example(**e) for e in r["examples"]],
            constraints=r["constraints"],
            hints=r["hints"],
            samples=samples.get(r["id"], []),
            starter_code={
                lang: starter_code_io(lang) if r["mode"] == "io" else starter_code(lang, r["signature"])
                for lang in SUPPORTED_LANGUAGES
            },
        )
        out[r["id"]] = Problem(id=r["id"], round_no=r["round_no"], row=r, public=public)
    _problems = (now + _TTL_S, out)
    return out


async def get_problem(problem_id: int) -> Problem:
    problems = await _load_problems()
    try:
        return problems[problem_id]
    except KeyError:
        raise ApiError(500, "problem_missing", f"Problem {problem_id} is not available") from None


async def pool_ids() -> list[int]:
    """Ids of every active question; each player is dealt a random subset of these."""
    return sorted(await _load_problems())


def public_for_round(problem: Problem, round_no: int) -> ProblemPublic:
    """The player-facing problem, numbered by the player's own round (not the pool position)."""
    return problem.public.model_copy(update={"round": round_no})


async def get_tests(problem_id: int, *, samples_only: bool) -> list[tuple[asyncpg.Record, JudgeCase]]:
    """Test rows plus their JudgeCase. Hidden-case data never leaves the server."""
    now = time.monotonic()
    cached = _tests.get(problem_id)
    if not cached or cached[0] <= now:
        async with db.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM public.problem_tests WHERE problem_id = $1 ORDER BY ord", problem_id)
        _tests[problem_id] = cached = (now + _TTL_S, rows)
    rows = [r for r in cached[1] if r["is_sample"]] if samples_only else cached[1]
    return [(r, JudgeCase(stdin=r["stdin"], expected=r["expected"])) for r in rows]


async def get_language(language_id: str) -> JudgeLanguage:
    for r in await event_service.get_languages():
        if r["id"] == language_id:
            return JudgeLanguage(
                id=r["id"], judge0_id=r["judge0_id"], filename=r["filename"], time_multiplier=float(r["time_multiplier"])
            )
    raise bad_request(f"Unsupported language '{language_id}'", "unsupported_language")
