"""JWT verification: ES256 via JWKS, legacy HS256, and the failure modes."""

import asyncio
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec

from app import security
from app.config import get_settings
from app.errors import ApiError

KID = "test-key"


@pytest.fixture
def ec_key():
    key = ec.generate_private_key(ec.SECP256R1())
    security._jwks._keys = {KID: key.public_key()}
    security._jwks._fetched_at = time.monotonic()  # pretend the JWKS was just fetched
    yield key
    security._jwks._keys = {}
    security._jwks._fetched_at = -1e9


def _token(key, **claims):
    payload = {"sub": "user-1", "aud": "authenticated", "exp": int(time.time()) + 60, "email": "a@b.c", "app_metadata": {"role": "participant"}}
    payload.update(claims)
    return jwt.encode(payload, key, algorithm="ES256", headers={"kid": KID})


def run(coro):
    return asyncio.run(coro)


def test_valid_es256_token(ec_key):
    claims = run(security.decode_token(_token(ec_key)))
    assert claims["sub"] == "user-1"


def test_expired_token_is_rejected(ec_key):
    with pytest.raises(ApiError) as exc:
        run(security.decode_token(_token(ec_key, exp=int(time.time()) - 10)))
    assert exc.value.status == 401 and "expired" in exc.value.message.lower()


def test_wrong_audience_is_rejected(ec_key):
    with pytest.raises(ApiError) as exc:
        run(security.decode_token(_token(ec_key, aud="anon")))
    assert exc.value.status == 401


def test_token_signed_by_another_key_is_rejected(ec_key):
    other = ec.generate_private_key(ec.SECP256R1())
    with pytest.raises(ApiError) as exc:
        run(security.decode_token(_token(other)))
    assert exc.value.status == 401


def test_garbage_token_is_rejected(ec_key):
    with pytest.raises(ApiError) as exc:
        run(security.decode_token("not.a.jwt"))
    assert exc.value.status == 401


def test_hs256_requires_configured_secret(monkeypatch):
    token = jwt.encode({"sub": "u", "aud": "authenticated", "exp": int(time.time()) + 60}, "s3cret-s3cret-s3cret-s3cret-32b", algorithm="HS256")
    monkeypatch.setattr(get_settings(), "supabase_jwt_secret", "")
    with pytest.raises(ApiError):
        run(security.decode_token(token))
    monkeypatch.setattr(get_settings(), "supabase_jwt_secret", "s3cret-s3cret-s3cret-s3cret-32b")
    assert run(security.decode_token(token))["sub"] == "u"
