# PFLICHTENHEFT v5.50 - Aenderungsblock (Session 89, 22.09.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37 bis v5.49. Nur Aenderungen fuer
v5.50. SW-Release: **V7.9.16** (in PRODUKTION). Kein SQL-Schema.
Inhalt: kritischer Fix ZAPanel (markierte ZA wurde beim ersten Speichern ueberschrieben,
A-092), Betragseingabe nur mit Komma als Dezimaltrenner (A-093, Korrektur zu v5.49),
Sicherungen fuer eingereichte ZA (A-094). Verhaltensvertrag v1.8.

Nummernpruefung: A-092 bis A-094 in downloads/ nicht vergeben (hoechste bisher A-091).

================================================================================
AENDERUNG 1 - Kopfblock
================================================================================

ALT:  **Version:** 5.49 / **SW-Release:** V7.9.15 / **Datum:** 21. September 2026
NEU:  **Version:** 5.50 / **SW-Release:** V7.9.16 / **Datum:** 22. September 2026

Status-Zeile (neu VORNE; bisheriger Text wird zu "Zuvor (Session 88):"):
  **Status:** Session 89 (22.09.2026): **V7.9.16 in PRODUKTION - kritischer Fix
  ZAPanel.** Seit V7.9.15 konnte "ZA speichern" beim ersten Aufruf der ZA-Seite die
  markierte ZA mit der Vorbelegung einer neuen ZA ueberschreiben (PROD: GMM/AURA ZA 1,
  per SQL aus dem eingereichten Formular wiederhergestellt). Betragseingabe: Punkte
  werden ignoriert. Rueckfragen vor dem Ueberschreiben eingereichter ZA.
  Zuvor (Session 88):

================================================================================
AENDERUNG 2 - Paragraph 4.1 Komponententabelle
================================================================================

  | src/components/shared/ZAPanel.tsx | ZAPanel-v7_4_4-86.tsx | (bisher -80) |

================================================================================
AENDERUNG 3 - Paragraph 6.5 Zahlungseingaenge (Korrektur zu v5.49)
================================================================================

  ERSETZT den Satz "Betragseingabe versteht '12.128,00', '12128,00' und '12128.00'":

  Betragseingabe: Punkte werden immer ignoriert, einziger Dezimaltrenner ist das Komma
  (Vorgabe Martin 22.09.2026). "35.235" = 35.235,00; "12.128,50" = 12.128,50;
  "12.50" = 1.250,00. Gespeicherte Betraege erscheinen im Eingabefeld immer als
  Waehrung ("55.329,00").

  NEU angefuegt:

  Sicherungen fuer EINGEREICHTE ZA beim "ZA speichern" (bis Etappe 3):
  1. Aendern sich ZA-Nummer oder Abrechnungszeitraum: Rueckfrage mit Alt/Neu.
  2. Weicht der neu berechnete Foerderbetrag vom gespeicherten ab: Rueckfrage mit
     beiden Betraegen.
  Abbrechen speichert nichts und zeigt wieder den gespeicherten Stand.

================================================================================
AENDERUNG 4 - Paragraph 5 Bekannte Fehler
================================================================================

  Behoben (V7.9.16):
  - Markierte ZA wurde beim ersten Speichern mit der Neu-Vorbelegung ueberschrieben
    (seit V7.9.15; Ladereihenfolge und parallele Ladelaeufe) (A-092).
  - Betragseingabe "35.235" wurde als 35,24 gelesen (A-093).
  Teilweise (Bruecke): Ueberschreiben eingereichter Betraege durch "ZA speichern"
  jetzt mit Rueckfrage (A-090 bleibt fuer Etappe 3 offen).

================================================================================
AENDERUNG 5 - Paragraph 12.1 Anforderungsliste
================================================================================

  | A-090 | ... | Teilweise (V7.9.16: Rueckfrage) | 22.09.2026 | Endgueltig mit Etappe 3 |
  | A-092 | FIX: ZAPanel ueberschreibt markierte ZA beim ersten Speichern | Martin (PROD GMM/AURA) | Session 89 | Erledigt (V7.9.16) | 22.09.2026 | ZAPanel -82/-83; AURA ZA 1 per SQL wiederhergestellt (55.329 EUR, 01.12.25-31.07.26) |
  | A-093 | Betragseingabe: Punkte ignorieren, nur Komma als Dezimaltrenner; Anzeige als Waehrung | Martin | Session 89 | Erledigt (V7.9.16) | 22.09.2026 | ZAPanel -81/-85. Korrektur zu A-084 |
  | A-094 | Rueckfragen vor Aenderung eingereichter ZA (Nummer/Zeitraum, Betrag) | Befund Session 89 | Session 89 | Erledigt (V7.9.16) | 22.09.2026 | ZAPanel -82/-84/-86 |

================================================================================
AENDERUNG 6 - Paragraph 12e Verhaltensvertrag (Fortschreibung auf v1.8)
================================================================================

  ZA-04 Betragseingabe korrigiert; neu ZA-17 Sicherungen eingereichter ZA; fragiler
  Bereich openPanel (Laufnummer, kein await zwischen setZAList und Vorbelegung).

================================================================================
AENDERUNG 7 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.50 | 22.09.2026 | Session 89, V7.9.16: kritischer Fix ZAPanel - markierte ZA wurde beim ersten Speichern ueberschrieben (A-092), AURA ZA 1 wiederhergestellt. Betragseingabe nur Komma (A-093, Korrektur zu v5.49). Rueckfragen vor Aenderung eingereichter ZA (A-094, A-090 teilweise). Verhaltensvertrag v1.8. Kein SQL-Schema. |

================================================================================
