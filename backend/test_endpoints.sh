#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# FairLens API — Local Smoke Tests
# Run: chmod +x test_endpoints.sh && ./test_endpoints.sh
# Requires: curl, jq
# ─────────────────────────────────────────────────────────────────────────────

BASE_URL="http://localhost:8080"
DATASETS_DIR="../datasets"
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

assert_status() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" -eq "$expected" ]; then
    echo -e "${GREEN}✓ PASS${NC} — $label (HTTP $actual)"
    PASS=$((PASS+1))
  else
    echo -e "${RED}✗ FAIL${NC} — $label (expected HTTP $expected, got HTTP $actual)"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "═══════════════════════════════════════════════════"
echo "  FairLens API Smoke Tests"
echo "═══════════════════════════════════════════════════"
echo ""

# ── 1. Health check ───────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/7] Health check${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
assert_status "GET /health" 200 "$STATUS"
echo ""

# ── 2. Upload hiring CSV ──────────────────────────────────────────────────────
echo -e "${YELLOW}[2/7] Upload hiring_sample.csv${NC}"
UPLOAD_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/upload/" \
  -F "file=@${DATASETS_DIR}/hiring_sample.csv")
UPLOAD_BODY=$(echo "$UPLOAD_RESP" | head -n -1)
UPLOAD_STATUS=$(echo "$UPLOAD_RESP" | tail -n1)
assert_status "POST /api/upload (hiring)" 200 "$UPLOAD_STATUS"

SESSION_ID=$(echo "$UPLOAD_BODY" | jq -r '.session_id')
DETECTED_LABEL=$(echo "$UPLOAD_BODY" | jq -r '.meta.detected_label_column')
DETECTED_ATTRS=$(echo "$UPLOAD_BODY" | jq -r '.meta.detected_protected_attributes | join(", ")')
echo "  session_id       : $SESSION_ID"
echo "  detected label   : $DETECTED_LABEL"
echo "  detected attrs   : $DETECTED_ATTRS"
echo ""

# ── 3. Analyze hiring dataset ─────────────────────────────────────────────────
echo -e "${YELLOW}[3/7] Analyze hiring_sample.csv (gender + race)${NC}"
ANALYZE_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/analyze/" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"label_column\": \"hired\",
    \"protected_attributes\": [\"gender\", \"race\"],
    \"positive_label\": 1
  }")
ANALYZE_BODY=$(echo "$ANALYZE_RESP" | head -n -1)
ANALYZE_STATUS=$(echo "$ANALYZE_RESP" | tail -n1)
assert_status "POST /api/analyze (hiring)" 200 "$ANALYZE_STATUS"

OVERALL=$(echo "$ANALYZE_BODY" | jq -r '.overall_severity')
echo "  overall_severity : $OVERALL"
echo "$ANALYZE_BODY" | jq -r '.attribute_analyses[] | "  [\(.attribute)] severity=\(.severity)  DPD=\(.metrics[] | select(.name=="demographic_parity_difference") | .value)"'
echo ""

# ── 4. Upload loan CSV ────────────────────────────────────────────────────────
echo -e "${YELLOW}[4/7] Upload loan_approval_sample.csv${NC}"
LOAN_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/upload/" \
  -F "file=@${DATASETS_DIR}/loan_approval_sample.csv")
LOAN_STATUS=$(echo "$LOAN_RESP" | tail -n1)
LOAN_SESSION=$(echo "$LOAN_RESP" | head -n -1 | jq -r '.session_id')
assert_status "POST /api/upload (loan)" 200 "$LOAN_STATUS"
echo "  session_id : $LOAN_SESSION"
echo ""

# ── 5. Analyze loan dataset ───────────────────────────────────────────────────
echo -e "${YELLOW}[5/7] Analyze loan_approval_sample.csv (gender + race)${NC}"
LOAN_ANALYZE=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/analyze/" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$LOAN_SESSION\",
    \"label_column\": \"loan_approved\",
    \"protected_attributes\": [\"gender\", \"race\"],
    \"positive_label\": 1
  }")
LOAN_ANALYZE_STATUS=$(echo "$LOAN_ANALYZE" | tail -n1)
assert_status "POST /api/analyze (loan)" 200 "$LOAN_ANALYZE_STATUS"
echo "$LOAN_ANALYZE" | head -n -1 | jq -r '.attribute_analyses[] | "  [\(.attribute)] severity=\(.severity)  DIR=\(.metrics[] | select(.name=="disparate_impact_ratio") | .value)"'
echo ""

# ── 6. Upload medical CSV ─────────────────────────────────────────────────────
echo -e "${YELLOW}[6/7] Upload medical_diagnosis_sample.csv${NC}"
MED_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/api/upload/" \
  -F "file=@${DATASETS_DIR}/medical_diagnosis_sample.csv")
MED_STATUS=$(echo "$MED_RESP" | tail -n1)
MED_SESSION=$(echo "$MED_RESP" | head -n -1 | jq -r '.session_id')
assert_status "POST /api/upload (medical)" 200 "$MED_STATUS"
echo ""

# ── 7. Error handling — bad session ID ───────────────────────────────────────
echo -e "${YELLOW}[7/7] Error handling — invalid session_id${NC}"
ERR_RESP=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/api/analyze/" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"bad-id","label_column":"hired","protected_attributes":["gender"]}')
assert_status "POST /api/analyze (invalid session) → 404" 404 "$ERR_RESP"
echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════"
echo -e "  Results: ${GREEN}$PASS passed${NC} / ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════════"
echo ""
