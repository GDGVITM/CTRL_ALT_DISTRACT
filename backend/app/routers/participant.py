"""Signed-in player endpoints: profile, joining, lobby roster, results and proctoring reports."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response

from ..schemas import LobbyResponse, MeResponse, ProctorEventRequest, ResultsResponse
from ..security import AuthUser, current_user
from ..services import arena, people, proctor

router = APIRouter(prefix="/api", tags=["participant"])
User = Annotated[AuthUser, Depends(current_user)]


@router.get("/me", response_model=MeResponse)
async def get_me(user: User) -> MeResponse:
    return await people.me(user.id, user.email)


@router.post("/participant/join", status_code=204)
async def join(user: User) -> Response:
    await arena.join(user.id)
    return Response(status_code=204)


@router.post("/participant/leave", status_code=204)
async def leave(user: User) -> Response:
    await arena.leave(user.id)
    return Response(status_code=204)


@router.get("/lobby", response_model=LobbyResponse)
async def get_lobby(_: User) -> LobbyResponse:
    return await people.lobby()


@router.get("/results/me", response_model=ResultsResponse)
async def get_results(user: User) -> ResultsResponse:
    return await arena.results(user.id)


@router.post("/proctor/events", status_code=204)
async def report_proctor_event(body: ProctorEventRequest, user: User) -> Response:
    await proctor.report(user.id, body.type, body.seconds)
    return Response(status_code=204)
