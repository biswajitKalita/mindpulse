"""
MindPulse — Database Layer
Saves users + check-in entries to MongoDB Atlas (persistent) or SQLite (local dev fallback).
"""

import json, sqlite3, os, uuid, hashlib, hmac, secrets
from datetime import datetime
from typing import List, Optional, Dict
from config.settings import MONGO_URI, DB_NAME

# ── MongoDB (persistent — primary on Render) ────────────────────────────
_mongo_users    = None
_mongo_checkins = None
_mongo_otp      = None

try:
    if MONGO_URI:
        from pymongo import MongoClient
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        _db = _client[DB_NAME]

        # Users collection
        _mongo_users = _db["users"]
        _mongo_users.create_index("email", unique=True, sparse=True)
        _mongo_users.create_index("phone", unique=True, sparse=True)

        # Check-ins collection
        _mongo_checkins = _db["checkins"]
        _mongo_checkins.create_index("user_id")
        _mongo_checkins.create_index("created_at")

        # OTP store collection
        _mongo_otp = _db["otp_store"]
        _mongo_otp.create_index("phone", unique=True)

        print(f"[OK] MongoDB connected → {DB_NAME} (users + checkins + otp_store)")
except Exception as e:
    print(f"[WARN] MongoDB not available: {e} — using SQLite fallback")
    _mongo_users = _mongo_checkins = _mongo_otp = None

MONGO_ENABLED = _mongo_users is not None

