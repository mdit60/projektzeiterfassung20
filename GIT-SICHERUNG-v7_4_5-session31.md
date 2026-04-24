# GIT-SICHERUNG SESSION 31
**Datum:** 24. April 2026
**Version:** v7.4.5
**Status:** Vollstaendig abgeschlossen, alles in PROD

---

## ERLEDIGTE AUFGABEN

### 1. Zielerreichungs-Prognose im ProjektFortschrittPanel (Kernfeature)

**Finale Datei:** `ProjektFortschrittPanel-v7_4_5-11.tsx`
-> `src/components/shared/ProjektFortschrittPanel.tsx`

Komplett neue Prognose-Sektion unterhalb des Monatsverlauf-Diagramms.
Iterationen v7.4.5-5 bis -11 (7 Iterationen):

**Diagramm-Erweiterungen:**
- Projektions-Linie (gestrichelt, orange): Ist-Kurve bei aktuellem Tempo fortgeschrieben
- Zieltempo-Linie (gestrichelt, gruen): Verlauf wenn ab jetzt Zieltempo gefahren wird
- Farbkodierung der Projektions-Linie: gruen (>=90%), gelb (60-89%), rot (<60%)
- Basis: Durchschnitt der letzten 3 abgeschlossenen Monate

**Prognose-Block (3-Spalten-Layout):**

Spalte 1 - Hochrechnung (volle Breite oben):
- Ziel (Plan) / Bisher verbucht / Prognose gesamt nebeneinander
- Fortschrittsbalken farbkodiert
- Fehlende Stunden bei aktuellem Tempo
- Basis-Angabe (h/Monat Team, Anzahl Monate)

Spalte 2 - Aktuelle Situation:
- Aktive MA vs. Gesamt (mit GF+MA-Aufschluesselung)
- Intensitaet je MA (h/Tag) -- NICHT Team-Summe
- Team gesamt (h/Tag) als Kontext
- GF-Obergrenzen (50%-Regel ZIM) wenn relevant

Spalte 3 - Was waere noetig?:
- Szenario 1: Weiter wie bisher (X aktive MA)
- Szenario 2/3: Vollast oder 100%-Ziel (alle N MA)
- Je Szenario: h/Tag je MA + Team-Summe
- Erreichbarkeit (gruen/rot) geprueft gegen individuelle Obergrenzen
- Disclaimer: Durchschnittswerte zur Orientierung

Spalte 4 - Foerder-Konsequenzen (nur wenn Stundensaetze + Foerdersatz hinterlegt):
- Abrufbare Foerdermittel bei aktuellem Tempo
- Erreichungsgrad %
- Verschenkte Foerdermittel (rot hervorgehoben)
- Bei 100% Zielerreichung: Abrufbar + 0 EUR verschenkt
- Basis: echte Stundensaetze aus v7_project_assignments, kein Schaetzen

**Korrekturen im Verlauf:**
- GF-Erkennung via position_title (50%-Regel ZIM beruecksichtigt)
- Team-Maximum korrekt aus Summe individueller Obergrenzen
- Teilzeit-Obergrenzen: weekly_hours/5 je MA
- Prognose erst ab >10% Laufzeit verstrichen (Fruehphase ausgeblendet)

---

### 2. BerichtePage UI-Verbesserungen

**Finale Datei:** `BerichtePage-v7_4_6-3.tsx`
-> `src/components/shared/BerichtePage.tsx`

- **Accordion-Prinzip:** Klick auf Report-Kachel oeffnet diese und schliesst
  alle anderen automatisch. Einzelner activePanel-State ersetzt 4 separate
  showX-States. Zweiter Klick schliesst aktive Kachel (Toggle).
- **Zeiterfassungs-Status verschoben:** Block aus Hauptseite entfernt,
  jetzt unterhalb der StundennachweisMatrix (erscheint nur wenn Matrix offen).
  Hauptseite zeigt nun: Kacheln -> Projektübersicht -> Reports (ohne MA-Tabelle).
- **Doppelter Kundenfirmen-Link entfernt:** Nach PortalNav-Fix war der Link
  in der Seite selbst redundant.

---

### 3. PortalNav Kundenfirmen immer sichtbar

**Finale Datei:** `PortalNav-v7_4_4-4.tsx`
-> `src/components/shared/PortalNav.tsx`

