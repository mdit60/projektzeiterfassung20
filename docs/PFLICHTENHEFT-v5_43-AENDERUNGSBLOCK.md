# PFLICHTENHEFT v5.43 - Aenderungsblock (Session 82, 11.09.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37 bis v5.42. Dieser Block enthaelt
AUSSCHLIESSLICH die Aenderungen fuer v5.43 mit exakten Einfuegepunkten.
SW-Release V7.9.9 -> V7.9.10. Ein Thema, KEIN SQL - reine Frontend-Aenderung:
Die Kapazitaetsplanung beruecksichtigt Elternzeit (Abwesenheitscode E).

Nummernpruefung vor Vergabe (Empfehlung aus v5.41): v5.43 und A-065 bis A-067 sind weder
in downloads/ noch in downloads/archiv/doku/PFLICHTENHEFT/ noch in den Projektdokumenten
vergeben (Stand 11.09.2026; hoechste bisherige Anforderung A-064 aus v5.42).

================================================================================
AENDERUNG 1 - Kopfblock (ersetzt die ersten Zeilen des Dokuments)
================================================================================

ALT:
  **Version:** 5.42
  **SW-Release:** V7.9.9
  **Datum:** 10. September 2026

NEU:
  **Version:** 5.43
  **SW-Release:** V7.9.10
  **Datum:** 11. September 2026

--------------------------------------------------------------------------------
AENDERUNG 1b - Status-Zeile (neuer Stand VORNE ergaenzt; der bisherige Text wird
zu "Zuvor in V7.9.9:")
--------------------------------------------------------------------------------

Vor dem bestehenden Status-Text aus v5.42 wird eingefuegt:

  **Status:** Session 82 (11.09.2026): **KAPAZITAETSPLANUNG BERUECKSICHTIGT ELTERNZEIT
  - V7.9.10 (in PRODUKTION).** Reine Frontend-Aenderung, kein SQL. Die Kapazitaetsmatrix
  (/v7/berater/multiprojekt) las bisher keine Abwesenheiten; ein Mitarbeiter in
  Elternzeit erschien mit voller Monatskapazitaet (Echtfall Flensburger Yacht-Service,
  April 2026: 160 h statt 48 h). Neu: E-Tage aus v7_employee_absences werden geladen;
  gezaehlt werden nur E-Tage, die Arbeitstage sind (Mo-Fr, kein Feiertag), weil der
  Bereichsdialog E auch auf Feiertage schreibt. Monatskapazitaet = (Arbeitstage minus
  E-Arbeitstage) x (WAZ / 5). Die Ampel-Prozente beziehen sich auf die VOLLE
  Monatskapazitaet ohne Elternzeit (Entscheidung Martin). Ein Monat vollstaendig in
  Elternzeit erscheint als hellblaue Zelle "E" statt Ampel; sind in diesem Monat
  trotzdem Arbeitsplan-Stunden geplant, ist das E rot und der Tooltip warnt. Tooltip
  mit Zeile "Elternzeit (E), n Arbeitstage: -x h" und "Verfuegbar". Fuer Mitarbeiter
  ohne E-Tage sind alle Werte unveraendert. berater-multiprojekt-page v7.4.8-29. A-065.
  Neu als offen: A-066 (Elternzeit ausserhalb der Projektlaufzeit per UI nicht
  entfernbar), A-067 (FZul-Detailseite liest die zentrale Abwesenheitstabelle nicht).
  Deploy: Merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel, Tag v7.9.10.
  Details GIT-SICHERUNG-v7_9_10-session82.md. Zuvor in V7.9.9:

(der bestehende Status-Text aus v5.42 folgt unveraendert direkt danach.)

================================================================================
AENDERUNG 2 - Paragraph 4.3 Wrapper-Seiten (eine Zeile aktualisieren)
================================================================================

- Zeile **src/app/v7/berater/multiprojekt/page.tsx**: Versionsangabe 7.4.8-25 ->
  **7.4.8-29**, am Ende der Beschreibung anfuegen:

  ; v7.4.8-26 "Neu"-Auswahlliste im Vorhaben-Panel entfernt (nur FZul funktional),
  einzelner "+ Neu"-Button oeffnet direkt das FZul-Anlage-Modal; v7.4.8-27 Panel-Titel
  "FZul-Vorhaben" (-26/-27 hier nachgezogen, bisher im Pflichtenheft nicht
  dokumentiert); **v7.4.8-28 (Session 82): Elternzeit (Code E) mindert die
  Monatskapazitaet - E-Tage aus v7_employee_absences (absence_code 'E', is_active,
  .limit(10000)), nur Arbeitstage gezaehlt (Mo-Fr, kein Feiertag laut
  getGermanHolidays); Monatskapazitaet = (Arbeitstage - E-Arbeitstage) x (WAZ/5);
  Ampel-Prozent auf Basis der vollen Monatskapazitaet ohne Elternzeit
  (gesamtOhneElternzeit); Voll-E-Monat als hellblaue Zelle "E" (rot bei trotzdem
  geplanten/verbuchten Stunden); Tooltip-Zeile Elternzeit + Verfuegbar; Legende "E =
  Elternzeit". v7.4.8-29: Tooltip-Abstand (gap-2, whitespace-nowrap).**

