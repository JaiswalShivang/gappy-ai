"""
core/security.py — Password hashing + JWT token utilities
==========================================================

Uses bcrypt directly (avoids passlib 1.7.4 + bcrypt 5.x incompatibility)
and PyJWT instead of python-jose.

Public API:
    hash_password(plain)          -> str          (bcrypt hash)
    verify_password(plain, hash)  -> bool
    create_access_token(user_id)  -> str          (JWT)
    decode_access_token(token)    -> str | None   (user_id or None)
    get_current_user(token)       -> dict         (FastAPI dependency)
"""

import logging
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from jwt.exceptions import InvalidTokenError

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core.config import settings
from core.database import users_col

logger = logging.getLogger(__name__)


# ── Password hashing (bcrypt directly — no passlib) ───────────────────────────

def hash_password(plain: str) -> str:
    """Return a bcrypt hash of the plain-text password."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ── JWT creation + decoding (PyJWT) ───────────────────────────────────────────

def create_access_token(user_id: str) -> str:
    """Create a JWT that expires in settings.jwt_expire_minutes."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    """Decode a JWT. Returns the user_id (sub) or None if invalid/expired."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload.get("sub")
    except InvalidTokenError:
        return None


# ── FastAPI dependency ─────────────────────────────────────────────────────────
_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """
    FastAPI dependency — call with `current_user: dict = Depends(get_current_user)`.
    Returns the MongoDB user document (without password) or raises 401.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated — include Authorization: Bearer <token>",
        )

    user_id = decode_access_token(credentials.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    from bson import ObjectId
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=401, detail="Malformed token payload")

    user = await users_col().find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Return safe user dict (no password field)
    return {
        "_id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name", ""),
    }
