"""Upsert the problem set and compute every expected output from the reference solutions."""

from __future__ import annotations

import random
import zlib
from typing import Any

import asyncpg

from ..judge.protocol import (
    display_input,
    display_value,
    encode_case,
    encode_output,
    validate_signature,
)
from .problems import PROBLEMS, ProblemSeed


def _as_args(raw: Any) -> list[Any]:
    return list(raw) if isinstance(raw, tuple) else [raw]


def build_problem(p: ProblemSeed) -> tuple[dict, list[dict]]:
    """Return (problem row, test rows) for one seed, with reference-derived expectations."""
    validate_signature(p.signature)
    returns = p.signature["returns"]
    rng = random.Random(zlib.crc32(p.slug.encode()))  # stable across runs

    tests: list[dict] = []
    examples: list[dict] = []
    for i, (raw, explanation) in enumerate(p.samples):
        args = _as_args(raw)
        out = p.ref(*[a[:] if isinstance(a, list) else a for a in args])
        tests.append(
            {
                "stdin": encode_case(p.signature, args),
                "expected": encode_output(returns, out),
                "is_sample": True,
                "display_input": display_input(p.signature, args),
                "display_expected": display_value(returns, out),
            }
        )
        if i < p.examples_count:
            examples.append(
                {
                    "input": display_input(p.signature, args),
                    "output": display_value(returns, out),
                    "explanation": explanation,
                }
            )

    for args in p.hidden(rng):
        out = p.ref(*[a[:] if isinstance(a, list) else a for a in args])
        tests.append(
            {
                "stdin": encode_case(p.signature, args),
                "expected": encode_output(returns, out),
                "is_sample": False,
                "display_input": None,
                "display_expected": None,
            }
        )

    row = {
        "round_no": p.round_no,
        "slug": p.slug,
        "title": p.title,
        "difficulty": p.difficulty,
        "tags": p.tags,
        "description": p.description,
        "input_format": p.input_format,
        "output_format": p.output_format,
        "examples": examples,
        "constraints": p.constraints,
        "hints": p.hints,
        "signature": p.signature,
        "mode": "function",
        "time_limit_ms": p.time_limit_ms,
    }
    return row, tests


async def seed_rows(
    conn: asyncpg.Connection, built: list[tuple[dict, list[dict]]], rounds: int | None = None
) -> list[tuple[int, str, int]]:
    """Make `built` the event's problem set: upsert by round, replace tests, drop extras, set the round count.

    Refuses once anyone has played: round attempts reference problems.
    """
    played = await conn.fetchval("SELECT count(*) FROM public.participations")
    if played:
        raise RuntimeError(f"{played} participant(s) exist. Reset the event first, then re-seed.")

    report: list[tuple[int, str, int]] = []
    async with conn.transaction():
        for row, tests in built:
            problem_id = await conn.fetchval(
                """
                INSERT INTO public.problems
                    (round_no, slug, title, difficulty, tags, description, input_format, output_format,
                     examples, constraints, hints, signature, mode, time_limit_ms)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
                ON CONFLICT (round_no) DO UPDATE SET
                    slug = EXCLUDED.slug, title = EXCLUDED.title, difficulty = EXCLUDED.difficulty,
                    tags = EXCLUDED.tags, description = EXCLUDED.description,
                    input_format = EXCLUDED.input_format, output_format = EXCLUDED.output_format,
                    examples = EXCLUDED.examples, constraints = EXCLUDED.constraints, hints = EXCLUDED.hints,
                    signature = EXCLUDED.signature, mode = EXCLUDED.mode, time_limit_ms = EXCLUDED.time_limit_ms,
                    is_active = TRUE
                RETURNING id
                """,
                row["round_no"], row["slug"], row["title"], row["difficulty"], row["tags"],
                row["description"], row["input_format"], row["output_format"], row["examples"],
                row["constraints"], row["hints"], row["signature"], row["mode"], row["time_limit_ms"],
            )
            await conn.execute("DELETE FROM public.problem_tests WHERE problem_id = $1", problem_id)
            await conn.executemany(
                """
                INSERT INTO public.problem_tests
                    (problem_id, ord, stdin, expected, is_sample, display_input, display_expected)
                VALUES ($1,$2,$3,$4,$5,$6,$7)
                """,
                [
                    (problem_id, i, t["stdin"], t["expected"], t["is_sample"], t["display_input"], t["display_expected"])
                    for i, t in enumerate(tests)
                ],
            )
            report.append((row["round_no"], row["slug"], len(tests)))

        kept = [row["round_no"] for row, _ in built]
        # Problems from a previous set that are not part of this one.
        await conn.execute("DELETE FROM public.problems WHERE NOT (round_no = ANY($1::int[]))", kept)
        if rounds is not None:
            if not 0 < rounds <= len(built):
                raise ValueError(f"rounds must be between 1 and {len(built)} (the number of questions)")
            await conn.execute("UPDATE public.event_config SET total_rounds = $1, updated_at = now()", rounds)
        else:  # never ask for more rounds than there are questions
            await conn.execute(
                "UPDATE public.event_config SET total_rounds = LEAST(total_rounds, $1), updated_at = now()", len(built)
            )
    return report


async def seed_problems(conn: asyncpg.Connection) -> list[tuple[int, str, int]]:
    """Seed the built-in function-style demo set (used by the automated tests)."""
    return await seed_rows(conn, [build_problem(p) for p in PROBLEMS], rounds=len(PROBLEMS))
