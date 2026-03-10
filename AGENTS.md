Vollständiges Briefing — JDAV Pfarrkirchen Web-App

JDAV Pfarrkirchen / Deutscher Alpenverein

Unten findest du ein ausführliches, Entwickler- und Design-taugliches Briefing, das alle bisher besprochenen Funktionen, UI/UX-Flows, Datenstrukturen, API-Spezifikationen, Design-Tokens und Betriebsanforderungen enthält — so, dass ein Team direkt mit Implementierung, UI-Mockups und Tests starten kann.

Kurze Zugammenfassung der Kernentscheidungen (Kontext)

PWA (Progressive Web App) statt native App

Zielgruppen: Kinder (<14 via Eltern), Jugendliche (14–17, eigener Account + Eltern-Bestätigung), Eltern (können Nicht-Mitglieder sein), Leiter, Admins

Rollenbasiertes RBAC; Leiter erstellen Events, Admins genehmigen Events; Eltern können Kinder verwalten.

CSV-Import als erster Integrationsweg zu bestehenden Mitgliederdaten.

Einverständniserklärungen pro Tour (per E-Mail Bestätigungslink), mit Option für dauerhafte Freigabe.

Warteliste, Restplatzanzeige, Materialbedarf in Anmeldung, Materialreservierung.

Farbe: Brand #57AB27 + jugendliches, leicht verspieltes UI.

1. Funktionen (vollständig, nach Themen gruppiert)
   1.1 Kernfunktionen — Nutzer-sicht

Registrierung / Login

E-Mail + Passwort; Magic-Link optional später

Auswahl beim Onboarding: „Elternteil“ oder „Jugendlicher (≥14)“

Eltern-Bestätigung per E-Mail für Jugendliche (14–17)

Kinder <14: kein eigenes Login, werden über Elternkonto verwaltet

Dashboard

Nächste Tour, Restplatzanzeige, schnelle Aktionen (Touren, Material, Dokumente, Schwarzes Brett)

Relevante Hinweise / Benachrichtigungen (kontextuell)

Kalender & Touren

Monats-/Listenansicht, Filter (Altersgruppe, Eventtyp)

Tour-Detailseite: Datum, Ort, Treffpunkt, Max-Teilnehmer, Bild, Beschreibung, Materialliste, Kontaktperson

Tour-Anmeldung

Auswahl teilnehmende Person (Eltern können Kinder wählen)

Abfrage benötigter Ausrüstung (Helm, Klettersteigset etc.)

Prüfung: Einverständnis vorhanden? Wenn nicht → E-Mail an Eltern (per-Tour) bzw. Nutzung von Dauerfreigabe

Wenn Max-Teilnehmer erreicht: Möglichkeit Warteliste

Warteliste & Restplatzlogik

Chronologische Warteliste

Bei freiem Platz: automatisierte Benachrichtigung (Push + E-Mail) an ersten Wartenden — Frist (z. B. 24h) zur Bestätigung

Wenn Bestätigung nicht erfolgt → nächster in Liste

Teilnehmer können sich selbständig abmelden (mit Fristregelung)

Materialreservierung

Katalog, Verfügbarkeit, Zeitfenster, Reservierung (Mitnahme/Abholung)

Verknüpfung: Anmeldung kann Ausrüstungsbedarf automatisch zur Reservierung vorschlagen

Schwarzes Brett

Beiträge: Ankündigungen, Mitfahrgelegenheiten, Sonstiges

Posting-Rechte: Leiter & Admins (evtl. berechtigte Jugendliche je Einstellung)

Moderation / Meldefunktion

Dokumentenbereich

Strukturierte Ordner, Download (Einverständniserklärungen, Packlisten)

Kinder sehen nicht-sensible Inhalte über Elternansicht

Erlebnisdokumentation (Tourenberichte)

Neuer Name statt „Logbuch“ — Berichte mit Fotos, Teilnehmerliste, Highlights

Veröffentlichung durch Leiter/Admins

Benachrichtigungen

Push + E-Mail; Opt-in nötig; in-app Notification Center

Anwendungsfälle: Wartelisten-Platz, Tour-Änderung, neue Dokumente

1.2 Admin / Leiter Funktionen

Event-Erstellung (Leiter) → Status „Zur Freigabe“ (Draft)

Event-Freigabe (Admin) → Publizierung

Rollenzuweisung (Admins ernennen Leiter, Admins)

CSV-Import (Mitgliederdaten): Preview/Mapping/Import-Report

Teilnehmermanagement: Teilnehmerlisten ansehen, Warteliste manuell verwalten

Materialverwaltung: Katalog pflegen, Ausgabelog

Audit / Zugriff-Log: Protokollierte Admin-Datenzugriffe (unveränderbar)

