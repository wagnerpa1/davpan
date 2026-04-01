# Sicherheitsstatus - JDAV / DAV Pfarrkirchen

Stand: 2026-03-31

## Executive Summary
Die produktiven Kernmassnahmen für Auth, RLS und serverseitige Autorisierung sind umgesetzt.
Aktuell sind keine offenen kritischen oder hohen Sicherheits-Blocker im App-Code bekannt.

## Umgesetzte Kernmassnahmen
- RLS-Policies für Kernobjekte sind aktiv.
- Autorisierungsentscheidungen erfolgen serverseitig.
- Rollen werden nicht aus unsicheren Client-Metadaten vertraut.
- Schreibpfade nutzen DB-Constraints und atomare RPC/Trigger-Flows.
- CSRF/Origin-Schutz ist für mutierende Pfade gehärtet.
- Sensible Seiten (`/api`, `/auth`, `/admin`, `/guide`, `/profile`) werden nicht als Navigation gecacht.

## Bekannte Betriebsgrenzen
- Supabase Leaked Password Protection ist im Free Plan nicht verfügbar.
- Materialverfügbarkeit mit datumsgenauer Logik ist bewusst als späteres Feature geplant.

## Kompensierende Kontrollen
- RLS-Hardening und rollenbasierte Zugriffskontrollen.
- Serverseitige Input-Validierung und Auth-Checks.
- Monitoring/Auditability für relevante Flows.
- Begrenzte Offline-Caches und Cache-Bereinigung über Service-Worker-Nachrichten.

## Security-Checkliste für Releases
1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`
4. Stichprobe zentraler Rollenpfade (Member, Parent, Guide, Materialwart, Admin)
5. Stichprobe kritischer Flows (Touranmeldung, Warteliste, Export, Konto-Löschung)

## Hinweis zur Passwortsicherheit
Auch ohne Leaked Password Protection im Free Plan sollten starke Passwortregeln,
Account-Recovery-Prozesse und Monitoring für auffällige Login-Muster aktiv bleiben.
