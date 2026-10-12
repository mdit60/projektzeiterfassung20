# PFLICHTENHEFT v5.53 - Aenderungsblock (Session 92, 12.10.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37 bis v5.52. Nur Aenderungen fuer
v5.53. SW-Release: **V7.9.19** (in PRODUKTION). Kein SQL-Schema.
Inhalt: (1) Verwendungsnachweis zeigt im Kopf die bewilligte Zuwendung und deren
Ausschoepfung (A-101). (2) Querspruenge zwischen ZA, Verwendungsnachweis,
Stundennachweis-Matrix und Stundenerfassung mit Ruecksprung (A-102; erledigt damit auch
A-097). (3) Nach "ZA speichern" bleibt die gespeicherte ZA geoeffnet (A-103).
Verhaltensvertrag v1.11.

Nummernpruefung: A-101 bis A-103 in downloads/ nicht vergeben (hoechste bisher A-100).

================================================================================
AENDERUNG 1 - Kopfblock
================================================================================

ALT:  **Version:** 5.52 / **SW-Release:** V7.9.18 / **Datum:** 3. Oktober 2026
NEU:  **Version:** 5.53 / **SW-Release:** V7.9.19 / **Datum:** 12. Oktober 2026

Status-Zeile (neu VORNE; bisheriger Text wird zu "Zuvor (Session 91):"):
  **Status:** Session 92 (12.10.2026): **V7.9.19 in PRODUKTION - Verwendungsnachweis
  mit bewilligter Zuwendung, Querspruenge ZA/VN/Stundenerfassung, ZA bleibt nach dem
  Speichern offen.** Der Kopf des Verwendungsnachweises zeigt die bewilligte Zuwendung
  und eine Zeile "Ausschoepfung der bewilligten Zuwendung" (Anspruch lt. VN, angefordert
  lt. ZA, verbleibend, Balken). Im Berater-Portal sind ZA, Verwendungsnachweis,
  Stundennachweis-Matrix und Stundenerfassung direkt untereinander erreichbar;
  "Zurueck" fuehrt jeweils auf die Ausgangsseite. "ZA speichern" laedt danach die
  gespeicherte ZA statt eines leeren Neu-Entwurfs. Drei Deploys an einem Tag, kein SQL.
  Zuvor (Session 91):

================================================================================
AENDERUNG 2 - Paragraph 4.1 Komponententabelle
================================================================================

  | src/components/shared/VerwendungsnachweisPanel.tsx | VerwendungsnachweisPanel-v1_2-9.tsx | (bisher -7) |
  | src/components/shared/VerwendungsnachweisSeite.tsx | VerwendungsnachweisSeite-v1_2-3.tsx | (bisher -2) |
  | src/components/shared/ZAPanel.tsx | ZAPanel-v7_4_4-89.tsx | (bisher -87) |
  | src/components/shared/ZASeite.tsx | ZASeite-v1_0_13.tsx | (bisher 1.0.12) |
  | src/components/shared/TimesheetForm.tsx | TimesheetForm-v7_4_6-102.tsx | (bisher -101) |
  | src/components/shared/StundennachweisMatrix.tsx | StundennachweisMatrix-v7_4_6-23.tsx | (bisher -22) |
  | src/app/v7/berater/foerderung/firma/[id]/cockpit/stundennachweis/page.tsx | cockpit-stundennachweis-page-v7_4_9-8.tsx | (bisher -7) |

  Unveraendert: src/lib/verwendungsnachweis-utils.ts (v1.2-7).

  Beschreibung ergaenzen:
  - VerwendungsnachweisPanel: v1.2-8 Kopfdaten um "Bewilligte Zuwendung"
    (projects.bewilligte_summe, rechte Spalte unter Bescheiddatum und Foerdersatz) und
    die Zeile "Ausschoepfung der bewilligten Zuwendung". v1.2-9 optionale Props
    onNavigateToZA / onNavigateToMatrix, Knoepfe links neben "Drucken" (vn-no-print).
  - VerwendungsnachweisSeite: v1.2-3 baut die Sprungziele (nur Berater-Portal) und
    traegt im Ruecksprung nur den Ursprung der Kette weiter (vnUrsprung).
  - ZAPanel: v7.4.4-88 optionale Prop onNavigateToVN, Knopf "Verwendungsnachweis" links
    neben "Stundennachweis-Matrix", nur bei VN-faehigen Foerderformaten. v7.4.4-89
    openPanel(pid, keepZaId?): nach "ZA speichern" wird die gespeicherte ZA geladen;
    Fehler beim INSERT einer neuen ZA wird gemeldet.
  - ZASeite: v1.0.13 Sprung zum VN; Sprung zur Matrix mit returnUrl (Zurueck in der
    Matrix fuehrt auf dieselbe ZA und denselben Tab); zaUrsprung ueberspringt VN-URLs.
  - TimesheetForm: v7.4.6-102 Knopf "VN" rechts neben "ZA" (nur Berater-Portal,
    VN-faehige Formate), returnUrl = aktuelle URL.
  - StundennachweisMatrix: v7.4.6-23 Knopf "Verwendungsnachweis" rechts neben
    "Zahlungsanforderung" (nur Berater-Portal, VN-faehige Formate).
  - cockpit-stundennachweis-page: v7.4.9-8 "Zurueck" honoriert ?returnUrl= (Pfad mit
    "/"), sonst wie bisher ins Firma-Cockpit.

