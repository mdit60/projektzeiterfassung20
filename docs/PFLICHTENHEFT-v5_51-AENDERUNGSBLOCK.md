# PFLICHTENHEFT v5.51 - Aenderungsblock (Session 90, 02.10.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37 bis v5.50. Nur Aenderungen fuer
v5.51. SW-Release: **V7.9.17** (in PRODUKTION). Kein SQL-Schema.
Inhalt: Direktspruenge zwischen Zahlungsanforderung, Stundenerfassung und
Stundennachweis-Matrix im Berater-Portal (A-095), ZA-Sprung der Matrix als Knopf in der
Bedienleiste (A-096). Zwei Folgepunkte offen (A-097, A-098). Verhaltensvertrag v1.9.

Nummernpruefung: A-095 bis A-098 in downloads/ nicht vergeben (hoechste bisher A-094).

================================================================================
AENDERUNG 1 - Kopfblock
================================================================================

ALT:  **Version:** 5.50 / **SW-Release:** V7.9.16 / **Datum:** 22. September 2026
NEU:  **Version:** 5.51 / **SW-Release:** V7.9.17 / **Datum:** 2. Oktober 2026

Status-Zeile (neu VORNE; bisheriger Text wird zu "Zuvor (Session 89):"):
  **Status:** Session 90 (02.10.2026): **V7.9.17 in PRODUKTION - Direktspruenge fuer
  die ZA-Bearbeitung (Berater).** Aus der Anlage 1a fuehrt ein Klick auf einen Monat in
  die Stundenerfassung dieses Mitarbeiters und Monats, "Zurueck" dort wieder auf
  dieselbe ZA und denselben Tab. Neuer Knopf "Stundennachweis-Matrix" in der ZA, neuer
  Knopf "Zahlungsanforderung" in der Bedienleiste der Matrix (ersetzt den Link "ZA" in
  der Kopfzeile). Reine Navigation, keine Rechen- oder Speicherlogik beruehrt.
  Zuvor (Session 89):

================================================================================
AENDERUNG 2 - Paragraph 4.1 Komponententabelle
================================================================================

  | src/components/shared/ZAPanel.tsx | ZAPanel-v7_4_4-87.tsx | (bisher -86) |
  | src/components/shared/ZASeite.tsx | ZASeite-v1_0_12.tsx | (bisher 1.0.11) |
  | src/components/shared/StundennachweisMatrix.tsx | StundennachweisMatrix-v7_4_6-21.tsx | (bisher -20) |

  Beschreibung ergaenzen:
  - ZAPanel: v7.4.4-87 optionale Props onNavigateToZE / onNavigateToMatrix; Monat und
    Stundenzellen der Anlage 1a klickbar, Knopf "Stundennachweis-Matrix" neben
    "Drucken". Ohne Props unveraendert (Firma-Portal, BerichtePage).
  - ZASeite: v1.0.12 URL-Parameter tab fuer alle vier Tabs; baut die Sprungziele
    (nur Berater-Portal); traegt im Ruecksprung-Link nur den Ursprung weiter.
  - StundennachweisMatrix: v7.4.6-21 ZA-Sprung als Knopf "Zahlungsanforderung" in der
    Bedienleiste; Link "ZA" in der Kopfzeile entfaellt.

