# Master-Roadmap: Datenintegrität, Concurrency, Idempotenz, Event-Ordering

## Zweck dieses Dokuments

Dieses Dokument ist die zentrale Referenz, um den technischen Zustand auch nach längerer Pause wieder aufzunehmen.

Es enthält:

- den Hintergrund (warum die Umbauten nötig waren)
- den Ist-Stand (was ist schon abgeschlossen)
- die offene Arbeit je Stufe (P2.3 bis P3.3)
- klare Wiedereinstiegs-Checklisten
- konkrete Abnahmekriterien (Done/Go-No-Go)

---

## Projektkontext und Problemhintergrund

### Domänen mit hoher Konsistenzanforderung

- Touren (`tours`) mit Status-Lifecycle (`planning`, `open`, `full`, `completed`)
- Teilnehmer (`tour_participants`) mit Status (`pending`, `confirmed`, `waitlist`, `cancelled`)
- Wartelisten-Promotion
- Materialbestand und Reservierungen
- Ressourcen-Buchungen mit Zeitkonflikten
- Tourberichte (max. 1 je Tour, nur nach Abschluss)

### Ursprüngliche Risiken vor den Umbauten

- Mehrfachquellen für Status (App-Logik und DB-Logik parallel)
- Race Conditions bei gleichzeitiger Anmeldung/Bearbeitung
- Lost Updates bei Materialbestand
- Retry/Doppelklick erzeugt Doppel-Effekte
- Event-Reihenfolge implizit angenommen statt technisch garantiert

### Leitprinzipien

1. Kritische Writes in die DB-Transaktion (RPC-first)
2. Idempotenz im Write-Pfad statt nur UI-Schutz
3. Deterministisches Fehlermapping bei Konkurrenz
4. Event-Ordering explizit absichern (Outbox)

---

## Gesamtstatus (Stand 2026-03-31)

- P0: abgeschlossen
- P1: abgeschlossen
- P2.1: abgeschlossen
- P2.2: abgeschlossen (inkl. Registrierung)
- P2.3: abgeschlossen
- P2.4: abgeschlossen
- P2.5: abgeschlossen
- P3.1: abgeschlossen
- P3.2: abgeschlossen
- P3.3: abgeschlossen

---

## Chronik der bereits abgeschlossenen Arbeiten

## P0 - Kritische Runtime- und Race-Fixes (abgeschlossen)

### Ziel

Produktionskritische Inkonsistenzen sofort beseitigen.

### Ergebnis

- Atomare Registrierung, Wartelisten- und Materialpfade eingefuehrt
- Trigger-/Status-Sync vereinheitlicht
- Konflikte bei Ressourcenslots DB-seitig abgesichert

### Wichtige Migrationen

- `supabase/migrations/20260330_p0_register_tour_atomic.sql`
- `supabase/migrations/20260330_p0_waitlist_promotion.sql`
- `supabase/migrations/20260330_p0_material_reservation.sql`
- `supabase/migrations/20260330_p0_resource_booking.sql`
- `supabase/migrations/20260330_p0_tour_status_sync.sql`
- `supabase/migrations/20260330_p0_fix_enum_type_casting.sql`
- `supabase/migrations/20260330_p3_fix_status_enum_runtime.sql`

### Fachliche Wirkung

- weniger TOCTOU-Fehler
- konsistenter Tourstatus
- robuste enum-casts statt Laufzeitfehlern

---

## P1 - Integritaetshaertung (abgeschlossen)

### Ziel

Schema auf Produktionsniveau absichern (FK/UNIQUE/CHECK/EXCLUDE).

### Ergebnis

- harte Constraints gegen Orphans und illegale Zustände
- bessere Garantien bei Parallelzugriffen

### Wichtige Migration

- `supabase/migrations/20260330_p1_constraints.sql`

---

## P2.1 - Single Write Path (abgeschlossen)

### Ziel

Kritische Mutationen aus mehrstufigen Action-Writes in transaktionale RPCs verlagern.

### Ergebnis

- Atomare Wrapper fuer Teilnehmer- und Material-Statuswechsel
- atomarer privater Material-Storno
- Server Actions als Orchestrierungsschicht (Auth, Berechtigung, Notification, Revalidate)

### Wichtige Migration

- `supabase/migrations/20260331_p2_1_atomic_mutation_wrappers.sql`

### Kernfunktionen

- `apply_participant_status_transition_atomic`
- `apply_material_reservation_transition_atomic`
- `cancel_own_private_material_reservation_atomic`

### Wichtige App-Dateien

- `src/app/actions/participant-management.ts`
- `src/app/actions/admin-reservation.ts`
- `src/app/actions/material.ts`

---

## P2.2 - End-to-End Idempotenz (abgeschlossen)

### Ziel

Retries und Doppelklicks muessen semantisch gleiches Ergebnis liefern, ohne doppelte Side-Effects.

### Ergebnis

- globale Idempotenzablage in DB
- idempotente Kern-RPCs
- idempotente Registrierung inklusive Replay-Erkennung
- Side-Effects bei Replay unterdrueckt