2. Detaillierte UI / UX Flows (Text-Workflow)
   2.1 Onboarding & Auth Flow (Kurz)

Start → Auswahl: Login / Registrieren

Registrieren → Frage: „Elternteil“ oder „Jugendlicher (≥14)“

Eltern: Formular (Name, E-Mail, Passwort, Telefonnummer optional) → Verifikation (Double Opt-in) → Option: Kinder anlegen

Jugendlicher: Formular (Name, E-Mail, Geburtsdatum) → System sendet E-Mail an hinterlegte Erziehungsberechtigte zur Bestätigung → Konto bleibt „ausstehend“ bis Bestätigung

Login → Dashboard

Annahmen: Altersangabe ist self-declared; Verifikation via Eltern-E-Mail genügt.

2.2 Tour-Creation & Publikationsflow

Leiter erstellt Event → Status: DRAFT / ZUR FREIGABE

Admin wird per Notification informiert → prüft & Freigabe (APP: PATCH /events/:id/status = approved)

Nach Freigabe: Event sichtbar für alle berechtigten Rollen

2.3 Anmeldung mit Einverständnis

Nutzer klickt „Anmelden“ → Auswahl: Person (Kind/ eigener Account) → Materialbedarf abfragen → System checkt Einwilligung:

Wenn Einwilligung vorhanden bzw. Dauerfreigabe: Anmeldung abgeschlossen → Bestätigungs-E-Mail + Push

Wenn nicht: Mail an Eltern mit Bestätigungslink → Anmeldung in Status „wartet auf Einverständnis“ → Leiter sieht Teilnehmerstatus „ausstehend“

2.4 Wartelistenprozess

Bei vollen Events: Anmeldung → Platz auf Warteliste (timestamp)

Bei Absage: System benachrichtigt ersten Wartenden (24h Confirm Window)

Wenn bestätigt: System setzt angemeldet; Benachrichtigungen an Teilnehmer/Leiter

2.5 Materialreservierung Flow

Nutzer wählt Material → Zeitfenster → System prüft Verfügbarkeit → Reservierung anlegen → Benachrichtigung + Kalender-Eintrag

3. Bildschirme / Screens (Übersicht — Entwickler-Liste)

Start / Welcome (Anmelden / Registrieren)

Login

Registrierung (Eltern vs Jugendlicher)

Eltern-Bestätigungs-Screen (information)

Dashboard / Home

Kalender (Monat / Liste)

Tour-Detail (inkl. Restplatz, Materialbedarf, Anmeldung)

Anmeldung Wizard (Schritte: Person → Material → Einverständnis → Abschluss)

Wartelisten-Status Screen

Materialkatalog & Reservierung

Erlebnisberichte (Liste & Detail mit Galerie)

Schwarzes Brett (Liste & Post erstellen)

Dokumentenzentrale (Ordner / Dateiansicht)

Profil / Einstellungen (Benachrichtigungen, Notfallkontakte)

Admin: Event-Management (Erstellen / Freigabe)

Admin: CSV-Import UI (Mapping & Preview)

Audit / Zugriff-Log Viewer (Admin)

4. Datenstruktur / DB-Schema (relational — Beispiel: PostgreSQL)

Hinweis: Felder mit sensitive werden verschlüsselt/zugriffsbeschränkt.

4.1 Haupt-Entitäten (vereinfacht)
-- Users (Eltern, Jugendliche, Leiter, Admins)
CREATE TABLE users (
id UUID PRIMARY KEY,
role TEXT NOT NULL, -- 'parent','youth','leader','admin'
first_name TEXT,
last_name TEXT,
email TEXT UNIQUE,
password_hash TEXT,
birthdate DATE,
is_member BOOLEAN DEFAULT false,
member_id TEXT, -- optional, aus CSV
phone TEXT,
created_at TIMESTAMP,
verified BOOLEAN DEFAULT false
);

-- Children (for parents) - children can also be users if >=14
CREATE TABLE children (
id UUID PRIMARY KEY,
parent_user_id UUID REFERENCES users(id),
first_name TEXT,
last_name TEXT,
birthdate DATE,
member_id TEXT,
medical_info JSONB, -- allergies, meds, swim_ability
photo_consent BOOLEAN,
created_at TIMESTAMP
);

-- Events (Tours)
CREATE TABLE events (
id UUID PRIMARY KEY,
title TEXT,
description TEXT,
location TEXT,
start_ts TIMESTAMP,
end_ts TIMESTAMP,
created_by UUID REFERENCES users(id), -- leader
status TEXT DEFAULT 'draft', -- draft, pending_approval, approved, archived
max_participants INT NULL, -- NULL = open event
created_at TIMESTAMP,
required_equipment JSONB  -- ["helmet","via-ferrata-set"]
);

