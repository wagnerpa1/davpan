# System-Architektur & Tech-Stack

Die **DAV Pfarrkirchen Plattform** (`davpan`) ist eine moderne Progressive Web App (PWA) zur Verwaltung von Touren, Kursen, Ausrüstung, Mitgliedschaften und Tourenberichten der Sektion Pfarrkirchen des Deutschen Alpenvereins e.V.

---

## 🏗️ Technologiestack

### Frontend & App Core
* **Framework**: Next.js (App Router, Server Components & Server Actions)
* **Sprache**: TypeScript (Strict Mode)
* **Styling & UI**: Vanilla CSS / CSS Modules mit modernem DAV-Farbschema, Tailwind Interop wo nötig, Lucide Icons
* **PWA & Service Worker**: Serwist (`@serwist/next`) für Offline-First Caching und Background Sync Queue
* **Validation**: Zod Schemas zur Typisierung von Eingaben und Formularzuständen

### Backend & Datenbank
* **Database Platform**: Supabase (PostgreSQL)
* **Authentication**: Supabase Auth (JWT mit Custom Claims, Sektions-Mitgliedsnummer und Rollen)
* **Security Layer**: Row-Level Security (RLS) direkt in PostgreSQL & RPC-First Mutations
* **Storage**: Supabase Storage Buckets für Tourenfotos, Dokumente und Nachweise
* **Asynchroner Job Execution Layer**: PostgreSQL Outbox-Tabelle (`notification_outbox`), Cron-Trigger via `pg_net` und Node.js Outbox Worker

---

## 📐 Architekturprinzipien

### 1. RPC-First Mutationen
Alle Geschäftslogiken, die sich über mehrere Tabellen erstrecken (z.B. Tourenanmeldung mit automatischer Materialreservierung und Wartelistenprüfung), sind in atomaren PostgreSQL Stored Procedures (`SECURITY DEFINER`) gekapselt. Server Actions rufen primär diese RPCs auf.

### 2. Idempotente Netzwerk-Operationen
Jede schreibende Aktion generiert clientseitig oder actionseitig einen deterministischen `idempotency_key` via `buildIdempotencyKey()`. Bei Netzwerkausfällen oder Retry-Versuchen des Service Workers verhindert die Tabelle `idempotency_keys_store` doppelte Ausführungen.

### 3. Outbox Pattern für Externe Services
Synchron laufende DB-Transaktionen rufen keine externen Web-APIs (z.B. Push-Dienste oder Mail-Provider) auf. Stattdessen schreiben Transaktionen Ereignisse in die Tabelle `notification_outbox`. Ein separater Worker arbeitet diese Ereignisse asynchron ab.

### 4. Offline-First & Progressive Enhancement
Kritische Ansichten (Tourenliste, eigene Ausrüstungsbuchungen, Berichte) werden vom Service Worker gecacht. Formular-Übermittlungen im Offline-Zustand werden im Service Worker repliziert und bei Wiederherstellung der Verbindung geordnet abgearbeitet.

---

## 📂 Verzeichnisstruktur des Projektes

```
davpan/
├── src/
│   ├── app/                   # Next.js App Router (Pages, Layouts, Server Actions, API Routes)
│   │   ├── actions/           # Typisierte Server Actions (Touring, Material, Admin, Profile)
│   │   ├── admin/             # Administrations-Dashboard & Verwaltung
│   │   ├── touren/            # Tourenübersicht, Detailansicht, Buchungsflow
│   │   ├── material/          # Ausrüstungsverleih & Inventarübersicht
│   │   ├── berichte/          # Tourenberichte & Nachbereitung
│   │   ├── sw.ts              # Custom Serwist Service Worker mit BackgroundSync & Conflict handling
│   │   └── layout.tsx         # Root Layout mit Shell, Navigation & PWA Header
│   ├── components/            # Wiederverwendbare UI-Komponenten (Modals, Badges, Tabellen)
│   ├── lib/                   # Geschäftslogik & Core-Abstraktionen
│   │   ├── action-runner.ts   # Server-side Action Wrapper (`runAction`)
│   │   ├── client-action-runner.ts # Client-side Action Execution (`runClientAction`)
│   │   ├── errors.ts          # Standardisierte DomainError & Conflict Error Codes
│   │   ├── permissions.ts     # Rollen- & Rechte-Guards
│   │   └── security.ts        # Input Sanitization, CSRF & Auth-Token Checks
│   └── types/                 # TypeScript Schnittstellen und Schema-Definitionen
├── docs/                      # Zentrale Wiki-Dokumentation
├── supabase/                  # PostgreSQL Migrationen, RLS Policies & RPC Functions
├── scripts/                   # Wartungs- & Admin-Skripte (z.B. CSV-Import, Outbox Worker)
└── tests/                     # Vitest API/Integration Tests & Playwright E2E Tests
```

---
*Zurück zur [Wiki-Übersicht](file:///c:/Users/paulw/WebstormProjects/davpan/docs/README.md)*
