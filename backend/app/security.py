"""Supabase JWT verification and FastAPI auth dependencies.

New Supabase projects sign access tokens with an asymmetric key (ES256, published at the JWKS URL);
older ones use a shared HS256 secret. Both are supported. Admin checks read the role from the
database rather than the token, so a demoted admin loses access immediately.
"""

import asyncio
import time
from dataclasses import dataclass
from typing import Annotated, Any

import httpx
import jwt
from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import get_settings
from .db import db
from .errors import ApiError

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: str | None
    token_role: str


class _JwksCache:
    """kid -> public key, refreshed (at most once a minute) when an unknown kid shows up."""

    def __init__(self) -> None:
        self._keys: dict[str, Any] = {}
        self._fetched_at = -1e9
        self._lock = asyncio.Lock()

    async def get(self, kid: str) -> Any | None:
        if kid in self._keys:
            return self._keys[kid]
        async with self._lock:
            if kid in self._keys:
                return self._keys[kid]
            if time.monotonic() - self._fetched_at < 60:
                return None
            url = f"{get_settings().supabase_url}/auth/v1/.well-known/jwks.json"
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url)
                resp.raise_for_status()
            self._fetched_at = time.monotonic()
            self._keys = {
                k["kid"]: jwt.PyJWK.from_dict(k).key for k in resp.json().get("keys", []) if "kid" in k
            }
            return self._keys.get(kid)


_jwks = _JwksCache()


def _unauthorized(message: str) -> ApiError:
    return ApiError(401, "unauthorized", message)


async def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        header = jwt.get_unverified_header(token)
        if header.get("alg") == "HS256":
            if not settings.supabase_jwt_secret:
                raise _unauthorized("HS256 token received but SUPABASE_JWT_SECRET is not configured")
            return jwt.decode(token, settings.supabase_jwt_secret, algorithms=["HS256"], audience="authenticated")
        key = await _jwks.get(header.get("kid", ""))
        if key is None:
            raise _unauthorized("Unknown signing key")
        return jwt.decode(token, key, algorithms=["ES256", "RS256"], audience="authenticated")
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Session expired. Please sign in again.")
    except jwt.InvalidTokenError:
        raise _unauthorized("Invalid credentials")
    except httpx.HTTPError:
        raise ApiError(503, "auth_unavailable", "Could not reach the identity provider")


async def optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> AuthUser | None:
    if credentials is None:
        return None
    payload = await decode_token(credentials.credentials)
    sub = payload.get("sub")
    if not sub:
        raise _unauthorized("Invalid credentials")
    return AuthUser(
        id=sub,
        email=payload.get("email"),
        token_role=(payload.get("app_metadata") or {}).get("role", "participant"),
    )


async def current_user(user: Annotated[AuthUser | None, Depends(optional_user)]) -> AuthUser:
    if user is None:
        raise _unauthorized("Missing Authorization header")
    return user


_admin_cache: dict[str, tuple[bool, float]] = {}
_ADMIN_TTL_S = 30.0


async def is_admin(user_id: str) -> bool:
    cached = _admin_cache.get(user_id)
    if cached and cached[1] > time.monotonic():
        return cached[0]
    async with db.acquire() as conn:
        role = await conn.fetchval("SELECT role::text FROM public.profiles WHERE id = $1::uuid", user_id)
    result = role == "admin"
    _admin_cache[user_id] = (result, time.monotonic() + _ADMIN_TTL_S)
    return result


async def require_admin(user: Annotated[AuthUser, Depends(current_user)]) -> AuthUser:
    if not await is_admin(user.id):
        raise ApiError(403, "forbidden", "Admin privileges required")
    return user


def client_id(x_client_id: Annotated[str | None, Header()] = None) -> str | None:
    """Per-tab identifier sent by the frontend; used to flag the same account playing twice."""
    return x_client_id[:64] if x_client_id else None