================================================================================
AENDERUNG 3 - Verwendungsnachweis, Kopfdaten (Ergaenzung zum VN-Kapitel)
================================================================================

  Kopfdaten (Raster drei Spalten): Foerderkennzeichen, Kurzbezeichnung,
  Zuwendungsbescheid vom / Berichtszeitraum, Foerdersatz / Zahlungsanforderungen,
  Bewilligte Zuwendung. Die rechte Spalte liest sich damit Bescheiddatum - Foerdersatz -
  bewilligte Zuwendung.

  Zeile "Ausschoepfung der bewilligten Zuwendung" (nur wenn bewilligte_summe > 0):
  | Wert | Quelle | Anzeige |
  |---|---|---|
  | Anspruch lt. VN | finanzierung.gesamtZuwendung (Abschnitt B, "Zuwendung gesamt") | EUR und Prozent der Bewilligung |
  | angefordert lt. ZA | finanzierung.angefordertLautZa (Summe der ZA-Betraege) | EUR und Prozent der Bewilligung |
  | verbleibend | bewilligte_summe - Anspruch | EUR; bei Ueberschreitung "ueberschritten um", rot |
  Balken = Anspruch / Bewilligung (Portalfarbe, rot bei Ueberschreitung, auf 100 Prozent
  begrenzt). Bei Ueberschreitung Hinweis: "Ausgezahlt wird hoechstens die bewilligte
  Summe." Die Berechnung des VN (Lib) ist unveraendert; die Anzeige deckelt nichts.
  Ohne bewilligte_summe: "-" im Kopf, keine Ausschoepfungszeile.
  Die Zeile erscheint auch im Ausdruck.

================================================================================
AENDERUNG 4 - Querspruenge ZA / VN / Matrix / Stundenerfassung (neues Unterkapitel)
================================================================================

  Gilt nur im Berater-Portal. Im Firma-Portal setzen die Seiten die Props nicht (VN dort
  je Firma freischaltpflichtig; ZA-Spruenge dort ebenfalls nicht vorhanden, A-098).
  VN-Knoepfe nur bei VN-faehigen Formaten: ZIM_EINZEL, ZIM_KOOP, ZIM, ZIM_DS,
  ZIM_NETZWERK.

  | Von | Knopf | Ziel | Ruecksprung ("Zurueck" am Ziel) |
  |---|---|---|---|
  | ZA (Bedienleiste) | Verwendungsnachweis | VN des Projekts | dieselbe ZA, derselbe Tab |
  | ZA (Bedienleiste) | Stundennachweis-Matrix | Matrix des Projekts | dieselbe ZA, derselbe Tab (neu) |
  | ZA (Anlage 1a, Monat) | - | Stundenerfassung MA/Monat | dieselbe ZA, derselbe Tab (unveraendert) |
  | VN (neben Drucken) | Zahlungsanforderung | ZA des Projekts | VN dieses Projekts |
  | VN (neben Drucken) | Stundennachweis-Matrix | Matrix des Projekts | VN dieses Projekts |
  | Matrix (Bedienleiste) | Zahlungsanforderung | ZA (unveraendert) | Matrix |
  | Matrix (Bedienleiste) | Verwendungsnachweis | VN des Projekts | Matrix |
  | Stundenerfassung | ZA (unveraendert) | ZA | Stundenerfassung |
  | Stundenerfassung | VN | VN des Projekts | Stundenerfassung |

  Vom VN in die Stundenerfassung geht es bewusst ueber die Matrix (Mitarbeiter und
  Monat sind im VN nicht bestimmt; die Matrix bietet den Zellen-Sprung).

  URL-Parameter: ZA ?projektId=&zaId=&tab=&returnTo=; VN ?projekt=&returnUrl=; Matrix
  ?projekt=&returnUrl=; Stundenerfassung ?employee=&year=&month=&projekt=&returnUrl=.

  Ruecksprung-Kette: ZASeite (zaUrsprung) und VerwendungsnachweisSeite (vnUrsprung)
  tragen im eigenen Ruecksprung-Link nur den Ursprung weiter und ueberspringen dabei
  Durchreich-Seiten (Stundenerfassung, ZA, VN). Die URL waechst beim Hin- und
  Herspringen nicht. Folge: bei Ketten ueber mehr als zwei Seiten fuehrt "Zurueck" nach
  dem ersten Schritt auf den Ursprung und kann eine Zwischenseite ueberspringen
  (Beispiel Cockpit -> ZA -> VN -> Matrix: Matrix -> VN -> Cockpit). Bewusst so.

