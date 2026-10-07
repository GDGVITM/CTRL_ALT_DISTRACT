"""Per-user guard: one judge request at a time, with paced starts.

Short cooldowns wait inside the request instead of rejecting normal Run -> Submit flows.

State is per process. With several workers a user could slip one extra call through, which the
database-level round locking tolerates; the guard exists to protect the judge, not scoring.
"""

from __future__ import annotations

import asyncio
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
        # Reserve the user before waiting so repeated clicks cannot queue judge jobs.
        self._inflight.add(user_id)
        try:
            last = self._last.get(user_id)
            if last is not None:
                wait = last + min_interval_s - time.monotonic()
                if wait > 0:
                    await asyncio.sleep(wait)
            self._last[user_id] = time.monotonic()
            yield
        finally:
            self._inflight.discard(user_id)
            if len(self._last) > 50_000:  # bound memory on long-running processes
                cutoff = time.monotonic() - 60
                self._last = {k: v for k, v in self._last.items() if v > cutoff}


gate = JudgeGate()
