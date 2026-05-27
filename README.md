# 🏔️ DAV Pfarrkirchen Tourenverwaltung

![DAV Pfarrkirchen](https://img.shields.io/badge/DAV-Sektion_Pfarrkirchen-76a355?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ecf8e?style=for-the-badge&logo=supabase)
![PWA](https://img.shields.io/badge/PWA-Ready-blueviolet?style=for-the-badge)

Eine moderne, leistungsstarke Progressive Web App (PWA) zur Organisation und Verwaltung von Bergtouren, Material und Vereinsressourcen für die **DAV Sektion Pfarrkirchen**.

---

## 🚀 Kern-Features

*   **📅 Touren-Management**: Planung, Veröffentlichung und Anmeldung zu Vereinstouren.
*   **👥 Teilnehmerverwaltung**: Automatisierte Wartelistenlogik, Guide-Bestätigungen und Notfallkontakt-Management.
*   **🛠️ Material- & Ressourcen**: Verleih von Bergsport-Ausrüstung und Reservierung von Vereinsressourcen (z. B. Vereinsbus).
*   **👨‍👩‍👧‍👦 Eltern-Kind-System**: Zentrale Verwaltung von Kinderprofilen durch Eltern für einfache Tour-Anmeldungen.
*   **📝 Tourberichte**: Community-Feed mit bebilderten Berichten vergangener Abenteuer.
*   **📱 PWA-Erlebnis**: Installierbar auf Smartphones, Offline-Caching von Touren und Berichten sowie Push-Benachrichtigungen.
*   **📁 Dokumenten-Center**: Schneller Zugriff auf Formulare, Packlisten und Vereinsregeln.

## 🛠️ Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions)
*   **Sprache**: TypeScript (Strict Mode)
*   **Styling**: Tailwind CSS (Nature-themed Palette)
*   **Datenbank & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security)
*   **PWA**: [Serwist](https://serwist.js.org/) für Service Worker & Offline-Caching
*   **Icons**: Lucide React
*   **Qualität**: Biome (Linting & Formatting)
## Was das Projekt braucht

Für die lokale Entwicklung und das Deployment werden diese Bausteine verwendet:

* Next.js App Router für Frontend, API-Routen und Server Actions
* Supabase für Auth, PostgreSQL, Storage und Migrationen
* Supabase CLI für lokale Entwicklung und Datenbank-Migrationen
* Serwist für Service Worker und Offline-Caching
* Appwrite oder ein anderer Node-fähiger Host für geplante Jobs und Worker-Aufrufe

## Voraussetzungen

Vor der Einrichtung brauchst du:

* Node.js 20 oder neuer
* npm
* Docker Desktop, wenn du `supabase start` lokal verwenden willst
* Supabase CLI
* Ein Supabase-Projekt für Produktion oder Staging

## Initialisierung

### 1. Repository klonen und Pakete installieren

```bash
git clone <repository-url>
cd davpan
npm install
```

### 2. Supabase CLI installieren und anmelden

Installiere die CLI einmalig, falls sie noch nicht vorhanden ist:

```bash
npm install -g supabase
supabase login
```

### 3. Lokale Supabase-Umgebung starten

Das Repository enthält bereits den kompletten `supabase/`-Ordner. Du musst also kein neues Projekt initialisieren. Starte stattdessen die lokale Umgebung:

```bash
supabase start
```

Die CLI gibt dir danach die lokalen Zugangsdaten aus. Falls du sie später nachschauen willst, nutze:

```bash
supabase status
```

### 4. Migrationen anwenden

Für lokale Tests kannst du die Datenbank mit den Migrationen zurücksetzen:

```bash
supabase db reset
```

Wenn du gegen ein bereits verknüpftes Remote-Projekt arbeitest, verbinde das Repo mit der Zielinstanz und schiebe die Migrationen dorthin:

```bash
supabase link --project-ref <dein-project-ref>
supabase db push
```

### 5. Umgebungsvariablen anlegen

Kopiere `env.example` nach `.env.local` und trage die Werte ein:

```bash
copy env.example .env.local
```

Wichtige Variablen:

| Variable | Beschreibung |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Public/PUBLISHABLE Key für den Client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Service Role Key |
| `NEXT_PUBLIC_SITE_URL` | Öffentliche App-URL im Browser |
| `SITE_URL` | Server-seitige Basis-URL |
| `CSRF_TRUSTED_ORIGINS` | Komma-getrennte erlaubte Origins |
| `NOTIFICATION_DELIVERY_MODE` | `outbox` empfohlen |
| `INTERNAL_CRON_SECRET` | Geheimer Token für den internen Outbox-Worker |
| `SMTP_HOST` | SMTP-Host für E-Mails |
| `SMTP_PORT` | SMTP-Port, meist `587` |
| `SMTP_SECURE` | `true` oder `false`, abhängig vom SMTP-Server |
| `SMTP_USER` | SMTP-Benutzer |
| `SMTP_PASS` | SMTP-Passwort |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Öffentlicher Web-Push-Key |
| `VAPID_PRIVATE_KEY` | Privater Web-Push-Key |
| `VAPID_SUBJECT` | Mailadresse für VAPID |
| `TOUR_VISIBILITY_NEXT_YEAR_UNLOCK_AT` | Freischaltdatum für das nächste Tourenjahr |

Beispiel für `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITE_URL=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
NOTIFICATION_DELIVERY_MODE=outbox
INTERNAL_CRON_SECRET=change-me
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@example.com
SMTP_PASS=secret
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@example.com
TOUR_VISIBILITY_NEXT_YEAR_UNLOCK_AT=12-01
```

### 6. App lokal starten

```bash
npm run dev
```

Die App läuft danach unter `http://localhost:3000`.

## Notification Worker

Der Outbox-Worker ist ein Node-Skript, kein Edge-Worker. Er wird über `INTERNAL_CRON_SECRET` autorisiert und ruft die interne API der App auf.

Lokal kannst du ihn so testen:

```bash
$env:INTERNAL_CRON_SECRET="change-me"
npm run worker:outbox
```

Wenn du ihn gegen eine deployed App testen willst, setze zusätzlich `OUTBOX_WORKER_URL` auf die öffentliche API-Route:

```bash
$env:OUTBOX_WORKER_URL="https://deine-domain.tld/api/internal/notifications/outbox"
$env:INTERNAL_CRON_SECRET="change-me"
npm run worker:outbox
```

## Deployment

Für ein Deployment auf Appwrite oder einer anderen Node-Plattform gilt:

* gleiche Supabase-Werte wie lokal, aber mit den Produktions-Keys
* `SITE_URL` und `CSRF_TRUSTED_ORIGINS` auf die produktive Domain setzen
* `INTERNAL_CRON_SECRET` in Appwrite als Secret/Env setzen
* `OUTBOX_WORKER_URL` auf die produktive URL der internen Outbox-Route setzen
* SMTP-Zugangsdaten für den produktiven Mailversand hinterlegen
* Cron/Scheduler in Appwrite so konfigurieren, dass der Worker regelmäßig gestartet wird

Die Supabase-Migrationen werden mit der CLI in das Zielprojekt übertragen:

```bash
supabase link --project-ref <dein-project-ref>
supabase db push
```

## Tech Stack

* [Next.js](https://nextjs.org/) (App Router, Server Actions)
* TypeScript
* Tailwind CSS
* [Supabase](https://supabase.com/)
* [Serwist](https://serwist.js.org/)
* Lucide React
* Biome

## Projektstruktur

```text
src/
├── app/            # Next.js Pages, API-Routes & Server Actions
├── components/     # Wiederverwendbare UI-Komponenten
├── hooks/          # Custom React Hooks
├── lib/            # Zentrale Logik (Auth, Supabase, Permissions)
├── utils/          # Hilfsfunktionen
└── types/          # TypeScript Definitionen
```

## Qualitätssicherung

```bash
npm run lint
npm run test:api
npm run test:e2e
npm run build
```

## Rollen & Berechtigungen

| Rolle | Beschreibung |
| :--- | :--- |
| **Member** | Touren einsehen, anmelden, Material anfragen, Berichte lesen. |
| **Parent** | Wie Member + Verwaltung und Anmeldung von Kindern. |
| **Guide** | Erstellung und Verwaltung eigener Touren, Teilnehmer-Bestätigung. |
| **Materialwart** | Verwaltung des Bestands und der Material-Reservierungen. |
| **Admin** | Voller Zugriff auf Benutzer, Dokumente, Ressourcen und System-Logs. |

## Lizenz & Haftung

Dieses Projekt ist für die interne Nutzung der **DAV Sektion Pfarrkirchen** bestimmt. Eine kommerzielle Weiterverbreitung ist nicht gestattet.

🏔️ **Bergheil!**
