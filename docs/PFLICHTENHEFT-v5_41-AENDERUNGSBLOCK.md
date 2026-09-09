# PFLICHTENHEFT v5.41 - Aenderungsblock (Session 81, 09.09.2026) - NACHTRAG

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37/v5.38/v5.39/v5.40. Dieser Block
enthaelt AUSSCHLIESSLICH die Aenderungen fuer v5.41 mit exakten Einfuegepunkten.
KEIN neues SW-Release: der Softwarestand bleibt V7.9.7. Es handelt sich um einen reinen
DOKUMENTATIONS-NACHTRAG - es wird keine Zeile Code geaendert.

Anlass: Beim Aufraeumen von downloads/ (09.09.2026) wurde eine Nummernkollision
entdeckt. Zwei inhaltlich verschiedene Aenderungsbloecke tragen beide die Nummer v5.39
und vergeben beide die Anforderungsnummer A-055:

  (a) Session 78, 10.08.2026 - Timesheet-AP-Angebot, start-basierte Obergrenze fuer die
      automatische Anzeige zugeordneter APs (TimesheetForm v7.4.6-84)
  (b) Session 80, 27.08.2026 - NWM-Jahresselektor Fortschritt/Prognose und FZ-basierte
      Foerderquote (ProjektFortschrittPanel v7.4.5-33, ZAPanel v7.4.4-69 u.a.)

In das konsolidierte Pflichtenheft und in docs/ wurde ausschliesslich Block (b)
uebernommen. Block (a) beschreibt eine seit dem 10.08.2026 produktiv laufende Aenderung,
die im Pflichtenheft bisher komplett fehlt. Dieser Nachtrag traegt sie unter der freien
Nummer A-061 nach. Beide Ursprungsdateien liegen eindeutig benannt in
downloads/archiv/doku/PFLICHTENHEFT/ als ...-v5_39-AENDERUNGSBLOCK-Session78.md und
...-v5_39-AENDERUNGSBLOCK-Session80.md.

================================================================================
AENDERUNG 1 - Kopfblock (ersetzt die ersten Zeilen des Dokuments)
================================================================================

ALT:
  **Version:** 5.40
  **SW-Release:** V7.9.7
  **Datum:** 9. September 2026

NEU:
  **Version:** 5.41
  **SW-Release:** V7.9.7
  **Datum:** 9. September 2026

--------------------------------------------------------------------------------
AENDERUNG 1b - Status-Zeile (neuer Stand VORNE ergaenzt; der bisherige V7.9.7-Text
wird zu "Zuvor in V7.9.7:")
--------------------------------------------------------------------------------

Vor dem bestehenden Status-Text aus v5.40 wird eingefuegt:

  **Status:** Session 81 (09.09.2026): **DOKUMENTATIONS-NACHTRAG, KEIN CODE-RELEASE -
  Softwarestand unveraendert V7.9.7 (in PRODUKTION).** Nachgetragen wird die in Session
  78 (10.08.2026) produktiv gegangene Timesheet-Aenderung, die durch eine
  Nummernkollision (zwei Bloecke v5.39, zwei Anforderungen A-055) nie ins konsolidierte
  Pflichtenheft gelangt ist: Fuer die AUTOMATISCH angezeigten "Zugeordnete AP" gilt
  wieder eine Obergrenze, jetzt START-BASIERT. Ein zugeordnetes AP wird nur noch
  automatisch angezeigt bzw. vorbelegt, wenn sein geplanter Startmonat hoechstens
  3 Kalendermonate vor dem gewaehlten Timesheet-Monat liegt (monthsSinceStart <= 3).
  Fachliche Grundlage: ein AP ist laut Foerderrichtlinie auf max. 3 PM begrenzt und
  dauert damit nie laenger als rund 3 Kalendermonate. Die Reststunden-Pruefung
  (planned - booked > 0) bleibt als zusaetzliches UND erhalten. Behoben wurde damit,
  dass laengst abgeschlossene APs vom Projektanfang (z.B. AP 1.1 Anforderungsanalyse,
  Start 05/2025) mit blossem Rundungsrest (0,01 h offen) noch >1 Jahr spaeter
  automatisch im Stundennachweis erschienen. Die Regel ersetzt die in V7.9.5/A-052
  ersatzlos entfallene Obergrenze end_date + 2 Monate. "Weitere AP" bleibt unveraendert
  OHNE Zeitfilter jederzeit vollstaendig waehlbar - spaete legitime Nachbuchungen sind
  weiter moeglich, aber ein bewusster Schritt. Die Untergrenze (hasAPStarted, ab
  wp.start_date-Monat) aus V7.9.5 bleibt unveraendert. Eingefuehrt mit TimesheetForm
  v7.4.6-84; die Regel ist in allen Folgebuilds bis v7.4.6-96 unveraendert enthalten.
  A-061. Kein Deploy noetig. Zuvor in V7.9.7:

(der bestehende Status-Text aus v5.40 folgt unveraendert direkt danach.)

================================================================================
AENDERUNG 2 - Paragraph 4.1 Shared Components (Beschreibung ergaenzen)
================================================================================

