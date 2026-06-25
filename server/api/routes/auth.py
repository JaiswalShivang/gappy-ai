"""
api/routes/auth.py — Register, Login, Me
=========================================

Routes:
  POST /api/auth/register  — { email, password, name } → JWT token
  POST /api/auth/login     — { email, password } → JWT token
  GET  /api/auth/me        — returns current user (requires Bearer token)
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status

from core.database import users_col
from core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ── POST /api/auth/register ───────────────────────────────────────────────────
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: dict):
    """
    Create a new user account.
    Body: { email: str, password: str, name: str (optional) }
    Returns: { token, user }
    """
    email = (body.get("email") or "").strip().lower()
    password = (body.get("password") or "").strip()
    name = (body.get("name") or "").strip()

    if not email or not password:
        raise HTTPException(422, detail="email and password are required")
    if len(password) < 6:
        raise HTTPException(422, detail="password must be at least 6 characters")

    # Check duplicate email
    existing = await users_col().find_one({"email": email})
    if existing:
        raise HTTPException(409, detail="An account with that email already exists")

    # Create user
    hashed = hash_password(password)
    user_doc = {"email": email, "name": name or email.split("@")[0], "password": hashed}
    result = await users_col().insert_one(user_doc)
    user_id = str(result.inserted_id)

    token = create_access_token(user_id)
    logger.info("New user registered: %s (%s)", email, user_id)

    return {
        "token": token,
        "user": {"_id": user_id, "email": email, "name": user_doc["name"]},
    }


# ── POST /api/auth/login ──────────────────────────────────────────────────────
@router.post("/login")
async def login(body: dict):
    """
    Authenticate an existing user.
    Body: { email: str, password: str }
    Returns: { token, user }
    """
    email = (body.get("email") or "").strip().lower()
    password = (body.get("password") or "").strip()

    if not email or not password:
        raise HTTPException(422, detail="email and password are required")

    user = await users_col().find_one({"email": email})
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(401, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = create_access_token(user_id)
    logger.info("User logged in: %s (%s)", email, user_id)

    return {
        "token": token,
        "user": {"_id": user_id, "email": email, "name": user.get("name", "")},
    }


# ── GET /api/auth/me ──────────────────────────────────────────────────────────
@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return current_user
