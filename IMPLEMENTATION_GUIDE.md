# Implementation Guide – P0/P1 Architectural Fixes

## Overview

This guide covers the deployment of critical race condition and data integrity fixes for the JDAV tour management system.

**Total Changes:**
- 5 Supabase migrations (P0: RPCs + Triggers)
- 1 Supabase migration (P1: Constraints + FKs)
- 6 TypeScript action files updated
- Expected downtime: **~10 minutes** (2 deployment phases)

**Timeline:** 2–3 hours total (with testing)

---

## Pre-Deployment Checklist

- [ ] Backup Supabase database (`Settings → Backups`)
- [ ] Notify team: maintenance window 10:00–10:15 UTC
- [ ] Verify test environment is synchronized with prod schema
- [ ] Review git diff: `git diff HEAD src/app/actions/`

---

## Deployment Phase 1: Database Migrations (5 min downtime)

### Step 1.1: Apply P0 Migrations (in order)

```bash
# Log into Supabase CLI
supabase login

# Apply migrations sequentially
supabase db push --file supabase/migrations/20260330_p0_register_tour_atomic.sql
supabase db push --file supabase/migrations/20260330_p0_waitlist_promotion.sql
supabase db push --file supabase/migrations/20260330_p0_material_reservation.sql
supabase db push --file supabase/migrations/20260330_p0_tour_status_sync.sql
supabase db push --file supabase/migrations/20260330_p0_resource_booking.sql
```

**Expected Output:**
```
✓ Migration applied: 20260330_p0_register_tour_atomic.sql
✓ Migration applied: 20260330_p0_waitlist_promotion.sql
... (repeat for each)
```

### Step 1.2: Verify RPCs Exist

```sql
-- In Supabase SQL Editor, run:
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'register_for_tour_atomic',
  'promote_first_waitlist',
  'reserve_material_for_tour_atomic',
  'reserve_material_independent_atomic',
  'sync_tour_status_explicit',
  'book_resource_for_tour_atomic',
  'release_resource_booking_atomic'
)
ORDER BY routine_name;
```

Expected: **7 rows** returned.

### Step 1.3: Verify Triggers Exist

```sql
-- In Supabase SQL Editor, run:
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    trigger_name LIKE 'trigger%sync%'
    OR trigger_name LIKE '%waitlist%'
  )
ORDER BY event_object_table, trigger_name;
```

Expected:
- **2 rows** (nur neue Sync-Trigger), oder
- **3 rows**, wenn der Legacy-Trigger `trigger_waitlist_position` noch vorhanden ist.

`trigger_waitlist_position` **nicht löschen**, solange ihr weiterhin manuell Teilnehmer auf `waitlist` setzen könnt (er setzt dann `waitlist_position`).
Nur der alte Promotion-Trigger `trigger_promote_waitlist` soll entfernt sein.

---

## Deployment Phase 2: App Code Update (0 min downtime)

### Step 2.1: Update Action Files

The following files have been pre-modified. Verify all changes are in place:

```bash
git diff src/app/actions/tour-registration.ts
git diff src/app/actions/participant-management.ts
git diff src/app/actions/material.ts
git diff src/app/actions/admin-resources.ts
```

**Expected changes per file:**
- `tour-registration.ts`: `registerForTour()` now calls `register_for_tour_atomic` RPC
- `participant-management.ts`: `updateParticipantStatus()` uses `promote_first_waitlist` RPC, manual status sync removed
- `material.ts`: `createIndependentMaterialReservation()` uses `reserve_material_independent_atomic` RPC
- `admin-resources.ts`: `checkAndBookResource()` uses `book_resource_for_tour_atomic` RPC

### Step 2.2: Build & Test Locally

```bash
npm run build
npm run lint
```

Expected: **0 errors, 0 warnings**

### Step 2.3: Deploy to Staging

```bash
# Deploy to staging environment
npm run deploy:staging
```

### Step 2.4: Run Smoke Tests (Staging)

```bash
# Manual tests:
1. [ ] Register for tour (should call register_for_tour_atomic)
   - Test normal registration
   - Test waitlist registration
   - Test material reservation
   - Test duplicate registration (should error with 23505)

2. [ ] Cancel registration (should promote waitlist via RPC)
   - Verify waitlist participant is promoted
   - Verify notification sent once

3. [ ] Book resource (should call book_resource_for_tour_atomic)
   - Test new booking
   - Test overlapping booking (should error)
   - Test update existing booking

4. [ ] Verify tour status syncs automatically
   - Register participants until full
   - Tour status should become 'full' automatically
   - Cancel a participant
   - Tour status should become 'open' automatically
```

