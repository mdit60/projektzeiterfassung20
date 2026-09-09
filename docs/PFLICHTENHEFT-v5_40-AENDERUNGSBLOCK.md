# PFLICHTENHEFT v5.40 - Aenderungsblock (Session 81, 08./09.09.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37/v5.38/v5.39. Dieser Block
enthaelt AUSSCHLIESSLICH die Aenderungen fuer v5.40 mit exakten Einfuegepunkten.
SW-Release V7.9.6 -> V7.9.7. Vier Themenbloecke, davon einer MIT SQL:
(1) Bundesland-Fix Firmendaten, (2) WAZ-Quelle vereinheitlicht (Stammdaten fuehrend,
pWAZ-Hinweis), (3) Elternzeit als Abwesenheitscode E (SQL: CHECK-Constraint),
(4) "sonstige Arbeiten" immer als Differenz.

================================================================================
AENDERUNG 1 - Kopfblock (ersetzt die ersten Zeilen des Dokuments)
================================================================================

ALT:
  **Version:** 5.39
  **SW-Release:** V7.9.6
  **Datum:** 27. August 2026

NEU:
  **Version:** 5.40
  **SW-Release:** V7.9.7
  **Datum:** 9. September 2026

--------------------------------------------------------------------------------
AENDERUNG 1b - Status-Zeile (neuer Stand VORNE ergaenzt; der bisherige V7.9.6-Text
wird zu "Zuvor in V7.9.6:")
--------------------------------------------------------------------------------

Vor "Session 80 (27.08.2026): **NWM-JAHRESSELEKTOR..." wird eingefuegt:

  **Status:** Session 81 (08./09.09.2026): **ELTERNZEIT (CODE E), WAZ-QUELLE
  VEREINHEITLICHT, BUNDESLAND-FIX, SONSTIGE ARBEITEN IMMER ALS DIFFERENZ -
  V7.9.7 (in PRODUKTION).** Vier Themenbloecke, ein SQL-Schritt.
  (1) FirmendatenCard v7.4.6-2: Bundesland-Dropdown arbeitete mit Langnamen,
  die Firmen-Neuanlage speichert ISO-Codes ('DE-SH') - das Feld stand beim
  Bearbeiten auf "-- Bitte auswaehlen --". Jetzt ISO-Codes als Option-Werte,
  Vorbelegung ueber normalizeStateCode, Anzeige im Klartext. (2) Abgrenzung
  Stammsatz/pWAZ: fuer alles Zeitliche sind ausschliesslich
  v7_employee_hours_history -> v7_employees.weekly_hours -> Firmenstandard
  massgeblich; die pWAZ in v7_project_assignments ist der Nenner der
  Anlage-6.1-Stundensatzkalkulation und bleibt Antragswert. TimesheetForm
  v7.4.6-88 (Quellenangabe an der WAZ-Anzeige), ProjectTeamManager v7.4.4-20
  (Divergenz-Hinweis, kein Schreibzugriff). Zwischenstand v7.4.6-87
  (pWAZ-Vorrang) wurde bewusst zurueckgenommen. (3) Elternzeit als neuer
  Abwesenheitscode 'E' mit 0 Stunden: SQL-Constraint in DEV und PROD erweitert;
  TimesheetForm v7.4.6-89 bis -93 (Schutz im Speicherpfad, Lesepfad und
  Tagessperre, Sperre auch der Fehlzeit-Zeilen, Bereichsdialog zum Erfassen und
  Entfernen, Rechtsklick-Fix), stundennachweisSheetData v1.0.2 und
  StundennachweisSheet v1.0.4 (E-Zeile im Sammeldruck). Vom Projekttraeger VDI
  am 08.09.2026 bestaetigt. (4) "Sonstige Arbeiten" sind immer die Differenz aus
  Tagesarbeitszeit und gebuchten Stunden und werden nie eingefroren;
  einheitliches Zahlenformat in allen Stundenzellen. TimesheetForm
  v7.4.6-94/-95/-96 (Endstand -96). Deploy: Merge v7-dev -> main (--no-ff),
  push origin + cubintec, Vercel; main = 17d2bfe, Release-Tag v7.9.7 auf beiden
  Remotes. Details GIT-SICHERUNG-v7_9_7-session81.md. Zuvor in V7.9.6:

(der bestehende Text "Session 80 (27.08.2026): **NWM-JAHRESSELEKTOR..." folgt
unveraendert direkt danach.)

================================================================================
AENDERUNG 2 - Paragraph 4.1 Shared Components (vier Zeilen aktualisieren, eine neu)
================================================================================

- Zeile TimesheetForm.tsx: Versionsangabe -> **7.4.6-96** und am Ende der
  Beschreibung anfuegen:

  ; **v7.4.6-88 (Session 81): WAZ-Quelle. Rangfolge Teilzeit-Historie (zum
  Monatsersten) -> v7_employees.weekly_hours -> Firmenstandard; die pWAZ des
  Projekts ist KEINE Quelle. Anzeige neben der MA-Auswahl nennt die Quelle
  ("lt. Historie" / "lt. Stammdaten" / "Firmenstandard"). Zwischenstand -87
  (pWAZ-Vorrang) zurueckgenommen.**
  ; **v7.4.6-89: Abwesenheitscode 'E' vom Monats-Abgleich beim Speichern
  ausgenommen (Ist-Abfrage filtert auf U/K/S) - ohne diesen Filter waere ein
  Elternzeit-Zeitraum beim naechsten Speichern still deaktiviert worden.**
  ; **v7.4.6-90: Lesepfad Elternzeit. E-Tage aus v7_employee_absences
  (elternzeitDays), getAbsenceCodeForDay liefert auch 'E' -> ganztaegige Sperre;
  neue Anzeigezeile "Elternzeit (E, keine Arbeitszeit)" mit Tageszahl; die
  Feiertags-Vorbelegung der S-Zeile ueberspringt E-Tage.**
  ; **v7.4.6-91: An E-Tagen auch keine Fehlzeiten U/K/S erfassbar (kein
  Eingabefeld, Zelle hellblau, canEdit ueberspringt sie).**
  ; **v7.4.6-92: Bereichsdialog Elternzeit (Rechtsklick oder Eingabe "E").
  Von/Bis mit Vorschau: Zahl der Tage, bereits erfasste E-Tage, zu ersetzende
  U/K/S (Vorgabe ersetzen), Tage mit erfassten Arbeitsstunden (werden NICHT
  ueberschrieben), abgeschlossene Monate (uebersprungen). Geschrieben werden
  Mo-Fr inkl. Feiertagen. Ruecknahme im selben Dialog. Nur Berater oder
  Firmen-Administrator.**
  ; **v7.4.6-93: Rechtsklick auf gesperrten Zellen wieder moeglich - das
  disabled-Input bekommt 'pointer-events-none' (wie zuvor bei Kurzarbeit),
  sonst erschien das Browser-Menue.**
  ; **v7.4.6-94/-95/-96 (Endstand): "sonstige Arbeiten" ist immer die Differenz
  aus Tagesarbeitszeit und gebuchten Stunden. -94: keine manuellen Overrides mehr
  ableiten (die alte Heuristik verglich mit der reinen Tagesformel, waehrend die
  Auto-Vorbelegung zusaetzlich den Wochendeckel anwendet - so entstandene Werte
  galten faelschlich als manuell und wurden eingefroren). -95: einheitliches
  Zahlenformat in allen Stundenzellen (fmtHCell). -96: auch leere Arbeitstage
  werden wieder gefuellt (Unterscheidung neuer/gespeicherter Monat entfaellt).
  Wochenenden, Feiertage, gesperrte Tage, Kurzarbeit und Abwesenheitstage bleiben
  ohne Auto-Vorbelegung.**

- Zeile FirmendatenCard.tsx: Versionsangabe -> **7.4.6-2** und anfuegen:

  ; **v7.4.6-2 (Session 81): Bundesland als ISO-Code. BUNDESLAENDER als
  { code, name } wie in der Firmen-Neuanlage; Option-Value = Code, Label = Name.
  Vorbelegung ueber normalizeStateCode() - Altbestand mit Langnamen wird korrekt
  vorausgewaehlt. Gespeichert wird immer der ISO-Code, angezeigt der Klartextname.**