-- Registrations
CREATE TABLE registrations (
id UUID PRIMARY KEY,
event_id UUID REFERENCES events(id),
registrant_user_id UUID, -- for youth/parent account
registrant_child_id UUID, -- if signing up a child
status TEXT, -- 'registered', 'pending_parent_consent', 'waitlist', 'cancelled'
created_at TIMESTAMP,
consent_given_by_email TEXT, -- parent email that confirmed
consent_ts TIMESTAMP
);

-- Waitlist (separate to allow ordering)
CREATE TABLE waitlist (
id UUID PRIMARY KEY,
event_id UUID REFERENCES events(id),
user_id UUID,
child_id UUID,
position INT,
created_at TIMESTAMP
);

-- Material
CREATE TABLE material (
id UUID PRIMARY KEY,
name TEXT,
total INT,
description TEXT,
categories TEXT[],
created_at TIMESTAMP
);

CREATE TABLE material_reservations (
id UUID PRIMARY KEY,
material_id UUID REFERENCES material(id),
user_id UUID,
child_id UUID,
start_ts TIMESTAMP,
end_ts TIMESTAMP,
status TEXT, -- reserved, picked_up, returned, cancelled
created_at TIMESTAMP
);

-- Documents
CREATE TABLE documents (
id UUID PRIMARY KEY,
filename TEXT,
path TEXT,
category TEXT,
visible_for JSONB, -- roles or specific groups
uploaded_by UUID REFERENCES users(id),
created_at TIMESTAMP
);

-- Audit log for admin data access
CREATE TABLE admin_audit_logs (
id UUID PRIMARY KEY,
admin_user_id UUID REFERENCES users(id),
action TEXT,
target_table TEXT,
target_id UUID,
timestamp TIMESTAMP DEFAULT now(),
details JSONB
);
Bemerkungen:

children ist separat, damit Eltern ohne Mitgliedschaft Kinder verwalten können. Kinder ≥14 haben optional users-Accounts (role = 'youth').

required_equipment und medical_info als JSONB für flexible Felder; kann später normalisiert werden.

Sicherstellen: GDPR-Felder (addresses, phone, medical_info) sind nur zugreifbar nach RBAC.

Zusätzlich: Indices auf events(start_ts), users(email), registrations(event_id).

5. API-Endpunkte (Basis-Set)

Auth via JWT; alle schreibenden Endpoints prüfen RBAC.

POST   /auth/register
POST   /auth/login
POST   /auth/verify-parent (parent email confirming youth)
POST   /auth/password-reset

GET    /events
GET    /events/:id
POST   /events        -- leader (creates draft/pending)
PATCH  /events/:id    -- leader/admin
POST   /events/:id/approve  -- admin approves

POST   /events/:id/register  -- register (user or child)
GET    /events/:id/registrations
POST   /events/:id/waitlist

GET    /material
POST   /material/:id/reserve
GET    /material/reservations

GET    /documents
POST   /documents (upload)  -- admin/leader

POST   /csv/import  -- admin (upload + mapping)
GET    /audit/logs  -- admin

GET    /users/:id
PATCH  /users/:id

Webhooks/Workers:

Worker für Wartelisten-Nachrückprozess (trigger bei Abmeldung)

Worker für E-Mail-Sends + Retry (email queue)

Push Notification Service (FCM/Web Push): subscription per user

6. Design System / UI Tokens
   6.1 Farbpalette (final)
   Primary:        #57AB27
   Secondary:      #3E7E1C
   SoftAccent:     #CFE8BF
   Background:     #F4F6F8
   Card:           #FFFFFF
   Divider:        #C7CCD1
   TextPrimary:    #1F2933
   Success:        #2E7D32
   Warning:        #F9A825
   Error:          #D32F2F
   Info:           #1976D2
   6.2 Typografie

Headings: Poppins (Bold for H1/H2), Body: Inter (Regular 16px)

Line-height 1.4; touch target ≥44×44px

6.3 Spacing & Radii

Base spacing: 8px scale (8 / 16 / 24 / 32)

Card radius: 16–20px

Button radius: 14–16px

Shadow: soft, y-offset 2–4 px, blur 8–12 px

7. Sicherheit, DSGVO & Privacy

Double Opt-in bei Registrierung (Verifizierung E-Mail)

Elternbestätigung: E-Mail-Link für jede tourbezogene Einwilligung; Speicherung mit Zeitstempel

Minimierung personenbezogener Daten: speichern nur, was benötigt wird

Verschlüsselung: Passworts (bcrypt), optional Sensitive Fields encryption (PGP / field-level AES)

Host / Storage in EU (oder DSGVO-konformer Anbieter)

Admin Audit Log: Jeder Zugriff auf personenbezogene Daten durch Admins protokolliert

