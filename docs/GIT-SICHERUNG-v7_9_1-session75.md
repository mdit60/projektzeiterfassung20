# GIT-SICHERUNG - Session 75 (V7.9.1)

**Datum:** 7. August 2026
**SW-Release:** V7.9.1 (AP-Status Shared-Refactor / A-Variante - in PRODUKTION)
**Pflichtenheft:** v5.34
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_0-session75.md (dort war der Refactor als naechster
Schritt beauftragt; diese Datei dokumentiert seine Umsetzung + Deploy).

**Deploy-Stand:** In PROD zusaetzlich zu V7.9.0: der AP-Status-Refactor nach A-Variante -
ApStatusModal v1.0-3 (zentrale Shared-Komponente), TimesheetForm v7.4.6-78,
StundennachweisMatrix v7.4.6-15. Merge v7-dev -> main (--no-ff), push origin + cubintec,
Vercel-Prod. Kein SQL (reine Frontend-Aenderung).

---

## Ziel dieser Etappe

Umsetzung der in V7.9.0 getroffenen Architektur-Entscheidung fuer den konkreten Fall
AP-Status: **eine** zentrale Uebersicht statt zweier parallel gepflegter Implementierungen
(Inline-Modal in TimesheetForm vs. eigenstaendige ApStatusModal). Ergebnis: die Tabelle
und die Sprung-Logik leben nur noch EINMAL, mit klar definierten Schnittstellen.

---

## 1. ApStatusModal v1.0-3 - die EINZIGE AP-Status-Uebersicht

Die eigenstaendige Komponente (laedt ihre Daten selbst per projectId) ist jetzt die
alleinige Quelle der AP-Status-Uebersicht. Schnittstelle (Props), bewusst klein und klar:

- `open: boolean`, `onClose: () => void`
- `projectId: string`, `projectLabel?: string`
- `showMonthly?: boolean` (Default true) - schaltet das Monats-Aufklappen mehrmonatiger
  APs. Aufrufer im Timesheet reicht `apAnalyseEnabled` hinein (Firmen-Gating); die Matrix
  laesst den Default, da ihr Zugang bereits vollstaendig gegated ist.
- `onJumpToTimesheet?: (employeeId, year, month) => void` - kontextabhaengiger Sprung.
  Fehlt der Callback, sind die MA-Zellen nicht klickbar.

Feature-Paritaet zur frueheren Inline-Fassung ist vollstaendig (MA-Spalten mit gesamt
vorn + Gruppenrahmen, offen gruen / ueberbucht rot, Monats-Aufschluesselung, Direktsprung).

## 2. TimesheetForm v7.4.6-78 - nutzt die Shared-Komponente

- Das bisherige Inline-"Alle AP"-Modal (rund 230 Zeilen) ist ENTFALLEN und durch
  `<ApStatusModal .../>` ersetzt. Ebenfalls entfallen: die nur dafuer gehaltenen States
  (projectBookedPerWpPerMa, plannedHoursPerWpPerMa, projectBookedPerWpPerMaMonth,
  expandedAllApRows), die Memo allApTeam, der Helfer maShortLabel, der Team-Planstunden-
  Ladeeffekt und die MA-/Monats-Akkumulation in reloadBookedHours (projectBookedPerWP fuer
  die Timesheet-Restzahl bleibt).
- `onJumpToTimesheet` = In-Page-Wechsel: checkUnsavedChanges -> MA/Jahr/Monat setzen, Modal
  schliessen. `showMonthly = apAnalyseEnabled`.
- **-78 (Ruecksprung-Fix):** Nach einem In-Page-Sprung fuehrt der erste "Zurueck" des
  Timesheets ZUERST zurueck in die AP-Status-Uebersicht (von dort kam der Sprung), erst der
  naechste "Zurueck" verlaesst das Timesheet (onBack). Merker apReopenOverviewOnBack, gesetzt
  beim Sprung, geprueft im Zurueck-Handler, geloescht beim manuellen Schliessen der Uebersicht.
  Behebt: vorher landete man nach dem Sprung direkt in der aufrufenden Matrix.

