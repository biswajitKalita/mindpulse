"""
MindPulse — Phone OTP Routes (Fast2SMS)
POST /api/auth/send-otp    → generate + send OTP via SMS
POST /api/auth/verify-otp  → verify OTP → issue JWT
"""

import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from database.db import store_otp, pop_otp_if_valid, upsert_phone_user
from middleware.auth import create_token
from schemas.auth import AuthResponse, UserOut
from services.sms_service import send_otp_sms, generate_otp

router = APIRouter(prefix="/auth")


# ── Schemas ───────────────────────────────────────────────────────────────────

class SendOtpRequest(BaseModel):
    phone: str = Field(..., description="10-digit Indian phone number")

class VerifyOtpRequest(BaseModel):
    phone: str         = Field(..., description="10-digit Indian phone number")
    otp:   str         = Field(..., min_length=6, max_length=6)
    name:  Optional[str] = Field(None, description="Name for new users")


# ── Helpers ───────────────────────────────────────────────────────────────────

def normalize_phone(phone: str) -> str:
    """Normalize to +91XXXXXXXXXX format."""
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("91") and len(digits) == 12:
        return f"+{digits}"
    if len(digits) == 10:
        return f"+91{digits}"
    raise ValueError(f"Invalid phone number: {phone}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/send-otp")
async def send_otp(body: SendOtpRequest):
    """
    Generate a 6-digit OTP and send it via Fast2SMS.
    OTP is valid for 5 minutes, max 5 verification attempts.
    """
    try:
        phone = normalize_phone(body.phone)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid phone number. Enter a 10-digit Indian number.")

    otp = generate_otp(6)
    store_otp(phone, otp, ttl_seconds=300)   # 5 min expiry

    success, sent_via_sms = await send_otp_sms(phone, otp)

    if not success:
        raise HTTPException(
            status_code=503,
            detail="OTP generation failed. Please try again."
        )

    masked = f"{phone[:4]}****{phone[-3:]}"
    if sent_via_sms:
        return {
            "success":  True,
            "message":  f"OTP sent to {masked}",
            "dev_mode": False,
            "expires_in": 300,
        }
    else:
        # SMS failed but OTP is still valid — tell frontend to check console
        return {
            "success":  True,
            "message":  f"OTP generated for {masked}. Check backend console for code.",
            "dev_mode": True,
            "expires_in": 300,
        }


@router.post("/verify-otp", response_model=AuthResponse)
async def verify_otp(body: VerifyOtpRequest):
    """
    Verify the OTP. On success, create/find user and return JWT.
    """
    try:
        phone = normalize_phone(body.phone)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid phone number.")

    valid = pop_otp_if_valid(phone, body.otp.strip())
    if not valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired OTP. Please request a new one."
        )

    # Create or find user
    name = (body.name or "").strip() or "MindPulse User"
    user = upsert_phone_user(phone=phone, name=name)

    token = create_token(user["id"])
    return AuthResponse(success=True, user=UserOut(**user), token=token)
