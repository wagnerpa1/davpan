# 🏔️ JDAV / DAV Pfarrkirchen Tourenverwaltung

![JDAV Pfarrkirchen](https://img.shields.io/badge/DAV-Sektion_Pfarrkirchen-76a355?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ecf8e?style=for-the-badge&logo=supabase)
![PWA](https://img.shields.io/badge/PWA-Ready-blueviolet?style=for-the-badge)

Eine moderne, leistungsstarke Progressive Web App (PWA) zur Organisation und Verwaltung von Bergtouren, Material und Vereinsressourcen für die **JDAV & DAV Sektion Pfarrkirchen**.

---

## 🚀 Kern-Features

*   **📅 Touren-Management**: Planung, Veröffentlichung und Anmeldung zu Vereinstouren.
*   **👥 Teilnehmerverwaltung**: Automatisierte Wartelistenlogik, Guide-Bestätigungen und Notfallkontakt-Management.
*   **🛠️ Material- & Ressourcen**: Verleih von Bergsport-Ausrüstung und Reservierung von Vereinsressourcen (z. B. Vereinsbus).
*   **👨‍👩‍👧‍👦 Eltern-Kind-System**: Zentrale Verwaltung von Kinderprofilen durch Eltern für einfache Tour-Anmeldungen.
*   **📝 Tourberichte**: Community-Feed mit bebilderten Berichten vergangener Abenteuer.
*   **📱 PWA-Erlebnis**: Installierbar auf Smartphones, Offline-Caching von Touren und Berichten sowie Push-Benachrichtigungen.
*   **📁 Dokumenten-Center**: Schneller Zugriff auf Formulare, Packlisten und Vereinsregeln.

---

## 🛠️ Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions)
*   **Sprache**: TypeScript (Strict Mode)
*   **Styling**: Tailwind CSS (Nature-themed Palette)
*   **Datenbank & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security)
*   **PWA**: [Serwist](https://serwist.js.org/) für Service Worker & Offline-Caching
*   **Icons**: Lucide React
*   **Qualität**: Biome (Linting & Formatting)

---

## 🏁 Schnellstart (Setup)

### 1. Voraussetzungen
*   **Node.js** (LTS empfohlen)
*   Ein **Supabase-Projekt** (kostenloser Plan ausreichend)

### 2. Installation
```bash
git clone https://github.com/dein-repo/davpan.git
cd davpan
npm install
```

### 3. Umgebungsvariablen
Erstelle eine `.env.local` im Root-Verzeichnis. Hier sind alle verfügbaren Konfigurationsmöglichkeiten:

| Variable | Beschreibung | Beispiel |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL deines Supabase Projekts | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Public Anon Key von Supabase | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (nur Server-seitig!) | `sb_secret_...` |
| `NEXT_PUBLIC_SITE_URL` | Öffentliche URL der App (Frontend) | `http://localhost:3000` |
| `SITE_URL` | Backend-URL der App | `http://localhost:3000` |
| `CSRF_TRUSTED_ORIGINS` | Erlaubte Origins für Server Actions | `http://localhost:3000,https://deine-domain.de` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public Key für Web Push | `BKgta...` |
| `VAPID_PRIVATE_KEY` | Private Key für Web Push | `tKdtR...` |
| `VAPID_SUBJECT` | Kontakt-Mail für Push-Services | `mailto:admin@domain.de` |
| `NOTIFICATION_DELIVERY_MODE` | Zustellungsmodus (`outbox` oder `direct`) | `outbox` |
| `SMTP_HOST` | Host für E-Mail Versand | `mail.dein-server.de` |
| `SMTP_PORT` | Port für E-Mail Versand | `587` |
| `SMTP_USER` | Benutzer für E-Mail Versand | `no-reply@domain.de` |
| `SMTP_PASS` | Passwort für E-Mail Versand | `...` |
| `TOUR_VISIBILITY_NEXT_YEAR_UNLOCK_AT` | Wann das neue Programm freigeschaltet wird | `12-01` (1. Dezember) |

**Beispiel `.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITE_URL=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
# ... weitere Variablen nach Bedarf
```

### 4. Datenbank-Setup
Die Datenbank-Struktur wird über Supabase verwaltet. Migrationen befinden sich unter `supabase/migrations/`.
Wende diese über das Supabase Dashboard oder CLI an.

### 5. Starten
```bash
npm run dev
```
Die App ist nun unter `http://localhost:3000` erreichbar.

---

## 🔐 Rollen & Berechtigungen

| Rolle | Beschreibung |
| :--- | :--- |
| **Member** | Touren einsehen, anmelden, Material anfragen, Berichte lesen. |
| **Parent** | Wie Member + Verwaltung und Anmeldung von Kindern. |
| **Guide** | Erstellung und Verwaltung eigener Touren, Teilnehmer-Bestätigung. |
| **Materialwart** | Verwaltung des Bestands und der Material-Reservierungen. |
| **Admin** | Voller Zugriff auf Benutzer, Dokumente, Ressourcen und System-Logs. |

---

## 🏗️ Projektstruktur

```text
src/
├── app/            # Next.js Pages, API-Routes & Server Actions
├── components/     # Wiederverwendbare UI-Komponenten (tours, auth, ui...)
├── hooks/          # Custom React Hooks
├── lib/            # Zentrale Logik (Auth, Supabase, Permissions)
├── utils/          # Hilfsfunktionen (Formatting, ICS, Validation)
└── types/          # TypeScript Definitionen
```

---

## 📦 Deployment

Die App ist für das Deployment auf Plattformen wie **Vercel** oder **Netlify** optimiert.
Achte darauf, dass im Deployment die `SITE_URL` und `CSRF_TRUSTED_ORIGINS` korrekt gesetzt sind, um die Sicherheitsmechanismen von Next.js Server Actions zu unterstützen.

---

## 🛡️ Qualitätssicherung

Wir setzen auf hohe Code-Qualität und Sicherheit:
*   **Linting/Formatting**: `npm run lint`
*   **Type-Check**: `npx tsc --noEmit`
*   **Security**: Alle Tabellen sind durch strikte **PostgreSQL Row Level Security (RLS)** geschützt.

---

## 📜 Lizenz & Haftung

Dieses Projekt ist für die interne Nutzung der **DAV Sektion Pfarrkirchen** bestimmt. Eine kommerzielle Weiterverbreitung ist nicht gestattet.

🏔️ **Bergheil!**