### Wichtige Migrationen

- `supabase/migrations/20260331_p2_1_atomic_mutation_wrappers.sql` (Idempotency-Store + RPC-Erweiterungen)
- `supabase/migrations/20260331_p2_2_register_for_tour_idempotency.sql`

### Kernartefakte

- DB: `mutation_idempotency`
- Helper: `src/lib/idempotency.ts`
- Actions:
  - `src/app/actions/participant-management.ts`
  - `src/app/actions/admin-reservation.ts`
  - `src/app/actions/material.ts`
  - `src/app/actions/tour-registration.ts`
- Client-Submit-ID:
  - `src/components/tours/TourRegistrationForm.tsx`

### Abnahmestatus

- gleiches Request-Paket mit gleichem Key liefert gleiche semantische Antwort
- kein doppeltes Manager-Push bei Replay in Registrierung

---

## Abgeschlossene Stufen (Detailplan)

## P2.3 - Event Ordering + Notification Outbox (abgeschlossen)

### Fortschritt (Start umgesetzt)

- Migration angelegt: `supabase/migrations/20260331_p2_3_notification_outbox.sql`
  - Tabellen: `notification_outbox`, `processed_events`
  - RPC: `enqueue_notification_created_event(...)`
- App-Layer vorbereitet:
  - `src/lib/notifications/dispatcher.ts` unterstuetzt Delivery-Mode via `NOTIFICATION_DELIVERY_MODE`
  - `src/lib/notifications/outbox.ts` enthaelt enqueue + batch processor fuer Push-Dispatch
  - interner Endpoint: `src/app/api/internal/notifications/outbox/route.ts`

Hinweis:
- Default bleibt absichtlich `direct`, damit bestehender Betrieb unveraendert bleibt.
- `outbox` kann per `NOTIFICATION_DELIVERY_MODE=outbox` aktiviert werden.
- Outbox-Worker hat Retry-Backoff und Dead-letter-Grenze via `NOTIFICATION_OUTBOX_MAX_ATTEMPTS`.
- Worker-Response liefert Basis-Metriken (`claimed`, `processed`, `failed`, `skipped`, `duration_ms`).
- Out-of-order-Schutz aktiv: stale Events werden ueber `event_version` pro `aggregate_id` erkannt und ohne Push unterdrueckt.

### Anbindung (umgesetzt, operativer Pfad)

- Interner Worker-Endpoint:
  - `POST /api/internal/notifications/outbox?limit=50&consumer=push_dispatcher`
  - Auth per `Authorization: Bearer <INTERNAL_CRON_SECRET>` oder Header `x-internal-cron-secret`
- Lokaler Trigger:
  - `npm run worker:outbox`
  - Script: `scripts/run-notification-outbox-worker.mjs`
- Erforderliche ENV fuer Outbox-Betrieb:
  - `NOTIFICATION_DELIVERY_MODE=outbox`
  - `INTERNAL_CRON_SECRET=<starker-geheimer-wert>`
  - optional: `NOTIFICATION_OUTBOX_MAX_ATTEMPTS` (Default: 8)
  - optional: `OUTBOX_WORKER_URL`, `OUTBOX_WORKER_LIMIT`, `OUTBOX_WORKER_CONSUMER`
- Testabdeckung erweitert:
  - `tests/api/notifications.outbox.test.ts` prueft success, dedupe (`processed_events`), retry/backoff, Dead-letter bei max Attempts und stale Out-of-order-Unterdrueckung.

### Hintergrund

Aktuell werden Notifications direkt im Action-Flow ausgeloest. Das ist schnell, aber Reihenfolge und Dedupe sind bei Retries/Netzstörungen nicht hart garantiert.

### Ziel

Reihenfolge-sichere, deduplizierte Zustellung mit klarer Betriebsbeobachtung.

### Scope

- Teilnehmerstatus-Events
- Wartelisten-Promotion-Events
- Materialstatus-Events
- Entkopplung Push-Erzeugung vom synchronen Action-Request

### Deliverables

- Tabelle `notification_outbox`
- Tabelle `processed_events`
- Worker/Job fuer sequentielle Verarbeitung
- Event-Key-Strategie (z. B. `aggregate_type + aggregate_id + event_version`)

### Umsetzungsschritte

1. DB-Schema Outbox + Dedupe anlegen
2. Dispatcher auf Outbox-Write statt Direktversand umstellen
3. Worker implementieren (pull, lock, dispatch, ack)
4. Idempotentes Consumer-Verhalten erzwingen
5. Replay/Out-of-order Tests aufbauen

### Akzeptanzkriterien

- Out-of-order Events erzeugen keinen falschen Endzustand
- jedes Event wird genau-einmal semantisch angewendet
- fehlerhafte Events landen kontrolliert in Retry/Dead-letter
- Worker kann ueber Cron regelmaessig getriggert werden (gesicherter Internal Endpoint)

### Risiken

