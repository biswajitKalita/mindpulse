from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class SignUpRequest(BaseModel):
    name: str     = Field(..., min_length=2, max_length=80)
    email: str    = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Min 6 characters")
    phone: Optional[str] = Field(None, description="Phone number with country code")


class LoginRequest(BaseModel):
    email: str
    password: str


class PhoneLoginRequest(BaseModel):
    firebase_token: str = Field(..., description="Firebase ID token after OTP verification")
    phone: str          = Field(..., description="Phone number e.g. +919876543210")
    name: Optional[str] = Field(None, description="Name (required for new users)")


class UserOut(BaseModel):
    id:             str
    name:           str
    email:          str
    phone:          Optional[str] = None
    avatarInitials: str
    joinedDate:     str


class AuthResponse(BaseModel):
    success: bool
    user:    Optional[UserOut] = None
    token:   Optional[str]     = None
    error:   Optional[str]     = None
