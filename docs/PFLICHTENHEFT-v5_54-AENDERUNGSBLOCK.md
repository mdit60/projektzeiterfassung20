# PFLICHTENHEFT v5.54 - Aenderungsblock (Session 93, 20./21.10.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37 bis v5.53. Nur Aenderungen fuer
v5.54. SW-Release: **V7.9.20** (in PRODUKTION). Kein SQL-Schema, keine Datenkorrektur.
Inhalt: (1) Auto-Vorbelegung "sonstige Arbeiten" im Stundennachweis nur noch auf leeren
Arbeitstagen und nur als volle Tagesarbeitszeit - keine Reststunden wie 0,02 h mehr
(A-104). (2) Verwendungsnachweis rechnet mit demselben Stundensatz wie die
Zahlungsanforderung; Fehlalarm "zu viel angefordert" bei Teilzeit-MA ohne anerkannten
Satz behoben (A-105, Fall AURA/OpenZ). (3) Neue offene Anforderung: Stundennachweis nach
den aktuellen ZIM-Vorlagen als naechstes Release (A-106). Verhaltensvertrag v1.12.

Nummernpruefung: A-104 bis A-109 in downloads/ nicht vergeben (hoechste bisher A-103 aus
v5.53). Gegenprobe gegen docs/ im Repo durch Martin.

================================================================================
AENDERUNG 1 - Kopfblock
================================================================================

ALT:  **Version:** 5.53 / **SW-Release:** V7.9.19 / **Datum:** 12. Oktober 2026
NEU:  **Version:** 5.54 / **SW-Release:** V7.9.20 / **Datum:** 21. Oktober 2026

Status-Zeile (neu VORNE; bisheriger Text wird zu "Zuvor (Session 92):"):
  **Status:** Session 93 (20./21.10.2026): **V7.9.20 in PRODUKTION - "sonstige Arbeiten"
  ohne Reststunden, Verwendungsnachweis mit demselben Stundensatz wie die ZA.** Im
  Stundennachweis werden "sonstige Arbeiten" nur noch an Arbeitstagen ohne Projektstunden
  und ohne Abwesenheit automatisch eingetragen, und zwar mit einer vollen
  Tagesarbeitszeit oder gar nicht. Der Verwendungsnachweis skaliert den kalkulatorischen
  Stundensatz nicht mehr mit der Wochenarbeitszeit; Anspruch und Anforderungen stimmen
  bei AURA (OpenZ) wieder ueberein. Zwei Deploys am 20.10.2026, kein SQL.
  Zuvor (Session 92):

================================================================================
AENDERUNG 2 - Paragraph 4.1 Komponententabelle
================================================================================

  | src/components/shared/TimesheetForm.tsx | TimesheetForm-v7_4_6-103.tsx | (bisher -102) |
  | src/lib/verwendungsnachweis-utils.ts | verwendungsnachweis-utils-v1_2-8.ts | (bisher 1.2-7) |

  Beschreibung ergaenzen:
  - TimesheetForm: v7.4.6-103 Auto-Vorbelegung "sonstige Arbeiten" nur auf leeren
    Arbeitstagen (keine Stunden in diesem oder einem anderen Projekt, keine
    Abwesenheit), Wert = volle Tagesarbeitszeit, wenn das Wochen-Restbudget reicht,
    sonst leer. An Tagen mit Projektstunden wird die Zelle geleert. Der weiche
    Speicher-Hinweis auf "Luecken"-Tage (v7.4.6-63) entfaellt.
  - verwendungsnachweis-utils: v1.2-8 getHourlyRate = hourly_rate_approved ??
    hourly_rate, unskaliert (identisch zu ZAPanel.getHourlyRate seit v7.4.4-66).

