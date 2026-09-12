#!/bin/bash

# ShadiPlan Migration Verification Script
#
# This script compares record counts between Supabase and Neon
# to verify data integrity during migration.
#
# Usage:
#   chmod +x verify_migration.sh
#   export SUPABASE_URL="postgresql://user:pass@db.supabase.co/postgres"
#   export NEON_URL="postgresql://user:pass@ep-xxxx.neon.tech/neondb"
#   ./verify_migration.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment variables
if [ -z "$SUPABASE_URL" ]; then
  echo -e "${RED}❌ Error: SUPABASE_URL not set${NC}"
  echo "Usage: export SUPABASE_URL='postgresql://...' && ./verify_migration.sh"
  exit 1
fi

if [ -z "$NEON_URL" ]; then
  echo -e "${RED}❌ Error: NEON_URL not set${NC}"
  echo "Usage: export NEON_URL='postgresql://...' && ./verify_migration.sh"
  exit 1
fi

echo -e "${YELLOW}Verifying ShadiPlan Migration${NC}"
echo "======================================"
echo ""

# Function to compare counts
compare_table() {
  local table=$1
  local where_clause=$2

  # Get Supabase count
  local supabase_count=$(psql "$SUPABASE_URL" -t -c "SELECT COUNT(*) FROM $table $where_clause;" 2>/dev/null || echo "ERROR")

  # Get Neon count
  local neon_count=$(psql "$NEON_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "ERROR")

  # Compare
  if [ "$supabase_count" = "$neon_count" ]; then
    echo -e "${GREEN}✅ $table${NC}: $supabase_count records"
  else
    echo -e "${RED}❌ $table${NC}: Supabase=$supabase_count, Neon=$neon_count (MISMATCH)"
  fi
}

# Core tables
echo -e "${YELLOW}Core Tables:${NC}"
compare_table "auth.users" "WHERE deleted_at IS NULL"
compare_table "weddings" ""
compare_table "guests" ""
compare_table "tasks" ""
compare_table "expenses" ""

# Feature tables
echo ""
echo -e "${YELLOW}Feature Tables:${NC}"
compare_table "vendor_candidates" ""
compare_table "vendor_candidate_files" ""
compare_table "emergency_contacts" ""
compare_table "event_songs" ""
compare_table "outfit_plans" ""
compare_table "gifts" ""
compare_table "invites" ""
compare_table "push_tokens" ""

# Storage tables
echo ""
echo -e "${YELLOW}Storage:${NC}"
compare_table "storage.objects" "WHERE bucket_id = 'vendor-documents'"

# Sample data comparison (first user)
echo ""
echo -e "${YELLOW}Sample Data Check (First User):${NC}"

echo ""
echo "Supabase first user:"
psql "$SUPABASE_URL" -t -c "SELECT id, email FROM auth.users WHERE deleted_at IS NULL LIMIT 1;" 2>/dev/null || echo "ERROR"

echo ""
echo "Neon first user:"
psql "$NEON_URL" -t -c "SELECT id, email FROM auth.users LIMIT 1;" 2>/dev/null || echo "ERROR"

# Final status
echo ""
echo "======================================"
echo -e "${GREEN}✅ Verification complete!${NC}"
echo ""
echo "If all counts match, data migration was successful."
echo "You can proceed with the dual-write phase."