## 3. StundennachweisMatrix v7.4.6-15 - Ruecksprung in die Uebersicht

Beim Sprung aus dem AP-Status ins Timesheet wird ein Marker gesetzt
(sessionStorage `pze_apstatus_reopen` = projectId) und ueber onNavigateToZE (inkl. returnUrl)
navigiert. Kehrt der Nutzer in die Matrix zurueck, oeffnet ein Mount-Effekt den AP-Status-
Dialog automatisch wieder und loescht den Marker. So landet man - wie im Timesheet-Weg -
wieder in der Uebersicht statt nur in der Matrix.

---

## Kontext-, nicht Portal-Unterscheidung (umgesetzt)

Das unterschiedliche Sprung-Verhalten haengt am AUFRUFER, nicht am Portal, und wird per
Callback injiziert: Timesheet = In-Page-Wechsel; Matrix = Navigation + Auto-Reopen. Die
Uebersicht selbst (Tabelle, Farben, Aufklappen) ist fuer alle Aufrufer identisch.

---

## Code-Integration (Status) - V7.9.1

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| ApStatusModal-v1_0-3.tsx | src/components/shared/ApStatusModal.tsx | DEPLOYED (zentrale Shared-Komponente) |
| TimesheetForm-v7_4_6-78.tsx | src/components/shared/TimesheetForm.tsx | DEPLOYED (loest -76/-77 ab) |
| StundennachweisMatrix-v7_4_6-15.tsx | src/components/shared/StundennachweisMatrix.tsx | DEPLOYED (loest -13/-14 ab) |

Kein SQL. Deploy: Merge v7-dev -> main (--no-ff), push **origin + cubintec**, Vercel.

Die zuvor nicht deployten Einzelstaende ApStatusModal v1.0-2, TimesheetForm v7.4.6-77 und
StundennachweisMatrix v7.4.6-14 sind mit diesem Refactor abgeloest (aufgegangen).

---

## Verifikation (durch Martin bestaetigt)

- `npm run build` sauber; Sichttest in DEV bestanden.
- Matrix-Weg: AP-Status -> Klick MA-Zelle -> Timesheet -> Zurueck -> Uebersicht oeffnet
  automatisch wieder. OK.
- Timesheet-Weg: Matrix -> Monatszelle -> Timesheet -> "Alle AP" -> Klick MA-Zelle ->
  In-Page-Sprung -> Zurueck -> Uebersicht; naechstes Zurueck -> Matrix. OK (Fix -78).
- In PROD deployed und bestaetigt.

---

## Offen / naechste Schritte

- Uebernommen aus frueheren Sessions: KMU-innovativ PDF-Import; PH §4 Versions-Nachzug;
  Enum-Vereinheitlichung v7_funding_format DEV/PROD; Manuals-Nachzug; Datenhygiene
  Loesch-Kaskade; 'Assistenz GL'-Rolle; Max-foerderbare-Stunden-Chip.
- Doku-Praxis (ab Session 75 wieder aktiv): GIT-Sicherung + Pflichtenheft je Etappe auch
  ins Repo committen (docs/), Push origin + cubintec.

---

## Komponenten / Dateien dieser Etappe (deployed src/)

- src/components/shared/ApStatusModal.tsx (v1.0-3, zentrale Shared-Komponente)
- src/components/shared/TimesheetForm.tsx (v7.4.6-78)
- src/components/shared/StundennachweisMatrix.tsx (v7.4.6-15)

**DB:** keine Aenderung.

**Doku:** PFLICHTENHEFT-v5_34.md; GIT-SICHERUNG-v7_9_1-session75.md (diese Datei);
DEPLOY-PROZESS-PZE.md (unveraendert gueltig: main auf origin + cubintec).
