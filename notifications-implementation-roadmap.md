# Notifications Implementierungsfahrplan

Status: Datenmodell, Notification Center, Profil-Opt-ins und Admin-News sind vorhanden. Phase 1 und Phase 2 sind abgeschlossen.

## Phase 1 - Event-Erzeugung vervollständigen

- [ ] In allen relevanten Flows Notifications erzeugen:
  - [x] Tour-Anmeldung `pending`
  - [x] Guide-Bestätigung/Ablehnung
  - [x] Wartelisten-Nachrücken
  - [x] Tour-Update/Absage
  - [x] Material-Bestätigt/Ablehnt
  - [x] Systemnachrichten
- [x] Pro Event den passenden Kanal setzen (`news`, `registration`, `waitlist`, `material`, `tour_update`, `system`, `comment`).
- [x] Immer Opt-ins prüfen (`notification_preferences`, `child_notification_preferences`).

## Phase 2 - Zielgruppenlogik (Rollen + Kinder)

- [x] User-Ziele und Kind-Ziele strikt trennen (entweder `recipient_user_id` oder `recipient_child_id`).
- [x] Elternkontext für Kind-Events sauber behandeln (Kind bekommt Tab, Eltern verwalten nur Opt-in).
- [x] Guide/Admin-only Daten nie in Payloads für normale Member ausgeben.

## Phase 3 - Push-Benachrichtigungen

- [x] Tabelle `push_subscriptions` einführen (`user_id`, `endpoint`, `keys`, `created_at`).
- [x] Opt-in/Opt-out UI im Profil um echten Browser-Push erweitern.
- [x] Edge Function oder Server-Worker zum Push-Versand bei neuem Notification-Insert.
- [x] Fehlerhandling für invalidierte Subscriptions (410/404 -> Subscription entfernen).

## Phase 4 - Realtime + UX

- [x] Supabase Realtime für `notifications` abonnieren.
- [x] Badge im Header live aktualisieren.
- [ ] Notification Item-Aktionen:
  - [x] "Alle gelesen"
  - [x] einzelne Nachricht gelesen markieren
  - [x] optional Deep-Link aus `payload.url`

## Phase 5 - Admin/System Tools

- [x] Admin-Tool für Systemnachrichten bauen.
- [x] Optionales Broadcast-Targeting:
  - [x] alle
  - [x] nur Rollen
  - [x] nur Tour-Gruppen
- [x] Audit-Log für versendete Admin-Nachrichten.

## Phase 6 - Tests und Abnahme

- [x] API-Tests für Opt-in-Filterung und RLS-Szenarien.
- [ ] E2E-Tests:
  - [ ] Parent mit mehreren Kindern
  - [ ] Nicht-Parent ohne Tabs
  - [ ] Admin-News erzeugt Benachrichtigungen
  - [ ] Erfolgsanimation der Submit-Buttons (2s)
- [ ] Lasttest für Bulk-News/Broadcast.

## Priorisierte nächste 3 Arbeitspakete

1. API- und E2E-Tests für Notifications ergänzen (Phase 6).
2. Lasttest für Bulk-News/Broadcast durchführen (Phase 6).
3. Optional: Versand-Summary (Erfolgs/Fehler-Count) in Admin-UI anzeigen.

## Bereits gestartet (Stand heute)

- `registerForTour`: erzeugt Notifications für Teilnehmer/Kinder und Guides/Admins.
- `updateParticipantStatus`: erzeugt Notifications bei Statuswechseln.
- `updateReservationStatus`: erzeugt Material-Notifications für User/Kinder.
- `promoteWaitlistParticipants`: rückt Warteliste automatisch nach und benachrichtigt alle Betroffenen.
- `updateTour`/`deleteTour`: versendet `tour_update` bei Touränderung/Absage.
- `/api/admin/system-notifications`: versendet `system`-Benachrichtigungen an alle Opt-ins.





