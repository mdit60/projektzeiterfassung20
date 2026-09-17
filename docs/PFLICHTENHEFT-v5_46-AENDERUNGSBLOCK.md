# PFLICHTENHEFT v5.46 - Aenderungsblock (Session 85, 17.09.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37 bis v5.45. Dieser Block enthaelt
AUSSCHLIESSLICH die Aenderungen fuer v5.46 mit exakten Einfuegepunkten.
SW-Release: **V7.9.12** (in PRODUKTION). Kein SQL (DEV und PROD), nur lesende Abfragen.
Inhalt: Monatsstatus in Stundennachweis-Matrix und Mein Status neu definiert (A-072),
Monatsabschluss speichert immer (A-073), Verhaltensvertrag v1.4.

Nummernpruefung vor Vergabe: v5.46 sowie A-072 und A-073 sind weder in downloads/ noch
in den Projektdokumenten vergeben (Stand 17.09.2026; hoechste bisherige Anforderung
A-071 aus v5.45). Gegenprobe gegen docs/ im Repo durch Martin.

================================================================================
AENDERUNG 1 - Kopfblock
================================================================================

ALT:
  **Version:** 5.45
  **SW-Release:** V7.9.11
  **Datum:** 11. September 2026

NEU:
  **Version:** 5.46
  **SW-Release:** V7.9.12
  **Datum:** 17. September 2026

--------------------------------------------------------------------------------
AENDERUNG 1b - Status-Zeile (neuer Stand VORNE; bisheriger Text wird zu
"Zuvor (Session 84):")
--------------------------------------------------------------------------------

  **Status:** Session 85 (17.09.2026): **V7.9.12 in PRODUKTION - Monatsstatus
  Stundennachweis.** Gemeldet bei AS System/HEATS: Schulz Juni 2026 ohne
  Projektstunden, nur "sonstige Arbeiten", nicht abgeschlossen, aber in der Matrix gruen.
  Ursachen: automatische Vollstaendig-Wertung zaehlte nicht foerderbare Stunden, den
  laufenden Monat (vorbelegte Tage bis Monatsende), Wochenend-/Feiertagseintraege und
  Feiertage doppelt; zentrale Abwesenheiten fehlten. Neu: dunkelgruen "Abgeschlossen"
  nur per Button, hellgruen "Erfasst (nicht abgeschlossen)", laufender Monat nie
  automatisch (A-072, Matrix und Mein Status). Zusaetzlich: "Monat abschliessen"
  speicherte nur bei hasChanges - die Auto-Vorbelegung "sonstige Arbeiten" ging bei
  unberuehrten Monaten verloren (A-073, Duehrkop/AURA). Verhaltensvertrag v1.4.
  Zuvor (Session 84):

================================================================================
AENDERUNG 2 - Paragraph 4 Komponententabelle (Versionen aktualisieren)
================================================================================

  | src/components/shared/StundennachweisMatrix.tsx | StundennachweisMatrix-v7_4_6-20.tsx | (bisher -16) |
  | src/components/shared/TimesheetForm.tsx         | TimesheetForm-v7_4_6-98.tsx         | (bisher -97) |
  | src/app/v7/firma/mein-status/page.tsx           | mein-status-page-v7_4_4-19.tsx      | (bisher -18) |

================================================================================
AENDERUNG 3 - Fachliche Anforderung Monatsstatus (Abschnitt Stundennachweis-Matrix /
Mein Status; ersetzt die bisherige Ampel-Beschreibung "gruen = vollstaendig")
================================================================================

  Monatsstatus je Mitarbeiter, Projekt und Monat (identisch in Matrix und Mein Status):

  | Status | Farbe | Bedingung |
  |---|---|---|
  | Abgeschlossen | dunkelgruen (green-700) | Eintrag in v7_timesheet_completions (Button "Monat abschliessen") - einzige Quelle |
  | Erfasst (nicht abgeschlossen) | hellgruen (green-300 Matrix / green-200 Mein Status) | Monat vergangen, alle Netto-Werktage mit Eintrag, foerderbare Stunden > 0 |
  | Teilweise / In Bearbeitung | orange | Eintraege vorhanden, sonst nicht erfuellt; immer im laufenden Monat; immer bei 0 foerderbaren Stunden. Tooltip "Keine foerderbaren Stunden erfasst" |
  | Fehlt / Nicht erfasst | rot | keine Eintraege |
  | Zukunft / ausserhalb | grau | wie bisher |

  Netto-Werktage: Mo-Fr ohne Feiertage. Gezaehlt werden nur solche Tage mit Eintrag > 0
  aus v7_timesheets (Projekt) oder zentraler Abwesenheit (v7_employee_absences,
  Zuordnungsfenster). Mein Status: Fortschritt "x / y Monate" und Kopfzeile zaehlen nur
  abgeschlossene Monate; zusaetzlich "y erfasst, nicht abgeschlossen".
  Entscheidung Martin 17.09.2026: Monatsabschluss nur manuell; Altmonate ohne Abschluss
  bleiben sichtbar (hellgruen) statt orange.

  TimesheetForm: "Monat abschliessen" speichert vor dem Setzen IMMER.

