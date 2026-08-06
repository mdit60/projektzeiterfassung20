// src/components/shared/TimesheetForm.tsx
// ============================================================================
// PZE V7 - Shared Timesheet Form Component
// ============================================================================
// Datum: 6. August 2026
// Version: 7.4.6-72
// v7.4.6-72: "Alle AP"-Modal Feinschliff. (1) Modalbreite folgt jetzt der Tabelle
//   (Container w-fit + max-w-[96vw]) -> Modal waechst/schrumpft automatisch mit der
//   MA-Anzahl. (2) Fusszeile/Legende komplett entfernt (Infowert = 0, alles direkt
//   an der Tabelle ablesbar). (3) Gruppierte Zahlenspalten (geplant/gebucht/offen
//   inkl. Koepfe) zentriert. Reine Anzeige/Layout, keine Logik-/Datenaenderung.
// v7.4.6-71: "Alle AP"-Modal Layout. (1) Reihenfolge je Gruppe umgestellt:
//   "gesamt" steht jetzt VOR den MA-Spalten (gesamt, MA1, MA2, ...). (2) Jede
//   Gruppe (geplant / gebucht / offen) ist mit einem dicken Rahmen (border-gray-500,
//   oben/unten/links/rechts) klar abgegrenzt. Fusszeilen-Text angepasst. Reine
//   Anzeige/Layout, keine Logik-/Datenaenderung.
// v7.4.6-70: LESBARKEIT zu -69. Modal-Fenster schrumpft jetzt auf den Tabelleninhalt
//   (Container w-full -> w-auto), max-w-[96vw] bleibt nur Obergrenze fuer breite
//   Projekte. Zuvor war das weisse Fenster stets 96vw breit -> viel Leerraum rechts
//   neben der kompakten Tabelle. Reine Anzeige/Layout, keine Logik-/Datenaenderung.
// v7.4.6-69: LESBARKEIT zu -68. Kernproblem: die Tabelle stand auf "w-full" und
//   wurde auf die volle Modalbreite (max-w-[96vw]) auseinandergezogen -> breite
//   Leerspalten. Jetzt inhaltsbasiert: table "w-auto" statt "w-full", Schrift
//   "text-xs" -> Spalten nur so breit wie noetig. MA-Kopf-Umbruch nur an
//   Bindestrich/Leerzeichen (break-normal statt break-words), damit keine haesslichen
//   Wortmitten-Umbrueche mehr ("L.Riedman n"); lange Namen wie "T.Schulze-Hagenest"
//   brechen am Bindestrich. Reine Anzeige/Layout, keine Logik-/Datenaenderung.
// v7.4.6-68: LESBARKEIT "Alle AP"-Modal. Spalte "Bezeichnung" schmal (w-[11rem])
//   mit Zeilenumbruch (whitespace-normal/break-words, 2-3-zeilig statt einzeilig).
//   MA-Spaltenkoepfe brechen bei langen Namen um (max-w-[4.5rem] break-words statt
//   whitespace-nowrap) - z.B. "T.Schulze-Hagenest" zweizeilig. Zahlenspalten enger
//   (px-2 -> px-1), Zellen oben ausgerichtet (align-top). Reine Anzeige/Layout,
//   keine Logik-/Datenaenderung.
// v7.4.6-67: HOTFIX zu -66. Runtime ReferenceError "can't access lexical
//   declaration 'plannedHoursPerWpPerMa' before initialization". Ursache: die
//   useMemo allApTeam referenzierte die beiden neuen States (plannedHoursPerWpPerMa,
//   projectBookedPerWpPerMa) in ihrer Dependency-Liste, die States waren aber ERST
//   weiter unten deklariert -> Temporal Dead Zone. Fix: beide useState-Deklarationen
//   vor die allApTeam-Memo verschoben. Keine weitere Aenderung.
// v7.4.6-66: "Alle AP"-Modal (AP-Status) um MA-Aufschluesselung erweitert, damit
//   der Berater fehlerhafte Buchungen je Mitarbeiter erkennen und korrigieren kann.
//   Je Gruppe (geplant / gebucht / offen) jetzt eine Spalte pro Projekt-Team-MA
//   (Kopf "V.Nachname") plus "gesamt". ALLE Werte in STUNDEN (keine PM).
//   - geplant je MA: v7_work_package_assignments.planned_person_months x hoursPerPM,
//     ueber das GANZE Team geladen (neuer Effekt loadTeamPlanned, State
//     plannedHoursPerWpPerMa); "gesamt" bleibt das AP-Soll (total_person_months).
//   - gebucht je MA: projektweite Timesheet-Abfrage um employee_id erweitert
//     (State projectBookedPerWpPerMa); "gesamt" = projectBookedPerWP (unveraendert).
//   - offen je MA = geplant(MA) - gebucht(MA); Farblogik (amber/rot/grau) je Zelle.
//   Spalten = ganzes Projekt-Team (aus teamNumbers, nach Team-Nr. sortiert). Modal
//   verbreitert (max-w-[96vw]) + horizontales Scrollen. Reine Anzeige-Erweiterung;
//   keine Aenderung an Erfassung, Speicherung oder bestehender AP-/Buchungslogik.
// v7.4.6-65: FIX Fehlzeit + auto-vorbelegte "sonstige Arbeiten" am selben Tag.
//   Beim Setzen einer Abwesenheit (U/K/S) in der AP-Tageszelle wurde bisher nur
//   die AP-Zelle geleert, die zuvor auto-vorbelegte "sonstige"-Zelle desselben
//   Tages blieb jedoch stehen. Folge: Fehlzeit (z.B. 8 h) + sonstige (8 h) = 16 h
//   -> Tagesstunden-Ueberschreitung ("Tag X: Fehlzeit ... plus Arbeitszeit ...
//   ueberschreitet die Tagesstunden"). Ein Abwesenheitstag ist ausschliesslich
//   Abwesenheit -- daher wird die "sonstige"-Zelle jetzt symmetrisch zur AP-Zelle
//   geraeumt. ZWEI Stellen:
//   1) handleCellChange: beim Setzen von U/K/S wird nonBillableEntries[day] und
//      der zugehoerige nonBillableManual-Marker entfernt (sofortige Raeumung,
//      deckt AP-Zelle + Rechtsklick-Menue ab).
//   2) Auto-Vorbelegung-Effect: Sicherheitsnetz -- an einem Abwesenheitstag wird
//      eine nicht-manuelle "sonstige"-Vorbelegung entfernt (deckt zusaetzlich die
//      direkte Eingabe in den unteren Fehlzeit-Zeilen ab). Beim Entfernen der
//      Abwesenheit wird der Tag wieder reiner Arbeitstag und die Auto-Vorbelegung
//      fuellt automatisch neu.
// v7.4.6-64: "Sonstige Arbeiten" zaehlen NICHT mehr in Grenzbetrachtungen
//   (nicht foerderbar). ZWEI Stellen bereinigt:
//   1) 9h-Tagesgrenze: calcTagSumme rechnet nur noch foerderbare Projekt-
//      stunden (frueher Projekt + sonstige). Cross-Projekt-Tagessumme =
//      foerderbar dieses Projekt + andere Projekte.
//   2) Physische Monatskapazitaet: sonstStundenMonat entfernt; jetzt nur
//      foerderbare Projektstunden + andere Projekte. So sprengt ein langer
//      Monat mit vielen Arbeitstagen die Grenze nicht mehr allein durch die
//      Auto-Vorbelegung der sonstigen Arbeiten.
//   Die monatliche FOERDER-Obergrenze (173,33 x Faktor) rechnete ohnehin nur
//   mit foerderbaren Projektstunden -- unveraendert.
// Datum: 3. Juli 2026
// Version: 7.4.6-63
// v7.4.6-63: Paket C -- Auto-Vorbelegung "sonstige Arbeiten" (sichere Variante)
//   + weicher Save-Hinweis.
//   AUTO: An reinen Arbeitstagen wird "sonstige" automatisch auf
//   max(0, pWAZ/5 - dieses Projekt - andere Projekte) gesetzt. Anderes-Projekt
//   wird mit abgezogen, damit die projektuebergreifende Tagesgrenze nicht
//   verletzt wird (kein harter Kapazitaets-Block). Neuer Monat: leere Tage
//   werden aufgefuellt + live nachgefuehrt. Gespeicherter Monat: nur bereits
//   gefuellte Tage werden nachgefuehrt, leere Tage bleiben in Ruhe (schuetzt
//   bewusste Loeschungen). Manuell angefasste Tage (Tippen/Loeschen) werden nie
//   mehr automatisch veraendert. Abgeschlossene Monate bleiben unangetastet.
//   HINWEIS: Nach dem Speichern erscheint eine gelbe Info, wenn es reine
//   Arbeitstage mit Projektstunden, aber leerer "sonstige"-Zeile und nicht
//   voller Tagesarbeitszeit gibt (die o.g. Einzelfaelle). Blockiert nicht.
// Datum: 3. Juli 2026
// Version: 7.4.6-62
// v7.4.6-62: Paket B (Kopf-Infos). ZWEI Ergaenzungen in der Steuerleiste:
//   1) WAZ-Anzeige direkt rechts neben dem MA-Feld: persoenliche
//      Wochenarbeitszeit des MA (weeklyHoursAtMonth, aus Teilzeit-Historie),
//      z.B. "37,5 h/Woche".
//   2) ZA-Direktlink rechts in der Steuerleiste (ml-auto). Springt in die
//      Zahlungsanforderung des aktuellen Projekts (gleiche Seite, returnTo =
//      aktuelle URL fuer den Zurueck-Button dort). Portal-abhaengige Route
//      (Berater: /v7/berater/foerderung/firma/<id>/za, Firma: /v7/firma/za).
//      Sprung laeuft ueber checkUnsavedChanges (Warnung bei offenen Aenderungen).
// Datum: 3. Juli 2026
// Version: 7.4.6-61
// v7.4.6-61: Paket A (rechte "offen"-Spalte). ZWEI Aenderungen:
//   1) LIVE: Die offenen/ueberbuchten Stunden zaehlen jetzt bereits waehrend
//      der Eingabe mit, nicht erst nach dem Speichern. Neuer Live-Schnappschuss
//      savedMonthHoursPerWP (beim Laden + nach Speichern gesetzt);
//      calculateRemainingHours/calculateWPOpenHours rechnen gebucht_gesamt plus
//      Live-Delta (aktueller Formstand - Schnappschuss).
//   2) FARBEN zurueck: offene MA-Stunden GRUEN, ueberbuchte ROT (bleibt),
//      projektweit offene AP-Stunden bei NICHT zugeordnetem MA BLAU. Vorher
//      war alles ausser Ueberbuchung schwarz.
// Datum: 3. Juli 2026
// Version: 7.4.6-60
// v7.4.6-60: GF-50%-Regel wieder aktiv. Die GF-Erkennung nutzte einen exakten
//   String-Match gegen ASCII-Werte ('Geschaeftsfuehrer'), die DB enthaelt aber
//   ueberwiegend echte Umlaute ('Geschaeftsfuehrer' mit ae-Umlaut) sowie die
//   weibliche Form. Folge: istGF war faelschlich immer false, GF-Ampel/Warnung
//   erschienen nie. Lokale Konstante GF_POSITIONS_LOCAL entfernt; istGF laeuft
//   jetzt ueber den toleranten Helfer istGeschaeftsfuehrerTitle() aus v7-types
//   (deckt Umlaut+ASCII und die weibliche Form ab). Enthaelt v7.4.6-59.
// Datum: 30. Juni 2026
// Version: 7.4.6-59
// v7.4.6-59: PDF-Dateiname Einzeldruck auf finales Schema umgestellt -
//   Leerzeichen statt Unterstrich, ohne Wort "Stundenerfassung":
//   "<NN><VV> <YYMM> <FKZ> <Vorname> <Nachname>" (Bsp. "SF 2510 16DS251601
//   Ferat Sarac"); Fallback ohne Name "<YYMM> <FKZ>". KEIN .pdf im
//   document.title - der Browser haengt die Endung beim Speichern selbst an.
//   Enthaelt v7.4.6-58 (Feiertag folgt MA-WAZ).
// Datum: 30. Juni 2026
// Version: 7.4.6-58
// v7.4.6-58: Feiertags-Tagesstunden folgen jetzt der individuellen MA-WAZ
//   statt dem Firmenstandard. Feiertag-Auto-Vorbelegung der S-Zeile nutzt
//   employeeDailyHours (= weeklyHoursAtMonth/5) statt
//   company.standard_weekly_hours/5. Der zugehoerige Lade-Effekt haengt jetzt
//   zusaetzlich von weeklyHoursAtMonth ab, damit der Feiertag neu berechnet
//   wird, sobald die WAZ geladen ist (sonst kurzzeitig Default 40 -> 8).
//   Behebt: Teilzeit-MA (z.B. Walter 38h -> 7,60) bekam am Feiertag 8,00 und
//   die Tages-Plausipruefung (7,60) blockierte das Speichern. U/K/S nutzten
//   employeeDailyHours bereits; nur die Feiertags-Stelle (Z.1598) war betroffen.
//   Reiner Code-Fix, keine Datenmigration (Feiertage werden live berechnet).
// Datum: 30. Juni 2026
// Version: 7.4.6-57
// v7.4.6-57: Zeile "sonstige Arbeiten" bekommt bg-white auf den Normalzellen
//   (analog Fehlzeiten-Zeilen) -> fehlender oberer Rahmen in Firefox/Chrome
//   behoben. Spalten-Schattierung unveraendert. Spiegelt Sheet v1.0.3.
// Version: 7.4.6-56
// v7.4.6-56: Layout-Bereinigung Stundennachweis (Vorgabe Berater) -- spiegelt
//   StundennachweisSheet v1.0.2. Aenderungen NUR im printRef-Sheet-Bereich:
//   (1) Farbige Zeilen-Baender (Abschnitte 1-3, Summenzeilen) und farbige
//       Summenzellen entfernt; nur orange Monatstage-Kopf + Kopf-Boxen bleiben
//       farbig. Spalten-Schattierung (Wochenende/Feiertag/KA/Abwesenheit) und
//       die Warn-Faerbung bei Limit-Ueberschreitung bleiben unveraendert.
//   (2) Alle Sheet-Schriften schwarz (text-black; T/NT-Marker entfaerbt).
//       Bereich-begrenzt (3260-3815) -> Toolbar/Buttons/Modals unberuehrt.
//   (3) Summenzeilen/-spalte weiterhin fett (nur ohne Hintergrundfarbe).
//   (4) DS-Summenlabels einzeilig: "Summe foerderbare Stunden (T)" / "(NT)".
//   (5) Fehlzeit-Label: "Urlaub (nur bezahlter Urlaub)".
//   (6) Unterschrifts-Labels groesser (9/7px -> 11/9px).
//   (7) printRef: translate="no" + notranslate -> keine Browser-Auto-
//       Uebersetzung des Sheets (Bug: GRAVID -> SCHWANGER).
//   (8) handlePrint: neues PDF-Dateinamen-Schema (Einzeldruck):
//       <NN><VV>_<YYMM>_<FKZ>_Stundenerfassung_<Vorname>_<Nachname>,
//       Beispiel: SF_2510_16DS251601_Stundenerfassung_Ferat_Sarac.
//       (Sammeldruck-Dateiname liegt in StundennachweisMatrix, separat.)
// v7.4.6-55: "Meine Arbeitspakete"-Modal (Zugeordnete Arbeitspakete) bekommt
//   die Spalte "Zeitraum (geplant)" (Monat.Jahr von-bis aus wp.start_date/
//   end_date), analog zu A-047 im "Alle AP"-Modal. Lokaler fmtMon-Helfer im
//   Meine-AP-IIFE (der bestehende liegt im Alle-AP-Block, dort nicht in Scope).
//   Edit ausschliesslich im showMyAPModal-Block (kein tfoot -> kein colSpan).
//
// Version: 7.4.6-54
// v7.4.6-54: KORREKTUR zu -53. "Alle AP"-Modal (AP-Status) zeigt den geplanten
//   Bearbeitungszeitraum je AP (Spalte "Zeitraum (geplant)", Monat.Jahr von-bis
//   aus wp.start_date/end_date). In -53 waren die Anker mehrdeutig -> Spalte
//   landete in der "Meine AP"-Tabelle, der fmtMon-Helfer im "Alle AP"-Block ->
//   ReferenceError fmtMon is not defined (PROD-Crash). Jetzt ALLE Aenderungen
//   (Spalte + fmtMon + tfoot-colSpan) ausschliesslich im Alle-AP-Block.
// Version: 7.4.6-52
// v7.4.6-52: Zwei Zeiterfassungs-Fixes.
//   (1) Pfeil-/Tab-Navigation: canEdit ist jetzt typ-abhaengig. Arbeitszeilen
//       (AP/nicht-foerderbar) ueberspringen Tage mit Abwesenheit (U/K/S) und
//       PL-Sperren - vorher versuchte die Navigation diese disabled-Zellen zu
//       fokussieren und blieb haengen (kein Weiter-/Zurueckspringen, kein
//       Ueberspringen von Fehlzeiten). Fehlzeit-Zeilen bleiben erreichbar.
//   (2) Tages-Sollstunden fuer Fehlzeiten: weeklyHoursAtMonth faellt bei
//       fehlender MA-WAZ auf den FIRMENSTANDARD (standard_weekly_hours) statt
//       hart 40 zurueck -> Fehlzeiten erhalten 7,5 h/Tag (wie Feiertage) statt
//       8. company in die Effekt-Dependencies aufgenommen (Direkt-Navigation).
// Version: 7.4.6-51
// v7.4.6-51: "Alle AP"-Modal zeigt geplant/gebucht/offen jetzt mit 2 Dezimal-
//   stellen (wie in der Erfassung). "offen" wird im Modal direkt als
//   geplant - gebucht berechnet (statt ueber das ganzzahlige
//   calculateWPOpenHours), damit Zeilen und Gesamtsumme konsistent aufgehen.
//   Behebt den Rundungs-Artefakt (z.B. 641 vs 642 bei offen 0, Gesamt -2 bei
//   scheinbar leeren Zeilen). Nur Anzeige im Alle-AP-Modal betroffen;
//   calculateWPOpenHours und das "Meine Arbeitspakete"-Modal unveraendert.
// v7.4.6-50: NEU "Alle AP"-Button neben "Meine Arbeitspakete". Oeffnet ein
//   Modal mit dem projektweiten AP-Status: je echtem AP (PM > 0) geplante,
//   gebuchte und offene Stunden ueber ALLE Mitarbeiter. "offen" = Soll
//   (total_person_months x hoursPerPM) minus projektweit gebucht. Orange =
//   noch zu buchen (Unterstuetzung noetig), Rot = ueberbucht, Grau = erledigt.
//   Rein additiv: neuer State showAllAPModal, ein Button (gegated auf
//   selectedProjectId), ein Modal. Wiederverwendung von availableWorkPackages,
//   compareApCode, calculateWPOpenHours, projectBookedPerWP, hoursPerPM.
// v7.4.6-49: A-038 Fokus-Weitersprung nach Abwesenheit in der AP-Zelle.
//   Tippt man U/K/S in eine Arbeitstag-Zelle, wird der Tag sofort zum
//   Abwesenheitstag und die Zelle durch die Cross-Projekt-Sperre (Etappe 2c,
//   v7.4.6-47) disabled -> der Fokus ging verloren, Enter lief ins Leere
//   (Regression aus dem Abwesenheits-Release). handleCellChange setzt den Fokus
//   jetzt selbst auf die naechste bebuchbare AP-Zelle (gleiche Kriterien wie die
//   Pfeil-/Enter-Navigation). Eingabeweg unveraendert, rein additiver Block.
// v7.4.6-48: A-036 Feiertags-Sperre der Fehlzeit-Zeilen. An berechneten
//   Feiertagen sind Urlaub/Krankheit/Sonstige nicht mehr frei editierbar:
//   U- und K-Zelle rendern an Feiertagen kein Eingabefeld (analog Wochenende),
//   die S-Zelle (Sonstige bezahlte Ausfallzeiten) bleibt sichtbar, aber
//   disabled -> zeigt weiter die berechneten Feiertagsstunden, schreibgeschuetzt;
//   an Nicht-Feiertagen (z.B. 24./31.12.) bleibt S voll editierbar. Alle drei
//   Zeilen erhalten an Feiertagen orangen Hintergrund (vorher nur S). Schliesst
//   zugleich die Luecke, dass U/K an einem Feiertag speicherbar waren (der
//   Speicher-Guard galt nur fuer S). Rein chirurgischer Eingriff in den Render
//   der drei Fehlzeit-Zeilen, keine Logikaenderung an Laden/Speichern.
// v7.4.6-47: A-034 Etappe 2c (Cross-Projekt-Abwesenheitssperre). An einem Tag
//   mit zentraler Abwesenheit (U/K/S, projektuebergreifend via Etappe 2a) ist
//   keine Arbeitsbuchung moeglich -- ganztaegig, ein Tag ist entweder
//   Abwesenheit ODER Arbeit. AP- und Nicht-foerderbar-Zellen werden gesperrt
//   dargestellt (disabled + Tooltip) und beide Eingabe-Handler blockieren
//   Arbeitswerte hart (Backstop). Abwesenheitscodes und Leeren der Fehlzeit-
//   Zeilen bleiben moeglich (Umklassifizieren/Loeschen). Die projektueber-
//   greifende 9h-Tagesgrenze (A-021) bleibt unveraendert.
// v7.4.6-46: A-034 Etappe 2b (Speichern). U/K/S werden NICHT mehr als
//   v7_timesheets-Zeilen geschrieben, sondern projektuebergreifend in
//   v7_employee_absences synchronisiert (Abgleich ueber Mitarbeiter+Monat:
//   neu/geaendert/entfernt). Sonderurlaub (S an einem NICHT-Feiertag) wandert
//   mit; S an einem berechneten Feiertag bleibt aussen vor (Feiertage werden
//   berechnet, nicht gespeichert). Harte Konfliktpruefung: pro Tag nur EIN Code.
//   KA, Arbeit und Sonstige bleiben unveraendert in v7_timesheets.
// v7.4.6-45: A-034 Etappe 2a (Laden). Abwesenheiten U/K/S werden zusaetzlich
//   projektuebergreifend aus der zentralen Tabelle v7_employee_absences geladen
//   (Dual-Read: Vorrang vor evtl. noch aktiven Alt-Zeilen in v7_timesheets).
//   KA, Arbeit und Sonstige bleiben unveraendert aus v7_timesheets. Reine
//   Lade-/Anzeigeaenderung; Speichern (Etappe 2b) folgt separat.
// v7.4.6-44: BUGFIX physischer Monatsdeckel / Cross-Projekt. otherProjectHours
//   zaehlte Fehlzeiten (Urlaub/Krankheit/Feiertag) als gearbeitete Stunden mit
//   -> Deckel schlug faelschlich an (z.B. 144,24 gearbeitet + 37,5 Urlaub +
//   7,5 Feiertag = 189,24). Query jetzt absence_code IS NULL: nur gearbeitete
//   Stunden zaehlen in Monatsdeckel UND 9h-Tagesgrenze (A-021).
//
// Datum: 23. Juni 2026
// Version: 7.4.6-43
// v7.4.6-43: Projektbezogene WAZ-Basis (Antrag/Bescheid).
//   - Project erhaelt pm_basis_weekly_hours. Soll (Arbeitsplan + AP-Restzahl)
//     rechnet ueber hoursPerPM(pmBasis) statt fester 173,33.
//   - Foerder-Monatsgrenze projektbasiert: hoursPerPM(pmBasis) x
//     (weekly_hours / firmStd). Ohne pm_basis = erbt Firmenstandard, unveraendert.
//   - NEU: physischer Monatsdeckel (projektuebergreifend) auf Basis der echten
//     Wochenarbeitszeit: dieses Projekt (foerderbar + sonstige) + alle anderen
//     Projekte des Monats <= hoursPerPM(weekly_hours). Harte Sperre.
//   - hoursPerPM importiert aus projektfortschritt-utils.
//
// v7.4.6-42: Diagnose komplett entfernt (Banner, dbgInfo-State, Statusmarken,
//   try/catch-Logging). Der Filter funktioniert: Ursache war ein Reihenfolge-
//   Crash (siehe -41), keine Daten-/RLS-Frage. Inhaltlich = sauberer Stand von
//   -37 plus der -41-Korrektur (teamEmployees nach den selected*-States).
// v7.4.6-41: FIX Reihenfolge-Crash. teamEmployees (useMemo, liest
//   selectedEmployeeId) stand oberhalb der selected*-State-Deklarationen ->
//   Runtime ReferenceError "selectedEmployeeId before initialization", Formular
//   stuerzte beim Rendern ab. teamEmployees jetzt NACH den selected*-States.
// v7.4.6-38..-40: temporaere Diagnose (wieder entfernt in -42).
// Version: 7.4.6-37
// v7.4.6-37: Teil 2a - MA-Auswahl aufs Projektteam beschraenken. Das Formular
//   lud zwar das Projektteam (teamNumbers), zeigte im MA-Dropdown aber alle
//   Firmen-MA. Bei Mehr-Projekt-Firmen konnte man so MA buchen, die dem Projekt
//   gar nicht zugeordnet sind. Jetzt: teamMemberIds (alle dem Projekt
//   zugeordneten MA, auch ohne employee_number); Dropdown auf diese gefiltert
//   (teamEmployees); der aktuell gewaehlte MA bleibt sichtbar (Deep-Link); beim
//   Projektwechsel wird automatisch auf den ersten Team-MA umgestellt, falls
//   der aktuelle nicht zum Team gehoert. Faellt das Team leer (Ladephase/kein
//   Team), bleibt die volle Liste -> kein Bruch. Keine sonstige Logik beruehrt.
// Version: 7.4.6-36
// v7.4.6-36: FIX Rahmen am Bildschirm. Unter Tailwind 4 hat "border" keine
//   Standard-Grau-Farbe mehr (currentColor) -- in leeren Zellen wurden die
//   Rahmen dadurch praktisch unsichtbar (Localhost), waehrend Produktiv/Druck
//   sie zeigten. Loesung: explizite Rahmenfarbe (#d1d5db) gezielt nur fuer die
//   Stundennachweis-Tabelle (.pze-ts-sheet), nicht global. Hinweis: falls die
//   Rahmen auch anderswo in der App fehlen, waere die saubere Wurzelloesung
//   eine Default-border-color-Regel in globals.css (Tailwind-4-Migration).
// v7.4.6-35: Kosmetik -- Wochenend-Zellen der Zeile "sonstige Arbeiten" wieder
//   im selben Grau (bg-gray-200) wie die uebrigen Wochenend-Spalten, damit das
//   Raster einheitlich aussieht. Editierbar bleiben sie (Input transparent ueber
//   grauem Feld). Hinweis: die Eingabemoeglichkeit am Wochenende sollte im
//   Benutzerhandbuch ergaenzt werden.
// v7.4.6-34: NEU Wochenend-Erfassung fuer nicht foerderbare Zeiten (z.B.
//   Dienstreise). Variante 2: NUR die Zeile "sonstige Arbeiten" (nicht
//   zuschussfaehig) ist am Wochenende editierbar; AP-Zeilen und U/K/S bleiben
//   am Wochenende gesperrt (keine versehentlich foerderbaren Wochenendstunden).
//   Die harte 9h-Tagesgrenze gilt nicht mehr am Wochenende (sie betrifft
//   foerderbare Werktagsstunden). Druck/Sammeldruck zeigen die Stunden bereits
//   in der Sonstige-Zeile -- keine Aenderung an Sheet/Daten-Util noetig.
// v7.4.6-33: FIX Fehlzeiten-Stapelung. Eine Fehlzeit (U/K/S) setzte bisher nur
//   die gewaehlte Zeile, ohne die anderen Fehlzeiten desselben Tages zu raeumen
//   -- so liessen sich U+K+S am selben Tag stapeln (z.B. 3x8h = 24h). Jetzt
//   exklusiv: das Setzen einer Fehlzeit entfernt die anderen U/K/S und einen
//   etwaigen KA-Marker dieses Tages. Ein Tag ist genau EINE Kategorie.
//   Enthaelt zusaetzlich den -32-Fix (Rechtsklick an KA-Tagen).
// v7.4.6-32: FIX Kurzarbeit -- an einem KA-Tag liess sich der Marker nicht mehr
//   entfernen. Ursache: das deaktivierte AP-Eingabefeld schluckt den Rechtsklick,
//   sodass das onContextMenu der Zelle (td) nicht ausgeloest wurde. Loesung:
//   gesperrtes AP-Feld an KA-Tagen auf pointer-events:none -- der Rechtsklick
//   geht jetzt zur Zelle durch und oeffnet das Menue ("Kurzarbeit entfernen").
// v7.4.6-31: NEU Kurzarbeit + Rechtsklick-Auswahl. Rechtsklick auf eine
//   AP-Tageszelle oeffnet ein Kontextmenue mit Urlaub / Krankheit / Sonstige
//   Ausfallzeit / Kurzarbeit. U/K/S nutzen dieselbe Logik wie das Tippen
//   (handleCellChange) -- kein doppelter Code. Kurzarbeit ist ein reiner
//   Tag-Marker (absence_code='KA', 0 Stunden, rein informativ): kein
//   Stundeneintrag irgendwo, der Tag wird im AP-Raster getoent + gesperrt und
//   erscheint -- NUR wenn vorhanden -- als eigene Zeile in Abschnitt 3
//   (Fehlzeiten) mit "KA"-Markierung und Tageszahl als Summe. Fehlklick-Schutz:
//   KA wird nicht auf Tage mit bereits erfassten Stunden/Fehlzeiten gesetzt.
//   Keine DB-Migration ('KA' ist nur ein neuer Wert in absence_code).
// v7.4.6-30: NEU "Meine Arbeitspakete"-Popup in der Zeiterfassung. Ein Knopf
//   neben der Mitarbeiter-Auswahl oeffnet ein Modal mit den dem aktuellen
//   Mitarbeiter im Arbeitsplan zugeordneten Arbeitspaketen (AP-Code,
//   Bezeichnung, ggf. T/NT, geplante und noch offene Stunden) -- ohne Umweg
//   ueber den Arbeitsplan. Reine Anzeige, nutzt vorhandene Bausteine
//   (assignedWPIds, plannedHoursPerWP, calculateRemainingHours).
// v7.4.6-29: "offen"-Spalte zeigt fuer Mitarbeiter, die einem AP NICHT
//   planmaessig zugeordnet sind, die projektweite Restzahl des AP in Blau
//   (Gesamt-Soll des AP minus projektweit gebuchte Stunden aller MA). So sieht
//   man, wo noch foerderbares Potenzial offen ist, ohne das Gesamt-Soll zu
//   ueberschreiten. Variante A: nur freie Stunden in Blau, sonst neutral (0),
//   kein Alarm. Zugeordnete MA weiterhin gruen/rot. Neuer State
//   projectBookedPerWP (Laden in reloadBookedHours), Helfer calculateWPOpenHours.
// v7.4.6-28: UX-Fix. Rote Fehler-/Warnmeldung (z.B. Tagesstunden-Warnung aus
//   -27) bleibt nicht mehr stehen, bis gespeichert wird. Neues onFocus auf allen
//   Eingabezellen (AP, nicht foerderbar, U/K/S) setzt die Meldung zurueck, sobald
//   der Nutzer in eine andere Zelle wechselt. Neuer Helfer handleCellFocus.
// v7.4.6-27: Wie -26 (Punkte 1 + 2 unveraendert), Punkt 3 verfeinert: Halbe
//   Tage bleiben zulaessig. Statt jede Fehlzeit zu blockieren, wird nur
//   geblockt, wenn an einem Tag Fehlzeit (U/K/S) + Arbeitszeit (AP + nicht
//   foerderbar) die Tagesstunden (employeeDailyHours) ueberschreiten - in
//   handleCellChange/handleNonBillableChange mit Hinweis, plus Backstop in
//   handleSave. Neue Helfer: sumAbsenceHoursForDay, sumWorkHoursForDay, fmtH.
// v7.4.6-26: Drei Korrekturen.
//   1. Doppel-Speichern verhindert: setSaving(true) fehlte komplett, der
//      Speichern-Button sperrte sich nie -> ein zweiter Klick startete
//      handleSave parallel und legte alle Zeilen erneut per INSERT an (Ursache
//      der Dubletten in PROD). Jetzt synchroner savingRef-Riegel +
//      setSaving(true); Reset im finally.
//   2. Pfeil-Navigation ueber Feiertage: canEdit ueberspringt jetzt auch
//      Feiertage und gesperrte Tage (nicht nur Wochenenden). Vorher blieb der
//      Fokus an der disabled Feiertagszelle haengen; ueber Wochenenden ging es.
//   3. Fehlzeit-Schutz (in -27 verfeinert, siehe oben).
// v7.4.6-25: Kontrast verstaerkt. Alle in -24 auf gray-700 gesetzten Stellen
//   (Feld-Labels, Hinweis, beide Fussnoten, Unterschriftszeilen, Steuerungs-
//   Labels "Mitarbeiter:"/"Projekt:") jetzt einheitlich gray-900, damit auch
//   der Fussnoten-Bereich kraeftig dunkel ist. Gesamtes Dokument durchgaengig
//   nahezu schwarz. Rein farblich; Schriftgroessen unveraendert. Modal-/
//   Footer-/Icon-Graustufen weiterhin unangetastet.
// v7.4.6-24: Kontrast-Optimierung (Anzeige + Druck). Dokument-Container
//   bekommt explizites text-gray-900, damit alle bisher farblosen Inhalte
//   (Werte, Tagesspalten, AP-Namen, Abschnittsueberschriften, Eingabe-/
//   Auswahlfelder) kraeftig dunkel dargestellt werden. Helle Beschriftungen
//   (Feld-Labels, rechtliche Hinweise/Fussnoten, Unterschriftszeilen, die
//   Steuerungs-Labels "Mitarbeiter:"/"Projekt:") von gray-500/600 auf gray-700.
//   Rein farblicher Eingriff: kein Layout, keine Struktur, kein Print-CSS
//   geaendert. Farbige Zellen, Platzhalter-Striche und Dialog-Fenster
//   bewusst unveraendert.
// v7.4.6-23: FIX Regression: Abwesenheitscode (U/K/S/F) in AP-Tageszelle
//   wird automatisch in die zugehoerige Fehlzeit-Zeile (U/K/S) uebernommen
//   - mit MA-Tagesstunden (employeeDailyHours), F -> Sonstige (S). Die AP-Zelle
//   wird dabei geleert. Seit v7.4.6-16 lief ein dort getippter Code ins Leere
//   (calculateAbsenceSums liest nur absenceHoursInput). Direkte Eingabe in den
//   unteren Fehlzeit-Zeilen bleibt unveraendert moeglich. Eingriff nur in
//   handleCellChange. (Symptom: 'U' angezeigt, aber unten nicht als Fehlzeit.)
// v7.4.6-22: A-021: NWM-Tagessperren + Cross-Projekt-Validierung.
//   NWM-Projekte: Admin/PL kann Tage fuer MA sperren (v7_nwm_blocked_periods).
//   Gesperrte Zellen: disabled, rosa Hintergrund, Tooltip mit Grund.
//   Cross-Projekt: Stunden anderer Projekte werden geladen. 9h-Tagesgrenze
//   gilt jetzt projektuebergreifend (calcCrossProjectTagSumme).
//   Sperren-Modal: Erstellen/Loeschen von Sperrperioden, MA-Mehrfachauswahl.
// v7.4.6-21: A-002: Wording bei ZIM_NETZWERK: Abschnitts-Ueberschrift
//   "foerderbare Management-Arbeiten" statt "foerderbare Projektarbeiten"
//   (offizielles ZIM-NWM-Template). Standard-Wording unveraendert.
//   A-003: AP-Quick-View Popup: Info-Icon neben Projekt-Dropdown oeffnet
//   Modal mit AP-Liste (AP-Code, Name, Laufzeit, geplante PM).
//   Sichtbar fuer alle Nutzer. Eigener State, kein Eingriff in Formular-Logik.
// v7.4.6-20: FIX: AP-Name im Druck/PDF nicht mehr abgeschnitten.
//   line-clamp im Print aufgehoben, maxWidth entfernt im Print.
//   Select im Print als statischer Text (kein display:none mehr).
// v7.4.6-19: Diagnose-Logging fuer Feiertags-Auto-Fill
// v7.4.6-18: FIX: Feiertage werden automatisch als Fehlzeiten in der S-Zeile
//   (Sonstige bezahlte Ausfallzeiten) vorbelegt. Beim Laden der Zeiteintraege
//   werden Werktags-Feiertage ohne bestehenden S-Eintrag mit Tagesstunden
//   (standard_weekly_hours / 5) vorbelegt. Bereits manuell erfasste S-Werte
//   werden NICHT ueberschrieben. Betroffen waren z.B. April 2026 (Ostern)
//   und Mai 2026 (Tag der Arbeit, Christi Himmelfahrt, Pfingstmontag).
//   FIX: company (federal_state, holiday_region, standard_weekly_hours) in
//   loadTimeEntries useEffect-Dependencies ergaenzt - ohne diesen Eintrag
//   lief der Auto-Fill mit staler company-Referenz (noch ohne federal_state).
// v7.4.6-17: Fehlzeiten-Zellen weiss (statt farbig), Tastaturnavigation
//   (Pfeiltasten/Tab/Enter), setHasChanges bei Abwesenheitseingabe.
// Datum: 7. Mai 2026
// v7.4.6-16: Fehlzeiten (U/K/S) direkt editierbar - keine Automatik mehr.
//   Tageszellen in U/K/S-Zeilen sind frei editierbar (wie Excel).
//   absenceHoursInput State, Laden aus DB, Speichern ohne employeeDailyHours.
// v7.4.6-15: Abwesenheitsstunden (U/K/S/F) basieren auf MA-Tagesstunden
//   (weeklyHoursAtMonth / 5) statt Firmen-Standard (companyDailyHours).
//   Teilzeit 30h/Woche -> 6h/Tag bei U/K/S statt 8h.
// // v7.4.6-14: FIX: findTagVerletzung vor Aufruf definiert (Temporal Dead Zone)
// v7.4.6-13: Harte Verletzung sperrt auch Drucken, PDF Export und
//   Monat-abschliessen. GF-Zelle im Druck neutral (print:bg-green).
//   Floating-Point-Fix: alle Grenzenvergleiche auf 2 Dez. gerundet.
// v7.4.6-12: Arbeitszeitgrenzen finale Haertung:
//   - Monatsgrenze HART (wie Tagesgrenze): Speichern gesperrt + Monatssummen-
//     Zelle rot wenn ueberschritten. Weich-Modal fuer Monat entfernt.
//   - Tagessummenzelle rot wenn > 9h (visuelles Feedback direkt in Tabelle)
//   - Heute-Ampel entfernt (war konzeptionell falsch)
//   - Fehlermeldung im Ampel-Bereich bei Grenzueberschreitung
//   - GF-50%-Regel bleibt weich (Ermessensspielraum beim PT)
// v7.4.6-11: PHASE 3 Arbeitszeitgrenzen
// v7.4.6-8: FIX ArrowDown Navigation: leere AP-Zeilen werden uebersprungen, nonbillable immer erreichbar
// v7.4.6-7: FIX getAbsencesForDay + calculateAbsenceSums: nonBillableEntries (sonstige Arbeiten) fehlte
// v7.4.6-6: AP-Sortierfunktion compareApCode (Versions-Sort fuer dreistellige AP-Nummern)
// v7.4.6-5: AP-Spalte 30->55px, Summe-Monat 50->25px (Druck-neutral), offen 50->25px, Summe-Header -> Sigma
// v7.4.6-4: Vorbelegte AP-Zeilen werden nach ap_number/ap_sub_number
//   aufsteigend sortiert. Bisher kamen sie in der zufaelligen Reihenfolge
//   der DB-Query (v7_work_package_assignments) -> 5,7,3,4,6,8 statt 3,4,5,6,7,8.
//
// v7.4.6-3: Trennung von Vorbelegung und Dropdown:
//   - Matrix-Vorbelegung bei leerem Monat beachtet jetzt den Laufzeit-Check
//     (end_date + 2 Monate >= Monatsende). Alte APs werden nicht mehr
//     vorbelegt, selbst wenn sie noch offene Stunden haben.
//   - Dropdown "Weitere AP" zeigt wieder ALLE uebrigen echten APs des
//     Projekts (ohne Laufzeit-Check), damit Vertretungsfaelle moeglich
//     bleiben. Nur Ueberschriften (PM=0) und APs ohne Datum bleiben
//     auch hier ausgeblendet.
//
// v7.4.6-2: AP-Dropdown gefiltert:
//   - "Ueberschriften"-APs (total_person_months NULL oder 0) erscheinen
//     NIE mehr im Dropdown (weder zugeordnet noch Weitere AP)
//   - APs ohne start_date/end_date werden konservativ ausgeblendet
//   - "Zugeordnete AP" zeigt nur APs, deren end_date + 2 Monate >=
//     Monatsende des gewaehlten Timesheet-Monats liegt
//   - "Weitere AP" enthaelt alle anderen echten APs (mit PM & Datum):
//     abgelaufene zugeordnete, nicht zugewiesene, ausgeschoepfte
//   - WorkPackage-Interface um total_person_months, start_date, end_date
//     erweitert (wird von berater-ze-seite / zeiterfassung-page geliefert)
//
// v7.4.6-1: Feiertagsberechnung konsolidiert - nutzt zentrale Utility
//   src/lib/holidays/germanHolidays.ts. Lokale getEasterSunday/getGermanHolidays/
//   normalizeStateCode entfernt. Neues Feld company.holiday_region wird
//   an die Utility durchgereicht (kommunale Sonderfaelle wie BY_EVAN,
//   BY_AUGSBURG, SN_SORB, TH_EICHSFELD).
//
// v7.4.3-22: Timesheet-Notizen ueberarbeitet:
//   - Kein Loeschen mehr, nur noch Erledigt-Checkbox
//   - Ersteller-Name wird angezeigt (wer hat Notiz geschrieben)
//   - Erlediger-Name wird angezeigt (wer hat Erledigt gesetzt)
//   - Textfeld unbegrenzt (Ergaenzungen unten drunter)
//   - Alles print:hidden (keine Notizen im Druck)
//
// v7.4.3-21: NEU: Interne Timesheet-Notizen (Rueckfragen)
//   - Notiz-Icon neben Monatsauswahl (nur fuer PL/Admin/Berater sichtbar)
//   - Klick oeffnet Modal mit Freitext + offen/erledigt-Status
//   - Orange wenn offene Notiz existiert, sonst dezent grau
//   - Daten aus v7_timesheet_notes (1 Notiz pro MA/Projekt/Monat)
//   - Completion-Status Fix: loadCompletionStatus explizit aufgerufen
//
// v7.4.3-20: Compliance-Absicherung: Monatsauswahl eingeschraenkt auf
//   gueltigen Zeitraum. Beruecksichtigt:
//   - employment_start/end aus v7_employees (Firmenzugehoerigkeit)
//   - assignment_start/end aus v7_project_assignments (Projektzuordnung)
//   - start_date/end_date aus v7_projects (Projektlaufzeit)
//   Ungueltige Monate erscheinen gar nicht im Dropdown.
//   Pfeil-Navigation stoppt an den Raendern des erlaubten Bereichs.
//   Verhindert Zeiterfassung fuer Perioden in denen MA nicht im
//   Unternehmen oder nicht im Projekt war (Subventionsbetrugs-Praevention).
//
// v7.4.3-19: (Zwischenversion, Inkrement-Fehler)
// v7.4.3-18: (vorherige Version)
// v7.4.3-17: MA-Dropdown sortiert nach Team-Nummer (employee_number aus
//   v7_project_assignments) wenn ein Projekt ausgewaehlt ist.
//   Fallback: alphabetisch wenn kein Projekt oder MA nicht im Team.
//
// v7.4.3-16: "Monat abschliessen" speichert automatisch mit
//   - handleToggleComplete prueft hasChanges
//   - Falls ungespeichert: erst handleSave(), dann Completion setzen
//   - Kein separater Speichern-Klick noetig beim Abschliessen
//
// Wird von beiden Portalen genutzt:
// - Firmen-Portal: /v7/firma/zeiterfassung
// - Berater-Portal: /v7/berater/foerderung/firma/[id]/zeiterfassung
//
// v7.4.3-9: NEU: "Monat abschliessen"-Button
//            - Setzt Completion-Flag in v7_timesheet_completions
//            - Wird automatisch zurueckgesetzt wenn Aenderungen gespeichert werden
//            - Matrix-Ampel nutzt Completion-Flag fuer Gruen-Status
// v7.4.3-8: FIX: Feiertagsstunden werden jetzt in Summe "Sonstige" eingerechnet
// v7.4.3-7: FIX: Mariae Himmelfahrt fuer Bayern (DE-BY)
//            FIX: Bundesland-Normalisierung (DB: "Bayern" -> "DE-BY")
//            FIX: Feiertagsstunden aus standard_weekly_hours (Unternehmen)
//            FIX: Komma als Dezimaltrennzeichen durchgaengig
// v7.4.3-4: FIX: Vorbelegung wartet auf geladene Arbeitsplan-Daten
//            Verhindert dass APs mit offen=0 oder negativ vorbelegt werden
// v7.4.3-3: Vorbelegung + Dropdown nur APs mit offenen Stunden
//            Ausgeschoepfte APs nur ueber "Weitere AP" waehlbar
// v7.4.3-2: FIX: offen-Spalte aktualisiert sich sofort nach Speichern
//            (reloadBookedHours nach handleSave aufrufen)
// v7.4.3:    NEU: "offen"-Spalte pro AP-Zeile zeigt verbleibende Stunden
//            (geplant laut Arbeitsplan minus bisher erfasst ueber alle Monate)
//            NEU: AP-Vorbelegung aus Arbeitsplan-Zuordnungen des MA
//            (zugeordnete APs werden automatisch vorbelegt, Dropdown zweigeteilt)
// v7.3.91:   initialYear + initialMonth Props: Monat vorauswaehlen bei
//            Navigation aus Mein-Status oder Berichte-Seite
// v7.3.89:   FIX T-Spalte: T/NT statt X/- Anzeige
//            Getrennte Summenzeilen (technisch/nicht-technisch) bei ZIM_DS
//            Neue Hilfsfunktion isTechnicalAP() behandelt boolean, string,
//            number korrekt (DB liefert manchmal andere Typen als erwartet)
// v7.3.88-10: CRITICAL FIX - Null-Safety fuer Props (Vercel Production Crash)
//             employees, projects, workPackages als safeXxx abgesichert
//             Verhindert "filter is undefined" Fehler in Production Build
// v7.3.86-4: FIX Fehlzeiten-Speicherung - DB-Constraint beachten:
//            work_package_id und absence_code schliessen sich aus!
//            Bei Fehlzeiten: work_package_id = null, hours = 8
//            Lade-Logik angepasst fuer Fehlzeiten ohne work_package_id
// v7.3.86-3: Speichern-Button im Unsaved-Dialog wiederhergestellt
//            Erweitertes Debug-Logging fuer AP-Lade-Problem
// v7.3.86-2: Debug-Logging fuer Timesheet-Laden bei Monatswechsel
//            project_id Filter in Lade-Query hinzugefuegt
// v7.3.86-1: Jahr-Auswahl 2020-2030 wiederhergestellt
//            TypeScript Fix - is_technical Vergleich korrigiert
// v7.3.85-5: Features:
// - Excel-Navigation (Pfeiltasten, Tab, Shift+Tab, Enter)
// - PDF-Export mit Speicherdialog
// - Feiertags-Berechnung pro Bundesland
// - Fehlzeiten (U/K/S)
// - Dynamische AP-Zeilen
// - Durchfuehrbarkeitsstudien-Modus
// - Jahr 2020-2030 waehlbar
// - T-Spalte: Zeigt X wenn AP technisch (is_technical === true)
// - AP-Dropdown: Nur Nummer ohne "AP" Prefix
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { hoursPerPM } from '@/lib/projektfortschritt-utils';
import { istGeschaeftsfuehrerTitle } from '@/types/v7-types';
import {
  getGermanHolidays,
  type HolidayRegion,
} from '@/lib/holidays/germanHolidays';

