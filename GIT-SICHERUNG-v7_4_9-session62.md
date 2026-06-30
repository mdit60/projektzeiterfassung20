# GIT-SICHERUNG - Session 62

**Datum:** 30. Juni 2026
**SW-Release:** V7.5.2 (Patch - Stundennachweis-Layout, PDF-Dateinamen, Uebersetzungssperre)
**Pflichtenheft:** v5.13
**Branch:** v7-dev (DEV getestet) / main (Deploy ausstehend)
**Deploy-Stand:** AUSSTEHEND - erst nach erfolgreichem DEV-Durchklick (pnpm dev).

---

## Zusammenfassung

Reine UI-/UX-Session am Stundennachweis (Vorgabe Berater), KEINE DB-Migration und
keine funktionale Logik-Aenderung. Drei Dateien betroffen, beide Druckpfade
abgedeckt (Einzeldruck TimesheetForm + Sammeldruck Matrix -> StundennachweisSheet):

1. Optische Bereinigung des Nachweis-Layouts (schwarz, ohne farbige Baender).
2. Schutz gegen Browser-Auto-Uebersetzung (Bug: Projekt "GRAVID" wurde zu
   "SCHWANGER").
3. Sprechende PDF-Dateinamen beim "Als PDF speichern".

Wichtige Erkenntnis dieser Session: Ein im EDITOR scheinbar fehlender oberer
Rahmen der Zeile "sonstige Arbeiten" war KEIN Code-Fehler, sondern ein
Bildschirm-Rendering-Artefakt (border-collapse laesst 1px-Rahmen bei Browser-Zoom
!= 100% weg). Im Druck/PDF war stets alles vollstaendig. Mit Cmd+0 (100% Zoom)
erledigt; der zusaetzlich gesetzte bg-white-Fix bleibt drin (Konsistenz mit den
Fehlzeiten-Zeilen).

---

## Erledigte Punkte (Stundennachweis-Layout)

### Optik (StundennachweisSheet + TimesheetForm printRef + Matrix-Sammeldruck)
- Farbige Zeilen-Baender (Abschnitts-Ueberschriften 1-3, Summenzeilen) und
  farbige Summenzellen (gruen/blau/gelb/rot/violett/amber) ENTFERNT.
- Es bleiben farbig: der orange Monatstage-Kopf, die orangen Kopf-Boxen
  (Titel "Stundennachweis" + FKZ-Box) und die SPALTEN-Schattierung
  (Wochenende grau, Feiertag orange, KA/Abwesenheit) - bewusst.
- Alle Sheet-Schriften schwarz (text-black; T/NT-Marker nicht mehr gruen/blau).
- Summenzeilen UND Summenspalte weiterhin FETT (nur ohne Hintergrundfarbe).
- Warn-Faerbung (Rot) bei Tages-/Monats-Limit-Ueberschreitung bleibt
  unveraendert (Fehlermeldung, keine Deko).
- DS-Summenlabels einzeilig: "Summe foerderbare Stunden (T)" / "(NT)"
  (vorher "- technisch (T)" / "- nicht-technisch (NT)", brach zweizeilig um).
- Fehlzeit-Label: "Urlaub (nur bezahlter Urlaub)".
- Unterschrifts-Labels groesser: text-[9px] print:text-[7px] -> 11px/9px.
- Nachtrag: "sonstige Arbeiten"-Normalzellen bg-white (analog Fehlzeiten-Zeilen)
  -> Rahmen-Konsistenz, Bildschirm-Artefakt entschaerft.

### Uebersetzungssperre (GRAVID -> SCHWANGER)
- translate="no" + CSS-Klasse notranslate auf dem Sheet-Container
  (StundennachweisSheet) bzw. dem printRef-Container (TimesheetForm).
- HTML-Standard, von Firefox/Chrome/Edge respektiert; wirkt fuer Bildschirm und
  Druck, gezielt nur im Stundennachweis (Rest der App bleibt uebersetzbar).

