# Teststrategie & Testsuite (`testing-strategy.md`)

Um Qualität, Datensicherheit und Barrierefreiheit der Anwendungsfunktionen sicherzustellen, nutzt `davpan` eine mehrstufige Teststrategie (konsolidiert aus `tests/README.md`).

---

## 🧪 1. API & Unit-Tests (Vitest)

Die Unit- und API-Tests testen Geschäftslogik, Zod-Validierungen, Hilfsfunktionen, Notification-Filter und CSV-Parsing ohne Browser-Overhead.

```bash
npm run test:api
```

* **Fokus**: Schnelle Ausführung, Determinismus, Isolierung.
* **Testpfade**: `tests/api/**/*.test.ts` sowie Co-located Testdateien in `src/`.

---

## 🔗 2. Integrationstests (Vitest mit Supabase)

Integrationstests überprüfen das Zusammenspiel zwischen Server Actions, PostgreSQL RPCs und RLS-Policies gegen eine reale oder lokale Supabase-Instanz.

```bash
npm run test:integration
```

---

## 🎭 3. End-to-End Tests (Playwright)

Die E2E-Testsuite testet vollständige User Journeys (Tourenanmeldung, Eltern-Kind-Verknüpfung, Materialbuchung) im echten Browser.

### Erforderliche Umgebungsvariablen:
* `E2E_BASE_URL` (z.B. `http://localhost:3000`)
* `E2E_PARENT_STORAGE_STATE`
* `E2E_MEMBER_STORAGE_STATE`
* `E2E_ADMIN_STORAGE_STATE`

```bash
npm run test:e2e
```

---

## 📊 4. Lasttests (k6)

Zur Verifikation der Systemstabilität unter hohen Benutzerzahlen (z.B. bei Ankündigung begehrter Touren) existieren k6 Lasttest-Skripte unter `load/`.

```bash
k6 run load/notifications-broadcast.k6.js -e BASE_URL=http://localhost:3000 -e ADMIN_COOKIE="sb-access-token=...; sb-refresh-token=..."
```

---
*Zurück zur [Wiki-Übersicht](file:///c:/Users/paulw/WebstormProjects/davpan/docs/README.md)*
