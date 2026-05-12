"""
MindPulse — SMS Service via Fast2SMS
API Key: Set FAST2SMS_API_KEY in backend .env

Fast2SMS setup (one time, free):
  Dashboard → OTP Message → Add & Verify your website URL
  OR recharge ₹100 to use Quick route
"""

import os, secrets, httpx

def _get_api_key() -> str:
    return os.environ.get("FAST2SMS_API_KEY", "").strip()

def _clean_phone(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]
    if len(digits) == 10:
        return digits
    return digits[-10:]


async def send_otp_sms(phone: str, otp: str) -> tuple[bool, bool]:
    """
    Send OTP via Fast2SMS.
    Returns (success, sent_via_sms)
      success      = True always (OTP stored in DB, console fallback)
      sent_via_sms = True only if real SMS was delivered
    """
    api_key = _get_api_key()
    clean   = _clean_phone(phone)

    def _console_fallback():
        print("\n" + "=" * 50)
        print(f"  [OTP FALLBACK] +91{clean}")
        print(f"  CODE: {otp}")
        print("=" * 50 + "\n")

    # ── No API key → console only ─────────────────────
    if not api_key:
        _console_fallback()
        return True, False

    # ── Try Fast2SMS ──────────────────────────────────
    url     = "https://www.fast2sms.com/dev/bulkV2"
    headers = {"authorization": api_key, "Content-Type": "application/json"}
    payload = {"variables_values": otp, "route": "otp", "numbers": clean}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload, headers=headers)
            data = resp.json()
            print(f"[Fast2SMS] {resp.status_code}: {data}")

            if data.get("return") is True:
                print(f"[Fast2SMS] ✓ SMS sent to +91{clean}")
                return True, True

    except Exception as e:
        print(f"[Fast2SMS] Error: {e}")

    # ── SMS failed → fall back to console ─────────────
    print("[Fast2SMS] SMS not sent — falling back to console:")
    _console_fallback()
    return True, False   # Still return True so OTP flow continues


def generate_otp(length: int = 6) -> str:
    return "".join([str(secrets.randbelow(10)) for _ in range(length)])
