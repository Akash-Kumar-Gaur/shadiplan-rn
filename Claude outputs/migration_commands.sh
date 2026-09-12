#!/bin/bash

# ShadiPlan Migration Commands - Reference Sheet
#
# Copy-paste ready commands for each phase of migration
# Replace placeholders with your actual credentials

# ============================================
# PHASE 0: BACKUP & VERIFY
# ============================================

# 1. Set up environment variables
export SUPABASE_URL="postgresql://postgres:[PASSWORD]@db.supabase.co/postgres"
export NEON_URL="postgresql://[USERNAME]:[PASSWORD]@ep-xxxxx.neon.tech/neondb"

# Verify connection
echo "Testing Supabase connection..."
psql "$SUPABASE_URL" -c "SELECT version();"

echo "Testing Neon connection..."
psql "$NEON_URL" -c "SELECT version();"

# 2. Full database backup (with data)
echo "Exporting full Supabase database..."
pg_dump "$SUPABASE_URL" \
  --format=custom \
  --file=shadiplan_full_backup.dump \
  --verbose \
  --no-privileges \
  --no-owner

echo "Backup created: shadiplan_full_backup.dump"
ls -lh shadiplan_full_backup.dump

# 3. Schema-only backup (for reference)
echo "Exporting schema only..."
pg_dump "$SUPABASE_URL" \
  --schema-only \
  --file=shadiplan_schema.sql

# 4. Verify both users' data
echo ""
echo "Verifying user data in Supabase..."
psql "$SUPABASE_URL" -c "
SELECT
  u.id,
  u.email,
  COUNT(DISTINCT w.id) as wedding_count,
  COUNT(DISTINCT g.id) as guest_count
FROM auth.users u
LEFT JOIN weddings w ON w.user_id = u.id
LEFT JOIN guests g ON g.wedding_id = w.id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email
ORDER BY u.created_at;
"

# ============================================
# PHASE 1: SET UP NEON
# ============================================

# 1. Create Neon database from backup
echo "Restoring database to Neon..."
pg_restore -d "$NEON_URL" \
  --verbose \
  --no-privileges \
  --no-owner \
  shadiplan_full_backup.dump

# If restore fails due to constraints, try without them
# pg_restore -d "$NEON_URL" \
#   --no-privileges \
#   --no-owner \
#   --disable-triggers \
#   shadiplan_full_backup.dump

echo "Restore complete!"

# ============================================
# PHASE 2: VERIFY DATA INTEGRITY
# ============================================

# Run the verification script
chmod +x verify_migration.sh
export SUPABASE_URL="postgresql://..."
export NEON_URL="postgresql://..."
./verify_migration.sh

# Manual count comparison (if script fails)
echo "Comparing record counts..."

echo "=== USERS ==="
echo "Supabase:"
psql "$SUPABASE_URL" -t -c "SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL;"
echo "Neon:"
psql "$NEON_URL" -t -c "SELECT COUNT(*) FROM auth.users;"

echo "=== WEDDINGS ==="
echo "Supabase:"
psql "$SUPABASE_URL" -t -c "SELECT COUNT(*) FROM weddings;"
echo "Neon:"
psql "$NEON_URL" -t -c "SELECT COUNT(*) FROM weddings;"

echo "=== GUESTS ==="
echo "Supabase:"
psql "$SUPABASE_URL" -t -c "SELECT COUNT(*) FROM guests;"
echo "Neon:"
psql "$NEON_URL" -t -c "SELECT COUNT(*) FROM guests;"

echo "=== TASKS ==="
echo "Supabase:"
psql "$SUPABASE_URL" -t -c "SELECT COUNT(*) FROM tasks;"
echo "Neon:"
psql "$NEON_URL" -t -c "SELECT COUNT(*) FROM tasks;"

# ============================================
# PHASE 3-4: DUAL-WRITE DEPLOYMENT
# ============================================

# Update .env with Neon URL
# EXPO_PUBLIC_NEON_DATABASE_URL=postgresql://...
# EXPO_PUBLIC_USE_NEON=false (initially)

# Deploy to production (dual-write with Supabase primary)
npm run deploy

# Monitor logs during dual-write phase
# tail -f /var/log/shadiplan.log

# After 7+ days with no errors, proceed to Phase 5

# ============================================
# PHASE 5: GRADUAL CUTOVER
# ============================================

# Day 1-3: 10% of reads from Neon
EXPO_PUBLIC_USE_NEON=false
EXPO_PUBLIC_NEON_TRAFFIC_PERCENTAGE=10
npm run deploy

# Monitor for 3 days, check logs for errors
# If zero errors, proceed

# Day 4-7: 50% of reads from Neon
EXPO_PUBLIC_NEON_TRAFFIC_PERCENTAGE=50
npm run deploy

# Monitor for 3 days

# Day 8-14: 100% of reads from Neon (but still shadow writes)
EXPO_PUBLIC_USE_NEON=false  # Still shadow writing to Supabase
EXPO_PUBLIC_NEON_TRAFFIC_PERCENTAGE=100
npm run deploy

# ============================================
# PHASE 6: FINAL CUTOVER
# ============================================

# Stop shadow writes, switch to Neon only
EXPO_PUBLIC_USE_NEON=true
npm run deploy

# Monitor heavily for 24 hours
# If issue found, rollback immediately

# ============================================
# PHASE 7: CLEANUP (2+ weeks later)
# ============================================

# Final backup from Neon (archival)
echo "Creating final archive backup..."
pg_dump "$NEON_URL" \
  --format=custom \
  --file=shadiplan_neon_final.dump

# Store this archive in cold storage (Google Drive, HDD, etc)
# Then you can safely delete Supabase project

# Remove dual-write code from codebase
# Remove feature flags
# Update documentation

echo "Migration complete! ✅"

# ============================================
# EMERGENCY ROLLBACK
# ============================================

# If critical issue found at any point:

# Instant app rollback
git revert [LAST_COMMIT_HASH]
EXPO_PUBLIC_USE_NEON=false
npm run deploy

# Takes ~2 minutes, all traffic goes back to Supabase
# Investigate issue in development
# Test thoroughly before trying again

# ============================================
# USEFUL QUERIES
# ============================================

# List all tables
psql "$SUPABASE_URL" -c "\dt"

# List RLS policies
psql "$SUPABASE_URL" -c "
SELECT * FROM pg_policies;
"

# Check table sizes
psql "$SUPABASE_URL" -c "
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Check connections/locks
psql "$SUPABASE_URL" -c "
SELECT pid, usename, application_name, state
FROM pg_stat_activity;
"

# ============================================
# TROUBLESHOOTING
# ============================================

# If pg_restore fails with "already exists" errors
# Use --clean flag to drop existing objects first
pg_restore -d "$NEON_URL" \
  --clean \
  --if-exists \
  --no-privileges \
  --no-owner \
  shadiplan_full_backup.dump

# If restore is slow, check Neon logs
# https://console.neon.tech → Project → Monitoring

# If data looks different between Supabase and Neon
# Check for triggers or functions that might be missing
psql "$SUPABASE_URL" -c "\df" > supabase_functions.txt
psql "$NEON_URL" -c "\df" > neon_functions.txt
diff supabase_functions.txt neon_functions.txt

# If RLS policies not working
# Verify auth.uid() function exists
psql "$NEON_URL" -c "SELECT * FROM auth.uid();"

# If storage bucket missing
psql "$NEON_URL" -c "SELECT * FROM storage.buckets;"
# Should see 'vendor-documents' bucket

echo "For more help, see SHADIPLAN_MIGRATION_GUIDE.md"