- Zeile ProjectTeamManager.tsx: Versionsangabe -> **7.4.4-20** und anfuegen:

  ; **v7.4.4-20 (Session 81): Divergenz-Hinweis pWAZ. Weicht die im Projekt
  erfasste pWAZ vom aktuellen Stammsatz des MA ab (Toleranz 0,01 h), erscheint im
  Add- und im Edit-Dialog ein Hinweis mit beiden Werten. Bewusst nur Hinweis, keine
  Uebernahme: die pWAZ ist der Nenner der Anlage-6.1-Stundensatzkalkulation und an
  Antrag/Bescheid gebunden.**

- Zeile StundennachweisSheet.tsx: Versionsangabe -> **1.0.4** und anfuegen:

  ; **v1.0.4 (Session 81): Zeile "Elternzeit (E, keine Arbeitszeit)" - nur wenn
  E-Tage vorhanden, Summe = Tageszahl, keine Stunden. Erfordert
  stundennachweisSheetData ab v1.0.2.**

- NEUE Zeile (src/lib, im selben Abschnitt fuehren):

  | stundennachweisSheetData.ts | **1.0.2** | Anzeigemodell fuer ein
  Stundennachweis-Blatt; **v1.0.2 (Session 81): Elternzeit (absence_code 'E',
  0 Stunden) als Tag-Marker (elternzeitByDay/elternzeitDays) analog Kurzarbeit;
  an E-Tagen unterbleibt die Feiertags-Vorbelegung der S-Zeile.** |

================================================================================
AENDERUNG 3 - Paragraph 7e Arbeitszeitgrenzen (Abschnitt "weekly_hours" ersetzen)
================================================================================

ALT:
  **weekly_hours:** Wird aus v7_employee_hours_history geladen (Teilzeit-Historie,
  gueltig zum Ersten des jeweiligen Monats). Fallback: v7_employees.weekly_hours.

NEU:
  **weekly_hours (verbindliche Rangfolge, Session 81):**
  (1) v7_employee_hours_history - Eintrag, der zum Monatsersten gueltig war,
  (2) v7_employees.weekly_hours, (3) v7_client_companies.standard_weekly_hours.
  Die projektbezogene pWAZ (v7_project_assignments.personal_weekly_hours) ist
  **keine** Quelle dieser Kette - sie ist der Nenner der
  Anlage-6.1-Stundensatzkalkulation (Jahresbrutto / (pWAZ x 52)) und an
  Antrag/Bescheid gebunden. Eine Synchronisation zwischen beiden Feldern findet in
  keiner Richtung statt; Abweichungen werden im Team-Dialog nur gemeldet
  (ProjectTeamManager v7.4.4-20). Die Zeiterfassung zeigt die wirksame WAZ mit
  Quellenangabe an. Details: KONZEPT-ARBEITSZEITGRENZEN-v1_4.md Paragraph 2.4.

================================================================================
AENDERUNG 4 - NEUER Paragraph 7f "Elternzeit im Stundennachweis (Code E)"
(direkt nach Paragraph 7e einfuegen)
================================================================================

## 7f. Elternzeit im Stundennachweis (Code E, ab V7.9.7)

Konzept: KONZEPT-ELTERNZEIT-TIMESHEET-v1_0.md. Bestaetigt durch den Projekttraeger
VDI (Telefonat 08.09.2026): an diesen Tagen genuegt es, nichts einzutragen; eine
Kennzeichnung ist willkommen, aber nicht gefordert.

**Abgrenzung:** Teilzeit waehrend der Elternzeit (BEEG, bis 32 h/Woche) ist KEIN
Fall fuer E, sondern ein neuer Eintrag in der Wochenstunden-Historie. E gilt nur fuer
vollstaendige Elternzeit ohne Arbeit.

