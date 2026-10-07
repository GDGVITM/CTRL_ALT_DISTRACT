"""Serve the built website and API together for laptop hosting."""

from pathlib import Path

from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles

from .main import create_app


class WebsiteFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        path = path.replace("\\", "/").lstrip("/")
        # Missing API routes and assets must retain their real 404 responses.
        if path == "api" or path.startswith("api/") or any(part.startswith(".") for part in Path(path).parts):
            raise HTTPException(status_code=404)
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404 or scope["method"] not in ("GET", "HEAD"):
                raise
            if Path(path).suffix or path.startswith("assets/"):
                raise
            return await super().get_response("index.html", scope)


dist = Path(__file__).resolve().parents[2] / "dist"
app = create_app()
app.mount("/", WebsiteFiles(directory=dist, html=True), name="website")
