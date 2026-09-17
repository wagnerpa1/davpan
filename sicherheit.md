# Sicherheitsstatus - DAV Pfarrkirchen

Stand: 2026-09-17

## Executive Summary
Die produktiven Kernmassnahmen für Auth, RLS, serverseitige Autorisierung und atomare DB-Transaktionen sind vollständig umgesetzt.
Die Plattform erfüllt die ADR-Vorgaben bezüglich konsistenter Datenmutationen und RLS-Absicherung.

## Umgesetzte Kernmassnahmen
- **RLS-Policies für alle Kernobjekte**: Strikte Trennung nach Rollen (`admin`, `guide`, `materialwart`, `parent`, `member`, `guest`).
- **Sektionsmitglieder-Verifikation**: Server-seitige Prüfung gegen importierte Stammdaten (`section_members`), um gefälschte Mitgliedschaften auszuschließen.
- **Eltern-Kind-Beziehungen**: Verknüpfung über `parent_child_relations` mit RLS-Gegenprüfung und tokenbasiertem Einladungsworkflow (`child_profile_invites`).
- **Atomare RPCs & Concurrency Locks**:
  - `register_for_tour_atomic`: Überbuchungsschutz und atomare Materialzuweisung in einer Transaktion.
  - `apply_participant_status_transition_atomic`: Optimistic Locking (`expected_status`) und atomare Wartelisten-Nachrückerlogik.
  - `sync_participant_material_reservations_atomic`: Atomare Bestands- und Reservierungsanpassung bei Teilnehmerstatus-Änderungen (`FOR UPDATE`).
  - `apply_material_reservation_transition_atomic`: DB-seitige Validierung erlaubter Statusübergänge.
- **Idempotenz-Schutz**: Deterministiche Idempotency-Keys (`buildIdempotencyKey`) verhindern Doppler bei unzuverlässigen Netzwerken und Service Worker Replays.
- **Entkoppelte Fehlerklassifizierung**: Service Worker Background Sync nutzt typisierte Fehlercodes (`stale_write`, `inventory_exceeded`, `capacity_exceeded`, `invalid_state`, `unauthorized`) statt fragiler Textübereinstimmungen.
- **Origin- & CSRF-Schutz**: Next.js Server Actions CSRF-Prüfung aktiv; sensible Pfade (`/api`, `/auth`, `/admin`, `/guide`, `/profile`) werden nicht im SW-Cache zwischengespeichert.
- **Outbox-Muster**: Asynchroner Notification-Versand über `notification_outbox`, um externe Netzwerkaufrufe aus synchronen DB-Transaktionen zu isolieren.
- **Automatisierte CI/CD-Pipeline**: GitHub Actions führt bei jedem PR `lint`, `typecheck`, `test:api`, `test:integration` und `build` aus.

## Bekannte Betriebsgrenzen & Roadmap
- Supabase Leaked Password Protection ist im Free Plan nicht verfügbar.
- Materialverfügbarkeit mit datumsgenauer Intervallogik (Kalenderüberschneidung) ist als spätere Ausbaustufe geplant.

## Kompensierende Kontrollen
- RLS-Hardening und strikte rollenbasierte Zugriffskontrollen.
- Serverseitige Input-Validierung und Auth-Guards in allen Server Actions.
- Auditability und Outbox-Logging für alle relevanten Benachrichtigungen und Transaktionen.
- Automatische Bereinigung sensibler Caches bei Abmeldung über Service-Worker-Nachrichten.

## Release- und CI-Checkliste
1. `npm run lint` (Biome Check)
2. `npx tsc --noEmit` (TypeScript Compiler)
3. `npm run test:api` (Vitest Unit & API Tests)
4. `npm run test:integration` (Vitest Integration Tests)
5. `npm run build` (Next.js Turbopack Build)
6. Stichprobe der Rollenberechtigungen und Audit-Logs
