## Plan: Mitgliederdatenbank-gestützte Registrierung mit Gastkonto

Diese Roadmap beschreibt die vollständige Umstellung der Registrierung auf eine serverseitig erzwungene Mitgliedsprüfung gegen eine importierte Sektions-Mitgliederliste. Ziel ist, Fake-Registrierungen zu verhindern, den Namen bei echten Sektionsmitgliedern aus der offiziellen Quelle zu übernehmen und gleichzeitig einen sauberen Gastpfad bereitzustellen.

Projektkontext und bestehende Referenzen:
- [AGENTS.md](AGENTS.md)
- [ROADMAP.md](ROADMAP.md)
- [README.md](README.md)
- [src/components/auth/RegisterForm.tsx](src/components/auth/RegisterForm.tsx)
- [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts)
- [src/lib/permissions.ts](src/lib/permissions.ts)
- [src/lib/auth.ts](src/lib/auth.ts)
- [supabase/migrations/20260401_add_membership_number.sql](supabase/migrations/20260401_add_membership_number.sql)

**Zielbild**
- Mitglieds- und Elternkonto nur bei erfolgreicher Prüfung von Mitgliedsnummer + Geburtsdatum gegen offizielle Sektionsdaten.
- Name wird bei Mitglied/Elternkonto ausschließlich aus der Mitgliederquelle übernommen.
- Gastkonto als eigene Rolle mit verpflichtendem Gasttyp.
- Mitgliedsnummern anderer Sektionen werden im Mitgliedsfluss nicht akzeptiert und in den Gastfluss umgeleitet.
- Gäste können später Mitgliedsdaten nachtragen und in ein reguläres Mitgliedskonto migrieren.

**In Scope**
- Registrierungs-UX für drei Kontoarten: Mitglied, Eltern, Gast.
- Serverseitige Validierungs-Pipeline für Registrierung.
- CSV-Importstrecke für Sektions-Mitgliederliste.
- Datenmodell-Erweiterungen (Rolle guest, guest_type, Mitglieder-Mastertabelle).
- Tests, Monitoring, Betriebsdoku.

**Out of Scope**
- Echtzeit-Schnittstelle zu externem DAV-Backend (kein Live-API-Check).
- Rechteerweiterung für Gast über bestehende Member-Basisrechte hinaus.
- Änderung der Tour- oder Material-Kernlogik außerhalb nötiger Rollenkompatibilität.

**Annahmen und Entscheidungen**
- Quelle der Mitgliedsdaten: CSV-Import.
- Gast ist eigene Rolle: guest.
- Fremdsektion im Mitgliedsweg: blockieren und auf Gastkonto verweisen.
- Gasttypen werden persistiert: other_section und no_membership.
- Sektionspräfix für lokale Mitglieder: über env varialbe definiert (bsp 209).

**Workstreams**
1. Produkt- und Datenmodell
2. Datenimport und Datenqualität
3. Registrierungs-Backend und Sicherheit
4. Frontend-UX und Formularlogik
5. Gast-Upgrade-Pfad
6. Qualitätssicherung, Betrieb und Rollout

**Phase 0: Detail-Spezifikation und fachliche Abnahme**
Ziel:
- Fachregeln final und eindeutig dokumentieren, damit Implementierung ohne Interpretationsspielraum möglich ist.

Aufgaben:
1. Validierungs-Matrix definieren:
   - Mitglied: Nummer vorhanden, 11-stellig, Präfix über env varialbe definiert (bsp 209), Geburtsdatum muss zur Mitgliederliste passen.
   - Eltern: identisch zu Mitglied, nur Rolle parent.
   - Gast: keine Mitgliedsnummerpflicht, Gasttyp Pflicht.
2. Fehlermeldungskatalog festlegen:
   - Ungültiges Format
   - Nummer nicht gefunden
   - Geburtsdatum passt nicht
   - Nummer anderer Sektion