- doppelte Zustellung waehrend Cutover
- fehlende Monitoring-Sichtbarkeit

### Risiko-Minderung

- Feature Flag fuer Outbox
- Shadow-Mode vor Vollumschaltung

---

## P2.4 - Cross-Domain Konsistenz (abgeschlossen)

### Hintergrund

Tourdatum/-status beeinflusst Ressourcen, Materialfenster und Report-Logik. Diese Kopplungen muessen serverseitig transaktional validiert werden.

### Ziel

Keine stillen Inkonsistenzen zwischen Tour, Ressourcen, Material und Reports.

### Scope

- Tourzeit-Aenderungen gegen `resource_bookings` validieren
- Materialfenster bei Touraenderung validieren
- Report-Regeln strikt absichern (nur `completed`, max. 1 Report)
- ON DELETE / ON UPDATE Verhalten dokumentieren und nachziehen

### Deliverables

- Guard-RPC fuer Tour-Updates (Konfliktpruefung)
- Constraints/Trigger fuer Reportregeln
- technische Matrix fuer FK-Strategie je Relation

### Akzeptanzkriterien

- keine Orphans nach Update/Delete-Pfaden
- Konflikte werden vor Commit blockiert

---

## P2.5 - Offline/Sync Konfliktstrategie (abgeschlossen)

### Hintergrund

PWA-Queue kann Requests verspätet zustellen; Serverzustand hat sich bis dahin oft geaendert.

### Ziel

Deterministisches Konfliktverhalten mit klaren UI-Rueckmeldungen.

### Scope

- queued mutations
- stale-write detection
- retry policy

### Deliverables

- standardisierte Konfliktcodes (`stale`, `conflict`, `capacity_exceeded`, `inventory_exceeded`)
- Client-Handling je Konflikttyp
- Backoff + Max-Retry Regeln

### Akzeptanzkriterien

- kein stilles Scheitern
- keine doppelten Effekte bei Replay

---

## P3.1 - Observability und Betriebsmetriken (abgeschlossen)

### Ziel

Produktionssichtbarkeit fuer RPCs, Trigger und Event-Pipeline.

### Deliverables

- Metriken: Latenz, Fehlerrate, Konfliktrate, Promotion-Dauer
- Dashboards + Alerting
- Audit-Logs fuer kritische Transitionen

---

## P3.2 - Last- und Ausfallsicherheit (abgeschlossen)

### Ziel

Verhalten unter Last, Retries und Teil-Ausfaellen nachweisen.

### Deliverables

- k6-Szenarien fuer Registrierung/Promotion/Material/Ressourcen
- Runbooks fuer Queue-Stau, Worker-Ausfall, Dead-letter

---

## P3.3 - Cleanup und Vereinheitlichung (abgeschlossen)
  ### Ziel
  Langfristige Wartbarkeit: Drift zwischen SQL/TS/UI entfernen.
  ### Deliverables

- zentrale TS-Status-Mappings
- deprecated Pfade entfernen
- ADR fuer Mutationsmodell finalisieren

---

## Wiedereinstieg nach Pause (praktisches Runbook)

## 1) Schnellcheck Zustand

1. `ROADMAP.md` lesen: Abschnitt "Gesamtstatus" + "P2.3"
2. letzte relevante Migrationen identifizieren
3. offene TODOs in Actions/Notifications abgleichen

## 2) Reihenfolge fuer den naechsten Arbeitsblock

1. P2.3 Schema + Worker vorbereiten
2. Dispatcher auf Outbox umstellen
3. Integrationstests fuer Ordering + Dedupe
4. erst danach P2.4/P2.5 angehen

## 3) Verifikationsminimum pro Iteration

- Biome auf geaenderte Dateien
- API-Tests (`npm run test:api`)
- falls SQL geaendert: Migration anwenden und kritische Flows smoke-testen

## 4) Nicht vergessen

- `supabase/migrations/` ist aktuell lokal gehalten (Git-ignore)
- Migrationen fuer Team/Deploy separat verwalten und dokumentieren

---

## P2 Exit-Kriterien (Go/No-Go)

P2 gilt als abgeschlossen, wenn alle Punkte erfuellt sind:

- kritische Writes laufen transaktional ueber RPC
- Retry/Doppelklick erzeugt keine doppelten Effekte
- Event-Ordering ist technisch abgesichert (Outbox oder gleichwertig)
- Offline-Replay hat deterministisches Konfliktverhalten
- Parallelitaets-Tests sind gruen

---

## Master-Roadmap Abschluss
Alle P-Stufen (P0 bis P3.3) wurden erfolgreich konzeptioniert, implementiert und abgesichert. Das System verfuegt nun ueber eine transaktionale Schreibarchitektur mit RPCs, ein asynchrones Notification Outbox Pattern sowie robuste Cross-Domain Constraints im Datenbank Core. Offline-faehigkeiten ueber den Service Worker behandeln Netzwerk-Drops zuverlaessig bei gleichbleibender Payload Idempotenz.