### PDF-Dateinamen (document.title-Swap vor window.print, Restore via afterprint)
- Einzeldruck (TimesheetForm.handlePrint):
  <NN><VV>_<YYMM>_<FKZ>_Stundenerfassung_<Vorname>_<Nachname>
  Bsp.: SF_2510_16DS251601_Stundenerfassung_Ferat_Sarac
- Sammeldruck (StundennachweisMatrix.handleSammeldruck):
  - 1 MA: wie Einzeldruck, Zeitraum YYMM (ein Monat) bzw. YYMM-YYMM (Spanne).
  - mehrere MA: Stundennachweise_<Zeitraum>_<FKZ>.
- NN/VV = erster Buchstabe erster Nachname / erster Vorname; bei mehrteiligen
  Namen (z. B. spanisch) jeweils nur der ERSTE Token; Sonderzeichen -> ASCII
  (Jose, Sarac, ss fuer scharfes s). Per Funktionstest verifiziert.

---

## Geaenderte Dateien

| Datei (downloads) | Ziel in src/ | Version |
|-------------------|--------------|---------|
| StundennachweisSheet-v1_0_3.tsx | src/components/shared/StundennachweisSheet.tsx | 1.0.3 |
| TimesheetForm-v7_4_6-57.tsx | src/components/shared/TimesheetForm.tsx | 7.4.6-57 |
| StundennachweisMatrix-v7_4_6-8.tsx | src/components/shared/StundennachweisMatrix.tsx | 7.4.6-8 |

Hinweis: StundennachweisSheet v1.0.3 baut auf v1.0.1 auf (bedingte
Kurzarbeit-Zeile KA); v1.0.2 + v1.0.3 sind die Layout-Bereinigung dieser Session.

DEV-Integration erfolgte ueber die Skripte integrate-dev-stundennachweis.sh
(Erstintegration -56/-8/1.0.2) und integrate-dev-rahmenfix.sh (-57/1.0.3),
jeweils mit Versionsmarker-Pruefung in src/.

---

## Deploy (AUSZUFUEHREN nach erfolgreichem DEV-Test)

```
git checkout v7-dev && git add src/components/shared/StundennachweisSheet.tsx src/components/shared/TimesheetForm.tsx src/components/shared/StundennachweisMatrix.tsx GIT-SICHERUNG-v7_4_9-session62.md PFLICHTENHEFT-v5_13.md && git commit -m "Stundennachweis: Layout schwarz/entfaerbt, DS-Labels einzeilig, Uebersetzungssperre (translate=no), PDF-Dateinamen Einzel-+Sammeldruck"
git push origin v7-dev
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git push cubintec main && git checkout v7-dev
git rev-parse --short=7 main   # == cubintec/main verifizieren
```

Live-Nachweis nach Deploy: Footer-Build-SHA (A-037) + Abgleich
`git rev-parse --short=7 main` == `git rev-parse --short=7 cubintec/main`.
Funktionscheck in PROD: Einzel- + Sammeldruck "Als PDF speichern" (Dateiname),
GRAVID-Projekt mit aktiver Browser-Uebersetzung (muss GRAVID bleiben).

---

## Offene Punkte (unveraendert)

- A-001 (Berater-Manual), A-006 (FZul-Modul), A-012 (Standalone-Seiten),
  A-013 (Legacy-Cleanup), A-019 (Naming K/C), A-036 (Feiertagszelle
  Ausfallzeiten-Zeile sperren), A-037 (Footer-Build-Marker), A-039 (Footer
  ueberall sichtbar), A-043 (Arbeitsplan/AP-Uebersicht als Druck/PDF).
- A-034-Restpunkt: RLS-Angleich DEV/PROD fuer v7_employee_absences (Backlog).
- Bewusst offen gelassen (Design-Entscheidung Berater): orange Kopf-Boxen
  bleiben farbig; Warn-Rot bei Limit-Ueberschreitung bleibt.
- Parkplatz: Vercel-/Supabase-Transfer in Cubintec-Org; SERVICE_ROLE_KEY-Rotation
  nach Transfer.