**Datenmodell:** v7_employee_absences, absence_code 'E', hours = 0,
note = 'Elternzeit'. CHECK-Constraint erweitert auf ('U','K','S','E') in DEV und
PROD. Kein project_id -> ein E-Tag gilt in allen Projekten des MA, sofern das
Zuordnungsfenster den Tag einschliesst.

**Wirkung eines E-Tages:**
- 0 Stunden; fliesst weder in die Abwesenheitssummen noch in die Monatssumme ein.
- Ganztaegige Sperre: keine Projektstunden, keine sonstigen Arbeitszeiten, keine
  Fehlzeiten U/K/S.
- Keine Feiertags-Vorbelegung der S-Zeile (ohne Entgeltfortzahlung keine bezahlten
  Feiertagsstunden). Deshalb wird E auch AUF Feiertage geschrieben.
- Arbeitszeitgrenzen unveraendert.

**Erfassung:** ausschliesslich als Zeitraum ueber den Bereichsdialog (Rechtsklick
auf eine Tageszelle oder Eingabe "E"). Geschrieben werden alle Tage Montag bis
Freitag inklusive Feiertagen; Wochenenden bleiben frei. Vor dem Schreiben Vorschau
mit Konfliktanzeige: vorhandene U/K/S werden ersetzt (Vorgabe; Paragraph 17 BEEG),
Tage mit erfassten Arbeitsstunden werden NICHT ueberschrieben, abgeschlossene Monate
werden uebersprungen. Ruecknahme ueber denselben Dialog; ersetzte U/K/S werden dabei
nicht wiederhergestellt.

**Berechtigung:** nur Berater oder Firmen-Administrator (portal === 'berater' ||
isAdmin).

**Anzeige:** eigene Zeile "Elternzeit (E, keine Arbeitszeit)" im Abschnitt
Fehlzeiten, nur sichtbar wenn E-Tage vorhanden sind; statt einer Stundensumme die
Zahl der Tage. Identisch im Formular, im Einzeldruck und im Sammeldruck.

**Nicht umgesetzt (bewusst):** Kapazitaetsplanung beruecksichtigt E-Tage noch nicht;
keine Warnung bei verplanten Arbeitsplan-PM im E-Zeitraum; Mutterschutz hat keinen
eigenen Code.

================================================================================
AENDERUNG 5 - Paragraph 4.x "Sonstige Arbeiten" (Regel ergaenzen)
================================================================================

Neuer Absatz:

  **Regel ab V7.9.7 (Session 81):** "Sonstige Arbeiten" ist an einem reinen
  Arbeitstag **immer** die Differenz aus Tagesarbeitszeit und gebuchten Stunden
  (Tages- und Wochendeckel wie bisher) und wird **nie eingefroren**. Die frueheren
  Ausnahmen entfallen: es werden keine manuellen Overrides mehr abgeleitet
  (v7.4.6-94), und auch leere Tage werden wieder gefuellt (v7.4.6-96). Wochenenden,
  Feiertage, gesperrte Tage, Kurzarbeit und Abwesenheitstage bleiben von der
  Auto-Vorbelegung unberuehrt.

================================================================================
AENDERUNG 6 - Paragraph 5 Bekannte Fehler (drei neue Zeilen ans Tabellenende)
================================================================================

  | 5.xx | Bundesland aus der Firmen-Neuanlage erschien im Bearbeiten-Modal nicht (ISO-Code gegen Langnamen) | Behoben | FirmendatenCard v7.4.6-2 |
  | 5.xx | "sonstige Arbeiten" folgten Aenderungen der Projektstunden nicht mehr (faelschlich als manuell eingestuft, Wochendeckel vs. Tagesformel) | Behoben | TimesheetForm v7.4.6-94/-96 |
  | 5.xx | Rechtsklick auf Abwesenheitstagen oeffnete das Browser-Menue statt des PZE-Menues (disabled-Input verschluckt contextmenu) | Behoben | TimesheetForm v7.4.6-93 |

(Nummern beim Einfuegen fortlaufend vergeben.)

