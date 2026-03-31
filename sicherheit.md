# Sicherheitsanalyse (Pentest) – JDAV / DAV Pfarrkirchen Touren-Portal

Stand: 2026-03-13  
Scope: gesamte Next.js-Anwendung, Supabase-Datenmodell, Auth-Flows, API-Routen, Server Actions, PWA/Service Worker, Abhängigkeiten.

## 1) Executive Summary

**Stand 2026-03-13 – POST-DEPLOYMENT nach vollständigem Security-Hardening.**

Alle kritischen und hohen Findings wurden behoben. Folgende Maßnahmen wurden umgesetzt und live getestet:

| # | Finding | Status |
|---|---------|--------|
| F-001 | RLS deaktiviert | ✅ **BEHOBEN** – RLS + FORCE RLS aktiv auf 11 Tabellen |
| F-002 | Open Redirect Auth-Callback | ✅ **BEHOBEN** – `sanitizeNextPath()` Allowlist |
| F-003 | CSRF-Schutz fehlt | ✅ **BEHOBEN** – Same-Origin-Check in API-Routen + Signout |
| F-004 | IDOR bei Child-Registrierung | ✅ **BEHOBEN** – App- + DB-Layer Ownership-Prüfung |
| F-005 | `getSession()` statt `getUser()` | ✅ **BEHOBEN** – alle AuthZ-Pfade auf `getUser()` migriert |
| F-006 | Rollenprivileg-Eskalation aus `user_metadata` | ✅ **BEHOBEN** – Rolle wird serverseitig begrenzt |
| F-007 | `search_path` ungesetzt auf DB-Funktionen | ✅ **BEHOBEN** – `set search_path = public, pg_temp` |
| F-008 | Zirkuläre RLS-Rekursion | ✅ **BEHOBEN** – `SECURITY DEFINER`-Helferfunktionen |
| F-009 | `auth_rls_initplan` Performance-Warn | ✅ **BEHOBEN** – `(select auth.uid())` in Policies |
| F-010 | Mehrfach-Permissive-Policies | ✅ **BEHOBEN** – SELECT-Policies zusammengeführt |
| F-011 | Interne Seiten ohne Auth-Guard | ✅ **BEHOBEN** – berichte, dokumente, instruments |
| WARN | Leaked Password Protection | ⚠️ **MANUELL** – im Supabase Dashboard aktivieren (Pro Plan) |

**Verbleibendes Risiko:** Mittel/niedrig (Leaked Password Protection, unused_index INFO).

---

## 2) Methodik

- Whitebox-Review des Quellcodes in `src/` (Routes, Actions, Components, Middleware, Supabase-Clients).
- Prüfung der Projektkonfiguration (`next.config.ts`, `package.json`, PWA/Serwist).
- Prüfung Supabase-Projekt `amjxgutnnnpjbjigzwpo`:
  - Tabellenstruktur (`list_tables`, Schema `public`, verbose)
  - Security Advisors (`get_advisors`, Typ `security`)
  - Performance Advisors (`get_advisors`, Typ `performance`)
- Dependency-Check auf bekannte CVEs (`validate_cves`, npm) -> keine bekannten CVEs im geprüften Set.

---

## 3) Kritische/Hohe Findings

## F-001 – **Kritisch** – RLS deaktiviert auf allen Kern-Tabellen

**Befund:** Supabase Advisor meldet `rls_disabled_in_public` für zentrale Tabellen, u.a.:  
`profiles`, `child_profiles`, `tours`, `tour_guides`, `tour_participants`, `materials`, `tour_materials`, `material_reservations`, `tour_reports`, `report_images`, `documents`.

**Auswirkung:** Bei direktem Zugriff auf PostgREST-Endpunkte (mit gültigem Token) fehlt Zeilenisolation. Daten anderer Nutzer/Teilnehmer können gelesen oder manipuliert werden.

**Risiko:** Vollständiger Datenschutz-/Integritätsbruch (PII, Gesundheitsdaten, Notfallkontakte).

**Empfehlung (sofort):**
1. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` auf allen Public-Tabellen.
2. Explizite `SELECT/INSERT/UPDATE/DELETE`-Policies je Rolle (`member`, `parent`, `guide`, `admin`).
3. Schreiboperationen nur auf eigene Daten erlauben; Guide/Admin nur scoped auf zugewiesene Touren.

---

## F-002 – **Hoch** – Open Redirect im Auth Callback

**Datei:** `src/app/auth/callback/route.ts`

**Befund:** `next`-Queryparameter wird ungeprüft an Redirect angehängt:
- `const next = requestUrl.searchParams.get("next") ?? "/"`
- `return NextResponse.redirect(`${await getServerURL()}${next}`)`

**Auswirkung:** Je nach Eingabeformat kann unerwartete Weiterleitung erfolgen (Phishing-/Session-Fixation-Szenarien).

**Empfehlung:**
- Nur relative Pfade aus Whitelist zulassen (z.B. `^/[a-zA-Z0-9/_-]*$`).
- `//`, `http:`, `https:`, `%2f%2f` und Backslashes explizit blocken.

