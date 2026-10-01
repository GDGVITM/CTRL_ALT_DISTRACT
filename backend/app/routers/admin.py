"""Admin console endpoints. Every route requires an admin role (checked against the database)."""

from fastapi import APIRouter, Depends, Response

from ..schemas import AdminOverview, AlertOut
from ..security import require_admin
from ..services import event as event_service
from ..services import people, proctor

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


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
