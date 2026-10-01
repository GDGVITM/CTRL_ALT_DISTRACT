"""Thin async client for the Judge0 REST API (CE, self-hosted or RapidAPI).

One submission per request: the harness runs every test case in a single process, so there is a
single compile + execute. We create the submission and poll its token with a short backoff.
"""

from __future__ import annotations

import asyncio
import base64
import time
from dataclasses import dataclass

import httpx

from ..config import get_settings
from ..errors import ApiError

# Judge0 status ids
ACCEPTED = 3
TIME_LIMIT = 5
COMPILE_ERROR = 6
RUNTIME_ERRORS = range(7, 13)  # SIGSEGV .. Other
INTERNAL_ERROR = 13
EXEC_FORMAT_ERROR = 14

_FIELDS = "token,status,stdout,stderr,compile_output,message,time,memory,exit_code"


@dataclass
class JudgeRun:
    status_id: int
    status: str
    stdout: str
    stderr: str
    compile_output: str
    message: str
    time_ms: int | None
    memory_kb: int | None


def judge_unavailable(reason: str = "The code judge is busy. Please try again in a moment.") -> ApiError:
    return ApiError(503, "judge_unavailable", reason)


def _b64(text: str) -> str:
    return base64.b64encode(text.encode()).decode()


def _unb64(value: str | None) -> str:
    if not value:
        return ""
    try:
        return base64.b64decode(value).decode(errors="replace")
    except ValueError:
        return value


class Judge0Client:
    def __init__(self) -> None:
        s = get_settings()
        headers = {"Content-Type": "application/json"}
        if s.judge0_api_key:
            headers[s.judge0_api_key_header] = s.judge0_api_key
        if s.judge0_api_host:
            headers["X-RapidAPI-Host"] = s.judge0_api_host
        self._client = httpx.AsyncClient(
            base_url=s.judge0_url.rstrip("/"),
            headers=headers,
            timeout=httpx.Timeout(15.0, connect=5.0),
            limits=httpx.Limits(max_connections=s.judge0_concurrency * 2),
        )
        self._gate = asyncio.Semaphore(s.judge0_concurrency)
        self._deadline_s = s.judge0_timeout_s

    async def close(self) -> None:
        await self._client.aclose()

    async def _request(self, method: str, url: str, **kwargs) -> httpx.Response:
        """One retry on throttling / transient gateway errors."""
        for attempt in (0, 1):
            try:
                resp = await self._client.request(method, url, **kwargs)
            except httpx.HTTPError:
                if attempt:
                    raise judge_unavailable() from None
                await asyncio.sleep(0.4)
                continue
            if resp.status_code in (429, 502, 503, 504) and not attempt:
                await asyncio.sleep(float(resp.headers.get("Retry-After", "0.8")) if resp.status_code == 429 else 0.6)
                continue
            if resp.status_code == 429:
                raise judge_unavailable("The code judge is rate limited. Please retry in a few seconds.")
            if resp.status_code >= 400:
                raise judge_unavailable(f"The code judge rejected the request ({resp.status_code}).")
            return resp
        raise judge_unavailable()

    async def execute(
        self,
        *,
        language_id: int,
        source: str,
        stdin: str,
        cpu_time_limit_s: float,
        memory_limit_kb: int,
    ) -> JudgeRun:
        payload = {
            "language_id": language_id,
            "source_code": _b64(source),
            "stdin": _b64(stdin),
            "cpu_time_limit": round(cpu_time_limit_s, 2),
            "wall_time_limit": min(20.0, round(cpu_time_limit_s * 2 + 1, 2)),
            "memory_limit": memory_limit_kb,
        }
        async with self._gate:
            created = await self._request(
                "POST", "/submissions", params={"base64_encoded": "true", "fields": "token"}, json=payload
            )
            token = created.json().get("token")
            if not token:
                raise judge_unavailable()

            deadline = time.monotonic() + self._deadline_s
            delay = 0.25
            while time.monotonic() < deadline:
                await asyncio.sleep(delay)
                delay = min(delay * 1.5, 1.0)
                resp = await self._request(
                    "GET", f"/submissions/{token}", params={"base64_encoded": "true", "fields": _FIELDS}
                )
                body = resp.json()
                status_id = (body.get("status") or {}).get("id", 0)
                if status_id > 2:  # 1 = In Queue, 2 = Processing
                    t = body.get("time")
                    return JudgeRun(
                        status_id=status_id,
                        status=(body.get("status") or {}).get("description", ""),
                        stdout=_unb64(body.get("stdout")),
                        stderr=_unb64(body.get("stderr")),
                        compile_output=_unb64(body.get("compile_output")),
                        message=_unb64(body.get("message")),
                        time_ms=int(float(t) * 1000) if t else None,
                        memory_kb=body.get("memory"),
                    )
        raise judge_unavailable("The code judge timed out. Please try again.")
