# Roadmap: Datenintegrität, Concurrency und Idempotenz (P2/P3)

## Status heute

- P0: Kritische Race Conditions behoben (atomic RPCs, Trigger-Sync, Resource-Booking-Fix)
- P1: DB-Härtung (Constraints/FKs/EXCLUDE) abgeschlossen
- Nächster Fokus: P2 (konsistente Mutationspfade, Event-Reihenfolge, Offline-Konflikte)

## Prioritäten

- P0 (bereits done): Runtime-Blocker und harte Datenfehler
- P1 (bereits done): Integritäts-Härtung
- P2 (jetzt): Konsolidierung/Idempotenz/Event-Ordering
- P3 (anschließend): Observability, Lasttests, SLOs, Betriebsreife

---

## P2.1 - Single Write Path (RPC-only für kritische Mutationen)

### Ziele

- Kritische Writes nur noch transaktional in Postgres (RPC)
- App-Actions nur noch für Auth, Berechtigungs-Guard, Notification und Revalidation

### Scope

- Teilnehmerstatus-Transitionen
- Materialreservierungs-Transitionen
- Private Material-Stornos

### Deliverables

- Migration mit atomaren Wrapper-RPCs
- Actions auf RPC-Aufrufe umgestellt
- Concurrency-Rückmeldung bei stale client state (z. B. `40001`)

### Akzeptanzkriterien

- Kein direkter Mehrfach-Write-Pfad mehr in Actions für obige Flows
- Doppelklick/Retry führt nicht zu inkonsistentem Bestand/Status
- Parallele Updates liefern deterministische Fehlermeldung statt stiller Überschreibung

### Tests

- Parallel `updateParticipantStatus` (gleiches Registration-ID)
- Parallel `updateReservationStatus` (gleiches Reservation-ID)
- Doppelte private Storno-Requests

---

## P2.2 - Idempotenz-Ende-zu-Ende

### Ziele

- Retries sind sicher (kein Doppel-Effekt)

### Scope

- Registrierung (`register_for_tour_atomic`)
- Teilnehmerstatus-Änderungen
- Material-/Resource-Statuswechsel

### Deliverables

- `idempotency_key`-Schema auf kritischen write-audit Tabellen
- Eindeutige Schlüsselstrategie (`user_id + operation + target + client_request_id`)
- Einheitliches Fehlermapping bei Schlüssel-Kollisionen

### Akzeptanzkriterien

- Gleiches Request-Paket mit gleichem Key erzeugt gleiche semantische Antwort
- Keine Doppel-Notifications aus Retry-Szenarien

---

## P2.3 - Event Ordering + Notification Outbox

### Ziele

- Reihenfolge-sichere und deduplizierte Zustellung

### Scope

- Statuswechsel-Events (Teilnehmer/Material/Waitlist)
- Push-Erzeugung vom synchronen Action-Path entkoppeln

### Deliverables

- `notification_outbox` Tabelle
- Worker/Job, der Outbox sequentiell verarbeitet
- `processed_events` Dedupe-Mechanik

### Akzeptanzkriterien

- Out-of-order Verarbeitung führt nicht zu falschem Endzustand im Feed/Push
- Event-Consumer ist idempotent

---

## P2.4 - Cross-Domain Konsistenz

### Ziele

- Änderungen an Touren bleiben konsistent mit Ressourcen, Material und Reports

### Scope

- Tourdatum/-zeit ändern -> ResourceBookings/Materialfenster validieren
- Tourabschluss <-> Report-Erstellung strikt
- Löschen/Archivieren mit klaren FK-Semantiken

### Deliverables

- Guard-RPC für Tour-Updates mit Konfliktcheck
- SQL-Constraints/Trigger für Report-Regeln (max. 1 Report pro Tour)
- Dokumentierte ON DELETE / ON UPDATE Matrix

### Akzeptanzkriterien

- Keine stillen Orphans
- Konflikte werden transaktional blockiert

---

## P2.5 - Offline/Sync Konfliktstrategie

### Ziele

- PWA-Queue kann Konflikte robust auflösen

### Scope

- Client queued mutations
- Server stale-write detection

### Deliverables

- Konfliktcodes + UI-Handling (`stale`, `conflict`, `capacity_exceeded`, `inventory_exceeded`)
- Retry-Policy mit Backoff und maximalen Replays

### Akzeptanzkriterien

- Offline-Replay erzeugt keine doppelten Änderungen
- Nutzer sieht klaren Konfliktzustand statt stiller Fehlschläge

---

## P3.1 - Observability und Betriebsmetriken

### Ziele

- Produktionssichtbarkeit für RPC/Trigger/Event-Pipeline

### Deliverables

- Metriken: RPC-Latenz, Fehlerraten, Konfliktraten, Promotion-Dauer
- Dashboards + Alerts
- Audit-Logging für kritische Transitionen

---

## P3.2 - Last- und Ausfallsicherheit

### Ziele

- Verifikation unter Last und bei Retries

### Deliverables

- k6-Szenarien für Registrierung/Promotion/Material/Resource
- Recovery-Runbooks (Queue-Stau, Trigger-Fehler, Dead-letter)

---

## P3.3 - Cleanup und Vereinheitlichung

### Ziele

- Historische Drift zwischen SQL/TS/UI entfernen

### Deliverables

- Zentrale Status-Mappings (`tour_status`, `participant_status`) in TS
- Deprecated Pfade entfernen
- Vollständiger Architektur-ADR für Mutationsmodell

---

## Empfohlene Reihenfolge (operativ)

1. P2.1 abschließen und deployen
2. P2.2 direkt nachziehen (Idempotency-Key)
3. P2.3 Outbox einführen
4. P2.4 + P2.5 in einem Stabilitäts-Release bündeln
5. P3 in separatem Hardening-Zyklus

## Exit-Kriterien für P2 (Go/No-Go)

- Kritische Writes laufen transaktional über RPC
- Keine bekannten doppelten Effekte bei Retry/Double-Click
- Event-Ordering ist technisch abgesichert (Outbox oder gleichwertig)
- Offline-Replay zeigt deterministisches Konfliktverhalten
- Integrationstests für Parallelität sind grün

