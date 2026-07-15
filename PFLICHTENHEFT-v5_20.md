# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 5.20
**SW-Release:** V7.7.0
**Datum:** 15. Juli 2026
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben
**Status:** Session 68: **FZul-/MULTIPROJEKT-MODUL END-TO-END FUNKTIONSFAEHIG IN PRODUKTION (V7.7.0).** Aus den in PZE erfassten Foerderprojekten ermittelt das Multiprojekt-Tool je MA die tagesgenau gebuchten Foerderstunden; die Differenz zur Tagesarbeitszeit = die fuer die Forschungszulage verfuegbaren Stunden (Abgrenzung Doppelfoerderung). Das spart den manuellen Abgleich abgerechneter Foerderprojekte je MA/Projekt. **Behoben/neu diese Session:** (1) **CRITICAL day_type-Enum-Filter** (multiprojekt-detail v7.4.8-14): der Import schloss Abwesenheiten mit deutschen Werten aus (urlaub/krank/sonderurlaub/feiertag), die Enum v7_day_type ist aber ENGLISCH (vacation/sick/special_leave/holiday, work, weekend, short_time) -> PostgREST-Enum-Cast-Fehler -> v7_timesheets-Query lieferte null (Fehler nicht abgefangen) -> gefoerdert=0 -> ALLE MA faelschlich in Gruppe B, Kalender zeigte ueberall volle 8h. Kernursache "Import=0". Filter auf englische Enum-Werte korrigiert (2 Stellen: loadVorhaben + handleImport). (2) **ZIM-Erkennung** (v7-types v7.4.9-3, additiv): 'ZIM' und 'ZIM_DS' in Typ-Union, Label-/Short-Maps und V7_PUBLIC_FUNDING_FORMATS ergaenzt - Alt-Projekte mit generischem funding_format 'ZIM' (in PROD der Regelfall, z.B. HEATS) wurden sonst nicht als gefoerdert erkannt. (3) **Multijahr-Kalender** (v7.4.8-15): gefoerderte Stunden werden je ANGEZEIGTEM Jahr live aus v7_timesheets berechnet (statt nur aus gespeicherten FZul-Zeilen des Vorhaben-Jahres) -> Jahres-Navigation zeigt fuer jedes Jahr die freie FZul-Kapazitaet; gefoerdert/verfuegbar damit immer aktuell. (4) **Export-Tab** (v7.4.8-16, Phase 3, pro MA eine Datei): erzeugt je MA die amtliche BSFZ-Excel fuers gewaehlte Jahr ueber die BESTEHENDE /api/export/fzul (v2.3, unveraendert) und laedt sie herunter; uebergeben werden die je Tag in Foerderprojekten gebuchten Stunden, die Vorlage schreibt daraus die max fuer FZul verfuegbaren Stunden je Tag (Tagesarbeitszeit - gebucht); Jahresarbeitszeit/FuE-Anteil/Hoechstgrenze rechnet die Vorlage selbst. Eine zunaechst begonnene API-Erweiterung (v2.4, direkte fue_hours) wurde als ueberfluessig verworfen - das Tool liefert an dieser Stelle bewusst nur die verfuegbare Kapazitaet; das Verteilen auf konkrete FZul-Vorhaben ist eine spaetere, separate Funktion. (5) **Vorhaben-Loeschen-Button** (multiprojekt-page v7.4.8-19): Papierkorb je Vorhaben mit Sicherheitsabfrage, loescht timesheets + vorhaben. **Deploy V7.7.0:** merge v7-dev->main (--no-ff), push origin + cubintec, Vercel-Deploy auf pze.cubintec-hub.com verifiziert; **KEIN Migrations-/Enum-Schritt** (v7_fzul_vorhaben/v7_fzul_timesheets + granulare RLS-Policies - Berater SELECT/INSERT/UPDATE/DELETE + system_admin ALL - existierten bereits in DEV UND PROD). In PROD verifiziert (Gruppe A zieht gefoerderte Stunden, Multijahr-Kalender, Export). **ERKENNTNIS:** Die Enum v7_funding_format divergiert zwischen DEV (ZIM_EINZEL/KOOP/NETZWERK, BMBF_KMU, FZUL, OTHER, ZIM, ZIM_DS) und PROD (ZIM, ZIM_DS, ZIM_KOOP, ZIM_NETZWERK, BMBF, BMBF_DS, EFRE, Horizon, Landesprogramm, FZul, Sonstige); real genutzt werden nur ZIM-Varianten (vom Fix abgedeckt) - Vereinheitlichung Richtung B als eigener Track offen. **OFFEN / NAECHSTES GROSSES THEMA:** Bereich 'Forschungszulage' (Tile fzul) - ausser den Firmen-Kacheln noch nichts umgesetzt; Kachel-Klick fuehrt auf /v7/berater/fzul/firma/<id> -> 404 (Route existiert nicht). Ferner: Enum-Vereinheitlichung DEV/PROD; Multijahr-Feinschliff (Tagesarbeitszeit je Jahr aus Teilzeit-Historie statt Vorhaben-Stichtag); spaeter/separat 'freie FZul-Zeit intelligent auf konkrete FZul-Vorhaben verteilen' (neue Funktion). Offen unveraendert: A-001, A-006, A-034-Restpunkt (RLS-Angleich DEV/PROD). Komponenten dieser Session: v7-types v7.4.9-3, multiprojekt-detail v7.4.8-16 (kumuliert -14/-15/-16), multiprojekt-page v7.4.8-19; api/export/fzul route v2.3 unveraendert.
**Status-Vorgaenger:** Session 67: **PRODUKTIVSETZUNG V7.6.0.** Der in Session 66 gebaute PDF-Antragsimport ist jetzt in PRODUKTION. SQL-Migration v2 auf PROD (cnnuyioklhlrfygwticf) ausgefuehrt (v7_import_projekt_team + v7_cleanup_projekt, create-or-replace), danach Code-Deploy: merge v7-dev->main (--no-ff), push origin + cubintec, Vercel-Deploy auf pze.cubintec-hub.com verifiziert. PDF-Antragsimport ('Projekt neu anlegen aus Antrag') in PROD getestet - laeuft. **ENTSCHEIDUNG: PDF-Import-Tab in Berater- UND Firmen-Portal freigegeben** (revidiert die Session-66-Ueberlegung, ihn im Firmen-Portal auszublenden; Firmen koennen den Import nutzen, in PROD bestaetigt) - keine Code-Aenderung noetig. **ASCII-Nachpflege dreier Seiten** (Rendering unveraendert; Konvention Kommentare->ae/oe/ue, String-Literale->\u-Escapes, JSX-Text->HTML-Entities): berater-multiprojekt-page v7.4.8-18, berater-fzul-page v7.4.9-3, mein-status-page v7.4.4-17. **Housekeeping:** downloads/archiv auf klares Schema code/doku/sql/skripte umgestellt (567 Altdateien einsortiert, ~40 Duplikate entfernt); Projekt-Anweisungen ueberarbeitet (Loeschen/Verschieben bleibt beim Nutzer, Session-Auftakt-Versions-Check, Struktur-Guard in Skripten, praezise ASCII-Regel, alles nach downloads); Claude legt Dateien jetzt direkt in downloads/ ab und liefert je Schritt die Terminal-Befehle mit. **NACHTRAG Session 67 (12.07., reines Housekeeping - kein Code-/DB-Deploy):** Projektwissen (PV) auf ein schlankes Briefing-Paket reduziert - 14 Dateien BEHALTEN (Pflichtenheft, GIT-SICHERUNG 66+67, acht KONZEPTe, PZE-PROJEKT-DOSSIER, VERHALTENSVERTRAG, memory.md), 88 Dateien on-demand nach downloads/ + archiv/ ausgelagert (Log PZE-Bereinigung-PV-Session67.xlsx, vollstaendiges Backup PV-Backup-Session67/). Sicherungsstand verifiziert: von den 88 hatten 16 keine Kopie in downloads/root oder archiv/ - alle 16 per git grep als LIVE in src/ bestaetigt (echte Quelldateien bzw. bei den zwei SQL-Migrationen ueber die Verwendung im Code), kein Datenverlust. Zwei Supabase-Snapshots (Stand 28.03., historisch) nach archiv/sql/, drei ASCII-Altversionen (durch -17/-3/-18 abgeloest) nach archiv/code/ gesichert. Randbefund zu pruefen: moegliche verschachtelte PZE/-Kopie im Repo (WorkPackageEditModal unter src/ UND PZE/src/). Details in GIT-SICHERUNG-v7_6_0-session67-nachtrag.md. OFFEN: Manuals-Nachzug (PDF-Antragsimport in Firma- + Berater-Anleitung); Datenhygiene Loesch-Kaskade verwaiste MA; A-034-Restpunkt (RLS-Angleich DEV/PROD); A-039, A-043; 'Assistenz GL'-Rolle (admin_assistant); Max-foerderbare-Stunden-Chip in TimesheetForm.
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
- Forschungszulage (Paragraph 35a EStG)
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
| v7_zahlungsanforderungen | ZA pro Projekt (za_nummer, zeitraum, status) |
| v7_timesheet_completions | Monatsabschluss (employee_id, project_id, year, month) |
| v7_netzwerk_partner | NWM: Netzwerkpartner (Stammdaten, Quoten, USt-Satz) |
| v7_netzwerk_eigenanteile | NWM: EA-Berechnungs-Snapshots (Zahlungsstatus) |
| v7_timesheet_notes | Interne Rueckfragen pro MA/Projekt/Monat (Status offen/erledigt) |
| v7_nwm_foerderzeitraeume | NWM: Netzwerkjahre pro Projekt (Laufzeit, Foerderquote, Netzwerkjahr-Nr.) |
| v7_nwm_ap_planung | NWM: AP-Planung pro Foerderzeitraum und MA (planned_pm, start/ende) |
| v7_fzul_vorhaben | KPT: FZul-Vorhaben (title, wirtschaftsjahr, status) - NICHT v7_projects! |
| v7_system_config | System-Konfiguration Key/Value (z.B. manuals_enabled) - NEU Session 34 |

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
| FirmendatenCard.tsx | 7.4.6-1 | Firmendaten + Feiertagsregion-Dropdown |
| NWMEigenanteilPanel.tsx | 7.4.5-11 | EA-Berechnung, Archiv, PDF |
| NWMEinstellungenPanel.tsx | 7.4.5-1 | NWM-Settings, Bankdaten, Rechnungskonfig |
| NWMPartnerPanel.tsx | 7.4.5-4 | Netzwerkpartner, Smart-Quoten |
| PortalHeader.tsx | **7.3.95-15** | Cockpit-Sync, portal_role fuer Firmen-Portal; dashboardHref im Berater-App-Modus -> App-Cockpit; A-050 Menuepunkt "Benutzername festlegen/aendern" (Selbstbedienung, /api/v7/set-username) |
| PortalNav.tsx | **7.4.4-24** | App-Modus: Home->Startseite, FZul, aktive Items hervorgehoben; A-025 "Unternehmen"-Tab im App-Modus ausgeblendet |
| AppNav.tsx | **1.0.1** | Neue Navigation fuer App-Struktur, Home nur Icon |
| ProjectTeamManager.tsx | **7.4.4-17** | Team-Verwaltung, ROLE_OPTIONS auf 3 ZA-Werte reduziert |
| SystemConfigPanel.tsx | **7.4.4-2** | Config-Toggles: manuals_enabled + cockpit_berater/firma_enabled |
| TimesheetForm.tsx | **7.4.6-59** | A-021 NWM-Tagessperren + projektuebergreifende 9h-Tagesgrenze (gilt generell), A-002/A-003; A-026 U/K/S in AP-Zelle als Fehlzeit; Doppelsave-Schutz; A-030 Meine-Arbeitspakete-Popup; A-033 MA-Auswahl aufs Projektteam; v7.4.6-43 Soll + Foerder-Monatsgrenze projektbasiert via hoursPerPM(pmBasis) (160,33 bei 37h), physischer projektuebergreifender Monatsdeckel = hoursPerPM(echte weekly_hours)=162,50h; **A-034 (v7.4.6-45/-46/-47): zentrale Abwesenheiten - Laden projektuebergreifend aus v7_employee_absences, Speichern als Sync (MA+Monat) statt v7_timesheets, Konfliktpruefung ein Code/Tag, S an Feiertag bleibt berechnet, harte Cross-Projekt-Abwesenheitssperre (AP+Nicht-foerderbar-Zellen disabled an Abwesenheitstagen)**; v7.4.6-48/-49 A-036 Feiertags-Sperre der Fehlzeit-Zeilen + A-038 Fokus-Weitersprung; -50/-51 Alle-AP-Modal (geplant/gebucht/offen, 2 Dezimalstellen); **v7.4.6-52: A-045 canEdit TYP-ABHAENGIG (Arbeitszeilen ueberspringen Abwesenheits-/Sperrtage inkl. getAbsenceCodeForDay, Fehlzeit-Zeilen U/K/S erreichbar) + A-046 Fehlzeit-Tagesstunden erben Firmenstandard (7,5 statt 8), company in Effekt-Deps**; **v7.4.6-57 (Session 62): Stundennachweis-Optik schwarz/entfaerbt (Abschnitts-Baender + Summenzellen ohne Hintergrundfarbe, Summen weiter fett), DS-Summenlabels einzeilig (T)/(NT), "Urlaub (nur bezahlter Urlaub)", Unterschrifts-Labels groesser, printRef translate="no"+notranslate (Uebersetzungssperre GRAVID->SCHWANGER), PDF-Dateiname-Schema NV_YYMM_FKZ_Stundenerfassung_Vorname_Nachname via document.title-Swap, "sonstige Arbeiten"-Normalzellen bg-white (Rahmen-Konsistenz)**; **v7.4.6-58: Feiertags-Tagesstunden folgen der individuellen MA-WAZ - Feiertag-Auto-Vorbelegung der S-Zeile nutzt employeeDailyHours (weeklyHoursAtMonth/5) statt company.standard_weekly_hours/5, Lade-Effekt haengt jetzt von weeklyHoursAtMonth ab; behebt Teilzeit-Block (38h-MA bekam am Feiertag 8,00 > Tagesgrenze 7,60); v7.4.6-59: PDF-Dateiname final - Leerzeichen statt Unterstrich, ohne "Stundenerfassung": "<NN><VV> <YYMM> <FKZ> <Vorname> <Nachname>", Fallback "<YYMM> <FKZ>"; kein .pdf im document.title (Browser haengt es an)** |
| BerichtePage.tsx | **7.4.6-23** | Dashboard + .limit(10000); A-035 oberer Projekt-Dropdown setzt selectedReportProjectId UND matrixProjectId synchron; v7.4.6-19 pm_basis_weekly_hours in Select + Interface -> an ProjektFortschrittPanel durchgereicht; v7.4.6-20 A-034 Dual-Read der zentralen Abwesenheiten (employeeAbsences); v7.4.6-22 Personalkosten-Export nutzt hoursPerPM(pm_basis) statt 173,33 (Panel weiterhin ausgeblendet); v7.4.6-23 A-044 Matrix-Klick reicht projectId (&projekt=) an die ZE-Seite |
| FirmaCockpit.tsx | **7.4.9-36-3** | Deep-Link ?editMA+?returnTo, Inline MA-Modal; A-020 Firmen-Deaktivierung; Prognose gesamt auf Plan gekappt (5.58); A-031 Schluessel-Icon Login/Passwort dynamisch je user_id; v7.4.9-36-3 pm_basis_weekly_hours in Select + ProjektData -> Kosten/PM projektbasiert via utils |
| ProjektFortschrittPanel.tsx | **7.4.5-25** | Zielerreichungs-Prognose, PDF-Export; Berechnung via projektfortschritt-utils (A-011); v7.4.5-25 pm_basis_weekly_hours im Project-Interface -> an utils durchgereicht (Kosten/PM projektbasiert) |
| StundennachweisMatrix.tsx | **7.4.6-9** | Quelle: projectAssignments (Projektteam); A-029 Sammeldruck-Modus (Auswahl Spalten/Zeilen/Zellen -> StundennachweisSheet-PDF, nur Blaetter im Druck via #snw-print-root); A-032 MA-Zeilen auf aktives Projekt gefiltert (Mehr-Projekt-Firmen); A-035 Selbstheilungs-Guard auf activeProjectId (Fallback projects[0], wenn matrixProjectId nicht im uebergebenen projects-Array liegt); v7.4.6-6 A-034 Dual-Read der zentralen Abwesenheiten im Sammeldruck; v7.4.6-7 A-044 Monatszell-Klick uebergibt activeProjectId an onNavigateToZE (Projekt-Vorauswahl in der ZE-Seite); v7.4.6-8 (Session 62) sprechender Sammeldruck-PDF-Dateiname (1 MA: NV_Zeitraum_FKZ_Stundenerfassung_Vorname_Nachname mit Zeitraum YYMM bzw. YYMM-YYMM; mehrere MA: Stundennachweise_Zeitraum_FKZ) via document.title-Swap vor window.print; v7.4.6-9 PDF-Dateiname final (Leerzeichen, ohne "Stundenerfassung"/Praefix): 1 MA "<NN><VV> <Zeitraum> <FKZ> <Vorname> <Nachname>", mehrere MA "<Zeitraum> <FKZ>" |
| WorkPackageTable.tsx | **7.4.3-13** | Arbeitsplan, PM 3 Dezimalstellen; v7.4.3-13 PM->Stunden projektbasiert (Prop pmBasisWeeklyHours, hoursPerPM), Soll + Legende dynamisch ("1 PM = 160,33 Stunden" bei 37h) |
| ZAPanel.tsx | **7.4.4-56** | ZA speichern oben, Grid 50/50, Status-Automatik; v7.4.4-53 #418-Fix (mounted-Gate gegen Hydration-Mismatch); v7.4.4-56 A-042 Auto-Auswahl letzte/initialZaId-ZA beim Laden, Einreichdatum leer per Default, Archiv-Spalte Zahlungseingang-Betrag rechtsbuendig |
| ProjectDetailPage.tsx | **7.4.4-59** | Projekt-Detail + NWM; returnTo-Navigation; Deep-Link ?tab; v7.4.4-59 NEU Eingabefeld "Wochenarbeitszeit-Basis Antrag/Bescheid (h)" im Bearbeiten-Dialog (pm_basis_weekly_hours), wird an WorkPackageTable durchgereicht |
| ProjectList.tsx | **7.3.88-7** | returnTo Prop fuer /projekt/neu |
| lib/holidays/germanHolidays.ts | 7.4.6-1 | Zentrale Feiertags-Utility |
| lib/projektfortschritt-utils.ts | **7.4.9-4** | Shared Berechnungslogik: Monatsverlauf, Prognose, Szenarien; foerderMaximum=min(bewilligt, Plankosten x Satz) (5.58); v7.4.9-3/-4 NEU hoursPerPM(waz)=waz*52/12, PFProject.pm_basis_weekly_hours + firm_standard_weekly_hours, Soll/PM via hoursPerPM(pmBasis), Kosten-rateScale PRO MA (= weekly_hours/pmBasis) -> Kosten = PM x Monatsgehalt; maxProjektstundenMonat optional projektbasiert; rueckwaertskompatibel (40h-Fallback) |
| StundennachweisSheet.tsx | **1.0.3** | statisches Stundennachweis-Blatt (Anzeige/Druck), Layout 1:1 zum Einzeldruck; im Sammeldruck (A-029) verwendet; v1.0.1 bedingte Kurzarbeit-Zeile (KA, nur wenn vorhanden, rein informativ); **v1.0.3 (Session 62) Layout-Bereinigung analog TimesheetForm: Abschnitts-Baender + Summenzellen ohne Hintergrundfarbe (Summen fett), alle Schriften schwarz, DS-Labels einzeilig (T)/(NT), "Urlaub (nur bezahlter Urlaub)", Unterschrifts-Labels groesser, translate="no"+notranslate, "sonstige Arbeiten"-Zellen bg-white** |
| lib/stundennachweisSheetData.ts | **1.0.0** | NEU: reiner Builder gespeicherte Timesheets -> Stundennachweis-Anzeigemodell (fuer Einzel-/Sammeldruck) |
| lib/employeeAbsences.ts | **1.0.0** | NEU (A-034): laedt zentrale Abwesenheiten aus v7_employee_absences, mappt ueber das Assignment-Fenster auf Projekte, liefert synthetische Timesheet-Zeilen (loadEmployeeAbsencesAsTimesheets) fuer die Lesepfade (Dual-Read) |
| hooks/useBerichteData.ts | **1.0.3** | Berichts-Datenhook; v1.0.2 A-034 Dual-Read der zentralen Abwesenheiten (Merge + Dedup); v1.0.3 A-040 .limit(10000) auf v7_timesheets-Query wiederhergestellt |

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

### 4.3 Wrapper-Seiten

| Pfad | Version | Funktion |
|------|---------|----------|
| src/app/v7/berater/foerderung/page.tsx | **7.4.1-10** | Kundenfirmen + ?openNew Modal + Suspense + modus-bewusster Zurueck-Button (A-015) |
| src/app/v7/berater/admin/page.tsx | **7.3.94-1** | Berater-Admin + SystemConfigPanel |
| src/app/v7/berater/app/cockpit/page.tsx | **1.0.7** | Berater-App-Cockpit (4 Kacheln + Firma-Dropdown); A-014 "Neues Unternehmen"; A-016 voller Name; A-018 refreshed-Listener entfernt; A-023 aufklappbarer "Inaktive Firmen"-Bereich + Reaktivierung |
| src/app/v7/berater/app/firma/[id]/page.tsx | **1.0.1** | Firmen-Cockpit Route (App-Struktur); A-028 PortalHeader-Wrapper ergaenzt (FirmaCockpit rendert Header nicht selbst) |
| src/app/v7/berater/foerderung/firma/[id]/page.tsx | **7.4.4-8** | Firma-Detail: returnTo, openNew, firmaName; "Zurueck"-Label, "Kundenfirmen"->"Unternehmen" |
| src/app/v7/berater/foerderung/firma/[id]/projekt/neu/page.tsx | **1.0.0** | NEU: Projekt-Anlage mit returnTo |
| src/app/v7/berater/multiprojekt/page.tsx | **7.4.8-19** | A-022: Echte Arbeitstage, MA-Deep-Link mit Ruecksprung; v7.4.8-18 ASCII; v7.4.8-19 FZul-Vorhaben-Loeschen-Button (Papierkorb je Vorhaben, Sicherheitsabfrage, loescht timesheets+vorhaben) |
| src/app/v7/berater/multiprojekt/[id]/page.tsx | **7.4.8-16** | FZul-Vorhaben-Detail (Uebersicht/Jahreskalender/Export). v7.4.8-14 CRITICAL day_type-Enum-Fix (englische Werte vacation/sick/special_leave/holiday); v7.4.8-15 Multijahr-Kalender (gefoerdert je Jahr live aus v7_timesheets); v7.4.8-16 Export-Tab pro MA (BSFZ-Excel via /api/export/fzul v2.3, max verfuegbare FZul-Stunden/Tag) |
| src/app/v7/berater/netzwerk/page.tsx | **7.4.5-3** | NWM: Dashboard-Link App-Modus ausgeblendet |
| src/app/v7/firma/zeiterfassung/page.tsx | **7.4.6-4** | ZE-Wrapper Firmen-Portal; v7.4.6-3 pm_basis_weekly_hours im Projekt-Select; v7.4.6-4 A-044 liest ?projekt -> initialProjectId |
| src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx | **7.4.6-4** | ZE-Wrapper Berater-Portal; v7.4.6-3 pm_basis_weekly_hours im Projekt-Select; v7.4.6-4 A-044 liest ?projekt -> initialProjectId |
| src/app/v7/berater/foerderung/firma/[id]/cockpit/fortschritt/page.tsx | **7.4.9-6** | Fortschritt-Wrapper Cockpit; v7.4.9-6 pm_basis_weekly_hours im Projekt-Select -> an ProjektFortschrittPanel |
| src/app/v7/berater/foerderung/firma/[id]/cockpit/stundennachweis/page.tsx | **7.4.9-7** | Matrix-Wrapper Cockpit; A-027 Navigation/returnUrl; A-032 assignment_start/end je MA+Projekt zusammengefuehrt; v7.4.9-7 A-044 handleNavigateToZE reicht projectId (&projekt=) weiter |

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

---

## 7d. AP-Auswahl und Matrix-Vorbelegung (ab v7.4.6-2)

AP waehlbar wenn: total_person_months > 0, start_date + end_date gesetzt, is_active.

"Zugeordnete AP": planned_pm > 0, Laufzeit-Check (end_date + 2 Monate >= Monatsende).
"Weitere AP": alle uebrigen, kein Laufzeit-Check (Vertretungsfaelle).
Matrix-Vorbelegung: nur Zugeordnete AP, sortiert nach compareApCode (ab v7.4.6-6).

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

**weekly_hours:** Wird aus v7_employee_hours_history geladen (Teilzeit-Historie,
gueltig zum Ersten des jeweiligen Monats). Fallback: v7_employees.weekly_hours.

**position_title:** Wird per DB-Abfrage geladen wenn MA wechselt.
GF-Erkennung: exakter Match auf 'Geschaeftsfuehrer' oder 'Gesellschafter-Geschaeftsfuehrer'.

**Hinweistexte:** Erscheinen nur bei Verletzung. Bei Normalfall keine Anzeige.
Bei GF-Verletzung: "GF-Anteil X h > 50% Monatsarbeitszeit (Y h) -- Foerderrisiko, Speichern moeglich"

Phase 1 (Session 24): Datenbasis (v7_employee_hours_history, POSITION_OPTIONS, GF_POSITIONS)
Phase 2 (Session 25): Teilzeit-Historie-UI in EmployeeManagement
Phase 3 (Session 36): Live-Validierung in TimesheetForm (v7.4.6-11 bis v7.4.6-14)

---

## 8. Monatsabschluss-Workflow

MA schliesst Monat ab -> v7_timesheet_completions. Matrix + Mein-Status gruen.
Admin kann Abschluss aufheben. Speichern-Verhalten: Abschluss wird nur
zurueckgesetzt wenn tatsaechlich Aenderungen gespeichert wurden.

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

**Hinweis zu "Angefragt am Session <=42":** Diese Punkte wurden aus aelteren Sessions
mitgeschleppt; das exakte Anfragedatum ist nicht mehr rekonstruierbar. Ab Session 47
wird das Anfragedatum bei Neuaufnahme stets eingetragen.

**Frueher erledigt (historisch):**
- Arbeitszeitgrenzen Phase 3 Live-Validierung -> v7.4.6-14 (Session 36).

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
| v5.16 | 05.07.2026 | Session 65: Username-Login ergaenzt (E-Mail ODER Benutzername beim Anmelden), PROD-deployt (beide Remotes). A-050 NEU+erledigt: DB-Spalte v7_user_profiles.username (optional, global eindeutig, a-z0-9._- 3-20 Zeichen, Partial-Unique-Index, SQL-MIGRATION-username-login-v1.sql DEV+PROD). Login-Seite (7.3.90-8) loest einen eingegebenen Benutzernamen ueber neue Route /api/v7/resolve-username in die E-Mail auf (Route liefert ausschliesslich die E-Mail, gleiche generische Fehlermeldung wie falsches Passwort - kein Enumerations-Risiko). Selbstbedienung ueber neue Route /api/v7/set-username (nur eigenes Konto, auth.uid() aus Session-Cookie) + Menuepunkt "Benutzername festlegen/aendern" im PortalHeader (7.3.95-15). Optionales Benutzername-Feld bei MA-Neuanlage in BEIDEN Login-erstellen-Dialogen ergaenzt (REGEL zu parallelen Aenderungen): EmployeeManagement 7.3.95-20 UND MitarbeiterModal 1.0.3-3; create-employee-login-route 7.3.95-3 mit Format-/Eindeutigkeitspruefung + Race-Condition-Absicherung (USERNAME_TAKEN). BEWUSST NICHT umgesetzt: Admin setzt Benutzername fuer fremden bestehenden Account - Selbstbedienung + Neuanlage decken den Bedarf ab. Vereinheitlichung der zwei strukturell unterschiedlichen Login-Dialoge bewusst zurueckgestellt (Backlog, kein Umbau unter Zeitdruck). NEU BACKLOG (Prio 2): Firmen-Portal-Rolle "Assistenz GL" (Zeiterfassung aller MA + ZA + Berichte + MA-Stammdaten, keine Logins/Projekte/Firmendaten) - noch nicht begonnen. Doku: §2 neu 2.10 Username-Login; §4.1/§4.2 Versionen nachgezogen; SW-Release V7.5.4->V7.5.5. KEINE weitere DB-Migration. |
| v5.15 | 03.07.2026 | Session 64: Groesserer Stundennachweis-Ausbau, PROD-deployt (beide Remotes, SHA 1e2de08). GF-50%-Regel wieder aktiv (tolerante Erkennung istGeschaeftsfuehrerTitle() in v7-types 7.4.9-2, echte Umlaute im Position-Dropdown, MitarbeiterModal 1.0.3-2, TimesheetForm 7.4.6-60) - Ursache war exakter ASCII-String-Match gegen ueberwiegend Umlaut-Bestandsdaten. Paket A (TimesheetForm 7.4.6-61): rechte "offen"-Spalte live waehrend der Eingabe + Farben zurueck. Paket B (TimesheetForm 7.4.6-62, StundennachweisMatrix 7.4.6-10): persoenliche WAZ-Anzeige neben MA-Feld + ZA-Direktlink in Timesheet/Matrix. ZA-Ruecksprung-Fix (ZASeite 1.0.10): returnTo-Pfad wird honoriert statt fix aufs Dashboard zu springen. Paket C (TimesheetForm 7.4.6-63): Auto-Vorbelegung "sonstige Arbeiten" je Arbeitstag, live nachgefuehrt, gespeicherte Monate nicht ueberschrieben, weicher Save-Hinweis auf Luecken. Grenzen-Korrektur (TimesheetForm 7.4.6-64): "sonstige Arbeiten" zaehlen nicht mehr in 9h-Tagesgrenze und physische Monatskapazitaet. Datenkorrektur (kein Code): Katrin Kirchner WAZ-Historie (38h->28h ab 01.08.2025) - Historie hat Vorrang vor Stammsatz. KEINE DB-Migration. Komponenten: TimesheetForm v7.4.6-64, StundennachweisMatrix v7.4.6-10, ZASeite v1.0.10,
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

## 12e. Verhaltensvertrag kritischer Komponenten (Session 47)

### Grundprinzip

Jede kritische Komponente hat einen Verhaltensvertrag: eine Liste von Funktionen,
die IMMER korrekt arbeiten muessen. Vor jeder Aenderung wird diese Liste durchgegangen.
Nach der Aenderung wird sie als Smoke-Test abgearbeitet. Dies ist die verbindliche
Smoke-Test-Quelle (vgl. Paragraph 12b Regel 13, der hierauf verweist).

**Versionshinweis:** Versionsnummern der Komponenten sind hier bewusst NICHT eingebacken.
Die Funktions-Checklisten sind versionsunabhaengig. Stand der Erstaufnahme: Session 46/47.
Die jeweils aktuelle Datei-Version ist immer dem Projektverzeichnis zu entnehmen
(Paragraph 12b Regel 8/12).

**Ablauf bei jeder Code-Aenderung:**

1. Martin beschreibt Anforderung/Problem.
2. Claude identifiziert betroffene Datei(en).
3. Claude prueft den Verhaltensvertrag der betroffenen Komponente(n).
4. Claude praesentiert Plan + explizite Liste: "Diese Verhaltensweisen bleiben intakt: [Liste]".
5. Martin gibt GO.
6. Claude implementiert chirurgisch (nur betroffene Zeilen).
7. Smoke-Test auf DEV (localhost:3000) gegen den Verhaltensvertrag.
8. Erst nach erfolgreichem DEV-Test: Deploy auf PROD.

### 12e.1 TimesheetForm

**Datei:** src/components/shared/TimesheetForm.tsx
**Genutzt in:** Berater-Portal + Firma-Portal (Zeiterfassung)

| Nr | Funktion | Pruefung |
|----|----------|----------|
| TF-01 | AP-Auswahl per Dropdown | Zugeordnete + Weitere AP sichtbar, sortiert nach ap_code |
| TF-02 | Stundeneingabe in Tageszellen | Wert eingeben, Tab/Enter/Pfeiltasten navigieren |
| TF-03 | Speichern + Laden | Speichern, Seite neu laden, Werte identisch |
| TF-04 | Feiertage in S-Zeile | Werktags-Feiertage automatisch mit Tagesstunden vorbelegt |
| TF-05 | Fehlzeiten U/K/S editierbar | Tageszellen frei editierbar, Summen korrekt |
| TF-06 | Wochenende/Feiertag Hintergrund | Sa/So grau, Feiertage orange |
| TF-07 | Summenberechnung | Zeilensumme (S), Tagessumme, Gesamtsumme korrekt |
| TF-08 | Monatsabschluss | Button setzt/entfernt Completion-Flag |
| TF-09 | Arbeitszeitgrenzen | Tagesgrenze 9h (hart), Monatsgrenze (weich), Zellfaerbung |
| TF-10 | Kumulierte Stunden (Arbeitsplan) | offen-Spalte zeigt verbleibende Stunden pro AP |
| TF-11 | Druck/PDF | AP-Name vollstaendig, AP-Nummer sichtbar, Layout A4 Querformat |
| TF-12 | Nicht-zuschussfaehige Arbeiten | Sonstige-Zeile editierbar, nicht in Summe (2) |
| TF-13 | Durchfuehrbarkeitsstudie (DS) | T/NT-Spalte bei ZIM_DS-Projekten |
| TF-14 | Mehrere AP-Zeilen | Dynamisches Hinzufuegen, max. 4 initial |

**Besonders fragile Bereiche:**
- loadTimeEntries-Funktion: Laedt AP-Eintraege, Fehlzeiten, Feiertage, sonstige Arbeiten.
  Aenderungen hier koennen TF-01 bis TF-06 gleichzeitig brechen.
- Print-Styles (@media print): Aenderungen an Screen-CSS koennen Print-Layout zerstoeren.
  IMMER Druckvorschau pruefen nach CSS-Aenderungen.
- useEffect-Dependencies: Fehlende Dependencies = veraltete Daten. Zu viele = Endlos-Loop.

### 12e.2 BerichtePage

**Datei:** src/components/shared/BerichtePage.tsx
**Genutzt in:** Berater-Portal + Firma-Portal (Dashboard/Berichte)

| Nr | Funktion | Pruefung |
|----|----------|----------|
| BP-01 | Zeiterfassungs-Status Tabelle | Erfasst(h) pro MA identisch mit Arbeitsplan "davon erfasst" |
| BP-02 | ProjektFortschrittPanel | Monatsverlauf-Chart: alle Monate vollstaendig, Ist-Balken plausibel |
| BP-03 | Stundennachweis-Matrix | Ampeln korrekt (gruen=vollstaendig, orange=teilweise, grau=leer) |
| BP-04 | Timesheet-Daten vollstaendig | Alle Eintraege geladen (.limit(10000), keine Abschneidung) |
| BP-05 | Projekt-Auswahl | Dropdown filtert korrekt auf ausgewaehltes Projekt |
| BP-06 | MA-Stundensaetze | Korrekte Berechnung aus Gehaltsdaten (Anlage 6.1) |
| BP-07 | Excel-Export | Vollstaendige Daten, korrekte Formatierung |
| BP-08 | Meine Projekte (Firma) | Klickbare Projektliste im Dashboard |

**Besonders fragile Bereiche:**
- Timesheet-Query: Muss .limit(10000) haben UND Supabase Max Rows >= 10000.
  BEIDE Bedingungen muessen erfuellt sein.
- timesheets State: Wird an ProjektFortschrittPanel, ZE-Status und Matrix weitergereicht.
  Aenderung an der Query betrifft ALLE drei Panels gleichzeitig.

### 12e.3 FirmaCockpit

**Datei:** src/components/shared/FirmaCockpit.tsx
**Genutzt in:** Berater-Portal (Firmenansicht im App-Modus)

| Nr | Funktion | Pruefung |
|----|----------|----------|
| FC-01 | Firmendaten-Anzeige | Name, Kontakt, Bundesland korrekt |
| FC-02 | Projektliste | Alle aktiven Projekte mit Laufzeit, PM%, Kosten% |
| FC-03 | Monatsverlauf-Chart | Identisch mit BerichtePage (gleiche Datenquelle) |
| FC-04 | Zahlungsanforderungen | ZA-Liste mit Betraegen, Einreichdatum |
| FC-05 | Mitarbeiter-Modal | Neuer MA, MA bearbeiten, PW-Reset |
| FC-06 | Navigation | PortalNav korrekt, returnTo funktioniert |
| FC-07 | Timesheet-Daten vollstaendig | .limit(10000), keine Abschneidung |

### 12e.4 ProjektFortschrittPanel

**Datei:** src/components/shared/ProjektFortschrittPanel.tsx
**Genutzt in:** BerichtePage + FirmaCockpit

| Nr | Funktion | Pruefung |
|----|----------|----------|
| PF-01 | Laufzeit/PM/Kosten KPIs | Prozent und Absolutwerte korrekt |
| PF-02 | Monatsverlauf-Chart | Ist vs. Soll pro Monat, kumulierte Linien |
| PF-03 | Prognose | Gestrichelte Linie basierend auf letzten 3 Monaten |
| PF-04 | Zielerreichungs-Prognose | Erreichbar/Gefaehrdet/Kritisch korrekt berechnet |
| PF-05 | PM je Mitarbeiter (Plan vs. Ist) | Balkendiagramm pro MA |
| PF-06 | Personalkosten je MA | Balkendiagramm basierend auf Stundensaetzen |
| PF-07 | Drucken/PDF | Chart + KPIs auf einer A4-Seite |

**Hinweis (Refactor projektfortschritt-utils, Session 47 Punkt 3):**
Beim Auslagern der Berechnungslogik nach projektfortschritt-utils muessen PF-02, PF-03
und PF-04 rechnerisch bit-genau identische Ergebnisse liefern wie vor dem Refactor.
Vergleichswerte vor dem Refactor festhalten und nach dem Refactor gegenpruefen.

### 12e.5 ZAPanel (Zahlungsanforderung)

**Datei:** src/components/shared/ZAPanel.tsx
**Genutzt in:** ZASeite (Berater + Firma), aufgerufen aus FirmaCockpit / Cockpit ZA-Liste

| Nr | Funktion | Pruefung |
|----|----------|----------|
| ZA-01 | Status-Automatik | Status wird per calcStatus aus Datumsfeldern abgeleitet: kein eingereicht_am=Entwurf; eingereicht_am ohne Zahlung=Eingereicht; Zahlung >= erwartet=volle_zahlung; sonst gekuerzte_zahlung. Keine manuellen Status-Buttons. |
| ZA-02 | Einreichdatum editierbar | eingereicht_am im Formular editierbar; Setzen schaltet Status auf Eingereicht |
| ZA-03 | Tabs | Deckblatt / Anlage 1a / Anlage 1b / Archiv jeweils korrekt befuellt |
| ZA-04 | Archiv-Tab Zahlungseingang | Datum, Betrag, Anmerkung speicherbar; Validierung: Datum erfordert Betrag > 0 |
| ZA-05 | Foerderbetrag-Persistenz | foerderbetrag_gesamt beim Sichern neu berechnet UND gespeichert (Cockpit liest gespeicherten Wert, sonst 0 EUR) |
| ZA-06 | Historische Werte | Archiv-Tab zeigt gespeicherten Foerderbetrag, keine Neuberechnung bestehender Eintraege |
| ZA-07 | ZA loeschen | Nur im Archiv-Tab, mit Bestaetigung |
| ZA-08 | Status-Rollback | "Zurueck zu Eingereicht" (primaer) und "Zurueck zu Entwurf" (sekundaer) verfuegbar |
| ZA-09 | Netzwerk-Modus | isNetzwerk bei ZIM_NETZWERK; NWM-Kostenfelder (Personal, Dritte, uebrige, gesamt); Laufzeitjahr aus bewilligung_datum |
| ZA-10 | DB-Felder ohne Props (Option B) | bewilligung_datum, bewilligte_summe direkt aus DB im Panel laden (ProjectDetailPage frozen, TS-1) |
| ZA-11 | Status-Badge-Farben | grau=Entwurf, blau=Eingereicht, gruen=Bewilligt/Zahlung |

**Besonders fragile Bereiche:**
- calcStatus(): Eine Aenderung kann ZA-01 und ZA-08 gleichzeitig brechen.
- foerderbetrag_gesamt-Persistenz: Wird beim Sichern nicht mitgespeichert -> Cockpit zeigt 0 EUR
  (war Bug, behoben in v7.4.4-41). Beim Archiv-Speichern immer neu berechnen + persistieren.
- Option-B-DB-Load: ProjectDetailPage darf NICHT geaendert werden (TS-1 frozen).
- Deep-Link aus dem Cockpit (Session 47 Punkt 2): Klick auf ZA-Nummer oeffnet ZA direkt.
  Der direkte Einsprung muss ZA-01 bis ZA-11 unveraendert erhalten.

### 12e.6 Infrastruktur-Checkliste

Zusaetzlich zu den Komponenten-Vertraegen:

| Nr | Pruefpunkt | Wann pruefen |
|----|------------|--------------|
| IF-01 | Supabase Max Rows >= 10000 | Bei jedem neuen Supabase-Projekt |
| IF-02 | DEV-Schema identisch mit PROD | Nach jeder DB-Migration |
| IF-03 | .limit(10000) in neuen Queries | Bei jeder neuen v7_timesheets-Query |
| IF-04 | UTF-8/ASCII sauber | Vor jeder Datei-Auslieferung |
| IF-05 | Aktuelle Datei-Version als Basis | Vor jeder Code-Aenderung (Projektverzeichnis pruefen) |
| IF-06 | DEV-Test vor PROD-Deploy | Nach jeder Code-Aenderung |
| IF-07 | Print-Vorschau nach CSS-Aenderung | Bei jeder Aenderung an Komponenten mit Print |

### 12e.7 Eskalationsregeln

- Wenn unklar ob eine Funktion betroffen ist: FRAGEN, nicht raten.
- Wenn eine Aenderung mehr als 20 Zeilen betrifft: Plan vorlegen, GO abwarten.
- Wenn eine Aenderung mehrere Komponenten betrifft: Alle betroffenen Vertraege pruefen.
- Wenn ein Smoke-Test fehlschlaegt: SOFORT stoppen, nicht "schnell noch fixen".
  Zurueck zur letzten funktionierenden Version, dann sauber neu ansetzen.

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
