"""Per-user guard for judge calls: one in flight at a time, and a minimum gap between calls.

State is per process. With several workers a user could slip one extra call through, which the
database-level round locking tolerates; the guard exists to protect the judge, not scoring.
"""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import AsyncIterator

from ..errors import ApiError


class JudgeGate:
    def __init__(self) -> None:
        self._inflight: set[str] = set()
        self._last: dict[str, float] = {}

    @asynccontextmanager
    async def guard(self, user_id: str, min_interval_s: float) -> AsyncIterator[None]:
        if user_id in self._inflight:
            raise ApiError(429, "judge_busy", "Your previous run is still being judged.")
        wait = self._last.get(user_id, 0.0) + min_interval_s - time.monotonic()
        if wait > 0:
            raise ApiError(429, "too_fast", f"Slow down — try again in {wait:.0f}s.")
        self._inflight.add(user_id)
        try:
            yield
        finally:
            self._inflight.discard(user_id)
            self._last[user_id] = time.monotonic()
            if len(self._last) > 50_000:  # bound memory on long-running processes
                cutoff = time.monotonic() - 60
                self._last = {k: v for k, v in self._last.items() if v > cutoff}


gate = JudgeGate()
