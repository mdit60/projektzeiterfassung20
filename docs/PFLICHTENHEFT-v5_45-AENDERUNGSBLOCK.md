# PFLICHTENHEFT v5.45 - Aenderungsblock (Session 84, 11.09.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37 bis v5.44. Dieser Block enthaelt
AUSSCHLIESSLICH die Aenderungen fuer v5.45 mit exakten Einfuegepunkten.
KEIN neues SW-Release: der Softwarestand bleibt V7.9.11. Reine DOKUMENTATION - kein Code,
kein SQL. Inhalt: Verhaltensvertrag v1.3 (Paragraph 12e) und zwei neue, offene
Anforderungen A-070 und A-071, die beim Abgleich der neuen Vertragsregeln mit dem
deployten Code gefunden wurden.

Arbeitskopie des Vertrags: VERHALTENSVERTRAG-v1_3-2.md (loest v1.2 ab; der erste Stand
VERHALTENSVERTRAG-v1_3.md basierte auf der aelteren Projektkopie von v1.2 und ist
verworfen).

Nummernpruefung vor Vergabe: v5.45 sowie A-070 und A-071 sind weder in downloads/ noch in
den lesbaren Dateien unter downloads/archiv/ noch in den Projektdokumenten vergeben
(Stand 11.09.2026; hoechste bisherige Anforderung A-069 aus v5.44). Nicht lesbare
iCloud-Platzhalter im Archiv sind aeltere Staende (Pflichtenheft bis v5.28,
GIT-SICHERUNG bis Session 70) und kommen fuer diese Nummern nicht in Frage. Gegenprobe
gegen docs/ im Repo durch Martin (Empfehlung aus v5.41).

================================================================================
AENDERUNG 1 - Kopfblock (ersetzt die ersten Zeilen des Dokuments)
================================================================================

ALT:
  **Version:** 5.44
  **SW-Release:** V7.9.11
  **Datum:** 11. September 2026

NEU:
  **Version:** 5.45
  **SW-Release:** V7.9.11
  **Datum:** 11. September 2026

--------------------------------------------------------------------------------
AENDERUNG 1b - Status-Zeile (neuer Stand VORNE ergaenzt; der bisherige Text wird
zu "Zuvor in V7.9.11 (Session 83):")
--------------------------------------------------------------------------------

Vor dem bestehenden Status-Text aus v5.44 wird eingefuegt:

  **Status:** Session 84 (11.09.2026): **VERHALTENSVERTRAG v1.3 - DOKUMENTATION, KEIN
  CODE-RELEASE - Softwarestand unveraendert V7.9.11 (in PRODUKTION).** Paragraph 12e um
  zwei Komponenten-Vertraege erweitert: Kapazitaetsplanung (KP-01..04) und
  FZul-Detailseite/BSFZ-Export (FD-01..08). Dazu PF-09 (gemeinsamer Bezugsrahmen von
  Erreichungsgrad und Verschenkt), IF-09 (Monatsverlauf in zwei Implementierungen),
  IF-10 (is_billable = true bei "gefoerdert") und IF-11 (Fehlerauswertung,
  Datumsgrenzen) sowie je ein fragiler Bereich bei TimesheetForm und FirmaCockpit. Jede
  neue Regel wurde gegen den deployten Code geprueft; dabei zwei offene Anforderungen
  aufgenommen: A-070 (BSFZ-Export fuellt das Tagesraster auch ausserhalb der
  Vorhabenmonate; PROD derzeit ohne Wirkung) und A-071 (Ladefehler auf der
  FZul-Detailseite und im Export werden still als 0 behandelt). Arbeitskopie
  VERHALTENSVERTRAG-v1_3-2.md. Zuvor in V7.9.11 (Session 83):

(der bestehende Status-Text aus v5.44 folgt unveraendert direkt danach.)

================================================================================
AENDERUNG 2 - Paragraph 5 Bekannte Fehler (zwei neue Eintraege, beide nicht behoben)
================================================================================

  - BSFZ-Export: das Tagesraster wird fuer Januar bis Dezember gefuellt, unabhaengig von
    start_monat/ende_monat des FZul-Vorhabens (A-070). PROD derzeit ohne Wirkung.
  - FZul-Detailseite und BSFZ-Export: Ladefehler der v7_projects- und
    v7_timesheets-Abfragen sowie des Urlaubsanspruchs in der Excel-Erzeugung werden
    still als 0 behandelt (A-071).

