Plan: Mitgliederdatenbank-gestützte Registrierung mit Gastkonto
Die vollständige Roadmap ist erstellt und als ausführliches Plan-Dokument in der Session gespeichert unter /memories/session/plan.md.
Hier ist die vollständige Fassung in strukturierter Form.

1. Ziel und Ergebnisbild
Registrierung als Mitglied oder Elternkonto ist nur möglich, wenn Mitgliedsnummer und Geburtsdatum gegen die offizielle Sektions-Mitgliederliste validiert sind.
Der Name wird für Mitglied und Elternkonto immer aus der Mitgliederliste übernommen, nicht frei aus dem Formular.
Gastkonto wird als eigene Rolle geführt.
Bei Mitgliedsnummern anderer Sektionen wird der Mitgliedsweg abgelehnt und direkt auf den Gastweg verwiesen.
Gastnutzer können später Mitgliedsdaten nachtragen und in ein reguläres Konto migrieren.
2. Scope
In Scope:
Drei Registrierungswege: Mitglied, Eltern, Gast.
Serverseitige Validierungs-Pipeline.
CSV-Import als Mitgliederquelle.
Datenmodell, Rollenmodell, Policies, Tests, Monitoring, Betriebsdokumentation.
Out of Scope:
Live-API-Anbindung an ein externes DAV-System.
Rechteausweitung für Gast über Basisrechte.
Änderungen an Tour-/Materiallogik außerhalb der notwendigen Rollenkompatibilität.
3. Fachentscheidungen
Quelle der Mitgliedsdaten ist CSV-Import.
Gast ist eigene Rolle guest.
Fremdsektion im Mitgliedsweg wird abgelehnt.
Gasttyp wird gespeichert als other_section oder no_membership.
Lokales Sektionspräfix für Mitgliedsweg ist über env varialbe definiert (bsp 209).
4. Architektur-Workstreams
Produkt- und Datenmodell.
Datenimport und Datenqualität.
Serverseitige Registrierung und Sicherheit.
Frontend-UX und Formularlogik.
Gast-Upgrade-Pfad.
Qualitätssicherung und Rollout.
5. Phasen-Roadmap
Phase 0: Fachspezifikation und Abnahme
Validierungsmatrix finalisieren für Mitglied, Eltern, Gast.
Fehlermeldungskatalog definieren.
Datenschutz und gespeicherte Mitgliedsfelder final festlegen.
Ergebnis: freigegebene fachliche Spezifikation.
Phase 1: Datenmodell und Migrationen
Neue Mitglieder-Mastertabelle einführen, zum Beispiel section_members mit:
membership_number
birthdate
full_name
is_active
imported_at
Profiles erweitern:
Rolle guest
Feld guest_type
Constraints einführen:
Mitgliedsnummer nur 11 Ziffern
Präfix über env varialbe definiert (bsp 209) für member und parent
Konsistenzregeln für guest
Indizes:
Eindeutiger Index auf membership_number
Optionaler Kombinationsindex auf membership_number und birthdate
RLS und Rollenhelfer um guest ergänzen.
Ergebnis: stabile DB-Basis für Validierung und Gastmodell.
Phase 2: CSV-Importpipeline
Importskript in scripts erstellen.
CSV-Header und Daten strikt validieren.
Nummern normalisieren, doppelte Einträge melden.
Upsert in section_members.
Nicht mehr vorhandene Mitglieder per Soft-Deaktivierung markieren.
Import-Audit je Lauf speichern.
Ergebnis: reproduzierbare, auditierbare Mitgliederquelle.
Phase 3: Serverseitige Registrierungsdurchsetzung
Zentrale Server-Action oder Route als Registrierungsorchestrierung einführen.
Für Mitglied und Eltern:
Nummer normalisieren
Präfix prüfen
Nummer und Geburtsdatum gegen section_members prüfen
Name aus section_members übernehmen
Für Gast:
role = guest erzwingen
guest_type verpflichtend
Schutzmaßnahmen:
Idempotenz
Rate-Limit
Keine Rollenübernahme aus Clientpayload
Auth-Callback mit servervalidierten Daten synchron halten.
Ergebnis: manipulationssichere Registrierung.
Phase 4: Frontend-UX
Register-Formular auf drei Kontoarten erweitern in RegisterForm.tsx.
Mitglied und Eltern: Name nicht frei editierbar, stattdessen Hinweis auf Übernahme aus Mitgliederdatenbank.
Gast: verpflichtende Auswahl des Gasttyps.
Eindeutige Fehlermeldungen für:
ungültiges Format
unbekannte Nummer
falsches Geburtsdatum
Fremdsektion
Ergebnis: klarer, verständlicher Nutzerfluss.
Phase 5: Gast-Upgrade zu Mitglied
Profilbereich für Nachpflege von Mitgliedsnummer und Geburtsdatum erweitern.
Gleiche serverseitige Validierung wie bei Erstregistrierung verwenden.
Bei Erfolg:
Rolle guest auf member oder parent wechseln
Name aus Mitgliederquelle synchronisieren
Ereignis auditen und Nutzer rückmelden.
Ergebnis: nahtloser Übergang ohne Neuregistrierung.
Phase 6: Tests und Abnahme
Unit-Tests:
Normalisierung
Präfixprüfung
Validierungsfunktionen
Integrationstests:
Lookup gegen section_members
Rollen- und Payload-Härtung
E2E-Tests:
Mitglied
Eltern
Gast mit beiden Gasttypen
Fremdsektion-Ablehnung
Gast-Upgrade
Regressionstests der bestehenden Rollen und Kernflows.
Ergebnis: abnahmefähiges, abgesichertes Feature.
Phase 7: Rollout und Betrieb
Reihenfolge:
Migrationen
Erstimport
Backend
Frontend
Monitoring-KPIs:
Erfolgsquote je Kontoart
Ablehnungsgründe
Importfehlerquote
Support-Playbook für typische Fälle.
Fallback bei Importausfall auf letzten gültigen Datenstand.
Ergebnis: stabiler Go-live mit Beobachtbarkeit.
6. Meilensteine und Akzeptanzkriterien
M1 Datenmodell bereit:
Migrationen laufen fehlerfrei.
guest und guest_type verfügbar.
M2 Import bereit:
Test-CSV wird korrekt verarbeitet.
Import-Audit vollständig.
M3 Servervalidierung aktiv:
Manipulierte Payload kann keine unzulässige Registrierung erzeugen.
M4 UX bereit:
Drei Kontoarten vollständig nutzbar.
M5 Upgrade bereit:
Gast zu Mitglied funktioniert konsistent.
M6 Go-live:
Monitoring aktiv und fachliche Abnahme erteilt.
7. Risiken und Gegenmaßnahmen
Risiko: fehlerhafte CSV-Daten.
Gegenmaßnahme: strenge Validierung, Fehlerbericht pro Lauf, Soft-Deaktivierung.
Risiko: Rollenregression durch guest.
Gegenmaßnahme: Rechte-Matrix und Regressionstests.
Risiko: Nutzerabbrüche durch strenge Prüfungen.
Gegenmaßnahme: klare Fehlermeldungen, direkter Gastpfad.
Risiko: Inkonsistenz zwischen Auth-Metadaten und Profil.
Gegenmaßnahme: Profilfelder nur serverseitig aus validierter Quelle schreiben.
8. Relevante Referenzen im Projekt
ROADMAP.md
README.md
RegisterForm.tsx
page.tsx
route.ts
permissions.ts
auth.ts
20260401_add_membership_number.sql
database.md
database-policies.md
9. Zeitrahmen
Phase 0 bis 2: 3 bis 5 Arbeitstage.
Phase 3 bis 5: 4 bis 7 Arbeitstage.
Phase 6 bis 7: 2 bis 3 Arbeitstage.
Gesamt: 9 bis 15 Arbeitstage, abhängig von Testtiefe und Abstimmungszyklen.
Wenn du möchtest, erstelle ich als nächsten Schritt daraus zusätzlich eine Version mit Sprint-Aufteilung Woche für Woche inklusive konkreter Tickets je Phase.