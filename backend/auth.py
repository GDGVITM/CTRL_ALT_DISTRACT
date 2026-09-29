import os
import jwt
from typing import Optional
from pydantic import BaseModel
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://prczdinpsfafsqzgkbfh.supabase.co")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# Public JWKS client for asymmetric token verification (ES256 / RS256)
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
jwks_client = jwt.PyJWKClient(JWKS_URL)

security = HTTPBearer(auto_error=False)

class AuthenticatedUser(BaseModel):
    user_id: str
    email: Optional[str] = None
    role: str

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> AuthenticatedUser:
    """
    Decodes and cryptographically verifies the Supabase Bearer JWT.
    Supports both modern Supabase JWKS (ES256) and legacy secret (HS256).
    Extracts the user ID (sub) and role (app_metadata.role).
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # First attempt: Verify via Supabase JWKS (standard for Supabase 2024+)
        try:
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience="authenticated",
            )
        except Exception:
            # Fallback attempt: Verify via symmetric HS256 secret if configured
            if SUPABASE_JWT_SECRET:
                payload = jwt.decode(
                    token,
                    SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    audience="authenticated",
                )
            else:
                raise credentials_exception

        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exception

        email: Optional[str] = payload.get("email")
        app_metadata = payload.get("app_metadata", {})
        role: str = app_metadata.get("role", "participant")

        return AuthenticatedUser(
            user_id=user_id,
            email=email,
            role=role
        )

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please refresh your session.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exception


async def require_admin(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    """
    Route dependency ensuring the requesting user has the 'admin' role.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin privileges required to access this endpoint",
        )
    return current_user