3. Datenschutzregeln bestätigen:
   - Welche Felder aus Mitgliederliste gespeichert werden.
   - Aufbewahrung und Audit von Importläufen.

Ergebnis:
- Abgenommene Spezifikation als Referenz für Entwicklung, Test und Support.

**Phase 1: Datenmodell und Migrationen**
Ziel:
- DB-seitige Grundlage für sichere Registrierung und Gastmodell schaffen.

Aufgaben:
1. Neue Mitglieder-Mastertabelle anlegen (z. B. section_members):
   - Pflichtfelder: membership_number, birthdate, full_name, is_active, imported_at.
   - Optional: source_file_id, source_row_hash, last_seen_at.
2. Profiles erweitern:
   - Rolle guest im Rollenmodell.
   - guest_type mit erlaubten Werten other_section | no_membership.
3. Constraints ergänzen:
   - membership_number nur Ziffern und Länge 11.
   - Präfixregel über env varialbe definiert (bsp 209) für member und parent.
   - Konsistenzregel: guest darf Nummer leer haben; bei gesetzter Nummer nur nach erfolgreicher Verifikation.
4. Indizes hinzufügen:
   - section_members.membership_number eindeutig indiziert.
   - Optional Composite-Index für membership_number + birthdate.
5. RLS/Helferfunktionen aktualisieren:
   - Rollenfunktionen und Policies um guest ergänzen.

Abhängigkeiten:
- Blockiert alle Folgeschritte.

Ergebnis:
- Vollständige DB-Basis für Prüf- und Gastlogik.

**Phase 2: CSV-Importpipeline für Mitgliederdaten**
Ziel:
- Reproduzierbarer, auditierbarer Datenimport aus offizieller CSV.

Aufgaben:
1. Importskript in [scripts](scripts) erstellen:
   - CSV einlesen, Header validieren, Normalisierung (Trennzeichen entfernen, Ziffern erzwingen).
   - Upsert auf section_members.
2. Datenqualitätsregeln:
   - Fehlerhafte Zeilen protokollieren und überspringen.
   - Doppelte Mitgliedsnummern erkennen und als Importfehler markieren.
3. Aktivitätsmodell:
   - Mitglieder, die im neuen Import fehlen, auf is_active=false setzen (Soft-Deaktivierung).
4. Import-Audit:
   - Lauf-ID, Start/Ende, Anzahl gelesen, neu, geändert, deaktiviert, fehlerhaft.
5. Betriebsmodus:
   - Täglicher geplanter Import plus manueller Trigger.

Abhängigkeiten:
- Depends on Phase 1.

Ergebnis:
- Stabile Mitgliederquelle für alle Registrierungsprüfungen.

**Phase 3: Serverseitige Registrierungsdurchsetzung**
Ziel:
- Registrierung vollständig serverseitig validieren, clientseitige Umgehung ausschließen.

Aufgaben:
1. Server-Registrierungsservice einführen:
   - Zentrale Action/Route statt reinem client auth.signUp.
2. Mitglied/Eltern-Flow:
   - membership_number normalisieren.
   - Präfix über env varialbe definiert (bsp 209) prüfen.
   - section_members Lookup auf Nummer + birthdate.
   - full_name aus section_members übernehmen.
3. Gast-Flow:
   - role=guest erzwingen.
   - guest_type verpflichtend.
   - Mitgliedsnummer optional.
4. Sicherheitsmaßnahmen:
   - Idempotenz-Key und Anfrage-Deduplizierung.
   - Rate-Limit pro IP/E-Mail.
   - Keine Übernahme privilegierter Rollen aus Clientpayload.
5. Auth-Callback abstimmen:
   - Profil-Write nur aus server-validierten Daten.

Abhängigkeiten:
- Depends on Phase 1 und Phase 2.

Ergebnis:
- Harte, nachvollziehbare und sichere Registrierungslogik.

**Phase 4: Frontend-UX und Formularumbau**
Ziel:
- Klarer, benutzerfreundlicher Registrierungsprozess mit korrekten Pfaden.