// ============================================================================
// KONSTANTEN
// ============================================================================

const PORTAL_COLORS = {
  berater: {
    primary: '#0369a1',     // Sky-700 (wie in v7-constants)
    button: 'bg-sky-600 hover:bg-sky-700',
    text: 'text-sky-700',
    ring: 'focus:ring-sky-500',
  },
  firma: {
    primary: '#65A655',
    button: 'bg-green-600 hover:bg-green-700',
    text: 'text-green-600',
    ring: 'focus:ring-green-500',
  },
};

const HEADER_ORANGE = '#F5D9C0';

// ============================================================================
// ARBEITSZEITGRENZEN (Phase 3, v7.4.6-11)
// Konsistent mit v7-types.ts und KONZEPT-ARBEITSZEITGRENZEN-v1_3.md
// ============================================================================
// v7.4.6-43: MONATSGRENZE_VOLLZEIT entfernt -- Monatsgrenze laeuft jetzt
// projektbasiert ueber hoursPerPM(pmBasis) (siehe projektfortschritt-utils).
const TAGESGRENZE_HART = 9;            // PT-Richtlinie, absolut
// v7.4.6-60: GF-Erkennung zentralisiert in istGeschaeftsfuehrerTitle()
// (v7-types.ts). Toleriert Umlaut-/ASCII-Schreibweise und die weibliche Form.
// Die fruehere lokale Konstante GF_POSITIONS_LOCAL (exakter ASCII-Match) ist
// entfernt -- sie war die Ursache, dass die 50%-Regel bei DB-Werten mit echten
// Umlauten nicht mehr griff.

const MONTH_NAMES = [
  'Januar', 'Februar', 'Maerz', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

const ABSENCE_CODES = ['U', 'K', 'S', 'F'];
const DAILY_HOURS = 8;

// ============================================================================
// TYPEN
// ============================================================================

interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  weekly_hours: number | null;
  employment_start: string | null;
  employment_end: string | null;
}

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_reference: string | null;
  funding_format: string | null;
  start_date: string | null;
  end_date: string | null;
  // v7.4.6-43: WAZ-Basis aus Antrag/Bescheid. NULL = erbt standard_weekly_hours der Firma.
  pm_basis_weekly_hours: number | null;
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_sub_number?: number;
  ap_code: string | null;
  name: string;
  is_technical?: boolean | null;  // NEU: Technisches AP (fuer ZIM_DS)
  total_person_months: number | null;  // v7.4.6-2: Ueberschriften-Filter
  start_date: string | null;            // v7.4.6-2: Laufzeit-Filter
  end_date: string | null;              // v7.4.6-2: Laufzeit-Filter
}

interface ClientCompany {
  id: string;
  name: string;
  federal_state: string | null;
  holiday_region: string | null;  // v7.4.6: kommunaler Feiertags-Override
  standard_weekly_hours: number | null;
}

interface CalendarEntry {
  id?: string;
  value: string;
}

interface APRow {
  workPackageId: string | null;
  entries: Record<number, CalendarEntry>;
}

// A-021: NWM-Tagessperren
interface BlockedPeriod {
  id: string;
  project_id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_by: string;
  created_at: string;
}

interface TimesheetFormProps {
  portal: 'berater' | 'firma';
  companyId: string;
  company: ClientCompany;
  employees: Employee[];
  projects: Project[];
  workPackages: WorkPackage[];
  currentUserId: string;
  currentUserDisplayName: string;
  isAdmin: boolean;
  onBack: () => void;
  initialEmployeeId?: string;
  initialProjectId?: string;
  initialYear?: number;
  initialMonth?: number;
}

