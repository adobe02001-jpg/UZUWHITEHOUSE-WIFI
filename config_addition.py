# ────────────────────────────────────────────────────────
# Add these lines to your Settings class in config.py
# ────────────────────────────────────────────────────────

ANTHROPIC_API_KEY:   str         # from console.anthropic.com
HOSTEL_MOMO_NAME:    str = "UZU HOSTEL"   # name exactly as it appears on MoMo receipts
HOSTEL_MOMO_NUMBER:  str = "0208033850"   # primary MoMo number (shown on portal)
HOSTEL_MOMO_NUMBER2: str = "0598979254"   # secondary number (shown on portal)

# ────────────────────────────────────────────────────────
# Add these lines to your .env file
# ────────────────────────────────────────────────────────

# ANTHROPIC_API_KEY=sk-ant-...
# HOSTEL_MOMO_NAME=UZU HOSTEL
# HOSTEL_MOMO_NUMBER=0208033850
# HOSTEL_MOMO_NUMBER2=0598979254
# MIKROTIK_HOST=192.168.88.1
# MIKROTIK_USER=api_user
# MIKROTIK_PASS=your_password
# DATABASE_URL=postgresql://hotspot_admin:your_password@localhost/ghanahotspot
# REDIS_URL=redis://localhost:6379/0
# BASE_URL=https://your-server-ip-or-domain
