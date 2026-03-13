# JDAV / DAV Pfarrkirchen Touren-Portal

Webanwendung zur Verwaltung von Touren, Teilnehmern, Eltern-/Kind-Profilen, Dokumenten und (vorbereitet) Materialverwaltung.

## Kurzstatus

- Framework: Next.js 16.1.6
- Runtime im Projekt aktuell: `webpack` (über npm scripts)
- Backend: Supabase (Auth + Postgres)
- PWA: Serwist integriert
- Sicherheitsbericht: siehe `sicherheit.md`

---

## Funktionsumfang

- Tourenplanung und Verwaltung (Guide/Admin)
- Anmeldung inkl. Wartelistenlogik
- Teilnehmer-Statusverwaltung durch berechtigte Nutzer
- Eltern-/Kind-Profile mit separaten Anmeldungen
- Dokumentbereich
- PWA-Grundfunktionen inkl. Offline-Fallbackseite

---

## Architektur

## Frontend / App-Layer

- `src/app` – Next.js App Router (Pages, Route Handlers, Server Actions)
- `src/components` – UI-Komponenten (Auth, Touren, Layout)
- `src/utils` – Supabase-Clients und URL-Helfer

## Backend / Daten

- Supabase Projekt (ref): `amjxgutnnnpjbjigzwpo`
- DB Host: `db.amjxgutnnnpjbjigzwpo.supabase.co`
- Hauptschema: `public`

Wichtige Tabellen:
- `profiles`
- `child_profiles`
- `tours`
- `tour_guides`
- `tour_participants`
- `materials`
- `tour_materials`
- `material_reservations`
- `tour_reports`
- `report_images`
- `documents`

---

## Lokale Entwicklung

## Voraussetzungen

- Node.js LTS
- npm
- `.env.local` mit Supabase-Werten

Beispiel:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
```

## Installation

```bash
npm install
```

## Development-Server

```bash
npm run dev
```

## Lint

```bash
npm run lint
```

## Production Build

```bash
npm run build
npm run start
```

---

## PWA / Offline

- Manifest: `public/manifest.json`
- Service Worker Entry: `src/app/sw.ts`
- Serwist Route: `src/app/serwist/[path]/route.ts`
- Offline-Seite: `src/app/~offline/page.tsx`

Aktuell ist ein Offline-Fallback auf `"/~offline"` definiert.  
Precache umfasst Startseite, Tourenseite und Offline-Seite.

---

## Sicherheit (wichtig)

Der aktuelle Sicherheitsstatus ist in `sicherheit.md` detailliert dokumentiert.

Kernaussagen:
- In Supabase sind im `public`-Schema derzeit Tabellen ohne RLS aktiv.
- Das ist fuer produktiven Betrieb kritisch und muss vor Go-Live behoben werden.
- Weitere Punkte: Redirect-Haertung im Auth-Callback, CSRF-Haertung, Migration von `middleware` auf `proxy`.

Empfohlene Reihenfolge:
1. RLS + Policies
2. Auth/Redirect/CSRF Hardening
3. PWA-Cache-Hardening fuer sensible Inhalte

---

## Bekannte Laufzeit-Hinweise

- Next.js weist auf deprecate `middleware`-Konvention hin (`proxy` empfohlen).
- Serwist kann im Development je nach Konfiguration deaktiviert sein; PWA-Checks immer auch im Production-Run validieren.

---

## Haftung / Nutzung

Dieses Repository ist fuer die interne Nutzung der DAV Sektion Pfarrkirchen gedacht.  
Vor produktiver Nutzung bitte die Punkte aus `sicherheit.md` vollständig umsetzen.
