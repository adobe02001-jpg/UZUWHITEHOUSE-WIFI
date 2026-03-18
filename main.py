"""
GhanaHotspot Backend — Screenshot Verification Edition
UZU-HOSTEL · Built by CyberGuy

Flow:
  1. Customer picks package → portal shows hostel MoMo number + exact amount
  2. Customer pays on phone, screenshots the success screen
  3. POST /api/verify-screenshot → Claude Vision reads amount/ref/date/recipient/status
  4. Server checks: correct amount? fresh date? reference unused? correct recipient?
  5. All pass → voucher assigned → MikroTik user created → login code returned

Bugs fixed vs v3.0:
  - get_db_session() added to database.py and imported here
  - Background task now uses its own DB session (request session closes before task runs)
  - ORM objects no longer passed to background task (DetachedInstanceError fix)
  - Union type annotation `str | None` replaced with Optional[str] for Python 3.9 compat
  - MIME detection improved: checks JPEG magic bytes (\\xff\\xd8) as well as PNG
  - Empty file check added (0-byte upload)
  - Single atomic db.commit() covers transaction + voucher + audit log
"""

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import logging
from datetime import datetime, timedelta

from database import get_db, get_db_session, SessionLocal
from models import Transaction, Voucher, HotspotUser, AuditLog
from mikrotik import MikroTikAPI
from config import settings
from verify_screenshot import extract_payment_details, verify_payment
import redis.asyncio as aioredis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="GhanaHotspot API — UZU-HOSTEL", version="3.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # lock to your domain in production
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

redis_client: aioredis.Redis = None


@app.on_event("startup")
async def startup():
    global redis_client
    redis_client = aioredis.from_url(settings.REDIS_URL)


@app.on_event("shutdown")
async def shutdown():
    await redis_client.close()


# ─────────────────────────────────────────────────────────
# PACKAGES
# ─────────────────────────────────────────────────────────
PACKAGES = {
    "3gb": {
        "label":            "3GB — 7 Days",
        "data_mb":          3072,
        "price":            5.00,
        "validity_days":    7,
        "mikrotik_profile": "3gb-7day",
    },
    "6gb": {
        "label":            "6GB — 14 Days",
        "data_mb":          6144,
        "price":            9.00,
        "validity_days":    14,
        "mikrotik_profile": "6gb-14day",
    },
    "unlimited": {
        "label":            "Unlimited — 30 Days",
        "data_mb":          None,
        "price":            40.00,
        "validity_days":    30,
        "mikrotik_profile": "unlimited-30day",
    },
}

MAX_RECEIPT_AGE_MINUTES = 120    # reject receipts older than 2 hours


# ─────────────────────────────────────────────────────────
# RATE LIMITER — max 5 screenshot uploads per phone per 10 min
# ─────────────────────────────────────────────────────────
async def check_rate_limit(phone: str) -> None:
    key   = f"ratelimit:screenshot:{phone}"
    count = await redis_client.incr(key)
    if count == 1:
        await redis_client.expire(key, 600)
    if count > 5:
        ttl = await redis_client.ttl(key)
        raise HTTPException(
            status_code=429,
            detail=f"Too many attempts. Try again in {ttl // 60}m {ttl % 60}s."
        )


# ─────────────────────────────────────────────────────────
# ENDPOINT: GET /api/payment-info
# ─────────────────────────────────────────────────────────
@app.get("/api/payment-info")
async def payment_info(package_id: str):
    pkg = PACKAGES.get(package_id)
    if not pkg:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid package. Choose: {list(PACKAGES)}"
        )
    return {
        "package":        pkg["label"],
        "amount":         pkg["price"],
        "send_to_name":   settings.HOSTEL_MOMO_NAME,
        "send_to_number": settings.HOSTEL_MOMO_NUMBER,
    }


