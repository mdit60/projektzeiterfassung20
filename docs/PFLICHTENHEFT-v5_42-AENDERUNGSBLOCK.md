# PFLICHTENHEFT v5.42 - Aenderungsblock (Session 81, 09./10.09.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37 bis v5.41. Dieser Block enthaelt
AUSSCHLIESSLICH die Aenderungen fuer v5.42 mit exakten Einfuegepunkten.
SW-Release V7.9.7 -> V7.9.9 in zwei Schritten (V7.9.8 Dateinamen, V7.9.9
Fortschritt/Prognose). Drei Themen, KEIN SQL - reine Frontend-Aenderungen.
(1) Einheitliches Dateinamen-Schema fuer Stundennachweis-PDFs,
(2) "Verschenkt" korrigiert und neue Planungsluecke,
(3) Monatsverlauf-Diagramm entschlackt und Beschriftung praezisiert.

================================================================================
AENDERUNG 1 - Kopfblock (ersetzt die ersten Zeilen des Dokuments)
================================================================================

ALT:
  **Version:** 5.41
  **SW-Release:** V7.9.7
  **Datum:** 9. September 2026

NEU:
  **Version:** 5.42
  **SW-Release:** V7.9.9
  **Datum:** 10. September 2026

--------------------------------------------------------------------------------
AENDERUNG 1b - Status-Zeile (neuer Stand VORNE ergaenzt; der bisherige Text wird
zu "Zuvor in V7.9.7:")
--------------------------------------------------------------------------------

Vor dem bestehenden Status-Text aus v5.41 wird eingefuegt:

  **Status:** Session 81 (09./10.09.2026): **DATEINAMEN-SCHEMA, VERSCHENKT-KORREKTUR
  UND ENTSCHLACKTER MONATSVERLAUF - V7.9.8 und V7.9.9 (in PRODUKTION).** Drei reine
  Frontend-Themen, kein SQL. (1) Stundennachweis-PDFs heissen einheitlich
  "<Nachname>_<FKZ>_Stundennachweis_<YYMM>"; beim Sammeldruck mehrerer Mitarbeiter
  entfaellt der Namensteil, bei mehrmonatiger Auswahl wird der Zeitraum als
  YYMM-YYMM geschrieben. Einzel- und Sammeldruck verwenden erstmals dasselbe Schema.
  (2) "Verschenkt" in den Foerder-Konsequenzen wurde gegen die BEWILLIGTE SUMME
  gemessen, obwohl die Foerderprognose zuvor auf die Plankosten gedeckelt wird. Liegt
  der Arbeitsplan unter der Bewilligung, stand dadurch auch bei 100 Prozent
  Erreichungsgrad dauerhaft ein Verschenkt-Betrag - ein Widerspruch in sich, denn wer
  den Plan voll erfuellt, verschenkt definitionsgemaess nichts. Massstab ist jetzt das,
  was der Arbeitsplan bei voller Erfuellung hergibt; die Differenz zwischen Bewilligung
  und Arbeitsplan wird als eigener Block "Planungsluecke im Arbeitsplan" ausgewiesen,
  nur wenn sie besteht. (3) Im Monatsverlauf entfallen die gestrichelten Linien "Soll
  kumuliert" und "Zieltempo kumuliert"; es bleiben "Ist kumuliert" (durchgezogen) und
  "Prognose kumuliert" (gestrichelt). Die Fussnote benennt jetzt, dass die Ist-Saeulen
  nach BUCHUNGSMONAT zaehlen, waehrend der AP-Status je ARBEITSPAKET zaehlt - beide
  Sichten weichen im Einzelmonat regelmaessig voneinander ab, ohne dass ein Fehler
  vorliegt. Der Prognose-Algorithmus selbst ist unveraendert. TimesheetForm v7.4.6-97,
  StundennachweisMatrix v7.4.6-16, projektfortschritt-utils v7.4.9-16,
  ProjektFortschrittPanel v7.4.5-34, FirmaCockpit v7.4.9-36-15. A-062, A-063, A-064.
  Deploy: Merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel. Details
  GIT-SICHERUNG-v7_9_9-session81.md. Zuvor in V7.9.7:

(der bestehende Status-Text aus v5.41 folgt unveraendert direkt danach.)

================================================================================
AENDERUNG 2 - Paragraph 4.1 Shared Components (fuenf Zeilen aktualisieren)
================================================================================

