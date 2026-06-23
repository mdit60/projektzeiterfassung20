# GIT-SICHERUNG - Session 56

**Datum:** 23. Juni 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v5.07
**Branch:** v7-dev -> main (beide Remotes)

---

## Zusammenfassung

Drei Themen: (1) PROD-Auslieferung wiederhergestellt, nachdem das
Cubintec-Vercel-Team von Pro auf Hobby zurueckgefallen war und seit Session 54
alle Deployments blockiert hatte. (2) Ein State-Desync im Dashboard behoben, der
bei Mehr-Projekt-Firmen faelschlich "Keine Projektdaten" in der Stundennachweis-
Matrix anzeigte (A-035). (3) downloads/ aufgeraeumt (Keep-2-Politik). Keine
DB-Migration.

---

## PROD-Auslieferung wiederhergestellt (kein Code)

- Symptom: PROD (pze.cubintec-hub.com) lieferte seit Session 54 keine neuen
  Staende mehr aus; der Footer-Marker "Build 43" kam nicht an, obwohl alle
  Commits auf cubintec/main lagen.
- Ursache: Das Cubintec-Vercel-Team war von Pro auf Hobby zurueckgefallen.
  Hobby unterstuetzt keine Teams -> alle Team-Deployments seit Session 54 auf
  "Blocked" (letzter erfolgreicher Ready-Deploy 13.06., Commit 1370346),
  Martins Zugang als Member weg.
- Loesung: Katrin hat Pro reaktiviert und Martin wieder Zugang gegeben.
  WICHTIG: Geblockte Deployments laufen NICHT automatisch wieder an -> ein
  frischer Redeploy musste ausgeloest werden. Danach Footer "Build 43" live
  verifiziert: Matrix v7.4.6-4, cockpit-stundennachweis v7.4.9-6,
  TimesheetForm v7.4.6-42, Footer v7.4.9-2 sind nun tatsaechlich ausgeliefert
  (waren waehrend Session 54-55 nur committet, nicht deployed).

---

## Erledigte Anforderungen

### A-035 - Dashboard-Matrix: State-Desync bei Mehr-Projekt-Firmen

**Dateien:**
- `src/components/shared/BerichtePage.tsx` -> **v7.4.6-18**
- `src/components/shared/StundennachweisMatrix.tsx` -> **v7.4.6-5**

- Symptom: Im Dashboard einer Firma mit zwei Projekten meldete die Stundennachweis-
  Matrix beim Umschalten des oberen Projekt-Dropdowns "Keine Projektdaten
  verfuegbar (Projekt benoetigt Start- und Enddatum)" - obwohl beide Projekte
  Start- und Enddatum hatten. Welches Projekt betroffen war, wechselte je nach
  Navigationsweg ("mal so, mal so").
- Ursache: KEIN Datenproblem, sondern ein Desync zwischen zwei States in
  BerichtePage. Der obere Dropdown setzte nur `selectedReportProjectId` (das
  filtert das an die Matrix uebergebene `projects`-Array auf das gewaehlte
  Projekt). Der zweite State `matrixProjectId` (steuert ueber `activeProjectId`,
  welches Projekt in der Matrix aktiv ist) wurde nur einmal beim Panel-Oeffnen
  gesetzt und beim Dropdown-Wechsel nicht mitgezogen. Folge: Die Matrix erhielt
  nur `[neuesProjekt]`, suchte darin aber das veraltete aktive Projekt -> nicht
  gefunden -> `matrixData` null -> Fehlmeldung. Der Header zeigte trotzdem den
  richtigen Namen, weil `activeProject` auf `projects[0]` zurueckfaellt - das
  machte den Bug zunaechst verwirrend. Der Flip ergab sich daraus, welches
  Projekt zuletzt als `matrixProjectId` haengen blieb.