================================================================================
AENDERUNG 3 - Paragraph 12.1 Anforderungsliste (zwei neue Zeilen ans Tabellenende)
================================================================================

  | A-070 | BSFZ-Export: Tagesraster nur innerhalb der Vorhabenmonate (start_monat bis ende_monat) fuellen | Session 84 (Codeabgleich fuer VERHALTENSVERTRAG v1.3, FD-06) | Session 84 | Offen | 11.09.2026 | Route /api/export/fzul v2.5 schreibt fuer jeden Arbeitstag Januar bis Dezember "Tagesarbeitszeit minus gefoerdert"; multiprojekt-detail v7.4.8-20 uebergibt start_monat/ende_monat nicht, die Route prueft sie nicht. Folge bei einem unterjaehrigen Vorhaben: FuE-Stunden in Monaten ausserhalb der Laufzeit. Ob Zeile 45 der Vorlage das auffaengt, ist nicht geprueft. PROD-Abfrage 11.09.2026: kein Vorhaben mit start_monat > 1 oder ende_monat < 12 - derzeit ohne Wirkung. Im DEV-Test zu A-067 (Vorhaben 1-12) nicht sichtbar. |
  | A-071 | FZul-Detailseite und BSFZ-Export: Ladefehler duerfen nicht still als 0 behandelt werden | Session 84 (Codeabgleich fuer VERHALTENSVERTRAG v1.3, FD-08) | Session 84 | Offen | 11.09.2026 | multiprojekt-detail v7.4.8-20: die v7_projects- und v7_timesheets-Abfragen in Uebersicht, Import, Kalender und Export werten error nicht aus -> gefoerdert 0 -> zu VIELE FZul-Stunden angeboten und exportiert (gleiches Muster wie der Beifang "-31" zu A-067). Die Excel-Erzeugung liest annual_leave_days ohne Fehlerpruefung und setzt ?? 0 -> O39 = 0; nur die Anzeige im Export-Tab wirft den Fehler. Ladefehler der Abwesenheiten sind bereits korrekt behandelt. Regel fuer neuen Code: IF-11. |

================================================================================
AENDERUNG 4 - Paragraph 12e Verhaltensvertrag (Fortschreibung auf v1.3)
================================================================================

Arbeitskopie: VERHALTENSVERTRAG-v1_3-2.md (loest v1.2 ab). Alle bestehenden Vertragszeilen
bleiben unveraendert; es kommen nur die folgenden Teile hinzu.

**4a - TimesheetForm, "Besonders fragile Bereiche": neuer Punkt direkt nach
"Auto-Vorbelegung 'sonstige Arbeiten'":**

  - **Wirkung der Auto-Vorbelegung nach aussen (neu v1.3):** Die vorbelegten Zeilen (ohne
    AP, `is_billable = false`) stehen in jedem Foerderprojekt an jedem gespeicherten
    Arbeitstag. Jede Auswertung ausserhalb des TimesheetForm, die "gefoerderte" Stunden
    zaehlt, muss auf `is_billable = true` filtern (IF-10; Ursache von A-068).

**4b - FirmaCockpit: neuer Unterabschnitt direkt nach der Tabelle (nach FC-07):**

  ### Besonders fragile Bereiche (neu v1.3):

  - **Eigene Kopie des Monatsverlaufs:** Das Cockpit bindet das Diagramm NICHT aus dem
    ProjektFortschrittPanel ein, sondern haelt eine eigene Implementierung. Jede Aenderung
    am Monatsverlauf ist in beiden Dateien vorzunehmen (IF-09). In V7.9.9 wurde die
    Cockpit-Kopie zunaechst uebersehen und zeigte weiter die alten Linien (A-064).

**4c - ProjektFortschrittPanel: neue Zeile direkt nach PF-08 und neuer Hinweis direkt
nach dem Hinweis zum Refactor projektfortschritt-utils:**

  | PF-09 | **Gemeinsamer Bezugsrahmen der Foerderkennzahlen, neu in v1.3** | Kennzahlen, die gegeneinander gelesen werden (Erreichungsgrad in Prozent, Verschenkt in EUR), haben denselben Massstab. "Verschenkt" misst gegen das bei voller Planerfuellung Abrufbare (min(Plankosten x Foerdersatz, bewilligte Summe)); bei 100 Prozent Erreichungsgrad ist Verschenkt 0 EUR. Eine Differenz zwischen Bewilligung und Arbeitsplan erscheint nur im Block "Planungsluecke im Arbeitsplan" (A-063) |

  ### Hinweis (neu v1.3):

  Die Diagramm-Implementierung existiert ein zweites Mal im FirmaCockpit (Abschnitt 4,
  IF-09). Ein Deckel oder Massstab, der nur in einer von zwei gegeneinander gelesenen
  Groessen wirkt, erzeugt fachlich nicht aufloesbare Widersprueche (PF-09).