================================================================================
AENDERUNG 4 - Paragraph 5 Bekannte Fehler
================================================================================

  Behoben (V7.9.12): Matrix/Mein Status zeigten Monate mit nur "sonstigen Arbeiten" bzw.
  den laufenden Monat als vollstaendig (A-072). Monatsabschluss ohne manuelle Eingabe
  speicherte die Auto-Vorbelegung nicht (A-073).

  Neu, nicht behoben (Beobachtung):
  - Mein Status, ZA-Ampel "Stunden MA (akt. Monat)": zaehlt MA mit irgendeinem Eintrag
    im laufenden Monat, unabhaengig vom Abschluss-Status.
  - Mein Status: eigene Feiertagsfunktion ohne holiday_region.

================================================================================
AENDERUNG 5 - Paragraph 12.1 Anforderungsliste (zwei neue Zeilen)
================================================================================

  | A-072 | Monatsstatus Matrix/Mein Status: Abgeschlossen nur per Button, Erfasst hellgruen, laufender Monat nie automatisch, Netto-Werktage, zentrale Abwesenheiten | Martin (AS System/HEATS, Schulz 06/2026) | Session 85 | Erledigt (V7.9.12) | 17.09.2026 | Matrix v7.4.6-17..-20, mein-status v7.4.4-19. PROD verifiziert: Schulz Jun orange, Aug hellgruen, Sep alle orange; Mein Status Duehrkop AURA Sep orange |
  | A-073 | "Monat abschliessen" speichert immer vorher | Martin (Global Maritime/AURA, Duehrkop 07/2026) | Session 85 | Erledigt (V7.9.12) | 17.09.2026 | TimesheetForm v7.4.6-98. Altfaelle: Abschluss aufheben + neu abschliessen. PROD-Abfrage 17.09.2026: Oezalp AURA 12/2025 und 01/2026 betroffen (Reparatur durch Martin); Androlite/WISE Herrler 04/2025-03/2026 leer abgeschlossen am 20.04.2026 (vor Auto-Vorbelegung) - Klaerung mit Kunde offen; Haller/Popov 12/2024 ausserhalb Beschaeftigung, ohne Wirkung |

================================================================================
AENDERUNG 6 - Paragraph 12e Verhaltensvertrag (Fortschreibung auf v1.4)
================================================================================

  Arbeitskopie: VERHALTENSVERTRAG-v1_4.md (loest v1_3-2 ab).
  - Neuer Abschnitt 4a Monatsstatus (MS-01..05) mit fragilen Bereichen.
  - TF-08 ergaenzt: Speicherzwang vor Abschluss.
  - TimesheetForm, fragiler Bereich: Auto-Vorbelegung setzt hasChanges nicht.
  - BP-03 auf MS-01..05 umgestellt.

================================================================================
AENDERUNG 7 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.46 | 17.09.2026 | Session 85, V7.9.12: Monatsstatus Matrix und Mein Status neu (A-072: Abgeschlossen nur per Button, hellgruen Erfasst, laufender Monat nie automatisch, nur Netto-Werktage, zentrale Abwesenheiten, Feiertage nicht doppelt); Monatsabschluss speichert immer (A-073). Verhaltensvertrag v1.4 (MS-01..05, TF-08, BP-03). Kein SQL. PROD-Pruefung leer abgeschlossener Monate: Oezalp AURA repariert; Androlite/Herrler Klaerung offen. |

================================================================================