Datenlöschung: Prozesse zur Löschung / Export auf Anfrage (DSAR)

Push Opt-in: explizit, jederzeit abwählbar

8. MVP & Roadmap (Priorisierung)
   MVP (Sprint 1–3)

Auth (E-Mail + Passwort), Registrierung Parent/Youth flow + parent verification

Events: List, Detail, Anmeldung (per-tour consent), Restplatzanzeige, Warteliste basics

Dashboard (Nächste Tour, Quick Actions)

Material: einfache Reservierung (catalog + reserve)

Documents: Upload & Download basics

Admin: Event approval, CSV import (basic), Audit logging

Notification skeleton (in-app + E-mail queue)

Post-MVP (Sprint 4–6)

Push Notifications (Web Push / mobile) + subscription management

Advanced Material logic (auto-reserve when user indicates missing equipment)

Enhanced waiting list (24h confirm flow)

Erlebnisdokumentation: photo uploads, galleries

Schwarzes Brett moderation tooling

Optional / Later

Offline PWA enhanced features (IndexedDB sync)

API integration with DAV central system (if available)

Analytics & Reporting (participation, materials usage)

9. Akzeptanzkriterien / Tests (Beispiele)

Registrierung → Parent confirmation mail is sent; youth account status set to pending until click

Event creation by leader appears as pending and not visible in public event list

Admin approves event → event visible; registrations can be made

Max participants reached → new registration goes to waitlist and UI shows “Warteliste”

On cancellation → first waitlist user receives notification; if not confirmed within 24h → next user notified

Material reservation prevents overlapping reservations over same time window

10. Operational & Dev Hinweise

Environments: dev, staging, production; use feature flags for important flows (e.g., waitlist auto-confirm)

CI/CD: tests + linting + migrations in pipeline

Backups: nightly DB backups; retention policy

Monitoring: errors (Sentry), performance (NewRelic or equivalent)

SMTP + Queue: transactional mail provider (Mailgun/SendGrid) + Redis queue for retries

Push: FCM for Android / Web Push (VAPID) for browsers; Apple requires native wrapper for APNs if moving to native

11. UI-Komponenten (für Designer/Dev)

Primary Button (primary/disabled/hover)

Secondary Button

Card (event card, action card)

Badge / Chip (status)

Modal (confirmation flows)

Multi-step form (registration, event registration)

Table / list with filters (admin participants)

File uploader (documents), image gallery

12. Sample Content (E-Mail Templates / Textblocks)

Parent confirmation email (tour consent)
Subject: „Bitte bestätigen: [Kind] – Teilnahme an [Event Title] am [Date]“
Body: Kurz Eventinfo + Button „Jetzt bestätigen“ → link contains secure token (one-time, expires e.g. 7 days). Wenn nicht bestätigt: registrant status remains pending_parent_consent.

Wartelist notification
Subject: „Platz frei bei [Event] – bitte innerhalb 24 Stunden bestätigen“
Body: Button „Ich möchte teilnehmen“ → tokenized link → confirm endpoint.

13. Offene Annahmen & Entscheidungen (ich habe so implementiert)

Altersgrenzen: 14 Jahre Schwelle für selbstständiges Konto; 18 = Volljährigkeit (no extra verification by default). (Assumption: legal review not required beyond parental confirmation; implementer to confirm local legal nuance.)

Parent verification method: E-Mail link (no identity document upload) — tradeoff UX vs strict proof.

CSV fields & format: as suggested earlier (member_id, firstname, lastname, birthdate, email_kind, email_parent, phone_parent, status).

Warteliste confirm window: 24h default (configurable).

14. Nächste Schritte — Vorschlag für Übergabe an Entwicklerteam

Finalize acceptance criteria for each MVP feature (product + legal sign-off for parental consent wording)

Create Figma screens for Dashboard, Calendar/List, Tour Detail, Registration Wizard, Material catalog, Admin CSV Import, Admin Approvals

Backend skeleton: users, events, registrations, material, documents, audit log tables + migrations

Implement auth (JWT + refresh) + role checks middleware

Implement email queue + template + worker for waitlist actions

Release internal alpha, QA with real members, iterate

Letzte Anmerkung (kritische Reflektion)

Dieses Briefing ist bewusst technisch-praktisch, datenschutzbewusst und priorisiert UX für Jugendliche und Eltern. Ich habe einige pragmatische Annahmen getroffen (CSV-import & E-Mail-based parental confirmation) um Entwicklungsrisiken, Kosten und rechtliche Komplexität niedrig zu halten. Solltet ihr die App später für größere rechtliche Hürden qualifizieren müssen (z. B. Zahlungspflichten, Versicherungskommunikation), empfehle ich rechtliche Prüfung und ggf. strengere Identifikationsschritte.