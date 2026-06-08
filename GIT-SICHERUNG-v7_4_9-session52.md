# GIT-SICHERUNG - Session 52

**Datum:** 08. Juni 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v5.02
**Branch:** v7-dev -> main (deployed, beide Remotes in sync)

---

## Zusammenfassung

Drei Navigations-/Anzeige-Bugs im App-Paradigma behoben, die nach dem Umstieg auf die
neue Domain pze.cubintec-hub.com gleichzeitig auffielen und faelschlich wie eine
Transfer-Regression wirkten. Tatsaechlich: zwei unabhaengige Code-Ursachen (eine bewusste
Umstellung vom 07.05., ein Parameter-Mismatch in einer neuen App-Seite) plus ein
fehlender Header-Wrapper. Kein Datenverlust, kein verlorenes Deployment - git war
durchgehend konsistent (origin/main = cubintec/main). Zusaetzlich Deploy-Doku korrigiert
(Vercel-Hook haengt jetzt an origin) und das Berater-Manual v1.1 erstellt (undeployed).

---

## Erledigte Anforderungen

### A-026 - Fehlzeiten: Abwesenheitscode in AP-Zelle zaehlt wieder
- **Datei:** `src/components/shared/TimesheetForm.tsx` -> **v7.4.6-23**
- Symptom: "U" (bzw. K/S) in einer AP-Tageszelle wurde angezeigt, aber unten nicht als
  Fehlzeit gezaehlt.
- Ursache: v7.4.6-16 (07.05.) stellte Fehlzeiten auf direkt editierbare U/K/S-Zeilen um
  ("keine Automatik mehr"). `calculateAbsenceSums` liest seither NUR `absenceHoursInput`;
  ein Code in der AP-Zelle lief ins Leere (wurde auch beim Speichern uebersprungen).
- Fix: `handleCellChange` routet einen Abwesenheitscode (U/K/S, F->S) automatisch in die
  passende Fehlzeit-Zeile mit MA-Tagesstunden (`employeeDailyHours`) und leert die AP-Zelle.
  Direkte Eingabe in den unteren Zeilen bleibt unveraendert moeglich. Eingriff nur in
  `handleCellChange`.

### A-027 - Cockpit-Stundennachweis: richtiger Monat + Zurueck ins Cockpit
- **Dateien:**
  - `src/app/v7/berater/foerderung/firma/[id]/cockpit/stundennachweis/page.tsx` -> **v7.4.9-5**
  - `src/app/v7/berater/foerderung/firma/[id]/cockpit/fortschritt/page.tsx` -> **v7.4.9-5**
- Symptom 1: Klick auf eine Matrix-Zelle oeffnete das Timesheet im aktuellen Monat (Juni)
  statt im geklickten Monat (und teils mit falschem MA).
- Ursache 1: Parameter-Mismatch. Die Cockpit-Matrix-Seite uebergab
  `?projekt=&ma=&monat=YYYY-MM`, die Zeiterfassungs-Seite (`.../zeiterfassung`, v7.4.6-2)
  liest aber `?employee=&year=&month=` -> MA und Monat wurden ignoriert, `initialMonth`
  blieb leer, TimesheetForm fiel auf den aktuellen Monat zurueck. Der alte Weg ueber
  "Berichte"/BerichtePage gab die Parameter korrekt mit - daher fiel es erst im
  App-Cockpit-Weg auf, der von Beginn an falsch verdrahtet war (keine Regression).
- Symptom 2: "Zurueck" landete im alten Foerder-Portal (klassische Firmenseite) statt im
  Cockpit.
- Ursache 2: Die Matrix uebergab kein `returnUrl` -> die Zeiterfassungs-Seite nahm ihren
  Default `/v7/berater/foerderung/firma/[id]`. Zusaetzlich nutzte die Matrix-Seite selbst
  `router.back()` (nicht-deterministisch nach Hin-und-Her).
- Fix: `handleNavigateToZE` gibt jetzt `?employee=&year=&month=&returnUrl=<Matrix>` mit;
  "Zurueck" beider Cockpit-Seiten fuehrt deterministisch ins Firma-Cockpit (App-Modus
  `/app/firma/[id]` bzw. klassisch `/foerderung/firma/[id]/cockpit`, ueber
  `localStorage pze_mode`). Zeiterfassungs-Seite unveraendert (liest bereits korrekt).
- Bewusst offen gelassen (kein Scope-Creep): Die Zeiterfassungs-Seite liest kein `projekt`;
  bei Firmen mit mehreren aktiven Projekten ist ggf. das Default-Projekt vorgewaehlt. Bei
  1-Projekt-Firmen unsichtbar. Projekt-Deep-Link nur auf Wunsch als eigener Schritt.