ACHTUNG: Die Versionsangabe der Zeile TimesheetForm.tsx bleibt bei **7.4.6-96**
(Stand v5.40). Sie wird NICHT zurueckgesetzt. Am Ende der Beschreibung wird lediglich
der fehlende historische Hinweis angefuegt:

  ; **v7.4.6-84 (Session 78, hier nachgetragen mit v5.41): Obergrenze fuer die
  Auto-Anzeige "Zugeordnete AP" wieder eingefuehrt, jetzt START-BASIERT. Helferfunktion
  monthsSinceStart(wp) liefert die ganzen Kalendermonate zwischen wp.start_date-Monat
  und gewaehltem Timesheet-Monat; isAPInAssignedGroup zeigt bzw. belegt ein zugeordnetes
  AP nur noch bei monthsSinceStart <= 3 vor. Ersetzt die in v7.4.6-82 ersatzlos
  entfallene end_date+2-Grenze; behebt, dass abgeschlossene APs mit blossem Rundungsrest
  (0,01 h offen) dauerhaft vorbelegt blieben. Grundlage: AP laut Foerderrichtlinie max.
  3 PM (~3 Kalendermonate). Reststunden-Pruefung bleibt als UND. "Weitere AP"
  unveraendert ohne Zeitfilter. Untergrenze hasAPStarted unveraendert. Regel in allen
  Folgebuilds bis -96 unveraendert enthalten.**

================================================================================
AENDERUNG 3 - Paragraph 12.1 Anforderungsliste (eine neue Zeile ans Tabellenende)
================================================================================

  | A-061 | Timesheet: zugeordnete APs nach Abschluss nicht dauerhaft automatisch anzeigen - abgeschlossene APs vom Projektanfang tauchten mit blossem Rundungsrest (0,01 h offen) noch >1 Jahr spaeter auf. NACHTRAG: urspruenglich in Session 78 als A-055 gefuehrt; diese Nummer wurde in Session 80 ein zweites Mal vergeben, weshalb der Vorgang nie ins Pflichtenheft gelangte. | Martin (HEATS: AP 1.1 Anforderungsanalyse Start 05/2025 im Stundennachweis 06/2026) | Session 78, nachgetragen Session 81 | Erledigt | 10.08.2026, dokumentiert 09.09.2026 | TimesheetForm v7.4.6-84: start-basierte Obergrenze monthsSinceStart <= 3 in isAPInAssignedGroup (Dropdown "Zugeordnete AP" + Matrix-Vorbelegung); Grundlage max. 3 PM je AP laut Foerderrichtlinie. Reststunden-Pruefung bleibt UND; "Weitere AP" ohne Zeitfilter; Untergrenze hasAPStarted unveraendert. Ersetzt die in A-052 entfernte end_date+2-Grenze. Regel bis v7.4.6-96 unveraendert enthalten. Details GIT-SICHERUNG (Session 78). |

================================================================================
AENDERUNG 4 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.41 | 09.09.2026 | Session 81, DOKUMENTATIONS-NACHTRAG (kein Code, kein SQL, Softwarestand bleibt V7.9.7): Nachtrag der in Session 78 (10.08.2026) produktiv gegangenen Timesheet-Aenderung, die wegen einer Nummernkollision nie ins konsolidierte Pflichtenheft gelangt war. Zwei verschiedene Bloecke trugen die Nummer v5.39 und vergaben beide A-055 (Session 78: Timesheet-AP-Obergrenze; Session 80: NWM-Jahresselektor und FZ-Foerderquote); uebernommen wurde nur der Session-80-Block. Inhalt des Nachtrags: Fuer die automatisch angezeigten "Zugeordnete AP" gilt wieder eine Obergrenze, jetzt start-basiert - ein zugeordnetes AP wird nur noch automatisch angezeigt/vorbelegt, wenn sein geplanter Startmonat hoechstens 3 Kalendermonate zurueckliegt (monthsSinceStart <= 3); Grundlage: AP laut Foerderrichtlinie max. 3 PM. Behebt, dass abgeschlossene APs vom Projektanfang mit blossem Rundungsrest (0,01 h offen) noch >1 Jahr spaeter im Stundennachweis erschienen. Ersetzt die in V7.9.5/A-052 ersatzlos entfallene end_date+2-Grenze; Reststunden-Pruefung (planned-booked>0) bleibt als UND. "Weitere AP" unveraendert ohne Zeitfilter; Untergrenze hasAPStarted unveraendert. TimesheetForm v7.4.6-84, Regel bis -96 unveraendert enthalten. A-061 (ersetzt die kollidierende Nummer A-055 aus Session 78). Kein Deploy. |

================================================================================
Hinweis Paragraph 5 (Bekannte Fehler): kein Eintrag noetig - der beschriebene Fehler
ist seit 10.08.2026 behoben, dieser Block dokumentiert ihn lediglich nach.

Hinweis Verhaltensvertrag (Paragraph 12e): Die nachgetragene Regel praezisiert die
AP-Auswahl (start-basierte Obergrenze ausschliesslich fuer die automatisch angezeigten
"Zugeordnete AP"; "Weitere AP" bleibt vollstaendig offen) - kein Vertrag gebrochen.
Empfehlung zur Vermeidung kuenftiger Kollisionen: vor Vergabe einer neuen A-Nummer und
einer neuen Pflichtenheft-Versionsnummer immer gegen docs/ pruefen, nicht gegen den
lokalen downloads-Stand.
================================================================================
