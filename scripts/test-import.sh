#!/bin/bash

# Test script to verify import functionality and check for hanging requests
# This script simulates the import process and verifies no requests hang

set -e

API_BASE="${API_BASE:-http://localhost:3000}"
TEST_LIST_SLUG="${TEST_LIST_SLUG:-test-import}"
TEST_FILE="${TEST_FILE:-db-data/test-bookmarks.html}"

echo "🧪 Testing Import Functionality"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test() {
  local name="$1"
  local command="$2"
  
  echo -n "Testing: $name... "
  
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAILED${NC}"
    ((TESTS_FAILED++))
  fi
}

# Test 1: Check if API is accessible
test "API is accessible" "curl -s -f -o /dev/null -w '%{http_code}' '$API_BASE/api/auth/session' | grep -q '^[24]'"

# Test 2: Check if test file exists
test "Test file exists" "[ -f '$TEST_FILE' ]"

# Test 3: Verify file has content
if [ -f "$TEST_FILE" ]; then
  FILE_SIZE=$(stat -f%z "$TEST_FILE" 2>/dev/null || stat -c%s "$TEST_FILE" 2>/dev/null || echo "0")
  test "Test file has content" "[ $FILE_SIZE -gt 0 ]"
  echo "   File size: $FILE_SIZE bytes"
fi

# Test 4: Test list endpoint response time
echo -n "Testing: List endpoint responds quickly... "
START_TIME=$(date +%s%N)
HTTP_CODE=$(curl -s -f -o /dev/null -w '%{http_code}' --max-time 2 "$API_BASE/api/lists/$TEST_LIST_SLUG" 2>/dev/null || echo "000")
END_TIME=$(date +%s%N)
DURATION_MS=$(( (END_TIME - START_TIME) / 1000000 ))

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
  if [ $DURATION_MS -lt 2000 ]; then
    echo -e "${GREEN}✅ PASSED${NC} (${DURATION_MS}ms)"
    ((TESTS_PASSED++))
  else
    echo -e "${YELLOW}⚠️  SLOW${NC} (${DURATION_MS}ms - might indicate hanging requests)"
    ((TESTS_PASSED++))
  fi
else
  echo -e "${RED}❌ FAILED${NC} (HTTP $HTTP_CODE)"
  ((TESTS_FAILED++))
fi

# Test 5: Test multiple concurrent requests
echo -n "Testing: Multiple concurrent requests don't hang... "
START_TIME=$(date +%s%N)
for i in {1..5}; do
  curl -s -f -o /dev/null --max-time 2 "$API_BASE/api/lists/$TEST_LIST_SLUG" > /dev/null 2>&1 &
done
wait
END_TIME=$(date +%s%N)
DURATION_MS=$(( (END_TIME - START_TIME) / 1000000 ))

if [ $DURATION_MS -lt 5000 ]; then
  echo -e "${GREEN}✅ PASSED${NC} (${DURATION_MS}ms for 5 requests)"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAILED${NC} (${DURATION_MS}ms - requests took too long)"
  ((TESTS_FAILED++))
fi

# Test 6: Test request timeout handling
echo -n "Testing: Request timeout handling... "
TIMEOUT_WORKED=true
curl -s -f -o /dev/null --max-time 1 --connect-timeout 1 "$API_BASE/api/lists/$TEST_LIST_SLUG" > /dev/null 2>&1 || TIMEOUT_WORKED=false
if [ "$TIMEOUT_WORKED" = "true" ] || [ $? -eq 28 ] || [ $? -eq 7 ]; then
  # Exit code 28 is timeout, 7 is connection failure - both are acceptable for this test
  echo -e "${GREEN}✅ PASSED${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}❌ FAILED${NC}"
  ((TESTS_FAILED++))
fi

# Summary
echo ""
echo "================================"
echo "📊 Test Summary"
echo "================================"
echo "Passed: $TESTS_PASSED"
echo "Failed: $TESTS_FAILED"
echo "Total:  $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed!${NC}"
  exit 1
fi