### A-028 - App-Firmenseite: fehlender PortalHeader
- **Datei:** `src/app/v7/berater/app/firma/[id]/page.tsx` -> **v1.0.1**
- Symptom: Auf der App-Firmenseite fehlte oben der blaue Header-Balken komplett.
- Ursache: `FirmaCockpit` rendert den Header NICHT selbst (nur die Nav/PortalNav) - das
  liefert immer die Wrapper-Seite. Die App-Firmenseite (v1.0.0) war ein Minimal-Wrapper
  und rendert nur `<FirmaCockpit/>`. Klassische Cockpit-Seite und App-Cockpit-Landing
  liefern den Header dagegen korrekt.
- Fix: Wrapper auf das bewaehrte Muster der klassischen Cockpit-Seite gebracht (Auth-Check,
  Laden von Benutzer + Firmenname, Loading-State, `<PortalHeader portal="berater" .../>` +
  `<FirmaCockpit/>`). Kein `AppNav` ergaenzt (FirmaCockpit rendert die Nav selbst).

---

## Diagnose-Hinweis (fuer kuenftige Sessions)

Mehrere "laengst gefixte" Symptome traten gleichzeitig mit dem Domain-Umzug auf
pze.cubintec-hub.com auf -> erster Verdacht "Deployment kam nicht an / Transfer hat Code
zurueckgesetzt". Beides FALSCH. Verifikationskette, die das aufgeloest hat:
1. `git fetch --all` + `git log origin/main` vs `cubintec/main`: identisch -> Git sauber,
   keine fehlgeschlagenen Pushes.
2. Vercel Deployments: aktueller Commit als Production "Ready", gebaut aus Repo
   projektzeiterfassung20.
3. History der betroffenen Dateien (`git log --all -- <datei>`): lueckenlos, kein Reset
   beim Transfer (TimesheetForm sauber bis v7.4.6-22 vom 01.06.).
4. Echte deployte Seiten via `git show origin/main:<pfad>` gezogen -> der Parameter-Mismatch
   stand wirklich im Code (kein Cache, kein fehlendes Deployment).

Lehre: Bei "alles auf einmal alt" zuerst git-Konsistenz + deployten Code pruefen, nicht
vorschnell Deployment oder Transfer verdaechtigen. Hartes Neuladen (Cmd+Shift+R) nach
Domain-Wechsel zum Cache-Ausschluss.

---

## DEPLOY-KORREKTUR (Prozess, kein Code-Item)

v5.01 dokumentierte den Vercel-Build-Hook auf dem Remote **cubintec**. Stand Session 52
(laut Vercel-Dashboard) haengt der Hook am Repo **projektzeiterfassung20 (origin)** - das
aktuelle Production-Deployment wurde von dort gebaut. Vermutlich beim Domain-Umzug auf
pze.cubintec-hub.com umgestellt. **Regel bleibt unveraendert: PROD-Deploy IMMER auf BEIDE
Remotes pushen** (`git push origin main && git push cubintec main`) - deckt beide Setups ab.
Im Zweifel den aktiven Hook im Vercel-Dashboard pruefen. PH §10.1 und §12c entsprechend auf
Beide-Push korrigiert. Produktions-URL jetzt **pze.cubintec-hub.com** (301/308-Redirect von
pze.itenion.com).

---

## Offen / nicht deployed

- **A-001 Berater-Manual:** `PZE-Berater-Portal-Anleitung-v1_1.docx` erstellt (saubere docx,
  URL-Migration pze.itenion.com -> pze.cubintec-hub.com, E-Mail-Referenzen @cubintec.com
  unveraendert, Version/Datum auf v1.1 / Juni 2026). NICHT deployed - Martin arbeitet
  inhaltliche Korrekturen ein (-> v1.2). Liegt untracked in `public/manuals/`.

---

## Deploy

- KEINE DB-Migration.
- Drei chirurgische Commits (nur betroffene Dateien): (1) TimesheetForm v7.4.6-23;
  (2) Cockpit-Seiten v7.4.9-5 (stundennachweis + fortschritt); (3) App-Firmenseite v1.0.1.
- `v7-dev -> main`, Push auf **origin + cubintec**. Sicherheits-Sweep am Sessionende
  bestaetigt: beide Remotes in sync, working tree fuer alle vier Code-Dateien sauber.
- Komponentenversionen: TimesheetForm v7.4.6-23, cockpit/stundennachweis page v7.4.9-5,
  cockpit/fortschritt page v7.4.9-5, app/firma page v1.0.1.