**4d - NEUER Komponenten-Abschnitt nach "Verhaltensvertrag: ProjectTeamManager":**

  ### Verhaltensvertrag: Kapazitaetsplanung (neu in v1.3)

  **Datei:** src/app/v7/berater/multiprojekt/page.tsx
  **Genutzt in:** Berater-Portal, Kapazitaetsmatrix je Mitarbeiter und Monat
  (das FZul-Vorhaben-Panel auf derselben Seite ist nicht Teil dieses Vertrags)

  ### Funktionen die IMMER korrekt arbeiten muessen:

  | Nr | Funktion | Pruefung |
  |----|----------|----------|
  | KP-01 | Monatskapazitaet | Arbeitstage des Monats (Mo-Fr ohne Feiertage des Bundeslandes einschliesslich holiday_region, countWorkdaysInMonth) x WAZ/5. WAZ: Eintrag aus v7_employee_hours_history zum Monatsersten -> v7_employees.weekly_hours -> 40 |
  | KP-02 | Elternzeit (Code E) | E-Tage aus v7_employee_absences (absence_code 'E', is_active, .limit(10000)), je MA und Datum einmal gezaehlt, nur Arbeitstage (Mo-Fr, kein Feiertag), hoechstens so viele wie Arbeitstage. Kapazitaet = (Arbeitstage - E-Arbeitstage) x WAZ/5. Ampel-Prozent auf Basis der VOLLEN Monatskapazitaet ohne Elternzeit. Monat vollstaendig in Elternzeit: hellblaue Zelle "E" statt Ampel, rotes E bei trotzdem geplanten oder verbuchten Stunden. Tooltip mit Zeile Elternzeit und Verfuegbar. Fuer MA ohne E-Tage sind alle Werte unveraendert |
  | KP-03 | Geplante und verbuchte Stunden | Geplant = PM x 173,33, gleichmaessig auf alle Kalendermonate der AP-Laufzeit verteilt, nur fuer den laufenden und kuenftige Monate; Standard-Projekte aus v7_work_package_assignments (is_active, planned_person_months), ZIM_NETZWERK aus v7_nwm_ap_planung der Foerderzeitraeume im Anzeigezeitraum. Verbucht = v7_timesheets aller aktiven Projekte der Firma, is_active, .limit(10000), nach Buchungsmonat |
  | KP-04 | Frei und Jahressummen | Frei h je Monat = max(0, Kapazitaet - geplant - verbucht). Jahressummen: Frei h = Summe der Monatswerte, Frei PM = Frei h / 173,33 |

  ### Besonders fragile Bereiche:

  - **Voll-E-Monat:** Ohne die Sonderbehandlung zeigt die Ampelformel eine Kapazitaet von 0
    als "100 Prozent frei" (gruen). Die Pruefung `elternzeitTage > 0 && gesamt === 0` muss
    vor der Ampel stehen.
  - **E auf Feiertagen:** Der Bereichsdialog schreibt E auch auf Feiertage;
    countWorkdaysInMonth zaehlt Feiertage nicht mit. E-Tage auf Feiertagen muessen deshalb
    herausfallen, sonst wird doppelt abgezogen.