Aufgaben:
1. Konto-Typ-Auswahl auf drei Optionen erweitern in [src/components/auth/RegisterForm.tsx](src/components/auth/RegisterForm.tsx):
   - Eigenes Mitgliedskonto
   - Elternkonto
   - Gastkonto
2. Dynamische Eingabefelder:
   - Mitglied/Eltern: Mitgliedsnummer + Geburtsdatum, Name nicht frei editierbar.
   - Gast: Gasttyp-Auswahl verpflichtend.
3. Fehlerführung:
   - Kontextspezifische Meldungen für Nummer, Geburtsdatum, Fremdsektion.
4. Conversion-UX:
   - Bei Fremdsektion direkt Vorschlag für Gastkonto inklusive Übernahme bereits eingegebener E-Mail.

Abhängigkeiten:
- UI kann vorbereitet werden, finale Verdrahtung depends on Phase 3.

Ergebnis:
- Verständlicher Registrierungsfluss ohne fachliche Grauzonen.

**Phase 5: Gastkonto-Upgrade zu Mitglied**
Ziel:
- Späteren Mitgliedsbeitritt ohne Neuregistrierung ermöglichen.

Aufgaben:
1. Profilbereich erweitern:
   - Gäste können Mitgliedsnummer + Geburtsdatum nachtragen.
2. Serverseitige Upgradeprüfung:
   - Gleiches Regelwerk wie bei Erstregistrierung.
3. Erfolgsfall:
   - Rolle auf member oder parent setzen.
   - guest_type optional historisieren oder nullen.
   - full_name mit Mitgliederquelle synchronisieren.
4. Audit und Benachrichtigung:
   - Upgrade-Ereignis protokollieren.
   - Nutzerfeedback nach erfolgreicher Umstellung.

Abhängigkeiten:
- Depends on Phase 3.

Ergebnis:
- Nahtloser Übergang von Gast zu regulärem Mitgliedskonto.

**Phase 6: Qualitätssicherung und Abnahme**
Ziel:
- Fachliche, technische und sicherheitsrelevante Korrektheit vor Go-live absichern.

Testumfang:
1. Unit-Tests:
   - Normalisierung und Validierungsfunktionen.
   - Präfix-/Formatprüfung.
2. Integrationstests:
   - Lookup gegen section_members.
   - Rollen-/Payload-Härtung.
3. E2E-Tests:
   - Erfolgreiche Registrierung als Mitglied.
   - Erfolgreiche Registrierung als Elternkonto.
   - Gastregistrierung mit beiden Gasttypen.
   - Blockierung Fremdsektion im Mitgliedspfad.
   - Gastupgrade zu Mitglied.
4. Regression:
   - Rollenrechte für member, parent, guide, materialwart, admin unverändert.
5. Last-/Fehlertests:
   - Mehrfache Registrierungsversuche mit identischen Daten.
   - Rate-Limit-Verhalten.

Abhängigkeiten:
- Depends on Phase 3, 4 und 5.

Ergebnis:
- Abnahmefähiges Feature mit geringem Risiko im Betrieb.

**Phase 7: Rollout, Monitoring und Betrieb**
Ziel:
- Sicherer Produktionsstart mit schneller Erkennung und Behebung von Problemen.

Aufgaben:
1. Deployment-Reihenfolge:
   - Zuerst Migrationen.
   - Dann Importskript + Erstimport.
   - Dann Backend- und Frontend-Rollout.
2. Monitoring:
   - KPI: Registrierungs-Erfolgsquote pro Kontoart.
   - KPI: Anteil abgelehnter Registrierungen nach Ablehnungsgrund.
   - KPI: Importqualität und Fehlerrate.
3. Support-Playbook:
   - Standardantworten für häufige Ablehnungsfälle.
   - Manuelle Prüfschritte bei CSV-Anomalien.
4. Fallback:
   - Bei Importausfall letzter gültiger Datenstand nutzbar.
   - Klare Betriebswarnung im Adminbereich.

