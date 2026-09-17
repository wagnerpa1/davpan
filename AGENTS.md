# AGENTS.md - Developer & Agent Guide

This document defines architecture guidelines, operational patterns, and conventions for working on the DAV Pfarrkirchen application.

## Core Architecture & Guidelines

### 1. Database & Mutation Architecture (ADR Compliant)
- **RPC-First for Multi-Table Operations**: Any domain-critical modification spanning more than one table (e.g. Tour Registration, Material Reservations, Waitlist Promotions) MUST be encapsulated in an atomic PostgreSQL function (`SECURITY DEFINER`, `SET search_path TO 'public', 'pg_temp'`).
- **Never Alter Existing Migrations**: Existing SQL files in `supabase/migrations/` are immutable snapshots. Always write a new migration file with a fresh timestamp (e.g., `YYYYMMDDHHMMSS_description.sql`).
- **Idempotency Keys**: Use `buildIdempotencyKey()` to generate a deterministic UUID/hash per mutation to protect against duplicate replay during offline sync.
- **Row-Level Security (RLS)**: Enforced in Postgres; authorization decisions are verified server-side.

### 2. Error Handling Standard
Server Actions should standardize on the `runAction` / `DomainError` pattern (`src/lib/action-runner.ts` and `src/lib/errors.ts`):
```ts
export interface ActionState<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: ConflictErrorCode;
    message: string;
    retryable: boolean;
  };
}
```
**Canonical Error Codes**:
- `stale_write`: Version conflict / concurrent modification.
- `inventory_exceeded`: Material item quantity unavailable.
- `capacity_exceeded`: Tour participant limit reached.
- `invalid_state`: Status transition not permitted by domain state machine.
- `unauthorized`: Missing authentication or permission.
- `conflict`: Constraint violation (e.g. unique key conflict).
- `unknown_error`: Catch-all fallback.

The Service Worker (`src/app/sw.ts`) extracts these structured error codes to trigger notification badges and drop unrecoverable conflicts.

### 3. Code Style & Hygiene
- **Linter & Formatter**: Biome is the sole linter and formatter. Run `npm run lint` and `npm run format`.
- **Typing**: Strict TypeScript (`npx tsc --noEmit` must pass with 0 errors).
- **File Encodings**: Strict UTF-8 with proper German umlauts (`ä`, `ö`, `ü`, `ß`). Avoid broken encoding characters (`\uFFFD`).
- **No God Files**: Separate actions into validation helpers (`src/lib/tours/registration-validation.ts`), notification dispatch helpers (`src/lib/notifications/helpers.ts`), and clean Server Action entrypoints.

### 4. Testing Commands
- `npm run lint`: Biome lint check.
- `npx tsc --noEmit`: TypeScript compiler check.
- `npm run test:api`: Fast Vitest unit/API tests.
- `npm run test:integration`: Vitest integration tests against Supabase.
- `npm run test:e2e`: Playwright browser test suite.
- `npm run build`: Production Next.js Turbopack build check.
