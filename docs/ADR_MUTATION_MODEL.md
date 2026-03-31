# Architecture Decision Record: Mutation Model & Data Consistency

## Context
Initial implementation featured parallel logic for tour status, registration bounds, and material tracking between the Next.js App Router and Supabase. Under concurrent loads, this led to race conditions, lost updates, and waitlist promotion failures.

## Actions Taken
During the P0-P3 stabilization phase, all core writes were transitioned to use:
1. **RPC-First Mutations**: `register_for_tour`, `checkout_material`, etc. wrap logic into single PostgreSQL transactions.
2. **Idempotency Keys**: Appends a UUID per UI interaction. If the background sync retries the RPC off a Service Worker, `idempotency_keys_store` prevents duplicate applications.
3. **Database Guards**: Overbooking constraints, temporal sequence checks (Tour Report requires Completed Tour), and cascading locks were moved strictly to SQL constraints/triggers.
4. **Outbox Pattern**: The system delegates non-critical paths (e.g. Emails/Push Notifications) to an asynchronous worker queue (`notification_outbox`), resolving external API latencies inside the sync path.

## Conventions Going Forward
- Any domain-critical modification spanning more than one table (e.g., Tour Participant + Material Reservations + Waitlist) MUST be encapsulated in a stored proc.
- UI MUST wrap the call using `runClientAction()` from `src/lib/client-action-runner.ts` to cleanly catch Background Sync / offline scenarios. 
- TypeScript status constants (Zod schemas) MUST mirror PostgreSQL enums directly without additional mapping strings.