- Zeile **TimesheetForm.tsx**: Versionsangabe 7.4.6-96 -> **7.4.6-97**, am Ende der
  Beschreibung anfuegen:

  ; **v7.4.6-97 (Session 81): PDF-Dateiname Einzeldruck auf
  "<Nachname>_<FKZ>_Stundennachweis_<YYMM>" umgestellt (Bsp.
  "Sarac_16DS251601_Stundennachweis_2510"). Ersetzt das Schema aus v7.4.6-59. Nur der
  Nachname, erster Token, ASCII-gewandelt; ohne Namen Fallback
  "<FKZ>_Stundennachweis_<YYMM>". Kein .pdf im document.title.**

- Zeile **StundennachweisMatrix.tsx**: Versionsangabe 7.4.6-15 -> **7.4.6-16**, am Ende
  der Beschreibung anfuegen:

  ; **v7.4.6-16 (Session 81): PDF-Dateiname Sammeldruck auf dasselbe Schema wie der
  Einzeldruck umgestellt. Ein Mitarbeiter ->
  "<Nachname>_<FKZ>_Stundennachweis_<Zeitraum>", mehrere Mitarbeiter ->
  "<FKZ>_Stundennachweis_<Zeitraum>" ohne Namensteil. Zeitraum YYMM bzw. YYMM-YYMM.
  Ersetzt das Schema aus v7.4.6-9.**

- Zeile **ProjektFortschrittPanel.tsx**: Versionsangabe 7.4.5-33 -> **7.4.5-34**, am
  Ende der Beschreibung anfuegen:

  ; **v7.4.5-34 (Session 81): "Verschenkt" bezieht sich auf das, was der Arbeitsplan
  hergibt (bei 100 Prozent Erreichungsgrad 0 EUR); neuer Block "Planungsluecke im
  Arbeitsplan" mit Foerder- und Kostenbetrag, nur wenn eine Luecke besteht. Im
  Monatsverlauf die Linien "Soll kumuliert" und "Zieltempo kumuliert" entfernt.
  Fussnote erklaert Ist nach Buchungsmonat gegen Soll ueber AP-Laufzeit.**

- Zeile **FirmaCockpit.tsx**: Versionsangabe 7.4.9-36-14 -> **7.4.9-36-15**, am Ende
  der Beschreibung anfuegen:

  ; **v7.4.9-36-15 (Session 81): Monatsverlauf an ProjektFortschrittPanel v7.4.5-34
  angeglichen - "Soll kumuliert" und "Zieltempo" entfernt, Beschriftung angepasst. Das
  Cockpit haelt eine EIGENE Kopie des Diagramms; sie wurde bei der Umstellung zunaechst
  uebersehen und zeigte weiterhin drei gestrichelte Linien.**

- Abschnitt **Bibliotheken/Utilities**, Zeile **projektfortschritt-utils.ts**:
  Versionsangabe 7.4.9-15 -> **7.4.9-16**, am Ende der Beschreibung anfuegen:

  ; **v7.4.9-16 (Session 81): Massstab fuer "verschenkt" ist nicht mehr die bewilligte
  Summe, sondern das bei voller Planerfuellung Abrufbare
  (foerderbarPlanErfuellt = min(Plankosten x Foerdersatz, bewilligte Summe)). Neue
  Felder planungsluecke, planungslueckeKosten, bewilligteSummeGesetzt. Prognose-,
  Szenarien- und Bedarfslogik unveraendert.**

