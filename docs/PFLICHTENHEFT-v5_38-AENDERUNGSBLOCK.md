# PFLICHTENHEFT v5.38 - Aenderungsblock (Session 77, 10.08.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsblock v5.37. Dieser Block enthaelt AUSSCHLIESSLICH
die Aenderungen fuer v5.38 mit exakten Einfuegepunkten. SW-Release V7.9.4 -> V7.9.5.
Drei reine Frontend-Themen (kein SQL): (1) Timesheet-AP-Angebot Startmonat-Filter,
(2) AP-Status-Rundungsabgleich, (3) Projektfortschritt-Prognose auf Planerfuellung.

================================================================================
AENDERUNG 1 - Kopfblock (ersetzt die ersten Zeilen des Dokuments)
================================================================================

ALT:
  **Version:** 5.37
  **SW-Release:** V7.9.4
  **Datum:** 8. August 2026

NEU:
  **Version:** 5.38
  **SW-Release:** V7.9.5
  **Datum:** 10. August 2026

--------------------------------------------------------------------------------
AENDERUNG 1b - Status-Zeile (neuer Stand VORNE ergaenzt; der bisherige V7.9.4-Text
wird zu "Zuvor in V7.9.4:")
--------------------------------------------------------------------------------

Vor "Session 76 (08.08.2026): **TIMESHEET-RESTANZEIGE UMSCHALTBAR..." wird eingefuegt:

  **Status:** Session 77 (10.08.2026): **TIMESHEET-AP-ANGEBOT ZEITLICH BEGRENZT,
  AP-STATUS-RUNDUNGSABGLEICH, PROJEKTFORTSCHRITT-PROGNOSE AUF PLANERFUELLUNG -
  V7.9.5 (in PRODUKTION).** Drei reine Frontend-Korrekturen, kein SQL. (1) Im
  Timesheet werden einem MA ZUGEORDNETE APs erst ab ihrem geplanten Startmonat
  (wp.start_date) angeboten (Dropdown + Vorbelegung), nicht mehr ab dem ersten
  Projektmonat - verhindert Fehlbuchungen auf noch nicht angelaufene APs. Die
  Liste "Weitere AP" bleibt bewusst OHNE Zeitfilter jederzeit vollstaendig
  waehlbar (fuer vorgezogene/uebernommene APs, wenn ein Vorgaenger-AP frueher
  fertig ist). Zugleich entfaellt die bisherige Obergrenze (end_date + 2 Monate)
  bei den zugeordneten APs: solange Stunden offen sind, bleibt ein AP waehlbar,
  auch nach seiner geplanten Laufzeit. (2) In der "Alle AP"-Statusuebersicht gehen
  die "gesamt"-Spalten (geplant/gebucht/offen) jetzt spaltenweise exakt auf -
  gesamt = Summe der auf 2 Stellen gerundeten MA-Werte; die frueheren 0,01h-Reste
  aus dem periodischen PM-Faktor (173,3333...) entfallen. (3) Die
  Zielerreichungs-Prognose misst nicht mehr das absolute Monatstempo der letzten
  3 Monate, sondern die PLANERFUELLUNG: Prognose = Ist(abgeschlossene Monate) +
  Rest-Soll(aktueller + kuenftige Monate) x Erfuellungsgrad (Ist/Soll bis heute).
  Der normale Projektauslauf loest damit keine Fehlwarnung "gefaehrdet" mehr aus;
  echtes Zurueckfallen (Ist << Soll) fuehrt weiterhin zu Gelb/Rot. Ampel-Schwellen
  unveraendert. TimesheetForm v7.4.6-82/-83 (Endstand -83), ApStatusModal v1.0-11,
  projektfortschritt-utils v7.4.9-6, FirmaCockpit v7.4.9-36-11,
  ProjektFortschrittPanel v7.4.5-26. Deploy: Merge v7-dev -> main (--no-ff), push
  origin + cubintec, Vercel. Details GIT-SICHERUNG-v7_9_5-session77.md. Zuvor in V7.9.4:

(der bestehende Text "Session 76 (08.08.2026): **TIMESHEET-RESTANZEIGE UMSCHALTBAR..."
folgt unveraendert direkt danach.)

================================================================================
AENDERUNG 2 - Paragraph 4.1 Shared Components (drei Zeilen aktualisieren)
================================================================================

- Zeile TimesheetForm.tsx: Versionsangabe 7.4.6-81 -> **7.4.6-83** und am Ende der
  Beschreibung anfuegen:

  ; **v7.4.6-82/-83 (Session 77): AP-Angebot zeitlich getrennt. Neuer monatsgenauer
  Startmonats-Filter hasAPStarted - "Zugeordnete AP" (automatisch angezeigt) erscheinen
  erst ab wp.start_date-Monat (Dropdown + Vorbelegung). "Weitere AP" bewusst OHNE
  Zeitfilter (jederzeit vollstaendig, fuer vorgezogene/uebernommene APs). Obergrenze
  end_date+2 Monate bei zugeordneten APs entfernt - waehlbar solange offene Stunden
  (planned-booked>0). -82 hatte den Filter versehentlich auch auf "Weitere AP" gelegt,
  -83 korrigiert das.**

- Zeile ApStatusModal.tsx: Versionsangabe -> **1.0-11** und anfuegen:

  ; **v1.0-11 (Session 77): "gesamt"-Spalten (geplant/gebucht/offen) = Summe der auf 2
  Stellen gerundeten MA-Werte statt total_person_months x hoursPerPM; behebt die
  0,01h-Rundungsreste aus dem periodischen PM-Faktor. Reine Anzeige, keine Datenwirkung.**

