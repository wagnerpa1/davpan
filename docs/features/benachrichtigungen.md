# Benachrichtigungssystem & Notification Outbox (`benachrichtigungen.md`)

Um synchrone Datenbank-Transaktionen schnell und frei von externen Netzwerkaufrufen zu halten, nutzt die Anwendung ein **Asynchrones Notification Outbox Pattern**.

---

## 🏗️ Outbox-Architektur (`notification_outbox`)

Wenn im System ein Ereignis eintritt (z.B. Wartelisten-Nachrücken, Tourenabsage, Ausleih-Bestätigung), schreibt die jeweilige Funktion einen Eintrag in die Outbox-Tabelle:

```sql
INSERT INTO notification_outbox (
  user_id,
  event_type,
  payload,
  status
) VALUES (
  p_user_id,
  'WAITLIST_PROMOTED',
  jsonb_build_object('tour_id', p_tour_id, 'tour_title', v_tour_title),
  'pending'
);
```

### Eigenschaften der Outbox-Tabelle:
* `status`: `pending`, `processing`, `sent`, `failed`.
* `attempts`: Anzahl bisheriger Zustellversuche.
* `available_at`: Zeitstempel für nächste Retry-Ausführung (Backoff).
* `last_error`: Zuletzt aufgetretener Fehlertext (z.B. ungültige VAPID Subscription).

---

## ⚡ Abwicklung & Outbox Worker

Die Aufarbeitung der Outbox erfolgt über zwei Wege:

1. **`pg_net` Cron-Job**: Supabase PostgreSQL triggert periodisch den Webhook `/api/cron/process-outbox`.
2. **Dedicated Worker Script**: In Container-Umgebungen führt `scripts/run-notification-outbox-worker.mjs` eine kontinuierliche Polling-Schleife durch.

---

## 📬 Zustellkanäle & Opt-in Filterung

Der Worker (`dispatcher.ts`) entscheidet anhand der Einstellungen des Nutzers (`user_notification_preferences`), welche Kanäle bedient werden:

* **Web-Push Notifications**: VAPID-Verschlüsselung an angemeldete Browser/PWAs.
* **E-Mail Benachrichtigungen**: Versand wichtiger Tourenänderungen und Bestätigungen.
* **In-App Notification Badge**: Speicherung in der Tabelle `user_notifications` zur Anzeige in der Glocken-Navigation.

---
*Zurück zur [Wiki-Übersicht](file:///c:/Users/paulw/WebstormProjects/davpan/docs/README.md)*
