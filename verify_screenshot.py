"""
verify_screenshot.py — UZU-HOSTEL GhanaHotspot
Uses Claude Vision to read a MoMo receipt screenshot and verify:
  amount_paid, reference, date_str, recipient, network, status
"""

import base64
import json
import httpx
import logging
import re
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL      = "claude-sonnet-4-6"


# ─────────────────────────────────────────────────────────
# 1. Claude Vision — extract payment fields from image
# ─────────────────────────────────────────────────────────

async def extract_payment_details(
    image_bytes:       bytes,
    image_mimetype:    str,
    anthropic_api_key: str,
) -> dict:
    """
    Sends the screenshot to Claude Vision.
    Returns:
    {
        "success":   bool,
        "amount":    float | None,
        "reference": str   | None,
        "date_str":  str   | None,
        "recipient": str   | None,
        "network":   str   | None,
        "status":    str   | None,   # "successful" | "failed" | …
        "raw_text":  str   | None,
        "error":     str   | None,
    }
    """
    b64_image = base64.standard_b64encode(image_bytes).decode("utf-8")

    prompt = (
        "You are a payment-receipt reader for a Ghanaian WiFi hotspot.\n\n"
        "The image is a MoMo (Mobile Money) payment screenshot from a phone in Ghana.\n\n"
        "Extract EXACTLY these 6 fields:\n"
        "1. amount_paid  — the amount sent (number only, e.g. 5.00)\n"
        "2. reference    — the unique transaction/receipt/reference ID on the screen\n"
        "3. date_str     — the full date and time exactly as shown (e.g. \"18/03/2026 14:32\")\n"
        "4. recipient    — name or number of who received the money\n"
        "5. network      — MTN, Telecel, AirtelTigo, or Vodafone\n"
        "6. status       — \"successful\" if the transaction succeeded, \"failed\" otherwise\n"
        "                  (look for: Successful, Completed, Paid, Sent, Approved, Failed, Pending)\n\n"
        "Reply with ONLY a valid JSON object — no markdown, no explanation:\n"
        "{\"amount_paid\":5.00,\"reference\":\"GHA-4521889\",\"date_str\":\"18/03/2026 14:32\","
        "\"recipient\":\"0241234567 Kwame\",\"network\":\"MTN\",\"status\":\"successful\"}\n\n"
        "Set any unreadable field to null.\n"
        "If the image is NOT a payment receipt, return: {\"error\":\"Not a payment receipt\"}"
    )

    headers = {
        "x-api-key":         anthropic_api_key,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
    }

    body = {
        "model":      CLAUDE_MODEL,
        "max_tokens": 256,   # receipt data is short; 256 is sufficient
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type":   "image",
                        "source": {
                            "type":       "base64",
                            "media_type": image_mimetype,
                            "data":       b64_image,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(ANTHROPIC_API_URL, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()

        raw_text = data["content"][0]["text"].strip()
        logger.info(f"Claude receipt raw response: {raw_text}")

        # Strip all markdown fence variants (```json … ```, ``` … ```, etc.)
        clean = re.sub(r"^```[a-zA-Z]*\s*", "", raw_text)
        clean = re.sub(r"\s*```$", "", clean).strip()

        parsed = json.loads(clean)

        if parsed.get("error"):
            return _failure(parsed["error"], raw_text)

        return {
            "success":   True,
            "amount":    _to_float(parsed.get("amount_paid")),
            "reference": _clean_str(parsed.get("reference")),
            "date_str":  _clean_str(parsed.get("date_str")),
            "recipient": _clean_str(parsed.get("recipient")),
            "network":   _clean_str(parsed.get("network")),
            "status":    _clean_str(parsed.get("status")),
            "raw_text":  raw_text,
            "error":     None,
        }

    except json.JSONDecodeError as e:
        logger.error(f"Claude returned non-JSON: {raw_text!r} — {e}")
        return _failure(f"AI could not parse receipt: {e}")
    except httpx.HTTPStatusError as e:
        logger.error(f"Anthropic API {e.response.status_code}: {e.response.text}")
        return _failure(f"AI service error ({e.response.status_code})")
    except Exception as e:
        logger.error(f"Screenshot extraction failed: {e}")
        return _failure(str(e))


def _failure(error_msg: str, raw_text: Optional[str] = None) -> dict:
    return {
        "success": False,
        "amount": None, "reference": None, "date_str": None,
        "recipient": None, "network": None, "status": None,
        "raw_text": raw_text, "error": error_msg,
    }


# ─────────────────────────────────────────────────────────
# 2. Business rule verification
# ─────────────────────────────────────────────────────────

# All status strings that mean "the money moved successfully"
VALID_STATUSES = frozenset({
    "successful", "success", "completed", "approved",
    "paid", "sent",
    "transaction successful", "payment successful",
    "transaction completed", "payment completed",
})


def verify_payment(
    extracted:        dict,
    expected_amount:  float,
    hostel_momo_name: str,
    max_age_minutes:  int = 120,
    hostel_momo_numbers: tuple = ("0208033850", "0598979254"),
) -> dict:
    """
    Applies all business rules in order.
    Returns {"ok": bool, "reason": str}.
    """

    # 0. Did Claude read the image at all?
    if not extracted.get("success"):
        msg = extracted.get("error") or "Could not read the screenshot."
        if "Not a payment receipt" in msg:
            return {"ok": False, "reason": (
                "The image doesn't look like a MoMo payment receipt. "
                "Please upload the success confirmation screen from your MoMo app."
            )}
        return {"ok": False, "reason": f"Could not read screenshot: {msg}. Please upload a clearer image."}

    # 1. Status must be successful
    status = (extracted.get("status") or "").lower().strip()
    if status not in VALID_STATUSES:
        friendly = extracted.get("status") or "unknown"
        return {"ok": False, "reason": (
            f"Receipt shows '{friendly}'. Only successful payments are accepted. "
            "Please upload the green success/confirmation screen from your MoMo app."
        )}

    # 2. Amount must match exactly (±1 pesewa tolerance for float precision)
    paid = extracted.get("amount")
    if paid is None:
        return {"ok": False, "reason": (
            "Could not read the payment amount. "
            "Please upload a screenshot where the amount is clearly visible."
        )}
    if abs(paid - expected_amount) > 0.01:
        return {"ok": False, "reason": (
            f"Receipt shows GH₵ {paid:.2f} but GH₵ {expected_amount:.2f} is required. "
            "Please send the exact amount and upload that receipt."
        )}

    # 3. Reference must be present (uniqueness is checked in DB by the caller)
    if not extracted.get("reference"):
        return {"ok": False, "reason": (
            "Could not read the transaction reference number. "
            "Make sure the full receipt screen is visible in the screenshot."
        )}

    # 4. Date must be recent (within max_age_minutes)
    date_str = extracted.get("date_str")
    if date_str:
        parsed_date = _parse_date(date_str)
        if parsed_date:
            # Ghana is UTC+0 all year (no DST)
            age = datetime.now(timezone.utc) - parsed_date.replace(tzinfo=timezone.utc)
            if age.total_seconds() < 0:
                return {"ok": False, "reason": "The receipt date is in the future. Please upload today's receipt."}
            if age.total_seconds() > max_age_minutes * 60:
                hours = int(age.total_seconds() // 3600)
                return {"ok": False, "reason": (
                    f"This receipt is {hours} hour(s) old. "
                    f"Only receipts from the last {max_age_minutes // 60} hours are accepted. "
                    "Please make a new payment."
                )}

    # 5. Recipient must match the hostel name OR either known MoMo number
    recipient    = (extracted.get("recipient") or "").lower()
    hostel_lower = hostel_momo_name.lower()

    if recipient:
        # Check full name match
        name_match   = hostel_lower in recipient
        # Check any of the known phone numbers appear in recipient string
        number_match = any(num in recipient for num in hostel_momo_numbers)
        # Check partial word match (catches "uzu", "hostel", etc.)
        word_match   = any(
            part in recipient
            for part in hostel_lower.split()
            if len(part) > 2
        )

        if not (name_match or number_match or word_match):
            return {"ok": False, "reason": (
                f"Payment was sent to '{extracted.get('recipient')}' "
                f"instead of '{hostel_momo_name}' "
                f"(0208033850 or 0598979254). "
                "Please send to the correct hostel number and upload that receipt."
            )}

    return {"ok": True, "reason": "Payment verified"}


# ─────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────

def _to_float(v) -> Optional[float]:
    """Strip all Ghanaian currency symbols and parse to float."""
    if v is None:
        return None
    cleaned = (
        str(v)
        .replace(",", "")
        .replace("GH₵", "").replace("GHC", "").replace("GH¢", "")
        .replace("GHS", "").replace("₵", "")
        .strip()
    )
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def _clean_str(v) -> Optional[str]:
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def _parse_date(date_str: str) -> Optional[datetime]:
    """Try all common Ghanaian MoMo date/time formats."""
    formats = [
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%d-%m-%Y %H:%M:%S",
        "%d-%m-%Y %H:%M",
        "%d-%m-%Y",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%d %b %Y %H:%M:%S",
        "%d %b %Y %H:%M",
        "%d %B %Y %H:%M",
        "%b %d, %Y %H:%M",
        "%b %d, %Y",
    ]
    clean = date_str.strip()
    for fmt in formats:
        try:
            return datetime.strptime(clean, fmt)
        except ValueError:
            continue
    return None