**4e - NEUER Komponenten-Abschnitt direkt nach 4d:**

  ### Verhaltensvertrag: FZul-Detailseite und BSFZ-Export (neu in v1.3)

  **Dateien:**
  - src/app/v7/berater/multiprojekt/[id]/page.tsx (Uebersicht, Import, Jahreskalender,
    Export-Tab)
  - src/app/api/export/fzul/route.ts (BSFZ-Excel aus public/templates/FZul_Vorlage.xlsx)

  **Genutzt in:** Berater-Portal, FZul-Vorhaben. Die Route wird zusaetzlich von der
  Alt-Seite src/app/import/page.tsx aufgerufen (Legacy-Cluster A-013).

  ### Funktionen die IMMER korrekt arbeiten muessen:

  | Nr | Funktion | Pruefung |
  |----|----------|----------|
  | FD-01 | Gefoerderte Stunden | v7_timesheets in aktiven Projekten der Firma mit oeffentlichem Foerderformat (V7_PUBLIC_FUNDING_FORMATS), is_active, is_billable = true, day_type nicht vacation/sick/special_leave/holiday, .limit(10000). Identische Filter in allen vier Lesepfaden (Uebersicht, Import, Kalender, Export) |
  | FD-02 | Abwesenheiten | U/K/S/E aus v7_employee_absences (is_active, .limit(10000)) ueber ladeAbwesenheiten. Mitarbeiterbezogen OHNE Projekt-Zuordnungsfenster. Wirksam nur an Arbeitstagen (Mo-Fr, kein Feiertag); an Wochenenden und Feiertagen geht der Tagestyp vor |
  | FD-03 | Import | Je Tag des Vorhabenzeitraums: an Wochenende, Feiertag und Abwesenheitstag fue = verfuegbar = 0; sonst verfuegbar = max(0, Tagesarbeitszeit - gefoerdert) und fue = verfuegbar. urlaub_/krank_/sonderurlaub_hours aus der Abwesenheitszeile, bei E 0. Upsert auf (vorhaben_id, employee_id, work_date) |
  | FD-04 | Jahreskalender | Die Zelle zeigt den gespeicherten fue-Wert; nur ohne gespeicherten Wert erscheint der verfuegbare Wert. Abwesenheitstag mit Kuerzel statt Eingabefeld (E bg-sky-100, U/K/S bg-violet-100). Altdaten (fue_hours > 0 an einem Abwesenheitstag): rote Zelle, Eingabe setzt 0, Hinweis mit Anzahl und Stunden. Der Kalender aendert gespeicherte fue_hours NIE selbst; Korrektur nur manuell oder per Neu-Import |
  | FD-05 | Uebersicht | WAZ zum 1.1. des Wirtschaftsjahres. Max. h = WAZ/40 x 173,33 x Monate - Abwesenheits-Arbeitstage (alle Codes) x WAZ/5, Zusatzzeile "abzgl. x h Abw. (n AT)". Verf. h = max(0, Max. h - gefoerdert - FuE). Zeitraum endet am tatsaechlichen Monatsletzten des Endmonats |
  | FD-06 | Export-Raster | Je Arbeitstag Tagesarbeitszeit - gefoerdert, nur Werte > 0. Leer an Wochenenden, Feiertagen (Feiertagsliste der Route, Bundesland) und Abwesenheitstagen (dayData[m][d].absence = true). Berechnung live aus v7_timesheets, nicht aus gespeicherten fue_hours |
  | FD-07 | Export unterer Teil | E38 = WAZ, O39 = annual_leave_days, O40 = K-, O41 = S-, O43 = E-Arbeitstage im Exportjahr (Mo-Fr ohne Feiertag). O42 (Feiertage) bleibt Formel der Vorlage. U wird nicht uebergeben. Export-Tab je MA: Arbeitstage U, K, S, E und Urlaubsanspruch; gelber Hinweis bei U-Arbeitstagen > Anspruch, keine Umbuchung |
  | FD-08 | Ladefehler | Ladefehler der Abwesenheiten (alle vier Lesepfade) und des Urlaubsanspruchs im Export-Tab werden angezeigt bzw. geworfen, nie still als 0 behandelt. Luecke siehe A-071 |

  ### Besonders fragile Bereiche:

  - **ladeAbwesenheiten ohne Zuordnungsfenster:** bewusst anders als
    `lib/employeeAbsences.ts`. Die FZul haengt an der Person, nicht an einem Projekt. Nicht
    "vereinheitlichen".
  - **Vier Lesepfade:** Uebersicht, Import, Kalender und Export fragen v7_timesheets je
    getrennt ab. Eine Filteraenderung (FD-01) ist immer in allen vier vorzunehmen.
  - **Vorlagenzellen:** Eingabezellen sind E38 und O39..O43. C38, F39 und J39 liegen in
    verbundenen Beschriftungsfeldern und werden von den Formeln nicht gelesen (Ursache
    A-069).
  - **E auf Feiertagen:** Abwesenheits-Arbeitstage tagesgenau zaehlen (Mo-Fr ohne
    Feiertag); sonst doppelter Abzug zusammen mit O42.
  - **Route:** eigene Feiertagsfunktion (nur Bundesland, keine holiday_region) und zweiter
    Aufrufer (Alt-Seite src/app/import/page.tsx). Nach jeder Aenderung an der Route eine
    Excel oeffnen und E38, O39..O43 sowie die Jahresarbeitszeit gegen eine Handrechnung
    pruefen.

  ### Bekannte Luecken (nicht Bestandteil des Smoke-Tests):

  | Nr | Luecke | Stand |
  |----|--------|-------|
  | A-070 | Export-Raster fuellt Januar bis Dezember unabhaengig von start_monat/ende_monat des Vorhabens; bei einem unterjaehrigen Vorhaben stuenden FuE-Stunden in Monaten ausserhalb der Laufzeit | Offen. PROD derzeit ohne Wirkung (alle Vorhaben 1-12, Abfrage 11.09.2026) |
  | A-071 | Ladefehler still als 0: die v7_timesheets-Abfragen der vier Lesepfade werten `error` nicht aus (gefoerdert 0 -> zu viele FZul-Stunden); die Excel-Erzeugung liest annual_leave_days ohne Fehlerpruefung (`?? 0` -> O39 = 0) | Offen |
  | - | Gespeicherte Kalenderwerte (fue_hours) gehen nicht in die BSFZ-Excel | Fachliche Entscheidung offen (PH Paragraph 5) |
  | - | Zeile 45 (Kuerzung unterjaehrig) fest 1; E38 = WAZ zum 1.1. auch bei Jahresnavigation; Kurzarbeit nicht in O43 | Offen (PH Paragraph 5) |
  | - | Regionale Feiertage (holiday_region): Seite ja, Route und Vorlage nein | Randfall |