================================================================================
AENDERUNG 5 - ZA speichern (Ergaenzung zum ZA-Kapitel)
================================================================================

  Nach "ZA speichern" bleibt die gespeicherte ZA im Formular (bestehende ZA: dieselbe;
  neu angelegte ZA: die neue mit ihrer Nummer). Die Liste wird wie bisher frisch aus der
  DB geladen. Eine weitere ZA entsteht nur ueber "+ Neue ZA". Erstladen, Projektwechsel
  und "+ Neue ZA" sind unveraendert. Scheitert das Anlegen einer neuen ZA in der DB,
  erscheint eine Fehlermeldung (vorher still uebergangen).

================================================================================
AENDERUNG 6 - Paragraph 5 Bekannte Fehler
================================================================================

  Behoben in V7.9.19:
  - "Zurueck" in der Stundennachweis-Matrix fuehrte immer ins Cockpit, auch wenn man aus
    der ZA kam (A-097).
  - "ZA speichern" landete in einem leeren Neu-Entwurf; Gefahr, versehentlich eine
    weitere ZA anzulegen (A-103).
  - Fehler beim Anlegen einer ZA (INSERT) wurde nicht gemeldet.

================================================================================
AENDERUNG 7 - Paragraph 12.1 Anforderungsliste
================================================================================

  Statusaenderung:
  | A-097 | Ruecksprung Matrix -> ZA auf dieselbe ZA und denselben Tab | ... | Erledigt (V7.9.19) | 12.10.2026 | ZASeite 1.0.13, Matrix-Seite 7.4.9-8 |

  Ergaenzung (Text erweitern, Status bleibt Offen):
  | A-098 | Direktspruenge im Firma-Portal (ZA und jetzt auch VN); Rollenfrage und VN-Freischaltung zuerst klaeren | ... | Offen |

  Neue Zeilen ans Tabellenende:
  | A-101 | Verwendungsnachweis: bewilligte Zuwendung im Kopf und Ausschoepfung (Anspruch lt. VN, angefordert lt. ZA, verbleibend) | Martin | Session 92 | Erledigt (V7.9.19) | 12.10.2026 | VerwendungsnachweisPanel 1.2-8 |
  | A-102 | Querspruenge ZA <-> VN <-> Stundennachweis-Matrix / Stundenerfassung mit Ruecksprung (Berater-Portal) | Martin | Session 92 | Erledigt (V7.9.19) | 12.10.2026 | VNPanel 1.2-9, VNSeite 1.2-3, ZAPanel -88, ZASeite 1.0.13, TimesheetForm -102, Matrix -23, Matrix-Seite 7.4.9-8 |
  | A-103 | Nach "ZA speichern" in der gespeicherten ZA bleiben; neue ZA nur bewusst ueber "+ Neue ZA" | Martin | Session 92 | Erledigt (V7.9.19) | 12.10.2026 | ZAPanel -89 |

================================================================================
AENDERUNG 8 - Paragraph 12e Verhaltensvertrag (Fortschreibung auf v1.11)
================================================================================

  Neu VN-09 (bewilligte Zuwendung und Ausschoepfung), VN-10 (Spruenge aus dem VN), ZA-19
  (Speichern behaelt die ZA). ZA-18 um den VN-Knopf und den Matrix-Ruecksprung, MS-06 um
  den VN-Knopf und das Matrix-"Zurueck" ergaenzt. Neu TF-17 (VN-Knopf). Fragiler Bereich
  openPanel um keepZaId erweitert; fragiler Bereich Ruecksprung-Kette auf drei
  Seiten-Typen (zaUrsprung / vnUrsprung) erweitert. Neu IF-18 (Sprungziele in mehreren
  Dateien) und IF-19 (Vercel-Verzoegerung vor Redeploy).

================================================================================
AENDERUNG 9 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.53 | 12.10.2026 | Session 92, V7.9.19: VN-Kopf mit bewilligter Zuwendung und Ausschoepfung (A-101); Querspruenge ZA/VN/Matrix/Stundenerfassung mit Ruecksprung, Berater-Portal (A-102, erledigt auch A-097); ZA bleibt nach dem Speichern offen (A-103). VerwendungsnachweisPanel 1.2-9, VerwendungsnachweisSeite 1.2-3, ZAPanel 7.4.4-89, ZASeite 1.0.13, TimesheetForm 7.4.6-102, StundennachweisMatrix 7.4.6-23, cockpit-stundennachweis-page 7.4.9-8. Verhaltensvertrag v1.11. Kein SQL-Schema. |

================================================================================
