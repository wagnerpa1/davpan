# Skripte & Wartungs-Tools (`scripts-and-tools.md`)

Dieses Dokument beschreibt die im Projekt enthaltenen CLI-Skripte für Wartungs-, Import- und Hintergrundaufgaben (konsolidiert aus `scripts/README.md`).

---

## 🛠️ Aktive Skripte (`scripts/`)

### 1. `import-section-members.mjs`
Importiert Stammdaten der DAV-Sektionsmitglieder (Mitgliedsnummer, Geburtsdatum, Name, Status) aus offiziellen DAV-Exportdateien (CSV oder JSON) in die Supabase-Mastertabelle `section_members`.

**Ausführung:**
```bash
npm run import:members -- <pfad-zur-datei.csv|json>
```

**Erforderliche Umgebungsvariablen:**
* `NEXT_PUBLIC_SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`

---

### 2. `run-notification-outbox-worker.mjs`
Dient als Worker für das Asynchrone Benachrichtigungssystem. Er liest fortlaufend ausstehende Events (`pending`) aus der Tabelle `notification_outbox` und führt den Versand von Web-Push Notifications (VAPID) und E-Mails aus.

**Ausführung:**
```bash
npm run worker:outbox
```

**Einsatzkontext:**
Verwendet in Produktionsumgebungen als Dauerläufer (z.B. via PM2 oder Container-Service), um Benachrichtigungen unabhängig von synchronen Web-Requests zu versenden.

---

## 🔄 Nützliche Admin-Befehle

```bash
# Biome Linter & Code-Formatierung
npm run lint
npm run format

# Strict TypeScript Compiler Check
npx tsc --noEmit

# Production Build prüfen (Next.js Turbopack)
npm run build
```

---
*Zurück zur [Wiki-Übersicht](file:///c:/Users/paulw/WebstormProjects/davpan/docs/README.md)*
