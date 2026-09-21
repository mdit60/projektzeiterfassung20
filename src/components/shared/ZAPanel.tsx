// src/components/shared/ZAPanel.tsx
// ============================================================================
// PZE V7 - Shared Component: ZA-Panel (Zahlungsanforderung ZIM)
// ============================================================================
// Version: 7.4.4-79
// v7.4.4-79: ARCHIV IN DIE ZA-AUSWAHL OBEN RECHTS (Vorschlag Martin 21.09.2026).
//   Deckblatt/Anlage 1a/1b sind Seiten EINER ZA, das Archiv ist die Uebersicht
//   ueber ALLE ZA. Deshalb: Reihe oben rechts "ZA 1 | ZA 2 | ... | + Neue ZA |
//   Archiv" (gleiche Reihenfolge wie im Cockpit 36-21). Der Archiv-Tab in der
//   Seitenleiste entfaellt. Im Archiv ist der Knopf "Archiv" hervorgehoben,
//   keine ZA; Klick auf eine ZA, "+ Neue ZA" oder eine Seite fuehrt zurueck
//   zur ZA. Drucken nur fuer eine ZA - im Archiv ausgeblendet.
// v7.4.4-78: Neuer optionaler Prop initialTab ('deckblatt' | 'anlage1a' |
//   'anlage1b' | 'archiv'). Damit oeffnet der neue Archiv-Link im Cockpit
//   (FirmaCockpit 36-20, ueber ZASeite 1.0.11) direkt den Archiv-Tab.
//   Ohne Prop unveraendert Deckblatt.
// v7.4.4-77: ZAHLUNG AENDERT NIE DEN ANGEFORDERTEN BETRAG (ZA-06, historische
//   Werte). BEFUND DEV 21.09.2026: Sammelueberweisung auf ZA 2/3 von HEATS
//   hat foerderbetrag_gesamt neu berechnet und ueberschrieben (26.387,72 ->
//   24.218,00; 27.482,33 -> 25.688,00). Ursache: Regel aus v7.4.4-41
//   ("beim Sichern im Archiv Foerderbetrag immer neu berechnen"), von -73 auf
//   alle Zahlungswege uebertragen. Die Regel sollte nur LEERE Betraege fuellen.
//   FIX: nachZahlungsAenderung speichert foerderbetrag_gesamt nur noch, wenn
//   er NULL ist; ein gespeicherter Betrag bleibt unveraendert und dient als
//   Massstab fuer den Status. Aendern laesst er sich nur bewusst ueber
//   "ZA speichern" im Deckblatt.
// v7.4.4-76: Absicherungen nach DEV-Test (Martin 21.09.2026: ZA 1 versehentlich
//   geloescht, Zahlung versehentlich bei Entwurf ZA 4 erfasst).
//   1. Zahlungseingaenge nur bei eingereichten ZA erfassbar. Bei Entwuerfen
//      zeigt die Archivzeile "erst nach Einreichung"; eine bereits vorhandene
//      Zahlung bleibt sichtbar und kann entfernt werden.
//   2. Zahlungsliste: Knopf "Zahlung entfernen" grau statt rot "Entfernen" -
//      klar unterscheidbar vom Loeschen der ganzen ZA.
//   3. Loeschen einer eingereichten ZA verlangt die Eingabe der ZA-Nummer
//      (window.prompt) statt einer einfachen Rueckfrage.
// v7.4.4-75: Eingabezeile fuer eine weitere Zahlung eindeutig beschriftet
//   (Rueckmeldung Martin: Speichern nicht erkennbar). Die Zeile traegt links
//   "Neue Zahlung:", der Knopf heisst "Hinzuf\u00fcgen" statt "+ weitere Zahlung"
//   (war zum Verwechseln mit dem Link, der die Liste oeffnet).
// v7.4.4-74: Feinschliff Zahlungsliste nach erstem DEV-Test (Martin 21.09.2026).
//   - Liste schliesst sich automatisch, wenn keine Zahlung mehr uebrig ist
//     (vorher blieb sie nach "Entfernen" der letzten Zahlung leer offen).
//   - Liste kompakt: Spalten nicht mehr ueber die volle Breite verteilt,
//     Datum, Betrag, Anmerkung und Knoepfe stehen direkt nebeneinander.
// v7.4.4-73: ZAHLUNGSEINGAENGE ALS LISTE (KONZEPT-ZA-KORREKTUR-ZAHLUNGEN v1.1,
//   Teil B, Etappe 2). Quelle ist die neue Tabelle v7_za_zahlungen; die alten
//   Spalten zahlungseingang_datum/_betrag/_kommentar werden weder gelesen noch
//   geschrieben. Zahlungen haengen an (project_id, za_nummer), nicht an der
//   id der ZA-Zeile (Konzept 4.2).
//   - Standardfall unveraendert: eine ZA, eine Zahlung - Datum/Betrag/Anmerkung
//     in der Archivzeile, "Sichern" legt genau eine Zahlung an bzw. aendert sie.
//     Felder leeren + Sichern entfernt die Zahlung (weiches Loeschen is_active).
//   - "+ weitere Zahlung" unter dem Betrag (ab einer Zahlung): oeffnet die
//     Zahlungsliste der ZA. Bei mehr als einer Zahlung ist die Liste immer
//     offen; die Archivzeile zeigt dann Summe "(n)" und juengstes Datum.
//   - Neu: "Sammelueberweisung erfassen" - Datum, Gesamtbetrag, Referenz,
//     Aufteilung auf eingereichte ZA. Speichern nur bei exakter Aufteilung.
//     Jeder Anteil wird eine Zahlung mit gleichem Datum und gleicher Referenz.
//   - calcStatus unveraendert, erhaelt jetzt Summe und juengstes Datum.
//     Nach jeder Zahlungsaenderung werden Status und Foerderbetrag der ZA wie
//     bisher (v7.4.4-41) neu gespeichert und lokal sofort aktualisiert.
//   - ZA loeschen: Zahlungen der ZA-Nummer werden mit deaktiviert, sofern
//     keine weitere Zeile dieser Nummer besteht (vorbereitet fuer Etappe 3).
//   - ZA-Nummer einer gespeicherten ZA geaendert: Zahlungen ziehen mit um.
//   - Fehler beim Schreiben (z. B. RLS) werden gemeldet statt verschluckt.
//   - Betragseingabe akzeptiert "12.128,00" und "12128.00" (parseBetrag).
// v7.4.4-72: KORREKTUR zu -71 - Foerderbetrag wieder auf GANZE EURO, kauf-
//   maennisch, wie im Originalformular der Zahlungsanforderung (Vorgabe Martin
//   21.09.2026, geprueft an ANOVIA ZA 1: 8.274,63 -> 8.275). Alle vier Stellen
//   (antZuwendung, computeArchivFoerderbetrag beide Zweige, nwmFoerderbetrag)
//   nutzen roundEuro() aus @/lib/verwendungsnachweis-utils. Gegenueber dem
//   Stand vor -71 (Math.round direkt) mit Schutz gegen Gleitkomma-Rauschen.
//   Die Kostenzeilen bleiben centgenau.
// v7.4.4-71: FOERDERBETRAG CENTGENAU statt auf ganze Euro gekappt.
//   BEFUND: antZuwendung, computeArchivFoerderbetrag (beide Zweige) und
//   nwmFoerderbetrag rundeten mit Math.round(x) auf GANZE EURO, obwohl die
//   Kostenzeilen centgenau gefuehrt werden und alle Formularspalten mit
//   "[EUR, Cent]" ueberschrieben sind. Folge: ZA 4 zeigte 14.176,00 statt
//   14.176,46; gespeicherte Altwerte (ZA 1/2) standen dagegen mit Cent in
//   der DB - inkonsistenter Bestand. Math.round rundete zudem auf, wodurch
//   mehr als der Foerdersatz angefordert werden konnte.
//   FIX: kaufmaennische Rundung auf zwei Dezimalen ueber round2() aus
//   @/lib/verwendungsnachweis-utils - dieselbe Funktion, die auch der VN
//   benutzt. Vier Stellen betroffen.
// v7.4.4-70: TAGGENAUER ABRECHNUNGSFILTER (Fix Monatslogik).
//   BEFUND: getZAPersonenstunden hat die Zeiterfassung ueber GANZE Kalender-
//   monate gefiltert. Aus einem ZA-Zeitraum 01.07.-30.08. wurde damit "Juli
//   und August komplett" -> Buchungen vom 31.08. wurden mitgerechnet, obwohl
//   sie ausserhalb des Bewilligungszeitraums liegen und nicht zuwendungs-
//   faehig sind. Betroffen war ueber computeArchivFoerderbetrag auch der
//   gespeicherte foerderbetrag_gesamt.
//   FIX: Filterung taggenau ueber die ZENTRALEN Helfer abrechnungsFenster()
//   und istImFenster() aus @/lib/verwendungsnachweis-utils. Bewusst Import
//   statt lokaler Kopie, damit ZA und VN nicht erneut auseinanderlaufen.
//   Das Fenster ist der Schnitt aus ZA-Zeitraum und Bewilligungszeitraum
//   (v7_projects.start_date / end_date).
//   Die Monatsspalten der Anlage 1a bleiben unveraendert - sie zeigen nur
//   noch die Stunden, die im Fenster liegen.
// v7.4.4-69: FZ-Grenzueberschreitung verhindern: ZA-Abrechnungszeitraum darf
//   nicht ueber die Grenze zwischen zwei Foerderzeitraeumen (Netzwerkjahren)
//   gehen, da unterschiedliche Foerderquoten gelten. Rote Warnung + Speichersperre.
// v7.4.4-68: NWM Foerderquote automatisch aus v7_nwm_foerderzeitraeume statt
//   Date-Arithmetik. openPanel laedt FZ-Daten fuer NWM-Projekte, neue Funktion
//   getFoerderquoteFromFZ matched ZA-Zeitraum gegen FZ-Tabelle und liefert die
//   korrekte foerderquote pro Netzwerkjahr. calcLaufzeitjahr + getFoerdersatzNWM
//   bleiben als Fallback, greifen nur wenn keine FZ-Daten vorhanden.
// v7.4.4-67: loadProjectAssignments liefert zusaetzlich assignment_start mit
//   (Ergaenzung zu assignment_end aus -65). Wird von der Prognose-Utility
//   v7.4.9-10 (Ebene 1) fuer das monatsgenaue Ein-/Austrittsfenster benoetigt
//   (Ersatz-MA traegt Potential erst ab Eintritt bei). Reine Feld-Ergaenzung.
// v7.4.4-66: FIX Stundensatz-Diskrepanz Team-Anlage vs. ZA Anlage 1b bei
//   Teilzeit-MA. getHourlyRate skalierte den kalkulatorischen Satz in Pfad 2
//   noch mit weekly_hours / pm_basis (z.B. 28,00 -> 22,40 bei 32/40), obwohl der
//   kalkulatorische Satz laut ProjectTeamManager bereits (Monatslohn x 12 +
//   Zulagen) / (persoenliche WAZ x 52) ist - also schon der echte
//   personengebundene Stundensatz. Die ZA rechnet echte Stunden x Satz; die
//   zweite Skalierung rechnete Teilzeit ein zweites Mal herunter und
//   unterschaetzte die Personalkosten. Team zeigte 28,00, ZA 22,40.
//   FIX: Pfad 2 gibt den Satz unskaliert zurueck (wie die Team-Anlage:
//   hourly_rate_approved ?? hourly_rate). Bei Vollzeit (WAZ = pm_basis) ohne
//   Wirkung, daher Zimmermann unveraendert. Die WAZ-/PM-Skalierung bleibt
//   bewusst NUR in der Fortschritts-Utility (PM x Monatsgehalt), nicht in der ZA.
// v7.4.4-65: loadProjectAssignments liefert zusaetzlich assignment_end mit, damit
//   die Projekt-Fortschritts-/Prognoseberechnung (projektfortschritt-utils v7.4.9-8)
//   ausgeschiedene Mitarbeiter (assignment_end in der Vergangenheit) erkennen und
//   aus der Kapazitaets-/Szenariensicht ausschliessen kann. Reine Feld-Ergaenzung,
//   keine Logikaenderung am ZA-Panel selbst.
// v7.4.4-64: FIX Monatsdarstellung Anlage 1a nutzerabhaengig verdreht ("25 Dez"
//   statt "Dez. 25" bei einzelnen Anwendern). Ursache NICHT der Code: die Labels
//   werden bereits fest mit toLocaleString('de-DE', {month:'short', year:'2-digit'})
//   erzeugt (Monat zuerst) und sind fuer alle Nutzer identisch. Das Umdrehen
//   entsteht durch eine Uebersetzungsschicht IM Browser (Chrome-Seitenuebersetzung
//   "immer uebersetzen" bzw. Extensions wie Immersive Translate), die den fertig
//   gerenderten DOM-Text nachtraeglich umbaut. Loesung: die drei amtlichen ZA-
//   Dokumentcontainer (Deckblatt, Anlage 1a, Anlage 1b, je #za-print-area) mit
//   translate="no" + class "notranslate" von der Browser-Uebersetzung ausnehmen.
//   Amtliche Foerderformulare duerfen ohnehin nicht maschinenuebersetzt angezeigt
//   werden. Reine Anzeige-/Robustheitsaenderung; keine Daten-/Logikaenderung, das
//   erzeugte Format bleibt fuer bestehende Nutzer byte-identisch.
// v7.4.4-63: LAYOUT - Deckblatt zusaetzlich horizontal zentriert (mx-auto).
//   Breite unveraendert (max-w-5xl), steht jetzt aber mittig. Reines Layout.
// v7.4.4-62: LAYOUT - Deckblatt-Tab auf dokumentaehnliche Breite begrenzt
//   (max-w-5xl), analog VerwendungsnachweisPanel v1.1-2. Zuvor lief das
//   Deckblatt-Formular ueber die volle Breite -> Wertespalte weit rechts,
//   schlecht lesbar (Berater- und Firmen-Portal sowie Dashboard-Einbau).
//   NUR der Deckblatt-Container; Anlage 1a/1b (Matrizen mit overflow-x-auto)
//   bleiben unveraendert voll breit. Reines Layout, keine Logik-/Datenaenderung.
// v7.4.4-61: FIX zu -60. In JSX-Textknoten wirken \u-Escapes NICHT (dort sind
//   sie woertlicher Text) - nur in JS-String-Literalen. Deshalb Anzeige-Umlaute
//   in JSX-Text jetzt als HTML-Entities (&auml; &ouml; &uuml; &Auml; &Ouml;
//   &Uuml; &szlig;); \u-Escapes bleiben nur in JS-Strings (Format-Map, Alerts,
//   Titel-Ausdruck). Weiterhin NUR Anzeige-Texte; Bezeichner, DB-Felder und
//   Kommentare unveraendert; keine Logikaenderung, ZA-01..ZA-11 intakt.
// v7.4.4-59: ZA-Stundensatz gehaertet. getHourlyRate war approved ?? hourly_rate
//   -> bei leerem anerkannten Satz wurde der ROHE (vertragl. 37,5h-basierte) Satz
//   genommen. Jetzt dreistufig: (1) anerkannter/gekuerzter Traeger-Satz AS-IS
//   (keine Skalierung), (2) sonst kalkulatorischer Satz auf Antrags-WAZ skaliert
//   (Satz x vertragl.WAZ / pm_basis; ohne pm_basis = roh), (3) sonst kein Satz ->
//   sichtbare Warnung in Anlage 1b statt stiller 0. pm_basis je Projekt in
//   openPanel mitgeladen (zaProjectExtra), weekly_hours ins Assignment-Interface.
// Version: 7.4.4-58
// v7.4.4-58: ZA-Druck komplett robust gemacht. Statt eines Popup-Fensters
//   (window.open) druckt handlePrint jetzt ueber ein unsichtbares iframe im
//   selben Fenster. Damit entfallen Popup-Blocker, das wegblitzende Fenster
//   (Firefox) und Fokus-/Timing-Probleme; gedruckt wird exakt der sichtbare
//   ZA-Bereich (offsetParent-Check waehlt den sichtbaren Tab). Aufraeumen via
//   onafterprint + Fallback. Doppeldruck-Schutz (printed-Flag). Ersetzt den
//   Popup-Ansatz aus -57.
// Version: 7.4.4-57
// v7.4.4-57: FIX ZA-Druck in Firefox. handlePrint schloss das Druck-Popup
//   unmittelbar nach print() (gleicher Tick) -> in Firefox killte das close()
//   den Druckdialog, das Fenster blitzte auf und verschwand (Deckblatt /
//   Anlagen / Zahlungsaufforderung nicht druckbar). Jetzt: drucken erst nach
//   readyState 'complete' bzw. onload, schliessen erst NACH dem Druckdialog
//   ueber onafterprint. Faellt das Schliessen aus, bleibt das Fenster offen
//   stehen statt zu verschwinden. Robust ueber Firefox und Chrome. Reine
//   Aenderung an handlePrint, sonst nichts.
// Version: 7.4.4-56
// v7.4.4-56: (1) A-042 Auto-Auswahl korrigiert - konsolidierter Effekt waehlt beim Laden
//   die per initialZaId vorgegebene ODER die zuletzt gespeicherte ZA und laedt sie wirklich
//   ins Formular (v55 brach bei gesetztem initialZaId ab -> blieb leerer Neu-Entwurf).
//   (2) Einreichdatum default leer (3 Stellen) -> Entwurf bleibt Entwurf, kein Auto-heute.
//   (3) Archiv: Spalte Zahlungseingang-Betrag rechtsbuendig -> Ueberschrift ueber dem Feld.
// Version: 7.4.4-55
// v7.4.4-55: A-042 Auto-Auswahl der zuletzt gespeicherten ZA beim Laden (richtiger
//   Abrechnungszeitraum sofort gesetzt -> Anlagen zeigen direkt Daten statt "Keine Daten").
//   Einmal-Flag (useRef) schuetzt "+ Neue ZA"/Speichern. Diagnose aus v7.4.4-54 wieder
//   entfernt. #418-Fix (mounted-Gate) aus v7.4.4-53 bleibt erhalten.
// Version: 7.4.4-53
// v7.4.4-53: FIX React #418 (Hydration-Mismatch) - ZA-Anlagen blieben in PROD leer.
//   Ursache: datums-/locale-abhaengiges Rendern (toLocaleDateString/toLocaleString 'de-DE',
//   new Date()) faellt im SSR (Vercel, UTC/Node-ICU) anders aus als im Browser. React
//   bricht das im Production-Build hart ab -> Inhalt leer ("Keine Zeiterfassungsdaten").
//   Loesung: mounted-Gate. Server und erster Client-Render liefern denselben Platzhalter;
//   der eigentliche Inhalt rendert erst nach dem Mount auf dem Client. Reiner Render-Zeitpunkt,
//   keine Aenderung an Daten- oder ZA-Logik.
// v7.4.4-52: Zeile 3 (blau): 2-Spalten-Layout 50/50 - links ZA Nr./von/bis, rechts Datum+Button
// v7.4.4-51: "Als eingereicht markieren" Button entfernt
//   - Datum Einreichung direkt im Datumsfeld setzen genuegt
//   - calcStatus() setzt automatisch 'eingereicht' wenn Datum gesetzt, sonst 'entwurf'
//   - Vereinfachung: ein einziger "ZA speichern" Button steuert alles
// v7.4.4-47: "Aktualisieren" -> "ZA speichern" + hasChanges-Dialog (wie TimesheetForm)
//   - Neue Status: entwurf / eingereicht / volle_zahlung / gekuerzte_zahlung
//   - Status-Workflow-Buttons entfernt (manuell setzen nicht mehr noetig)
//   - Validierung: zahlungseingang_datum erfordert zahlungseingang_betrag > 0
//   - calcStatus() leitet Status automatisch ab, wird beim Speichern gesetzt
// v7.4.4-41: FIX: handleSaveZahlungseingang speichert foerderbetrag_gesamt mit
//   - Behebt: Cockpit zeigt 0 EUR weil foerderbetrag_gesamt NULL war
//   - Beim Sichern im Archiv-Tab wird Foerderbetrag immer neu berechnet + gespeichert
//   - Lokaler State wird ebenfalls aktualisiert
// v7.4.4-40: ZA loeschbar im Archiv-Tab. Bestaetigung erforderlich,
//   bei Status Eingereicht/Bewilligt staerkere Warnung.
// v7.4.4-39: Einreichdatum direkt im Deckblatt-Formular neben ZA-Nr.
//   Archiv-Tab zeigt gespeicherten Wert (historisch korrekt, keine Neuberechnung).
// v7.4.4-34: Archiv-Tab neu: Zahlungseingang-Felder (Datum, Betrag, Anmerkung)
//   inline editierbar und speicherbar. Neue Spalten: Datum | Betrag | Zahlungseingang
//   | Betrag | Anmerkung | Status | Oeffnen. Spalten Bewilligt + Foerderbetrag entfernt.
// v7.4.4-33: Anlage 1a: MA sortiert nach employee_number (lfd. Nr. gemaess Antrag)
// v7.4.4-32: assignedEmployeeIds-Quelle geaendert: war wpAssignments (Arbeitsplan),
//   jetzt projectAssignments (Projektteam). Konsistent mit StundennachweisMatrix
//   v7.4.6-2. Nachfolge-MA erscheinen in der ZA ohne AP-Aenderung.
//   Grundsatz: Arbeitsplan = urspruengliche Antragstellung (unveraenderlich).
//   Tatsaechliche Arbeit dokumentiert sich ueber Zeiterfassung.
//
//   - Zeile 1 (gelb): FKZ | Datum Zuwendungsbescheid
//   - Zeile 2 (gruen): Projektlaufzeit von...bis | Bewilligte Foerdersumme
//   - Zeile 3 (blau): ZA-Nr. | Abrechnungszeitraum von...bis
//   Farbzuordnung zeilenweise einheitlich (wie bisher je Feld, jetzt je Zeile)
//
// v7.4.4-30: FIX: hourly_rate_approved wird bevorzugt verwendet
//   - Interface ZAProjectAssignment: hourly_rate_approved ergaenzt
//   - loadProjectAssignments: Feld aus DB geladen
//   - getHourlyRate: hourly_rate_approved ?? hourly_rate (Fallback)
//   - Bei Status "bewilligt" jetzt zwei Buttons:
//     "Zurueck zu Eingereicht" (primaer) und "Zurueck zu Entwurf" (sekundaer)
//   - handleStatusChange unveraendert (unterstuetzt bereits alle Status)
//
// v7.4.4-22: NEU ZIM_NETZWERK-Erweiterungen:
//   - isNetzwerk Flag fuer ZIM_NETZWERK-Projekte
//   - Laufzeitjahr automatisch aus bewilligung_datum berechnet
//   - Foerdersatz automatisch aus foerdersatz_stufen JSONB ermittelt
//   - Deckblatt ZIM_NETZWERK: eigene Kostentabelle mit NWM-Feldern
//     (Personalkosten aus ZE, Auftraege Dritte manuell, Uebrige pauschal)
//   - Warnung wenn Bewilligungsdatum fehlt
//   - ZAProject Interface um NWM-Felder erweitert
//   - ZahlungsanforderungDB um NWM-Felder erweitert
//   - handleSave speichert NWM-Felder zusaetzlich
//
// v7.4.4-18: NEU: Archiv-Tab mit Uebersicht aller ZAs
//   - Neuer Tab "Archiv" neben Deckblatt / Anlage 1a / Anlage 1b
//   - Tabelle: ZA-Nr / Zeitraum / Eingereicht am / Bewilligt am / Status / Foerderbetrag
//   - Status-Badge farbig: grau=Entwurf, blau=Eingereicht, gruen=Bewilligt
//   - Klick auf Zeile laedt ZA in Deckblatt-Tab
//   - Fuer beide Portale (Firma + Berater)
//
// v7.4.4-17: Status-Workflow: Entwurf -> Eingereicht -> Bewilligt
//   - Status-Badge bei jeder gespeicherten ZA in der ZA-Auswahlliste
//   - Status-Steuerblock im Deckblatt-Tab (unterhalb Speichern-Button)
//   - Buttons: "Als eingereicht markieren" / "Als bewilligt markieren" / "Zurueck zu Entwurf"
//   - Status-Farben: Entwurf=grau, Eingereicht=blau, Bewilligt=gruen
//   - Einreichdatum wird automatisch beim Status "Eingereicht" gesetzt
//   - Bewilligungsdatum wird automatisch beim Status "Bewilligt" gesetzt
//   - Statusaenderung direkt in DB (kein Reload noetig)
//
// v7.4.4-16: Rechtlicher Hinweiskasten auf allen drei Tabs eingefuegt:
//            "Fuer die Zahlungsanforderungen sind die vorgegebenen Formulare
//            zu verwenden." (Originalzitat ZIM-Formular VDI/VDE-IT)
//            Link zum ZIM-Foyer eingefuegt.
//
// SHARED COMPONENT - wird von BEIDEN Portalen verwendet:
//   Berater-Portal: portal="berater" -> blaue Akzentfarben
//   Firmen-Portal:  portal="firma"   -> gruene Akzentfarben
//
// WICHTIG: Dieses Component enthaelt NUR den Panel-Inhalt (aufgeklappter Bereich).
// Der Kachel-Button und der showZA-State werden in der jeweiligen Page verwaltet.
// Einbindung in der Page:
//   {showZA && (
//     <ZAPanel portal="firma|berater" projects={...} ... onLoad={openPanel} />
//   )}
// ============================================================================

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText } from 'lucide-react';
// v7.4.4-70: zentrales Abrechnungsfenster (identisch mit dem VN-Modul)
import { abrechnungsFenster, istImFenster, roundEuro } from '@/lib/verwendungsnachweis-utils';


