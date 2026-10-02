"""Admin-only registration review; database triggers synchronize Supabase login access."""

from uuid import UUID

from ..db import db
from ..errors import conflict, not_found
from ..schemas import BulkApproveRegistrationsRequest, BulkApproveRegistrationsResponse, Registration, RegistrationCounts, RegistrationsResponse
from .common import epoch_ms


def registration(row) -> Registration:
    return Registration(
        id=str(row["id"]),
        full_name=row["full_name"] or "Participant",
        email=row["email"],
        approval_status=row["approval_status"],
        created_at=epoch_ms(row["created_at"]),
        reviewed_at=epoch_ms(row["reviewed_at"]) if row["reviewed_at"] else None,
    )


def search_pattern(search: str) -> str:
    return "%" + search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


async def list_registrations(status: str, search: str, offset: int, limit: int) -> RegistrationsResponse:
    # Parameters remain bound even for search/filter requests.
    where = "role = 'participant' AND approval_status = $1 AND (full_name ILIKE $2 OR email ILIKE $2)"
    pattern = search_pattern(search)
    async with db.acquire() as conn:
        counts = await conn.fetchrow(
            """SELECT count(*) FILTER (WHERE approval_status = 'pending') AS pending,
                      count(*) FILTER (WHERE approval_status = 'approved') AS approved,
                      count(*) FILTER (WHERE approval_status = 'rejected') AS rejected
               FROM public.profiles WHERE role = 'participant'"""
        )
        total = await conn.fetchval(f"SELECT count(*) FROM public.profiles WHERE {where}", status, pattern)
        rows = await conn.fetch(
            f"SELECT * FROM public.profiles WHERE {where} ORDER BY created_at DESC, id LIMIT $3 OFFSET $4",
            status, pattern, limit, offset,
        )
    return RegistrationsResponse(
        items=[registration(row) for row in rows], total=total, counts=RegistrationCounts(**dict(counts))
    )


async def review_registration(user_id: UUID, reviewer_id: str, decision: str) -> Registration:
    async with db.transaction() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM public.profiles WHERE id = $1 AND role = 'participant' FOR UPDATE", user_id
        )
        if row is None:
            raise not_found("Participant registration not found.")
        if row["approval_status"] != "pending":
            raise conflict("already_reviewed", "This registration has already been reviewed. Refresh the list.")
        row = await conn.fetchrow(
            """UPDATE public.profiles SET approval_status = $2, reviewed_at = now(),
                      reviewed_by = $3::uuid, updated_at = now()
               WHERE id = $1 RETURNING *""",
            user_id, decision, reviewer_id,
        )
    return registration(row)


async def bulk_approve_registrations(selection: BulkApproveRegistrationsRequest, reviewer_id: str) -> BulkApproveRegistrationsResponse:
    # Lock in a stable order so overlapping bulk reviews cannot deadlock. The
    # pending predicate is rechecked after a concurrent reviewer releases a lock.
    async with db.transaction() as conn:
        rows = await conn.fetch(
            """SELECT id FROM public.profiles
               WHERE role = 'participant' AND approval_status = 'pending'
                 AND (($1::boolean AND (full_name ILIKE $2 OR email ILIKE $2)
                       AND NOT (id = ANY($4::uuid[])))
                      OR (NOT $1::boolean AND id = ANY($3::uuid[])))
               ORDER BY id FOR UPDATE""",
            selection.all_pending, search_pattern(selection.search.strip()),
            selection.ids, selection.excluded_ids,
        )
        ids = [row["id"] for row in rows]
        if ids:
            # Each profile update runs the existing Supabase access trigger in
            # this same transaction; login access and review records stay in sync.
            await conn.execute(
                """UPDATE public.profiles SET approval_status = 'approved',
                          reviewed_at = now(), reviewed_by = $2::uuid, updated_at = now()
                   WHERE id = ANY($1::uuid[]) AND role = 'participant' AND approval_status = 'pending'""",
                ids, reviewer_id,
            )
    return BulkApproveRegistrationsResponse(approved_count=len(ids))
