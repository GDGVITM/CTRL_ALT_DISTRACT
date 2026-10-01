"""Small pure helpers shared across services."""

from __future__ import annotations

import re
from datetime import datetime

from ..schemas import ParticipantSummary


def player_code(player_no: int) -> str:
    return f"CAD-{player_no:04d}"


def display_name(full_name: str | None, player_no: int) -> str:
    name = (full_name or "").strip()
    return name or f"PLAYER_{player_no:04d}"


def initials(name: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", name)
    if not words:
        return "P1"
    if len(words) == 1:
        return words[0][:2].upper()
    return (words[0][0] + words[1][0]).upper()


def format_hms(total_ms: int) -> str:
    s = max(0, int(total_ms) // 1000)
    return f"{s // 3600:02d}:{s % 3600 // 60:02d}:{s % 60:02d}"


def epoch_ms(value: datetime | None) -> int | None:
    return None if value is None else int(value.timestamp() * 1000)


def summary(row) -> ParticipantSummary:
    """Build a ParticipantSummary from a participations row."""
    return ParticipantSummary(
        status=row["status"],
        current_round=row["current_round"],
        round_pts=row["round_pts"],
        bonus_pts=row["bonus_pts"],
        total_pts=row["total_pts"],
        solved_count=row["solved_count"],
        total_time_ms=row["total_time_ms"],
        distractions_cleared=row["distractions_cleared"],
        distractions_total=row["distractions_total"],
    )
