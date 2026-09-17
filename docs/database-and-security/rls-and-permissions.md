# Sicherheit, Row-Level Security (RLS) & Berechtigungen (`rls-and-permissions.md`)

Dieses Dokument konsolidiert die Sicherheits- und Berechtigungsarchitektur der DAV Pfarrkirchen Anwendung (`davpan`).

---

## 🔒 Sicherheitskonzept & Executive Summary

* **PostgreSQL Row-Level Security (RLS)**: Jede schreibende und lesende Operation wird direkt in PostgreSQL authentifiziert und autorisiert.
* **Server-Seitige Berechtigungsprüfung**: Ergänzend zu RLS erzwingen Server Actions vor jedem RPC Aufruf Autorisierungs-Guards (`requireRole`, `requireSectionMember`).
* **CSRF & Origin Protection**: Next.js Server Actions CSRF-Schutz ist aktiv. Sensible Pfade (`/admin`, `/api/auth`, `/profile`) sind im Service Worker vom Caching ausgeschlossen.

---

## 🎭 Benutzerrollen (`user_role`)

| Rolle | Beschreibung | Zugriffsrechte |
| :--- | :--- | :--- |
| `guest` | Unverifizierter Nutzer | Kann öffentliche Touren & Berichte einsehen. keine Buchungsrechte. |
| `member` | Verifiziertes DAV-Mitglied | Kann Touren & Material buchen, eigene Daten & Kinder verwalten. |
| `guide` | Tourenleiter / Fachübungsleiter | Kann Touren erstellen, Teilnehmer verwalten & Berichte schreiben. |
| `materialwart` | Ausrüstungsverwalter | Kann Materialbestand, Reparaturen & Buchungsfreigaben verwalten. |
| `admin` | Sektions-Administrator | Vollzugriff auf alle Stammdaten, Rollenvergabe & System-Tools. |

---

## 📋 Row-Level Security (RLS) Matrix

### 1. `profiles`
* **READ**: Öffentlich lesbar für Basisdaten (Name, Rolle für Tourenleiter). Sensible Daten (Telefon, Notfallkontakt) nur für den Nutzer selbst, Eltern und Admins.
* **UPDATE**: Nur das eigene Profil oder Administratoren.

### 2. `tours`
* **READ**: Alle Nutzer sehen Touren im Status `open`, `full`, `completed`, `cancelled`. Status `draft` nur für Ersteller (`guide`) und Admins.
* **INSERT / UPDATE**: Nur `guide` (Ersteller) und `admin`.

### 3. `tour_participants`
* **READ**: Eigene Anmeldungen, Eltern für ihre Kinder, Tourenleiter für ihre Touren, Admins.
* **INSERT / UPDATE**: Über atomare Stored Procedures (`register_for_tour_atomic`). Direct SQL Inserts gesperrt.

### 4. `materials` & `resource_bookings`
* **READ**: `materials` öffentlich lesbar. `resource_bookings` nur eigenes Mitglied, Tourenleiter der verbundenen Tour, Materialwart und Admin.
* **INSERT / UPDATE**: Buchungsänderungen erfolgen über atomare RPCs (`apply_material_reservation_transition_atomic`).

### 5. `section_members` (Stammdaten)
* **READ / WRITE**: Ausschließlich für `admin` und `SECURITY DEFINER` Validierungs-Functions zugänglich.

---

## 🛡️ Kompensierende Kontrollen & Auditing

* **Idempotency Protection**: Schutz vor doppelten Aktionen bei Netzwerk-Replays.
* **Audit Logs**: Schreibende Eingriffe von Administratoren werden in `audit_logs` mit Zeitstempel, `actor_id` und `changeset` protokolliert.
* **Automatic Cache Purge**: Bei Abmeldung löscht der Service Worker unverzüglich alle lokal zwischengespeicherten Daten.

---

## 🔑 Authentifizierung, Passwort-Standards & Reset-Workflow

### Passwort-Sicherheitsstandards (NIST SP 800-63B / OWASP)
* **Mindestlänge**: Mindestens 8 Zeichen (`MIN_PASSWORD_LENGTH = 8`).
* **Zusammensetzung**: Verpflichtend mindestens ein Buchstabe und mindestens eine Ziffer oder ein Sonderzeichen (`src/lib/password-rules.ts`).
* **UX & Sicherheit**: Dynamischer Passwort-Stärke-Indikator und Sichtbarkeits-Toggle (Show/Hide) zur Vermeidung von Tippfehlern bei langen Passwörtern.

### Passwort-Reset Workflow
1. **Anforderung (`/auth/reset-password`)**: Benutzer gibt E-Mail-Adresse ein. Supabase generiert ein temporäres Recovery-Token und versendet die E-Mail mit Weiterleitungs-Link.
2. **Auth-Callback (`/auth/callback?next=/auth/update-password`)**: Der Einweg-Code wird serverseitig in eine Session getauscht. Bestehende Benutzerprofile und Rollen bleiben strikt unverändert geschützt.
3. **Neues Passwort vergeben (`/auth/update-password`)**: Der authentifizierte Nutzer vergibt ein neues Passwort mit Prüfung gegen die Passwort-Sicherheitsregeln und Bestätigungsfeld.

---
*Zurück zur [Wiki-Übersicht](file:///c:/Users/paulw/WebstormProjects/davpan/docs/README.md)*