# ── SQLite (local dev / fallback) ────────────────────────────────────────
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
    Uses MongoDB (persistent) when available, SQLite otherwise.
    """
    user_id   = str(uuid.uuid4())
    salt      = _new_salt()
    pass_hash = _hash_password(password, salt)
    joined    = datetime.utcnow().isoformat()
    email     = email.lower().strip()
    av        = "".join(p[0].upper() for p in name.split()[:2])

    if MONGO_ENABLED:
        try:
            doc = _mongo_users.find_one({"email": email})
            if doc:
                print(f"[OK] create_user → MongoDB insert for {email}")
            else:
                _mongo_users.insert_one({
                    "_id": user_id, "id": user_id, "name": name, "email": email,
                    "pass_hash": pass_hash, "pass_salt": salt,
                    "joined_at": joined, "phone": None,
                })
                print(f"[OK] create_user → saved to MongoDB for {email}")
                return {"id": user_id, "name": name, "email": email,
                        "avatarInitials": av, "joinedDate": joined}
            # duplicate email in Mongo
            return None
        except Exception as e:
            print(f"[Mongo create_user error] {e} — falling back to SQLite")

    # ── SQLite fallback ───────────────────────────────────────────
    conn = get_connection()
    exists = conn.execute(
        "SELECT id FROM users WHERE LOWER(email)=LOWER(?)", (email,)
    ).fetchone()
    if exists:
        conn.close()
        return None
    conn.execute(
        "INSERT INTO users (id, name, email, pass_hash, pass_salt, joined_at, phone) VALUES (?,?,?,?,?,?,?)",
        (user_id, name, email, pass_hash, salt, joined, None)
    )
    conn.commit()
    conn.close()
    return {"id": user_id, "name": name, "email": email,
            "avatarInitials": av, "joinedDate": joined}


def get_user_by_email(email: str) -> Optional[Dict]:
    """Return full user row (including hash+salt) by email."""
    email = email.lower().strip()
    if MONGO_ENABLED:
        try:
            doc = _mongo_users.find_one({"email": email})
            if doc:
                return dict(doc)  # found in MongoDB — return immediately
            # Not found in MongoDB → fall through and also check SQLite
            # (covers accounts created via SQLite fallback during a MongoDB error)
        except Exception as e:
            print(f"[Mongo get_user_by_email error] {e}")
    # SQLite fallback (also reached if MongoDB returned None)
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM users WHERE LOWER(email)=LOWER(?)", (email,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: str) -> Optional[Dict]:
    """Return public user info by ID (no password fields)."""
    if MONGO_ENABLED:
        try:
            doc = _mongo_users.find_one({"id": user_id})
            if doc:
                return {"id": doc["id"], "name": doc["name"], "email": doc.get("email", ""),
                        "avatarInitials": "".join(p[0].upper() for p in doc["name"].split()[:2]),
                        "joinedDate": doc["joined_at"]}
        except Exception as e:
            print(f"[Mongo get_user_by_id error] {e}")
    conn = get_connection()
    row = conn.execute(
        "SELECT id, name, email, joined_at FROM users WHERE id=?", (user_id,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    r = dict(row)
    return {"id": r["id"], "name": r["name"], "email": r["email"],
            "avatarInitials": "".join(p[0].upper() for p in r["name"].split()[:2]),
            "joinedDate": r["joined_at"]}


def authenticate_user(email: str, password: str) -> Optional[Dict]:
    """Verify email + password. Returns public user dict on success, None on failure."""
    row = get_user_by_email(email)
    if not row:
        return None
    salt = row.get("pass_salt") or row.get("salt") or ""
    stored = row.get("pass_hash") or row.get("hash") or ""
    if not _verify_password(password, salt, stored):
        return None
    return {"id": row["id"], "name": row["name"], "email": row["email"],
            "avatarInitials": "".join(p[0].upper() for p in row["name"].split()[:2]),
            "joinedDate": row.get("joined_at", "")}


# ─────────────────────────────────────────────────
#  OTP Store
# ─────────────────────────────────────────────────

def store_otp(phone: str, otp: str, ttl_seconds: int = 300):
    """Store hashed OTP for phone. Replaces any existing entry."""
    from datetime import datetime, timedelta
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    expires  = (datetime.utcnow() + timedelta(seconds=ttl_seconds)).isoformat()

    if MONGO_ENABLED and _mongo_otp is not None:
        try:
            _mongo_otp.replace_one(
                {"phone": phone},
                {"phone": phone, "otp_hash": otp_hash, "expires_at": expires, "attempts": 0},
                upsert=True,
            )
            return
        except Exception as e:
            print(f"[Mongo store_otp error] {e}")

    # SQLite fallback
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

    if MONGO_ENABLED and _mongo_otp is not None:
        try:
            doc = _mongo_otp.find_one({"phone": phone})
            if not doc:
                return False
            if datetime.utcnow().isoformat() > doc["expires_at"]:
                _mongo_otp.delete_one({"phone": phone})
                return False
            if doc.get("attempts", 0) >= 5:
                return False
            if not hmac.compare_digest(otp_hash, doc["otp_hash"]):
                _mongo_otp.update_one({"phone": phone}, {"$inc": {"attempts": 1}})
                return False
            _mongo_otp.delete_one({"phone": phone})
            return True
        except Exception as e:
            print(f"[Mongo pop_otp error] {e}")

    # SQLite fallback
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
    if MONGO_ENABLED:
        try:
            doc = _mongo_users.find_one({"phone": phone})
            if doc:
                return {
                    "id":             doc["id"],
                    "name":           doc["name"],
                    "email":          doc.get("email") or "",
                    "phone":          doc.get("phone") or "",
                    "avatarInitials": "".join(p[0].upper() for p in doc["name"].split()[:2]),
                    "joinedDate":     doc["joined_at"],
                }
            return None
        except Exception as e:
            print(f"[Mongo get_user_by_phone error] {e}")

    # SQLite fallback
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
    Find or create a user by phone number.
    Called after OTP verification — no password needed.
    """
    if MONGO_ENABLED:
        try:
            doc = _mongo_users.find_one({"phone": phone})
            if doc:
                return {
                    "id":             doc["id"],
                    "name":           doc["name"],
                    "email":          doc.get("email") or "",
                    "phone":          doc.get("phone") or "",
                    "avatarInitials": "".join(p[0].upper() for p in doc["name"].split()[:2]),
                    "joinedDate":     doc["joined_at"],
                }
            user_id = str(uuid.uuid4())
            joined  = datetime.utcnow().isoformat()
            _mongo_users.insert_one({
                "_id": user_id, "id": user_id, "name": name,
                "email": None, "phone": phone,
                "pass_hash": None, "pass_salt": None, "joined_at": joined,
            })
            return {
                "id": user_id, "name": name, "email": "", "phone": phone,
                "avatarInitials": "".join(p[0].upper() for p in name.split()[:2]),
                "joinedDate": joined,
            }
        except Exception as e:
            print(f"[Mongo upsert_phone_user error] {e}")

    # SQLite fallback
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE phone=?", (phone,)).fetchone()
    if row:
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
    user_id = str(uuid.uuid4())
    joined  = datetime.utcnow().isoformat()
    conn.execute(
        "INSERT INTO users (id, name, email, pass_hash, pass_salt, joined_at, phone) VALUES (?,?,?,?,?,?,?)",
        (user_id, name, None, None, None, joined, phone)
    )
    conn.commit()
    conn.close()
    return {
        "id": user_id, "name": name, "email": "", "phone": phone,
        "avatarInitials": "".join(p[0].upper() for p in name.split()[:2]),
        "joinedDate": joined,
    }


