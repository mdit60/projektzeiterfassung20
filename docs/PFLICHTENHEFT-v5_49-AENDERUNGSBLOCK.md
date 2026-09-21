# PFLICHTENHEFT v5.49 - Aenderungsblock (Session 88, 21.09.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37 bis v5.48. Dieser Block enthaelt
AUSSCHLIESSLICH die Aenderungen fuer v5.49 mit exakten Einfuegepunkten.
SW-Release: **V7.9.15** (in PRODUKTION). **SQL-Schema: neue Tabelle v7_za_zahlungen**
(DEV und PROD).
Inhalt: Zahlungseingaenge je ZA als Liste statt Einzelfeld, Sammelueberweisung
(KONZEPT-ZA-KORREKTUR-ZAHLUNGEN, Teil B, Etappen 1-2). Eine Zahlung aendert nie den
angeforderten Betrag. Absicherungen im Archiv. Archiv als Uebersicht in der ZA-Auswahl.
Verhaltensvertrag v1.7.

Nummernpruefung vor Vergabe: v5.49 sowie A-084 bis A-091 sind in downloads/ nicht
vergeben (Stand 21.09.2026; hoechste bisherige Anforderung A-083 aus v5.48).

================================================================================
AENDERUNG 1 - Kopfblock
================================================================================

ALT:
  **Version:** 5.48
  **SW-Release:** V7.9.14
  **Datum:** 21. September 2026

NEU:
  **Version:** 5.49
  **SW-Release:** V7.9.15
  **Datum:** 21. September 2026

--------------------------------------------------------------------------------
AENDERUNG 1b - Status-Zeile (neuer Stand VORNE; bisheriger Text wird zu
"Zuvor (Session 87):")
--------------------------------------------------------------------------------

  **Status:** Session 88 (21.09.2026): **V7.9.15 in PRODUKTION - Zahlungseingaenge
  als Liste.** Anlass: Freund/ANOVIA, eine Ueberweisung des Projekttraegers (13.03.2026,
  12.128 EUR) deckte Korrektur-ZA 1 und ZA 2 ab; PZE zeigte Scheindifferenzen +/-6.700.
  Neue Tabelle v7_za_zahlungen (Zahlung haengt an der ZA-Nummer), Migration in DEV und
  PROD, Sammelueberweisung im Archiv. Freund in PROD aufgeteilt: ZA 1 8.275 (1.575 +
  6.700), ZA 2 5.428, Differenzen 0. Korrektur-Versionierung (Teil A) folgt als Etappe 3.
  Zuvor (Session 87):

================================================================================
AENDERUNG 2 - Paragraph 2.1 Kern-Tabellen (neue Zeile nach v7_zahlungsanforderungen)
================================================================================

  | v7_za_zahlungen | Zahlungseingaenge je ZA (project_id, za_nummer, datum, betrag, referenz, kommentar, is_active). Mehrere Zahlungen je ZA; Sammelueberweisung = mehrere Zeilen mit gleichem datum und gleicher referenz. RLS wie v7_zahlungsanforderungen (neu v5.49) |

  Ergaenzung zu v7_zahlungsanforderungen: Die Spalten zahlungseingang_datum,
  zahlungseingang_betrag, zahlungseingang_kommentar sind seit V7.9.15 veraltet (nicht
  mehr gelesen oder geschrieben). Entfernen in einer spaeteren Etappe.

================================================================================
AENDERUNG 3 - Paragraph 4.1 Komponententabelle (Versionen aktualisieren)
================================================================================

  | src/components/shared/ZAPanel.tsx                    | ZAPanel-v7_4_4-80.tsx                | (bisher -72)       |
  | src/components/shared/FirmaCockpit.tsx               | FirmaCockpit-v7_4_9-36-21.tsx        | (bisher 36-16/-18) |
  | src/components/shared/VerwendungsnachweisPanel.tsx   | VerwendungsnachweisPanel-v1_2-7.tsx  | (bisher v1_2-6)    |
  | src/components/shared/ZASeite.tsx                    | ZASeite-v1_0_11.tsx                  | (bisher v1_0_10)   |

