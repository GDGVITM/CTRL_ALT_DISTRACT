"""The competition arena: round state, problem, run/submit and distractions."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from ..schemas import (
    ArenaState,
    CodeRequest,
    DistractionResolveRequest,
    DistractionResolveResponse,
    ProblemPublic,
    RunResponse,
    SubmitResponse,
)
from ..security import AuthUser, client_id, current_user
from ..services import arena

router = APIRouter(prefix="/api/arena", tags=["arena"])
User = Annotated[AuthUser, Depends(current_user)]
Client = Annotated[str | None, Depends(client_id)]


@router.get("/state", response_model=ArenaState)
async def state(user: User, client: Client) -> ArenaState:
    return await arena.get_state(user.id, client)


@router.post("/start", response_model=ArenaState)
async def start(user: User, client: Client) -> ArenaState:
    """Begin round 1, or advance after a round has been solved / has expired. Idempotent."""
    return await arena.start_or_advance(user.id, client)


@router.post("/expire", response_model=ArenaState)
async def expire(user: User) -> ArenaState:
    return await arena.expire(user.id)


@router.get("/problem", response_model=ProblemPublic)
async def problem(user: User, round: Annotated[int | None, Query(ge=1)] = None) -> ProblemPublic:
    return await arena.current_problem(user.id, round)


@router.post("/run", response_model=RunResponse)
async def run(body: CodeRequest, user: User) -> RunResponse:
    return await arena.run(user.id, body)


@router.post("/submit", response_model=SubmitResponse)
async def submit(body: CodeRequest, user: User) -> SubmitResponse:
    return await arena.submit(user.id, body)


@router.post("/distraction/start", response_model=ArenaState)
async def distraction_start(user: User) -> ArenaState:
    return await arena.distraction_start(user.id)


@router.post("/distraction/resolve", response_model=DistractionResolveResponse)
async def distraction_resolve(body: DistractionResolveRequest, user: User) -> DistractionResolveResponse:
    return await arena.distraction_resolve(user.id, body)