def save_checkin(user_id: str, payload: dict, result: dict) -> str:
    """Persist a check-in + analysis result. Returns the new record ID."""
    entry_id   = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()

    if MONGO_ENABLED and _mongo_checkins is not None:
        try:
            _mongo_checkins.insert_one({
                "id":           entry_id,
                "user_id":      user_id,
                "created_at":   created_at,
                "mood":         payload.get("mood", ""),
                "stress":       payload.get("stress", 0),
                "sleep":        payload.get("sleep", 0),
                "energy":       payload.get("energy", 0),
                "tags":         payload.get("tags", []),
                "journal":      payload.get("text", ""),
                "voice_used":   bool(payload.get("voice_used", False)),
                "score":        result.get("score", 0),
                "risk_level":   result.get("risk_level", ""),
                "emotions":     result.get("emotions", {}),
                "dominant":     result.get("dominant_emotion", ""),
                "insights":     result.get("insights", ""),
                "suggestions":  result.get("suggestions", []),
                "crisis_flag":  bool(result.get("crisis_flag", False)),
                "word_count":   result.get("word_count", 0),
            })
            return entry_id
        except Exception as e:
            print(f"[Mongo save_checkin error] {e} — falling back to SQLite")

    # SQLite fallback
    conn = get_connection()
    conn.execute("""
        INSERT INTO checkins VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        entry_id, user_id, created_at,
        payload.get("mood", ""),
        payload.get("stress", 0), payload.get("sleep", 0), payload.get("energy", 0),
        json.dumps(payload.get("tags", [])),
        payload.get("text", ""),
        int(payload.get("voice_used", False)),
        result.get("score", 0), result.get("risk_level", ""),
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
    if MONGO_ENABLED and _mongo_checkins is not None:
        try:
            docs = list(_mongo_checkins.find(
                {"user_id": user_id},
                sort=[("created_at", -1)],
                limit=limit,
            ))
            for doc in docs:
                doc.pop("_id", None)   # remove Mongo internal id
                # Ensure list/dict types (already stored correctly in Mongo)
                doc.setdefault("tags", [])
                doc.setdefault("emotions", {})
                doc.setdefault("suggestions", [])
            return docs
        except Exception as e:
            print(f"[Mongo get_history error] {e}")

    # SQLite fallback
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
    if MONGO_ENABLED and _mongo_checkins is not None:
        try:
            doc = _mongo_checkins.find_one({"id": entry_id})
            if doc:
                doc.pop("_id", None)
                doc.setdefault("tags", [])
                doc.setdefault("emotions", {})
                doc.setdefault("suggestions", [])
                return doc
            return None
        except Exception as e:
            print(f"[Mongo get_checkin_by_id error] {e}")

    # SQLite fallback
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
