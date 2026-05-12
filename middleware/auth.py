"""
MindPulse — Auth Middleware
Simple JWT bearer token verification for protected routes.
"""

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import hmac, hashlib, base64, json, time
from config.settings import SECRET_KEY, TOKEN_EXPIRE_H

security = HTTPBearer(auto_error=False)


# ── Minimal JWT (no extra deps needed) ───────────

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    pad = 4 - len(s) % 4
    return base64.urlsafe_b64decode(s + "=" * pad)


def create_token(user_id: str) -> str:
    header  = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64(json.dumps({
        "sub": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRE_H * 3600,
    }).encode())
    sig = _b64(hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"


def verify_token(token: str) -> dict:
    try:
        header, payload, sig = token.split(".")
        expected = _b64(hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            raise ValueError("Invalid signature")
        data = json.loads(_unb64(payload))
        if data["exp"] < time.time():
            raise ValueError("Token expired")
        return data
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Unauthorized: {e}")


# ── FastAPI dependency ────────────────────────────

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Use as a FastAPI dependency to require auth on a route."""
    if not credentials:
        raise HTTPException(status_code=401, detail="No token provided")
    data = verify_token(credentials.credentials)
    return data["sub"]   # returns user_id


def optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str | None:
    """Like get_current_user but doesn't raise if no token."""
    if not credentials:
        return None
    try:
        data = verify_token(credentials.credentials)
        return data["sub"]
    except Exception:
        return None