================================================================================
AENDERUNG 3 - Stundennachweis, Zeile "sonstige Arbeiten" (ersetzt die Regel aus v5.41ff.)
================================================================================

  Entscheidung Martin 20.10.2026. Anlass: Reststunden wie 0,02 h fuehren zu Rueckfragen
  bei Pruefung und Abrechnung; die aktuellen ZIM-Stundennachweise (Formularcenter)
  enthalten die Zeile nicht mehr.

  Auto-Vorbelegung je reinem Arbeitstag (Mo-Fr, kein Feiertag, nicht gesperrt, keine
  Kurzarbeit, Monat nicht abgeschlossen):
  | Fall | Bedingung | Wert in "sonstige Arbeiten" |
  |---|---|---|
  | a | Stunden in diesem Projekt > 0 ODER in einem anderen Projekt des MA > 0 | leer (vorhandener Wert wird geleert) |
  | b | Abwesenheit (U/K/S/E) | leer (unveraendert) |
  | c | leerer Arbeitstag, Wochen-Restbudget >= Tagesarbeitszeit | volle Tagesarbeitszeit |
  | c' | leerer Arbeitstag, Wochen-Restbudget < Tagesarbeitszeit | leer |

  Wochen-Restbudget wie bisher (v7.4.6-74): Wochenarbeitszeit minus Projektstunden,
  andere Projekte, Abwesenheiten und bereits gesetzte "sonstige" der Kalenderwoche.

  Folgen (bewusst so):
  - Altwerte in der DB werden nur in offenen Monaten bereinigt, die geoeffnet und
    gespeichert werden. Abgeschlossene oder nicht wieder geoeffnete Monate behalten die
    gespeicherten Werte, auch in Matrix und Berichten (A-109).
  - An Projekttagen ist eine Eingabe in "sonstige Arbeiten" nicht mehr moeglich; sie wird
    sofort geleert (A-108).
  - Im Ausdruck nach dem bisherigen Formular liegt die Tagessumme an Projekttagen unter
    der vertraglichen Arbeitszeit.
  - Wochenenden, Feiertage, gesperrte Tage, Kurzarbeit und abgeschlossene Monate sowie
    die Cross-Projekt-Pruefung (A-021: 9-h-Tagesgrenze ueber alle Projekte, physische
    Monatsgrenze, Zellhinweis "x h in anderen Projekten") sind unveraendert.

================================================================================
AENDERUNG 4 - Verwendungsnachweis, Stundensatz (Ergaenzung zum VN-Kapitel)
================================================================================

  Der VN ermittelt den Stundensatz je MA exakt wie die ZA: anerkannter Satz
  (hourly_rate_approved), sonst kalkulatorischer Satz (hourly_rate), jeweils
  unskaliert. Der kalkulatorische Satz ist nach Anlage 6.1 bereits (Monatslohn x 12 +
  Zulagen) / (persoenliche WAZ x 52); eine weitere Skalierung mit weekly_hours /
  pm_basis_weekly_hours rechnet Teilzeit doppelt herunter.

  Befund AURA (OpenZ, FKZ 16KN12459A, 20.10.2026): Blanken (30 h, Basis 37,5 h, kein
  anerkannter Satz) im VN mit 22,40 statt 28,00 EUR. Folge: Anspruch lt. VN 52.711,58 EUR
  gegen angefordert 58.505,00 EUR, Warnung "Differenz +5.793,42 EUR". Nachrechnung:
  5.793,42 / 0,70 / 1,30 / 5,60 = 1.136,86 h gegen 1.137,92 h gebucht (Rest: Euro-Rundung
  je ZA). Nach dem Fix: Anspruch 58.505,31 EUR, keine Warnung, verbleibend 1.180,69 EUR
  von 59.686,00 EUR bewilligt. Die im AP-Status offenen 89 h sind Planstunden und gehen in
  den VN nicht ein; nachgebucht werden duerfen nur tatsaechlich geleistete, noch nicht
  erfasste Stunden innerhalb der Laufzeit (Hinweis an OpenZ).

================================================================================
AENDERUNG 5 - Paragraph 5 Bekannte Fehler
================================================================================

  Behoben in V7.9.20:
  - Stundennachweis zeigte in "sonstige Arbeiten" Reststunden bis zur Tagesarbeitszeit
    (z. B. 0,02 h) (A-104).
  - Verwendungsnachweis meldete bei Teilzeit-MA ohne anerkannten Satz eine
    Ueberforderung, die es nicht gab (A-105).

  Neu bekannt (Einschraenkung):
  - Eingabe in "sonstige Arbeiten" an Tagen mit Projektstunden wird sofort geleert,
    ohne Hinweis (A-108).