---

## F-003 – **Hoch** – Fehlender expliziter CSRF-Schutz bei schreibenden Endpunkten

**Betroffen u.a.:**
- `src/app/api/profile/update/route.ts`
- `src/app/api/profile/child/route.ts`
- Server Actions in `src/app/actions/*.ts`

**Befund:** Sessions laufen Cookie-basiert; es gibt keinen expliziten CSRF-Token-/Origin-Check in den API-Routen.

**Auswirkung:** Bei ungünstiger Cookie-/SameSite-Konfiguration oder Browser-/Integrationsszenarien können ungewollte Schreibaktionen ausgelöst werden.

**Empfehlung:**
- Origin/Referer-Validation auf mutierenden Routen.
- Anti-CSRF-Token bei Form-POSTs.
- Nur `POST` für Mutationen und strikt `Content-Type` validieren.

---

## F-004 – **Hoch** – IDOR-Risiko bei Kind-Anmeldungen (`childId`) in Tour-Registrierung

**Datei:** `src/app/actions/tour-registration.ts`

**Befund:** In `registerForTour` wird `childId` aus `FormData` direkt verwendet.  
Es fehlt eine serverseitige Ownership-Prüfung (`child_profiles.parent_id = session.user.id`), bevor `child_profile_id` in `tour_participants` gespeichert wird.

**Auswirkung:** Ein eingeloggter Nutzer könnte versuchen, eine fremde `child_profile_id` zu verwenden (Insecure Direct Object Reference / Object-Level Authorization Gap).

**Empfehlung:**
- Vor Insert zwingend prüfen, ob `childId` zum aktuellen Parent gehört.
- Bei Verstoß mit `403` abbrechen und Audit-Event protokollieren.

---

## F-005 – **Hoch** – Fehlende harte Feldvalidierung in mutierenden Endpunkten

**Betroffen u.a.:**
- `src/app/api/profile/update/route.ts`
- `src/app/api/profile/child/route.ts`
- `src/app/actions/tour-management.ts`

**Befund:** Eingaben werden primär als Strings übernommen; es gibt keine zentrale Schema-Validierung (z.B. Länge, erlaubte Zeichensätze, Datumsgrenzen, Normalisierung).

**Auswirkung:** Erhöhtes Risiko für Datenintegritätsprobleme, ungewollte Zustände und sekundäre Sicherheitsfolgen (z.B. unerwartete UI-/Business-Logik-Effekte).

**Empfehlung:**
- Serverseitige Zod/Valibot-Schemas je Endpunkt.
- Einheitliche Sanitization und harte Allow-Lists für Enum-/Statusfelder.

---

## 4) Weitere wichtige Findings

## F-006 – **Mittel** – Auth-Identitätsprüfung teils mit `getSession()` statt `getUser()`

**Befund:** In mehreren Stellen wird `getSession()` für Autorisierungsentscheidungen genutzt.

**Auswirkung:** Erhöhtes Risiko inkonsistenter Sessionvalidierung bei Randfällen.

**Empfehlung:** Für sicherheitskritische Entscheidungen bevorzugt `supabase.auth.getUser()` verwenden.

## F-007 – **Mittel** – PWA Offline/Cache kann personenbezogene Daten lokal vorhalten

**Betroffen:** `src/app/sw.ts`, Serwist Runtime Caching.

**Befund:** Dokument-Navigationen erhalten Offline-Fallback; je Cache-Strategie können authentifizierte Inhalte lokal gespeichert bleiben.

**Auswirkung:** Datenschutzrisiko auf gemeinsam genutzten Geräten.

**Empfehlung:**
- Kein dauerhaftes Caching sensibler Routen (`/profile`, Teilnehmerlisten, medizinische Notizen).
- Sessionwechsel/Signout -> Caches gezielt invalidieren.
- Klare Datenschutzhinweise zur Offline-Speicherung.

## F-008 – **Mittel** – Middleware-Konvention veraltet

**Befund:** Next.js-Warnung: `middleware` ist deprecated -> `proxy`.

**Auswirkung:** Wartungs-/Kompatibilitätsrisiko, potentiell zukünftige Sicherheitslücken durch Fehlmigration.

**Empfehlung:** Zeitnah auf `proxy.ts` migrieren.

## F-009 – **Mittel** – Supabase Functions mit mutable search_path

