# ═══════════════════════════════════════════════════════════════════
#  BL@CKN1TE-NXS-ULTRA · ENVIRONMENT CONFIG
#  The Incisive Tri-Hat Hacker
# ═══════════════════════════════════════════════════════════════════

# ══════════ SERVER ══════════
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Public URL (used for anti-sleep pings)
# Render:  https://your-app.onrender.com
# Railway: https://your-app.up.railway.app
# Local:   http://localhost:3000
APP_URL=http://localhost:3000

# ══════════ OWNER / AUTH ══════════
OWNER_SECRET=change_this_to_a_long_random_string
SESSION_SECRET=change_this_to_another_long_random_string

# Dashboard login credentials
PANEL_USER=blacknite
PANEL_PASS=ultra2026

# ══════════ WHATSAPP CHANNEL GATE ══════════
CHANNEL_JID=0029VbDubJNHbFV50Y6oiO3f
CHANNEL_URL=https://whatsapp.com/channel/0029VbDubJNHbFV50Y6oiO3f

# ══════════ AI · GROQ ══════════
# Groq is OpenAI-compatible — plugs into the `openai` npm package
OPENAI_API_KEY=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
AI_BASE_URL=https://api.groq.com/openai/v1

# Groq model — choose ONE (uncomment the one you want):
# Fastest (recommended for bots):
AI_MODEL=llama-3.1-8b-instant
# Smarter but slower:
# AI_MODEL=llama-3.3-70b-versatile
# Mixtral (good balance):
# AI_MODEL=mixtral-8x7b-32768
# Google Gemma 2 (fast, 8k context):
# AI_MODEL=gemma2-9b-it

# ══════════ BOT INFO ══════════
BOT_NAME=BL@CKN1TE-NXS
BOT_VERSION=V16-ULTRA
OWNER_NAME=BL@CKN1TE
OWNER_NUMBER=263714799483
OWNER_NUMBER_ALT=263780540231

# ══════════ MODE FLAGS ══════════
INFINITE_MODE=true
SILENT_RECONNECT=true
PROMAX_SPEED=true
LIFETIME_CONNECTION=true

# ══════════ PATHS ══════════
AUTH_DIR=./auth_info
DATA_DIR=./data
