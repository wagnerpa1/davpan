# Projektdokument

## Web-App für Tourenverwaltung der JDAV / DAV Sektion Pfarrkirchen

---

# 1. Projektüberblick

Dieses Dokument beschreibt das vollständige Konzept einer Web-App zur Organisation von Touren, Teilnehmern, Material und Vereinsinformationen für die JDAV / DAV Sektion Pfarrkirchen.

Das Dokument dient als **technisches und funktionales Briefing für Entwickler**.
Es enthält:

* Ziel und Grundidee der Plattform
* Rollen- und Rechtekonzept
* vollständige Featurebeschreibung
* UI/UX-Flows
* Datenbankstruktur
* Tourenlogik
* Materialverwaltung
* Community- und Berichtssystem
* öffentliche und interne Bereiche
* PWA- und Offlinekonzept
* Push-Benachrichtigungssystem

Die Plattform soll langfristig eine **zentrale Organisationsplattform für Touren der Sektion** darstellen.

---

# 2. Ziel der Plattform

Die App soll die Organisation von Vereinsaktivitäten deutlich vereinfachen.

Der Fokus liegt auf:

* Planung von Touren
* Anmeldung von Teilnehmern
* Verwaltung von Material
* Kommunikation von Tourinformationen
* Veröffentlichung von Tourberichten
* Bereitstellung wichtiger Vereinsdokumente

Die Plattform richtet sich primär an **Vereinsmitglieder**, während ein kleiner Teil der Inhalte öffentlich sichtbar ist.

---

# 3. Plattformart

Die Anwendung wird als **Progressive Web App (PWA)** entwickelt.

Eigenschaften:

* Nutzung im Browser
* Installation auf Smartphone möglich
* Push-Benachrichtigungen
* Offlinefähigkeit (teilweise)
* automatische Synchronisation bei Internetverbindung

---

# 4. Zielgruppen

## Mitglieder

* können Touren sehen
* sich anmelden
* Material reservieren
* Tourberichte lesen

## Eltern

* können eigene Kinder verwalten
* können Kinder zu Touren anmelden

## Guides (Tourenleiter)

* erstellen Touren
* verwalten Teilnehmer
* bestätigen Anmeldungen
* verwalten Material
* erstellen Tourberichte

## Materialwart

* verwaltet Materialstammdaten und Bestand
* verwaltet Materialreservierungen (tourgebunden und privat)
* hat sonst nur Mitgliedsrechte

## Admin

* vollständige Systemverwaltung
* Tourstatus ändern
* Benutzer verwalten
* Dokumente hochladen

---

# 5. Rollenmodell

## Teilnehmer (Mitglied)

Rechte:

* Touren ansehen
* sich anmelden
* Material reservieren
* Tourberichte lesen
* eigene Beiträge löschen

---

## Eltern

Zusätzlich zu Teilnehmerrechten:

* Kinderprofile verwalten
* Kinder zu Touren anmelden

---

## Guide (Tourenleiter)

Rechte:

* Touren erstellen
* eigene Touren bearbeiten
* Teilnehmer bestätigen
* Warteliste verwalten
* Materiallisten einsehen
* Tourberichte erstellen
* Beiträge moderieren

Guides dürfen **nur Touren bearbeiten, bei denen sie als Guide eingetragen sind**.

---

## Materialwart

Rechte:

* Materialbestand einsehen und bearbeiten
* Materialreservierungen einsehen und verwalten

Abgrenzung:

* keine Benutzerverwaltung
* keine Dokumente-Adminrechte
* keine Ressourcen-Adminrechte
* keine Tour-Adminrechte außerhalb normaler Mitgliedsfunktionen

---

## Admin

Rechte:

* Benutzerverwaltung
* Tourstatus ändern
* Dokumente verwalten
* Moderation

---

# 6. Öffentlicher Bereich

Ohne Login erreichbar.

## Öffentliche Tourenliste

Anzeige:

* Tourtitel
* Datum
* Kategorie
* Zielgebiet
* zuständige Guides

Touren werden **chronologisch** angezeigt.

---

## Öffentliche Tourdetails

Sichtbar:

* Titel
* Datum
* Zielgebiet
* Kategorie
* Beschreibung
* Schwierigkeit
* Höhenmeter
* Strecke
* Gehzeit
* Treffpunkt
* Guides

Nicht sichtbar:

* Teilnehmerliste
* Material
* Anmeldung
* Kommentare

---

# 7. Interner Bereich (Login erforderlich)

Nach Login stehen zusätzliche Funktionen zur Verfügung.

---

# 8. Dashboard / Startseite

Die Startseite zeigt einen **Vereinsfeed**.

Der Feed enthält:

* neue Tourberichte
* neue Beiträge
* wichtige Hinweise

---

# 9. Tourenübersicht

Liste aller kommenden Touren.

Sortierung:

* chronologisch nach Datum

Filter möglich nach:

* Jahr
* Kategorie

---

# 10. Tourdetails (intern)

Zusätzlich sichtbar:

* Anmeldung
* Materialauswahl

Nicht sichtbar:

* Teilnehmerliste

---

# 11. Tourstruktur

Jede Tour enthält folgende strukturierte Daten.

## Basisdaten

* Titel
* Kategorie
* Zielgebiet
* Beschreibung
* Schwierigkeit (DAV-System)
* Voraussetzungen (Text)

---

## Zeitliche Daten

* Startdatum
* Enddatum
* Treffpunktzeit

---

## Treffpunkt

* Name oder Beschreibung

Standard:

Park-and-Ride Parkplatz (falls nichts anderes angegeben)

---

## Tourparameter

* Höhenmeter
* Strecke
* Gehzeit

---

## Kosten

* optionaler Kostenhinweis

Abrechnung erfolgt privat (z. B. bar).

---

## Teilnehmer

* maximale Teilnehmerzahl
* Warteliste unbegrenzt

---

## Guides

* Hauptguide
* weitere Guides auswählbar

---

# 12. Tourstatus

Touren besitzen Status:

### Planung

Tour existiert, Anmeldung noch nicht möglich.

### Anmeldung offen

Teilnehmer können sich anmelden.

### Ausgebucht

Maximale Teilnehmerzahl erreicht.
Warteliste aktiv.

### Abgeschlossen

Tour wurde durchgeführt.

Danach kann ein **Tourbericht erstellt werden**.

---

# 13. Touranmeldung

Anmeldeprozess:

1. Teilnehmer öffnet Tour
2. klickt „Anmelden“
3. gibt benötigtes Material an
4. Anmeldung wird gespeichert

Status:

pending

---

# 14. Bestätigung durch Guide

Guide erhält Push-Benachrichtigung.

Guide kann:

* bestätigen
* ablehnen

Bei Bestätigung:

Status = confirmed

---

# 15. Warteliste

Wenn Teilnehmerlimit erreicht:

neue Anmeldungen → Warteliste

---

## Wartelistenlogik

Wenn Teilnehmer absagt:

1. erster Wartelistenteilnehmer rückt automatisch nach
2. Guide erhält Push-Benachrichtigung

Guide kann zusätzlich:

* Wartelistenreihenfolge ändern
* Teilnehmer direkt bestätigen

---

# 16. Altersbeschränkung

Touren können ein Mindestalter besitzen.

Wenn Teilnehmer zu jung ist:

System blockiert Anmeldung.

Option:

Teilnehmer kann **Ausnahme anfragen**.

Guide kann Altersregel überschreiben.

---

# 17. Eltern-Kinder-System

Eltern können Kinderprofile erstellen.

Ein Elternteil kann mehrere Kinder verwalten.

Kinder können einzeln zu Touren angemeldet werden.

Beispiel:

Elternteil meldet:

* Kind A
* Kind B

zur gleichen Tour an.

---

# 18. Teilnehmerabmeldung

Teilnehmer können sich selbst abmelden.

