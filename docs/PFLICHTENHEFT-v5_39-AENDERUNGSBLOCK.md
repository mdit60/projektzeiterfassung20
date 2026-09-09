# PFLICHTENHEFT v5.39 - Aenderungsblock (Session 80, 27.08.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37/v5.38. Dieser Block enthaelt
AUSSCHLIESSLICH die Aenderungen fuer v5.39 mit exakten Einfuegepunkten. SW-Release
V7.9.5 -> V7.9.6. Zwei Themenbloecke fuer NWM-Projekte (kein SQL):
(1) NWM-Jahresselektor Fortschritt/Prognose, (2) FZ-basierte Foerderquote mit
Grenzueberschreitungs-Validierung in ZAPanel und NWMEigenanteilPanel.

================================================================================
AENDERUNG 1 - Kopfblock (ersetzt die ersten Zeilen des Dokuments)
================================================================================

ALT:
  **Version:** 5.38
  **SW-Release:** V7.9.5
  **Datum:** 10. August 2026

NEU:
  **Version:** 5.39
  **SW-Release:** V7.9.6
  **Datum:** 27. August 2026

--------------------------------------------------------------------------------
AENDERUNG 1b - Status-Zeile (neuer Stand VORNE ergaenzt; der bisherige V7.9.5-Text
wird zu "Zuvor in V7.9.5:")
--------------------------------------------------------------------------------

Vor "Session 77 (10.08.2026): **TIMESHEET-AP-ANGEBOT ZEITLICH BEGRENZT..." wird eingefuegt:

  **Status:** Session 80 (27.08.2026): **NWM-JAHRESSELEKTOR FORTSCHRITT/PROGNOSE,
  FZ-BASIERTE FOERDERQUOTE MIT GRENZVALIDIERUNG - V7.9.6 (in PRODUKTION).**
  Zwei Themenbloecke fuer NWM-Projekte (ZIM_NETZWERK), kein SQL. (1) Neuer
  Dropdown-Selektor "Netzwerkjahr" im Projektfortschritt (Berater-Cockpit) und
  in der Analyse (Firma-Cockpit). Zeigt alle Foerderzeitraeume aus
  v7_nwm_foerderzeitraeume + "Gesamtverlauf". Fortschritt und Prognose werden auf
  den gewaehlten Zeitraum eingeschraenkt. Firma-Cockpit erkennt NWM automatisch
  und waehlt das aktuelle Netzwerkjahr vor. ProjektFortschrittPanel v7.4.5-33,
  cockpit-fortschritt-page v7.4.9-9, FirmaCockpit v7.4.9-36-14. (2) Die
  Foerderquote in ZAPanel und NWMEigenanteilPanel wird jetzt direkt aus der
  v7_nwm_foerderzeitraeume-Tabelle ermittelt (Abgleich zeitraum_bis gegen
  FZ-Bereiche) statt per Datumsarithmetik (calcLaufzeitjahr + foerdersatz_stufen).
  Neue FZ-Grenzueberschreitungs-Validierung: wenn zeitraum_von und zeitraum_bis
  in verschiedene Foerderzeitraeume mit unterschiedlichen Foerderquoten fallen,
  wird das Speichern/Berechnen blockiert mit roter Fehlermeldung - eine Aufteilung
  in zwei getrennte ZAs/EAs ist erforderlich. Alte Datumsarithmetik als Fallback
  fuer Projekte ohne FZ-Daten erhalten. ZAPanel v7.4.4-68/-69 (Endstand -69),
  NWMEigenanteilPanel v7.4.5-13. Deploy: Merge v7-dev -> main (--no-ff), push
  origin + cubintec, Vercel. Details GIT-SICHERUNG-v7_9_6-session80.md. Zuvor in V7.9.5:

(der bestehende Text "Session 77 (10.08.2026): **TIMESHEET-AP-ANGEBOT ZEITLICH BEGRENZT..."
folgt unveraendert direkt danach.)

================================================================================
AENDERUNG 2 - Paragraph 4.1 Shared Components (vier Zeilen aktualisieren/ergaenzen)
================================================================================

- Zeile ProjektFortschrittPanel.tsx: Versionsangabe -> **7.4.5-33** und am Ende der
  Beschreibung anfuegen:

  ; **v7.4.5-33 (Session 80): NWM-Jahresselektor. Neues Dropdown "Netzwerkjahr"
  fuer NWM-Projekte (funding_format ZIM_NETZWERK). Laedt Foerderzeitraeume aus
  v7_nwm_foerderzeitraeume. Optionen: je NWJ "NWJ X (Datum-Datum, FQ XX%)" +
  "Gesamtverlauf". Bei Auswahl eines NWJ werden Start-/Enddatum als Filter an
  Fortschritts- und Prognose-Berechnung weitergegeben.**

- Zeile FirmaCockpit.tsx: Versionsangabe -> **7.4.9-36-14** und anfuegen:

  ; **v7.4.9-36-14 (Session 80): NWM-Erkennung + Jahresselektor. Automatische
  Vorauswahl des aktuellen Netzwerkjahrs (heutiges Datum innerhalb FZ-Bereiche).
  Analyse-Abschnitt beruecksichtigt gewaehlten Zeitraum.**