// Foerderformat-Labels (entspricht ProjectCreateForm)
const FUNDING_FORMAT_LABELS: Record<string, string> = {
  'ZIM':           'ZIM Einzelprojekt',
  'ZIM_KOOP':      'ZIM Kooperationsprojekt',
  'ZIM_NETZWERK':  'ZIM Netzwerk-Management',
  'ZIM_DS':        'ZIM Durchf\u00fchrbarkeitsstudie',
  'BMBF':          'BMBF F\u00f6rderung',
  'BMBF_DS':       'BMBF Durchf\u00fchrbarkeitsstudie',
};
const getFundingLabel = (format: string | null | undefined): string =>
  format ? (FUNDING_FORMAT_LABELS[format] || format) : '';

// ============================================================================
// TYPEN (exportiert fuer Verwendung in den Page-Komponenten)
// ============================================================================

export interface ZAProject {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  start_date: string | null;
  end_date: string | null;
  foerdersatz: number | null;
  overhead_t: number | null;
  overhead_nt: number | null;
  overhead_gleich: boolean | null;
  // NWM-Felder
  netzwerk_typ: string | null;
  netzwerk_phase: string | null;
  bewilligung_datum: string | null;
  phase2_start_datum: string | null;
  foerdersatz_stufen: Array<{ laufzeitjahr: number; satz_percent: number; gueltig_ab: string }> | null;
  bewilligte_summe: number | null;
}

export interface ZAWorkPackage {
  id: string;
  project_id: string;
  name: string;
  is_technical?: boolean;
}

export interface ZAWpAssignment {
  work_package_id: string;
  employee_id: string;
}

export interface ZAEmployee {
  id: string;
  display_name: string;
}

export interface ZATimesheetEntry {
  id: string;
  project_id: string;
  employee_id: string;
  work_package_id: string | null;
  work_date: string;
  hours: number;
  is_active: boolean;
  is_billable: boolean;
}

export interface ZAProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
  hourly_rate: number | null;
  hourly_rate_approved: number | null;
  weekly_hours: number | null;  // v7.4.4-59: vertragl. WAZ des MA (fuer Satz-Skalierung)
}

interface ZahlungsanforderungDB {
  id: string;
  project_id: string;
  za_nummer: number;
  zeitraum_von: string;
  zeitraum_bis: string;
  auftraege_dritte_t: number | null;
  auftraege_dritte_nt: number | null;
  fue_unterauftrag: number | null;
  zeitw_personalaufnahme: number | null;
  status: string | null;
  notizen: string | null;
  eingereicht_am: string | null;
  bewilligt_am: string | null;
  // NWM-Felder
  nwm_personalkosten: number | null;
  nwm_kosten_dritte: number | null;
  nwm_kosten_uebrige: number | null;
  nwm_kosten_gesamt: number | null;
  laufzeitjahr: number | null;
  foerdersatz_percent: number | null;
  foerderbetrag_gesamt: number | null;
}

// v7.4.4-73: Zahlungseingang aus v7_za_zahlungen (haengt an der ZA-Nummer)
interface ZAZahlungDB {
  id: string;
  project_id: string;
  za_nummer: number;
  datum: string;
  betrag: number;
  referenz: string | null;
  kommentar: string | null;
}

// v7.4.4-73: Betragseingabe. Mit Komma: deutsches Format ("12.128,00"),
// Punkte sind Tausendertrenner. Ohne Komma: Punkt ist Dezimaltrenner.
const parseBetrag = (s: string): number => {
  const t = (s || '').trim().replace(/\s/g, '');
  if (t === '') return NaN;
  const norm = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return parseFloat(norm);
};
const cent = (n: number): number => Math.round(n * 100);
const fmtEUR = (n: number): string =>
  n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDatumKurz = (d: string | null): string =>
  d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '--';

