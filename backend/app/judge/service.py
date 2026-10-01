"""Judge a piece of player code against a list of test cases."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

from ..config import get_settings
from .evaluate import CaseOutcome, Evaluation, evaluate, evaluate_io_case
from .harness import build_source
from .judge0 import Judge0Client
from .protocol import Signature, encode_input


@dataclass(frozen=True)
class JudgeCase:
    stdin: str
    expected: str


@dataclass(frozen=True)
class JudgeLanguage:
    id: str
    judge0_id: int
    filename: str
    time_multiplier: float


async def judge(
    client: Judge0Client,
    *,
    language: JudgeLanguage,
    signature: Signature,
    time_limit_ms: int,
    memory_limit_kb: int,
    cases: list[JudgeCase],
    code: str,
) -> Evaluation:
    settings = get_settings()
    built = build_source(language.id, signature, code)

    # The whole batch shares one process, so the CPU budget scales with the case count, but only up to
    # a few cases' worth: a runaway loop must not hold a judge worker for the full ceiling.
    per_case_s = time_limit_ms / 1000 * float(language.time_multiplier)
    cpu_limit = min(settings.judge0_max_cpu_s, max(2.0, per_case_s * min(len(cases), 4)))
    memory = min(settings.judge0_memory_kb, memory_limit_kb * (2 if language.id == "java" else 1))

    run = await client.execute(
        language_id=language.judge0_id,
        source=built.source,
        stdin=encode_input([c.stdin for c in cases]),
        cpu_time_limit_s=cpu_limit,
        memory_limit_kb=memory,
    )
    return evaluate(
        language=language.id,
        returns=signature["returns"],
        expected=[c.expected for c in cases],
        run=run,
        built=built,
        user_code=code,
        filename=language.filename,
    )


async def judge_io(
    client: Judge0Client,
    *,
    language: JudgeLanguage,
    time_limit_ms: int,
    memory_limit_kb: int,
    cases: list[JudgeCase],
    code: str,
) -> Evaluation:
    """Whole-program problems: run the player's program once per test case, compare stdout."""
    settings = get_settings()
    cpu_limit = min(settings.judge0_max_cpu_s, max(2.0, time_limit_ms / 1000 * float(language.time_multiplier)))
    memory = min(settings.judge0_memory_kb, memory_limit_kb * (2 if language.id == "java" else 1))

    runs = await asyncio.gather(
        *[
            client.execute(
                language_id=language.judge0_id,
                source=code,
                stdin=case.stdin,
                cpu_time_limit_s=cpu_limit,
                memory_limit_kb=memory,
            )
            for case in cases
        ]
    )
    outcomes: list[CaseOutcome] = []
    time_ms = 0
    memory_kb = 0
    for i, (case, run) in enumerate(zip(cases, runs)):
        outcome, compile_info = evaluate_io_case(
            index=i, expected=case.expected, run=run, language=language.id, user_code=code, filename=language.filename
        )
        if compile_info:  # the same source failed to build; report once
            return Evaluation(compile=compile_info, cases=[CaseOutcome(j, "not_run") for j in range(len(cases))])
        outcomes.append(outcome)
        time_ms = max(time_ms, run.time_ms or 0)
        memory_kb = max(memory_kb, run.memory_kb or 0)
    return Evaluation(cases=outcomes, time_ms=time_ms or None, memory_kb=memory_kb or None)