- Zeile FirmaCockpit.tsx (-> **7.4.9-36-11**) und ProjektFortschrittPanel.tsx
  (-> **7.4.5-26**): jeweils anfuegen:

  ; **(Session 77) Prognose-"Basis"-Text auf "Plan-Erfuellung XX% (Ist/Soll bis heute)"
  umgestellt (neues Feld erfuellungsgrad aus den utils).**

================================================================================
AENDERUNG 3 - Paragraph 4.2/Lib projektfortschritt-utils.ts
================================================================================

Versionsangabe -> **7.4.9-6** und anfuegen:

  ; **v7.4.9-6 (Session 77): Zielerreichungs-Prognose auf PLANERFUELLUNG umgestellt.
  prognostizierteGesamtStunden = Ist(abgeschlossene Monate) + Rest-Soll(aktueller +
  kuenftige Monate) x Erfuellungsgrad; Erfuellungsgrad = Ist/Soll der abgeschlossenen
  Monate (gekappt [0,1.15]). AP-genaue Soll-Verteilung sollMonatMap zentral vorberechnet
  (auch vom Monatsverlauf genutzt). Prognoselinie im Chart folgt geplantem Soll x
  Erfuellungsgrad. Neues Rueckgabefeld erfuellungsgrad. Ersetzt die flache
  3-Monats-Tempo-Fortschreibung, die den normalen Projektauslauf faelschlich als
  "gefaehrdet" auswies. Ampel-Schwellen unveraendert (>=90% gruen, >=60% gelb, sonst rot).**

================================================================================
AENDERUNG 4 - Paragraph 12.1 Anforderungsliste (drei neue Zeilen ans Tabellenende)
================================================================================

  | A-052 | Timesheet: zugeordnete APs erst ab ihrem geplanten Startmonat anbieten (nicht ab Projektbeginn); "Weitere AP" jederzeit vollstaendig fuer vorgezogene/uebernommene APs | Martin (Faelle AURA/GMM: Oezalp, Fells) | Session 77 | Erledigt | 10.08.2026 | TimesheetForm v7.4.6-82/-83: Startmonats-Filter hasAPStarted nur fuer "Zugeordnete AP"; Obergrenze end_date+2M entfernt (waehlbar solange offene Stunden); "Weitere AP" ohne Zeitfilter. Details GIT-SICHERUNG-v7_9_5-session77.md. |
  | A-053 | AP-Status-Uebersicht: "gesamt"-Spalten muessen spaltenweise mit den MA-Spalten aufgehen (keine 0,01h-Rundungsreste) | Martin (AURA/GMM) | Session 77 | Erledigt | 10.08.2026 | ApStatusModal v1.0-11: gesamt = Summe der auf 2 Stellen gerundeten MA-Werte (geplant/gebucht/offen); Ursache periodischer PM-Faktor 173,3333. Reine Anzeige. Details GIT-SICHERUNG-v7_9_5-session77.md. |
  | A-054 | Zielerreichungs-Prognose darf den planmaessigen Projektauslauf nicht als "gefaehrdet" ausweisen; sie soll die Planerfuellung messen | Martin (AURA/GMM: 83% Laufzeit/82% PM/86% Kosten faelschlich "gefaehrdet") | Session 77 | Erledigt | 10.08.2026 | projektfortschritt-utils v7.4.9-6: Prognose = Ist(abgeschl.) + Rest-Soll x Erfuellungsgrad (Ist/Soll bis heute); Cockpit-Labels "Plan-Erfuellung XX%". Schwellen unveraendert. Details GIT-SICHERUNG-v7_9_5-session77.md. |

================================================================================
AENDERUNG 5 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.38 | 10.08.2026 | Session 77 (V7.9.5, reine Frontend-Korrekturen, kein SQL): (1) Timesheet-AP-Angebot zeitlich getrennt - "Zugeordnete AP" (automatisch angezeigt) erst ab wp.start_date-Monat, "Weitere AP" jederzeit vollstaendig ohne Zeitfilter (vorgezogene/uebernommene APs); Obergrenze end_date+2M bei zugeordneten APs entfernt (waehlbar solange offene Stunden). TimesheetForm v7.4.6-82/-83 (Startmonats-Filter hasAPStarted; -82 legte ihn faelschlich auch auf "Weitere AP", -83 korrigiert). A-052. (2) AP-Status "gesamt"-Spalten = Summe der auf 2 Stellen gerundeten MA-Werte statt total_person_months x hoursPerPM; behebt 0,01h-Reste aus periodischem PM-Faktor. ApStatusModal v1.0-11. A-053. (3) Zielerreichungs-Prognose auf Planerfuellung statt flachem 3-Monats-Tempo: Prognose = Ist(abgeschl.) + Rest-Soll x Erfuellungsgrad (Ist/Soll bis heute); AP-genaue sollMonatMap zentral; Prognoselinie folgt geplantem Soll x Erfuellungsgrad; neues Feld erfuellungsgrad; Cockpit-Basis-Text "Plan-Erfuellung XX%". projektfortschritt-utils v7.4.9-6, FirmaCockpit v7.4.9-36-11, ProjektFortschrittPanel v7.4.5-26. Ampel-Schwellen unveraendert. A-054. Deploy: Merge v7-dev->main (--no-ff), push origin+cubintec, Vercel. Details GIT-SICHERUNG-v7_9_5-session77.md. |

================================================================================
Hinweis: Paragraph 5 (Bekannte Fehler) - Themen 2 und 3 sind Bugfixes, aber Anzeige-/
Rechenkorrekturen ohne offenen Restfehler; kein Eintrag noetig. Verhaltensvertrag
TimesheetForm (12e.1): Thema 1 praezisiert die AP-Auswahl (Startmonats-Untergrenze fuer
zugeordnete APs, "Weitere AP" unveraendert offen) - kein Vertrag gebrochen.
================================================================================