Folgen:

* Guide erhält Push-Benachrichtigung
* Warteliste rückt nach

---

# 19. Materialsystem

Material wird vom Guide bei der Tour definiert.

Beispiele:

* Helm
* Klettersteigset
* Gurt

---

## Materialreservierung

Teilnehmer wählen Material bei der Anmeldung aus.

Das System verhindert:

Reservierungen über vorhandenen Bestand hinaus.

---

## Materialausgabe

Material wird erst beim tatsächlichen Ausleihen aus dem Bestand abgezogen.

---

# 20. Vereinsressourcen

Neben Material gibt es auch **Vereinsressourcen** (z. B. den Vereinsbus, Beamer, Räume).

## Ressourcen-Reservierung
Ressourcen können von Guides und Admins direkt bei der Erstellung oder Bearbeitung einer Tour reserviert werden.

Eigenschaften:
* Ressourcen können **nicht doppelt** reserviert werden (Konfliktprüfung).
* Eine grafische Kalenderansicht (Ressourcen-Dashboard) zeigt, wer wann welche Ressource benötigt.

---

# 21. Teilnehmerliste (Guide)

Guides können eine Teilnehmerliste sehen.

Enthaltene Daten:

* Name
* Telefonnummer
* Alter
* Notfallkontakt
* reserviertes Material

---

## Export

Teilnehmerliste kann exportiert werden als:

PDF

Zum Ausdrucken für die Tour.

---

# 22. Notfallkontakt

Jedes Mitglied kann eine Notfallnummer hinterlegen.

Diese ist für Guides sichtbar.

---

# 23. Tourberichte

Nach Abschluss kann ein Tourbericht erstellt werden.

---

## Inhalte

* Titel
* Textbericht
* Bilder

Maximal:

20 Bilder

---

## Datenschutz

Teilnehmerlisten werden **nicht veröffentlicht**.

---

# 24. Archiv

Tourberichte werden im Archiv gespeichert.

Filter:

* Jahr
* Kategorie
* Guide

---

# 25. Community Feed

Der Feed zeigt:

* neue Tourberichte
* Vereinsbeiträge

---

## Moderation

Beiträge können gelöscht werden durch:

* Autor
* Guide
* Admin

---

# 26. Dokumentenbereich

Bereitstellung wichtiger Vereinsdokumente.

Kategorien:

* Formulare
* Vereinsregeln
* Packlisten

---

# 27. Push-Benachrichtigungen

Push-Events:

* Anmeldung bestätigt
* Wartelistenplatz frei
* neue Kommentare zu eigenen Beiträgen
* neuer Tourbericht

---

# 28. Offlinefähigkeit (PWA)

Offline verfügbar:

* Tourenübersicht
* Tourdetails
* Tourberichte

Synchronisation erfolgt automatisch.

---

# 29. Datenbankstruktur

## Users

```
id
name
email
phone
birthdate
role
medical_notes
emergency_phone
image_consent
```

---

## ChildProfiles

```
id
parent_id
name
birthdate
```

---

## Tours

```
id
title
description
category
difficulty
target_area
meeting_point
meeting_time
start_date
end_date
distance
elevation
duration
requirements
cost_info
max_participants
status
group
min_age
```

---

## TourGroups

```
id
group_name
created_at
```

---

## TourGuides

```
id
tour_id
user_id
```

---

## TourParticipants

```
id
tour_id
user_id
child_profile_id
status
age_override
```

---

## Waitlist

```
id
tour_id
user_id
position
```

---

## Materials

```
id
name
total_quantity
```

---

## TourMaterials

```
id
tour_id
material_id
```

---

## MaterialReservations

```
id
tour_id
user_id
material_id
quantity
```

---

## TourReports

```
id
tour_id
title
text
created_by
created_at
```

---

## ReportImages

```
id
report_id
image_url
```

---

## Documents

```
id
title
file_url
category
```

---

## Resources

```
id
name
description
type
capacity
created_at
```