================================================================================
AENDERUNG 3 - Paragraph 6 ZA-Modul, neuer Unterabschnitt 6.6 (nach 6.5)
================================================================================

  6.6 Direktspruenge zwischen ZA, Stundenerfassung und Matrix

  Zweck: Bei der Bearbeitung und Optimierung einer ZA wechselt der Berater ohne Umweg
  ueber das Cockpit zwischen ZA, Stundenerfassung und Stundennachweis-Matrix.

  1. ZA -> Stundenerfassung (nur Berater-Portal): In der Anlage 1a oeffnet ein Klick
     auf einen Monat oder dessen Stundenzelle die Stundenerfassung des Mitarbeiters
     fuer diesen Monat und dieses Projekt. "Zurueck" in der Stundenerfassung fuehrt
     auf dieselbe ZA und denselben Tab. Eine Hinweiszeile ueber der Tabelle erklaert
     die Funktion; sie wird nicht gedruckt.
  2. ZA -> Matrix (nur Berater-Portal): Knopf "Stundennachweis-Matrix" links neben
     "Drucken" oeffnet die Matrix des Projekts.
  3. Matrix -> ZA (Berater- und Firma-Portal): Knopf "Zahlungsanforderung" in der
     Bedienleiste neben "Sammeldruck" und "AP-Status". "Zurueck" in der ZA fuehrt
     wieder auf die Matrix. Die Kopfzeile der Matrix traegt nur noch Projektangaben.
  4. Stundenerfassung -> ZA: unveraendert ueber den Link in der Steuerleiste des
     Timesheets (seit V7.5.4).

  Sicherungen:
  - Ungespeicherte Aenderungen an der ZA: vorhandener Dialog (speichern / verwerfen /
    abbrechen) vor jedem Sprung.
  - Eine noch nie gespeicherte ZA sperrt den Sprung zur Stundenerfassung mit Hinweis
    ("bitte zuerst ZA speichern"), weil der Ruecksprung sonst auf der zuletzt
    gespeicherten ZA landet und der Entwurf verloren waere. Der Sprung zur Matrix
    bleibt moeglich.
  - Nach einer Stundenkorrektur zeigt die Anlage 1a beim Ruecksprung die neuen Stunden.
    Der gespeicherte Foerderbetrag aendert sich wie bisher erst mit "ZA speichern";
    bei eingereichten ZA greifen die Rueckfragen aus 6.5.

  Technik: Das ZAPanel meldet nur das Ziel (Projekt, ZA, Tab, ggf. Mitarbeiter/Jahr/
  Monat); die URLs baut die ZASeite. Der Ruecksprung-Link traegt projektId, zaId, tab
  und den urspruenglichen Ausgangspunkt (Matrix oder Cockpit), nicht die ganze Kette.

  Einschraenkungen:
  - Der Weg ZA -> Matrix -> "Zahlungsanforderung" landet auf der zuletzt gespeicherten
    ZA im Deckblatt, nicht auf der ZA und dem Tab, von dem man kam (A-097).
  - Firma-Portal: keine Spruenge aus der ZA (A-098).

================================================================================
AENDERUNG 4 - Paragraph 5 Bekannte Fehler
================================================================================

  Keine Fehlerbehebung in V7.9.17. Neue bekannte Einschraenkung: A-097 (siehe 6.6).

================================================================================
AENDERUNG 5 - Paragraph 12.1 Anforderungsliste (vier neue Zeilen ans Tabellenende)
================================================================================

  | A-095 | Direktspruenge aus der ZA: Monat der Anlage 1a -> Stundenerfassung und zurueck auf dieselbe ZA/Tab; Knopf "Stundennachweis-Matrix" (Berater) | Martin | Session 90 | Erledigt (V7.9.17) | 02.10.2026 | ZAPanel -87, ZASeite 1.0.12 |
  | A-096 | ZA-Sprung der Matrix als Knopf "Zahlungsanforderung" in der Bedienleiste statt Link "ZA" in der Kopfzeile | Martin | Session 90 | Erledigt (V7.9.17) | 02.10.2026 | StundennachweisMatrix -21 |
  | A-097 | Ruecksprung Matrix -> ZA auf dieselbe ZA und denselben Tab (nach Sprung ZA -> Matrix) | Befund Session 90 | Session 90 | Offen | 02.10.2026 | Matrix muesste zaId/tab durchreichen (Matrix + ZASeite) |
  | A-098 | Direktspruenge aus der ZA auch im Firma-Portal | Befund Session 90 | Session 90 | Offen (zurueckgestellt) | 02.10.2026 | Vorher pruefen, welche Rollen fremde Stundenerfassungen oeffnen duerfen |

================================================================================
AENDERUNG 6 - Paragraph 12e Verhaltensvertrag (Fortschreibung auf v1.9)
================================================================================

  ZA-03 tab-Parameter fuer alle vier Tabs; neu ZA-18 Direktspruenge aus der ZA; fragile
  Bereiche Ruecksprung-Kette und Klickflaechen im Druckbereich; neu MS-06 Bedienleiste
  der Matrix; neu IF-16 Build nie bei laufendem Dev-Server.

================================================================================
AENDERUNG 7 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.51 | 02.10.2026 | Session 90, V7.9.17: Direktspruenge ZA - Stundenerfassung - Matrix im Berater-Portal (A-095), Knopf "Zahlungsanforderung" in der Bedienleiste der Matrix (A-096). Neuer Unterabschnitt 6.6. Offen A-097, A-098. Verhaltensvertrag v1.9. Kein SQL-Schema. |

================================================================================
