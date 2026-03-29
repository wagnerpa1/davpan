# Test Harness (Phase 6)

## API-Tests (Vitest)

Diese Tests laufen ohne Browser und decken Notification-Logik inkl. Opt-in-Filterung und RLS-nahe API-Faelle ab.

```bash
npm run test:api
```

## E2E-Tests (Playwright)

Die E2E-Spezifikation nutzt vorbereitete Storage-States, damit Login-Flows stabil bleiben.

Erforderliche Umgebungsvariablen (je nach Testfall):
- `E2E_BASE_URL`
- `E2E_PARENT_STORAGE_STATE`
- `E2E_MEMBER_STORAGE_STATE`
- `E2E_ADMIN_STORAGE_STATE`
- optional: `E2E_TOUR_PATH`

```bash
npm run test:e2e
```

## Lasttest (k6)

Der Lasttest liegt unter `load/notifications-broadcast.k6.js` und feuert `system-notifications` Broadcasts.

```bash
k6 run load/notifications-broadcast.k6.js -e BASE_URL=http://localhost:3000 -e ADMIN_COOKIE="sb-access-token=...; sb-refresh-token=..."
```

