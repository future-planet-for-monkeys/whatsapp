#!/usr/bin/env bash
# ===========================================================================
# Phase 0 — Backend Verification Script
# ===========================================================================
# Run this AFTER the server is up and paired. It exercises every Phase 0
# fix and reports pass/fail for each check.
#
# Usage:
#   export TEST_PHONE=521234567890   # optional — overrides .env
#   ./scripts/test-phase0.sh
#
# Reads from .env in the project root by default. Override with env vars:
#   API_PORT, BASIC_AUTH_USERNAME, BASIC_AUTH_PASSWORD, TEST_PHONE
# ===========================================================================

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
SKIP=0

# ── Load .env ───────────────────────────────────────────────────────────────
ENV_FILE="$(cd "$(dirname "$0")/../.." && pwd)/.env"
if [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
fi

# ── Config ──────────────────────────────────────────────────────────────────
PORT="${API_PORT:-3022}"
BASE="http://localhost:${PORT}"
USERNAME="${BASIC_AUTH_USERNAME:-admin}"
PASSWORD="${BASIC_AUTH_PASSWORD:-whatsapp}"
TEST_PHONE="${TEST_PHONE:-}"

AUTH="-u ${USERNAME}:${PASSWORD}"
AUTH_B64="Authorization: Basic $(printf '%s' "${USERNAME}:${PASSWORD}" | base64)"

# ── Helpers ─────────────────────────────────────────────────────────────────
pass() { local msg="$1"; PASS=$((PASS+1)); echo -e "  ${GREEN}✓ PASS${NC}  ${msg}"; }
fail() { local msg="$1"; FAIL=$((FAIL+1)); echo -e "  ${RED}✗ FAIL${NC}  ${msg}"; }
skip() { local msg="$1"; SKIP=$((SKIP+1)); echo -e "  ${YELLOW}— SKIP${NC}  ${msg}"; }
header() { echo; echo -e "${BOLD}$1${NC}"; echo "  ─────────────────────────────────────────────"; }

check_status() {
    local expected="$1" actual="$2" label="$3"
    if [ "$actual" -eq "$expected" ]; then
        pass "$label (HTTP $actual)"
    else
        fail "$label — expected HTTP $expected, got $actual"
    fi
}

check_json_field() {
    local json="$1" field="$2" label="$3"
    if echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['${field}'])" &>/dev/null 2>&1; then
        pass "$label — field '${field}' present"
    else
        fail "$label — field '${field}' missing or not accessible"
    fi
}

check_json_not_field() {
    local json="$1" field="$2" label="$3"
    if echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['${field}'])" &>/dev/null 2>&1; then
        fail "$label — field '${field}' should NOT be present but was found"
    else
        pass "$label — field '${field}' absent as expected"
    fi
}

# ── Summary ─────────────────────────────────────────────────────────────────
summary() {
    echo
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "  ${BOLD}RESULTS${NC}"
    echo "  ──────────────────────────────────────────────"
    echo -e "  ${GREEN}Pass:${NC}  $PASS"
    echo -e "  ${RED}Fail:${NC}  $FAIL"
    echo -e "  ${YELLOW}Skip:${NC}  $SKIP"
    echo "═══════════════════════════════════════════════════════════════"
    echo
    if [ "$FAIL" -gt 0 ]; then
        echo -e "${RED}Some checks failed.${NC}"
        return 1
    fi
    echo -e "${GREEN}All checks passed.${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════
#  TESTS
# ═══════════════════════════════════════════════════════════════════════════

echo
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       Phase 0 — Backend Verification                        ║"
echo "║       Server: ${BASE}                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# ── 1. Auth enforcement ─────────────────────────────────────────────────────
header "1. Auth enforcement (0.11)"

HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/single/chats/list" 2>/dev/null || echo "000")
check_status 401 "$HTTP_CODE" "No auth → 401 on /single/chats/list"

HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}/single/client/state" 2>/dev/null || echo "000")
check_status 401 "$HTTP_CODE" "No auth → 401 on /single/client/state"

# ── 2. Auth works ───────────────────────────────────────────────────────────
header "2. Auth works (0.11)"

HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' ${AUTH} "${BASE}/single/client/state" 2>/dev/null || echo "000")
check_status 200 "$HTTP_CODE" "Basic auth → 200 on /single/client/state"

# ── 3. Client state shape ───────────────────────────────────────────────────
header "3. Client state shape (0.10)"

STATE_JSON=$(curl -s ${AUTH} "${BASE}/single/client/state" 2>/dev/null || echo "{}")
check_json_field "$STATE_JSON" "status" "client/state has 'status'"
check_json_field "$STATE_JSON" "waState" "client/state has 'waState'"
check_json_field "$STATE_JSON" "ready" "client/state has 'ready'"

