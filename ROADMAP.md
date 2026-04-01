# Master-Roadmap: Business Logic & Feature Refinements

## Zweck dieses Dokuments
Diese Roadmap trackt den fachlichen Umsetzungsstand der JDAV/DAV Pfarrkirchen Plattform.
Alle Infrastruktur- und Integritätsmassnahmen aus der alten P0-P3.3 Roadmap sind abgeschlossen.

Stand: 2026-03-31

---

## Phase 1: Eltern-Kind-Verwaltung (M:N)
**Ziel:** Ein Kind-Profil kann von beiden Elternteilen verwaltet werden.
- [x] DB-Migration: Tabelle `parent_child_relations` als Ablösung der alten 1:N Logik
- [x] Einladungscode-System zum Verknüpfen von Elternteilen
- [x] Sicherheitsfaktor beim Einlösen: Geburtsdatum als zusätzliche Prüfung
- [x] Profil-UI zum Erstellen und Einlösen von Einladungen

## Phase 2: Touren-Sichtbarkeit, Fristen & Lifecycle
**Ziel:** Feingranulares Rechtemanagement und zeitliche Steuerung von Touren.
- [x] Dezember-Regel für Sichtbarkeit von Folgejahres-Touren
- [x] Anmeldefrist-Feld in Erstellung/Bearbeitung
- [x] Altersprüfung am Tag der Anmeldung
- [x] Hard Delete für Admins und Status `canceled` für Guide-Absagen
- [x] Co-Guides mit gleichen Teilnehmer/Material-Rechten wie Hauptguide

## Phase 3: Warteliste & Material
**Ziel:** Automatisierung und Limitierung von Teilnahmen.
- [x] Wartelisten-Limit: maximal 10 Plätze pro Tour
- [x] 24h Nachrück-Frist mit `pending_confirmation`
- [x] Material kann bis zur Anmeldefrist vom Teilnehmer angepasst werden

## Phase 4: E-Mail SMTP & Offline PWA Limits
**Ziel:** Verlässliche Auslieferung und PWA-Speicherschonung.
- [x] SMTP Dispatcher auf generischen Env-Variablen (`SMTP_HOST`, `SMTP_PORT`, ...)
- [x] Jeder Anmeldestatus-Wechsel triggert zwingend E-Mail-Benachrichtigung
- [x] Offline-Caching limitiert auf 20 Touren-Einträge und 5 Berichts-Einträge
- [x] Berichte sind oeffentlich sichtbar und erster Bericht führt Tour ins Archiv
- [x] Bildrechte-Checkbox entfernt; Datenschutz-Hinweis bleibt sichtbar

## Phase 5: Exporte & Historie
**Ziel:** Datenauswertung und Datenschutz.
- [x] Admin-Export (CSV/Excel) für geplante Folgejahres-Touren inkl. Teilnehmerdaten
- [x] Nutzerlöschung via Maskierung auf `Gelöschter Nutzer` ohne Historienbruch
- [x] Notfallinfos werden aus User-Settings gezogen und Guides angezeigt

---

## Offene Später-Themen (bewusst nicht blockierend)
- [ ] Materialverfügbarkeit mit datumsgenauer Verfügbarkeitslogik (als späteres Todo)

## Betriebsnotiz
- Leaked Password Protection in Supabase ist im Free Plan nicht verfügbar.
  Die App kompensiert mit bestehenden Schutzmassnahmen und Monitoring.
