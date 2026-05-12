"""
MindPulse — Database Layer
Saves users, check-in entries + analysis results to SQLite.
"""

import json, sqlite3, os, uuid, hashlib, hmac, secrets
from datetime import datetime
from typing import List, Optional, Dict

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "mindpulse.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create all tables on startup."""
    conn = get_connection()

    # ── Users table ──────────────────────────────────
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            email       TEXT UNIQUE,
            pass_hash   TEXT,
            pass_salt   TEXT,
            joined_at   TEXT NOT NULL,
            phone       TEXT UNIQUE
        )
    """)
    # Add phone column to existing databases that may not have it
    try:
        conn.execute("ALTER TABLE users ADD COLUMN phone TEXT UNIQUE")
        conn.commit()
    except Exception:
        pass  # column already exists

    # ── Check-ins table ──────────────────────────────
    conn.execute("""
        CREATE TABLE IF NOT EXISTS checkins (
            id          TEXT PRIMARY KEY,
            user_id     TEXT,
            created_at  TEXT NOT NULL,
            mood        TEXT NOT NULL,
            stress      INTEGER,
            sleep       INTEGER,
            energy      INTEGER,
            tags        TEXT,
            journal     TEXT,
            voice_used  INTEGER DEFAULT 0,
            score       INTEGER,
            risk_level  TEXT,
            emotions    TEXT,
            dominant    TEXT,
            insights    TEXT,
            suggestions TEXT,
            crisis_flag INTEGER DEFAULT 0,
            word_count  INTEGER
        )
    """)

    conn.commit()
    conn.close()

    # ── OTP store table ──────────────────────────────
    conn2 = get_connection()
    conn2.execute("""
        CREATE TABLE IF NOT EXISTS otp_store (
            phone       TEXT PRIMARY KEY,
            otp_hash    TEXT NOT NULL,
            expires_at  TEXT NOT NULL,
            attempts    INTEGER DEFAULT 0
        )
    """)
    conn2.commit()
    conn2.close()

# ─────────────────────────────────────────────────
#  Password hashing  (no bcrypt dep needed)
# ─────────────────────────────────────────────────

def _hash_password(password: str, salt: str) -> str:
    """PBKDF2-HMAC-SHA256 — secure, no external library needed."""
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations=260_000,   # OWASP recommended minimum
    )
    return dk.hex()


def _new_salt() -> str:
    return secrets.token_hex(32)


def _verify_password(password: str, salt: str, stored_hash: str) -> bool:
    return hmac.compare_digest(_hash_password(password, salt), stored_hash)


# ─────────────────────────────────────────────────
#  User CRUD
# ─────────────────────────────────────────────────

def create_user(name: str, email: str, password: str) -> Optional[Dict]:
    """
    Create a new user. Returns the user dict or None if email already exists.
    Password is hashed before storing — never stored in plain text.
    """
    conn = get_connection()
    # Check for duplicate email
    exists = conn.execute(
        "SELECT id FROM users WHERE LOWER(email)=LOWER(?)", (email,)
    ).fetchone()
    if exists:
        conn.close()
        return None   # caller should raise 409

    user_id   = str(uuid.uuid4())
    salt      = _new_salt()
    pass_hash = _hash_password(password, salt)
    joined    = datetime.utcnow().isoformat()

    conn.execute(
        "INSERT INTO users VALUES (?,?,?,?,?,?)",
        (user_id, name, email.lower().strip(), pass_hash, salt, joined)
    )
    conn.commit()
    conn.close()

    return {
        "id":             user_id,
        "name":           name,
        "email":          email.lower().strip(),
        "avatarInitials": "".join(p[0].upper() for p in name.split()[:2]),
        "joinedDate":     joined,
    }


def get_user_by_email(email: str) -> Optional[Dict]:
    """Return full user row (including hash+salt) by email."""
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM users WHERE LOWER(email)=LOWER(?)", (email,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: str) -> Optional[Dict]:
    """Return public user info by ID (no password fields)."""
    conn = get_connection()
    row = conn.execute(
        "SELECT id, name, email, joined_at FROM users WHERE id=?", (user_id,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    r = dict(row)
    return {
        "id":             r["id"],
        "name":           r["name"],
        "email":          r["email"],
        "avatarInitials": "".join(p[0].upper() for p in r["name"].split()[:2]),
        "joinedDate":     r["joined_at"],
    }


def authenticate_user(email: str, password: str) -> Optional[Dict]:
    """
    Verify email + password. Returns public user dict on success, None on failure.
    """
    row = get_user_by_email(email)
    if not row:
        return None
    if not _verify_password(password, row["pass_salt"], row["pass_hash"]):
        return None
    return {
        "id":             row["id"],
        "name":           row["name"],
        "email":          row["email"],
        "avatarInitials": "".join(p[0].upper() for p in row["name"].split()[:2]),
        "joinedDate":     row["joined_at"],
    }


# ─────────────────────────────────────────────────
#  OTP Store
# ─────────────────────────────────────────────────

def store_otp(phone: str, otp: str, ttl_seconds: int = 300):
    """Store hashed OTP for phone. Replaces any existing entry."""
    from datetime import datetime, timedelta
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    expires  = (datetime.utcnow() + timedelta(seconds=ttl_seconds)).isoformat()
    conn = get_connection()
    conn.execute(
        "INSERT OR REPLACE INTO otp_store (phone, otp_hash, expires_at, attempts) VALUES (?,?,?,0)",
        (phone, otp_hash, expires)
    )
    conn.commit()
    conn.close()


def pop_otp_if_valid(phone: str, otp: str) -> bool:
    """
    Check if OTP is correct and not expired.
    Deletes entry on success. Increments attempts on failure (max 5).
    """
    from datetime import datetime
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    conn = get_connection()
    row = conn.execute(
        "SELECT otp_hash, expires_at, attempts FROM otp_store WHERE phone=?", (phone,)
    ).fetchone()
    if not row:
        conn.close()
        return False
    if datetime.utcnow().isoformat() > row["expires_at"]:
        conn.execute("DELETE FROM otp_store WHERE phone=?", (phone,))
        conn.commit(); conn.close()
        return False
    if row["attempts"] >= 5:
        conn.close()
        return False
    if not hmac.compare_digest(otp_hash, row["otp_hash"]):
        conn.execute("UPDATE otp_store SET attempts = attempts + 1 WHERE phone=?", (phone,))
        conn.commit(); conn.close()
        return False
    conn.execute("DELETE FROM otp_store WHERE phone=?", (phone,))
    conn.commit(); conn.close()
    return True



def get_user_by_phone(phone: str) -> Optional[Dict]:
    """Return user by phone number."""
    conn = get_connection()
    row = conn.execute(
        "SELECT id, name, email, phone, joined_at FROM users WHERE phone=?", (phone,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    r = dict(row)
    return {
        "id":             r["id"],
        "name":           r["name"],
        "email":          r.get("email") or "",
        "phone":          r.get("phone") or "",
        "avatarInitials": "".join(p[0].upper() for p in r["name"].split()[:2]),
        "joinedDate":     r["joined_at"],
    }


def upsert_phone_user(phone: str, name: str = "MindPulse User") -> Dict:
    """
    Find or create a user by phone number (Firebase phone auth).
    Called after Firebase verifies the OTP — no password needed.
    """
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM users WHERE phone=?", (phone,)
    ).fetchone()

    if row:
        # Existing user — just return
        conn.close()
        r = dict(row)
        return {
            "id":             r["id"],
            "name":           r["name"],
            "email":          r.get("email") or "",
            "phone":          r.get("phone") or "",
            "avatarInitials": "".join(p[0].upper() for p in r["name"].split()[:2]),
            "joinedDate":     r["joined_at"],
        }

    # New user — create without email/password
    user_id  = str(uuid.uuid4())
    joined   = datetime.utcnow().isoformat()
    conn.execute(
        "INSERT INTO users (id, name, email, pass_hash, pass_salt, joined_at, phone) VALUES (?,?,?,?,?,?,?)",
        (user_id, name, None, None, None, joined, phone)
    )
    conn.commit()
    conn.close()
    return {
        "id":             user_id,
        "name":           name,
        "email":          "",
        "phone":          phone,
        "avatarInitials": "".join(p[0].upper() for p in name.split()[:2]),
        "joinedDate":     joined,
    }


def save_checkin(user_id: str, payload: dict, result: dict) -> str:
    """Persist a check-in + analysis result. Returns the new record ID."""
    import uuid
    entry_id = str(uuid.uuid4())
    conn = get_connection()
    conn.execute("""
        INSERT INTO checkins VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        entry_id,
        user_id,
        datetime.utcnow().isoformat(),
        payload.get("mood", ""),
        payload.get("stress", 0),
        payload.get("sleep", 0),
        payload.get("energy", 0),
        json.dumps(payload.get("tags", [])),
        payload.get("text", ""),
        int(payload.get("voice_used", False)),
        result.get("score", 0),
        result.get("risk_level", ""),
        json.dumps(result.get("emotions", {})),
        result.get("dominant_emotion", ""),
        result.get("insights", ""),
        json.dumps(result.get("suggestions", [])),
        int(result.get("crisis_flag", False)),
        result.get("word_count", 0),
    ))
    conn.commit()
    conn.close()
    return entry_id


def get_history(user_id: str, limit: int = 30) -> List[dict]:
    """Fetch recent check-ins for a user, newest first."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM checkins WHERE user_id=? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit)
    ).fetchall()
    conn.close()
    records = []
    for r in rows:
        rec = dict(r)
        rec["tags"]        = json.loads(rec.get("tags") or "[]")
        rec["emotions"]    = json.loads(rec.get("emotions") or "{}")
        rec["suggestions"] = json.loads(rec.get("suggestions") or "[]")
        records.append(rec)
    return records


def get_checkin_by_id(entry_id: str) -> Optional[dict]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM checkins WHERE id=?", (entry_id,)).fetchone()
    conn.close()
    if not row:
        return None
    rec = dict(row)
    rec["tags"]        = json.loads(rec.get("tags") or "[]")
    rec["emotions"]    = json.loads(rec.get("emotions") or "{}")
    rec["suggestions"] = json.loads(rec.get("suggestions") or "[]")
    return rec