# ─────────────────────────────────────────────────────────
# ENDPOINT: POST /api/verify-screenshot
# ─────────────────────────────────────────────────────────
@app.post("/api/verify-screenshot")
async def verify_screenshot_endpoint(
    request:          Request,
    background_tasks: BackgroundTasks,
    phone:            str        = Form(...),
    package_id:       str        = Form(...),
    screenshot:       UploadFile = File(...),
    db: SessionLocal  = Depends(get_db),
):
    # ── Input validation ──────────────────────────────────
    phone = phone.strip().replace(" ", "")
    if not (phone.startswith("0") and len(phone) == 10 and phone.isdigit()):
        raise HTTPException(
            status_code=400,
            detail="Invalid phone number. Must be 10 digits starting with 0 (e.g. 0208033850)"
        )

    pkg = PACKAGES.get(package_id)
    if not pkg:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid package. Choose: {list(PACKAGES)}"
        )

    await check_rate_limit(phone)

    # ── Read and validate image ───────────────────────────
    image_bytes = await screenshot.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file received. Please try again.")

    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Screenshot too large. Max 10 MB.")

    # Detect MIME from magic bytes — never trust the browser-reported Content-Type
    ctype = _detect_mime(image_bytes, screenshot.content_type)
    if ctype is None:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Please upload a JPG, PNG, or WebP screenshot."
        )

    logger.info(f"Screenshot: phone={phone} pkg={package_id} size={len(image_bytes)} mime={ctype}")

    # ── 1. Claude Vision reads the screenshot ─────────────
    extracted = await extract_payment_details(
        image_bytes       = image_bytes,
        image_mimetype    = ctype,
        anthropic_api_key = settings.ANTHROPIC_API_KEY,
    )
    logger.info(f"Extracted: {extracted}")

    # ── 2. Business rules ─────────────────────────────────
    check = verify_payment(
        extracted            = extracted,
        expected_amount      = pkg["price"],
        hostel_momo_name     = settings.HOSTEL_MOMO_NAME,
        max_age_minutes      = MAX_RECEIPT_AGE_MINUTES,
        hostel_momo_numbers  = (settings.HOSTEL_MOMO_NUMBER, settings.HOSTEL_MOMO_NUMBER2),
    )

    if not check["ok"]:
        db.add(AuditLog(
            event     = "screenshot_rejected",
            reference = extracted.get("reference"),
            ip        = request.client.host,
            details   = (
                f"Phone:{phone} Pkg:{package_id} "
                f"Reason:{check['reason']} "
                f"Raw:{str(extracted.get('raw_text', ''))[:300]}"
            ),
        ))
        db.commit()
        raise HTTPException(status_code=422, detail=check["reason"])

    # ── 3. Receipt reference must never have been used before ──
    ref_on_receipt = extracted["reference"]
    if db.query(Transaction).filter(Transaction.reference == ref_on_receipt).first():
        raise HTTPException(
            status_code=409,
            detail=(
                f"Receipt ref '{ref_on_receipt}' has already been used. "
                "Each MoMo payment can only be redeemed once."
            ),
        )

    # ── 4. Claim a voucher (row-level lock stops double-assignment) ──
    voucher = (
        db.query(Voucher)
        .filter(
            Voucher.package_id      == package_id,
            Voucher.assigned_to_ref == None,
            Voucher.expired         == False,
        )
        .with_for_update(skip_locked=True)
        .first()
    )
    if not voucher:
        raise HTTPException(
            status_code=409,
            detail="This package is currently sold out. Visit Room 57, 4th Floor for assistance."
        )

    # ── 5–6. Write transaction + assign voucher + audit in one commit ──
    db.add(Transaction(
        reference    = ref_on_receipt,
        phone        = phone,
        network      = extracted.get("network") or "unknown",
        package_id   = package_id,
        amount       = extracted["amount"],
        mac_address  = None,
        status       = "success",
        ip_address   = request.client.host,
        created_at   = datetime.utcnow(),
    ))
    db.flush()   # write transaction row so voucher FK can resolve

    voucher.assigned_to_ref = ref_on_receipt
    voucher.assigned_at     = datetime.utcnow()
    voucher.assigned_phone  = phone

    db.add(AuditLog(
        event     = "screenshot_approved",
        reference = ref_on_receipt,
        ip        = request.client.host,
        details   = (
            f"Phone:{phone} Pkg:{package_id} Amount:{extracted['amount']} "
            f"Voucher:{voucher.username} Date:{extracted.get('date_str')} "
            f"Network:{extracted.get('network')}"
        ),
    ))

    db.commit()   # atomic: transaction + voucher assignment + audit log

    logger.info(
        f"Voucher {voucher.username}/{voucher.pin} → {phone} (ref: {ref_on_receipt})"
    )

    # ── 7. MikroTik provisioning in background ────────────
    # Pass plain primitive values — NOT ORM objects or the request-scoped db.
    # The request session closes when the response is sent; the background
    # task opens its own fresh session via get_db_session().
    background_tasks.add_task(
        provision_mikrotik,
        username     = voucher.username,
        pin          = voucher.pin,
        phone        = phone,
        package_id   = package_id,
        tx_reference = ref_on_receipt,
    )

    expiry = (datetime.utcnow() + timedelta(days=pkg["validity_days"])).strftime("%d %b %Y")

    return {
        "status":       "success",
        "voucher_code": {
            "username": voucher.username,
            "pin":      voucher.pin,
        },
        "package":  pkg["label"],
        "expiry":   expiry,
        "phone":    phone,
        "receipt": {
            "reference": ref_on_receipt,
            "amount":    extracted["amount"],
            "date":      extracted.get("date_str"),
            "network":   extracted.get("network"),
        },
    }


