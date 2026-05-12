"""
MindPulse Backend — Configuration
All settings loaded from environment variables with safe defaults.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── App ──────────────────────────────────────────
APP_NAME    = "MindPulse API"
APP_VERSION = "1.0.0"
DEBUG       = os.getenv("DEBUG", "false").lower() == "true"

# ── Server ───────────────────────────────────────
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# ── CORS ─────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

# ── Database ─────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "")           # leave empty to use SQLite fallback
DB_NAME   = os.getenv("DB_NAME", "mindpulse")

# ── JWT Auth ─────────────────────────────────────
SECRET_KEY      = os.getenv("SECRET_KEY", "change-me-in-production")
TOKEN_EXPIRE_H  = int(os.getenv("TOKEN_EXPIRE_H", "72"))

# ── Analysis Model ───────────────────────────────
MIN_TEXT_LENGTH  = int(os.getenv("MIN_TEXT_LENGTH", "3"))   # chars
CRISIS_ALERT_EMAIL = os.getenv("CRISIS_ALERT_EMAIL", "")    # optional email alert