================================================================================
AENDERUNG 3 - Paragraph 12.1 Anforderungsliste (drei neue Zeilen ans Tabellenende)
================================================================================

  | A-065 | Kapazitaetsplanung muss Elternzeit (Code E) beruecksichtigen - ein Mitarbeiter in Elternzeit erschien mit voller Kapazitaet | Martin (offener Punkt aus KONZEPT-ELTERNZEIT-TIMESHEET Paragraph 11 und GIT-SICHERUNG V7.9.9) | Session 82 | Erledigt | 11.09.2026 | berater-multiprojekt-page v7.4.8-28/-29: E-Tage laden, nur Arbeitstage zaehlen (E wird auch auf Feiertage geschrieben, countWorkdaysInMonth zaehlt Feiertage nicht), Monatskapazitaet (Arbeitstage - E-Arbeitstage) x (WAZ/5). Ampel-Basis volle Monatskapazitaet ohne Elternzeit (Entscheidung Martin). Voll-E-Monat: Zelle "E" statt Ampel - ohne diese Sonderbehandlung haette die bestehende Formel Kapazitaet 0 als "100 Prozent frei" gruen gezeigt. Rotes E, wenn im Voll-E-Monat Arbeitsplan-PM verplant sind: der Elternzeit-Dialog prueft nur ERFASSTE Stunden, nicht den ARBEITSPLAN - das rote E ist derzeit die einzige Stelle, an der dieser Widerspruch sichtbar wird. Verifiziert in DEV (AS System) und PROD (Flensburger Yacht-Service, April 2026: 160 h, 14 E-Arbeitstage, -112 h, verfuegbar 48 h, verbucht 48 h). |
  | A-066 | Elternzeit ausserhalb der Projektlaufzeit ist ueber die Oberflaeche nicht entfernbar | Session 82 (DEV-Test: Zeitraum 01.06.-16.07.2027 fuer einen MA, dessen Projekt vorher endet) | Session 82 | Offen | 11.09.2026 | "Elternzeit-Zeitraum entfernen" bietet das Kontextmenue des TimesheetForm nur an einem E-Tag an; liegen alle E-Tage in Monaten, die das Projekt nicht anzeigt, ist der Dialog nicht erreichbar. Der Dialog selbst entfernt jeden Von-Bis-Zeitraum. Das Anlegen ausserhalb der Laufzeit ist fachlich zulaessig (E gilt projektuebergreifend). Loesungsvorschlag: (a) Warnung in der Vorschau, wenn der Zeitraum ueber das Projektende hinausgeht, (b) "Elternzeit-Zeitraum entfernen" auch an Nicht-E-Tagen anbieten. Behelf bis dahin: is_active = false per SQL (in Session 82 so fuer die DEV-Testdaten ausgefuehrt). |
  | A-067 | FZul-Detailseite (Jahreskalender, BSFZ-Export) liest die zentrale Abwesenheitstabelle nicht | Session 82 (Codeanalyse multiprojekt-detail v7.4.8-17) | Session 82 | Offen | 11.09.2026 | src/app/v7/berater/multiprojekt/[id]/page.tsx referenziert v7_employee_absences nicht; Abwesenheiten werden nur ueber den Alt-Filter day_type auf v7_timesheets ausgeschlossen. Seit A-034 (zentrale Abwesenheiten) liegen U/K/S und seit V7.9.7 E aber in v7_employee_absences. Folge: an Elternzeit- und Abwesenheitstagen werden volle FZul-Stunden als verfuegbar angeboten und koennen in den BSFZ-Export gelangen. Fachlich gewichtiger als A-065, weil der Export nach aussen geht. |

================================================================================
AENDERUNG 4 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.43 | 11.09.2026 | Session 82 (V7.9.10, reine Frontend-Aenderung, kein SQL): Kapazitaetsplanung beruecksichtigt Elternzeit (Code E). E-Tage aus v7_employee_absences, nur Arbeitstage gezaehlt (Mo-Fr, kein Feiertag), Monatskapazitaet (Arbeitstage - E-Arbeitstage) x (WAZ/5); Ampel-Basis volle Monatskapazitaet ohne Elternzeit; Voll-E-Monat als Zelle "E" (rot bei verplanten Arbeitsplan-PM); Tooltip und Legende ergaenzt; fuer MA ohne E unveraendert. berater-multiprojekt-page v7.4.8-29 (-26/-27 im Pflichtenheft nachgezogen). A-065 erledigt. Neu offen: A-066 (E ausserhalb Projektlaufzeit per UI nicht entfernbar), A-067 (FZul-Detailseite ignoriert zentrale Abwesenheiten). Verifiziert DEV (AS System, Testdaten anschliessend entfernt) und PROD (Flensburger Yacht-Service, April 2026). Deploy: Merge v7-dev->main (--no-ff), push origin+cubintec, Vercel, Tag v7.9.10. Details GIT-SICHERUNG-v7_9_10-session82.md. |

================================================================================
Hinweis Paragraph 5 (Bekannte Fehler): A-067 ist als bekannter Fehler aufzunehmen
(falsche verfuegbare FZul-Stunden an Abwesenheits- und Elternzeit-Tagen).

Hinweis Verhaltensvertrag (Paragraph 12e): Fuer die Kapazitaetsplanung existiert noch
kein eigener Vertrag. Vorschlag fuer v1.3 (zusammen mit den zwei offenen Regeln aus
v5.42):
  - KP-01 Monatskapazitaet = Arbeitstage (Feiertage des Bundeslandes) x WAZ/5, WAZ aus
    Teilzeit-Historie zum Monatsersten.
  - KP-02 Elternzeit-Arbeitstage mindern die Monatskapazitaet; Ampel-Basis bleibt die
    volle Monatskapazitaet; Voll-E-Monat als Zelle "E".
  - KP-03 Geplante Stunden nur fuer Zukunftsmonate, gleichmaessig ueber die AP-Laufzeit;
    verbuchte Stunden aus v7_timesheets mit .limit(10000).
  - KP-04 Jahressummen "Frei h" und "Frei PM" = Summe der Monatswerte.
================================================================================