// ============================================================================
// FEIERTAGS-BERECHNUNG
// ============================================================================
// Zentralisiert ab v7.4.6 in src/lib/holidays/germanHolidays.ts
// Siehe Import-Block ganz oben. Funktionen: getGermanHolidays, normalizeStateCode

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function TimesheetForm({
  portal,
  companyId,
  company,
  employees,
  projects,
  workPackages,
  currentUserId,
  currentUserDisplayName,
  isAdmin,
  onBack,
  initialEmployeeId,
  initialProjectId,
  initialYear,
  initialMonth,
}: TimesheetFormProps) {
  const supabase = createClient();
  const printRef = useRef<HTMLDivElement>(null);
  const colors = PORTAL_COLORS[portal];
  const router = useRouter();  // v7.4.6-62: fuer ZA-Sprung

  // SAFETY: Props mit Default-Werten absichern (verhindert Vercel Production Crash)
  const safeEmployees = employees || [];
  const safeProjects = projects || [];
  const safeWorkPackages = workPackages || [];

  // Team-Nummern fuer das aktuell gewaehlte Projekt (employee_id -> employee_number)
  const [teamNumbers, setTeamNumbers] = useState<Map<string, number>>(new Map());
  // v7.4.6-37 (Teil 2a): alle dem Projekt zugeordneten MA-IDs (auch ohne
  // employee_number) - Grundlage fuer den MA-Dropdown-Filter.
  const [teamMemberIds, setTeamMemberIds] = useState<Set<string>>(new Set());

  // NEU v7.4.3-20: Assignment-Daten fuer Zeitraum-Einschraenkung
  const [assignmentStart, setAssignmentStart] = useState<string | null>(null);
  const [assignmentEnd, setAssignmentEnd] = useState<string | null>(null);

  // NEU v7.4.3-21: Timesheet-Notizen (interne Rueckfragen)
  const [noteText, setNoteText] = useState<string>('');
  const [noteStatus, setNoteStatus] = useState<'offen' | 'erledigt' | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteEditing, setNoteEditing] = useState<string>('');
  const [noteSaving, setNoteSaving] = useState(false);
  // NEU v7.4.3-22: Ersteller + Erlediger
  const [noteCreatedBy, setNoteCreatedBy] = useState<string>('');
  const [noteCreatedAt, setNoteCreatedAt] = useState<string>('');
  const [noteResolvedBy, setNoteResolvedBy] = useState<string>('');
  const [noteResolvedAt, setNoteResolvedAt] = useState<string>('');

  // NEU v7.4.6-21 (A-003): AP-Quick-View Modal
  const [showAPModal, setShowAPModal] = useState(false);
  // NEU v7.4.6-30: "Meine Arbeitspakete"-Modal (dem MA zugeordnete APs)
  const [showMyAPModal, setShowMyAPModal] = useState(false);
  // NEU v7.4.6-50: "Alle AP"-Modal (projektweiter AP-Status: Soll/gebucht/offen)
  const [showAllAPModal, setShowAllAPModal] = useState(false);

  // NEU v7.4.6-22 (A-021): NWM-Tagessperren
  const [blockedDays, setBlockedDays] = useState<Set<number>>(new Set());
  const [blockedDayReasons, setBlockedDayReasons] = useState<Record<number, string>>({});
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [allBlockedPeriods, setAllBlockedPeriods] = useState<BlockedPeriod[]>([]);
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);
  const [blockFormEmployees, setBlockFormEmployees] = useState<string[]>([]);
  const [blockFormStart, setBlockFormStart] = useState('');
  const [blockFormEnd, setBlockFormEnd] = useState('');
  const [blockFormReason, setBlockFormReason] = useState('');

  // NEU v7.4.6-22 (A-021): Cross-Projekt-Validierung
  const [otherProjectHours, setOtherProjectHours] = useState<Record<number, number>>({});
  // Sortierte MA-Liste: nach Team-Nr. wenn Projekt gewaehlt, sonst alphabetisch
  const sortedEmployees = useMemo(() => {
    if (teamNumbers.size === 0) return safeEmployees;
    return [...safeEmployees].sort((a, b) => {
      const nA = teamNumbers.get(a.id) ?? 9999;
      const nB = teamNumbers.get(b.id) ?? 9999;
      if (nA !== nB) return nA - nB;
      return (a.display_name || '').localeCompare(b.display_name || '');
    });
  }, [safeEmployees, teamNumbers]);

  // v7.4.6-66: "Alle AP"-Modal MA-Aufschluesselung. Je AP eine Map employee_id -> Stunden.
  //   projectBookedPerWpPerMa: projektweit gebuchte Stunden je (AP, MA) aus v7_timesheets.
  //   plannedHoursPerWpPerMa: geplante Stunden je (AP, MA) aus v7_work_package_assignments
  //   (planned_person_months x hoursPerPM), ueber das GANZE Team (nicht nur den gewaehlten MA).
  //   MUSS vor allApTeam stehen (wird dort als useMemo-Dependency referenziert).
  const [projectBookedPerWpPerMa, setProjectBookedPerWpPerMa] = useState<Record<string, Record<string, number>>>({});
  const [plannedHoursPerWpPerMa, setPlannedHoursPerWpPerMa] = useState<Record<string, Record<string, number>>>({});

  // v7.4.6-66: Projekt-Team als Spalten fuer das "Alle AP"-Modal.
  //   Quelle: teamNumbers (dem Projekt zugeordnete MA), sortiert nach Team-Nr.
  //   Fallback: MA, die im Projekt geplante oder gebuchte Stunden haben.
  const allApTeam = useMemo(() => {
    const ids = new Set<string>();
    teamNumbers.forEach((_n, id) => ids.add(id));
    if (ids.size === 0) {
      Object.values(plannedHoursPerWpPerMa).forEach(m => Object.keys(m).forEach(id => ids.add(id)));
      Object.values(projectBookedPerWpPerMa).forEach(m => Object.keys(m).forEach(id => ids.add(id)));
    }
    const list = safeEmployees.filter(e => ids.has(e.id));
    list.sort((a, b) => {
      const nA = teamNumbers.get(a.id) ?? 9999;
      const nB = teamNumbers.get(b.id) ?? 9999;
      if (nA !== nB) return nA - nB;
      return (a.display_name || '').localeCompare(b.display_name || '');
    });
    return list;
  }, [safeEmployees, teamNumbers, plannedHoursPerWpPerMa, projectBookedPerWpPerMa]);

  // v7.4.6-66: Kurzlabel "V.Nachname" (Vorname-Initial . Nachname) fuer MA-Spalten.
  const maShortLabel = (emp: { first_name?: string | null; last_name?: string | null; display_name?: string | null } | undefined): string => {
    if (!emp) return '?';
    const ln = (emp.last_name || '').trim();
    const fn = (emp.first_name || '').trim();
    if (ln && fn) return `${fn.charAt(0)}.${ln}`;
    if (ln) return ln;
    const dn = (emp.display_name || '').trim();
    if (dn.includes(',')) {
      const parts = dn.split(',');
      const l = (parts[0] || '').trim();
      const f = (parts[1] || '').trim();
      return f ? `${f.charAt(0)}.${l}` : l;
    }
    return dn || '?';
  };

  // State
  const [saving, setSaving] = useState(false);
  // v7.4.6-26: Synchroner Wiedereintritts-Riegel gegen Doppel-Speichern.
  // setSaving allein reicht nicht (State-Update ist asynchron); ein Ref blockt
  // einen zweiten parallelen handleSave-Aufruf sofort, bevor er INSERTen kann.
  const savingRef = useRef(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loadingCompletion, setLoadingCompletion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Ausgewaehlte Werte
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmployeeId || safeEmployees[0]?.id || '');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || safeProjects[0]?.id || '');
  const [selectedYear, setSelectedYear] = useState<number>(initialYear || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth || new Date().getMonth() + 1);

  // v7.4.6-41 FIX: teamEmployees MUSS nach den selected*-States stehen
  // (es liest selectedEmployeeId). Vorher stand es darueber -> Runtime-Crash
  // "can't access lexical declaration 'selectedEmployeeId' before initialization",
  // wodurch das Formular gar nicht rendern konnte (daher Fallback alle MA).
  // v7.4.6-37 (Teil 2a): MA-Dropdown auf das Projektteam filtern. Faellt das
  // Team leer (Ladephase / Projekt ohne Team), volle Liste als Fallback (kein
  // leeres Dropdown). Der aktuell gewaehlte MA bleibt immer sichtbar.
  const teamEmployees = useMemo(() => {
    if (teamMemberIds.size === 0) return sortedEmployees;
    const inTeam = sortedEmployees.filter(e => teamMemberIds.has(e.id));
    if (selectedEmployeeId && !teamMemberIds.has(selectedEmployeeId)) {
      const sel = safeEmployees.find(e => e.id === selectedEmployeeId);
      if (sel) return [sel, ...inTeam];
    }
    return inTeam;
  }, [sortedEmployees, teamMemberIds, selectedEmployeeId, safeEmployees]);

  // Unterschriftsdatum
  const [signatureDate, setSignatureDate] = useState<string>('');

  // Dialog fuer ungespeicherte Aenderungen
  const [showUnsavedDialog, setShowUnsavedDialog] = useState<(() => void) | null>(null);

  // Zeiterfassungs-Daten
  const [apRows, setApRows] = useState<APRow[]>([
    { workPackageId: null, entries: {} },
    { workPackageId: null, entries: {} },
    { workPackageId: null, entries: {} },
    { workPackageId: null, entries: {} },
  ]);
  const [nonBillableEntries, setNonBillableEntries] = useState<Record<number, CalendarEntry>>({});
  // v7.4.6-63: Auto-Vorbelegung "sonstige Arbeiten"
  // nonBillableManual: Tage, die der Nutzer manuell gesetzt/geloescht hat ->
  //   werden nie automatisch veraendert.
  // monthHadData: hatte der Monat beim Laden bereits gespeicherte Daten? ->
  //   steuert, ob leere Tage automatisch aufgefuellt werden (nur neuer Monat).
  const [nonBillableManual, setNonBillableManual] = useState<Record<number, boolean>>({});
  const [monthHadData, setMonthHadData] = useState<boolean>(false);
  const [saveHint, setSaveHint] = useState<string>('');
  // v7.4.6-16: Fehlzeiten-Stunden direkt editierbar (keine Automatik mehr)
  const [absenceHoursInput, setAbsenceHoursInput] = useState<{
    U: Record<number, CalendarEntry>;
    K: Record<number, CalendarEntry>;
    S: Record<number, CalendarEntry>;
  }>({ U: {}, K: {}, S: {} });

  // v7.4.6-31: Kurzarbeit -- reiner Tag-Marker (keine Stunden). Praesenz je Tag.
  const [kurzarbeitInput, setKurzarbeitInput] = useState<Record<number, { id?: string }>>({});
  // v7.4.6-31: Rechtsklick-Kontextmenue (Urlaub/Krankheit/Sonstige/Kurzarbeit)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; rowIndex: number; day: number } | null>(null);

  // NEU v7.4.3: Arbeitsplan-Daten fuer "offen"-Spalte und AP-Vorbelegung
  // Geplante Stunden pro WP fuer den aktuellen MA (aus v7_work_package_assignments)
  const [plannedHoursPerWP, setPlannedHoursPerWP] = useState<Record<string, number>>({});
  // Bereits erfasste Stunden pro WP ueber ALLE Monate (kumuliert aus v7_timesheets)
  const [totalBookedPerWP, setTotalBookedPerWP] = useState<Record<string, number>>({});
  // v7.4.6-29: Projektweit gebuchte Stunden je AP (ueber ALLE Mitarbeiter).
  // Grundlage fuer die blau angezeigte projektweite Restzahl bei nicht
  // zugeordneten Mitarbeitern.
  const [projectBookedPerWP, setProjectBookedPerWP] = useState<Record<string, number>>({});
  // v7.4.6-61: Beim Laden gespeicherter Monatsstand je AP (Basis fuer die
  // Live-Berechnung der rechten "offen"-Spalte). Live-Rest = geplant minus
  // (gebucht_gesamt + (aktueller Formstand - dieser Schnappschuss)).
  const [savedMonthHoursPerWP, setSavedMonthHoursPerWP] = useState<Record<string, number>>({});
  // IDs der APs, die dem MA laut Arbeitsplan zugeordnet sind
  const [assignedWPIds, setAssignedWPIds] = useState<string[]>([]);

  // Feiertage
  const [holidays, setHolidays] = useState<Map<string, string>>(new Map());

  // ============================================================================
  // ARBEITSZEITGRENZEN STATE (v7.4.6-12)
  // ============================================================================
  const [weeklyHoursAtMonth, setWeeklyHoursAtMonth] = useState<number>(40);
  const [positionTitle, setPositionTitle] = useState<string | null>(null);

  // Abgeleitete Werte
  const selectedProject = safeProjects.find(p => p.id === selectedProjectId);
  const availableWorkPackages = safeWorkPackages.filter(wp => wp.project_id === selectedProjectId);
  const selectedEmployee = safeEmployees.find(e => e.id === selectedEmployeeId);
  const isDurchfuehrbarkeitsstudie = selectedProject?.funding_format?.includes('DS') || false;
  const isNetzwerk = selectedProject?.funding_format === 'ZIM_NETZWERK';  // A-002: Wording-Steuerung

  // v7.4.6-43: WAZ-Basis fuer PM->Stunden und Foerder-Monatsgrenze.
  // firmStdWAZ = Regelarbeitszeit der Firma; pmBasisWAZ = Projekt-Override
  // (Antrag/Bescheid) oder Fallback auf Firmenstandard bzw. 40.
  const firmStdWAZ = company?.standard_weekly_hours ?? 40;
  const pmBasisWAZ = selectedProject?.pm_basis_weekly_hours ?? firmStdWAZ;

  // Hilfsfunktion: Prueft ob AP technisch ist (robust gegen verschiedene DB-Datentypen)
  const isTechnicalAP = (wp: WorkPackage | undefined | null): boolean => {
    if (!wp) return false;
    const val = wp.is_technical as unknown;
    if (val === true || val === 'true' || val === 'TRUE' || val === '1' || val === 1) return true;
    return false;
  };

  // ==========================================================================
  // v7.4.6-5: Universelle AP-Sortierfunktion (Versions-Sort)
  // --------------------------------------------------------------------------
  // Zerlegt ap_code (z.B. "3.1.1") punktweise in Zahlen und vergleicht
  // numerisch je Ebene. Fallback auf ap_number/ap_sub_number wenn kein ap_code.
  // Korrekt fuer beliebige Tiefe: 3 < 3.1 < 3.1.1 < 3.2 < 3.4 < 4 < 5.1
  // ==========================================================================
  const compareApCode = (a: WorkPackage, b: WorkPackage): number => {
    const getCode = (wp: WorkPackage) =>
      wp.ap_code
        ? wp.ap_code.replace(/^AP\s*/i, '')
        : `${wp.ap_number}${wp.ap_sub_number ? `.${wp.ap_sub_number}` : ''}`;
    const aParts = getCode(a).split('.').map(Number);
    const bParts = getCode(b).split('.').map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const diff = (aParts[i] || 0) - (bParts[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };

  // ==========================================================================
  // v7.4.6-2: AP-Gruppenzuordnung fuer Dropdown
  // --------------------------------------------------------------------------
  // Ein AP ist nur dann ueberhaupt waehlbar, wenn:
  //   1. total_person_months > 0   (keine Ueberschriften)
  //   2. start_date UND end_date sind gesetzt   (keine Altdaten)
  // ==========================================================================

  const isSelectableAP = (wp: WorkPackage): boolean => {
    const pm = wp.total_person_months ?? 0;
    if (pm <= 0) return false;
    if (!wp.start_date || !wp.end_date) return false;
    return true;
  };

  // Referenzdatum = Monatsende des gewaehlten Timesheet-Monats
  // (getDaysInMonth wird inline repliziert, da es erst weiter unten im
  //  File deklariert ist und const-Funktionen nicht gehoistet werden)
  const getReferenceDate = (): Date => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    return new Date(selectedYear, selectedMonth - 1, daysInMonth);
  };

  // Zugeordnete AP: dem MA zugewiesen, mit offenen Stunden, und
  // end_date + 2 Monate >= Monatsende des gewaehlten Timesheet-Monats.
  const isAPInAssignedGroup = (wp: WorkPackage): boolean => {
    if (!isSelectableAP(wp)) return false;
    if (!assignedWPIds.includes(wp.id)) return false;
    const planned = plannedHoursPerWP[wp.id] || 0;
    const booked = totalBookedPerWP[wp.id] || 0;
    if (planned <= 0) return false;
    if ((planned - booked) <= 0) return false;
    // Laufzeit-Check: end_date + 2 volle Monate
    // Wir vergleichen nur monatsgenau, deshalb den Tag auf 1 setzen
    // (vermeidet JS-Rollover bei Monatsenden wie 31.7 -> 1.10)
    const endDate = new Date(wp.end_date as string);
    const endPlus2 = new Date(endDate.getFullYear(), endDate.getMonth() + 3, 0); // letzter Tag von Monat + 2
    const ref = getReferenceDate();
    return endPlus2 >= ref;
  };

  // Weitere AP (v7.4.6-3): Alle uebrigen echten APs (mit PM > 0 und Datum),
  // die nicht bereits in "Zugeordnete AP" sichtbar sind. Kein Laufzeit-Check
  // hier, damit Vertretungsfaelle (Uebernahme von einem anderen MA) moeglich
  // bleiben. Nur Ueberschriften und APs ohne Datum werden ausgeblendet.
  const isAPInWeitereGroup = (wp: WorkPackage): boolean => {
    if (!isSelectableAP(wp)) return false;
    return !isAPInAssignedGroup(wp);
  };

  const allRowsFilled = apRows.every(row => row.workPackageId !== null);

  // ============================================================================
  // NEU v7.4.3-20: Erlaubter Zeitraum fuer Monatsauswahl
  // ============================================================================
  // Beruecksichtigt: employment_start/end, assignment_start/end, project start/end
  // Ergebnis: { firstYear, firstMonth, lastYear, lastMonth } oder null (alles erlaubt)

  const allowedRange = useMemo(() => {
    // Fruehestes Datum = Maximum aus employment_start, assignment_start, project.start_date
    const startDates: string[] = [];
    if (selectedEmployee?.employment_start) startDates.push(selectedEmployee.employment_start);
    if (assignmentStart) startDates.push(assignmentStart);
    if (selectedProject?.start_date) startDates.push(selectedProject.start_date);

    // Spaetestes Datum = Minimum aus employment_end, assignment_end, project.end_date
    const endDates: string[] = [];
    if (selectedEmployee?.employment_end) endDates.push(selectedEmployee.employment_end);
    if (assignmentEnd) endDates.push(assignmentEnd);
    if (selectedProject?.end_date) endDates.push(selectedProject.end_date);

    // Fruehestes erlaubtes Datum (hoechstes Start-Datum)
    let firstYear = 2020;
    let firstMonth = 1;
    if (startDates.length > 0) {
      const latestStart = startDates.sort().pop()!; // alphabetisch sortiert = chronologisch bei ISO-Daten
      const parts = latestStart.split('-');
      firstYear = parseInt(parts[0]);
      firstMonth = parseInt(parts[1]);
    }

    // Spaetestes erlaubtes Datum (niedrigstes End-Datum)
    let lastYear = 2030;
    let lastMonth = 12;
    if (endDates.length > 0) {
      const earliestEnd = endDates.sort()[0]; // frueheSTES End-Datum
      const parts = earliestEnd.split('-');
      lastYear = parseInt(parts[0]);
      lastMonth = parseInt(parts[1]);
    }

    return { firstYear, firstMonth, lastYear, lastMonth };
  }, [selectedEmployee, assignmentStart, assignmentEnd, selectedProject]);

  // Hilfsfunktion: Ist ein Monat/Jahr im erlaubten Bereich?
  const isMonthAllowed = useCallback((year: number, month: number): boolean => {
    if (!allowedRange) return true;
    const { firstYear, firstMonth, lastYear, lastMonth } = allowedRange;
    const val = year * 12 + month;
    const min = firstYear * 12 + firstMonth;
    const max = lastYear * 12 + lastMonth;
    return val >= min && val <= max;
  }, [allowedRange]);

  // Gefilterte Monatsliste fuer das aktuell gewaehlte Jahr
  const allowedMonths = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => ({
      name,
      month: idx + 1,
      allowed: isMonthAllowed(selectedYear, idx + 1),
    })).filter(m => m.allowed);
  }, [selectedYear, isMonthAllowed]);

  // Gefilterte Jahresliste
  const allowedYears = useMemo(() => {
    if (!allowedRange) return [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];
    const years: number[] = [];
    for (let y = allowedRange.firstYear; y <= allowedRange.lastYear; y++) {
      years.push(y);
    }
    return years;
  }, [allowedRange]);

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  // Prueft auf ungespeicherte Aenderungen und zeigt Dialog
  const checkUnsavedChanges = (callback: () => void) => {
    if (hasChanges) {
      setShowUnsavedDialog(() => callback);
    } else {
      callback();
    }
  };

  // v7.4.6-62: Sprung zur Zahlungsanforderung (ZA) des aktuellen Projekts.
  // Gleiche Seite; returnTo = aktuelle URL, damit der Zurueck-Button in der ZA
  // wieder hierher fuehrt. Portal-abhaengige Route (Berater vs. Firma).
  const goToZA = () => {
    if (!selectedProjectId) return;
    const rt = encodeURIComponent(window.location.pathname + window.location.search);
    const base = portal === 'berater'
      ? `/v7/berater/foerderung/firma/${companyId}/za`
      : `/v7/firma/za`;
    router.push(`${base}?projektId=${selectedProjectId}&returnTo=${rt}`);
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month, 0).getDate();
  };

  const getDayOfWeek = (year: number, month: number, day: number): number => {
    return new Date(year, month - 1, day).getDay();
  };

  const isWeekend = (year: number, month: number, day: number): boolean => {
    const dow = getDayOfWeek(year, month, day);
    return dow === 0 || dow === 6;
  };

  const isHoliday = (year: number, month: number, day: number): string | null => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.get(dateStr) || null;
  };

  const isAbsenceCode = (value: string): boolean => {
    return ABSENCE_CODES.includes(value.toUpperCase());
  };

  // FIX v7.4.3-5: Komma als Dezimaltrennzeichen
  const parseHours = (value: string): number => {
    return parseFloat(value.replace(',', '.')) || 0;
  };

  // FIX v7.4.3-7: Feiertagsstunden aus Unternehmens-Wochenstunden
  // 38h/Woche -> 7,6h/Tag | 40h/Woche -> 8h/Tag
  const companyDailyHours = Math.round(((company?.standard_weekly_hours || 40) / 5) * 100) / 100;

  // v7.4.6-15: MA-Tagesstunden fuer Abwesenheiten (U/K/S/F)
  // Basiert auf weeklyHoursAtMonth (aus Teilzeit-Historie), nicht Firmen-Standard.
  // Teilzeit 30h/Woche -> 6h/Tag | Vollzeit 40h/Woche -> 8h/Tag
  const employeeDailyHours = Math.round((weeklyHoursAtMonth / 5) * 100) / 100;

  // v7.4.6-26: Prueft, ob an einem Tag bereits eine Fehlzeit (U/K/S) mit Stunden
  // erfasst ist. Liefert den Code zurueck oder null. Grundlage fuer die Sperre,
  // damit nicht versehentlich Arbeitsstunden auf einen Urlaubs-/Kranktag gebucht
  // werden (z.B. wenn Fehlzeiten fuer den ganzen Monat vorab eingetragen wurden).
  const getAbsenceCodeForDay = (day: number): 'U' | 'K' | 'S' | null => {
    const codes: Array<'U' | 'K' | 'S'> = ['U', 'K', 'S'];
    for (const code of codes) {
      const e = absenceHoursInput[code]?.[day];
      if (e?.value && parseHours(e.value) > 0) return code;
    }
    return null;
  };

  // v7.4.6-26: Klartext-Bezeichnung der Fehlzeit fuer Hinweis-Meldungen.
  const absenceLabel = (code: 'U' | 'K' | 'S'): string =>
    code === 'U' ? 'Urlaub' : code === 'K' ? 'Krankheit' : 'Sonstige bezahlte Ausfallzeit';

  // v7.4.6-31: Ist dieser Tag als Kurzarbeit markiert?
  const isKurzarbeitDay = (day: number): boolean => !!kurzarbeitInput[day];

  // v7.4.6-27: Summe der erfassten Fehlzeit-Stunden (U+K+S) an einem Tag.
  const sumAbsenceHoursForDay = (day: number): number => {
    let s = 0;
    (['U', 'K', 'S'] as const).forEach(code => {
      const e = absenceHoursInput[code]?.[day];
      if (e?.value) s += parseHours(e.value);
    });
    return s;
  };

  // v7.4.6-27: Summe der Arbeitsstunden an einem Tag (AP-Zeilen + nicht
  // foerderbar). Einzelne Quellen lassen sich ausklammern, um den gerade
  // getippten Wert separat hinzurechnen zu koennen.
  const sumWorkHoursForDay = (
    day: number,
    opts?: { excludeApRow?: number; excludeNonBillable?: boolean }
  ): number => {
    let s = 0;
    apRows.forEach((r, idx) => {
      if (opts?.excludeApRow === idx) return;
      const v = r.entries[day]?.value;
      if (v && !isAbsenceCode(v)) s += parseHours(v);
    });
    if (!opts?.excludeNonBillable) {
      const nb = nonBillableEntries[day]?.value;
      if (nb && !isAbsenceCode(nb)) s += parseHours(nb);
    }
    return s;
  };

  // v7.4.6-27: Stundenformat mit Komma fuer Meldungen.
  const fmtH = (h: number): string => h.toFixed(2).replace('.', ',');

  // v7.4.6-63: Reiner Arbeitstag? (kein Wochenende/Feiertag/Abwesenheit/
  // Kurzarbeit/gesperrter Tag) -- Grundlage fuer Auto-Vorbelegung + Save-Hinweis.
  const isPlainWorkday = (day: number): boolean => {
    if (isWeekend(selectedYear, selectedMonth, day)) return false;
    if (isHoliday(selectedYear, selectedMonth, day)) return false;
    if (blockedDays.has(day)) return false;
    if (isKurzarbeitDay(day)) return false;
    if (getAbsenceCodeForDay(day)) return false;
    return true;
  };

  const formatWorkDate = (day: number): string => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const formatDisplayDate = (): string => {
    return `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
  };

  const getLastWorkdayOfMonth = (year: number, month: number): string => {
    const daysInMonth = getDaysInMonth(year, month);
    for (let day = daysInMonth; day >= 1; day--) {
      if (!isWeekend(year, month, day) && !isHoliday(year, month, day)) {
        return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
      }
    }
    return `${daysInMonth}.${String(month).padStart(2, '0')}.${year}`;
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Feiertage berechnen - inkl. kommunaler Sonderregelung (v7.4.6)
  useEffect(() => {
    if (company?.federal_state) {
      setHolidays(
        getGermanHolidays(
          selectedYear,
          company.federal_state,
          (company.holiday_region ?? undefined) as HolidayRegion,
        ),
      );
    }
  }, [selectedYear, company?.federal_state, company?.holiday_region]);

  // Unterschriftsdatum
  useEffect(() => {
    setSignatureDate(getLastWorkdayOfMonth(selectedYear, selectedMonth));
  }, [selectedYear, selectedMonth, holidays]);

  // ============================================================================
  // ARBEITSZEITGRENZEN: MA-Daten laden (v7.4.6-11)
  // Laedt position_title + weekly_hours aus Historie fuer aktuellen MA/Monat
  // ============================================================================
  useEffect(() => {
    const loadMaData = async () => {
      if (!selectedEmployeeId) return;
      try {
        const supabaseClient = createClient();
        // position_title laden
        const { data: empData } = await supabaseClient
          .from('v7_employees')
          .select('position_title, weekly_hours')
          .eq('id', selectedEmployeeId)
          .maybeSingle();
        setPositionTitle(empData?.position_title ?? null);

        // weekly_hours aus Teilzeit-Historie fuer den ersten Tag des Monats
        const monatErster = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const { data: histEntry } = await supabaseClient
          .from('v7_employee_hours_history')
          .select('weekly_hours')
          .eq('employee_id', selectedEmployeeId)
          .lte('gueltig_ab', monatErster)
          .order('gueltig_ab', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (histEntry?.weekly_hours) {
          setWeeklyHoursAtMonth(Number(histEntry.weekly_hours));
        } else {
          // v7.4.6-52: Fallback ist der FIRMENSTANDARD (standard_weekly_hours),
          // nicht hart 40. Eine MA ohne eigene WAZ erbt damit die Firmen-WAZ
          // (z.B. 37,5 -> 7,5 h/Tag), konsistent mit der Feiertags-Logik.
          // Hartes 40 fuehrte sonst bei Fehlzeiten zu 8 statt 7,5 h/Tag.
          setWeeklyHoursAtMonth(Number(empData?.weekly_hours ?? company?.standard_weekly_hours ?? 40));
        }
      } catch (err) {
        console.error('[TimesheetForm] Fehler beim Laden MA-Arbeitszeitdaten:', err);
        setWeeklyHoursAtMonth(company?.standard_weekly_hours ?? 40);
      }
    };
    loadMaData();
  }, [selectedEmployeeId, selectedYear, selectedMonth, company?.standard_weekly_hours]);

  // NEU v7.4.3-9: Completion-Status laden
  const loadCompletionStatus = async (empId: string, projId: string, year: number, month: number) => {
    if (!empId || !projId) return;
    try {
      const supabaseClient = createClient();
      const { data } = await supabaseClient
        .from('v7_timesheet_completions')
        .select('id')
        .eq('employee_id', empId)
        .eq('project_id', projId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      setIsCompleted(!!data);
    } catch {
      setIsCompleted(false);
    }
  };

  // NEU v7.4.3: Arbeitsplan-Zuordnungen und kumulierte Stunden laden
  // Wiederverwendbare Funktion (wird auch nach Speichern aufgerufen)
  const reloadBookedHours = useCallback(async () => {
    if (!selectedEmployeeId || !selectedProjectId) return;
    try {
      const supabaseClient = createClient();
      const { data: tsEntries, error: tsErr } = await supabaseClient
        .from('v7_timesheets')
        .select('work_package_id, hours')
        .eq('employee_id', selectedEmployeeId)
        .eq('project_id', selectedProjectId)
        .eq('is_active', true)
        .eq('is_billable', true);

      if (tsErr) {
        console.error('[TimesheetForm] Fehler beim Laden der kumulierten Stunden:', tsErr);
        return;
      }

      const booked: Record<string, number> = {};
      (tsEntries || []).forEach((e: any) => {
        if (e.work_package_id) {
          const h = parseFloat(e.hours) || 0;
          if (h > 0) {
            booked[e.work_package_id] = (booked[e.work_package_id] || 0) + h;
          }
        }
      });

      setTotalBookedPerWP(booked);
      console.log('[TimesheetForm] Kumulierte Stunden aktualisiert:', booked);

      // v7.4.6-29: Projektweite Buchungen je AP (alle MA) - fuer blaue Restzahl
      // bei nicht zugeordneten Mitarbeitern.
      const { data: projEntries, error: projErr } = await supabaseClient
        .from('v7_timesheets')
        .select('work_package_id, employee_id, hours')
        .eq('project_id', selectedProjectId)
        .eq('is_active', true)
        .eq('is_billable', true);
      if (projErr) {
        console.error('[TimesheetForm] Fehler beim Laden der projektweiten Stunden:', projErr);
      } else {
        const projBooked: Record<string, number> = {};
        // v7.4.6-66: Buchungen zusaetzlich je (AP, MA) fuer die MA-Spalten im "Alle AP"-Modal.
        const projBookedPerMa: Record<string, Record<string, number>> = {};
        (projEntries || []).forEach((e: any) => {
          if (e.work_package_id) {
            const h = parseFloat(e.hours) || 0;
            if (h > 0) {
              projBooked[e.work_package_id] = (projBooked[e.work_package_id] || 0) + h;
              if (e.employee_id) {
                if (!projBookedPerMa[e.work_package_id]) projBookedPerMa[e.work_package_id] = {};
                projBookedPerMa[e.work_package_id][e.employee_id] =
                  (projBookedPerMa[e.work_package_id][e.employee_id] || 0) + h;
              }
            }
          }
        });
        setProjectBookedPerWP(projBooked);
        setProjectBookedPerWpPerMa(projBookedPerMa);
      }
    } catch (err) {
      console.error('[TimesheetForm] Fehler beim Reload der Stunden:', err);
    }
  }, [selectedEmployeeId, selectedProjectId]);

  // Team-Nummern + Assignment-Daten laden wenn Projekt oder MA sich aendert
  useEffect(() => {
    if (!selectedProjectId) {
      setTeamNumbers(new Map());
      setTeamMemberIds(new Set());
      setAssignmentStart(null);
      setAssignmentEnd(null);
      return;
    }
    const loadTeamNumbers = async () => {
      const supabaseClient = createClient();
      const { data } = await supabaseClient
        .from('v7_project_assignments')
        .select('employee_id, employee_number, assignment_start, assignment_end')
        .eq('project_id', selectedProjectId);
      if (data) {
        const map = new Map<string, number>();
        data.forEach((a: { employee_id: string; employee_number: number | null; assignment_start: string | null; assignment_end: string | null }) => {
          if (a.employee_number !== null) map.set(a.employee_id, a.employee_number);
        });
        setTeamNumbers(map);

        // v7.4.6-37 (Teil 2a): Team-Mitglieder-IDs (auch ohne employee_number)
        const ids = new Set<string>(data.map((a: { employee_id: string }) => a.employee_id));
        setTeamMemberIds(ids);

        // Gehoert der aktuell gewaehlte MA nicht zum Team des Projekts, auf den
        // ersten Team-MA (nach employee_number) umstellen, der auch in der
        // uebergebenen MA-Liste vorhanden ist. Sonst (z.B. Nicht-Admin = nur
        // er selbst, nicht im Team) Auswahl unveraendert lassen.
        if (selectedEmployeeId && ids.size > 0 && !ids.has(selectedEmployeeId)) {
          const ordered = [...data]
            .filter((a: { employee_id: string }) => safeEmployees.some(e => e.id === a.employee_id))
            .sort((a: { employee_number: number | null }, b: { employee_number: number | null }) =>
              (a.employee_number ?? 9999) - (b.employee_number ?? 9999));
          const firstId = ordered[0]?.employee_id;
          if (firstId && firstId !== selectedEmployeeId) {
            setSelectedEmployeeId(firstId);
          }
        }

        // NEU v7.4.3-20: Assignment-Daten fuer den aktuellen MA setzen
        if (selectedEmployeeId) {
          const myAssignment = data.find((a: { employee_id: string }) => a.employee_id === selectedEmployeeId);
          setAssignmentStart(myAssignment?.assignment_start || null);
          setAssignmentEnd(myAssignment?.assignment_end || null);
        }
      }
    };
    loadTeamNumbers();
  }, [selectedProjectId, selectedEmployeeId]);

  // NEU v7.4.3-20: Automatische Korrektur wenn aktueller Monat ausserhalb des erlaubten Bereichs
  useEffect(() => {
    if (!allowedRange) return;
    if (!isMonthAllowed(selectedYear, selectedMonth)) {
      const { firstYear, firstMonth, lastYear, lastMonth } = allowedRange;
      const currentVal = selectedYear * 12 + selectedMonth;
      const minVal = firstYear * 12 + firstMonth;
      const maxVal = lastYear * 12 + lastMonth;

      if (currentVal < minVal) {
        setSelectedYear(firstYear);
        setSelectedMonth(firstMonth);
      } else if (currentVal > maxVal) {
        setSelectedYear(lastYear);
        setSelectedMonth(lastMonth);
      }
    }
  }, [allowedRange, selectedYear, selectedMonth, isMonthAllowed]);

  // NEU v7.4.3-21: Timesheet-Notiz laden bei MA/Projekt/Monat-Wechsel
  useEffect(() => {
    if (!selectedEmployeeId || !selectedProjectId || !isAdmin) {
      setNoteId(null);
      setNoteText('');
      setNoteStatus(null);
      setNoteCreatedBy('');
      setNoteCreatedAt('');
      setNoteResolvedBy('');
      setNoteResolvedAt('');
      return;
    }
    const loadNote = async () => {
      try {
        const supabaseClient = createClient();
        const { data, error } = await supabaseClient
          .from('v7_timesheet_notes')
          .select('id, note_text, status, created_by, created_at, resolved_by, resolved_at')
          .eq('employee_id', selectedEmployeeId)
          .eq('project_id', selectedProjectId)
          .eq('year', selectedYear)
          .eq('month', selectedMonth)
          .maybeSingle();
        if (error) {
          console.error('[TimesheetForm] Notiz laden Fehler:', error);
          return;
        }
        if (data) {
          setNoteId(data.id);
          setNoteText(data.note_text);
          setNoteStatus(data.status as 'offen' | 'erledigt');

          // Ersteller-Name laden
          if (data.created_by) {
            const { data: creator } = await supabaseClient
              .from('v7_user_profiles')
              .select('display_name')
              .eq('id', data.created_by)
              .maybeSingle();
            setNoteCreatedBy(creator?.display_name || '');
          } else {
            setNoteCreatedBy('');
          }
          setNoteCreatedAt(data.created_at || '');

          // Erlediger-Name laden
          if (data.resolved_by) {
            const { data: resolver } = await supabaseClient
              .from('v7_user_profiles')
              .select('display_name')
              .eq('id', data.resolved_by)
              .maybeSingle();
            setNoteResolvedBy(resolver?.display_name || '');
          } else {
            setNoteResolvedBy('');
          }
          setNoteResolvedAt(data.resolved_at || '');
        } else {
          setNoteId(null);
          setNoteText('');
          setNoteStatus(null);
          setNoteCreatedBy('');
          setNoteCreatedAt('');
          setNoteResolvedBy('');
          setNoteResolvedAt('');
        }
      } catch (err) {
        console.error('[TimesheetForm] Notiz laden Fehler:', err);
      }
    };
    loadNote();
  }, [selectedEmployeeId, selectedProjectId, selectedYear, selectedMonth, isAdmin]);

  useEffect(() => {
    if (!selectedEmployeeId || !selectedProjectId) return;

    const loadAssignmentData = async () => {
      try {
        const supabaseClient = createClient();

        // 1. Geplante PM pro WP fuer diesen MA aus v7_work_package_assignments
        const { data: assignments, error: assErr } = await supabaseClient
          .from('v7_work_package_assignments')
          .select('work_package_id, planned_person_months')
          .eq('employee_id', selectedEmployeeId)
          .eq('is_active', true);

        if (assErr) {
          console.error('[TimesheetForm] Fehler beim Laden der Assignments:', assErr);
          return;
        }

        // Filter: Nur APs die zu diesem Projekt gehoeren
        const projectWPIds = safeWorkPackages
          .filter(wp => wp.project_id === selectedProjectId)
          .map(wp => wp.id);

        const planned: Record<string, number> = {};
        const assignedIds: string[] = [];

        (assignments || []).forEach((a: any) => {
          if (projectWPIds.includes(a.work_package_id)) {
            const pm = a.planned_person_months || 0;
            if (pm > 0) {
              planned[a.work_package_id] = pm * hoursPerPM(pmBasisWAZ);
              assignedIds.push(a.work_package_id);
            }
          }
        });

        setPlannedHoursPerWP(planned);
        setAssignedWPIds(assignedIds);

        // 2. Kumulierte Ist-Stunden laden
        await reloadBookedHours();

        console.log('[TimesheetForm] Arbeitsplan geladen:', { planned, assignedIds });
      } catch (err) {
        console.error('[TimesheetForm] Fehler beim Laden der Arbeitsplan-Daten:', err);
      }
    };

    loadAssignmentData();
  }, [selectedEmployeeId, selectedProjectId, workPackages, reloadBookedHours, pmBasisWAZ]);

  // v7.4.6-66: Geplante Stunden je (AP, MA) fuer das GANZE Projekt-Team laden
  //   (Grundlage der MA-Spalten im "Alle AP"-Modal). Unabhaengig vom gewaehlten MA.
  useEffect(() => {
    if (!selectedProjectId) { setPlannedHoursPerWpPerMa({}); return; }
    const loadTeamPlanned = async () => {
      try {
        const supabaseClient = createClient();
        const projectWPIds = safeWorkPackages
          .filter(wp => wp.project_id === selectedProjectId)
          .map(wp => wp.id);
        if (projectWPIds.length === 0) { setPlannedHoursPerWpPerMa({}); return; }
        const { data: rows, error } = await supabaseClient
          .from('v7_work_package_assignments')
          .select('work_package_id, employee_id, planned_person_months')
          .in('work_package_id', projectWPIds)
          .eq('is_active', true);
        if (error) {
          console.error('[TimesheetForm] Fehler beim Laden der Team-Planstunden:', error);
          return;
        }
        const factor = hoursPerPM(pmBasisWAZ);
        const map: Record<string, Record<string, number>> = {};
        (rows || []).forEach((a: any) => {
          const pm = a.planned_person_months || 0;
          if (a.work_package_id && a.employee_id && pm > 0) {
            if (!map[a.work_package_id]) map[a.work_package_id] = {};
            map[a.work_package_id][a.employee_id] =
              (map[a.work_package_id][a.employee_id] || 0) + pm * factor;
          }
        });
        setPlannedHoursPerWpPerMa(map);
      } catch (err) {
        console.error('[TimesheetForm] Fehler beim Laden der Team-Planstunden:', err);
      }
    };
    loadTeamPlanned();
  }, [selectedProjectId, workPackages, pmBasisWAZ]);

  // A-021: NWM-Sperren + Cross-Projekt-Stunden laden
  useEffect(() => {
    if (!selectedEmployeeId || !selectedProjectId) {
      setBlockedDays(new Set());
      setBlockedDayReasons({});
      setOtherProjectHours({});
      return;
    }

    const loadBlockedAndCrossProject = async () => {
      const dim = getDaysInMonth(selectedYear, selectedMonth);
      const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const monthEnd = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${dim}`;

      // 1. NWM-Sperren (nur bei Netzwerk-Projekten)
      const days = new Set<number>();
      const reasons: Record<number, string> = {};

      if (isNetzwerk) {
        const { data: blocks } = await supabase
          .from('v7_nwm_blocked_periods')
          .select('*')
          .eq('project_id', selectedProjectId)
          .eq('employee_id', selectedEmployeeId)
          .lte('start_date', monthEnd)
          .gte('end_date', monthStart);

        if (blocks) {
          for (const period of blocks) {
            const pStart = new Date(period.start_date + 'T00:00:00');
            const pEnd = new Date(period.end_date + 'T00:00:00');
            for (let d = 1; d <= dim; d++) {
              const date = new Date(selectedYear, selectedMonth - 1, d);
              if (date >= pStart && date <= pEnd) {
                days.add(d);
                reasons[d] = period.reason || 'Gesperrt durch PL';
              }
            }
          }
        }
      }

      setBlockedDays(days);
      setBlockedDayReasons(reasons);

      // 2. Cross-Projekt-Stunden (alle Projekte des MA ausser aktuelles)
      // v7.4.6-44: NUR gearbeitete Stunden (absence_code IS NULL). Fehlzeiten
      // (Urlaub/Krankheit/Feiertag) sind keine Arbeitskapazitaet und duerfen
      // weder in den physischen Monatsdeckel noch in die 9h-Tagesgrenze zaehlen.
      const { data: otherEntries } = await supabase
        .from('v7_timesheets')
        .select('work_date, hours')
        .eq('employee_id', selectedEmployeeId)
        .neq('project_id', selectedProjectId)
        .gte('work_date', monthStart)
        .lte('work_date', monthEnd)
        .eq('is_active', true)
        .is('absence_code', null);

      const hoursByDay: Record<number, number> = {};
      if (otherEntries) {
        for (const entry of otherEntries) {
          const day = new Date(entry.work_date + 'T00:00:00').getDate();
          hoursByDay[day] = (hoursByDay[day] || 0) + Number(entry.hours);
        }
      }
      setOtherProjectHours(hoursByDay);
    };

    loadBlockedAndCrossProject();
  }, [selectedEmployeeId, selectedProjectId, selectedYear, selectedMonth, isNetzwerk]);

  // A-021: Alle Sperren fuer das Projekt laden (fuer Admin-Modal)
  const loadAllBlockedPeriods = useCallback(async () => {
    if (!selectedProjectId || !isNetzwerk) {
      setAllBlockedPeriods([]);
      return;
    }
    const { data } = await supabase
      .from('v7_nwm_blocked_periods')
      .select('*')
      .eq('project_id', selectedProjectId)
      .order('start_date', { ascending: true });
    setAllBlockedPeriods(data || []);
  }, [selectedProjectId, isNetzwerk]);

  // Daten laden fuer MA/Projekt/Monat
  useEffect(() => {
    if (!selectedEmployeeId || !selectedProjectId) {
      console.log('[TimesheetForm] Kein MA oder Projekt ausgewaehlt:', { selectedEmployeeId, selectedProjectId });
      return;
    }

    const loadTimeEntries = async () => {
      console.log('[TimesheetForm] ====== LADE ZEITEINTRAEGE ======');
      console.log('[TimesheetForm] Parameter:', { 
        selectedEmployeeId, 
        selectedProjectId, 
        selectedYear, 
        selectedMonth 
      });
      
      const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${daysInMonth}`;

      console.log('[TimesheetForm] Datumsbereich:', { startDate, endDate });
      console.log('[TimesheetForm] Alle workPackages (Props):', safeWorkPackages.length, safeWorkPackages.map(wp => ({ id: wp.id, project_id: wp.project_id, name: wp.name })));

      const projectWPs = safeWorkPackages.filter(wp => wp.project_id === selectedProjectId);
      const wpIds = projectWPs.map(wp => wp.id);
      
      console.log('[TimesheetForm] Gefilterte Projekt-APs:', projectWPs.length, projectWPs.map(wp => ({ id: wp.id, name: wp.name })));
      console.log('[TimesheetForm] WP IDs:', wpIds);

      if (wpIds.length === 0) {
        console.log('[TimesheetForm] WARNUNG: Keine APs fuer Projekt gefunden - setze leere Zeilen');
        setApRows([
          { workPackageId: null, entries: {} },
          { workPackageId: null, entries: {} },
          { workPackageId: null, entries: {} },
          { workPackageId: null, entries: {} },
        ]);
        setNonBillableEntries({});
        setNonBillableManual({});
        setMonthHadData(false);
        setSaveHint('');
        setHasChanges(false);
        return;
      }

      const { data: entries, error: loadError } = await supabase
        .from('v7_timesheets')
        .select('*')
        .eq('employee_id', selectedEmployeeId)
        .eq('project_id', selectedProjectId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .eq('is_active', true);

      // A-034 Etappe 2a: Abwesenheiten U/K/S projektuebergreifend aus der
      // zentralen Tabelle. Kein Projektfilter (Abwesenheit gilt fuer den MA an
      // dem Tag in allen Projekten). Dual-Read: greift nach der Migration; im
      // Uebergang ist die Tabelle leer und die Alt-Zeilen aus v7_timesheets
      // (entries) werden wie bisher verarbeitet.
      const { data: centralAbsences } = await supabase
        .from('v7_employee_absences')
        .select('id, work_date, absence_code, hours')
        .eq('employee_id', selectedEmployeeId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .eq('is_active', true);

      if (loadError) {
        console.error('[TimesheetForm] DB-Fehler beim Laden:', loadError);
      }
      
      console.log('[TimesheetForm] Geladene DB-Eintraege:', entries?.length || 0);
      if (entries && entries.length > 0) {
        console.log('[TimesheetForm] Erste Eintraege:', entries.slice(0, 5).map(e => ({
          id: e.id,
          work_package_id: e.work_package_id,
          work_date: e.work_date,
          hours: e.hours,
          is_billable: e.is_billable
        })));
      }

      const newRows: APRow[] = [
        { workPackageId: null, entries: {} },
        { workPackageId: null, entries: {} },
        { workPackageId: null, entries: {} },
        { workPackageId: null, entries: {} },
      ];
      const newNonBillable: Record<number, CalendarEntry> = {};

      const wpEntryMap = new Map<string, Map<number, { id: string; value: string }>>();

      // Map fuer Fehlzeiten (ohne work_package_id, aber mit absence_code)
      const absenceEntries = new Map<number, { id: string; value: string }>();
      // v7.4.6-16: Fehlzeiten-Stunden direkt editierbar
      const newAbsenceHours: { U: Record<number, CalendarEntry>; K: Record<number, CalendarEntry>; S: Record<number, CalendarEntry> } = { U: {}, K: {}, S: {} };
      // v7.4.6-31: Kurzarbeit-Tage (reiner Marker)
      const newKurzarbeit: Record<number, { id?: string }> = {};

      entries?.forEach(entry => {
        const day = parseInt(entry.work_date.split('-')[2]);

        if (entry.work_package_id && wpIds.includes(entry.work_package_id)) {
          // Normale Arbeitseintraege mit Work Package
          if (!wpEntryMap.has(entry.work_package_id)) {
            wpEntryMap.set(entry.work_package_id, new Map());
          }
          const value = entry.hours > 0 ? entry.hours.toString() : '';
          wpEntryMap.get(entry.work_package_id)!.set(day, { id: entry.id, value });
          console.log('[TimesheetForm] AP-Eintrag gefunden:', { wp_id: entry.work_package_id, day, value });
        } else if (entry.absence_code && !entry.work_package_id) {
          // v7.4.6-16: Fehlzeiten (U/K/S) direkt in absenceHoursInput laden
          // NICHT mehr in absenceEntries (wuerde sonst doppelt in AP-Zeilen erscheinen)
          // v7.4.6-31: Kurzarbeit (KA) als reinen Tag-Marker laden.
          const codeRaw = (entry.absence_code || '').toUpperCase();
          if (codeRaw === 'KA') {
            newKurzarbeit[day] = { id: entry.id };
          } else if (['U', 'K', 'S'].includes(codeRaw)) {
            const code = codeRaw as 'U' | 'K' | 'S';
            if (!newAbsenceHours[code]) newAbsenceHours[code] = {};
            newAbsenceHours[code][day] = {
              id: entry.id,
              value: entry.hours > 0 ? entry.hours.toString() : ''
            };
          }
          console.log('[TimesheetForm] Fehlzeit-/KA-Eintrag gefunden:', { day, absence_code: entry.absence_code });
        } else if (!entry.is_billable && !entry.work_package_id && !entry.absence_code) {
          // Sonstige nicht zuschussfaehige Arbeiten (ohne absence_code)
          newNonBillable[day] = { id: entry.id, value: entry.hours > 0 ? entry.hours.toString() : '' };
          console.log('[TimesheetForm] Sonstige-Eintrag gefunden:', { day, hours: entry.hours });
        } else {
          console.log('[TimesheetForm] Eintrag NICHT zugeordnet:', { 
            wp_id: entry.work_package_id, 
            in_wpIds: entry.work_package_id ? wpIds.includes(entry.work_package_id) : 'null',
            is_billable: entry.is_billable,
            absence_code: entry.absence_code
          });
        }
      });

      // A-034 Etappe 2a: Zentrale Abwesenheiten (v7_employee_absences) in die
      // Fehlzeit-Zeilen uebernehmen. Vorrang vor evtl. aus v7_timesheets bereits
      // gesetzten Alt-Werten (neue Tabelle ist die maszgebliche Quelle). Die id
      // ist hier die absence-id; Etappe 2b synchronisiert beim Speichern
      // unabhaengig von der id-Herkunft ueber (Mitarbeiter, Monat).
      (centralAbsences || []).forEach(a => {
        const day = parseInt(a.work_date.split('-')[2]);
        const code = (a.absence_code || '').toUpperCase();
        if (code === 'U' || code === 'K' || code === 'S') {
          if (!newAbsenceHours[code]) newAbsenceHours[code] = {};
          newAbsenceHours[code][day] = {
            id: a.id,
            value: (typeof a.hours === 'number' && a.hours > 0) ? a.hours.toString() : '',
          };
        }
      });

      console.log('[TimesheetForm] Verarbeitete WP-Eintraege:', wpEntryMap.size);
      console.log('[TimesheetForm] Fehlzeit-Eintraege:', absenceEntries.size);
      console.log('[TimesheetForm] Sonstige Eintraege:', Object.keys(newNonBillable).length);

      // v7.4.6-18: Feiertage automatisch in S-Zeile (Sonstige bezahlte Ausfallzeiten) vorbelegen
      // Werktags-Feiertage ohne bestehenden S-Eintrag bekommen Tagesstunden (Firmen-Standard / 5).
      // Bereits manuell erfasste S-Werte werden NICHT ueberschrieben.
      // v7.4.6-19: Diagnose-Logging fuer Feiertags-Auto-Fill
      console.log('[TimesheetForm] FEIERTAG-CHECK: company=', company?.name, 'federal_state=', company?.federal_state, 'holiday_region=', company?.holiday_region, 'standard_weekly_hours=', company?.standard_weekly_hours, 'daysInMonth=', daysInMonth);
      if (company?.federal_state) {
        const monthHolidays = getGermanHolidays(
          selectedYear,
          company.federal_state,
          (company.holiday_region ?? undefined) as HolidayRegion,
        );
        console.log('[TimesheetForm] FEIERTAG-CHECK: monthHolidays.size=', monthHolidays.size, 'keys=', Array.from(monthHolidays.keys()).filter(k => k.startsWith(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`)));
        // v7.4.6-58: Feiertag folgt der individuellen MA-WAZ (employeeDailyHours
        // = weeklyHoursAtMonth/5), nicht mehr dem Firmenstandard. Sonst zeigt ein
        // Teilzeit-MA (z.B. 38h -> 7,60) am Feiertag 8,00 und die Tagesgrenze
        // (7,60) blockiert das Speichern. Effekt haengt jetzt von weeklyHoursAtMonth ab.
        const dailyHrs = employeeDailyHours;
        let autoFilledCount = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          const dow = new Date(selectedYear, selectedMonth - 1, d).getDay();
          if (dow === 0 || dow === 6) continue; // Wochenende ueberspringen
          const ds = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isHol = monthHolidays.has(ds);
          const hasExisting = !!newAbsenceHours.S[d]?.value;
          if (isHol) {
            console.log(`[TimesheetForm] FEIERTAG Tag ${d}: ${monthHolidays.get(ds)}, existingS=${hasExisting}, newAbsenceHours.S[${d}]=`, newAbsenceHours.S[d]);
          }
          if (isHol && !hasExisting) {
            newAbsenceHours.S[d] = { id: '', value: dailyHrs.toString() };
            autoFilledCount++;
            console.log(`[TimesheetForm] Feiertag auto-fill: Tag ${d} (${monthHolidays.get(ds)}) = ${dailyHrs}h`);
          }
        }
        if (autoFilledCount > 0) {
          console.log(`[TimesheetForm] ${autoFilledCount} Feiertag(e) in S-Zeile vorbelegt`);
        } else {
          console.log('[TimesheetForm] WARNUNG: Keine Feiertage vorbelegt!');
        }
      } else {
        console.log('[TimesheetForm] WARNUNG: company.federal_state ist LEER - keine Feiertags-Vorbelegung!');
      }

      // v7.4.6-16: Fehlzeiten-Stunden in State laden
      setAbsenceHoursInput(newAbsenceHours);
      // v7.4.6-31: Kurzarbeit-Marker in State laden
      setKurzarbeitInput(newKurzarbeit);

      let rowIndex = 0;
      wpEntryMap.forEach((dayMap, wpId) => {
        if (rowIndex < 4) {
          const entriesObj: Record<number, CalendarEntry> = {};
          dayMap.forEach((entry, day) => {
            entriesObj[day] = entry;
          });
          // Fehlzeiten in die erste Zeile mit diesem WP einfuegen
          if (rowIndex === 0) {
            absenceEntries.forEach((entry, day) => {
              entriesObj[day] = entry;
            });
          }
          newRows[rowIndex] = { workPackageId: wpId, entries: entriesObj };
          rowIndex++;
        }
      });

      // Falls keine WP-Eintraege, aber Fehlzeiten vorhanden - in erste Zeile laden
      if (wpEntryMap.size === 0 && absenceEntries.size > 0 && wpIds.length > 0) {
        const entriesObj: Record<number, CalendarEntry> = {};
        absenceEntries.forEach((entry, day) => {
          entriesObj[day] = entry;
        });
        newRows[0] = { workPackageId: wpIds[0], entries: entriesObj };
        console.log('[TimesheetForm] Fehlzeiten in erste Zeile geladen mit WP:', wpIds[0]);
      }

      // NEU v7.4.3-3: AP-Vorbelegung nur fuer APs mit offenen Stunden
      // Wichtig: Nur ausfuehren wenn die Arbeitsplan-Daten bereits geladen sind
      const hasAssignmentData = Object.keys(plannedHoursPerWP).length > 0;
      
      if (wpEntryMap.size === 0 && absenceEntries.size === 0 && assignedWPIds.length > 0 && hasAssignmentData) {
        // v7.4.6-3: Nur APs vorbelegen, die dem MA zugeordnet sind, noch Stunden
        // offen haben UND deren Laufzeit zeitlich passt (end_date + 2 Monate
        // >= Monatsende). Damit werden alte APs (z.B. Spezifikation aus Mai)
        // nicht mehr automatisch in spaete Monate (z.B. Januar) gezogen.
        const relevantAssigned = assignedWPIds.filter(id => {
          if (!wpIds.includes(id)) return false;
          const wp = safeWorkPackages.find(w => w.id === id);
          if (!wp) return false;
          // Gleiche Filterregel wie Dropdown "Zugeordnete AP"
          if (!isAPInAssignedGroup(wp)) {
            console.log(`[TimesheetForm] AP ${id} uebersprungen (Filter Dropdown/Laufzeit)`);
            return false;
          }
          const planned = plannedHoursPerWP[id] || 0;
          const booked = totalBookedPerWP[id] || 0;
          const remaining = planned - booked;
          console.log(`[TimesheetForm] AP ${id}: planned=${planned.toFixed(0)}h, booked=${booked.toFixed(0)}h, remaining=${remaining.toFixed(0)}h`);
          return true;
        });
        console.log('[TimesheetForm] Vorbelege APs (zugeordnet + offen + Laufzeit ok):', relevantAssigned.length);

        // v7.4.6-5: Sortiere nach ap_code (Versions-Sort) statt ap_number/ap_sub_number,
        // damit dreistellige AP-Nummern wie 3.1.1 korrekt vor 3.4 einsortiert werden.
        const sortedAssigned = [...relevantAssigned].sort((aId, bId) => {
          const a = safeWorkPackages.find(w => w.id === aId);
          const b = safeWorkPackages.find(w => w.id === bId);
          if (!a || !b) return 0;
          return compareApCode(a, b);
        });

        // Erstelle Zeilen fuer zugeordnete APs + eine leere Zeile
        const prefilledRows: APRow[] = sortedAssigned.map(wpId => ({
          workPackageId: wpId,
          entries: {},
        }));
        // Mindestens eine leere Zeile anhaengen fuer weitere APs
        prefilledRows.push({ workPackageId: null, entries: {} });
        
        // Maximal 4 Zeilen initial, oder so viele wie zugeordnet + 1
        while (prefilledRows.length < 4) {
          prefilledRows.push({ workPackageId: null, entries: {} });
        }
        
        for (let i = 0; i < prefilledRows.length && i < newRows.length; i++) {
          newRows[i] = prefilledRows[i];
        }
        // Falls mehr zugeordnete APs als 4, Zeilen erweitern
        if (prefilledRows.length > newRows.length) {
          for (let i = newRows.length; i < prefilledRows.length; i++) {
            newRows.push(prefilledRows[i]);
          }
        }
      }

      console.log('[TimesheetForm] Finale apRows:', newRows.map(r => ({ wpId: r.workPackageId, entries: Object.keys(r.entries).length })));
      setApRows(newRows);
      setNonBillableEntries(newNonBillable);
      // v7.4.6-63: Auto-Vorbelegung "sonstige Arbeiten" initialisieren.
      // monthHadData: hatte der Monat/das Projekt bereits gespeicherte Zeilen?
      const hadData = (entries?.length || 0) > 0;
      setMonthHadData(hadData);
      setSaveHint('');
      // Manuelle Overrides aus gespeicherten Werten ableiten: eine gespeicherte
      // "sonstige"-Zahl, die nicht der Auto-Differenz entspricht (z.B. bewusst
      // reduziert), gilt als manuell und wird spaeter nicht ueberschrieben.
      const manualInit: Record<number, boolean> = {};
      Object.entries(newNonBillable).forEach(([dStr, e]) => {
        const d = parseInt(dStr);
        const v = e?.value ? parseHours(e.value) : 0;
        if (v <= 0) return;
        let projD = 0;
        newRows.forEach(r => {
          const en = r.entries[d];
          if (en?.value && !isAbsenceCode(en.value)) projD += parseHours(en.value);
        });
        const auto = Math.max(0, employeeDailyHours - projD - (otherProjectHours[d] || 0));
        if (Math.abs(v - auto) >= 0.005) manualInit[d] = true;
      });
      setNonBillableManual(manualInit);
      // v7.4.6-61: gespeicherten Monatsstand je AP als Live-Basis schnappschussen
      const snapMonth: Record<string, number> = {};
      newRows.forEach(r => {
        if (!r.workPackageId) return;
        let s = 0;
        Object.values(r.entries).forEach((e: any) => {
          if (e?.value && !isAbsenceCode(e.value)) s += parseHours(e.value);
        });
        snapMonth[r.workPackageId] = (snapMonth[r.workPackageId] || 0) + s;
      });
      setSavedMonthHoursPerWP(snapMonth);
      setHasChanges(false);
    };

    loadTimeEntries();
    // NEU v7.4.3-20: Completion-Status bei jedem Wechsel laden (war vorher nie aufgerufen!)
    loadCompletionStatus(selectedEmployeeId, selectedProjectId, selectedYear, selectedMonth);
  }, [selectedEmployeeId, selectedProjectId, selectedYear, selectedMonth, workPackages, supabase, assignedWPIds, plannedHoursPerWP, totalBookedPerWP, company?.federal_state, company?.holiday_region, company?.standard_weekly_hours, weeklyHoursAtMonth]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const addApRow = () => {
    setApRows(prev => [...prev, { workPackageId: null, entries: {} }]);
    setHasChanges(true);
  };

  const handleAPSelect = (rowIndex: number, wpId: string) => {
    setApRows(prev => {
      const newRows = [...prev];
      newRows[rowIndex] = { ...newRows[rowIndex], workPackageId: wpId || null };
      return newRows;
    });
    setHasChanges(true);
  };

  // v7.4.6-28: Transiente Fehlermeldung (z.B. Tagesstunden-Warnung) verschwindet,
  // sobald der Nutzer in eine andere Zelle wechselt - nicht erst beim Speichern.
  const handleCellFocus = () => {
    if (error) setError(null);
  };

  const handleCellChange = (rowIndex: number, day: number, value: string) => {
    // v7.4.6-31: Defensiv -- an einem Kurzarbeitstag werden keine Arbeitsstunden
    // erfasst (die AP-Zellen sind dort ohnehin gesperrt).
    if (value && !isAbsenceCode(value) && isKurzarbeitDay(day)) {
      setError(`Tag ${day} ist als Kurzarbeit markiert -- es koennen keine Arbeitsstunden erfasst werden. Bitte zuerst die Kurzarbeit-Markierung entfernen (Rechtsklick).`);
      return;
    }
    // v7.4.6-23: FIX Regression - Abwesenheitscode (U/K/S/F) in einer AP-Tageszelle
    // wird automatisch in die zugehoerige Fehlzeit-Zeile uebernommen (mit den
    // MA-Tagesstunden), statt wirkungslos in der AP-Zeile zu verbleiben.
    // Mapping: U->U, K->K, S->S, F->S (Feiertag/Sonstige, analog Feiertags-Auto-Fill).
    if (value && isAbsenceCode(value)) {
      const raw = value.toUpperCase();
      const code: 'U' | 'K' | 'S' = raw === 'U' ? 'U' : raw === 'K' ? 'K' : 'S';
      // AP-Zelle leeren - der Code wird NICHT in der AP-Zeile gespeichert
      setApRows(prev => {
        const newRows = [...prev];
        const newEntries = { ...newRows[rowIndex].entries };
        delete newEntries[day];
        newRows[rowIndex] = { ...newRows[rowIndex], entries: newEntries };
        return newRows;
      });
      // v7.4.6-33: EXKLUSIV -- ein Tag ist genau EINE Kategorie. Die gewaehlte
      // Fehlzeit setzen UND die anderen beiden Fehlzeiten dieses Tages entfernen
      // (verhindert das fruehere Stapeln von U+K+S am selben Tag).
      setAbsenceHoursInput(prev => {
        const next = { U: { ...prev.U }, K: { ...prev.K }, S: { ...prev.S } };
        (['U', 'K', 'S'] as const).forEach(c => {
          if (c !== code) delete next[c][day];
        });
        next[code] = {
          ...next[code],
          [day]: { id: prev[code][day]?.id || '', value: employeeDailyHours.toString() },
        };
        return next;
      });
      // v7.4.6-33: Falls der Tag als Kurzarbeit markiert war -> Marker entfernen
      // (Umklassifizierung auf eine bezahlte Fehlzeit).
      setKurzarbeitInput(prev => {
        if (!prev[day]) return prev;
        const n = { ...prev };
        delete n[day];
        return n;
      });
      // v7.4.6-65: Auch die "sonstige Arbeiten"-Zelle dieses Tages raeumen --
      // symmetrisch zum Leeren der AP-Zelle oben. Ein Abwesenheitstag ist
      // ausschliesslich Abwesenheit; ohne dieses Raeumen blieb die zuvor
      // auto-vorbelegte "sonstige"-Zelle stehen und ergab zusammen mit der
      // Fehlzeit eine Tagesstunden-Ueberschreitung. Den Manuell-Marker mit
      // entfernen, damit die Auto-Vorbelegung den Tag nach Entfernen der
      // Abwesenheit wieder korrekt fuellt.
      setNonBillableEntries(prev => {
        if (!prev[day]) return prev;
        const n = { ...prev };
        delete n[day];
        return n;
      });
      setNonBillableManual(prev => {
        if (!prev[day]) return prev;
        const n = { ...prev };
        delete n[day];
        return n;
      });
      setHasChanges(true);
      // v7.4.6-49 (A-038): Die AP-Zelle wird durch die soeben gesetzte
      // Abwesenheit gesperrt (Etappe 2c) und verliert den Fokus. Damit der
      // gewohnte Ablauf "Code tippen -> weiter" erhalten bleibt, den Fokus
      // selbst auf die naechste bebuchbare AP-Zelle setzen (gleiche Kriterien
      // wie die Pfeil-/Enter-Navigation in handleKeyDown).
      {
        const totalDays = getDaysInMonth(selectedYear, selectedMonth);
        let target = 0;
        for (let d = day + 1; d <= totalDays; d++) {
          if (isWeekend(selectedYear, selectedMonth, d)) continue;
          if (isHoliday(selectedYear, selectedMonth, d)) continue;
          if (blockedDays.has(d)) continue;
          if (isKurzarbeitDay(d)) continue;
          if (getAbsenceCodeForDay(d)) continue;
          if (!apRows[rowIndex]?.workPackageId) break;
          target = d;
          break;
        }
        if (target > 0) {
          const selector = `input[data-row="${rowIndex}"][data-day="${target}"][data-type="ap"]`;
          setTimeout(() => {
            const el = document.querySelector(selector) as HTMLInputElement | null;
            el?.focus();
            el?.select();
          }, 0);
        }
      }
      return;
    }
    // A-034 Etappe 2c: An einem Abwesenheitstag (U/K/S, projektuebergreifend via
    // Etappe 2a geladen) ist KEINE Arbeitsbuchung moeglich -- ein Tag ist
    // entweder Abwesenheit ODER Arbeit (ganztaegig). Abwesenheitscodes werden
    // oben bereits abgefangen; das Setzen/Aendern/Loeschen der Abwesenheit
    // selbst geschieht in den Fehlzeit-Zeilen und bleibt moeglich.
    if (value && !isAbsenceCode(value)) {
      const abs = getAbsenceCodeForDay(day);
      if (abs) {
        setError(`Tag ${day}: ${absenceLabel(abs)} eingetragen -- an einem Abwesenheitstag ist keine Arbeitsbuchung moeglich. Bitte zuerst die Abwesenheit entfernen.`);
        return;
      }
    }
    setApRows(prev => {
      const newRows = [...prev];
      const newEntries = { ...newRows[rowIndex].entries };
      if (value) {
        newEntries[day] = { ...newEntries[day], value };
      } else {
        delete newEntries[day];
      }
      newRows[rowIndex] = { ...newRows[rowIndex], entries: newEntries };
      return newRows;
    });
    setHasChanges(true);
  };

  const handleNonBillableChange = (day: number, value: string) => {
    // A-034 Etappe 2c: Auch nicht-foerderbare Stunden sind an einem
    // Abwesenheitstag nicht buchbar (ganztaegige Sperre, ein Tag ist entweder
    // Abwesenheit ODER Arbeit).
    if (value && !isAbsenceCode(value)) {
      const abs = getAbsenceCodeForDay(day);
      if (abs) {
        setError(`Tag ${day}: ${absenceLabel(abs)} eingetragen -- an einem Abwesenheitstag ist keine Arbeitsbuchung moeglich. Bitte zuerst die Abwesenheit entfernen.`);
        return;
      }
    }
    setNonBillableEntries(prev => {
      const newEntries = { ...prev };
      if (value) {
        newEntries[day] = { ...newEntries[day], value };
      } else {
        delete newEntries[day];
      }
      return newEntries;
    });
    // v7.4.6-63: Zelle ist jetzt manuell -> Auto-Vorbelegung laesst sie in Ruhe
    setNonBillableManual(prev => ({ ...prev, [day]: true }));
    setHasChanges(true);
  };

  // ==========================================================================
  // v7.4.6-31: Rechtsklick-Kontextmenue + Kurzarbeit
  // ==========================================================================

  // Rechtsklick auf eine AP-Tageszelle. Nur an bearbeitbaren Tagen (kein
  // Wochenende, kein Feiertag, nicht gesperrt). Oeffnet das Auswahlmenue.
  const handleContextMenu = (e: React.MouseEvent, rowIndex: number, day: number) => {
    if (isWeekend(selectedYear, selectedMonth, day)) return;
    if (isHoliday(selectedYear, selectedMonth, day)) return;
    if (blockedDays.has(day)) return;
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, rowIndex, day });
  };

  const closeCtxMenu = () => setCtxMenu(null);

  // U/K/S aus dem Menue: exakt dieselbe Logik wie das Tippen des Buchstabens
  // (handleCellChange) -- kein doppelter Code. F wird dort wie S behandelt.
  const applyAbsenceFromMenu = (rowIndex: number, day: number, code: 'U' | 'K' | 'S') => {
    // handleCellChange setzt die Fehlzeit exklusiv und entfernt dabei einen
    // etwaigen KA-Marker dieses Tages (v7.4.6-33).
    handleCellChange(rowIndex, day, code);
    closeCtxMenu();
  };

  // Kurzarbeit setzen: reiner Tag-Marker, 0 Stunden. Fehlklick-Schutz: nicht
  // auf Tage mit bereits erfassten Arbeits- oder Fehlzeit-Stunden.
  const applyKurzarbeit = (day: number) => {
    closeCtxMenu();
    if (isKurzarbeitDay(day)) return; // schon markiert
    const workH = sumWorkHoursForDay(day);
    const absH = sumAbsenceHoursForDay(day);
    if (workH > 0 || absH > 0) {
      setError(`Tag ${day} enthaelt bereits Eintraege (Stunden oder Fehlzeit). Bitte zuerst leeren, dann als Kurzarbeit markieren.`);
      return;
    }
    setError(null);
    setKurzarbeitInput(prev => ({ ...prev, [day]: { id: prev[day]?.id } }));
    setHasChanges(true);
  };

  // Kurzarbeit-Markierung wieder entfernen.
  const removeKurzarbeit = (day: number) => {
    closeCtxMenu();
    setKurzarbeitInput(prev => {
      const next = { ...prev };
      delete next[day];
      return next;
    });
    setHasChanges(true);
  };

  // Keyboard Navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    day: number,
    rowType: 'ap' | 'nonbillable' | 'absence-U' | 'absence-K' | 'absence-S'
  ) => {
    const days = getDaysInMonth(selectedYear, selectedMonth);
    const totalApRows = apRows.length;
    const absenceOrder: Array<'absence-U' | 'absence-K' | 'absence-S'> = ['absence-U', 'absence-K', 'absence-S'];

    const canEdit = (r: number, d: number, type: 'ap' | 'nonbillable' | 'absence-U' | 'absence-K' | 'absence-S'): boolean => {
      if (isWeekend(selectedYear, selectedMonth, d)) return false;
      // v7.4.6-26: Feiertage und gesperrte Tage genauso ueberspringen wie
      // Wochenenden. Sonst versucht die Pfeil-Navigation, eine disabled-Zelle
      // (Feiertag/Sperre) zu fokussieren, was fehlschlaegt - der Fokus bleibt
      // dann am Feiertag haengen. Ueber reine Wochenenden ging es bereits.
      if (isHoliday(selectedYear, selectedMonth, d)) return false;
      if (isKurzarbeitDay(d)) return false;  // v7.4.6-31: KA -> weder Arbeit noch Fehlzeit
      // v7.4.6-52: typ-abhaengig. Die Fehlzeit-Zeilen (U/K/S) sind NICHT durch
      // PL-Sperre oder eine bereits eingetragene Abwesenheit disabled (siehe
      // Zell-Render) -> sie muessen erreichbar bleiben, damit der Cursor auf die
      // Fehlzeit springen und ueber sie hinweg navigieren kann.
      if (type === 'absence-U' || type === 'absence-K' || type === 'absence-S') return true;
      // Arbeitszeilen (ap/nonbillable): exakt die Zell-disabled-Bedingung spiegeln,
      // sonst haengt die Navigation an einer disabled Zelle (Symptom: Pfeil/Tab
      // springt an Abwesenheitstagen nicht weiter, kein Zurueck moeglich).
      if (blockedDays.has(d)) return false;                 // PL-Sperre (NWM)
      if (getAbsenceCodeForDay(d)) return false;            // v7.4.6-52: Abwesenheitstag -> Arbeitszelle disabled
      if (type === 'ap' && !apRows[r]?.workPackageId) return false;
      return true;
    };

    const focusCell = (r: number, d: number, type: 'ap' | 'nonbillable' | 'absence-U' | 'absence-K' | 'absence-S') => {
      const input = document.querySelector(
        `input[data-row="${r}"][data-day="${d}"][data-type="${type}"]`
      ) as HTMLInputElement;
      input?.focus();
      input?.select();
    };

    const isAbsenceType = rowType.startsWith('absence-');
    const absenceIdx = absenceOrder.indexOf(rowType as any);

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        for (let d = day + 1; d <= days; d++) {
          if (canEdit(rowIndex, d, rowType)) { focusCell(rowIndex, d, rowType); break; }
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        for (let d = day - 1; d >= 1; d--) {
          if (canEdit(rowIndex, d, rowType)) { focusCell(rowIndex, d, rowType); break; }
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (rowType === 'ap') {
          let foundNext = false;
          for (let r = rowIndex + 1; r < totalApRows; r++) {
            if (canEdit(r, day, 'ap')) { focusCell(r, day, 'ap'); foundNext = true; break; }
          }
          if (!foundNext && canEdit(0, day, 'nonbillable')) focusCell(0, day, 'nonbillable');
          else if (!foundNext) focusCell(0, day, 'absence-U');
        } else if (rowType === 'nonbillable') {
          if (canEdit(0, day, 'absence-U')) focusCell(0, day, 'absence-U');
        } else if (isAbsenceType && absenceIdx < absenceOrder.length - 1) {
          focusCell(0, day, absenceOrder[absenceIdx + 1]);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (rowType === 'nonbillable') {
          for (let r = totalApRows - 1; r >= 0; r--) {
            if (canEdit(r, day, 'ap')) { focusCell(r, day, 'ap'); break; }
          }
        } else if (isAbsenceType) {
          if (absenceIdx === 0) {
            if (canEdit(0, day, 'nonbillable')) focusCell(0, day, 'nonbillable');
          } else {
            focusCell(0, day, absenceOrder[absenceIdx - 1]);
          }
        } else if (rowIndex > 0) {
          if (canEdit(rowIndex - 1, day, 'ap')) focusCell(rowIndex - 1, day, 'ap');
        }
        break;

      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Rueckwaerts
          let found = false;
          for (let d = day - 1; d >= 1; d--) {
            if (canEdit(rowIndex, d, rowType)) {
              focusCell(rowIndex, d, rowType);
              found = true;
              break;
            }
          }
          if (!found && rowType === 'nonbillable') {
            for (let r = totalApRows - 1; r >= 0; r--) {
              for (let d = days; d >= 1; d--) {
                if (canEdit(r, d, 'ap')) {
                  focusCell(r, d, 'ap');
                  found = true;
                  break;
                }
              }
              if (found) break;
            }
          } else if (!found && rowIndex > 0) {
            for (let d = days; d >= 1; d--) {
              if (canEdit(rowIndex - 1, d, 'ap')) {
                focusCell(rowIndex - 1, d, 'ap');
                break;
              }
            }
          }
        } else {
          // Vorwaerts
          let found = false;
          for (let d = day + 1; d <= days; d++) {
            if (canEdit(rowIndex, d, rowType)) {
              focusCell(rowIndex, d, rowType);
              found = true;
              break;
            }
          }
          if (!found && rowType === 'ap' && rowIndex < totalApRows - 1) {
            for (let d = 1; d <= days; d++) {
              if (canEdit(rowIndex + 1, d, 'ap')) {
                focusCell(rowIndex + 1, d, 'ap');
                found = true;
                break;
              }
            }
          }
          if (!found) {
            for (let d = 1; d <= days; d++) {
              if (canEdit(0, d, 'nonbillable')) {
                focusCell(0, d, 'nonbillable');
                break;
              }
            }
          }
        }
        break;

      case 'Enter':
        e.preventDefault();
        // Naechstes leeres Feld
        for (let d = day + 1; d <= days; d++) {
          if (canEdit(rowIndex, d, rowType)) {
            const hasValue = rowType === 'ap'
              ? apRows[rowIndex]?.entries[d]?.value
              : nonBillableEntries[d]?.value;
            if (!hasValue) {
              focusCell(rowIndex, d, rowType);
              return;
            }
          }
        }
        break;
    }
  };

  // ============================================================================
  // BERECHNUNGEN
  // ============================================================================

  const calculateRowSum = (row: APRow): number => {
    return Object.values(row.entries).reduce((sum, entry) => {
      if (entry.value && !isAbsenceCode(entry.value)) {
        return sum + parseHours(entry.value);
      }
      return sum;
    }, 0);
  };

  // NEU v7.4.3: Verbleibende Stunden fuer ein AP berechnen
  // = geplante Stunden (Arbeitsplan) minus kumulierte Ist-Stunden (alle Monate)
  // v7.4.6-9: Wenn MA nicht im Arbeitsplan (planned undefined), aber trotzdem
  // Stunden gebucht (Vertretungsfall) -> negative Zahl anzeigen statt "-"
  // v7.4.6-61: LIVE. Die rechte Spalte zaehlt jetzt bereits waehrend der
  // Eingabe mit, nicht erst nach dem Speichern. Grundlage: aktueller Formstand
  // je AP minus dem beim Laden gespeicherten Monatsstand (savedMonthHoursPerWP).
  const currentMonthFormSumForWP = (wpId: string): number => {
    return apRows.reduce((sum, row) => {
      if (row.workPackageId !== wpId) return sum;
      return sum + calculateRowSum(row);
    }, 0);
  };
  const liveDeltaForWP = (wpId: string): number => {
    return currentMonthFormSumForWP(wpId) - (savedMonthHoursPerWP[wpId] || 0);
  };

  const calculateRemainingHours = (wpId: string | null): number | null => {
    if (!wpId) return null;
    const planned = plannedHoursPerWP[wpId];
    // v7.4.6-61: gebucht_gesamt + Live-Delta des aktuellen Monats
    const booked = (totalBookedPerWP[wpId] || 0) + liveDeltaForWP(wpId);
    if (planned === undefined) {
      // MA nicht im Arbeitsplan: nur anzeigen wenn tatsaechlich Stunden gebucht
      if (booked > 0) return -Math.round(booked); // Ueberziehung als negative Zahl
      return null; // Noch keine Stunden -> "-"
    }
    return Math.round(planned - booked);
  };

  // v7.4.6-29: Projektweite Restzahl eines AP = Gesamt-Soll (total_person_months
  // x 173,33) minus projektweit gebuchte Stunden aller MA. Wird bei nicht
  // zugeordneten Mitarbeitern in Blau angezeigt (Variante A: nur als freie
  // Stunden, kein Alarm). null wenn kein Gesamt-Soll bekannt.
  // v7.4.6-61: ebenfalls live (Live-Delta des aktuellen MA beruecksichtigt).
  const calculateWPOpenHours = (wpId: string | null): number | null => {
    if (!wpId) return null;
    const wp = safeWorkPackages.find(w => w.id === wpId);
    if (!wp || wp.total_person_months == null) return null;
    const plannedTotal = wp.total_person_months * hoursPerPM(pmBasisWAZ);
    const booked = (projectBookedPerWP[wpId] || 0) + liveDeltaForWP(wpId);
    return Math.round(plannedTotal - booked);
  };

  const calculateDaySum = (day: number): number => {
    return apRows.reduce((sum, row) => {
      const entry = row.entries[day];
      if (entry?.value && !isAbsenceCode(entry.value)) {
        return sum + parseHours(entry.value);
      }
      return sum;
    }, 0);
  };

  // ==========================================================================
  // v7.4.6-63: Auto-Vorbelegung "sonstige Arbeiten" (sichere Variante)
  // Auto-Wert je Arbeitstag = max(0, pWAZ/5 - dieses Projekt - andere Projekte).
  // Das Subtrahieren der anderen Projekte haelt die projektuebergreifende
  // Tagesgrenze exakt eingehalten (kein harter Kapazitaets-Block).
  // - Neuer Monat (monthHadData=false): leere Arbeitstage auffuellen + Auto-
  //   Werte live nachfuehren.
  // - Gespeicherter Monat: nur bereits gefuellte Tage nachfuehren, leere Tage
  //   in Ruhe lassen (schuetzt bewusste Loeschungen vor Re-Fill).
  // - Manuell angefasste Tage (nonBillableManual) werden nie veraendert.
  // - Abgeschlossene Monate bleiben unangetastet.
  // ==========================================================================
  useEffect(() => {
    if (isCompleted) return;
    setNonBillableEntries(prev => {
      let changed = false;
      const next = { ...prev };
      const daysInMon = getDaysInMonth(selectedYear, selectedMonth);
      for (let d = 1; d <= daysInMon; d++) {
        // v7.4.6-65: Sicherheitsnetz. Wird ein Tag nachtraeglich zum
        // Abwesenheitstag (U/K/S) -- z.B. durch direkte Eingabe in den unteren
        // Fehlzeit-Zeilen -- so muss eine nicht-manuell gesetzte "sonstige"-
        // Vorbelegung entfernt werden, sonst ergaeben Fehlzeit + sonstige eine
        // Tagesstunden-Ueberschreitung. Reine Weekend-/Feiertags-/Blocked-Tage
        // erhalten ohnehin keine Auto-Vorbelegung; nur Abwesenheitstage muessen
        // hier aktiv geraeumt werden.
        if (!nonBillableManual[d] && getAbsenceCodeForDay(d) && next[d]) {
          delete next[d];
          changed = true;
          continue;
        }
        if (nonBillableManual[d]) continue;
        if (!isPlainWorkday(d)) continue;
        const proj = calculateDaySum(d);
        const other = otherProjectHours[d] || 0;
        const auto = Math.max(0, Math.round((employeeDailyHours - proj - other) * 100) / 100);
        const cur = prev[d]?.value || '';
        const curVal = cur ? parseHours(cur) : 0;
        const same = Math.abs(curVal - auto) < 0.005;
        if (!monthHadData) {
          // Neuer Monat: leere Tage auffuellen, Auto-Werte nachfuehren
          if (auto > 0) {
            if (!same) { next[d] = { ...(next[d] || { id: '' }), value: fmtH(auto) }; changed = true; }
          } else if (cur !== '') {
            delete next[d]; changed = true;
          }
        } else {
          // Gespeicherter Monat: nur bereits gefuellte Tage nachfuehren
          if (cur !== '') {
            if (auto > 0) {
              if (!same) { next[d] = { ...next[d], value: fmtH(auto) }; changed = true; }
            } else {
              delete next[d]; changed = true;
            }
          }
        }
      }
      return changed ? next : prev;
    });
  }, [apRows, nonBillableManual, employeeDailyHours, otherProjectHours, selectedYear, selectedMonth, blockedDays, kurzarbeitInput, absenceHoursInput, monthHadData, isCompleted]);

  const calculateTotalBillable = (): number => {
    return apRows.reduce((sum, row) => sum + calculateRowSum(row), 0);
  };

  // NEU v7.3.89: Getrennte Summen fuer technische/nicht-technische APs (nur ZIM_DS)
  const calculateTechnicalDaySum = (day: number, technical: boolean): number => {
    return apRows.reduce((sum, row) => {
      if (!row.workPackageId) return sum;
      const wp = safeWorkPackages.find(w => w.id === row.workPackageId);
      const isTech = isTechnicalAP(wp);
      if (isTech !== technical) return sum;
      const entry = row.entries[day];
      if (entry?.value && !isAbsenceCode(entry.value)) {
        return sum + parseHours(entry.value);
      }
      return sum;
    }, 0);
  };

  const calculateTechnicalTotal = (technical: boolean): number => {
    return apRows.reduce((sum, row) => {
      if (!row.workPackageId) return sum;
      const wp = safeWorkPackages.find(w => w.id === row.workPackageId);
      const isTech = isTechnicalAP(wp);
      if (isTech !== technical) return sum;
      return sum + calculateRowSum(row);
    }, 0);
  };

  const calculateNonBillableSum = (): number => {
    return Object.values(nonBillableEntries).reduce((sum, entry) => {
      if (entry.value) {
        return sum + parseHours(entry.value);
      }
      return sum;
    }, 0);
  };

  const getAbsencesForDay = (day: number): { code: string; count: number }[] => {
    const absences: Record<string, number> = {};
    // AP-Zeilen pruefen
    apRows.forEach(row => {
      const entry = row.entries[day];
      if (entry?.value && isAbsenceCode(entry.value)) {
        const code = entry.value.toUpperCase();
        absences[code] = (absences[code] || 0) + 1;
      }
    });
    // v7.4.6-7: Auch nonBillableEntries (sonstige Arbeiten) pruefen
    const nbEntry = nonBillableEntries[day];
    if (nbEntry?.value && isAbsenceCode(nbEntry.value)) {
      const code = nbEntry.value.toUpperCase();
      absences[code] = (absences[code] || 0) + 1;
    }
    return Object.entries(absences).map(([code, count]) => ({ code, count }));
  };

  const calculateAbsenceSums = (): Record<string, number> => {
    // v7.4.6-16: Summen aus absenceHoursInput (direkt editierbar)
    const sums: Record<string, number> = { U: 0, K: 0, S: 0 };
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    for (let day = 1; day <= daysInMonth; day++) {
      (['U', 'K', 'S'] as const).forEach(code => {
        const entry = absenceHoursInput[code][day];
        if (entry?.value) sums[code] += parseHours(entry.value);
      });
    }
    return sums;
  };

  // ============================================================================
  // ARBEITSZEITGRENZEN: BERECHNUNGEN (v7.4.6-12)
  // ============================================================================

  const monatsgrenze = hoursPerPM(pmBasisWAZ) * (weeklyHoursAtMonth / firmStdWAZ);
  const gfGrenze     = monatsgrenze * 0.5;
  // v7.4.6-60: tolerante GF-Erkennung (Umlaut/ASCII + weibliche Form)
  const istGF        = istGeschaeftsfuehrerTitle(positionTitle);

  // Monats-Projektstunden aus aktuellem Form-State (billable, keine Fehlzeiten)
  const calcFormProjektStunden = (): number => {
    return apRows.reduce((sum, row) => {
      if (!row.workPackageId) return sum;
      return sum + Object.values(row.entries).reduce((s, e) => {
        if (!e.value || isAbsenceCode(e.value)) return s;
        return s + parseHours(e.value);
      }, 0);
    }, 0);
  };

  // Tagessumme: Projektstunden + Sonstige (keine Fehlzeiten)
  const calcTagSumme = (day: number): number => {
    let sum = 0;
    apRows.forEach(row => {
      const e = row.entries[day];
      if (e?.value && !isAbsenceCode(e.value)) sum += parseHours(e.value);
    });
    // v7.4.6-64: "sonstige Arbeiten" zaehlen NICHT mehr in die 9h-Tagesgrenze.
    // Nicht foerderbar -> keine Grenzbetrachtung. Nur foerderbare Projektstunden.
    return sum;
  };

  // A-021: Cross-Projekt-Tagessumme (dieses Projekt + andere Projekte)
  const calcCrossProjectTagSumme = (day: number): number => {
    return calcTagSumme(day) + (otherProjectHours[day] || 0);
  };

  // Abgeleitete Warnzustaende (live, kein State noetig)
  // Tages-Verletzung pruefen (alle Tage im Monat) - muss VOR tagUeberschritten definiert sein
  // A-021: Jetzt projektuebergreifend (inkl. Stunden anderer Projekte)
  const findTagVerletzung = (): number | null => {
    const daysInMon = getDaysInMonth(selectedYear, selectedMonth);
    for (let d = 1; d <= daysInMon; d++) {
      // v7.4.6-34: Wochenenden von der 9h-Tagesgrenze ausnehmen. Am Wochenende
      // sind nur nicht-foerderbare "sonstige Arbeiten" (z.B. Dienstreise)
      // moeglich; die PT-Tagesgrenze gilt fuer foerderbare Werktagsstunden.
      if (isWeekend(selectedYear, selectedMonth, d)) continue;
      if (Math.round(calcCrossProjectTagSumme(d) * 100) > Math.round(TAGESGRENZE_HART * 100)) return d;
    }
    return null;
  };

  const projektStundenMonat  = calcFormProjektStunden();
  // Rundung auf 2 Dezimalstellen verhindert Floating-Point-Fehler
  // (z.B. 173.33 x 0.3 = 51.999... statt exakt 52.00)
  const monatUeberschritten  = Math.round(projektStundenMonat * 100) > Math.round(monatsgrenze * 100);
  const gfUeberschritten     = istGF && Math.round(projektStundenMonat * 100) > Math.round(gfGrenze * 100);
  // v7.4.6-64: Physische Monatskapazitaet (projektuebergreifend) auf Basis der
  // echten Wochenarbeitszeit. Nur FOERDERBARE Stunden dieses Projekts + andere
  // Projekte. "Sonstige Arbeiten" zaehlen NICHT mehr mit (nicht foerderbar ->
  // keine Grenzbetrachtung; sonst wuerde ein langer Monat mit vielen
  // Arbeitstagen die Grenze allein durch die Auto-Vorbelegung sprengen).
  const physischeGrenze = hoursPerPM(weeklyHoursAtMonth);
  const andereProjekteMonat = Object.values(otherProjectHours).reduce((s, h) => s + (h || 0), 0);
  const physischGesamtMonat = projektStundenMonat + andereProjekteMonat;
  const physischUeberschritten = Math.round(physischGesamtMonat * 100) > Math.round(physischeGrenze * 100);
  // Harte Verletzung: Speichern UND Drucken gesperrt
  const tagUeberschritten    = findTagVerletzung() !== null;
  const hartVerletzung       = monatUeberschritten || tagUeberschritten || physischUeberschritten;

  // NEU v7.4.3-9: Monat abschliessen / Completion toggeln
  const handleToggleComplete = async () => {
    if (!selectedEmployeeId || !selectedProjectId) return;
    setLoadingCompletion(true);
    try {
      // v7.4.3-16: Falls ungespeicherte Aenderungen vorhanden, erst speichern
      if (!isCompleted && hasChanges) {
        await handleSave();
      }
      const supabaseClient = createClient();
      if (isCompleted) {
        // Completion entfernen
        await supabaseClient
          .from('v7_timesheet_completions')
          .delete()
          .eq('employee_id', selectedEmployeeId)
          .eq('project_id', selectedProjectId)
          .eq('year', selectedYear)
          .eq('month', selectedMonth);
        setIsCompleted(false);
      } else {
        // Completion setzen
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { data: profile } = await supabaseClient
          .from('v7_user_profiles')
          .select('id')
          .eq('email', user?.email || '')
          .maybeSingle();
        await supabaseClient
          .from('v7_timesheet_completions')
          .upsert({
            employee_id: selectedEmployeeId,
            project_id: selectedProjectId,
            year: selectedYear,
            month: selectedMonth,
            completed_at: new Date().toISOString(),
            completed_by: profile?.id || null,
          }, { onConflict: 'employee_id,project_id,year,month' });
        setIsCompleted(true);
      }
    } catch (err) {
      console.error('Completion error:', err);
    } finally {
      setLoadingCompletion(false);
    }
  };

  const handleSave = async () => {
    if (!selectedEmployeeId) return;
    setSaveHint('');  // v7.4.6-63: alten Hinweis zuruecksetzen

    // ============================================================================
    // ARBEITSZEITGRENZEN-VALIDIERUNG (v7.4.6-12)
    // ============================================================================

    // 1. HARTE Tagesgrenze 9h (A-021: projektuebergreifend)
    const verletzterTag = findTagVerletzung();
    if (verletzterTag !== null) {
      const tagSumme = calcCrossProjectTagSumme(verletzterTag);
      const andereStunden = otherProjectHours[verletzterTag] || 0;
      const crossInfo = andereStunden > 0
        ? ` (davon ${andereStunden.toFixed(2).replace('.', ',')} h in anderen Projekten)`
        : '';
      setError(
        `Max. ${TAGESGRENZE_HART},00 h/Tag (Tag ${verletzterTag}: ${tagSumme.toFixed(2).replace('.', ',')} h gesamt${crossInfo}) ueberschritten -- nicht zulaessig. Bitte korrigieren.`
      );
      return;
    }

    // 2. HARTE Monatsgrenze
    if (monatUeberschritten) {
      setError(
        `Max. ${monatsgrenze.toFixed(2).replace('.', ',')} h/Monat ueberschritten ` +
        `(${projektStundenMonat.toFixed(2).replace('.', ',')} h erfasst) -- nicht zulaessig. Bitte korrigieren.`
      );
      return;
    }
    // 2b. v7.4.6-43: HARTE physische Monatskapazitaet (projektuebergreifend)
    if (physischUeberschritten) {
      const crossInfo = andereProjekteMonat > 0
        ? `, davon ${andereProjekteMonat.toFixed(2).replace('.', ',')} h in anderen Projekten`
        : '';
      setError(
        `Physische Kapazitaet max. ${physischeGrenze.toFixed(2).replace('.', ',')} h/Monat ueberschritten ` +
        `(${physischGesamtMonat.toFixed(2).replace('.', ',')} h ueber alle Projekte${crossInfo}) -- nicht zulaessig. Bitte korrigieren.`
      );
      return;
    }
    // 3. v7.4.6-27: An keinem Tag darf Fehlzeit + Arbeitszeit die Tagesstunden
    //    ueberschreiten. Backstop zur Eingabe-Sperre - faengt auch nachtraeglich
    //    erfasste Fehlzeiten ab. Halbe Tage bleiben zulaessig.
    const tageImMonat = getDaysInMonth(selectedYear, selectedMonth);
    for (let d = 1; d <= tageImMonat; d++) {
      const absH = sumAbsenceHoursForDay(d);
      if (absH <= 0) continue;
      const workH = sumWorkHoursForDay(d);
      if (absH + workH > employeeDailyHours + 0.001) {
        const abs = getAbsenceCodeForDay(d);
        setError(`Tag ${d}: Fehlzeit (${abs ? absenceLabel(abs) : 'Abwesenheit'}, ${fmtH(absH)} h) plus Arbeitszeit (${fmtH(workH)} h) ueberschreitet die Tagesstunden (${fmtH(employeeDailyHours)} h). Bitte anpassen.`);
        return;
      }
    }
    // 4. A-034 (Option 1): Pro Tag nur EIN Abwesenheitscode. Mehrere Codes am
    //    selben Tag (z.B. U und K) werden hart blockiert -- kein stilles
    //    Ueberschreiben. S an einem berechneten Feiertag bleibt aussen vor
    //    (das ist kein Sonderurlaub, sondern der berechnete Feiertag).
    const absCodesProTag: Record<number, string[]> = {};
    (['U', 'K', 'S'] as const).forEach(code => {
      Object.entries(absenceHoursInput[code]).forEach(([dayStr, entry]) => {
        if (!entry.value || parseHours(entry.value) === 0) return;
        const day = parseInt(dayStr);
        if (code === 'S' && isHoliday(selectedYear, selectedMonth, day)) return;
        if (!absCodesProTag[day]) absCodesProTag[day] = [];
        absCodesProTag[day].push(code);
      });
    });
    const konfliktTage = Object.entries(absCodesProTag)
      .filter(([, codes]) => codes.length > 1)
      .map(([d]) => Number(d))
      .sort((a, b) => a - b);
    if (konfliktTage.length > 0) {
      setError(
        `Tag ${konfliktTage.join(', ')}: mehrere Abwesenheiten am selben Tag eingetragen. ` +
        `Pro Tag ist nur ein Code (Urlaub, Krankheit oder Sonstige) zulaessig -- bitte einen Wert entfernen.`
      );
      return;
    }
    // (GF-Warnung ist rein informativ in der UI, kein Speichern-Block)
    setError(null);
    setSuccessMessage(null);

    // v7.4.6-26: Doppel-Speichern-Riegel. setSaving(true) sperrt den Button
    // sichtbar; savingRef faengt einen schnellen zweiten Aufruf synchron ab,
    // bevor er INSERTen kann (Ursache der frueheren Dubletten).
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);

    try {
      const now = new Date().toISOString();
      const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
      const entriesToSave: any[] = [];
      const idsToKeep: string[] = [];

      // AP-Zeilen (nur Projektstunden, keine Abwesenheits-Codes mehr)
      apRows.forEach(row => {
        if (!row.workPackageId) return;

        Object.entries(row.entries).forEach(([dayStr, entry]) => {
          const day = parseInt(dayStr);
          if (!entry.value) return;

          // v7.4.6-16: Abwesenheits-Codes in AP-Zeilen werden nicht mehr gespeichert
          // (Fehlzeiten werden direkt aus absenceHoursInput gespeichert)
          if (isAbsenceCode(entry.value)) return;

          const record = {
            employee_id: selectedEmployeeId,
            work_package_id: row.workPackageId,
            project_id: selectedProjectId,
            work_date: formatWorkDate(day),
            hours: parseHours(entry.value),
            is_billable: true,
            absence_code: null,
            data_source: 'manual',
            entered_by: currentUserId,
            entered_at: now,
            is_active: true,
            updated_at: now,
          };

          if (entry.id) {
            entriesToSave.push({ id: entry.id, ...record });
            idsToKeep.push(entry.id);
          } else {
            entriesToSave.push(record);
          }
        });
      });

      // Nicht zuschussfaehig
      Object.entries(nonBillableEntries).forEach(([dayStr, entry]) => {
        const day = parseInt(dayStr);
        if (!entry.value || parseHours(entry.value) === 0) return;

        const record = {
          employee_id: selectedEmployeeId,
          work_package_id: null,
          project_id: selectedProjectId,
          work_date: formatWorkDate(day),
          hours: parseHours(entry.value),
          is_billable: false,
          absence_code: null,
          data_source: 'manual',
          entered_by: currentUserId,
          entered_at: now,
          is_active: true,
          updated_at: now,
        };

        if (entry.id) {
          entriesToSave.push({ id: entry.id, ...record });
          idsToKeep.push(entry.id);
        } else {
          entriesToSave.push(record);
        }
      });

      // A-034 Etappe 2b: U/K/S werden NICHT mehr in v7_timesheets geschrieben.
      // Sie werden weiter unten projektuebergreifend in v7_employee_absences
      // synchronisiert. KA (Kurzarbeit) bleibt ein v7_timesheets-Marker.

      // v7.4.6-31: Kurzarbeit -- reiner Tag-Marker. BEWUSST 0 Stunden, daher
      // KEIN "hours === 0"-Filter (sonst wuerde der Marker nie gespeichert).
      Object.entries(kurzarbeitInput).forEach(([dayStr, entry]) => {
        const day = parseInt(dayStr);
        const record = {
          employee_id: selectedEmployeeId,
          work_package_id: null,
          project_id: selectedProjectId,
          work_date: formatWorkDate(day),
          hours: 0,
          is_billable: false,
          absence_code: 'KA',
          data_source: 'manual',
          entered_by: currentUserId,
          entered_at: now,
          is_active: true,
          updated_at: now,
        };
        if (entry.id) {
          entriesToSave.push({ id: entry.id, ...record });
          idsToKeep.push(entry.id);
        } else {
          entriesToSave.push(record);
        }
      });

      // Alte Eintraege deaktivieren
      const startDate = formatWorkDate(1);
      const endDate = formatWorkDate(daysInMonth);

      const { data: existingEntries } = await supabase
        .from('v7_timesheets')
        .select('id')
        .eq('employee_id', selectedEmployeeId)
        .eq('project_id', selectedProjectId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .eq('is_active', true);

      const idsToDeactivate = existingEntries
        ?.filter(e => !idsToKeep.includes(e.id))
        .map(e => e.id) || [];

      if (idsToDeactivate.length > 0) {
        await supabase
          .from('v7_timesheets')
          .update({ is_active: false, updated_at: now })
          .in('id', idsToDeactivate);
      }

      // Speichern
      for (const entry of entriesToSave) {
        if (entry.id) {
          await supabase.from('v7_timesheets').update(entry).eq('id', entry.id);
        } else {
          await supabase.from('v7_timesheets').insert(entry);
        }
      }

      // ----------------------------------------------------------------------
      // A-034 Etappe 2b: Abwesenheiten U/K/S projektuebergreifend in
      // v7_employee_absences synchronisieren (Abgleich ueber Mitarbeiter+Monat).
      // Soll-Stand = absenceHoursInput; S an einem berechneten Feiertag bleibt
      // aussen vor (Feiertage werden berechnet, nicht gespeichert). Der Konflikt
      // "mehrere Codes je Tag" ist oben bereits hart abgefangen.
      // ----------------------------------------------------------------------
      const desiredAbsences: Array<{ work_date: string; absence_code: 'U' | 'K' | 'S'; hours: number }> = [];
      (['U', 'K', 'S'] as const).forEach(code => {
        Object.entries(absenceHoursInput[code]).forEach(([dayStr, entry]) => {
          if (!entry.value || parseHours(entry.value) === 0) return;
          const day = parseInt(dayStr);
          if (code === 'S' && isHoliday(selectedYear, selectedMonth, day)) return;
          desiredAbsences.push({ work_date: formatWorkDate(day), absence_code: code, hours: parseHours(entry.value) });
        });
      });

      const { data: currentAbsences } = await supabase
        .from('v7_employee_absences')
        .select('id, work_date, absence_code, hours')
        .eq('employee_id', selectedEmployeeId)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .eq('is_active', true);

      const desiredByDate = new Map(desiredAbsences.map(d => [d.work_date, d]));
      const currentByDate = new Map((currentAbsences || []).map(a => [a.work_date, a]));

      // (a) Entfernte deaktivieren: im Ist, aber nicht mehr im Soll. Wirkt nur
      //     auf Tage, die der Nutzer im Formular geleert hat (das Formular zeigt
      //     ALLE Abwesenheiten des MA im Monat) -- kappt also nichts aus anderen
      //     Projekten.
      for (const a of (currentAbsences || [])) {
        if (!desiredByDate.has(a.work_date)) {
          await supabase
            .from('v7_employee_absences')
            .update({ is_active: false, updated_at: now })
            .eq('id', a.id);
        }
      }

      // (b) Neu anlegen oder geaenderte aktualisieren
      for (const d of desiredAbsences) {
        const existing = currentByDate.get(d.work_date);
        if (existing) {
          if (existing.absence_code !== d.absence_code || Number(existing.hours) !== d.hours) {
            await supabase
              .from('v7_employee_absences')
              .update({
                absence_code: d.absence_code,
                hours: d.hours,
                entered_by: currentUserId,
                entered_at: now,
                updated_at: now,
              })
              .eq('id', existing.id);
          }
        } else {
          await supabase
            .from('v7_employee_absences')
            .insert({
              employee_id: selectedEmployeeId,
              client_company_id: companyId,
              work_date: d.work_date,
              absence_code: d.absence_code,
              hours: d.hours,
              entered_by: currentUserId,
              entered_at: now,
              is_active: true,
            });
        }
      }

      setSuccessMessage(`Stundennachweis fuer ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} gespeichert!`);
      setHasChanges(false);
      setTimeout(() => setSuccessMessage(null), 4000);

      // NEU v7.4.3-9: Completion zuruecksetzen wenn Aenderungen gespeichert wurden
      if (isCompleted) {
        const supabaseCl = createClient();
        await supabaseCl
          .from('v7_timesheet_completions')
          .delete()
          .eq('employee_id', selectedEmployeeId)
          .eq('project_id', selectedProjectId)
          .eq('year', selectedYear)
          .eq('month', selectedMonth);
        setIsCompleted(false);
      }

      // NEU v7.4.3-2: offen-Spalte sofort aktualisieren nach Speichern
      await reloadBookedHours();
      // v7.4.6-61: Live-Basis auf den soeben gespeicherten Stand setzen -> Delta 0
      const snapAfterSave: Record<string, number> = {};
      apRows.forEach(r => {
        if (!r.workPackageId) return;
        snapAfterSave[r.workPackageId] = (snapAfterSave[r.workPackageId] || 0) + calculateRowSum(r);
      });
      setSavedMonthHoursPerWP(snapAfterSave);

      // v7.4.6-63: Weicher Hinweis auf "Luecken"-Tage. Reine Arbeitstage mit
      // Projektstunden > 0, aber leerer "sonstige"-Zeile UND nicht voller
      // Tagesarbeitszeit (dieses Projekt + andere Projekte < pWAZ/5). Genau die
      // Faelle, in denen die Auto-Vorbelegung bewusst nicht griff bzw. geloescht
      // wurde. Blockiert NICHT -- gespeichert wurde bereits.
      const luecken: number[] = [];
      const daysInMon2 = getDaysInMonth(selectedYear, selectedMonth);
      for (let d = 1; d <= daysInMon2; d++) {
        if (!isPlainWorkday(d)) continue;
        const proj = calculateDaySum(d);
        if (proj <= 0) continue;
        const other = otherProjectHours[d] || 0;
        if (proj + other >= employeeDailyHours - 0.005) continue; // Tag ist voll
        const nb = nonBillableEntries[d]?.value;
        if (nb && parseHours(nb) > 0) continue; // sonstige vorhanden -> keine Luecke
        luecken.push(d);
      }
      if (luecken.length > 0) {
        setSaveHint(
          `Hinweis: An ${luecken.length} Arbeitstag(en) (${luecken.join(', ')}) sind ` +
          `Projektstunden erfasst, aber die Tagesarbeitszeit ist nicht voll und ` +
          `"sonstige Arbeiten" ist leer. Falls dort noch nicht-foerderbare ` +
          `Arbeitszeit fehlt, bitte ergaenzen. Gespeichert wurde bereits.`
        );
      }

    } catch (err: any) {
      console.error('Speichern fehlgeschlagen:', err);
      setError('Fehler beim Speichern: ' + err.message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // ============================================================================
  // PDF EXPORT
  // ============================================================================

  // Ersetzt select-Elemente vor dem Drucken durch lesbare span-Texte.
  // Gibt Restore-Funktion zurueck die alles rueckgaengig macht.
  const replaceSelectsForPrint = (): (() => void) => {
    const container = printRef.current;
    if (!container) return () => {};
    const replacements: Array<{ select: HTMLSelectElement; span: HTMLSpanElement }> = [];
    container.querySelectorAll('select').forEach((select) => {
      const selectedOption = select.options[select.selectedIndex];
      const text = selectedOption ? selectedOption.text.trim() : '';
      const span = document.createElement('span');
      span.textContent = (text === '-' || text === '') ? '' : text;
      span.style.cssText = 'display:block;width:100%;text-align:center;font-size:inherit;padding:2px;';
      select.parentNode?.insertBefore(span, select);
      select.style.display = 'none';
      replacements.push({ select, span });
    });
    return () => {
      replacements.forEach(({ select, span }) => {
        select.style.display = '';
        span.parentNode?.removeChild(span);
      });
    };
  };

  const handlePrint = () => {
    // v7.4.6-59: Dateiname-Schema (Einzeldruck), Leerzeichen-getrennt, ohne
    //   "Stundenerfassung": <NN><VV> <YYMM> <FKZ> <Vorname> <Nachname>
    //   Bsp.: SF 2510 16DS251601 Ferat Sarac (Browser haengt .pdf selbst an).
    //   NN/VV = 1. Buchstabe 1. Nachname / 1. Vorname; mehrteilige Namen -> nur
    //   erster Token; Sonderzeichen -> ASCII (Jose, Sarac, ss fuer scharfes s).
    const toAscii = (s: string): string =>
      (s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u00df/g, 'ss')
        .replace(/[^A-Za-z0-9]/g, '');
    const firstToken = (s: string): string => (s || '').trim().split(/\s+/)[0] || '';
    const lastAscii = toAscii(firstToken(selectedEmployee?.last_name || ''));
    const firstAscii = toAscii(firstToken(selectedEmployee?.first_name || ''));
    const initials = `${lastAscii.charAt(0)}${firstAscii.charAt(0)}`.toUpperCase();
    const yymm = `${String(selectedYear).slice(-2)}${String(selectedMonth).padStart(2, '0')}`;
    const fkz = (selectedProject?.funding_reference || selectedProject?.short_name || 'Projekt').replace(/[\/\s]+/g, '_');
    const fileName = (initials && firstAscii && lastAscii)
      ? `${initials} ${yymm} ${fkz} ${firstAscii} ${lastAscii}`
      : `${yymm} ${fkz}`;
    const prevTitle = document.title;
    document.title = fileName;
    const restore = replaceSelectsForPrint();
    window.print();
    const cleanup = () => { restore(); document.title = prevTitle; };
    window.onafterprint = cleanup;
    setTimeout(cleanup, 3000);
  };

  const handleExportPDF = () => {
    handlePrint();
  };

  // ============================================================================
  // A-021: NWM-TAGESSPERREN VERWALTUNG
  // ============================================================================

  const handleCreateBlock = async (employeeIds: string[], startDate: string, endDate: string, reason: string) => {
    if (employeeIds.length === 0 || !startDate || !endDate || !selectedProjectId) return;
    setBlockSaving(true);
    setBlockError(null);

    try {
      // Validierung: Pruefen ob bereits Stunden gebucht
      const { data: existingHours } = await supabase
        .from('v7_timesheets')
        .select('employee_id, work_date, hours')
        .eq('project_id', selectedProjectId)
        .in('employee_id', employeeIds)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .eq('is_active', true)
        .gt('hours', 0);

      if (existingHours && existingHours.length > 0) {
        const maNames = existingHours
          .map(e => safeEmployees.find(emp => emp.id === e.employee_id)?.display_name || 'Unbekannt')
          .filter((v, i, a) => a.indexOf(v) === i);
        setBlockError(
          `Sperre nicht moeglich: ${maNames.join(', ')} ` +
          `ha${maNames.length > 1 ? 'ben' : 't'} bereits Stunden im Zeitraum gebucht.`
        );
        return;
      }

      // Sperren anlegen (ein Eintrag pro MA)
      const { data: { user } } = await supabase.auth.getUser();
      const rows = employeeIds.map(empId => ({
        project_id: selectedProjectId,
        employee_id: empId,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim() || null,
        created_by: user?.id || '',
      }));

      const { error: insertError } = await supabase
        .from('v7_nwm_blocked_periods')
        .insert(rows);

      if (insertError) throw insertError;

      // Neu laden
      await loadAllBlockedPeriods();
      // Aktuelle Sperren fuer den angezeigten MA aktualisieren (Trigger useEffect via Dependency)
      // Workaround: Manuell die blocked days neu laden
      const dim = getDaysInMonth(selectedYear, selectedMonth);
      const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const monthEnd = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${dim}`;
      const { data: blocks } = await supabase
        .from('v7_nwm_blocked_periods')
        .select('*')
        .eq('project_id', selectedProjectId)
        .eq('employee_id', selectedEmployeeId)
        .lte('start_date', monthEnd)
        .gte('end_date', monthStart);
      const newDays = new Set<number>();
      const newReasons: Record<number, string> = {};
      if (blocks) {
        for (const period of blocks) {
          const pStart = new Date(period.start_date + 'T00:00:00');
          const pEnd = new Date(period.end_date + 'T00:00:00');
          for (let d = 1; d <= dim; d++) {
            const date = new Date(selectedYear, selectedMonth - 1, d);
            if (date >= pStart && date <= pEnd) {
              newDays.add(d);
              newReasons[d] = period.reason || 'Gesperrt durch PL';
            }
          }
        }
      }
      setBlockedDays(newDays);
      setBlockedDayReasons(newReasons);
    } catch (err: any) {
      setBlockError(err.message || 'Fehler beim Erstellen der Sperre');
    } finally {
      setBlockSaving(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      await supabase.from('v7_nwm_blocked_periods').delete().eq('id', blockId);
      await loadAllBlockedPeriods();
      // Blocked days fuer aktuellen MA aktualisieren
      setBlockedDays(prev => {
        // Einfachste Loesung: useEffect-Dependency triggern geht nicht direkt,
        // daher setzen wir einen Reload-Trigger. Alternativ: direkt neu laden.
        return prev; // wird durch loadAllBlockedPeriods + nachfolgenden Effekt aktualisiert
      });
      // Direkt neu laden fuer den aktuellen MA
      const dim = getDaysInMonth(selectedYear, selectedMonth);
      const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const monthEnd = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${dim}`;
      const { data: blocks } = await supabase
        .from('v7_nwm_blocked_periods')
        .select('*')
        .eq('project_id', selectedProjectId)
        .eq('employee_id', selectedEmployeeId)
        .lte('start_date', monthEnd)
        .gte('end_date', monthStart);
      const newDays = new Set<number>();
      const newReasons: Record<number, string> = {};
      if (blocks) {
        for (const period of blocks) {
          const pStart = new Date(period.start_date + 'T00:00:00');
          const pEnd = new Date(period.end_date + 'T00:00:00');
          for (let d = 1; d <= dim; d++) {
            const date = new Date(selectedYear, selectedMonth - 1, d);
            if (date >= pStart && date <= pEnd) {
              newDays.add(d);
              newReasons[d] = period.reason || 'Gesperrt durch PL';
            }
          }
        }
      }
      setBlockedDays(newDays);
      setBlockedDayReasons(newReasons);
    } catch (err: any) {
      setBlockError(err.message || 'Fehler beim Loeschen der Sperre');
    }
  };

  // ============================================================================
  // NEU v7.4.3-21: TIMESHEET-NOTIZEN (Interne Rueckfragen)
  // ============================================================================

  const handleOpenNoteModal = () => {
    setNoteEditing(noteText);
    setShowNoteModal(true);
  };

  const handleSaveNote = async () => {
    if (!selectedEmployeeId || !selectedProjectId || noteEditing.trim() === '') return;
    setNoteSaving(true);
    try {
      const supabaseClient = createClient();
      const { data: { user } } = await supabaseClient.auth.getUser();
      const { data: profile } = await supabaseClient
        .from('v7_user_profiles')
        .select('id, display_name')
        .eq('email', user?.email || '')
        .maybeSingle();
      const userId = profile?.id || null;

      if (noteId) {
        // Bestehende Notiz aktualisieren (kein Loeschen mehr)
        await supabaseClient
          .from('v7_timesheet_notes')
          .update({
            note_text: noteEditing.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', noteId);
        setNoteText(noteEditing.trim());
      } else {
        // Neue Notiz erstellen
        const { data: newNote } = await supabaseClient
          .from('v7_timesheet_notes')
          .insert({
            employee_id: selectedEmployeeId,
            project_id: selectedProjectId,
            year: selectedYear,
            month: selectedMonth,
            note_text: noteEditing.trim(),
            status: 'offen',
            created_by: userId,
          })
          .select('id, created_at')
          .single();
        if (newNote) {
          setNoteId(newNote.id);
          setNoteText(noteEditing.trim());
          setNoteStatus('offen');
          setNoteCreatedBy(profile?.display_name || '');
          setNoteCreatedAt(newNote.created_at || '');
        }
      }
      setShowNoteModal(false);
    } catch (err) {
      console.error('[TimesheetForm] Notiz speichern Fehler:', err);
    } finally {
      setNoteSaving(false);
    }
  };

  const handleToggleNoteStatus = async () => {
    if (!noteId) return;
    setNoteSaving(true);
    try {
      const supabaseClient = createClient();
      const newStatus = noteStatus === 'offen' ? 'erledigt' : 'offen';

      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'erledigt') {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { data: profile } = await supabaseClient
          .from('v7_user_profiles')
          .select('id, display_name')
          .eq('email', user?.email || '')
          .maybeSingle();
        const now = new Date().toISOString();
        updateData.resolved_at = now;
        updateData.resolved_by = profile?.id || null;
        // v7.4.3-22: Erlediger-Info sofort in State setzen
        setNoteResolvedBy(profile?.display_name || '');
        setNoteResolvedAt(now);
      } else {
        updateData.resolved_at = null;
        updateData.resolved_by = null;
        setNoteResolvedBy('');
        setNoteResolvedAt('');
      }

      await supabaseClient
        .from('v7_timesheet_notes')
        .update(updateData)
        .eq('id', noteId);
      setNoteStatus(newStatus);
    } catch (err) {
      console.error('[TimesheetForm] Notiz-Status Fehler:', err);
    } finally {
      setNoteSaving(false);
    }
  };

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const goToPreviousMonth = () => {
    checkUnsavedChanges(() => {
      let newMonth = selectedMonth;
      let newYear = selectedYear;
      if (newMonth === 1) {
        newMonth = 12;
        newYear = newYear - 1;
      } else {
        newMonth = newMonth - 1;
      }
      // NEU v7.4.3-20: Nur navigieren wenn im erlaubten Bereich
      if (isMonthAllowed(newYear, newMonth)) {
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
      }
    });
  };

  const goToNextMonth = () => {
    checkUnsavedChanges(() => {
      let newMonth = selectedMonth;
      let newYear = selectedYear;
      if (newMonth === 12) {
        newMonth = 1;
        newYear = newYear + 1;
      } else {
        newMonth = newMonth + 1;
      }
      // NEU v7.4.3-20: Nur navigieren wenn im erlaubten Bereich
      if (isMonthAllowed(newYear, newMonth)) {
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
      }
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const absenceSums = calculateAbsenceSums();

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Header */}
      <header style={{ backgroundColor: colors.primary }} className="shadow-sm print:hidden">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => checkUnsavedChanges(onBack)}
                className="text-white/80 hover:text-white flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zurueck
              </button>
              <div className="bg-white rounded-lg px-3 py-1 text-sm font-bold" style={{ color: colors.primary }}>
                PZE
              </div>
              <h1 className="text-lg font-semibold text-white">Stundennachweis</h1>
              {portal === 'berater' && (
                <span className="text-white/70 text-sm">| {company.name}</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {hasChanges && (
                <span className="text-yellow-200 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>
                  Ungespeichert
                </span>
              )}
              {/* NEU v7.4.3-9: Monat abschliessen */}
              <button
                onClick={handleToggleComplete}
                disabled={loadingCompletion || !selectedEmployeeId || !selectedProjectId || hartVerletzung}
                title={hartVerletzung ? 'Nicht moeglich: Arbeitszeitgrenze ueberschritten' : isCompleted ? 'Monat ist abgeschlossen - klicken zum Aufheben' : 'Monat als vollstaendig erfasst markieren'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  hartVerletzung
                    ? 'bg-white/20 text-white/40 cursor-not-allowed'
                    : isCompleted
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {loadingCompletion ? (
                  <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {isCompleted ? 'Abgeschlossen' : 'Monat abschliessen'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges || hartVerletzung}
                className={`px-4 py-1.5 rounded text-sm font-medium ${
                  hasChanges && !hartVerletzung
                    ? 'bg-white text-gray-800 hover:bg-gray-100'
                    : 'bg-white/50 text-white/70 cursor-not-allowed'
                }`}
              >
                {saving ? '...' : 'Speichern'}
              </button>
              <button
                onClick={handleExportPDF}
                disabled={hartVerletzung}
                title={hartVerletzung ? 'Nicht moeglich: Arbeitszeitgrenze ueberschritten' : 'PDF exportieren'}
                className={`px-3 py-1.5 rounded text-sm ${hartVerletzung ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-white/20 text-white hover:bg-white/30'}`}
              >
                PDF Export
              </button>
              <button
                onClick={handlePrint}
                disabled={hartVerletzung}
                title={hartVerletzung ? 'Nicht moeglich: Arbeitszeitgrenze ueberschritten' : 'Drucken'}
                className={`px-3 py-1.5 rounded text-sm ${hartVerletzung ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-white/20 text-white hover:bg-white/30'}`}
              >
                Drucken
              </button>
              <span className="text-white text-sm">{currentUserDisplayName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================
          ARBEITSZEITGRENZEN HINWEISE (v7.4.6-12) - nur bei Verletzung
          ================================================================ */}
      {(monatUeberschritten || gfUeberschritten || physischUeberschritten) && (
        <div className="print:hidden">
          {monatUeberschritten && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm font-medium">
                Max. {monatsgrenze.toFixed(2).replace('.', ',')} h/Monat ueberschritten
                ({projektStundenMonat.toFixed(2).replace('.', ',')} h erfasst) -- nicht zulaessig, Speichern gesperrt
              </span>
            </div>
          )}
          {physischUeberschritten && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm font-medium">
                Physische Kapazitaet max. {physischeGrenze.toFixed(2).replace('.', ',')} h/Monat ueberschritten
                ({physischGesamtMonat.toFixed(2).replace('.', ',')} h ueber alle Projekte) -- Speichern gesperrt
              </span>
            </div>
          )}
          {gfUeberschritten && !monatUeberschritten && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm font-medium">
                GF-Anteil {projektStundenMonat.toFixed(2).replace('.', ',')} h &gt; 50% Monatsarbeitszeit
                ({gfGrenze.toFixed(2).replace('.', ',')} h) -- Foerderrisiko, Speichern moeglich
              </span>
            </div>
          )}
        </div>
      )}

      {/* Steuerung */}
      <div className="bg-white border-b shadow-sm print:hidden">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Mitarbeiter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-900">Mitarbeiter:</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  const newValue = e.target.value;
                  checkUnsavedChanges(() => setSelectedEmployeeId(newValue));
                }}
                disabled={!isAdmin && teamEmployees.length <= 1}
                className="border rounded px-2 py-1 text-sm"
              >
                {teamEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.display_name}</option>
                ))}
              </select>
              {/* v7.4.6-62: persoenliche Wochenarbeitszeit des MA (aus Teilzeit-Historie) */}
              <span
                className="text-sm text-gray-600 whitespace-nowrap"
                title="Persoenliche Wochenarbeitszeit des Mitarbeiters (aus der Teilzeit-Historie)"
              >
                {weeklyHoursAtMonth.toLocaleString('de-DE', { maximumFractionDigits: 2 })} h/Woche
              </span>
            </div>

            {/* v7.4.6-30: Meine Arbeitspakete (zugeordnete APs des MA) */}
            <button
              onClick={() => setShowMyAPModal(true)}
              disabled={!selectedEmployeeId}
              className={`flex items-center gap-1.5 text-sm px-2.5 py-1 rounded border border-gray-300 ${colors.text} hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Dem Mitarbeiter im Arbeitsplan zugeordnete Arbeitspakete anzeigen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Meine Arbeitspakete{assignedWPIds.length > 0 ? ` (${assignedWPIds.length})` : ''}
            </button>

            {/* v7.4.6-50: Alle AP (projektweiter AP-Status) */}
            <button
              onClick={() => setShowAllAPModal(true)}
              disabled={!selectedProjectId}
              className={`flex items-center gap-1.5 text-sm px-2.5 py-1 rounded border border-gray-300 ${colors.text} hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Projektweiter AP-Status: geplante, gebuchte und offene Stunden je Arbeitspaket"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Alle AP
            </button>

            {/* Projekt */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-900">Projekt:</label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  const newValue = e.target.value;
                  checkUnsavedChanges(() => setSelectedProjectId(newValue));
                }}
                className="border rounded px-2 py-1 text-sm min-w-[200px]"
              >
                {safeProjects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.short_name || p.name} {p.funding_reference ? `(${p.funding_reference})` : ''}
                  </option>
                ))}
              </select>
              {/* A-003: AP-Quick-View Icon */}
              <button
                onClick={() => setShowAPModal(true)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                title="Arbeitspakete anzeigen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>

            {/* Monat */}
            <div className="flex items-center gap-1">
              <button onClick={goToPreviousMonth} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value);
                  checkUnsavedChanges(() => setSelectedMonth(newValue));
                }}
                className="border rounded px-2 py-1 text-sm"
              >
                {allowedMonths.map(m => (
                  <option key={m.month} value={m.month}>{m.name}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value);
                  checkUnsavedChanges(() => setSelectedYear(newValue));
                }}
                className="border rounded px-2 py-1 text-sm"
              >
                {allowedYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button onClick={goToNextMonth} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* NEU v7.4.3-21: Notiz-Icon (nur fuer Admin/PL/Berater) */}
            {isAdmin && (
              <button
                onClick={handleOpenNoteModal}
                className="relative p-1.5 rounded hover:bg-gray-100"
                title={noteStatus === 'offen' ? 'Offene Rueckfrage vorhanden' : noteId ? 'Notiz vorhanden (erledigt)' : 'Notiz hinzufuegen'}
              >
                <svg className={`w-5 h-5 ${noteStatus === 'offen' ? 'text-orange-500' : noteId ? 'text-gray-400' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                {noteStatus === 'offen' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full"></span>
                )}
              </button>
            )}

            {/* A-021: NWM-Sperren-Button (nur NWM-Projekte + Admin) */}
            {isNetzwerk && isAdmin && (
              <button
                onClick={() => { loadAllBlockedPeriods(); setShowBlockModal(true); }}
                className="relative p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                title="NWM-Tagessperren verwalten"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {blockedDays.size > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-400 rounded-full"></span>
                )}
              </button>
            )}

            {/* v7.4.6-62: Direktlink zur Zahlungsanforderung (ZA) des Projekts */}
            <button
              onClick={() => checkUnsavedChanges(goToZA)}
              disabled={!selectedProjectId}
              className={`ml-auto flex items-center gap-1.5 text-sm px-2.5 py-1 rounded border border-gray-300 ${colors.text} hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Zur Zahlungsanforderung (ZA) dieses Projekts springen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              ZA
            </button>
          </div>
        </div>
      </div>

      {/* Meldungen */}
      {error && (
        <div className="max-w-full mx-auto px-4 mt-2 print:hidden">
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
        </div>
      )}
      {successMessage && (
        <div className="max-w-full mx-auto px-4 mt-2 print:hidden">
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">{successMessage}</div>
        </div>
      )}
      {/* v7.4.6-63: weicher Hinweis auf Luecken-Tage (sonstige Arbeiten fehlen) */}
      {saveHint && (
        <div className="max-w-full mx-auto px-4 mt-2 print:hidden">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded text-sm">{saveHint}</div>
        </div>
      )}

      {/* STUNDENNACHWEIS-FORMULAR */}
      <div ref={printRef} translate="no" className="notranslate pze-ts-sheet max-w-full mx-auto p-4 print:p-0 print:m-0">
        <div className="bg-white shadow-lg print:shadow-none overflow-x-auto text-black">
          {/* Header-Bereich */}
          <table className="w-full border-collapse text-xs" style={{ minWidth: '1000px', tableLayout: 'fixed' }}>
            <tbody>
              <tr>
                <td className="border p-2 print:p-1.5" style={{ width: '50%' }}>
                  <div className="text-[10px] print:text-[8px] text-black">Zuwendungsempfaenger (Firmenstempel)</div>
                  <div className="font-bold text-lg print:text-base text-center py-2">{company?.name}</div>
                </td>
                <td className="border p-2 print:p-1.5 text-center" style={{ width: '50%', backgroundColor: HEADER_ORANGE }}>
                  <div className="font-bold text-xl print:text-lg">Stundennachweis</div>
                  <div className="text-[10px] print:text-[8px] text-black mt-1">
                    Der Stundennachweis verbleibt beim Zuwendungsempfaenger und ist nur nach Aufforderung vorzulegen.
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border p-2 print:p-1">
                  <div className="text-[10px] print:text-[8px] text-black">Vorhabenthema</div>
                  <div className="font-semibold text-base print:text-sm text-center py-1">{selectedProject?.name || '-'}</div>
                </td>
                <td className="border p-2 print:p-1" style={{ backgroundColor: HEADER_ORANGE }}>
                  <div className="text-[10px] print:text-[8px] text-black">Foerderkennzeichen</div>
                  <div className="font-bold text-lg print:text-base text-center py-1">{selectedProject?.funding_reference || '-'}</div>
                </td>
              </tr>
              <tr>
                <td className="border p-2 print:p-1">
                  <div className="text-[10px] print:text-[8px] text-black">Monat</div>
                  <div className="font-semibold text-base print:text-sm text-center py-1">{formatDisplayDate()}</div>
                </td>
                <td className="border p-2 print:p-1">
                  <div className="text-[10px] print:text-[8px] text-black">Mitarbeiter(in): [Name, Vorname]</div>
                  <div className="font-semibold text-base print:text-sm text-center py-1">
                    {selectedEmployee ? `${selectedEmployee.last_name || ''}, ${selectedEmployee.first_name || ''}`.trim() || selectedEmployee.display_name : '-'}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Hinweistext */}
          <div className="px-2 py-1 print:px-1 print:py-0.5 text-[8px] print:text-[6px] text-black border-x">
            Die zu Lasten des Vorhabens abzurechnenden Personalstunden sind taeglich eigenhaendig von der betreffenden Person zu erfassen. Nur die produktiven, fuer das Vorhaben geleisteten Stunden sind zuwendungsfaehig.
          </div>

          {/* Kalender-Tabelle */}
          <table className="w-full border-collapse text-xs" style={{ minWidth: '1000px' }}>
            <thead>
              <tr style={{ backgroundColor: HEADER_ORANGE }}>
                <th className="border p-1 text-left" style={{ width: '30px' }}>lfd. Nr.</th>
                <th className="border p-1 text-left" style={{ width: '55px' }}>AP</th>
                <th className="border p-1 text-left" style={{ width: '180px' }}>Kurzbezeichnung des Arbeitspakets</th>
                {isDurchfuehrbarkeitsstudie && (
                  <th className="border p-1 text-center" style={{ width: '28px' }}>T/NT</th>
                )}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const weekend = isWeekend(selectedYear, selectedMonth, day);
                  const holiday = isHoliday(selectedYear, selectedMonth, day);
                  return (
                    <th
                      key={day}
                      className={`border p-0 text-center ${weekend ? 'bg-gray-300' : holiday ? 'bg-orange-200' : ''}`}
                      style={{ width: '24px', minWidth: '24px' }}
                      title={holiday || undefined}
                    >
                      {day.toString().padStart(2, '0')}
                    </th>
                  );
                })}
                <th className="border p-1 text-center" style={{ width: '25px' }}>S</th>
                <th className="border p-1 text-center print:hidden" style={{ width: '25px', backgroundColor: '#E8F5E9' }}>+/-</th>
              </tr>
            </thead>
            <tbody>
              {/* Abschnitt 1: Foerderbare Arbeiten */}
              <tr>
                <td className="border p-1 font-semibold" colSpan={(isDurchfuehrbarkeitsstudie ? 4 : 3) + daysInMonth + 2}>
                  {isNetzwerk ? '1. f\u00f6rderbare Management-Arbeiten (1)' : '1. f\u00f6rderbare Projektarbeiten (1)'}
                </td>
              </tr>

              {/* AP-Zeilen */}
              {apRows.map((row, rowIndex) => {
                const selectedWP = safeWorkPackages.find(wp => wp.id === row.workPackageId);
                return (
                  <tr key={rowIndex}>
                    <td className="border p-1 text-center">{rowIndex + 1}.</td>
                    <td className="border p-0">
                      <select
                        value={row.workPackageId || ''}
                        onChange={(e) => handleAPSelect(rowIndex, e.target.value)}
                        className="w-full h-full p-1 text-xs border-0 bg-transparent print:appearance-none text-center"
                      >
                        <option value="">-</option>
                        {/* v7.4.6-2: AP-Gruppen ueber Helper-Funktionen */}
                        {availableWorkPackages.some(wp => isAPInAssignedGroup(wp)) && (
                          <optgroup label="Zugeordnete AP">
                            {availableWorkPackages
                              .filter(wp => isAPInAssignedGroup(wp))
                              .sort(compareApCode)
                              .map(wp => {
                                const apDisplay = wp.ap_code
                                  ? wp.ap_code.replace(/^AP/i, '')
                                  : `${wp.ap_number}${wp.ap_sub_number ? `.${wp.ap_sub_number}` : ''}`;
                                return (
                                  <option key={wp.id} value={wp.id}>
                                    {apDisplay}
                                  </option>
                                );
                              })}
                          </optgroup>
                        )}
                        {availableWorkPackages.some(wp => isAPInWeitereGroup(wp)) && (
                          <optgroup label="Weitere AP">
                            {availableWorkPackages
                              .filter(wp => isAPInWeitereGroup(wp))
                              .sort(compareApCode)
                              .map(wp => {
                                const apDisplay = wp.ap_code
                                  ? wp.ap_code.replace(/^AP/i, '')
                                  : `${wp.ap_number}${wp.ap_sub_number ? `.${wp.ap_sub_number}` : ''}`;
                                return (
                                  <option key={wp.id} value={wp.id}>
                                    {apDisplay}
                                  </option>
                                );
                              })}
                          </optgroup>
                        )}
                      </select>
                    </td>
                    <td className="border p-1 text-[10px] leading-tight print-ap-name">
                      <div className="line-clamp-2 print-no-clamp" title={selectedWP?.name}>
                        {selectedWP?.name || ''}
                      </div>
                    </td>
                    {isDurchfuehrbarkeitsstudie && (
                      <td className="border p-1 text-center">
                        {selectedWP ? (
                          isTechnicalAP(selectedWP) ? (
                            <span className="text-black font-bold text-xs">T</span>
                          ) : (
                            <span className="text-black font-bold text-xs">NT</span>
                          )
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    )}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const weekend = isWeekend(selectedYear, selectedMonth, day);
                      const holiday = isHoliday(selectedYear, selectedMonth, day);
                      const entry = row.entries[day];
                      const isAbsence = entry?.value && isAbsenceCode(entry.value);
                      // A-021: Sperren + Cross-Projekt
                      const isBlocked = blockedDays.has(day);
                      const isKA = isKurzarbeitDay(day);  // v7.4.6-31
                      // A-034 Etappe 2c: projektuebergreifende Abwesenheit an dem Tag
                      const dayAbsence = getAbsenceCodeForDay(day);
                      const otherHrs = otherProjectHours[day] || 0;
                      const cellTitle = isKA
                        ? 'Kurzarbeit (Rechtsklick zum Entfernen)'
                        : isBlocked
                        ? (blockedDayReasons[day] || 'Gesperrt')
                        : dayAbsence
                        ? `${absenceLabel(dayAbsence)} -- an einem Abwesenheitstag ist keine Arbeitsbuchung moeglich`
                        : otherHrs > 0
                          ? `${otherHrs.toFixed(1)} h in anderen Projekten`
                          : undefined;

                      return (
                        <td
                          key={day}
                          className={`border p-0 text-center ${
                            weekend ? 'bg-gray-200' : holiday ? 'bg-orange-100' : isBlocked ? 'bg-red-100' : isKA ? 'bg-amber-100 print:bg-white' : ''
                          }`}
                          title={cellTitle}
                          onContextMenu={(e) => handleContextMenu(e, rowIndex, day)}
                        >
                          <input
                            type="text"
                            data-row={rowIndex}
                            data-day={day}
                            data-type="ap"
                            value={entry?.value || ''}
                            onChange={(e) => handleCellChange(rowIndex, day, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, day, 'ap')}
                            onFocus={handleCellFocus}
                            disabled={weekend || !!holiday || !row.workPackageId || isBlocked || isKA || !!dayAbsence}
                            maxLength={4}
                            className={`w-full h-8 text-center text-xs border-0 ${
                              weekend || !!holiday ? 'bg-transparent cursor-not-allowed' :
                              isBlocked ? 'bg-red-100 cursor-not-allowed' :
                              isKA ? 'bg-amber-100 cursor-not-allowed pointer-events-none print:bg-transparent' :
                              dayAbsence ? 'bg-blue-50 cursor-not-allowed text-blue-400 print:bg-transparent' :
                              !row.workPackageId ? 'bg-gray-50 cursor-not-allowed' :
                              isAbsence ? 'bg-blue-100 font-bold text-black' : 'bg-white'
                            } focus:ring-1 ${colors.ring} print:bg-transparent`}
                            style={{ minWidth: '24px' }}
                          />
                        </td>
                      );
                    })}
                    <td className="border p-1 text-center font-semibold">
                      {calculateRowSum(row) > 0 ? calculateRowSum(row).toFixed(2) : '0,00'}
                    </td>
                    {/* NEU v7.4.3: offen-Spalte | v7.4.6-29: blaue AP-Restzahl bei nicht zugeordneten MA */}
                    <td className="border p-1 text-center text-xs print:hidden" style={{ backgroundColor: '#F1F8E9' }}>
                      {(() => {
                        const wpId = row.workPackageId;
                        if (!wpId) return <span className="text-gray-300">-</span>;
                        const istZugeordnet = plannedHoursPerWP[wpId] !== undefined;
                        if (istZugeordnet) {
                          const remaining = calculateRemainingHours(wpId);
                          if (remaining === null) return <span className="text-gray-300">-</span>;
                          // v7.4.6-61: offene MA-Stunden gruen, ueberbuchte rot
                          if (remaining > 0) return <span className="text-green-600 font-semibold">{remaining}</span>;
                          if (remaining < 0) return <span className="text-red-600 font-bold">{remaining}</span>;
                          return <span className="text-gray-500">0</span>;
                        }
                        // v7.4.6-29: MA nicht dem AP zugeordnet -> projektweite offene
                        // AP-Stunden in Blau (Variante A: nur freie Stunden, kein Alarm).
                        const wpOpen = calculateWPOpenHours(wpId);
                        if (wpOpen !== null && wpOpen > 0) {
                          return (
                            <span className="text-blue-600 font-semibold" title="Projektweit noch offene Stunden dieses Arbeitspakets (MA nicht zugeordnet)">
                              {wpOpen}
                            </span>
                          );
                        }
                        return <span className="text-gray-400">0</span>;
                      })()}
                    </td>
                  </tr>
                );
              })}

              {/* Button zum Hinzufuegen */}
              {allRowsFilled && availableWorkPackages.length > apRows.length && (
                <tr className="print:hidden">
                  <td colSpan={(isDurchfuehrbarkeitsstudie ? 4 : 3) + daysInMonth + 2} className="border p-1 text-center">
                    <button
                      onClick={addApRow}
                      className={`text-xs ${colors.text} hover:underline`}
                    >
                      + Weitere AP-Zeile hinzufuegen
                    </button>
                  </td>
                </tr>
              )}

              {/* Summe foerderbare Stunden */}
              {isDurchfuehrbarkeitsstudie ? (
                <>
                  {/* Summe technische APs */}
                  <tr className="font-semibold">
                    <td className="border p-1 text-[10px]" colSpan={4}>Summe foerderbare Stunden (T)</td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const daySum = calculateTechnicalDaySum(day, true);
                      return (
                        <td key={day} className="border p-1 text-center text-[10px]">
                          {daySum > 0 ? daySum.toFixed(2) : ''}
                        </td>
                      );
                    })}
                    <td className="border p-1 text-center">
                      {calculateTechnicalTotal(true).toFixed(2)}
                    </td>
                    <td className="border p-1 bg-green-50 print:hidden"></td>
                  </tr>
                  {/* Summe nicht-technische APs */}
                  <tr className="font-semibold">
                    <td className="border p-1 text-[10px]" colSpan={4}>Summe foerderbare Stunden (NT)</td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const daySum = calculateTechnicalDaySum(day, false);
                      return (
                        <td key={day} className="border p-1 text-center text-[10px]">
                          {daySum > 0 ? daySum.toFixed(2) : ''}
                        </td>
                      );
                    })}
                    <td className="border p-1 text-center">
                      {calculateTechnicalTotal(false).toFixed(2)}
                    </td>
                    <td className="border p-1 bg-blue-50 print:hidden"></td>
                  </tr>
                  {/* Gesamtsumme */}
                  <tr className="font-bold">
                    <td className="border p-1" colSpan={4}>Summe foerderbare Stunden gesamt (2)</td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const daySum = calculateDaySum(day);
                      const otherHrs = otherProjectHours[day] || 0;
                      const tagZuViel = Math.round((daySum + otherHrs) * 100) > Math.round(TAGESGRENZE_HART * 100);
                      return (
                        <td key={day} className={`border p-1 text-center text-[10px] ${tagZuViel ? 'bg-red-400 text-white font-bold' : ''}`}
                          title={otherHrs > 0 ? `+${otherHrs.toFixed(1)} h andere Projekte` : undefined}
                        >
                          {daySum > 0 ? daySum.toFixed(2) : ''}
                        </td>
                      );
                    })}
                    <td className={`border p-1 text-center ${monatUeberschritten ? 'bg-red-500 text-white' : gfUeberschritten ? 'bg-red-500 text-white print:bg-green-300 print:text-black' : ''}`}>
                      {calculateTotalBillable().toFixed(2)}
                    </td>
                    <td className="border p-1 bg-green-100 print:hidden"></td>
                  </tr>
                </>
              ) : (
                <tr className="font-semibold">
                  <td className="border p-1" colSpan={3}>Summe der foerderbaren Stunden (2)</td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const daySum = calculateDaySum(day);
                    const otherHrs = otherProjectHours[day] || 0;
                    const tagZuViel = Math.round((daySum + otherHrs) * 100) > Math.round(TAGESGRENZE_HART * 100);
                    const crossTitle = otherHrs > 0 ? `Dieses Projekt: ${daySum.toFixed(1)} h\nAndere Projekte: ${otherHrs.toFixed(1)} h\nGesamt: ${(daySum + otherHrs).toFixed(1)} h` : undefined;
                    return (
                      <td key={day} className={`border p-1 text-center text-[10px] ${tagZuViel ? 'bg-red-400 text-white font-bold' : ''}`} title={crossTitle}>
                        {daySum > 0 ? daySum.toFixed(2) : '0,00'}
                      </td>
                    );
                  })}
                  <td className={`border p-1 text-center ${monatUeberschritten ? 'bg-red-500 text-white' : gfUeberschritten ? 'bg-red-500 text-white print:bg-green-200 print:text-black' : ''}`}>
                    {calculateTotalBillable().toFixed(2)}
                  </td>
                  <td className="border p-1 bg-green-50 print:hidden"></td>
                </tr>
              )}

              {/* Abschnitt 2: Nicht zuschussfaehig */}
              <tr>
                <td className="border p-1 font-semibold" colSpan={(isDurchfuehrbarkeitsstudie ? 4 : 3) + daysInMonth + 2}>
                  2. Nicht zuschussfaehige Arbeiten
                </td>
              </tr>
              <tr>
                <td className="border p-1" colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3}>sonstige Arbeiten</td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const weekend = isWeekend(selectedYear, selectedMonth, day);
                  const holiday = isHoliday(selectedYear, selectedMonth, day);
                  const entry = nonBillableEntries[day];
                  const isBlocked = blockedDays.has(day);  // A-021
                  const isKA = isKurzarbeitDay(day);  // v7.4.6-31
                  // A-034 Etappe 2c: projektuebergreifende Abwesenheit an dem Tag
                  const dayAbsence = getAbsenceCodeForDay(day);

                  return (
                    <td key={day} className={`border p-0 text-center ${holiday ? 'bg-orange-100' : isBlocked ? 'bg-red-100' : isKA ? 'bg-amber-100 print:bg-white' : weekend ? 'bg-gray-200' : 'bg-white'}`}
                      title={isKA ? 'Kurzarbeit' : isBlocked ? (blockedDayReasons[day] || 'Gesperrt') : dayAbsence ? `${absenceLabel(dayAbsence)} -- an einem Abwesenheitstag ist keine Arbeitsbuchung moeglich` : weekend ? 'Wochenende -- nur fuer nicht foerderbare Zeiten (z. B. Dienstreise)' : undefined}
                    >
                      <input
                        type="text"
                        data-row="0"
                        data-day={day}
                        data-type="nonbillable"
                        value={entry?.value || ''}
                        onChange={(e) => handleNonBillableChange(day, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, 0, day, 'nonbillable')}
                        onFocus={handleCellFocus}
                        disabled={!!holiday || isBlocked || isKA || !!dayAbsence}
                        maxLength={4}
                        className={`w-full h-6 text-center text-xs border-0 ${
                          !!holiday ? 'bg-transparent cursor-not-allowed' :
                          isBlocked ? 'bg-red-100 cursor-not-allowed' :
                          isKA ? 'bg-amber-100 cursor-not-allowed pointer-events-none print:bg-transparent' :
                          dayAbsence ? 'bg-blue-50 cursor-not-allowed text-blue-400 print:bg-transparent' :
                          weekend ? 'bg-transparent' : 'bg-white'
                        } focus:ring-1 focus:ring-yellow-500 print:bg-transparent`}
                      />
                    </td>
                  );
                })}
                <td className="border p-1 text-center font-semibold">
                  {calculateNonBillableSum().toFixed(2)}
                </td>
                <td className="border p-1 bg-yellow-50 print:hidden"></td>
              </tr>

              {/* Abschnitt 3: Fehlzeiten */}
              <tr>
                <td className="border p-1 font-semibold" colSpan={(isDurchfuehrbarkeitsstudie ? 4 : 3) + daysInMonth + 2}>
                  3. Fehlzeiten
                </td>
              </tr>
              {/* Urlaub - editierbar */}
              <tr>
                <td className="border p-1 text-[10px]" colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3}>Urlaub (nur bezahlter Urlaub)</td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const weekend = isWeekend(selectedYear, selectedMonth, day);
                  const holiday = isHoliday(selectedYear, selectedMonth, day);
                  const entry = absenceHoursInput.U[day];
                  const isKA = isKurzarbeitDay(day);  // v7.4.6-31
                  return (
                    <td key={day} className={`border p-0 text-center text-[10px] ${weekend ? 'bg-gray-100' : holiday ? 'bg-orange-100' : isKA ? 'bg-amber-100 print:bg-white' : 'bg-white'}`}>
                      {/* v7.4.6-48 A-036: an Feiertagen kein U-Eingabefeld */}
                      {!weekend && !isKA && !holiday && (
                        <input
                          type="text" inputMode="decimal"
                          value={entry?.value || ''}
                          data-row="0" data-day={day} data-type="absence-U"
                          onChange={e => {
                            const val = e.target.value;
                            setAbsenceHoursInput(prev => ({
                              ...prev,
                              U: { ...prev.U, [day]: { id: prev.U[day]?.id || '', value: val } }
                            }));
                            setHasChanges(true);
                          }}
                          onKeyDown={e => handleKeyDown(e, 0, day, 'absence-U')}
                          onFocus={handleCellFocus}
                          className="w-full h-6 text-center text-xs border-0 bg-transparent focus:ring-1 focus:ring-blue-400 print:bg-transparent"
                          maxLength={4}
                          placeholder=""
                        />
                      )}
                    </td>
                  );
                })}
                <td className="border p-1 text-center font-semibold">
                  {absenceSums.U > 0 ? absenceSums.U.toFixed(2) : '0,00'}
                </td>
                <td className="border p-1 bg-blue-50 print:hidden"></td>
              </tr>
              {/* Krankheit - editierbar */}
              <tr>
                <td className="border p-1 text-[10px]" colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3}>Krankheit (nur bei Lohn- und Gehaltsfortzahlung)</td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const weekend = isWeekend(selectedYear, selectedMonth, day);
                  const holiday = isHoliday(selectedYear, selectedMonth, day);  // v7.4.6-48 A-036
                  const entry = absenceHoursInput.K[day];
                  const isKA = isKurzarbeitDay(day);  // v7.4.6-31
                  return (
                    <td key={day} className={`border p-0 text-center text-[10px] ${weekend ? 'bg-gray-100' : holiday ? 'bg-orange-100' : isKA ? 'bg-amber-100 print:bg-white' : 'bg-white'}`}>
                      {/* v7.4.6-48 A-036: an Feiertagen kein K-Eingabefeld */}
                      {!weekend && !isKA && !holiday && (
                        <input
                          type="text" inputMode="decimal"
                          value={entry?.value || ''}
                          data-row="0" data-day={day} data-type="absence-K"
                          onChange={e => {
                            const val = e.target.value;
                            setAbsenceHoursInput(prev => ({
                              ...prev,
                              K: { ...prev.K, [day]: { id: prev.K[day]?.id || '', value: val } }
                            }));
                            setHasChanges(true);
                          }}
                          onKeyDown={e => handleKeyDown(e, 0, day, 'absence-K')}
                          onFocus={handleCellFocus}
                          className="w-full h-6 text-center text-xs border-0 bg-transparent focus:ring-1 focus:ring-red-400 print:bg-transparent"
                          maxLength={4}
                          placeholder=""
                        />
                      )}
                    </td>
                  );
                })}
                <td className="border p-1 text-center font-semibold">
                  {absenceSums.K > 0 ? absenceSums.K.toFixed(2) : '0,00'}
                </td>
                <td className="border p-1 bg-red-50 print:hidden"></td>
              </tr>
              {/* Sonstige bezahlte Ausfallzeiten - editierbar */}
              <tr>
                <td className="border p-1 text-[10px]" colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3}>Sonstige bezahlte Ausfallzeiten (z. B. Feiertage)</td>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const weekend = isWeekend(selectedYear, selectedMonth, day);
                  const holiday = isHoliday(selectedYear, selectedMonth, day);
                  const entry = absenceHoursInput.S[day];
                  const isKA = isKurzarbeitDay(day);  // v7.4.6-31
                  return (
                    <td key={day} className={`border p-0 text-center text-[10px] ${weekend ? 'bg-gray-100' : holiday ? 'bg-orange-100' : isKA ? 'bg-amber-100 print:bg-white' : 'bg-white'}`}>
                      {!weekend && !isKA && (
                        <input
                          type="text" inputMode="decimal"
                          value={entry?.value || ''}
                          data-row="0" data-day={day} data-type="absence-S"
                          onChange={e => {
                            const val = e.target.value;
                            setAbsenceHoursInput(prev => ({
                              ...prev,
                              S: { ...prev.S, [day]: { id: prev.S[day]?.id || '', value: val } }
                            }));
                            setHasChanges(true);
                          }}
                          onKeyDown={e => handleKeyDown(e, 0, day, 'absence-S')}
                          onFocus={handleCellFocus}
                          disabled={!!holiday}
                          className={`w-full h-6 text-center text-xs border-0 focus:ring-1 focus:ring-purple-400 print:bg-transparent ${holiday ? 'bg-transparent text-gray-600 cursor-not-allowed' : 'bg-transparent'}`}
                          maxLength={4}
                          placeholder=""
                        />
                      )}
                    </td>
                  );
                })}
                <td className="border p-1 text-center font-semibold">
                  {absenceSums.S > 0 ? absenceSums.S.toFixed(2) : '0,00'}
                </td>
                <td className="border p-1 bg-purple-50 print:hidden"></td>
              </tr>
              {/* v7.4.6-31: Kurzarbeit -- nur wenn vorhanden. Rein informativ, keine Stunden. */}
              {Object.keys(kurzarbeitInput).length > 0 && (
                <tr>
                  <td className="border p-1 text-[10px]" colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3}>Kurzarbeit (informativ, keine Stunden)</td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const weekend = isWeekend(selectedYear, selectedMonth, day);
                    const isKA = isKurzarbeitDay(day);
                    return (
                      <td key={day} className={`border p-1 text-center text-[10px] font-semibold ${weekend ? 'bg-gray-100' : isKA ? 'bg-amber-100 text-amber-800' : 'bg-white'}`}>
                        {!weekend && isKA ? 'KA' : ''}
                      </td>
                    );
                  })}
                  <td className="border p-1 text-center font-semibold">
                    {Object.keys(kurzarbeitInput).length} Tg.
                  </td>
                  <td className="border p-1 bg-amber-50 print:hidden"></td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Hinweistexte */}
          <div className="px-2 py-1 print:px-1 print:py-0.5 text-[7px] print:text-[5px] text-black border-x border-b">
            <p>
              <strong>(1)</strong> Die geleisteten Projektbearbeitungsstunden sind fuer den gesamten Bewilligungszeitraum <strong>eigenhaendig und zeitnah</strong>, d. h. mindestens innerhalb einer Woche zu erfassen. Die Angaben sind subventionserheblich im Sinne des Paragraph 264 Strafgesetzbuch.
            </p>
            <p>
              <strong>(2)</strong> Foerderbar pro Monat sind die tatsaechlich fuer das Projekt geleisteten Stunden, jedoch nicht mehr als arbeitsvertraglich, betrieblich oder tariflich vereinbart, <strong>maximal in Hoehe von 52 (Wochen) / 12 (Monate) x Wochenarbeitszeit. Ueberstunden sind nicht foerderbar.</strong>
            </p>
          </div>

          {/* Unterschriften */}
          <div className="border-x border-b flex">
            <div className="flex-1 p-3 print:p-2 border-r border-gray-400">
              <div className="text-[11px] print:text-[9px] text-black mb-8 print:mb-6">Datum / Unterschrift des Mitarbeiters</div>
              <input
                type="text"
                value={signatureDate}
                onChange={(e) => setSignatureDate(e.target.value)}
                className={`text-sm print:text-xs border-b border-gray-300 print:border-gray-400 bg-transparent w-28 focus:outline-none ${colors.ring.replace('focus:ring', 'focus:border').replace('-500', '-600')}`}
              />
            </div>
            <div className="flex-1 p-3 print:p-2">
              <div className="text-[11px] print:text-[9px] text-black mb-8 print:mb-6">Datum / Unterschrift Geschaeftsfuehrer bzw. FuE-Verantwortlicher</div>
              <input
                type="text"
                value={signatureDate}
                onChange={(e) => setSignatureDate(e.target.value)}
                className={`text-sm print:text-xs border-b border-gray-300 print:border-gray-400 bg-transparent w-28 focus:outline-none ${colors.ring.replace('focus:ring', 'focus:border').replace('-500', '-600')}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-4 print:hidden">
        <div className="max-w-full mx-auto px-4 py-3">
          <p className="text-center text-xs text-gray-500">
            PZE v7.4.3 | {portal === 'berater' ? 'Berater-Portal' : 'Firmen-Portal'} | {company.name}
          </p>
        </div>
      </footer>

      {/* NEU v7.4.3-22: Notiz-Modal (ueberarbeitet) */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg mx-4 w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Interne Notiz
              </h3>
              <button onClick={() => setShowNoteModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-sm text-gray-500 mb-3">
              {selectedEmployee?.display_name} | {selectedProject?.short_name || selectedProject?.name} | {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </div>

            {/* Ersteller-Info */}
            {noteId && noteCreatedBy && (
              <div className="text-xs text-gray-400 mb-2">
                Erstellt von {noteCreatedBy}
                {noteCreatedAt && ` am ${new Date(noteCreatedAt).toLocaleDateString('de-DE')}`}
              </div>
            )}

            <textarea
              value={noteEditing}
              onChange={(e) => setNoteEditing(e.target.value)}
              placeholder="Rueckfrage oder Anmerkung eingeben..."
              rows={6}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
            />

            {/* Erledigt-Checkbox (nur wenn Notiz existiert) */}
            {noteId && (
              <div className="mt-3 border-t pt-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noteStatus === 'erledigt'}
                    onChange={handleToggleNoteStatus}
                    disabled={noteSaving}
                    className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className={`text-sm font-medium ${noteStatus === 'erledigt' ? 'text-green-700' : 'text-gray-600'}`}>
                    Erledigt
                  </span>
                </label>
                {noteStatus === 'erledigt' && noteResolvedBy && (
                  <div className="text-xs text-green-600 mt-1 ml-7">
                    Erledigt von {noteResolvedBy}
                    {noteResolvedAt && ` am ${new Date(noteResolvedAt).toLocaleDateString('de-DE')}`}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveNote}
                disabled={noteSaving || noteEditing.trim() === ''}
                className={`px-4 py-2 rounded-lg text-sm ${
                  noteEditing.trim() === ''
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {noteSaving ? '...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A-003: AP-Quick-View Modal */}
      {showAPModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl mx-4 w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Arbeitspakete {selectedProject?.short_name || selectedProject?.name || ''}
              </h3>
              <button onClick={() => setShowAPModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {availableWorkPackages.length === 0 ? (
              <p className="text-gray-500 text-sm">Keine Arbeitspakete vorhanden.</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="border px-2 py-1.5 font-medium text-gray-700">AP</th>
                    <th className="border px-2 py-1.5 font-medium text-gray-700">Bezeichnung</th>
                    <th className="border px-2 py-1.5 font-medium text-gray-700 text-center">Laufzeit</th>
                    <th className="border px-2 py-1.5 font-medium text-gray-700 text-right">PM</th>
                  </tr>
                </thead>
                <tbody>
                  {availableWorkPackages
                    .sort((a, b) => (a.ap_code || '').localeCompare(b.ap_code || ''))
                    .map(wp => (
                      <tr key={wp.id} className="hover:bg-gray-50">
                        <td className="border px-2 py-1.5 whitespace-nowrap font-mono text-xs">{wp.ap_code || `AP ${wp.ap_number}`}</td>
                        <td className="border px-2 py-1.5">{wp.name}</td>
                        <td className="border px-2 py-1.5 text-center whitespace-nowrap text-xs">
                          {wp.start_date && wp.end_date
                            ? `${new Date(wp.start_date).toLocaleDateString('de-DE')} \u2013 ${new Date(wp.end_date).toLocaleDateString('de-DE')}`
                            : wp.start_date
                              ? `ab ${new Date(wp.start_date).toLocaleDateString('de-DE')}`
                              : '\u2013'}
                        </td>
                        <td className="border px-2 py-1.5 text-right whitespace-nowrap">
                          {wp.total_person_months != null ? wp.total_person_months.toFixed(1) : '\u2013'}
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="border px-2 py-1.5" colSpan={3}>Gesamt</td>
                    <td className="border px-2 py-1.5 text-right">
                      {availableWorkPackages
                        .reduce((sum, wp) => sum + (wp.total_person_months || 0), 0)
                        .toFixed(1)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowAPModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
              >
                {'Schlie\u00dfen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* v7.4.6-30: Meine Arbeitspakete (dem aktuellen MA zugeordnete APs) */}
      {showMyAPModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl mx-4 w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Zugeordnete Arbeitspakete{selectedEmployee ? ` \u2013 ${selectedEmployee.display_name}` : ''}
              </h3>
              <button onClick={() => setShowMyAPModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {(() => {
              const myAPs = safeWorkPackages
                .filter(wp => assignedWPIds.includes(wp.id))
                .sort(compareApCode);
              const fmtMon = (d: string | null): string => {
                if (!d) return '?';
                const p = d.split('-');
                return p.length >= 2 ? `${p[1]}.${p[0]}` : d;
              };
              if (myAPs.length === 0) {
                return (
                  <p className="text-gray-500 text-sm">
                    Diesem Mitarbeiter sind im Arbeitsplan keine Arbeitspakete zugeordnet.
                  </p>
                );
              }
              return (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="border px-2 py-1.5 font-medium text-gray-700">AP</th>
                      <th className="border px-2 py-1.5 font-medium text-gray-700">Bezeichnung</th>
                      <th className="border px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">Zeitraum (geplant)</th>
                      {isDurchfuehrbarkeitsstudie && (
                        <th className="border px-2 py-1.5 font-medium text-gray-700 text-center">T/NT</th>
                      )}
                      <th className="border px-2 py-1.5 font-medium text-gray-700 text-right">geplant (h)</th>
                      <th className="border px-2 py-1.5 font-medium text-gray-700 text-right">offen (h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myAPs.map(wp => {
                      const apDisplay = wp.ap_code
                        ? wp.ap_code.replace(/^AP\s*/i, '')
                        : `${wp.ap_number}${wp.ap_sub_number ? `.${wp.ap_sub_number}` : ''}`;
                      const planned = plannedHoursPerWP[wp.id];
                      const remaining = calculateRemainingHours(wp.id);
                      return (
                        <tr key={wp.id} className="hover:bg-gray-50">
                          <td className="border px-2 py-1.5 whitespace-nowrap font-mono text-xs">{apDisplay}</td>
                          <td className="border px-2 py-1.5">{wp.name}</td>
                          <td className="border px-2 py-1.5 whitespace-nowrap text-xs text-gray-600">
                            {(wp.start_date || wp.end_date) ? `${fmtMon(wp.start_date)} \u2013 ${fmtMon(wp.end_date)}` : '\u2014'}
                          </td>
                          {isDurchfuehrbarkeitsstudie && (
                            <td className="border px-2 py-1.5 text-center">
                              {isTechnicalAP(wp)
                                ? <span className="text-green-700 font-bold text-xs">T</span>
                                : <span className="text-blue-700 font-bold text-xs">NT</span>}
                            </td>
                          )}
                          <td className="border px-2 py-1.5 text-right whitespace-nowrap">
                            {planned != null ? Math.round(planned) : '\u2013'}
                          </td>
                          <td className="border px-2 py-1.5 text-right whitespace-nowrap">
                            {remaining == null
                              ? '\u2013'
                              : <span className={remaining > 0 ? 'text-green-700 font-semibold' : remaining < 0 ? 'text-red-600 font-bold' : 'text-gray-500'}>{remaining}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}

            <p className="text-xs text-gray-400 mt-3">
              Quelle: Arbeitsplan-Zuordnung. &quot;offen&quot; = geplante minus bereits gebuchte Stunden dieses Mitarbeiters.
            </p>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowMyAPModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
              >
                {'Schlie\u00dfen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* v7.4.6-50: Alle AP - projektweiter AP-Status (Soll / gebucht / offen) */}
      {showAllAPModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-[96vw] mx-4 w-fit max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                AP-Status {selectedProject?.short_name || selectedProject?.name || ''}
              </h3>
              <button onClick={() => setShowAllAPModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {(() => {
              const realAPs = availableWorkPackages
                .filter(wp => wp.total_person_months != null && wp.total_person_months > 0)
                .sort(compareApCode);
              if (realAPs.length === 0) {
                return (
                  <p className="text-gray-500 text-sm">Keine Arbeitspakete mit geplanten Stunden vorhanden.</p>
                );
              }
              let sumPlanned = 0;
              let sumBooked = 0;
              const fmtMon = (d: string | null): string => {
                if (!d) return '?';
                const p = d.split('-');
                return p.length >= 2 ? `${p[1]}.${p[0]}` : d;
              };
              // v7.4.6-66: MA-Spalten (ganzes Projekt-Team). Alle Werte in STUNDEN.
              // v7.4.6-71: Reihenfolge je Gruppe = "gesamt" zuerst, dann MA-Spalten.
              //   Jede Gruppe (geplant/gebucht/offen) mit dickem Rahmen (border-gray-500).
              const team = allApTeam;
              const lastMa = team.length - 1;
              const numCell = 'border px-1 py-1.5 text-center whitespace-nowrap';
              const totBase = 'border px-1 py-1.5 text-center whitespace-nowrap bg-gray-50 font-semibold';
              // Rahmen-Kanten der Gruppe (dick, gut sichtbar)
              const grpL = 'border-l-4 border-gray-500';                 // linke Kante (auf "gesamt")
              const grpR = 'border-r-4 border-gray-500';                 // rechte Kante (auf letzter MA)
              const grpB = 'border-b-4 border-gray-500';                 // untere Kante (Fusszeile)
              const grpTLR = 'border-t-4 border-l-4 border-r-4 border-gray-500'; // Kopf oben+seiten
              // "gesamt"-Zelle einer Gruppe: linke Kante, falls kein MA folgt auch rechte Kante
              const totHead = `border px-1 py-1 font-semibold text-gray-700 text-center bg-gray-100 ${grpL} ${team.length === 0 ? grpR : ''}`;
              const maHead = (i: number) => `border px-1 py-1 font-medium text-gray-600 align-bottom ${i === lastMa ? grpR : ''}`;
              const maNameDiv = 'max-w-[4.5rem] break-normal leading-tight text-center mx-auto';
              const offenColor = (v: number) => v > 0 ? 'text-amber-600 font-bold' : v < 0 ? 'text-red-600 font-bold' : 'text-gray-400';
              const r2 = (v: number) => Math.round(v * 100) / 100;
              // Spaltensummen je MA (fuer die Fusszeile)
              const colPlanned: Record<string, number> = {};
              const colBooked: Record<string, number> = {};
              team.forEach(e => {
                colPlanned[e.id] = realAPs.reduce((a, wp) => a + ((plannedHoursPerWpPerMa[wp.id] || {})[e.id] || 0), 0);
                colBooked[e.id] = realAPs.reduce((a, wp) => a + ((projectBookedPerWpPerMa[wp.id] || {})[e.id] || 0), 0);
              });
              return (
                <div className="overflow-x-auto">
                <table className="text-xs border-collapse w-auto">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th rowSpan={2} className="border px-2 py-1.5 font-medium text-gray-700 align-bottom">AP</th>
                      <th rowSpan={2} className="border px-2 py-1.5 font-medium text-gray-700 align-bottom w-[11rem]">Bezeichnung</th>
                      <th rowSpan={2} className="border px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap align-bottom">Zeitraum (geplant)</th>
                      {isDurchfuehrbarkeitsstudie && (
                        <th rowSpan={2} className="border px-2 py-1.5 font-medium text-gray-700 text-center align-bottom">T/NT</th>
                      )}
                      <th colSpan={team.length + 1} className={`px-1 py-1.5 font-medium text-gray-700 text-center ${grpTLR}`}>geplant (h)</th>
                      <th colSpan={team.length + 1} className={`px-1 py-1.5 font-medium text-gray-700 text-center ${grpTLR}`}>gebucht (h)</th>
                      <th colSpan={team.length + 1} className={`px-1 py-1.5 font-medium text-gray-700 text-center ${grpTLR}`}>offen (h)</th>
                    </tr>
                    <tr className="bg-gray-50 text-center">
                      {/* geplant: gesamt zuerst, dann MA */}
                      <th className={totHead}>gesamt</th>
                      {team.map((e, i) => (
                        <th key={`hp-${e.id}`} className={maHead(i)}><div className={maNameDiv}>{maShortLabel(e)}</div></th>
                      ))}
                      {/* gebucht */}
                      <th className={totHead}>gesamt</th>
                      {team.map((e, i) => (
                        <th key={`hb-${e.id}`} className={maHead(i)}><div className={maNameDiv}>{maShortLabel(e)}</div></th>
                      ))}
                      {/* offen */}
                      <th className={totHead}>gesamt</th>
                      {team.map((e, i) => (
                        <th key={`ho-${e.id}`} className={maHead(i)}><div className={maNameDiv}>{maShortLabel(e)}</div></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {realAPs.map(wp => {
                      const apDisplay = wp.ap_code
                        ? wp.ap_code.replace(/^AP\s*/i, '')
                        : `${wp.ap_number}${wp.ap_sub_number ? `.${wp.ap_sub_number}` : ''}`;
                      const planned = (wp.total_person_months || 0) * hoursPerPM(pmBasisWAZ);
                      const booked = projectBookedPerWP[wp.id] || 0;
                      const offen = planned - booked;
                      const offenR = r2(offen);
                      const pMap = plannedHoursPerWpPerMa[wp.id] || {};
                      const bMap = projectBookedPerWpPerMa[wp.id] || {};
                      sumPlanned += planned;
                      sumBooked += booked;
                      return (
                        <tr key={wp.id} className="hover:bg-gray-50">
                          <td className="border px-2 py-1.5 whitespace-nowrap font-mono text-xs align-top">{apDisplay}</td>
                          <td className="border px-2 py-1.5 align-top w-[11rem] whitespace-normal break-words leading-tight">{wp.name}</td>
                          <td className="border px-2 py-1.5 whitespace-nowrap text-xs text-gray-600 align-top">
                            {(wp.start_date || wp.end_date) ? `${fmtMon(wp.start_date)} \u2013 ${fmtMon(wp.end_date)}` : '\u2014'}
                          </td>
                          {isDurchfuehrbarkeitsstudie && (
                            <td className="border px-2 py-1.5 text-center align-top">
                              {isTechnicalAP(wp)
                                ? <span className="text-green-700 font-bold text-xs">T</span>
                                : <span className="text-blue-700 font-bold text-xs">NT</span>}
                            </td>
                          )}
                          {/* geplant: gesamt zuerst, dann je MA */}
                          <td className={`${totBase} ${grpL} ${team.length === 0 ? grpR : ''}`}>{planned.toFixed(2)}</td>
                          {team.map((e, i) => { const v = pMap[e.id] || 0; return (
                            <td key={`p-${e.id}`} className={`${numCell} ${i === lastMa ? grpR : ''}`}>{v > 0 ? v.toFixed(2) : ''}</td>
                          ); })}
                          {/* gebucht */}
                          <td className={`${totBase} ${grpL} ${team.length === 0 ? grpR : ''}`}>{booked.toFixed(2)}</td>
                          {team.map((e, i) => { const v = bMap[e.id] || 0; return (
                            <td key={`b-${e.id}`} className={`${numCell} ${i === lastMa ? grpR : ''}`}>{v > 0 ? v.toFixed(2) : ''}</td>
                          ); })}
                          {/* offen = geplant(MA) - gebucht(MA) */}
                          <td className={`${totBase} ${grpL} ${team.length === 0 ? grpR : ''}`}>
                            <span className={offenColor(offenR)}>{offenR.toFixed(2)}</span>
                          </td>
                          {team.map((e, i) => {
                            const pv = pMap[e.id] || 0; const bv = bMap[e.id] || 0;
                            const ov = r2(pv - bv);
                            const has = pv > 0 || bv > 0;
                            return (
                              <td key={`o-${e.id}`} className={`${numCell} ${i === lastMa ? grpR : ''}`}>
                                {has ? <span className={offenColor(ov)}>{ov.toFixed(2)}</span> : ''}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold">
                      <td className="border px-2 py-1.5" colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3}>Gesamt</td>
                      {/* geplant */}
                      <td className={`${totBase} ${grpL} ${grpB} ${team.length === 0 ? grpR : ''}`}>{sumPlanned.toFixed(2)}</td>
                      {team.map((e, i) => (
                        <td key={`fp-${e.id}`} className={`${numCell} ${grpB} ${i === lastMa ? grpR : ''}`}>{colPlanned[e.id] > 0 ? colPlanned[e.id].toFixed(2) : ''}</td>
                      ))}
                      {/* gebucht */}
                      <td className={`${totBase} ${grpL} ${grpB} ${team.length === 0 ? grpR : ''}`}>{sumBooked.toFixed(2)}</td>
                      {team.map((e, i) => (
                        <td key={`fb-${e.id}`} className={`${numCell} ${grpB} ${i === lastMa ? grpR : ''}`}>{colBooked[e.id] > 0 ? colBooked[e.id].toFixed(2) : ''}</td>
                      ))}
                      {/* offen */}
                      <td className={`${totBase} ${grpL} ${grpB} ${team.length === 0 ? grpR : ''}`}>
                        {(() => { const g = r2(sumPlanned - sumBooked); return <span className={offenColor(g)}>{g.toFixed(2)}</span>; })()}
                      </td>
                      {team.map((e, i) => {
                        const ov = r2((colPlanned[e.id] || 0) - (colBooked[e.id] || 0));
                        const has = (colPlanned[e.id] || 0) > 0 || (colBooked[e.id] || 0) > 0;
                        return (
                          <td key={`fo-${e.id}`} className={`${numCell} ${grpB} ${i === lastMa ? grpR : ''}`}>
                            {has ? <span className={offenColor(ov)}>{ov.toFixed(2)}</span> : ''}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
                </div>
              );
            })()}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowAllAPModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
              >
                {'Schlie\u00dfen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A-021: NWM-Sperren-Verwaltungs-Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-xl mx-4 w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                NWM-Tagessperren: {selectedProject?.short_name || selectedProject?.name || ''}
              </h3>
              <button onClick={() => { setShowBlockModal(false); setBlockError(null); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {blockError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{blockError}</div>
            )}

            {/* Neue Sperre anlegen */}
            <div className="mb-6 bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-700 mb-3">Neue Sperre anlegen</h4>

              {/* MA-Auswahl */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Mitarbeiter (Mehrfachauswahl):</label>
                <div className="max-h-32 overflow-y-auto border rounded bg-white p-2 space-y-1">
                  {safeEmployees.map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 rounded">
                      <input
                        type="checkbox"
                        checked={blockFormEmployees.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBlockFormEmployees(prev => [...prev, emp.id]);
                          } else {
                            setBlockFormEmployees(prev => prev.filter(id => id !== emp.id));
                          }
                        }}
                        className="rounded"
                      />
                      {emp.display_name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Zeitraum */}
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Von:</label>
                  <input
                    type="date"
                    value={blockFormStart}
                    onChange={(e) => setBlockFormStart(e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Bis:</label>
                  <input
                    type="date"
                    value={blockFormEnd}
                    onChange={(e) => setBlockFormEnd(e.target.value)}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              {/* Grund */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Grund (optional, erscheint im Tooltip):</label>
                <input
                  type="text"
                  value={blockFormReason}
                  onChange={(e) => setBlockFormReason(e.target.value)}
                  placeholder="z.B. Andere Projektarbeiten, Schulung, ..."
                  className="w-full border rounded px-2 py-1.5 text-sm"
                />
              </div>

              <button
                onClick={async () => {
                  await handleCreateBlock(blockFormEmployees, blockFormStart, blockFormEnd, blockFormReason);
                  if (!blockError) {
                    setBlockFormEmployees([]);
                    setBlockFormStart('');
                    setBlockFormEnd('');
                    setBlockFormReason('');
                  }
                }}
                disabled={blockSaving || blockFormEmployees.length === 0 || !blockFormStart || !blockFormEnd}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  blockFormEmployees.length === 0 || !blockFormStart || !blockFormEnd
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {blockSaving ? 'Wird gespeichert...' : 'Sperre anlegen'}
              </button>
            </div>

            {/* Bestehende Sperren */}
            <div>
              <h4 className="font-semibold text-sm text-gray-700 mb-2">
                Bestehende Sperren ({allBlockedPeriods.length})
              </h4>
              {allBlockedPeriods.length === 0 ? (
                <p className="text-gray-500 text-sm">Keine Sperren vorhanden.</p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="border px-2 py-1.5 font-medium text-gray-700">Mitarbeiter</th>
                      <th className="border px-2 py-1.5 font-medium text-gray-700">Von</th>
                      <th className="border px-2 py-1.5 font-medium text-gray-700">Bis</th>
                      <th className="border px-2 py-1.5 font-medium text-gray-700">Grund</th>
                      <th className="border px-2 py-1.5 font-medium text-gray-700 text-center w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBlockedPeriods.map(bp => (
                      <tr key={bp.id} className="hover:bg-gray-50">
                        <td className="border px-2 py-1.5">
                          {safeEmployees.find(e => e.id === bp.employee_id)?.display_name || 'Unbekannt'}
                        </td>
                        <td className="border px-2 py-1.5 whitespace-nowrap">
                          {new Date(bp.start_date + 'T00:00:00').toLocaleDateString('de-DE')}
                        </td>
                        <td className="border px-2 py-1.5 whitespace-nowrap">
                          {new Date(bp.end_date + 'T00:00:00').toLocaleDateString('de-DE')}
                        </td>
                        <td className="border px-2 py-1.5 text-gray-600">{bp.reason || '\u2013'}</td>
                        <td className="border px-2 py-1.5 text-center">
                          <button
                            onClick={() => handleDeleteBlock(bp.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                            title="Sperre loeschen"
                          >
                            Loeschen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => { setShowBlockModal(false); setBlockError(null); }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
              >
                {'Schlie\u00dfen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ungespeicherte Aenderungen</h3>
            <p className="text-gray-600 mb-6">
              Sie haben ungespeicherte Aenderungen. Was moechten Sie tun?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUnsavedDialog(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  const callback = showUnsavedDialog;
                  setShowUnsavedDialog(null);
                  setHasChanges(false);
                  callback();
                }}
                className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
              >
                Verwerfen
              </button>
              <button
                onClick={async () => {
                  const callback = showUnsavedDialog;
                  await handleSave();
                  setShowUnsavedDialog(null);
                  callback();
                }}
                style={{ backgroundColor: colors.primary }}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* v7.4.6-31: Rechtsklick-Kontextmenue (Urlaub/Krankheit/Sonstige/Kurzarbeit) */}
      {ctxMenu && (
        <div className="fixed inset-0 z-50 print:hidden" onClick={closeCtxMenu} onContextMenu={(e) => { e.preventDefault(); closeCtxMenu(); }}>
          <div
            className="absolute bg-white border border-gray-300 rounded-md shadow-lg py-1 text-sm min-w-[200px]"
            style={{ top: ctxMenu.y, left: ctxMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1 text-[11px] text-gray-500 border-b border-gray-100">
              Tag {ctxMenu.day} eintragen als:
            </div>
            <button
              type="button"
              className="block w-full text-left px-3 py-1.5 hover:bg-blue-50"
              onClick={() => applyAbsenceFromMenu(ctxMenu.rowIndex, ctxMenu.day, 'U')}
            >
              Urlaub
            </button>
            <button
              type="button"
              className="block w-full text-left px-3 py-1.5 hover:bg-red-50"
              onClick={() => applyAbsenceFromMenu(ctxMenu.rowIndex, ctxMenu.day, 'K')}
            >
              Krankheit
            </button>
            <button
              type="button"
              className="block w-full text-left px-3 py-1.5 hover:bg-purple-50"
              onClick={() => applyAbsenceFromMenu(ctxMenu.rowIndex, ctxMenu.day, 'S')}
            >
              Sonstige Ausfallzeit (z. B. Feiertag)
            </button>
            <div className="border-t border-gray-100 my-1"></div>
            {isKurzarbeitDay(ctxMenu.day) ? (
              <button
                type="button"
                className="block w-full text-left px-3 py-1.5 hover:bg-amber-50 text-amber-800"
                onClick={() => removeKurzarbeit(ctxMenu.day)}
              >
                Kurzarbeit entfernen
              </button>
            ) : (
              <button
                type="button"
                className="block w-full text-left px-3 py-1.5 hover:bg-amber-50 text-amber-800"
                onClick={() => applyKurzarbeit(ctxMenu.day)}
              >
                Kurzarbeit (keine Stunden)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        /* v7.4.6-36: Explizite Rahmenfarbe fuer das Stundennachweis-Raster.
           Tailwind 4 setzt fuer "border" keine Standard-Grau-Farbe mehr
           (faellt auf currentColor zurueck -> bei leeren Zellen unsichtbar).
           Hier gezielt nur fuer diese Tabelle gesetzt, nicht global. */
        .pze-ts-sheet table td,
        .pze-ts-sheet table th {
          border-color: #d1d5db;
        }
        @media print {
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          .print\\:hidden {
            display: none !important;
          }
          table {
            font-size: 8px !important;
          }
          input {
            font-size: 8px !important;
          }
          /* v7.4.6-20: Select im Druck als statischer Text (kein Pfeil, kein Rahmen) */
          select {
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            appearance: none !important;
            border: none !important;
            background: transparent !important;
            font-size: 8px !important;
          }
          /* v7.4.6-20: AP-Name im Druck nicht abschneiden */
          .print-ap-name {
            max-width: none !important;
          }
          .print-no-clamp {
            -webkit-line-clamp: unset !important;
            display: block !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