================================================================================
AENDERUNG 6 - Paragraph 12.1 Anforderungsliste
================================================================================

  Ergaenzung (Text erweitern, Status bleibt Offen):
  | A-080 | ... zusaetzlich: `downloads` (und Backup-Ordner) in tsconfig.json unter "exclude" aufnehmen, damit ein tsc-Lauf nicht an Archivdateien scheitert (Session 93: 13 Fehler, alle in downloads/archiv/) | ... | Offen |

  Neue Zeilen ans Tabellenende:
  | A-104 | Stundennachweis: keine Reststunden in "sonstige Arbeiten"; Auto-Vorbelegung nur auf leeren Arbeitstagen, volle Tagesarbeitszeit oder leer | Martin | Session 93 | Erledigt (V7.9.20) | 20.10.2026 | TimesheetForm -103 |
  | A-105 | Verwendungsnachweis: Stundensatz identisch zur ZA (unskaliert), Fehlalarm bei Teilzeit-MA | Martin (Fall AURA/OpenZ) | Session 93 | Erledigt (V7.9.20) | 20.10.2026 | verwendungsnachweis-utils 1.2-8 |
  | A-106 | Stundennachweis nach den aktuellen ZIM-Vorlagen (Formularcenter: FuE-Einzel/Koop, DS mit techn./nichttechn. je AP, Netzwerkmanagement; ohne Zeilen U/K/S, ohne "sonstige Arbeiten", ohne Tagesgesamtsumme). Eigenes Release. Vorab: (1) Stand der Vorlagen klaeren (beide ZIM-Vorlagen tragen den Vermerk "Stand: 09-2020"), (2) alle bis zur Umstellung erstellten Stundennachweise im alten Format sichern, (3) Stichtag und Umgang mit laufenden Projekten festlegen, (4) Wirkung auf Matrix-Status, Abwesenheiten und Auswertungen pruefen | Martin | Session 93 | Offen (zurueckgestellt, Konzept vor Umsetzung) | - | Vorlagen vom 20.10.2026 |
  | A-107 | Cross-Projekt-Hinweis im Stundennachweis um die noch freien Stunden ergaenzen ("an Tag x bereits y h in Projekt P, frei noch z h") | Martin | Session 93 | Offen (niedrig) | - | - |
  | A-108 | "sonstige Arbeiten" an Tagen mit Projektstunden sichtbar sperren statt Eingabe stillschweigend zu leeren | Claude | Session 93 | Offen (niedrig) | - | - |
  | A-109 | Altwerte "sonstige Arbeiten" an Projekttagen in der DB (abgeschlossene bzw. nicht wieder gespeicherte Monate): SQL-Bereinigung ja/nein - Entscheidung Martin, haengt an A-106 (Altformat sichern) | Martin | Session 93 | Offen (Entscheidung) | - | - |

================================================================================
AENDERUNG 7 - Paragraph 12e Verhaltensvertrag (Fortschreibung auf v1.12)
================================================================================

  TF-12 neu gefasst (nur leere Arbeitstage, volle Tagesarbeitszeit oder leer). Fragile
  Bereiche TimesheetForm angepasst (Auto-Vorbelegung, Wirkung nach aussen, Leeren von
  Projektstunden). Neu VN-11 (Stundensatz identisch zur ZA), fragiler Bereich
  "Stundensatz in zwei Kopien", neu IF-20.

================================================================================
AENDERUNG 8 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.54 | 21.10.2026 | Session 93, V7.9.20: "sonstige Arbeiten" nur auf leeren Arbeitstagen und nur als volle Tagesarbeitszeit, keine Reststunden (A-104); VN-Stundensatz identisch zur ZA, Fehlalarm AURA/OpenZ behoben (A-105). TimesheetForm 7.4.6-103, verwendungsnachweis-utils 1.2-8. Neu offen: A-106 Stundennachweis nach neuen ZIM-Vorlagen (eigenes Release), A-107, A-108, A-109; A-080 erweitert. Verhaltensvertrag v1.12. Kein SQL-Schema. |

================================================================================