Abhängigkeiten:
- Depends on Phase 6.

Ergebnis:
- Produktionsbetrieb mit klarer Beobachtbarkeit und stabilen Prozessen.

**Meilensteine mit Akzeptanzkriterien**
1. M1: Datenmodell bereit
   - Migrationen laufen fehlerfrei durch.
   - Rolle guest und guest_type sind nutzbar.
2. M2: Import produktionsreif
   - Test-CSV wird vollständig verarbeitet.
   - Auditdaten pro Lauf vorhanden.
3. M3: Registrierung serverseitig gehärtet
   - Manipulierte Clientpayload kann keine unzulässige Registrierung erzeugen.
4. M4: UX vollständig integriert
   - Drei Kontoarten sind vollständig abbildbar.
5. M5: Gastupgrade aktiv
   - Validiertes Upgrade ohne Dateninkonsistenz.
6. M6: Go-live
   - Monitoring aktiv, Abnahme erteilt.

**RACI-Vorschlag (Kurzform)**
- Product Owner:
  - Fachregeln, Fehlermeldungen, Abnahme.
- Backend/DB:
  - Migrationen, Import, serverseitige Validierung.
- Frontend:
  - Formular, UX-Flows, Fehlermeldungsdarstellung.
- QA:
  - Testkatalog, E2E, Regression.
- Betrieb:
  - Importbetrieb, Monitoring, Incident-Prozess.

**Risiken und Gegenmaßnahmen**
1. Schlechte CSV-Datenqualität
   - Gegenmaßnahme: strenge Validierung, Import-Audit, Fehlerbericht je Lauf.
2. Rollenregression durch neue guest-Rolle
   - Gegenmaßnahme: Rechte-Matrix-Test und Regression aller Rollentore.
3. Nutzerabbrüche wegen strenger Prüfung
   - Gegenmaßnahme: klare Fehlertexte und direkter Gastpfad.
4. Inkonsistenz zwischen Auth-Metadaten und Profil
   - Gegenmaßnahme: Profilfelder ausschließlich serverseitig aus validierten Daten schreiben.

**Technische Referenzpunkte für Umsetzung**
- Registrierung UI: [src/components/auth/RegisterForm.tsx](src/components/auth/RegisterForm.tsx)
- Registerseite: [src/app/register/page.tsx](src/app/register/page.tsx)
- Auth Callback: [src/app/auth/callback/route.ts](src/app/auth/callback/route.ts)
- Rollenmodell: [src/lib/permissions.ts](src/lib/permissions.ts)
- Session-Profilzugriff: [src/lib/auth.ts](src/lib/auth.ts)
- Bestehende Mitgliedsnummer-Migration: [supabase/migrations/20260401_add_membership_number.sql](supabase/migrations/20260401_add_membership_number.sql)

**Verifikation (konkrete Prüffälle)**
1. Mitglied positiv:
   - Eingabe über env varialbe definiert (bsp 209)-Präfix, korrektes Geburtsdatum, Treffer in section_members.
   - Erwartung: Konto erstellt, Name aus Mitgliederquelle.
2. Mitglied negativ, falsches Geburtsdatum:
   - Erwartung: Ablehnung mit zielgenauer Meldung.
3. Mitglied negativ, Fremdsektion:
   - Erwartung: Ablehnung im Mitgliedsflow, Hinweis auf Gastkonto.
4. Gast positiv, other_section:
   - Erwartung: Konto erstellt mit role=guest und guest_type=other_section.
5. Gast positiv, no_membership:
   - Erwartung: Konto erstellt mit role=guest und guest_type=no_membership.
6. Upgrade positiv:
   - Erwartung: guest -> member/parent, Name synchronisiert.
7. Sicherheit:
   - Manipulierte Clientrolle admin/guide wird ignoriert.