---

## ResourceBookings

```
id
resource_id
tour_id
start_date
end_date
status
created_by
created_at
```

---

# 30. Sicherheitskonzept

Datenschutz:

* Teilnehmerlisten nicht öffentlich
* medizinische Hinweise nur für Guides
* Notfallnummer nur intern sichtbar

---

# 31. Erweiterungsmöglichkeiten

Mögliche spätere Erweiterungen:

* GPX-Tracks
* Wetterintegration
* Kalenderexport
* Statistik zu Touren
* automatisierte Jahresprogramme

---

# 32. Zusammenfassung

Die Plattform bildet alle zentralen Vereinsprozesse digital ab:

* Tourplanung
* Teilnehmerverwaltung
* Wartelistenlogik
* Materialverwaltung
* Ressourcenverwaltung (z. B. Vereinsbus)
* Tourberichte
* Dokumente
* Vereinsfeed

Durch die Umsetzung als PWA kann sie sowohl **mobil als auch am Desktop** genutzt werden.

Das System ist speziell auf die organisatorischen Anforderungen einer Alpenvereinssektion zugeschnitten.

---

Ende des Dokuments

Für Gemini:
# Role & Project Context
You are a Senior Full-Stack Developer for the "JDAV / DAV Sektion Pfarrkirchen" tour management web app.
The project is a Progressive Web App (PWA) built with Next.js (App Router), Tailwind CSS, Lucide Icons, and Supabase.

# Technical Stack Preferences
- Framework: Next.js (App Router, React Server Components where possible).
- Styling: Tailwind CSS (Mobile-First approach, as it's a PWA).
- Icons: Lucide React.
- State/Database: Supabase (Auth, PostgreSQL, Storage).
- PWA: Use @serwist/next for Service Worker and Offline-Caching.
- Code Style: TypeScript, clean architecture, components in `@/components`, logic in `@/lib` or `@/utils`. Use the `@/*` import alias.

# Functional Core Logic (Strict Adherence)
1. **Roles & Permissions**:
   - Roles: `Member`, `Parent`, `Guide`, `Materialwart`, `Admin`.
   - Guides can only edit tours where they are assigned as `TourGuide`.
   - `Materialwart` can manage `material_types`, `material_inventory`, `material_pricing` and `material_reservations`, but has otherwise only `Member` rights.
   - `Parent` can manage `ChildProfiles` and register them for tours.
   - Private data (phone numbers, medical notes, emergency contacts) is ONLY visible to Guides/Admins.

2. **Tour Lifecycle**:
   - Status: `Planung` -> `Anmeldung offen` -> `Ausgebucht` (Waitlist active) -> `Abgeschlossen`.
   - Post-Tour: Only `Abgeschlossen` tours can have a `TourReport`.

3. **Registration & Waitlist**:
   - Registration status starts as `pending` and requires Guide confirmation (`confirmed`).
   - If `max_participants` is reached, move new sign-ups to the `Waitlist` table.
   - Automatic promotion: If a participant cancels, the first person on the waitlist moves up (Trigger/Logic needed).

4. **Material Management**:
   - Materials are defined per tour.
   - Prevent reservations exceeding `total_quantity` of a material.

5. **PWA & Offline**:
   - Ensure `Tours`, `Details`, and `Reports` are cached for offline viewing.
   - Use Metadata API for PWA manifest and theme colors.

# UI/UX Guidelines
- Colors: Nature-themed (Greens, Earth tones). Use `bg-green-50` for backgrounds and a primary forest green (e.g., `#76a355`) for actions.
- Layout: Always include a `BottomNavigation` for mobile users.
- Components: Use high-quality accessible components (e.g., shadcn/ui style).

# Response Instructions
- Always assume the user wants to follow the provided database schema (Users, ChildProfiles, Tours, etc.).
- When generating UI, ensure it matches the "JDAV Pfarrkirchen" branding.
- Before suggesting a new feature, check if it aligns with the 31 points of the project documentation.