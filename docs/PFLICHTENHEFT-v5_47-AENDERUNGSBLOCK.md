# PFLICHTENHEFT v5.47 - Aenderungsblock (Session 86, 19.-21.09.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37 bis v5.46. Dieser Block enthaelt
AUSSCHLIESSLICH die Aenderungen fuer v5.47 mit exakten Einfuegepunkten.
SW-Release: **V7.9.13** (in PRODUKTION). Kein SQL-Schema (DEV und PROD). In PROD nur
lesende Abfragen; einzige Datenaenderung: Martin hat am 31.08.2026 vier ANOVIA-
Projektbuchungen ueber das Zeiterfassungsformular geleert.
Inhalt: Abrechnung taggenau statt monatsweise (A-074), Foerderbetrag centgenau (A-075),
Sperre fuer Projektstunden ausserhalb des Bewilligungszeitraums (A-076), Verwendungs-
nachweis mit geschlossenem Abschnitt B (A-077) und neuem Abschnitt C Personenstunden
(A-078), Abrechnungszeitraum und Vollstaendigkeitspruefung im Cockpit (A-079).
Verhaltensvertrag v1.5.

Nummernpruefung vor Vergabe: v5.47 sowie A-074 bis A-081 sind weder in downloads/ noch
in den Projektdokumenten vergeben (Stand 21.09.2026; hoechste bisherige Anforderung
A-073 aus v5.46). Gegenprobe gegen docs/ im Repo durch Martin.

================================================================================
AENDERUNG 1 - Kopfblock
================================================================================

ALT:
  **Version:** 5.46
  **SW-Release:** V7.9.12
  **Datum:** 17. September 2026

NEU:
  **Version:** 5.47
  **SW-Release:** V7.9.13
  **Datum:** 21. September 2026

--------------------------------------------------------------------------------
AENDERUNG 1b - Status-Zeile (neuer Stand VORNE; bisheriger Text wird zu
"Zuvor (Session 85):")
--------------------------------------------------------------------------------

  **Status:** Session 86 (19.-21.09.2026): **V7.9.13 in PRODUKTION - Verwendungs-
  nachweis und taggenaue Abrechnung.** Ausloeser: Beim VN von ANOVIA (16KN124596, ZIM DS)
  fehlte in Abschnitt B der Eigenanteil; bei der Pruefung ergab sich, dass Kosten x 30 %
  und Kosten - Zuwendung verschiedene Werte lieferten. Ursachen: (1) B summierte die je ZA
  eingefrorenen Foerderbetraege statt den Anspruch aus A abzuleiten; (2) Stunden wurden in
  ZA und VN ueber GANZE Kalendermonate gefiltert - aus 01.07.-30.08.2026 wurde "Juli und
  August komplett", der 31.08. (ausserhalb der Bewilligung) wurde abgerechnet: 17 h,
  390,42 EUR Zuwendung zu viel in ZA 4; (3) der Foerderbetrag wurde auf ganze Euro
  gerundet, obwohl die Formularspalten "[EUR, Cent]" verlangen; (4) die Eingabe war nur
  monatsweise begrenzt, der 31.08. blieb fuer Projektstunden bebuchbar. Alles behoben,
  in PROD verifiziert. Nebenbefund: die Luecke Mai/Juni 2026 zwischen ZA 3 und ZA 4
  (A-081, Klaerung durch Martin).
  Zuvor (Session 85):

================================================================================
AENDERUNG 2 - Paragraph 4 Komponententabelle (Versionen aktualisieren)
================================================================================

  | src/lib/verwendungsnachweis-utils.ts                 | verwendungsnachweis-utils-v1_2-5.ts  | (bisher v1_2-1) |
  | src/components/shared/VerwendungsnachweisPanel.tsx   | VerwendungsnachweisPanel-v1_2-5.tsx  | (bisher v1_2-2) |
  | src/components/shared/ZAPanel.tsx                    | ZAPanel-v7_4_4-71.tsx                | (bisher -69)    |
  | src/components/shared/TimesheetForm.tsx              | TimesheetForm-v7_4_6-100.tsx         | (bisher -98)    |
  | src/components/shared/FirmaCockpit.tsx               | FirmaCockpit-v7_4_9-36-16.tsx        | (bisher -36-15) |

  Hinweis: TimesheetForm-v7_4_6-99.tsx wurde erstellt und VERWORFEN (Sperre zu weit
  gefasst), nie integriert. Die Nummer bleibt vergeben.