**Dokumentations-Updates nach Umsetzung**
- [ROADMAP.md](ROADMAP.md): neue Phase Mitgliedsprüfung/Gastkonto aufnehmen.
- [README.md](README.md): Registrierungsregeln ergänzen.
- [database.md](database.md): neue Tabellen/Felder/Constraints dokumentieren.
- [database-policies.md](database-policies.md): guest-Rollenregeln und RLS-Änderungen ergänzen.

**Empfohlener Zeitrahmen**
- Phase 0 bis 2: 3 bis 5 Arbeitstage.
- Phase 3 bis 5: 4 bis 7 Arbeitstage.
- Phase 6 bis 7: 2 bis 3 Arbeitstage.
- Gesamt: 9 bis 15 Arbeitstage je nach Testtiefe und Abstimmungszyklen.

**Definition of Done**
1. Registrierung als Mitglied/Eltern nur mit validierter Mitgliedsnummer + Geburtsdatum möglich.
2. Name wird im Mitgliedsfluss nicht frei gesetzt, sondern aus Mitgliederliste übernommen.
3. Gastkonto mit zwei Gasttypen vollständig nutzbar.
4. Fremdsektionen werden im Mitgliedsfluss korrekt abgefangen.
5. Gastupgrade funktioniert stabil.
6. Testkatalog bestanden, Monitoring aktiv, Doku aktualisiert.


**Sprint-Plan (Woche für Woche) mit Ticket-Schnitt**

Sprint-Rahmen:
- Sprintlänge: 1 Woche
- Kapazitätsannahme: 2 bis 3 Entwickler (Backend/Frontend), 1 QA anteilig
- Priorität: Sicherheit und serverseitige Durchsetzung vor UX-Finish

**Sprint 1: Fachregeln, DB-Design und Migrationsbasis**
Sprintziel:
- Alle fachlichen Regeln verbindlich dokumentiert, DB-Erweiterungen entworfen und migrationsreif.

Backlog-Tickets:
1. REG-001 Fachregel-Matrix finalisieren
   - Inhalte: Kontoarten, Validierungslogik, Fehlermeldungszustände, Gasttypen.
   - Akzeptanz: Matrix ist vom Product Owner abgenommen.
2. DB-001 Schema für `section_members` spezifizieren
   - Inhalte: Pflichtfelder, optionales Audit-Metadatenmodell, Indizes.
   - Akzeptanz: SQL-DDL liegt reviewbar vor.
3. DB-002 Rollenmodell auf `guest` erweitern
   - Inhalte: Enum/Constraint-Strategie und Kompatibilitätsprüfung zu bestehenden Rollenfunktionen.
   - Akzeptanz: Migrationskonzept ohne Rechteausweitung.
4. DB-003 `profiles` um `guest_type` ergänzen
   - Inhalte: erlaubte Werte `other_section | no_membership`, Konsistenzregeln.
   - Akzeptanz: Feldmodell mit Check-Constraints ist definiert.
5. DB-004 Validierungs-Constraints spezifizieren
   - Inhalte: Nummernformat, Präfixregel über env varialbe definiert (bsp 209), Konsistenz member/parent/guest.
   - Akzeptanz: Constraint-Set vollständig dokumentiert.

Lieferobjekte:
- Abgenommene Fachspezifikation.
- SQL-Migrationsentwurf mit Reviewfreigabe.
- Aktualisierte Risiko-/Abhängigkeitsliste.

Abhängigkeiten:
- Keine (Startpunkt).

Definition of Done Sprint 1:
- Fachregeln und Migrationsentwürfe sind freigegeben.

**Sprint 2: CSV-Importpipeline und Datenqualität**
Sprintziel:
- Importierbare, auditable Mitgliederquelle als verlässliche Wahrheit bereitstellen.

Backlog-Tickets:
1. IMP-001 Importskript-Grundgerüst erstellen
   - Inhalte: CSV-Parser, Header-Validierung, Normalisierung.
   - Akzeptanz: Testdatei wird ohne Absturz verarbeitet.