================================================================================
AENDERUNG 7 - Paragraph 12.1 Anforderungsliste (vier neue Zeilen ans Tabellenende)
================================================================================

  | A-057 | Bundesland muss beim Bearbeiten der Firmendaten so erscheinen, wie es bei der Neuanlage erfasst wurde | Martin (Neuanlage FYS) | Session 81 | Erledigt | 08.09.2026 | FirmendatenCard v7.4.6-2: ISO-Codes als Option-Werte, Vorbelegung ueber normalizeStateCode, Klartextanzeige. Pruefskript SQL-CHECK-federal-state-iso-v1.sql. |
  | A-058 | Es muss eindeutig sein, welche Wochenarbeitszeit die Zeiterfassung verwendet; Abweichungen zur pWAZ muessen sichtbar werden, ohne die Antragswerte zu veraendern | Martin | Session 81 | Erledigt | 08.09.2026 | Rangfolge Historie -> Stammsatz -> Firmenstandard (PH 7e); TimesheetForm v7.4.6-88; ProjectTeamManager v7.4.4-20. KONZEPT-ARBEITSZEITGRENZEN-v1_4.md Paragraph 2.4. |
  | A-059 | Elternzeit muss im Stundennachweis abbildbar sein: keine Stunden, Tage gesperrt, Grund erkennbar, Erfassung als Zeitraum | Martin (Rueckfrage Projekttraeger VDI) | Session 81 | Erledigt | 08.09.2026 | Abwesenheitscode E (SQL DEV+PROD), TimesheetForm v7.4.6-89 bis -93, stundennachweisSheetData v1.0.2, StundennachweisSheet v1.0.4. PH 7f. Offen: Kapazitaetsplanung, PM-Warnung. |
  | A-060 | "Sonstige Arbeiten" muessen jeder Aenderung der Projektstunden folgen und duerfen nicht auf altem Stand stehenbleiben | Martin (Volkmann, April/Juni 2026) | Session 81 | Erledigt | 08.09.2026 | TimesheetForm v7.4.6-94/-95/-96. Regel in PH ergaenzt. |

================================================================================
AENDERUNG 8 - Paragraph 12e Verhaltensvertrag
================================================================================

Arbeitskopie: VERHALTENSVERTRAG-v1_2.md (loest v1.1 ab).

**8a - TimesheetForm-Tabelle, bestehende Zeilen ersetzen:**

  | TF-04 | Feiertage in S-Zeile | Werktags-Feiertage automatisch mit Tagesstunden vorbelegt. **Ausnahme: an Elternzeit-Tagen (Code E) KEINE Vorbelegung** |
  | TF-05 | Fehlzeiten U/K/S editierbar | Tageszellen frei editierbar, Summen korrekt. **Ausnahme: an Elternzeit-Tagen (Code E) ist in den Zeilen U, K und S bewusst KEIN Eingabefeld vorhanden** |
  | TF-07 | Summenberechnung | Zeilensumme (S), Tagessumme, Gesamtsumme korrekt. E-Tage tragen 0 Stunden und erscheinen in keiner Stundensumme |
  | TF-09 | Arbeitszeitgrenzen | Tagesgrenze 9h (hart), Monatsgrenze (weich), Zellfaerbung. Massgebliche WAZ: Teilzeit-Historie -> v7_employees.weekly_hours -> Firmenstandard; die pWAZ ist KEINE Quelle |
  | TF-12 | Nicht-zuschussfaehige Arbeiten | Sonstige-Zeile editierbar, nicht in Summe (2). **Neu: an einem reinen Arbeitstag ist der Wert IMMER die Differenz und folgt jeder Aenderung - er wird nicht eingefroren.** Wochenenden, Feiertage, gesperrte Tage, Kurzarbeit und Abwesenheitstage bleiben unberuehrt |

**8b - TimesheetForm-Tabelle, neue Zeile ans Ende:**

  | TF-15 | Elternzeit (Code E) | E-Tage werden angezeigt (eigene Zeile mit Tageszahl), sperren den Tag vollstaendig (Projekt, sonstige, U/K/S) und ueberleben jedes Speichern des Monats. Erfassung und Ruecknahme ausschliesslich ueber den Bereichsdialog, nur fuer Berater und Firmen-Administrator. Der Monats-Abgleich beim Speichern darf E-Zeilen NIE deaktivieren |

