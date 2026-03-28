# JDAV / DAV Pfarrkirchen Touren-Portal

Webanwendung zur Verwaltung von Touren, Teilnehmern, Eltern-/Kind-Profilen, Dokumenten und (vorbereitet) Materialverwaltung.

## Kurzstatus

- Framework: Next.js 16.2.1
- Runtime im Projekt aktuell: `turbopack` (über npm scripts)
- Backend: Supabase (Auth + Postgres)
- PWA: Serwist integriert
- Sicherheitsbericht: siehe `sicherheit.md`

---

## Changelog (letzter Stand 2026-03-28)

### Qualität / Sicherheit (2026-03-28)

- `biome check` bereinigt (keine offenen Lint-Fehler mehr)
- A11y-/Conventions-Fixes in Admin- und Material-UI (Labels, Button-Typen, semantische Links)
- `any`-Hotspots in Server Actions und Admin-Seiten durch konkrete Typen ersetzt
- Build-Validierung erfolgreich (`next build --turbopack` inkl. TypeScript)
- Security-Update: `next` auf `16.2.1` erhöht (Audit-Findings behoben)
- Produktions-Audit sauber (`npm audit --omit=dev` → 0 Vulnerabilities)
- CSRF-/Origin-Härtung für Deployments hinter Reverse Proxy verbessert (`forwarded`, `x-forwarded-*`, `sec-fetch-site` Fallback)
- Next Server Actions auf vertrauenswürdige Origins beschränkt (`experimental.serverActions.allowedOrigins`)
- Öffentliche Touren repariert: `anon`-Read-Policy für `tours` ergänzt (nur `planning/open/full`)
- PWA-Start beschleunigt: `start_url` auf `/oeffentlich/touren`, Precache um öffentliche Startseite erweitert
- Service-Worker-Caching überarbeitet (gezielte Runtime-Strategien statt generischem Default-Cache)

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
- Materialverwaltung und Reservierungssteuerung (Materialwart/Admin)
- Anmeldung inkl. Wartelistenlogik
- Teilnehmer-Statusverwaltung durch berechtigte Nutzer
- Eltern-/Kind-Profile mit separaten Anmeldungen
- Dokumentbereich
- PWA-Grundfunktionen inkl. Offline-Fallbackseite

## Rollenlogik (aktuell)

- `member`: Basisrechte (Touren, Anmeldung, Material anfragen, Berichte lesen)
- `parent`: wie `member` + Kinderprofile verwalten/anmelden
- `guide`: Tourenrechte fuer eigene/zugewiesene Touren
- `materialwart`: wie `member` + Material-Inventar und Material-Reservierungen verwalten
- `admin`: Vollzugriff (inkl. Benutzer-/Dokumenten-/Ressourcenverwaltung)

Wichtig: `materialwart` hat **keine** Guide- oder Admin-Rechte ausserhalb des Materialbereichs.

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
- `tour_groups`
- `tour_guides`
- `tour_participants`
- `material_types`
- `material_inventory`
- `material_pricing`
- `tour_materials`
- `tour_material_requirements`
- `material_reservations`
- `resources`
- `resource_bookings`
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

```powershell
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
```

### Installation

```powershell
npm install
```

### Development-Server

```powershell
npm run dev
```

### Lint

```powershell
npm run lint
```

### Security Audit (Production Dependencies)

```powershell
npm audit --omit=dev
```

### Production Build

```powershell
npm run build
npm run start
```

---

## PWA / Offline

- Manifest: `public/manifest.json`
- Service Worker Entry: `src/app/sw.ts`
- Serwist Route: `src/app/serwist/[path]/route.ts`
- Offline-Seite: `src/app/~offline/page.tsx`

Runtime-Caching (Serwist):
- Dokumente: `NetworkFirst` mit kurzem Timeout (4s) für spürbar schnelleren Erststart
- JS/CSS/Worker: `StaleWhileRevalidate`
- Bilder: `CacheFirst` mit Ablaufregeln
- Sensible Pfade (`/api`, `/auth`, `/admin`, `/guide`, `/profile`) werden nicht als Seiten gecacht

Aktuell ist ein Offline-Fallback auf `"/~offline"` definiert.  
Precache umfasst `"/login"`, `"/oeffentlich/touren"` und `"/~offline"`.

Startverhalten (Android PWA):
- `manifest.json` nutzt `start_url: "/oeffentlich/touren"`, um Login-Redirects und Session-Refresh beim Kaltstart zu minimieren.

---

## Sicherheit (wichtig)

Der aktuelle Sicherheitsstatus ist in `sicherheit.md` detailliert dokumentiert.

Alle kritischen Findings sind behoben:
- RLS + FORCE RLS aktiv auf allen 11 Kern-Tabellen
- Auth-Callback mit Open-Redirect-Schutz (`sanitizeNextPath`)
- CSRF-Schutz auf API-Routen (`isSameOriginRequest`)
- Deployment-Härtung: zusätzliche Proxy-/Forwarded-Origin-Erkennung gegen `CSRF validation failed` im Domain-Betrieb
- `getUser()` statt `getSession()` in allen Auth-relevanten Pfaden
- Rolle wird nie aus Client-Metadata übernommen
- Next.js auf gepatchte Version aktualisiert (`16.2.1`)

Einziger offener Punkt:
> ⚠️ **Leaked Password Protection** muss manuell im Supabase Dashboard aktiviert werden:  
> Authentication → Password Security → "Prevent use of leaked passwords"

---

## Bekannte Laufzeit-Hinweise

- Die `browserslist`-Warnung (`Critical dependency`) aus `@serwist/turbopack` ist ein bekanntes Paket-Thema und aktuell nur ein Warning, kein Build-Blocker.
- Serwist ist im Development-Modus deaktiviert; PWA-Checks immer auch im Production-Run validieren.

---

## Deployment-Variablen (CSRF/Origin)

Für stabile POST-/Server-Action-Requests im Deployment sollten diese Variablen gesetzt sein:

```powershell
SITE_URL=https://deine-domain.tld
NEXT_PUBLIC_SITE_URL=https://deine-domain.tld
CSRF_TRUSTED_ORIGINS=https://deine-domain.tld,https://www.deine-domain.tld
```

Hinweis:
- `CSRF_TRUSTED_ORIGINS` akzeptiert kommagetrennte Einträge.
- Bei Deployments hinter Proxy/CDN müssen `x-forwarded-host` und `x-forwarded-proto` korrekt weitergereicht werden.

---

## Haftung / Nutzung

Dieses Repository ist für die interne Nutzung der DAV Sektion Pfarrkirchen gedacht.

