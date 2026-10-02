"""Admin console endpoints. Every route requires an admin role (checked against the database)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response

from ..schemas import AdminOverview, AlertOut, ApprovalStatus, BulkApproveRegistrationsRequest, BulkApproveRegistrationsResponse, Registration, RegistrationsResponse, ReviewRegistrationRequest
from ..security import AuthUser, require_admin
from ..services import event as event_service
from ..services import people, proctor, registrations

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/registrations", response_model=RegistrationsResponse)
async def list_registrations(
    status: ApprovalStatus = "pending",
    search: Annotated[str, Query(max_length=100)] = "",
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> RegistrationsResponse:
    return await registrations.list_registrations(status, search.strip(), offset, limit)


@router.post("/registrations/approve", response_model=BulkApproveRegistrationsResponse)
async def bulk_approve_registrations(
    body: BulkApproveRegistrationsRequest,
    reviewer: Annotated[AuthUser, Depends(require_admin)],
) -> BulkApproveRegistrationsResponse:
    return await registrations.bulk_approve_registrations(body, reviewer.id)


@router.post("/registrations/{user_id}/review", response_model=Registration)
async def review_registration(
    user_id: UUID, body: ReviewRegistrationRequest,
    reviewer: Annotated[AuthUser, Depends(require_admin)],
) -> Registration:
    return await registrations.review_registration(user_id, reviewer.id, body.decision)


@router.get("/overview", response_model=AdminOverview)
async def overview() -> AdminOverview:
    return await people.admin_overview()


@router.post("/event/start", status_code=204)
async def start_event() -> Response:
    await event_service.start_event()
    return Response(status_code=204)


@router.post("/event/end", status_code=204)
async def end_event() -> Response:
    await event_service.end_event()
    return Response(status_code=204)


@router.post("/event/reset", status_code=204)
async def reset_event() -> Response:
    await event_service.reset_event()
    return Response(status_code=204)


@router.get("/alerts", response_model=list[AlertOut])
async def alerts() -> list[AlertOut]:
    return await proctor.list_alerts()


@router.post("/alerts/ack-all", status_code=204)
async def acknowledge_all() -> Response:
    await proctor.acknowledge_all()
    return Response(status_code=204)


@router.post("/alerts/{alert_id}/ack", status_code=204)
async def acknowledge(alert_id: int) -> Response:
    await proctor.acknowledge(alert_id)
    return Response(status_code=204)


@router.delete("/alerts/{alert_id}", status_code=204)
async def dismiss(alert_id: int) -> Response:
    await proctor.dismiss(alert_id)
    return Response(status_code=204)
