"""Unauthenticated endpoints: health, event info, leaderboard (optionally personalised)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response

from ..db import db
from ..schemas import EventInfo, LeaderboardResponse
from ..security import AuthUser, optional_user
from ..services import event as event_service
from ..services import people

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/health")
async def health() -> dict:
    return {"status": "online", "service": "ctrl-alt-distract"}



@router.get("/event", response_model=EventInfo)
async def get_event() -> EventInfo:
    return await event_service.event_info()


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    response: Response,
    viewer: Annotated[AuthUser | None, Depends(optional_user)],
    limit: Annotated[int | None, Query(ge=1, le=5000)] = None,
) -> LeaderboardResponse:
    response.headers["Cache-Control"] = "private, no-store"
    return await people.leaderboard(viewer.id if viewer else None, limit)