- "Kundenfirmen" wird jetzt nur auf der exakten Listenseite
  (/v7/berater/foerderung) ausgeblendet, nicht auf Unterseiten
  (Firma-Detail, Berichte, Zeiterfassung, Projekt-Detail).
- Alle anderen Nav-Eintraege bleiben kontextsensitiv wie bisher.

---

### 4. Offener Punkt: NWM-Prognose

NWM-Projekte (ZIM_NETZWERK) haben mehrere Netzwerkjahre mit unterschiedlichen
Foerderquoten (z.B. Jahr 1=70%, Jahr 2=50%). Das ProjektFortschrittPanel zeigt
fuer NWM-Projekte aktuell einen einfachen linearen Verlauf ohne Beruecksichtigung
der Jahresgrenzen und gestuften Foerdersaetze.

Die Tabellen v7_nwm_foerderzeitraeume und v7_nwm_ap_planung existieren bereits
in PROD und werden von der Kapazitaetsplanung genutzt.

**Geplant fuer Session 32:**
- Soll-Berechnung aus v7_nwm_ap_planung statt v7_work_package_assignments
- Monatsverlauf mit Knick an Netzwerkjahr-Grenze
- Foerder-Konsequenzen je Netzwerkjahr separat (Jahr 1 / Jahr 2)

---

## AKTUELLE VERSIONSNUMMERN (PROD)

| Datei | Version | Pfad | Status |
|-------|---------|------|--------|
| ProjektFortschrittPanel | v7.4.5-11 | src/components/shared/ProjektFortschrittPanel.tsx | PROD |
| BerichtePage | v7.4.6-3 | src/components/shared/BerichtePage.tsx | PROD |
| PortalNav | v7.4.4-4 | src/components/shared/PortalNav.tsx | PROD |
| berater-multiprojekt-page | v7.4.8-11 | src/app/v7/berater/multiprojekt/page.tsx | PROD |
| berater-multiprojekt-detail | v7.4.8-12 | src/app/v7/berater/multiprojekt/[id]/page.tsx | PROD |
| berater-dashboard | v7.4.4-13 | src/app/v7/berater/dashboard/page.tsx | PROD |
| ProjectDetailPage | v7.4.4-54 | src/components/shared/ProjectDetailPage.tsx | PROD |
| WorkPackageTable | v7.4.3-11 | src/components/shared/WorkPackageTable.tsx | PROD |
| StundennachweisMatrix | v7.4.6-1 | src/components/shared/StundennachweisMatrix.tsx | PROD |
| ZAPanel | v7.4.4-30 | src/components/shared/ZAPanel.tsx | PROD |
| TimesheetForm | v7.4.6-4 | src/components/shared/TimesheetForm.tsx | PROD |
| v7-types | v7.4.8-1 | src/lib/v7-types.ts | PROD |
| v7-module-config | v7.3.90-7 | src/lib/v7-module-config.ts | PROD |

---

## OFFENE PUNKTE FUER SESSION 32

**Prioritaet 1 - NWM-Prognose im ProjektFortschrittPanel:**
Monatsverlauf und Foerder-Konsequenzen fuer ZIM_NETZWERK-Projekte mit
gestuften Foerderquoten je Netzwerkjahr. Daten aus v7_nwm_foerderzeitraeume
und v7_nwm_ap_planung nutzen (bereits in PROD vorhanden).

**Prioritaet 2 - User Manuals aktualisieren:**
PL + Admin Manuals (v2.0) sind veraltet. Fehlende Dokumentation:
ZA-Modul, NWM-Modul, Notizen-Funktion, Monats-Einschraenkung,
Feiertagsregion, Teilzeit-Historie, AP-Dropdown-Filter.

**Prioritaet 3 - Berater-Portal Manual:**
Noch nicht vorhanden. Fuer Rollout an Kundenberater erforderlich.

**Prioritaet 4 - Arbeitszeitgrenzen Phase 3:**
Live-Validierung Ampel-Trio (Monat/GF/Tag) in TimesheetForm +
StundennachweisMatrix + BerichtePage.

**Prioritaet 5 - Unique Constraint v7_timesheets:**
Verhindert kuenftige Duplikate. Sorgfaeltige Planung erforderlich
(legitime Mehrfachbuchungen verschiedener APs am gleichen Tag erlaubt).

**Prioritaet 6 - NWM Jahresabrechnung pruefen:**
Gestufte Foerderquoten in ZAPanel korrekt beruecksichtigt?
Laufzeitjahr-Erkennung und Eigenanteil-Berechnung verifizieren.
