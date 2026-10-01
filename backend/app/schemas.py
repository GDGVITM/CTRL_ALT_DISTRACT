"""Request/response models. The wire format is camelCase to match the frontend."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ------------------------------------------------------------------ event


class LanguageInfo(CamelModel):
    id: str
    label: str
    file: str


class EventInfo(CamelModel):
    status: Literal["lobby", "live", "ended"]
    started_at: int | None
    ended_at: int | None
    server_time: int
    name: str
    organizer_name: str
    college_name: str
    event_date: str
    event_time: str
    total_rounds: int
    round_seconds: int
    round_minutes: float
    dsa_points: int
    bonus_points: int
    distraction_seconds: int
    languages: list[LanguageInfo]


# ------------------------------------------------------------------ participant


class ParticipantSummary(CamelModel):
    status: Literal["joined", "playing", "finished"]
    current_round: int
    round_pts: int
    bonus_pts: int
    total_pts: int
    solved_count: int
    total_time_ms: int
    distractions_cleared: int
    distractions_total: int


class MeResponse(CamelModel):
    id: str
    email: str | None
    full_name: str
    role: Literal["participant", "admin"]
    player_code: str
    participation: ParticipantSummary | None


class LobbyPlayer(CamelModel):
    id: str
    name: str
    initials: str


class LobbyResponse(CamelModel):
    count: int
    players: list[LobbyPlayer]


class ResultsResponse(CamelModel):
    full_name: str
    total: int
    round_pts: int
    bonus: int
    solved: int
    time_taken: str
    distractions_cleared: int
    distractions_total: int
    rounds: list[int]  # 1 = solved, 0 = not solved, one entry per round


# ------------------------------------------------------------------ arena


class Example(CamelModel):
    input: str
    output: str
    explanation: str = ""


class SampleCase(CamelModel):
    input: str
    expected: str


class ProblemPublic(CamelModel):
    round: int
    title: str
    difficulty: Literal["EASY", "MEDIUM", "HARD"]
    points: int
    tags: list[str]
    description: list[str]
    input_format: str
    output_format: str
    examples: list[Example]
    constraints: list[str]
    hints: list[str]
    samples: list[SampleCase]
    starter_code: dict[str, str]


class DistractionStatus(CamelModel):
    state: Literal["pending", "active", "cleared", "missed"]
    at_seconds: int  # active seconds into the round at which it fires
    index: int  # 1-based index into the frontend's distraction registry
    remaining_seconds: int | None = None  # only while active


class RoundInfo(CamelModel):
    round: int
    status: Literal["active", "solved", "expired"]
    seconds_left: int
    distraction: DistractionStatus


class RoundResult(CamelModel):
    round: int
    status: Literal["solved", "expired"]


class ArenaState(CamelModel):
    event_status: Literal["lobby", "live", "ended"]
    finished: bool
    participant: ParticipantSummary
    rounds: list[RoundResult]
    round: RoundInfo | None
    server_time: int


class CodeRequest(CamelModel):
    language: str = Field(min_length=1, max_length=16)
    code: str = Field(max_length=200_000)


class CompileOut(CamelModel):
    message: str
    line: int | None
    file: str


class CaseOut(CamelModel):
    index: int
    input: str
    expected: str
    actual: str | None
    status: Literal["pass", "fail", "error", "tle", "not_run"]
    message: str | None = None


class RunResponse(CamelModel):
    result: Literal["passed", "failed", "compile-error"]
    passed: int
    total: int
    cases: list[CaseOut]
    compile: CompileOut | None
    runtime_ms: int | None
    memory_kb: int | None


class SubmitResponse(CamelModel):
    result: Literal["accepted", "wrong", "compile-error", "expired"]
    headline: str
    passed: int
    total: int
    compile: CompileOut | None
    runtime_ms: int | None
    memory_kb: int | None
    participant: ParticipantSummary


class DistractionResolveRequest(CamelModel):
    result: Literal["passed", "failed", "timeout"]
    time_taken: int = Field(ge=0, le=3600)
    distraction_id: str | None = Field(default=None, max_length=40)
    metrics: dict[str, Any] | None = None


class DistractionResolveResponse(CamelModel):
    cleared: bool
    bonus: int
    participant: ParticipantSummary


# ------------------------------------------------------------------ proctoring


ProctorType = Literal["TAB_SWITCH", "FULLSCREEN_EXIT", "PASTE_BLOCKED", "MULTI_SESSION", "DISCONNECT"]


class ProctorEventRequest(CamelModel):
    type: ProctorType
    seconds: int | None = Field(default=None, ge=0, le=86_400)


class AlertOut(CamelModel):
    id: int
    type: ProctorType
    severity: Literal["high", "medium", "low"]
    player: str
    player_id: str
    round: int
    created_at: int
    detail: str
    acknowledged: bool


# ------------------------------------------------------------------ leaderboard / admin


class LeaderboardEntry(CamelModel):
    rank: int
    id: str
    name: str
    initials: str
    round_pts: int
    bonus: int
    total: int
    time: str
    self: bool = False


class LeaderboardResponse(CamelModel):
    entries: list[LeaderboardEntry]
    total: int
    event_status: Literal["lobby", "live", "ended"]


class AdminOverview(CamelModel):
    status: Literal["lobby", "live", "ended"]
    started_at: int | None
    ended_at: int | None
    server_time: int
    players: int
    playing: int
    finished: int
    open_alerts: int
    high_open_alerts: int