2. IMP-002 Upsert-Strategie auf `section_members`
   - Inhalte: Idempotentes Upsert, Änderungsdetektion.
   - Akzeptanz: Wiederholter Import erzeugt keine Dubletten.
3. IMP-003 Fehlerzeilen-Protokoll und Import-Audit
   - Inhalte: Lauf-ID, Fehlerliste, Summenwerte.
   - Akzeptanz: Auditdaten je Lauf nachvollziehbar.
4. IMP-004 Soft-Deaktivierung nicht mehr enthaltener Mitglieder
   - Inhalte: `is_active=false` bei fehlenden Datensätzen.
   - Akzeptanz: Deaktivierungslogik reproduzierbar.
5. OPS-001 Betriebsablauf definieren
   - Inhalte: täglicher Job + manueller Trigger + Fehlerprozess.
   - Akzeptanz: Runbook-fähiger Ablauf dokumentiert.

Lieferobjekte:
- Lauffähiges Importskript.
- Import-Auditmodell.
- Operatives Import-Runbook (Draft).

Abhängigkeiten:
- Depends on Sprint 1 DB-Grundlage.

Definition of Done Sprint 2:
- Mitgliederdaten können verlässlich importiert und auditiert werden.

**Sprint 3: Serverseitige Registrierungsdurchsetzung**
Sprintziel:
- Sicherheitskritische Registrierungslogik vollständig serverseitig erzwingen.

Backlog-Tickets:
1. REG-101 Server-Action/Route für Registrierung einführen
   - Inhalte: zentrale Orchestrierung statt direkter Client-SignUp-Pfade.
   - Akzeptanz: Alle Registrierungen laufen durch den neuen Serverpfad.
2. REG-102 Mitglied/Eltern-Validierung implementieren
   - Inhalte: Nummer normalisieren, Präfixcheck (über env variable bsp 209), Lookup Nummer+Geburtsdatum.
   - Akzeptanz: Nur valide Treffer führen zu Kontoerstellung.
3. REG-103 Namensübernahme aus Mitgliederquelle erzwingen
   - Inhalte: Clientname ignorieren, `full_name` aus `section_members`.
   - Akzeptanz: Profilname entspricht immer Masterdaten.
4. REG-104 Gastregistrierung absichern
   - Inhalte: `role=guest` erzwingen, `guest_type` Pflicht.
   - Akzeptanz: Gastkonto ohne Pflichtnummer möglich.
5. SEC-001 Missbrauchsschutz ergänzen
   - Inhalte: Idempotenz, Deduplizierung, Rate-Limit, Payload-Härtung.
   - Akzeptanz: Manipulierte Rollen/Name werden nicht akzeptiert.
6. REG-105 Auth-Callback-Synchronisierung
   - Inhalte: Callback schreibt nur servervalidierte Profilfelder.
   - Akzeptanz: Keine Inkonsistenz zwischen Auth und `profiles`.

Lieferobjekte:
- Produktionsreife Server-Registrierungslogik.
- Sicherheits- und Missbrauchsschutz-Mechanismen.

Abhängigkeiten:
- Depends on Sprint 2 (Datenquelle verfügbar).

Definition of Done Sprint 3:
- Registrierung ist nicht mehr clientseitig umgehbar.

**Sprint 4: Frontend-Flow und UX-Komplettierung**
Sprintziel:
- Registrierung mit 3 Kontoarten und klarer Nutzerführung vollständig integrieren.

Backlog-Tickets:
1. UI-001 Kontoauswahl auf drei Karten erweitern
   - Inhalte: Mitglied, Eltern, Gast.
   - Akzeptanz: Auswahl steuert Formularzweige korrekt.
2. UI-002 Dynamische Felder je Kontoart
   - Inhalte: Mitglied/Eltern mit Nummer+Geburtsdatum; Gast mit Gasttyp.
   - Akzeptanz: Falsche Felder werden nicht abgefragt.
3. UI-003 Name-Handling im Mitgliedsweg
   - Inhalte: Name read-only oder entfernt, erklärender Hinweis.
   - Akzeptanz: Nutzer versteht Namensherkunft.
