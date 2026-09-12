# ShadiPlan: Supabase → Neon Migration Guide

**Status:** 2 active users, ~3 weddings total  
**Risk Level:** LOW (small dataset, good backup approach)  
**Timeline:** 6-8 weeks with dual-write phase  
**Zero Downtime:** Yes (gradual cutover)

---

## Architecture Overview

**Current Stack:**
- **DB:** Supabase (PostgreSQL) with RLS policies
- **Auth:** Supabase Magic Link (OTP via email)
- **Storage:** Supabase Storage (vendor documents, photos)
- **Client:** React Native/Expo app
- **API Layer:** Direct Supabase queries via `supabase-js` client

**Key Tables Identified:**
- `weddings` (wedding events)
- `guests` (invitees)
- `tasks` (planning items)
- `expenses` / `wallet` (budget tracking)
- `vendor_candidates` + `vendor_candidate_files` (vendor management)
- `emergency_contacts` (emergency info)
- `event_songs` (music playlist)
- `outfit_plans` (clothing)
- `photo_album` + storage (wedding photos)
- `gifts` (gift registry)
- `invites` (invitation responses)
- `push_tokens` (notification tokens)
- `auth.users` (Supabase auth users)

**RLS Policies:**
- Using custom function `user_accessible_wedding_ids()` to control data access
- Private storage bucket: `vendor-documents`

---

## Phase 0: Pre-Migration Checklist ✅

### 1. Full Database Backup (3-way safety)

```bash
# Get your Supabase connection string
# From: Supabase Dashboard → Project Settings → Database → Connection string
SUPABASE_URL="postgresql://[user]:[password]@db.supabase.co/postgres"

# Export entire database
pg_dump "$SUPABASE_URL" \
  --format=custom \
  --file=shadiplan_full_backup.dump \
  --verbose

# Also export schema separately
pg_dump "$SUPABASE_URL" \
  --schema-only \
  --file=shadiplan_schema.sql

# Verify backup size
ls -lh shadiplan_*.dump shadiplan_*.sql
# Should be several MB if data exists
```

**Store in 3 places:**
1. ✅ Your laptop: `~/backups/shadiplan_full_backup.dump`
2. ✅ Google Drive: `/My Drive/Backups/shadiplan/`
3. ✅ External HDD/USB

---

### 2. Verify Both Users' Data Exists

```bash
# Login to Supabase and run this SQL:
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
```

**Expected output (example):**
```
id                                    | email              | wedding_count | guest_count
--------------------------------------|------------------|---------------|----------
550e8400-e29b-41d4-a716-446655440001 | user1@example.com |      1        |    45
550e8400-e29b-41d4-a716-446655440002 | user2@example.com |      2        |    78
```

**Write down these exact counts** — you'll verify again after migration.

---

### 3. Export Auth Users (Critical for RLS)

```bash
# Supabase CLI command (if installed)
supabase db pull

# Or manually SQL export from Supabase:
SELECT * FROM auth.users;
# Copy results to: shadiplan_auth_users.csv
```

---

## Phase 1: Set Up Neon PostgreSQL

### 1. Create Neon Account

