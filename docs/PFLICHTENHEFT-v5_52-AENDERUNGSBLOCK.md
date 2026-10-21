# PFLICHTENHEFT v5.52 - Aenderungsblock (Session 91, 03.10.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37 bis v5.51. Nur Aenderungen fuer
v5.52. SW-Release: **V7.9.18** (in PRODUKTION). Kein SQL-Schema.
Inhalt: PDF-Dateiname der Stundennachweise um den Vornamen ergaenzt, damit Mitarbeiter
mit gleichem Nachnamen unterscheidbar sind (A-099). Ein Folgepunkt offen (A-100).
Verhaltensvertrag v1.10.

Nummernpruefung: A-099 und A-100 in downloads/ nicht vergeben (hoechste bisher A-098).

================================================================================
AENDERUNG 1 - Kopfblock
================================================================================

ALT:  **Version:** 5.51 / **SW-Release:** V7.9.17 / **Datum:** 2. Oktober 2026
NEU:  **Version:** 5.52 / **SW-Release:** V7.9.18 / **Datum:** 3. Oktober 2026

Status-Zeile (neu VORNE; bisheriger Text wird zu "Zuvor (Session 90):"):
  **Status:** Session 91 (03.10.2026): **V7.9.18 in PRODUKTION - PDF-Dateiname der
  Stundennachweise mit Vorname.** Der vom Browser vorgeschlagene Dateiname lautet jetzt
  "<Nachname><Vorname>_<FKZ>_Stundennachweis_<YYMM>" (bisher nur der Nachname).
  Mitarbeiter mit gleichem Nachnamen sind damit unterscheidbar. Gilt fuer den
  Einzeldruck und den Sammeldruck mit einem Mitarbeiter; der Sammeldruck mehrerer
  Mitarbeiter bleibt ohne Namensteil. Reine Namensbildung, kein Layout, keine Rechen-
  oder Speicherlogik beruehrt.
  Zuvor (Session 90):

================================================================================
AENDERUNG 2 - Paragraph 4.1 Komponententabelle
================================================================================

  | src/components/shared/TimesheetForm.tsx | TimesheetForm-v7_4_6-101.tsx | (bisher -100) |
  | src/components/shared/StundennachweisMatrix.tsx | StundennachweisMatrix-v7_4_6-22.tsx | (bisher -21) |

  Beschreibung ergaenzen:
  - TimesheetForm: v7.4.6-101 PDF-Dateiname Einzeldruck
    "<Nachname><Vorname>_<FKZ>_Stundennachweis_<YYMM>" (Bsp.
    "DuhrkopThomas_16KN..._Stundennachweis_2609"). Vorname: erstes Wort, vollstaendig,
    ASCII-gewandelt, ohne Trenner hinter dem Nachnamen. Ohne Vorname nur der Nachname,
    ohne Nachname Fallback "<FKZ>_Stundennachweis_<YYMM>". Ergaenzt das Schema aus
    v7.4.6-97. Nur handlePrint.
  - StundennachweisMatrix: v7.4.6-22 PDF-Dateiname Sammeldruck mit einem Mitarbeiter
    "<Nachname><Vorname>_<FKZ>_Stundennachweis_<Zeitraum>", identisch zum Einzeldruck.
    Mehrere Mitarbeiter unveraendert "<FKZ>_Stundennachweis_<Zeitraum>". Ergaenzt das
    Schema aus v7.4.6-16.

