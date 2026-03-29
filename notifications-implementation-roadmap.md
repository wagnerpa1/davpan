# Notifications Implementierungsfahrplan

Status: Datenmodell, Notification Center, Profil-Opt-ins und Admin-News sind vorhanden. Phase 1 und Phase 2 sind abgeschlossen.

## Phase 1 - Event-Erzeugung vervollstaendigen

- [ ] In allen relevanten Flows Notifications erzeugen:
  - [x] Tour-Anmeldung `pending`
  - [x] Guide-Bestaetigung/Ablehnung
  - [x] Wartelisten-Nachruecken
  - [x] Tour-Update/Absage
  - [x] Material-Bestaetigt/Ablehnt
  - [x] Systemnachrichten
- [x] Pro Event den passenden Kanal setzen (`news`, `registration`, `waitlist`, `material`, `tour_update`, `system`, `comment`).
- [x] Immer Opt-ins pruefen (`notification_preferences`, `child_notification_preferences`).

## Phase 2 - Zielgruppenlogik (Rollen + Kinder)

- [x] User-Ziele und Kind-Ziele strikt trennen (entweder `recipient_user_id` oder `recipient_child_id`).
- [x] Elternkontext fuer Kind-Events sauber behandeln (Kind bekommt Tab, Eltern verwalten nur Opt-in).
- [x] Guide/Admin-only Daten nie in Payloads fuer normale Member ausgeben.

## Phase 3 - Push-Benachrichtigungen

- [x] Tabelle `push_subscriptions` einfuehren (`user_id`, `endpoint`, `keys`, `created_at`).
- [x] Opt-in/Opt-out UI im Profil um echten Browser-Push erweitern.
- [x] Edge Function oder Server-Worker zum Push-Versand bei neuem Notification-Insert.
- [x] Fehlerhandling fuer invalidierte Subscriptions (410/404 -> Subscription entfernen).

## Phase 4 - Realtime + UX

- [ ] Supabase Realtime fuer `notifications` abonnieren.
- [ ] Badge im Header live aktualisieren.
- [ ] Notification Item-Aktionen:
  - [ ] "Alle gelesen"
  - [ ] einzelne Nachricht gelesen markieren
  - [ ] optional Deep-Link aus `payload.url`

## Phase 5 - Admin/System Tools

- [ ] Admin-Tool fuer Systemnachrichten bauen.
- [ ] Optionales Broadcast-Targeting:
  - [ ] alle
  - [ ] nur Rollen
  - [ ] nur Tour-Gruppen
- [ ] Audit-Log fuer versendete Admin-Nachrichten.

## Phase 6 - Tests und Abnahme

- [ ] API-Tests fuer Opt-in-Filterung und RLS-Szenarien.
- [ ] E2E-Tests:
  - [ ] Parent mit mehreren Kindern
  - [ ] Nicht-Parent ohne Tabs
  - [ ] Admin-News erzeugt Benachrichtigungen
  - [ ] Erfolgsanimation der Submit-Buttons (2s)
- [ ] Lasttest fuer Bulk-News/Broadcast.

## Priorisierte naechste 3 Arbeitspakete

1. Realtime-Aktualisierung im Notification Center aktivieren (Phase 4).
2. Admin-Broadcast-Targeting (Rollen/Gruppen) umsetzen (Phase 5).
3. API- und E2E-Tests fuer Notifications ergänzen (Phase 6).

## Bereits gestartet (Stand heute)

- `registerForTour`: erzeugt Notifications fuer Teilnehmer/Kinder und Guides/Admins.
- `updateParticipantStatus`: erzeugt Notifications bei Statuswechseln.
- `updateReservationStatus`: erzeugt Material-Notifications fuer User/Kinder.
- `promoteWaitlistParticipants`: rueckt Warteliste automatisch nach und benachrichtigt alle Betroffenen.
- `updateTour`/`deleteTour`: versendet `tour_update` bei Touraenderung/Absage.
- `/api/admin/system-notifications`: versendet `system`-Benachrichtigungen an alle Opt-ins.





