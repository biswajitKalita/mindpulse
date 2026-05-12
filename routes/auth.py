"""
MindPulse — Auth Routes
POST /api/auth/signup        → register new user (email + password)
POST /api/auth/login         → login + get JWT
POST /api/auth/phone-login   → Firebase phone OTP → MindPulse JWT
GET  /api/auth/me            → get current user from token
"""

import os, httpx
from fastapi import APIRouter, HTTPException, Depends
from schemas.auth import SignUpRequest, LoginRequest, PhoneLoginRequest, AuthResponse, UserOut
from database.db import create_user, authenticate_user, get_user_by_id, upsert_phone_user
from middleware.auth import create_token, get_current_user

router = APIRouter(prefix="/auth")

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")


# ── Helper: verify Firebase ID token via Google's token info endpoint ─────────
async def verify_firebase_token(id_token: str) -> dict:
    """
    Verifies a Firebase ID token by calling Google's tokeninfo endpoint.
    Returns decoded token claims or raises HTTPException on failure.
    """
    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            data = resp.json()
    except Exception:
        raise HTTPException(status_code=503, detail="Could not reach Firebase verification service.")

    if "error_description" in data or "error" in data:
        raise HTTPException(status_code=401, detail="Invalid Firebase token.")

    # Optionally verify the audience (project ID)
    if FIREBASE_PROJECT_ID and data.get("aud") != FIREBASE_PROJECT_ID:
        raise HTTPException(status_code=401, detail="Firebase token audience mismatch.")

    return data


# ── Email / Password auth ─────────────────────────────────────────────────────

@router.post("/signup", response_model=AuthResponse)
async def signup(body: SignUpRequest):
    """Register a new user. Password is hashed with PBKDF2-SHA256 before storing."""
    user = create_user(
        name=body.name.strip(),
        email=body.email.strip().lower(),
        password=body.password,
    )
    if user is None:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    token = create_token(user["id"])
    return AuthResponse(success=True, user=UserOut(**user), token=token)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    """Verify email + password. Returns JWT token on success."""
    user = authenticate_user(email=body.email.strip().lower(), password=body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = create_token(user["id"])
    return AuthResponse(success=True, user=UserOut(**user), token=token)


# ── Phone OTP auth (Firebase) ─────────────────────────────────────────────────

@router.post("/phone-login", response_model=AuthResponse)
async def phone_login(body: PhoneLoginRequest):
    """
    Exchange a Firebase ID token (after OTP verification) for a MindPulse JWT.
    Creates a new user account if the phone number is not registered yet.
    """
    # 1) Verify the Firebase token is legit
    claims = await verify_firebase_token(body.firebase_token)

    # Firebase phone auth tokens have phone_number in claims
    firebase_phone = claims.get("phone_number") or body.phone
    if not firebase_phone:
        raise HTTPException(status_code=400, detail="Phone number not found in token.")

    # 2) Find or create user in our database
    name = (body.name or "").strip() or "MindPulse User"
    user = upsert_phone_user(phone=firebase_phone, name=name)

    # 3) Issue our own JWT
    token = create_token(user["id"])
    return AuthResponse(success=True, user=UserOut(**user), token=token)


# ── Profile ───────────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
async def get_me(user_id: str = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserOut(**user)


@router.post("/logout")
async def logout():
    """Client-side logout — just returns 200 (JWT is stateless)."""
    return {"success": True, "message": "Logged out successfully."}