- Zeile ZAPanel.tsx: Versionsangabe -> **7.4.4-69** und anfuegen:

  ; **v7.4.4-68/-69 (Session 80): FZ-basierte Foerderquote fuer NWM-Projekte.
  Laedt Foerderzeitraeume aus v7_nwm_foerderzeitraeume. getFoerderquoteFromFZ
  matcht zeitraum_bis gegen FZ-Bereiche, liefert foerderquote direkt statt per
  Datumsarithmetik. Anzeige als Badge "(aus FZ-Tabelle)" / "(Fallback)". -69:
  Neue FZ-Grenzueberschreitungs-Validierung (checkFZGrenzueberschreitung) -
  wenn von/bis in verschiedene FZ mit unterschiedlichen Foerderquoten fallen,
  Speichern blockiert + rote Fehlermeldung. Alte Logik als Fallback erhalten.**

- Zeile NWMEigenanteilPanel.tsx: Versionsangabe -> **7.4.5-13** und anfuegen:

  ; **v7.4.5-13 (Session 80): FZ-basierte Foerderquote + Grenzvalidierung.
  Identische FZ-Logik wie ZAPanel: FZ-Laden, fzMatchEA, fzGrenzfehlerEA.
  laufzeitjahr und foerdersatz FZ-basiert mit Fallback. Berechnung blockiert
  bei Grenzueberschreitung. Badges mit Quelleninfo, rote Warnung.**

================================================================================
AENDERUNG 3 - Paragraph 4.3 Berater-Seiten (Zeile aktualisieren)
================================================================================

- Zeile cockpit/fortschritt/page.tsx (unter berater/foerderung/firma/[id]/cockpit/):
  Versionsangabe -> **7.4.9-9** und anfuegen:

  ; **v7.4.9-9 (Session 80): NWM-Daten laden. Laedt Foerderzeitraeume und
  AP-Planung fuer NWM-Projekte und reicht sie an ProjektFortschrittPanel durch.**

================================================================================
AENDERUNG 4 - Paragraph 12.1 Anforderungsliste (zwei neue Zeilen ans Tabellenende)
================================================================================

  | A-055 | NWM-Projekte: Projektfortschritt und Prognose muessen je Netzwerkjahr filterbar sein (Dropdown-Selektor); Firma-Cockpit soll aktuelles NWJ automatisch vorwaehlen | Martin (NWM-Projekte mit mehreren Foerderzeitraeumen) | Session 80 | Erledigt | 27.08.2026 | ProjektFortschrittPanel v7.4.5-33: NWJ-Dropdown mit allen FZ + Gesamtverlauf; cockpit-fortschritt-page v7.4.9-9: NWM-Datenladen; FirmaCockpit v7.4.9-36-14: NWM-Erkennung + Auto-Vorauswahl. Details GIT-SICHERUNG-v7_9_6-session80.md. |
  | A-056 | NWM: Foerderquote in ZA und Eigenanteilen muss automatisch aus FZ-Tabelle kommen (nicht per Datumsarithmetik); FZ-Grenzueberschreitung (zeitraum_von/bis in verschiedenen FZ mit unterschiedlichen FQ) muss erkannt und blockiert werden | Martin (Falschberechnungen vermeiden) | Session 80 | Erledigt | 27.08.2026 | ZAPanel v7.4.4-69: getFoerderquoteFromFZ + checkFZGrenzueberschreitung, Speichersperre + rote Meldung; NWMEigenanteilPanel v7.4.5-13: identische FZ-Logik, Berechnungs-Blockade. Alte Datumsarithmetik als Fallback. Details GIT-SICHERUNG-v7_9_6-session80.md. |

================================================================================
AENDERUNG 5 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.39 | 27.08.2026 | Session 80 (V7.9.6, NWM-Aenderungen, kein SQL): (1) NWM-Jahresselektor fuer Fortschritt/Prognose - Dropdown "Netzwerkjahr" mit allen FZ aus v7_nwm_foerderzeitraeume + "Gesamtverlauf"; Fortschritt/Prognose auf gewaehlten Zeitraum eingeschraenkt; FirmaCockpit NWM-Erkennung + Auto-Vorauswahl aktuelles NWJ. ProjektFortschrittPanel v7.4.5-33, cockpit-fortschritt-page v7.4.9-9, FirmaCockpit v7.4.9-36-14. A-055. (2) FZ-basierte Foerderquote in ZAPanel + NWMEigenanteilPanel: Abgleich zeitraum_bis gegen v7_nwm_foerderzeitraeume statt Datumsarithmetik; neue FZ-Grenzueberschreitungs-Validierung - Speichern/Berechnen blockiert wenn von/bis in verschiedenen FZ mit unterschiedlichen FQ; rote Fehlermeldung; Fallback auf alte Logik ohne FZ-Daten. ZAPanel v7.4.4-68/-69 (Endstand -69), NWMEigenanteilPanel v7.4.5-13. A-056. Deploy: Merge v7-dev->main (--no-ff), push origin+cubintec, Vercel. Details GIT-SICHERUNG-v7_9_6-session80.md. |

================================================================================
Hinweis: Paragraph 5 (Bekannte Fehler) - kein Eintrag noetig. Die FZ-Grenzvalidierung
ist eine neue Schutzfunktion (kein Bugfix). Die FZ-basierte Foerderquote ersetzt eine
funktional korrekte, aber fehleranfaellige Berechnungsmethode - kein offener Restfehler.
================================================================================