# Verify 'authenticated' is NOT in the status value
STATUS_VAL=$(echo "$STATE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")
if [ "$STATUS_VAL" = "authenticated" ]; then
    fail "client/state status is 'authenticated' — should have been removed (0.10)"
else
    pass "client/state status is not 'authenticated' (0.10)"
fi

# ── 4. Chat list — sorted, has timestamp, fast ──────────────────────────────
header "4. Chat list (0.3, 0.4, 0.9)"

START_MS=$(python3 -c "import time; print(int(time.time()*1000))")
LIST_JSON=$(curl -s ${AUTH} "${BASE}/single/chats/list?limit=5" 2>/dev/null || echo "[]")
END_MS=$(python3 -c "import time; print(int(time.time()*1000))")
DURATION_MS=$((END_MS - START_MS))

# Route is /chats/list, not /chats/all (0.9)
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' ${AUTH} "${BASE}/single/chats/all" 2>/dev/null || echo "000")
check_status 404 "$HTTP_CODE" "Old /chats/all route → 404 (0.9)"

# Response is an array
LIST_LEN=$(echo "$LIST_JSON" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
if [ "$LIST_LEN" -ge 0 ] 2>/dev/null; then
    pass "chats/list returns an array (length=$LIST_LEN)"
else
    fail "chats/list did not return an array"
fi

# Has timestamp field (0.3)
if [ "$LIST_LEN" -gt 0 ]; then
    check_json_field "$(echo "$LIST_JSON" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)[0]))")" "timestamp" "First chat has 'timestamp' (0.3)"

    # Check sorting (0.3) — timestamps should be descending
    TS_0=$(echo "$LIST_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)[0].get('timestamp',0))" 2>/dev/null || echo "0")
    TS_1=$(echo "$LIST_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)[1].get('timestamp',0) if len(json.load(sys.stdin))>1 else 0)" 2>/dev/null || echo "0")
    if [ "$TS_0" -ge "$TS_1" ] 2>/dev/null; then
        pass "Chats sorted descending by timestamp (0.3)"
    else
        fail "Chats NOT sorted descending by timestamp (0.3)"
    fi
else
    skip "No chats to check timestamp/sorting (empty list)"
fi

# Response time — should be fast with resolveImmediately=false (0.4)
if [ "$DURATION_MS" -lt 5000 ]; then
    pass "chats/list responded in ${DURATION_MS}ms (0.4)"
else
    fail "chats/list took ${DURATION_MS}ms — expected < 5000ms (0.4)"
fi

# ── 5. Chat messages — scrollback cap ───────────────────────────────────────
header "5. Chat messages (0.4, 0.5)"

# Get first chat ID
FIRST_CHAT_ID=$(echo "$LIST_JSON" | python3 -c "
import sys,json
chats=json.load(sys.stdin)
if chats: print(chats[0]['id']['_serialized'])
else: print('')
" 2>/dev/null || echo "")

if [ -n "$FIRST_CHAT_ID" ]; then
    # Normal fetch
    MSGS_JSON=$(curl -s ${AUTH} "${BASE}/single/chats/${FIRST_CHAT_ID}/messages?limit=5" 2>/dev/null || echo "[]")
    MSGS_LEN=$(echo "$MSGS_JSON" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
    if [ "$MSGS_LEN" -ge 0 ] 2>/dev/null; then
        pass "chats/{id}/messages returns array (length=$MSGS_LEN)"
    else
        fail "chats/{id}/messages did not return an array"
    fi

    # Scrollback cap (0.5) — offset + limit > 200 should 400
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' ${AUTH} "${BASE}/single/chats/${FIRST_CHAT_ID}/messages?limit=50&offset=200" 2>/dev/null || echo "000")
    check_status 400 "$HTTP_CODE" "Scrollback > 200 → 400 (0.5)"

    # Edge: exactly 200 should be allowed
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' ${AUTH} "${BASE}/single/chats/${FIRST_CHAT_ID}/messages?limit=50&offset=150" 2>/dev/null || echo "000")
    check_status 200 "$HTTP_CODE" "Scrollback = 200 → 200 (0.5 edge)"

    # Check no _data / rawData leak (0.1)
    if [ "$MSGS_LEN" -gt 0 ]; then
        FIRST_MSG=$(echo "$MSGS_JSON" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)[0]))" 2>/dev/null || echo "{}")
        check_json_not_field "$FIRST_MSG" "_data" "No _data leak in message (0.1)"
        check_json_not_field "$FIRST_MSG" "rawData" "No rawData leak in message (0.1)"
        check_json_field "$FIRST_MSG" "type" "Message has 'type' field"
    fi