================================================================================
AENDERUNG 3 - Dateinamen-Schema der Stundennachweis-PDFs (ersetzt die Fassung aus v5.42)
================================================================================

  | Fall | Dateiname (ohne Endung) |
  |---|---|
  | Einzeldruck | <Nachname><Vorname>_<FKZ>_Stundennachweis_<YYMM> |
  | Sammeldruck, ein Mitarbeiter | <Nachname><Vorname>_<FKZ>_Stundennachweis_<Zeitraum> |
  | Sammeldruck, mehrere Mitarbeiter | <FKZ>_Stundennachweis_<Zeitraum> |

  Regeln:
  - Nachname und Vorname: jeweils nur das erste Wort, Sonderzeichen entfernt, Umlaute
    auf den Grundbuchstaben (Duehrkop mit Umlaut -> "Duhrkop"), scharfes s -> "ss",
    Bindestriche entfallen ("Hans-Peter" -> "HansPeter").
  - Der Vorname steht vollstaendig und ohne Trenner direkt hinter dem Nachnamen.
  - Fehlt der Vorname, bleibt der Nachname allein. Fehlt der Nachname, entfaellt der
    Namensteil ganz.
  - FKZ: funding_reference, ersatzweise short_name, ersatzweise "Projekt"; Schraegstriche
    und Leerzeichen werden zu "_".
  - Zeitraum: YYMM bzw. YYMM-YYMM bei mehrmonatiger Auswahl.
  - Kein .pdf im document.title; der Browser haengt die Endung selbst an.

  Entscheidung: Martins Vorschlag waren die ersten drei Buchstaben des Vornamens. Er
  wurde zugunsten des vollen Vornamens verworfen, weil drei Buchstaben haeufige Paare
  nicht trennen (Martin/Markus -> beide "Mar", Christian/Christoph -> "Chr",
  Stefan/Stefanie -> "Ste").

  Beispiele (per Rechnung geprueft): "DuhrkopThomas_", "DuhrkopMatthias_",
  "MullerHansPeter_", "GrossKarl_" (Vorname "Karl Heinz"), "Meier_" (ohne Vorname).

================================================================================
AENDERUNG 4 - Paragraph 5 Bekannte Fehler
================================================================================

  Keine Fehlerbehebung in V7.9.18. Bekannte Einschraenkungen der Namensbildung:
  - Mehrteilige Nachnamen: vom Nachnamen wird nur das erste Wort verwendet. Aus
    "von Berg" wird "von" (A-100). Verhalten seit v7.4.6-97, in V7.9.18 nicht geaendert.
  - Identischer Vor- und Nachname zweier Mitarbeiter ergibt weiterhin denselben
    Dateinamen.

================================================================================
AENDERUNG 5 - Paragraph 12.1 Anforderungsliste (zwei neue Zeilen ans Tabellenende)
================================================================================

  | A-099 | PDF-Dateiname der Stundennachweise mit Vorname hinter dem Nachnamen (Unterscheidung bei gleichem Nachnamen); Einzeldruck und Sammeldruck mit einem MA | Martin | Session 91 | Erledigt (V7.9.18) | 03.10.2026 | TimesheetForm -101, StundennachweisMatrix -22 |
  | A-100 | PDF-Dateiname: mehrteilige Nachnamen ("von Berg" -> nur "von") | Befund Session 91 | Session 91 | Offen (niedrig) | 03.10.2026 | Beide Kopien des Schemas anpassen (IF-17) |

================================================================================
AENDERUNG 6 - Paragraph 12e Verhaltensvertrag (Fortschreibung auf v1.10)
================================================================================

  TF-11 um den PDF-Dateinamen mit Vorname ergaenzt; fragiler Bereich "Dateiname des
  Sammeldrucks" in Abschnitt 4a; neu IF-17 Dateinamen-Schema in zwei Dateien
  (TimesheetForm und StundennachweisMatrix immer gemeinsam aendern).

================================================================================
AENDERUNG 7 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.52 | 03.10.2026 | Session 91, V7.9.18: PDF-Dateiname der Stundennachweise mit Vorname hinter dem Nachnamen, "<Nachname><Vorname>_<FKZ>_Stundennachweis_<YYMM>" (A-099). TimesheetForm v7.4.6-101, StundennachweisMatrix v7.4.6-22. Offen A-100. Verhaltensvertrag v1.10. Kein SQL-Schema. |

================================================================================