================================================================================
AENDERUNG 3 - Fachliche Anforderungen (neu)
================================================================================

--- 3a) Abrechnungsgrenzen (Abschnitt Zahlungsanforderung und Verwendungsnachweis) ---

  Zeitbuchungen gehoeren genau dann in eine Abrechnung, wenn ihr Datum im Schnitt aus
  Abrechnungszeitraum (ZA) und Bewilligungszeitraum (v7_projects.start_date / end_date)
  liegt - TAGGENAU. Implementiert als abrechnungsFenster() / istImFenster() in
  src/lib/verwendungsnachweis-utils.ts; ZAPanel importiert dieselben Helfer (eine Quelle).
  Vergleich als ISO-String, keine Monatslogik, kein new Date(iso) mit Ortszeit-Auswertung.

  Geldbetraege (Foerderbetrag je ZA, NWM-Foerderbetrag, Anspruch im VN) werden
  kaufmaennisch auf zwei Dezimalen gerundet (round2 aus der Lib). Entscheidung Martin
  20.09.2026: kaufmaennisch, nicht abrunden.

--- 3b) Zeiterfassung: Sperre fuer Projektstunden (Abschnitt TimesheetForm) ---

  Tage vor Beginn bzw. nach Ende des erlaubten Zeitraums (fruehestes Ende aus
  employment_end, assignment_end, project.end_date; spaetester Beginn entsprechend) sind in
  den AP-Zeilen grau und nicht bebuchbar, Tooltip "Nach Ende des Bewilligungs-/
  Zuordnungszeitraums -- keine Projektstunden erfassbar".
  Entscheidungen Martin 20.09.2026:
  - Der Monat wird NICHT gekappt. Der August behaelt 31 Spalten; eine graue, gesperrte
    Spalte ist eindeutig, ein Monat mit 30 Spalten liest sich wie fehlende Daten.
  - Gesperrt wird nur die Erfassung FOERDERBARER Projektstunden. Die Zeile "sonstige,
    nicht zuschussfaehige Arbeiten", Fehlzeiten U/K/S, Rechtsklick und Auto-Vorbelegung
    bleiben offen. Begruendung: der Stundennachweis ist ein Monatsnachweis der gesamten
    Arbeitszeit; nicht foerderbare Stunden ausserhalb der Bewilligung sind korrekt und
    fliessen in keine Abrechnung ein.
  - Die Kopfzeile bleibt neutral (grau wuerde einen ganz gesperrten Tag suggerieren).

--- 3c) Verwendungsnachweis Abschnitt B (ersetzt die bisherige Berechnung) ---

  DS / EP (nicht NWM):
    Zuwendung gesamt  = Foerdersatz x Summe A
    bisher erhalten   = Summe der Zahlungseingaenge (zahlungseingang_betrag)
    Schlusszahlung    = Zuwendung gesamt - bisher erhalten (negativ = Rueckforderung)
    Eigenanteil       = Summe A - Zuwendung gesamt
    Summe Finanzierung = Zuwendung gesamt + Eigenanteil (muss Summe A sein; sonst rot)
  Die Summe der eingereichten ZA-Betraege ist eine ANFORDERUNG, nicht der Anspruch. Weicht
  sie vom Anspruch um mehr als (Anzahl ZA + 1) x 0,005 EUR ab (strukturelle Rundung, weil
  jede ZA einzeln rundet), erscheinen Warnung und Fussnote. Entscheidung Martin
  21.09.2026: Hinweis bleibt vorerst bestehen.
  NWM: unveraendert - Summe der ZA-Betraege (fallende Jahressaetze), Eigenanteil des
  Netzwerkpartners.

