# Tourenberichte & Dokumentenverwaltung (`berichte-und-dokumente.md`)

Nach Abschluss einer Tour dokumentiert der Tourenleiter den Verlauf, Wetterbedingungen, Vorkommnisse und Fotos für das Sektionsarchiv und die Veröffentlichung in Sektionsmedien.

---

## 📝 Tourenberichte (`tour_reports`)

### Schema & Eigenschaften
* `tour_id`: Referenz auf die absolvierte Tour.
* `author_id`: Tourenleiter (`profiles.id`).
* `title` & `content`: Ausführlicher Bericht in Markdown/Rich Text.
* `conditions`: Wetter-, Schnee- oder Felsverhältnisse.
* `incidents`: Besondere Vorkommnisse oder Notfälle (falls aufgetreten).
* `is_published`: Sichtbarkeit für die Öffentlichkeit.

### Einreichungsprozess (`reports.server.ts`)
1. **Voraussetzung**: Die Tour befindet sich im Status `completed`.
2. **Autorisierung**: Nur der zugewiesene Tourenleiter (`guide`) oder ein Administrator darf den Bericht einreichen.
3. **Medien-Upload**: Bilder werden in Supabase Storage (`tour-media`) hochgeladen und in `tour_report_photos` verknüpft.

---

## 📄 Sektionsdokumente (`admin-documents.ts`)

Administratoren können sichtungspflichtige Sektionsdokumente (z.B. Ausrüstungsverleih-Ordnung, Einverständniserklärungen, Satzung) hochladen und den Mitgliedern bereitstellen.

* **Speicherung**: Supabase Storage Bucket `documents`.
* **Berechtigungsstufe**: Öffentliche Dokumente vs. Nur-Mitglied-Dokumente (RLS-gesteuert).

---
*Zurück zur [Wiki-Übersicht](file:///c:/Users/paulw/WebstormProjects/davpan/docs/README.md)*