================================================================================
AENDERUNG 4 - Paragraph 6 ZA-Modul, neuer Unterabschnitt 6.5 (nach 6.4)
================================================================================

  ### 6.5 Zahlungseingaenge (neu v5.49, V7.9.15)

  Quelle ist v7_za_zahlungen. Eine Zahlung gehoert zur ZA-NUMMER eines Projekts, nicht
  zu einer ZA-Zeile (vorbereitet fuer Korrekturen, Konzept 4.2).

  Rechenregeln:
  - Ausgezahlt je ZA = Summe der aktiven Zahlungen dieser Nummer.
  - Zahlungsdatum fuer Anzeige und Status = juengstes Datum.
  - Status (calcStatus unveraendert): volle Zahlung, wenn Summe >= angeforderter Betrag,
    sonst gekuerzte Zahlung.
  - VN "bisher erhaltene Zuwendungen" = Summe der Zahlungen je ZA.
  - Sammelueberweisung = mehrere Zeilen mit gleichem Datum und gleicher Referenz; der
    Ueberweisungsbetrag ist die Summe der Gruppe (nicht gespeichert).

  Bedienung im Archiv:
  - Standard wie bisher: Datum, Betrag, Anmerkung, "Sichern" legt genau eine Zahlung an
    bzw. aendert sie; Felder leeren + Sichern entfernt sie (weich, is_active = false).
  - "+ weitere Zahlung" (ab einer Zahlung) oeffnet die Zahlungsliste; ab zwei Zahlungen
    zeigt die Zeile Summe "(n)" und juengstes Datum. Liste: je Zahlung "Sichern" und
    "Zahlung entfernen" (grau), Zeile "Neue Zahlung:" mit "Hinzufuegen".
  - "Sammelueberweisung erfassen": Datum, Gesamtbetrag, Referenz (Vorschlag
    "Ueberw. TT.MM.JJ"), Aufteilung auf die EINGEREICHTEN ZA. Speichern nur bei exakter
    Aufteilung (Rest 0,00).
  - Zahlungen nur bei eingereichten ZA; bei Entwuerfen "erst nach Einreichung".
  - Betragseingabe versteht "12.128,00", "12128,00" und "12128.00" (parseBetrag).
  - Anmerkungen per Popup lesbar (wie Cockpit).

  Harte Regel: Eine Zahlung aendert NIE den angeforderten Betrag (foerderbetrag_gesamt).
  Er wird nur berechnet und gespeichert, wenn er noch leer ist (A-085).

  Loeschen einer ZA: eingereichte ZA nur nach Eingabe der ZA-Nummer; Zahlungen der
  Nummer werden mit deaktiviert, sofern keine weitere Zeile dieser Nummer besteht.
  Aendert man die ZA-Nummer einer gespeicherten ZA, ziehen die Zahlungen mit um.

  Navigation: Das Archiv ist die Uebersicht ueber ALLE ZA und steht oben rechts in der
  ZA-Auswahl "ZA 1 | ... | + Neue ZA | Archiv" (kein Tab mehr). Drucken nur fuer eine
  ZA. Im Cockpit fuehrt "+ Neue ZA | Archiv" in derselben Reihenfolge direkt dorthin
  (ZASeite liest ?tab=archiv).

  Cockpit, ZA-Tabelle: Spalte Betrag = Summe; bei mehreren Zahlungen oder Anteil einer
  Sammelueberweisung "(n)" und Popup mit Einzelzahlungen ("Teil von 12.128,00 EUR,
  Ueberw. 13.03.26").

================================================================================
AENDERUNG 5 - Paragraph 5 Bekannte Fehler
================================================================================

  Behoben (V7.9.15):
  - Zwei Zahlungen auf eine ZA oder eine Ueberweisung auf zwei ZA waren nicht
    abbildbar; falsche Differenzen im Cockpit (A-084).
  - Sichern eines Zahlungseingangs berechnete den angeforderten Betrag neu und
    ueberschrieb den eingereichten Wert (Regel aus v7.4.4-41) (A-085).
  - Betragseingabe "35.235" wurde als 35,235 gelesen (A-084, parseBetrag).

  Offen:
  - "ZA speichern" im Deckblatt berechnet den Betrag einer EINGEREICHTEN ZA neu und
    ueberschreibt ihn (A-090, Loesung in Etappe 3).
  - Dialog "Ungespeicherte Aenderungen": Knopf "ZA speichern und fortfahren" ohne
    Hintergrundfarbe (colors.primary existiert nicht) (A-091).
  - VN: "angefordert laut ZA" zaehlt auch Entwuerfe mit (A-089).

================================================================================
AENDERUNG 6 - Paragraph 12.1 Anforderungsliste (neue Zeilen)
================================================================================

  | A-084 | Zahlungseingaenge als Liste (v7_za_zahlungen), Sammelueberweisung, Cockpit/VN aus der Liste | Martin (Freund/ANOVIA) | Session 88 | Erledigt (V7.9.15) | 21.09.2026 | ZAPanel -79/-80, FirmaCockpit 36-21, VN-Panel 1.2-7. SQL DEV+PROD. PROD Freund: ZA 1 8.275 (2), ZA 2 5.428, Differenzen 0 |
  | A-085 | Zahlung aendert nie den angeforderten Betrag; foerderbetrag_gesamt nur fuellen, wenn leer | Befund DEV-Test | Session 88 | Erledigt (V7.9.15) | 21.09.2026 | ZAPanel -77. In PROD nie aufgetreten |
  | A-086 | Absicherungen Archiv: Zahlungen nur bei eingereichten ZA, "Zahlung entfernen" grau, Loeschen eingereichter ZA nur mit ZA-Nummer | Martin (Fehlbedienung DEV) | Session 88 | Erledigt (V7.9.15) | 21.09.2026 | ZAPanel -76 |
  | A-087 | Archiv als Uebersicht in der ZA-Auswahl oben rechts; Cockpit-Link "+ Neue ZA \| Archiv"; Anmerkungs-Popup | Martin | Session 88 | Erledigt (V7.9.15) | 21.09.2026 | ZAPanel -78..-80, ZASeite 1.0.11, FirmaCockpit 36-20/-21 |
  | A-088 | AS/HEATS PROD: Zahlungseingaenge 35,24 / 24,21 / 25,69 / 24,18 EUR pruefen und korrigieren | Befund Session 88 | Session 88 | Offen (Martin mit AS) | 21.09.2026 | Vermutlich Eingabe "35.235" im alten Code |
  | A-089 | VN "angefordert laut ZA" nur eingereichte ZA zaehlen | Befund Session 88 | Session 88 | Offen | 21.09.2026 | HEATS DEV: 4 ZA inkl. Entwurf ZA 4 |
  | A-090 | Eingereichte ZA nicht durch "ZA speichern" ueberschreiben | Befund Session 88 | Session 88 | Offen (Etappe 3) | 21.09.2026 | Deckblatt rechnet live; Korrektur-Versionierung loest das |
  | A-091 | Knopf "ZA speichern und fortfahren" ohne Farbe (colors.primary) | Befund Session 88 | Session 88 | Offen | 21.09.2026 | Seit mindestens -72 |

================================================================================
AENDERUNG 7 - Paragraph 12e Verhaltensvertrag (Fortschreibung auf v1.7)
================================================================================

  Arbeitskopie: VERHALTENSVERTRAG-v1_7.md (loest v1_6 ab).
  - ZA-03 (Seiten + Archiv oben rechts), ZA-04 (Zahlungsliste), ZA-05 (Betrag nur
    fuellen, wenn leer), ZA-07 (Loeschen mit ZA-Nummer) angepasst.
  - Neu ZA-15 Sammelueberweisung, ZA-16 Zahlungen nur bei eingereichten ZA.
  - FC-04 um Summe/Popup/Archiv-Link, VN-04 auf v7_za_zahlungen.
  - Neu IF-15: Zahlungseingaenge nur aus v7_za_zahlungen.

================================================================================
AENDERUNG 8 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.49 | 21.09.2026 | Session 88, V7.9.15: Zahlungseingaenge als Liste (neue Tabelle v7_za_zahlungen, SQL DEV+PROD), Sammelueberweisung, Cockpit und VN aus der Liste (A-084). Zahlung aendert nie den angeforderten Betrag (A-085). Absicherungen im Archiv (A-086). Archiv in der ZA-Auswahl, Cockpit-Link, Anmerkungs-Popup (A-087). Freund/ANOVIA in PROD aufgeteilt. Offen A-088..A-091. Verhaltensvertrag v1.7. Konzept ZA-Korrektur v1.2. |

================================================================================