4. UI-004 Fehlerkommunikation verbessern
   - Inhalte: spezifische Hinweise für Format, Unbekannt, Geburtsdatum, Fremdsektion.
   - Akzeptanz: Fehlermeldung ist eindeutig und handlungsleitend.
5. UI-005 Fremdsektion-Conversion in Gastpfad
   - Inhalte: direkter CTA in Gastregistrierung mit Datenübernahme (E-Mail).
   - Akzeptanz: Wechsel ohne erneute Dateneingabe.

Lieferobjekte:
- Finaler Registrierungs-Flow.
- UX-Textbausteine und Fehlerstate-Definition.

Abhängigkeiten:
- Depends on Sprint 3 API-Verträge.

Definition of Done Sprint 4:
- Frontend bildet alle fachlichen Fälle vollständig und verständlich ab.

**Sprint 5: Gast-Upgrade, Testhärtung und Go-live-Readiness**
Sprintziel:
- Upgradepfad aktivieren, Testabdeckung schließen und Rollout freigeben.

Backlog-Tickets:
1. UPG-001 Gast-zu-Mitglied-Profilflow implementieren
   - Inhalte: Nachtragen von Mitgliedsnummer und Geburtsdatum im Profil.
   - Akzeptanz: Flow ist erreichbar und validiert serverseitig.
2. UPG-002 Rollen-/Statusmigration im Erfolgsfall
   - Inhalte: `guest` -> `member`/`parent`, Namenssynchronisierung.
   - Akzeptanz: Datensatz konsistent und auditiert.
3. QA-001 Testpaket vervollständigen
   - Inhalte: Unit, Integration, E2E, Regression.
   - Akzeptanz: Kritische Testfälle grün.
4. OPS-002 Monitoring und Support-Playbook finalisieren
   - Inhalte: KPI-Dashboards, Incident-Handbuch, Standardantworten.
   - Akzeptanz: Betriebsteam kann Fehlerfälle eigenständig bearbeiten.
5. REL-001 Rollout-Checkliste und Abnahme
   - Inhalte: Deployreihenfolge, Fallback, GO/NO-GO Entscheidung.
   - Akzeptanz: Produktfreigabe dokumentiert.

Lieferobjekte:
- Vollständiges Feature inkl. Upgradepfad.
- Go-live-fähige Test- und Betriebsunterlagen.

Abhängigkeiten:
- Depends on Sprint 4.

Definition of Done Sprint 5:
- Feature ist produktionsbereit, getestet und operativ abgesichert.

**Sprintübergreifende Abhängigkeiten und Parallelisierung**
1. Parallel möglich:
   - UI-Vorbereitung aus Sprint 4 kann technisch teilweise in Sprint 3 beginnen.
   - Testfall-Design kann ab Sprint 2 parallel erstellt werden.
2. Blockierend:
   - Ohne `section_members` und Importpipeline keine belastbare Servervalidierung.
   - Ohne Servervalidierung kein finaler UX-Abschluss.

**Metriken pro Sprint (Steuerung)**
1. Fachabnahme-Rate (Sprint 1): 100 Prozent der Regeln freigegeben.
2. Importqualität (Sprint 2): Fehlerquote pro Lauf, Dublettenquote, Importdauer.
3. Sicherheitshärtung (Sprint 3): Anteil blockierter manipulierter Requests.
4. UX-Wirksamkeit (Sprint 4): Abbruchrate je Kontoart, Fehlermeldungs-Heatmap.
5. Go-live-Reife (Sprint 5): Passrate kritischer E2E und Regression.

**Release-Empfehlung**
1. Soft-Launch für neue Registrierungen (begrenzter Zeitraum mit Monitoring).
2. Nach 48 Stunden ohne kritische Fehler: vollständiger Rollout.
3. Wöchentliche Import- und Registrierungsreview in den ersten 4 Betriebswochen.