1. Go to [console.neon.tech](https://console.neon.tech)
2. Sign up (free tier, no card required)
3. Create new project: `shadiplan` (or `shadiplan-staging` first)

### 2. Get Connection String

From Neon Dashboard:
```
postgresql://[username]:[password]@ep-xxxxx.neon.tech/neondb
```

**Save this as environment variable:**
```bash
export NEON_DATABASE_URL="postgresql://..."
```

### 3. Restore Database from Backup

```bash
# Restore full backup to Neon
pg_restore \
  --db "$NEON_DATABASE_URL" \
  --verbose \
  shadiplan_full_backup.dump

# This restores:
# ✅ All tables
# ✅ All data
# ✅ Schema + indexes
# ✅ Constraints
# ❌ Auth users (need separate handling)
```

**If restore fails:**
```bash
# Try without constraints first
pg_restore \
  --db "$NEON_DATABASE_URL" \
  --no-privileges \
  --no-owner \
  shadiplan_full_backup.dump
```

---

## Phase 2: Verify Data Integrity

### 1. Compare Record Counts

```bash
# Save this script as: verify_migration.sh
#!/bin/bash

SUPABASE_URL="postgresql://[user]:[pass]@db.supabase.co/postgres"
NEON_URL="$NEON_DATABASE_URL"

echo "=== USERS ==="
echo "Supabase:"
psql "$SUPABASE_URL" -t -c "SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL;"
echo "Neon:"
psql "$NEON_URL" -t -c "SELECT COUNT(*) FROM auth.users;"

echo -e "\n=== WEDDINGS ==="
echo "Supabase:"
psql "$SUPABASE_URL" -t -c "SELECT COUNT(*) FROM weddings;"
echo "Neon:"
psql "$NEON_URL" -t -c "SELECT COUNT(*) FROM weddings;"

echo -e "\n=== GUESTS ==="
echo "Supabase:"
psql "$SUPABASE_URL" -t -c "SELECT COUNT(*) FROM guests;"
echo "Neon:"
psql "$NEON_URL" -t -c "SELECT COUNT(*) FROM guests;"

echo -e "\n=== TASKS ==="
echo "Supabase:"
psql "$SUPABASE_URL" -t -c "SELECT COUNT(*) FROM tasks;"
echo "Neon:"
psql "$NEON_URL" -t -c "SELECT COUNT(*) FROM tasks;"

echo -e "\n=== STORAGE FILES ==="
echo "Supabase:"
psql "$SUPABASE_URL" -t -c "SELECT COUNT(*) FROM storage.objects;"
echo "Neon:"
psql "$NEON_URL" -t -c "SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'vendor-documents';"

echo -e "\n✅ If counts match, data migration is successful!"
```

```bash
chmod +x verify_migration.sh
./verify_migration.sh
```

**All counts must match exactly.** If not, investigate which table is different:
```bash
# Compare individual tables
psql "$NEON_URL" -t -c "SELECT * FROM weddings ORDER BY id LIMIT 3;" > neon_weddings.txt
psql "$SUPABASE_URL" -t -c "SELECT * FROM weddings ORDER BY id LIMIT 3;" > supabase_weddings.txt
diff neon_weddings.txt supabase_weddings.txt
```

---

## Phase 3: Dual-Write Implementation (1-2 weeks)

**Goal:** Run both systems simultaneously, write to both, read from Neon only.

### 1. Create a Dual Database Adapter

**File:** `src/lib/supabase-dual-write.ts`

```typescript
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pool } from "@neondatabase/serverless";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const neonUrl = process.env.EXPO_PUBLIC_NEON_DATABASE_URL; // Add this to .env

// Supabase client (original)
let supabaseClient: SupabaseClient | null = null;

// Neon client (new)
let neonPool: Pool | null = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isNeonConfigured = Boolean(neonUrl);

function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase not configured");
  }
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseClient;
}

function getNeonPool(): Pool {
  if (!isNeonConfigured) {
    throw new Error("Neon not configured");
  }
  if (!neonPool) {
    neonPool = new Pool({ connectionString: neonUrl! });
  }
  return neonPool;
}

// Shadow write helper (non-critical, logs errors but doesn't break)
async function shadowWrite(
  table: string,
  operation: "insert" | "update" | "delete",
  data: any
) {
  if (!isSupabaseConfigured) return; // Skip if Supabase not configured
  
  try {
    const supabase = getSupabaseClient();
    if (operation === "insert") {
      await supabase.from(table).insert(data);
    } else if (operation === "update") {
      await supabase.from(table).update(data.updates).eq("id", data.id);
    } else if (operation === "delete") {
      await supabase.from(table).delete().eq("id", data.id);
    }
  } catch (err) {
    // Non-fatal — just log, don't throw
    console.warn(`[SHADOW WRITE] ${table}.${operation} failed:`, err);
  }
}

export { shadowWrite };
```

### 2. Update Supabase Client to Read from Neon

**File:** `src/lib/supabase.ts` (modify existing file)

```typescript
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const useNeonBackend = process.env.EXPO_PUBLIC_USE_NEON === "true"; // Feature flag

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase not configured");
  }
  if (!client) {
    // Even if useNeonBackend=true, we still use Supabase client for auth
    // But we'll intercept queries to point to Neon backend if needed
    client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getClient();
    const value = Reflect.get(c, prop, c) as unknown;
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(c)
      : value;
  },
});

export { useNeonBackend };
```

### 3. Feature Flag in .env

**Update:** `.env`

```bash
# Existing
EXPO_PUBLIC_SUPABASE_URL=https://...supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key

# New (start with false)
EXPO_PUBLIC_NEON_DATABASE_URL=postgresql://...@neon.tech/neondb
EXPO_PUBLIC_USE_NEON=false  # Toggle to true for gradual cutover
```

---

## Phase 4: Dual-Write Testing (3-5 days)

### 1. Enable Dual Writes in Development

```typescript
// In src/lib/wedding-api.ts or wherever you do writes
// Example: create a wedding

export async function createWedding(data: WeddingInput) {
  // Write to Neon (primary)
  const { data: weddingNeon, error: neonError } = await supabase
    .from("weddings")
    .insert(data)
    .select()
    .single();

  if (neonError) {
    throw neonError;
  }

  // Shadow write to Supabase (backup, non-critical)
  if (process.env.EXPO_PUBLIC_USE_NEON === "true") {
    shadowWrite("weddings", "insert", data).catch(err => {
      console.error("[DUAL WRITE] Supabase shadow write failed:", err);
      // Don't throw — Neon has the data
    });
  }

  return weddingNeon;
}
```

### 2. Deploy to Production (With Feature Flag Off)

```bash
# In production:
EXPO_PUBLIC_USE_NEON=false  # Keep reading from Supabase only
```

**No users see any changes yet.**

### 3. Test with Both Users

Have both users (the 2 actual ShadiPlan users) test normally:
- ✅ Login works
- ✅ View/edit weddings
- ✅ Add guests
- ✅ Edit tasks/expenses
- ✅ Upload vendor documents
- ✅ Edit outfit plans

**Dual writes are happening in background but not visible.**

---

## Phase 5: Gradual Traffic Cutover (2-4 weeks)

### 1. Enable Neon Reads (10% of traffic)

```typescript
// In src/lib/supabase.ts

export async function getWeddings(userId: string) {
  if (useNeonBackend && Math.random() < 0.1) { // 10% traffic
    // Read from Neon
    const { data, error } = await supabase
      .from("weddings")
      .select()
      .eq("user_id", userId);
    return { data, error };
  }
  
  // Default: read from Supabase
  const { data, error } = await supabase
    .from("weddings")
    .select()
    .eq("user_id", userId);
  return { data, error };
}
```

### 2. Monitor Logs

```bash
# Watch for errors
tail -f /var/log/shadiplan.log | grep -i "neon\|error\|warning"

# Compare response times
grep "read_duration" /var/log/shadiplan.log | tail -100
```

**Cutover schedule:**
- **Day 1-3:** 5-10% of reads from Neon
- **Day 4-7:** 25% of reads from Neon
- **Day 8-14:** 50% of reads from Neon
- **Day 15+:** 100% of reads from Neon

If zero errors after 5 days at each level, proceed to next.

---

## Phase 6: Final Cutover

### 1. Stop Dual Writes

**File:** Remove shadow write calls or disable in feature flag

```typescript
// In src/lib/supabase.ts
export const useNeonBackend = true; // Toggle ON
```

### 2. Deploy to Production

```bash
EXPO_PUBLIC_USE_NEON=true
# All reads now come from Neon
```

### 3. Monitor 24 Hours

```bash
# Check error rates
grep "ERROR" /var/log/shadiplan.log | wc -l

# Compare Neon vs Supabase performance
grep "duration_ms" /var/log/shadiplan.log | awk '{sum+=$2; count++} END {print "Avg:", sum/count}'
```

**If critical issue found:**
```bash
# Instant rollback (< 1 minute)
git revert [commit-hash]
EXPO_PUBLIC_USE_NEON=false
npm run deploy
# All traffic goes back to Supabase
```

---

## Phase 7: Keep Supabase Running (2+ weeks)

**DO NOT delete Supabase data yet.**

- Keep Supabase project active for 2 weeks
- If issue found, you have full backup
- Dual writes still happening

**After 2 weeks with zero critical issues:**
1. Archive Supabase data (export one final backup)
2. Delete Supabase project
3. Clean up code (remove dual-write logic)

---

## Auth Handling Options

### Option A: Keep Supabase Auth (Recommended - Simplest)

**No changes needed.** Your JWT tokens from Supabase work with Neon:

```typescript
// This still works!
const { data, error } = await supabase.auth.signInWithOtp({
  email: user@example.com
});

// Token payload contains user ID
// Validate token signature on Neon backend
```

**Pros:**
- Zero user disruption
- Tokens are JWTs, backend-agnostic
- RLS policies still work

**Cons:**
- Still dependent on Supabase for auth

### Option B: Migrate to Auth0 or Firebase (Advanced)

Only if you want full independence. This requires:
1. Export users from Supabase
2. Import to Auth0/Firebase
3. Update all API calls to use new auth tokens
4. More work, not recommended for 2-3 users

**Recommendation:** Stay with Supabase Auth for now. You can migrate later if needed.

---

## Storage Migration (Photos, Vendor Docs)

**Current:** Supabase Storage bucket `vendor-documents`

**After Migration:**

### Option 1: Keep Supabase Storage (Easiest)

```typescript
// No changes — keep uploading to Supabase Storage
const { data, error } = await supabase.storage
  .from('vendor-documents')
  .upload(`${weddingId}/${candidateId}/...`, file);
```

**Pros:** Zero app changes, works fine  
**Cons:** Still paying Supabase storage costs

### Option 2: Migrate to Neon + S3 (More Complex)

Would require:
- Setting up AWS S3 or Backblaze
- Creating presigned URLs
- Updating all upload/download code

**For now:** Stick with Option 1 (Supabase Storage). Migrate later if costs are concern.

---

## Rollback Plan

If anything breaks after Neon cutover:

```bash
# 1. Instant app rollback
git revert [last-commit]
EXPO_PUBLIC_USE_NEON=false
npm run deploy
# Takes ~2 minutes, all traffic back to Supabase

# 2. Data is safe
# Supabase still has all data (dual writes kept it in sync)
# Neon has data but unused

# 3. Investigate
# Debug the issue in staging
# Test thoroughly before trying again
```

---

## Verification Checklist

### Pre-Migration
- [ ] 3-way backup created (laptop, cloud, HDD)
- [ ] Both users' data verified (row counts)
- [ ] Neon account created
- [ ] Database restored to Neon
- [ ] Data integrity verified (counts match)

### During Dual-Write Phase
- [ ] Feature flag deployed (`USE_NEON=false`)
- [ ] Both users can login
- [ ] Both users can create/edit weddings
- [ ] No errors in logs for 7+ days
- [ ] Response times normal

### During Gradual Cutover
- [ ] 10% traffic on Neon: 0 errors for 3 days
- [ ] 25% traffic on Neon: 0 errors for 3 days
- [ ] 50% traffic on Neon: 0 errors for 3 days
- [ ] 100% traffic on Neon: 0 errors for 3 days

### Post-Cutover
- [ ] 24 hours monitoring, 0 critical errors
- [ ] Both users report working normally
- [ ] No performance degradation
- [ ] All features functional (weddings, guests, uploads, etc.)

### Cleanup
- [ ] 2 weeks with zero issues
- [ ] Supabase data archived (final backup)
- [ ] Dual-write code removed
- [ ] Feature flag cleaned up
- [ ] Documentation updated

---

## Costs

| Component | Before | After | Notes |
|-----------|--------|-------|-------|
| Supabase | Free tier | $0 | Keep 2 weeks, then delete |
| Neon | N/A | Free tier | Generous limits, covers your use |
| Storage | Supabase | Supabase | No change for now |
| **Total** | **$0** | **$0** | Stay free! |

---

## Next Steps

1. **This week:** Run Phase 0 (backups + verification)
2. **Next week:** Complete Phase 1-2 (Neon setup + restore)
3. **Week 3-4:** Dual-write deployment + testing
4. **Week 5-8:** Gradual cutover with monitoring

**Ready to start? Confirm:**
- [ ] Can access Supabase project settings?
- [ ] Have psql/PostgreSQL client installed?
- [ ] Can create Neon account?

Let's begin!
