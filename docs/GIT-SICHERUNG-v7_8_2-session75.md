# GIT-SICHERUNG - Session 75

**Datum:** 6. August 2026
**SW-Release:** V7.8.2 (ZA-Uebersetzungsschutz + AP-Status MA-Uebersicht - in PRODUKTION)
**Pflichtenheft:** v5.32
**Branch:** main = PROD (deployed) / v7-dev
**Deploy-Stand:** **V7.8.2 ist in PROD.** Zwei reine Frontend-Deploys (ZAPanel v7.4.4-64,
TimesheetForm v7.4.6-73), je merge v7-dev -> main (--no-ff), push **origin + cubintec**,
Vercel-Deploy. KEIN SQL / keine DB-Migration. `npm run build` sauber.

---

## Anlass

Zwei Themen aus dem laufenden Betrieb bei einer Kundenfirma (GMM, Durchfuehrbarkeitsstudie AURA):

1. In der Zahlungsanforderung (Anlage 1a) erschien die Monatsspalte bei einer Anwenderin (Katrin)
   verdreht ('25 Dez' statt 'Dez. 25'), bei Martin (Firefox + Chrome) korrekt.
2. Fuer die Korrektur unsauberer Firmenbuchungen fehlte dem Berater eine Gesamtuebersicht, wie viele
   Stunden je AP und je Mitarbeiter geplant und gebucht wurden. Die vorhandene 'Alle AP'-Uebersicht
   hatte nur je eine Spalte fuer geplant/gebucht/offen.

---

## Erledigte Punkte

### 1. ZA-Dokumente von der Browser-Uebersetzung ausnehmen (ZAPanel v7.4.4-64)

- Ursache der verdrehten Monatsdarstellung war NICHT der Code: die Labels werden bereits fest mit
  `toLocaleString('de-DE', {month:'short', year:'2-digit'})` erzeugt (Monat zuerst) und sind fuer
  alle Nutzer identisch. Das Umdrehen entstand durch eine Uebersetzungsschicht IM Browser der
  Anwenderin (Chrome-Seitenuebersetzung 'immer uebersetzen' bzw. Extension wie Immersive Translate),
  die den fertig gerenderten DOM-Text nachtraeglich umbaut.
- Loesung: die drei amtlichen ZA-Dokumentcontainer (Deckblatt, Anlage 1a, Anlage 1b - je
  `#za-print-area`) mit `translate="no"` + class `notranslate` von der Browser-Uebersetzung
  ausgenommen. Beides respektieren sowohl die eingebaute Chrome-Uebersetzung als auch die gaengigen
  Extensions. Damit wird das amtliche Foerderformular bei JEDEM Anwender unveraendert dargestellt.
- Fuer bestehende, korrekt sehende Nutzer aendert sich nichts (Format byte-identisch); Druck-Logik
  (`#za-print-area`) unberuehrt. Reine Anzeige/Robustheit, keine Daten-/Logikaenderung.

### 2. 'Alle AP'-Modal (AP-Status) um MA-Aufschluesselung erweitert (TimesheetForm v7.4.6-66..-73)

- Je Gruppe (geplant / gebucht / offen) jetzt **zuerst 'gesamt', dann eine Spalte pro
  Projekt-Team-Mitarbeiter** (Spaltenkopf 'V.Nachname', z.B. T.Duehrkop). ALLE Werte in STUNDEN
  (keine PM).
- Datenquellen:
  * geplant je MA = `v7_work_package_assignments.planned_person_months x hoursPerPM(pmBasisWAZ)`,
    ueber das GANZE Team geladen (neuer Effekt loadTeamPlanned, State plannedHoursPerWpPerMa).
    'gesamt' bleibt das AP-Soll (total_person_months x hoursPerPM) - weicht es von der Summe der
    MA-Spalten ab, ist der AP geplant, aber nicht vollstaendig je MA verteilt (gewollt sichtbar).
  * gebucht je MA = projektweite Timesheet-Abfrage um `employee_id` erweitert
    (State projectBookedPerWpPerMa); 'gesamt' = projectBookedPerWP (unveraendert).
  * offen je MA = geplant(MA) - gebucht(MA).
- Team-Spalten = ganzes Projekt-Team (aus teamNumbers, nach Team-Nr. sortiert).
- Layout (iterativ -66..-73): gesamt vor den MA-Spalten; jede Gruppe mit dickem Rahmen
  (border-gray-500); gruppierte Zahlenspalten zentriert; Bezeichnung schmal + umbrechend; MA-Koepfe
  brechen nur an Bindestrich/Leerzeichen um; Tabelle inhaltsbasiert (w-auto, text-xs); Modalbreite
  folgt der Tabelle (w-fit + max-w-[96vw]) und waechst/schrumpft automatisch mit der MA-Anzahl;
  Legende/Fusszeile entfernt (Infowert = 0). offene Stunden (+) GRUEN, ueberbuchte (-) ROT, 0 grau.
