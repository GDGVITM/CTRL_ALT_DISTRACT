"""FastAPI application factory."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from .config import get_settings
from .db import db
from .errors import install_error_handlers
from .judge.judge0 import Judge0Client
from .routers import admin, arena, participant, public
from .services import arena as arena_service


@asynccontextmanager
async def lifespan(_: FastAPI):
    await db.connect()
    judge_client = Judge0Client()
    arena_service.set_judge_client(judge_client)
    try:
        yield
    finally:
        await judge_client.close()
        await db.close()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Ctrl Alt Distract API",
        description="Competition backend: event control, rounds, scoring, Judge0 execution and proctoring.",
        version="2.0.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
    )
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,  # bearer tokens, not cookies
        allow_methods=["*"],
        allow_headers=["*"],
    )
    install_error_handlers(app)
    for router in (public.router, participant.router, arena.router, admin.router):
        app.include_router(router)
    return app


app = create_app()
