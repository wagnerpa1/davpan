# 🏔️ JDAV / DAV Pfarrkirchen Touren-Portal

![JDAV Pfarrkirchen Banner](file:///C:/Users/paulw/.gemini/antigravity/brain/0a549dd2-dd28-43d0-b2a7-bd7d5809bc8a/davpan_banner_1773261096131.png)

Willkommen beim zentralen Organisations-Portal der **JDAV / DAV Sektion Pfarrkirchen**. Diese Anwendung dient der effizienten Planung und Verwaltung von Bergtouren, Material und Vereinsaktivitäten.

---

## 🚀 Key Features

### 📅 Tourenverwaltung
*   **Planung & Anmeldung:** Umfangreiches System für Tourenleiter zur Erstellung und Verwaltung von Touren.
*   **Wartelisten-Logik:** Automatisches Nachrücken bei Abmeldungen.
*   **Bestätigungssystem:** Guides können Anmeldungen prüfen und bestätigen.

### 🎒 Materialmanagement
*   **Reservierung:** Teilnehmer können benötigtes Material (Gurt, Helm, etc.) direkt bei der Touranmeldung reservieren.
*   **Bestandskontrolle:** Echtzeit-Überprüfung der verfügbaren Mengen.

### 👨‍👩‍👧‍👦 Eltern-Kind-System
*   Eltern können Profile für ihre Kinder verwalten und diese gesammelt zu Touren anmelden.
*   Altersbeschränkungen werden automatisch geprüft.

### 📱 PWA & Offline
*   Optimiert für mobile Endgeräte als **Progressive Web App**.
*   Offline-Verfügbarkeit von Tourendetails und Berichten.
*   Push-Benachrichtigungen bei Statusänderungen.

---

## 🛠️ Tech Stack

*   **Framework:** [Next.js 15 (App Router)](https://nextjs.org/)
*   **Sprache:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
*   **Backend & DB:** [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage)
*   **Icons:** [Lucide React](https://lucide.dev/)
*   **PWA:** [@serwist/next](https://serwist.js.org/)

---

## 🏗️ Getting Started

### Voraussetzungen
Stelle sicher, dass du eine `.env.local` Datei mit den entsprechenden Supabase-Credentials hast:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=...
```

### Installation & Development
1.  **Dependencies installieren:**
    ```bash
    npm install
    ```
2.  **Dev-Server starten:**
    ```bash
    npm run dev
    ```
3.  **App öffnen:** [http://localhost:3000](http://localhost:3000)

---

## 📂 Projektstruktur

-   `src/app`: Next.js App Router (Pages & API Routes)
-   `src/components`: UI-Komponenten (Layout, Auth, etc.)
-   `src/utils`: Supabase-Clients und Hilfsfunktionen
-   `src/lib`: Gemeinsam genutzte Hilfsmittel & Utilities

---

## ⚖️ Lizenz
Dieses Projekt ist für die interne Nutzung der DAV Sektion Pfarrkirchen bestimmt. Alle Rechte vorbehalten.