### Step 2.5: Deploy to Production

```bash
git push origin main
# GitHub Actions CI/CD pipeline starts
# Wait for: ✓ Build, ✓ Tests, ✓ Deploy to Prod
```

---

## Deployment Phase 3: P1 Constraints (optional, minimal impact)

Once P0 is stable (24–48h later), apply P1:

```bash
supabase db push --file supabase/migrations/20260330_p1_constraints.sql
```

**Expected changes:**
- `tour_reports` table: UNIQUE (tour_id) constraint added
- `material_reservations` table: CHECK constraint on status added
- FKs updated with ON DELETE CASCADE
- New indexes created

---

## Rollback Plan (if needed)

### Scenario A: RPC Deployment Failed

1. Revert app code:
   ```bash
   git revert HEAD
   npm run build
   npm run deploy:prod
   ```

2. Drop new RPCs (temporary):
   ```sql
   DROP FUNCTION IF EXISTS public.register_for_tour_atomic CASCADE;
   DROP FUNCTION IF EXISTS public.promote_first_waitlist CASCADE;
   -- ...etc
   ```

3. Restore old app logic from git history

### Scenario B: Data Corruption After P1

1. Restore from backup:
   ```bash
   supabase db reset --from-backup 20260330-10:15
   ```

2. Revert migrations:
   ```bash
   supabase db push --file supabase/migrations/20260329_rollback.sql
   ```

---

## Post-Deployment Monitoring

### Check 1: Monitor Error Rates (1h post-deploy)

```sql
-- In monitoring dashboard:
SELECT 
  DATE_TRUNC('minute', created_at) as minute,
  COUNT(*) as request_count,
  SUM(CASE WHEN response_code >= 400 THEN 1 ELSE 0 END) as error_count
FROM api_logs
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY minute
ORDER BY minute DESC;
```

Expected: **Error rate < 0.1%**

### Check 2: Verify RPC Performance

```sql
-- In Supabase SQL Editor:
SELECT function_name, calls, avg_duration_ms
FROM pg_stat_functions
WHERE function_name IN (
  'register_for_tour_atomic',
  'promote_first_waitlist',
  'reserve_material_for_tour_atomic'
)
ORDER BY avg_duration_ms DESC;
```

Expected: **avg_duration_ms < 500ms**

### Check 3: Verify Trigger Execution

```sql
-- Check for trigger errors in logs:
SELECT 
  message,
  COUNT(*) as count
FROM logs
WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND message LIKE '%trigger%'
  AND level = 'ERROR'
GROUP BY message;
```

Expected: **0 rows**

---

## Known Limitations & Future Work

### P2 Items (1–2 weeks out)

- [ ] Notification retry logic (dispatchNotificationSafe)
- [ ] Offline conflict resolution (IndexedDB queue + sync)
- [ ] Waitlist position optimization (GAPLESS_SEQUENCE)

### Notes

- The `promote_waitlist` trigger is **removed** in P0.2. All promotion now goes through `promote_first_waitlist` RPC.
- Tour status is now **derived** from participant count. Manual updates via app are no longer needed.
- Material reservations are **atomic at the RPC level**. Inventory locks prevent lost updates.
- Resource bookings use **EXCLUDE GIST constraint** (P0.5) for temporal conflict detection.

---

## Support & Questions

**For issues during deployment:**
1. Check migration logs: `supabase db push --verbose`
2. Review error in Supabase Dashboard → Logs
3. Contact: [team email / Slack channel]

**For code questions:**
- See `src/app/actions/tour-registration.ts` for RPC call examples
- See `database.md` for updated schema

---

## Completion Checklist

- [ ] All migrations applied successfully
- [ ] All RPCs created and verified
- [ ] All triggers created and verified
- [ ] App code deployed to production
- [ ] Smoke tests passed
- [ ] Error rates normal (<0.1%)
- [ ] No regressions reported
- [ ] Team notified of changes

**Estimated Total Time:** 2–3 hours