**Advisor-Befunde:**
- `public.assign_waitlist_position`
- `public.check_material_availability`
- `public.promote_waitlist`
- `public.limit_report_images`

**Auswirkung:** Risiko durch `search_path`-Manipulation bei SQL-Funktionen.

**Empfehlung:** Funktionen mit festem `search_path` deployen (z.B. `SET search_path = public, pg_temp;`).

## F-010 – **Niedrig/Mittel** – Leaked Password Protection in Supabase Auth deaktiviert

**Befund:** Advisor `auth_leaked_password_protection`.

**Empfehlung:** Feature aktivieren (HIBP-Prüfung), Passwort-Policy zusätzlich verschärfen.

## F-011 – **Niedrig** – Dev-Mode Sicherheits-/Betriebshinweise

**Beobachtet:**
- Serwist wird im Development deaktiviert (`Serwist is disabled`).
- Next.js meldet `middleware`-Deprecation zugunsten `proxy`.

**Auswirkung:** Kein direktes Exploit-Risiko, aber erhöhte Gefahr von Fehlannahmen bei Tests (PWA-Verhalten in Dev != Prod) und künftige Migrationslast.

**Empfehlung:**
- PWA-Security- und Offline-Tests immer im Production-Build durchführen.
- `middleware` zeitnah auf `proxy.ts` migrieren.

---

## 5) Supabase-Struktur (Auszug)

Projekt: `amjxgutnnnpjbjigzwpo` (`db.amjxgutnnnpjbjigzwpo.supabase.co`)  
Schema geprüft: `public`

Kern-Tabellen (alle aktuell ohne RLS, `rls_enabled=false`):
- `profiles` (rows: 8)
- `child_profiles` (rows: 3)
- `tours` (rows: 4)
- `tour_guides` (rows: 8)
- `tour_participants` (rows: 10)
- `materials` (rows: 0)
- `tour_materials` (rows: 0)
- `material_reservations` (rows: 0)
- `tour_reports` (rows: 1)
- `report_images` (rows: 0)
- `documents` (rows: 0)

Sensible Datenfelder (besonders schützenswert):
- `profiles.medical_notes`, `profiles.emergency_phone`, `profiles.phone`
- `child_profiles.medical_notes`
- Teilnehmerzuordnungen (`tour_participants`, `tour_guides`)

Zusätzliche Advisor-Befunde:
- `function_search_path_mutable` bei:
  - `public.assign_waitlist_position`
  - `public.check_material_availability`
  - `public.promote_waitlist`
  - `public.limit_report_images`
- Performance: mehrere unindexierte FKs (`unindexed_foreign_keys`) auf Join-kritischen Tabellen.

---

## 6) Dependency-Check

Geprüfte Pakete u.a.: `next`, `react`, `@supabase/*`, `@serwist/*`, `serwist`, `esbuild`, `typescript`.  
**Ergebnis:** Keine bekannten CVEs im abgefragten Set.

Hinweis: Das ersetzt keine regelmäßigen Scans im CI (z.B. weekly).

---

## 7) Priorisierter Maßnahmenplan

## Sofort (0-2 Tage)
1. RLS auf allen Public-Tabellen aktivieren.
2. Mindest-Policies für `profiles`, `child_profiles`, `tours`, `tour_participants`, `tour_guides` einführen.
3. Auth-Callback Redirect härten (Whitelist für `next`).
4. Ownership-Check für `childId` in `registerForTour` ergänzen.
5. Supabase Auth: Leaked Password Protection aktivieren.

## Kurzfristig (3-7 Tage)
1. CSRF-Härtung für mutierende API-Routen/Actions.
2. Serverseitige Schema-Validierung für alle mutierenden Inputs.
3. Sensible Routen vom Offline-Caching ausschließen.
4. SQL-Funktionen mit fixem `search_path` neu deployen.
5. Unindexierte FKs für häufig genutzte Joins nachziehen.

## Mittelfristig (1-2 Wochen)
1. Migration `middleware` -> `proxy` (Next.js 16+ kompatibel).
2. Security Regression Tests (AuthZ matrix) automatisieren.
3. Audit-Logging für schreibende Aktionen erweitern.

---

## 8) Referenzen

- Supabase Database Linter (RLS):  
  https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public
- Supabase Function search_path:  
  https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- Supabase Password Security:  
  https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Next.js Middleware -> Proxy Hinweis:  
  https://nextjs.org/docs/messages/middleware-to-proxy

---

## 9) Schlussbewertung

Der aktuelle Stand ist funktional, aber **aus Sicherheitssicht nicht produktionsreif**, solange RLS und AuthZ-Policies fehlen.  
Mit den oben priorisierten Maßnahmen kann das Risiko kurzfristig drastisch reduziert werden.

