# Sicherheitsstatus - JDAV / DAV Pfarrkirchen

Stand: 2026-03-31

## Executive Summary
Die produktiven Kernmassnahmen fuer Auth, RLS und serverseitige Autorisierung sind umgesetzt.
Aktuell sind keine offenen kritischen oder hohen Sicherheits-Blocker im App-Code bekannt.

## Umgesetzte Kernmassnahmen
- RLS-Policies fuer Kernobjekte sind aktiv.
- Autorisierungsentscheidungen erfolgen serverseitig.
- Rollen werden nicht aus unsicheren Client-Metadaten vertraut.
- Schreibpfade nutzen DB-Constraints und atomare RPC/Trigger-Flows.
- CSRF/Origin-Schutz ist fuer mutierende Pfade gehaertet.
- Sensible Seiten (`/api`, `/auth`, `/admin`, `/guide`, `/profile`) werden nicht als Navigation gecacht.

## Bekannte Betriebsgrenzen
- Supabase Leaked Password Protection ist im Free Plan nicht verfuegbar.
- Materialverfuegbarkeit mit datumsgenauer Logik ist bewusst als spaeteres Feature geplant.

## Kompensierende Kontrollen
- RLS-Hardening und rollenbasierte Zugriffskontrollen.
- Serverseitige Input-Validierung und Auth-Checks.
- Monitoring/Auditability fuer relevante Flows.
- Begrenzte Offline-Caches und Cache-Bereinigung ueber Service-Worker-Nachrichten.

## Security-Checkliste fuer Releases
1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`
4. Stichprobe zentraler Rollenpfade (Member, Parent, Guide, Materialwart, Admin)
5. Stichprobe kritischer Flows (Touranmeldung, Warteliste, Export, Konto-Loeschung)

## Hinweis zur Passwortsicherheit
Auch ohne Leaked Password Protection im Free Plan sollten starke Passwortregeln,
Account-Recovery-Prozesse und Monitoring fuer auffaellige Login-Muster aktiv bleiben.