// Status-Hilfsfunktionen
const ZA_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  entwurf:          { label: 'Entwurf',          bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-300'  },
  eingereicht:      { label: 'Eingereicht',      bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300'  },
  volle_zahlung:    { label: 'Volle Zahlung',    bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300' },
  gekuerzte_zahlung:{ label: 'Gek. Zahlung',     bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300'},
};

const getStatusConfig = (status: string | null) =>
  ZA_STATUS_CONFIG[status || 'entwurf'] || ZA_STATUS_CONFIG.entwurf;

// Auto-Ableitung Status aus Datumsfeldern + Betraegen
function calcStatus(
  eingereichtAm: string | null,
  zahlungsDatum: string | null,
  zahlungsBetrag: number | null,
  foerderbetragGesamt: number | null
): string {
  if (!eingereichtAm) return 'entwurf';
  if (!zahlungsDatum) return 'eingereicht';
  const betrag = zahlungsBetrag || 0;
  const erwartet = foerderbetragGesamt || 0;
  return betrag >= erwartet ? 'volle_zahlung' : 'gekuerzte_zahlung';
}

interface ZAFormData {
  za_nummer: string;
  zeitraum_von: string;
  zeitraum_bis: string;
  auftraege_dritte_t: string;
  auftraege_dritte_nt: string;
  fue_unterauftrag: string;
  zeitw_personalaufnahme: string;
  notizen: string;
  // NWM-Felder
  nwm_kosten_dritte: string;
}

// ============================================================================
// LOADER (exportiert - wird in Pages fuer projectAssignments verwendet)
// ============================================================================

export async function loadProjectAssignments(projectIds: string[]) {
  if (projectIds.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('v7_project_assignments')
    .select(`id, project_id, employee_id, employee_number, hourly_rate, hourly_rate_approved, role_in_project, assignment_end, assignment_start,
             v7_employees!inner(annual_salary, weekly_hours, qualification)`)
    .in('project_id', projectIds)
    .eq('is_active', true);
  if (error) {
    console.error('loadProjectAssignments error:', error);
    return [];
  }
  return (data || []).map((pa: any) => ({
    id: pa.id,
    project_id: pa.project_id,
    employee_id: pa.employee_id,
    employee_number: pa.employee_number,
    hourly_rate: pa.hourly_rate,
    hourly_rate_approved: pa.hourly_rate_approved ?? null,
    role_in_project: pa.role_in_project,
    assignment_end: pa.assignment_end ?? null,
    assignment_start: pa.assignment_start ?? null,
    annual_salary: pa.v7_employees?.annual_salary,
    weekly_hours: pa.v7_employees?.weekly_hours,
    qualification: pa.v7_employees?.qualification,
  }));
}

// ============================================================================
// FARBEN
// ============================================================================

const PORTAL_COLORS = {
  berater: {
    border: 'border-blue-200',
    headerBg: 'bg-blue-50',
    headerBorder: 'border-blue-200',
    icon: 'text-blue-600',
    tabActive: 'border-blue-600 text-blue-700',
    tabInactive: 'border-transparent text-gray-500 hover:text-gray-700',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700',
    btnZaSelected: 'bg-blue-100 text-blue-800 border-blue-400',
    btnZaHover: 'hover:border-blue-400',
    btnNeueZA: 'border-dashed border-blue-400 text-blue-600 hover:bg-blue-50',
    inputFocus: 'focus:outline-none focus:border-blue-500',
    focusRing: 'focus:ring-blue-500',
  },
  firma: {
    border: 'border-green-200',
    headerBg: 'bg-green-50',
    headerBorder: 'border-green-200',
    icon: 'text-green-600',
    tabActive: 'border-green-600 text-green-700',
    tabInactive: 'border-transparent text-gray-500 hover:text-gray-700',
    btnPrimary: 'bg-green-600 hover:bg-green-700',
    btnZaSelected: 'bg-green-100 text-green-800 border-green-400',
    btnZaHover: 'hover:border-green-400',
    btnNeueZA: 'border-dashed border-green-400 text-green-600 hover:bg-green-50',
    inputFocus: 'focus:outline-none focus:border-green-500',
    focusRing: 'focus:ring-green-500',
  },
};

// ============================================================================
// PROPS
// ============================================================================

interface ZAPanelProps {
  portal: 'berater' | 'firma';
  projects: ZAProject[];
  workPackages: ZAWorkPackage[];
  wpAssignments: ZAWpAssignment[];
  employees: ZAEmployee[];
  timesheets: ZATimesheetEntry[];
  projectAssignments: ZAProjectAssignment[];
  initialProjectId?: string;
  initialZaId?: string;      // Auto-selektiert diese ZA nach Laden (von Cockpit-Navigation)
  initialTab?: 'deckblatt' | 'anlage1a' | 'anlage1b' | 'archiv';  // v7.4.4-78
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function ZAPanel({
  portal,
  projects,
  workPackages,
  wpAssignments,
  employees,
  timesheets,
  projectAssignments,
  initialProjectId,
  initialZaId,
  initialTab,
}: ZAPanelProps) {
  const supabase = createClient();
  const colors = PORTAL_COLORS[portal];

  // v7.4.4-53: Hydration-Gate gegen React #418.
  // mounted ist im ersten (Server- wie Client-)Render false -> identischer Platzhalter,
  // danach true -> echter Inhalt. Verhindert SSR/Client-Mismatch beim Datums-/Locale-Rendern.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ZIM-relevante Projekte (robust gegen Postgres ENUM-Typ)
  const zimProjects = projects.filter(p => {
    const ff = String(p.funding_format || '').toUpperCase().trim();
    return ff === 'ZIM' || ff === 'ZIM_DS' || ff === 'ZIM_NETZWERK' || ff.startsWith('ZIM');
  });

  // ---- State ----
  const [projectId, setProjectId] = useState<string>(
    initialProjectId || zimProjects[0]?.id || ''
  );
  const [zaTab, setZATab] = useState<'deckblatt' | 'anlage1a' | 'anlage1b' | 'archiv'>(initialTab || 'deckblatt'); // v7.4.4-78
  const [zaList, setZAList] = useState<ZahlungsanforderungDB[]>([]);
  const [zaSelectedId, setZASelectedId] = useState<string | null>(null);

  // Ungespeicherte Aenderungen - wie TimesheetForm
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState<(() => void) | null>(null);

  // v7.4.4-56: Alter initialZaId-Auswahl-Effekt entfernt - die Auswahl (initialZaId ODER
  // zuletzt gespeicherte ZA) erfolgt jetzt zentral im konsolidierten Effekt weiter unten.
  const [zaLoading, setZALoading] = useState(false);
  const [zaSaving, setZASaving] = useState(false);
  const [archivEdits, setArchivEdits] = useState<Record<string, {
    datum: string; betrag: string; kommentar: string; saving: boolean; saved: boolean;
  }>>({});
  // v7.4.4-73: Zahlungen (v7_za_zahlungen) und Zustand der Zahlungslisten
  const [zahlungen, setZahlungen] = useState<ZAZahlungDB[]>([]);
  const [weitereOffen, setWeitereOffen] = useState<Record<number, boolean>>({});
  const [zahlungEdits, setZahlungEdits] = useState<Record<string, {
    datum: string; betrag: string; kommentar: string; saving: boolean;
  }>>({});
  const [neueZahlung, setNeueZahlung] = useState<Record<number, {
    datum: string; betrag: string; kommentar: string; saving: boolean;
  }>>({});
  const [sammelOffen, setSammelOffen] = useState(false);
  const [sammel, setSammel] = useState<{
    datum: string; gesamt: string; referenz: string; referenzManuell: boolean;
    kommentar: string; anteile: Record<number, string>; saving: boolean;
  }>({ datum: '', gesamt: '', referenz: '', referenzManuell: false, kommentar: '', anteile: {}, saving: false });
  const [eingereichtAmEdit, setEingereichtAmEdit] = useState<string>(
    '' // v7.4.4-56: leer als Default (vorher heute) -> Entwurf bleibt Entwurf
  );
  // v7.4.4-28: Direkt aus DB geladene Projektfelder (bewilligung_datum, bewilligte_summe)
  const [zaProjectExtra, setZAProjectExtra] = useState<{
    bewilligung_datum: string | null;
    bewilligte_summe: number | null;
    pm_basis_weekly_hours: number | null;  // v7.4.4-59: Antrags-WAZ fuer Satz-Skalierung
  }>({ bewilligung_datum: null, bewilligte_summe: null, pm_basis_weekly_hours: null });
  // v7.4.4-68: NWM Foerderzeitraeume fuer automatische Foerderquote
  const [nwmFoerderzeitraeumeZA, setNwmFoerderzeitraeumeZA] = useState<Array<{
    netzwerkjahr: number;
    start_datum: string;
    ende_datum: string;
    foerderquote: number;
  }>>([]);
  const [zaFormData, setZAFormData] = useState<ZAFormData>({
    za_nummer: '1',
    zeitraum_von: '',
    zeitraum_bis: '',
    auftraege_dritte_t: '',
    auftraege_dritte_nt: '',
    fue_unterauftrag: '',
    zeitw_personalaufnahme: '',
    notizen: '',
    nwm_kosten_dritte: '',
  });

  // ---- v7.4.4-73: Zahlungen (v7_za_zahlungen) ----
  const ladeZahlungen = async (pid: string): Promise<ZAZahlungDB[]> => {
    const { data, error } = await supabase
      .from('v7_za_zahlungen')
      .select('id, project_id, za_nummer, datum, betrag, referenz, kommentar')
      .eq('project_id', pid)
      .eq('is_active', true)
      .order('datum', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      alert('Fehler beim Laden der Zahlungseing\u00e4nge: ' + error.message);
      return [];
    }
    return (data || []).map((z: any) => ({ ...z, betrag: Number(z.betrag) }));
  };
  const zahlungenFuer = (nr: number, liste: ZAZahlungDB[] = zahlungen) =>
    liste.filter(z => z.za_nummer === nr);
  const summeZahlungen = (nr: number, liste: ZAZahlungDB[] = zahlungen): number =>
    cent(zahlungenFuer(nr, liste).reduce((s, z) => s + z.betrag, 0)) / 100;
  const letztesZahlungsdatum = (nr: number, liste: ZAZahlungDB[] = zahlungen): string | null => {
    const ds = zahlungenFuer(nr, liste).map(z => z.datum).sort();
    return ds.length > 0 ? ds[ds.length - 1] : null;
  };
  const bildeArchivEdits = (liste: ZahlungsanforderungDB[], zs: ZAZahlungDB[]) => {
    const edits: Record<string, { datum: string; betrag: string; kommentar: string; saving: boolean; saved: boolean }> = {};
    liste.forEach(za => {
      const eigene = zahlungenFuer(za.za_nummer, zs);
      const einzel = eigene.length === 1 ? eigene[0] : null;
      edits[za.id] = {
        datum: einzel ? einzel.datum : '',
        betrag: einzel ? String(einzel.betrag).replace('.', ',') : '',
        kommentar: einzel?.kommentar || '',
        saving: false,
        saved: false,
      };
    });
    return edits;
  };

  // Nach jeder Zahlungsaenderung: Zahlungen neu laden, Archivzeilen neu belegen,
  // Foerderbetrag + Status der betroffenen ZA-Nummern neu speichern (wie v7.4.4-41).
  const nachZahlungsAenderung = async (nummern: number[]) => {
    const neu = await ladeZahlungen(projectId);
    setZahlungen(neu);
    setArchivEdits(prev => {
      const frisch = bildeArchivEdits(zaList, neu);
      const n = { ...prev };
      zaList.forEach(za => { if (nummern.includes(za.za_nummer)) n[za.id] = frisch[za.id]; });
      return n;
    });
    const patches: Record<string, { foerderbetrag_gesamt: number; status: string }> = {};
    for (const za of zaList.filter(z => nummern.includes(z.za_nummer))) {
      // v7.4.4-77: gespeicherten Betrag NIE ueberschreiben, nur leeren fuellen
      const fbGespeichert = za.foerderbetrag_gesamt != null;
      const fb = fbGespeichert
        ? (za.foerderbetrag_gesamt as number)
        : computeArchivFoerderbetrag({ ...za, foerderbetrag_gesamt: null });
      const st = calcStatus(
        za.eingereicht_am || null,
        letztesZahlungsdatum(za.za_nummer, neu),
        summeZahlungen(za.za_nummer, neu) || null,
        fb
      );
      const patch: Record<string, any> = { status: st, updated_at: new Date().toISOString() };
      if (!fbGespeichert) patch.foerderbetrag_gesamt = fb;
      const { error } = await supabase.from('v7_zahlungsanforderungen')
        .update(patch)
        .eq('id', za.id);
      if (error) throw new Error(error.message);
      patches[za.id] = { foerderbetrag_gesamt: fb, status: st };
    }
    setZAList(prev => prev.map(z => patches[z.id] ? { ...z, ...patches[z.id] } : z));
    return neu;
  };

  // ---- Panel beim ersten Rendern laden ----
  const openPanel = useCallback(async (pid: string) => {
    setZALoading(true);
    setZASelectedId(null);
    const project = projects.find(p => p.id === pid);

    // v7.4.4-28: Fehlende Felder direkt aus DB laden
    const { data: projectDB } = await supabase
      .from('v7_projects')
      .select('bewilligung_datum, bewilligte_summe, pm_basis_weekly_hours')
      .eq('id', pid)
      .maybeSingle();
    setZAProjectExtra({
      bewilligung_datum: projectDB?.bewilligung_datum || null,
      bewilligte_summe: projectDB?.bewilligte_summe || null,
      pm_basis_weekly_hours: projectDB?.pm_basis_weekly_hours ?? null,
    });

    // v7.4.4-68: NWM Foerderzeitraeume laden fuer automatische Foerderquote
    const projForFZ = projects.find(p => p.id === pid);
    const isFZNetzwerk = String(projForFZ?.funding_format || '').toUpperCase().trim() === 'ZIM_NETZWERK';
    if (isFZNetzwerk) {
      const { data: fzRows } = await supabase
        .from('v7_nwm_foerderzeitraeume')
        .select('netzwerkjahr, start_datum, ende_datum, foerderquote')
        .eq('project_id', pid)
        .order('netzwerkjahr', { ascending: true });
      setNwmFoerderzeitraeumeZA(fzRows || []);
    } else {
      setNwmFoerderzeitraeumeZA([]);
    }

    const { data: existingZAs } = await supabase
      .from('v7_zahlungsanforderungen')
      .select('id, project_id, za_nummer, zeitraum_von, zeitraum_bis, auftraege_dritte_t, auftraege_dritte_nt, fue_unterauftrag, zeitw_personalaufnahme, status, notizen, eingereicht_am, bewilligt_am, nwm_personalkosten, nwm_kosten_dritte, nwm_kosten_uebrige, nwm_kosten_gesamt, laufzeitjahr, foerdersatz_percent, foerderbetrag_gesamt')
      .eq('project_id', pid)
      .order('za_nummer', { ascending: true });

    const zaListLoaded: ZahlungsanforderungDB[] = existingZAs || [];
    setZAList(zaListLoaded);
    // v7.4.4-73: Zahlungen laden; Archivzeile zeigt die Einzelzahlung (falls genau eine)
    const zahlungenLoaded = await ladeZahlungen(pid);
    setZahlungen(zahlungenLoaded);
    setWeitereOffen({});
    setZahlungEdits({});
    setNeueZahlung({});
    setArchivEdits(bildeArchivEdits(zaListLoaded, zahlungenLoaded));

    const nextNummer = zaListLoaded.length > 0
      ? Math.max(...zaListLoaded.map(z => z.za_nummer)) + 1
      : 1;
    const lastZA = zaListLoaded.length > 0 ? zaListLoaded[zaListLoaded.length - 1] : null;
    const vonDefault = lastZA
      ? (() => { const d = new Date(lastZA.zeitraum_bis); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })()
      : (project?.start_date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    const bisDefault = new Date().toISOString().slice(0, 10);

    setEingereichtAmEdit(''); // v7.4.4-56: Neu-Entwurf hat kein Einreichdatum
    setZAFormData({
      za_nummer: String(nextNummer),
      zeitraum_von: vonDefault,
      zeitraum_bis: bisDefault,
      auftraege_dritte_t: '',
      auftraege_dritte_nt: '',
      fue_unterauftrag: '',
      zeitw_personalaufnahme: '',
      notizen: '',
      nwm_kosten_dritte: '',
    });
    setZALoading(false);
  }, [projects, supabase]);

  // Prueft auf ungespeicherte Aenderungen - identisches Muster wie TimesheetForm
  const checkUnsavedChanges = (callback: () => void) => {
    if (hasChanges) {
      setShowUnsavedDialog(() => callback);
    } else {
      callback();
    }
  };

  // Automatisch laden wenn Panel sichtbar wird
  useEffect(() => {
    if (projectId) openPanel(projectId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadZAIntoForm = (za: ZahlungsanforderungDB) => {
    setZASelectedId(za.id);
    setHasChanges(false);
    setEingereichtAmEdit(
      za.eingereicht_am ? za.eingereicht_am.slice(0, 10) : '' // v7.4.4-56: leer statt heute
    );
    setZAFormData({
      za_nummer: String(za.za_nummer),
      zeitraum_von: za.zeitraum_von,
      zeitraum_bis: za.zeitraum_bis,
      auftraege_dritte_t: za.auftraege_dritte_t != null ? String(za.auftraege_dritte_t) : '',
      auftraege_dritte_nt: za.auftraege_dritte_nt != null ? String(za.auftraege_dritte_nt) : '',
      fue_unterauftrag: za.fue_unterauftrag != null ? String(za.fue_unterauftrag) : '',
      zeitw_personalaufnahme: za.zeitw_personalaufnahme != null ? String(za.zeitw_personalaufnahme) : '',
      notizen: za.notizen || '',
      nwm_kosten_dritte: za.nwm_kosten_dritte != null ? String(za.nwm_kosten_dritte) : '',
    });
  };

  // v7.4.4-56 (A-042): Beim ersten Laden GENAU EINMAL die richtige ZA auswaehlen UND ins
  // Formular laden - entweder die per initialZaId vorgegebene (Cockpit) oder die zuletzt
  // gespeicherte. Damit ist sofort der korrekte Abrechnungszeitraum gesetzt und die Anlagen
  // zeigen Daten statt eines leeren Neu-Entwurfs (zeitraum_bis = heute). didAutoSelectRef
  // sorgt fuer genau einen Lauf -> "+ Neue ZA"/Speichern (rufen openPanel auf) bleiben frei.
  const didAutoSelectRef = useRef(false);
  useEffect(() => {
    if (didAutoSelectRef.current) return;
    if (zaList.length === 0) return; // warten, bis openPanel die Liste geladen hat
    didAutoSelectRef.current = true;
    const target = (initialZaId && zaList.find(z => z.id === initialZaId)) || zaList[zaList.length - 1];
    if (target) loadZAIntoForm(target);
  }, [zaList, initialZaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!projectId) return;
    setZASaving(true);
    try {
      const payload: Record<string, any> = {
        project_id: projectId,
        za_nummer: parseInt(zaFormData.za_nummer) || 1,
        zeitraum_von: zaFormData.zeitraum_von,
        zeitraum_bis: zaFormData.zeitraum_bis,
        auftraege_dritte_t: zaFormData.auftraege_dritte_t !== '' ? parseFloat(zaFormData.auftraege_dritte_t.replace(',', '.')) : 0,
        auftraege_dritte_nt: zaFormData.auftraege_dritte_nt !== '' ? parseFloat(zaFormData.auftraege_dritte_nt.replace(',', '.')) : 0,
        fue_unterauftrag: zaFormData.fue_unterauftrag !== '' ? parseFloat(zaFormData.fue_unterauftrag.replace(',', '.')) : 0,
        zeitw_personalaufnahme: zaFormData.zeitw_personalaufnahme !== '' ? parseFloat(zaFormData.zeitw_personalaufnahme.replace(',', '.')) : 0,
        notizen: zaFormData.notizen.trim() || null,
        updated_at: new Date().toISOString(),
      };
      // NWM-spezifische Felder nur bei ZIM_NETZWERK speichern
      if (isNetzwerk) {
        payload.nwm_personalkosten = nwmPersonalkosten;
        payload.nwm_kosten_dritte = nwmKostenDritte;
        payload.nwm_kosten_uebrige = nwmKostenUebrige;
        payload.nwm_kosten_gesamt = nwmKostenGesamt;
        payload.laufzeitjahr = nwmLaufzeitjahr;
        payload.foerdersatz_percent = nwmFoerdersatz;
      }
      // Foerderbetrag fest speichern (historisch korrekt)
      payload.foerderbetrag_gesamt = isNetzwerk ? nwmFoerderbetrag : antZuwendung;

      // Einreichdatum immer speichern (leer = null = Entwurf)
      payload.eingereicht_am = eingereichtAmEdit ? new Date(eingereichtAmEdit).toISOString() : null;

      // Status auto-ableiten aus Datumsfeldern + Betraegen
      const existingZA = zaSelectedId ? zaList.find(z => z.id === zaSelectedId) : null;
      // v7.4.4-73: Zahlungen aus v7_za_zahlungen (Summe, juengstes Datum) der bisherigen Nummer
      payload.status = calcStatus(
        eingereichtAmEdit || null,
        existingZA ? letztesZahlungsdatum(existingZA.za_nummer) : null,
        existingZA ? (summeZahlungen(existingZA.za_nummer) || null) : null,
        payload.foerderbetrag_gesamt
      );
      if (zaSelectedId) {
        const { error: updErr } = await supabase.from('v7_zahlungsanforderungen').update(payload).eq('id', zaSelectedId);
        if (updErr) throw new Error(updErr.message);
        // v7.4.4-73: ZA-Nummer geaendert -> Zahlungen ziehen mit um
        if (existingZA && existingZA.za_nummer !== payload.za_nummer
            && zahlungenFuer(existingZA.za_nummer).length > 0) {
          const { error: movErr } = await supabase.from('v7_za_zahlungen')
            .update({ za_nummer: payload.za_nummer, updated_at: new Date().toISOString() })
            .eq('project_id', projectId)
            .eq('za_nummer', existingZA.za_nummer)
            .eq('is_active', true);
          if (movErr) throw new Error(movErr.message);
        }
      } else {
        const { data: newZA } = await supabase.from('v7_zahlungsanforderungen').insert(payload).select().single();
        if (newZA) setZASelectedId((newZA as any).id);
      }
      await openPanel(projectId);
      setHasChanges(false);
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setZASaving(false);
    }
  };

  // ---- Berechnungsfunktionen ----

  const getZAPersonenstunden = (pid: string, vonStr: string, bisStr: string) => {
    if (!vonStr || !bisStr) return [];
    const project = projects.find(p => p.id === pid);
    if (!project) return [];
    const isDS = String(project.funding_format || '').toUpperCase().trim() === 'ZIM_DS';

    const projectWPs = workPackages.filter(wp => wp.project_id === pid);
    // v7.4.4-32: Quelle ist projectAssignments (Projektteam), nicht wpAssignments
    // Sortierung nach employee_number (lfd. Nr. gemaess Antrag)
    const assignedEmployeeIds = [
      ...new Set(
        projectAssignments
          .filter(pa => pa.project_id === pid)
          .sort((a, b) => (a.employee_number ?? 999) - (b.employee_number ?? 999))
          .map(pa => pa.employee_id)
      )
    ];

    // v7.4.4-70: abrechenbares Fenster = Schnitt aus ZA-Zeitraum und
    // Bewilligungszeitraum. Kein Schnitt -> keine abrechenbaren Stunden.
    const fenster = abrechnungsFenster(vonStr, bisStr, project.start_date, project.end_date);
    if (!fenster) return [];
    const fVon = fenster.von;
    const fBis = fenster.bis;

    // Monatsspalten aus dem Fenster ableiten - bewusst ohne new Date() auf den
    // ISO-String (das parst als UTC, wird aber in Ortszeit ausgewertet und
    // verschiebt in negativen Zeitzonen den Tag).
    const months: { year: number; month: number; label: string }[] = [];
    let curY = parseInt(fVon.slice(0, 4), 10);
    let curM = parseInt(fVon.slice(5, 7), 10);
    const endY = parseInt(fBis.slice(0, 4), 10);
    const endM = parseInt(fBis.slice(5, 7), 10);
    while (curY * 12 + curM <= endY * 12 + endM) {
      months.push({
        year: curY,
        month: curM,
        label: new Date(curY, curM - 1, 1).toLocaleString('de-DE', { month: 'short', year: '2-digit' }),
      });
      curM += 1;
      if (curM > 12) { curM = 1; curY += 1; }
    }

    const technicalWPIds = isDS
      ? projectWPs.filter(wp => wp.is_technical === true).map(wp => wp.id)
      : [];

    return assignedEmployeeIds.map(empId => {
      const emp = employees.find(e => e.id === empId);
      const empName = emp ? emp.display_name : empId;

      const monthData = months.map(m => {
        // v7.4.4-70: erst auf den Monat der Spalte, dann TAGGENAU auf das
        // Abrechnungsfenster. Beides als ISO-String-Vergleich.
        const monthPrefix = String(m.year) + '-' + String(m.month).padStart(2, '0');
        const monthEntries = timesheets.filter(ts =>
          ts.project_id === pid &&
          ts.employee_id === empId &&
          ts.is_active &&
          ts.is_billable &&
          String(ts.work_date).slice(0, 7) === monthPrefix &&
          istImFenster(ts.work_date, fVon, fBis)
        );
        const hoursT = isDS
          ? monthEntries.filter(ts => technicalWPIds.includes(ts.work_package_id || '')).reduce((s, ts) => s + ts.hours, 0)
          : monthEntries.reduce((s, ts) => s + ts.hours, 0);
        const hoursNT = isDS
          ? monthEntries.filter(ts => !technicalWPIds.includes(ts.work_package_id || '')).reduce((s, ts) => s + ts.hours, 0)
          : 0;
        return { ...m, hoursT, hoursNT, hoursTotal: hoursT + hoursNT };
      });

      const totalT = monthData.reduce((s, m) => s + m.hoursT, 0);
      const totalNT = monthData.reduce((s, m) => s + m.hoursNT, 0);
      return { empId, empName, monthData, totalT, totalNT, totalAll: totalT + totalNT };
    }).filter(row => row.totalAll > 0);
  };

  const getHourlyRate = (empId: string, pid: string): number | null => {
    const pa = projectAssignments.find(pa => pa.employee_id === empId && pa.project_id === pid);
    if (!pa) return null;
    // v7.4.4-59: 1) Anerkannter/gekuerzter Traeger-Satz hat Vorrang und wird
    //    AS-IS verwendet (absolute Vorgabe vom Zuwendungsgeber, KEINE Skalierung).
    if (pa.hourly_rate_approved != null) return pa.hourly_rate_approved;
    // 2) v7.4.4-66: Sonst der kalkulatorische Satz UNSKALIERT. Er ist laut
    //    ProjectTeamManager bereits (Monatslohn x 12 + Zulagen) / (persoenl. WAZ
    //    x 52) - also der echte personengebundene Stundensatz. Die frueher hier
    //    angewandte Skalierung x (weekly_hours / pm_basis) rechnete Teilzeit-
    //    Saetze faelschlich ein zweites Mal auf die Antrags-WAZ herunter (28,00
    //    -> 22,40) und widersprach der Team-Anlage. Die ZA rechnet echte Stunden
    //    x echten Satz -> hier kein Herunterskalieren. Identisch zur Team-Anzeige
    //    (hourly_rate_approved ?? hourly_rate).
    if (pa.hourly_rate != null) {
      return pa.hourly_rate;
    }
    // 3) Gar kein Satz (keine Gehaltsdaten hinterlegt) -> null, wird sichtbar gewarnt.
    return null;
  };

  const fmt = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${d}.${m}.${y}`;
  };


  // ============================================================================
  // NWM-HILFSFUNKTIONEN
  // ============================================================================

  // Laufzeitjahr aus Bewilligungsdatum + ZA-Periodenende berechnen
  const calcLaufzeitjahr = (bewilligungDatum: string | null, periodeBis: string): number => {
    if (!bewilligungDatum || !periodeBis) return 1;
    const beg = new Date(bewilligungDatum);
    const bis = new Date(periodeBis);
    const diffMs = bis.getTime() - beg.getTime();
    const diffYears = diffMs / (365.25 * 24 * 60 * 60 * 1000);
    return Math.max(1, Math.ceil(diffYears));
  };

  // Foerdersatz aus foerdersatz_stufen JSONB fuer Laufzeitjahr ermitteln
  const getFoerdersatzNWM = (project: ZAProject, laufzeitjahr: number): number => {
    const stufen = project.foerdersatz_stufen;
    if (!stufen || stufen.length === 0) {
      // Fallback: Standardwerte national Phase 2
      if (laufzeitjahr === 1) return 70;
      if (laufzeitjahr === 2) return 50;
      return 30;
    }
    const stufe = stufen.find(s => s.laufzeitjahr === laufzeitjahr);
    return stufe ? stufe.satz_percent : (stufen[stufen.length - 1]?.satz_percent || 30);
  };

  // v7.4.4-68: Foerderquote aus v7_nwm_foerderzeitraeume ermitteln.
  // Matched das ZA-Periodenende (zeitraum_bis) gegen die FZ-Zeitraeume.
  // Rueckgabe: { netzwerkjahr, foerderquote } oder null wenn kein Match.
  const getFoerderquoteFromFZ = (bisStr: string): { netzwerkjahr: number; foerderquote: number } | null => {
    if (!bisStr || nwmFoerderzeitraeumeZA.length === 0) return null;
    const bisDate = new Date(bisStr);
    // Finde den FZ, in dessen Zeitraum das ZA-Periodenende faellt
    for (const fz of nwmFoerderzeitraeumeZA) {
      const fzStart = new Date(fz.start_datum);
      const fzEnde = new Date(fz.ende_datum);
      if (bisDate >= fzStart && bisDate <= fzEnde) {
        return { netzwerkjahr: fz.netzwerkjahr, foerderquote: fz.foerderquote };
      }
    }
    // Fallback: Wenn bisDate vor dem ersten FZ liegt, nimm den ersten
    const firstFZ = nwmFoerderzeitraeumeZA[0];
    if (bisDate < new Date(firstFZ.start_datum)) {
      return { netzwerkjahr: firstFZ.netzwerkjahr, foerderquote: firstFZ.foerderquote };
    }
    // Wenn bisDate nach dem letzten FZ liegt, nimm den letzten
    const lastFZ = nwmFoerderzeitraeumeZA[nwmFoerderzeitraeumeZA.length - 1];
    if (bisDate > new Date(lastFZ.ende_datum)) {
      return { netzwerkjahr: lastFZ.netzwerkjahr, foerderquote: lastFZ.foerderquote };
    }
    return null;
  };

  // v7.4.4-69: Prueft ob ZA-Zeitraum ueber eine FZ-Grenze hinweggeht.
  // Unterschiedliche Foerderquoten in einem Abrechnungszeitraum sind nicht zulaessig.
  // Rueckgabe: null = ok, sonst Fehlermeldung-String.
  const checkFZGrenzueberschreitung = (vonStr: string, bisStr: string): string | null => {
    if (!vonStr || !bisStr || nwmFoerderzeitraeumeZA.length < 2) return null;
    const vonDate = new Date(vonStr);
    const bisDate = new Date(bisStr);
    // Finde FZ fuer von und bis
    let fzVon: typeof nwmFoerderzeitraeumeZA[0] | null = null;
    let fzBis: typeof nwmFoerderzeitraeumeZA[0] | null = null;
    for (const fz of nwmFoerderzeitraeumeZA) {
      const s = new Date(fz.start_datum);
      const e = new Date(fz.ende_datum);
      if (vonDate >= s && vonDate <= e) fzVon = fz;
      if (bisDate >= s && bisDate <= e) fzBis = fz;
    }
    if (fzVon && fzBis && fzVon.netzwerkjahr !== fzBis.netzwerkjahr) {
      return `Der Abrechnungszeitraum ${vonStr} \u2013 ${bisStr} erstreckt sich \u00fcber zwei F\u00f6rderzeitr\u00e4ume `
        + `(NWJ ${fzVon.netzwerkjahr}: ${fzVon.foerderquote}% \u2192 NWJ ${fzBis.netzwerkjahr}: ${fzBis.foerderquote}%). `
        + `Bitte den Zeitraum so w\u00e4hlen, dass er innerhalb eines Netzwerkjahres liegt `
        + `(Grenze: ${fzVon.ende_datum}).`;
    }
    return null;
  };

  // NWM-Personalkosten aus ZE berechnen (foerderfaehige Std x hourly_rate_approved)
  const calcNWMPersonalkosten = (pid: string, vonStr: string, bisStr: string): number => {
    if (!vonStr || !bisStr) return 0;
    const psRows = getZAPersonenstunden(pid, vonStr, bisStr);
    return psRows.reduce((sum, row) => {
      const rate = getHourlyRate(row.empId, pid) || 0;
      return sum + row.totalAll * rate;
    }, 0);
  };

  const handleUpdateEingereichtAm = async () => {
    if (!zaSelectedId || !eingereichtAmEdit) return;
    setZASaving(true);
    try {
      await supabase.from('v7_zahlungsanforderungen')
        .update({ eingereicht_am: new Date(eingereichtAmEdit).toISOString(), updated_at: new Date().toISOString() })
        .eq('id', zaSelectedId);
      setZAList(prev => prev.map(z =>
        z.id === zaSelectedId ? { ...z, eingereicht_am: new Date(eingereichtAmEdit).toISOString() } : z
      ));
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setZASaving(false);
    }
  };

  const handleDeleteZA = async (za: ZahlungsanforderungDB) => {
    const isOfficial = za.status === 'eingereicht' || za.status === 'volle_zahlung' || za.status === 'gekuerzte_zahlung';
    const sc = getStatusConfig(za.status);
    const msg = isOfficial
      ? 'ACHTUNG: Diese ZA hat Status "' + sc.label + '".\nWirklich unwiderruflich l\u00f6schen?'
      : 'ZA ' + za.za_nummer + ' wirklich l\u00f6schen?\nDieser Vorgang kann nicht r\u00fcckg\u00e4ngig gemacht werden.';
    // v7.4.4-76: eingereichte ZA nur nach Eingabe der ZA-Nummer loeschen
    if (isOfficial) {
      const eingabe = window.prompt(msg + '\n\nZur Best\u00e4tigung bitte die ZA-Nummer (' + za.za_nummer + ') eingeben:');
      if (eingabe === null) return;
      if (eingabe.trim() !== String(za.za_nummer)) {
        alert('Die eingegebene Nummer stimmt nicht. Die ZA wurde nicht gel\u00f6scht.');
        return;
      }
    } else if (!window.confirm(msg)) return;
    try {
      await supabase.from('v7_zahlungsanforderungen').delete().eq('id', za.id);
      // v7.4.4-73: Zahlungen der Nummer mit deaktivieren, wenn keine weitere Zeile dieser Nummer bleibt
      const gleicheNummer = zaList.filter(z => z.za_nummer === za.za_nummer && z.id !== za.id);
      if (gleicheNummer.length === 0 && zahlungenFuer(za.za_nummer).length > 0) {
        const { error: zErr } = await supabase.from('v7_za_zahlungen')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('project_id', za.project_id)
          .eq('za_nummer', za.za_nummer)
          .eq('is_active', true);
        if (zErr) throw new Error(zErr.message);
        setZahlungen(prev => prev.filter(z => z.za_nummer !== za.za_nummer));
      }
      setZAList(prev => prev.filter(z => z.id !== za.id));
      setArchivEdits(prev => { const n = { ...prev }; delete n[za.id]; return n; });
      if (zaSelectedId === za.id) {
        setZASelectedId(null);
        setZAFormData({ za_nummer: '1', zeitraum_von: '', zeitraum_bis: '', auftraege_dritte_t: '', auftraege_dritte_nt: '', fue_unterauftrag: '', zeitw_personalaufnahme: '', notizen: '', nwm_kosten_dritte: '' });
      }
    } catch (err: any) {
      alert('Fehler beim L\u00f6schen: ' + err.message);
    }
  };

  // v7.4.4-73: Standardfall - genau eine Zahlung je ZA, Eingabe in der Archivzeile.
  // Legt die Zahlung an, aendert sie oder entfernt sie (alle Felder leer).
  const handleSaveZahlungseingang = async (zaId: string) => {
    const edit = archivEdits[zaId];
    const za = zaList.find(z => z.id === zaId);
    if (!edit || !za) return;
    const eigene = zahlungenFuer(za.za_nummer);
    if (eigene.length > 1) return; // Liste zustaendig
    const einzel = eigene.length === 1 ? eigene[0] : null;

    const leer = !edit.datum && edit.betrag.trim() === '';
    // v7.4.4-76: neue Zahlung nur bei eingereichter ZA
    if (!einzel && !leer && !za.eingereicht_am) {
      alert('Zahlungseing\u00e4nge k\u00f6nnen erst nach Einreichung der ZA erfasst werden.');
      return;
    }
    if (leer && !einzel) {
      if (edit.kommentar.trim()) {
        alert('Eine Anmerkung kann nur zusammen mit einem Zahlungseingang (Datum und Betrag) gespeichert werden.');
      }
      return;
    }
    const betrag = parseBetrag(edit.betrag);
    if (!leer) {
      // Validierung: Datum und Betrag > 0 gehoeren zusammen
      if (!edit.datum) {
        alert('Bitte das Datum des Zahlungseingangs eingeben.');
        return;
      }
      if (isNaN(betrag) || betrag <= 0) {
        alert('Bitte den Zahlungsbetrag eingeben wenn ein Zahlungsdatum gesetzt wird.');
        return;
      }
    }

    setArchivEdits(prev => ({ ...prev, [zaId]: { ...prev[zaId], saving: true, saved: false } }));
    try {
      const jetzt = new Date().toISOString();
      if (leer && einzel) {
        const { error } = await supabase.from('v7_za_zahlungen')
          .update({ is_active: false, updated_at: jetzt }).eq('id', einzel.id);
        if (error) throw new Error(error.message);
      } else if (einzel) {
        const { error } = await supabase.from('v7_za_zahlungen')
          .update({ datum: edit.datum, betrag: cent(betrag) / 100, kommentar: edit.kommentar.trim() || null, updated_at: jetzt })
          .eq('id', einzel.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('v7_za_zahlungen').insert({
          project_id: za.project_id, za_nummer: za.za_nummer, datum: edit.datum,
          betrag: cent(betrag) / 100, kommentar: edit.kommentar.trim() || null,
        });
        if (error) throw new Error(error.message);
      }
      await nachZahlungsAenderung([za.za_nummer]);
      setArchivEdits(prev => ({ ...prev, [zaId]: { ...prev[zaId], saving: false, saved: true } }));
      setTimeout(() => setArchivEdits(prev => ({ ...prev, [zaId]: { ...prev[zaId], saved: false } })), 2500);
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
      setArchivEdits(prev => ({ ...prev, [zaId]: { ...prev[zaId], saving: false } }));
    }
  };

  // v7.4.4-73: Zahlungsliste - einzelne Zahlung aendern
  const handleSaveListenZahlung = async (z: ZAZahlungDB) => {
    const e = zahlungEdits[z.id];
    if (!e) return;
    const betrag = parseBetrag(e.betrag);
    if (!e.datum || isNaN(betrag) || betrag <= 0) {
      alert('Bitte Datum und einen Betrag gr\u00f6\u00dfer 0 eingeben.');
      return;
    }
    setZahlungEdits(prev => ({ ...prev, [z.id]: { ...prev[z.id], saving: true } }));
    try {
      const { error } = await supabase.from('v7_za_zahlungen')
        .update({ datum: e.datum, betrag: cent(betrag) / 100, kommentar: e.kommentar.trim() || null, updated_at: new Date().toISOString() })
        .eq('id', z.id);
      if (error) throw new Error(error.message);
      await nachZahlungsAenderung([z.za_nummer]);
      setZahlungEdits(prev => { const n = { ...prev }; delete n[z.id]; return n; });
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
      setZahlungEdits(prev => ({ ...prev, [z.id]: { ...prev[z.id], saving: false } }));
    }
  };

  // v7.4.4-73: Zahlungsliste - Zahlung entfernen (weich, is_active = false)
  const handleEntferneZahlung = async (z: ZAZahlungDB) => {
    const text = 'Zahlung vom ' + fmtDatumKurz(z.datum) + ' \u00fcber ' + fmtEUR(z.betrag) + ' EUR entfernen?'
      + (z.referenz ? '\nHinweis: Teil der Sammel\u00fcberweisung "' + z.referenz + '". Die \u00fcbrigen Teile bleiben bestehen.' : '');
    if (!window.confirm(text)) return;
    try {
      const { error } = await supabase.from('v7_za_zahlungen')
        .update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', z.id);
      if (error) throw new Error(error.message);
      await nachZahlungsAenderung([z.za_nummer]);
    } catch (err: any) {
      alert('Fehler beim Entfernen: ' + err.message);
    }
  };

  // v7.4.4-73: Zahlungsliste - weitere Zahlung hinzufuegen
  const handleNeueZahlung = async (za: ZahlungsanforderungDB) => {
    if (!za.eingereicht_am) { // v7.4.4-76
      alert('Zahlungseing\u00e4nge k\u00f6nnen erst nach Einreichung der ZA erfasst werden.');
      return;
    }
    const e = neueZahlung[za.za_nummer];
    const betrag = e ? parseBetrag(e.betrag) : NaN;
    if (!e || !e.datum || isNaN(betrag) || betrag <= 0) {
      alert('Bitte Datum und einen Betrag gr\u00f6\u00dfer 0 eingeben.');
      return;
    }
    setNeueZahlung(prev => ({ ...prev, [za.za_nummer]: { ...prev[za.za_nummer], saving: true } }));
    try {
      const { error } = await supabase.from('v7_za_zahlungen').insert({
        project_id: za.project_id, za_nummer: za.za_nummer, datum: e.datum,
        betrag: cent(betrag) / 100, kommentar: e.kommentar.trim() || null,
      });
      if (error) throw new Error(error.message);
      await nachZahlungsAenderung([za.za_nummer]);
      setNeueZahlung(prev => { const n = { ...prev }; delete n[za.za_nummer]; return n; });
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
      setNeueZahlung(prev => ({ ...prev, [za.za_nummer]: { ...prev[za.za_nummer], saving: false } }));
    }
  };

  // v7.4.4-73: Sammelueberweisung
  const sammelReferenzVorschlag = (datum: string) =>
    datum ? '\u00dcberw. ' + fmtDatumKurz(datum) : '';
  const oeffneSammel = () => {
    setSammel({ datum: '', gesamt: '', referenz: '', referenzManuell: false, kommentar: '', anteile: {}, saving: false });
    setSammelOffen(true);
  };
  // Aufteilung pruefen: liefert Fehlertext oder null (dann speicherbar)
  const sammelPruefung = (): { fehler: string | null; gesamtCent: number; verteiltCent: number } => {
    const gesamt = parseBetrag(sammel.gesamt);
    const gesamtCent = isNaN(gesamt) ? 0 : cent(gesamt);
    let verteiltCent = 0;
    let ungueltig = false;
    let anzahl = 0;
    Object.values(sammel.anteile).forEach(v => {
      if (!v || v.trim() === '') return;
      const b = parseBetrag(v);
      if (isNaN(b) || b < 0) { ungueltig = true; return; }
      if (b > 0) anzahl += 1;
      verteiltCent += cent(b);
    });
    let fehler: string | null = null;
    if (!sammel.datum) fehler = 'Datum der \u00dcberweisung fehlt.';
    else if (isNaN(gesamt) || gesamt <= 0) fehler = 'Gesamtbetrag fehlt.';
    else if (ungueltig) fehler = 'Ung\u00fcltiger Betrag in der Aufteilung.';
    else if (anzahl === 0) fehler = 'Bitte den Betrag auf mindestens eine ZA aufteilen.';
    else if (verteiltCent !== gesamtCent) fehler = 'Die Aufteilung muss genau dem Gesamtbetrag entsprechen.';
    if (!fehler && !sammel.referenz.trim()) fehler = 'Referenz fehlt.';
    return { fehler, gesamtCent, verteiltCent };
  };
  const handleSaveSammel = async () => {
    const { fehler } = sammelPruefung();
    if (fehler) { alert(fehler); return; }
    const zeilen = Object.entries(sammel.anteile)
      .map(([nr, v]) => ({ nr: parseInt(nr), b: parseBetrag(v) }))
      .filter(x => !isNaN(x.b) && x.b > 0)
      .map(x => ({
        project_id: projectId, za_nummer: x.nr, datum: sammel.datum,
        betrag: cent(x.b) / 100, referenz: sammel.referenz.trim(),
        kommentar: sammel.kommentar.trim() || null,
      }));
    setSammel(prev => ({ ...prev, saving: true }));
    try {
      const { error } = await supabase.from('v7_za_zahlungen').insert(zeilen);
      if (error) throw new Error(error.message);
      await nachZahlungsAenderung(zeilen.map(z => z.za_nummer));
      setSammelOffen(false);
    } catch (err: any) {
      alert('Fehler beim Speichern der Sammel\u00fcberweisung: ' + err.message);
    } finally {
      setSammel(prev => ({ ...prev, saving: false }));
    }
  };

  const computeArchivFoerderbetrag = (za: ZahlungsanforderungDB): number => {
    if (za.foerderbetrag_gesamt != null) return za.foerderbetrag_gesamt;
    const zaProj = projects.find(p => p.id === za.project_id);
    const zaIsDS = String(zaProj?.funding_format || '').toUpperCase().trim() === 'ZIM_DS';
    const zaIsNWM = String(zaProj?.funding_format || '').toUpperCase().trim() === 'ZIM_NETZWERK';
    const psRows = getZAPersonenstunden(za.project_id, za.zeitraum_von, za.zeitraum_bis);
    if (zaIsNWM) {
      const pk = psRows.reduce((s, r) => s + r.totalAll * (getHourlyRate(r.empId, za.project_id) || 0), 0);
      return roundEuro(pk * (za.foerdersatz_percent || 0) / 100); // v7.4.4-72: ganze Euro wie Formular
    }
    const pkT = psRows.reduce((s, r) => s + r.totalT * (getHourlyRate(r.empId, za.project_id) || 0), 0);
    const pkNT = psRows.reduce((s, r) => s + r.totalNT * (getHourlyRate(r.empId, za.project_id) || 0), 0);
    const pkG = zaIsDS ? pkT + pkNT : psRows.reduce((s, r) => s + r.totalAll * (getHourlyRate(r.empId, za.project_id) || 0), 0);
    const fs = zaProj?.foerdersatz || 0;
    const ohT = zaProj?.overhead_t || 0;
    const ohNT = zaIsDS ? (zaProj?.overhead_nt || zaProj?.overhead_t || 0) : (zaProj?.overhead_t || 0);
    const gkT = zaIsDS ? pkT * ohT / 100 : pkG * ohT / 100;
    const gkNT = zaIsDS ? pkNT * ohNT / 100 : 0;
    const aufT = za.auftraege_dritte_t || 0;
    const aufNT = za.auftraege_dritte_nt || 0;
    const fueUA = za.fue_unterauftrag || 0;
    const zeitwPA = za.zeitw_personalaufnahme || 0;
    const summe = zaIsDS
      ? pkT + gkT + aufT + pkNT + gkNT + aufNT + fueUA + zeitwPA
      : pkG + gkT + aufT + fueUA + zeitwPA;
    return roundEuro(summe * fs / 100); // v7.4.4-72: ganze Euro wie Formular
  };

  const handlePrint = () => {
    // Sichtbaren ZA-Druckbereich holen. Je Tab existiert ein Element mit dieser
    // id; im DOM ist immer nur der aktive Tab -> der sichtbare ist der richtige.
    const candidates = Array.from(document.querySelectorAll('#za-print-area')) as HTMLElement[];
    const el = candidates.find(c => c.offsetParent !== null) || candidates[0] || document.getElementById('za-print-area');
    if (!el) return;

    const styles = Array.from(document.styleSheets)
      .map(ss => { try { return Array.from(ss.cssRules).map(r => r.cssText).join('\n'); } catch { return ''; } })
      .join('\n');
    const tabLabel = zaTab === 'deckblatt' ? 'Deckblatt' : zaTab === 'anlage1a' ? 'Anlage 1a' : zaTab === 'anlage1b' ? 'Anlage 1b' : 'Archiv';
    const html =
      '<html><head><title>ZA ' + zaFormData.za_nummer + ' - ' + tabLabel +
      '</title><style>' + styles +
      ' @media print { body { margin: 10mm; } } @page { size: A4 portrait; margin: 15mm; }</style></head><body>' +
      el.innerHTML + '</body></html>';

    // v7.4.4-58: Druck ueber ein unsichtbares iframe im SELBEN Fenster statt
    // ueber ein Popup. Robust ueber Firefox und Chrome: kein Popup-Blocker, kein
    // wegblitzendes Fenster, kein Fokus-/Timing-Problem. Gedruckt wird exakt der
    // sichtbare ZA-Bereich. Aufgeraeumt wird erst nach dem Druckdialog
    // (onafterprint) bzw. per Sicherheits-Fallback.
    const prev = document.getElementById('za-print-iframe');
    if (prev) prev.remove();
    const iframe = document.createElement('iframe');
    iframe.id = 'za-print-iframe';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = win?.document;
    if (!win || !doc) { iframe.remove(); return; }

    let done = false;
    const cleanup = () => { if (done) return; done = true; setTimeout(() => { try { iframe.remove(); } catch { /* noop */ } }, 200); };
    win.onafterprint = cleanup;

    let printed = false;
    const doPrint = () => {
      if (printed) return;
      printed = true;
      try { win.focus(); win.print(); } catch { /* noop */ }
    };

    doc.open();
    doc.write(html);
    doc.close();

    // Drucken, sobald das iframe-Dokument bereit ist (sofort oder via onload).
    if (doc.readyState === 'complete') {
      setTimeout(doPrint, 250);
    } else {
      iframe.onload = () => setTimeout(doPrint, 250);
    }
    // Fallback: iframe nicht liegen lassen, falls onafterprint nie feuert
    // (z.B. abgebrochener Druckdialog).
    setTimeout(cleanup, 60000);
  };

  // Kein ZIM-Projekt -> nichts rendern
  if (zimProjects.length === 0) return null;

  // Berechnungen
  const zaProject = projects.find(p => p.id === projectId) || zimProjects[0];
  const isDS = String(zaProject?.funding_format || '').toUpperCase().trim() === 'ZIM_DS';
  const isNetzwerk = String(zaProject?.funding_format || '').toUpperCase().trim() === 'ZIM_NETZWERK';
  const vonStr = zaFormData.zeitraum_von;
  const bisStr = zaFormData.zeitraum_bis;
  const psData = (vonStr && bisStr && projectId) ? getZAPersonenstunden(projectId, vonStr, bisStr) : [];

  // NWM-spezifische Berechnungen (nur relevant wenn isNetzwerk)
  // v7.4.4-68: Primaer aus v7_nwm_foerderzeitraeume, Fallback auf Date-Arithmetik
  const fzMatch = isNetzwerk && bisStr ? getFoerderquoteFromFZ(bisStr) : null;
  // v7.4.4-69: Pruefe FZ-Grenzueberschreitung
  const fzGrenzfehler = isNetzwerk ? checkFZGrenzueberschreitung(vonStr, bisStr) : null;
  const nwmLaufzeitjahr = fzMatch
    ? fzMatch.netzwerkjahr
    : (isNetzwerk && bisStr
      ? calcLaufzeitjahr(zaProjectExtra.bewilligung_datum || zaProject?.bewilligung_datum || null, bisStr)
      : 1);
  const nwmFoerdersatz = fzMatch
    ? fzMatch.foerderquote
    : (isNetzwerk
      ? getFoerdersatzNWM(zaProject, nwmLaufzeitjahr)
      : (zaProject?.foerdersatz || 0));
  const nwmPersonalkosten = isNetzwerk && vonStr && bisStr
    ? calcNWMPersonalkosten(projectId, vonStr, bisStr)
    : 0;
  const nwmKostenDritte = parseFloat((zaFormData.nwm_kosten_dritte || '0').replace(',', '.')) || 0;
  const nwmKostenUebrige = nwmPersonalkosten; // = 100% der Personalkosten lt. Richtlinie
  const nwmKostenGesamt = nwmPersonalkosten + nwmKostenDritte + nwmKostenUebrige;
  const nwmEigenanteilsquote = 100 - nwmFoerdersatz;
  const nwmFoerderbetrag = roundEuro(nwmKostenGesamt * nwmFoerdersatz / 100); // v7.4.4-72
  const nwmEigenanteil = nwmKostenGesamt - nwmFoerderbetrag;

  const pkT = psData.reduce((sum, row) => sum + row.totalT * (getHourlyRate(row.empId, projectId) || 0), 0);
  const pkNT = psData.reduce((sum, row) => sum + row.totalNT * (getHourlyRate(row.empId, projectId) || 0), 0);
  const pkGesamt = isDS
    ? pkT + pkNT
    : psData.reduce((sum, row) => sum + row.totalAll * (getHourlyRate(row.empId, projectId) || 0), 0);

  const foerdersatz = zaProject?.foerdersatz || 0;
  const overheadT = zaProject?.overhead_t || 0;
  const overheadNT = isDS ? (zaProject?.overhead_nt || zaProject?.overhead_t || 0) : (zaProject?.overhead_t || 0);
  const gkT = isDS ? pkT * overheadT / 100 : pkGesamt * overheadT / 100;
  const gkNT = isDS ? pkNT * overheadNT / 100 : 0;
  const auftraegeT = parseFloat((zaFormData.auftraege_dritte_t || '0').replace(',', '.')) || 0;
  const auftraegeNT = parseFloat((zaFormData.auftraege_dritte_nt || '0').replace(',', '.')) || 0;
  const fueUA = parseFloat((zaFormData.fue_unterauftrag || '0').replace(',', '.')) || 0;
  const zeitwPA = parseFloat((zaFormData.zeitw_personalaufnahme || '0').replace(',', '.')) || 0;
  const summeT = isDS ? pkT + gkT + auftraegeT : 0;
  const summeNT = isDS ? pkNT + gkNT + auftraegeNT : 0;
  const summeGesamt = isDS
    ? summeT + summeNT + fueUA + zeitwPA
    : pkGesamt + gkT + auftraegeT + fueUA + zeitwPA;
  const antZuwendung = roundEuro(summeGesamt * foerdersatz / 100); // v7.4.4-72

  // ============================================================================
  // RENDER - NUR PANEL-INHALT (kein Button, kein show/hide)
  // ============================================================================

  // v7.4.4-53: Bis der Client gemountet ist, neutralen Platzhalter rendern.
  // Server-HTML und erster Client-Render sind dadurch identisch -> kein Hydration-Mismatch (#418).
  if (!mounted) {
    return (
      <div className={`mt-4 border ${colors.border} rounded-lg overflow-hidden`}>
        <div className={`${colors.headerBg} px-4 py-3 border-b ${colors.headerBorder}`}>
          <span className="text-sm text-gray-500">Lade Zahlungsanforderung &hellip;</span>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className={`mt-4 border ${colors.border} rounded-lg overflow-hidden`}>

      {/* Panel-Header */}
      <div className={`${colors.headerBg} px-4 py-3 border-b ${colors.headerBorder} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <FileText className={`w-5 h-5 ${colors.icon}`} />
          <span className="font-medium text-gray-900">Zahlungsanforderung ({zaProject?.funding_format?.replace('_', ' ') || 'ZIM'})</span>
          {zimProjects.length > 1 && (
            <select
              value={projectId}
              onChange={e => {
                setProjectId(e.target.value);
                openPanel(e.target.value);
              }}
              className={`text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 ${colors.focusRing}`}
            >
              {zimProjects.map(p => (
                <option key={p.id} value={p.id}>{p.short_name || p.name}</option>
              ))}
            </select>
          )}
          {zimProjects.length === 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">
                {zaProject?.short_name || zaProject?.name}
              </span>
              {zaProject?.funding_reference && (
                <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                  {zaProject.funding_reference}
                </span>
              )}
            </div>
          )}
          {zaProject?.funding_format && <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">{getFundingLabel(zaProject.funding_format)}</span>}
        </div>
        {zaList.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Gespeicherte ZAs:</span>
            {zaList.map(za => {
              const sc = getStatusConfig(za.status);
              return (
                <button key={za.id} onClick={() => checkUnsavedChanges(() => { loadZAIntoForm(za); if (zaTab === 'archiv') setZATab('deckblatt'); })}
                  className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1.5
                    ${zaSelectedId === za.id && zaTab !== 'archiv'
                      ? colors.btnZaSelected
                      : `bg-white text-gray-700 border-gray-300 ${colors.btnZaHover}`}`}>
                  ZA {za.za_nummer}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium border ${sc.bg} ${sc.text} ${sc.border}`}>
                    {sc.label}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => checkUnsavedChanges(() => { setZASelectedId(null); openPanel(projectId); if (zaTab === 'archiv') setZATab('deckblatt'); })}
              className={`text-xs px-2 py-1 rounded border ${colors.btnNeueZA}`}>
              + Neue ZA
            </button>
            {/* v7.4.4-79: Archiv als Uebersicht aller ZA, rechts neben "+ Neue ZA" */}
            <button
              onClick={() => setZATab('archiv')}
              title="&Uuml;bersicht aller Zahlungsanforderungen mit Zahlungseing&auml;ngen"
              className={`text-xs px-2 py-1 rounded border transition-colors
                ${zaTab === 'archiv'
                  ? colors.btnZaSelected
                  : `bg-white text-gray-700 border-gray-300 ${colors.btnZaHover}`}`}>
              Archiv
            </button>
          </div>
        )}
      </div>

      {/* Tab-Navigation */}
      <div className="flex items-center border-b border-gray-200 bg-white">
        <div className="flex flex-1">
          {(['deckblatt', 'anlage1a', 'anlage1b'] as const).map(tab => ( /* v7.4.4-79: Archiv oben rechts */
            <button key={tab} onClick={() => setZATab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${zaTab === tab ? colors.tabActive : colors.tabInactive}`}>
              {tab === 'deckblatt' ? 'Deckblatt (Seite 5)'
                : tab === 'anlage1a' ? 'Anlage 1a - Personenstunden'
                : tab === 'anlage1b' ? 'Anlage 1b - Personalkosten'
                : 'Archiv'}
            </button>
          ))}
        </div>
        {zaTab !== 'archiv' && ( /* v7.4.4-79: Drucken nur fuer eine ZA */
        <button onClick={handlePrint}
          className="flex items-center gap-1.5 mx-3 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors"
          title="Dieses Formblatt drucken">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Drucken
        </button>
        )}
      </div>

      {zaLoading ? (
        <div className="p-8 text-center text-gray-500">Lade...</div>
      ) : (
        <div className={zaTab === 'archiv' ? 'p-0 bg-white' : 'p-4 bg-white'}>

          {/* ====== TAB: DECKBLATT ====== */}
          {zaTab === 'deckblatt' && (
            <div className="space-y-4 max-w-5xl mx-auto">
              <div id="za-print-area" translate="no" className="notranslate border-2 border-gray-400 rounded bg-white p-4">
                <div className="text-center text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">
                  Zentrales Innovationsprogramm Mittelstand (ZIM) &mdash; Zahlungsanforderung
                  {isDS ? ' f\u00fcr Durchf\u00fchrbarkeitsstudien' : ''}
                </div>

                {/* Kopfdaten - Zeile 1 (gelb): Foerderkennzeichen | Datum Zuwendungsbescheid */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">F&ouml;rderkennzeichen</div>
                    <div className="font-medium text-sm bg-yellow-50 border border-gray-300 rounded px-2 py-1 min-h-[28px]">
                      {zaProject?.funding_reference || <span className="text-gray-400 italic">nicht hinterlegt</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Datum Zuwendungsbescheid</div>
                    <div className="text-sm bg-yellow-50 border border-gray-300 rounded px-2 py-1 min-h-[28px] text-gray-800">
                      {zaProjectExtra.bewilligung_datum
                        ? new Date(zaProjectExtra.bewilligung_datum).toLocaleDateString('de-DE')
                        : <span className="text-gray-400 italic">nicht hinterlegt</span>}
                    </div>
                  </div>
                </div>

                {/* Kopfdaten - Zeile 2 (gruen): Projektlaufzeit | Bewilligte Foerdersumme */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Projektlaufzeit</div>
                    <div className="text-sm bg-green-50 border border-gray-300 rounded px-2 py-1 min-h-[28px] text-gray-800">
                      {zaProject?.start_date && zaProject?.end_date
                        ? <>{new Date(zaProject.start_date).toLocaleDateString('de-DE')} &ndash; {new Date(zaProject.end_date).toLocaleDateString('de-DE')}</>
                        : <span className="text-gray-400 italic">nicht hinterlegt</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Bewilligte F&ouml;rdersumme</div>
                    <div className="font-medium text-sm bg-green-50 border border-gray-300 rounded px-2 py-1 min-h-[28px] text-green-800">
                      {zaProjectExtra.bewilligte_summe != null
                        ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(zaProjectExtra.bewilligte_summe)
                        : <span className="text-gray-400 italic font-normal">nicht hinterlegt</span>}
                    </div>
                  </div>
                </div>

                {/* Kopfdaten - Zeile 3: linke Haelfte ZA Nr./von/bis | rechte Haelfte Datum+Button */}
                <div className="grid grid-cols-2 gap-4 mb-4 pb-3 border-b border-gray-300">
                  {/* Linke Haelfte: ZA Nr. | von | bis */}
                  <div className="grid gap-2" style={{ gridTemplateColumns: '5rem 1fr 1fr' }}>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">ZA Nr.</div>
                      <input type="number" min="1" value={zaFormData.za_nummer}
                        onChange={e => { setZAFormData(prev => ({ ...prev, za_nummer: e.target.value })); setHasChanges(true); }}
                        className={`w-full px-2 py-1 text-sm font-medium border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Abrechnungszeitraum von</div>
                      <input type="date" value={zaFormData.zeitraum_von}
                        onChange={e => { setZAFormData(prev => ({ ...prev, zeitraum_von: e.target.value })); setHasChanges(true); }}
                        className={`w-full px-2 py-1 text-sm border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} />
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">bis</div>
                      <input type="date" value={zaFormData.zeitraum_bis}
                        onChange={e => { setZAFormData(prev => ({ ...prev, zeitraum_bis: e.target.value })); setHasChanges(true); }}
                        className={`w-full px-2 py-1 text-sm border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} />
                    </div>
                  </div>
                  {/* Rechte Haelfte: Datum Einreichung + ZA speichern */}
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Datum Einreichung</div>
                    <div className="flex gap-2">
                      <input type="date" value={eingereichtAmEdit}
                        onChange={e => { setEingereichtAmEdit(e.target.value); setHasChanges(true); }}
                        className={`flex-1 px-2 py-1 text-sm border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} />
                      <button onClick={handleSave}
                        disabled={zaSaving || !zaFormData.zeitraum_von || !zaFormData.zeitraum_bis || !!fzGrenzfehler}
                        className={`px-4 py-1 text-sm font-medium rounded border ${colors.btnPrimary} text-white whitespace-nowrap disabled:opacity-50 transition-colors`}>
                        {zaSaving ? 'Speichern...' : 'ZA speichern'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Warnung fehlende Foerderparameter */}
                {!isNetzwerk && (!zaProject?.foerdersatz || !zaProject?.overhead_t) && (
                  <div className="bg-amber-50 border border-amber-300 rounded p-2 text-xs text-amber-700 mb-3">
                    F&ouml;rderparameter (F&ouml;rdersatz, GKZ) sind noch nicht am Projekt hinterlegt.
                    Bitte im Projekt bearbeiten (Tab &Uuml;bersicht &rsaquo; Bearbeiten).
                  </div>
                )}
                {isNetzwerk && nwmFoerderzeitraeumeZA.length === 0 && !zaProjectExtra.bewilligung_datum && !zaProject?.bewilligung_datum && (
                  <div className="bg-amber-50 border border-amber-300 rounded p-2 text-xs text-amber-700 mb-3">
                    Weder F&ouml;rderzeitr&auml;ume noch Bewilligungsdatum hinterlegt. Bitte im Tab Netzwerk &rsaquo; Einstellungen
                    die F&ouml;rderzeitr&auml;ume anlegen, damit F&ouml;rderquote und Netzwerkjahr automatisch ermittelt werden.
                  </div>
                )}
                {/* v7.4.4-69: Warnung wenn ZA-Zeitraum ueber FZ-Grenze geht */}
                {fzGrenzfehler && (
                  <div className="bg-red-50 border border-red-400 rounded p-2 text-xs text-red-800 mb-3">
                    <strong>Ung&uuml;ltiger Abrechnungszeitraum:</strong>{' '}
                    {fzGrenzfehler}
                  </div>
                )}

                {/* NWM-Kostentabelle (nur ZIM_NETZWERK) */}
                {isNetzwerk && (
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-xs font-medium text-gray-700">
                        NWM-Kosten Abrechnungszeitraum
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-gray-500">Netzwerkjahr:</span>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">{nwmLaufzeitjahr}</span>
                        <span className="text-xs text-gray-500 ml-2">F&ouml;rderquote:</span>
                        <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">{nwmFoerdersatz}%</span>
                        {fzMatch && <span className="text-[10px] text-green-600 ml-1">(aus FZ-Tabelle)</span>}
                        {!fzMatch && isNetzwerk && <span className="text-[10px] text-amber-600 ml-1">(Fallback)</span>}
                        <span className="text-xs text-gray-500 ml-2">Eigenanteil:</span>
                        <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">{nwmEigenanteilsquote}%</span>
                      </div>
                    </div>
                    <table className="w-full text-xs border border-gray-400">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="text-left px-2 py-1.5 border border-gray-300 font-medium">Kostenart</th>
                          <th className="text-right px-2 py-1.5 border border-gray-300 font-medium w-40">Betrag [EUR]</th>
                          <th className="px-2 py-1.5 border border-gray-300 font-medium w-48 text-gray-500 text-center">Herkunft</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1.5 border border-gray-300">(1) Personalkosten (f&ouml;rderf&auml;hig)</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(nwmPersonalkosten)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-400 text-[10px]">aus Zeiterfassung</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1.5 border border-gray-300">(2) Auftr&auml;ge an Dritte</td>
                          <td className="px-2 py-1.5 border border-gray-300 p-0">
                            <input type="number" step="0.01" min="0"
                              value={zaFormData.nwm_kosten_dritte}
                              onChange={e => { setZAFormData(prev => ({ ...prev, nwm_kosten_dritte: e.target.value })); setHasChanges(true); }}
                              className={`w-full px-2 py-1.5 text-right border-0 bg-blue-50 ${colors.inputFocus}`}
                              placeholder="0,00" />
                          </td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-400 text-[10px]">manuell (max. 25%)</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1.5 border border-gray-300">(3) &Uuml;brige Kosten (pauschal 100% Personalkosten)</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-gray-50 text-gray-500">{fmt(nwmKostenUebrige)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-400 text-[10px]">automatisch</td>
                        </tr>
                        <tr className="bg-gray-100 font-semibold">
                          <td className="px-2 py-1.5 border border-gray-300">Gesamtkosten NWM</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{fmt(nwmKostenGesamt)}</td>
                          <td className="px-2 py-1.5 border border-gray-300"></td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="px-2 py-1.5 border border-gray-300 text-blue-700">F&ouml;rderbetrag PT ({nwmFoerdersatz}%)</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono text-blue-700">{fmt(nwmFoerderbetrag)}</td>
                          <td className="px-2 py-1.5 border border-gray-300"></td>
                        </tr>
                        <tr className="bg-orange-50">
                          <td className="px-2 py-1.5 border border-gray-300 text-orange-700 font-semibold">Eigenanteil NP gesamt ({nwmEigenanteilsquote}%)</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono text-orange-700 font-semibold">{fmt(nwmEigenanteil)}</td>
                          <td className="px-2 py-1.5 border border-gray-300"></td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-[10px] text-gray-400 mt-1">
                      &Uuml;brige Kosten = 100% der Personalkosten (pauschal lt. ZIM-Richtlinie 2024 Abschnitt 5.3.1c).
                      Auftr&auml;ge an Dritte max. 25% der Gesamtkosten (national) bzw. 35% (international).
                    </p>
                  </div>
                )}

                {/* Kostentabelle (nur NICHT-NWM) */}
                {!isNetzwerk && (
                <div className="text-xs font-medium text-gray-700 mb-1">
                  Zuwendungsf&auml;hige Kosten im Abrechnungszeitraum und anteilige Zuwendung
                </div>
                )}
                {!isNetzwerk && (
                <table className="w-full text-xs border border-gray-400">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left px-2 py-1.5 border border-gray-300 font-medium w-8">Nr.</th>
                      <th className="text-left px-2 py-1.5 border border-gray-300 font-medium">Kostenart</th>
                      {isDS ? (
                        <>
                          <th className="text-right px-2 py-1.5 border border-gray-300 font-medium w-32">entst. Kosten technisch<br />[EUR, Cent]</th>
                          <th className="text-right px-2 py-1.5 border border-gray-300 font-medium w-32">entst. Kosten nichttechn.<br />[EUR, Cent]</th>
                        </>
                      ) : (
                        <>
                          <th className="text-right px-2 py-1.5 border border-gray-300 font-medium w-40">entstandene zuwendungs-<br />f&auml;hige Kosten [EUR, Cent]</th>
                          <th className="text-center px-2 py-1.5 border border-gray-300 font-medium w-24">F&ouml;rdersatz<br />[%]</th>
                          <th className="text-right px-2 py-1.5 border border-gray-300 font-medium w-40">anteilige Zuwendung<br />(Summe gerundet) [EUR, Cent]</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {/* (1) Personal */}
                    <tr>
                      <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(1)</td>
                      <td className="px-2 py-1.5 border border-gray-300">Personal {isDS ? 'technisch' : ''} (lt. Anlage 1b)</td>
                      {isDS ? (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(pkT)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-gray-50 text-gray-400">--</td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(pkGesamt)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                          <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                        </>
                      )}
                    </tr>
                    {/* (2) Zuschlag T */}
                    <tr>
                      <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(2)</td>
                      <td className="px-2 py-1.5 border border-gray-300">
                        Zuschlag f&uuml;r &uuml;brige Kosten{isDS ? ' technisch' : ''}&nbsp;
                        <span className="font-medium">{overheadT}%</span>
                      </td>
                      {isDS ? (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(gkT)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-gray-50 text-gray-400">--</td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(gkT)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                          <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                        </>
                      )}
                    </tr>
                    {/* (3) Personal NT - nur DS */}
                    {isDS && (
                      <tr>
                        <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(3)</td>
                        <td className="px-2 py-1.5 border border-gray-300">Personal nichttechnisch (lt. Anlage 1b)</td>
                        <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-gray-50 text-gray-400">--</td>
                        <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(pkNT)}</td>
                      </tr>
                    )}
                    {/* (4) Zuschlag NT - nur DS */}
                    {isDS && (
                      <tr>
                        <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(4)</td>
                        <td className="px-2 py-1.5 border border-gray-300">
                          Zuschlag f&uuml;r &uuml;brige Kosten nichttechnisch&nbsp;
                          <span className="font-medium">{overheadNT}%</span>
                        </td>
                        <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-gray-50 text-gray-400">--</td>
                        <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(gkNT)}</td>
                      </tr>
                    )}
                    {/* Auftraege Dritte T */}
                    <tr>
                      <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">{isDS ? '(5)' : '(3)'}</td>
                      <td className="px-2 py-1.5 border border-gray-300">Kosten der Auftr&auml;ge an wiss. qual. Dritte{isDS ? ', technisch' : ''}</td>
                      {isDS ? (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300">
                            <input type="number" step="0.01" min="0" value={zaFormData.auftraege_dritte_t}
                              onChange={e => { setZAFormData(prev => ({ ...prev, auftraege_dritte_t: e.target.value })); setHasChanges(true); }}
                              className={`w-full px-1 py-0.5 text-right border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} placeholder="0,00" />
                          </td>
                          <td className="px-2 py-1.5 border border-gray-300 bg-gray-50 text-gray-400 text-right">--</td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300">
                            <input type="number" step="0.01" min="0" value={zaFormData.auftraege_dritte_t}
                              onChange={e => { setZAFormData(prev => ({ ...prev, auftraege_dritte_t: e.target.value })); setHasChanges(true); }}
                              className={`w-full px-1 py-0.5 text-right border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} placeholder="0,00" />
                          </td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                          <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                        </>
                      )}
                    </tr>
                    {/* Auftraege Dritte NT - nur DS */}
                    {isDS && (
                      <tr>
                        <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(6)</td>
                        <td className="px-2 py-1.5 border border-gray-300">Kosten der Auftr&auml;ge an wiss. qual. Dritte, nichttechnisch</td>
                        <td className="px-2 py-1.5 border border-gray-300 bg-gray-50 text-gray-400 text-right">--</td>
                        <td className="px-2 py-1.5 border border-gray-300">
                          <input type="number" step="0.01" min="0" value={zaFormData.auftraege_dritte_nt}
                            onChange={e => setZAFormData(prev => ({ ...prev, auftraege_dritte_nt: e.target.value }))}
                            className={`w-full px-1 py-0.5 text-right border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} placeholder="0,00" />
                        </td>
                      </tr>
                    )}
                    {/* FuE-Unterauftrag - nur ZIM (nicht DS) */}
                    {!isDS && (
                      <tr>
                        <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(4)</td>
                        <td className="px-2 py-1.5 border border-gray-300">FuE-Unterauftrag</td>
                        <td className="px-2 py-1.5 border border-gray-300">
                          <input type="number" step="0.01" min="0" value={zaFormData.fue_unterauftrag}
                            onChange={e => { setZAFormData(prev => ({ ...prev, fue_unterauftrag: e.target.value })); setHasChanges(true); }}
                            className={`w-full px-1 py-0.5 text-right border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} placeholder="0,00" />
                        </td>
                        <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                        <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                      </tr>
                    )}
                    {/* Zeitw. Personalaufnahme - nur ZIM (nicht DS) */}
                    {!isDS && (
                      <tr>
                        <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(5)</td>
                        <td className="px-2 py-1.5 border border-gray-300">Zeitweilige Personalaufnahme</td>
                        <td className="px-2 py-1.5 border border-gray-300">
                          <input type="number" step="0.01" min="0" value={zaFormData.zeitw_personalaufnahme}
                            onChange={e => { setZAFormData(prev => ({ ...prev, zeitw_personalaufnahme: e.target.value })); setHasChanges(true); }}
                            className={`w-full px-1 py-0.5 text-right border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} placeholder="0,00" />
                        </td>
                        <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                        <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                      </tr>
                    )}
                    {/* Summe */}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="px-2 py-1.5 border border-gray-300"></td>
                      <td className="px-2 py-1.5 border border-gray-300">Summe</td>
                      {isDS ? (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{fmt(summeT)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{fmt(summeNT)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{fmt(summeGesamt)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center font-medium">{foerdersatz}%</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono text-green-800">{fmt(antZuwendung)}</td>
                        </>
                      )}
                    </tr>
                    {/* Gesamt + Zuwendung bei DS */}
                    {isDS && (
                      <>
                        <tr className="bg-gray-200 font-semibold">
                          <td className="px-2 py-1.5 border border-gray-300"></td>
                          <td className="px-2 py-1.5 border border-gray-300">Summe gesamt (T + NT)</td>
                          <td colSpan={2} className="px-2 py-1.5 border border-gray-300 text-right font-mono">{fmt(summeGesamt)}</td>
                        </tr>
                        <tr className="bg-green-50 font-semibold">
                          <td className="px-2 py-1.5 border border-gray-300"></td>
                          <td className="px-2 py-1.5 border border-gray-300 text-green-800">Anteilige Zuwendung ({foerdersatz}% F&ouml;rdersatz)</td>
                          <td colSpan={2} className="px-2 py-1.5 border border-gray-300 text-right font-mono text-green-800">{fmt(antZuwendung)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>

                )}
                {/* Interne Notizen */}
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">Interne Notizen (nicht im Formular)</label>
                  <textarea value={zaFormData.notizen}
                    onChange={e => { setZAFormData(prev => ({ ...prev, notizen: e.target.value })); setHasChanges(true); }}
                    rows={2}
                    className={`w-full px-2 py-1.5 text-xs border border-gray-300 rounded ${colors.inputFocus}`}
                    placeholder="Optionale Notizen zur ZA" />
                </div>
              </div>

              {/* Rechtlicher Hinweis ZIM-Formular */}
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div>
                  <div className="font-semibold mb-1">
                    Hinweis: F&uuml;r die Zahlungsanforderungen sind die vorgegebenen Formulare zu verwenden.
                    Diese Daten sind deshalb in das offizielle ZIM-Formular zu &uuml;bertragen.
                    Alle weiteren Informationen entnehmen Sie bitte den Hinweisen des ZIM-Formulars.
                  </div>
                </div>
              </div>

              {/* Speichern */}
            </div>
          )}

          {/* ====== TAB: ANLAGE 1a ====== */}
          {zaTab === 'anlage1a' && (
            <div>
              {(!zaFormData.zeitraum_von || !zaFormData.zeitraum_bis) ? (
                <div className="p-4 text-sm text-gray-500 text-center">Bitte zun&auml;chst im Tab "Deckblatt" den Abrechnungszeitraum festlegen.</div>
              ) : psData.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">Keine Zeiterfassungsdaten im gew&auml;hlten Zeitraum gefunden.</div>
              ) : (
                <div id="za-print-area" translate="no" className="notranslate border-2 border-gray-400 rounded bg-white p-4">
                  <div className="text-center text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                    Zentrales Innovationsprogramm Mittelstand (ZIM) &mdash; Anlage 1a
                  </div>
                  <div className="text-center text-base font-bold mb-3">Abrechnung der f&ouml;rderbaren Personenstunden</div>
                  <div className="grid grid-cols-4 gap-3 mb-4 pb-3 border-b border-gray-300 text-xs">
                    <div><span className="text-gray-500">F&ouml;rderkennzeichen: </span><span className="font-medium">{zaProject?.funding_reference || '--'}</span></div>
                    <div><span className="text-gray-500">zu ZA-Nr.: </span><span className="font-medium">{zaFormData.za_nummer}</span></div>
                    <div><span className="text-gray-500">Zeitraum von: </span><span className="font-medium">{fmtDate(zaFormData.zeitraum_von)}</span></div>
                    <div><span className="text-gray-500">bis: </span><span className="font-medium">{fmtDate(zaFormData.zeitraum_bis)}</span></div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border border-gray-400">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-2 py-1.5 border border-gray-300 text-center w-8">lfd.<br />Nr.</th>
                          <th className="px-2 py-1.5 border border-gray-300 text-left w-36">Projektmitarbeiter(in)<br />(Name, Vorname)</th>
                          <th className="px-2 py-1.5 border border-gray-300 text-center w-24">Monat</th>
                          {isDS ? (
                            <>
                              <th className="px-2 py-1.5 border border-gray-300 text-center">f&ouml;rderbare<br />Std. je Monat<br />[h] techn.</th>
                              <th className="px-2 py-1.5 border border-gray-300 text-center">f&ouml;rderbare<br />Std. je Monat<br />[h] nichttechn.</th>
                              <th className="px-2 py-1.5 border border-gray-300 text-center">Summe<br />[h] techn.</th>
                              <th className="px-2 py-1.5 border border-gray-300 text-center">Summe<br />[h] nichttechn.</th>
                            </>
                          ) : (
                            <>
                              <th className="px-2 py-1.5 border border-gray-300 text-center">f&ouml;rderbare Personenstunden<br />je Monat [h]</th>
                              <th className="px-2 py-1.5 border border-gray-300 text-center">Summe<br />[h]</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {psData.map((row, idx) => (
                          <React.Fragment key={row.empId}>
                            {row.monthData.map((m, mIdx) => (
                              <tr key={`${row.empId}-${m.year}-${m.month}`}
                                className={mIdx === 0 ? 'border-t-2 border-gray-400' : ''}>
                                {mIdx === 0 && (
                                  <>
                                    <td className="px-2 py-1.5 border border-gray-300 text-center align-top" rowSpan={row.monthData.length}>{idx + 1}</td>
                                    <td className="px-2 py-1.5 border border-gray-300 font-medium align-top" rowSpan={row.monthData.length}>{row.empName}</td>
                                  </>
                                )}
                                <td className="px-2 py-1.5 border border-gray-300 text-center whitespace-nowrap">{m.label}</td>
                                {isDS ? (
                                  <>
                                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{m.hoursT > 0 ? m.hoursT.toFixed(2) : ''}</td>
                                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{m.hoursNT > 0 ? m.hoursNT.toFixed(2) : ''}</td>
                                    {mIdx === 0 && (
                                      <>
                                        <td className="px-2 py-1.5 border border-gray-300 text-right font-mono font-semibold bg-blue-50 align-top" rowSpan={row.monthData.length}>{row.totalT > 0 ? row.totalT.toFixed(2) : '--'}</td>
                                        <td className="px-2 py-1.5 border border-gray-300 text-right font-mono font-semibold bg-blue-50 align-top" rowSpan={row.monthData.length}>{row.totalNT > 0 ? row.totalNT.toFixed(2) : '--'}</td>
                                      </>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{m.hoursTotal > 0 ? m.hoursTotal.toFixed(2) : ''}</td>
                                    {mIdx === 0 && (
                                      <td className="px-2 py-1.5 border border-gray-300 text-right font-mono font-semibold bg-blue-50 align-top" rowSpan={row.monthData.length}>{row.totalAll > 0 ? row.totalAll.toFixed(2) : '--'}</td>
                                    )}
                                  </>
                                )}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    F&ouml;rderbare Personenstunden: geleistete Projektbearbeitungsstunden gem&auml;&szlig; Stundennachweisen,
                    jedoch nicht mehr als arbeitsvertraglich vereinbart.
                    Max. f&ouml;rderbare Std. je Monat = Wochenarbeitszeit x 52 (Wochen) : 12 (Monate).
                  </p>
                </div>
              )}
              {/* Rechtlicher Hinweis ZIM-Formular */}
              {psData.length > 0 && zaFormData.zeitraum_von && zaFormData.zeitraum_bis && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800 mt-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div>
                    <div className="font-semibold mb-1">
                      Hinweis: F&uuml;r die Zahlungsanforderungen sind die vorgegebenen Formulare zu verwenden.
                      Diese Daten sind deshalb in das offizielle ZIM-Formular zu &uuml;bertragen.
                      Alle weiteren Informationen entnehmen Sie bitte den Hinweisen des ZIM-Formulars.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====== TAB: ANLAGE 1b ====== */}
          {zaTab === 'anlage1b' && (
            <div>
              {(!zaFormData.zeitraum_von || !zaFormData.zeitraum_bis) ? (
                <div className="p-4 text-sm text-gray-500 text-center">Bitte zun&auml;chst im Tab "Deckblatt" den Abrechnungszeitraum festlegen.</div>
              ) : psData.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">Keine Zeiterfassungsdaten im gew&auml;hlten Zeitraum gefunden.</div>
              ) : (
                <div id="za-print-area" translate="no" className="notranslate border-2 border-gray-400 rounded bg-white p-4">
                  <div className="text-center text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                    Zentrales Innovationsprogramm Mittelstand (ZIM) &mdash; Anlage 1b
                  </div>
                  <div className="text-center text-base font-bold mb-3">Abrechnung der zuwendungsf&auml;higen Personalkosten</div>
                  {/* v7.4.4-59: Sichtbare Warnung, wenn fuer MA gar kein Satz vorliegt */}
                  {(() => {
                    const fehlend = psData
                      .filter(r => getHourlyRate(r.empId, projectId) == null)
                      .map(r => r.empName);
                    if (fehlend.length === 0) return null;
                    return (
                      <div className="mb-3 px-3 py-2 rounded border border-amber-300 bg-amber-50 text-amber-800 text-xs print:hidden">
                        <strong>Achtung:</strong> F&uuml;r folgende Personen ist kein Stundensatz hinterlegt &ndash; deren Personalkosten werden mit 0 gerechnet: {fehlend.join(', ')}. Bitte Gehaltsdaten bzw. anerkannten Satz im Projektteam pflegen.
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-4 gap-3 mb-4 pb-3 border-b border-gray-300 text-xs">
                    <div><span className="text-gray-500">F&ouml;rderkennzeichen: </span><span className="font-medium">{zaProject?.funding_reference || '--'}</span></div>
                    <div><span className="text-gray-500">zu ZA-Nr.: </span><span className="font-medium">{zaFormData.za_nummer}</span></div>
                    <div><span className="text-gray-500">Zeitraum von: </span><span className="font-medium">{fmtDate(zaFormData.zeitraum_von)}</span></div>
                    <div><span className="text-gray-500">bis: </span><span className="font-medium">{fmtDate(zaFormData.zeitraum_bis)}</span></div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border border-gray-400">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-2 py-1.5 border border-gray-300 text-center w-8">lfd.<br />Nr.</th>
                          <th className="px-2 py-1.5 border border-gray-300 text-left">Projektmitarbeiter(in)</th>
                          {isDS ? (
                            <>
                              <th className="px-2 py-1.5 border border-gray-300 text-right">f&ouml;rderbare<br />Std. techn.<br />entspr. 1a (1)<br />[h]</th>
                              <th className="px-2 py-1.5 border border-gray-300 text-right">f&ouml;rderbare<br />Std. nichttechn.<br />entspr. 1a (2)<br />[h]</th>
                            </>
                          ) : (
                            <th className="px-2 py-1.5 border border-gray-300 text-right">f&ouml;rderbare<br />Personenstunden<br />entspr. Anlage 1a<br />[h]</th>
                          )}
                          <th className="px-2 py-1.5 border border-gray-300 text-right">Stundensatz<br />[EUR, Cent/h]</th>
                          {isDS ? (
                            <>
                              <th className="px-2 py-1.5 border border-gray-300 text-right">entst. PK<br />technisch<br />(1) x (3)<br />[EUR, Cent]</th>
                              <th className="px-2 py-1.5 border border-gray-300 text-right">entst. PK<br />nichttechn.<br />(2) x (3)<br />[EUR, Cent]</th>
                            </>
                          ) : (
                            <th className="px-2 py-1.5 border border-gray-300 text-right">entstandene PK<br />Stunden x Satz<br />[EUR, Cent]</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {psData.map((row, idx) => {
                          const rate = getHourlyRate(row.empId, projectId) || 0;
                          const pkRowT = row.totalT * rate;
                          const pkRowNT = row.totalNT * rate;
                          const pkRow = row.totalAll * rate;
                          return (
                            <tr key={row.empId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-2 py-2 border border-gray-300 text-center">{idx + 1}</td>
                              <td className="px-2 py-2 border border-gray-300 font-medium">{row.empName}</td>
                              {isDS ? (
                                <>
                                  <td className="px-2 py-2 border border-gray-300 text-right font-mono">{row.totalT > 0 ? row.totalT.toFixed(2) : '--'}</td>
                                  <td className="px-2 py-2 border border-gray-300 text-right font-mono">{row.totalNT > 0 ? row.totalNT.toFixed(2) : '--'}</td>
                                </>
                              ) : (
                                <td className="px-2 py-2 border border-gray-300 text-right font-mono">{row.totalAll > 0 ? row.totalAll.toFixed(2) : '--'}</td>
                              )}
                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">
                                {rate > 0 ? rate.toFixed(2) : <span className="text-amber-500 font-normal">fehlt!</span>}
                              </td>
                              {isDS ? (
                                <>
                                  <td className="px-2 py-2 border border-gray-300 text-right font-mono font-semibold">{fmt(pkRowT)}</td>
                                  <td className="px-2 py-2 border border-gray-300 text-right font-mono font-semibold">{fmt(pkRowNT)}</td>
                                </>
                              ) : (
                                <td className="px-2 py-2 border border-gray-300 text-right font-mono font-semibold">{fmt(pkRow)}</td>
                              )}
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                          <td colSpan={2} className="px-2 py-2 border border-gray-300 text-right">Summe/&Uuml;bertrag:</td>
                          {isDS ? (
                            <>
                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">{psData.reduce((s, r) => s + r.totalT, 0).toFixed(2)}</td>
                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">{psData.reduce((s, r) => s + r.totalNT, 0).toFixed(2)}</td>
                              <td className="px-2 py-2 border border-gray-300"></td>
                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">{fmt(pkT)}</td>
                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">{fmt(pkNT)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">{psData.reduce((s, r) => s + r.totalAll, 0).toFixed(2)}</td>
                              <td className="px-2 py-2 border border-gray-300"></td>
                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">{fmt(pkGesamt)}</td>
                            </>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Stundensatz = vom Zuwendungsgeber anerkannter personengebundener Stundensatz (aus Projektteam).
                  </p>
                </div>
              )}
              {/* Rechtlicher Hinweis ZIM-Formular */}
              {psData.length > 0 && zaFormData.zeitraum_von && zaFormData.zeitraum_bis && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800 mt-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div>
                    <div className="font-semibold mb-1">
                      Hinweis: F&uuml;r die Zahlungsanforderungen sind die vorgegebenen Formulare zu verwenden.
                      Diese Daten sind deshalb in das offizielle ZIM-Formular zu &uuml;bertragen.
                      Alle weiteren Informationen entnehmen Sie bitte den Hinweisen des ZIM-Formulars.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====== TAB: ARCHIV ====== */}
          {zaTab === 'archiv' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2 px-4 pt-4">
                <h3 className="text-sm font-semibold text-gray-700">Alle Zahlungsanforderungen</h3>
                <div className="flex items-center gap-3">
                  {/* v7.4.4-73: Sammelueberweisung */}
                  {zaList.some(z => !!z.eingereicht_am) && (
                    <button
                      onClick={oeffneSammel}
                      className="text-xs px-2.5 py-1 rounded border bg-white text-gray-600 border-gray-300 hover:border-blue-400 transition-colors">
                      Sammel&uuml;berweisung erfassen
                    </button>
                  )}
                  <span className="text-xs text-gray-400">{zaList.length} ZA gespeichert</span>
                </div>
              </div>
              {zaList.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Noch keine Zahlungsanforderungen gespeichert.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">ZA Nr.</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Zeitraum</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Datum</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Betrag</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Zahlungseingang</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Betrag</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Anmerkung</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">Status</th>
                        <th className="px-3 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {zaList.map((za) => {
                        const statusCfg = getStatusConfig(za.status);
                        const vonDate = za.zeitraum_von ? new Date(za.zeitraum_von).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '--';
                        const bisDate = za.zeitraum_bis ? new Date(za.zeitraum_bis).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '--';
                        const einDate = za.eingereicht_am ? new Date(za.eingereicht_am).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--';
                        const computedBetrag = computeArchivFoerderbetrag(za);
                        const foerderbetrag = computedBetrag > 0
                          ? computedBetrag.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR'
                          : null;
                        const edit = archivEdits[za.id] || { datum: '', betrag: '', kommentar: '', saving: false, saved: false };
                        const isSelected = zaSelectedId === za.id;
                        // v7.4.4-73: Zahlungen der ZA-Nummer; Liste bei >1 Zahlung oder auf Wunsch
                        const eigeneZahlungen = zahlungenFuer(za.za_nummer);
                        const listenModus = eigeneZahlungen.length > 1
                          || (eigeneZahlungen.length > 0 && !!weitereOffen[za.za_nummer]); // v7.4.4-74
                        const zahlungsSumme = summeZahlungen(za.za_nummer);
                        const neu = neueZahlung[za.za_nummer] || { datum: '', betrag: '', kommentar: '', saving: false };
                        return (
                          <React.Fragment key={za.id}>
                          <tr className={`transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-3 py-2 font-semibold text-gray-900 whitespace-nowrap">ZA {za.za_nummer}</td>
                            <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">
                              {vonDate}<br/><span className="text-gray-400">bis</span> {bisDate}
                            </td>
                            <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">{einDate}</td>
                            <td className="px-3 py-2 text-right font-mono text-gray-700 text-xs whitespace-nowrap">
                              {foerderbetrag
                                ? foerderbetrag
                                : <span className="text-gray-400">noch nicht gespeichert</span>}
                            </td>
                            {listenModus ? (
                              <>
                                <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">
                                  {fmtDatumKurz(letztesZahlungsdatum(za.za_nummer))}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-gray-700 text-xs whitespace-nowrap">
                                  {eigeneZahlungen.length > 0
                                    ? fmtEUR(zahlungsSumme) + ' (' + eigeneZahlungen.length + ')'
                                    : '--'}
                                </td>
                                <td className="px-3 py-2 text-gray-400 text-xs italic">siehe Zahlungen</td>
                              </>
                            ) : (!za.eingereicht_am && eigeneZahlungen.length === 0) ? (
                              <>
                                {/* v7.4.4-76: Entwurf - keine Zahlungserfassung */}
                                <td className="px-3 py-2 text-gray-400 text-xs italic whitespace-nowrap">erst nach Einreichung</td>
                                <td className="px-3 py-2 text-right text-gray-400 text-xs">--</td>
                                <td className="px-3 py-2 text-gray-400 text-xs">--</td>
                              </>
                            ) : (
                              <>
                            <td className="px-3 py-2">
                              <input
                                type="date"
                                value={edit.datum}
                                onChange={e => setArchivEdits(prev => ({ ...prev, [za.id]: { ...prev[za.id], datum: e.target.value } }))}
                                className="text-xs border border-gray-300 rounded px-2 py-1 w-36 focus:outline-none focus:border-blue-400"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={edit.betrag}
                                onChange={e => setArchivEdits(prev => ({ ...prev, [za.id]: { ...prev[za.id], betrag: e.target.value } }))}
                                className="text-xs border border-gray-300 rounded px-2 py-1 w-28 text-right font-mono focus:outline-none focus:border-blue-400"
                              />
                              {eigeneZahlungen.length === 1 && !!za.eingereicht_am && (
                                <div className="mt-1">
                                  <button
                                    onClick={() => setWeitereOffen(prev => ({ ...prev, [za.za_nummer]: true }))}
                                    className="text-xs text-blue-600 hover:underline">
                                    + weitere Zahlung
                                  </button>
                                </div>
                              )}
                              {eigeneZahlungen.length === 1 && eigeneZahlungen[0].referenz && (
                                <div className="mt-0.5 text-xs text-gray-400 text-right">{eigeneZahlungen[0].referenz}</div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                placeholder="Anmerkung..."
                                value={edit.kommentar}
                                onChange={e => setArchivEdits(prev => ({ ...prev, [za.id]: { ...prev[za.id], kommentar: e.target.value } }))}
                                className="text-xs border border-gray-300 rounded px-2 py-1 w-40 focus:outline-none focus:border-blue-400"
                              />
                            </td>
                              </>
                            )}
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                                {statusCfg.label}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {!listenModus && (!!za.eingereicht_am || eigeneZahlungen.length > 0) && (
                                <button
                                  onClick={() => handleSaveZahlungseingang(za.id)}
                                  disabled={edit.saving}
                                  className={`text-xs px-2.5 py-1 rounded border transition-colors ${edit.saved ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                                  {edit.saving ? '...' : edit.saved ? 'OK' : 'Sichern'}
                                </button>
                                )}
                                <button
                                  onClick={() => checkUnsavedChanges(() => { loadZAIntoForm(za); setZATab('deckblatt'); })}
                                  className={`text-xs px-2.5 py-1 rounded border transition-colors ${colors.btnZaHover} bg-white text-gray-600 border-gray-300`}>
                                  &Ouml;ffnen
                                </button>
                                <button
                                  onClick={() => handleDeleteZA(za)}
                                  className="text-xs px-2.5 py-1 rounded border border-red-200 bg-white text-red-500 hover:bg-red-50 hover:border-red-400 transition-colors">
                                  L&ouml;schen
                                </button>
                              </div>
                            </td>
                          </tr>
                          {/* v7.4.4-73: Zahlungsliste der ZA */}
                          {listenModus && (
                            <tr className="bg-gray-50">
                              <td></td>
                              <td colSpan={8} className="px-3 pb-3 pt-1">
                                <div className="border border-gray-200 rounded bg-white">
                                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100">
                                    <span className="text-xs font-semibold text-gray-600">
                                      Zahlungseing&auml;nge ZA {za.za_nummer}
                                    </span>
                                    {eigeneZahlungen.length <= 1 && (
                                      <button
                                        onClick={() => setWeitereOffen(prev => ({ ...prev, [za.za_nummer]: false }))}
                                        className="text-xs text-gray-500 hover:underline">
                                        Liste schlie&szlig;en
                                      </button>
                                    )}
                                  </div>
                                  <table className="text-xs">{/* v7.4.4-74: kompakt, nicht volle Breite */}
                                    <tbody className="divide-y divide-gray-100">
                                      {eigeneZahlungen.map(z => {
                                        const ze = zahlungEdits[z.id] || {
                                          datum: z.datum, betrag: String(z.betrag).replace('.', ','),
                                          kommentar: z.kommentar || '', saving: false,
                                        };
                                        const setZe = (patch: Partial<typeof ze>) =>
                                          setZahlungEdits(prev => ({ ...prev, [z.id]: { ...ze, ...patch } }));
                                        const geaendert = !!zahlungEdits[z.id];
                                        const gruppe = z.referenz
                                          ? zahlungen.filter(x => x.referenz === z.referenz && x.datum === z.datum)
                                          : [];
                                        const gruppenSumme = gruppe.reduce((s2, x) => s2 + x.betrag, 0);
                                        return (
                                          <tr key={z.id}>
                                            <td className="px-3 py-1.5">
                                              <input type="date" value={ze.datum}
                                                onChange={e => setZe({ datum: e.target.value })}
                                                className="text-xs border border-gray-300 rounded px-2 py-1 w-36 focus:outline-none focus:border-blue-400" />
                                            </td>
                                            <td className="px-3 py-1.5 text-right">
                                              <input type="text" inputMode="decimal" value={ze.betrag}
                                                onChange={e => setZe({ betrag: e.target.value })}
                                                className="text-xs border border-gray-300 rounded px-2 py-1 w-28 text-right font-mono focus:outline-none focus:border-blue-400" />
                                            </td>
                                            <td className="px-3 py-1.5">
                                              <input type="text" placeholder="Anmerkung..." value={ze.kommentar}
                                                onChange={e => setZe({ kommentar: e.target.value })}
                                                className="text-xs border border-gray-300 rounded px-2 py-1 w-40 focus:outline-none focus:border-blue-400" />
                                            </td>
                                            <td className="px-3 py-1.5 text-gray-500">
                                              {z.referenz
                                                ? 'Teil von ' + fmtEUR(gruppenSumme) + ', ' + z.referenz
                                                : ''}
                                            </td>
                                            <td className="px-3 py-1.5 whitespace-nowrap text-right">
                                              <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                  onClick={() => handleSaveListenZahlung(z)}
                                                  disabled={!geaendert || ze.saving}
                                                  className={`text-xs px-2.5 py-1 rounded border transition-colors ${geaendert ? 'bg-white text-gray-600 border-gray-300 hover:border-blue-400' : 'bg-gray-50 text-gray-300 border-gray-200'}`}>
                                                  {ze.saving ? '...' : 'Sichern'}
                                                </button>
                                                <button
                                                  onClick={() => handleEntferneZahlung(z)}
                                                  className="text-xs px-2.5 py-1 rounded border border-gray-300 bg-white text-gray-600 hover:border-gray-500 transition-colors">
                                                  Zahlung entfernen
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {/* neue Zahlung - v7.4.4-76: nur bei eingereichter ZA */}
                                      {!!za.eingereicht_am && (
                                      <tr className="bg-blue-50/40">
                                        <td className="px-3 py-1.5 whitespace-nowrap">
                                          <span className="text-xs font-semibold text-blue-700 mr-2">Neue Zahlung:</span>
                                          <input type="date" value={neu.datum}
                                            onChange={e => setNeueZahlung(prev => ({ ...prev, [za.za_nummer]: { ...neu, datum: e.target.value } }))}
                                            className="text-xs border border-gray-300 rounded px-2 py-1 w-36 focus:outline-none focus:border-blue-400" />
                                        </td>
                                        <td className="px-3 py-1.5 text-right">
                                          <input type="text" inputMode="decimal" placeholder="0,00" value={neu.betrag}
                                            onChange={e => setNeueZahlung(prev => ({ ...prev, [za.za_nummer]: { ...neu, betrag: e.target.value } }))}
                                            className="text-xs border border-gray-300 rounded px-2 py-1 w-28 text-right font-mono focus:outline-none focus:border-blue-400" />
                                        </td>
                                        <td className="px-3 py-1.5">
                                          <input type="text" placeholder="Anmerkung..." value={neu.kommentar}
                                            onChange={e => setNeueZahlung(prev => ({ ...prev, [za.za_nummer]: { ...neu, kommentar: e.target.value } }))}
                                            className="text-xs border border-gray-300 rounded px-2 py-1 w-40 focus:outline-none focus:border-blue-400" />
                                        </td>
                                        <td></td>
                                        <td className="px-3 py-1.5 text-right">
                                          <button
                                            onClick={() => handleNeueZahlung(za)}
                                            disabled={neu.saving}
                                            className="text-xs px-2.5 py-1 rounded border bg-white text-blue-600 border-blue-300 hover:bg-blue-50 transition-colors">
                                            {neu.saving ? '...' : 'Hinzuf\u00fcgen'}
                                          </button>
                                        </td>
                                      </tr>
                                      )}
                                    </tbody>
                                  </table>
                                  <div className="px-3 py-1.5 border-t border-gray-100 text-xs text-gray-600 text-right">
                                    Summe: <span className="font-mono">{fmtEUR(zahlungsSumme)} EUR</span>
                                    {computedBetrag > 0 && (
                                      <span className="text-gray-400">
                                        {' '}von {fmtEUR(computedBetrag)} EUR angefordert
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Legende */}
              <div className="flex items-center gap-4 pt-2 pb-4 px-4 border-t border-gray-100">
                <span className="text-xs text-gray-400 font-medium">Status:</span>
                {(['entwurf', 'eingereicht', 'volle_zahlung', 'gekuerzte_zahlung'] as const).map(s => {
                  const cfg = getStatusConfig(s);
                  return (
                    <span key={s} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                      {cfg.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>

      {/* v7.4.4-73: Sammelueberweisung erfassen */}
      {sammelOffen && (() => {
        const pr = sammelPruefung();
        const restCent = pr.gesamtCent - pr.verteiltCent;
        const eingereichte = zaList.filter(z => !!z.eingereicht_am);
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Sammel&uuml;berweisung erfassen</h3>
              <p className="text-sm text-gray-500 mb-4">
                Eine &Uuml;berweisung des Projekttr&auml;gers, die mehrere ZA betrifft. Jeder Anteil wird als eigene Zahlung der ZA gespeichert.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Datum Zahlungseingang</div>
                  <input type="date" value={sammel.datum}
                    onChange={e => {
                      const d = e.target.value;
                      setSammel(prev => ({ ...prev, datum: d, referenz: prev.referenzManuell ? prev.referenz : sammelReferenzVorschlag(d) }));
                    }}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Gesamtbetrag (EUR)</div>
                  <input type="text" inputMode="decimal" placeholder="0,00" value={sammel.gesamt}
                    onChange={e => setSammel(prev => ({ ...prev, gesamt: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 text-right font-mono focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Referenz</div>
                  <input type="text" value={sammel.referenz}
                    onChange={e => setSammel(prev => ({ ...prev, referenz: e.target.value, referenzManuell: true }))}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Anmerkung (optional)</div>
                  <input type="text" value={sammel.kommentar}
                    onChange={e => setSammel(prev => ({ ...prev, kommentar: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400" />
                </div>
              </div>
              <div className="text-xs font-semibold text-gray-600 mb-1">Aufteilung auf die ZA</div>
              <div className="border border-gray-200 rounded divide-y divide-gray-100 mb-3 max-h-64 overflow-y-auto">
                {eingereichte.map(z => {
                  const angefordert = computeArchivFoerderbetrag(z);
                  const bisher = summeZahlungen(z.za_nummer);
                  return (
                    <div key={z.id} className="flex items-center justify-between px-3 py-1.5 gap-3">
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">ZA {z.za_nummer}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          angefordert {fmtEUR(angefordert)}, bisher gezahlt {fmtEUR(bisher)}
                        </span>
                      </div>
                      <input type="text" inputMode="decimal" placeholder="0,00"
                        value={sammel.anteile[z.za_nummer] || ''}
                        onChange={e => {
                          const v = e.target.value;
                          setSammel(prev => ({ ...prev, anteile: { ...prev.anteile, [z.za_nummer]: v } }));
                        }}
                        className="text-sm border border-gray-300 rounded px-2 py-1 w-32 text-right font-mono focus:outline-none focus:border-blue-400" />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-gray-600">
                  Aufgeteilt: <span className="font-mono">{fmtEUR(pr.verteiltCent / 100)}</span>
                  {' '}von <span className="font-mono">{fmtEUR(pr.gesamtCent / 100)}</span> EUR
                </span>
                <span className={`font-mono ${restCent === 0 ? 'text-green-700' : 'text-red-600'}`}>
                  Rest {fmtEUR(restCent / 100)}
                </span>
              </div>
              {pr.fehler && (
                <div className="text-sm text-red-600 mb-3">{pr.fehler}</div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSammelOffen(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveSammel}
                  disabled={!!pr.fehler || sammel.saving}
                  className={`px-4 py-2 text-white rounded-lg font-medium ${colors.btnPrimary} ${pr.fehler || sammel.saving ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  {sammel.saving ? 'Speichere...' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Ungespeicherte Aenderungen Dialog - identisch TimesheetForm */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ungespeicherte &Auml;nderungen</h3>
            <p className="text-gray-600 mb-6">
              Sie haben ungespeicherte &Auml;nderungen an der ZA. Was m&ouml;chten Sie tun?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  const callback = showUnsavedDialog;
                  await handleSave();
                  setShowUnsavedDialog(null);
                  callback();
                }}
                style={{ backgroundColor: colors.primary }}
                className="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 font-medium">
                ZA speichern und fortfahren
              </button>
              <button
                onClick={() => {
                  const callback = showUnsavedDialog;
                  setShowUnsavedDialog(null);
                  setHasChanges(false);
                  callback();
                }}
                className="w-full px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200">
                &Auml;nderungen verwerfen
              </button>
              <button
                onClick={() => setShowUnsavedDialog(null)}
                className="w-full px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
