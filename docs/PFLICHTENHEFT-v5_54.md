# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 5.54
**SW-Release:** V7.9.20
**Datum:** 21. Oktober 2026
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben
**Dokumentform:** Gesamtfassung, konsolidiert am 21.10.2026 aus PFLICHTENHEFT-v5_36.md und den Aenderungsbloecken v5.37 bis v5.54. Ab hier wird nur noch diese Datei fortgeschrieben (Paragraph 17.4).
**Status:** Session 93 (20./21.10.2026): **V7.9.20 in PRODUKTION - "sonstige Arbeiten" ohne Reststunden, Verwendungsnachweis mit demselben Stundensatz wie die ZA.** Im Stundennachweis werden "sonstige Arbeiten" nur noch an Arbeitstagen ohne Projektstunden und ohne Abwesenheit automatisch eingetragen, und zwar mit einer vollen Tagesarbeitszeit oder gar nicht. Der Verwendungsnachweis skaliert den kalkulatorischen Stundensatz nicht mehr mit der Wochenarbeitszeit; Anspruch und Anforderungen stimmen bei AURA (OpenZ) wieder ueberein. Zwei Deploys am 20.10.2026, kein SQL. Zuvor (Session 92): Session 92 (12.10.2026): **V7.9.19 in PRODUKTION - Verwendungsnachweis mit bewilligter Zuwendung, Querspruenge ZA/VN/Stundenerfassung, ZA bleibt nach dem Speichern offen.** Der Kopf des Verwendungsnachweises zeigt die bewilligte Zuwendung und eine Zeile "Ausschoepfung der bewilligten Zuwendung" (Anspruch lt. VN, angefordert lt. ZA, verbleibend, Balken). Im Berater-Portal sind ZA, Verwendungsnachweis, Stundennachweis-Matrix und Stundenerfassung direkt untereinander erreichbar; "Zurueck" fuehrt jeweils auf die Ausgangsseite. "ZA speichern" laedt danach die gespeicherte ZA statt eines leeren Neu-Entwurfs. Drei Deploys an einem Tag, kein SQL. Zuvor (Session 91): Session 91 (03.10.2026): **V7.9.18 in PRODUKTION - PDF-Dateiname der Stundennachweise mit Vorname.** Der vom Browser vorgeschlagene Dateiname lautet jetzt "<Nachname><Vorname>_<FKZ>_Stundennachweis_<YYMM>" (bisher nur der Nachname). Mitarbeiter mit gleichem Nachnamen sind damit unterscheidbar. Gilt fuer den Einzeldruck und den Sammeldruck mit einem Mitarbeiter; der Sammeldruck mehrerer Mitarbeiter bleibt ohne Namensteil. Reine Namensbildung, kein Layout, keine Rechen- oder Speicherlogik beruehrt. Zuvor (Session 90): Session 90 (02.10.2026): **V7.9.17 in PRODUKTION - Direktspruenge fuer die ZA-Bearbeitung (Berater).** Aus der Anlage 1a fuehrt ein Klick auf einen Monat in die Stundenerfassung dieses Mitarbeiters und Monats, "Zurueck" dort wieder auf dieselbe ZA und denselben Tab. Neuer Knopf "Stundennachweis-Matrix" in der ZA, neuer Knopf "Zahlungsanforderung" in der Bedienleiste der Matrix (ersetzt den Link "ZA" in der Kopfzeile). Reine Navigation, keine Rechen- oder Speicherlogik beruehrt. Zuvor (Session 89): Session 89 (22.09.2026): **V7.9.16 in PRODUKTION - kritischer Fix ZAPanel.** Seit V7.9.15 konnte "ZA speichern" beim ersten Aufruf der ZA-Seite die markierte ZA mit der Vorbelegung einer neuen ZA ueberschreiben (PROD: GMM/AURA ZA 1, per SQL aus dem eingereichten Formular wiederhergestellt). Betragseingabe: Punkte werden ignoriert. Rueckfragen vor dem Ueberschreiben eingereichter ZA. Zuvor (Session 88): Session 88 (21.09.2026): **V7.9.15 in PRODUKTION - Zahlungseingaenge als Liste.** Anlass: Freund/ANOVIA, eine Ueberweisung des Projekttraegers (13.03.2026, 12.128 EUR) deckte Korrektur-ZA 1 und ZA 2 ab; PZE zeigte Scheindifferenzen +/-6.700. Neue Tabelle v7_za_zahlungen (Zahlung haengt an der ZA-Nummer), Migration in DEV und PROD, Sammelueberweisung im Archiv. Freund in PROD aufgeteilt: ZA 1 8.275 (1.575 + 6.700), ZA 2 5.428, Differenzen 0. Korrektur-Versionierung (Teil A) folgt als Etappe 3. Zuvor (Session 87): Session 87 (21.09.2026): **V7.9.14 in PRODUKTION - Korrekturen zu V7.9.13.** Das Projektende von ANOVIA war in den Stammdaten faelschlich mit 30.08.2026 erfasst; richtig ist der 31.08.2026 (Korrektur durch Martin). Damit waren die Projektstunden vom 31.08. zulaessig. Martin hat sie aus einem gesicherten PDF des August-Stundenblatts wiederhergestellt (Stand vor dem 19.09.: 586,00 h T / 27,00 h NT Jul/Aug) - der eingereichte Betrag der ZA Jul/Aug (14.593 EUR) ist damit exakt reproduzierbar. Der taggenaue Abrechnungsfilter (A-074) bleibt als Code richtig. Weitere Korrekturen: ZA-Anforderung wieder auf ganze Euro (Originalformular); VN-Berichtszeitraum fest aus den Projektdaten. Die ZA-Luecke Mai/Juni 2026 (A-081) hat Martin durch Neuanlage einer ZA geschlossen (jetzt 5 ZA). Zuvor (Session 86): Session 86 (19.-21.09.2026): **V7.9.13 in PRODUKTION - Verwendungs- nachweis und taggenaue Abrechnung.** Ausloeser: Beim VN von ANOVIA (16KN124596, ZIM DS) fehlte in Abschnitt B der Eigenanteil; bei der Pruefung ergab sich, dass Kosten x 30 % und Kosten - Zuwendung verschiedene Werte lieferten. Ursachen: (1) B summierte die je ZA eingefrorenen Foerderbetraege statt den Anspruch aus A abzuleiten; (2) Stunden wurden in ZA und VN ueber GANZE Kalendermonate gefiltert - aus 01.07.-30.08.2026 wurde "Juli und August komplett", der 31.08. (ausserhalb der Bewilligung) wurde abgerechnet: 17 h, 390,42 EUR Zuwendung zu viel in ZA 4; (3) der Foerderbetrag wurde auf ganze Euro gerundet, obwohl die Formularspalten "[EUR, Cent]" verlangen; (4) die Eingabe war nur monatsweise begrenzt, der 31.08. blieb fuer Projektstunden bebuchbar. Alles behoben, in PROD verifiziert. Nebenbefund: die Luecke Mai/Juni 2026 zwischen ZA 3 und ZA 4 (A-081, Klaerung durch Martin). Zuvor (Session 85): Session 85 (17.09.2026): **V7.9.12 in PRODUKTION - Monatsstatus Stundennachweis.** Gemeldet bei AS System/HEATS: Schulz Juni 2026 ohne Projektstunden, nur "sonstige Arbeiten", nicht abgeschlossen, aber in der Matrix gruen. Ursachen: automatische Vollstaendig-Wertung zaehlte nicht foerderbare Stunden, den laufenden Monat (vorbelegte Tage bis Monatsende), Wochenend-/Feiertagseintraege und Feiertage doppelt; zentrale Abwesenheiten fehlten. Neu: dunkelgruen "Abgeschlossen" nur per Button, hellgruen "Erfasst (nicht abgeschlossen)", laufender Monat nie automatisch (A-072, Matrix und Mein Status). Zusaetzlich: "Monat abschliessen" speicherte nur bei hasChanges - die Auto-Vorbelegung "sonstige Arbeiten" ging bei unberuehrten Monaten verloren (A-073, Duehrkop/AURA). Verhaltensvertrag v1.4. Zuvor (Session 84): Session 84 (11.09.2026): **VERHALTENSVERTRAG v1.3 - DOKUMENTATION, KEIN CODE-RELEASE - Softwarestand unveraendert V7.9.11 (in PRODUKTION).** Paragraph 12e um zwei Komponenten-Vertraege erweitert: Kapazitaetsplanung (KP-01..04) und FZul-Detailseite/BSFZ-Export (FD-01..08). Dazu PF-09 (gemeinsamer Bezugsrahmen von Erreichungsgrad und Verschenkt), IF-09 (Monatsverlauf in zwei Implementierungen), IF-10 (is_billable = true bei "gefoerdert") und IF-11 (Fehlerauswertung, Datumsgrenzen) sowie je ein fragiler Bereich bei TimesheetForm und FirmaCockpit. Jede neue Regel wurde gegen den deployten Code geprueft; dabei zwei offene Anforderungen aufgenommen: A-070 (BSFZ-Export fuellt das Tagesraster auch ausserhalb der Vorhabenmonate; PROD derzeit ohne Wirkung) und A-071 (Ladefehler auf der FZul-Detailseite und im Export werden still als 0 behandelt). Arbeitskopie VERHALTENSVERTRAG-v1_3-2.md. Zuvor in V7.9.11 (Session 83): Session 83 (11.09.2026): **FZUL-DETAILSEITE UND BSFZ-EXPORT KORRIGIERT - V7.9.11 (in PRODUKTION).** Kein SQL. Drei Fehler im selben Lesepfad (/v7/berater/multiprojekt/[id] und /api/export/fzul): (1) A-067 - zentrale Abwesenheiten (v7_employee_absences, U/K/S/E) wurden nicht gelesen; an Abwesenheitstagen wurden volle FZul-Stunden angeboten und exportiert. Jetzt in Uebersicht, Import, Jahreskalender und Export beruecksichtigt, mitarbeiterbezogen und nur an Arbeitstagen (Mo-Fr, kein Feiertag); gespeicherte FZul-Stunden an Abwesenheitstagen (Altdaten, PROD: KAIRA 59 Tage / 303,6 h) werden rot markiert und sind korrigierbar, ohne automatische DB-Aenderung. (2) A-068 - als "gefoerdert" zaehlten alle Stunden in Foerderprojekten, auch "Nicht zuschussfaehige Arbeiten"; seit der Auto-Vorbelegung (V7.9.7) ergab das fuer jeden gespeicherten Monat 0 verfuegbare FZul-Stunden (PROD-Bestand 6.070,8 h). Jetzt nur is_billable = true. (3) A-069 - die Route schrieb Wochenarbeitszeit und Urlaubstage in nicht gelesene Zellen (C38/F39/J39), die Vorlage rechnete immer mit 40 h / 30 Tagen; Krankheit, Sonderurlaub und Elternzeit fehlten. Route v2.5 schreibt E38, O39, O40 (K), O41 (S), O43 (E); die Seite zaehlt die Arbeitstage je Code. U ueber vertraglichem Anspruch nur als Hinweis im Export-Tab. Beifang: Enddatum "-31" im Uebersichts-Laden (Vorhaben mit Ende in 30-Tage-Monat oder Februar lieferten gefoerdert 0). multiprojekt-detail v7.4.8-20, api/export/fzul v2.5. A-067, A-068, A-069 erledigt. Deploy: Merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel, Tag v7.9.11. Details GIT-SICHERUNG-v7_9_11-session83.md. Zuvor in V7.9.10: Session 82 (11.09.2026): **KAPAZITAETSPLANUNG BERUECKSICHTIGT ELTERNZEIT - V7.9.10 (in PRODUKTION).** Reine Frontend-Aenderung, kein SQL. Die Kapazitaetsmatrix (/v7/berater/multiprojekt) las bisher keine Abwesenheiten; ein Mitarbeiter in Elternzeit erschien mit voller Monatskapazitaet (Echtfall Flensburger Yacht-Service, April 2026: 160 h statt 48 h). Neu: E-Tage aus v7_employee_absences werden geladen; gezaehlt werden nur E-Tage, die Arbeitstage sind (Mo-Fr, kein Feiertag), weil der Bereichsdialog E auch auf Feiertage schreibt. Monatskapazitaet = (Arbeitstage minus E-Arbeitstage) x (WAZ / 5). Die Ampel-Prozente beziehen sich auf die VOLLE Monatskapazitaet ohne Elternzeit (Entscheidung Martin). Ein Monat vollstaendig in Elternzeit erscheint als hellblaue Zelle "E" statt Ampel; sind in diesem Monat trotzdem Arbeitsplan-Stunden geplant, ist das E rot und der Tooltip warnt. Tooltip mit Zeile "Elternzeit (E), n Arbeitstage: -x h" und "Verfuegbar". Fuer Mitarbeiter ohne E-Tage sind alle Werte unveraendert. berater-multiprojekt-page v7.4.8-29. A-065. Neu als offen: A-066 (Elternzeit ausserhalb der Projektlaufzeit per UI nicht entfernbar), A-067 (FZul-Detailseite liest die zentrale Abwesenheitstabelle nicht). Deploy: Merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel, Tag v7.9.10. Details GIT-SICHERUNG-v7_9_10-session82.md. Zuvor in V7.9.9: Session 81 (09./10.09.2026): **DATEINAMEN-SCHEMA, VERSCHENKT-KORREKTUR UND ENTSCHLACKTER MONATSVERLAUF - V7.9.8 und V7.9.9 (in PRODUKTION).** Drei reine Frontend-Themen, kein SQL. (1) Stundennachweis-PDFs heissen einheitlich "<Nachname>_<FKZ>_Stundennachweis_<YYMM>"; beim Sammeldruck mehrerer Mitarbeiter entfaellt der Namensteil, bei mehrmonatiger Auswahl wird der Zeitraum als YYMM-YYMM geschrieben. Einzel- und Sammeldruck verwenden erstmals dasselbe Schema. (2) "Verschenkt" in den Foerder-Konsequenzen wurde gegen die BEWILLIGTE SUMME gemessen, obwohl die Foerderprognose zuvor auf die Plankosten gedeckelt wird. Liegt der Arbeitsplan unter der Bewilligung, stand dadurch auch bei 100 Prozent Erreichungsgrad dauerhaft ein Verschenkt-Betrag - ein Widerspruch in sich, denn wer den Plan voll erfuellt, verschenkt definitionsgemaess nichts. Massstab ist jetzt das, was der Arbeitsplan bei voller Erfuellung hergibt; die Differenz zwischen Bewilligung und Arbeitsplan wird als eigener Block "Planungsluecke im Arbeitsplan" ausgewiesen, nur wenn sie besteht. (3) Im Monatsverlauf entfallen die gestrichelten Linien "Soll kumuliert" und "Zieltempo kumuliert"; es bleiben "Ist kumuliert" (durchgezogen) und "Prognose kumuliert" (gestrichelt). Die Fussnote benennt jetzt, dass die Ist-Saeulen nach BUCHUNGSMONAT zaehlen, waehrend der AP-Status je ARBEITSPAKET zaehlt - beide Sichten weichen im Einzelmonat regelmaessig voneinander ab, ohne dass ein Fehler vorliegt. Der Prognose-Algorithmus selbst ist unveraendert. TimesheetForm v7.4.6-97, StundennachweisMatrix v7.4.6-16, projektfortschritt-utils v7.4.9-16, ProjektFortschrittPanel v7.4.5-34, FirmaCockpit v7.4.9-36-15. A-062, A-063, A-064. Deploy: Merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel. Details GIT-SICHERUNG-v7_9_9-session81.md. Zuvor in V7.9.7: Session 81 (09.09.2026): **DOKUMENTATIONS-NACHTRAG, KEIN CODE-RELEASE - Softwarestand unveraendert V7.9.7 (in PRODUKTION).** Nachgetragen wird die in Session 78 (10.08.2026) produktiv gegangene Timesheet-Aenderung, die durch eine Nummernkollision (zwei Bloecke v5.39, zwei Anforderungen A-055) nie ins konsolidierte Pflichtenheft gelangt ist: Fuer die AUTOMATISCH angezeigten "Zugeordnete AP" gilt wieder eine Obergrenze, jetzt START-BASIERT. Ein zugeordnetes AP wird nur noch automatisch angezeigt bzw. vorbelegt, wenn sein geplanter Startmonat hoechstens 3 Kalendermonate vor dem gewaehlten Timesheet-Monat liegt (monthsSinceStart <= 3). Fachliche Grundlage: ein AP ist laut Foerderrichtlinie auf max. 3 PM begrenzt und dauert damit nie laenger als rund 3 Kalendermonate. Die Reststunden-Pruefung (planned - booked > 0) bleibt als zusaetzliches UND erhalten. Behoben wurde damit, dass laengst abgeschlossene APs vom Projektanfang (z.B. AP 1.1 Anforderungsanalyse, Start 05/2025) mit blossem Rundungsrest (0,01 h offen) noch >1 Jahr spaeter automatisch im Stundennachweis erschienen. Die Regel ersetzt die in V7.9.5/A-052 ersatzlos entfallene Obergrenze end_date + 2 Monate. "Weitere AP" bleibt unveraendert OHNE Zeitfilter jederzeit vollstaendig waehlbar - spaete legitime Nachbuchungen sind weiter moeglich, aber ein bewusster Schritt. Die Untergrenze (hasAPStarted, ab wp.start_date-Monat) aus V7.9.5 bleibt unveraendert. Eingefuehrt mit TimesheetForm v7.4.6-84; die Regel ist in allen Folgebuilds bis v7.4.6-96 unveraendert enthalten. A-061. Kein Deploy noetig. Zuvor in V7.9.7: Session 81 (08./09.09.2026): **ELTERNZEIT (CODE E), WAZ-QUELLE VEREINHEITLICHT, BUNDESLAND-FIX, SONSTIGE ARBEITEN IMMER ALS DIFFERENZ - V7.9.7 (in PRODUKTION).** Vier Themenbloecke, ein SQL-Schritt. (1) FirmendatenCard v7.4.6-2: Bundesland-Dropdown arbeitete mit Langnamen, die Firmen-Neuanlage speichert ISO-Codes ('DE-SH') - das Feld stand beim Bearbeiten auf "-- Bitte auswaehlen --". Jetzt ISO-Codes als Option-Werte, Vorbelegung ueber normalizeStateCode, Anzeige im Klartext. (2) Abgrenzung Stammsatz/pWAZ: fuer alles Zeitliche sind ausschliesslich v7_employee_hours_history -> v7_employees.weekly_hours -> Firmenstandard massgeblich; die pWAZ in v7_project_assignments ist der Nenner der Anlage-6.1-Stundensatzkalkulation und bleibt Antragswert. TimesheetForm v7.4.6-88 (Quellenangabe an der WAZ-Anzeige), ProjectTeamManager v7.4.4-20 (Divergenz-Hinweis, kein Schreibzugriff). Zwischenstand v7.4.6-87 (pWAZ-Vorrang) wurde bewusst zurueckgenommen. (3) Elternzeit als neuer Abwesenheitscode 'E' mit 0 Stunden: SQL-Constraint in DEV und PROD erweitert; TimesheetForm v7.4.6-89 bis -93 (Schutz im Speicherpfad, Lesepfad und Tagessperre, Sperre auch der Fehlzeit-Zeilen, Bereichsdialog zum Erfassen und Entfernen, Rechtsklick-Fix), stundennachweisSheetData v1.0.2 und StundennachweisSheet v1.0.4 (E-Zeile im Sammeldruck). Vom Projekttraeger VDI am 08.09.2026 bestaetigt. (4) "Sonstige Arbeiten" sind immer die Differenz aus Tagesarbeitszeit und gebuchten Stunden und werden nie eingefroren; einheitliches Zahlenformat in allen Stundenzellen. TimesheetForm v7.4.6-94/-95/-96 (Endstand -96). Deploy: Merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel; main = 17d2bfe, Release-Tag v7.9.7 auf beiden Remotes. Details GIT-SICHERUNG-v7_9_7-session81.md. Zuvor in V7.9.6: Session 80 (27.08.2026): **NWM-JAHRESSELEKTOR FORTSCHRITT/PROGNOSE, FZ-BASIERTE FOERDERQUOTE MIT GRENZVALIDIERUNG - V7.9.6 (in PRODUKTION).** Zwei Themenbloecke fuer NWM-Projekte (ZIM_NETZWERK), kein SQL. (1) Neuer Dropdown-Selektor "Netzwerkjahr" im Projektfortschritt (Berater-Cockpit) und in der Analyse (Firma-Cockpit). Zeigt alle Foerderzeitraeume aus v7_nwm_foerderzeitraeume + "Gesamtverlauf". Fortschritt und Prognose werden auf den gewaehlten Zeitraum eingeschraenkt. Firma-Cockpit erkennt NWM automatisch und waehlt das aktuelle Netzwerkjahr vor. ProjektFortschrittPanel v7.4.5-33, cockpit-fortschritt-page v7.4.9-9, FirmaCockpit v7.4.9-36-14. (2) Die Foerderquote in ZAPanel und NWMEigenanteilPanel wird jetzt direkt aus der v7_nwm_foerderzeitraeume-Tabelle ermittelt (Abgleich zeitraum_bis gegen FZ-Bereiche) statt per Datumsarithmetik (calcLaufzeitjahr + foerdersatz_stufen). Neue FZ-Grenzueberschreitungs-Validierung: wenn zeitraum_von und zeitraum_bis in verschiedene Foerderzeitraeume mit unterschiedlichen Foerderquoten fallen, wird das Speichern/Berechnen blockiert mit roter Fehlermeldung - eine Aufteilung in zwei getrennte ZAs/EAs ist erforderlich. Alte Datumsarithmetik als Fallback fuer Projekte ohne FZ-Daten erhalten. ZAPanel v7.4.4-68/-69 (Endstand -69), NWMEigenanteilPanel v7.4.5-13. Deploy: Merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel. Details GIT-SICHERUNG-v7_9_6-session80.md. Zuvor in V7.9.5: Session 77 (10.08.2026): **TIMESHEET-AP-ANGEBOT ZEITLICH BEGRENZT, AP-STATUS-RUNDUNGSABGLEICH, PROJEKTFORTSCHRITT-PROGNOSE AUF PLANERFUELLUNG - V7.9.5 (in PRODUKTION).** Drei reine Frontend-Korrekturen, kein SQL. (1) Im Timesheet werden einem MA ZUGEORDNETE APs erst ab ihrem geplanten Startmonat (wp.start_date) angeboten (Dropdown + Vorbelegung), nicht mehr ab dem ersten Projektmonat - verhindert Fehlbuchungen auf noch nicht angelaufene APs. Die Liste "Weitere AP" bleibt bewusst OHNE Zeitfilter jederzeit vollstaendig waehlbar (fuer vorgezogene/uebernommene APs, wenn ein Vorgaenger-AP frueher fertig ist). Zugleich entfaellt die bisherige Obergrenze (end_date + 2 Monate) bei den zugeordneten APs: solange Stunden offen sind, bleibt ein AP waehlbar, auch nach seiner geplanten Laufzeit. (2) In der "Alle AP"-Statusuebersicht gehen die "gesamt"-Spalten (geplant/gebucht/offen) jetzt spaltenweise exakt auf - gesamt = Summe der auf 2 Stellen gerundeten MA-Werte; die frueheren 0,01h-Reste aus dem periodischen PM-Faktor (173,3333...) entfallen. (3) Die Zielerreichungs-Prognose misst nicht mehr das absolute Monatstempo der letzten 3 Monate, sondern die PLANERFUELLUNG: Prognose = Ist(abgeschlossene Monate) + Rest-Soll(aktueller + kuenftige Monate) x Erfuellungsgrad (Ist/Soll bis heute). Der normale Projektauslauf loest damit keine Fehlwarnung "gefaehrdet" mehr aus; echtes Zurueckfallen (Ist << Soll) fuehrt weiterhin zu Gelb/Rot. Ampel-Schwellen unveraendert. TimesheetForm v7.4.6-82/-83 (Endstand -83), ApStatusModal v1.0-11, projektfortschritt-utils v7.4.9-6, FirmaCockpit v7.4.9-36-11, ProjektFortschrittPanel v7.4.5-26. Deploy: Merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel. Details GIT-SICHERUNG-v7_9_5-session77.md. Zuvor in V7.9.4: Session 76 (08.08.2026): **TIMESHEET-RESTANZEIGE UMSCHALTBAR (MONATSENDE / GESAMT) - V7.9.4 (in PRODUKTION).** Die rechte "+/-"-Spalte im Timesheet zeigt je zugeordnetem AP die noch offenen Stunden (gruen) bzw. die Ueberbuchung (rot). Bisher immer die PROJEKTWEIT offene Zahl (geplant minus gebucht ueber ALLE Monate). NEU umschaltbar auf "Monatsende": noch offene Stunden am Ende des angezeigten Monats (kumuliert bis inkl. dieses Monats, spaetere Monate nicht abgezogen) - nuetzlich fuer nachtraegliche Korrekturen und das Verlaufslesen (Beispiel geplant 300; Jan 250, Feb 170, Maer 70 ... statt ueberall 0 bei ausgebuchtem AP). Reine ANZEIGE, keine Datenwirkung; die "Alle AP"-Gesamtuebersicht bleibt bei der bisherigen Anzeige, ebenso die blaue projektweite Restzahl nicht zugeordneter MA. Umschalter = dezenter KREISPFEIL in der Kopfzelle der Rest-Spalte (ersetzt den bedeutungslosen Text "+/-"): Ruhe grau = Monatsende (Default), Klick aktiviert "gesamt" mit gruenem Chip (Tooltip je Zustand); print:hidden. DEFAULT ohne gespeicherte Wahl = "monatsende" (Wunsch Katrin); eine bereits gespeicherte persoenliche Wahl bleibt unangetastet. Persistenz PRO NUTZER in der NEUEN Tabelle v7_user_preferences (settings.timesheet_rest_modus jsonb) - geraeteunabhaengig; Details Paragraph 2.11. TimesheetForm v7.4.6-79/-80/-81 (Endstand -81). DB: SQL-MIGRATION-user-preferences-v1.sql (DEV + PROD). Deploy: Merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel. Details GIT-SICHERUNG-v7_9_4-session76.md. Zuvor in V7.9.3: Session 75 (07.08.2026, Forts.): **AP-STATUS-DRUCK ROBUST (EIGENES DRUCKFENSTER) - V7.9.3 (in PRODUKTION).** Der AP-Status-Druck (ApStatusModal v1.0-10) laeuft jetzt ueber ein eigenes, sauberes Druckfenster: beim Klick auf "Drucken" wird die fertig gerenderte Tabelle inkl. aller aufgeklappten Monatszeilen in ein neues Fenster kopiert, das NUR die Tabelle enthaelt und die Tailwind-Stylesheets der App uebernimmt (Rahmen/Farben stimmen). Grund: die In-Place-Druckvarianten (v1.0-4..-9) erzeugten in PROD mit echten Daten Artefakte - zuletzt zwei identische Seiten (Tabelle dupliziert statt umgebrochen), weil das Modal tief im App-Layout haengt. Im eigenen Fenster bricht die Tabelle zuverlaessig ueber mehrere Seiten um (Kopfzeile je Seite), und "An Seitenbreite anpassen" skaliert sie voll aufs A4-Querformat. Nur Anzeige/Export, keine Datenaenderung; funktioniert aus beiden Zugaengen (Timesheet und Matrix). Zuvor in V7.9.2: **AP-STATUS DRUCKEN/PDF - V7.9.2 (in PRODUKTION).** Der AP-Status (zentrale ApStatusModal, jetzt v1.0-7) hat einen "Drucken"-Knopf: er oeffnet den Browser-Druckdialog zum direkten Drucken ODER "Als PDF sichern". Der Druck laeuft im Querformat und fuellt die Seitenbreite AUTOMATISCH - beim Drucken wird die tatsaechliche Tabellenbreite gemessen und per CSS-zoom auf die nutzbare A4-Querformat-Breite gebracht (wenige MA groesser, viele MA kleiner); zoom statt transform, damit der Seitenumbruch korrekt mitzieht. Lange Listen brechen nach unten auf mehrere Seiten um (Kopfzeile je Seite, Zeilen nicht mittig getrennt), und fuer den Druck werden alle mehrmonatigen APs automatisch aufgeklappt (die Bildschirm-Auswahl bleibt unveraendert, Reset ueber afterprint). Nur Anzeige/Export, keine Datenaenderung; funktioniert aus beiden Zugaengen (Timesheet und Matrix), da zentral in ApStatusModal. Zuvor in V7.9.1: **AP-STATUS SHARED-REFACTOR (A-Variante) - V7.9.1 (in PRODUKTION).** ApStatusModal (v1.0-3) ist jetzt die EINZIGE AP-Status-Uebersicht - eine zentrale Shared-Komponente mit klar definierter Schnittstelle (open, onClose, projectId, projectLabel, showMonthly, onJumpToTimesheet). TimesheetForm (v7.4.6-78) nutzt sie statt der bisherigen Inline-Kopie (rund 230 Zeilen entfallen; keine Doppelpflege der AP-Status-Tabelle mehr). StundennachweisMatrix (v7.4.6-15) mit Ruecksprung in die Uebersicht nach der Rueckkehr aus dem Timesheet (sessionStorage pze_apstatus_reopen). Das kontextabhaengige Sprung-Verhalten wird per Callback injiziert: aus dem Timesheet ein In-Page-Wechsel von MA/Monat, wobei "Zurueck" danach zuerst wieder in die Uebersicht fuehrt (symmetrischer Ruecksprung, -78); aus der Matrix eine Navigation mit automatischem Wieder-Oeffnen der Uebersicht nach Rueckkehr. showMonthly steuert das Monats-Aufklappen (Firmen-Gating). Damit ist die verbindliche Architektur-Vorgabe "alles mehrfach Genutzte an einer Zentralstelle mit klaren Schnittstellen" fuer den AP-Status umgesetzt; die zuvor nicht deployten Einzelstaende -14/-2/-77 gehen darin auf. Zuvor in V7.9.0: **AP-STATUS-ANALYSE + FEATURE-FREIGABEN - V7.9.0.** (1) **TimesheetForm v7.4.6-74:** WOCHEN-DECKEL fuer die Auto-Vorbelegung "sonstige Arbeiten" - Teilzeit-MA (z.B. 30 h/4 Tage) bekam am 5. Werktag faelschlich 6 h "sonstige", obwohl die WAZ an 4 Tagen erreicht war; jetzt laufendes Wochenkonto (Projekt + andere Projekte + Abwesenheiten + bereits gesetzte "sonstige") gegen die WAZ, Auto-Wert je Tag = min(Tagesspielraum, Wochen-Restbudget); Vollzeit unveraendert. (2) **TimesheetForm v7.4.6-75:** Monats-Aufschluesselung im "Alle AP"-Modal - mehrmonatige APs (Buchungen in >1 Monat) per Chevron aufklappbar, Unterzeilen mit gebucht je MA je Monat; folgt den tatsaechlichen Buchungsmonaten. (3) **AP-STATUS-ANALYSE Stufe 1-3:** Stufe 1 - StundennachweisMatrix v7.4.6-12: je Monatszelle die gebuchte Monats-Stundenzahl je MA als kleine Zahl (nur FOERDERBARE Stunden, is_billable=true; wichtig bei GF-50%), fuer alle sichtbar. Stufe 2 - neue Spalte v7_client_companies.ap_analyse_firma_freigeschaltet (boolean, Default false; DEV+PROD, SQL-MIGRATION-ap-analyse-firma-freigabe-v1.sql) + Admin-Schalter (SystemConfigPanel, nur system_admin). Stufe 3 - eigenstaendige Komponente **ApStatusModal v1.0-1** (laedt Daten selbst per projectId) + Button "AP-Status" in der Matrix (StundennachweisMatrix v7.4.6-13); Gating (TimesheetForm v7.4.6-76: Monats-Aufklappen nur Berater bzw. freigeschaltete Firma); Firmen-Elternseiten reichen das Flag durch (BerichtePage v7.4.6-24 -> Matrix, zeiterfassung-page v7.4.6-5 -> TimesheetForm). (4) **SystemConfigPanel v7.4.4-5:** Firmen-Freigaben als MATRIX (Zeilen Firmen, Spalten Features - VN, AP-Status; Toggle je Zelle, sofort gespeichert), erweiterbar ueber featureDefs-Array; Cockpit/Anleitungen bleiben separat. Deploy V7.9.0: SQL zuerst DEV+PROD, dann Frontend-Merges v7-dev->main (--no-ff), push origin + cubintec, Vercel. **ARCHITEKTUR-ENTSCHEIDUNG (verbindlich):** Was von mehreren Stellen genutzt wird, gehoert an EINE zentrale Shared-Komponente mit klar definierten Schnittstellen - keine Doppelentwicklung. Konsequenz (naechster Schritt, beauftragt): TimesheetForm nutzt kuenftig ApStatusModal statt seines Inline-Modals; Sprung-Verhalten wird per Callback (onJumpToTimesheet) injiziert. Der bereits gebaute Direktsprung (ApStatusModal v1.0-2 / StundennachweisMatrix v7.4.6-14) ist bewusst NOCH NICHT deployt und geht in diesen Refactor auf. Details GIT-SICHERUNG-v7_9_0-session75.md.
**Aeltere Sessions:** Session 75 (06.08.2026, Teil 1): **ZA-UEBERSETZUNGSSCHUTZ + AP-STATUS MA-UEBERSICHT - V7.8.2.** (1) **ZAPanel v7.4.4-64:** Die drei amtlichen ZA-Dokumentcontainer (Deckblatt, Anlage 1a, Anlage 1b - je #za-print-area) sind per translate="no" + class notranslate von der Browser-Uebersetzung ausgenommen. Behebt die nutzerabhaengig verdrehte Monatsdarstellung in Anlage 1a ('25 Dez' statt 'Dez. 25'): der Code erzeugt die Labels bereits fest via toLocaleString('de-DE') - das Umdrehen kam allein aus einer Uebersetzungsschicht im Browser der Anwenderin (Chrome-Seitenuebersetzung / Immersive Translate). Fuer korrekt sehende Nutzer byte-identisch; Druck-Logik unberuehrt; keine Daten-/Logikaenderung. (2) **TimesheetForm v7.4.6-66..-73:** 'Alle AP'-Modal (AP-Status) um eine MA-Aufschluesselung erweitert, damit der Berater fehlerhafte Firmenbuchungen je Mitarbeiter erkennen/korrigieren kann. Je Gruppe (geplant/gebucht/offen) zuerst 'gesamt', dann eine Spalte pro Projekt-Team-MA (Kopf 'V.Nachname'); ALLE Werte in STUNDEN. geplant je MA aus v7_work_package_assignments.planned_person_months x hoursPerPM (neuer teamweiter Load, State plannedHoursPerWpPerMa), 'gesamt' bleibt AP-Soll (total_person_months); gebucht je MA aus v7_timesheets (projektweite Abfrage um employee_id erweitert, State projectBookedPerWpPerMa); offen je MA = geplant-gebucht. Layout: jede Gruppe mit dickem Rahmen, Zahlenspalten zentriert, Tabelle inhaltsbasiert (w-auto/text-xs), Modalbreite folgt der Tabelle (w-fit + max-w-[96vw]) und waechst automatisch mit der MA-Anzahl, offene Stunden gruen / ueberbucht rot. Reine Anzeige-Erweiterung, KEINE DB-/Logikaenderung; Firma- + Berater-Portal (geteilte Komponente). Deploy V7.8.2: zwei Frontend-Deploys (ZAPanel-64, TimesheetForm-73), je merge v7-dev->main (--no-ff), push origin + cubintec, Vercel; kein SQL. **LEHRE:** main muss auf BEIDE Remotes (origin UND cubintec) gepusht werden - Vercel-Production zieht aus cubintec; ein nur-origin-Push loest keinen Deploy aus. Neu verbindlich dokumentiert in DEPLOY-PROZESS-PZE.md. Details GIT-SICHERUNG-v7_8_2-session75.md.
**Aeltere Sessions:** Session 74 (05.08.2026): **PROJEKTANLAGE/FOERDERFORMATE UEBERARBEITET + TEAM-VORBELEGUNG - V7.8.1.** (1) **ProjectTeamManager v7.4.4-19:** Beim Hinzufuegen eines Mitarbeiters zum Projekt werden die in v7_employees hinterlegten Anlage-6.1-Vorgabewerte (Fix-Monatsbrutto, weitere Fixbestandteile, pWAZ, bWAZ, kalkulatorischer Stundensatz) automatisch als Startwerte ins Formular uebernommen - voll editierbar; gespeichert wird weiterhin projektbezogen auf v7_project_assignments (fix pro Projekt), das foerderrechtliche Modell bleibt unveraendert. Nebenbei totes Employee-Interface-Feld annual_salary durch die real existierenden Spalten monthly_salary + annual_bonus ersetzt. (2) **ProjectCreateForm v7.4.2-11:** Reiter 'PDF-Import (Antrag)' (nicht mehr ZIM-spezifisch benannt) steht jetzt ZUERST und ist der Standard-Reiter (Empfohlen-Badge), 'Manuell' folgt dahinter - beide Portale (Berater + Firma), da geteilte Komponente. Foerderformat-Liste: ZIM-Familie + NEU 'KMU-innovativ' (interner Code BMBF_KMU) + 'Sonstige (anderes Foerderprogramm)'; die generischen Eintraege BMBF/BMBF_DS/Verbund entfernt. 'Sonstige' blendet ein Pflicht-Freitextfeld ein -> v7_projects.funding_format_other. PDF-Reiter mit Programm-Auswahl und dreistufiger Import-Weiche: ZIM -> Upload; KMU-innovativ -> Hinweis 'PDF-Import in Vorbereitung'; Sonstige -> Hinweis 'kein Import vorgesehen'; beide mit Sprung zur manuellen Anlage; Parse-Fehler zusaetzlich mit 'Manuell anlegen'. Entscheidung: Label nach dem stabilen PROGRAMM ('KMU-innovativ'), nicht nach dem Ministerium (BMBF ist jetzt BMFTR, Name wechselt je Regierung). (3) **App-weite Umbenennung** BMBF_KMU-Label -> 'KMU-innovativ' (ministeriums-neutral): v7-types v7.4.9-4, projektfortschritt-utils v7.4.9-5, mein-status v7.4.4-18; **ProjectDetailPage v7.4.4-64** mit gleicher Foerderformat-Liste + Sonstige-Freitext (Bearbeiten) + Klartext-Label-Anzeige (Helfer fundingLabel statt Rohwert-Badge). DB (DEV+PROD): ALTER TYPE v7_funding_format ADD VALUE 'BMBF_KMU' + 'OTHER'; ALTER TABLE v7_projects ADD COLUMN funding_format_other text. Deploy: SQL zuerst in DEV+PROD, dann zwei Merges v7-dev->main (--no-ff), push origin + cubintec, Vercel-Deploy. Details GIT-SICHERUNG-v7_8_1-session74.md.
**Aeltere Sessions:** Session 73 (31.07.2026): **VN-MODUL (VERWENDUNGSNACHWEIS) UMGESETZT UND IN PRODUKTION - V7.8.0.** Der Verwendungsnachweis ist als reine Zahlenseite live: projektweite Zusammenfassung aller ZA je Projekt fuer VDI/VDE-IT. Umgesetzte Varianten: DS De-minimis, Einzel-/Kooperationsprojekt, NWM Phase 1 und Phase 2; AGVO bleibt aussen vor (direkt im PDF). Sachbericht/Teil 2 NICHT im System (wird im offiziellen PDF geschrieben) -> kein Zwischenmodus, nur Schlussnachweis-Zahlenseite. NWM aggregiert die je ZA gespeicherten Werte (nwm_personalkosten/-dritte/-uebrige, foerderbetrag_gesamt); der Foerdersatz je Laufzeitjahr (Phase 1/2 fallend) steckt bereits im gespeicherten Foerderbetrag -> Summe automatisch korrekt; zusaetzlich Eigenanteil und effektiver Misch-Foerdersatz. NEU Freigabe je Firma: v7_client_companies.vn_firma_freigeschaltet (Default false) - das Firmen-Portal zeigt den VN nur bei freigeschalteter Firma, die Berater-Seite immer (zum internen Testen); Schalter in Administration (SystemConfigPanel, nur system_admin). Layout: VN + ZA-Deckblatt auf dokumentaehnliche Breite begrenzt und zentriert (max-w-5xl mx-auto), Kopf entzerrt. DB: zwei Migrationen in DEV+PROD - SQL-MIGRATION-verwendungsnachweis-snapshot-v1.sql (Tabelle v7_verwendungsnachweise mit zahlen_snapshot, 4 RLS-Policies, beihilfe_basis abgesichert) und SQL-MIGRATION-vn-firma-freigabe-v1.sql (Freigabe-Spalte). Deploy V7.8.0: SQL zuerst in PROD, dann merge v7-dev->main (--no-ff), push origin + cubintec, Vercel-Deploy; in PROD mit echten Daten getestet (WerftScan DS De-minimis). Details GIT-SICHERUNG-v7_8_0-session73.md.
**Aeltere Sessions:** Session 72 (21.07.2026): Projekt-Kaestchen der MA-Liste im Berater-/Firmen-Cockpit fuehrt in die Stundenerfassung (reine UI/Navigation, V7.7.5). Details GIT-SICHERUNG-v7_7_5-session72.md.
**Status-Vorgaenger:** Session 67: **PRODUKTIVSETZUNG V7.6.0.** Der in Session 66 gebaute PDF-Antragsimport ist jetzt in PRODUKTION. SQL-Migration v2 auf PROD (cnnuyioklhlrfygwticf) ausgefuehrt (v7_import_projekt_team + v7_cleanup_projekt, create-or-replace), danach Code-Deploy: merge v7-dev->main (--no-ff), push origin + cubintec, Vercel-Deploy auf pze.cubintec-hub.com verifiziert. PDF-Antragsimport ('Projekt neu anlegen aus Antrag') in PROD getestet - laeuft. **ENTSCHEIDUNG: PDF-Import-Tab in Berater- UND Firmen-Portal freigegeben** (revidiert die Session-66-Ueberlegung, ihn im Firmen-Portal auszublenden; Firmen koennen den Import nutzen, in PROD bestaetigt) - keine Code-Aenderung noetig. **ASCII-Nachpflege dreier Seiten** (Rendering unveraendert; Konvention Kommentare->ae/oe/ue, String-Literale->\u-Escapes, JSX-Text->HTML-Entities): berater-multiprojekt-page v7.4.8-18, berater-fzul-page v7.4.9-3, mein-status-page v7.4.4-17. **Housekeeping:** downloads/archiv auf klares Schema code/doku/sql/skripte umgestellt (567 Altdateien einsortiert, ~40 Duplikate entfernt); Projekt-Anweisungen ueberarbeitet (Loeschen/Verschieben bleibt beim Nutzer, Session-Auftakt-Versions-Check, Struktur-Guard in Skripten, praezise ASCII-Regel, alles nach downloads); Claude legt Dateien jetzt direkt in downloads/ ab und liefert je Schritt die Terminal-Befehle mit. **NACHTRAG Session 67 (12.07., reines Housekeeping - kein Code-/DB-Deploy):** Projektwissen (PV) auf ein schlankes Briefing-Paket reduziert - 14 Dateien BEHALTEN (Pflichtenheft, GIT-SICHERUNG 66+67, acht KONZEPTe, PZE-PROJEKT-DOSSIER, VERHALTENSVERTRAG, memory.md), 88 Dateien on-demand nach downloads/ + archiv/ ausgelagert (Log PZE-Bereinigung-PV-Session67.xlsx, vollstaendiges Backup PV-Backup-Session67/). Sicherungsstand verifiziert: von den 88 hatten 16 keine Kopie in downloads/root oder archiv/ - alle 16 per git grep als LIVE in src/ bestaetigt (echte Quelldateien bzw. bei den zwei SQL-Migrationen ueber die Verwendung im Code), kein Datenverlust. Zwei Supabase-Snapshots (Stand 28.03., historisch) nach archiv/sql/, drei ASCII-Altversionen (durch -17/-3/-18 abgeloest) nach archiv/code/ gesichert. Randbefund zu pruefen: moegliche verschachtelte PZE/-Kopie im Repo (WorkPackageEditModal unter src/ UND PZE/src/). Details in GIT-SICHERUNG-v7_6_0-session67-nachtrag.md. OFFEN: Manuals-Nachzug (PDF-Antragsimport in Firma- + Berater-Anleitung); Datenhygiene Loesch-Kaskade verwaiste MA; A-034-Restpunkt (RLS-Angleich DEV/PROD); A-039, A-043; 'Assistenz GL'-Rolle (admin_assistant); Max-foerderbare-Stunden-Chip in TimesheetForm.
**Aeltere Sessions:** Session 71: ZAPanel Anzeige-Umlaute im ganzen Panel auf echte Umlaute korrigiert (V7.7.4, JSX-Text als HTML-Entities, JS-String-Literale als \u-Escapes, reine Anzeige, keine Logik/DB).
**Aeltere Sessions:** Session 66: **MEILENSTEIN PDF-Antragsimport** - komplettes Projekt (Projekt + Mitarbeiter + Team + Arbeitsplan) wird aus dem ZIM-Antrags-PDF automatisch angelegt. SW-Release **V7.6.0** (macht PZE als Produkt schluesselfertig/kommerziell vermarktbar). **STAND: in DEV fertig UND getestet, git-Commit auf v7-dev erfolgt; PROD-Deploy + PROD-Migration STEHEN NOCH AUS (naechste Session).** **Eigener TS/Node-Extraktor** (zim-antrag-extraktor v1.0-3, nur zlib+crypto, KEINE Fremd-Lib): loest verschluesselte XFA-Formular-PDFs selbst - PDF-Standard-Sicherheitshandler AES-128 (V4/R4) UND AES-256 (V5/R6), Cross-Reference- und Object-Streams inkl. inkrementeller Updates; datasets-XML byte-identisch zur pypdf-Referenz (Goldstandard, alle vier Testantraege). Verworfen: pdf-lib (scheitert an Verschluesselung/Object Streams), MuPDF (AGPL/kommerziell -> Lizenzkosten), pdf.js (nur geparste XFA). Parser: datasets -> Vertrag (Projekt/MA/Arbeitsplan) mit Kontrollsummen-Selbstcheck (Anlage 5, byte-genau reproduziert). **Foerderrechtliches Salaer-Modell (gegen PROD verifiziert):** p_kosten (Anlage 6.1) = Vollzeit-aequivalentes Monatsbrutto; tatsaechliches Monatsbrutto = round2(p_kosten * TZF); bWAZ global pro Antrag (Feld <bWAZ>, sonst aus std_satz/p_kosten zurueckgerechnet - WISE=38, EP_Heats/DS=40); pWAZ = TZF * bWAZ; Stundensatz = (p_kosten*12)/(bWAZ*52) = Antragswert std_satz; am Projekt pm_basis_weekly_hours = bWAZ. Alle Anlage-6.1-Werte projektbezogen auf v7_project_assignments (fix pro Projekt); "verknuepfen" teilt nur die Identitaet, nicht das Gehalt. Verifiziert Herrler 28,85 EUR/h, Doan 21,63 EUR/h. **Akronym** (cg_VMS_VB_KurzName bzw. aus Titel vor Gedankenstrich) -> short_name + zusaetzliches Duplikat-Signal. **Neue Route /api/v7/parse-zim** (parse-zim-route v1.0-1 + parse-zim-core v1.0-2): PDF-Upload -> Vertrag oder sprechender Fehler (KEIN_PDF/KEIN_XFA/EXTRAKTION_FEHLER/KEIN_ARBEITSPLAN), Kontrollsummen-Abweichung als Warnung. **arbeitsplan-import-Route v7.3.90-1** um JSON-Eingang erweitert (gemeinsames Backend fuer Excel UND PDF, gleiche parseAPNumber-Nummerierung; Excel-Pfad unveraendert). **ProjectCreateForm v7.4.2-7:** PDF-Import-Tab, Vorschau (Projektkopf editierbar inkl. Kurzbezeichnung; MA-Tabelle mit Dublettenabgleich, pWAZ, Stundensatz und reiner Info-Anzeige frueherer Saetze; Arbeitsplan-Matrix; Kontrollsummen-Status), Duplikat-Rueckfrage (bestehende Firmenprojekte anzeigen + Frage neu/aktualisieren, strich-tolerant + Akronym-Signal). **Uebernahme ATOMAR** ueber Server-Route /api/v7/import-antrag-neu (v1.0-1): RPC v7_import_projekt_team legt Projekt + neue MA + Team in EINER Transaktion an (Rollback bei jedem Fehler - gegen echte Postgres/PGlite getestet, inkl. Rollback- und Cleanup-Nachweis), danach Arbeitsplan ueber arbeitsplan-import; scheitert der Arbeitsplan, kompensiert RPC v7_cleanup_projekt. Mapping zim-import-mapping v1.0-3. **SQL-MIGRATION-import-projekt-team-v2.sql** (v2 = funding_format::v7_funding_format Enum-Cast) NUR auf DEV ausgefuehrt - **PROD STEHT AUS**. **Einstiegspunkt 2 ("Daten aktualisieren am bestehenden Projekt") bewusst VERWORFEN:** realistischer Fall (einzelner neuer MA) geht direkter in der UI (Team > Mitarbeiter hinzufuegen); Arbeitsplan-Aenderungen deckt der bestehende Excel-Import mit Diff-Vorschau ab; ein komplett neuer Antrag ist unrealistisch, da ein Projekt erst mit Bewilligung/FKZ angelegt wird und sich danach kaum grundlegend aendert. **ERKENNTNIS/BACKLOG (Datenhygiene):** Beim Loeschen eines Projekts bleiben neu angelegte, sonst nirgends verwendete Firmen-MA im Stamm zurueck (n.n.-Fall aus den Testlaeufen - manuell im Firmenstamm entfernt). Loesch-Kaskade fuer verwaiste MA/Zuordnungen pruefen. **OFFEN fuer naechste Session (PROD-Deploy):** SQL-Migration v2 auf PROD (cnnuyioklhlrfygwticf) ausfuehren; merge v7-dev->main + push origin+cubintec; Vercel-Deploy verifizieren; **entscheiden, ob der PDF-Import-Tab zunaechst nur im Berater-Portal sichtbar sein soll** (fruehere Vorgabe: im Firmen-Portal ausblenden, bis stabil); Upload-Checkliste (.xlsx) fuer alle Session-66-Dateien. Konzept KONZEPT-PDF-ANTRAGSIMPORT v1.5. Offen unveraendert: A-001, A-006, A-012, A-013, A-019, A-039, A-043; A-034-Restpunkt (RLS-Angleich DEV/PROD im Backlog).
**Aeltere Sessions:** Session 65: Username-Login ergaenzt (E-Mail ODER Benutzername beim Anmelden), in PRODUKTION deployt (beide Remotes origin+cubintec). NEU DB-Spalte v7_user_profiles.username (optional, global eindeutig, Format a-z0-9._- 3-20 Zeichen, Partial-Unique-Index; SQL-MIGRATION-username-login-v1.sql, DEV+PROD ausgefuehrt). **A-050 Username-Login:** Login-Seite (page.tsx 7.3.90-8) akzeptiert im bisherigen E-Mail-Feld zusaetzlich einen Benutzernamen (kein '@' -> Aufloesung ueber neue Route /api/v7/resolve-username, die ausschliesslich die zugehoerige E-Mail zurueckgibt, sonst nichts - schuetzt vor Ausprobieren existierender Namen). NEU Route /api/v7/set-username (v1.0.0): Selbstbedienung, eingeloggter Nutzer setzt/aendert NUR seinen eigenen Benutzernamen (auth.uid() aus Session-Cookie), Eindeutigkeitspruefung + DB-Unique-Index als Race-Condition-Absicherung. PortalHeader (7.3.95-15): neuer Menuepunkt "Benutzername festlegen/aendern" neben "Passwort aendern", laedt den aktuellen Benutzernamen beim Start mit. create-employee-login-route (7.3.95-3): optionales username-Feld bei der MA-Neuanlage, Vorab- und Race-Condition-Pruefung (Fehlercode USERNAME_TAKEN). Login-Erstellen-Dialog um das optionale Feld ergaenzt in BEIDEN Stellen, wie von der REGEL zu parallelen Login-Dialog-Aenderungen gefordert: EmployeeManagement (7.3.95-20, wirkt in Firmen-Portal /v7/firma/mitarbeiter UND Berater-Firma-Detailseite) UND MitarbeiterModal (1.0.3-3, FirmaCockpit App-Modus). BEWUSST NICHT umgesetzt: Admin setzt/aendert Benutzername fuer einen fremden, bereits bestehenden Account - Selbstbedienung (Benutzername vergessen -> Login per E-Mail, danach selbst neu setzen) plus die bestehende Admin-Passwort-Reset-Funktion decken den Bedarf vollstaendig ab. KEINE Vereinheitlichung der beiden strukturell unterschiedlichen Login-Dialoge (EmployeeManagement mit Verknuepfungs-Modus, MitarbeiterModal kombiniert mit Passwort-Aenderung) - bewusst zurueckgestellt (Backlog), um funktionierenden Code nicht unter Zeitdruck umzustrukturieren. NEU BACKLOG (Prio 2, noch nicht begonnen): Firmen-Portal-Rolle "Assistenz GL" fuer MA ohne Projektfunktion (Zeiterfassung aller MA + ZA bearbeiten, Berichte einsehen, MA-Stammdaten pflegen; KEINE Logins/Passwoerter vergeben, keine Projekte anlegen, keine Firmendaten aendern). KEINE DB-Migration ausser der neuen username-Spalte. Offen unveraendert: A-001, A-006, A-012, A-013, A-019, A-039, A-043; A-034-Restpunkt (RLS-Angleich DEV/PROD im Backlog). Komponenten: login-page v7.3.90-8, PortalHeader v7.3.95-15, EmployeeManagement v7.3.95-20, MitarbeiterModal v1.0.3-3, create-employee-login-route v7.3.95-3, resolve-username-route v1.0.0, set-username-route v1.0.0.
**Aeltere Sessions:** Session 64: Groesserer Stundennachweis-Ausbau, in PRODUKTION deployt (beide Remotes origin+cubintec, SHA 1e2de08 fuer TimesheetForm/Matrix/ZASeite; GF-Fix in einem fruehren Commit derselben Session). SW-Release V7.5.4. KEINE DB-Migration; eine reine Datenkorrektur (Katrin Kirchner WAZ-Historie). **GF-50%-Regel wieder aktiv:** Die GF-Erkennung machte einen exakten String-Match gegen ASCII ('Geschaeftsfuehrer'); die DB enthaelt aber echte Umlaute und die weibliche Form -> istGF immer false, keine GF-Ampel/Warnung. Fix: zentraler toleranter Helfer istGeschaeftsfuehrerTitle() in v7-types (normalisiert Umlaut/ASCII, Gross-/Kleinschreibung, weibliche Form '...in'); POSITION_OPTIONS zeigt echte Umlaute (als \u-Escapes -> Quelle ASCII-rein); MitarbeiterModal bildet Alt-Werte per canonicalPositionTitle() sanft auf die Umlaut-Schreibweise ab (v7-types 7.4.9-2, MitarbeiterModal 1.0.3-2, TimesheetForm 7.4.6-60). LEHRE: position_title ist zugleich sichtbarer UI-Text UND Match-Key, darf nicht ASCII-fiziert werden. **Paket A (TimesheetForm 7.4.6-61):** rechte 'offen'-Spalte LIVE (zaehlt schon bei der Eingabe mit, Live-Delta ueber Schnappschuss savedMonthHoursPerWP) + FARBEN zurueck (offen gruen, ueberbucht rot, projektweit-offen bei nicht zugeordnetem MA blau). **Paket B (TimesheetForm 7.4.6-62, StundennachweisMatrix 7.4.6-10):** persoenliche WAZ (weeklyHoursAtMonth aus der Teilzeit-Historie) direkt rechts neben dem MA-Feld; ZA-Direktlink in der Timesheet-Steuerleiste (rechts) und im Matrix-Karten-Header, gleiche Seite mit returnTo=aktuelle URL, portal-abhaengige Route (Berater /v7/berater/foerderung/firma/<id>/za, Firma /v7/firma/za); Timesheet-Sprung ueber checkUnsavedChanges. Matrix-Platzierung im Karten-Header (print:hidden), weil der Zurueck-Button im Seiten-Wrapper liegt. **ZA-Ruecksprung-Fix (ZASeite 1.0.10):** zurueckUrl honoriert jetzt einen konkreten returnTo-Pfad (beginnt mit '/') -> Zurueck fuehrt wieder zur Ausgangsseite statt aufs Dashboard; Alt-Sentinel 'cockpit' + Portal-Defaults unveraendert, startsWith('/') schuetzt vor externen Zielen. **Paket C (TimesheetForm 7.4.6-63):** Auto-Vorbelegung 'sonstige Arbeiten' = max(0, pWAZ/5 - dieses Projekt - andere Projekte) (Abzug anderer Projekte haelt die projektuebergreifende Tagesgrenze ein -> kein harter Kapazitaets-Block); neuer Monat fuellt leere Arbeitstage + fuehrt live nach, gespeicherter Monat laesst leere Tage in Ruhe (schuetzt bewusste Loeschungen, da 0-/leere sonstige beim Speichern nicht als Datensatz abgelegt werden), manuell angefasste Tage bleiben unangetastet; weicher (nicht blockierender) Save-Hinweis auf 'Luecken'-Tage (reiner Arbeitstag, Projekt>0, Tag nicht voll, sonstige leer). **Grenzen-Korrektur (TimesheetForm 7.4.6-64):** 'sonstige Arbeiten' zaehlen NICHT mehr in Grenzbetrachtungen (nicht foerderbar) - (1) 9h-Tagesgrenze rechnet nur foerderbare Projektstunden (calcTagSumme ohne sonstige, Cross-Projekt = foerderbar dieses Projekt + andere), (2) physische Monatskapazitaet ohne sonstStundenMonat (nur foerderbar + andere Projekte); behebt faelschliches 'Speichern gesperrt' bei langen Monaten (184h sonstige > 173,33). Foerder-Monatsgrenze (173,33 x Faktor) rechnete ohnehin nur foerderbar - unveraendert; Anzeige-Summen ebenfalls. **Datenkorrektur (kein Code):** Katrin Kirchner zeigte 38h (Firmenstandard) statt 28h - Historie hat Vorrang vor Stammsatz, ihr einziger Historie-Eintrag (ab 2022) stand faelschlich auf 38. Fachlich: immer 38h, zum 01.08.2025 auf 28h reduziert (YachtConnect Phase 2, echte Gesamt-Reduzierung). Korrektur ueber MA-Modal: neuer Historie-Eintrag 28h ab 01.08.2025, 38er ab 2022 bleibt -> bis Juli 2025 38h, ab August 2025 28h (5,6 h/Tag). LEHRE: Historie ist PERSONENbezogen (steuert Tagesstunden/Auto-Vorbelegung/Grenzen in ALLEN Projekten); ein reiner Projektanteil gehoert in pm_basis_weekly_hours am Projekt, nicht in die Historie. Offen unveraendert: A-001, A-006, A-012, A-013, A-019, A-039, A-043; A-034-Restpunkt (RLS-Angleich DEV/PROD im Backlog). Komponenten: TimesheetForm v7.4.6-64, StundennachweisMatrix v7.4.6-10, ZASeite v1.0.10, v7-types 7.4.9-2, MitarbeiterModal v1.0.3-2.
**Aeltere Sessions:** Session 63: Stundennachweis-Feinschliff, in PRODUKTION deployt (beide Remotes origin+cubintec, SHA 10f5236). **A-049 Feiertags-Tagesstunden folgen der individuellen MA-WAZ** statt dem Firmenstandard (TimesheetForm v7.4.6-58): die Feiertag-Auto-Vorbelegung der S-Zeile nutzt jetzt employeeDailyHours (= weeklyHoursAtMonth/5) statt company.standard_weekly_hours/5; der Lade-Effekt haengt zusaetzlich von weeklyHoursAtMonth ab, damit der Feiertag neu gerechnet wird, sobald die WAZ geladen ist (sonst kurz Default 40 -> 8). Behebt einen Teilzeit-Bug: Walter, Ilka (Androlite, 38h -> 7,60/Tag) bekam am Feiertag 8,00 (Firmenstandard 40), wodurch die Tages-Plausipruefung (7,60) das Speichern blockierte. U/K/S nutzten employeeDailyHours bereits korrekt - nur die Feiertags-Stelle (Z.1598) war betroffen. Diagnose per SQL (DEV+PROD): Walter weekly_hours=38 sauber im Stammsatz, Androlite standard_weekly_hours=40, keine WAZ-Historientabelle -> reiner Code-Fix, KEINE Datenmigration (Feiertage werden live berechnet). **PDF-Dateinamen final** (TimesheetForm v7.4.6-59, StundennachweisMatrix v7.4.6-9): Leerzeichen statt Unterstrich, ohne das Wort "Stundenerfassung". Einzeldruck "<NN><VV> <YYMM> <FKZ> <Vorname> <Nachname>" (Bsp. "SF 2510 16DS251601 Ferat Sarac"); Sammeldruck 1 MA mit Zeitraum (YYMM bzw. YYMM-YYMM), mehrere MA -> "<YYMM> <FKZ>" (ohne Praefix). Kein .pdf im document.title - der Browser haengt die Endung beim Speichern selbst an (selbst angehaengt gaebe es .pdf.pdf in Chrome/Edge). Loest die Unterstrich-/"Stundenerfassung"-Fassung aus Session 62 ab. KEINE DB-Migration. Offen unveraendert: A-001, A-006, A-012, A-013, A-019, A-036, A-037, A-039, A-043; A-034-Restpunkt (RLS-Angleich DEV/PROD im Backlog). Komponenten: TimesheetForm v7.4.6-59, StundennachweisMatrix v7.4.6-9. Session 62: Layout-Bereinigung Stundennachweis + sprechende PDF-Dateinamen + Schutz gegen Browser-Auto-Uebersetzung (Vorgabe Berater). **(1) Optik:** farbige Zeilen-Baender (Abschnitts-Ueberschriften, Summenzeilen) und farbige Summenzellen entfernt - nur der orange Monatstage-Kopf und die Kopf-Boxen bleiben farbig; alle Sheet-Schriften schwarz (T/NT-Marker entfaerbt); Summenzeilen und Summenspalte weiterhin FETT (nur ohne Hintergrundfarbe); Spalten-Schattierung (Wochenende/Feiertag/KA/Abwesenheit) sowie die Warn-Faerbung bei Limit-Ueberschreitung unveraendert. **(2)** DS-Summenlabels einzeilig: "Summe foerderbare Stunden (T)" / "(NT)". **(3)** Fehlzeit-Label "Urlaub (nur bezahlter Urlaub)". **(4)** Unterschrifts-Labels groesser (9/7px -> 11/9px). **(5) Uebersetzungssperre:** translate="no" + Klasse notranslate auf dem Sheet- bzw. printRef-Container -> Browser-Auto-Uebersetzung uebersetzt Projektnamen nicht mehr (Bug: Projekt GRAVID wurde zu "SCHWANGER"). **(6) PDF-Dateinamen:** Einzeldruck (TimesheetForm) <NN><VV>_<YYMM>_<FKZ>_Stundenerfassung_<Vorname>_<Nachname> (Bsp. SF_2510_16DS251601_Stundenerfassung_Ferat_Sarac); Sammeldruck (Matrix) 1 MA mit Zeitraum (YYMM bzw. YYMM-YYMM bei Spanne), mehrere MA -> Stundennachweise_<Zeitraum>_<FKZ>; NN/VV = erster Buchstabe erster Nachname/Vorname, Name = erster Vor-/Nachname ASCII-gewandelt (Jose, Sarac, ss fuer scharfes s); Mechanik per document.title-Swap vor window.print (Vorschlag im Speichern-Dialog, Firefox/Chrome/Edge). **Nachtrag:** "sonstige Arbeiten"-Normalzellen bekommen bg-white (konsistent mit den Fehlzeiten-Zeilen) - der im Editor scheinbar fehlende obere Rahmen war ein reines Bildschirm-Artefakt (border-collapse laesst 1px-Rahmen bei Zoom != 100% weg), im Druck/PDF war stets alles vollstaendig (mit Cmd+0 / 100% Zoom erledigt). Komponenten: StundennachweisSheet v1.0.3 (inkl. v1.0.1 bedingte Kurzarbeit-Zeile), TimesheetForm v7.4.6-57, StundennachweisMatrix v7.4.6-8. KEINE DB-Migration. Bewusste Entscheidungen offen gelassen: orange Kopf-Boxen bleiben farbig, Warn-Rot bei Limit-Ueberschreitung bleibt. Offen unveraendert: A-001, A-006, A-012, A-013, A-019, A-036, A-037, A-039, A-043; A-034-Restpunkt (RLS-Angleich DEV/PROD im Backlog).
**Aeltere Sessions (frueher):** Session 61: Drei Zeiterfassungs-Bugs behoben und in PRODUKTION deployt (main + cubintec deckungsgleich, SHA b1e6faf); SW-Release als Patch auf **V7.5.1**. **A-044** Stundennachweis-Matrix-Klick belegt jetzt Mitarbeiter, Monat UND Projekt vor (vorher landete man immer im ERSTEN Projekt): die Matrix gibt activeProjectId an onNavigateToZE, beide Handler (BerichtePage, cockpit-stundennachweis) haengen &projekt= an die ZE-URL, und beide ZE-Seiten (Berater + Firma) lesen ?projekt und reichen es als initialProjectId an TimesheetForm (StundennachweisMatrix v7.4.6-7, BerichtePage v7.4.6-23, cockpit-stundennachweis-page v7.4.9-7, berater-ze + firma-ze-page je v7.4.6-4). **A-045** Pfeilnavigation ueberspringt Abwesenheitstage: canEdit in TimesheetForm ist jetzt TYP-ABHAENGIG - Arbeitszeilen (AP/nicht-foerderbar) ueberspringen Abwesenheits- und PL-Sperrtage (spiegeln exakt die Zell-disabled-Bedingung inkl. getAbsenceCodeForDay), die Fehlzeit-Zeilen U/K/S bleiben erreichbar. Vorher versuchte die Navigation die an Abwesenheitstagen disabled AP-Zelle zu fokussieren und blieb haengen (kein Vor/Zurueck, kein Ueberspringen). **A-046** Fehlzeit-Tagesstunden erben den Firmenstandard: weeklyHoursAtMonth faellt bei fehlender MA-WAZ nicht mehr hart auf 40, sondern auf company.standard_weekly_hours zurueck (37,5 -> 7,5 statt 8, konsistent mit Feiertagen); company in den Effekt-Dependencies (greift auch bei Direkt-Navigation mit vorausgewaehltem MA). Einschraenkung: greift nur bei MA OHNE eigene weekly_hours; eine MA mit explizit 40 behaelt korrekt 8 (sonst Datenkorrektur der MA-WAZ noetig). A-045 + A-046 in TimesheetForm v7.4.6-52. **WICHTIGE LEHRE (Deploy-Verifikation):** A-045 schien zunaechst 'nicht zu funktionieren', obwohl die canEdit-Logik nachweislich korrekt war (per JS-Simulation verifiziert: ueberspringt den Abwesenheitstag in beide Richtungen). ECHTE Ursache: die TimesheetForm-52 war nie in downloads/ angekommen (Browser-Download stumm fehlgeschlagen) und damit nie in src/ - ein grep auf den Versions-/Fix-Marker war leer. KONSEQUENZ: VOR jedem 'funktioniert-nicht'-Schluss den tatsaechlichen Stand in src/ per Marker pruefen (grep auf '// Version:' + eine Fix-Zeile); macOS-grep kennt kein -P -> ASCII-Pruefung mit perl -ne 'print if /[^[:ascii:]]/'. Live-Nachweis ueber Footer-Build-SHA (A-037) und main==cubintec/main-SHA-Abgleich. KEINE DB-Migration. Offen unveraendert: A-001, A-006, A-012, A-013, A-019, A-039, A-043; A-034-Restpunkt (RLS-Angleich DEV/PROD im Backlog). Komponentenversionen: TimesheetForm v7.4.6-52, StundennachweisMatrix v7.4.6-7, BerichtePage v7.4.6-23, cockpit-stundennachweis-page v7.4.9-7, beide ZE-Wrapper v7.4.6-4.
**Aeltere Sessions (Archiv):** Session 60: SW-Release auf **V7.5.0** angehoben (Meilenstein: Multiprojekt-Faehigkeit bei Unternehmen + zentrale projektuebergreifende Abwesenheiten stabil im Produktivbetrieb). Sechs Punkte erledigt, alle deployt (beide Remotes origin+cubintec): **A-036** Feiertagszelle in der Ausfallzeiten-Zeile gesperrt (U/K kein Input, S sichtbar aber disabled, alle orange; schliesst die Luecke, dass U/K an Feiertagen speicherbar waren; TimesheetForm v7.4.6-49). **A-037** Footer-Build-Marker automatisch aus dem Vercel-Commit-SHA (`process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`.slice(0,7); PortalFooter v7.4.9-3) - verlaesslicher Live-Deploy-Nachweis (grep auf main zeigt nur Committetes, nicht Deploytes). **A-038** Fokus-Weitersprung nach Abwesenheit (TimesheetForm v7.4.6-49: nach Code-Eingabe in AP-Zelle springt der Fokus zur naechsten buchbaren Zelle - behebt den Fokusverlust, den die 2c-Sperre aus v7.4.6-47 ausloeste). **A-040** `.limit(10000)` auf der v7_timesheets-Query wiederhergestellt (useBerichteData v1.0.3; war beim A-034-Umbau v1.0.2 verloren gegangen - Regressions-Fix). **A-041** React-Fehler #418 (Hydration-Mismatch) im ZAPanel behoben (mounted-Gate: Server- und erster Client-Render liefern denselben Platzhalter, der echte Inhalt erst nach dem Mount; ZAPanel v7.4.4-53). **A-042** ZA-Auto-Auswahl der zuletzt gespeicherten ODER per initialZaId vorgegebenen ZA beim Laden (konsolidierter Effekt, laedt das Formular wirklich) + Einreichdatum leer per Default (3 Stellen, vorher heute -> Entwurf wurde faelschlich als eingereicht gespeichert) + Archiv-Spalte Zahlungseingang-Betrag rechtsbuendig (ZAPanel v7.4.4-56). **GROSSER UMWEG / LEHRE:** Die ZA-Anlagen 1a/1b zeigten in PROD bei mehreren Firmen (HEATS/AS System, VETIS/Automotive Synergies, Selaflex-DS) faelschlich "Keine Zeiterfassungsdaten", obwohl Daten, Team und Zeitraeume per SQL nachweislich vorhanden waren. Lange Fehlersuche ueber Supabase-Limit, Max-Rows, RLS, Firmen-ID, Projekt-Status, Schema-Diff und Hydration. Die ECHTE Ursache war banal: beim Oeffnen war **keine** ZA ausgewaehlt, der Abrechnungszeitraum defaultete auf `new Date()` (heute), und abgeschlossene Projekte (HEATS endet Mai 26) haben im aktuellen Monat keine Stunden -> leer. Gefunden erst per Diagnose-`console.log` (ZA-DIAG: `monthsLabels: ["Juni 26"]`). LEHREN fuer kuenftige "zeigt keine Daten"-Faelle: (1) zuerst die **Laufzeit-Parameter messen** (was ist ausgewaehlt, welcher Zeitraum, welche Filter) statt technische Hypothesen zu deployen - ein fruehes Diagnose-Log haette Stunden gespart; (2) **leere UI-Zustaende** muessen Ursache + Handlungsanweisung zeigen, nicht nur "Keine Daten"; (3) `pnpm dev` lief lokal auf DEV -> Problem lokal nie reproduzierbar, PROD-Test braucht PROD-Env im Production-Build; (4) `new Date()` als Default fuer Datum/Zeitraum erzeugt irrefuehrende Zustaende. Der #418-Fix war echt und richtig, aber NICHT die Datenursache (paralleles Symptom - hat die Suche zusaetzlich vernebelt). KEINE DB-Migration in Session 60 (reine Code-Aenderungen + eine temporaere Diagnose-Version v7.4.4-54, danach wieder entfernt). NEU offen: **A-039** (PortalFooter dauerhaft ueberall sichtbar, auch im Cockpit - erscheint bisher nur auf Firmenseiten), **A-043** (Arbeitsplan/Arbeitspakete-Uebersicht als Druck-/PDF-Ansicht, Plan vs. Ist je AP/Person - hilft bei Multiprojekt-Firmen, Stunden zwischen Projekten zu balancieren). Offen unveraendert: A-001, A-006, A-012, A-013, A-019. Komponentenversionen: ZAPanel v7.4.4-56, TimesheetForm v7.4.6-49, PortalFooter v7.4.9-3, useBerichteData v1.0.3.
**Aeltere Sessions (noch frueher):** Session 59: A-034 PROD-Phase - zentrale projektuebergreifende Abwesenheiten jetzt auch in PRODUKTION live. Diagnose PROD (cnnuyioklhlrfygwticf) sauber: v7_employee_absences existierte noch nicht, keine Geisterfirmen (D1 leer), keine Code-Konflikte (Q2 leer), Umfang Q1 U=561/K=70/S=126 roh (S=124 dedup). PROD-Migration SQL-MIGRATION-employee-absences-v2.sql: einzige Abweichung zu v1 (DEV) = Feiertags-S im INSERT von vornherein ausgeschlossen (explizite, geprueft Datums-/Bundesland-Liste; bundesweite Feiertage + regional Fronleichnam NW / Reformationstag SH), Backup+Deaktivierung breit (Feiertags-S werden deaktiviert, aber nicht migriert -> Feiertag berechnet); KEIN RLS-Block in PROD (v7_employee_absences bleibt wie v7_timesheets ohne RLS -> RLS-Angleich DEV/PROD im separaten Backlog). Verifikation PROD exakt: absences_aktiv=636 (U=561/4320,9h, K=70/560h, S=5/34,5h), Backup=757, ts_rest_aktiv=0; die 5 echten Sonderurlaube korrekt (Linfert+Schoebel 24./31.12., Tenostendarp 02.01.). Gekoppelter Deploy im Dual-Read in 4 Schritten: Block 1 (Tabelle+Index) -> Code-Push beide Remotes (Merge-Commit 9cb9c9b, origin+cubintec) -> Vercel Ready/Production -> Block 2-4 (Guard+Backup+INSERT+Deaktivierung in einer Transaktion). Live verifiziert: ehemalige Feiertags-S erscheinen als berechneter Feiertag (Bayer 25./26.12.), echter Sonderurlaub bleibt S (Linfert 24./31.12.), Abwesenheit projektuebergreifend automatisch (live bestaetigt), Berichte/Sammeldruck laden fehlerfrei. NEU offen: A-036 (Feiertagszelle in Ausfallzeiten-Zeile sperren - UX-Haertung; Speicherpfad schuetzt bereits: if code==='S' && isHoliday return, kein Feiertags-S persistierbar), A-037 (Footer-Build-Marker: PortalFooter-Quelle ins Projekt nachziehen - live 'Build 43' inkl. Build-Segment, Projektdatei v7.4.9-1 ohne Marker - + Marker kuenftig im Versions-Ritual hochzaehlen). KEINE Code-Aenderung in Session 59 (reiner PROD-Deploy des Session-58-Codes + DB-Migration). Offen unveraendert: A-001, A-006, A-012, A-013, A-019. Komponentenversionen unveraendert: TimesheetForm v7.4.6-47, BerichtePage v7.4.6-20, StundennachweisMatrix v7.4.6-6, useBerichteData v1.0.2, lib employeeAbsences v1.0.0.
**Aeltere Sessions (Archiv):** Session 58: A-034 zentrale projektuebergreifende Abwesenheiten (DEV erledigt, PROD offen). Abwesenheit ist jetzt mitarbeiter- statt projektbezogen: einmal erfasst (Urlaub/Krankheit/Sonderurlaub), erscheint automatisch in allen parallelen Projekten des MA, keine Doppeleingabe, keine Differenzen. NEU Tabelle v7_employee_absences (employee_id, client_company_id, work_date, absence_code U/K/S, hours, is_active; partieller UNIQUE employee_id+work_date WHERE is_active=true, NULLS NOT DISTINCT; RLS aktiv, 4 Policies gespiegelt von v7_timesheets). NEU lib employeeAbsences.ts (loadEmployeeAbsencesAsTimesheets: laedt zentrale Abwesenheiten, mappt ueber das Assignment-Fenster auf Projekte, liefert synthetische Timesheet-Zeilen fuer die Lesepfade). DEV-Migration gelaufen: 378 Abwesenheiten aus v7_timesheets migriert (U=331/K=43/S=4) mit Backup-Tabelle + Konflikt-Guard, Alt-Zeilen deaktiviert (Dual-Read, kein Doppelzaehlen). Stammdaten-Reparatur als Vorbedingung: Geisterfirma c97d8105 (AutoSyn) fehlte in DEV v7_client_companies nach fruehem PROD->DEV-Resync -> mit Original-UUID wiederhergestellt, 9 FK-Tabellen umgehaengt, inaktives Duplikat geloescht. Feiertags-S bereinigt: 25./26.12. (echte Feiertage) aus v7_employee_absences deaktiviert, 24./31.12. (kein Feiertag, firmenindividuell) bleiben. Lesepfade (Dual-Read, dedupliziert): useBerichteData v1.0.2, BerichtePage v7.4.6-20, StundennachweisMatrix v7.4.6-6 (Sammeldruck). Schreibpfad TimesheetForm v7.4.6-47 in drei Etappen: 2a Laden (zentrale Abwesenheiten projektuebergreifend in die Fehlzeit-Zeilen), 2b Speichern (U/K/S nicht mehr in v7_timesheets, sondern Sync v7_employee_absences ueber MA+Monat: neu/geaendert/entfernt; Sonderurlaub=S an Nicht-Feiertag wandert mit, S an Feiertag bleibt berechnet; harte Konfliktpruefung ein Code/Tag), 2c Cross-Projekt-Abwesenheitssperre (an einem Abwesenheitstag keine Arbeitsbuchung in irgendeinem Projekt - AP- und Nicht-foerderbar-Zellen disabled+Tooltip, beide Eingabe-Handler-Backstops, Speicher-Backstop erhalten). Bewusst NICHT gebaut: automatisches Spiegeln von Arbeitsstunden zwischen Projekten (jede Stunde bleibt in genau einem Projektnachweis; die projektuebergreifende 9h-Tagesgrenze A-021 sichert die Plausibilitaet). DB-Migration: v7_employee_absences NUR DEV - PROD steht aus. PROD-Phase offen: Diagnose (Geisterfirmen-Check + Kollisions-Queries Q1/Q2), an Feiertags-S angepasste PROD-Migration, gekoppelter Deploy (Code auf beide Remotes + Migration im Dual-Read). Offen unveraendert: A-001, A-006, A-012, A-013, A-019. Komponentenversionen: TimesheetForm v7.4.6-47, useBerichteData v1.0.2, BerichtePage v7.4.6-20, StundennachweisMatrix v7.4.6-6, lib employeeAbsences v1.0.0.
**Aeltere Sessions (Archiv):** Session 57: Projektbezogene Wochenarbeitszeit-Basis (pm_basis_weekly_hours) - sauberes Nebeneinander von Firmen-Realitaet und Foerderbasis. Anlass: Selaflex GmbH (zwei ZIM-DS-Projekte InGrav 16DS251591 + GRAVID 16DS251601, beide auf 37h/Woche bewilligt, obwohl die Arbeitsvertraege real 37,5h sind - Datenfehler im Antrag, soll NICHT korrigiert werden). System rechnete bisher ueberall fest mit 40h (173,33 h/PM). NEU DB-Spalte v7_projects.pm_basis_weekly_hours (numeric, nullable; NULL = erbt standard_weekly_hours der Firma) in PROD UND DEV angelegt, beide Selaflex-Projekte = 37. Zentraler Helfer hoursPerPM(waz) = waz*52/12 in projektfortschritt-utils (hoursPerPM(40)=173,33). Drei abgeleitete Groessen jetzt projektbasiert: (1) PM->Soll-Stunden im Arbeitsplan (1 PM = 160,33h statt 173,33h), (2) Foerder-Monatsgrenze pro MA/Projekt = hoursPerPM(pmBasis) x (weekly_hours/firmStd) -> Vollzeit-Selaflex 160,33h, (3) Abrechnungs-Stundensatz/Kosten via rateScale pro MA (= echte weekly_hours/pmBasis) -> Plan-/Ist-Kosten = PM x Monatsgehalt (behebt frueheren Misch-Fehler: 40h-Stunden x realem Stundensatz, ~6,7% zu hoch; loest zugleich die Teilzeit-Nuance, da jeder MA mit echtem Gehalt/Stunden rechnet). NEU physischer projektuebergreifender Monatsdeckel (HARTE Sperre) in TimesheetForm: Summe ueber alle Projekte des MA <= hoursPerPM(echte weekly_hours)=162,50h (die 9h-Tagesgrenze war bereits projektuebergreifend A-021, die Monatsgrenze bisher nur pro Projekt; relevant bei Linfert, der in beiden Selaflex-Projekten ist). NEU Eingabefeld 'Wochenarbeitszeit-Basis Antrag/Bescheid (h)' im Projekt-Bearbeiten-Dialog (ProjectDetailPage), leer = Firmenstandard - keine DB-Handarbeit mehr. WorkPackageTable zeigt dynamischen Faktor (Fusszeile/Legende '1 PM = 160,33 Stunden'). Zwei PROD-Deploys (beide Remotes): (a) Commit 79d2480 = utils v7.4.9-3, TimesheetForm v7.4.6-43, beide ZE-Wrapper v7.4.6-3; (b) Sammel-Commit B+C+A = utils v7.4.9-4 (rateScale pro MA), ProjectDetailPage v7.4.4-59, WorkPackageTable v7.4.3-13, FirmaCockpit v7.4.9-36-3, ProjektFortschrittPanel v7.4.5-25, BerichtePage v7.4.6-19, cockpit-fortschritt-page v7.4.9-6. DB-Migration: pm_basis_weekly_hours (PROD+DEV). LEHRE: Schema-Aenderungen IMMER in DEV und PROD, auch wenn die Daten nur in einer DB liegen (DEV-ZE-Seite scheiterte zunaechst an fehlender Spalte). Offen unveraendert: A-001, A-006, A-012, A-013, A-019, A-034. Parkplatz weiter: Selaflex-Admin-Darstellung im neuen System; Vercel-Account-Trennung freiberuflich vs. Cubintec; Supabase-Projekttransfer in Cubintec-Org; spaeter PROD->DEV-Resync der Stammdaten.
**Aeltere Sessions (Archiv):** Session 56: PROD-Auslieferung wiederhergestellt + Dashboard-Matrix-Desync (A-035) behoben + downloads aufgeraeumt. PROD (pze.cubintec-hub.com) lieferte seit Session 54 nichts mehr aus: Cubintec-Vercel-Team war von Pro auf Hobby zurueckgefallen, alle Deployments seither 'Blocked' (letzter Ready-Deploy 13.06.), Martins Zugang weg. Katrin hat Pro reaktiviert; geblockte Deployments laufen NICHT automatisch wieder an -> frischer Redeploy ausgeloest, Footer-Marker 'Build 43' live verifiziert (Matrix -4, cockpit-stundennachweis -6, TimesheetForm -42, Footer -2 jetzt ausgeliefert). A-035 NEU+erledigt (Dashboard-Matrix meldete bei Mehr-Projekt-Firmen faelschlich 'Keine Projektdaten', betroffenes Projekt wechselte je nach Navigationsweg - State-Desync zwischen selectedReportProjectId (filtert projects-Array) und matrixProjectId (aktives Projekt). Fix: BerichtePage v7.4.6-18 setzt beide States synchron + StundennachweisMatrix v7.4.6-5 Selbstheilungs-Guard auf activeProjectId. KEINE DB-Migration. Live an Selaflex InGrav/GRAVID verifiziert). downloads/ aufgeraeumt: Keep-2-Politik (aktueller Stand + ein Vorgaenger als Rollback), Verlaufs-/session-Dateien und Dateien ohne Versionsnummer ausgenommen; per Skript aufraeumen_downloads.py (Dry-Run-Default). PARKPLATZ naechste Session: (1) Silaflex-Admin-Darstellung im neuen System pruefen; (2) Account-Trennung freiberuflich vs. Cubintec (zwei Vercel-Teams, steuerlich sauber zu trennen - von Katrin angemahnt). Offen unveraendert: A-001, A-006, A-012, A-013, A-019, A-034. Session 55: Saubere Trennung bei Mehr-Projekt-Firmen (erste Konstellation: Selaflex GmbH mit InGrav + GRAVID, MA Linfert in beiden Teams). A-032 NEU+erledigt (Stundennachweis-Matrix filtert die MA-Zeilen jetzt auf das oben gewaehlte Projekt - vorher erschienen alle Teammitglieder aller Projekte; StundennachweisMatrix v7.4.6-4 filtert projectAssignments auf activeProjectId, project_id im Interface ergaenzt; cockpit-stundennachweis page v7.4.9-6 fuehrt assignment_start/end je MA+Projekt zusammen; wirkt auch in der BerichtePage-Matrix). A-033 NEU+erledigt (Teil 2a: MA-Auswahl im TimesheetForm aufs Projektteam beschraenkt - vorher alle Firmen-MA waehlbar; TimesheetForm v7.4.6-37, teamMemberIds/teamEmployees, Auto-Umstellung beim Projektwechsel, gewaehlter MA bleibt sichtbar, leeres Team -> Fallback volle Liste). Bestaetigt: der projektuebergreifende 9h-Tagesdeckel (A-021, otherProjectHours/calcCrossProjectTagSumme) greift bereits generell, nicht nur bei NWM. A-034 NEU+offen (projektuebergreifende Abwesenheiten als zentrale Tabelle - Konzept KONZEPT-ABWESENHEITEN-ZENTRAL v1.1 abgenommen: Abwesenheit mitarbeiter- statt projektbezogen, ein Code/Tag, 9h-Deckel = Summe Arbeitsstunden; Umsetzung als eigene DB-Session DEV->PROD). §4.1 TimesheetForm von -30 auf -37 nachgezogen (Zwischenbuilds -31 Kurzarbeit+Rechtsklick-Auswahl, -32/-33 Fehlzeiten-Fixes, -34/-35 Wochenend-Erfassung nicht-foerderbar, -36 Rahmen-Fix Tailwind 4 waren deployed, in §4 nicht reflektiert). KEINE DB-Migration. Session 54: A-031 NEU+erledigt (Login-Erstellung im App-Cockpit nachgeruestet). Im neuen FirmaCockpit fehlte jede Moeglichkeit, einen Portal-Login anzulegen - das Schluessel-Icon war fest auf Passwort-Reset verdrahtet und zeigte bei MA ohne user_id nur eine Sackgassen-Meldung; die Login-Anlage lag bisher nur im alten EmployeeManagement (Firmendaten>Mitarbeiter). MitarbeiterModal v1.0.3: Passwort-Modus zeigt bei fehlendem Login jetzt ein Login-erstellen-Formular (E-Mail + Portal-Rolle read-only, Passwortfeld) und ruft die bestehende atomare Route /api/v7/create-employee-login auf (keine neue Backend-Logik); Fall ALREADY_REGISTERED abgefangen (Verknuepfen weiterhin ueber Firmendaten>Mitarbeiter / EmployeeManagement). FirmaCockpit v7.4.9-36: Schluessel-Icon-Tooltip + Hover-Farbe dynamisch je user_id (Login erstellen blau / Passwort zuruecksetzen amber), user_id in MA-Query + MitarbeiterData ergaenzt; ASCII-Korrektur Mittelpunkt-Zeichen im Firmen-Zaehler -> '-'. KEINE DB-Migration. PROD auf beide Remotes gepusht (origin + cubintec), Merge-Commit 92b51c1, Deploy auf pze.cubintec-hub.com am Schluessel-Tooltip verifiziert. Session 53: A-029 NEU+erledigt (Sammeldruck Stundennachweise: StundennachweisMatrix v7.4.6-3 mit Umschalt-Modus "Sammeldruck" - Auswahl per Monatsspalte/MA-Zeile/Einzelzelle/Eck-Feld, "Drucken (n)" laedt Detaildaten der Auswahl selbst nach und baut je MA+Monat ein Blatt; NEU StundennachweisSheet v1.0.0 = statisches Nachweis-Layout 1:1 zum Einzeldruck + NEU lib stundennachweisSheetData v1.0.0 = reiner Builder gespeicherte Timesheets -> Anzeigemodell; im Druck landen nur die Blaetter via CSS-Trick #snw-print-root; Cockpit/BerichtePage UNVERAENDERT, TimesheetForm UNANGETASTET). A-030 NEU+erledigt (Meine-Arbeitspakete-Popup in der Zeiterfassung: TimesheetForm v7.4.6-30, Knopf neben MA-Auswahl oeffnet Modal mit den dem aktuellen MA im Arbeitsplan zugeordneten APs inkl. AP-Code, Bezeichnung, ggf. T/NT, geplante + offene Stunden; reine Anzeige ueber assignedWPIds/plannedHoursPerWP/calculateRemainingHours). BUGFIX 5.57 (ZA-Stundeninflation: doppelte v7_timesheets-Zeilen durch Doppel-Speichern ohne setSaving-Sperre -> PROD-Cleanup mit Backup-Tabelle + Haertung TimesheetForm v7.4.6-26 savingRef/setSaving). BUGFIX 5.58 (Foerder-Prognose: Phantom-"Verschenkt" ~6 EUR + Prognose ueber Plan -> projektfortschritt-utils v7.4.9-2 foerderMaximum=min(bewilligt, Plankosten x Satz) + prognoseStundenAbrechenbar/tempoUeberPlan; ProjektFortschrittPanel v7.4.5-24 + FirmaCockpit v7.4.9-33). PortalHeader v7.3.95-14 (dashboardHref im Berater-App-Modus -> App-Cockpit). KEINE DB-Migration (nur einmaliges Daten-Cleanup doppelter Zeilen). Session 52: Drei Navigations-/Anzeige-Bugs im App-Paradigma behoben, die mit dem Domain-Umzug auf pze.cubintec-hub.com gleichzeitig auffielen und faelschlich wie eine Transfer-Regression wirkten - tatsaechlich unabhaengige Code-Ursachen, git durchgehend konsistent (origin/main = cubintec/main). A-026 NEU+erledigt (Fehlzeiten: Abwesenheitscode U/K/S in AP-Tageszelle wird wieder automatisch in die Fehlzeit-Zeile uebernommen, F->S, mit MA-Tagesstunden; TimesheetForm v7.4.6-23. Ursache: v7.4.6-16 vom 07.05. entfernte die Auto-Uebernahme, calculateAbsenceSums liest seither nur absenceHoursInput). A-027 NEU+erledigt (Cockpit-Stundennachweis: Matrix-Zellklick uebergab ?projekt=&ma=&monat=YYYY-MM, die Zeiterfassungs-Seite liest aber ?employee=&year=&month= -> Monat/MA ignoriert, oeffnete aktuellen Monat; jetzt korrekte Parameter + returnUrl. "Zurueck" beider Cockpit-Seiten deterministisch ins Firma-Cockpit via localStorage pze_mode statt router.back() ins alte Foerder-Portal; cockpit/stundennachweis page + cockpit/fortschritt page je v7.4.9-5). A-028 NEU+erledigt (App-Firmenseite /app/firma/[id] hatte keinen PortalHeader - FirmaCockpit rendert ihn nicht selbst, die Wrapper-Seite muss; v1.0.0 war Minimal-Wrapper, jetzt v1.0.1 mit PortalHeader analog klassischer Cockpit-Seite). A-001 weiter offen (Berater-Manual v1.1 als docx erstellt mit URL-Migration auf pze.cubintec-hub.com, aber undeployed + in inhaltlicher Ueberarbeitung -> v1.2). DEPLOY-KORREKTUR: Vercel-Build-Hook haengt Stand Session 52 (laut Dashboard) am Repo projektzeiterfassung20 (origin), NICHT cubintec (widerspricht v5.01, vermutlich beim Domain-Umzug umgestellt); Regel bleibt: PROD-Deploy IMMER auf BEIDE Remotes pushen. Produktions-URL jetzt pze.cubintec-hub.com (301/308-Redirect von pze.itenion.com). KEINE DB-Migration. Session 51: A-020 erledigt (Firmen-Deaktivierung im App-Paradigma, FirmaCockpit v7.4.9-31: Trash2 in Firmendaten-Karte, Bestaetigungsdialog, Soft-Delete is_active=false/status=inactive, Rueck-Navigation ins App-Cockpit). A-023 NEU+erledigt (Gegenstueck: Firmen-Reaktivierung im App-Cockpit, berater-app-cockpit-page v1.0.7: aufklappbarer "Inaktive Firmen"-Bereich + Wiederherstellen). A-024 NEU+erledigt (Schutz gegen E-Mail-Tippfehler bei MA-Neuanlage: zweites Bestaetigungsfeld in MitarbeiterModal v1.0.2 UND EmployeeManagement v7.3.95-18). PROD-Incident geloest: Kunde Luebeck Yacht (t.schulze-hagenest) kam nicht in seinen Zugang - Ursache: E-Mail beim Anlegen mit Doppel-N (hagennest) statt Ein-N getippt; Auth-Lookup fand den Account nicht (invalid_credentials). Korrektur via Auth-Admin-API (E-Mail im auth.users auf Ein-N gezogen, email_confirm) + v7_user_profiles/v7_employees nachgezogen; A-024 ist die praeventive Konsequenz. A-013 hochgestuft (kein 5-Min-Win, Legacy-Cluster). NACHTRAG 05.06.: A-025 NEU+erledigt (PortalNav v7.4.4-24 - "Unternehmen"-Tab im App-Modus ausgeblendet, fuehrte auf alte Firmenliste statt App-Cockpit; Zugang nur noch ueber Home-Icon). A-006 TEIL-erledigt (Header-Vereinheitlichung der fzul-Seite: berater-fzul-page v7.4.9-2, PortalHeader+PortalNav, Berater-Blau #002451, Umlaute intakt; FZul-Modul-Ausbau bleibt offen). DEPLOY-KORREKTUR: PROD haengt am Remote cubintec (kkcub/pze-cubintec), NICHT origin - Push beim PROD-Deploy IMMER auf BEIDE Remotes (origin + cubintec).

---

## 1. Projektuebersicht

### 1.1 Zielsetzung

Webbasierte SaaS-Anwendung zur Erfassung und Verwaltung von Projektstunden fuer:
- Oeffentlich gefoerderte FuE-Projekte (ZIM, BMBF/KMU-innovativ)
- Forschungszulage (Forschungszulagengesetz - FZulG)
- ZIM-Netzwerkmanagement (Eigenanteil-Abrechnung)

### 1.2 Zielgruppen

| Zielgruppe | Beschreibung | Portal |
|------------|--------------|--------|
| Beratungsunternehmen | Consultants, die mehrere Kundenfirmen betreuen | Berater-Portal (blau) |
| Kundenfirmen | Geschaeftsfuehrer, Projektleiter, Mitarbeiter | Firmen-Portal (gruen) |

### 1.3 Kernfunktionen

Fuer Firmen und Berater:
- Online-Anlage von Foerderprojekten (manuell oder per ZIM-PDF-Import)
- Verwaltung vollstaendiger Arbeitsplaene mit Arbeitspaketen
- Zuordnung von Mitarbeitern zu Projekten und Arbeitspaketen
- Zeiterfassung der Projektstunden pro Mitarbeiter/Monat
- Monatsabschluss: MA markiert Monat als vollstaendig erfasst
- Berichte und Controlling mit Plan/Ist-Vergleich und Stundennachweis-Matrix
- Mein Status: Persoenliche Uebersicht offener Zeiterfassungen

Zusaetzlich fuer Berater:
- Analyse der Zeiterfassungen gefoerderter Projekte
- Ermittlung verfuegbarer Projektstunden fuer Forschungszulage (FZul)
- Timesheet-Viewer: Firmen-/Projekt-/MA-uebergreifende Stundenuebersicht (v7.4)
- FZul-Analyse: Auswertung foerderrelevanter Stunden aus Timesheet-Daten (v7.4)
- Daten fuer Zahlungsanforderung: ZIM-Formular Datenaufbereitung
- NWM-Modul: Vollstaendige Verwaltung von ZIM-Netzwerkmanagement-Projekten (v7.4.5)

### 1.4 Technische Architektur

| Komponente | Technologie |
|------------|-------------|
| Frontend | Next.js 15.5, React 19, TypeScript, Tailwind CSS 4 |
| Backend/DB | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Hosting | Vercel (Deployment Branch: main) |
| Auth | Supabase Auth |
| ZIM Parser | Eigener TS/Node-Extraktor (zlib+crypto, AES-128/256, XFA) in Next.js API-Route - kein externer Dienst mehr (Session 66) |
| Package Manager | pnpm (lokal und Vercel) |
| Node.js | v20.x (lokal und Vercel) |
| Versionskontrolle | Git/GitHub (Branch v7-dev -> main) |

### 1.5 Multi-Mandanten-Konzept

DSGVO-konforme Mandantentrennung:
- Jede Firma sieht nur eigene Daten (Row-Level Security in Supabase)
- Berater sieht alle autorisierten Kundenfirmen
- Keine Vermischung von Kundendaten moeglich

Hierarchie: SaaS-Plattform > Beraterfirma > Kundenfirmen > Projekte > Mitarbeiter

### 1.6 Rollen-System

| Rolle | Beschreibung | Zugriff |
|-------|--------------|---------|
| system_admin | System-Administrator | Alles |
| consultant | Berater | Eigene Kundenfirmen |
| client_admin | Firmen-Admin (GF) | Eigene Firma komplett |
| project_leader | Projektleiter | Eigene Projekte + MA |
| employee | Mitarbeiter | Nur eigene Zeiterfassung |

### 1.7 UI-Konventionen

Header-Farbregel ("Wer bin ICH"):
- Berater-Portal: Blau (#002451) - IMMER, auch bei Ansicht von Firmendaten
- Firmen-Portal: Gruen (#65A655) - IMMER

Shared Components: Alle UI-Komponenten in /components/shared/. Beide Portale nutzen
DIESELBEN Komponenten; portal-Parameter steuert Farbe. Niemals Code duplizieren.

Nokia/Apple-Prinzip: Alle Funktionen sofort verstaendlich, keine Hover-Versteckung.

Zurueck-Navigation (Pflicht): Jede Seite - ausser den obersten Portal-Einstiegsseiten
(Dashboards/Landing) - MUSS einen "Zurueck"-Button besitzen, der den Nutzer auf die
Seite zurueckbringt, von der aus er gekommen ist. Regeln dazu:
- Einheitliche Beschriftung "Zurueck" (nicht der Name der Zielseite; veraltete oder
  hartkodierte Zielbezeichnungen sind kein zulaessiger Ersatz).
- Technisch per router.back(), damit der Nutzer immer zur tatsaechlichen Herkunftsseite
  zurueckkehrt (nicht zu einer fest verdrahteten Seite).
- Fallback auf die logische Elternseite, falls keine Browser-Historie vorhanden ist
  (z.B. bei Direktaufruf via Link oder neuem Tab), damit der Button nie ins Leere klickt.

---

## 2. Datenbankschema

### 2.1 Kern-Tabellen

| Tabelle | Beschreibung |
|---------|--------------|
| v7_user_profiles | Login-User (email, role, client_company_id, optional username - A-050) |
| v7_client_companies | Kundenfirmen (inkl. standard_weekly_hours, holiday_region) |
| v7_employees | Mitarbeiter einer Firma (portal_role, email, weekly_hours) |
| v7_employee_hours_history | Teilzeit-Historie pro MA (weekly_hours, gueltig_ab) |
| v7_projects | Projekte (funding_format, workplan_locked, pm_basis_weekly_hours, NWM-Felder) |
| v7_work_packages | Arbeitspakete eines Projekts (inkl. total_person_months, start_date, end_date) |
| v7_project_assignments | MA-Projekt-Zuordnung (hourly_rate, employee_number) |
| v7_work_package_assignments | MA-AP-Zuordnung (planned_person_months, is_active) |
| v7_timesheets | Zeiterfassungs-Eintraege (work_date, hours, day_type) |
| v7_employee_absences | Projektuebergreifende Abwesenheiten pro MA (work_date, absence_code U/K/S, hours, is_active; partieller UNIQUE employee_id+work_date WHERE is_active=true) - NEU Session 58 (A-034) |
| v7_zahlungsanforderungen | ZA pro Projekt (za_nummer, zeitraum, status); Spalten zahlungseingang_datum/_betrag/_kommentar seit V7.9.15 veraltet (nicht mehr gelesen oder geschrieben), Entfernen in spaeterer Etappe |
| v7_za_zahlungen | Zahlungseingaenge je ZA (project_id, za_nummer, datum, betrag, referenz, kommentar, is_active). Mehrere Zahlungen je ZA; Sammelueberweisung = mehrere Zeilen mit gleichem datum und gleicher referenz. RLS wie v7_zahlungsanforderungen (neu v5.49) |
| v7_timesheet_completions | Monatsabschluss (employee_id, project_id, year, month) |
| v7_netzwerk_partner | NWM: Netzwerkpartner (Stammdaten, Quoten, USt-Satz) |
| v7_netzwerk_eigenanteile | NWM: EA-Berechnungs-Snapshots (Zahlungsstatus) |
| v7_timesheet_notes | Interne Rueckfragen pro MA/Projekt/Monat (Status offen/erledigt) |
| v7_nwm_foerderzeitraeume | NWM: Netzwerkjahre pro Projekt (Laufzeit, Foerderquote, Netzwerkjahr-Nr.) |
| v7_nwm_ap_planung | NWM: AP-Planung pro Foerderzeitraum und MA (planned_pm, start/ende) |
| v7_fzul_vorhaben | KPT: FZul-Vorhaben (title, wirtschaftsjahr, status) - NICHT v7_projects! |
| v7_system_config | System-Konfiguration Key/Value (z.B. manuals_enabled) - NEU Session 34 |
| v7_user_preferences | Persoenliche UI-Einstellungen pro Nutzer (user_id PK -> auth.users, settings jsonb, Default '{}'); RLS: jeder nur eigene Zeile. Key timesheet_rest_modus (gesamt|monatsende) - NEU Session 76 |

### 2.2 Wichtige Architektur-Regeln

- `v7_work_package_assignments` ist Single Source of Truth fuer MA-Projekt-Beziehungen
- Stundensaetze gehoeren in `v7_project_assignments` (projektspezifisch)
- Profil-Lookup IMMER via `.eq('id', user.id)` (v7_user_profiles.id = auth.users.id)
- `portal_role` fuer Berechtigungen aus `v7_employees.portal_role` lesen
  (NICHT aus `v7_user_profiles.role` - der ist bei Firmen-Usern immer 'client_user')
- `funding_format` ist enum-Typ: bei LIKE-Vergleichen `::TEXT` Cast erforderlich
- Personenmonate: 173.33 h/PM (40h/Woche x 52/12); 1 PM = ca. 21,67 AT (bei 8h/Tag)
- Tagesarbeitszeit: `company.standard_weekly_hours / 5` (38h -> 7,6h/Tag)
- RLS: Alle v7-Tabellen haben Row Level Security AKTIV (Stand Session 21)
- `role_in_project` (v7_project_assignments): ab Session 36 nur noch 3 zulaessige Werte:
  'Projektleiter' | 'Projektmitarbeiter' | 'Wissenschaftlicher Mitarbeiter'
  (Migration per SQL-MIGRATION-role_in_project-v1.sql erledigt)

### 2.3 Feiertage (Arbeitsort-Prinzip)

**Zentrale Utility (ab v7.4.6):** `src/lib/holidays/germanHolidays.ts`

**Arbeitsort-Prinzip:** Massgeblich ist der Firmenstandort (= Arbeitsort),
NICHT der Wohnort des Mitarbeiters.

**Betroffene Komponenten:** TimesheetForm, BerichtePage, StundennachweisMatrix.

**Wichtige Regel:** Faellt ein Feiertag auf ein Wochenende, wird er weder als
Fehlstunden-Tag angezeigt noch in die Summenspalte eingerechnet. Nur die
Summenspalte hat diesen Check seit laengerer Zeit korrekt; die Tages-Zelle
hatte ihn erst ab v7.4.6-10.

**Auto-Fill Fehlzeiten (ab v7.4.6-19):** Beim Laden der Zeiteintraege werden
Werktags-Feiertage (Mo-Fr) automatisch in der S-Zeile (Sonstige bezahlte
Ausfallzeiten) mit Tagesstunden (standard_weekly_hours / 5) vorbelegt.
Bereits manuell erfasste S-Werte werden NICHT ueberschrieben. Die Vorbelegung
basiert auf company.federal_state und company.holiday_region.

### 2.4 ZIM-Foerderformate

Bekannte Werte in `v7_projects.funding_format`:
- `ZIM` - Standard Einzelprojekt FuE
- `ZIM_DS` - Durchfuehrbarkeitsstudie
- `ZIM_NETZWERK` - Netzwerkmanagement (NWM-Modul aktiv)

### 2.5 NWM-Felder in v7_projects

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| netzwerk_typ | text | 'national' oder 'international' |
| netzwerk_phase | text | 'phase1' oder 'phase2' |
| bewilligung_datum | date | Bewilligungsdatum Phase 1 |
| phase2_start_datum | date | Bewilligungsdatum Phase 2 |
| foerdersatz_stufen | jsonb | [{laufzeitjahr, satz_percent, gueltig_ab}] |
| nwm_bank_kontoinhaber | text | Fuer NP-Rechnungen |
| nwm_bank_iban | text | Fuer NP-Rechnungen |
| nwm_bank_bic | text | Fuer NP-Rechnungen |
| nwm_bank_name | text | Fuer NP-Rechnungen |
| nwm_ust_id | text | USt-ID fuer NP-Rechnungen |
| nwm_rechnung_prefix | text | Rechnungsnummer-Praefix |
| nwm_rechnung_naechste | integer | Naechste Rechnungsnummer |
| nwm_faelligkeitsfrist | integer | Zahlungsfrist in Tagen |

### 2.6 v7_system_config (NEU Session 34)

Key/Value-Tabelle fuer systemweite Konfigurationsparameter.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| key | TEXT PK | Eindeutiger Schluessel |
| value | TEXT | Wert als String |
| updated_at | TIMESTAMPTZ | Letztes Aenderungsdatum (auto) |
| updated_by | TEXT | E-Mail des Aendernden (optional) |

RLS: SELECT alle authenticated; ALL nur system_admin.

Aktuelle Eintraege:

| key | Wert | Bedeutung |
|-----|------|-----------|
| manuals_enabled | 'true' / 'false' | Anleitungs-PDFs im Hilfe-Dropdown freigegeben |

Steuerung per Toggle in Berater-Admin (/v7/berater/admin -> System-Konfiguration).
Aenderung sofort aktiv, kein Deploy noetig.

### 2.7 Feiertagsregion - kommunale Sonderfaelle

Feld `v7_client_companies.holiday_region` (TEXT, nullable).

| Wert | Bedeutung |
|------|-----------|
| (NULL) | Standard-Bundeslandregel |
| BY_KATH | Bayern, ueberw. katholische Gemeinde |
| BY_EVAN | Bayern, ueberw. evangelische Gemeinde |
| BY_AUGSBURG | Stadt Augsburg (Mariae Himmelfahrt + Friedensfest 08.08.) |
| SN_SORB | Sachsen, sorbisches Siedlungsgebiet (Fronleichnam ja) |
| TH_EICHSFELD | Thueringen, LK Eichsfeld etc. (Fronleichnam ja) |

### 2.8 Firmen-Anlage Prozess (ab v7.4.1-6)

Bei Neuanlage einer Firma im Berater-Portal sind Admin-Felder verpflichtend
(Checkbox entfernt). Die API-Route `/api/v7/create-user` erledigt alle 3 Schritte
server-seitig mit Service-Role-Key (umgeht RLS):

1. Auth-User anlegen (Supabase Admin API)
2. v7_user_profiles anlegen (role: client_user, client_company_id gesetzt)
3. v7_employees anlegen (portal_role: client_admin)

Rollback: Bei Fehler in Schritt 2 oder 3 wird der Auth-User automatisch geloescht.
Modal schliesst sofort nach erfolgreichem Create (saved-Flag verhindert Doppel-Submit).

### 2.9 Neue User anlegen - Checkliste

Bei jedem neuen Firmen-User pruefen:
1. auth.users Eintrag vorhanden?
2. v7_user_profiles Eintrag vorhanden? (role = 'client_user')
3. client_company_id in v7_user_profiles gesetzt? <- haeufigste Fehlerquelle
4. display_name, first_name, last_name in v7_user_profiles gesetzt?
5. v7_employees Eintrag vorhanden? (portal_role gesetzt)
6. user_id in v7_employees auf auth.users.id gesetzt?

SQL-Sofortreset Passwort (ohne E-Mail):
```sql
UPDATE auth.users
SET encrypted_password = crypt('NeuesPasswort', gen_salt('bf'))
WHERE email = 'user@firma.de';
```

### 2.10 Username-Login (NEU Session 65, A-050)

- `v7_user_profiles.username` - optional, text, nullable. Format-Constraint
  `^[a-z0-9._-]{3,20}$` (immer kleingeschrieben gespeichert). Partial-Unique-Index
  (global ueber alle Firmen, nur fuer befuellte Werte) - SQL-MIGRATION-username-login-v1.sql,
  DEV+PROD.
- Login-Seite akzeptiert im bisherigen E-Mail-Feld wahlweise E-Mail ODER Benutzername.
  Enthaelt die Eingabe kein `@`, wird sie ueber `/api/v7/resolve-username` in die
  hinterlegte E-Mail aufgeloest (Route liefert bewusst NUR die E-Mail, sonst nichts,
  und dieselbe generische Antwort bei nicht gefundenem Namen wie bei falschem Passwort -
  kein Enumerations-Risiko).
- Selbstbedienung: `/api/v7/set-username` erlaubt nur das eigene Konto (auth.uid() aus
  Session-Cookie) zu aendern - niemals fremde Accounts. Zugaenglich im PortalHeader-
  User-Menue ("Benutzername festlegen/aendern").
- Bei MA-Neuanlage (`create-employee-login`) optionales Feld, serverseitig auf Format
  und Eindeutigkeit geprueft (inkl. DB-Unique-Index als Race-Condition-Absicherung,
  Fehlercode `USERNAME_TAKEN`).
- BEWUSST NICHT umgesetzt: Admin setzt/aendert den Benutzernamen fuer einen fremden,
  bereits bestehenden Account. Deckung ueber Selbstbedienung (Benutzername vergessen ->
  Login per E-Mail, danach selbst neu setzen) plus bestehenden Admin-Passwort-Reset.



### 2.11 Nutzer-Praeferenzen (NEU Session 76)

Persoenliche UI-Einstellungen pro eingeloggtem Nutzer, geraeteunabhaengig gespeichert.
Erster Anwendungsfall: Restanzeige-Modus im Timesheet.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| user_id | uuid PK | FK auth.users(id) ON DELETE CASCADE |
| settings | jsonb | UI-Praeferenzen, Default '{}'. Aktueller Key: timesheet_rest_modus ('gesamt'|'monatsende') |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now(), per Trigger gepflegt |

- RLS aktiv; drei Policies (SELECT/INSERT/UPDATE) auf `auth.uid() = user_id` - jeder Nutzer
  sieht/aendert nur seine eigene Zeile. GRANT SELECT/INSERT/UPDATE an authenticated.
- Bewusst als jsonb-Spalte `settings` angelegt, damit kuenftige UI-Schalter OHNE weitere
  Migration hinzukommen (einfach neuer Key im JSON).
- SQL-MIGRATION-user-preferences-v1.sql (idempotent), DEV + PROD ausgefuehrt.
- Der Code faengt eine fehlende Tabelle ab (Default 'monatsende', Log) - blockiert nichts,
  kann die Wahl dann aber nicht speichern.


---

## 3. Entwicklungshistorie

### 3.1 Phase 1-3 (Oktober - Dezember 2024)
V6 Grundlagen, FZul-Modul, ZIM-Import-Konzept, DB-Schema

### 3.2 Phase 4: V7 Kern (Januar - Februar 2026)
v7.3.42 - v7.3.86: Kompletter V7-Neuaufbau mit Dual-Portal-Architektur,
Shared Components, Rollen-System, ZIM-Import, Zeiterfassung, Berichte

### 3.3 Phase 4 Fortsetzung (Februar 2026)
v7.3.87 - v7.3.95: ArbeitsplanImport, TeamManager, PortalHeader, EmployeeManagement,
User Manuals, Monatsabschluss, Prod-DB live (Steuerkanzlei Robin Freund)

### 3.4 Phase 5: Berater-Analysetools + ZA-Modul (Februar - Maerz 2026)
v7.4.0 - v7.4.4: Timesheet-Viewer, ZA-Modul, FirmendatenCard, ProjectDetailPage, Matrix

### 3.5 Session 7-8 (Maerz 2026)
TimesheetForm Feiertage + Monatsabschluss, NWM-Modul komplett,
NWM-Uebersichtsseite, Dashboard-Redesign

### 3.6 Sessions 22-26 (20.-22. April 2026)
Feiertagsregion, Feiertags-Utility zentralisiert, Arbeitszeitgrenzen Phase 1+2,
AP-Dropdown-Filter, PROD-Migration auf 8 Firmen

### 3.7 Sessions 27-31 (23.-24. April 2026)
KPT/FZul 3-Jahres-Ansicht, PROD-Migration NWM, ProjektFortschrittPanel,
BerichtePage Accordion, PortalNav kontextsensitiv

### 3.8 Sessions 32-33 (28. April 2026)
Mein-Status aufgeraeumt, Hilfe-Dropdown in PortalNav, BerichtePage stabilisiert

### 3.9 Session 34 (29. April 2026) - Anleitungen + System-Konfiguration

**Benutzeranleitungen vollstaendig neu erstellt:**
- PZE-Anleitung-Projektleiter v2.1 (gilt fuer v7.4.6)
- PZE-Anleitung-Firmen-Administrator v2.2.0 (gilt fuer v7.4.6)
- Mitarbeiter: keine separate Anleitung; nur FAQ
- PDF-Ablage mit STABILEN Dateinamen (keine Versionsnummer im Pfad):
  `/public/manuals/PZE_Anleitung_Projektleiter.pdf`
  `/public/manuals/PZE_Anleitung_Firmen-Administrator.pdf`
  `/public/manuals/PZE-FAQ-Zeiterfassung-v1.pdf`

**v7_system_config eingefuehrt (Details: §2.6)**

**SystemConfigPanel v7.4.4-1 + PortalNav v7.4.4-12:**
- Toggle manuals_enabled in Berater-Admin
- Hilfe-Dropdown: employee bekommt nur FAQ, kein Handbuch-Link
- Stabile URLs (Dateiname ohne Versionsnummer)

**berater-admin-page v7.3.94-1:** SystemConfigPanel eingebunden

**PortalNav-Iterationen:**
- v7.4.4-9: manuals_enabled aus DB
- v7.4.4-10: stabile Dateinamen
- v7.4.4-11: employee ohne Anleitung
- v7.4.4-12: Schreibweise PZE_Anleitung_ (Unterstrich)

### 3.12 Session 38 (7. Mai 2026) - Fehlzeiten editierbar + Teilzeit + Cockpit-Konzept

**Fehlzeiten direkt editierbar (TimesheetForm v7.4.6-16/17):**
Keine Automatik mehr fuer U/K/S-Stunden. Anwender traegt selbst ein.
Tageszellen editierbar wie Excel, weiss, Tastaturnavigation (Pfeiltasten/Tab/Enter),
hasChanges-Fix. Haftungsrisiko durch Automatik eliminiert.

**Teilzeit Tage x Stunden (EmployeeManagement v7.3.95-15, v7-types v7.4.9-1):**
Eingabe: Tage/Woche x Stunden/Tag -> weekly_hours berechnet.
Anzeige: "3T x 8h = 24 h/Woche (TZ-Faktor: 60%)".
SQL-Migration PROD ausgefuehrt. 40h/38h automatisch befuellt.
Offene Teilzeit-Daten: Doan/Kirchner Lisa/Freund Marlene -> Katrin klaert.

**ZA-Sortierung (ZAPanel v7.4.4-33):**
Anlage 1a: MA sortiert nach employee_number (lfd. Nr. gemaess Antrag).

**PM-Summen-Fix (WorkPackageTable v7.4.3-12):**
sums nutzt assignmentMap (dedupliziert). Verhindert Doppelzaehlung bei
mehrfachen DB-Eintraegen fuer gleiche wp+employee Kombination.

**DB-Bereinigungen PROD:**
- Arndt, Annika + Mueller, Anett (Steuerkanzlei Freund): vollstaendig geloescht
- ANOVIA: Duplikate in v7_work_package_assignments fuer Freund, Marlene entfernt
- Teilzeit-Daten gesetzt: Fischbach 5Tx7,8h, Luebeck Yacht 5Tx7h, Schoebel 5Tx6h

**Konzept Firma-Cockpit als MIS (KONZEPT-FIRMA-COCKPIT-v1_0.md):**
Grundkonzept: Pro Firma ein Cockpit mit Firmenkopf, MA-Matrix, Projekte,
Finanzuebersicht (ZA + Zahlungseingang). Details in Konzept-Dokument.
Implementierung naechste Sessions.

### 3.10 Session 36 (6. Mai 2026) - Arbeitszeitgrenzen Phase 3 + Dashboard-Redesign

### 3.11 Session 37 (7. Mai 2026) - Navigation Firma-Portal finalisiert

**ProjectDetailPage v7.4.4-55:**
Zurueck-Button im Firmen-Portal zeigt "← Dashboard" und navigiert zu
/v7/firma/berichte. Berater-Portal unveraendert.

**page-firma-projekte Redirect (v7.3.90):**
/v7/firma/projekte leitet auf /v7/firma/berichte um. Die separate Projektliste
ist ins Dashboard integriert -- diese Seite wird nicht mehr benoetigt.
Gilt auch als Sicherheitsnetz falls backUrl-Prop den alten Pfad uebergibt.

**BerichtePage v7.4.6-10:**
Seiten-Titel geaendert: "Berichte & Controlling" -> "Dashboard"
(konsistent mit Nav-Label).

**Login PW-Toggle (v7.3.90-2):**
Augensymbol im Passwort-Feld. Klicken + Halten zeigt PW. Desktop + Mobile.

**Projektteam als Quelle fuer Matrix/ZA (statt Arbeitsplan):**
- StundennachweisMatrix v7.4.6-2: matrixEmployees aus projectAssignments statt wpAssignments.
- ZAPanel v7.4.4-32: assignedEmployeeIds aus projectAssignments statt wpAssignments.
- BerichtePage v7.4.6-6: Zeiterfassungs-Status nutzt projectAssignments als MA-Quelle.
- Grundsatz: Arbeitsplan = urspruengliche Antragstellung (unveraenderlich). Neue MA erscheinen
  allein durch Projektteam-Eintrag in Matrix und ZA ohne AP-Aenderung.

**Berater-Nav bereinigt (PortalNav v7.4.4-12):**
Nav-Punkt "Zeiterfassungen" aus Berater-Portal entfernt (fuehrte zu 404).

**ROLE_OPTIONS konsolidiert (ProjectTeamManager v7.4.4-17 + SQL-Migration):**
role_in_project in v7_project_assignments auf 3 Werte reduziert:
'Projektleiter' | 'Projektmitarbeiter' | 'Wissenschaftlicher Mitarbeiter'.
Alle anderen Altwerte -> 'Projektmitarbeiter' per SQL-MIGRATION-role_in_project-v1.sql.

**Arbeitszeitgrenzen Phase 3 (TimesheetForm v7.4.6-11 bis v7.4.6-14):**
Details siehe §7e.

**Dashboard-Redesign Firma-Portal:**
- PortalNav v7.4.4-13: Neue Nav-Struktur (Details §9.1 + §12d).
- BerichtePage v7.4.6-7: "Meine Projekte" integriert (ersetzt separate Nav-Seite).
- BerichtePage v7.4.6-9: roleLoaded-Fix (MA-Redirect erst nach bestaetigter Rolle).
- v7-firma-page-redirect v7.3.43: Redirect auf /v7/firma/berichte.

**TimesheetForm (v7.4.6-4 -> v7.4.6-10, 6 Iterationen):**

| Build | Bugfix |
|-------|--------|
| v7.4.6-5 | AP-Spalte 30->55px; Summe-Monat + offen je 50->25px; Druck +-0px (neutral) |
| v7.4.6-6 | `compareApCode` Versions-Sort: 3.1.1 < 3.1.2 < 3.4 (an 3 Stellen: Vorbelegung + beide Dropdown-Gruppen) |
| v7.4.6-7 | U/K/S in `nonBillableEntries` (sonstige Arbeiten) fehlte in `getAbsencesForDay` + `calculateAbsenceSums` |
| v7.4.6-8 | ArrowDown: leere AP-Zeilen werden uebersprungen, nonbillable-Zeile immer erreichbar |
| v7.4.6-9 | `offen`-Spalte zeigt negative Stunden wenn MA kein Arbeitsplan-Eintrag hat (Vertretungsfall) |
| v7.4.6-10 | Feiertag auf Wochenende: Fehlzeiten-Tageszelle bleibt leer (Summe war bereits korrekt) |

**Firmen-Anlage (3 Iterationen):**
- v7.4.1-4: Admin-Felder immer sichtbar (Checkbox entfernt), E-Mail Pflichtfeld
- v7.4.1-5: saved-Flag: Doppel-Submit verhindert, Modal schliesst sofort
- v7.4.1-6: RLS-Fix: Profil+Employee-Insert clientseitig -> server-seitig

**create-user-route v7.4.1-1:** Alle 3 Schritte (Auth + Profil + Employee)
server-seitig mit Service-Role-Key. Vollstaendiger Rollback bei Fehler.

**EmployeeManagement v7.3.95-14:** Verwaiste Login-User (v7_user_profiles vorhanden,
v7_employees fehlt) in Mitarbeiterliste mit gelbem Hinweis-Badge sichtbar und
direkt bearbeitbar.

**Nicht-Code-Arbeiten:**
- VETIS Arbeitsplan: +11 Tage Verschiebung (Bewilligung 03.03. vs. Antrag 20.02.),
  Tippfehler-Korrektur AP1-Enddatum, Neuterminierung ab AP3.3.1 ins Kalender-Raster,
  AP5.2 auf bewilligtes Ende 02.03.2027 verlaengert. PM-Werte unveraendert.
- GF ohne Mitarbeiter-Eintrag: SQL-Sofortloesungen dokumentiert (PW-Reset,
  client_company_id, v7_employees-Insert mit display_name NOT NULL beachten)
- ALACsystems GmbH & Co. KG erfolgreich als neue PROD-Firma angelegt (9. Firma)

### 3.13 Session 39 (7. Mai 2026) - ZAPanel Archiv-Tab + Cockpit-Konzept

**ZAPanel v7.4.4-34 bis v7.4.4-40 (Archiv-Tab komplett neu):**
- Zahlungseingang-Felder inline editierbar (Datum, Betrag, Kommentar)
- Foerderbetrag live berechnet + in DB gespeichert (foerderbetrag_gesamt)
- Einreichdatum editierbar im Deckblatt-Formular
- ZA loeschbar mit Bestaetigungsdialog

**DB-Migration DEV (4 neue Felder auf v7_zahlungsanforderungen):**
- zahlungseingang_datum, zahlungseingang_betrag, zahlungseingang_kommentar, foerderbetrag_gesamt

**Konzept Firma-Cockpit als MIS (KONZEPT-FIRMA-COCKPIT-v1_1.md):**
- Entscheidungen A-D getroffen (Cockpit ersetzt Detail-Seite, auch im Firmen-Portal,
  nur aktive Projekte, Zahlungseingang separater Betrag)

### 3.14 Session 40 (8. Mai 2026) - Cockpit Grundgeruest

**FirmaCockpit v7.4.9-1 bis v7.4.9-5:**
- 3-Spalten-Layout: Firmendaten+MA | Projekte+KPIs | ZA-Tabelle
- KPI-Fortschrittsbalken (Laufzeit, PM, Kosten) pro Projekt
- ZA-Tabelle gruppiert nach Projekt mit Summen-Karten
- Spaltenverhaeltnis 2|6|4

**PortalHeader v7.3.95-4:** Home-Button (Haeuschen) im Header
**ProjectDetailPage v7.4.4-57:** Einheitliches returnTo fuer Zurueck-Navigation
**Wrapper-Seiten:** Fortschritt + Stundennachweis eigenstaendig via Cockpit

### 3.15 Session 41 (8. Mai 2026) - Cockpit als Berater-Zentrale

**projektfortschritt-utils-v7_4_9-1.ts (NEUE Datei: src/lib/):**
- Berechnungslogik aus ProjektFortschrittPanel extrahiert
- calculateProjectAnalysis()  --  alle Kennzahlen, Monatsverlauf, Prognose, Szenarien
- Exportierte Interfaces + Formatierungsfunktionen
- Ziel: Berechnungen einmal pflegen, ueberall nutzen

**FirmaCockpit v7.4.9-6 bis v7.4.9-10:**
- v7.4.9-6: Dropdown-Projektauswahl statt Kartenliste, Monatsverlauf-Chart (recharts
  ComposedChart), Prognose-Box mit Ampel, alle 3 Spalten synchron per Projektauswahl,
  Timesheets mit work_date fuer Monatsverlauf
- v7.4.9-7: Firma-Dropdown im Berater-Portal (Firmenwechsel ohne Dashboard),
  "Neue Firma"-Button
- v7.4.9-8: Inline-Navigationsleiste (Zwischenversion, ersetzt durch v7.4.9-9)
- v7.4.9-9: PortalNav (Shared Component) am Cockpit-Kopf  --  konsistente Navigation
  auf allen Berater-Seiten
- v7.4.9-10: Action-Buttons in allen Bereichen (Firmendaten bearbeiten, Neuer MA,
  Neues Projekt, Neue ZA)  --  Navigation zu Verwaltungsseiten mit returnTo

**PortalHeader v7.3.95-5:** Home-Icon (Haeuschen) entfernt  --  redundant mit PortalNav

**PortalNav v7.4.4-15 bis v7.4.4-17:**
- v7.4.4-15: Cockpit-Sichtbarkeit via v7_system_config Toggles
- v7.4.4-17: Cockpit-Klick laedt erste Kundenfirma async beim Klick

**SystemConfigPanel v7.4.4-2:**
- Neue Sektion "Cockpit-Freischaltung" mit zwei Toggles
- cockpit_berater_enabled + cockpit_firma_enabled
- system_admin sieht Cockpit immer (unabhaengig von Config)

**ZAPanel v7.4.4-41:**
- FIX: Sichern im Archiv-Tab speichert foerderbetrag_gesamt mit
- Behebt: Cockpit zeigte 0 EUR weil foerderbetrag_gesamt NULL war

**DB:** v7_system_config + cockpit_berater_enabled/cockpit_firma_enabled.
foerderbetrag_gesamt nachtraeglich befuellt (SQL).

**PROD-Deploy:** Alle Aenderungen live. Cockpit nur fuer system_admin sichtbar.

**Offene Punkte (Session 42):**
- ZA-Bearbeitung: Klick auf ZA-Nummer oeffnet direkt die ZA
- Action-Buttons: Zielnavigation verfeinern
- ProjektFortschrittPanel auf projektfortschritt-utils refactoren

### 3.16 Session 42 (8. Mai 2026) - ZA-Workflow + Cockpit-Feinschliff

**ZAPanel v7.4.4-41 bis -52:**
- v7.4.4-47: "Aktualisieren" -> "ZA speichern", hasChanges-Dialog, Status-Workflow
- v7.4.4-50: ZA-Bearbeitung direkt aus Cockpit (Klick auf ZA-Nummer)
- v7.4.4-51: "Als eingereicht markieren" Button entfernt (Datum genuegt)
- v7.4.4-52: Deckblatt Grid 50/50 Layout (links ZA Nr/von/bis, rechts Datum+Button)

**ZASeite v1.0.0 bis v1.0.7:** Neue eigenstaendige Seite fuer ZA-Bearbeitung.
**useBerichteData v1.0.0:** Shared Hook fuer Berichte-Datenladung.
**PortalFooter v7.4.9-1:** Neuer Footer-Bereich.

### 3.17 Session 43 (11. Mai 2026) - Neue App-Struktur (parallel)

**Architektur-Entscheidung: Parallele App-Struktur**
Statt bestehende Navigation zu patchen: komplett neue Routen unter `/v7/berater/app/`.
Alte Struktur bleibt unangetastet. Umschaltung nur fuer system_admin.

**Neue Dateien:**
- **AppNav v1.0.0** (src/components/shared/AppNav.tsx):
  Saubere Navigation: Cockpit | Netzwerk | Kapazitaetsplanung | Forschungszulage | Admin
- **berater-app-cockpit-page v1.0.0** (src/app/v7/berater/app/cockpit/page.tsx):
  4 Kacheln, Kundenfirmen-Kachel mit Firma-Dropdown, Stats
- **berater-app-firma-page v1.0.0** (src/app/v7/berater/app/firma/[id]/page.tsx):
  Wrapper fuer FirmaCockpit in neuer Routenstruktur
- **berater-projekt-neu-page v1.0.0** (src/app/v7/berater/foerderung/firma/[id]/projekt/neu/page.tsx):
  Projekt-Anlage mit returnTo-Support

**Aktualisierte Komponenten:**
- **PortalHeader v7.3.95-11:** Ansicht-Wechsler im User-Dropdown (nur system_admin).
  Klassische Ansicht <-> Neue App-Struktur via localStorage pze_mode.
- **PortalNav v7.4.4-19:** Cockpit-Button -> App-Cockpit; Kundenfirmen im App-Modus ausgeblendet;
  "< Dashboard"-Links per pze_mode gesteuert.
- **FirmaCockpit v7.4.9-23:** select-Modus (firmaId='select' -> Firmenliste);
  Inline MA-Modal (modalOnly); MA-Bug behoben (alle MAs laden unabhaengig von Projektanzahl);
  firmaIdLocal korrekt aus URL-Prop initialisiert.
- **EmployeeManagement v7.3.95-17:** modalOnly + onClose Props fuer Inline-Verwendung im Cockpit.
- **berater-firma-detail-page v7.4.4-6:** returnTo respektieren, "Zurueck zum Cockpit" Label,
  openNew + firmaName an EmployeeManagement.
- **ProjectList v7.3.88-7:** returnTo Prop an /projekt/neu weitergeben.
- **foerderung-page v7.4.1-7:** Suspense-Wrapper + ?openNew=true Modal-Auto-Open.
- **berater-multiprojekt-page v7.4.8-12:** Dashboard-Link im App-Modus ausgeblendet.
- **berater-netzwerk-page v7.4.5-3:** Dashboard-Link im App-Modus ausgeblendet.

**Neue Route-Basis:**
```
/v7/berater/app/cockpit          -> Berater-App-Cockpit (4 Kacheln)
/v7/berater/app/firma/[id]       -> Firmen-Cockpit
/v7/berater/app/firma/[id]/...   -> Sub-Pages (in Arbeit)
```

**Offene Punkte (Session 44):**
- Firmen-Cockpit Sub-Pages in App-Struktur: Projekte, ZA, Firmendaten (12-19 aus Navigationsliste)
- returnTo-URLs komplett auf /v7/berater/app/ umstellen
- Login-Redirect: system_admin + pze_mode='app' -> direkt zu /v7/berater/app/cockpit
- FZul-Seite: PortalHeader + PortalNav einbauen (wenn Modul ausgebaut wird)

### 3.18 Session 44 (12. Mai 2026) - Nav-Konsistenz + Projektbereinigung

**Navigation komplett ueberarbeitet:**
- **AppNav v1.0.1:** Home-Button nur Icon (Haeuschen 20px), kein Label "Cockpit"
- **PortalNav v7.4.4-22:** Home im App-Modus -> /v7/berater/app/cockpit (Startseite).
  Kundenfirmen -> Firmenliste (Buchstaben-Kacheln). Forschungszulage als Nav-Item ergaenzt.
  Aktive Items hervorgehoben statt versteckt. Konsistente Nav auf jeder Seite:
  Home | Kundenfirmen | Netzwerk | Kapazitaetsplanung | Forschungszulage | Administration
- **berater-multiprojekt-page v7.4.8-12:** Dashboard-Link im App-Modus ausgeblendet
- **ZASeite v1.0.8:** "Zurueck zum Cockpit" -> "Zurueck"
- **berater-firma-detail-page v7.4.4-7:** "Zurueck zum Cockpit" -> "Zurueck"
- **berater-cockpit-page v7.4.9-3:** userRole korrekt aus Profil, select-Modus abgefangen,
  keine doppelte PortalNav (FirmaCockpit bringt eigene mit)

**Projektverzeichnis bereinigt:**
- downloads/: 57 alte Versionen in archiv/ mit Unterordnern (komponenten, git-sicherung, pflichtenheft, konzepte, anleitungen, sonstige)
- Claude-Projektverzeichnis: 81 alte Versionen entfernt
- PZE-Root: alte PFLICHTENHEFT + GIT-SICHERUNG per git rm

**Neue Konvention:** Waehrend der Session nur Downloads, am Ende Upload-Checkliste fuer Claude-PV.

### 3.19 Session 46 (29. Mai 2026) - Feiertags-Fix + Supabase Max-Rows-Fix

**CRITICAL FIX: Feiertage als Fehlzeiten (TimesheetForm v7.4.6-19):**
Seit Session 38 (Fehlzeiten editierbar, v7.4.6-16) wurden gesetzliche Feiertage
nicht mehr automatisch in der S-Zeile (Sonstige bezahlte Ausfallzeiten) vorbelegt.
Betroffen: April 2026 (Karfreitag, Ostermontag), Mai 2026 (Tag der Arbeit, Christi
Himmelfahrt, Pfingstmontag) und alle folgenden Monate.
- Auto-Fill in loadTimeEntries: Werktags-Feiertage ohne bestehenden S-Eintrag
  werden mit Tagesstunden (standard_weekly_hours / 5) vorbelegt
- company-Felder (federal_state, holiday_region, standard_weekly_hours) in
  useEffect-Dependencies ergaenzt (Timing-Fix)
- Bereits manuell erfasste S-Werte werden NICHT ueberschrieben

**CRITICAL FIX: Supabase 1000-Zeilen-Limit:**
Supabase Default Max Rows = 1000. Bei AS System HEATS (4 MA x 13 Monate >1000 Eintraege)
wurden Timesheet-Daten stillschweigend abgeschnitten. Monatsverlauf-Chart zeigte
Mai 2026 nur 94h statt ~500h. Zeiterfassungs-Status-Tabelle zeigte zu wenig "Erfasst".
- Supabase Dashboard: Max Rows auf 10000 erhoeht (PROD + DEV)
- Code: .limit(10000) in allen 9 betroffenen v7_timesheets-Queries als Absicherung
- Betroffene Dateien: BerichtePage, FirmaCockpit, WorkPackageTable, useBerichteData,
  timesheet-viewer, mein-status-page, berater-multiprojekt-detail (2x), berater-multiprojekt-page

**Neue Prozess-Regeln (Abschnitt 12b, Regel 11-13):**
- Supabase Max Rows bei Projektsetup sofort auf 10000 setzen
- Vor Code-Aenderung: aktuellste Version aus Projektverzeichnis pruefen
- Smoke-Test-Checkliste nach jedem Deploy

**Offene Punkte Session 46:**
- Diagnose-Logging in BerichtePage entfernen (DIAGNOSE console.log)
- AP-Druck-Bug: AP-Nummer erscheint doppelt, AP-Name abgeschnitten im PDF/Druck

### 3.20 Session 46b (29. Mai 2026, Abend) - AP-Druck-Fix + DEV-Datensync

**FIX: AP-Name im Druck/PDF (TimesheetForm v7.4.6-20):**
- line-clamp-2 und maxWidth im Print aufgehoben (print-no-clamp, print-ap-name CSS)
- Select im Print als statischer Text statt display:none (appearance:none, kein Pfeil)
- AP-Name jetzt vollstaendig sichtbar im Druck

**Diagnose-Logging entfernt (BerichtePage v7.4.6-17):**
- Temporaere DIAGNOSE console.logs aus Session 46a entfernt
- .limit(10000) bleibt als Absicherung

**DEV-Datensynchronisation eingerichtet:**
- Script: scripts/sync-prod-to-dev-v2.mjs (Node.js, direkte PostgreSQL-Verbindung)
- Liest PROD per Supabase REST-API, schreibt DEV per direktem PostgreSQL
- FK-Checks waehrend Sync deaktiviert (session_replication_role = replica)
- DEV-Schema angepasst: v7_timesheet_completions angelegt, fehlende Spalten ergaenzt
- 3 Extra-Unique-Indexes in DEV entfernt (existierten nicht in PROD):
  v7_timesheets_unique_wp_entry, v7_timesheets_unique_absence_entry,
  v7_timesheets_unique_nonbillable_entry
- Nach Sync: v7_user_profiles + v7_consultant_access manuell wiederherstellen
  (werden nicht synchronisiert wegen Auth-Bindung)
- DEV und PROD jetzt 100% identische Daten (5129 Timesheets, 9 Projekte, 39 MA)

---

## 4. Komponenten-Uebersicht

### 4.1 Shared Components (src/components/shared/)

| Datei | Version | Funktion |
|-------|---------|----------|
| ArbeitsplanImport.tsx | 7.3.87 | Excel Download/Upload |
| ConsultantManagement.tsx | aktuell | Berater-Verwaltung |
| EmployeeManagement.tsx | **7.3.95-20** | MA + modalOnly + onClose fuer Inline-Cockpit; A-024 E-Mail-Bestaetigungsfeld bei Neuanlage; A-050 optionales Benutzername-Feld im Login-erstellen-Dialog |
| MitarbeiterModal.tsx | **1.0.3-3** | Leichtes MA-Modal im Cockpit (new/edit/password); Gehaltsdaten (Anlage 6.1); A-024 E-Mail-Bestaetigung bei Neuanlage; A-031 Login-Erstellung im Passwort-Modus bei fehlendem Login (Formular + /api/v7/create-employee-login, ALREADY_REGISTERED abgefangen); A-050 optionales Benutzername-Feld im Login-erstellen-Bereich |
| FirmendatenCard.tsx | **7.4.6-2** | Firmendaten + Feiertagsregion-Dropdown ; **v7.4.6-2 (Session 81): Bundesland als ISO-Code. BUNDESLAENDER als { code, name } wie in der Firmen-Neuanlage; Option-Value = Code, Label = Name. Vorbelegung ueber normalizeStateCode() - Altbestand mit Langnamen wird korrekt vorausgewaehlt. Gespeichert wird immer der ISO-Code, angezeigt der Klartextname.** |
| NWMEigenanteilPanel.tsx | **7.4.5-13** | EA-Berechnung, Archiv, PDF ; **v7.4.5-13 (Session 80): FZ-basierte Foerderquote + Grenzvalidierung. Identische FZ-Logik wie ZAPanel: FZ-Laden, fzMatchEA, fzGrenzfehlerEA. laufzeitjahr und foerdersatz FZ-basiert mit Fallback. Berechnung blockiert bei Grenzueberschreitung. Badges mit Quelleninfo, rote Warnung.** |
| NWMEinstellungenPanel.tsx | 7.4.5-1 | NWM-Settings, Bankdaten, Rechnungskonfig |
| NWMPartnerPanel.tsx | 7.4.5-4 | Netzwerkpartner, Smart-Quoten |
| PortalHeader.tsx | **7.3.95-15** | Cockpit-Sync, portal_role fuer Firmen-Portal; dashboardHref im Berater-App-Modus -> App-Cockpit; A-050 Menuepunkt "Benutzername festlegen/aendern" (Selbstbedienung, /api/v7/set-username) |
| PortalNav.tsx | **7.4.4-26** | App-Modus: Home->Startseite, FZul, aktive Items hervorgehoben; A-025 "Unternehmen"-Tab im App-Modus ausgeblendet; v7.4.4-25 Hydration-Fix pze_mode; v7.4.4-26 FZul-Nav-Item nur fuer system_admin (isAdmin: true) |
| AppNav.tsx | **1.0.2** | Neue Navigation fuer App-Struktur, Home nur Icon; v1.0.2 FZul-Nav-Item nur fuer system_admin |
| ProjectTeamManager.tsx | **7.4.4-20** | Team-Verwaltung, ROLE_OPTIONS auf 3 ZA-Werte reduziert ; **v7.4.4-20 (Session 81): Divergenz-Hinweis pWAZ. Weicht die im Projekt erfasste pWAZ vom aktuellen Stammsatz des MA ab (Toleranz 0,01 h), erscheint im Add- und im Edit-Dialog ein Hinweis mit beiden Werten. Bewusst nur Hinweis, keine Uebernahme: die pWAZ ist der Nenner der Anlage-6.1-Stundensatzkalkulation und an Antrag/Bescheid gebunden.** |
| SystemConfigPanel.tsx | **7.4.4-2** | Config-Toggles: manuals_enabled + cockpit_berater/firma_enabled |
| TimesheetForm.tsx | **7.4.6-103** | A-021 NWM-Tagessperren + projektuebergreifende 9h-Tagesgrenze (gilt generell), A-002/A-003; A-026 U/K/S in AP-Zelle als Fehlzeit; Doppelsave-Schutz; A-030 Meine-Arbeitspakete-Popup; A-033 MA-Auswahl aufs Projektteam; v7.4.6-43 Soll + Foerder-Monatsgrenze projektbasiert via hoursPerPM(pmBasis) (160,33 bei 37h), physischer projektuebergreifender Monatsdeckel = hoursPerPM(echte weekly_hours)=162,50h; **A-034 (v7.4.6-45/-46/-47): zentrale Abwesenheiten - Laden projektuebergreifend aus v7_employee_absences, Speichern als Sync (MA+Monat) statt v7_timesheets, Konfliktpruefung ein Code/Tag, S an Feiertag bleibt berechnet, harte Cross-Projekt-Abwesenheitssperre (AP+Nicht-foerderbar-Zellen disabled an Abwesenheitstagen)**; v7.4.6-48/-49 A-036 Feiertags-Sperre der Fehlzeit-Zeilen + A-038 Fokus-Weitersprung; -50/-51 Alle-AP-Modal (geplant/gebucht/offen, 2 Dezimalstellen); **v7.4.6-52: A-045 canEdit TYP-ABHAENGIG (Arbeitszeilen ueberspringen Abwesenheits-/Sperrtage inkl. getAbsenceCodeForDay, Fehlzeit-Zeilen U/K/S erreichbar) + A-046 Fehlzeit-Tagesstunden erben Firmenstandard (7,5 statt 8), company in Effekt-Deps**; **v7.4.6-57 (Session 62): Stundennachweis-Optik schwarz/entfaerbt (Abschnitts-Baender + Summenzellen ohne Hintergrundfarbe, Summen weiter fett), DS-Summenlabels einzeilig (T)/(NT), "Urlaub (nur bezahlter Urlaub)", Unterschrifts-Labels groesser, printRef translate="no"+notranslate (Uebersetzungssperre GRAVID->SCHWANGER), PDF-Dateiname-Schema NV_YYMM_FKZ_Stundenerfassung_Vorname_Nachname via document.title-Swap, "sonstige Arbeiten"-Normalzellen bg-white (Rahmen-Konsistenz)**; **v7.4.6-58: Feiertags-Tagesstunden folgen der individuellen MA-WAZ - Feiertag-Auto-Vorbelegung der S-Zeile nutzt employeeDailyHours (weeklyHoursAtMonth/5) statt company.standard_weekly_hours/5, Lade-Effekt haengt jetzt von weeklyHoursAtMonth ab; behebt Teilzeit-Block (38h-MA bekam am Feiertag 8,00 > Tagesgrenze 7,60); v7.4.6-59: PDF-Dateiname final - Leerzeichen statt Unterstrich, ohne "Stundenerfassung": "<NN><VV> <YYMM> <FKZ> <Vorname> <Nachname>", Fallback "<YYMM> <FKZ>"; kein .pdf im document.title (Browser haengt es an)**; **v7.4.6-60 (Session 64): GF-50%-Regel wieder aktiv - GF-Erkennung ueber toleranten Helfer istGeschaeftsfuehrerTitle() (v7-types 7.4.9-2) statt exaktem ASCII-Match (behebt istGF immer false bei Umlaut-/weiblichen Bestandsdaten); v7.4.6-61 Paket A: rechte "offen"-Spalte live schon waehrend der Eingabe (Live-Delta ueber Schnappschuss savedMonthHoursPerWP) + Farben zurueck (offen gruen, ueberbucht rot, projektweit-offen blau); v7.4.6-62 Paket B: persoenliche WAZ (weeklyHoursAtMonth) neben dem MA-Feld + ZA-Direktlink in der Steuerleiste (returnTo=aktuelle URL, portal-abhaengige Route); v7.4.6-63 Paket C: Auto-Vorbelegung "sonstige Arbeiten" = max(0, pWAZ/5 - dieses Projekt - andere Projekte) je Arbeitstag, neuer Monat fuellt leere Tage + fuehrt live nach, gespeicherter Monat laesst leere Tage in Ruhe, manuell angefasste Tage unangetastet, weicher Save-Hinweis auf Luecken-Tage; v7.4.6-64 Grenzen-Korrektur: "sonstige Arbeiten" (nicht foerderbar) zaehlen NICHT mehr in die 9h-Tagesgrenze und nicht in die physische Monatskapazitaet (behebt faelschliches "Speichern gesperrt" bei langen Monaten); Foerder-Monatsgrenze + Anzeige-Summen unveraendert**; **v7.4.6-65 (Session 70): Abwesenheit U/K/S raeumt die auto-vorbelegte "sonstige Arbeiten"-Zelle desselben Tages - handleCellChange entfernt nonBillableEntries[day]+Manual-Marker (symmetrisch zur AP-Zelle) + Auto-Vorbelegung-Sicherheitsnetz an Abwesenheitstagen; behebt Fehlzeit+sonstige=16h Tagesueberschreitung; Rueckweg fuellt den Tag beim Entfernen der Abwesenheit wieder** ; **v7.4.6-79/-80/-81 (Session 76, Feature Katrin): rechte "+/-"-Spalte umschaltbar zwischen projektweiter Restzahl ("gesamt", geplant - gebucht ueber alle Monate) und "monatsende" (geplant - (Vormonate + Live-Formstand); spaetere Monate nicht abgezogen). Datengrundlage: reloadBookedHours liest work_date mit -> monthlyBookedPerWP; Helfer bookedBeforeSelectedMonth + calculateRemainingHoursMonthly. Betroffen nur die gruen/rot angezeigte Restzahl ZUGEORDNETER APs (blaue projektweite Restzahl + "Alle AP"-Modal unveraendert). Umschalter = Kreispfeil in der Rest-Kopfzelle (ersetzt Text "+/-"): grau = Monatsende, gruener Chip = gesamt, print:hidden; -80 Zwischenstand Schiebeschalter, -81 Endstand Kreispfeil. DEFAULT ohne gespeicherte Wahl = monatsende; Persistenz pro Nutzer in v7_user_preferences.settings.timesheet_rest_modus (Laden beim Oeffnen, Speichern per upsert)** ; **v7.4.6-82/-83 (Session 77): AP-Angebot zeitlich getrennt. Neuer monatsgenauer Startmonats-Filter hasAPStarted - "Zugeordnete AP" (automatisch angezeigt) erscheinen erst ab wp.start_date-Monat (Dropdown + Vorbelegung). "Weitere AP" bewusst OHNE Zeitfilter (jederzeit vollstaendig, fuer vorgezogene/uebernommene APs). Obergrenze end_date+2 Monate bei zugeordneten APs entfernt - waehlbar solange offene Stunden (planned-booked>0). -82 hatte den Filter versehentlich auch auf "Weitere AP" gelegt, -83 korrigiert das.** ; **v7.4.6-88 (Session 81): WAZ-Quelle. Rangfolge Teilzeit-Historie (zum Monatsersten) -> v7_employees.weekly_hours -> Firmenstandard; die pWAZ des Projekts ist KEINE Quelle. Anzeige neben der MA-Auswahl nennt die Quelle ("lt. Historie" / "lt. Stammdaten" / "Firmenstandard"). Zwischenstand -87 (pWAZ-Vorrang) zurueckgenommen.** ; **v7.4.6-89: Abwesenheitscode 'E' vom Monats-Abgleich beim Speichern ausgenommen (Ist-Abfrage filtert auf U/K/S) - ohne diesen Filter waere ein Elternzeit-Zeitraum beim naechsten Speichern still deaktiviert worden.** ; **v7.4.6-90: Lesepfad Elternzeit. E-Tage aus v7_employee_absences (elternzeitDays), getAbsenceCodeForDay liefert auch 'E' -> ganztaegige Sperre; neue Anzeigezeile "Elternzeit (E, keine Arbeitszeit)" mit Tageszahl; die Feiertags-Vorbelegung der S-Zeile ueberspringt E-Tage.** ; **v7.4.6-91: An E-Tagen auch keine Fehlzeiten U/K/S erfassbar (kein Eingabefeld, Zelle hellblau, canEdit ueberspringt sie).** ; **v7.4.6-92: Bereichsdialog Elternzeit (Rechtsklick oder Eingabe "E"). Von/Bis mit Vorschau: Zahl der Tage, bereits erfasste E-Tage, zu ersetzende U/K/S (Vorgabe ersetzen), Tage mit erfassten Arbeitsstunden (werden NICHT ueberschrieben), abgeschlossene Monate (uebersprungen). Geschrieben werden Mo-Fr inkl. Feiertagen. Ruecknahme im selben Dialog. Nur Berater oder Firmen-Administrator.** ; **v7.4.6-93: Rechtsklick auf gesperrten Zellen wieder moeglich - das disabled-Input bekommt 'pointer-events-none' (wie zuvor bei Kurzarbeit), sonst erschien das Browser-Menue.** ; **v7.4.6-94/-95/-96 (Endstand): "sonstige Arbeiten" ist immer die Differenz aus Tagesarbeitszeit und gebuchten Stunden. -94: keine manuellen Overrides mehr ableiten (die alte Heuristik verglich mit der reinen Tagesformel, waehrend die Auto-Vorbelegung zusaetzlich den Wochendeckel anwendet - so entstandene Werte galten faelschlich als manuell und wurden eingefroren). -95: einheitliches Zahlenformat in allen Stundenzellen (fmtHCell). -96: auch leere Arbeitstage werden wieder gefuellt (Unterscheidung neuer/gespeicherter Monat entfaellt). Wochenenden, Feiertage, gesperrte Tage, Kurzarbeit und Abwesenheitstage bleiben ohne Auto-Vorbelegung.** ; **v7.4.6-84 (Session 78, hier nachgetragen mit v5.41): Obergrenze fuer die Auto-Anzeige "Zugeordnete AP" wieder eingefuehrt, jetzt START-BASIERT. Helferfunktion monthsSinceStart(wp) liefert die ganzen Kalendermonate zwischen wp.start_date-Monat und gewaehltem Timesheet-Monat; isAPInAssignedGroup zeigt bzw. belegt ein zugeordnetes AP nur noch bei monthsSinceStart <= 3 vor. Ersetzt die in v7.4.6-82 ersatzlos entfallene end_date+2-Grenze; behebt, dass abgeschlossene APs mit blossem Rundungsrest (0,01 h offen) dauerhaft vorbelegt blieben. Grundlage: AP laut Foerderrichtlinie max. 3 PM (~3 Kalendermonate). Reststunden-Pruefung bleibt als UND. "Weitere AP" unveraendert ohne Zeitfilter. Untergrenze hasAPStarted unveraendert. Regel in allen Folgebuilds bis -96 unveraendert enthalten.** ; **v7.4.6-97 (Session 81): PDF-Dateiname Einzeldruck auf "<Nachname>_<FKZ>_Stundennachweis_<YYMM>" umgestellt (Bsp. "Sarac_16DS251601_Stundennachweis_2510"). Ersetzt das Schema aus v7.4.6-59. Nur der Nachname, erster Token, ASCII-gewandelt; ohne Namen Fallback "<FKZ>_Stundennachweis_<YYMM>". Kein .pdf im document.title.** ; v7.4.6-101 PDF-Dateiname Einzeldruck "<Nachname><Vorname>_<FKZ>_Stundennachweis_<YYMM>" (Bsp. "DuhrkopThomas_16KN..._Stundennachweis_2609"). Vorname: erstes Wort, vollstaendig, ASCII-gewandelt, ohne Trenner hinter dem Nachnamen. Ohne Vorname nur der Nachname, ohne Nachname Fallback "<FKZ>_Stundennachweis_<YYMM>". Ergaenzt das Schema aus v7.4.6-97. Nur handlePrint. ; v7.4.6-102 Knopf "VN" rechts neben "ZA" (nur Berater-Portal, VN-faehige Formate), returnUrl = aktuelle URL. ; v7.4.6-103 Auto-Vorbelegung "sonstige Arbeiten" nur auf leeren Arbeitstagen (keine Stunden in diesem oder einem anderen Projekt, keine Abwesenheit), Wert = volle Tagesarbeitszeit, wenn das Wochen-Restbudget reicht, sonst leer. An Tagen mit Projektstunden wird die Zelle geleert. Der weiche Speicher-Hinweis auf "Luecken"-Tage (v7.4.6-63) entfaellt. |
| BerichtePage.tsx | **7.4.6-23** | Dashboard + .limit(10000); A-035 oberer Projekt-Dropdown setzt selectedReportProjectId UND matrixProjectId synchron; v7.4.6-19 pm_basis_weekly_hours in Select + Interface -> an ProjektFortschrittPanel durchgereicht; v7.4.6-20 A-034 Dual-Read der zentralen Abwesenheiten (employeeAbsences); v7.4.6-22 Personalkosten-Export nutzt hoursPerPM(pm_basis) statt 173,33 (Panel weiterhin ausgeblendet); v7.4.6-23 A-044 Matrix-Klick reicht projectId (&projekt=) an die ZE-Seite |
| FirmaCockpit.tsx | **7.4.9-36-21** | Deep-Link ?editMA+?returnTo, Inline MA-Modal; A-020 Firmen-Deaktivierung; Prognose gesamt auf Plan gekappt (5.58); A-031 Schluessel-Icon Login/Passwort dynamisch je user_id; v7.4.9-36-3 pm_basis_weekly_hours in Select + ProjektData -> Kosten/PM projektbasiert via utils; **v7.4.9-36-4 (Session 72, GL-Wunsch): Projekt-Kaestchen der MA-Liste umgewidmet - Klick fuehrt in die Stundenerfassung (Zeiterfassung), vorgefiltert MA + Projekt (?employee=&projekt=&returnUrl=), Darstellung Projektname + Uhr-Symbol; handleTeamMemberClick -> handleStundenerfassungClick (Route analog cockpit-stundennachweis v7.4.9-7), reine UI/Navigation** ; **(Session 77) Prognose-"Basis"-Text auf "Plan-Erfuellung XX% (Ist/Soll bis heute)" umgestellt (neues Feld erfuellungsgrad aus den utils).** ; **v7.4.9-36-14 (Session 80): NWM-Erkennung + Jahresselektor. Automatische Vorauswahl des aktuellen Netzwerkjahrs (heutiges Datum innerhalb FZ-Bereiche). Analyse-Abschnitt beruecksichtigt gewaehlten Zeitraum.** ; **v7.4.9-36-15 (Session 81): Monatsverlauf an ProjektFortschrittPanel v7.4.5-34 angeglichen - "Soll kumuliert" und "Zieltempo" entfernt, Beschriftung angepasst. Das Cockpit haelt eine EIGENE Kopie des Diagramms; sie wurde bei der Umstellung zunaechst uebersehen und zeigte weiterhin drei gestrichelte Linien.** |
| ProjektFortschrittPanel.tsx | **7.4.5-34** | Zielerreichungs-Prognose, PDF-Export; Berechnung via projektfortschritt-utils (A-011); v7.4.5-25 pm_basis_weekly_hours im Project-Interface -> an utils durchgereicht (Kosten/PM projektbasiert) ; **(Session 77) Prognose-"Basis"-Text auf "Plan-Erfuellung XX% (Ist/Soll bis heute)" umgestellt (neues Feld erfuellungsgrad aus den utils).** ; **v7.4.5-33 (Session 80): NWM-Jahresselektor. Neues Dropdown "Netzwerkjahr" fuer NWM-Projekte (funding_format ZIM_NETZWERK). Laedt Foerderzeitraeume aus v7_nwm_foerderzeitraeume. Optionen: je NWJ "NWJ X (Datum-Datum, FQ XX%)" + "Gesamtverlauf". Bei Auswahl eines NWJ werden Start-/Enddatum als Filter an Fortschritts- und Prognose-Berechnung weitergegeben.** ; **v7.4.5-34 (Session 81): "Verschenkt" bezieht sich auf das, was der Arbeitsplan hergibt (bei 100 Prozent Erreichungsgrad 0 EUR); neuer Block "Planungsluecke im Arbeitsplan" mit Foerder- und Kostenbetrag, nur wenn eine Luecke besteht. Im Monatsverlauf die Linien "Soll kumuliert" und "Zieltempo kumuliert" entfernt. Fussnote erklaert Ist nach Buchungsmonat gegen Soll ueber AP-Laufzeit.** |
| StundennachweisMatrix.tsx | **7.4.6-23** | Quelle: projectAssignments (Projektteam); A-029 Sammeldruck-Modus (Auswahl Spalten/Zeilen/Zellen -> StundennachweisSheet-PDF, nur Blaetter im Druck via #snw-print-root); A-032 MA-Zeilen auf aktives Projekt gefiltert (Mehr-Projekt-Firmen); A-035 Selbstheilungs-Guard auf activeProjectId (Fallback projects[0], wenn matrixProjectId nicht im uebergebenen projects-Array liegt); v7.4.6-6 A-034 Dual-Read der zentralen Abwesenheiten im Sammeldruck; v7.4.6-7 A-044 Monatszell-Klick uebergibt activeProjectId an onNavigateToZE (Projekt-Vorauswahl in der ZE-Seite); v7.4.6-8 (Session 62) sprechender Sammeldruck-PDF-Dateiname (1 MA: NV_Zeitraum_FKZ_Stundenerfassung_Vorname_Nachname mit Zeitraum YYMM bzw. YYMM-YYMM; mehrere MA: Stundennachweise_Zeitraum_FKZ) via document.title-Swap vor window.print; v7.4.6-9 PDF-Dateiname final (Leerzeichen, ohne "Stundenerfassung"/Praefix): 1 MA "<NN><VV> <Zeitraum> <FKZ> <Vorname> <Nachname>", mehrere MA "<Zeitraum> <FKZ>"; v7.4.6-10 (Session 64, Paket B) ZA-Direktlink im Karten-Header (print:hidden, weil der Zurueck-Button im Seiten-Wrapper liegt), gleiche Seite mit returnTo=aktuelle URL ; **v7.4.6-16 (Session 81): PDF-Dateiname Sammeldruck auf dasselbe Schema wie der Einzeldruck umgestellt. Ein Mitarbeiter -> "<Nachname>_<FKZ>_Stundennachweis_<Zeitraum>", mehrere Mitarbeiter -> "<FKZ>_Stundennachweis_<Zeitraum>" ohne Namensteil. Zeitraum YYMM bzw. YYMM-YYMM. Ersetzt das Schema aus v7.4.6-9.** ; v7.4.6-21 ZA-Sprung als Knopf "Zahlungsanforderung" in der Bedienleiste; Link "ZA" in der Kopfzeile entfaellt. ; v7.4.6-22 PDF-Dateiname Sammeldruck mit einem Mitarbeiter "<Nachname><Vorname>_<FKZ>_Stundennachweis_<Zeitraum>", identisch zum Einzeldruck. Mehrere Mitarbeiter unveraendert "<FKZ>_Stundennachweis_<Zeitraum>". Ergaenzt das Schema aus v7.4.6-16. ; v7.4.6-23 Knopf "Verwendungsnachweis" rechts neben "Zahlungsanforderung" (nur Berater-Portal, VN-faehige Formate). |
| WorkPackageTable.tsx | **7.4.3-13** | Arbeitsplan, PM 3 Dezimalstellen; v7.4.3-13 PM->Stunden projektbasiert (Prop pmBasisWeeklyHours, hoursPerPM), Soll + Legende dynamisch ("1 PM = 160,33 Stunden" bei 37h) |
| ZAPanel.tsx | **7.4.4-89** | ZA speichern oben, Grid 50/50, Status-Automatik; v7.4.4-53 #418-Fix (mounted-Gate gegen Hydration-Mismatch); v7.4.4-56 A-042 Auto-Auswahl letzte/initialZaId-ZA beim Laden, Einreichdatum leer per Default, Archiv-Spalte Zahlungseingang-Betrag rechtsbuendig; **v7.4.4-57/-58 ZA-Druck robust (Firefox-Timing-Fix, dann Druck ueber unsichtbares iframe statt Popup - exakt sichtbarer ZA-Bereich, Doppeldruck-Schutz); v7.4.4-59 ZA-Stundensatz dreistufig gehaertet (anerkannter/gekuerzter Traeger-Satz AS-IS -> sonst kalkulatorisch auf Antrags-WAZ skaliert -> sonst sichtbare Warnung in Anlage 1b statt stiller 0); v7.4.4-61 (Session 71) Anzeige-Umlaute im ganzen Panel korrigiert - JSX-Text als HTML-Entities, JS-String-Literale als \u-Escapes, nur Anzeige-Literale, keine Logik (Verhaltensvertrag ZA-01..ZA-11 intakt)** ; **v7.4.4-68/-69 (Session 80): FZ-basierte Foerderquote fuer NWM-Projekte. Laedt Foerderzeitraeume aus v7_nwm_foerderzeitraeume. getFoerderquoteFromFZ matcht zeitraum_bis gegen FZ-Bereiche, liefert foerderquote direkt statt per Datumsarithmetik. Anzeige als Badge "(aus FZ-Tabelle)" / "(Fallback)". -69: Neue FZ-Grenzueberschreitungs-Validierung (checkFZGrenzueberschreitung) - wenn von/bis in verschiedene FZ mit unterschiedlichen Foerderquoten fallen, Speichern blockiert + rote Fehlermeldung. Alte Logik als Fallback erhalten.** ; v7.4.4-87 optionale Props onNavigateToZE / onNavigateToMatrix; Monat und Stundenzellen der Anlage 1a klickbar, Knopf "Stundennachweis-Matrix" neben "Drucken". Ohne Props unveraendert (Firma-Portal, BerichtePage). ; v7.4.4-88 optionale Prop onNavigateToVN, Knopf "Verwendungsnachweis" links neben "Stundennachweis-Matrix", nur bei VN-faehigen Foerderformaten. v7.4.4-89 openPanel(pid, keepZaId?): nach "ZA speichern" wird die gespeicherte ZA geladen; Fehler beim INSERT einer neuen ZA wird gemeldet. |
| ZASeite.tsx | **1.0.13** | Eigenstaendige ZA-Bearbeitungsseite (Berater + Firma), aufgerufen aus FirmaCockpit / Cockpit-ZA-Liste und per ZA-Direktlink aus Timesheet/Matrix; v1.0.8 "Zurueck zum Cockpit" -> "Zurueck"; v1.0.10 (Session 64) zurueckUrl honoriert einen konkreten returnTo-Pfad (beginnt mit '/') statt fix aufs Dashboard zu springen (Alt-Sentinel 'cockpit' + Portal-Defaults unveraendert, startsWith('/') schuetzt vor externen Zielen) ; v1.0.12 URL-Parameter tab fuer alle vier Tabs; baut die Sprungziele (nur Berater-Portal); traegt im Ruecksprung-Link nur den Ursprung weiter. ; v1.0.13 Sprung zum VN; Sprung zur Matrix mit returnUrl (Zurueck in der Matrix fuehrt auf dieselbe ZA und denselben Tab); zaUrsprung ueberspringt VN-URLs. |
| ProjectDetailPage.tsx | **7.4.4-59** | Projekt-Detail + NWM; returnTo-Navigation; Deep-Link ?tab; v7.4.4-59 NEU Eingabefeld "Wochenarbeitszeit-Basis Antrag/Bescheid (h)" im Bearbeiten-Dialog (pm_basis_weekly_hours), wird an WorkPackageTable durchgereicht |
| ProjectList.tsx | **7.3.88-7** | returnTo Prop fuer /projekt/neu |
| ProjectCreateForm.tsx | **7.4.2-7** | NEU (Session 66, V7.6.0): Projekt-Anlage manuell ODER per ZIM-Antrags-PDF. PDF-Import-Tab (in Berater- UND Firmen-Portal, Session 67): Upload -> Vorschau (Projektkopf editierbar inkl. Kurzbezeichnung; MA-Tabelle mit Dublettenabgleich, pWAZ, Stundensatz, Info-Anzeige frueherer Saetze; Arbeitsplan-Matrix; Kontrollsummen-Status), Duplikat-Rueckfrage (bestehende Firmenprojekte + Frage neu/aktualisieren, strich-tolerant + Akronym-Signal). Uebernahme ATOMAR ueber /api/v7/import-antrag-neu (RPC v7_import_projekt_team) + Arbeitsplan ueber /api/v7/arbeitsplan-import; Einstiegspunkt 2 ("bestehendes Projekt aktualisieren") bewusst verworfen |
| lib/holidays/germanHolidays.ts | 7.4.6-1 | Zentrale Feiertags-Utility |
| lib/projektfortschritt-utils.ts | **7.4.9-16** | Shared Berechnungslogik: Monatsverlauf, Prognose, Szenarien; foerderMaximum=min(bewilligt, Plankosten x Satz) (5.58); v7.4.9-3/-4 NEU hoursPerPM(waz)=waz*52/12, PFProject.pm_basis_weekly_hours + firm_standard_weekly_hours, Soll/PM via hoursPerPM(pmBasis), Kosten-rateScale PRO MA (= weekly_hours/pmBasis) -> Kosten = PM x Monatsgehalt; maxProjektstundenMonat optional projektbasiert; rueckwaertskompatibel (40h-Fallback) ; **v7.4.9-6 (Session 77): Zielerreichungs-Prognose auf PLANERFUELLUNG umgestellt. prognostizierteGesamtStunden = Ist(abgeschlossene Monate) + Rest-Soll(aktueller + kuenftige Monate) x Erfuellungsgrad; Erfuellungsgrad = Ist/Soll der abgeschlossenen Monate (gekappt [0,1.15]). AP-genaue Soll-Verteilung sollMonatMap zentral vorberechnet (auch vom Monatsverlauf genutzt). Prognoselinie im Chart folgt geplantem Soll x Erfuellungsgrad. Neues Rueckgabefeld erfuellungsgrad. Ersetzt die flache 3-Monats-Tempo-Fortschreibung, die den normalen Projektauslauf faelschlich als "gefaehrdet" auswies. Ampel-Schwellen unveraendert (>=90% gruen, >=60% gelb, sonst rot).** ; **v7.4.9-16 (Session 81): Massstab fuer "verschenkt" ist nicht mehr die bewilligte Summe, sondern das bei voller Planerfuellung Abrufbare (foerderbarPlanErfuellt = min(Plankosten x Foerdersatz, bewilligte Summe)). Neue Felder planungsluecke, planungslueckeKosten, bewilligteSummeGesetzt. Prognose-, Szenarien- und Bedarfslogik unveraendert.** |
| StundennachweisSheet.tsx | **1.0.4** | statisches Stundennachweis-Blatt (Anzeige/Druck), Layout 1:1 zum Einzeldruck; im Sammeldruck (A-029) verwendet; v1.0.1 bedingte Kurzarbeit-Zeile (KA, nur wenn vorhanden, rein informativ); **v1.0.3 (Session 62) Layout-Bereinigung analog TimesheetForm: Abschnitts-Baender + Summenzellen ohne Hintergrundfarbe (Summen fett), alle Schriften schwarz, DS-Labels einzeilig (T)/(NT), "Urlaub (nur bezahlter Urlaub)", Unterschrifts-Labels groesser, translate="no"+notranslate, "sonstige Arbeiten"-Zellen bg-white** ; **v1.0.4 (Session 81): Zeile "Elternzeit (E, keine Arbeitszeit)" - nur wenn E-Tage vorhanden, Summe = Tageszahl, keine Stunden. Erfordert stundennachweisSheetData ab v1.0.2.** |
| lib/stundennachweisSheetData.ts | **1.0.2** | NEU: reiner Builder gespeicherte Timesheets -> Stundennachweis-Anzeigemodell (fuer Einzel-/Sammeldruck) Stundennachweis-Blatt; **v1.0.2 (Session 81): Elternzeit (absence_code 'E', 0 Stunden) als Tag-Marker (elternzeitByDay/elternzeitDays) analog Kurzarbeit; an E-Tagen unterbleibt die Feiertags-Vorbelegung der S-Zeile.** |
| lib/employeeAbsences.ts | **1.0.0** | NEU (A-034): laedt zentrale Abwesenheiten aus v7_employee_absences, mappt ueber das Assignment-Fenster auf Projekte, liefert synthetische Timesheet-Zeilen (loadEmployeeAbsencesAsTimesheets) fuer die Lesepfade (Dual-Read) |
| hooks/useBerichteData.ts | **1.0.3** | Berichts-Datenhook; v1.0.2 A-034 Dual-Read der zentralen Abwesenheiten (Merge + Dedup); v1.0.3 A-040 .limit(10000) auf v7_timesheets-Query wiederhergestellt |
| types/v7-types.ts | **7.4.9-3** | Zentrale TS-Typen + Foerder-Helfer; v7.4.9-2 (Session 64) toleranter GF-Helfer istGeschaeftsfuehrerTitle() (normalisiert Umlaut/ASCII, Gross-/Kleinschreibung, weibliche Form), POSITION_OPTIONS mit echten Umlauten als \u-Escapes; v7.4.9-3 (Session 68) 'ZIM' und 'ZIM_DS' in Typ-Union, Label-/Short-Maps und V7_PUBLIC_FUNDING_FORMATS (Alt-Projekte mit generischem funding_format 'ZIM' - in PROD der Regelfall - werden sonst nicht als gefoerdert erkannt). LEHRE: position_title ist zugleich UI-Text UND Match-Key, darf nicht ASCII-fiziert werden |
| lib zim-antrag-extraktor | **1.0-3** | NEU (Session 66): eigener TS/Node-Extraktor (nur zlib+crypto, KEINE Fremd-Lib), loest verschluesselte XFA-Formular-PDFs selbst (Sicherheitshandler AES-128 V4/R4 UND AES-256 V5/R6, Cross-Reference- und Object-Streams inkl. inkrementeller Updates); datasets-XML byte-identisch zur pypdf-Referenz. Verworfen: pdf-lib/MuPDF (AGPL)/pdf.js |
| lib parse-zim-core | **1.0-2** | NEU (Session 66): Kern-Parser datasets -> Vertrag (Projekt/MA/Arbeitsplan) mit Kontrollsummen-Selbstcheck (Anlage 5, byte-genau reproduziert); von der Route /api/v7/parse-zim genutzt |
| lib zim-import-mapping | **1.0-3** | NEU (Session 66): Mapping des extrahierten Vertrags auf die PZE-Anlagestruktur (Anlage-6.1-Salaerwerte projektbezogen: p_kosten = Vollzeit-Aequivalent-Monatsbrutto, monthly_gross = round2(p_kosten x TZF), bWAZ global, pm_basis_weekly_hours = bWAZ; Akronym aus cg_VMS_VB_KurzName bzw. Titel vor Gedankenstrich) |
| ApStatusModal.tsx | **1.0-11** | Zentrale AP-Status-Uebersicht (selbstladend per projectId), aus Timesheet und Matrix; **v1.0-11 (Session 77): "gesamt"-Spalten (geplant/gebucht/offen) = Summe der auf 2 Stellen gerundeten MA-Werte statt total_person_months x hoursPerPM; behebt die 0,01h-Rundungsreste aus dem periodischen PM-Faktor. Reine Anzeige, keine Datenwirkung.** |
| lib/verwendungsnachweis-utils.ts | **1.2-8** | Rechenkern Verwendungsnachweis (computeVNSchluss, Abschnitte A/B/C) und zentrale Abrechnungshelfer (abrechnungsFenster, istImFenster, round2, roundEuro; von ZAPanel importiert); v1.2-8 getHourlyRate = hourly_rate_approved ?? hourly_rate, unskaliert (identisch zu ZAPanel.getHourlyRate seit v7.4.4-66). |
| VerwendungsnachweisPanel.tsx | **1.2-9** | Anzeige und Druck des Verwendungsnachweises (Kopf, Abschnitte A/B/C, Warnungen, Speichern des Snapshots); v1.2-8 Kopfdaten um "Bewilligte Zuwendung" (projects.bewilligte_summe, rechte Spalte unter Bescheiddatum und Foerdersatz) und die Zeile "Ausschoepfung der bewilligten Zuwendung". v1.2-9 optionale Props onNavigateToZA / onNavigateToMatrix, Knoepfe links neben "Drucken" (vn-no-print). |
| VerwendungsnachweisSeite.tsx | **1.2-3** | Eigenstaendige VN-Seite (Berater + Firma), laedt Projekte/Timesheets/Team und rendert das VerwendungsnachweisPanel; v1.2-3 baut die Sprungziele (nur Berater-Portal) und traegt im Ruecksprung nur den Ursprung der Kette weiter (vnUrsprung). |

Hinweis: TimesheetForm-v7_4_6-99.tsx wurde erstellt und VERWORFEN (Sperre zu weit
gefasst), nie integriert. Die Nummer bleibt vergeben.

### 4.2 API-Routen

| Datei | Version | Funktion |
|-------|---------|----------|
| src/app/login/page.tsx | **7.3.90-8** | Login-Redirect Cockpit-Modus aus DB-Config; A-050 akzeptiert E-Mail ODER Benutzername (Aufloesung via /api/v7/resolve-username) |
| src/app/v7/firma/page.tsx | **7.3.43** | Redirect auf /v7/firma/berichte (Dashboard) |
| src/app/v7/firma/projekte/page.tsx | **7.3.90** | Redirect auf /v7/firma/berichte (Dashboard) |
| src/app/api/v7/create-user/route.ts | **7.4.1-1** | Auth + Profil + Employee server-seitig |
| src/app/api/v7/create-employee-login/route.ts | **7.3.95-3** | Login fuer vorhandenen MA; A-050 optionales username-Feld (Format-/Eindeutigkeitspruefung, Race-Condition-Absicherung) |
| src/app/api/v7/resolve-username/route.ts | **1.0.0** | NEU (A-050): Benutzername -> E-Mail fuer die Login-Seite, unauthentifiziert, liefert ausschliesslich die E-Mail |
| src/app/api/v7/set-username/route.ts | **1.0.0** | NEU (A-050): Selbstbedienung - eingeloggter Nutzer setzt/aendert nur seinen eigenen Benutzernamen |
| src/app/api/v7/parse-zim/route.ts | **1.0-1** | NEU (Session 66): PDF-Upload -> Vertrag (ueber parse-zim-core) oder sprechender Fehler (KEIN_PDF/KEIN_XFA/EXTRAKTION_FEHLER/KEIN_ARBEITSPLAN); Kontrollsummen-Abweichung als Warnung |
| src/app/api/v7/import-antrag-neu/route.ts | **1.0-1** | NEU (Session 66): atomare Uebernahme - RPC v7_import_projekt_team legt Projekt + neue MA + Team in EINER Transaktion an (Rollback bei jedem Fehler), danach Arbeitsplan ueber arbeitsplan-import; scheitert der Arbeitsplan, kompensiert RPC v7_cleanup_projekt |
| src/app/api/v7/arbeitsplan-import/route.ts | **7.3.90-1** | Session 66 um JSON-Eingang erweitert (gemeinsames Backend fuer Excel UND PDF, gleiche parseAPNumber-Nummerierung; Excel-Pfad unveraendert) |

### 4.3 Wrapper-Seiten

| Pfad | Version | Funktion |
|------|---------|----------|
| src/app/v7/berater/foerderung/page.tsx | **7.4.1-10** | Kundenfirmen + ?openNew Modal + Suspense + modus-bewusster Zurueck-Button (A-015) |
| src/app/v7/berater/admin/page.tsx | **7.3.94-1** | Berater-Admin + SystemConfigPanel |
| src/app/v7/berater/app/cockpit/page.tsx | **1.0.8** | Berater-App-Cockpit (4 Kacheln + Firma-Dropdown); A-014 "Neues Unternehmen"; A-016 voller Name; A-018 refreshed-Listener entfernt; A-023 aufklappbarer "Inaktive Firmen"-Bereich + Reaktivierung; v1.0.8 Kachel "Forschungszulage" nur fuer system_admin |
| src/app/v7/berater/app/firma/[id]/page.tsx | **1.0.1** | Firmen-Cockpit Route (App-Struktur); A-028 PortalHeader-Wrapper ergaenzt (FirmaCockpit rendert Header nicht selbst) |
| src/app/v7/berater/foerderung/firma/[id]/page.tsx | **7.4.4-8** | Firma-Detail: returnTo, openNew, firmaName; "Zurueck"-Label, "Kundenfirmen"->"Unternehmen" |
| src/app/v7/berater/foerderung/firma/[id]/projekt/neu/page.tsx | **1.0.0** | NEU: Projekt-Anlage mit returnTo |
| src/app/v7/berater/multiprojekt/page.tsx | **7.4.8-29** | A-022: Echte Arbeitstage, MA-Deep-Link mit Ruecksprung; v7.4.8-18 ASCII; v7.4.8-19 FZul-Vorhaben-Loeschen-Button; v7.4.8-20 Vorhaben-Modal uebernimmt die gewaehlte Firma (defaultCompanyId, Reset beim Oeffnen); v7.4.8-21 Ersteller-Pruefung + DELETE mit .select('id') (stille RLS-Fehlschlaege werden gemeldet); v7.4.8-22 Sprachkonvention (generisches Maskulinum); v7.4.8-23 Papierkorb bei fremden Vorhaben ausgegraut + zentrale darfVorhabenLoeschen(); v7.4.8-24 Ersteller-Anzeige "angelegt von X" via RPC v7_beraterfirma_namen(); v7.4.8-25 title-Attribut (voller Name beim Hovern) ; v7.4.8-26 "Neu"-Auswahlliste im Vorhaben-Panel entfernt (nur FZul funktional), einzelner "+ Neu"-Button oeffnet direkt das FZul-Anlage-Modal; v7.4.8-27 Panel-Titel "FZul-Vorhaben" (-26/-27 hier nachgezogen, bisher im Pflichtenheft nicht dokumentiert); **v7.4.8-28 (Session 82): Elternzeit (Code E) mindert die Monatskapazitaet - E-Tage aus v7_employee_absences (absence_code 'E', is_active, .limit(10000)), nur Arbeitstage gezaehlt (Mo-Fr, kein Feiertag laut getGermanHolidays); Monatskapazitaet = (Arbeitstage - E-Arbeitstage) x (WAZ/5); Ampel-Prozent auf Basis der vollen Monatskapazitaet ohne Elternzeit (gesamtOhneElternzeit); Voll-E-Monat als hellblaue Zelle "E" (rot bei trotzdem geplanten/verbuchten Stunden); Tooltip-Zeile Elternzeit + Verfuegbar; Legende "E = Elternzeit". v7.4.8-29: Tooltip-Abstand (gap-2, whitespace-nowrap).** |
| src/app/v7/berater/dashboard/page.tsx | **7.4.4-14** | Klassisches Berater-Dashboard (eigenes kacheln-Array); v7.4.4-14 FZul-Kachel nur fuer system_admin |
| src/lib/v7-module-config.ts | **7.3.90-8** | Modul-Definitionen + getVisibleModules (roles-Filter); v7.3.90-7 Multiprojekt-Tool aktiv; v7.3.90-8 fzul roles: ['system_admin'], Beschreibung/plannedRelease korrigiert |
| src/app/v7/berater/multiprojekt/[id]/page.tsx | **7.4.8-20** | FZul-Vorhaben-Detail (Uebersicht/Jahreskalender/Export). v7.4.8-14 CRITICAL day_type-Enum-Fix (englische Werte vacation/sick/special_leave/holiday); v7.4.8-15 Multijahr-Kalender (gefoerdert je Jahr live aus v7_timesheets); v7.4.8-16 Export-Tab pro MA (BSFZ-Excel via /api/export/fzul v2.3, max verfuegbare FZul-Stunden/Tag) ; v7.4.8-17 einheitlicher "Zurueck"-Button (router.back(), Fallback Uebersicht) - hier nachgezogen; **v7.4.8-18 (Session 83, A-067): zentrale Abwesenheiten U/K/S/E aus v7_employee_absences (ladeAbwesenheiten, .limit(10000), mitarbeiterbezogen OHNE Projekt-Zuordnungsfenster, Ladefehler werden geworfen); wirksam nur an Arbeitstagen (Mo-Fr, kein Feiertag). Uebersicht: Max./Verf. h minus Abwesenheits-Arbeitstage x Tagesarbeitszeit (alle Codes), Zusatzzeile "abzgl. x h Abw. (n AT)". Import: fue = verfuegbar = 0 an Abwesenheitstagen, urlaub_/krank_/sonderurlaub_hours aus der Abwesenheitszeile (E: 0). Kalender: Kuerzel-Zelle statt Eingabe (E bg-sky-100, U/K/S bg-violet-100), Altdaten (gespeicherte fue_hours an Abwesenheitstag) rot, Eingabe setzt 0, Hinweis mit Anzahl/Stunden, keine automatische DB-Aenderung; Ladefehler sichtbar. Export: dayData[m][d].absence = true. Enddatum im Uebersichts-Laden = tatsaechlicher Monatsletzter (bisher "-31"). v7.4.8-19 (A-068): alle vier v7_timesheets-Abfragen mit .eq('is_billable', true). v7.4.8-20 (A-069): Export zaehlt K/S/E-Arbeitstage im Exportjahr und uebergibt sickDays/specialLeaveDays/ parentalLeaveDays an Route v2.5; Export-Tab je MA "Arbeitstage JJJJ: U · K · S · E · Urlaubsanspruch" und Hinweis bei U-Arbeitstagen > annual_leave_days.** |
| src/app/api/export/fzul/route.ts | **2.5** | BSFZ-Excel je MA/Jahr aus public/templates/FZul_Vorlage.xlsx (xlsx-populate). Tagesraster: Tagesarbeitszeit minus uebergebene Stunden, leer an WE/Feiertag/absence. v2.5 (Session 83, A-069): Wochenarbeitszeit -> E38, vertraglicher Urlaubsanspruch -> O39 (bis v2.3 faelschlich C38/F39/J39 in verbundenen Beschriftungsfeldern -> Vorlage rechnete immer mit 40 h / 30 Tagen); optional sickDays -> O40, specialLeaveDays -> O41, parentalLeaveDays -> O43 (Arbeitstage; Stunden und Feiertage O42 rechnet die Vorlage); ohne die Felder bleiben die Zeilen 0; ASCII-konform. Basis war der deployte Stand v2.3; die Archivkopie v2.4 (fzulData) wurde nie deployt. Aufrufer: multiprojekt/[id]/page.tsx, Alt-Seite src/app/import/page.tsx (A-013). |
| src/app/v7/berater/netzwerk/page.tsx | **7.4.5-3** | NWM: Dashboard-Link App-Modus ausgeblendet |
| src/app/v7/berater/fzul/page.tsx | **7.4.9-3** | FZul-Seite (Alt-Stand v7.3.1/v7.4.0, Jan/Feb 2026); A-006 Header vereinheitlicht (PortalHeader+PortalNav, Berater-Blau #002451); v7.4.9-3 ASCII-Nachpflege (Session 67). Tile seit Session 68 nur fuer system_admin sichtbar (kein eigenstaendiges FZul-Modul vorgesehen - Spezialisierung der Kapazitaetsplanung); "Analyse starten" -> 404 (Route /v7/berater/fzul/firma/<id> bewusst nicht gebaut) |
| src/app/v7/firma/zeiterfassung/page.tsx | **7.4.6-4** | ZE-Wrapper Firmen-Portal; v7.4.6-3 pm_basis_weekly_hours im Projekt-Select; v7.4.6-4 A-044 liest ?projekt -> initialProjectId |
| src/app/v7/firma/mein-status/page.tsx | **7.4.4-19** | MA-Startseite Firmen-Portal (Ampel, Rueckfragen, rollenabhaengige Downloads); MA werden von BerichtePage sofort hierher weitergeleitet; v7.4.4-17 ASCII-Nachpflege (Session 67) |
| src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx | **7.4.6-4** | ZE-Wrapper Berater-Portal; v7.4.6-3 pm_basis_weekly_hours im Projekt-Select; v7.4.6-4 A-044 liest ?projekt -> initialProjectId |
| src/app/v7/berater/foerderung/firma/[id]/cockpit/fortschritt/page.tsx | **7.4.9-9** | Fortschritt-Wrapper Cockpit; v7.4.9-6 pm_basis_weekly_hours im Projekt-Select -> an ProjektFortschrittPanel ; **v7.4.9-9 (Session 80): NWM-Daten laden. Laedt Foerderzeitraeume und AP-Planung fuer NWM-Projekte und reicht sie an ProjektFortschrittPanel durch.** |
| src/app/v7/berater/foerderung/firma/[id]/cockpit/stundennachweis/page.tsx | **7.4.9-8** | Matrix-Wrapper Cockpit; A-027 Navigation/returnUrl; A-032 assignment_start/end je MA+Projekt zusammengefuehrt; v7.4.9-7 A-044 handleNavigateToZE reicht projectId (&projekt=) weiter ; v7.4.9-8 "Zurueck" honoriert ?returnUrl= (Pfad mit "/"), sonst wie bisher ins Firma-Cockpit. |

### 4.4 Hilfe-Dropdown (PortalNav, ab v7.4.4-7)

Immer sichtbar im Firmen-Portal (alle Seiten, oben rechts):
- client_admin: `PZE_Anleitung_Firmen-Administrator.pdf` (wenn manuals_enabled)
- project_leader: `PZE_Anleitung_Projektleiter.pdf` (wenn manuals_enabled)
- employee: kein Handbuch (nur FAQ)
- Alle Rollen: `PZE-FAQ-Zeiterfassung-v1.pdf` (immer, unabhaengig von manuals_enabled)
- Wenn manuals_enabled=false: Amber-Hinweis "Wird aktualisiert"

### 4.5 AP-Sortierung (compareApCode, ab v7.4.6-6)

Versions-Sort-Funktion in TimesheetForm zerlegt ap_code punktweise in Zahlen
und vergleicht numerisch je Ebene. Korrekt fuer beliebige Tiefe:
`3 < 3.1 < 3.1.1 < 3.2 < 3.4 < 4 < 5.1`

Angewendet an 3 Stellen: Matrix-Vorbelegung, Dropdown "Zugeordnete AP",
Dropdown "Weitere AP".

### 4.6 Vertretungsfall in TimesheetForm (ab v7.4.6-9)

Wenn ein MA Stunden in einem AP bucht, fuer den er keinen Arbeitsplan-Eintrag
hat (kein planned_pm): `offen`-Spalte zeigt negative Stunden in Rot statt "-".
Gesamtstunden werden korrekt mitgezaehlt (war schon immer so).

### 4.7 Sonstige Arbeiten (nicht zuschussfaehig) - Auto-Vorbelegung (Stand V7.9.20)

**Regel ab V7.9.20 (Session 93, ersetzt die Differenzregel aus V7.9.7):**

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

**Vorher (V7.9.7 bis V7.9.19):** "Sonstige Arbeiten" war an jedem reinen Arbeitstag die Differenz aus Tagesarbeitszeit und gebuchten Stunden (Tages- und Wochendeckel), nie eingefroren. Daraus entstanden Reststunden wie 0,02 h (A-104).

### 4.8 Dateinamen-Schema der Stundennachweis-PDFs (ab V7.9.18, ersetzt V7.9.8)

| Fall | Dateiname (ohne Endung) |
|---|---|
| Einzeldruck | <Nachname><Vorname>_<FKZ>_Stundennachweis_<YYMM> |
| Sammeldruck, ein Mitarbeiter | <Nachname><Vorname>_<FKZ>_Stundennachweis_<Zeitraum> |
| Sammeldruck, mehrere Mitarbeiter | <FKZ>_Stundennachweis_<Zeitraum> |

Regeln:
- Nachname und Vorname: jeweils nur das erste Wort, Sonderzeichen entfernt, Umlaute
  auf den Grundbuchstaben (Duehrkop mit Umlaut -> "Duhrkop"), scharfes s -> "ss",
  Bindestriche entfallen ("Hans-Peter" -> "HansPeter").
- Der Vorname steht vollstaendig und ohne Trenner direkt hinter dem Nachnamen.
- Fehlt der Vorname, bleibt der Nachname allein. Fehlt der Nachname, entfaellt der
  Namensteil ganz.
- FKZ: funding_reference, ersatzweise short_name, ersatzweise "Projekt"; Schraegstriche
  und Leerzeichen werden zu "_".
- Zeitraum: YYMM bzw. YYMM-YYMM bei mehrmonatiger Auswahl.
- Kein .pdf im document.title; der Browser haengt die Endung selbst an.

Entscheidung: Martins Vorschlag waren die ersten drei Buchstaben des Vornamens. Er
wurde zugunsten des vollen Vornamens verworfen, weil drei Buchstaben haeufige Paare
nicht trennen (Martin/Markus -> beide "Mar", Christian/Christoph -> "Chr",
Stefan/Stefanie -> "Ste").

Beispiele (per Rechnung geprueft): "DuhrkopThomas_", "DuhrkopMatthias_",
"MullerHansPeter_", "GrossKarl_" (Vorname "Karl Heinz"), "Meier_" (ohne Vorname).

---

## 5. Bekannte Fehler und Status

| Nr. | Fehler | Status | Version |
|-----|--------|--------|---------|
| 5.1-5.32 | (Aeltere Fehler) | Behoben | s. PH v4.76 |
| 5.33 | AP-Ueberschriften im Dropdown waehlbar | Behoben | v7.4.6-2 |
| 5.34 | Abgelaufene AP in neue Monate vorbelegt | Behoben | v7.4.6-3 |
| 5.35 | Vorbelegte AP-Zeilen in zufaelliger Reihenfolge | Behoben | v7.4.6-4 |
| 5.36 | AP-Spalte zu schmal fuer dreistellige AP-Nummern | Behoben | v7.4.6-5 |
| 5.37 | AP-Sortierung 3.4 vor 3.1.1 (falsche Reihenfolge) | Behoben | v7.4.6-6 |
| 5.38 | U/K/S in sonstige Arbeiten fehlte in Fehlzeiten | Behoben | v7.4.6-7 |
| 5.39 | ArrowDown aus AP-Zeile erreichte sonstige Arbeiten nicht | Behoben | v7.4.6-8 |
| 5.40 | offen-Spalte zeigte "-" statt neg. Zahl im Vertretungsfall | Behoben | v7.4.6-9 |
| 5.41 | Feiertag auf Wochenende zeigte 8h in Fehlzeiten-Tageszelle | Behoben | v7.4.6-10 |
| 5.42 | Firmenanlage: RLS-Fehler bei Profil-Insert | Behoben | v7.4.1-6 |
| 5.43 | Firmenanlage: Doppel-Submit moeglich (Modal blieb offen) | Behoben | v7.4.1-5 |
| 5.44 | GF ohne v7_employees-Eintrag nicht verwaltbar | Behoben | v7.3.95-14 + Prozess |
| 5.45 | Matrix zeigte nur MA mit AP-Eintrag (Nachfolge-MA unsichtbar) | Behoben | v7.4.6-2 |
| 5.46 | ZA zeigte nur MA mit AP-Eintrag (Nachfolge-MA fehlt in ZA) | Behoben | v7.4.4-32 |
| 5.47 | Berater-Nav: "Zeiterfassungen" fuehrte zu 404 | Behoben | v7.4.4-12 |
| 5.48 | TimesheetForm Runtime-Crash (findTagVerletzung Temporal Dead Zone) | Behoben | v7.4.6-14 |
| 5.49 | MA landete nach Login auf Dashboard statt Mein Status | Behoben | v7.4.6-9 (roleLoaded-Fix) |
| 5.50 | Admin/PL landete nach roleLoaded-Fix auf Mein Status (zu fruehes Redirect) | Behoben | v7.4.6-9 |
| 5.51 | ProjectDetail Zurueck-Button zeigte "Projekte" statt "Dashboard" | Behoben | v7.4.4-55 |
| 5.52 | /v7/firma/projekte zeigte alte Projektliste statt Dashboard | Behoben | v7.3.90 (Redirect) |
| 5.53 | Dashboard-Seite trug Titel "Berichte & Controlling" statt "Dashboard" | Behoben | v7.4.6-10 |
| 5.54 | Feiertage nicht automatisch in S-Zeile (Fehlzeiten) vorbelegt seit v7.4.6-16 | Behoben | v7.4.6-19 |
| 5.55 | Supabase Max Rows Default (1000) kappt Timesheet-Queries bei >1000 Eintraegen | Behoben | Supabase-Config + .limit(10000) |
| 5.56 | AP-Druck/PDF: AP-Name abgeschnitten (line-clamp + maxWidth im Print) | Behoben | v7.4.6-20 |
| 5.57 | ZA-Stundeninflation durch doppelte v7_timesheets-Zeilen (Doppel-Speichern ohne setSaving-Sperre) | Behoben | PROD-Cleanup (Backup-Tabelle) + TimesheetForm v7.4.6-26 (savingRef/setSaving) |
| 5.58 | Foerder-Prognose: Phantom-"Verschenkt" (~6 EUR) bei 100% + Prognose ueber Plan | Behoben | projektfortschritt-utils v7.4.9-2 + ProjektFortschrittPanel v7.4.5-24 + FirmaCockpit v7.4.9-33 |
| 5.59 | Stundennachweis-Matrix-Klick oeffnete erstes Projekt statt des gewaehlten MA/Monats/Projekts | Behoben (A-044) | Matrix v7.4.6-7 + BerichtePage v7.4.6-23 + cockpit-page v7.4.9-7 + ZE-Seiten v7.4.6-4 |
| 5.60 | Pfeilnavigation blieb an Abwesenheitstagen haengen (kein Vor/Zurueck, kein Ueberspringen) | Behoben (A-045) | TimesheetForm v7.4.6-52 (canEdit typ-abhaengig) |
| 5.61 | Fehlzeit-Tagesstunden 8 statt Firmenstandard 7,5 (MA ohne eigene WAZ) | Behoben (A-046) | TimesheetForm v7.4.6-52 (Fallback auf standard_weekly_hours) |
| 5.62 | Bundesland aus der Firmen-Neuanlage erschien im Bearbeiten-Modal nicht (ISO-Code gegen Langnamen) | Behoben | FirmendatenCard v7.4.6-2 |
| 5.63 | "sonstige Arbeiten" folgten Aenderungen der Projektstunden nicht mehr (faelschlich als manuell eingestuft, Wochendeckel vs. Tagesformel) | Behoben | TimesheetForm v7.4.6-94/-96 |
| 5.64 | Rechtsklick auf Abwesenheitstagen oeffnete das Browser-Menue statt des PZE-Menues (disabled-Input verschluckt contextmenu) | Behoben | TimesheetForm v7.4.6-93 |
| 5.65 | FZul-Detailseite (Jahreskalender, BSFZ-Export) liest die zentrale Abwesenheitstabelle nicht - falsche verfuegbare FZul-Stunden an Abwesenheits- und Elternzeit-Tagen (A-067) | Behoben | V7.9.11 (multiprojekt-detail v7.4.8-18..-20) |
| 5.66 | FZul-Export: gespeicherte Kalenderwerte (fue_hours) gehen nicht in die BSFZ-Excel; der Export nutzt die Live-Invertierung (seit multiprojekt-detail v7.4.8-16) | Offen (dokumentiert) | - |
| 5.67 | FZul-Export: Kuerzung bei unterjaehrigem Vorhaben (Zeile 45) fest 1; E38 = WAZ zum 1.1. des Vorhabenjahres (kein Wechsel im Jahr, auch nicht bei Jahresnavigation); Kurzarbeit (KA) nicht in Zeile 43 | Offen (dokumentiert) | - |
| 5.68 | BSFZ-Export: das Tagesraster wird fuer Januar bis Dezember gefuellt, unabhaengig von start_monat/ende_monat des FZul-Vorhabens (A-070). PROD derzeit ohne Wirkung | Offen | - |
| 5.69 | FZul-Detailseite und BSFZ-Export: Ladefehler der v7_projects- und v7_timesheets-Abfragen sowie des Urlaubsanspruchs in der Excel-Erzeugung werden still als 0 behandelt (A-071) | Offen | - |
| 5.70 | Matrix/Mein Status zeigten Monate mit nur "sonstigen Arbeiten" bzw. den laufenden Monat als vollstaendig (A-072) | Behoben | V7.9.12 (StundennachweisMatrix v7.4.6-20, mein-status 7.4.4-19) |
| 5.71 | Monatsabschluss ohne manuelle Eingabe speicherte die Auto-Vorbelegung "sonstige Arbeiten" nicht (A-073) | Behoben | V7.9.12 (TimesheetForm v7.4.6-98) |
| 5.72 | Mein Status, ZA-Ampel "Stunden MA (akt. Monat)": zaehlt MA mit irgendeinem Eintrag im laufenden Monat, unabhaengig vom Abschluss-Status | Offen (Beobachtung) | - |
| 5.73 | Mein Status: eigene Feiertagsfunktion ohne holiday_region | Offen (Beobachtung) | - |
| 5.74 | Abrechnung monatsweise statt taggenau; Stunden nach Bewilligungsende wurden abgerechnet (A-074) | Behoben | V7.9.13 |
| 5.75 | Foerderbetrag auf ganze Euro gerundet (A-075) | Behoben | V7.9.13 |
| 5.76 | Projektstunden nach Bewilligungsende erfassbar (A-076) | Behoben | V7.9.13 (TimesheetForm v7.4.6-100) |
| 5.77 | VN Abschnitt B ohne Eigenanteil, Zuwendung aus eingefrorenen ZA-Betraegen (A-077) | Behoben | V7.9.13 |
| 5.78 | VN Fussnote Abschnitt C zeigte \u-Escapes woertlich (Konventionsverstoss) | Behoben | VerwendungsnachweisPanel v1.2-4 |
| 5.79 | 55 latente Typfehler in 29 Dateien (A-080); unsichtbar, weil der Next-Build keine Typen prueft; teilweise in Ablageordnern (backup-v7_3_86), ueberwiegend in src/ | Offen (Beobachtung) | - |
| 5.80 | updated_at in v7_timesheets als Aenderungsnachweis kaum brauchbar: Speichern im Zeiterfassungsformular schreibt JEDE Buchung des Monats neu (keine Audit-Tabelle, kein Trigger) | Offen (Beobachtung) | - |
| 5.81 | Eine eingereichte ZA bemerkt nachtraegliche Aenderungen an den zugrundeliegenden Stunden nicht (Fall ANOVIA ZA 4: 1 h am 19.09. deaktiviert, 26,12 EUR Differenz); moegliche Folgeanforderung: Sperre oder Abweichungswarnung nach Einreichung | Offen (Beobachtung) | - |
| 5.82 | Verwendungsnachweis verwarf ZA, die ueber den Berichtszeitraum hinausragten, vollstaendig und ohne Hinweis (A-083) | Behoben | V7.9.14 (Lib v1.2-7) |
| 5.83 | Verwendungsnachweis uebernahm den Berichtszeitraum aus dem gespeicherten Datensatz statt aus den Projektdaten; Aenderungen am Projektende kamen nicht an (A-083) | Behoben | V7.9.14 (Panel v1.2-6) |
| 5.84 | Zwei Zahlungen auf eine ZA oder eine Ueberweisung auf zwei ZA waren nicht abbildbar; falsche Differenzen im Cockpit (A-084) | Behoben | V7.9.15 |
| 5.85 | Sichern eines Zahlungseingangs berechnete den angeforderten Betrag neu und ueberschrieb den eingereichten Wert (Regel aus v7.4.4-41) (A-085) | Behoben | V7.9.15 |
| 5.86 | Betragseingabe "35.235" wurde als 35,235 gelesen (A-084, parseBetrag) | Behoben | V7.9.15 |
| 5.87 | "ZA speichern" im Deckblatt berechnet den Betrag einer EINGEREICHTEN ZA neu und ueberschreibt ihn (A-090, Loesung in Etappe 3) | Teilweise (V7.9.16: Rueckfrage vor Ueberschreiben) | A-090 bleibt fuer Etappe 3 offen |
| 5.88 | Dialog "Ungespeicherte Aenderungen": Knopf "ZA speichern und fortfahren" ohne Hintergrundfarbe (colors.primary existiert nicht) (A-091) | Offen | - |
| 5.89 | VN: "angefordert laut ZA" zaehlt auch Entwuerfe mit (A-089) | Offen | - |
| 5.90 | Markierte ZA wurde beim ersten Speichern mit der Neu-Vorbelegung ueberschrieben (seit V7.9.15; Ladereihenfolge und parallele Ladelaeufe) (A-092) | Behoben | V7.9.16 (ZAPanel -82/-83) |
| 5.91 | Betragseingabe "35.235" wurde als 35,24 gelesen (A-093) | Behoben | V7.9.16 |
| 5.92 | PDF-Dateiname: mehrteilige Nachnamen - nur das erste Wort wird verwendet, aus "von Berg" wird "von" (A-100); Verhalten seit v7.4.6-97 | Offen (Einschraenkung) | - |
| 5.93 | PDF-Dateiname: identischer Vor- und Nachname zweier Mitarbeiter ergibt denselben Dateinamen | Offen (Einschraenkung) | - |
| 5.94 | "Zurueck" in der Stundennachweis-Matrix fuehrte immer ins Cockpit, auch wenn man aus der ZA kam (A-097) | Behoben | V7.9.19 |
| 5.95 | "ZA speichern" landete in einem leeren Neu-Entwurf; Gefahr, versehentlich eine weitere ZA anzulegen (A-103) | Behoben | V7.9.19 (ZAPanel -89) |
| 5.96 | Fehler beim Anlegen einer ZA (INSERT) wurde nicht gemeldet | Behoben | V7.9.19 (ZAPanel -89) |
| 5.97 | Stundennachweis zeigte in "sonstige Arbeiten" Reststunden bis zur Tagesarbeitszeit (z. B. 0,02 h) (A-104) | Behoben | V7.9.20 (TimesheetForm v7.4.6-103) |
| 5.98 | Verwendungsnachweis meldete bei Teilzeit-MA ohne anerkannten Satz eine Ueberforderung, die es nicht gab (A-105) | Behoben | V7.9.20 (Lib v1.2-8) |
| 5.99 | Eingabe in "sonstige Arbeiten" an Tagen mit Projektstunden wird sofort geleert, ohne Hinweis (A-108) | Offen (Einschraenkung) | - |

**Korrektur (v5.48) zum Eintrag A-074:** Korrektur der Darstellung in v5.47 Paragraph 5 und GIT-SICHERUNG Session 86: die Aussage "Stunden nach Bewilligungsende wurden abgerechnet, 390,42 EUR zu viel" beruhte auf dem falsch erfassten Projektende 30.08.2026 und trifft fuer ANOVIA nicht zu. Die Codeaenderung (taggenaue Abrechnung) bleibt richtig und notwendig.

---

## 6. ZA-Modul (Zahlungsanforderungen)

### 6.1 Konzept
Datenaufbereitung fuer ZIM-Mittelabruf. Kein eigenes PDF. Daten werden manuell
in das offizielle VDI/VDE-IT Formular uebertragen.

### 6.2 Unterstuetzte Foerderformate
| Format | isDS | isNetzwerk |
|--------|------|------------|
| ZIM | false | false |
| ZIM_DS | true | false |
| ZIM_NETZWERK | false | true |

### 6.3 Status-Workflow
```
Entwurf --> Eingereicht --> Bewilligt
                |                |
                v                v
            Entwurf          Eingereicht (Rollback v7.4.4-27)
```

### 6.4 Stundensatz-Logik
`hourly_rate_approved` hat Vorrang vor `hourly_rate`.

**Stundensatz in ZA und VN (ab V7.9.20, Session 93):**

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

### 6.5 Abrechnungsgrenzen und Rundung (ab V7.9.13, Session 86)

Zeitbuchungen gehoeren genau dann in eine Abrechnung, wenn ihr Datum im Schnitt aus
Abrechnungszeitraum (ZA) und Bewilligungszeitraum (v7_projects.start_date / end_date)
liegt - TAGGENAU. Implementiert als abrechnungsFenster() / istImFenster() in
src/lib/verwendungsnachweis-utils.ts; ZAPanel importiert dieselben Helfer (eine Quelle).
Vergleich als ISO-String, keine Monatslogik, kein new Date(iso) mit Ortszeit-Auswertung.

**Rundung (korrigiert in V7.9.14, ersetzt die Centrundung aus V7.9.13):**
Angeforderte Zuwendung je ZA (antZuwendung, gespeicherter foerderbetrag_gesamt,
NWM-Foerderbetrag): kaufmaennisch auf GANZE EURO, wie im Originalformular der
Zahlungsanforderung. Umsetzung ueber roundEuro() aus der VN-Lib (erst auf Cent, dann
auf den Euro, gegen Gleitkomma-Rauschen). Kosten und Kostenzeilen bleiben centgenau.
Entscheidung Martin 21.09.2026, geprueft an ANOVIA ZA 1: 8.274,63 -> 8.275.
Der Verwendungsnachweis rechnet den Anspruch centgenau (Entscheidung Martin
21.09.2026). Abweichungswarnung erst ab Anzahl ZA x 0,50 + 0,005 EUR.

### 6.6 Firmen-Cockpit: Zahlungsanforderungen (ab V7.9.13)

Neue Spalte "Zeitraum" (TT.MM.JJ-TT.MM.JJ) zwischen ZA-Nr. und Eingereicht. Darunter
Pruefung der Abrechnungszeitraeume: Luecken zwischen aufeinanderfolgenden ZA,
Ueberlappungen, Nummernspruenge, fehlende Zeitraeume, nicht abgedeckter Projektbeginn/
-ende. Nur sichtbar bei Befunden. Spaltenaufteilung 2/5/5 statt 2/6/4.

### 6.7 Zahlungseingaenge (neu v5.49, V7.9.15)

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
- Betragseingabe: Punkte werden immer ignoriert, einziger Dezimaltrenner ist das Komma (Vorgabe Martin 22.09.2026). "35.235" = 35.235,00; "12.128,50" = 12.128,50; "12.50" = 1.250,00. Gespeicherte Betraege erscheinen im Eingabefeld immer als Waehrung ("55.329,00"). (korrigiert v5.50, V7.9.16)
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

Sicherungen fuer EINGEREICHTE ZA beim "ZA speichern" (bis Etappe 3):
1. Aendern sich ZA-Nummer oder Abrechnungszeitraum: Rueckfrage mit Alt/Neu.
2. Weicht der neu berechnete Foerderbetrag vom gespeicherten ab: Rueckfrage mit
   beiden Betraegen.
Abbrechen speichert nichts und zeigt wieder den gespeicherten Stand.

### 6.8 Direktspruenge zwischen ZA, Stundenerfassung und Matrix (ab V7.9.17)

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
  bei eingereichten ZA greifen die Rueckfragen aus 6.7.

Technik: Das ZAPanel meldet nur das Ziel (Projekt, ZA, Tab, ggf. Mitarbeiter/Jahr/
Monat); die URLs baut die ZASeite. Der Ruecksprung-Link traegt projektId, zaId, tab
und den urspruenglichen Ausgangspunkt (Matrix oder Cockpit), nicht die ganze Kette.

Einschraenkungen:
- Der Weg ZA -> Matrix -> "Zahlungsanforderung" landet auf der zuletzt gespeicherten
  ZA im Deckblatt, nicht auf der ZA und dem Tab, von dem man kam (A-097).
- Firma-Portal: keine Spruenge aus der ZA (A-098).

### 6.9 Querspruenge ZA / VN / Matrix / Stundenerfassung (ab V7.9.19)

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

### 6.10 ZA speichern behaelt die ZA (ab V7.9.19)

Nach "ZA speichern" bleibt die gespeicherte ZA im Formular (bestehende ZA: dieselbe;
neu angelegte ZA: die neue mit ihrer Nummer). Die Liste wird wie bisher frisch aus der
DB geladen. Eine weitere ZA entsteht nur ueber "+ Neue ZA". Erstladen, Projektwechsel
und "+ Neue ZA" sind unveraendert. Scheitert das Anlegen einer neuen ZA in der DB,
erscheint eine Fehlermeldung (vorher still uebergangen).

---

## 6a. VN-Modul (Verwendungsnachweis)

**Stand: UMGESETZT und in PRODUKTION (V7.8.0, Session 73).** Reine Zahlenseite.

### 6a.1 Zweck
Projektweite Zusammenfassung ALLER ZA je Projekt fuer den Verwendungsnachweis (VN)
gegenueber VDI/VDE-IT. Kein eigenes PDF: feldgenaue Datenaufbereitung zum manuellen
Uebertragen ins offizielle VN-Formular + Druckbeleg. Zahlen sind ein Read-Rollup ueber
v7_zahlungsanforderungen (+ Timesheets fuer die Personalkosten), kein Doppeln. Der
Sachbericht (Teil 2) wird direkt im offiziellen PDF geschrieben und ist bewusst NICHT im
System -> es gibt nur die Schlussnachweis-Zahlenseite, keinen Zwischenmodus.
Lib: verwendungsnachweis-utils v1.2-1 (computeVNSchluss). Konzept:
KONZEPT-VERWENDUNGSNACHWEIS-v1_0.md, Bauplan -BAUPLAN-v1_0.md.

### 6a.2 Varianten (Formular -> System)
| Variante | Formular_ID | funding_format / Merkmal | Umsetzung |
|----------|-------------|--------------------------|-----------|
| Einzel-/Kooperationsprojekt | VDIVDE_VN_EP_Koop (3.02) | ZIM_EINZEL, ZIM_KOOP, ZIM | JA |
| DS De-minimis | VDIVDE_VN_DS_oAGVO (3.00) | ZIM_DS | JA |
| Netzwerk Phase 1 | VDIVDE_VN_PH1 (3.00) | ZIM_NETZWERK, netzwerk_phase 1 | JA |
| Netzwerk Phase 2 | VDIVDE_VN_PH2 (3.00) | ZIM_NETZWERK, netzwerk_phase 2 | JA |
| DS nach AGVO | VDIVDE_VN_DS (3.03) | ZIM_DS, beihilfe_basis=agvo | NEIN (direkt im PDF) |

Variante automatisch aus funding_format (+ bei Netzwerk aus netzwerk_phase: enthaelt '2'
bzw. 'umsetzung' -> Phase 2, sonst Phase 1). AGVO ist bewusst nicht abgebildet.

### 6a.3 Kostenzeilen DS De-minimis (6 Zeilen) und Reihenfolge-Mapping
Sechs feste Zeilen; die Zuschlag-Prozentsaetze sind DYNAMISCH aus den Projektdaten
(overhead_t / overhead_nt) - NICHT der Foerdersatz (DS-Foerdersatz = 70 %). Werte = Summe
der ZA-Positionen im Berichtszeitraum. Die ZA-Reihenfolge bleibt; der VN ordnet um:

| VN-Zeile | Wert (Summe ueber ZAs) | aus ZA-Zeile |
|----------|------------------------|--------------|
| 1 Personal technisch | pkT | ZA (1) |
| 2 Zuschlag technisch (overhead_t %) | gkT = pkT x overhead_t/100 | ZA (2) |
| 3 Auftraege Dritte technisch | auftraege_dritte_t | ZA (5) |
| 4 Personal nichttechnisch | pkNT | ZA (3) |
| 5 Zuschlag nichttechnisch (overhead_nt %) | gkNT = pkNT x overhead_nt/100 | ZA (4) |
| 6 Auftraege Dritte nichttechnisch | auftraege_dritte_nt | ZA (6) |

T/NT-Trennung ueber work_package.is_technical; pkT/pkNT = Summe Stunden x getHourlyRate
(hourly_rate_approved-Vorrang). Formel 1:1 aus ZAPanel.

### 6a.3b Kostenzeilen Einzel-/Kooperationsprojekt (5 Zeilen)
Personalkosten (6.2), Zuschlag uebrige Kosten (overhead_t %), Kosten fuer projektbezogene
Auftraege an Dritte (6.3a), Kosten fuer FuE-Auftraege (6.3b), Kosten fuer
FuE-Personalaufnahme (6.3c). Personalkosten = alle Stunden x Stundensatz (keine T/NT-Trennung).

### 6a.3c Kostenzeilen NWM (Netzwerk Phase 1/2)
Aggregation der je ZA GESPEICHERTEN NWM-Werte (KEINE Neuberechnung): (1) Personalkosten
(foerderfaehig, nwm_personalkosten), (2) Auftraege an Dritte (nwm_kosten_dritte, max. 25 %
national), (3) Uebrige Kosten (nwm_kosten_uebrige = pauschal 100 % der Personalkosten).
Summe = Gesamtkosten NWM. Foerderbetrag = Summe foerderbetrag_gesamt der ZAs (der je
Laufzeitjahr fallende Foerdersatz steckt bereits darin). Eigenanteil = Gesamtkosten -
Foerderbetrag. Kopf-Foerdersatz = effektiver Mischsatz (Foerderbetrag / Gesamtkosten).

### 6a.4 Finanzierung
**Ab V7.9.13 (Session 86, ersetzt die bisherige Berechnung):**

DS / EP (nicht NWM):
  Zuwendung gesamt  = Foerdersatz x Summe A
  bisher erhalten   = Summe der Zahlungseingaenge (zahlungseingang_betrag)
  Schlusszahlung    = Zuwendung gesamt - bisher erhalten (negativ = Rueckforderung)
  Eigenanteil       = Summe A - Zuwendung gesamt
  Summe Finanzierung = Zuwendung gesamt + Eigenanteil (muss Summe A sein; sonst rot)
Die Summe der eingereichten ZA-Betraege ist eine ANFORDERUNG, nicht der Anspruch. Weicht
sie vom Anspruch um mehr als (Anzahl ZA + 1) x 0,005 EUR ab (strukturelle Rundung, weil
jede ZA einzeln rundet), erscheinen Warnung und Fussnote. Entscheidung Martin
21.09.2026: Hinweis bleibt vorerst bestehen.
NWM: unveraendert - Summe der ZA-Betraege (fallende Jahressaetze), Eigenanteil des
Netzwerkpartners.

### 6a.4b Abschnitt C - Personenstunden (ab V7.9.13)

"C. Nachweis der Personenstunden im Berichtszeitraum (kumuliert)": je Projekt-
mitarbeiter Std. technisch, Std. nichttechnisch, Summe; Summenzeile. Aggregiert ueber
dieselben ZA und mit derselben Filterung wie Abschnitt A, sortiert nach employee_number.
Entscheidung Martin 19./20.09.2026: auf der VN-Seite, nicht im Cockpit (nur dort ist der
Berichtszeitraum definiert, nur dort landet die Tabelle im Ausdruck).

### 6a.4c Berichtszeitraum und Zeitraumfilter (ab V7.9.14, Session 87)

Berichtszeitraum = Projektlaufzeit (v7_projects.start_date bis end_date), nicht
editierbar. Begruendung Martin: ein VN kommt immer erst am Schluss eines Projekts.
Der beim Speichern abgelegte Zeitraum dient nur noch dem Vergleich; weicht er ab,
erscheint "bitte neu speichern".
Eine ZA wird aufgenommen, sobald sie den Berichtszeitraum beruehrt; Kosten und Stunden
werden taggenau auf den Berichtszeitraum gekappt, ein Ueberstand wird gemeldet.
Bisher fiel eine ZA, die auch nur einen Tag hinausragte, stillschweigend komplett
heraus.

### 6a.5 Datenmodell
NEU v7_verwendungsnachweise (project_id, art zwischen|schluss, variante inkl. NW_PH1/NW_PH2,
formular_version, berichtszeitraum_von/bis, **zahlen_snapshot jsonb** (Audit/Wiederoeffnen),
summe_kosten, zuwendung_gesamt, status, erstellt_am/aktualisiert_am; unique (project_id, art)).
Kein Sachbericht (die frueher geplanten sachbericht_*-Spalten entfallen). RLS projektbezogen
(v7_can_access_client / v7_is_consultant / v7_get_user_role), 4 Policies. v7_projects.beihilfe_basis
(de_minimis|agvo, Default de_minimis) abgesichert. SQL:
SQL-MIGRATION-verwendungsnachweis-snapshot-v1.sql (DEV+PROD).

### 6a.6 Freigabe je Firma (Feature-Schalter)
NEU v7_client_companies.vn_firma_freigeschaltet (boolean, Default false). Regel: Berater-Portal
IMMER frei (zum internen Testen); Firmen-Portal (Cockpit-Kachel, Projektdetail-Button, VN-Seite)
nur bei vn_firma_freigeschaltet = true - die VN-Seite zeigt sonst einen Sperr-Hinweis (Schutz gegen
Deep-Links). Gesetzt wird der Schalter zentral in der Administration (SystemConfigPanel v7.4.4-3,
Abschnitt "Verwendungsnachweis - Freigabe je Firma", nur system_admin). Grundlage fuer eine spaetere
Feature-/Abo-Matrix (Basic/Advanced/Pro) ohne Datenmodell-Aenderung. SQL:
SQL-MIGRATION-vn-firma-freigabe-v1.sql (DEV+PROD).

### 6a.7 Einstiege und Layout
VN-Kachel "Verwendungsnachweis" im Cockpit (aktive UND abgeschlossene Projekte, da VN nach
Projektende) und VN-Button in der Projektdetail-Ansicht (Tab-Leiste, neben Zahlungsanforderungen).
Route-Wrapper (Next.js-15-Suspense): Berater /v7/berater/foerderung/firma/[id]/verwendungsnachweis
(+ App-Pfad /v7/berater/app/firma/[id]/verwendungsnachweis), Firma /v7/firma/verwendungsnachweis.
Layout: VN-Inhalt und ZA-Deckblatt auf max-w-5xl zentriert; Kopf ueber zwei Spalten (kein Ueberlappen).

**Kopfdaten und Ausschoepfung der bewilligten Zuwendung (ab V7.9.19, Session 92):**

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

### 6a.8 Verhaltensregeln (VN-01 bis VN-09)
| Nr | Regel |
|----|-------|
| VN-01 | Variante automatisch aus funding_format (+ netzwerk_phase bei NWM), nicht manuell. AGVO nicht im System. |
| VN-02 | Nur Schlussnachweis-Zahlenseite; kein Zwischenmodus, kein Sachbericht im System. |
| VN-03 | Zahlenteil aggregiert nur ZAs, deren Zeitraum in den Berichtszeitraum faellt. |
| VN-04 | Foerderbetrag je ZA aus gespeichertem foerderbetrag_gesamt (keine Neuberechnung Alt-ZAs; vgl. ZA-06). |
| VN-05 | NWM aggregiert die gespeicherten nwm_*-Werte; Foerdersatz je Laufzeitjahr steckt im gespeicherten Foerderbetrag. |
| VN-06 | Zuschlag-Prozentsaetze (DS/EP) dynamisch aus overhead_t/overhead_nt; nicht mit dem Foerdersatz verwechseln. |
| VN-07 | Ausgabe = feldgenaue Aufbereitung + Druckbeleg; kein Auto-Formular-Upload. |
| VN-08 | Read-Rollup: ZA-Aenderungen (Kosten, Zahlungseingang) schlagen beim naechsten Oeffnen automatisch durch. |
| VN-09 | Firmen-Portal nur bei vn_firma_freigeschaltet=true; Berater-Portal immer. Schalter nur system_admin (Administration). |

**Hinweis (Konsolidierung v5.54):** Die Regelnummern VN-01 bis VN-09 dieser Tabelle stammen aus dem Konzept (Session 73) und sind NICHT identisch mit VN-01 bis VN-11 des Verhaltensvertrags (Paragraph 12e.5a). Massgeblich fuer Smoke-Tests ist 12e.5a. Inhaltlich ueberholt: VN-03 (seit V7.9.14 genuegt eine Ueberschneidung mit dem Berichtszeitraum, Kappung taggenau - 6a.4c) und VN-04 (seit V7.9.13 ist die Zuwendung der Anspruch aus Abschnitt A, nicht die Summe der gespeicherten ZA-Betraege - 6a.4).

---

## 7. NWM-Modul (ZIM-Netzwerkmanagement)

### 7.1 Ueberblick
Aktuell produktiv: YachtConnect (FKZ 16KN124502, 8 Netzwerkpartner)

### 7.2 Tab-Architektur
Haupttabs + [Netzwerk] -> Sub-Tabs:
[<- Zurueck] [Einstellungen] [Netzwerkpartner] [Eigenanteile]
URL-Parameter: ?nwmTab=einstellungen|partner|eigenanteile

### 7.3 Foerdersatz-Stufen
National: Phase 1: 90%; Phase 2: J1:70%, J2:50%, J3-4:30%
International: Phase 1: 95%; Phase 2: J1:80%, J2:60%, J3-4:40%

### 7.4 Eigenanteil-Berechnung
```
NWM-Kosten = PK + Dritte + Uebrige (= 100% PK, pauschal)
Foerderbetrag = NWM-Kosten x Foerdersatz%
EA = NWM-Kosten x (100% - Foerdersatz%)
EA je NP = EA x NP-Quote (cent-genau)
```

### 7.5 Perioden-Logik
3-Monats-Rhythmus ab Projektstart (NICHT Kalenderquartale).
Von/Bis frei waehlbar. Bezahlte EA nicht loeschbar.

---

## 7b. Timesheet-Notizen (Interne Rueckfragen)

Pro MA/Projekt/Monat eine Notiz. Nur PL, Admin und Berater sehen Notizen.
Kein Loeschen (Historie). Anzeige in: TimesheetForm, Matrix, Dashboard, Mein-Status.

---

## 7c. Compliance: Monats-Einschraenkung

Erlaubter Zeitraum = Schnittmenge aus employment_start/end + assignment_start/end
+ project start_date/end_date. Ungueltige Monate nicht im Dropdown, grau + nicht
klickbar in Matrix und Mein-Status.

**Sperre fuer Projektstunden ausserhalb des Bewilligungszeitraums (ab V7.9.13, Session 86):**

Tage vor Beginn bzw. nach Ende des erlaubten Zeitraums (fruehestes Ende aus
employment_end, assignment_end, project.end_date; spaetester Beginn entsprechend) sind in
den AP-Zeilen grau und nicht bebuchbar, Tooltip "Nach Ende des Bewilligungs-/
Zuordnungszeitraums -- keine Projektstunden erfassbar".
Entscheidungen Martin 20.09.2026:
- Der Monat wird NICHT gekappt. Der August behaelt 31 Spalten; eine graue, gesperrte
  Spalte ist eindeutig, ein Monat mit 30 Spalten liest sich wie fehlende Daten.
- Gesperrt wird nur die Erfassung FOERDERBARER Projektstunden. Die Zeile "sonstige,
  nicht zuschussfaehige Arbeiten", Fehlzeiten U/K/S, Rechtsklick und Auto-Vorbelegung
  bleiben offen. Begruendung: der Stundennachweis ist ein Monatsnachweis der gesamten
  Arbeitszeit; nicht foerderbare Stunden ausserhalb der Bewilligung sind korrekt und
  fliessen in keine Abrechnung ein.
- Die Kopfzeile bleibt neutral (grau wuerde einen ganz gesperrten Tag suggerieren).

---

## 7d. AP-Auswahl und Matrix-Vorbelegung (ab v7.4.6-2)

AP waehlbar wenn: total_person_months > 0, start_date + end_date gesetzt, is_active.

"Zugeordnete AP": planned_pm > 0, Laufzeit-Check (end_date + 2 Monate >= Monatsende).
"Weitere AP": alle uebrigen, kein Laufzeit-Check (Vertretungsfaelle).
Matrix-Vorbelegung: nur Zugeordnete AP, sortiert nach compareApCode (ab v7.4.6-6).

**Hinweis (Konsolidierung v5.54):** Die Laufzeitregel "end_date + 2 Monate" fuer "Zugeordnete AP" gilt nicht mehr. Seit V7.9.5 (A-052) erscheinen zugeordnete APs erst ab ihrem geplanten Startmonat; seit TimesheetForm v7.4.6-84 (A-061) nur, solange der Startmonat hoechstens 3 Kalendermonate zurueckliegt und Stunden offen sind. "Weitere AP" bleibt ohne Zeitfilter. Details Paragraph 4.1 (TimesheetForm).

---

## 7e. Arbeitszeitgrenzen (Phase 1 + 2 + 3 - vollstaendig implementiert)

Konzept: KONZEPT-ARBEITSZEITGRENZEN-v1_3.md

### Grenzen und Durchsetzung

| Grenze | Formel | Durchsetzung | Visualisierung |
|--------|--------|--------------|----------------|
| Monatsgrenze | 173,33 h x (weekly_hours / 40) | HART: Speichern + Drucken + PDF + Monat-abschliessen gesperrt | Monatssummenzelle rot; Hinweistext oben |
| GF-50%-Regel | Monatsgrenze x 0,5 (nur GF/GGF) | WEICH: Hinweistext rot, Speichern moeglich; im Druck neutral | Monatssummenzelle rot (Bildschirm), gruen (Druck) |
| Tagesgrenze | 9 h/Tag (Projektstunden + Sonstige) | HART: wie Monatsgrenze | Tagessummenzelle rot; Hinweistext oben |

**Wichtig:** Fehlzeiten (U/K/S) zaehlen NICHT zur Tagesgrenze.

**Floating-Point-Schutz:** Alle Grenzenvergleiche gerundet auf 2 Dezimalstellen
(Math.round(x*100)), da z.B. 173.33 x 0.3 = 51.999... statt exakt 52.00.

**weekly_hours (verbindliche Rangfolge, Session 81):**
(1) v7_employee_hours_history - Eintrag, der zum Monatsersten gueltig war,
(2) v7_employees.weekly_hours, (3) v7_client_companies.standard_weekly_hours.
Die projektbezogene pWAZ (v7_project_assignments.personal_weekly_hours) ist
**keine** Quelle dieser Kette - sie ist der Nenner der
Anlage-6.1-Stundensatzkalkulation (Jahresbrutto / (pWAZ x 52)) und an
Antrag/Bescheid gebunden. Eine Synchronisation zwischen beiden Feldern findet in
keiner Richtung statt; Abweichungen werden im Team-Dialog nur gemeldet
(ProjectTeamManager v7.4.4-20). Die Zeiterfassung zeigt die wirksame WAZ mit
Quellenangabe an. Details: KONZEPT-ARBEITSZEITGRENZEN-v1_4.md Paragraph 2.4.

**position_title:** Wird per DB-Abfrage geladen wenn MA wechselt.
GF-Erkennung: exakter Match auf 'Geschaeftsfuehrer' oder 'Gesellschafter-Geschaeftsfuehrer'.

**Hinweistexte:** Erscheinen nur bei Verletzung. Bei Normalfall keine Anzeige.
Bei GF-Verletzung: "GF-Anteil X h > 50% Monatsarbeitszeit (Y h) -- Foerderrisiko, Speichern moeglich"

Phase 1 (Session 24): Datenbasis (v7_employee_hours_history, POSITION_OPTIONS, GF_POSITIONS)
Phase 2 (Session 25): Teilzeit-Historie-UI in EmployeeManagement
Phase 3 (Session 36): Live-Validierung in TimesheetForm (v7.4.6-11 bis v7.4.6-14)

---

## 7f. Elternzeit im Stundennachweis (Code E, ab V7.9.7)

Konzept: KONZEPT-ELTERNZEIT-TIMESHEET-v1_0.md. Bestaetigt durch den Projekttraeger
VDI (Telefonat 08.09.2026): an diesen Tagen genuegt es, nichts einzutragen; eine
Kennzeichnung ist willkommen, aber nicht gefordert.

**Abgrenzung:** Teilzeit waehrend der Elternzeit (BEEG, bis 32 h/Woche) ist KEIN
Fall fuer E, sondern ein neuer Eintrag in der Wochenstunden-Historie. E gilt nur fuer
vollstaendige Elternzeit ohne Arbeit.

**Datenmodell:** v7_employee_absences, absence_code 'E', hours = 0,
note = 'Elternzeit'. CHECK-Constraint erweitert auf ('U','K','S','E') in DEV und
PROD. Kein project_id -> ein E-Tag gilt in allen Projekten des MA, sofern das
Zuordnungsfenster den Tag einschliesst.

**Wirkung eines E-Tages:**
- 0 Stunden; fliesst weder in die Abwesenheitssummen noch in die Monatssumme ein.
- Ganztaegige Sperre: keine Projektstunden, keine sonstigen Arbeitszeiten, keine
  Fehlzeiten U/K/S.
- Keine Feiertags-Vorbelegung der S-Zeile (ohne Entgeltfortzahlung keine bezahlten
  Feiertagsstunden). Deshalb wird E auch AUF Feiertage geschrieben.
- Arbeitszeitgrenzen unveraendert.

**Erfassung:** ausschliesslich als Zeitraum ueber den Bereichsdialog (Rechtsklick
auf eine Tageszelle oder Eingabe "E"). Geschrieben werden alle Tage Montag bis
Freitag inklusive Feiertagen; Wochenenden bleiben frei. Vor dem Schreiben Vorschau
mit Konfliktanzeige: vorhandene U/K/S werden ersetzt (Vorgabe; Paragraph 17 BEEG),
Tage mit erfassten Arbeitsstunden werden NICHT ueberschrieben, abgeschlossene Monate
werden uebersprungen. Ruecknahme ueber denselben Dialog; ersetzte U/K/S werden dabei
nicht wiederhergestellt.

**Berechtigung:** nur Berater oder Firmen-Administrator (portal === 'berater' ||
isAdmin).

**Anzeige:** eigene Zeile "Elternzeit (E, keine Arbeitszeit)" im Abschnitt
Fehlzeiten, nur sichtbar wenn E-Tage vorhanden sind; statt einer Stundensumme die
Zahl der Tage. Identisch im Formular, im Einzeldruck und im Sammeldruck.

**Nicht umgesetzt (bewusst):** Kapazitaetsplanung beruecksichtigt E-Tage noch nicht;
keine Warnung bei verplanten Arbeitsplan-PM im E-Zeitraum; Mutterschutz hat keinen
eigenen Code.

## 8. Monatsabschluss-Workflow

MA schliesst Monat ab -> v7_timesheet_completions. Matrix + Mein-Status dunkelgruen (siehe 8.1).
Admin kann Abschluss aufheben. Speichern-Verhalten: Abschluss wird nur
zurueckgesetzt wenn tatsaechlich Aenderungen gespeichert wurden.

### 8.1 Monatsstatus Stundennachweis-Matrix und Mein Status (ab V7.9.12, Session 85)

Monatsstatus je Mitarbeiter, Projekt und Monat (identisch in Matrix und Mein Status):

| Status | Farbe | Bedingung |
|---|---|---|
| Abgeschlossen | dunkelgruen (green-700) | Eintrag in v7_timesheet_completions (Button "Monat abschliessen") - einzige Quelle |
| Erfasst (nicht abgeschlossen) | hellgruen (green-300 Matrix / green-200 Mein Status) | Monat vergangen, alle Netto-Werktage mit Eintrag, foerderbare Stunden > 0 |
| Teilweise / In Bearbeitung | orange | Eintraege vorhanden, sonst nicht erfuellt; immer im laufenden Monat; immer bei 0 foerderbaren Stunden. Tooltip "Keine foerderbaren Stunden erfasst" |
| Fehlt / Nicht erfasst | rot | keine Eintraege |
| Zukunft / ausserhalb | grau | wie bisher |

Netto-Werktage: Mo-Fr ohne Feiertage. Gezaehlt werden nur solche Tage mit Eintrag > 0
aus v7_timesheets (Projekt) oder zentraler Abwesenheit (v7_employee_absences,
Zuordnungsfenster). Mein Status: Fortschritt "x / y Monate" und Kopfzeile zaehlen nur
abgeschlossene Monate; zusaetzlich "y erfasst, nicht abgeschlossen".
Entscheidung Martin 17.09.2026: Monatsabschluss nur manuell; Altmonate ohne Abschluss
bleiben sichtbar (hellgruen) statt orange.

TimesheetForm: "Monat abschliessen" speichert vor dem Setzen IMMER.

---

## 9. Seiten-Uebersicht

### 9.1 Firmen-Portal (/v7/firma/...)

| Route | Beschreibung |
|-------|--------------|
| /v7/firma | Redirect -> /v7/firma/berichte (v7.3.43) |
| /v7/firma/projekte | Redirect -> /v7/firma/berichte (v7.3.90, Session 37) |
| /v7/firma/berichte | **STARTSEITE** Dashboard: Kacheln + Meine Projekte (Admin/PL) |
| /v7/firma/mein-status | Ampel, Rueckfragen, Downloads rollenabhaengig (MA-Startseite) |
| /v7/firma/projekte/[id] | Projekt-Detail + NWM (direkt aus Dashboard erreichbar) |
| /v7/firma/projekte/neu | Neues Projekt anlegen (nur Admin) |
| /v7/firma/zeiterfassung | Zeiterfassung (TimesheetForm v7.4.6-14) |
| /v7/firma/mitarbeiter | EmployeeManagement v7.3.95-14 (Admin/PL) |
| /v7/firma/firmendaten | FirmendatenCard (Admin/PL) |

**Nav-Struktur Firma-Portal (ab v7.4.4-13):**
- Admin: Dashboard | Mein Status | Mitarbeiter | Firmendaten
- PL: Dashboard | Mein Status
- MA: Mein Status (einziger Nav-Punkt)

"Meine Projekte" und "Meine Zeiterfassung" sind als separate Nav-Punkte entfernt.
Projektverwaltung erfolgt ueber die integrierte Projektliste im Dashboard.

### 9.2 Berater-Portal (/v7/berater/...)

| Route | Beschreibung |
|-------|--------------|
| /v7/berater/dashboard | 4 Kacheln + Offene Rueckfragen |
| /v7/berater/netzwerk | NWM-Uebersicht alle Netzwerke |
| /v7/berater/foerderung | Kundenfirmen (foerderung-page v7.4.1-6) |
| /v7/berater/foerderung/firma/[id] | Firma-Detail |
| /v7/berater/foerderung/firma/[id]/projekt/[pid] | Projekt + NWM |
| /v7/berater/foerderung/firma/[id]/zeiterfassung | ZE der Firma |
| /v7/berater/foerderung/firma/[id]/berichte | Berichte der Firma |
| /v7/berater/timesheets | Timesheet-Viewer |
| /v7/berater/multiprojekt | KPT 3-Jahres-Ansicht |
| /v7/berater/admin | Berater-Verwaltung + System-Konfiguration |

---

## 10. Deployment

### 10.1 Standard Deploy-Ablauf
```bash
cp ~/Documents/Dev/pze/downloads/[Dateiname] src/[Zielpfad]
pnpm dev   # lokal durchklicken (Pflicht!)
git add -A && git commit -m "beschreibung"
git push origin v7-dev
git checkout main && git pull
git merge v7-dev --no-ff --no-edit
git push origin main && git push cubintec main
git checkout v7-dev
```
**Remotes/Hook:** PROD-Push IMMER auf BEIDE Remotes (origin + cubintec). Der Vercel-
Build-Hook haengt Stand Session 52 (laut Dashboard) am Repo projektzeiterfassung20
(origin) - in v5.01 noch cubintec, vermutlich beim Domain-Umzug umgestellt. Beide-Push
deckt beide Setups ab; im Zweifel aktiven Hook im Vercel-Dashboard pruefen. Produktions-
URL: pze.cubintec-hub.com (301/308-Redirect von pze.itenion.com).

### 10.2 Versionierungskonvention
KRITISCH: Jede Aenderung = neues Inkrement N im Dateinamen. Niemals ueberschreiben.
KRITISCH: VOR jeder Dateiausgabe im Projektverzeichnis nach letzter Version suchen.

### 10.3 Stabile Asset-URLs (ab Session 34)
PDFs und oeffentliche Assets ohne Versionsnummer im Dateinamen -> neue Version
einfach ueberschreiben, kein Code-Deploy noetig.

---

## 11. Test-User + Kundenlisten

### 11.1 Test-User
| Name | Rolle | Portal / Firma |
|------|-------|----------------|
| Martin Ditscherlein | system_admin | Berater |
| Katrin Kirchner | consultant | Berater + Cubintec |
| Lisa Kirchner | client_user | Cubintec GmbH |
| Robin Freund | client_admin | Steuerkanzlei Freund |
| Annika Arndt | project_leader | Steuerkanzlei Freund |
| Thomas Duehrkop | client_user | Global Maritime Management |

### 11.2 PROD-Kundenliste (Stand Session 43, 11.05.2026 - 10 Firmen)
1. ALACsystems GmbH & Co. KG (Kirchhundem, NRW) - NEU Session 35
2. Androlite GmbH (Schwabach, Bayern - BY_EVAN)
3. AS System (Trittau, Schleswig-Holstein)
4. Automotive Synergies GmbH & Co. KG (Schwabach, Bayern - VETIS-Projekt)
5. Cubintec GmbH (Bad Neustadt, Bayern)
6. Fischbach Bauunternehmung (Wangen i.A., Baden-Wuerttemberg)
7. Global Maritime Management GmbH (Trittau, Schleswig-Holstein)
8. Luebeck Yacht Trave Schiff GmbH (Luebeck, Schleswig-Holstein)
9. Steuerkanzlei Robin Freund (Buechen, Schleswig-Holstein)
10. STOMA GmbH (Siegburg, NRW)

### 11.3 DEV-Kundenliste (4 Firmen, nicht synchron mit PROD)
AS System, Cubintec GmbH, Luebeck Yacht Trave Schiff GmbH, Tippl GmbH

---

## 12. Naechste Schritte

### 12.1 Anforderungsliste (verbindliche Offen-Liste)

**Dies ist die einzige verbindliche Quelle fuer offene Punkte (vgl. Paragraph 12b
Regel 14).** TODO-Listen beim Session-Start und Memory-Notizen sind nur abgeleitete
Sichten und werden gegen diese Tabelle abgeglichen, nicht umgekehrt.

**Format (nach Siemens-Mobile-Anforderungsmanagement):** Jede Zeile hat eine ID, die
Anforderung, wer sie angefragt hat, wann angefragt, den Status, das Datum der
Erledigung (Pflichtfeld bei Status erledigt) und die Referenz (Datei/Version/Paragraph).
Status-Werte: Offen / In Arbeit / Erledigt / Hinfaellig.

| ID | Anforderung | Angefragt von | Angefragt am | Status | Erledigt am | Referenz |
|----|-------------|---------------|--------------|--------|-------------|----------|
| A-001 | Berater-Portal Benutzerhandbuch | Martin | Session <=42 | In Arbeit | - | Inhalt vorhanden (PZE-Berater-Portal-Anleitung-v1_0). Offen: echtes docx/pdf-Format, Wording "Kundenfirmen"->"Unternehmen", Verlinkung im Portal. Re-verifiziert Session 47. Session 52: v1.1 als docx erstellt (URL-Migration pze.itenion.com -> pze.cubintec-hub.com, E-Mail-Referenzen @cubintec.com unveraendert), aber NICHT deployed - inhaltliche Korrekturen durch Martin ausstehend (-> v1.2). Liegt untracked in public/manuals/. |
| A-002 | Stundennachweis-Wording projekttyp-spezifisch: bei ZIM_NETZWERK "Management-Arbeiten" statt "foerderbare Projektarbeiten" | Martin | Session <=42 | Erledigt | 01.06.2026 | TimesheetForm v7.4.6-21: isNetzwerk-Zweig, Abschnitts-Ueberschrift typ-gesteuert. Offizielles ZIM-NWM-Template als Vorlage. |
| A-003 | AP-Quick-View Popup in TimesheetForm: Icon/Button neben Projekt-Dropdown oeffnet Popup mit AP-Liste (Laufzeiten + geplante PM), schliesst ohne State-Verlust | Martin | Session <=42 | Erledigt | 01.06.2026 | TimesheetForm v7.4.6-21: Info-Icon neben Projekt-Dropdown, eigener showAPModal-State, Tabelle mit AP-Code/Name/Laufzeit/PM + Gesamtsumme. Sichtbar fuer alle Nutzer. |
| A-004 | ZAPanel Status-Rollback "Bewilligt -> Eingereicht" | Martin | Session <=42 | Hinfaellig | 29.05.2026 | Durch Status-Automatik (calcStatus, ZAPanel v7.4.4-51/52) gegenstandslos: Status datengetrieben ueber Datumsfelder, keine manuellen Buttons mehr. Siehe TS-4. |
| A-005 | NWM gestaffelte Foerderquoten je Netzwerkjahr (foerdersatz_stufen Runtime + UI) | Martin | Session <=42 | Erledigt | 29.05.2026 | Runtime: NWMEigenanteilPanel v7.4.5-12 (getFoerdersatz/calcLaufzeitjahr). UI: NWMEinstellungenPanel v7.4.5-3 (editierbare Stufen-Tabelle + berechneStufen 70/50/30). Verifiziert Session 47. |
| A-006 | FZul-Modul ausbauen (PortalHeader + PortalNav, Multiprojekt-Zuordnung) | Martin | Session <=42 | Teil-erledigt | 05.06.2026 (Header) | TEIL-ERLEDIGT 05.06.2026 (Header): berater-fzul-page v7.4.9-2 - handgebaute Kopfzeile (Ozeanblau #0369a1, "Zurueck", eigenes Logout, keine Navi-Zeile) ersetzt durch PortalHeader (hideNavigation) + PortalNav. Korrektes Berater-Blau #002451, Navi-Zeile vorhanden, Rueckkehr ins Cockpit ueber Home-Icon. companyName-Prop NICHT uebergeben (PortalHeader laedt eigene Firma selbst), Umlaute in sichtbaren Texten intakt, COLORS+handleLogout entfernt. VERBLEIBT OFFEN: FZul-Modul-Ausbau (Analyse/Multiprojekt-Zuordnung), "Analyse starten" -> 404 (Modul in Vorbereitung). // Konzept KONZEPT-MULTIPROJEKT-FZUL. URSPR. HINWEIS (Session 49): Header-Vereinheitlichung der fzul-Seite hier mit erledigen - aktuell noch handgebauter Header im falschen Blau #0369a1; umstellen auf PortalHeader + PortalNav mit korrektem Berater-Blau #002451 und Loader2. WICHTIG: companyName-Prop im Berater-Portal NICHT uebergeben (PortalHeader laedt die eigene Firma selbst), und UI-Text-Strings (Bundeslaender, Hinweise) mit echten Umlauten lassen - kein ae/oe/ue auf sichtbarem Text. Eine in Session 49 verworfene uncommittete fzul-Arbeitskopie hatte beide Fehler gemacht (Diff dokumentiert in Session-49-Verlauf). |
| A-007 | De-minimis-Beihilfen-Datenbank-Modul | Martin | Session <=42 | Offen | - | Konzept offen. |
| A-008 | ZA-Bearbeitung im Cockpit: Klick auf ZA-Nummer oeffnet ZA direkt | Martin | Session <=42 | Erledigt | Session <=46 | FirmaCockpit handleZAClick (deep-link mit zaId/projektId/returnTo). Verifiziert Session 47. |
| A-009 | Verhaltensvertrag kritischer Komponenten als Paragraph 12e | Martin | Session 46 | Erledigt | 29.05.2026 | PH Paragraph 12e (Session 47). VERHALTENSVERTRAG v1.1 angenommen. |
| A-010 | Prozess gegen Doku-Drift: eine Offen-Liste, Erledigt-Regel, Session-Start-Abgleich | Martin | Session 47 | Erledigt | 29.05.2026 | PH Paragraph 12b Regeln 14-16. Diese Tabelle ist das Ergebnis. |
| A-011 | ProjektFortschrittPanel Refactor zu projektfortschritt-utils | Martin | Session <=42 | Erledigt | 31.05.2026 | ProjektFortschrittPanel v7.4.5-23: Inline-useMemo durch calculateProjectAnalysis aus projektfortschritt-utils ersetzt (eine Rechenquelle, auch FirmaCockpit). Ergebnisse anweisungsweise als identisch verifiziert; PF-02/03/04 unveraendert. Commit 97bc3bd. |
| A-012 | Standalone StundennachweisSeite und ProjektfortschrittSeite (analog ZASeite) | Martin | Session <=42 | Offen | - | - |
| A-013 | Legacy-Cluster aufraeumen: v7/firmen/[id]/page.tsx (v7.0.3) + v7/page.tsx (v7.0.0) + v7/import/page.tsx + v7/import/"page 2.tsx" | Claude (Audit) | Session 47 | Offen | - | HOCHGESTUFT Session 51 (vorher als 5-Min-Win eingeschaetzt - FALSCH): firmen/[id] wird von v7/page.tsx referenziert; v7/page.tsx ist selbst tot (Wurzel-Landing leitet auf /v7/berater, nicht /v7), aber die AKTIVE Seite v7/berater/foerderung/import/page.tsx pusht noch 2x auf /v7. Ausserdem Duplikat "page 2.tsx" (Leerzeichen im Namen) im import-Verzeichnis. Nicht loeschbar ohne Navigationsentscheidung: wohin sollen die router.push('/v7') der aktiven Import-Seite zeigen (vermutlich /v7/berater/foerderung)? + welche der 3 Import-Dateien ist aktiv? Eigene fokussierte Aufraeum-Session mit pnpm-build-Gegencheck. Siehe TS-8. |
| A-014 | "Neues Unternehmen anlegen"-Button im App-Cockpit + Auto-Open Anlage-Modal auf Foerderseite | Martin | Session 48 | Erledigt | 31.05.2026 | Lag uncommittet seit Session 44 (Werkbank-Fund). cockpit/page.tsx v1.0.4 (Button -> /v7/berater/foerderung?openNew=true) + foerderung/page.tsx v7.4.1-9 (openNew-Modal + Redirect zum App-Cockpit nach Speichern). Kein pg-Import (App nutzt Supabase). Commit bd21e9d. |
| A-015 | Foerderseite: Zurueck-Button modus-bewusst (App-Modus -> App-Cockpit, Classic -> altes Dashboard) | Martin | Session 48 | Erledigt | 31.05.2026 | foerderung/page.tsx v7.4.1-10: liest pze_mode aus localStorage, Label vereinheitlicht zu "Zurueck". Commit a1e3118. |
| A-016 | App-Cockpit: Begruessung + Header zeigen vollen Namen (Vorname Nachname) statt nur Nachname | Martin | Session 48 | Erledigt | 31.05.2026 | berater-app-cockpit-page v1.0.5: Name aus first_name+last_name (v7_user_profiles), Fallback display_name->E-Mail. Wirkt in Begruessung UND PortalHeader. |
| A-017 | Werkbank-Bereinigung: lokale Arbeitskopie driftete seit Session 44 von deployed | Claude (Audit) | Session 48 | Erledigt | 01.06.2026 | Session 49: (a) verirrte src/app/v7/berater/foerderung/foerderung-page.tsx (Upload-Kopie, 13.05., nie geroutet) geloescht; (b) leere 0-Byte-Stray-Datei "Vercel" geloescht; (c) alte PZE-Upload-Checkliste-Session44 nach docs/archiv/ verschoben; (d) uncommittete fzul/page.tsx-Aenderung verworfen (git restore) - war kein Platzhalter, sondern halbfertiger Header-Umbau mit 7 UI-Text-ASCII-Regressionen + redundanter companyName-Query; Header-Vereinheitlichung an A-006 verwiesen; (e) Sync-Tooling konsolidiert: V2 (scripts/sync-prod-to-dev-v2.mjs, direkte pg-Verbindung, fragt Keys interaktiv ab - commit-sicher) behalten und committet, V1 + Wurzel-Duplikat geloescht, pg als Abhaengigkeit getrackt (Weg 2: Dev-Tooling versioniert). Commit 9bc238e. docs/Supabase MDBS.docx bleibt als lebende Notiz-Datei. |
| A-018 | refreshed-Lose-Ende im App-Cockpit | Claude (Audit) | Session 48 | Erledigt | 01.06.2026 | Session 49: inerter useEffect-Listener (setzte bei ?refreshed=true nur loading=true, ohne Reload und ohne loading je zurueckzusetzen -> latente Spinner-Falle; Foerderseite sendet den Parameter ohnehin nicht; Cockpit laedt beim Remount via router.push frisch) ersatzlos entfernt. useSearchParams + searchParams damit ungenutzt -> entfernt. Suspense-Huelle bewusst belassen (keine Strukturaenderung). berater-app-cockpit-page v1.0.6, Commit d1dcd1b. |
| A-019 | Namens-Vereinheitlichung: ProjektFortschrittPanel (deutsch, K) vs. Project*-Dateien (englisch, C). Umbenennung beruehrt alle Importe | Claude (Audit) | Session 48 | Offen | - | Niedrige Prio. Session 49 bewusst nicht ausgefuehrt: hohes Bruchrisiko (alle Importe) fuer rein kosmetischen Gewinn; wenn, dann als eigenes fokussiertes Inkrement mit pnpm-build-Gegencheck. |
| A-020 | Firmen-Deaktivierung fehlt im App-Paradigma. Muelleimer (is_active=false) existiert nur auf klassischer Foerderung-Seite. App-Pfad hat keine Firmen-Deaktivierung. | Martin | Session 49 | Erledigt | 03.06.2026 | FirmaCockpit v7.4.9-31: Trash2-Icon in Firmendaten-Karte neben dem Stift, NUR Berater-Portal (alle Berater). Bestaetigungsdialog (Wording analog klassisch). DB-Update wie klassische handleDelete: is_active=false, status=inactive, updated_at. Nach Erfolg Rueck-Navigation ins App-Cockpit (bzw. /v7/berater/foerderung im Classic-Mode). Soft-Delete, ueber A-023 wiederherstellbar. |
| A-021 | NWM-Tagessperren + Cross-Projekt-Validierung: Admin/PL kann bei ZIM_NETZWERK-Projekten Tage fuer MA sperren. Projektuebergreifende 9h-Tagesgrenze. | Martin | Session 50 | Erledigt | 01.06.2026 | TimesheetForm v7.4.6-22: NWM-Sperren aus v7_nwm_blocked_periods (neue Tabelle), rosa Zellen + Tooltip. Cross-Projekt: Stunden anderer Projekte geladen, calcCrossProjectTagSumme fuer 9h-Grenze. Sperren-Modal mit MA-Mehrfachauswahl, Validierung gegen bestehende Buchungen. SQL-MIGRATION-nwm-blocked-periods-v1.sql ausgefuehrt auf DEV+PROD. |
| A-022 | Kapazitaetsplanung: Monatskapazitaet auf echte Arbeitstage umstellen + MA-Deep-Link | Martin | Session 50 | Erledigt | 01.06.2026 | berater-multiprojekt-page v7.4.8-17: monatsKap-Formel ersetzt durch countWorkdaysInMonth()*WAZ/5. v7_employee_hours_history fuer unterjaerige WAZ-Aenderungen. MA-Name klickbar -> Deep-Link ?editMA+?returnTo -> FirmaCockpit v7.4.9-30 oeffnet MA-Modal direkt, Ruecksprung zur KP (useRef). |
| A-023 | Firmen-Reaktivierung im App-Cockpit (Gegenstueck zu A-020). Deaktivierte Firmen waren im App-Paradigma nirgends sichtbar/wiederherstellbar - nur ueber klassische Seite (im Cockpit nicht erreichbar). | Martin | Session 51 | Erledigt | 03.06.2026 | berater-app-cockpit-page v1.0.7: zweite Query auf status=inactive (load() unangetastet). Aufklappbarer Bereich "Inaktive Firmen (N)" unter "Neues Unternehmen anlegen", nur sichtbar wenn inaktive Firmen existieren. Pro Firma RotateCcw-Wiederherstellen-Button + Bestaetigungsdialog. DB-Update analog klassisch: is_active=true, status=active, updated_at. Nach Erfolg reiner Client-State-Update (Firma wandert zurueck in Dropdown, kein Reload). |
| A-024 | Schutz gegen E-Mail-Tippfehler bei MA-Neuanlage (Konsequenz aus PROD-Incident Luebeck Yacht). | Martin | Session 51 | Erledigt | 03.06.2026 | Zweites Bestaetigungsfeld "E-Mail bestaetigen" NUR im Anlage-Modus, in BEIDEN Anlage-Formularen: MitarbeiterModal v1.0.2 (App-Paradigma) und EmployeeManagement v7.3.95-18 (klassisch). Live-Abgleich kleingeschrieben+getrimmt, roter Hinweis + Anlegen-Button gesperrt bei Abweichung, harte Pruefung in handleSave. Paste im Bestaetigungsfeld gesperrt (onPaste preventDefault), damit ein vertippter Wert nicht in beide Felder kopiert werden kann. Login-Email wird beim Anlegen genau hier in v7_employees.email gesetzt; create-employee-login uebernimmt sie von dort (kein erneutes Tippen) - daher ist das Anlage-Formular die einzige noetige Schutzstelle. |
| A-025 | App-Modus-Navigation: "Unternehmen"-Tab fuehrte auf die alte Firmenliste statt ins App-Cockpit (Sackgasse ohne Rueckweg). | Martin | Session 51 | Erledigt | 05.06.2026 | PortalNav v7.4.4-24: "Unternehmen"-Tab im App-Modus (pze_mode='app') ausgeblendet (return null statt Button-Render auf die alte /foerderung/firma/select/cockpit-Route). Zugang zur Firmenauswahl nur noch ueber das Home-Icon -> /v7/berater/app/cockpit. App-Nav damit auf allen Seiten identisch zur Cockpit-Nav (AppNav). Classic-Modus unveraendert. |
| A-026 | Fehlzeiten-Regression: Abwesenheitscode (U/K/S) in einer AP-Tageszelle wurde angezeigt, aber unten nicht als Fehlzeit gezaehlt. | Martin | Session 52 | Erledigt | 08.06.2026 | TimesheetForm v7.4.6-23: handleCellChange routet einen Abwesenheitscode (U/K/S, F->S) automatisch in die passende Fehlzeit-Zeile mit MA-Tagesstunden (employeeDailyHours) und leert die AP-Zelle. Ursache: v7.4.6-16 (07.05.) stellte Fehlzeiten auf direkt editierbare U/K/S-Zeilen um ("keine Automatik"); calculateAbsenceSums liest seither nur absenceHoursInput, ein Code in der AP-Zelle lief ins Leere (auch beim Speichern uebersprungen). Direkte Eingabe in den unteren Zeilen bleibt moeglich. Eingriff nur in handleCellChange. Kein Transfer-Schaden - die Umstellung war von Mai an so. |
| A-027 | Cockpit-Stundennachweis: Matrix-Zellklick oeffnete das Timesheet im aktuellen Monat statt im geklickten; "Zurueck" landete im alten Foerder-Portal statt im Cockpit. | Martin | Session 52 | Erledigt | 08.06.2026 | Ursache Monat: Parameter-Mismatch - die Cockpit-Matrix-Seite uebergab ?projekt=&ma=&monat=YYYY-MM, die Zeiterfassungs-Seite (.../zeiterfassung v7.4.6-2) liest aber ?employee=&year=&month= -> MA/Monat ignoriert, initialMonth leer, Ruckfall auf aktuellen Monat. (Der alte Weg ueber Berichte/BerichtePage gab die Parameter korrekt - der App-Cockpit-Weg war von Beginn an falsch verdrahtet, keine Regression.) Ursache Zurueck: Matrix gab kein returnUrl -> Zeiterfassungs-Seite nahm Default /foerderung/firma/[id]; zudem router.back() nicht-deterministisch. Fix: cockpit/stundennachweis page v7.4.9-5 (handleNavigateToZE: korrekte Parameter + returnUrl=<Matrix>; "Zurueck" via localStorage pze_mode ins Firma-Cockpit App /app/firma/[id] bzw. klassisch /foerderung/firma/[id]/cockpit) und cockpit/fortschritt page v7.4.9-5 (gleicher Zurueck-Fix). Zeiterfassungs-Seite unveraendert. OFFEN (bewusst, kein Scope-Creep): Zeiterfassungs-Seite liest kein ?projekt - bei Mehr-Projekt-Firmen ggf. Default-Projekt vorgewaehlt; bei 1-Projekt-Firmen unsichtbar. |
| A-028 | App-Firmenseite /v7/berater/app/firma/[id] zeigte oben keinen Header (blauer Balken fehlte komplett). | Martin | Session 52 | Erledigt | 08.06.2026 | Ursache: FirmaCockpit rendert den PortalHeader NICHT selbst (nur die Nav) - das liefert immer die Wrapper-Seite. Die App-Firmenseite (v1.0.0) war ein Minimal-Wrapper und rendert nur <FirmaCockpit/>. Fix: app/firma/[id] page v1.0.1 auf das Muster der klassischen Cockpit-Seite gebracht (Auth-Check, Laden Benutzer + Firmenname, Loading-State, <PortalHeader portal="berater" .../> + <FirmaCockpit/>). Kein AppNav ergaenzt (FirmaCockpit rendert die Nav selbst). |
| A-029 | Sammeldruck Stundennachweise: Mehrfachauswahl per Monatsspalte/MA-Zeile/Einzelzelle/Eck-Feld, ein Blatt je MA+Monat, im Druck nur die Blaetter | Martin | Session 53 | Erledigt | 11.06.2026 | StundennachweisMatrix v7.4.6-3 (Umschalt-Modus "Sammeldruck"; "Drucken (n)" laedt Detaildaten der Auswahl selbst nach). NEU StundennachweisSheet v1.0.0 (statisches Nachweis-Layout 1:1 zum Einzeldruck) + NEU lib stundennachweisSheetData v1.0.0 (Builder gespeicherte Timesheets -> Anzeigemodell). Druck zeigt nur die Blaetter via CSS #snw-print-root. Cockpit/BerichtePage/TimesheetForm unangetastet. Nachgetragen in v5.05 (war bis v5.04 nur in der Status-Prosa). |
| A-030 | Meine-Arbeitspakete-Popup in der Zeiterfassung: Knopf neben MA-Auswahl zeigt die dem MA im Arbeitsplan zugeordneten APs | Martin | Session 53 | Erledigt | 11.06.2026 | TimesheetForm v7.4.6-30: Modal mit AP-Code, Bezeichnung, ggf. T/NT, geplante + offene Stunden. Reine Anzeige ueber assignedWPIds/plannedHoursPerWP/calculateRemainingHours. Nachgetragen in v5.05 (war bis v5.04 nur in der Status-Prosa). |
| A-031 | Login-Erstellung fehlte im App-Cockpit: das Schluessel-Icon konnte nur Passwoerter zuruecksetzen, nicht Logins anlegen (MA ohne user_id -> Sackgassen-Meldung). | Martin | Session 54 | Erledigt | 22.06.2026 | Die Login-Anlage lag nur im alten EmployeeManagement (Firmendaten>Mitarbeiter); das schlanke MitarbeiterModal im Cockpit kannte nur new/edit/password. Fix: MitarbeiterModal v1.0.3 - Passwort-Modus zeigt bei fehlendem Login ein Login-erstellen-Formular (E-Mail + Portal-Rolle read-only, Passwortfeld) und ruft die bestehende atomare Route /api/v7/create-employee-login auf; Fall ALREADY_REGISTERED abgefangen (Verknuepfen weiterhin ueber Firmendaten>Mitarbeiter). FirmaCockpit v7.4.9-36 - Schluessel-Icon-Tooltip + Hover-Farbe dynamisch je user_id (Login erstellen blau / Passwort zuruecksetzen amber), user_id in MA-Query + MitarbeiterData ergaenzt. Nebenbei ASCII-Korrektur (Mittelpunkt im Firmen-Zaehler -> '-'). KEINE DB-Migration. Merge 92b51c1, Deploy pze.cubintec-hub.com verifiziert. |
| A-032 | Stundennachweis-Matrix zeigte bei Mehr-Projekt-Firmen alle MA aller Projekte statt nur des oben gewaehlten. | Martin | Session 55 | Erledigt | 22.06.2026 | MA-Zeilen entstanden aus ALLEN projectAssignments ohne Projektfilter. StundennachweisMatrix v7.4.6-4: Assignments zuerst auf activeProjectId filtern (project_id im Interface ergaenzt); MA-Liste, Sortierung und Start/End-Grenzen nutzen die gefilterte Liste. cockpit-stundennachweis page v7.4.9-6: assignment_start/end je MA+Projekt zusammenfuehren (vorher nur je MA -> MA in mehreren Projekten konnte falsche Datumsgrenzen erben). Wirkt auch in der BerichtePage-Matrix (gleiche Komponente). Verifiziert an Selaflex (InGrav/GRAVID, Linfert in beiden). |
| A-033 | Zeiterfassung/Einzelnachweis: jeder Firmen-MA war in jedem Projekt buchbar, auch wenn nicht zugeordnet (Teil 2a). | Martin | Session 55 | Erledigt | 22.06.2026 | TimesheetForm v7.4.6-37: MA-Dropdown auf das Projektteam gefiltert (teamMemberIds aus v7_project_assignments des gewaehlten Projekts, auch ohne employee_number; teamEmployees). Gewaehlter MA bleibt sichtbar (Deep-Link); beim Projektwechsel Auto-Umstellung auf ersten Team-MA, falls aktueller nicht im Team. Leeres Team -> Fallback volle Liste (kein Bruch). |
| A-034 | Projektuebergreifende Abwesenheiten: Abwesenheit ist mitarbeiter-, nicht projektbezogen - einmal erfassen, in allen Projekten des MA wirksam (kein Doppeleintrag); Abwesenheitstag sperrt Arbeit projektuebergreifend. | Martin | Session 55 | Erledigt (DEV+PROD) | Session 59 | Umgesetzt in DEV (Session 58): NEU Tabelle v7_employee_absences (partieller UNIQUE employee_id+work_date WHERE is_active, RLS+4 Policies), NEU lib employeeAbsences.ts. DEV-Migration 378 Abwesenheiten (Backup+Guard, Alt-Zeilen deaktiviert, Dual-Read) inkl. Stammdaten-Reparatur Geisterfirma AutoSyn + Feiertags-S-Bereinigung. Lesepfade useBerichteData v1.0.2 / BerichtePage v7.4.6-20 / StundennachweisMatrix v7.4.6-6. Schreibpfad TimesheetForm v7.4.6-47 (2a Laden, 2b Speichern-Sync ueber MA+Monat, 2c harte Cross-Projekt-Sperre; ein Code/Tag, S an Feiertag bleibt berechnet, Sonderurlaub wandert mit). Bewusst NICHT: Spiegeln von Arbeitsstunden zwischen Projekten (9h-Grenze A-021 sichert Plausibilitaet). PROD (Session 59): SQL-MIGRATION-employee-absences-v2.sql, Feiertags-S im INSERT ausgeschlossen (bundesweite + regional Fronleichnam NW/Reformationstag SH), kein RLS-Block in PROD (Angleich DEV/PROD im Backlog). Verifiziert: absences=636 (U=561/K=70/S=5), Backup=757, ts_rest=0; gekoppelter Dual-Read-Deploy Block1->Code(9cb9c9b origin+cubintec)->Vercel Ready->Block2-4; live bestaetigt (Feiertag berechnet, Sonderurlaub bleibt S, projektuebergreifend automatisch, Berichte ok). |
| A-035 | Dashboard-Matrix meldete bei Mehr-Projekt-Firmen "Keine Projektdaten verfuegbar (Projekt benoetigt Start- und Enddatum)", obwohl beide Projekte Datumsangaben hatten - und welches Projekt betroffen war, wechselte je nach Navigationsweg ("mal so, mal so"). | Martin | Session 56 | Erledigt | 23.06.2026 | KEIN Datenproblem, sondern State-Desync im Dashboard. Der obere Projekt-Dropdown setzte nur selectedReportProjectId (filtert das an die Matrix uebergebene projects-Array auf das gewaehlte Projekt), nicht aber matrixProjectId (steuert das aktive Projekt in der Matrix, wird sonst nur einmal beim Panel-Oeffnen gesetzt). Beim Umschalten lief beides auseinander: Matrix erhielt nur [neuesProjekt], suchte darin aber das veraltete aktive Projekt -> nicht gefunden -> matrixData null -> Fehlmeldung. Der Flip ergab sich daraus, welches Projekt zuletzt als matrixProjectId haengen blieb. Fix: BerichtePage v7.4.6-18 (onChange des oberen Dropdowns setzt beide States synchron) + StundennachweisMatrix v7.4.6-5 (Selbstheilungs-Guard: activeProjectId faellt auf projects[0] zurueck, wenn matrixProjectId nicht im uebergebenen projects-Array liegt - schuetzt auch die uebrigen Aufrufer der Shared-Komponente, u.a. cockpit-stundennachweis page). Reine Lese-/State-Logik, KEINE DB-Migration. Verifiziert live an Selaflex (InGrav/GRAVID). |
| A-036 | Feiertagszelle in der Ausfallzeiten-Zeile (Sonstige bezahlte Ausfallzeit) an berechneten Feiertagen sperren (disabled + Tooltip), analog zu den bereits gesperrten Arbeitszellen. UX-Haertung. | Martin | Session 59 | Offen | - | Vorbestehend, kein Regress aus dem A-034-PROD-Deploy. ENTSCHAERFT: der Speicherpfad schuetzt bereits - TimesheetForm hat if (code === 'S' && isHoliday(...)) return (ca. Z. 2453/2281), ein Feiertag wird nie als S in v7_employee_absences geschrieben; es kann also kein Feiertags-S zurueckkehren. Rein fehlende UI-Sperre. Fokussierte Folge-Session: Render-Abschnitt der Fehlzeiten-Zeile lesen, disabled-Bedingung chirurgisch um !!holiday ergaenzen. |
| A-037 | Footer-Build-Marker pflegen | Martin | Session 59 | Offen | - | Live-Footer zeigt 'Build 43' inkl. eigenem Build-Segment, die PortalFooter-Quelle im Projekt (v7.4.9-1) enthaelt diesen Marker aber NICHT -> deployte Footer-Fassung ist neuer als die Projektkopie. (1) aktuelle PortalFooter-Quelle ins Projekt nachziehen; (2) Build-Marker kuenftig bei jedem PROD-Deploy im Versions-Ritual hochzaehlen, damit der Footer wieder verlaessliche Live-Bestaetigung ist (Stand Session 59 nur ueber Vercel-Commit 9cb9c9b bestaetigt). |
| A-051 | Timesheet-Restanzeige umschaltbar: statt nur projektweit offener Stunden auch die am Ende des angezeigten Monats noch offenen Stunden anzeigen (Monatsende), pro Nutzer waehlbar | Katrin (via Martin) | Session 76 | Erledigt | 08.08.2026 | TimesheetForm v7.4.6-79/-80/-81: zwei Modi der rechten "+/-"-Spalte (gesamt / monatsende); Umschalter als Kreispfeil in der Rest-Kopfzelle (grau=Monatsende Default, gruener Chip=gesamt); Persistenz pro Nutzer in NEUER Tabelle v7_user_preferences (settings.timesheet_rest_modus), SQL-MIGRATION-user-preferences-v1.sql DEV+PROD. Nur Anzeige zugeordneter APs; "Alle AP"-Uebersicht + blaue projektweite Restzahl unveraendert. Fachlicher Hintergrund (Diskussion Martin/Katrin): gesamt = echtes projektweites Restbudget; monatsende = historischer Monatsstand fuer Korrekturen/Verlaufslesen. Deploy V7.9.4: Merge v7-dev->main (--no-ff), push origin+cubintec, Vercel. Details GIT-SICHERUNG-v7_9_4-session76.md. |
| A-052 | Timesheet: zugeordnete APs erst ab ihrem geplanten Startmonat anbieten (nicht ab Projektbeginn); "Weitere AP" jederzeit vollstaendig fuer vorgezogene/uebernommene APs | Martin (Faelle AURA/GMM: Oezalp, Fells) | Session 77 | Erledigt | 10.08.2026 | TimesheetForm v7.4.6-82/-83: Startmonats-Filter hasAPStarted nur fuer "Zugeordnete AP"; Obergrenze end_date+2M entfernt (waehlbar solange offene Stunden); "Weitere AP" ohne Zeitfilter. Details GIT-SICHERUNG-v7_9_5-session77.md. |
| A-053 | AP-Status-Uebersicht: "gesamt"-Spalten muessen spaltenweise mit den MA-Spalten aufgehen (keine 0,01h-Rundungsreste) | Martin (AURA/GMM) | Session 77 | Erledigt | 10.08.2026 | ApStatusModal v1.0-11: gesamt = Summe der auf 2 Stellen gerundeten MA-Werte (geplant/gebucht/offen); Ursache periodischer PM-Faktor 173,3333. Reine Anzeige. Details GIT-SICHERUNG-v7_9_5-session77.md. |
| A-054 | Zielerreichungs-Prognose darf den planmaessigen Projektauslauf nicht als "gefaehrdet" ausweisen; sie soll die Planerfuellung messen | Martin (AURA/GMM: 83% Laufzeit/82% PM/86% Kosten faelschlich "gefaehrdet") | Session 77 | Erledigt | 10.08.2026 | projektfortschritt-utils v7.4.9-6: Prognose = Ist(abgeschl.) + Rest-Soll x Erfuellungsgrad (Ist/Soll bis heute); Cockpit-Labels "Plan-Erfuellung XX%". Schwellen unveraendert. Details GIT-SICHERUNG-v7_9_5-session77.md. |
| A-055 | NWM-Projekte: Projektfortschritt und Prognose muessen je Netzwerkjahr filterbar sein (Dropdown-Selektor); Firma-Cockpit soll aktuelles NWJ automatisch vorwaehlen | Martin (NWM-Projekte mit mehreren Foerderzeitraeumen) | Session 80 | Erledigt | 27.08.2026 | ProjektFortschrittPanel v7.4.5-33: NWJ-Dropdown mit allen FZ + Gesamtverlauf; cockpit-fortschritt-page v7.4.9-9: NWM-Datenladen; FirmaCockpit v7.4.9-36-14: NWM-Erkennung + Auto-Vorauswahl. Details GIT-SICHERUNG-v7_9_6-session80.md. |
| A-056 | NWM: Foerderquote in ZA und Eigenanteilen muss automatisch aus FZ-Tabelle kommen (nicht per Datumsarithmetik); FZ-Grenzueberschreitung (zeitraum_von/bis in verschiedenen FZ mit unterschiedlichen FQ) muss erkannt und blockiert werden | Martin (Falschberechnungen vermeiden) | Session 80 | Erledigt | 27.08.2026 | ZAPanel v7.4.4-69: getFoerderquoteFromFZ + checkFZGrenzueberschreitung, Speichersperre + rote Meldung; NWMEigenanteilPanel v7.4.5-13: identische FZ-Logik, Berechnungs-Blockade. Alte Datumsarithmetik als Fallback. Details GIT-SICHERUNG-v7_9_6-session80.md. |
| A-057 | Bundesland muss beim Bearbeiten der Firmendaten so erscheinen, wie es bei der Neuanlage erfasst wurde | Martin (Neuanlage FYS) | Session 81 | Erledigt | 08.09.2026 | FirmendatenCard v7.4.6-2: ISO-Codes als Option-Werte, Vorbelegung ueber normalizeStateCode, Klartextanzeige. Pruefskript SQL-CHECK-federal-state-iso-v1.sql. |
| A-058 | Es muss eindeutig sein, welche Wochenarbeitszeit die Zeiterfassung verwendet; Abweichungen zur pWAZ muessen sichtbar werden, ohne die Antragswerte zu veraendern | Martin | Session 81 | Erledigt | 08.09.2026 | Rangfolge Historie -> Stammsatz -> Firmenstandard (PH 7e); TimesheetForm v7.4.6-88; ProjectTeamManager v7.4.4-20. KONZEPT-ARBEITSZEITGRENZEN-v1_4.md Paragraph 2.4. |
| A-059 | Elternzeit muss im Stundennachweis abbildbar sein: keine Stunden, Tage gesperrt, Grund erkennbar, Erfassung als Zeitraum | Martin (Rueckfrage Projekttraeger VDI) | Session 81 | Erledigt | 08.09.2026 | Abwesenheitscode E (SQL DEV+PROD), TimesheetForm v7.4.6-89 bis -93, stundennachweisSheetData v1.0.2, StundennachweisSheet v1.0.4. PH 7f. Offen: Kapazitaetsplanung, PM-Warnung. |
| A-060 | "Sonstige Arbeiten" muessen jeder Aenderung der Projektstunden folgen und duerfen nicht auf altem Stand stehenbleiben | Martin (Volkmann, April/Juni 2026) | Session 81 | Erledigt | 08.09.2026 | TimesheetForm v7.4.6-94/-95/-96. Regel in PH ergaenzt. |
| A-061 | Timesheet: zugeordnete APs nach Abschluss nicht dauerhaft automatisch anzeigen - abgeschlossene APs vom Projektanfang tauchten mit blossem Rundungsrest (0,01 h offen) noch >1 Jahr spaeter auf. NACHTRAG: urspruenglich in Session 78 als A-055 gefuehrt; diese Nummer wurde in Session 80 ein zweites Mal vergeben, weshalb der Vorgang nie ins Pflichtenheft gelangte. | Martin (HEATS: AP 1.1 Anforderungsanalyse Start 05/2025 im Stundennachweis 06/2026) | Session 78, nachgetragen Session 81 | Erledigt | 10.08.2026, dokumentiert 09.09.2026 | TimesheetForm v7.4.6-84: start-basierte Obergrenze monthsSinceStart <= 3 in isAPInAssignedGroup (Dropdown "Zugeordnete AP" + Matrix-Vorbelegung); Grundlage max. 3 PM je AP laut Foerderrichtlinie. Reststunden-Pruefung bleibt UND; "Weitere AP" ohne Zeitfilter; Untergrenze hasAPStarted unveraendert. Ersetzt die in A-052 entfernte end_date+2-Grenze. Regel bis v7.4.6-96 unveraendert enthalten. Details GIT-SICHERUNG (Session 78). |
| A-062 | Stundennachweis-PDFs sollen einheitlich benannt werden: Name_FKZ_Stundennachweis_YYMM | Martin (Session 81) | Session 81 | Erledigt | 09.09.2026 | TimesheetForm v7.4.6-97 (Einzeldruck) und StundennachweisMatrix v7.4.6-16 (Sammeldruck) setzen document.title auf "<Nachname>_<FKZ>_Stundennachweis_<YYMM>"; bei mehreren Mitarbeitern ohne Namensteil, bei mehrmonatiger Auswahl Zeitraum YYMM-YYMM. Nachname erster Token, ASCII-gewandelt. Ersetzt die getrennten Schemata aus v7.4.6-59 und v7.4.6-9. |
| A-063 | Foerder-Konsequenzen: bei 100 Prozent Erreichungsgrad darf kein "Verschenkt" ausgewiesen werden | Martin (SmartMarina: Erreichungsgrad 100 Prozent, zugleich "Verschenkt 2.697 EUR") | Session 81 | Erledigt | 09.09.2026 | Ursache: verschenkt = bewilligte Summe minus Prognose, wobei die Prognose auf die Plankosten gedeckelt ist. Bei SmartMarina liegt der Arbeitsplan mit 121.062 EUR unter der Bewilligungsbasis von 124.914 EUR (87.440 / 0,7); die Differenz von 3.852 EUR Kosten bzw. 2.697 EUR Foerderung ist strukturell und durch Leistung nicht schliessbar. projektfortschritt-utils v7.4.9-16: verschenkt misst gegen foerderbarPlanErfuellt; die Bewilligungsdifferenz erscheint als planungsluecke. ProjektFortschrittPanel v7.4.5-34 zeigt sie als eigenen Block "Planungsluecke im Arbeitsplan" mit Handlungshinweis (nur eine Anpassung des Arbeitsplans schliesst die Luecke). |
| A-064 | Monatsverlauf: drei gestrichelte Linien nicht unterscheidbar; Abweichung zwischen AP-Status und Monatsbalken nicht erklaert | Martin (SmartMarina: AP 1 im AP-Status voll, April-Balken bei rund der Haelfte) | Session 81 | Erledigt | 09./10.09.2026 | Linien "Soll kumuliert" und "Zieltempo kumuliert" entfernt (ProjektFortschrittPanel v7.4.5-34, FirmaCockpit v7.4.9-36-15 - eigene Diagramm-Kopie). Zur Abweichung: kein Rechenfehler. Die Ist-Saeulen zaehlen nach BUCHUNGSMONAT, der AP-Status je ARBEITSPAKET. Beleg SmartMarina AP 1: 260 h Plan im April, gebucht 259,67 h davon 134,67 h im April und 125,00 h im Mai; Summen beider Sichten identisch (1.303,01 h). Die Fussnote benennt das jetzt und verweist fuer den AP-Stand auf den AP-Status. |
| A-065 | Kapazitaetsplanung muss Elternzeit (Code E) beruecksichtigen - ein Mitarbeiter in Elternzeit erschien mit voller Kapazitaet | Martin (offener Punkt aus KONZEPT-ELTERNZEIT-TIMESHEET Paragraph 11 und GIT-SICHERUNG V7.9.9) | Session 82 | Erledigt | 11.09.2026 | berater-multiprojekt-page v7.4.8-28/-29: E-Tage laden, nur Arbeitstage zaehlen (E wird auch auf Feiertage geschrieben, countWorkdaysInMonth zaehlt Feiertage nicht), Monatskapazitaet (Arbeitstage - E-Arbeitstage) x (WAZ/5). Ampel-Basis volle Monatskapazitaet ohne Elternzeit (Entscheidung Martin). Voll-E-Monat: Zelle "E" statt Ampel - ohne diese Sonderbehandlung haette die bestehende Formel Kapazitaet 0 als "100 Prozent frei" gruen gezeigt. Rotes E, wenn im Voll-E-Monat Arbeitsplan-PM verplant sind: der Elternzeit-Dialog prueft nur ERFASSTE Stunden, nicht den ARBEITSPLAN - das rote E ist derzeit die einzige Stelle, an der dieser Widerspruch sichtbar wird. Verifiziert in DEV (AS System) und PROD (Flensburger Yacht-Service, April 2026: 160 h, 14 E-Arbeitstage, -112 h, verfuegbar 48 h, verbucht 48 h). |
| A-066 | Elternzeit ausserhalb der Projektlaufzeit ist ueber die Oberflaeche nicht entfernbar | Session 82 (DEV-Test: Zeitraum 01.06.-16.07.2027 fuer einen MA, dessen Projekt vorher endet) | Session 82 | Offen | 11.09.2026 | "Elternzeit-Zeitraum entfernen" bietet das Kontextmenue des TimesheetForm nur an einem E-Tag an; liegen alle E-Tage in Monaten, die das Projekt nicht anzeigt, ist der Dialog nicht erreichbar. Der Dialog selbst entfernt jeden Von-Bis-Zeitraum. Das Anlegen ausserhalb der Laufzeit ist fachlich zulaessig (E gilt projektuebergreifend). Loesungsvorschlag: (a) Warnung in der Vorschau, wenn der Zeitraum ueber das Projektende hinausgeht, (b) "Elternzeit-Zeitraum entfernen" auch an Nicht-E-Tagen anbieten. Behelf bis dahin: is_active = false per SQL (in Session 82 so fuer die DEV-Testdaten ausgefuehrt). |
| A-067 | FZul-Detailseite (Jahreskalender, BSFZ-Export) liest die zentrale Abwesenheitstabelle nicht | Session 82 (Codeanalyse multiprojekt-detail v7.4.8-17) | Session 82 | Erledigt | 11.09.2026 | src/app/v7/berater/multiprojekt/[id]/page.tsx referenziert v7_employee_absences nicht; Abwesenheiten werden nur ueber den Alt-Filter day_type auf v7_timesheets ausgeschlossen. Seit A-034 (zentrale Abwesenheiten) liegen U/K/S und seit V7.9.7 E aber in v7_employee_absences. Folge: an Elternzeit- und Abwesenheitstagen werden volle FZul-Stunden als verfuegbar angeboten und koennen in den BSFZ-Export gelangen. Fachlich gewichtiger als A-065, weil der Export nach aussen geht. ERLEDIGT Session 83 (V7.9.11): multiprojekt-detail v7.4.8-18..-20. Abwesenheiten mitarbeiterbezogen aus v7_employee_absences, nur an Arbeitstagen, in Uebersicht, Import, Kalender und Export. Altdaten-Konflikt sichtbar und korrigierbar, keine automatische DB-Aenderung (Entscheidung Martin). Verifiziert DEV (AS System, Test A-067) und PROD (KAIRA: Ditscherlein 19 Tage / 144,4 h = Vorab-SQL). |
| A-068 | FZul-Detailseite: nur zuschussfaehige Stunden duerfen als "gefoerdert" die FZul-Verfuegbarkeit mindern | Session 83 (DEV-Test A-067, Befund Martin: "0 muesste 8 sein") | Session 83 | Erledigt | 11.09.2026 | multiprojekt-detail v7.4.8-19: .eq('is_billable', true) in Uebersicht, Import, Kalender, Export. Ursache: Zeile "Nicht zuschussfaehige Arbeiten" (ohne AP, is_billable false) wird seit V7.9.7 automatisch vorbelegt und zaehlte als gefoerdert -> gespeicherte Monate mit 0 FZul-Stunden. Datenpruefung DEV+PROD: work_package_id IS NOT NULL <=> is_billable = true in allen Foerderformaten, keine Mischfaelle; PROD 6.070,8 h betroffen. Wirkung: zu WENIG FZul-Stunden, keine Ueberforderung. |
| A-069 | BSFZ-Export: Jahresarbeitszeit-Block der Vorlage vollstaendig und in die richtigen Zellen | Martin (Session 83, Export-Pruefung: Krankheit und Elternzeit fehlen) | Session 83 | Erledigt | 11.09.2026 | Route /api/export/fzul v2.5 + multiprojekt-detail v7.4.8-20. Befund beim Auslesen der Vorlage: v2.3 schrieb C38/F39/J39 (nicht gelesen), E38/O39 blieben Vorgabe 40 h / 30 Tage. Neu: E38, O39, O40 = K-, O41 = S-, O43 = E-Arbeitstage (tagesgenau Mo-Fr ohne Feiertag; Feiertage O42 rechnet die Vorlage). S -> Sonderurlaub tagesgenau statt Summen-Differenz; U ueber Anspruch nur Hinweis, keine Umbuchung (Resturlaub Vorjahr wuerde doppelt kuerzen; PROD 2 von 72 MA-Jahren). Verifiziert DEV (Bohlmann 2026: O40 4, O43 13, 1.648 h, 0,69) und PROD (Ditscherlein 2026: E38 38 statt 40, 1.679,6 h statt 1.768 h). |
| A-070 | BSFZ-Export: Tagesraster nur innerhalb der Vorhabenmonate (start_monat bis ende_monat) fuellen | Session 84 (Codeabgleich fuer VERHALTENSVERTRAG v1.3, FD-06) | Session 84 | Offen | 11.09.2026 | Route /api/export/fzul v2.5 schreibt fuer jeden Arbeitstag Januar bis Dezember "Tagesarbeitszeit minus gefoerdert"; multiprojekt-detail v7.4.8-20 uebergibt start_monat/ende_monat nicht, die Route prueft sie nicht. Folge bei einem unterjaehrigen Vorhaben: FuE-Stunden in Monaten ausserhalb der Laufzeit. Ob Zeile 45 der Vorlage das auffaengt, ist nicht geprueft. PROD-Abfrage 11.09.2026: kein Vorhaben mit start_monat > 1 oder ende_monat < 12 - derzeit ohne Wirkung. Im DEV-Test zu A-067 (Vorhaben 1-12) nicht sichtbar. |
| A-071 | FZul-Detailseite und BSFZ-Export: Ladefehler duerfen nicht still als 0 behandelt werden | Session 84 (Codeabgleich fuer VERHALTENSVERTRAG v1.3, FD-08) | Session 84 | Offen | 11.09.2026 | multiprojekt-detail v7.4.8-20: die v7_projects- und v7_timesheets-Abfragen in Uebersicht, Import, Kalender und Export werten error nicht aus -> gefoerdert 0 -> zu VIELE FZul-Stunden angeboten und exportiert (gleiches Muster wie der Beifang "-31" zu A-067). Die Excel-Erzeugung liest annual_leave_days ohne Fehlerpruefung und setzt ?? 0 -> O39 = 0; nur die Anzeige im Export-Tab wirft den Fehler. Ladefehler der Abwesenheiten sind bereits korrekt behandelt. Regel fuer neuen Code: IF-11. |
| A-072 | Monatsstatus Matrix/Mein Status: Abgeschlossen nur per Button, Erfasst hellgruen, laufender Monat nie automatisch, Netto-Werktage, zentrale Abwesenheiten | Martin (AS System/HEATS, Schulz 06/2026) | Session 85 | Erledigt (V7.9.12) | 17.09.2026 | Matrix v7.4.6-17..-20, mein-status v7.4.4-19. PROD verifiziert: Schulz Jun orange, Aug hellgruen, Sep alle orange; Mein Status Duehrkop AURA Sep orange |
| A-073 | "Monat abschliessen" speichert immer vorher | Martin (Global Maritime/AURA, Duehrkop 07/2026) | Session 85 | Erledigt (V7.9.12) | 17.09.2026 | TimesheetForm v7.4.6-98. Altfaelle: Abschluss aufheben + neu abschliessen. PROD-Abfrage 17.09.2026: Oezalp AURA 12/2025 und 01/2026 betroffen (Reparatur durch Martin); Androlite/WISE Herrler 04/2025-03/2026 leer abgeschlossen am 20.04.2026 (vor Auto-Vorbelegung) - Klaerung mit Kunde offen; Haller/Popov 12/2024 ausserhalb Beschaeftigung, ohne Wirkung |
| A-074 | Abrechnung taggenau: Schnitt aus ZA-Zeitraum und Bewilligungszeitraum, zentrale Helfer in der VN-Lib, ZAPanel importiert | Martin (ANOVIA 16KN124596, VN-Pruefung) | Session 86 | Erledigt (V7.9.13) | 20.09.2026 | verwendungsnachweis-utils v1.2-2, ZAPanel v7.4.4-70. PROD verifiziert: ZA 4 573,00 h T / 22,00 h NT, Kosten 20.252,09 EUR (vorher 20.809,83) |
| A-075 | Foerderbetrag centgenau, kaufmaennisch auf 2 Dezimalen | Martin | Session 86 | Zurueckgenommen (V7.9.14) | 21.09.2026 | ZAPanel v7.4.4-71, Lib v1.2-3 (round2 exportiert). PROD: ZA 4 14.176,46 EUR Ersetzt durch A-082. Centrundung der ZA-Anforderung widerspricht dem Originalformular. |
| A-076 | Sperre fuer Projektstunden ausserhalb des Bewilligungszeitraums, taggenau; nur AP-Zeilen | Martin | Session 86 | Erledigt (V7.9.13) | 20.09.2026 | TimesheetForm v7.4.6-100 (-99 verworfen). PROD verifiziert ANOVIA August 2026 |
| A-077 | VN Abschnitt B: Zuwendung aus A, Eigenanteil, Kontrollsumme, Abweichungswarnung mit Rundungstoleranz | Martin (ANOVIA) | Session 86 | Erledigt (V7.9.13) | 21.09.2026 | Lib v1.2-4/-5, Panel v1.2-3/-5. PROD: Summe A 61.814,77, Zuwendung 43.270,34, Eigenanteil 18.544,43, Summe 61.814,77 |
| A-078 | VN Abschnitt C: kumulierte Personenstunden je MA (T/NT) | Martin (DS-Schlussabrechnung) | Session 86 | Erledigt (V7.9.13) | 21.09.2026 | Lib v1.2-4, Panel v1.2-3/-4. PROD: 1.353,00 / 473,33 / 1.826,33 h |
| A-079 | Cockpit: Abrechnungszeitraum je ZA und Vollstaendigkeitspruefung | Martin | Session 86 | Erledigt (V7.9.13) | 21.09.2026 | FirmaCockpit v7.4.9-36-16. ANOVIA meldet Luecke 01.05.26-30.06.26 |
| A-080 | Latente Typfehler (55 in 29 Dateien) bereinigen. Zusaetzlich (Session 93): `downloads` (und Backup-Ordner) in tsconfig.json unter "exclude" aufnehmen, damit ein tsc-Lauf nicht an Archivdateien scheitert (Session 93: 13 Fehler, alle in downloads/archiv/) | Claude (tsc-Lauf 20.09.2026) | Session 86 | Offen | - | Eigene Session. Ablageordner downloads/ und backup-v7_3_86/ werden von tsconfig "include" mit erfasst |
| A-081 | ANOVIA: Luecke Mai/Juni 2026 zwischen ZA 3 (bis 30.04.) und ZA 4 (ab 01.07.) | Claude/Martin (ZA-Abfrage 20.09.2026) | Session 86 | Erledigt (Martin) | 21.09.2026 | Vermutung Martin: ZA nicht korrekt angelegt. Abgleich mit den Zahlungseingaengen Neue ZA 4 (01.05.-30.06.2026, 14.784 EUR) angelegt, bisherige ZA 4 ist jetzt ZA 5 (01.07.-31.08.2026, 14.593 EUR). Cockpit-Pruefung meldet keine Luecke mehr |
| A-082 | ZA-Anforderung kaufmaennisch auf ganze Euro (wie Originalformular), Kosten centgenau | Martin | Session 87 | Erledigt (V7.9.14) | 21.09.2026 | ZAPanel v7.4.4-72, Lib v1.2-6 (roundEuro). PROD: ANOVIA ZA 1-5 = 8.275 / 5.428 / 15.391 / 14.784 / 14.593 EUR, Summe 58.471 |
| A-083 | VN: Berichtszeitraum aus Projektdaten; ZA mit Ueberschneidung aufnehmen und kappen; Warnung bei Ueberstand | Martin (ANOVIA, ZA 5 fehlte im VN) | Session 87 | Erledigt (V7.9.14) | 21.09.2026 | Lib v1.2-7, Panel v1.2-6. PROD verifiziert: 5 ZA, Summe A 83.529,51, Zuwendung 58.470,66, erhalten 43.878,00, Schlusszahlung 14.592,66, Eigenanteil 25.058,85; C 1.739,00 / 730,33 / 2.469,33 h; keine Warnung |
| A-084 | Zahlungseingaenge als Liste (v7_za_zahlungen), Sammelueberweisung, Cockpit/VN aus der Liste | Martin (Freund/ANOVIA) | Session 88 | Erledigt (V7.9.15) | 21.09.2026 | ZAPanel -79/-80, FirmaCockpit 36-21, VN-Panel 1.2-7. SQL DEV+PROD. PROD Freund: ZA 1 8.275 (2), ZA 2 5.428, Differenzen 0 |
| A-085 | Zahlung aendert nie den angeforderten Betrag; foerderbetrag_gesamt nur fuellen, wenn leer | Befund DEV-Test | Session 88 | Erledigt (V7.9.15) | 21.09.2026 | ZAPanel -77. In PROD nie aufgetreten |
| A-086 | Absicherungen Archiv: Zahlungen nur bei eingereichten ZA, "Zahlung entfernen" grau, Loeschen eingereichter ZA nur mit ZA-Nummer | Martin (Fehlbedienung DEV) | Session 88 | Erledigt (V7.9.15) | 21.09.2026 | ZAPanel -76 |
| A-087 | Archiv als Uebersicht in der ZA-Auswahl oben rechts; Cockpit-Link "+ Neue ZA \| Archiv"; Anmerkungs-Popup | Martin | Session 88 | Erledigt (V7.9.15) | 21.09.2026 | ZAPanel -78..-80, ZASeite 1.0.11, FirmaCockpit 36-20/-21 |
| A-088 | AS/HEATS PROD: Zahlungseingaenge 35,24 / 24,21 / 25,69 / 24,18 EUR pruefen und korrigieren | Befund Session 88 | Session 88 | Offen (Martin mit AS) | 21.09.2026 | Vermutlich Eingabe "35.235" im alten Code |
| A-089 | VN "angefordert laut ZA" nur eingereichte ZA zaehlen | Befund Session 88 | Session 88 | Offen | 21.09.2026 | HEATS DEV: 4 ZA inkl. Entwurf ZA 4 |
| A-090 | Eingereichte ZA nicht durch "ZA speichern" ueberschreiben | Befund Session 88 | Session 88 | Teilweise (V7.9.16: Rueckfrage) | 22.09.2026 | Deckblatt rechnet live; Korrektur-Versionierung loest das Endgueltig mit Etappe 3. |
| A-091 | Knopf "ZA speichern und fortfahren" ohne Farbe (colors.primary) | Befund Session 88 | Session 88 | Offen | 21.09.2026 | Seit mindestens -72 |
| A-092 | FIX: ZAPanel ueberschreibt markierte ZA beim ersten Speichern | Martin (PROD GMM/AURA) | Session 89 | Erledigt (V7.9.16) | 22.09.2026 | ZAPanel -82/-83; AURA ZA 1 per SQL wiederhergestellt (55.329 EUR, 01.12.25-31.07.26) |
| A-093 | Betragseingabe: Punkte ignorieren, nur Komma als Dezimaltrenner; Anzeige als Waehrung | Martin | Session 89 | Erledigt (V7.9.16) | 22.09.2026 | ZAPanel -81/-85. Korrektur zu A-084 |
| A-094 | Rueckfragen vor Aenderung eingereichter ZA (Nummer/Zeitraum, Betrag) | Befund Session 89 | Session 89 | Erledigt (V7.9.16) | 22.09.2026 | ZAPanel -82/-84/-86 |
| A-095 | Direktspruenge aus der ZA: Monat der Anlage 1a -> Stundenerfassung und zurueck auf dieselbe ZA/Tab; Knopf "Stundennachweis-Matrix" (Berater) | Martin | Session 90 | Erledigt (V7.9.17) | 02.10.2026 | ZAPanel -87, ZASeite 1.0.12 |
| A-096 | ZA-Sprung der Matrix als Knopf "Zahlungsanforderung" in der Bedienleiste statt Link "ZA" in der Kopfzeile | Martin | Session 90 | Erledigt (V7.9.17) | 02.10.2026 | StundennachweisMatrix -21 |
| A-097 | Ruecksprung Matrix -> ZA auf dieselbe ZA und denselben Tab (nach Sprung ZA -> Matrix) | Befund Session 90 | Session 90 | Erledigt (V7.9.19) | 12.10.2026 | Matrix muesste zaId/tab durchreichen (Matrix + ZASeite) ZASeite 1.0.13, Matrix-Seite 7.4.9-8. |
| A-098 | Direktspruenge aus der ZA auch im Firma-Portal (Session 92: jetzt auch VN; Rollenfrage und VN-Freischaltung zuerst klaeren) | Befund Session 90 | Session 90 | Offen (zurueckgestellt) | 02.10.2026 | Vorher pruefen, welche Rollen fremde Stundenerfassungen oeffnen duerfen |
| A-099 | PDF-Dateiname der Stundennachweise mit Vorname hinter dem Nachnamen (Unterscheidung bei gleichem Nachnamen); Einzeldruck und Sammeldruck mit einem MA | Martin | Session 91 | Erledigt (V7.9.18) | 03.10.2026 | TimesheetForm -101, StundennachweisMatrix -22 |
| A-100 | PDF-Dateiname: mehrteilige Nachnamen ("von Berg" -> nur "von") | Befund Session 91 | Session 91 | Offen (niedrig) | 03.10.2026 | Beide Kopien des Schemas anpassen (IF-17) |
| A-101 | Verwendungsnachweis: bewilligte Zuwendung im Kopf und Ausschoepfung (Anspruch lt. VN, angefordert lt. ZA, verbleibend) | Martin | Session 92 | Erledigt (V7.9.19) | 12.10.2026 | VerwendungsnachweisPanel 1.2-8 |
| A-102 | Querspruenge ZA <-> VN <-> Stundennachweis-Matrix / Stundenerfassung mit Ruecksprung (Berater-Portal) | Martin | Session 92 | Erledigt (V7.9.19) | 12.10.2026 | VNPanel 1.2-9, VNSeite 1.2-3, ZAPanel -88, ZASeite 1.0.13, TimesheetForm -102, Matrix -23, Matrix-Seite 7.4.9-8 |
| A-103 | Nach "ZA speichern" in der gespeicherten ZA bleiben; neue ZA nur bewusst ueber "+ Neue ZA" | Martin | Session 92 | Erledigt (V7.9.19) | 12.10.2026 | ZAPanel -89 |
| A-104 | Stundennachweis: keine Reststunden in "sonstige Arbeiten"; Auto-Vorbelegung nur auf leeren Arbeitstagen, volle Tagesarbeitszeit oder leer | Martin | Session 93 | Erledigt (V7.9.20) | 20.10.2026 | TimesheetForm -103 |
| A-105 | Verwendungsnachweis: Stundensatz identisch zur ZA (unskaliert), Fehlalarm bei Teilzeit-MA | Martin (Fall AURA/OpenZ) | Session 93 | Erledigt (V7.9.20) | 20.10.2026 | verwendungsnachweis-utils 1.2-8 |
| A-106 | Stundennachweis nach den aktuellen ZIM-Vorlagen (Formularcenter: FuE-Einzel/Koop, DS mit techn./nichttechn. je AP, Netzwerkmanagement; ohne Zeilen U/K/S, ohne "sonstige Arbeiten", ohne Tagesgesamtsumme). Eigenes Release. Vorab: (1) Stand der Vorlagen klaeren (beide ZIM-Vorlagen tragen den Vermerk "Stand: 09-2020"), (2) alle bis zur Umstellung erstellten Stundennachweise im alten Format sichern, (3) Stichtag und Umgang mit laufenden Projekten festlegen, (4) Wirkung auf Matrix-Status, Abwesenheiten und Auswertungen pruefen | Martin | Session 93 | Offen (zurueckgestellt, Konzept vor Umsetzung) | - | Vorlagen vom 20.10.2026 |
| A-107 | Cross-Projekt-Hinweis im Stundennachweis um die noch freien Stunden ergaenzen ("an Tag x bereits y h in Projekt P, frei noch z h") | Martin | Session 93 | Offen (niedrig) | - | - |
| A-108 | "sonstige Arbeiten" an Tagen mit Projektstunden sichtbar sperren statt Eingabe stillschweigend zu leeren | Claude | Session 93 | Offen (niedrig) | - | - |
| A-109 | Altwerte "sonstige Arbeiten" an Projekttagen in der DB (abgeschlossene bzw. nicht wieder gespeicherte Monate): SQL-Bereinigung ja/nein - Entscheidung Martin, haengt an A-106 (Altformat sichern) | Martin | Session 93 | Offen (Entscheidung) | - | - |

**Hinweis zu "Angefragt am Session <=42":** Diese Punkte wurden aus aelteren Sessions
mitgeschleppt; das exakte Anfragedatum ist nicht mehr rekonstruierbar. Ab Session 47
wird das Anfragedatum bei Neuaufnahme stets eingetragen.

**Frueher erledigt (historisch):**
- Arbeitszeitgrenzen Phase 3 Live-Validierung -> v7.4.6-14 (Session 36).

**Hinweis (Session 83, ohne Nummer, Beifang A-067, erledigt):** (c) Hinweis ohne neue Nummer (Beifang A-067, erledigt): Enddatum im Uebersichts-Laden der FZul-Detailseite (fest "-31") - bei Vorhaben mit Ende Feb/Apr/Jun/Sep/Nov wurde gefoerdert = 0 geliefert und MA landeten faelschlich in Gruppe B. Nicht separat getestet.

**Hinweis (Konsolidierung v5.54):** A-038 bis A-050 sind in dieser Tabelle nicht enthalten. Sie fehlten bereits in der Gesamtfassung v5.36; ihr Inhalt steht nur in den Status-Zeilen und in Paragraph 13 (Sessions 59 bis 65). Nachtrag der Zeilen offen.

### 12.2 RLS-Status PROD: KOMPLETT (Session 21)
Alle v7-Tabellen haben RLS aktiv. v7_system_config ebenfalls mit RLS (Session 34).

---

## 12b. KRITISCHE Architekturregeln

1. Niemals Code duplizieren (immer Shared Components)
2. Header-Farbe zeigt "Wer bin ICH"
3. v7_user_profiles RLS: nur `id = auth.uid()` (kein Helper-Aufruf -> Zirkel)
4. funding_format enum: bei LIKE immer `::TEXT` Cast
5. Stundensaetze aus v7_project_assignments (projektspezifisch)
6. Push auf v7-dev = nur Preview; main-Merge = PROD-Deploy
7. IMMER pnpm dev + durchklicken vor Push
8. VOR Code-Ausgabe: aktuellste Version im Projektverzeichnis pruefen
9. **EXTERN-ENTWICKLER-PRINZIP (Prioritaet hoch):** Jede Komponente, jede Architekturentscheidung
   und jede bekannte Einschraenkung muss so dokumentiert sein, dass ein externer menschlicher
   Entwickler ohne Rueckfragen einsteigen, verstehen und weiterentwickeln kann.
   Dies gilt als permanente Querschnittsanforderung an alle Code-Aenderungen und PH-Updates.
10. **CHIRURGISCHES AENDERN:** Funktionierender Code wird nie restrukturiert oder "verbessert".
    Korrekturen betreffen immer nur die betroffenen Zeilen. Gilt besonders fuer CSS, Druckstile,
    Layout-Logik.
11. **SUPABASE MAX ROWS:** Bei jedem neuen Supabase-Projekt sofort unter Settings > API >
    Max Rows auf 10000 setzen. Default (1000) reicht bei Projekten mit >50 MA-Monaten nicht.
    Zusaetzlich .limit(10000) in allen grossen Queries als Code-seitige Absicherung.
12. **CODE-BASIS-PRUEFUNG:** Vor jeder Aenderung die aktuellste Version aus dem
    Projektverzeichnis pruefen (ls /mnt/project/ oder git show). NICHT aus Kontext-Speicher
    oder aelteren Sessions arbeiten. Im Zweifel nachfragen.
13. **SMOKE-TEST nach Deploy:** Die verbindliche Smoke-Test-Checkliste je Komponente
    ist im Verhaltensvertrag (Paragraph 12e) geregelt. Eine Quelle der Wahrheit --
    keine parallele Liste an dieser Stelle.
14. **EINE OFFEN-LISTE (Single Source of Truth):** Offene Punkte werden ausschliesslich
    in der Anforderungsliste (Paragraph 12.1) gefuehrt. TODO-Listen beim Session-Start und
    Memory-Notizen sind nur abgeleitete Sichten. Bei Widerspruch gilt Paragraph 12.1.
    Keine parallelen Offen-Listen an anderer Stelle.
15. **ERLEDIGT-REGEL (Definition of Done):** Eine Anforderung gilt erst als fertig, wenn
    ihr Eintrag in Paragraph 12.1 im SELBEN PH-Inkrement geschlossen wird (Status + Erledigt-
    Datum + Referenz), in dem das Feature deployt wird. Kein Deploy ohne Listen-Schliessung.
    Damit kann ein erledigter Punkt nicht als "offen" ueberleben.
16. **SESSION-START-ABGLEICH:** Erste Handlung jeder Session: die mitgeschleppte TODO gegen
    den realen Code (aktuelle Datei-Version, nicht Kontext-Speicher) und gegen Paragraph 12.1
    abgleichen. Bereits erledigte Punkte sofort schliessen, Diskrepanzen dem Nutzer vorlegen.
    Im Zweifel die jeweils aktuelle Datei vom Nutzer anfordern, nicht raten (vgl. Regel 12).

## 12c. KRITISCHE Arbeitsregel: main-Merge nach jedem Deploy

```bash
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git push cubintec main && git checkout v7-dev
```

---

## 13. Aenderungshistorie Pflichtenheft

| Version | Datum | Aenderungen |
|---------|-------|-------------|
| v5.54 | 21.10.2026 | Session 93, V7.9.20: "sonstige Arbeiten" nur auf leeren Arbeitstagen und nur als volle Tagesarbeitszeit, keine Reststunden (A-104); VN-Stundensatz identisch zur ZA, Fehlalarm AURA/OpenZ behoben (A-105). TimesheetForm 7.4.6-103, verwendungsnachweis-utils 1.2-8. Neu offen: A-106 Stundennachweis nach neuen ZIM-Vorlagen (eigenes Release), A-107, A-108, A-109; A-080 erweitert. Verhaltensvertrag v1.12. Kein SQL-Schema. **Zugleich Gesamtfassung:** v5.36 + Aenderungsbloecke v5.37 bis v5.54 konsolidiert (21.10.2026); Paragraph 12e = VERHALTENSVERTRAG v1.12 vollstaendig; Nummernverschiebungen 6.5-6.10, neue Abschnitte 4.7, 4.8, 6a.4b, 6a.4c, 8.1; Hinweise zu 6a.8, 7d und 12.1 (A-038 bis A-050 fehlen). Ab hier keine Aenderungsbloecke mehr. |
| v5.53 | 12.10.2026 | Session 92, V7.9.19: VN-Kopf mit bewilligter Zuwendung und Ausschoepfung (A-101); Querspruenge ZA/VN/Matrix/Stundenerfassung mit Ruecksprung, Berater-Portal (A-102, erledigt auch A-097); ZA bleibt nach dem Speichern offen (A-103). VerwendungsnachweisPanel 1.2-9, VerwendungsnachweisSeite 1.2-3, ZAPanel 7.4.4-89, ZASeite 1.0.13, TimesheetForm 7.4.6-102, StundennachweisMatrix 7.4.6-23, cockpit-stundennachweis-page 7.4.9-8. Verhaltensvertrag v1.11. Kein SQL-Schema. |
| v5.52 | 03.10.2026 | Session 91, V7.9.18: PDF-Dateiname der Stundennachweise mit Vorname hinter dem Nachnamen, "<Nachname><Vorname>_<FKZ>_Stundennachweis_<YYMM>" (A-099). TimesheetForm v7.4.6-101, StundennachweisMatrix v7.4.6-22. Offen A-100. Verhaltensvertrag v1.10. Kein SQL-Schema. |
| v5.51 | 02.10.2026 | Session 90, V7.9.17: Direktspruenge ZA - Stundenerfassung - Matrix im Berater-Portal (A-095), Knopf "Zahlungsanforderung" in der Bedienleiste der Matrix (A-096). Neuer Unterabschnitt 6.6. Offen A-097, A-098. Verhaltensvertrag v1.9. Kein SQL-Schema. |
| v5.50 | 22.09.2026 | Session 89, V7.9.16: kritischer Fix ZAPanel - markierte ZA wurde beim ersten Speichern ueberschrieben (A-092), AURA ZA 1 wiederhergestellt. Betragseingabe nur Komma (A-093, Korrektur zu v5.49). Rueckfragen vor Aenderung eingereichter ZA (A-094, A-090 teilweise). Verhaltensvertrag v1.8. Kein SQL-Schema. |
| v5.49 | 21.09.2026 | Session 88, V7.9.15: Zahlungseingaenge als Liste (neue Tabelle v7_za_zahlungen, SQL DEV+PROD), Sammelueberweisung, Cockpit und VN aus der Liste (A-084). Zahlung aendert nie den angeforderten Betrag (A-085). Absicherungen im Archiv (A-086). Archiv in der ZA-Auswahl, Cockpit-Link, Anmerkungs-Popup (A-087). Freund/ANOVIA in PROD aufgeteilt. Offen A-088..A-091. Verhaltensvertrag v1.7. Konzept ZA-Korrektur v1.2. |
| v5.48 | 21.09.2026 | Session 87, V7.9.14: Korrekturen zu v5.47. ANOVIA-Projektende 31.08.2026 (nicht 30.08.), Stunden vom 31.08. wiederhergestellt. ZA-Anforderung wieder ganze Euro (A-082, A-075 zurueckgenommen). VN: Berichtszeitraum aus Projektdaten, keine stille ZA-Exklusion mehr (A-083). A-081 erledigt (ZA-Luecke Mai/Juni durch neue ZA geschlossen). Verhaltensvertrag v1.6. Kein SQL-Schema. |
| v5.47 | 21.09.2026 | Session 86, V7.9.13: Abrechnung taggenau und auf den Bewilligungszeitraum gekappt (A-074); Foerderbetrag centgenau (A-075); Sperre fuer Projektstunden ausserhalb des Bewilligungszeitraums, nur AP-Zeilen (A-076); VN Abschnitt B mit Zuwendung aus A, Eigenanteil und Kontrollsumme (A-077), neuer Abschnitt C Personenstunden (A-078); Cockpit mit ZA-Zeitraum und Vollstaendigkeitspruefung (A-079). Offen: A-080 Typfehler, A-081 ANOVIA-Luecke Mai/Juni. Verhaltensvertrag v1.5. Deploy- und Umgebungsdokument aktualisiert. Kein SQL-Schema. |
| v5.46 | 17.09.2026 | Session 85, V7.9.12: Monatsstatus Matrix und Mein Status neu (A-072: Abgeschlossen nur per Button, hellgruen Erfasst, laufender Monat nie automatisch, nur Netto-Werktage, zentrale Abwesenheiten, Feiertage nicht doppelt); Monatsabschluss speichert immer (A-073). Verhaltensvertrag v1.4 (MS-01..05, TF-08, BP-03). Kein SQL. PROD-Pruefung leer abgeschlossener Monate: Oezalp AURA repariert; Androlite/Herrler Klaerung offen. |
| v5.45 | 11.09.2026 | Session 84, DOKUMENTATION (kein Code, kein SQL, Softwarestand bleibt V7.9.11): Verhaltensvertrag (PH 12e) auf v1.3 fortgeschrieben. Neue Komponenten-Vertraege Kapazitaetsplanung (KP-01..04) und FZul-Detailseite/BSFZ-Export (FD-01..08 mit fragilen Bereichen und bekannten Luecken); PF-09 gemeinsamer Bezugsrahmen der Foerderkennzahlen; IF-09 Monatsverlauf in zwei Implementierungen, IF-10 is_billable = true bei "gefoerdert", IF-11 Fehlerauswertung und Datumsgrenzen; fragile Bereiche TimesheetForm (Wirkung der Auto-Vorbelegung nach aussen) und FirmaCockpit (eigene Diagramm-Kopie). Jede neue Regel gegen den deployten Code geprueft; neu offen: A-070 (BSFZ-Export fuellt das Tagesraster ausserhalb der Vorhabenmonate, PROD derzeit ohne Wirkung) und A-071 (Ladefehler v7_projects/v7_timesheets und Urlaubsanspruch in der Excel-Erzeugung still als 0). Arbeitskopie VERHALTENSVERTRAG-v1_3-2.md (erster Stand v1_3 auf falscher Basis verworfen). |
| v5.44 | 11.09.2026 | Session 83 (V7.9.11, kein SQL): FZul-Detailseite und BSFZ-Export. A-067 erledigt (zentrale Abwesenheiten U/K/S/E mitarbeiterbezogen an Arbeitstagen in Uebersicht, Import, Kalender, Export; Altdaten-Konflikt rot und korrigierbar), A-068 neu+erledigt (nur is_billable = true zaehlt als gefoerdert; Auto-Vorbelegung "nicht zuschussfaehige Arbeiten" machte gespeicherte Monate FZul-frei), A-069 neu+erledigt (Route v2.5: E38/O39 statt nicht gelesener C38/F39/J39, neu O40 K, O41 S, O43 E; Export-Tab mit Arbeitstagen je Code und Hinweis U > Anspruch). Beifang Enddatum "-31". multiprojekt-detail v7.4.8-20, api/export/fzul v2.5 (Basis deployte v2.3, Archiv-v2.4 nie deployt). Verifiziert DEV (AS System) und PROD (KAIRA). Deploy: Merge v7-dev->main (--no-ff) b4f8e42, push origin+cubintec, Vercel, Tag v7.9.11. Details GIT-SICHERUNG-v7_9_11-session83.md. |
| v5.43 | 11.09.2026 | Session 82 (V7.9.10, reine Frontend-Aenderung, kein SQL): Kapazitaetsplanung beruecksichtigt Elternzeit (Code E). E-Tage aus v7_employee_absences, nur Arbeitstage gezaehlt (Mo-Fr, kein Feiertag), Monatskapazitaet (Arbeitstage - E-Arbeitstage) x (WAZ/5); Ampel-Basis volle Monatskapazitaet ohne Elternzeit; Voll-E-Monat als Zelle "E" (rot bei verplanten Arbeitsplan-PM); Tooltip und Legende ergaenzt; fuer MA ohne E unveraendert. berater-multiprojekt-page v7.4.8-29 (-26/-27 im Pflichtenheft nachgezogen). A-065 erledigt. Neu offen: A-066 (E ausserhalb Projektlaufzeit per UI nicht entfernbar), A-067 (FZul-Detailseite ignoriert zentrale Abwesenheiten). Verifiziert DEV (AS System, Testdaten anschliessend entfernt) und PROD (Flensburger Yacht-Service, April 2026). Deploy: Merge v7-dev->main (--no-ff), push origin+cubintec, Vercel, Tag v7.9.10. Details GIT-SICHERUNG-v7_9_10-session82.md. |
| v5.42 | 10.09.2026 | Session 81 (V7.9.8 + V7.9.9, reine Frontend-Aenderungen, kein SQL): (1) Einheitliches Dateinamen-Schema fuer Stundennachweis-PDFs "<Nachname>_<FKZ>_Stundennachweis_<YYMM>"; Sammeldruck mehrerer Mitarbeiter ohne Namensteil, mehrmonatige Auswahl mit Zeitraum YYMM-YYMM. TimesheetForm v7.4.6-97, StundennachweisMatrix v7.4.6-16. A-062. (2) "Verschenkt" wurde gegen die bewilligte Summe gemessen, obwohl die Prognose auf die Plankosten gedeckelt ist; bei einem Arbeitsplan unter der Bewilligung blieb dadurch auch bei 100 Prozent Erreichungsgrad ein Verschenkt-Betrag stehen. Massstab ist jetzt das bei voller Planerfuellung Abrufbare; die Bewilligungsdifferenz erscheint als neuer Block "Planungsluecke im Arbeitsplan". projektfortschritt-utils v7.4.9-16, ProjektFortschrittPanel v7.4.5-34. A-063. (3) Monatsverlauf entschlackt: "Soll kumuliert" und "Zieltempo kumuliert" entfernt, Fussnote erklaert Ist nach Buchungsmonat gegen Soll ueber AP-Laufzeit; identische Aenderung in der eigenen Diagramm-Kopie des Firma-Cockpits (FirmaCockpit v7.4.9-36-15). A-064. Prognose-Algorithmus unveraendert. Deploy: Merge v7-dev->main (--no-ff), push origin+cubintec, Vercel. Details GIT-SICHERUNG-v7_9_9-session81.md. |
| v5.41 | 09.09.2026 | Session 81, DOKUMENTATIONS-NACHTRAG (kein Code, kein SQL, Softwarestand bleibt V7.9.7): Nachtrag der in Session 78 (10.08.2026) produktiv gegangenen Timesheet-Aenderung, die wegen einer Nummernkollision nie ins konsolidierte Pflichtenheft gelangt war. Zwei verschiedene Bloecke trugen die Nummer v5.39 und vergaben beide A-055 (Session 78: Timesheet-AP-Obergrenze; Session 80: NWM-Jahresselektor und FZ-Foerderquote); uebernommen wurde nur der Session-80-Block. Inhalt des Nachtrags: Fuer die automatisch angezeigten "Zugeordnete AP" gilt wieder eine Obergrenze, jetzt start-basiert - ein zugeordnetes AP wird nur noch automatisch angezeigt/vorbelegt, wenn sein geplanter Startmonat hoechstens 3 Kalendermonate zurueckliegt (monthsSinceStart <= 3); Grundlage: AP laut Foerderrichtlinie max. 3 PM. Behebt, dass abgeschlossene APs vom Projektanfang mit blossem Rundungsrest (0,01 h offen) noch >1 Jahr spaeter im Stundennachweis erschienen. Ersetzt die in V7.9.5/A-052 ersatzlos entfallene end_date+2-Grenze; Reststunden-Pruefung (planned-booked>0) bleibt als UND. "Weitere AP" unveraendert ohne Zeitfilter; Untergrenze hasAPStarted unveraendert. TimesheetForm v7.4.6-84, Regel bis -96 unveraendert enthalten. A-061 (ersetzt die kollidierende Nummer A-055 aus Session 78). Kein Deploy. |
| v5.40 | 09.09.2026 | Session 81 (V7.9.7, vier Themenbloecke, ein SQL-Schritt): (1) Bundesland-Fix - FirmendatenCard v7.4.6-2 mit ISO-Codes, Vorbelegung ueber normalizeStateCode. A-057. (2) WAZ-Quelle vereinheitlicht - Rangfolge Teilzeit-Historie -> Stammsatz -> Firmenstandard; pWAZ bleibt Antragswert, keine Synchronisation; TimesheetForm v7.4.6-88, ProjectTeamManager v7.4.4-20; Zwischenstand -87 zurueckgenommen. A-058, PH 7e. (3) Elternzeit als Abwesenheitscode E - SQL-Constraint in DEV und PROD; TimesheetForm v7.4.6-89 bis -93; stundennachweisSheetData v1.0.2, StundennachweisSheet v1.0.4. Vom Projekttraeger VDI bestaetigt. A-059, neuer PH 7f. (4) "Sonstige Arbeiten" immer als Differenz, nie eingefroren, einheitliches Zahlenformat - TimesheetForm v7.4.6-94/-95/-96. A-060. Verhaltensvertrag (PH 12e) auf v1.2: TF-04/05/07/09/12 angepasst, TF-15 neu, ProjectTeamManager PT-01..06 neu, ZA-12 und PF-08 nachgetragen, IF-08 Release-Tag. Deploy: main = 17d2bfe, Tag v7.9.7. Details GIT-SICHERUNG-v7_9_7-session81.md. |
| v5.39 | 27.08.2026 | Session 80 (V7.9.6, NWM-Aenderungen, kein SQL): (1) NWM-Jahresselektor fuer Fortschritt/Prognose - Dropdown "Netzwerkjahr" mit allen FZ aus v7_nwm_foerderzeitraeume + "Gesamtverlauf"; Fortschritt/Prognose auf gewaehlten Zeitraum eingeschraenkt; FirmaCockpit NWM-Erkennung + Auto-Vorauswahl aktuelles NWJ. ProjektFortschrittPanel v7.4.5-33, cockpit-fortschritt-page v7.4.9-9, FirmaCockpit v7.4.9-36-14. A-055. (2) FZ-basierte Foerderquote in ZAPanel + NWMEigenanteilPanel: Abgleich zeitraum_bis gegen v7_nwm_foerderzeitraeume statt Datumsarithmetik; neue FZ-Grenzueberschreitungs-Validierung - Speichern/Berechnen blockiert wenn von/bis in verschiedenen FZ mit unterschiedlichen FQ; rote Fehlermeldung; Fallback auf alte Logik ohne FZ-Daten. ZAPanel v7.4.4-68/-69 (Endstand -69), NWMEigenanteilPanel v7.4.5-13. A-056. Deploy: Merge v7-dev->main (--no-ff), push origin+cubintec, Vercel. Details GIT-SICHERUNG-v7_9_6-session80.md. |
| v5.38 | 10.08.2026 | Session 77 (V7.9.5, reine Frontend-Korrekturen, kein SQL): (1) Timesheet-AP-Angebot zeitlich getrennt - "Zugeordnete AP" (automatisch angezeigt) erst ab wp.start_date-Monat, "Weitere AP" jederzeit vollstaendig ohne Zeitfilter (vorgezogene/uebernommene APs); Obergrenze end_date+2M bei zugeordneten APs entfernt (waehlbar solange offene Stunden). TimesheetForm v7.4.6-82/-83 (Startmonats-Filter hasAPStarted; -82 legte ihn faelschlich auch auf "Weitere AP", -83 korrigiert). A-052. (2) AP-Status "gesamt"-Spalten = Summe der auf 2 Stellen gerundeten MA-Werte statt total_person_months x hoursPerPM; behebt 0,01h-Reste aus periodischem PM-Faktor. ApStatusModal v1.0-11. A-053. (3) Zielerreichungs-Prognose auf Planerfuellung statt flachem 3-Monats-Tempo: Prognose = Ist(abgeschl.) + Rest-Soll x Erfuellungsgrad (Ist/Soll bis heute); AP-genaue sollMonatMap zentral; Prognoselinie folgt geplantem Soll x Erfuellungsgrad; neues Feld erfuellungsgrad; Cockpit-Basis-Text "Plan-Erfuellung XX%". projektfortschritt-utils v7.4.9-6, FirmaCockpit v7.4.9-36-11, ProjektFortschrittPanel v7.4.5-26. Ampel-Schwellen unveraendert. A-054. Deploy: Merge v7-dev->main (--no-ff), push origin+cubintec, Vercel. Details GIT-SICHERUNG-v7_9_5-session77.md. |
| v5.37 | 08.08.2026 | Session 76: Timesheet-Restanzeige umschaltbar (V7.9.4). Die rechte "+/-"-Spalte zeigt je zugeordnetem AP wahlweise die projektweit offene Zahl ("gesamt", bisheriges Verhalten) oder die am Ende des angezeigten Monats noch offene Zahl ("monatsende", kumuliert bis inkl. Monat, spaetere Monate nicht abgezogen; Wunsch Katrin fuer nachtraegliche Korrekturen/Verlaufslesen). Umschalter = dezenter Kreispfeil in der Rest-Kopfzelle (ersetzt Text "+/-"): grau=Monatsende (Default), gruener Chip=gesamt (bewusst gruen statt Bernstein wegen Naehe zum Feiertags-Orange), print:hidden. Nur die gruen/rot angezeigte Restzahl ZUGEORDNETER APs betroffen; "Alle AP"-Modal + blaue projektweite Restzahl unveraendert. TimesheetForm v7.4.6-79 (Feature-Kern + reloadBookedHours liest work_date -> monthlyBookedPerWP), -80 (Umschalter in die Rest-Kopfzelle, Zwischenstand Schiebeschalter), -81 (Default monatsende + Kreispfeil-Endstand). Persistenz pro Nutzer: NEU Tabelle v7_user_preferences (settings jsonb, RLS eigene Zeile, key timesheet_rest_modus), SQL-MIGRATION-user-preferences-v1.sql DEV+PROD; Paragraph 2.1 + neuer Paragraph 2.11. A-051 erledigt. Deploy: Merge v7-dev->main (--no-ff), push origin+cubintec, Vercel. Details GIT-SICHERUNG-v7_9_4-session76.md. |
| v5.33 | 07.08.2026 | Session 75 (Forts.): AP-Status-Analyse + Feature-Freigaben (V7.9.0). TimesheetForm v7.4.6-74: Wochen-Deckel fuer Auto-"sonstige" (Teilzeit-MA bekam am freien 5. Werktag faelschlich "sonstige" trotz erreichter WAZ; jetzt Wochenkonto gegen WAZ, Auto=min(Tagesspielraum, Wochen-Restbudget); Vollzeit unveraendert). TimesheetForm v7.4.6-75: Monats-Aufschluesselung im 'Alle AP'-Modal (mehrmonatige APs per Chevron aufklappbar, gebucht je MA je Monat, folgt tatsaechlichen Buchungsmonaten). AP-Status-Analyse Stufe 1-3: (1) StundennachweisMatrix v7.4.6-12 - gebuchte Monats-Stundenzahl je MA als kleine Zahl in der Ampelzelle, nur foerderbare Stunden (is_billable=true; wichtig bei GF-50%), fuer alle sichtbar; (2) DB v7_client_companies.ap_analyse_firma_freigeschaltet (boolean Default false, DEV+PROD) + Admin-Schalter (SystemConfigPanel); (3) eigenstaendige ApStatusModal v1.0-1 (selbstladend per projectId) + Button 'AP-Status' in der Matrix (StundennachweisMatrix v7.4.6-13), Gating Monats-Aufklappen nur Berater/freigeschaltete Firma (TimesheetForm v7.4.6-76), Flag-Durchreichung ueber BerichtePage v7.4.6-24 (Firmen-Dashboard-Matrix) und zeiterfassung-page v7.4.6-5 (Firmen-Timesheet). SystemConfigPanel v7.4.4-5: Firmen-Freigaben als Matrix (Firmen x Features VN/AP-Status, Toggle je Zelle), erweiterbar (featureDefs); Cockpit/Anleitungen separat. Deploy: SQL zuerst DEV+PROD, dann Frontend-Merges v7-dev->main (--no-ff), push origin + cubintec, Vercel. ARCHITEKTUR-ENTSCHEIDUNG (verbindlich): gemeinsam genutzte Elemente an EINE Shared-Komponente mit klaren Schnittstellen (keine Doppelentwicklung); naechster Schritt: TimesheetForm nutzt kuenftig ApStatusModal statt Inline-Modal, Sprung per Callback (onJumpToTimesheet). Direktsprung (ApStatusModal v1.0-2 / StundennachweisMatrix v7.4.6-14) bewusst NOCH NICHT deployt, geht in den Refactor auf. Details GIT-SICHERUNG-v7_9_0-session75.md. |
| v5.32 | 06.08.2026 | Session 75: ZA-Uebersetzungsschutz + AP-Status MA-Uebersicht (V7.8.2). ZAPanel v7.4.4-64: die drei amtlichen ZA-Container (Deckblatt, Anlage 1a, Anlage 1b, je #za-print-area) per translate="no" + notranslate von der Browser-Uebersetzung ausgenommen; behebt die nutzerabhaengig verdrehte Monatsdarstellung in Anlage 1a ('25 Dez' statt 'Dez. 25'), die aus einer Browser-Uebersetzungsschicht (Chrome/Immersive Translate) kam, nicht aus dem Code (Labels bereits fest toLocaleString('de-DE')); fuer korrekt sehende Nutzer byte-identisch, Druck unberuehrt. TimesheetForm v7.4.6-66..-73: 'Alle AP'-Modal (AP-Status) um MA-Aufschluesselung erweitert (Berater-Korrektur unsauberer Firmenbuchungen). Je Gruppe (geplant/gebucht/offen) zuerst 'gesamt', dann Spalte je Projekt-Team-MA (Kopf 'V.Nachname'); alle Werte in STUNDEN. geplant je MA aus v7_work_package_assignments.planned_person_months x hoursPerPM (neuer teamweiter Load), 'gesamt' = AP-Soll (total_person_months); gebucht je MA aus v7_timesheets (projektweite Abfrage um employee_id erweitert); offen je MA = geplant-gebucht. Layout: Gruppenrahmen, Zahlenspalten zentriert, Tabelle inhaltsbasiert (w-auto/text-xs), Modalbreite folgt der Tabelle (w-fit, max-w-[96vw], auto je MA-Anzahl), offen gruen / ueberbucht rot. Reine Anzeige-Erweiterung, KEINE DB-/Logikaenderung; Firma- + Berater-Portal. Deploy: zwei Frontend-Merges v7-dev->main (--no-ff), push origin + cubintec, Vercel; kein SQL. Lehre: main IMMER auf origin UND cubintec pushen (Vercel-Prod zieht aus cubintec) -> DEPLOY-PROZESS-PZE.md (neu). Details GIT-SICHERUNG-v7_8_2-session75.md. |
| v5.31 | 05.08.2026 | Session 74: Projektanlage/Foerderformate + Team-Vorbelegung (V7.8.1). ProjectTeamManager v7.4.4-19: Anlage-6.1-Vorgabewerte des MA (Monatsbrutto, Fixbestandteile, pWAZ, bWAZ, Stundensatz) werden beim Team-Hinzufuegen ins Formular vorbelegt (editierbar; Speicherung weiterhin projektbezogen auf v7_project_assignments); Employee-Interface-Altfeld annual_salary -> monthly_salary + annual_bonus. ProjectCreateForm v7.4.2-11: Reiter 'PDF-Import (Antrag)' zuerst + Standard (Empfohlen-Badge), 'Manuell' dahinter; Foerderformat-Liste ZIM-Familie + KMU-innovativ (Code BMBF_KMU) + Sonstige (Freitext funding_format_other), BMBF/BMBF_DS/Verbund entfernt; PDF-Reiter mit Programm-Auswahl + dreistufiger Import-Weiche (ZIM Upload / KMU-innovativ 'in Vorbereitung' / Sonstige 'kein Import'), Parse-Fehler mit 'Manuell anlegen'. App-weite Labels BMBF_KMU -> 'KMU-innovativ' (ministeriums-neutral, BMBF ist jetzt BMFTR): v7-types v7.4.9-4, projektfortschritt-utils v7.4.9-5, mein-status v7.4.4-18; ProjectDetailPage v7.4.4-64 (gleiche Liste + Sonstige-Freitext + Klartext-Anzeige via fundingLabel). DB DEV+PROD: v7_funding_format += 'BMBF_KMU','OTHER'; v7_projects.funding_format_other text. Deploy: SQL zuerst, zwei Merges v7-dev->main, push origin+cubintec, Vercel. Details GIT-SICHERUNG-v7_8_1-session74.md. |
| v5.30 | 31.07.2026 | Session 73: VN-Modul (Verwendungsnachweis) UMGESETZT und in PRODUKTION (V7.8.0). Reine Zahlenseite (Sachbericht/Teil 2 direkt im PDF, kein Zwischenmodus). Varianten: DS De-minimis, Einzel-/Kooperationsprojekt, NWM Phase 1/2; AGVO aussen vor. NWM aggregiert die je ZA gespeicherten NWM-Werte (Foerdersatz je Laufzeitjahr im gespeicherten Foerderbetrag), mit Eigenanteil + effektivem Misch-Foerdersatz. Zuschlag-Prozente (DS/EP) dynamisch aus overhead_t/overhead_nt. NEU Freigabe je Firma: v7_client_companies.vn_firma_freigeschaltet (Default false); Firmen-Portal nur bei Freigabe, Berater immer; Schalter in Administration (SystemConfigPanel v7.4.4-3, nur system_admin). Paragraph 6a auf Umsetzung aktualisiert (zahlen_snapshot statt sachbericht_*). DB: SQL-MIGRATION-verwendungsnachweis-snapshot-v1.sql (Tabelle v7_verwendungsnachweise, 4 RLS-Policies, beihilfe_basis abgesichert) + SQL-MIGRATION-vn-firma-freigabe-v1.sql (Freigabe-Spalte), beide DEV+PROD. Dateien: verwendungsnachweis-utils v1.2-1, VerwendungsnachweisPanel v1.2-2, VerwendungsnachweisSeite v1.2-2, FirmaCockpit v7.4.9-36-10, ProjectDetailPage v7.4.4-63, ZAPanel v7.4.4-63 (Deckblatt-Breite), SystemConfigPanel v7.4.4-3, Route-Seiten v1.0-2 (Suspense-Fix). Layout VN + ZA-Deckblatt max-w-5xl mx-auto. Deploy: SQL zuerst PROD, merge v7-dev->main (--no-ff), push origin+cubintec, Vercel; in PROD getestet (WerftScan DS). Details GIT-SICHERUNG-v7_8_0-session73.md. |
| v5.29 | 29.07.2026 | NEU Paragraph 6a VN-Modul (Verwendungsnachweis) - Konzept + Bauplan, Umsetzung ausstehend (KEINE Code-/Deploy-Aenderung; DB-Migration liegt bereit, aber noch nicht ausgefuehrt). VN = projektweite Zusammenfassung aller ZAs fuer den Verwendungsnachweis gegenueber VDI/VDE-IT; Read-Rollup ueber v7_zahlungsanforderungen + Timesheets, kein Doppeln. Fuenf Formularvarianten (EP_Koop, DS AGVO, DS De-minimis, NW Phase 1/2); MVP = DS De-minimis (VDIVDE_VN_DS_oAGVO 3.00). Modi Zwischen (nur Sachbericht) / Schluss (Sachbericht + Zahlen). Kostenzeilen aus dem Formular verifiziert (WerftScan, FKZ 16KN124595): sechs Zeilen Personal/Zuschlag/Auftraege je technisch+nichttechnisch; 30 % = Zuschlag uebrige Kosten (NICHT Foerdersatz; DS-Foerdersatz 70 %); Werte = Summe der ZA-Positionen, nur Zeilen-Reihenfolge umgeordnet (ZA-Reihenfolge bleibt). Finanzierung (Tabelle 8) aus Zahlungseingaengen/Schlusszahlung. NEU Tabelle v7_verwendungsnachweise + Spalte v7_projects.beihilfe_basis (Default de_minimis); RLS projektbezogen analog ZA. Einstieg: eigene Kachel "Verwendungsnachweis" + Deeplink aus ZA-Liste. Regeln VN-01..08. Dateien: KONZEPT-VERWENDUNGSNACHWEIS v0_1/v0_2/v1_0, BAUPLAN v1_0, SQL-MIGRATION-verwendungsnachweis-v1.sql. |
| v5.28 | 29.07.2026 | Sachkorrektur (keine Code-/DB-Aenderung): Paragraph 1.1 Rechtsgrundlage der Forschungszulage berichtigt - Angabe "Paragraph 35a EStG" war sachlich falsch (Paragraph 35a EStG = haushaltsnahe Dienstleistungen/Handwerkerleistungen) und wurde ersetzt durch "Forschungszulagengesetz - FZulG". Die Forschungszulage beruht auf dem eigenstaendigen Forschungszulagengesetz (FZulG, in Kraft seit 1.1.2020, steuerliches Nebengesetz zu EStG/KStG): Anspruchsberechtigung Paragraph 1 FZulG, Anrechnung auf die festgesetzte Einkommen-/Koerperschaftsteuer im Forschungszulagenbescheid nach Paragraph 10 FZulG, Bemessungsgrundlagen-Hoechstbetrag Paragraph 3 FZulG. Geprueft gegen Gesetzestext (gesetze-im-internet.de/fzulg) + BMF. KEINE Code-/DB-Migration. |
| v5.27 | 21.07.2026 | Session 72: GL-Wunsch (Katrin) - Projekt-Kaestchen der MA-Liste im Berater-/Firmen-Cockpit umgewidmet. Statt Sprung in die Team-Liste zum Bearbeiten des Mitglieds fuehrt der Klick jetzt direkt in die Stundenerfassung (Zeiterfassung), vorgefiltert nach genau diesem MA in genau diesem Projekt (?employee=&projekt=&returnUrl=). Bei mehreren Projekten je MA je Projekt ein eigenes Kaestchen mit eigenem Link; Darstellung Projektname als Text + Uhr-Symbol. Route/Parameter analog handleNavigateToZE der Stundennachweis-Matrix (cockpit-stundennachweis v7.4.9-7): Berater -> /v7/berater/foerderung/firma/[id]/zeiterfassung, Firma -> /v7/firma/zeiterfassung; year/month weggelassen (TimesheetForm belegt aktuellen Monat), returnUrl zurueck ins Cockpit. handleTeamMemberClick -> handleStundenerfassungClick (kein toter Code), ASCII-konform geprueft. §4.1 FirmaCockpit 7.4.9-36-3 -> 7.4.9-36-4. Reine UI/Navigation, KEINE Logik-/DB-Aenderung, Verhaltensvertrag FC-01..FC-07 intakt. Deploy V7.7.5: merge v7-dev->main (--no-ff), push origin + cubintec, Vercel-Deploy pze.cubintec-hub.com. Details GIT-SICHERUNG-v7_7_5-session72.md. |
| v5.22 | 16.07.2026 | Doku-Nachzug (keine Code-/DB-Aenderung): §4-Komponententabelle + §13-Historie auf den real deployten Stand synchronisiert - sie waren seit Session 64 (TimesheetForm/StundennachweisMatrix) bzw. Session 66 (kompletter PDF-Antragsimport) hinter der Status-Prosa zurueckgeblieben. Korrigiert §4.1: TimesheetForm 7.4.6-59->64 (Session-64-Builds -60 GF-Erkennung istGeschaeftsfuehrerTitle, -61 Paket A Live-"offen"+Farben, -62 Paket B WAZ+ZA-Direktlink, -63 Paket C Auto-"sonstige", -64 Grenzen-Korrektur), StundennachweisMatrix 7.4.6-9->10 (ZA-Direktlink Karten-Header). NEU als eigene §4-Zeilen: ProjectCreateForm 7.4.2-7 (PDF-Import-UI) + §4.2-Routen parse-zim 1.0-1, import-antrag-neu 1.0-1, arbeitsplan-import 7.3.90-1 + Libs zim-antrag-extraktor 1.0-3, parse-zim-core 1.0-2, zim-import-mapping 1.0-3 (der komplette V7.6.0-PDF-Antragsimport aus Session 66 fehlte in §4); ZASeite 1.0.10; types/v7-types 7.4.9-3; §4.3 berater/fzul-page 7.4.9-3, firma/mein-status-page 7.4.4-17. §13: abgeschnittene v5.15-Zeile (Session 64) geschlossen; Historie um v5.17-v5.21 (Sessions 66-68 + Nachtraege) ergaenzt. Umsetzung von PH §17.4 (§4 nach jeder Session aktualisieren). KEINE Code-/DB-Migration. |
| v5.21 | 15.07.2026 | Session 68 (Nachtrag, zweiter Deploy V7.7.0 - Code + RLS, keine neuen Tabellen): Bereich Forschungszulage GEKLAERT - ein eigenstaendiges FZul-Modul war seit April 2026 nicht mehr vorgesehen (KONZEPT-KAPAZITAETSPLANUNG v1.1: FZul-Auswertung ist Spezialisierung der Kapazitaetsplanung, Exportweg statt primaerer Einstieg); fzul-Tile nur noch fuer system_admin, 404 dahinter bewusst. Befund: FZul-Einstieg an VIER duplizierten, hartkodierten Nav-/Kachel-Stellen (PortalNav, dashboard, AppNav, app/cockpit) - keine liest die Modul-Config (widerspricht Shared-Components-Prinzip; NEU im Backlog: zusammenfuehren, gern mit der §8-Umbenennung Multiprojekt-Tool->Kapazitaetsplanung). Rechte-Bug behoben (RLS, DEV+PROD): Berater konnte fremde Vorhaben LAUTLOS nicht bearbeiten/loeschen (asymmetrische Policies + PostgREST liefert bei 0 Zeilen keinen Fehler - LEHRE: bei DELETE/UPDATE unter RLS immer .select() + Zeilenpruefung); SQL-MIGRATION-fzul-rls-bearbeiten-beraterfirma-v1.sql zieht BEARBEITEN auf Beraterfirmen-Logik, DELETE bleibt ersteller-gebunden. Ersteller-Anzeige "angelegt von X" ueber SECURITY-DEFINER-Funktion v7_beraterfirma_namen() (SQL-MIGRATION-beraterfirma-namen-v1.sql; enge v7_user_profiles-SELECT-Policy bleibt unveraendert, keine Rekursion). Vorhaben-Modal uebernimmt die gewaehlte Firma (defaultCompanyId, Reset beim Oeffnen). NEUE KONVENTION: durchgaengig generisches Maskulinum in allen UI-Texten/Dokumenten. Befund display_name: Konvention "Nachname, Vorname" (nur DEV per SQL-Datenkorrektur angeglichen, kein Code-Fix). Komponenten: PortalNav v7.4.4-26, AppNav v1.0.2, v7-module-config v7.3.90-8, berater-dashboard-page v7.4.4-14, berater-app-cockpit-page v1.0.8, multiprojekt-page v7.4.8-25 (kumuliert -20..-25). Details in GIT-SICHERUNG-v7_7_0-session68-nachtrag.md. |
| v5.20 | 15.07.2026 | Session 68: FZul-/Multiprojekt-Modul end-to-end funktionsfaehig in PRODUKTION (SW-Release V7.7.0). Aus den in PZE erfassten Foerderprojekten wird je MA die tagesgenau gebuchte Foerderstunde ermittelt -> Differenz zur Tagesarbeitszeit = fuer die Forschungszulage verfuegbare Stunden (Abgrenzung Doppelfoerderung). CRITICAL Fix day_type-Enum-Filter (multiprojekt-detail v7.4.8-14): der Import schloss Abwesenheiten mit deutschen Werten aus, die Enum v7_day_type ist ENGLISCH (vacation/sick/special_leave/holiday, work, weekend, short_time) -> PostgREST-Cast-Fehler -> v7_timesheets-Query lieferte null -> gefoerdert=0 -> alle MA in Gruppe B (Kernursache "Import=0"). Fix ZIM-Erkennung (v7-types v7.4.9-3, additiv): 'ZIM'/'ZIM_DS' in Typ-Union + Positivliste (Alt-Projekte mit generischem funding_format 'ZIM', in PROD der Regelfall). Multijahr-Kalender (v7.4.8-15): gefoerderte Stunden je angezeigtem Jahr live aus v7_timesheets. Export-Tab pro MA (v7.4.8-16): amtliche BSFZ-Excel via bestehende /api/export/fzul (v2.3), Vorlage rechnet Jahresarbeitszeit/FuE-Anteil selbst. Vorhaben-Loeschen-Button (multiprojekt-page v7.4.8-19). Deploy: merge v7-dev->main (--no-ff), push origin+cubintec, verifiziert; KEIN Migrations-/Enum-Schritt (FZul-Tabellen + granulare RLS existierten bereits in DEV+PROD). Erkenntnis: v7_funding_format-Enum divergiert DEV/PROD (real nur ZIM-Varianten genutzt, vom Fix abgedeckt); day_type-Werte in v7_timesheets sind englisch. Details in GIT-SICHERUNG-v7_7_0-session68.md. |
| v5.19 | 12.07.2026 | Session 67 (Nachtrag, reines Housekeeping - kein Code-/DB-Deploy): Projektwissen (PV) auf ein schlankes Briefing-Paket reduziert - 14 Dateien behalten (Pflichtenheft, GIT-SICHERUNG 66+67, acht KONZEPTe, Dossier, Verhaltensvertrag, memory), 88 Dateien on-demand nach downloads/ + archiv/ ausgelagert (Log PZE-Bereinigung-PV-Session67.xlsx, vollstaendiges Backup PV-Backup-Session67/). Sicherungsstand verifiziert: von den 88 hatten 16 keine Kopie in downloads/root oder archiv/ - alle 16 per git grep als LIVE in src/ bestaetigt, kein Datenverlust. Zwei historische Supabase-Snapshots + drei ASCII-Altversionen archiviert. Randbefund zu pruefen: moegliche verschachtelte PZE/-Kopie im Repo (WorkPackageEditModal unter src/ UND PZE/src/). KEINE Code-/DB-Migration. |
| v5.18 | 12.07.2026 | Session 67: PRODUKTIVSETZUNG V7.6.0 - der in Session 66 gebaute PDF-Antragsimport ist in PRODUKTION. SQL-Migration v2 auf PROD (v7_import_projekt_team + v7_cleanup_projekt, create-or-replace, funding_format-Enum-Cast) VOR dem Code-Deploy, danach merge v7-dev->main (--no-ff), push origin+cubintec, Vercel-Deploy verifiziert; PDF-Antragsimport in PROD getestet. ENTSCHEIDUNG: PDF-Import-Tab in Berater- UND Firmen-Portal freigegeben (revidiert die Session-66-Ueberlegung, ihn im Firmen-Portal auszublenden - Firmen koennen den Import nutzen, keine Code-Aenderung noetig). ASCII-Nachpflege dreier Seiten (Rendering unveraendert): berater-multiprojekt-page v7.4.8-18, berater-fzul-page v7.4.9-3, mein-status-page v7.4.4-17. Housekeeping: downloads/archiv auf Schema code/doku/sql/skripte umgestellt (567 Altdateien, ~40 Duplikate entfernt); Projekt-Anweisungen ueberarbeitet (Loeschen/Verschieben bleibt beim Nutzer, Session-Auftakt-Versions-Check, praezise ASCII-Regel, alles nach downloads); Claude legt Dateien jetzt direkt in downloads/ ab und liefert je Schritt die Terminal-Befehle mit. Details in GIT-SICHERUNG-v7_6_0-session67.md. |
| v5.17 | 11.07.2026 | Session 66: MEILENSTEIN PDF-Antragsimport (SW-Release V7.6.0) - ein komplettes Projekt (Projekt + Mitarbeiter + Team + Arbeitsplan) wird aus dem verschluesselten ZIM-Antrags-PDF automatisch angelegt (macht PZE als Produkt schluesselfertig/kommerziell vermarktbar). Eigener TS/Node-Extraktor zim-antrag-extraktor v1.0-3 (nur zlib+crypto, KEINE Fremd-Lib): loest XFA-Formular-PDFs mit PDF-Standard-Sicherheitshandler AES-128 (V4/R4) UND AES-256 (V5/R6), Cross-Reference-/Object-Streams inkl. inkrementeller Updates; datasets-XML byte-identisch zur pypdf-Referenz. Verworfen: pdf-lib/MuPDF (AGPL)/pdf.js. Parser parse-zim-core v1.0-2 (datasets -> Vertrag mit Kontrollsummen-Selbstcheck, Anlage 5 byte-genau), Mapping zim-import-mapping v1.0-3. NEU Routen /api/v7/parse-zim v1.0-1 (Upload -> Vertrag oder sprechender Fehler) und /api/v7/import-antrag-neu v1.0-1 (atomar via RPC v7_import_projekt_team, Rollback + v7_cleanup_projekt); arbeitsplan-import v7.3.90-1 um JSON-Eingang erweitert (gemeinsames Backend Excel+PDF). ProjectCreateForm v7.4.2-7: Import-Tab mit Vorschau (Projektkopf editierbar, MA-Tabelle mit Dublettenabgleich/pWAZ/Stundensatz, Arbeitsplan-Matrix, Kontrollsummen), Duplikat-Rueckfrage (strich-tolerant + Akronym-Signal). Foerderrechtliches Salaer-Modell gegen PROD verifiziert: p_kosten = Vollzeit-aequivalentes Monatsbrutto, tatsaechliches Monatsbrutto = round2(p_kosten x TZF), bWAZ global pro Antrag, pm_basis_weekly_hours = bWAZ. Einstiegspunkt 2 ("bestehendes Projekt aktualisieren") bewusst verworfen. STAND (Ende S66): in DEV fertig + getestet, git-Commit auf v7-dev; PROD-Deploy + Migration standen aus (in Session 67 erfolgt). Backlog: Loesch-Kaskade fuer verwaiste MA. Details in KONZEPT-PDF-ANTRAGSIMPORT v1.5. |
| v5.16 | 05.07.2026 | Session 65: Username-Login ergaenzt (E-Mail ODER Benutzername beim Anmelden), PROD-deployt (beide Remotes). A-050 NEU+erledigt: DB-Spalte v7_user_profiles.username (optional, global eindeutig, a-z0-9._- 3-20 Zeichen, Partial-Unique-Index, SQL-MIGRATION-username-login-v1.sql DEV+PROD). Login-Seite (7.3.90-8) loest einen eingegebenen Benutzernamen ueber neue Route /api/v7/resolve-username in die E-Mail auf (Route liefert ausschliesslich die E-Mail, gleiche generische Fehlermeldung wie falsches Passwort - kein Enumerations-Risiko). Selbstbedienung ueber neue Route /api/v7/set-username (nur eigenes Konto, auth.uid() aus Session-Cookie) + Menuepunkt "Benutzername festlegen/aendern" im PortalHeader (7.3.95-15). Optionales Benutzername-Feld bei MA-Neuanlage in BEIDEN Login-erstellen-Dialogen ergaenzt (REGEL zu parallelen Aenderungen): EmployeeManagement 7.3.95-20 UND MitarbeiterModal 1.0.3-3; create-employee-login-route 7.3.95-3 mit Format-/Eindeutigkeitspruefung + Race-Condition-Absicherung (USERNAME_TAKEN). BEWUSST NICHT umgesetzt: Admin setzt Benutzername fuer fremden bestehenden Account - Selbstbedienung + Neuanlage decken den Bedarf ab. Vereinheitlichung der zwei strukturell unterschiedlichen Login-Dialoge bewusst zurueckgestellt (Backlog, kein Umbau unter Zeitdruck). NEU BACKLOG (Prio 2): Firmen-Portal-Rolle "Assistenz GL" (Zeiterfassung aller MA + ZA + Berichte + MA-Stammdaten, keine Logins/Projekte/Firmendaten) - noch nicht begonnen. Doku: §2 neu 2.10 Username-Login; §4.1/§4.2 Versionen nachgezogen; SW-Release V7.5.4->V7.5.5. KEINE weitere DB-Migration. |
| v5.15 | 03.07.2026 | Session 64: Groesserer Stundennachweis-Ausbau, PROD-deployt (beide Remotes, SHA 1e2de08). GF-50%-Regel wieder aktiv (tolerante Erkennung istGeschaeftsfuehrerTitle() in v7-types 7.4.9-2, echte Umlaute im Position-Dropdown, MitarbeiterModal 1.0.3-2, TimesheetForm 7.4.6-60) - Ursache war exakter ASCII-String-Match gegen ueberwiegend Umlaut-Bestandsdaten. Paket A (TimesheetForm 7.4.6-61): rechte "offen"-Spalte live waehrend der Eingabe + Farben zurueck. Paket B (TimesheetForm 7.4.6-62, StundennachweisMatrix 7.4.6-10): persoenliche WAZ-Anzeige neben MA-Feld + ZA-Direktlink in Timesheet/Matrix. ZA-Ruecksprung-Fix (ZASeite 1.0.10): returnTo-Pfad wird honoriert statt fix aufs Dashboard zu springen. Paket C (TimesheetForm 7.4.6-63): Auto-Vorbelegung "sonstige Arbeiten" je Arbeitstag, live nachgefuehrt, gespeicherte Monate nicht ueberschrieben, weicher Save-Hinweis auf Luecken. Grenzen-Korrektur (TimesheetForm 7.4.6-64): "sonstige Arbeiten" zaehlen nicht mehr in 9h-Tagesgrenze und physische Monatskapazitaet. Datenkorrektur (kein Code): Katrin Kirchner WAZ-Historie (38h->28h ab 01.08.2025) - Historie hat Vorrang vor Stammsatz. KEINE DB-Migration. Komponenten: TimesheetForm v7.4.6-64, StundennachweisMatrix v7.4.6-10, ZASeite v1.0.10, v7-types v7.4.9-2, MitarbeiterModal v1.0.3-2. (Hinweis: §4.1-Nachzug dieser Session wurde erst mit v5.22 nachgeholt.) |
| v5.14 | 30.06.2026 | Session 63: Stundennachweis-Feinschliff, PROD-deployt (beide Remotes, SHA 10f5236). A-049 Feiertags-Tagesstunden folgen der individuellen MA-WAZ (TimesheetForm v7.4.6-58): Feiertag-Vorbelegung der S-Zeile nutzt employeeDailyHours statt company.standard_weekly_hours/5, Lade-Effekt haengt jetzt von weeklyHoursAtMonth ab. Behebt Teilzeit-Block: Walter (Androlite, 38h->7,60) bekam am Feiertag 8,00 -> Tages-Plausipruefung (7,60) verhinderte das Speichern. U/K/S waren bereits korrekt. SQL-Diagnose: Walter weekly_hours=38, Androlite standard=40, keine Historientabelle -> reiner Code-Fix, KEINE Datenmigration. PDF-Dateinamen final (TimesheetForm v7.4.6-59, StundennachweisMatrix v7.4.6-9): Leerzeichen statt Unterstrich, ohne 'Stundenerfassung'; Einzeldruck 'SF 2510 16DS251601 Ferat Sarac', Sammeldruck 1 MA mit Zeitraum, mehrere MA 'YYMM FKZ'; kein .pdf im title (Browser haengt es an). Loest die Unterstrich-Fassung aus Session 62 ab. Doku: Header-Kaskade S63; SW-Release V7.5.2->V7.5.3; §4.1 TimesheetForm 57->59, StundennachweisMatrix 8->9. KEINE DB-Migration. |
| v5.13 | 30.06.2026 | Session 62: Layout-Bereinigung Stundennachweis + sprechende PDF-Dateinamen + Uebersetzungssperre (Vorgabe Berater, kein Backlog-Item). Optik: Abschnitts-Baender + Summenzellen ohne Hintergrundfarbe (Summen weiter fett), alle Sheet-Schriften schwarz (T/NT-Marker entfaerbt), DS-Summenlabels einzeilig (T)/(NT), "Urlaub (nur bezahlter Urlaub)", Unterschrifts-Labels groesser; Spalten-Schattierung + Warn-Faerbung unveraendert; orange Kopf-Boxen bleiben farbig (bewusst). Uebersetzungssperre translate="no"+notranslate auf Sheet/printRef (Bug GRAVID->SCHWANGER). PDF-Dateinamen: Einzeldruck NV_YYMM_FKZ_Stundenerfassung_Vorname_Nachname (Bsp. SF_2510_16DS251601_Stundenerfassung_Ferat_Sarac), Sammeldruck 1 MA mit Zeitraum / mehrere MA -> Stundennachweise_Zeitraum_FKZ; ASCII-Namen, document.title-Swap. Nachtrag: "sonstige Arbeiten"-Zellen bg-white (Editor-Rahmen war Bildschirm-Zoom-Artefakt, im Druck stets vollstaendig; Cmd+0). Doku: Header-Kaskade S62; §4.1 TimesheetForm 52->57, StundennachweisMatrix 7->8, StundennachweisSheet 1.0.0->1.0.3. KEINE DB-Migration. Komponenten: StundennachweisSheet v1.0.3, TimesheetForm v7.4.6-57, StundennachweisMatrix v7.4.6-8. |
| v5.12 | 26.06.2026 | Session 61: Drei Zeiterfassungs-Bugs behoben + PROD (SHA b1e6faf), SW-Release Patch V7.5.1. A-044 Matrix-Klick belegt MA/Monat/Projekt vor (?projekt durch die Kette: StundennachweisMatrix v7.4.6-7, BerichtePage v7.4.6-23, cockpit-page v7.4.9-7, ZE-Seiten v7.4.6-4 -> initialProjectId). A-045 Pfeilnavigation ueberspringt Abwesenheitstage (canEdit typ-abhaengig, TimesheetForm v7.4.6-52). A-046 Fehlzeit-Tagesstunden erben Firmenstandard (7,5 statt 8; Fallback auf standard_weekly_hours bei fehlender MA-WAZ; nur ohne eigene WAZ). LEHRE: TimesheetForm-52 war stumm nicht heruntergeladen -> nie in src/; vor 'funktioniert-nicht' immer den Marker per grep in src/ pruefen. Doku: Header-Kaskade S61; §4.1 TimesheetForm 47->52, StundennachweisMatrix 6->7, BerichtePage 20->23, useBerichteData 1.0.2->1.0.3; §4.3 ZE-Seiten 3->4, cockpit-stundennachweis 9-6->9-7; §5 5.59/5.60/5.61. KEINE DB-Migration. |
| v5.11 | 25.06.2026 | Session 60: **SW-Release auf V7.5.0 angehoben** (Meilenstein Multiprojekt + zentrale Abwesenheiten stabil im Produktivbetrieb). Sechs Punkte erledigt + deployt (beide Remotes): A-036 Feiertagszelle in Ausfallzeiten-Zeile gesperrt (U/K kein Input, S disabled; TimesheetForm v7.4.6-49). A-037 Footer-Build-Marker automatisch aus Vercel-Commit-SHA (PortalFooter v7.4.9-3). A-038 Fokus-Weitersprung nach Abwesenheit (TimesheetForm v7.4.6-49). A-040 .limit(10000) auf v7_timesheets wiederhergestellt (useBerichteData v1.0.3, Regression aus A-034 v1.0.2). A-041 React #418 Hydration-Mismatch im ZAPanel behoben (mounted-Gate, ZAPanel v7.4.4-53). A-042 ZA-Auto-Auswahl der zuletzt/initialZaId-ZA + Einreichdatum leer per Default (3 Stellen) + Archiv-Spalte Zahlungseingang-Betrag rechtsbuendig (ZAPanel v7.4.4-56). GROSSER UMWEG (Lehre dokumentiert im Status): ZA-Anlagen zeigten in PROD "Keine Zeiterfassungsdaten", obwohl Daten/Team/Zeitraeume vorhanden - echte Ursache war fehlende ZA-Vorauswahl -> Zeitraum defaultete auf heute (new Date()) -> abgeschlossene Monate ohne Stunden. Gefunden per Diagnose-console.log (ZA-DIAG). Lehren: bei "keine Daten" zuerst Laufzeit-Parameter messen statt Hypothesen deployen; leere UI-Zustaende muessen Ursache+Handlung zeigen; pnpm dev lief auf DEV (lokal nie reproduzierbar). Doku: Header-Kaskade Session 60; SW-Release V7.4.9->V7.5.0; §4 ZAPanel 7.4.4-52->7.4.4-56; §12.1 A-036/037/038/040/041/042 -> Erledigt, NEU A-039 (Footer ueberall) + A-043 (Arbeitsplan/AP-Uebersicht als Druck/PDF). KEINE DB-Migration. Komponentenversionen: ZAPanel v7.4.4-56, TimesheetForm v7.4.6-49, PortalFooter v7.4.9-3, useBerichteData v1.0.3. |
| v5.10 | 24.06.2026 | Session 59: A-034 PROD-Phase - zentrale Abwesenheiten live in PRODUKTION. PROD-Diagnose sauber (v7_employee_absences fehlte, D1 leer, Q2 leer, Q1 U=561/K=70/S=126 roh). SQL-MIGRATION-employee-absences-v2.sql: einzige Abweichung zu v1 = Feiertags-S im INSERT ausgeschlossen (explizite Datums-/Bundesland-Liste, bundesweit + Fronleichnam NW / Reformationstag SH), Backup+Deaktivierung breit (Feiertags-S deaktiviert, nicht migriert), KEIN RLS-Block in PROD (Angleich DEV/PROD im Backlog). Verifikation: absences=636 (U=561/K=70/S=5), Backup=757, ts_rest=0; 5 echte Sonderurlaube korrekt. Gekoppelter Dual-Read-Deploy 4 Schritte: Block1 (Tabelle+Index) -> Code beide Remotes (Merge 9cb9c9b origin+cubintec) -> Vercel Ready/Production -> Block2-4 (Transaktion). Live verifiziert (Feiertag berechnet, Sonderurlaub bleibt S, projektuebergreifend automatisch, Berichte/Sammeldruck ok). NEU offen A-036 (Feiertagszelle in Ausfallzeiten-Zeile sperren - Speicherpfad schuetzt bereits) + A-037 (Footer-Build-Marker nachziehen+hochzaehlen). Doku: Header-Kaskade Session 59; §12.1 A-034 -> Erledigt (DEV+PROD), NEU A-036/A-037. KEINE Code-Aenderung (reiner Deploy Session-58-Code + DB-Migration). Komponentenversionen unveraendert (TimesheetForm v7.4.6-47, BerichtePage v7.4.6-20, StundennachweisMatrix v7.4.6-6, useBerichteData v1.0.2, lib employeeAbsences v1.0.0). |
| v5.09 | 24.06.2026 | Session 58: A-034 zentrale projektuebergreifende Abwesenheiten (DEV erledigt, PROD offen). Abwesenheit jetzt mitarbeiter- statt projektbezogen: einmal erfasst, erscheint in allen parallelen Projekten des MA, keine Doppeleingabe. NEU Tabelle v7_employee_absences (employee_id, client_company_id, work_date, absence_code U/K/S, hours, is_active; partieller UNIQUE employee_id+work_date WHERE is_active, NULLS NOT DISTINCT; RLS aktiv, 4 Policies). NEU lib employeeAbsences.ts (synthetische Timesheet-Zeilen ueber Assignment-Fenster fuer die Lesepfade). DEV-Migration 378 Abwesenheiten (U=331/K=43/S=4) mit Backup+Konflikt-Guard, Alt-Zeilen deaktiviert (Dual-Read). Vorbedingung-Reparatur: Geisterfirma c97d8105 (AutoSyn) in DEV v7_client_companies wiederhergestellt (9 FK-Tabellen umgehaengt, Duplikat geloescht). Feiertags-S bereinigt (25./26.12. raus, 24./31.12. bleiben). Lesepfade Dual-Read: useBerichteData v1.0.2, BerichtePage v7.4.6-20, StundennachweisMatrix v7.4.6-6. Schreibpfad TimesheetForm v7.4.6-47 (2a Laden, 2b Speichern-Sync ueber MA+Monat, 2c harte Cross-Projekt-Abwesenheitssperre; ein Code/Tag, S an Feiertag bleibt berechnet, Sonderurlaub wandert mit). Bewusst NICHT: Spiegeln von Arbeitsstunden zwischen Projekten. Doku: §2.1 v7_employee_absences ergaenzt; §4.1 TimesheetForm 7.4.6-43->47, BerichtePage 7.4.6-19->20, StundennachweisMatrix 7.4.6-5->6, NEU lib employeeAbsences 1.0.0 + hooks/useBerichteData 1.0.2; §12.1 A-034 auf DEV erledigt/PROD offen. DB-Migration: v7_employee_absences NUR DEV - PROD steht aus. Komponentenversionen: TimesheetForm v7.4.6-47, BerichtePage v7.4.6-20, StundennachweisMatrix v7.4.6-6, useBerichteData v1.0.2, lib employeeAbsences v1.0.0. |
| v5.07 | 23.06.2026 | Session 56: PROD-Auslieferung wiederhergestellt + Dashboard-Matrix-Desync behoben + downloads aufgeraeumt. PROD-Recovery: Cubintec-Vercel-Team war von Pro auf Hobby zurueckgefallen -> alle Deployments seit Session 54 'Blocked' (letzter Ready 13.06.); Katrin reaktivierte Pro, geblockte Deployments laufen NICHT automatisch wieder an -> frischer Redeploy, Footer 'Build 43' live verifiziert (Matrix -4, cockpit-stundennachweis -6, TimesheetForm -42, Footer -2 nun ausgeliefert). A-035 NEU+erledigt (Dashboard-Matrix meldete bei Mehr-Projekt-Firmen faelschlich 'Keine Projektdaten', betroffenes Projekt wechselte je nach Navigationsweg - State-Desync zwischen selectedReportProjectId (filtert das an die Matrix uebergebene projects-Array) und matrixProjectId (aktives Projekt, sonst nur beim Panel-Oeffnen gesetzt). Fix: BerichtePage v7.4.6-18 setzt beide States im onChange synchron + StundennachweisMatrix v7.4.6-5 Selbstheilungs-Guard auf activeProjectId. KEINE DB-Migration. Live an Selaflex InGrav/GRAVID verifiziert). Doku: §4.1 BerichtePage 7.4.6-17->7.4.6-18, StundennachweisMatrix 7.4.6-4->7.4.6-5; §12.1 A-035 als Tabellenzeile. downloads/ aufgeraeumt (Keep-2; Verlaufs-/session-Dateien + Dateien ohne Versionsnummer ausgenommen; Skript aufraeumen_downloads.py mit Dry-Run-Default). Komponentenversionen: BerichtePage v7.4.6-18, StundennachweisMatrix v7.4.6-5. |
| v5.06 | 22.06.2026 | Session 55: Saubere Trennung bei Mehr-Projekt-Firmen (erste Konstellation: Selaflex mit InGrav+GRAVID, MA Linfert in beiden). A-032 NEU+erledigt (Stundennachweis-Matrix filtert die MA-Zeilen jetzt auf das oben gewaehlte Projekt; StundennachweisMatrix v7.4.6-4 filtert projectAssignments auf activeProjectId, cockpit-stundennachweis page v7.4.9-6 fuehrt assignment_start/end je MA+Projekt zusammen; wirkt auch in der BerichtePage-Matrix). A-033 NEU+erledigt (Teil 2a: MA-Auswahl im TimesheetForm aufs Projektteam beschraenkt - v7.4.6-37, teamMemberIds/teamEmployees, Auto-Umstellung beim Projektwechsel, gewaehlter MA sichtbar). Bestaetigt: projektuebergreifender 9h-Tagesdeckel (A-021) greift bereits generell, nicht nur NWM. A-034 NEU+offen (projektuebergreifende Abwesenheiten, zentrale Tabelle - Konzept KONZEPT-ABWESENHEITEN-ZENTRAL v1.1 abgenommen; Umsetzung als eigene DB-Session). Doku: §4.1 StundennachweisMatrix 7.4.6-3->7.4.6-4; §4.1 TimesheetForm 7.4.6-30->7.4.6-37 nachgezogen (Zwischenbuilds -31 Kurzarbeit+Rechtsklick, -32/-33 Fehlzeiten-Fixes, -34/-35 Wochenend-Erfassung nicht-foerderbar, -36 Rahmen-Fix Tailwind 4 waren deployed, in §4 nicht reflektiert); §4.3 cockpit-stundennachweis page als Zeile ergaenzt (7.4.9-6). KEINE DB-Migration. Komponentenversionen: StundennachweisMatrix v7.4.6-4, cockpit-stundennachweis page v7.4.9-6, TimesheetForm v7.4.6-37. |
| v5.05 | 22.06.2026 | Session 54: A-031 NEU+erledigt (Login-Erstellung im App-Cockpit). Im neuen FirmaCockpit fehlte jede Moeglichkeit, einen Portal-Login anzulegen - das Schluessel-Icon war fest auf Passwort-Reset verdrahtet und zeigte bei MA ohne user_id nur eine Sackgassen-Meldung; die Login-Anlage lag bisher nur im alten EmployeeManagement (Firmendaten>Mitarbeiter). MitarbeiterModal v1.0.3: Passwort-Modus zeigt bei fehlendem Login ein Login-erstellen-Formular (E-Mail + Portal-Rolle read-only, Passwortfeld) und ruft die bestehende atomare Route /api/v7/create-employee-login auf (keine neue Backend-Logik); Fall ALREADY_REGISTERED abgefangen (Verknuepfen bleibt im EmployeeManagement). FirmaCockpit v7.4.9-36: Schluessel-Icon-Tooltip + Hover-Farbe dynamisch je user_id (Login erstellen / Passwort zuruecksetzen), user_id in MA-Query + MitarbeiterData ergaenzt; ASCII-Korrektur Mittelpunkt-Zeichen im Firmen-Zaehler -> '-'. Doku: §4.1 nachgezogen (MitarbeiterModal 1.0.2->1.0.3, FirmaCockpit 7.4.9-33->7.4.9-36); §12.1 Nachtrag A-029/A-030 (Session 53) als Tabellenzeilen ergaenzt (waren bis v5.04 nur in der Status-Prosa). KEINE DB-Migration. PROD auf beide Remotes (origin + cubintec), Merge-Commit 92b51c1, Deploy auf pze.cubintec-hub.com am Schluessel-Tooltip verifiziert. Komponentenversionen: MitarbeiterModal v1.0.3, FirmaCockpit v7.4.9-36. |
| v5.03 | 08.06.2026 | Session 52 (Doku-Nachzug, keine Code-Aenderung): §4-Komponententabelle auf den real deployten Stand synchronisiert - sie hing seit Sessions 50-52 hinter der Status-Prosa zurueck. Korrigiert: EmployeeManagement 7.3.95-17->18 (A-024), PortalNav 7.4.4-23->24 (A-025), TimesheetForm 7.4.6-22->23 (A-026), FirmaCockpit 7.4.9-30->31 (A-020). MitarbeiterModal v1.0.2 als eigene Zeile in §4.1 ergaenzt (fehlte komplett). §4.3 Wrapper: app/cockpit 1.0.6->1.0.7 (A-023), app/firma/[id] 1.0.0->1.0.1 (A-028), firma/[id]-Detail 7.4.4-6->8. Zwei veraltete Duplikate aus dem Arbeitsverzeichnis archiviert (ProjektFortschrittPanel v7.4.5-22, foerderung-page v7.4.1-6 - aktuell sind -23 bzw. -10). Umsetzung von PH §17.4 (§4 nach jeder Session aktualisieren). Ausserdem Versionstippfehler korrigiert: berater-fzul-page v7.3.1-1 -> v7.4.9-2 (real deployte Version) an 4 Stellen (Status, §12.1 A-006, §13 v5.01). | Drei Navigations-/Anzeige-Bugs im App-Paradigma behoben (fielen mit dem Domain-Umzug auf pze.cubintec-hub.com gleichzeitig auf -> erst Verdacht auf Deployment/Transfer-Regression, durch git-Verifikation widerlegt: origin/main = cubintec/main, deployter Code unveraendert). A-026 NEU+erledigt (TimesheetForm v7.4.6-23: Abwesenheitscode U/K/S in AP-Tageszelle wird wieder automatisch in die Fehlzeit-Zeile uebernommen, F->S, mit MA-Tagesstunden; handleCellChange. Ursache war die bewusste Umstellung v7.4.6-16 vom 07.05. - calculateAbsenceSums liest nur absenceHoursInput - kein Transfer-Schaden). A-027 NEU+erledigt (Cockpit-Stundennachweis-Weg war von Beginn an falsch verdrahtet: Matrix uebergab ?projekt=&ma=&monat=YYYY-MM, Zeiterfassungs-Seite liest ?employee=&year=&month= -> Monat/MA ignoriert, aktueller Monat; kein returnUrl -> "Zurueck" ins alte Foerder-Portal. Fix cockpit/stundennachweis + cockpit/fortschritt je v7.4.9-5: korrekte Parameter + returnUrl, "Zurueck" via pze_mode ins Firma-Cockpit. Zeiterfassungs-Seite unveraendert). A-028 NEU+erledigt (app/firma/[id] page v1.0.1: fehlender PortalHeader ergaenzt - FirmaCockpit rendert keinen Header, Wrapper-Seite muss; Muster der klassischen Cockpit-Seite). A-001 bleibt offen (Berater-Manual v1.1 als docx mit URL-Migration erstellt, aber undeployed + in Ueberarbeitung -> v1.2). DEPLOY-KORREKTUR (Prozess): Vercel-Build-Hook haengt Stand Session 52 (laut Dashboard) am Repo projektzeiterfassung20 (origin), NICHT cubintec (widerspricht v5.01, vermutlich beim Domain-Umzug umgestellt); Regel bleibt PROD-Push auf BEIDE Remotes (origin + cubintec). §10.1 und §12c entsprechend auf Beide-Push korrigiert. Produktions-URL jetzt pze.cubintec-hub.com (Redirect von pze.itenion.com). KEINE DB-Migration. Komponentenversionen: TimesheetForm v7.4.6-23, cockpit/stundennachweis page v7.4.9-5, cockpit/fortschritt page v7.4.9-5, app/firma page v1.0.1. |
| v5.01 | 05.06.2026 | Session 51 (Nachtrag): App-Modus-Navigation + FZul-Header + Deploy-Korrektur. A-025 NEU+erledigt (PortalNav v7.4.4-24: "Unternehmen"-Tab im App-Modus ausgeblendet - fuehrte vom Cockpit ueber Netzwerk/Kapazitaetsplanung zurueck auf die alte Firmenliste statt ins App-Cockpit; Zugang zur Firmenauswahl jetzt nur ueber Home-Icon, App-Nav damit ueberall identisch zur Cockpit-Nav, Classic-Modus unveraendert). A-006 TEIL-erledigt (Header-Vereinheitlichung der fzul-Seite: berater-fzul-page v7.4.9-2, handgebaute Ozeanblau-Kopfzeile #0369a1 ersetzt durch PortalHeader hideNavigation + PortalNav, korrektes Berater-Blau #002451, companyName nicht uebergeben, Umlaute in sichtbaren Texten intakt, COLORS+handleLogout entfernt; Navi-Zeile nun vorhanden -> Rueckkehr ins Cockpit. FZul-Modul-Ausbau bleibt offen, "Analyse starten" -> 404). DEPLOY-KORREKTUR (Prozess, kein Code-Item): PROD haengt am Remote cubintec (kkcub/pze-cubintec), NICHT origin (mdit60/projektzeiterfassung20 = Dev-Repo) - ein Push nur auf origin/main deployt NICHTS auf pze.itenion.com. Heute aufgefallen: PortalNav-Fix lag auf origin/main, Production blieb leer; nach git push cubintec main (Fast-Forward 0e7b862..ac90647) lief der Deploy. Korrigiertes Ritual: PROD-Deploy IMMER mit git push origin main && git push cubintec main. KEINE DB-Migration. Komponentenversionen: PortalNav v7.4.4-24, berater-fzul-page v7.4.9-2. |
| v5.00 | 03.06.2026 | Session 51: Firmen-Lebenszyklus im App-Paradigma vervollstaendigt + Tippfehler-Schutz. A-020 erledigt (Firmen-Deaktivierung, FirmaCockpit v7.4.9-31: Trash2 in Firmendaten-Karte, Bestaetigungsdialog, Soft-Delete is_active=false/status=inactive, Rueck-Navigation ins App-Cockpit). A-023 NEU+erledigt (Gegenstueck Firmen-Reaktivierung, berater-app-cockpit-page v1.0.7: zweite Query status=inactive, aufklappbarer "Inaktive Firmen"-Bereich nur bei Bedarf sichtbar, RotateCcw-Wiederherstellen + Dialog, DB-Update is_active=true/status=active, danach reiner Client-State-Update ohne Reload). A-024 NEU+erledigt (E-Mail-Bestaetigungsfeld bei MA-Neuanlage in BEIDEN Anlage-Formularen: MitarbeiterModal v1.0.2 + EmployeeManagement v7.3.95-18; Live-Abgleich, Anlegen gesperrt bei Abweichung, harte Pruefung, Paste gesperrt). KEINE DB-Migration (bestehende Spalten is_active/status, Rest Frontend). PROD-Incident geloest (kein Code-Item): Kunde Luebeck Yacht t.schulze-hagenest kam nicht in seinen Zugang. Diagnose Schritt fuer Schritt: Browser ausgeschlossen (Kunde scheiterte auch in Firefox), Network-Tab zeigte invalid_credentials gegen Live-Projekt cnnuyioklhlrfygwticf, auth.users-Query "no rows" -> Ursache E-Mail beim Anlegen mit Doppel-N (hagennest) statt Ein-N (hagenest) getippt, Auth-Lookup fand Account nicht. Passwort-Resets griffen daher nie. Korrektur: Auth-Admin-API PUT /admin/users/{id} mit email=Ein-N + email_confirm; v7_user_profiles + v7_employees per UPDATE nachgezogen (User-ID 0b0114ac...). Login danach OK. Interne Restkopie in auth.identities/user_metadata bewusst belassen (fuer Passwort-Login irrelevant, von erfolgreichem Login bewiesen; geschuetztes auth-Schema per SQL-Editor nicht schreibbar, Korrektur nur mit Risiko fuer Live-Account). A-013 HOCHGESTUFT von 5-Min-Win auf Legacy-Cluster (firmen/[id] + v7/page.tsx + 2x import-Seiten inkl. Duplikat "page 2.tsx"; aktive foerderung/import-Seite pusht noch auf /v7 - Navigationsentscheidung noetig). Komponentenversionen: FirmaCockpit v7.4.9-31, berater-app-cockpit-page v1.0.7, MitarbeiterModal v1.0.2, EmployeeManagement v7.3.95-18. |
| v4.99 | 01.06.2026 | Session 50: Feature-Session. A-002 erledigt (NWM-Wording "foerderbare Management-Arbeiten" bei ZIM_NETZWERK, offizielles Template). A-003 erledigt (AP-Quick-View Popup mit Tabelle, Info-Icon neben Projekt-Dropdown). Beide seit Session <=42 offen - endlich umgesetzt in TimesheetForm v7.4.6-21. A-021 NEU+erledigt (NWM-Tagessperren + Cross-Projekt 9h-Grenze): Admin kann bei NWM-Projekten Tage fuer MA sperren (neue DB-Tabelle v7_nwm_blocked_periods), gesperrte Zellen rosa/disabled mit Tooltip; projektuebergreifende Tagessumme in calcCrossProjectTagSumme, Fehlermeldung mit Cross-Projekt-Aufschluesselung. TimesheetForm v7.4.6-22. A-022 NEU+erledigt (Kapazitaetsplanung): Monatskapazitaet von pauschaler 173,33h auf echte Arbeitstage x (WAZ/5) umgestellt - nutzt countWorkdaysInMonth mit Feiertagen + v7_employee_hours_history fuer unterjaerige WAZ-Aenderungen; MA-Name klickbar mit Deep-Link ?editMA+?returnTo (berater-multiprojekt-page v7.4.8-17, FirmaCockpit v7.4.9-30). Bug-Fixes: Cockpit-Freischaltung fuer Berater (PortalHeader v7.3.95-12/13 + Login v7.3.90-7 - Config-Query korrigiert, localStorage-Sync, portal_role aus v7_employees fuer Firmen-Portal), Header-Rollenanzeige client_user -> echte portal_role. A-020 als offen aufgenommen (Firmen-Deaktivierung im App-Paradigma). Komponentenversionen: TimesheetForm v7.4.6-22, PortalHeader v7.3.95-13, login-page v7.3.90-7, berater-multiprojekt-page v7.4.8-17, FirmaCockpit v7.4.9-30. |
| v4.98 | 01.06.2026 | Session 49: Werkbank-Aufraeumen (A-017 erledigt). Lokaler Drift seit Session 44 systematisch bereinigt - verirrte foerderung-page.tsx (nie geroutete Upload-Kopie) und leere 0-Byte-Datei "Vercel" geloescht, alte Upload-Checkliste nach docs/archiv/ verschoben. Uncommittete fzul/page.tsx verworfen (git restore): entpuppte sich nicht als Platzhalter, sondern als halbfertiger Header-Umbau mit 7 UI-Text-ASCII-Regressionen (Bundeslaender-Namen + Hinweistexte faelschlich ae/oe/ue) und einer redundanten companyName-DB-Query (PortalHeader laedt die Berater-Firma selbst und ignoriert die Prop) - Header-Vereinheitlichung + korrektes Blau #002451 an A-006 verwiesen, kompletter Diff im Session-49-Verlauf dokumentiert. Sync-Tooling konsolidiert (Weg 2: als Dev-Werkzeug versioniert): V2 (direkte pg-Verbindung fuer DEV, Keys interaktiv per readline - commit-sicher, kein Hardcoding) behalten + committet, V1 und Wurzel-Duplikat geloescht, pg in dependencies getrackt. Sicherheits-Check vor Commit: V2 enthaelt keine Klartext-Secrets (nur PROD-URL, Rest Variablen/Prompts). Commit 9bc238e. A-018 erledigt: inerter refreshed-Listener im App-Cockpit (latente Spinner-Falle, da setLoading(true) ohne Reload/Reset; Parameter wurde ohnehin nie gesendet) ersatzlos entfernt, useSearchParams/searchParams ungenutzt -> raus, Suspense belassen; berater-app-cockpit-page v1.0.6, Commit d1dcd1b. A-019 (Namens-Vereinheitlichung K/C) bewusst nicht ausgefuehrt - hohes Import-Bruchrisiko fuer kosmetischen Gewinn, bleibt offen. |
| v4.97 | 31.05.2026 | Session 48: A-011 erledigt - ProjektFortschrittPanel v7.4.5-23 rechnet jetzt ueber die gemeinsame projektfortschritt-utils (calculateProjectAnalysis) statt eigener Inline-useMemo-Logik; Ergebnisse anweisungsweise als identisch verifiziert, eine Rechenquelle mit FirmaCockpit (Commit 97bc3bd). Drei seit Session 44 uncommittet auf der Werkbank liegende Funde geprueft und ausgeliefert: A-014 "Neues Unternehmen anlegen"-Button im App-Cockpit (cockpit v1.0.4) + openNew-Auto-Modal auf Foerderseite (v7.4.1-9), Commit bd21e9d; A-015 modus-bewusster Zurueck-Button auf Foerderseite (v7.4.1-10, pze_mode aus localStorage), Commit a1e3118; A-016 voller Name (Vorname Nachname) in App-Cockpit-Begruessung + Header (cockpit v1.0.5, first_name+last_name). Deploys jeweils chirurgisch (nur betroffene Dateien gestaged), Rest der Werkbank (package.json/pg, fzul, sync-Skripte, docx) bewusst NICHT ausgeliefert. Neue offene Punkte A-017 (Werkbank-Bereinigung/Drift), A-018 (refreshed-Lose-Ende), A-019 (Namens-Vereinheitlichung K/C) aufgenommen. |
| v4.96 | 29.05.2026 | Session 47: Verhaltensvertrag kritischer Komponenten als Paragraph 12e aufgenommen (TimesheetForm TF-01..14, BerichtePage BP-01..08, FirmaCockpit FC-01..07, ProjektFortschrittPanel PF-01..07, ZAPanel ZA-01..11, Infrastruktur IF-01..07, Eskalationsregeln 12e.7). Versionsnummern bewusst nicht eingebacken (versionsunabhaengige Checklisten). Paragraph 12b Regel 13 (Smoke-Test) auf Verweis -> Paragraph 12e gekuerzt (eine Quelle der Wahrheit). VERHALTENSVERTRAG-Dokument auf v1.1 (angenommen). Audit Paragraph 12.1: Anforderungsliste auf Siemens-Stil-Tracking-Tabelle umgestellt (ID/Anforderung/angefragt von/angefragt am/Status/erledigt am/Referenz). Re-Verifikation am echten Code: A-004/TS-4 hinfaellig (Status-Automatik), A-005 erledigt (NWM-Stufen Runtime+UI), A-008 erledigt (ZA-Cockpit-Deeplink), TS-5 erledigt (FirmaCockpit blau); A-002/A-003 echt offen bestaetigt; A-013/TS-8 neu (verwaiste firmen/[id]-Page). Anti-Drift-Prozess als Paragraph 12b Regeln 14-16 (eine Offen-Liste, Erledigt-Regel, Session-Start-Abgleich). |
| v4.95 | 29.05.2026 | Session 46 komplett: Feiertags-Auto-Fill (TimesheetForm v7.4.6-19/20). Supabase Max Rows 10000 (PROD+DEV) + .limit(10000) in 9 Queries. AP-Druck-Fix (v7.4.6-20: line-clamp/maxWidth im Print aufgehoben). BerichtePage v7.4.6-17 (Diagnose entfernt). DEV-Datensync eingerichtet (sync-prod-to-dev-v2.mjs). DEV-Schema bereinigt (3 Extra-Unique-Indexes entfernt, timesheet_completions angelegt). Smoke-Test-Checkliste + Prozess-Regeln (12b Regel 11-13). |
| v4.94 | 29.05.2026 | Session 46: CRITICAL FIX Feiertage automatisch in S-Zeile vorbelegen (TimesheetForm v7.4.6-19). CRITICAL FIX Supabase Max Rows 1000->10000 (PROD+DEV) + .limit(10000) in 9 Queries (BerichtePage v7.4.6-16, FirmaCockpit v7.4.9-29, WorkPackageTable v7.4.3-12, useBerichteData v1.0.1, timesheet-viewer v7.4.0-9, mein-status v7.4.4-16, multiprojekt-detail v7.4.8-13, multiprojekt-page v7.4.8-13). Smoke-Test-Checkliste + Prozess-Regeln (12b). |
| v4.93 | 12.05.2026 | Session 44 final: MitarbeiterModal v1.0.1 (Neu/Bearbeiten/PW, Gehaltsdaten Anlage 6.1). FirmaCockpit v7.4.9-28 (App-Mode-aware, PortalNav Select, Unternehmen). PortalNav v7.4.4-23 (konsistent, FZul). "Kundenfirmen"->"Unternehmen". "Projektkoordinator". Login-Redirect. DB-Migration Gehaltsdaten. |
| v4.92 | 12.05.2026 | Session 44: Nav-Konsistenz. AppNav v1.0.1 (Home nur Icon). PortalNav v7.4.4-22 (Home->Startseite, Kundenfirmen->Firmenliste, FZul ergaenzt, aktive Items hervorgehoben). ZASeite v1.0.8, berater-firma-detail v7.4.4-7 (kein "Cockpit" mehr). berater-cockpit-page v7.4.9-3 (keine doppelte Nav). berater-multiprojekt-page v7.4.8-12 (Dashboard-Link App-Modus). Projektverzeichnis-Bereinigung. Upload-Checkliste-Konvention. |
| v4.91 | 11.05.2026 | Session 43: Neue parallele App-Struktur (/v7/berater/app/). Ansicht-Wechsler (PortalHeader v7.3.95-11, nur system_admin). AppNav v1.0.0, berater-app-cockpit-page v1.0.0 (4 Kacheln + Firma-Dropdown), berater-app-firma-page v1.0.0. FirmaCockpit v7.4.9-23 (Inline MA-Modal, select-Modus, MA-Bug). EmployeeManagement v7.3.95-17 (modalOnly+onClose). PortalNav v7.4.4-19 (App-Modus). ZAPanel v7.4.4-52 (ZA speichern oben, Grid 50/50). Dashboard-Links in KPT+Netzwerk App-Modus ausgeblendet. |
| v4.90 | 08.05.2026 | Session 42 komplett: ZASeite v1.0.7, ZAPanel v7.4.4-50, PortalFooter v7.4.9-1, ZA-Workflow. |
| v4.87 | 08.05.2026 | Session 41: Cockpit als Berater-Zentrale -- Monatsverlauf-Chart, Prognose-Box, Firma-Dropdown, PortalNav, Action-Buttons). PortalHeader v7.3.95-5 (Home-Icon entfernt). Session 40: Cockpit Grundgeruest v7.4.9-1 bis -5. Session 39: ZAPanel Archiv-Tab v7.4.4-34 bis -40, DB-Migration, Cockpit-Konzept v1.1. |
| v4.85 | 07.05.2026 | Session 39: ZAPanel v7.4.4-34 bis -40 (Archiv-Tab komplett neu: Zahlungseingang-Felder inline, Foerderbetrag live berechnet+gespeichert, Einreichdatum editierbar im Formular, ZA loeschbar). DB-Migration DEV: zahlungseingang_datum/betrag/kommentar, foerderbetrag_gesamt. Cockpit-Konzept v1.1 (Entscheidungen A-D). Vercel DEV/PROD Env verifiziert. PH v4.84 Korrektur SystemConfigPanel. |
| v4.84 | 07.05.2026 | Korrektur: SystemConfigPanel korrekte Version 7.4.4-1 (war faelschlich 7.4.4-2 dokumentiert). |
| v4.83 | 07.05.2026 | Session 38: Fehlzeiten editierbar (v7.4.6-16/17), Teilzeit Tage/Stunden (v7.3.95-15, v7.4.9-1), ZA-Sortierung (v7.4.4-33), PM-Summen-Fix (v7.4.3-12), DB-Bereinigungen, Cockpit-Konzept. |
| v4.82 | 07.05.2026 | Session 37: ProjectDetailPage v7.4.4-55 (Zurueck=Dashboard). /v7/firma/projekte -> Redirect v7.3.90. BerichtePage v7.4.6-10 (Titel Dashboard). §3.11, §4.1/4.2, §5.51-5.53, §9.1 aktualisiert. |
| v4.81 | 06.05.2026 | Session 36 komplett. Arbeitszeitgrenzen Phase 3 (TimesheetForm v7.4.6-11 bis -14): harte Grenzen Monat+Tag, GF weich, Zellfaerbung, Druck-Sperre. Dashboard-Redesign Firma-Portal (PortalNav v7.4.4-13, BerichtePage v7.4.6-9, Redirect v7.3.43): integrierte Projektliste, neue Nav-Reihenfolge, MA-Redirect-Fix. Matrix+ZA: projectAssignments als Quelle. ROLE_OPTIONS auf 3 Werte. §7e vollstaendig. §9.1 aktualisiert. §12.1 Phase 3 gestrichen. §5 Fehler 5.45-5.50. |
| v4.80 | 06.05.2026 | Login PW-Toggle (v7.3.90-2). ProjectTeamManager v7.4.4-17. Neu §16 + §17. §12b Regeln 9+10. |
| v4.79 | 01.05.2026 | Backlog bereinigt: KPT-Umbenennung (MPT->KPT), Vercel-Preview-Entscheidung, Prio-Liste praezisiert
| v4.78 | 01.05.2026 | Session 35: TimesheetForm v7.4.6-5 bis -10 (6 Bugfixes: AP-Spalte, compareApCode, Fehlzeiten nonBillable, ArrowDown, offen negativ, Feiertag Wochenende). Firmenanlage v7.4.1-4/5/6 (Pflichtfeld, Doppel-Submit, RLS-Fix). create-user-route v7.4.1-1. EmployeeManagement v7.3.95-14 (Orphan-Badge). VETIS Arbeitsplan korrigiert. ALACsystems als 9. PROD-Firma angelegt. Session 34 (erstmals im Repo): Anleitungen v2.1/v2.2, v7_system_config, SystemConfigPanel, PortalNav v7.4.4-12, stabile Asset-URLs. |
| v4.76 | 28.04.2026 | Session 33: Mein-Status, Hilfe-Dropdown, BerichtePage, Foerderbetrag-Fix |
| v4.75 | 28.04.2026 | Session 32: ProjektFortschrittPanel iteriert |
| v4.74 | 24.04.2026 | Session 31: ProjektFortschrittPanel, BerichtePage Accordion, PortalNav |
| v4.73 | 24.04.2026 | Session 30: KPT, PortalNav kontextsensitiv, NWM PROD |
| v4.71 | 22.04.2026 | Session 26: AP-Dropdown-Filter, Matrix-Vorbelegung, PROD 8 Firmen |
| v4.70 | 21.04.2026 | Session 25: Teilzeit-Historie-UI |
| v4.69 | 21.04.2026 | Session 24: Arbeitszeitgrenzen Phase 1 |
| v4.68 | 20.04.2026 | Session 23: Feiertags-Utility zentralisiert |
| Aelter | bis 28.04.2026 | s. PH v4.76 |

---

## 14. Vercel-Setup - Entscheidung (Session 35)

Push auf `v7-dev` loest einen Vercel Preview-Build aus, der nie genutzt wird
(Tests laufen entweder auf localhost oder direkt auf pze.itenion.com).
Push auf `main` loest den Production-Deploy aus.

**Entscheidung:** Preview-Build fuer v7-dev wird deaktiviert (spart Build-Minuten,
kein funktionaler Verlust). Der manuelle main-Merge bleibt der bewusste PROD-Deploy-Schritt.

**Umsetzung:** Vercel Dashboard -> Projekt -> Settings -> Git -> "Ignored Build Step"
auf Branch `v7-dev` setzen, oder Branch-Filter fuer Production Only konfigurieren.

Status: Zu erledigen wenn Zeit ist, kein Prio-Backlog-Eintrag mehr.

---

## 15. Benutzeranleitungen (Stand Session 34)

| Dokument | Version | PDF-Pfad |
|----------|---------|----------|
| PZE-Anleitung-Projektleiter | v2.1 | /public/manuals/PZE_Anleitung_Projektleiter.pdf |
| PZE-Anleitung-Firmen-Administrator | v2.2.0 | /public/manuals/PZE_Anleitung_Firmen-Administrator.pdf |
| PZE-FAQ-Zeiterfassung | v1 | /public/manuals/PZE-FAQ-Zeiterfassung-v1.pdf |
| Berater-Portal Anleitung | fehlt | - |
| Mitarbeiter-Anleitung | nicht vorgesehen | nur FAQ |

Steuerung ueber manuals_enabled-Toggle in /v7/berater/admin.

---

**Ende des Pflichtenhefts v4.81**
**Letzte Aktualisierung: 6. Mai 2026**

---

## 12d. Dashboard-Redesign Firma-Portal (Session 36)

### Konzept

Das Firmen-Portal wurde von einem fragmentierten Multi-Seiten-Ansatz auf ein
zentrales Dashboard-Konzept umgestellt.

**Vorher:** Berichte | Meine Projekte | Mein Status | Meine Zeiterfassung | Mitarbeiter | Firmendaten

**Nachher:**
- Admin/PL: Dashboard (= Berichte + integrierte Projektliste) | Mein Status | Mitarbeiter | Firmendaten
- MA: Mein Status (einziger Einstiegspunkt)

### Integrierte Projektliste im Dashboard (BerichtePage v7.4.6-7+)

Die bisherige statische "Projekt-Uebersicht"-Tabelle wurde ersetzt durch eine
interaktive "Meine Projekte"-Sektion:
- Alle Projekte mit Laufzeit, Plan-PM, Ist-PM, Fortschrittsbalken
- Klick auf Zeile oder "Oeffnen"-Button -> direkt zu /v7/firma/projekte/[id]
- "+ Neues Projekt"-Button nur fuer client_admin sichtbar
- Separate "Projekte"-Seite weiterhin erreichbar via URL, aber kein Nav-Punkt mehr

### MA-Redirect-Logik (roleLoaded-Flag)

BerichtePage startet mit portalRole='employee' als Default. Ohne roleLoaded-Flag
wuerde ein sofortiger Redirect alle Nutzer (auch Admin) zu Mein Status schicken.
roleLoaded wird erst nach DB-Abfrage auf true gesetzt -> Redirect feuert nur bei
bestaetigter employee-Rolle.

### Startseiten-Routing

- /v7/firma -> redirect zu /v7/firma/berichte (v7.3.43)
- Admin/PL: landen auf Dashboard (/v7/firma/berichte)
- MA: werden von BerichtePage sofort zu /v7/firma/mein-status weitergeleitet

---

## 12e. Verhaltensvertrag kritischer Komponenten (Stand VERHALTENSVERTRAG v1.12)

Verbindlicher Inhalt des Verhaltensvertrags (seit Session 47 eine Quelle der Wahrheit, vgl. Paragraph 12b Regel 13). Bei der Konsolidierung des Pflichtenhefts (v5.54, 21.10.2026) vollstaendig aus VERHALTENSVERTRAG-v1_12.md uebernommen; die bisherige Fassung aus Session 47 und die Fortschreibungen der Aenderungsbloecke v5.40 bis v5.54 sind darin enthalten. Abschnittsnummern 12e.1 bis 12e.7 bleiben fuer bestehende Verweise erhalten; spaeter hinzugekommene Vertraege tragen 12e.3a, 12e.5a und 12e.8 bis 12e.11.

**Versionshinweis:** Versionsnummern der Komponenten sind bewusst NICHT eingebacken. Die jeweils aktuelle Datei-Version steht in Paragraph 4.

### Grundprinzip

Jede kritische Komponente hat einen **Verhaltensvertrag**: eine Liste von Funktionen
die IMMER korrekt arbeiten muessen. Vor jeder Aenderung wird diese Liste gemeinsam
durchgegangen. Nach der Aenderung wird sie als Smoke-Test abgearbeitet.

**Ablauf bei jeder Code-Aenderung:**

```
1. Martin beschreibt Anforderung/Problem
2. Claude identifiziert betroffene Datei(en)
3. Claude prueft Verhaltensvertrag der betroffenen Komponente(n)
4. Claude praesentiert Plan + explizite Liste:
   "Diese Verhaltensweisen bleiben intakt: [Liste]"
5. Martin gibt GO
6. Claude implementiert (chirurgisch, nur betroffene Zeilen)
7. Smoke-Test auf DEV (localhost:3000) gegen Verhaltensvertrag
8. Erst nach erfolgreichem DEV-Test: Deploy auf PROD
```


### 12e.1 TimesheetForm

**Datei:** src/components/shared/TimesheetForm.tsx
**Genutzt in:** Berater-Portal + Firma-Portal (Zeiterfassung)

#### Funktionen die IMMER korrekt arbeiten muessen:

| Nr | Funktion | Pruefung |
|----|----------|----------|
| TF-01 | AP-Auswahl per Dropdown | Zugeordnete + Weitere AP sichtbar, sortiert nach ap_code |
| TF-02 | Stundeneingabe in Tageszellen | Wert eingeben, Tab/Enter/Pfeiltasten navigieren |
| TF-03 | Speichern + Laden | Speichern, Seite neu laden, Werte identisch |
| TF-04 | Feiertage in S-Zeile | Werktags-Feiertage automatisch mit Tagesstunden vorbelegt. **Ausnahme (v1.2): an Elternzeit-Tagen (Code E) KEINE Vorbelegung** - ohne Entgeltfortzahlung keine bezahlten Feiertagsstunden |
| TF-05 | Fehlzeiten U/K/S editierbar | Tageszellen frei editierbar, Summen korrekt. **Ausnahme (v1.2): an Elternzeit-Tagen (Code E) ist in den Zeilen U, K und S bewusst KEIN Eingabefeld vorhanden** (ein Tag ist entweder Elternzeit oder Fehlzeit); die Zelle ist hellblau und traegt einen Hinweistext |
| TF-06 | Wochenende/Feiertag Hintergrund | Sa/So grau, Feiertage orange |
| TF-07 | Summenberechnung | Zeilensumme (S), Tagessumme, Gesamtsumme korrekt. E-Tage tragen 0 Stunden und erscheinen in keiner Stundensumme |
| TF-08 | Monatsabschluss | Button setzt/entfernt Completion-Flag. **Neu (v1.4): vor dem Setzen wird IMMER gespeichert (auch ohne manuelle Aenderung), damit die Auto-Vorbelegung "sonstige Arbeiten" (TF-12) in der DB steht. Ein abgeschlossener Monat fuehrt keine Auto-Vorbelegung mehr aus** |
| TF-09 | Arbeitszeitgrenzen | Tagesgrenze 9h (hart), Monatsgrenze (weich), Zellfaerbung. Massgebliche Wochenarbeitszeit: Teilzeit-Historie -> v7_employees.weekly_hours -> Firmenstandard; die projektbezogene pWAZ ist KEINE Quelle (v1.2) |
| TF-10 | Kumulierte Stunden (Arbeitsplan) | offen-Spalte zeigt verbleibende Stunden pro AP |
| TF-11 | Druck/PDF | AP-Name vollstaendig, AP-Nummer sichtbar, Layout A4 Querformat. **Neu (v1.10): vorgeschlagener PDF-Dateiname "<Nachname><Vorname>_<FKZ>_Stundennachweis_<YYMM>"** (Bsp. "DuhrkopThomas_..."): Nachname und Vorname je erstes Wort, ASCII-gewandelt, ohne Trenner. Ohne Vorname nur der Nachname, ohne Nachname "<FKZ>_Stundennachweis_<YYMM>". Kein .pdf im document.title |
| TF-12 | Nicht-zuschussfaehige Arbeiten | Sonstige-Zeile, nicht in Summe (2). **Neu gefasst in v1.12 (Entscheidung Martin 20.10.2026, ersetzt die Differenzregel aus v1.2):** Auto-Vorbelegung je reinem Arbeitstag nach drei Faellen: (a) Stunden in DIESEM oder einem ANDEREN Projekt > 0 -> keine Vorbelegung, die Zelle wird geleert (auch Altwerte; eine Eingabe von Hand an solchen Tagen wird sofort wieder geleert). (b) Abwesenheitstag -> leer (unveraendert). (c) Leerer Arbeitstag -> volle Tagesarbeitszeit, aber nur, wenn das Wochen-Restbudget (Wochendeckel) dafuer reicht; sonst leer. Der Wert ist damit entweder 0 oder eine volle Tagesarbeitszeit, nie ein Rest (Beispiel: 30-h-MA an 4 Tagen, 5. Tag bleibt leer). Wochenenden, Feiertage, gesperrte Tage, Kurzarbeit und abgeschlossene Monate bleiben von der Auto-Vorbelegung unberuehrt; dort eingetragene Werte bleiben erhalten. Kein Speicher-Hinweis mehr auf "Luecken"-Tage |
| TF-13 | Durchfuehrbarkeitsstudie (DS) | T/NT-Spalte bei ZIM_DS-Projekten |
| TF-14 | Mehrere AP-Zeilen | Dynamisches Hinzufuegen, max. 4 initial |
| TF-15 | **Elternzeit (Code E), neu in v1.2** | E-Tage werden angezeigt (eigene Zeile mit Tageszahl), sperren den Tag vollstaendig (Projekt, sonstige, U/K/S) und ueberleben jedes Speichern des Monats. Erfassung und Ruecknahme ausschliesslich ueber den Bereichsdialog (Rechtsklick oder Eingabe "E"), nur fuer Berater und Firmen-Administrator. Der Monats-Abgleich beim Speichern darf E-Zeilen NIE deaktivieren |
| TF-16 | **Projektstunden nur im Bewilligungszeitraum, neu in v1.5** | Tage vor Beginn bzw. nach Ende des erlaubten Zeitraums (Minimum aus employment_end, assignment_end, project.end_date; symmetrisch fuer den Beginn) sind in den **AP-Zeilen** grau und nicht bebuchbar, mit Tooltip. Die Grenze ist TAGGENAU (dayLimits/isProjectDayAllowed), nicht monatsweise. Der Monat behaelt seine volle Spaltenzahl. **Bewusst offen bleiben** die Zeile "sonstige Arbeiten", Fehlzeiten U/K/S, Rechtsklick-Menue und Auto-Vorbelegung: der Stundennachweis ist ein Monatsnachweis der gesamten Arbeitszeit. Bereits erfasste Projektstunden ausserhalb bleiben sichtbar und werden beim Speichern nicht geloescht |
| TF-17 | **Direktlinks ZA und VN, neu in v1.11** | Knopf "ZA" (beide Portale, seit v7.4.6-62) und rechts daneben "VN" (nur Berater-Portal, nur ZIM_EINZEL/ZIM_KOOP/ZIM/ZIM_DS/ZIM_NETZWERK). Beide laufen ueber checkUnsavedChanges und geben die aktuelle URL als Ruecksprung mit (ZA: returnTo, VN: returnUrl); "Zurueck" am Ziel fuehrt in denselben Monat und MA |

#### Besonders fragile Bereiche (erhoehte Vorsicht):

- **loadTimeEntries-Funktion:** Laed AP-Eintraege, Fehlzeiten, Feiertage, sonstige Arbeiten
  und (ab V7.9.7) Elternzeit-Tage. Aenderungen hier koennen TF-01 bis TF-07 und TF-15
  gleichzeitig brechen.
- **Monats-Abgleich der Abwesenheiten beim Speichern:** Deaktiviert jede aktive Zeile des
  Monats, die nicht im Soll-Stand steht. Der Soll-Stand kennt nur U/K/S - die Ist-Abfrage
  MUSS deshalb auf `absence_code IN ('U','K','S')` gefiltert bleiben, sonst verschwinden
  Elternzeit-Zeitraeume beim naechsten Speichern (TF-15).
- **Auto-Vorbelegung setzt hasChanges nicht (neu v1.4):** Die vorbelegten Werte stehen
  nur im State, "Speichern" bleibt grau. Wer den Speicherzwang vor dem Abschluss (TF-08)
  wieder an hasChanges koppelt, erzeugt erneut leer abgeschlossene Monate (Fall
  Duehrkop/AURA Juli 2026, Session 85).
- **Auto-Vorbelegung "sonstige Arbeiten":** Wochendeckel bleibt, der Tagesspielraum
  entfaellt (v1.12: nur leere Tage, nur volle Tagesarbeitszeit). Wer hier eine zweite
  Berechnungsformel einfuehrt (z.B. beim Laden), erzeugt Divergenzen - genau das war die
  Ursache des Einfrierens vor V7.9.7 (TF-12). Die DB unterscheidet nicht zwischen
  automatisch und von Hand eingetragenen Werten (nonBillableManual wird beim Laden nicht
  mehr abgeleitet); deshalb leert die Regel (a) an Projekttagen JEDEN Wert.
- **Wirkung der Auto-Vorbelegung nach aussen (neu v1.3, angepasst v1.12):** Die
  vorbelegten Zeilen (ohne AP, `is_billable = false`) stehen seit V7.9.20 nur noch an
  gespeicherten Arbeitstagen ohne Projektstunden; Altbestand (vor V7.9.20 gespeichert,
  Monat danach nicht wieder gespeichert oder abgeschlossen) traegt sie weiter an jedem
  Arbeitstag. Jede Auswertung ausserhalb des TimesheetForm, die "gefoerderte" Stunden
  zaehlt, muss auf `is_billable = true` filtern (IF-10; Ursache von A-068).
- **Print-Styles (@media print):** Aenderungen an Screen-CSS koennen Print-Layout zerstoeren.
  IMMER Druckvorschau pruefen nach CSS-Aenderungen.
- **pointer-events auf gesperrten Zellen:** Ein disabled-Input ohne `pointer-events-none`
  verschluckt den Rechtsklick; das Kontextmenue ist dann nicht erreichbar.
- **useEffect-Dependencies:** Fehlende Dependencies = veraltete Daten. Zu viele = Endlos-Loop.
- **Reichweite der Sperre TF-16 (neu v1.5):** Gesperrt wird die Erfassung FOERDERBARER
  Projektstunden, nicht der Tag. Ein erster Entwurf (-99, verworfen) sperrte auch die Zeile
  "sonstige Arbeiten", U/K/S und die Auto-Vorbelegung - fachlich falsch: wer am 31.08.
  gearbeitet hat, aber nicht mehr am Projekt, gehoert mit nicht foerderbarer Zeit in den
  Monatsnachweis. Die Tastaturnavigation ueberspringt gesperrte Tage nur bei
  `type === 'ap'`.
- **Speichern schreibt den ganzen Monat neu (neu v1.5):** handleSave aktualisiert JEDE
  Buchung des Monats (neues updated_at) und deaktiviert alles, was im Formular nicht mehr
  steht. Folge: updated_at ist als Beweismittel fuer Aenderungen weitgehend wertlos (Fall
  ANOVIA 19.09.2026, rund 80 Zeilen in 31 Sekunden). Wer die Lade- oder Loeschabfrage auf
  ein kleineres Fenster kappt als die Anzeige, loescht Daten stillschweigend.
- **Leeren von Projektstunden loest die Auto-Vorbelegung aus (neu v1.5, angepasst
  v1.12):** Wird an einem reinen Arbeitstag die LETZTE Projektbuchung geleert, ist der Tag
  leer und TF-12 fuellt ihn sofort mit einer vollen Tagesarbeitszeit "sonstige Arbeiten"
  (sofern das Wochenbudget reicht). Bleibt eine Projektbuchung stehen, bleibt die Zeile
  leer. Ueberrascht bei Bereinigungen (ANOVIA 31.08.2026 vor V7.9.20: 8,0 / 6,0 / 2,4 h).


### 12e.2 BerichtePage

**Datei:** src/components/shared/BerichtePage.tsx
**Genutzt in:** Berater-Portal + Firma-Portal (Dashboard/Berichte)

| Nr | Funktion | Pruefung |
|----|----------|----------|
| BP-01 | Zeiterfassungs-Status Tabelle | Erfasst(h) pro MA identisch mit Arbeitsplan "davon erfasst" |
| BP-02 | ProjektFortschrittPanel | Monatsverlauf-Chart: alle Monate vollstaendig, Ist-Balken plausibel |
| BP-03 | Stundennachweis-Matrix | Monatsstatus gemaess MS-01..05 (Abschnitt 4a): dunkelgruen=abgeschlossen, hellgruen=erfasst, orange=teilweise, rot=fehlt, grau=Zukunft/ausserhalb |
| BP-04 | Timesheet-Daten vollstaendig | Alle Eintraege geladen (.limit(10000), keine Abschneidung) |
| BP-05 | Projekt-Auswahl | Dropdown filtert korrekt auf ausgewaehltes Projekt |
| BP-06 | MA-Stundensaetze | Korrekte Berechnung aus Gehaltsdaten (Anlage 6.1); Nenner ist die pWAZ des Projekts, NICHT der MA-Stammsatz (v1.2) |
| BP-07 | Excel-Export | Vollstaendige Daten, korrekte Formatierung |
| BP-08 | Meine Projekte (Firma) | Klickbare Projektliste im Dashboard |

#### Besonders fragile Bereiche:

- **Timesheet-Query:** Muss .limit(10000) haben UND Supabase Max Rows >= 10000.
- **timesheets State:** Wird an ProjektFortschrittPanel, ZE-Status und Matrix weitergereicht.


### 12e.3 FirmaCockpit

**Datei:** src/components/shared/FirmaCockpit.tsx

| Nr | Funktion | Pruefung |
|----|----------|----------|
| FC-01 | Firmendaten-Anzeige | Name, Kontakt, Bundesland korrekt |
| FC-02 | Projektliste | Alle aktiven Projekte mit Laufzeit, PM%, Kosten% |
| FC-03 | Monatsverlauf-Chart | Identisch mit BerichtePage (gleiche Datenquelle) |
| FC-04 | Zahlungsanforderungen | ZA-Liste mit Abrechnungszeitraum (neu v1.5, TT.MM.JJ-TT.MM.JJ), Betraegen, Einreichdatum. Darunter Vollstaendigkeitspruefung (neu v1.5): Luecken, Ueberlappungen, Nummernspruenge, fehlende Zeitraeume, nicht abgedeckter Projektbeginn/-ende - nur sichtbar, wenn es Befunde gibt. Spaltenaufteilung 2/5/5. **v1.7:** Betrag = Summe der Zahlungen aus v7_za_zahlungen je ZA-Nummer, Zahlung = juengstes Datum; bei mehreren Zahlungen oder Sammelueberweisungs-Anteil "(n)" und Popup mit Einzelzahlungen. Kopf der Karte: "+ Neue ZA \| Archiv" (Archiv oeffnet die ZA-Seite mit ?tab=archiv). Kommentar-Popup (16 px) |
| FC-05 | Mitarbeiter-Modal | Neuer MA, MA bearbeiten, PW-Reset |
| FC-06 | Navigation | PortalNav korrekt, returnTo funktioniert |
| FC-07 | Timesheet-Daten vollstaendig | .limit(10000), keine Abschneidung |

#### Besonders fragile Bereiche (neu v1.3):

- **Eigene Kopie des Monatsverlaufs:** Das Cockpit bindet das Diagramm NICHT aus dem
  ProjektFortschrittPanel ein, sondern haelt eine eigene Implementierung. Jede Aenderung
  am Monatsverlauf ist in beiden Dateien vorzunehmen (IF-09). In V7.9.9 wurde die
  Cockpit-Kopie zunaechst uebersehen und zeigte weiter die alten Linien (A-064).


### 12e.3a Monatsstatus: Stundennachweis-Matrix und Mein Status (neu in v1.4)

**Dateien:**
- src/components/shared/StundennachweisMatrix.tsx
- src/app/v7/firma/mein-status/page.tsx

Beide Dateien halten die Statuslogik je in einer eigenen Kopie. Jede Aenderung ist in
BEIDEN vorzunehmen.

| Nr | Funktion | Pruefung |
|----|----------|----------|
| MS-01 | Abgeschlossen | Dunkelgruen NUR bei Eintrag in v7_timesheet_completions (Button "Monat abschliessen"). Keine automatische Wertung erzeugt diesen Status |
| MS-02 | Erfasst | Hellgruen, wenn Monat vergangen UND alle Netto-Werktage einen Eintrag haben UND foerderbare Stunden (is_billable = true) > 0. Nur "sonstige Arbeiten" ohne foerderbare Stunden -> orange |
| MS-03 | Laufender Monat | Wird nie automatisch gruen oder hellgruen (vorbelegte Tage bis Monatsende). Orange bei Eintraegen, rot ohne |
| MS-04 | Tagesabdeckung | Gezaehlt werden nur Tage Mo-Fr ohne Feiertag mit Eintrag > 0; Vergleich gegen Netto-Werktage. Feiertage werden NICHT zusaetzlich addiert. Wochenend-/Feiertagseintraege gleichen keine Luecke aus |
| MS-05 | Abwesenheiten | Zentrale Abwesenheiten (v7_employee_absences ueber loadEmployeeAbsencesAsTimesheets, Zuordnungsfenster des Projekts) zaehlen fuer Tagesabdeckung und Stundensumme mit; die angezeigte Zahl (Matrix) bleibt foerderbare Stunden |
| MS-06 | **Bedienleiste, neu in v1.9** | Aktionen stehen gemeinsam in der Bedienleiste: Sammeldruck, AP-Status, Zahlungsanforderung. Die Kopfzeile traegt nur Projektangaben (Name, Foerderkennzeichen, Foerderformat) und die Legende. "Zahlungsanforderung" oeffnet die ZA des aktiven Projekts (goToZA, returnTo = aktuelle URL), "Zurueck" in der ZA fuehrt wieder auf die Matrix. Im Sammeldruck-Modus sind AP-Status und Zahlungsanforderung ausgeblendet. **v1.11:** rechts daneben "Verwendungsnachweis" (nur Berater-Portal, VN-faehige Formate, returnUrl = aktuelle URL). "Zurueck" der Matrix-Seite honoriert ?returnUrl= (Pfad mit "/"): aus ZA oder VN kommend fuehrt es dorthin, sonst ins Firma-Cockpit |

#### Besonders fragile Bereiche:

- **Zwei Kopien der Statuslogik** (Matrix und Mein Status); Mein Status hat zudem eine
  eigene Feiertagsfunktion ohne holiday_region.
- **Soll-Arbeitstage sind netto:** countWorkdaysInMonth bzw. getWorkingDaysInMonth
  ziehen Feiertage bereits ab (Ursache des Doppelzaehlens vor V7.9.12).
- **Sammeldruck** der Matrix laedt Abwesenheiten separat; nicht mit dem Status-State
  vermischen.
- **Dateiname des Sammeldrucks (neu v1.10):** eigene Kopie des Schemas aus dem
  TimesheetForm (IF-17). Ein MA: "<Nachname><Vorname>_<FKZ>_Stundennachweis_<Zeitraum>",
  mehrere MA: "<FKZ>_Stundennachweis_<Zeitraum>" ohne Namensteil. Zeitraum YYMM bzw.
  YYMM-YYMM.


### 12e.4 ProjektFortschrittPanel

**Datei:** src/components/shared/ProjektFortschrittPanel.tsx

| Nr | Funktion | Pruefung |
|----|----------|----------|
| PF-01 | Laufzeit/PM/Kosten KPIs | Prozent und Absolutwerte korrekt |
| PF-02 | Monatsverlauf-Chart | Ist vs. Soll pro Monat, kumulierte Linien |
| PF-03 | Prognose | Gestrichelte Linie basierend auf letzten 3 Monaten |
| PF-04 | Zielerreichungs-Prognose | Erreichbar/Gefaehrdet/Kritisch korrekt berechnet |
| PF-05 | PM je Mitarbeiter (Plan vs. Ist) | Balkendiagramm pro MA |
| PF-06 | Personalkosten je MA | Balkendiagramm basierend auf Stundensaetzen |
| PF-07 | Drucken/PDF | Chart + KPIs auf einer A4-Seite |
| PF-08 | NWM-Jahresselektor | Dropdown "Netzwerkjahr" bei ZIM_NETZWERK; Fortschritt und Prognose auf den gewaehlten Foerderzeitraum eingeschraenkt; "Gesamtverlauf" = bisheriges Verhalten |
| PF-09 | **Gemeinsamer Bezugsrahmen der Foerderkennzahlen, neu in v1.3** | Kennzahlen, die gegeneinander gelesen werden (Erreichungsgrad in Prozent, Verschenkt in EUR), haben denselben Massstab. "Verschenkt" misst gegen das bei voller Planerfuellung Abrufbare (min(Plankosten x Foerdersatz, bewilligte Summe)); bei 100 Prozent Erreichungsgrad ist Verschenkt 0 EUR. Eine Differenz zwischen Bewilligung und Arbeitsplan erscheint nur im Block "Planungsluecke im Arbeitsplan" (A-063) |

#### Hinweis (Refactor projektfortschritt-utils, Session 47 Punkt 3):

PF-02, PF-03 und PF-04 muessen nach einem Refactor rechnerisch bit-genau identische
Ergebnisse liefern. Vergleichswerte vorher festhalten.

#### Hinweis (neu v1.3):

Die Diagramm-Implementierung existiert ein zweites Mal im FirmaCockpit (Abschnitt 4,
IF-09). Ein Deckel oder Massstab, der nur in einer von zwei gegeneinander gelesenen
Groessen wirkt, erzeugt fachlich nicht aufloesbare Widersprueche (PF-09).


### 12e.5 ZAPanel (Zahlungsanforderung)

**Datei:** src/components/shared/ZAPanel.tsx

| Nr | Funktion | Pruefung |
|----|----------|----------|
| ZA-01 | Status-Automatik | Status per calcStatus aus Datumsfeldern; keine manuellen Status-Buttons |
| ZA-02 | Einreichdatum editierbar | eingereicht_am editierbar; Setzen schaltet Status auf Eingereicht |
| ZA-03 | Seiten und Archiv (v1.7) | Seiten einer ZA: Deckblatt / Anlage 1a / Anlage 1b. Archiv = Uebersicht aller ZA, oben rechts in der Reihe "ZA 1 \| ... \| + Neue ZA \| Archiv", hervorgehoben wenn offen; Klick auf ZA, "+ Neue ZA" oder Seite fuehrt zurueck. Drucken nur fuer eine ZA. initialTab aus der ZASeite ueber den URL-Parameter tab (v1.9: deckblatt, anlage1a, anlage1b, archiv; ohne Parameter Deckblatt) |
| ZA-04 | Zahlungseingaenge (v1.7) | Quelle v7_za_zahlungen, Zahlung haengt an (project_id, za_nummer). Standard: eine Zahlung in der Archivzeile (Datum + Betrag > 0), leeren + Sichern entfernt sie weich. "+ weitere Zahlung" oeffnet die Liste; ab 2 Zahlungen Summe "(n)" und juengstes Datum. Betragseingabe per parseBetrag (v1.8: Punkte werden immer ignoriert, nur das Komma trennt Dezimalen; "35.235" = 35.235,00). Gespeicherte Betraege im Feld als Waehrung ("55.329,00"). Anmerkung per Popup lesbar |
| ZA-05 | Foerderbetrag-Persistenz (korrigiert v1.7) | Beim Sichern einer Zahlung wird foerderbetrag_gesamt NUR gespeichert, wenn er leer ist. Ein gespeicherter Betrag bleibt unveraendert und ist Massstab fuer calcStatus. Neu berechnet wird er nur bewusst ueber "ZA speichern" im Deckblatt |
| ZA-06 | Historische Werte | Archiv zeigt gespeicherten Foerderbetrag, keine Neuberechnung |
| ZA-07 | ZA loeschen (v1.7) | Nur im Archiv. Eingereichte ZA nur nach Eingabe der ZA-Nummer (window.prompt), Entwurf mit einfacher Rueckfrage. Zahlungen der Nummer werden deaktiviert, wenn keine weitere Zeile dieser Nummer bleibt |
| ZA-08 | Status-Rollback | "Zurueck zu Eingereicht" und "Zurueck zu Entwurf" verfuegbar |
| ZA-09 | Netzwerk-Modus | isNetzwerk bei ZIM_NETZWERK; NWM-Kostenfelder; Laufzeitjahr aus bewilligung_datum |
| ZA-10 | DB-Felder ohne Props (Option B) | bewilligung_datum, bewilligte_summe direkt aus DB (ProjectDetailPage frozen) |
| ZA-11 | Status-Badge-Farben | grau=Entwurf, blau=Eingereicht, gruen=Bewilligt/Zahlung |
| ZA-12 | FZ-basierte Foerderquote (NWM) | Foerderquote aus v7_nwm_foerderzeitraeume (Abgleich zeitraum_bis), Badge "aus FZ-Tabelle"/"Fallback"; bei FZ-Grenzueberschreitung rote Meldung und Speichersperre |
| ZA-13 | **Taggenaue Abrechnung, neu in v1.5** | Stunden werden ueber abrechnungsFenster()/istImFenster() aus `@/lib/verwendungsnachweis-utils` gefiltert: Schnitt aus ZA-Zeitraum und Bewilligungszeitraum (project.start_date/end_date), ISO-String-Vergleich. Die Monatsspalten der Anlage 1a bleiben, zeigen aber nur Stunden im Fenster. Test ANOVIA ZA 4 (01.07.-30.08.2026): 573,00 h T / 22,00 h NT |
| ZA-14 | **Foerderbetrag auf GANZE EURO, korrigiert in v1.6** | antZuwendung, computeArchivFoerderbetrag (beide Zweige), nwmFoerderbetrag: kaufmaennisch auf ganze Euro ueber roundEuro() aus der Lib (erst round2 gegen Gleitkomma-Rauschen, dann Math.round). Grund: das Originalformular der ZA weist die angeforderte Zuwendung in vollen Euro aus (ANOVIA ZA 1: 8.274,63 -> 8.275). Die Centrundung aus v1.5 war falsch. Die Kostenzeilen bleiben centgenau |
| ZA-15 | **Sammelueberweisung, neu in v1.7** | Knopf "Sammelueberweisung erfassen" im Archiv: Datum, Gesamtbetrag, Referenz (Vorschlag "Ueberw. TT.MM.JJ"), Aufteilung nur auf eingereichte ZA. Speichern nur bei Rest 0,00 (Cent-genau). Jeder Anteil = eine Zahlung mit gleichem Datum und gleicher Referenz |
| ZA-17 | **Sicherungen eingereichter ZA, neu in v1.8** | "ZA speichern" bei eingereichter ZA: Rueckfrage, wenn sich Nummer oder Zeitraum aendern, und Rueckfrage, wenn der neu berechnete Betrag vom gespeicherten abweicht. Abbrechen: nichts speichern, gespeicherten Stand wieder laden (loadZAIntoForm) |
| ZA-16 | **Zahlungen nur bei eingereichten ZA, neu in v1.7** | Entwurf: "erst nach Einreichung", kein Sichern, keine Neue-Zahlung-Zeile. Eine bereits vorhandene Zahlung bleibt sichtbar und entfernbar |
| ZA-18 | **Direktspruenge aus der ZA, neu in v1.9** | Nur Berater-Portal (ZASeite setzt die Props onNavigateToZE / onNavigateToMatrix nur dort). Anlage 1a: Klick auf einen Monat oder dessen Stundenzelle oeffnet die Stundenerfassung dieses MA, Monats und Projekts; "Zurueck" dort fuehrt auf DIESELBE ZA und DENSELBEN Tab. Knopf "Stundennachweis-Matrix" links neben "Drucken" oeffnet die Matrix des Projekts. Ungespeicherte Aenderungen: vorhandener Dialog (checkUnsavedChanges). Nie gespeicherte ZA (zaSelectedId leer): Sprung zur Stundenerfassung gesperrt mit Hinweis; der Sprung zur Matrix bleibt moeglich. Ohne Props (Firma-Portal, BerichtePage) keine Klickflaechen und kein Knopf. Ausdruck der Anlage 1a unveraendert. **v1.11:** Der Sprung zur Matrix traegt returnUrl -> "Zurueck" in der Matrix fuehrt auf dieselbe ZA und denselben Tab (A-097). Neuer Knopf "Verwendungsnachweis" links neben "Stundennachweis-Matrix" (Prop onNavigateToVN, nur VN-faehige Formate); "Zurueck" im VN fuehrt auf dieselbe ZA und denselben Tab |
| ZA-19 | **Speichern behaelt die ZA, neu in v1.11** | Nach "ZA speichern" laedt openPanel(projectId, gespeicherteId) die frische Liste und danach GENAU die gespeicherte ZA ins Formular (bestehende: zaSelectedId; neue: ID aus dem INSERT). Kein Neu-Entwurf mehr nach dem Speichern; eine weitere ZA nur ueber "+ Neue ZA". Erneutes Speichern aktualisiert dieselbe Zeile. INSERT-Fehler wird gemeldet |

#### Besonders fragile Bereiche:

- **calcStatus():** Eine Aenderung kann ZA-01 und ZA-08 gleichzeitig brechen.
- **foerderbetrag_gesamt-Persistenz (korrigiert v1.7):** beim Sichern einer Zahlung NIE
  einen gespeicherten Betrag ueberschreiben. Die fruehere Regel "immer neu berechnen"
  (v7.4.4-41) hat in DEV eingereichte Betraege veraendert (HEATS 26.387,72 -> 24.218).
- **openPanel und Auto-Select (neu v1.8, Ursache A-092):** Kein await zwischen
  setZAList und der Formular-Vorbelegung. openPanel traegt eine Laufnummer
  (openSeqRef); nur der zuletzt gestartete Lauf setzt State. Sonst ueberschreibt die
  Vorbelegung die per Auto-Select geladene ZA, waehrend sie markiert bleibt - "ZA
  speichern" schreibt dann den Neu-Entwurf in die alte Zeile (PROD AURA, 22.09.2026).
  Test immer ueber den ERSTEN Aufruf (Deep-Link aus dem Cockpit).
  **v1.11 (keepZaId):** openPanel hat einen zweiten, optionalen Parameter. Ist er
  gesetzt, wird die ZA aus der FRISCH geladenen Liste per loadZAIntoForm geladen statt
  der Neu-Vorbelegung - im selben synchronen Block nach der Laufnummern-Pruefung, ohne
  await dazwischen. Nur handleSave uebergibt ihn. Erstladen, Projektwechsel und
  "+ Neue ZA" rufen openPanel OHNE keepZaId auf und muessen das auch weiterhin tun -
  sonst entsteht nach "+ Neue ZA" kein Neu-Entwurf. Test nach jeder Aenderung: bestehende
  ZA speichern (bleibt), "+ Neue ZA" speichern (bleibt in der neuen, alte im Archiv
  unveraendert), erneut speichern (keine dritte ZA).
- **Zahlung an der Nummer, nicht an der Zeile (neu v1.7):** Etappe 3 (Korrekturen) legt
  mehrere Zeilen je Nummer an; Summen und Loeschlogik muessen das beruecksichtigen.
- **Zahlungsentfernen vs. ZA-Loeschen (neu v1.7):** unterschiedliche Optik (grau vs. rot)
  und Huerde (ZA-Nummer) beibehalten - Verwechslung fuehrte in DEV zum Loeschen einer ZA.
- **Ruecksprung-Kette ZA <-> Stundenerfassung (neu v1.9):** Die ZASeite traegt im Link
  zurueck auf die ZA nur den URSPRUNG weiter (zaUrsprung: Matrix-URL oder Sentinel
  'cockpit'), nicht das ganze returnTo. Wer returnTo ungekuerzt verschachtelt, laesst
  die URL bei jedem Wechsel ZA -> Stundenerfassung -> ZA wachsen (mehrfach kodierte
  Parameter). Der Link traegt immer projektId, zaId und tab; der Ruecksprung nutzt
  denselben Weg wie der Deep-Link aus dem Cockpit (initialZaId, Auto-Select) - openPanel
  bleibt dafuer unveraendert.
  **v1.11:** Dieselbe Logik existiert zweimal: zaUrsprung (ZASeite) und vnUrsprung
  (VerwendungsnachweisSeite). Beide ueberspringen Stundenerfassung (returnUrl), ZA
  (returnTo) und VN (returnUrl/returnTo); die Matrix ist ein echter Ursprung und wird
  nicht uebersprungen. Kommt ein neuer Durchreich-Seitentyp hinzu, BEIDE Funktionen
  anpassen (IF-18). Parameternamen beachten: ZA liest projektId/returnTo, VN, Matrix
  und Stundenerfassung lesen projekt/returnUrl.
- **Klickflaechen im Druckbereich (neu v1.9):** handlePrint druckt das innerHTML von
  #za-print-area. Zellen der Anlage 1a tragen deshalb nur cursor-/hover-Klassen und ein
  title-Attribut; Hinweistexte und Knoepfe liegen AUSSERHALB von #za-print-area. Farben
  oder Unterstreichungen, die ohne hover gelten, wuerden mitgedruckt.
- **Option-B-DB-Load:** ProjectDetailPage darf NICHT geaendert werden (TS-1 frozen).
- **Deep-Link aus dem Cockpit:** muss ZA-01 bis ZA-14 unveraendert erhalten.
- **Abrechnungsfenster nur aus der Lib (neu v1.5):** ZAPanel und Verwendungsnachweis
  importieren dieselben Helfer. Eine lokale Kopie der Logik in einer der beiden Dateien
  laesst ZA und VN erneut auseinanderlaufen - genau das war die Ursache der
  Monatslogik-Abweichung (390,42 EUR bei ANOVIA ZA 4).
- **Gespeicherter foerderbetrag_gesamt veraltet (neu v1.5):** computeArchivFoerderbetrag
  gibt einen vorhandenen Wert unveraendert zurueck. Nach einer Aenderung an Stunden,
  Saetzen oder Rechenlogik aktualisiert sich der Wert erst, wenn die ZA aktiv gespeichert
  wird.


### 12e.5a Verwendungsnachweis (neu in v1.5)

**Dateien:** src/lib/verwendungsnachweis-utils.ts,
src/components/shared/VerwendungsnachweisPanel.tsx

| Nr | Funktion | Pruefung |
|----|----------|----------|
| VN-01 | Abschnitt A taggenau | Kosten je ZA ueber computeDSPersonalkosten mit abrechnungsFenster(); identische Abgrenzung wie ZAPanel (ZA-13) |
| VN-02 | Zuwendung aus A | DS/EP: Zuwendung gesamt = round2(Foerdersatz x Summe A). NICHT die Summe der gespeicherten foerderbetrag_gesamt - das sind Anforderungen, nicht der Anspruch |
| VN-03 | Eigenanteil als Residuum | Eigenanteil = Summe A - Zuwendung gesamt. Kontrollzeile "Summe der Finanzierung" = Zuwendung + Eigenanteil, muss Summe A sein; Abweichung wird rot markiert |
| VN-04 | Schlusszahlung | Zuwendung gesamt - bisher erhaltene Zuwendungen; negativ = Rueckforderung, eigene Warnung. **v1.7:** erhalten = Summe aus v7_za_zahlungen je ZA-Nummer (Panel befuellt das Feld zahlungseingang_betrag der VN-Struktur, Lib unveraendert) |
| VN-05 | Abweichungswarnung mit Toleranz | Warnung, wenn Summe der ZA-Anforderungen vom Anspruch abweicht, erst ueber Anzahl ZA x 0,50 + 0,005 EUR (v1.6: jede ZA ist auf ganze Euro gerundet, der Anspruch auf Cent). Schwelle als finanzierung.abweichungRelevant aus der Lib, nicht in der Anzeige nachbauen |
| VN-06 | Abschnitt C Personenstunden | Kumuliert je MA (technisch/nichttechnisch/Summe), sortiert nach employee_number, gleiche Filterung wie A. Test ANOVIA: 1.353,00 / 473,33 / 1.826,33 h |
| VN-07 | NWM-Ausnahme | NW_PH1/NW_PH2 behalten die Summe der ZA-Betraege als Zuwendung (fallende Jahressaetze) und den Eigenanteil des Netzwerkpartners |
| VN-08 | **Berichtszeitraum aus Projektdaten, neu in v1.6** | Berichtszeitraum = project.start_date bis project.end_date, nicht editierbar. Der Zeitraum eines gespeicherten VN dient nur dem Vergleich: weicht er ab (z. B. nach Korrektur des Projektendes), erscheint "bitte neu speichern". Jede ZA, die den Berichtszeitraum BERUEHRT, wird aufgenommen und taggenau gekappt; ragt sie hinaus, erscheint eine Warnung |
| VN-09 | **Bewilligte Zuwendung und Ausschoepfung, neu in v1.11** | Kopf: "Bewilligte Zuwendung" aus projects.bewilligte_summe (rechte Spalte, unter Foerdersatz). Zeile "Ausschoepfung der bewilligten Zuwendung" nur bei bewilligte_summe > 0: Anspruch lt. VN (= finanzierung.gesamtZuwendung) und angefordert lt. ZA (= finanzierung.angefordertLautZa) je in EUR und Prozent der Bewilligung, verbleibend; Ueberschreitung rot mit Hinweis. Reine Anzeige - die Lib rechnet unveraendert, nichts wird gedeckelt. Ohne Bewilligung "-" und keine Zeile |
| VN-11 | **Stundensatz identisch zur ZA, neu in v1.12** | getHourlyRate der Lib liefert hourly_rate_approved ?? hourly_rate UNSKALIERT - exakt wie ZAPanel.getHourlyRate (seit ZAPanel v7.4.4-66). Keine Skalierung mit weekly_hours / pm_basis_weekly_hours: der kalkulatorische Satz enthaelt die persoenliche WAZ bereits. Test AURA (16KN12459A, 20.10.2026): Anspruch lt. VN 58.505,31 EUR = angefordert lt. ZA 58.505,00 EUR, keine Abweichungswarnung; Blanken 28,00 EUR (vorher 22,40) |
| VN-10 | **Spruenge aus dem VN, neu in v1.11** | Nur Berater-Portal (VerwendungsnachweisSeite setzt onNavigateToZA / onNavigateToMatrix nur dort). Knoepfe "Zahlungsanforderung" und "Stundennachweis-Matrix" links neben "Drucken" in der vn-no-print-Leiste, jeweils fuer das im Panel gewaehlte Projekt. "Zurueck" am Ziel fuehrt auf den VN dieses Projekts. Ausdruck unveraendert |

#### Besonders fragile Bereiche:

- **JSX-Text vs. JS-String:** \u-Escapes wirken nur in JS-String-Literalen. In reinem
  JSX-Text werden sie woertlich ausgegeben - dort HTML-Entities (&auml;, &szlig;).
  Konventionshinweis steht im Dateikopf; in v1.2-3 trotzdem verletzt (Fussnote C).
- **Zeitraumfilter der ZA (korrigiert v1.6):** Bis v1.2-6 zaehlte eine ZA nur, wenn
  ihr GESAMTER Zeitraum im Berichtszeitraum lag. ANOVIA ZA 5 (bis 31.08.) fiel bei einem
  gespeicherten Berichtszeitraum bis 30.08. stillschweigend komplett heraus, mit einer
  Fehlalarm-"Rueckforderung". Seit Lib v1.2-7: Ueberschneidung genuegt, Kappung per
  zaVon/zaBis, Warnung bei Ueberstand. Nie wieder auf "vollstaendig enthalten" zurueck.
- **Gespeicherter Stand vs. Projektdaten (neu v1.6):** Ein gespeicherter Wert darf eine
  Stammdaten-Aenderung (Projektende) nicht verdecken. Genau das war die Ursache oben.
- **Summen gerundeter Werte:** Die Summe von n einzeln gerundeten Betraegen ist nicht die
  gerundete Summe. Differenzen im Cent-Bereich sind strukturell, nicht behebbar (VN-05).
- **Stundensatz in zwei Kopien (neu v1.12):** ZAPanel und Lib ermitteln den Satz je mit
  einer eigenen getHourlyRate. Laufen sie auseinander, meldet der VN eine Abweichung
  zwischen Anspruch und Anforderung, die es nicht gibt (Fall AURA/OpenZ 20.10.2026:
  5.793,42 EUR Fehlalarm, Ursache Teilzeit-MA ohne anerkannten Satz). Siehe IF-20.


### 12e.8 ProjectTeamManager (neu in v1.2)

**Datei:** src/components/shared/ProjectTeamManager.tsx

| Nr | Funktion | Pruefung |
|----|----------|----------|
| PT-01 | Team-Liste | Alle Zuordnungen mit Lfd.-Nr., Rolle, Zeitraum, Stundensatz |
| PT-02 | Anlage-6.1-Felder | Monatsbrutto, weitere Fixbestandteile, pWAZ, bWAZ, Stundensatz = (Monatslohn x 12 + Fixbestandteile) / (pWAZ x 52) |
| PT-03 | Bewilligter Stundensatz | hourly_rate_approved getrennt vom kalkulatorischen Satz; Tabelle zeigt approved ?? kalkulatorisch |
| PT-04 | Vorbelegung aus Stammdaten | Beim Auswaehlen eines MA werden die Anlage-6.1-Vorgabewerte uebernommen, bleiben editierbar |
| PT-05 | Zuordnungszeitraum | assignment_end nie spaeter als employment_end des MA |
| PT-06 | pWAZ-Divergenz-Hinweis | Weicht die pWAZ vom aktuellen MA-Stammsatz ab, erscheint ein Hinweis mit beiden Werten - ohne Schreibzugriff. Die pWAZ ist Antragswert und wird nie automatisch angeglichen |


### 12e.9 Kapazitaetsplanung (neu in v1.3)

**Datei:** src/app/v7/berater/multiprojekt/page.tsx
**Genutzt in:** Berater-Portal, Kapazitaetsmatrix je Mitarbeiter und Monat
(das FZul-Vorhaben-Panel auf derselben Seite ist nicht Teil dieses Vertrags)

#### Funktionen die IMMER korrekt arbeiten muessen:

| Nr | Funktion | Pruefung |
|----|----------|----------|
| KP-01 | Monatskapazitaet | Arbeitstage des Monats (Mo-Fr ohne Feiertage des Bundeslandes einschliesslich holiday_region, countWorkdaysInMonth) x WAZ/5. WAZ: Eintrag aus v7_employee_hours_history zum Monatsersten -> v7_employees.weekly_hours -> 40 |
| KP-02 | Elternzeit (Code E) | E-Tage aus v7_employee_absences (absence_code 'E', is_active, .limit(10000)), je MA und Datum einmal gezaehlt, nur Arbeitstage (Mo-Fr, kein Feiertag), hoechstens so viele wie Arbeitstage. Kapazitaet = (Arbeitstage - E-Arbeitstage) x WAZ/5. Ampel-Prozent auf Basis der VOLLEN Monatskapazitaet ohne Elternzeit. Monat vollstaendig in Elternzeit: hellblaue Zelle "E" statt Ampel, rotes E bei trotzdem geplanten oder verbuchten Stunden. Tooltip mit Zeile Elternzeit und Verfuegbar. Fuer MA ohne E-Tage sind alle Werte unveraendert |
| KP-03 | Geplante und verbuchte Stunden | Geplant = PM x 173,33, gleichmaessig auf alle Kalendermonate der AP-Laufzeit verteilt, nur fuer den laufenden und kuenftige Monate; Standard-Projekte aus v7_work_package_assignments (is_active, planned_person_months), ZIM_NETZWERK aus v7_nwm_ap_planung der Foerderzeitraeume im Anzeigezeitraum. Verbucht = v7_timesheets aller aktiven Projekte der Firma, is_active, .limit(10000), nach Buchungsmonat |
| KP-04 | Frei und Jahressummen | Frei h je Monat = max(0, Kapazitaet - geplant - verbucht). Jahressummen: Frei h = Summe der Monatswerte, Frei PM = Frei h / 173,33 |

#### Besonders fragile Bereiche:

- **Voll-E-Monat:** Ohne die Sonderbehandlung zeigt die Ampelformel eine Kapazitaet von 0
  als "100 Prozent frei" (gruen). Die Pruefung `elternzeitTage > 0 && gesamt === 0` muss
  vor der Ampel stehen.
- **E auf Feiertagen:** Der Bereichsdialog schreibt E auch auf Feiertage;
  countWorkdaysInMonth zaehlt Feiertage nicht mit. E-Tage auf Feiertagen muessen deshalb
  herausfallen, sonst wird doppelt abgezogen.


### 12e.10 FZul-Detailseite und BSFZ-Export (neu in v1.3)

**Dateien:**
- src/app/v7/berater/multiprojekt/[id]/page.tsx (Uebersicht, Import, Jahreskalender,
  Export-Tab)
- src/app/api/export/fzul/route.ts (BSFZ-Excel aus public/templates/FZul_Vorlage.xlsx)

**Genutzt in:** Berater-Portal, FZul-Vorhaben. Die Route wird zusaetzlich von der
Alt-Seite src/app/import/page.tsx aufgerufen (Legacy-Cluster A-013).

#### Funktionen die IMMER korrekt arbeiten muessen:

| Nr | Funktion | Pruefung |
|----|----------|----------|
| FD-01 | Gefoerderte Stunden | v7_timesheets in aktiven Projekten der Firma mit oeffentlichem Foerderformat (V7_PUBLIC_FUNDING_FORMATS), is_active, is_billable = true, day_type nicht vacation/sick/special_leave/holiday, .limit(10000). Identische Filter in allen vier Lesepfaden (Uebersicht, Import, Kalender, Export) |
| FD-02 | Abwesenheiten | U/K/S/E aus v7_employee_absences (is_active, .limit(10000)) ueber ladeAbwesenheiten. Mitarbeiterbezogen OHNE Projekt-Zuordnungsfenster. Wirksam nur an Arbeitstagen (Mo-Fr, kein Feiertag); an Wochenenden und Feiertagen geht der Tagestyp vor |
| FD-03 | Import | Je Tag des Vorhabenzeitraums: an Wochenende, Feiertag und Abwesenheitstag fue = verfuegbar = 0; sonst verfuegbar = max(0, Tagesarbeitszeit - gefoerdert) und fue = verfuegbar. urlaub_/krank_/sonderurlaub_hours aus der Abwesenheitszeile, bei E 0. Upsert auf (vorhaben_id, employee_id, work_date) |
| FD-04 | Jahreskalender | Die Zelle zeigt den gespeicherten fue-Wert; nur ohne gespeicherten Wert erscheint der verfuegbare Wert. Abwesenheitstag mit Kuerzel statt Eingabefeld (E bg-sky-100, U/K/S bg-violet-100). Altdaten (fue_hours > 0 an einem Abwesenheitstag): rote Zelle, Eingabe setzt 0, Hinweis mit Anzahl und Stunden. Der Kalender aendert gespeicherte fue_hours NIE selbst; Korrektur nur manuell oder per Neu-Import |
| FD-05 | Uebersicht | WAZ zum 1.1. des Wirtschaftsjahres. Max. h = WAZ/40 x 173,33 x Monate - Abwesenheits-Arbeitstage (alle Codes) x WAZ/5, Zusatzzeile "abzgl. x h Abw. (n AT)". Verf. h = max(0, Max. h - gefoerdert - FuE). Zeitraum endet am tatsaechlichen Monatsletzten des Endmonats |
| FD-06 | Export-Raster | Je Arbeitstag Tagesarbeitszeit - gefoerdert, nur Werte > 0. Leer an Wochenenden, Feiertagen (Feiertagsliste der Route, Bundesland) und Abwesenheitstagen (dayData[m][d].absence = true). Berechnung live aus v7_timesheets, nicht aus gespeicherten fue_hours |
| FD-07 | Export unterer Teil | E38 = WAZ, O39 = annual_leave_days, O40 = K-, O41 = S-, O43 = E-Arbeitstage im Exportjahr (Mo-Fr ohne Feiertag). O42 (Feiertage) bleibt Formel der Vorlage. U wird nicht uebergeben. Export-Tab je MA: Arbeitstage U, K, S, E und Urlaubsanspruch; gelber Hinweis bei U-Arbeitstagen > Anspruch, keine Umbuchung |
| FD-08 | Ladefehler | Ladefehler der Abwesenheiten (alle vier Lesepfade) und des Urlaubsanspruchs im Export-Tab werden angezeigt bzw. geworfen, nie still als 0 behandelt. Luecke siehe A-071 |

#### Besonders fragile Bereiche:

- **ladeAbwesenheiten ohne Zuordnungsfenster:** bewusst anders als
  `lib/employeeAbsences.ts`. Die FZul haengt an der Person, nicht an einem Projekt. Nicht
  "vereinheitlichen".
- **Vier Lesepfade:** Uebersicht, Import, Kalender und Export fragen v7_timesheets je
  getrennt ab. Eine Filteraenderung (FD-01) ist immer in allen vier vorzunehmen.
- **Vorlagenzellen:** Eingabezellen sind E38 und O39..O43. C38, F39 und J39 liegen in
  verbundenen Beschriftungsfeldern und werden von den Formeln nicht gelesen (Ursache
  A-069).
- **E auf Feiertagen:** Abwesenheits-Arbeitstage tagesgenau zaehlen (Mo-Fr ohne
  Feiertag); sonst doppelter Abzug zusammen mit O42.
- **Route:** eigene Feiertagsfunktion (nur Bundesland, keine holiday_region) und zweiter
  Aufrufer (Alt-Seite src/app/import/page.tsx). Nach jeder Aenderung an der Route eine
  Excel oeffnen und E38, O39..O43 sowie die Jahresarbeitszeit gegen eine Handrechnung
  pruefen.

#### Bekannte Luecken (nicht Bestandteil des Smoke-Tests):

| Nr | Luecke | Stand |
|----|--------|-------|
| A-070 | Export-Raster fuellt Januar bis Dezember unabhaengig von start_monat/ende_monat des Vorhabens; bei einem unterjaehrigen Vorhaben stuenden FuE-Stunden in Monaten ausserhalb der Laufzeit | Offen. PROD derzeit ohne Wirkung (alle Vorhaben 1-12, Abfrage 11.09.2026) |
| A-071 | Ladefehler still als 0: die v7_timesheets-Abfragen der vier Lesepfade werten `error` nicht aus (gefoerdert 0 -> zu viele FZul-Stunden); die Excel-Erzeugung liest annual_leave_days ohne Fehlerpruefung (`?? 0` -> O39 = 0) | Offen |
| - | Gespeicherte Kalenderwerte (fue_hours) gehen nicht in die BSFZ-Excel | Fachliche Entscheidung offen (PH Paragraph 5) |
| - | Zeile 45 (Kuerzung unterjaehrig) fest 1; E38 = WAZ zum 1.1. auch bei Jahresnavigation; Kurzarbeit nicht in O43 | Offen (PH Paragraph 5) |
| - | Regionale Feiertage (holiday_region): Seite ja, Route und Vorlage nein | Randfall |


### 12e.6 Infrastruktur-Checkliste

| Nr | Pruefpunkt | Wann pruefen |
|----|------------|--------------|
| IF-01 | Supabase Max Rows >= 10000 | Bei jedem neuen Supabase-Projekt |
| IF-02 | DEV-Schema identisch mit PROD | Nach jeder DB-Migration |
| IF-03 | .limit(10000) in neuen Queries | Bei jeder neuen v7_timesheets-Query |
| IF-04 | UTF-8/ASCII sauber | Vor jeder Datei-Auslieferung |
| IF-05 | Aktuelle Datei-Version als Basis | Vor jeder Code-Aenderung |
| IF-06 | DEV-Test vor PROD-Deploy | Nach jeder Code-Aenderung |
| IF-07 | Print-Vorschau nach CSS-Aenderung | Bei jeder Aenderung an Komponenten mit Print |
| IF-08 | Release-Tag setzen (v1.2) | Nach jedem PROD-Deploy: `git tag -a vX.Y.Z`, push auf origin UND cubintec |
| IF-09 | Monatsverlauf in zwei Implementierungen (v1.3) | Bei jeder Aenderung am Monatsverlauf-Diagramm: ProjektFortschrittPanel UND FirmaCockpit anpassen; Kontrolle per Suche nach den dataKey-Namen ueber src/ |
| IF-10 | is_billable bei "gefoerdert" (v1.3) | Bei jeder neuen oder geaenderten v7_timesheets-Query, die gefoerderte oder zuschussfaehige Stunden summiert: Filter `is_billable = true`. Grund: TF-12 legt an jedem Arbeitstag Zeilen "Nicht zuschussfaehige Arbeiten" (ohne AP, is_billable = false) an (A-068) |
| IF-11 | Fehlerauswertung und Datumsgrenzen (v1.3) | Bei jeder neuen oder geaenderten Query: `error` auswerten - ein Ladefehler wird angezeigt oder geworfen, nie still als leer oder 0 behandelt. Monatsende immer als tatsaechlichen Monatsletzten berechnen, nie fest "-31" (Postgres lehnt ungueltige Daten ab; ohne Fehlerauswertung bleibt das unbemerkt). Bestandscode erfuellt das noch nicht ueberall (A-071) |
| IF-12 | Abrechnungsgrenzen taggenau (v1.5) | Bei jeder Filterung von Stunden gegen einen Abrechnungs-, Berichts- oder Bewilligungszeitraum: TAGGENAU per ISO-String-Vergleich ('YYYY-MM-DD'), nie ueber ganze Kalendermonate und nie ueber new Date(iso) mit getFullYear/getMonth (UTC-Parsing, Ortszeit-Auswertung). Zusaetzlich auf project.start_date/end_date kappen |
| IF-13 | Rundung nach Formular (korrigiert v1.6) | Angeforderte Zuwendung je ZA: kaufmaennisch auf GANZE EURO ueber roundEuro(). Kosten, Kostenzeilen und Verwendungsnachweis: centgenau ueber round2(). Beide aus der VN-Lib, nie lokal nachbauen. Die Summe einzeln gerundeter Werte ist nicht die gerundete Summe - Vergleiche brauchen eine Toleranz (VN-05) |
| IF-14 | Lokaler Test nur `npm run build` (v1.5) | Kein vorgeschalteter `npx tsc --noEmit`: der Build prueft keine Typen, ein separater tsc-Lauf bricht an 55 latenten Altfehlern und an Ablageordnern ab (A-080). Siehe DEPLOY-PROZESS-PZE.md |
| IF-15 | Zahlungseingaenge nur aus v7_za_zahlungen (v1.7) | Bei jedem neuen Leser von Zahlungen: Summe der aktiven Zeilen je (project_id, za_nummer). Die Spalten zahlungseingang_* in v7_zahlungsanforderungen sind veraltet und werden weder gelesen noch geschrieben |
| IF-16 | Build nie bei laufendem Dev-Server (v1.9) | `npm run build` und `npm run dev` schreiben beide nach .next. Laeuft der Dev-Server waehrend des Builds, ist der Cache danach beschaedigt (Runtime Error "Cannot find module './vendor-chunks/...'"). Vor dem Build den Dev-Server stoppen. Abhilfe: Dev-Server stoppen, `rm -rf .next`, `npm run dev`. Ein cp nach src/ bei laufendem Dev-Server ist unkritisch (zweites Terminal-Tab) |
| IF-17 | Dateinamen-Schema in zwei Dateien (v1.10) | Bei jeder Aenderung am PDF-Dateinamen der Stundennachweise: TimesheetForm (handlePrint, Einzeldruck) UND StundennachweisMatrix (Sammeldruck) anpassen. Beide halten das Schema und die ASCII-Wandlung (toAscii, firstToken) je in einer eigenen Kopie. Kontrolle per Suche nach "_Stundennachweis_" ueber src/ |
| IF-18 | Sprungziele in mehreren Dateien (v1.11) | Routen der Querspruenge stehen je als eigene Kopie in ZASeite, VerwendungsnachweisSeite, TimesheetForm, StundennachweisMatrix und cockpit-stundennachweis-page; die Liste der VN-faehigen Formate zusaetzlich in ZAPanel und in VerwendungsnachweisSeite (Projektfilter). Bei Aenderung einer Route oder eines Formats alle Stellen anpassen; Kontrolle per Suche nach "/verwendungsnachweis" bzw. "ZIM_NETZWERK'" ueber src/ |
| IF-20 | Stundensatz in zwei Kopien (v1.12) | Bei jeder Aenderung an der Stundensatz-Ermittlung: ZAPanel.getHourlyRate UND getHourlyRate in src/lib/verwendungsnachweis-utils.ts identisch halten (approved ?? kalkulatorisch, unskaliert). Bewusst ANDERS rechnet nur die Fortschritts-Utility (PM x Monatsgehalt mit WAZ-/PM-Skalierung) - nicht angleichen. Kontrolle per Suche nach "getHourlyRate" ueber src/ |
| IF-19 | Vercel-Verzoegerung (v1.11) | Nach dem Push auf cubintec kann der Deploy erst nach 1-3 Minuten im Vercel-Dashboard erscheinen (Session 92). Vor einem Redeploy-Trigger (leerer Commit) mindestens 3 Minuten warten und per `git ls-remote cubintec main` pruefen, ob der Commit angekommen ist. Ein vorschneller Trigger erzeugt einen zweiten, inhaltsgleichen Build (harmlos) |


### 12e.7 Eskalationsregeln

- **Wenn unklar ob eine Funktion betroffen ist:** FRAGEN, nicht raten.
- **Wenn eine Aenderung mehr als 20 Zeilen betrifft:** Plan vorlegen, GO abwarten.
- **Wenn eine Aenderung mehrere Komponenten betrifft:** Alle Vertraege pruefen.
- **Wenn ein Smoke-Test fehlschlaegt:** SOFORT stoppen, nicht "schnell noch fixen".


### 12e.11 Versionierung dieses Dokuments

| Version | Datum | Aenderung |
|---------|-------|-----------|
| 1.0 | 29.05.2026 | Entwurf zur Abstimmung (Session 46) |
| 1.1 | 29.05.2026 | Angenommen (Session 47). ZAPanel-Vertrag (ZA-01..11) ergaenzt. Versionsnummern entfernt. Inhalt verbindlich uebernommen in Pflichtenheft Paragraph 12e. |
| 1.2 | 09.09.2026 | Session 81 (V7.9.7). TF-04, TF-05, TF-07, TF-09 und TF-12 um die Aenderungen aus V7.9.7 ergaenzt (Elternzeit-Ausnahmen, WAZ-Quelle, "sonstige Arbeiten" immer als Differenz). Neu: TF-15 Elternzeit (Code E). Fragile Bereiche des TimesheetForm um Monats-Abgleich, Auto-Vorbelegung und pointer-events erweitert. Neuer Abschnitt 7: Verhaltensvertrag ProjectTeamManager (PT-01..06). ZA-12 (FZ-basierte Foerderquote) und PF-08 (NWM-Jahresselektor) nachgetragen. BP-06 um die pWAZ-Klarstellung ergaenzt. IF-08 Release-Tag ergaenzt. |
| 1.3 | 11.09.2026 | Session 84 (Stand V7.9.11, reine Dokumentation). Neuer Abschnitt 8: Kapazitaetsplanung (KP-01..04, aus v5.43). Neuer Abschnitt 9: FZul-Detailseite und BSFZ-Export (FD-01..08, aus v5.44), jede Regel gegen den deployten Code geprueft; dabei zwei Luecken gefunden und als A-070 (Export-Raster ausserhalb der Vorhabenmonate) und A-071 (Ladefehler still als 0) aufgenommen. PF-09 gemeinsamer Bezugsrahmen der Foerderkennzahlen (aus v5.42). IF-09 Monatsverlauf in zwei Implementierungen (aus v5.42), IF-10 is_billable bei "gefoerdert" (A-068), IF-11 Fehlerauswertung und Datumsgrenzen. Fragile Bereiche: TimesheetForm (Wirkung der Auto-Vorbelegung nach aussen), FirmaCockpit (eigene Diagramm-Kopie). Infrastruktur, Eskalation und Versionierung als Abschnitte 10 bis 12. Korrekturstand VERHALTENSVERTRAG-v1_3-2.md: aufgebaut auf der downloads-Fassung von v1.2; der erste Stand VERHALTENSVERTRAG-v1_3.md basierte versehentlich auf der aelteren, ausfuehrlicheren Projektkopie von v1.2 und ist verworfen. |
| 1.12 | 21.10.2026 | Session 93 (V7.9.20). TF-12 neu gefasst: Auto-Vorbelegung "sonstige Arbeiten" nur auf leeren Arbeitstagen und nur als volle Tagesarbeitszeit (keine Reststunden), Tage mit Projektstunden (auch andere Projekte) bleiben leer. Fragile Bereiche TimesheetForm (Auto-Vorbelegung, Wirkung nach aussen, Leeren von Projektstunden) angepasst. Neu VN-11 Stundensatz identisch zur ZA, fragiler Bereich Stundensatz in zwei Kopien, IF-20. |
| 1.11 | 12.10.2026 | Session 92 (V7.9.19). Neu VN-09 bewilligte Zuwendung und Ausschoepfung, VN-10 Spruenge aus dem VN, ZA-19 Speichern behaelt die ZA, TF-17 Direktlinks ZA/VN. ZA-18 (VN-Knopf, Matrix-Ruecksprung) und MS-06 (VN-Knopf, Matrix-Zurueck) ergaenzt. Fragile Bereiche: openPanel/keepZaId, Ruecksprung-Kette in zwei Kopien. Neu IF-18 Sprungziele in mehreren Dateien, IF-19 Vercel-Verzoegerung. |
| 1.10 | 03.10.2026 | Session 91 (V7.9.18). TF-11 um den PDF-Dateinamen mit Vorname ergaenzt; fragiler Bereich Dateiname des Sammeldrucks (Abschnitt 4a); neu IF-17 Dateinamen-Schema in zwei Dateien. |
| 1.9 | 02.10.2026 | Session 90 (V7.9.17). ZA-03 tab-Parameter fuer alle vier Tabs; neu ZA-18 Direktspruenge aus der ZA; fragile Bereiche Ruecksprung-Kette und Klickflaechen im Druckbereich. Neu MS-06 Bedienleiste der Matrix mit Knopf Zahlungsanforderung. Neu IF-16 Build nie bei laufendem Dev-Server. |
| 1.8 | 22.09.2026 | Session 89 (V7.9.16). ZA-04 Betragseingabe nur Komma; neu ZA-17 Sicherungen eingereichter ZA; fragiler Bereich openPanel/Auto-Select (A-092). |
| 1.7 | 21.09.2026 | Session 88 (V7.9.15). ZA-03 Archiv oben rechts, ZA-04 Zahlungsliste aus v7_za_zahlungen, ZA-05 korrigiert (Betrag nie durch Zahlung ueberschrieben), ZA-07 Loeschen mit ZA-Nummer, neu ZA-15 Sammelueberweisung und ZA-16 Zahlungen nur bei eingereichten ZA, drei fragile Bereiche. FC-04 Summe/Popup/Archiv-Link. VN-04 auf v7_za_zahlungen. Neu IF-15. |
| 1.6 | 21.09.2026 | Session 87 (V7.9.14). ZA-14 und IF-13 korrigiert: Anforderung je ZA wieder auf ganze Euro (roundEuro), Kosten und VN centgenau. VN-05 Toleranz auf Anzahl ZA x 0,50 + 0,005 EUR. Neu VN-08 Berichtszeitraum aus Projektdaten. Fragile Bereiche VN: Zeitraumfilter korrigiert (Ueberschneidung statt vollstaendiger Enthaltenheit), gespeicherter Stand vs. Projektdaten. |
| 1.5 | 21.09.2026 | Session 86 (V7.9.13). TF-16 Sperre fuer Projektstunden ausserhalb des Bewilligungszeitraums (nur AP-Zeilen) mit drei neuen fragilen Bereichen (Reichweite der Sperre, Speichern schreibt den Monat neu, Leeren loest Vorbelegung aus). FC-04 um Abrechnungszeitraum und Vollstaendigkeitspruefung. ZA-13 taggenaue Abrechnung, ZA-14 centgenauer Foerderbetrag, zwei fragile Bereiche. Neuer Abschnitt 6a Verwendungsnachweis (VN-01..07). IF-12 taggenaue Grenzen, IF-13 centgenaue Rundung, IF-14 lokaler Test nur per Build. |
| 1.4 | 17.09.2026 | Session 85 (V7.9.12). Neuer Abschnitt 4a Monatsstatus (MS-01..05) fuer Stundennachweis-Matrix und Mein Status. TF-08 um den Speicherzwang vor dem Abschluss ergaenzt; fragiler Bereich TimesheetForm "Auto-Vorbelegung setzt hasChanges nicht". BP-03 auf MS-01..05 umgestellt. |


---

## 16. Codequalitaet und Technische Schulden

### 16.1 Hintergrund

PZE wurde vom Projektstart (Oktober 2024) an konsequent mit KI-Unterstuetzung entwickelt.
Das birgt ein strukturelles Risiko: Korrekturen koennen lokal funktionieren, aber global
das Systemdesign fragmentieren. Durch konsequentes Projektmanagement (Pflichtenheft,
Versionierung, GIT-Sicherungen, Shared-Component-Architektur, chirurgisches Aendern) wurde
dieses Risiko erheblich reduziert -- aber nicht eliminiert.

Dieses Kapitel dokumentiert bekannte technische Schulden, Risikobereiche und den Plan zu
deren sukzessiver Beseitigung.

### 16.2 Bekannte Technische Schulden

| Nr. | Komponente | Beschreibung | Risiko | Status |
|-----|-----------|--------------|--------|--------|
| TS-1 | ProjectDetailPage v7.4.4-54 | Frozen wegen Vercel SWC-Compiler-Bug. Fuer Felder ohne Props: Option B (direkt aus DB laden im Panel). Keine Aenderungen bis Bug geloest. | Hoch | Offen |
| TS-2 | v7-dev Preview-Build | Push auf v7-dev loest ungenutzten Preview-Build aus. Deaktivierung per Vercel-Dashboard geplant. | Niedrig | Offen (§14) |
| TS-3 | Stundennachweis-Wording | "foerderbare Projektarbeiten" steht immer, bei ZIM_NETZWERK muss "Management-Arbeiten" stehen. | Mittel | Erledigt -> A-002 (Session 50) |
| TS-4 | ZAPanel Rollback | HINFAELLIG: Status-Automatik (calcStatus, v7.4.4-51/52) ersetzt manuelle Buttons. Rollback datengetrieben ueber Datumsfelder. | - | Hinfaellig (29.05.2026, A-004) |
| TS-5 | Berater-Firma-Detail Header-Farbe | ERLEDIGT: Aktive Firmenansicht ist FirmaCockpit (/v7/berater/app/firma/[id]) mit blauem Header (#002451). Am Bildschirm verifiziert. | - | Erledigt (29.05.2026) |
| TS-6 | Datenbank-Query-Muster | Redundante/ineffiziente Queries moeglich. Kein Befund, ungeprueft. | Mittel | Audit ausstehend |
| TS-7 | Session-uebergreifende Konsistenz | Claude hat nie vollstaendigen Code-Ueberblick. Gegenmassnahme: Paragraph 12b Regeln 14-16 (eine Offen-Liste, Erledigt-Regel, Session-Start-Abgleich). | Mittel | Laufendes Monitoring + Prozess (Session 47) |
| TS-8 | Verwaiste Seite v7/firmen/[id]/page.tsx | Alter Code v7.0.3, kein PortalHeader, Nicht-ASCII. Nicht mehr angesteuert (Firmenansicht = FirmaCockpit). Cleanup-Kandidat. | Niedrig | Offen -> A-013 (Session 47 entdeckt) |

### 16.3 Massnahmen und Prinzipien

**Kurzfristig (laufend in jeder Session):**
- Chirurgisches Aendern: Niemals Umstrukturierung funktionierenden Codes.
- Bei jedem neuen Feature: Pruefen ob bestehende Shared Components genutzt oder erweitert
  werden koennen, bevor Neues gebaut wird.
- Bekannte technische Schulden aus dieser Tabelle ansprechen wenn thematisch passend.

**Mittelfristig (dedizierte Sessions):**
- TS-1 (ProjectDetailPage): Neu bauen sobald Vercel SWC-Bug behoben oder Workaround verfuegbar.
- TS-3 (Stundennachweis-Wording): Mit Arbeitszeitgrenzen Phase 3 zusammen angehen (thematisch nah).
- TS-6 (Query-Audit): Einmalige Pruefung der haeufig genutzten Supabase-Abfragen auf
  Redundanz und Performance. Kein vollstaendiger Rewrite, nur gezielte Korrekturen.

**Dauerhaft:**
- Pflichtenheft ist die Single Source of Truth. Jede Architekturentscheidung wird hier
  dokumentiert -- auch wenn sie ein Kompromiss oder eine bekannte Schwaeche ist.
- Neue Sessions starten immer mit Lesen der aktuellen Dateiversion aus dem Projekt-Vault.

### 16.4 Qualitaetssicherungs-Checkliste (vor jedem Deploy)

```
[ ] pnpm build lokal sauber (keine TypeScript-Fehler)
[ ] pnpm dev: betroffene Feature-Pfade aktiv durchgeklickt
[ ] UTF-8-Check: keine Sonderzeichen im Code (Python-Skript)
[ ] Versionsnummer im Dateinamen und im internen Kommentar korrekt inkrementiert
[ ] Kein bestehender funktionierender Code umstrukturiert
[ ] Neue Datenbankabfragen: RLS-Kompatibilitaet geprueft
[ ] Deploy-Script erstellt und getestet
[ ] Nach erfolgreichem Prod-Test: alte Dateiversion archiviert
```

---

## 17. Dokumentationsstandard fuer externe Entwickler

### 17.1 Grundsatz

PZE soll jederzeit so dokumentiert sein, dass ein externer qualifizierter Entwickler
ohne direkte Rueckfragen:
- Die Systemarchitektur versteht (Portale, Rollen, DB-Schema, RLS)
- Jede Komponente lokalisieren und ihren Zweck verstehen kann
- Bekannte Einschraenkungen und Frozen-Bereiche kennt (z.B. ProjectDetailPage)
- Den Deploy-Workflow selbststaendig ausfuehren kann
- An bestehenden Strukturen weiterentwickeln kann ohne versehentlich Architekturprinzipien
  zu verletzen

Dies ist eine **permanente Querschnittsanforderung**, keine einmalige Aufgabe.

### 17.2 Was wo dokumentiert wird

| Dokumenttyp | Ablageort | Inhalt |
|-------------|-----------|--------|
| Systemarchitektur, Anforderungen, Konventionen | Dieses Pflichtenheft | Single Source of Truth |
| Komponentenspezifische Logik | Inline-Kommentare im Code | Entscheidungsgruende, nicht nur "was" sondern "warum" |
| Bekannte Bugs und Einschraenkungen | §5 (Bekannte Fehler) + §16.2 (Technische Schulden) | Mit Status und Risikobewertung |
| Deployment und Git-Workflow | §10 + deploy-*.sh Skripte | Vollstaendig ausfuehrbar ohne Erklaerung |
| Datenbankschema | §2 | Alle Tabellen, Felder, Beziehungen, RLS-Regeln |
| Benutzeranleitungen | /public/manuals/ + §15 | Fuer Endnutzer, nicht Entwickler |

### 17.3 Code-Kommentierungsstandard

Jede Komponente enthaelt am Kopf:
```
// Dateiname-vX_Y_Z-N.tsx
// VERSION: vX.Y.Z-N - Kurzbeschreibung der letzten Aenderung
// DATUM: TT. Monat JJJJ
// ZWECK: Was macht diese Komponente (1-2 Saetze)
// PORTALE: Firmen-Portal / Berater-Portal / beide
// ABHAENGIGKEITEN: Welche DB-Tabellen, welche anderen Komponenten
// BEKANNTE EINSCHRAENKUNGEN: (wenn vorhanden)
```

Innerhalb des Codes:
- Komplexe Berechnungen (Feiertage, PM-Umrechnung, ZA-Logik) mit Erklaerungskommentar
- Nicht-offensichtliche Architekturentscheidungen begruenden ("warum so und nicht anders")
- Frozen-Bereiche mit deutlichem Kommentar kennzeichnen: `// FROZEN: Nicht aendern - [Grund]`

### 17.4 Pflichtenheft-Pflegestandard

- Nach jeder Session: PH wird aktualisiert (neue Version, neue Eintraege in §3, §4, §5)
- Neue Architekturentscheidungen: sofort in §12b oder eigenem Abschnitt
- Neue DB-Felder: sofort in §2
- Neue Routen: sofort in §9
- Keine Session endet ohne aktualisiertes Pflichtenheft im Repo (GIT-Sicherung)
- **Ab v5.54 (21.10.2026): Es wird nur noch diese Gesamtfassung fortgeschrieben** (PFLICHTENHEFT-v5_NN.md, je Session neue Nummer). Keine Aenderungsbloecke mehr. Grund: Bis v5.54 lagen 18 Bloecke auf der Gesamtfassung v5.36; zwei davon fehlten im Repo, Abschnittsnummern kollidierten (6.5) und Inhalte drifteten auseinander.

### 17.5 Einstiegspfad fuer externen Entwickler

Empfohlene Lesereihenfolge fuer schnellen Einstieg:
1. §1 Projektuebersicht (Architektur, Rollen, UI-Konventionen)
2. §2 Datenbankschema (Tabellen, RLS, wichtige Regeln)
3. §4 Komponenten-Uebersicht (aktuellste Versionsnummern)
4. §9 Seiten-Uebersicht (Routing)
5. §10 Deployment (Deploy-Workflow)
6. §12b Kritische Architekturregeln
7. §16 Technische Schulden (bekannte Risiken)
8. §5 Bekannte Fehler (offene und behobene Issues)
