"""Proctoring alerts raised by the client (tab focus, connectivity) or by the server (multi-session)."""

from __future__ import annotations

import asyncpg

from ..db import db
from ..schemas import AlertOut
from .common import display_name, epoch_ms
from . import event as event_service

SEVERITY = {
    "TAB_SWITCH": "medium",
    "FULLSCREEN_EXIT": "medium",
    "PASTE_BLOCKED": "low",
    "MULTI_SESSION": "high",
    "DISCONNECT": "low",
}


def _detail(kind: str, seconds: int | None) -> str:
    n = seconds if seconds is not None else 0
    return {
        "TAB_SWITCH": f"Tab lost focus for {n}s",
        "FULLSCREEN_EXIT": "Full screen was closed during a round",
        "PASTE_BLOCKED": "Clipboard paste into the editor was blocked",
        "MULTI_SESSION": "Same account opened in another tab or device",
        "DISCONNECT": f"Connection lost for {n}s",
    }[kind]


async def record(
    conn: asyncpg.Connection,
    user_id: str,
    kind: str,
    round_no: int,
    seconds: int | None = None,
    dedupe_s: float = 3.0,
) -> bool:
    recent = await conn.fetchval(
        "SELECT 1 FROM public.proctor_events WHERE user_id = $1::uuid AND type = $2 "
        "AND created_at > now() - make_interval(secs => $3) LIMIT 1",
        user_id, kind, dedupe_s,
    )
    if recent:
        return False
    await conn.execute(
        "INSERT INTO public.proctor_events (user_id, type, severity, round_no, detail) VALUES ($1::uuid, $2, $3, $4, $5)",
        user_id, kind, SEVERITY[kind], round_no, _detail(kind, seconds),
    )
    return True


async def report(user_id: str, kind: str, seconds: int | None) -> None:
    """Client-reported event. Ignored unless the player is mid-run, so lobby noise never reaches admins."""
    ev = await event_service.get_event()
    if ev["status"] != "live":
        return
    async with db.transaction() as conn:
        part = await conn.fetchrow(
            "SELECT status, current_round FROM public.participations WHERE user_id = $1::uuid", user_id
        )
        if part is None or part["status"] != "playing":
            return
        await record(conn, user_id, kind, part["current_round"], seconds)


# --------------------------------------------------------------------------- admin queries


def _alert(row: asyncpg.Record) -> AlertOut:
    name = display_name(row["full_name"], row["player_no"])
    return AlertOut(
        id=row["id"],
        type=row["type"],
        severity=row["severity"],
        player=name,
        player_id=f"CAD-{row['player_no']:04d}",
        round=row["round_no"],
        created_at=epoch_ms(row["created_at"]) or 0,
        detail=row["detail"],
        acknowledged=row["acknowledged"],
    )


async def list_alerts(limit: int = 500) -> list[AlertOut]:
    async with db.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT e.*, p.full_name, p.player_no
            FROM public.proctor_events e JOIN public.profiles p ON p.id = e.user_id
            WHERE NOT e.dismissed
            ORDER BY e.created_at DESC, e.id DESC
            LIMIT $1
            """,
            limit,
        )
    return [_alert(r) for r in rows]


async def acknowledge(alert_id: int) -> None:
    async with db.acquire() as conn:
        await conn.execute("UPDATE public.proctor_events SET acknowledged = TRUE WHERE id = $1", alert_id)


async def acknowledge_all() -> None:
    async with db.acquire() as conn:
        await conn.execute("UPDATE public.proctor_events SET acknowledged = TRUE WHERE NOT acknowledged AND NOT dismissed")


async def dismiss(alert_id: int) -> None:
    async with db.acquire() as conn:
        await conn.execute("UPDATE public.proctor_events SET dismissed = TRUE WHERE id = $1", alert_id)
