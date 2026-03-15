# JDAV / DAV Pfarrkirchen Touren-Portal

Webanwendung zur Verwaltung von Touren, Teilnehmern, Eltern-/Kind-Profilen, Dokumenten und (vorbereitet) Materialverwaltung.

## Kurzstatus

- Framework: Next.js 16.1.6
- Runtime im Projekt aktuell: `turbopack` (über npm scripts)
- Backend: Supabase (Auth + Postgres)
- PWA: Serwist integriert
- Sicherheitsbericht: siehe `sicherheit.md`

---

## Changelog (letzter Stand 2026-03-13)

### Behobene Fehler

| # | Datei | Problem | Fix |
|---|-------|---------|-----|
| 1 | `src/app/touren/page.tsx` | `new Date(null\|undefined)` im `date_desc`-Sort → CI TypeScript Build-Abbruch | `toTimestamp()`-Hilfsfunktion mit Null-Guard |
| 2 | `src/app/touren/page.tsx` | Ungenutzte `TourListItem`-Interface | Entfernt |
| 3 | `src/app/touren/[id]/page.tsx` | Implizites `any` auf `tg`-Parameter in `.some()` und `.map()` | Explizit auf `TourGuide` typisiert |
| 4 | `src/app/berichte/page.tsx` | `new Date(report.created_at)` ohne Null-Guard | Optional-Chaining mit Fallback `"–"` |
| 5 | `src/components/auth/LoginForm.tsx` | Hydration-Mismatch: `origin`-State leer beim SSR, führt zu leerem `redirectTo` | State zu `redirectTo` umbenannt, `window`-Zugriff sicher nur im `useEffect` |
| 6 | `src/app/actions/tour-management.ts` | `syncTourStatuses()` feuert DB-Write bei jedem Page-Request (Race Condition, unnötige Writes) | `React.cache()` für Request-Dedup + 60s In-Memory-Throttle |
| 7 | `next.config.ts` | Service-Worker-Scope-Fehler bei `/serwist/sw.js` + Scope `/` | `Service-Worker-Allowed: /` Header gesetzt, Root-Scope stabil registrierbar |
| 8 | `package.json` | `@supabase/auth-helpers-nextjs@0.15.0` (deprecated, nirgends importiert) | Entfernt |
| 9 | `package.json` | `uuid@13.0.0` + `@types/uuid` (nirgends genutzt) | Entfernt |

---

## Lighthouse-Scores (Login-Seite, Desktop, 2026-03-13)

| Kategorie | Score |
|-----------|-------|
| Accessibility | **90** |
| Best Practices | **96** |
| SEO | **100** |

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

### Frontend / App-Layer

- `src/app` – Next.js App Router (Pages, Route Handlers, Server Actions)
- `src/components` – UI-Komponenten (Auth, Touren, Layout)
- `src/utils` – Supabase-Clients und URL-Helfer

### Backend / Daten

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

### Voraussetzungen

- Node.js LTS
- npm
- `.env.local` mit Supabase-Werten

Beispiel:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
```

### Installation

```bash
npm install
```

### Development-Server

```bash
npm run dev
```

### Lint

```bash
npm run lint
```

### Production Build

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
Precache umfasst `"/login"` und `"/~offline"` (bewusst keine dynamischen Start-/Tourseiten).

---

## Sicherheit (wichtig)

Der aktuelle Sicherheitsstatus ist in `sicherheit.md` detailliert dokumentiert.

Alle kritischen Findings sind behoben:
- RLS + FORCE RLS aktiv auf allen 11 Kern-Tabellen
- Auth-Callback mit Open-Redirect-Schutz (`sanitizeNextPath`)
- CSRF-Schutz auf API-Routen (`isSameOriginRequest`)
- `getUser()` statt `getSession()` in allen Auth-relevanten Pfaden
- Rolle wird nie aus Client-Metadata übernommen

Einziger offener Punkt:
> ⚠️ **Leaked Password Protection** muss manuell im Supabase Dashboard aktiviert werden:  
> Authentication → Password Security → "Prevent use of leaked passwords"

---

## Bekannte Laufzeit-Hinweise

- Die `browserslist`-Warnung (`Critical dependency`) aus `@serwist/turbopack` ist ein bekanntes Paket-Thema und aktuell nur ein Warning, kein Build-Blocker.
- Serwist ist im Development-Modus deaktiviert; PWA-Checks immer auch im Production-Run validieren.

---

## Haftung / Nutzung

Dieses Repository ist für die interne Nutzung der DAV Sektion Pfarrkirchen gedacht.

