# Offline-Fähigkeit & Service Worker (`sw.ts`)

Die DAV Pfarrkirchen Anwendung ist als **Offline-First PWA** konzipiert, um Bergleitern und Mitgliedern auch auf Hütten oder im alpinen Gelände ohne stabiles Mobilfunknetz Zugriff auf ihre Touren und Buchungsdaten zu ermöglichen.

---

## 🛠️ Service Worker Implementierung (`src/app/sw.ts`)

Der Service Worker wird mit **Serwist** kompiliert und steuert drei Hauptbereiche:
1. **App Shell & Asset Caching**: Statische Ressourcen (HTML, JS, CSS, Fonts, Icons) werden vorbeugend gecacht.
2. **Dynamic Data Caching**: Routen wie `/touren`, `/material`, `/profile` und `/berichte` werden mit Stale-While-Revalidate bzw. Network-First Caching bedient.
3. **BackgroundSync Queue & Replay**: Schreibende Transaktionen (Server Actions) im Offline-Zustand werden vom Service Worker abgefangen, lokal gespeichert und automatisch neu gesendet, sobald die Online-Verbindung wiederhergestellt ist.

---

## 🔒 Cache-Ausschlüsse & Sicherheitsrichtlinie

Aus Sicherheitsgründen werden bestimmte Pfade **niemals** im Service Worker gegenseitig zwischengespeichert:
* `/admin/*` (Sicherheits- & Administrationsbereich)
* `/api/auth/*` & `/login` (Authentifizierung & Token-Handling)
* `/profile/settings` (Sensible Kontoeinstellungen)

Bei einer **Abmeldung (Logout)** sendet die Anwendung eine Nachricht an den Service Worker (`SKIP_WAITING` / `CLEAR_USER_CACHES`), wodurch alle nutzerspezifischen Datencaches unverzüglich geleert werden.

---

## 🔄 BackgroundSync & Fehlerbehandlung bei Offline-Sync

Wenn eine Server Action im Offline-Zustand ausgeführt wird, fängt `runClientAction()` (`src/lib/client-action-runner.ts`) den Fehler ab und übergibt die Mutation an den Service Worker.

### Typisierte Konflikt-Klassifizierung
Statt Server-Antworten auf vage Textzeilen zu analysieren, nutzt der Service Worker die im JSON übertragene Eigenschaft `error.code` (gemäß `ActionState<T>`):

| Error Code | Beschreibung | Verhalten im Service Worker |
| :--- | :--- | :--- |
| `stale_write` | Datenstand veraltet / Parallele Änderung | Notification Badge anzeigen, Eintrag aus Queue entfernen |
| `inventory_exceeded` | Material nicht mehr im Lager verfügbar | Nutzer benachrichtigen, Retry abbrechen |
| `capacity_exceeded` | Tour in der Zwischenzeit ausgebucht | Nutzer informieren, Wartelisten-Option anbieten |
| `invalid_state` | Statusübergang nicht gestattet | Dauerhaften Fehler kennzeichnen, Retry stoppen |
| `unauthorized` | Sitzung abgelaufen | Nutzer zur erneuten Anmeldung auffordern |
| `network_error` | Kein Netz / Server vorübergehend nicht erreichbar | **Automatischer Retry** nach exponentiellem Backoff |

---

## 📱 Progressive Web App (PWA) Manifest

Das Web-App-Manifest (`src/app/manifest.ts`) definiert:
* **Display Mode**: `standalone` (Fühlt sich wie eine native App an)
* **Theme Color**: DAV Grün (`#006633`) / Dark Mode Anbindung
* **Shortcuts**: Direkte Sprünge zu *Tourenübersicht*, *Meine Buchungen* und *Materialverleih*.

---
*Zurück zur [Wiki-Übersicht](file:///c:/Users/paulw/WebstormProjects/davpan/docs/README.md)*