================================================================================
AENDERUNG 3 - Paragraph 12.1 Anforderungsliste (drei neue Zeilen ans Tabellenende)
================================================================================

  | A-062 | Stundennachweis-PDFs sollen einheitlich benannt werden: Name_FKZ_Stundennachweis_YYMM | Martin (Session 81) | Session 81 | Erledigt | 09.09.2026 | TimesheetForm v7.4.6-97 (Einzeldruck) und StundennachweisMatrix v7.4.6-16 (Sammeldruck) setzen document.title auf "<Nachname>_<FKZ>_Stundennachweis_<YYMM>"; bei mehreren Mitarbeitern ohne Namensteil, bei mehrmonatiger Auswahl Zeitraum YYMM-YYMM. Nachname erster Token, ASCII-gewandelt. Ersetzt die getrennten Schemata aus v7.4.6-59 und v7.4.6-9. |
  | A-063 | Foerder-Konsequenzen: bei 100 Prozent Erreichungsgrad darf kein "Verschenkt" ausgewiesen werden | Martin (SmartMarina: Erreichungsgrad 100 Prozent, zugleich "Verschenkt 2.697 EUR") | Session 81 | Erledigt | 09.09.2026 | Ursache: verschenkt = bewilligte Summe minus Prognose, wobei die Prognose auf die Plankosten gedeckelt ist. Bei SmartMarina liegt der Arbeitsplan mit 121.062 EUR unter der Bewilligungsbasis von 124.914 EUR (87.440 / 0,7); die Differenz von 3.852 EUR Kosten bzw. 2.697 EUR Foerderung ist strukturell und durch Leistung nicht schliessbar. projektfortschritt-utils v7.4.9-16: verschenkt misst gegen foerderbarPlanErfuellt; die Bewilligungsdifferenz erscheint als planungsluecke. ProjektFortschrittPanel v7.4.5-34 zeigt sie als eigenen Block "Planungsluecke im Arbeitsplan" mit Handlungshinweis (nur eine Anpassung des Arbeitsplans schliesst die Luecke). |
  | A-064 | Monatsverlauf: drei gestrichelte Linien nicht unterscheidbar; Abweichung zwischen AP-Status und Monatsbalken nicht erklaert | Martin (SmartMarina: AP 1 im AP-Status voll, April-Balken bei rund der Haelfte) | Session 81 | Erledigt | 09./10.09.2026 | Linien "Soll kumuliert" und "Zieltempo kumuliert" entfernt (ProjektFortschrittPanel v7.4.5-34, FirmaCockpit v7.4.9-36-15 - eigene Diagramm-Kopie). Zur Abweichung: kein Rechenfehler. Die Ist-Saeulen zaehlen nach BUCHUNGSMONAT, der AP-Status je ARBEITSPAKET. Beleg SmartMarina AP 1: 260 h Plan im April, gebucht 259,67 h davon 134,67 h im April und 125,00 h im Mai; Summen beider Sichten identisch (1.303,01 h). Die Fussnote benennt das jetzt und verweist fuer den AP-Stand auf den AP-Status. |

================================================================================
AENDERUNG 4 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.42 | 10.09.2026 | Session 81 (V7.9.8 + V7.9.9, reine Frontend-Aenderungen, kein SQL): (1) Einheitliches Dateinamen-Schema fuer Stundennachweis-PDFs "<Nachname>_<FKZ>_Stundennachweis_<YYMM>"; Sammeldruck mehrerer Mitarbeiter ohne Namensteil, mehrmonatige Auswahl mit Zeitraum YYMM-YYMM. TimesheetForm v7.4.6-97, StundennachweisMatrix v7.4.6-16. A-062. (2) "Verschenkt" wurde gegen die bewilligte Summe gemessen, obwohl die Prognose auf die Plankosten gedeckelt ist; bei einem Arbeitsplan unter der Bewilligung blieb dadurch auch bei 100 Prozent Erreichungsgrad ein Verschenkt-Betrag stehen. Massstab ist jetzt das bei voller Planerfuellung Abrufbare; die Bewilligungsdifferenz erscheint als neuer Block "Planungsluecke im Arbeitsplan". projektfortschritt-utils v7.4.9-16, ProjektFortschrittPanel v7.4.5-34. A-063. (3) Monatsverlauf entschlackt: "Soll kumuliert" und "Zieltempo kumuliert" entfernt, Fussnote erklaert Ist nach Buchungsmonat gegen Soll ueber AP-Laufzeit; identische Aenderung in der eigenen Diagramm-Kopie des Firma-Cockpits (FirmaCockpit v7.4.9-36-15). A-064. Prognose-Algorithmus unveraendert. Deploy: Merge v7-dev->main (--no-ff), push origin+cubintec, Vercel. Details GIT-SICHERUNG-v7_9_9-session81.md. |

================================================================================
Hinweis Paragraph 5 (Bekannte Fehler): kein Eintrag noetig. A-063 ist behoben, A-064
war kein Fehler, sondern eine Darstellungs- und Beschriftungsfrage.

Hinweis Verhaltensvertrag (Paragraph 12e): zwei Regeln sind aus dieser Etappe
abzuleiten und beim naechsten Vertrags-Update (v1.3) aufzunehmen:
  - PF-xx: Kennzahlen, die gegeneinander gelesen werden (Erreichungsgrad in Prozent
    und Verschenkt in EUR), muessen denselben Bezugsrahmen haben. Ein Deckel in der
    einen Groesse und ein anderer Massstab in der anderen erzeugt Widersprueche, die
    fachlich nicht aufloesbar sind.
  - IF-xx: Der Monatsverlauf existiert in ZWEI Implementierungen
    (ProjektFortschrittPanel und FirmaCockpit). Jede Aenderung am Diagramm ist in
    beiden vorzunehmen; Kontrolle per Suche nach dataKey-Namen ueber src/.
================================================================================