- Fix BerichtePage v7.4.6-18: Der `onChange` des oberen Dropdowns setzt jetzt
  beide States synchron (`setSelectedReportProjectId(v); setMatrixProjectId(v);`)
  -> der obere Dropdown ist die einzige Wahrheitsquelle, kein Auseinanderlaufen.
- Fix StundennachweisMatrix v7.4.6-5: Selbstheilungs-Guard auf `activeProjectId`
  - liegt `matrixProjectId` nicht im uebergebenen `projects`-Array, faellt die
  Auswahl auf `projects[0]` zurueck statt eine nicht zuordenbare ID zu fuehren.
  Schuetzt auch die uebrigen Aufrufer der Shared-Komponente (u.a.
  cockpit-stundennachweis page). Reiner Lese-Guard, Matrix-Logik (Monate,
  Zellen, Filter) unveraendert.
- Verifiziert live an Selaflex (InGrav/GRAVID): Dropdown laesst sich beliebig
  hin- und herschalten, beide Projekte zeigen stabil ihre Matrix, in beide
  Richtungen. Damit ist auch das geparkte Thema "Silaflex-Admin-Darstellung"
  erledigt (der Admin sieht beim Projektwechsel die korrekte Matrix).

---

## Aufraeumen

- downloads/ nach Keep-2-Politik bereinigt: je versionierter Datei bleiben die
  zwei hoechsten Builds (aktueller Stand + ein Vorgaenger als Rollback), alles
  Aeltere ins downloads/archiv/. Ausgenommen: Verlaufs-/session-Dateien
  (GIT-SICHERUNG-session*) und Dateien ohne Versionsnummer (z.B. *-CURRENT.tsx).
- Werkzeug: `aufraeumen_downloads.py` (Python, Dry-Run als Default, `--apply`
  fuehrt aus, `--keep N` parametrierbar; verschiebt nur ins archiv/, ueberschreibt
  nie, loescht nicht).

---

## Geaenderte Dateien (Deploy-Reihenfolge)

1. `src/components/shared/StundennachweisMatrix.tsx` (v7.4.6-5)
2. `src/components/shared/BerichtePage.tsx` (v7.4.6-18)

Keine DB-Migration in dieser Session.

---

## Doku-Nachzug

- §4.1: BerichtePage 7.4.6-17 -> 7.4.6-18; StundennachweisMatrix 7.4.6-4 ->
  7.4.6-5 (jeweils mit A-035-Notiz).
- §12.1: A-035 als erledigt ergaenzt.
- §13: v5.07-Zeile.
- Pflichtenheft v5.07, Status rotiert (56 -> Status, 55 -> Vorgaenger,
  54 -> Aeltere Sessions).

---

## Erledigt ausserhalb Code (Vercel-Account-Trennung)

Freiberuflicher Account und Cubintec sauber getrennt: freiberufliche E-Mail in
Vercel entfernt, Cubintec-E-Mail als Primary gesetzt -> MD Business Services
taucht nirgends mehr in der Zuordnung auf. Cubintec-Team ist jetzt primaer.

OFFEN (naechste Session, gemeinsam): das Projekt "Yacht" haengt noch unter dem
freiberuflichen Account und soll nach Cubintec transferiert werden. Beim
Vercel-Projekt-Transfer auf Domain-Verifikation, Environment-Variablen und
Git-Anbindung achten; aktuelle Transfer-Prozedur vorher nachschlagen.

---

## Deploy-Notiz

PROD baut nur `main`; Push auf beide Remotes (origin + cubintec). A-035 (Matrix
v7.4.6-5 + BerichtePage v7.4.6-18) ist live verifiziert. Doku-Commit
(Pflichtenheft v5.07 + diese GIT-Sicherung) auf v7-dev, dann Merge nach main und
Push auf beide Remotes. Erinnerung aus dieser Session: geblockte Deployments
nach einer Plan-Reaktivierung immer per frischem Redeploy anstossen - sie
resumen nicht von allein.