**4f - Infrastruktur-Checkliste: drei neue Zeilen nach IF-08:**

  | IF-09 | Monatsverlauf in zwei Implementierungen (v1.3) | Bei jeder Aenderung am Monatsverlauf-Diagramm: ProjektFortschrittPanel UND FirmaCockpit anpassen; Kontrolle per Suche nach den dataKey-Namen ueber src/ |
  | IF-10 | is_billable bei "gefoerdert" (v1.3) | Bei jeder neuen oder geaenderten v7_timesheets-Query, die gefoerderte oder zuschussfaehige Stunden summiert: Filter `is_billable = true`. Grund: TF-12 legt an jedem Arbeitstag Zeilen "Nicht zuschussfaehige Arbeiten" (ohne AP, is_billable = false) an (A-068) |
  | IF-11 | Fehlerauswertung und Datumsgrenzen (v1.3) | Bei jeder neuen oder geaenderten Query: `error` auswerten - ein Ladefehler wird angezeigt oder geworfen, nie still als leer oder 0 behandelt. Monatsende immer als tatsaechlichen Monatsletzten berechnen, nie fest "-31" (Postgres lehnt ungueltige Daten ab; ohne Fehlerauswertung bleibt das unbemerkt). Bestandscode erfuellt das noch nicht ueberall (A-071) |

Damit sind die Vorschlaege aus den Hinweisen "Verhaltensvertrag" der Bloecke v5.42
(PF-xx, IF-xx), v5.43 (KP-01..04) und v5.44 (FD-01..08) umgesetzt.

================================================================================
AENDERUNG 5 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.45 | 11.09.2026 | Session 84, DOKUMENTATION (kein Code, kein SQL, Softwarestand bleibt V7.9.11): Verhaltensvertrag (PH 12e) auf v1.3 fortgeschrieben. Neue Komponenten-Vertraege Kapazitaetsplanung (KP-01..04) und FZul-Detailseite/BSFZ-Export (FD-01..08 mit fragilen Bereichen und bekannten Luecken); PF-09 gemeinsamer Bezugsrahmen der Foerderkennzahlen; IF-09 Monatsverlauf in zwei Implementierungen, IF-10 is_billable = true bei "gefoerdert", IF-11 Fehlerauswertung und Datumsgrenzen; fragile Bereiche TimesheetForm (Wirkung der Auto-Vorbelegung nach aussen) und FirmaCockpit (eigene Diagramm-Kopie). Jede neue Regel gegen den deployten Code geprueft; neu offen: A-070 (BSFZ-Export fuellt das Tagesraster ausserhalb der Vorhabenmonate, PROD derzeit ohne Wirkung) und A-071 (Ladefehler v7_projects/v7_timesheets und Urlaubsanspruch in der Excel-Erzeugung still als 0). Arbeitskopie VERHALTENSVERTRAG-v1_3-2.md (erster Stand v1_3 auf falscher Basis verworfen). |

================================================================================