# ─────────────────────────────────────────────────────────
# BACKGROUND: MikroTik provisioning
# Uses its own DB session — request session is already closed
# ─────────────────────────────────────────────────────────
async def provision_mikrotik(
    username:     str,
    pin:          str,
    phone:        str,
    package_id:   str,
    tx_reference: str,
) -> None:
    pkg       = PACKAGES[package_id]
    expiry_dt = datetime.utcnow() + timedelta(days=pkg["validity_days"])

    db = get_db_session()   # fresh session — never reuse the request-scoped one
    try:
        mikrotik = MikroTikAPI(
            host     = settings.MIKROTIK_HOST,
            username = settings.MIKROTIK_USER,
            password = settings.MIKROTIK_PASS,
        )

        await mikrotik.create_hotspot_user(
            username          = username,
            password          = pin,
            mac_address       = "",     # no MAC binding — code-based login
            profile           = pkg["mikrotik_profile"],
            comment           = f"Phone:{phone} Ref:{tx_reference}",
            limit_uptime      = f"{pkg['validity_days']}d",
            limit_bytes_total = (
                pkg["data_mb"] * 1024 * 1024
                if pkg["data_mb"] else None
            ),
        )

        # Mark voucher provisioned
        v = db.query(Voucher).filter(Voucher.username == username).first()
        if v:
            v.provisioned = True

        # Record for admin panel + expiry cron
        db.add(HotspotUser(
            username        = username,
            mac_address     = None,
            phone           = phone,
            package_id      = package_id,
            transaction_ref = tx_reference,
            is_active       = True,
            expires_at      = expiry_dt,
        ))
        db.commit()
        logger.info(f"MikroTik provisioned: {username} | expires {expiry_dt:%d %b %Y}")

    except Exception as e:
        logger.error(f"MikroTik provision FAILED for {tx_reference}: {e}")
        db.rollback()
        # TODO: trigger WhatsApp/SMS admin alert here
    finally:
        db.close()


# ─────────────────────────────────────────────────────────
# CRON: /internal/run-expiry-check (hourly systemd timer)
# nginx restricts /internal/* to 127.0.0.1 only
# ─────────────────────────────────────────────────────────
@app.post("/internal/run-expiry-check")
async def run_expiry_check(db: SessionLocal = Depends(get_db)):
    now     = datetime.utcnow()
    expired = (
        db.query(HotspotUser)
        .filter(HotspotUser.expires_at < now, HotspotUser.is_active == True)
        .all()
    )

    mikrotik = MikroTikAPI(
        host     = settings.MIKROTIK_HOST,
        username = settings.MIKROTIK_USER,
        password = settings.MIKROTIK_PASS,
    )

    count = 0
    for user in expired:
        try:
            await mikrotik.delete_hotspot_user(user.username)
            user.is_active = False
            v = db.query(Voucher).filter(Voucher.username == user.username).first()
            if v:
                v.expired = True
            count += 1
        except Exception as e:
            logger.error(f"Expiry failed for {user.username}: {e}")

    db.commit()
    logger.info(f"Expiry check: {count} users removed")
    return {"expired_count": count}


# ─────────────────────────────────────────────────────────
# ADMIN: GET /internal/voucher-stock
# ─────────────────────────────────────────────────────────
@app.get("/internal/voucher-stock")
async def voucher_stock(db: SessionLocal = Depends(get_db)):
    total     = db.query(Voucher).count()
    available = (
        db.query(Voucher)
        .filter(Voucher.assigned_to_ref == None, Voucher.expired == False)
        .count()
    )
    return {"total": total, "available": available, "used": total - available}


# ─────────────────────────────────────────────────────────
# MIME DETECTION — magic bytes, not browser Content-Type
# ─────────────────────────────────────────────────────────
def _detect_mime(data: bytes, content_type: Optional[str]) -> Optional[str]:
    if data[:4] == b'\x89PNG':
        return "image/png"
    if data[:2] == b'\xff\xd8':
        return "image/jpeg"
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return "image/webp"
    # Fall back to browser-reported type only for edge cases
    allowed = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
    ct = (content_type or "").lower()
    return ct if ct in allowed else None
