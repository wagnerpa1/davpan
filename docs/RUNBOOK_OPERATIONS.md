# Operations Runbook: Outbox, Queues & Retries

Dieses Dokument beschreibt Maßnahmen bei Fehlverhalten des Event-Systems (P3.x).

## Vorfall: Queue-Stau (Pending Events steigen)

**Symptome:**
- Das Observability-Dashboard zeigt ansteigende `Pending`-Zahlen.
- Push-Notifications kommen verspätet oder gar nicht an.

**Ursachenforschung:**
1. Prüfen, ob der Background-Worker (`npm run worker:outbox`) läuft.
2. In der Tabelle `notification_outbox` nachsehen, ob ein Event die Queue blockiert (Locking-Fehler).
3. Latenz der Third-Party APIs (Web-Push/VAPID) überprüfen.

**Lösung:**
Falls der Worker ausgefallen ist:
```bash
# Neustart des Notification Outbox Workers
pm2 restart outbox-worker
```

## Vorfall: Erhöhte Fehlerrate (Failed Events steigen)

**Symptome:**
- Das Dashboard zeigt eine hohe Anzahl an `Failed`-Events in der Outbox.

**Ursachenforschung:**
1. Prüfen der `last_error` Spalte in `notification_outbox`. Häufig sind hier API-Rate-Limits oder abgelaufene VAPID-Subscriptions hinterlegt:
   ```sql
   SELECT id, event_type, last_error FROM notification_outbox WHERE status = 'failed' ORDER BY updated_at DESC LIMIT 10;
   ```

**Lösung (Dead-Letter / Retry):**
Events, die wegen temporärer Fehler fehlgeschlagen sind, können für einen neuen Versuch zurückgesetzt werden:
```sql
UPDATE notification_outbox 
SET status = 'pending', attempts = 0, available_at = NOW() 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '1 day';
```

## Vorfall: Materialbestand / Ressourcen Inkonsistenz (Trotz Guardrails)

**Symptome:**
- Ein User meldet, dass er Material nicht buchen kann, obwohl in der UI verfügbar.
- Cross-Domain Trigger schlagen an.

**Lösung:**
Durch die in P2 implementierten `idempotency_keys` und atomare RPCs sind Lost-Updates selten.
Zur Diagnose das Audit Log nutzen:
```sql
SELECT * FROM audit_logs WHERE entity_type = 'tour' AND entity_id = '...' ORDER BY created_at DESC;
```