**8c - "Besonders fragile Bereiche" des TimesheetForm um drei Punkte ergaenzen:**

  - **Monats-Abgleich der Abwesenheiten beim Speichern:** Ist-Abfrage MUSS auf
    `absence_code IN ('U','K','S')` gefiltert bleiben (TF-15).
  - **Auto-Vorbelegung "sonstige Arbeiten":** Tages- UND Wochendeckel; eine zweite
    Berechnungsformel an anderer Stelle erzeugt Divergenzen (TF-12).
  - **pointer-events auf gesperrten Zellen:** disabled-Input ohne
    `pointer-events-none` verschluckt den Rechtsklick.

**8d - Weitere Vertragszeilen nachgetragen (aus V7.9.6):**

  | ZA-12 | FZ-basierte Foerderquote (NWM) | Foerderquote aus v7_nwm_foerderzeitraeume; bei FZ-Grenzueberschreitung rote Meldung und Speichersperre |
  | PF-08 | NWM-Jahresselektor | Dropdown "Netzwerkjahr" bei ZIM_NETZWERK; Fortschritt und Prognose auf den gewaehlten Foerderzeitraum eingeschraenkt |

  BP-06 ergaenzen um: Nenner der Stundensatzberechnung ist die pWAZ des Projekts,
  NICHT der MA-Stammsatz.

**8e - NEUER Komponenten-Abschnitt "Verhaltensvertrag: ProjectTeamManager":**

  | PT-01 | Team-Liste | Alle Zuordnungen mit Lfd.-Nr., Rolle, Zeitraum, Stundensatz |
  | PT-02 | Anlage-6.1-Felder | Stundensatz = (Monatslohn x 12 + Fixbestandteile) / (pWAZ x 52) |
  | PT-03 | Bewilligter Stundensatz | hourly_rate_approved getrennt vom kalkulatorischen Satz |
  | PT-04 | Vorbelegung aus Stammdaten | Anlage-6.1-Vorgabewerte werden uebernommen, bleiben editierbar |
  | PT-05 | Zuordnungszeitraum | assignment_end nie spaeter als employment_end |
  | PT-06 | pWAZ-Divergenz-Hinweis | Hinweis mit beiden Werten, ohne Schreibzugriff |

**8f - Infrastruktur-Checkliste um eine Zeile ergaenzen:**

  | IF-08 | Release-Tag setzen | Nach jedem PROD-Deploy: `git tag -a vX.Y.Z`, push auf origin UND cubintec |

================================================================================
AENDERUNG 9 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.40 | 09.09.2026 | Session 81 (V7.9.7, vier Themenbloecke, ein SQL-Schritt): (1) Bundesland-Fix - FirmendatenCard v7.4.6-2 mit ISO-Codes, Vorbelegung ueber normalizeStateCode. A-057. (2) WAZ-Quelle vereinheitlicht - Rangfolge Teilzeit-Historie -> Stammsatz -> Firmenstandard; pWAZ bleibt Antragswert, keine Synchronisation; TimesheetForm v7.4.6-88, ProjectTeamManager v7.4.4-20; Zwischenstand -87 zurueckgenommen. A-058, PH 7e. (3) Elternzeit als Abwesenheitscode E - SQL-Constraint in DEV und PROD; TimesheetForm v7.4.6-89 bis -93; stundennachweisSheetData v1.0.2, StundennachweisSheet v1.0.4. Vom Projekttraeger VDI bestaetigt. A-059, neuer PH 7f. (4) "Sonstige Arbeiten" immer als Differenz, nie eingefroren, einheitliches Zahlenformat - TimesheetForm v7.4.6-94/-95/-96. A-060. Verhaltensvertrag (PH 12e) auf v1.2: TF-04/05/07/09/12 angepasst, TF-15 neu, ProjectTeamManager PT-01..06 neu, ZA-12 und PF-08 nachgetragen, IF-08 Release-Tag. Deploy: main = 17d2bfe, Tag v7.9.7. Details GIT-SICHERUNG-v7_9_7-session81.md. |
