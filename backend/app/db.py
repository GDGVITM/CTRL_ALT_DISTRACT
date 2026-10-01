"""asyncpg pool wrapper. The backend connects as `postgres`, so RLS does not apply to it."""

import json
from contextlib import asynccontextmanager
from typing import AsyncIterator

import asyncpg

from .config import get_settings


async def _init_connection(conn: asyncpg.Connection) -> None:
    for kind in ("json", "jsonb"):
        await conn.set_type_codec(kind, encoder=json.dumps, decoder=json.loads, schema="pg_catalog")


class Database:
    def __init__(self) -> None:
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        s = get_settings()
        self._pool = await asyncpg.create_pool(
            dsn=s.database_url,
            min_size=s.db_pool_min,
            max_size=s.db_pool_max,
            statement_cache_size=s.db_statement_cache,
            init=_init_connection,
            command_timeout=30,
            ssl="require" if "supabase" in s.database_url else None,
        )

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None

    @property
    def pool(self) -> asyncpg.Pool:
        if self._pool is None:
            raise RuntimeError("Database pool is not initialised")
        return self._pool

    @asynccontextmanager
    async def acquire(self) -> AsyncIterator[asyncpg.Connection]:
        async with self.pool.acquire() as conn:
            yield conn

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator[asyncpg.Connection]:
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                yield conn


db = Database()
