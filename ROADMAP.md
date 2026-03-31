# Master-Roadmap: Business Logic & Feature Refinements

## Zweck dieses Dokuments
Dieses Dokument ersetzt die alte technische Roadmap (P0-P3.3), da alle Datenintegritäts- und Infrastruktur-Maßnahmen erfolgreich abgeschlossen wurden. 
Hier wird nun die Umsetzung der fachlichen Geschäftslogiken (Business Logic) der JDAV/DAV Pfarrkirchen Sektion getrackt.

---

## Phase 1: Eltern-Kind-Verwaltung (M:N)
**Ziel:** Ein Kind-Profil kann von beiden Elternteilen verwaltet werden.
- [ ] **DB-Migration:** Neue Tabelle `parent_child_relations` zur Ablösung der alten 1:N Logik erstellen.
- [ ] **Backend/Server Actions:** Einladungscode-System aufbauen (Code erzeugen).
- [ ] **Sicherheit (Einlösen):** Beim Einlösen des Codes das Geburtsdatum/Alter des Kindes als 2. Faktor abfragen.
- [ ] **UI:** Ansicht im Profil zum Generieren und Eingeben des Codes.

## Phase 2: Touren-Sichtbarkeit, Fristen & Lifecycle
**Ziel:** Feingranulares Rechtemanagement und zeitliche Steuerung von Touren.
- [ ] **Sichtbarkeits-Regel (Dezember):** Touren im Status "Planung" (im aktuellen Jahr) sichtbar machen (ohne Anmeldung). Touren fürs *nächste Jahr* erst ab Anfang Dezember im System anzeigen.
- [ ] **Anmeldefrist:** Pflicht-/Optionales Feld bei der Tourenerstellung hinzufügen.
- [ ] **Altersprüfung:** Prüfung anpassen -> Alter zählt exakt am *Tag der Anmeldung*, nicht am Startdatum der Tour.
- [ ] **Löschen & Absagen:** 
    - Admin-Recht für hartes Löschen (Hard Delete) fehlerhafter Touren einbauen.
    - Status "Canceled" (Tour absagen durch Guide) verankern -> Löst Benachrichtigungen an alle aus.
- [ ] **Co-Guides:** Rechte-Checker so anpassen, dass Co-Guides 1:1 die gleichen Bearbeitungsrechte bezüglich Teilnehmern/Material auf der Tour haben wie der Haupt-Guide.

## Phase 3: Warteliste & Material
**Ziel:** Automatisierung und Limitierung von Teilnahmen.
- [ ] **Wartelisten-Limit:** Max. 10 Plätze pro Tour (z. B. Check-Constraint oder Backend-Check).
- [ ] **24h-Frist:** "First Come, First Serve" Nachrück-Regelung. Nachrücker haben strikt 24h Zeit zum Bestätigen.
- [ ] **Material-Anpassung:** Teilnehmer dürfen ihr ausgewähltes Material noch bis zum Ablauf der *Anmeldefrist* eigenständig bearbeiten.

## Phase 4: E-Mail SMTP & Offline PWA Limits
**Ziel:** Verlässliche Auslieferung und PWA Speicherschonung.
- [ ] **E-Mail Dispatcher:** Eigenen SMTP per `nodemailer` o.ä. in `src/lib/notifications/email-dispatcher.ts` anbinden via generischen Env-Variablen (`SMTP_HOST`, `SMTP_PORT`, etc.).
- [ ] **Trigger:** Jeder *Anmeldestatus-Wechsel* triggert ab sofort zwingend eine E-Mail an Betroffene. Keine separaten Push-Opt-Outs nötig.
- [ ] **Offline Caching:** Serwist PWA-Service so limitieren, dass strikt nur die *nächsten 20 anstehenden Touren* und die *letzten 5 Berichte* offline verfügbar sind.
- [ ] **Berichte (Archiv):** Berichte sind generell *öffentlich* sichtbar. Mit Erstellung des ersten Berichts wandert die Tour direkt ins Archiv. Keine extra Checkbox für Bildrechte nötig.

## Phase 5: Exporte & Historie
**Ziel:** Datenauswertung und Datenschutz.
- [ ] **Admin-Export:** CSV/Excel-Exportfunktion für Admin, um *alle* geplanten Touren inkl. Teilnehmer-Daten des Folgejahres auszugeben.
- [ ] **Nutzerlöschung:** Wenn ein Konto gelöscht wird, wird der Datensatz in eine Maskierung überführt -> Anzeige als "Gelöschter Nutzer" in Historie und Teilnehmerlisten, ohne dass alte Touren kaputtgehen.
- [ ] **Notfallinfos:** Wird immer strikt aus den eigenen User-Settings gezogen und als Notfallkontakt dem Guide angezeigt.