--- 3d) Verwendungsnachweis Abschnitt C (neu) ---

  "C. Nachweis der Personenstunden im Berichtszeitraum (kumuliert)": je Projekt-
  mitarbeiter Std. technisch, Std. nichttechnisch, Summe; Summenzeile. Aggregiert ueber
  dieselben ZA und mit derselben Filterung wie Abschnitt A, sortiert nach employee_number.
  Entscheidung Martin 19./20.09.2026: auf der VN-Seite, nicht im Cockpit (nur dort ist der
  Berichtszeitraum definiert, nur dort landet die Tabelle im Ausdruck).

--- 3e) Firmen-Cockpit: Zahlungsanforderungen ---

  Neue Spalte "Zeitraum" (TT.MM.JJ-TT.MM.JJ) zwischen ZA-Nr. und Eingereicht. Darunter
  Pruefung der Abrechnungszeitraeume: Luecken zwischen aufeinanderfolgenden ZA,
  Ueberlappungen, Nummernspruenge, fehlende Zeitraeume, nicht abgedeckter Projektbeginn/
  -ende. Nur sichtbar bei Befunden. Spaltenaufteilung 2/5/5 statt 2/6/4.

================================================================================
AENDERUNG 4 - Paragraph 5 Bekannte Fehler
================================================================================

  Behoben (V7.9.13):
  - Abrechnung monatsweise statt taggenau; Stunden nach Bewilligungsende wurden
    abgerechnet (A-074).
  - Foerderbetrag auf ganze Euro gerundet (A-075).
  - Projektstunden nach Bewilligungsende erfassbar (A-076).
  - VN Abschnitt B ohne Eigenanteil, Zuwendung aus eingefrorenen ZA-Betraegen (A-077).
  - VN Fussnote Abschnitt C zeigte \u-Escapes woertlich (Konventionsverstoss, behoben
    in VerwendungsnachweisPanel v1.2-4).

  Neu, nicht behoben (Beobachtung):
  - 55 latente Typfehler in 29 Dateien (A-080). Unsichtbar, weil der Next-Build keine
    Typen prueft. Teilweise in Ablageordnern (backup-v7_3_86), ueberwiegend in src/.
  - updated_at in v7_timesheets ist als Aenderungsnachweis kaum brauchbar: Speichern im
    Zeiterfassungsformular schreibt JEDE Buchung des Monats neu (keine Audit-Tabelle,
    kein Trigger). Rekonstruktion von Aenderungen nur eingeschraenkt moeglich.
  - Eine eingereichte ZA bemerkt nachtraegliche Aenderungen an den zugrundeliegenden
    Stunden nicht (Fall ANOVIA ZA 4: 1 h am 19.09. deaktiviert, 26,12 EUR Differenz).
    Moegliche Folgeanforderung: Sperre oder Abweichungswarnung nach Einreichung.