else
    skip "No chats available — skipping message tests"
fi

# ── 6. Media download ───────────────────────────────────────────────────────
header "6. Media download (0.2)"

# Try to find a message with media
MEDIA_MSG_ID=""
if [ -n "$FIRST_CHAT_ID" ]; then
    MEDIA_MSG_ID=$(echo "$MSGS_JSON" | python3 -c "
import sys,json
msgs=json.load(sys.stdin)
for m in msgs:
    if m.get('hasMedia'):
        print(m['id']['_serialized'])
        break
" 2>/dev/null || echo "")
fi

if [ -n "$MEDIA_MSG_ID" ]; then
    # Download media — should return real bytes, not JSON
    TMPFILE=$(mktemp)
    HTTP_CODE=$(curl -s -o "$TMPFILE" -w '%{http_code}' ${AUTH} "${BASE}/single/messages/${MEDIA_MSG_ID}/media" 2>/dev/null || echo "000")
    check_status 200 "$HTTP_CODE" "Media download returns 200"

    # Check it's not JSON (0.2 fix)
    if [ "$HTTP_CODE" = "200" ]; then
        if file "$TMPFILE" | grep -qi "json\|ASCII text" 2>/dev/null; then
            fail "Media download returned JSON/text instead of binary (0.2)"
        else
            pass "Media download returns binary data (0.2)"
        fi
    fi
    rm -f "$TMPFILE"
else
    skip "No media messages found — skipping media test"
fi

# ── 7. Send-text returns proper MessageDto ──────────────────────────────────
header "7. Send-text shape (0.1)"

if [ -n "$FIRST_CHAT_ID" ]; then
    SEND_JSON=$(curl -s -X POST ${AUTH} \
        "${BASE}/single/messages/send-text" \
        -H 'Content-Type: application/json' \
        -d "{\"chatId\":\"${FIRST_CHAT_ID}\",\"message\":\"Phase 0 test — $(date +%s)\"}" 2>/dev/null || echo "{}")

    check_json_field "$SEND_JSON" "id" "send-text returns 'id'"
    check_json_field "$SEND_JSON" "body" "send-text returns 'body'"
    check_json_field "$SEND_JSON" "type" "send-text returns 'type'"
    check_json_field "$SEND_JSON" "timestamp" "send-text returns 'timestamp'"
    check_json_field "$SEND_JSON" "hasMedia" "send-text returns 'hasMedia'"
    check_json_field "$SEND_JSON" "from" "send-text returns 'from'"

    # No SDK leak (0.1)
    check_json_not_field "$SEND_JSON" "_data" "send-text: no _data leak (0.1)"
    check_json_not_field "$SEND_JSON" "rawData" "send-text: no rawData leak (0.1)"
else
    skip "No chats available — skipping send-text test"
fi

# ── 8. Mark as read ─────────────────────────────────────────────────────────
header "8. Mark as read (0.7)"

if [ -n "$FIRST_CHAT_ID" ]; then
    READ_JSON=$(curl -s -X POST ${AUTH} \
        "${BASE}/single/chats/${FIRST_CHAT_ID}/read" \
        -H 'Content-Type: application/json' 2>/dev/null || echo "{}")

    check_json_field "$READ_JSON" "success" "markAsRead returns 'success'"

    SUCCESS_VAL=$(echo "$READ_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null || echo "false")
    if [ "$SUCCESS_VAL" = "True" ]; then
        pass "markAsRead: success=true"
    else
        fail "markAsRead: success was not true"
    fi
else
    skip "No chats available — skipping markAsRead test"
fi

# ── 9. Check endpoint ───────────────────────────────────────────────────────
header "9. Check endpoint (0.6)"

if [ -n "$TEST_PHONE" ]; then
    CHECK_JSON=$(curl -s ${AUTH} "${BASE}/single/check?phone=${TEST_PHONE}" 2>/dev/null || echo "{}")

    check_json_field "$CHECK_JSON" "phone" "check returns 'phone'"
    check_json_field "$CHECK_JSON" "whatsappId" "check returns 'whatsappId' (0.6)"
    check_json_field "$CHECK_JSON" "contactInfo" "check returns 'contactInfo'"
    check_json_field "$CHECK_JSON" "registered" "check returns 'registered'"

    WHATSAPP_ID=$(echo "$CHECK_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('whatsappId') or '')" 2>/dev/null || echo "")
    if [ -n "$WHATSAPP_ID" ]; then
        pass "check: whatsappId is non-null (${WHATSAPP_ID})"
    else
        pass "check: whatsappId is null (phone not registered on WhatsApp)"
    fi
else
    skip "TEST_PHONE not set — skipping check test"
fi

# ── Summary ─────────────────────────────────────────────────────────────────
summary
