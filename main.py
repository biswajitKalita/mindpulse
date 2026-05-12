"""
MindPulse Backend — FastAPI Entry Point
Run with:  py -m uvicorn main:app --reload --port 8000
"""

import os
from dotenv import load_dotenv
load_dotenv()  # Load .env before importing any modules that use env vars

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routes.analyze   import router as analyze_router
from routes.auth      import router as auth_router
from routes.checkins  import router as checkins_router
from routes.otp       import router as otp_router
from database.db      import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("[OK] Database initialized")
    yield


app = FastAPI(
    title="MindPulse API",
    description="Mental wellness analysis + authentication backend",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS: allow Vite frontend ──────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
        "http://localhost:5176", "http://127.0.0.1:5176",
        "http://localhost:3000", "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────
app.include_router(auth_router,     prefix="/api")   # /api/auth/...
app.include_router(otp_router,      prefix="/api")   # /api/auth/send-otp, verify-otp
app.include_router(analyze_router,  prefix="/api")   # /api/analyze
app.include_router(checkins_router, prefix="/api")   # /api/checkins


@app.get("/")
async def root():
    return {"app": "MindPulse API", "version": "1.0.0", "docs": "/docs"}