================================================================================
AENDERUNG 5 - Paragraph 12.1 Anforderungsliste (acht neue Zeilen)
================================================================================

  | A-074 | Abrechnung taggenau: Schnitt aus ZA-Zeitraum und Bewilligungszeitraum, zentrale Helfer in der VN-Lib, ZAPanel importiert | Martin (ANOVIA 16KN124596, VN-Pruefung) | Session 86 | Erledigt (V7.9.13) | 20.09.2026 | verwendungsnachweis-utils v1.2-2, ZAPanel v7.4.4-70. PROD verifiziert: ZA 4 573,00 h T / 22,00 h NT, Kosten 20.252,09 EUR (vorher 20.809,83) |
  | A-075 | Foerderbetrag centgenau, kaufmaennisch auf 2 Dezimalen | Martin | Session 86 | Erledigt (V7.9.13) | 20.09.2026 | ZAPanel v7.4.4-71, Lib v1.2-3 (round2 exportiert). PROD: ZA 4 14.176,46 EUR |
  | A-076 | Sperre fuer Projektstunden ausserhalb des Bewilligungszeitraums, taggenau; nur AP-Zeilen | Martin | Session 86 | Erledigt (V7.9.13) | 20.09.2026 | TimesheetForm v7.4.6-100 (-99 verworfen). PROD verifiziert ANOVIA August 2026 |
  | A-077 | VN Abschnitt B: Zuwendung aus A, Eigenanteil, Kontrollsumme, Abweichungswarnung mit Rundungstoleranz | Martin (ANOVIA) | Session 86 | Erledigt (V7.9.13) | 21.09.2026 | Lib v1.2-4/-5, Panel v1.2-3/-5. PROD: Summe A 61.814,77, Zuwendung 43.270,34, Eigenanteil 18.544,43, Summe 61.814,77 |
  | A-078 | VN Abschnitt C: kumulierte Personenstunden je MA (T/NT) | Martin (DS-Schlussabrechnung) | Session 86 | Erledigt (V7.9.13) | 21.09.2026 | Lib v1.2-4, Panel v1.2-3/-4. PROD: 1.353,00 / 473,33 / 1.826,33 h |
  | A-079 | Cockpit: Abrechnungszeitraum je ZA und Vollstaendigkeitspruefung | Martin | Session 86 | Erledigt (V7.9.13) | 21.09.2026 | FirmaCockpit v7.4.9-36-16. ANOVIA meldet Luecke 01.05.26-30.06.26 |
  | A-080 | Latente Typfehler (55 in 29 Dateien) bereinigen | Claude (tsc-Lauf 20.09.2026) | Session 86 | Offen | - | Eigene Session. Ablageordner downloads/ und backup-v7_3_86/ werden von tsconfig "include" mit erfasst |
  | A-081 | ANOVIA: Luecke Mai/Juni 2026 zwischen ZA 3 (bis 30.04.) und ZA 4 (ab 01.07.) | Claude/Martin (ZA-Abfrage 20.09.2026) | Session 86 | Offen (Martin) | - | Vermutung Martin: ZA nicht korrekt angelegt. Abgleich mit den Zahlungseingaengen |

================================================================================
AENDERUNG 6 - Paragraph 12e Verhaltensvertrag (Fortschreibung auf v1.5)
================================================================================

  Arbeitskopie: VERHALTENSVERTRAG-v1_5.md (loest v1_4 ab).
  - TF-16 Sperre Projektstunden (nur AP-Zeilen) + drei fragile Bereiche.
  - FC-04 um Abrechnungszeitraum und Vollstaendigkeitspruefung erweitert.
  - ZA-13 taggenaue Abrechnung, ZA-14 centgenauer Foerderbetrag, zwei fragile Bereiche.
  - Neuer Abschnitt 6a Verwendungsnachweis (VN-01..07).
  - IF-12 taggenaue Grenzen, IF-13 centgenaue Rundung, IF-14 lokaler Test nur per Build.

================================================================================
AENDERUNG 7 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.47 | 21.09.2026 | Session 86, V7.9.13: Abrechnung taggenau und auf den Bewilligungszeitraum gekappt (A-074); Foerderbetrag centgenau (A-075); Sperre fuer Projektstunden ausserhalb des Bewilligungszeitraums, nur AP-Zeilen (A-076); VN Abschnitt B mit Zuwendung aus A, Eigenanteil und Kontrollsumme (A-077), neuer Abschnitt C Personenstunden (A-078); Cockpit mit ZA-Zeitraum und Vollstaendigkeitspruefung (A-079). Offen: A-080 Typfehler, A-081 ANOVIA-Luecke Mai/Juni. Verhaltensvertrag v1.5. Deploy- und Umgebungsdokument aktualisiert. Kein SQL-Schema. |

================================================================================