- Reine Anzeige-Erweiterung; keine Aenderung an Erfassung, Speicherung oder bestehender
  AP-/Buchungslogik. Gilt im Firma- UND Berater-Portal (geteilte Komponente).
- Zwischenfehler behoben: -66 warf einen Runtime-ReferenceError (TDZ), weil die useMemo allApTeam
  die beiden neuen States vor deren Deklaration referenzierte; in -67 die useState-Deklarationen vor
  die Memo gezogen.

---

## DB-Migrationen

KEINE. Beide Themen sind reines Frontend (Komponenten .tsx).

---

## Code-Integration (Status) - Session 75

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| ZAPanel-v7_4_4-64.tsx | src/components/shared/ZAPanel.tsx | INTEGRIERT + DEPLOYED |
| TimesheetForm-v7_4_6-73.tsx | src/components/shared/TimesheetForm.tsx | INTEGRIERT + DEPLOYED |

Hinweis: TimesheetForm -66/-67/-68/-69/-70/-71/-72 waren Iterationen (Feature + TDZ-Fix + Lesbarkeit
+ gesamt-vorn/Rahmen + Zentrierung + Auto-Breite + Farbe); deployt wurde der Endstand -73.

---

## Deploy V7.8.2

- ZAPanel v7.4.4-64: Commit auf v7-dev, merge --no-ff -> main, push origin + cubintec, Vercel-Deploy.
- TimesheetForm v7.4.6-73: Commit auf v7-dev, merge --no-ff -> main, push origin + cubintec,
  Vercel-Deploy.
- Kein SQL, keine DB-Migration.

**WICHTIGE LEHRE (Deploy):** `main` muss auf BEIDE Remotes gepusht werden - `origin` UND `cubintec`.
Die Vercel-Production zieht aus **cubintec**. Ein reiner `origin/main`-Push loest KEINEN Deploy aus
(genau das passierte in dieser Session: origin/main stand schon auf dem -73-Merge, cubintec hing beim
-72-Merge - erst `git push cubintec main` startete den Deploy). Der cubintec-Push ist NICHT optional.
Neu als verbindliche Referenz dokumentiert: **DEPLOY-PROZESS-PZE.md**.

---

## Lehren

- **Locale-abhaengige Formate + Browser-Uebersetzung:** Selbst fest auf 'de-DE' formatierte Werte
  kann eine Uebersetzungsschicht im DOM umbauen. Amtliche Formulare grundsaetzlich mit
  `translate="no"`/`notranslate` gegen Maschinenuebersetzung schuetzen.
- **Anzeige-'gesamt' vs. verteilte MA-Summe:** Bewusst zwei Quellen - AP-Soll (autoritativ) als
  'gesamt', MA-Spalten aus den Einzel-Zuordnungen. Die Differenz macht unvollstaendige Verteilung
  sichtbar (fuer die Berater-Korrektur genau erwuenscht).
- **Deploy-Prozess einmal sauber dokumentieren** statt jede Session neu herzuleiten (Kritik von
  Martin aufgenommen -> DEPLOY-PROZESS-PZE.md).

---

## Offen / naechste Schritte

- Uebernommen aus Session 74: KMU-innovativ PDF-Import bauen; PH §4 Versions-Nachzug (auch fuer
  ZAPanel v7.4.4-64 und TimesheetForm v7.4.6-73 dieser Session); Enum-Vereinheitlichung
  v7_funding_format DEV/PROD; Manuals-Nachzug; Datenhygiene Loesch-Kaskade; 'Assistenz GL'-Rolle;
  Max-foerderbare-Stunden-Chip.
- Optional: Einzeiler im Session-Auftakt-Hinweis, der auf DEPLOY-PROZESS-PZE.md zeigt.

---

## Komponenten / Dateien dieser Session

**Geaendert & deployed (src/):**
- src/components/shared/ZAPanel.tsx (v7.4.4-64)
- src/components/shared/TimesheetForm.tsx (v7.4.6-73)

**DB:** keine.

**Doku:**
- DEPLOY-PROZESS-PZE.md (NEU - verbindlicher Deploy-Ablauf, beide Remotes)
- PFLICHTENHEFT-v5_32.md (Kopf + §13-Eintrag v5.32)
- GIT-SICHERUNG-v7_8_2-session75.md (diese Datei)
