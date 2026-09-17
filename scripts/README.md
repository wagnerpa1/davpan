# Operational Scripts

This directory contains operational and maintenance scripts for DAV Pfarrkirchen.

## Active Scripts

### 1. `import-section-members.mjs`
Imports section member data (membership number, birth date, name, activation status) from an official DAV export into the `section_members` master table in Supabase.

**Usage:**
```bash
npm run import:members -- <path-to-file.csv|json>
```

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### 2. `run-notification-outbox-worker.mjs`
Drains the asynchronous notification queue (`notification_outbox` table) and dispatches web push notifications and emails.

**Usage:**
```bash
npm run worker:outbox
```

**Options / Configuration:**
- Continuous polling worker for environments where `pg_net` cron execution is handled by an external worker or container.
