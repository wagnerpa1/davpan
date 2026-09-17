# DAV Pfarrkirchen App – Technische Dokumentation & Wiki

Willkommen in der zentralen Wiki-Dokumentation für die **DAV Pfarrkirchen (davpan)** Anwendung. Hier finden Entwickler, Administratoren und Bergleiter alle Informationen zur Architektur, den Modulen, der Sicherheitsarchitektur und den Betriebsverfahren.

---

## 📚 Wiki-Navigationsübersicht

### 🏛️ 1. Architektur & Systemdesign
* **[System-Übersicht & Tech-Stack](file:///c:/Users/paulw/WebstormProjects/davpan/docs/architecture/overview.md)**: Next.js App Router, Supabase Postgres, PWA & UI-Designsystem.
* **[Offline-Fähigkeit & Service Worker](file:///c:/Users/paulw/WebstormProjects/davpan/docs/architecture/offline-and-pwa.md)**: Serwist BackgroundSync, Caching-Strategien, Offline-Formulare und Conflict Badges (`sw.ts`).
* **[Fehlerbehandlung & Mutation Model](file:///c:/Users/paulw/WebstormProjects/davpan/docs/architecture/error-handling-mutations.md)**: Action Runner (`runAction`), RPC-First Prinzip, Idempotenz-Schlüssel und kanonische Fehlercodes.
* **[ADR: Mutation Model & Data Consistency](file:///c:/Users/paulw/WebstormProjects/davpan/docs/ADR_MUTATION_MODEL.md)**: Architekturentscheidung zu Datenbank-Guards und Transaktionen.

### 🏔️ 2. Anwendungsfunktionen & Domänenlogik
* **[Touren & Kurse](file:///c:/Users/paulw/WebstormProjects/davpan/docs/features/touren-und-kurse.md)**: Tourenverwaltung, Teilnehmer-Registrierung, Wartelisten-Nachrücken, State Machines und Material-Auto-Sync.
* **[Material- & Ausrüstungsverleih](file:///c:/Users/paulw/WebstormProjects/davpan/docs/features/material-verleih.md)**: Ressourcen-Buchungen, Bestandstracking, Reservierungsstatus & automatische Freigaben.
* **[Mitgliederverwaltung & CSV-Import](file:///c:/Users/paulw/WebstormProjects/davpan/docs/features/mitglieder-und-import.md)**: DAV Stammdaten-Import, Profil-Aktivierung, Erziehungsberechtigten-Verknüpfungen (Guardian Flow).
* **[Tourenberichte & Dokumente](file:///c:/Users/paulw/WebstormProjects/davpan/docs/features/berichte-und-dokumente.md)**: Tourenberichte, Bildnachweise, Datei-Uploads und PDF-Generierung.
* **[Benachrichtigungssystem](file:///c:/Users/paulw/WebstormProjects/davpan/docs/features/benachrichtigungen.md)**: Asynchroner Notification Outbox Worker, Web-Push (VAPID) und E-Mail-Triggers.

### 🔒 3. Datenbank & Sicherheit
* **[Sicherheit, RLS & Berechtigungen](file:///c:/Users/paulw/WebstormProjects/davpan/docs/database-and-security/rls-and-permissions.md)**: Row-Level Security (RLS) Matrizen, Rollenkonzept (Admin, Guide, Materialwart, Member, Parent), CSRF-Schutz & Verifikation.
* **[PostgreSQL Schema & RPCs](file:///c:/Users/paulw/WebstormProjects/davpan/docs/database-and-security/database-schema-and-rpcs.md)**: Tabellenschemata, Stored Procedures (`SECURITY DEFINER`), Trigger und Atomaritätsgarantien.

### 🛠️ 4. Betrieb & Testing
* **[Operations Runbook](file:///c:/Users/paulw/WebstormProjects/davpan/docs/RUNBOOK_OPERATIONS.md)**: Vorgehen bei Outbox-Staus, Retries, Dead-Letter-Events und Inkonsistenzen.
* **[Skripte & CLI-Tools](file:///c:/Users/paulw/WebstormProjects/davpan/docs/operations-and-testing/scripts-and-tools.md)**: `import-section-members.mjs`, `run-notification-outbox-worker.mjs` und Wartungs-Befehle.
* **[Teststrategie & Testsuite](file:///c:/Users/paulw/WebstormProjects/davpan/docs/operations-and-testing/testing-strategy.md)**: Vitest API/Integration Tests, Playwright E2E und k6 Lasttests.

---

## 🚀 Schnelleinstieg für Entwickler

```bash
# Repository klonen & Abhängigkeiten installieren
pnpm install

# Entwicklungsserver starten
npm run dev

# Code-Qualität vor Commits prüfen
npm run lint          # Biome Check
npx tsc --noEmit      # TypeScript Compiler
npm run test:api      # Vitest API Tests
```

---
*Dokumentationsstand: September 2026 | DAV Sektion Pfarrkirchen e.V.*
