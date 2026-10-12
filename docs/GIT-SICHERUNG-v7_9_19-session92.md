# GIT-SICHERUNG - Session 92 (V7.9.19)

*Stand -2: PROD-Bestaetigung von Deploy 3 (ZA bleibt offen) nachgetragen.*

**Datum:** 12. Oktober 2026
**SW-Release:** V7.9.19 (VN mit bewilligter Zuwendung, Querspruenge ZA/VN/Stundenerfassung,
ZA bleibt nach dem Speichern offen) - in PRODUKTION
**Pflichtenheft:** v5.53
**Verhaltensvertrag:** v1.11
**Deploy-Prozess:** v3 (neu: Abschnitt "Deploy erscheint verzoegert")
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_18-session91.md

**Deploy-Stand:** drei fachliche Deploys an einem Tag, jeweils Commit auf v7-dev, Merge in
main, Push auf origin und cubintec. Erfolg jeweils von Martin in PROD bestaetigt.
**Kein SQL-Schema, keine Datenkorrektur.**

| # | Merge-Commit main | Inhalt |
|---|---|---|
| 1 | df1f09a | "Merge v7-dev: VN bewilligte Zuwendung im Kopf" (VerwendungsnachweisPanel 1.2-8) |
| 2 | b9981c3 | "Merge v7-dev: Querspruenge ZA/VN/Stundenerfassung" (7 Dateien, v7-dev-Commit e951ba3) |
| - | 168b8b7 | "Redeploy-Trigger Querspruenge" - leerer Commit, inhaltsgleich zu b9981c3 (siehe Besonderheiten) |
| 3 | (Hash nicht notiert; per `git log --oneline main` nachvollziehbar) | "Merge v7-dev: ZA bleibt nach Speichern offen" (ZAPanel 7.4.4-89) - Deploy erfolgreich, PROD von Martin bestaetigt (12.10.2026, "ZA bleibt nach Speichern offen") |

---

## Ausloeser

1. Martin: Im Kopf des Verwendungsnachweises fehlt die bewilligte Zuwendung; man soll
   sofort sehen, wie weit sie mit VN bzw. Zahlungsanforderungen ausgeschoepft ist.
2. Martin: Es fehlen Direktspruenge zum VN. Von der ZA erst ins Cockpit und dann zum
   VN bzw. von der Stundenerfassung zurueck und dann zum VN ist umstaendlich.
   Kreuzverbindungen zwischen ZA, VN und Stundenerfassungen mit Ruecksprung gewuenscht.
3. Martin: Nach "ZA speichern" springt das Panel in eine neue ZA. Besser: in der
   gespeicherten ZA bleiben, um alles noch einmal zu kontrollieren; eine neue ZA soll
   bewusst eroeffnet werden.

## Ausgangslage (Befunde vor den Aenderungen)

- bewilligte_summe wurde von VerwendungsnachweisSeite bereits geladen und an das Panel
  durchgereicht, aber nicht angezeigt. Keine Lade- oder Lib-Aenderung noetig.
- Bestehende Spruenge (Session 90): ZA <-> Stundenerfassung, ZA -> Matrix, Matrix -> ZA,
  Stundenerfassung -> ZA, Matrix -> Stundenerfassung. Der Sprung ZA -> Matrix trug kein
  Ruecksprungziel; "Zurueck" der Matrix-Seite war fest aufs Cockpit gesetzt (A-097).
- VN-Route liest ?projekt= und ?returnUrl= (ZA dagegen ?projektId= und ?returnTo=).
- handleSave im ZAPanel rief openPanel(projectId) auf; openPanel setzt immer
  zaSelectedId = null und belegt das Formular mit dem Neu-Entwurf (naechste Nummer). Das
  setZASelectedId(newZA.id) vor dem Aufruf war damit wirkungslos. Der INSERT-Fehler wurde
  nicht ausgewertet.

## Umsetzung

### Deploy 1 - VN bewilligte Zuwendung (A-101)
- VerwendungsnachweisPanel 1.2-8: Kopf "Bewilligte Zuwendung" (rechte Spalte unter
  Foerdersatz, md:col-start-3); darunter Zeile "Ausschoepfung der bewilligten Zuwendung"
  mit Anspruch lt. VN, angefordert lt. ZA (je EUR und Prozent), verbleibend bzw.
  ueberschritten, Balken in Portalfarbe, Hinweis bei Ueberschreitung. Reine Anzeige.

### Deploy 2 - Querspruenge (A-102, erledigt A-097)
- VerwendungsnachweisPanel 1.2-9: Props onNavigateToZA / onNavigateToMatrix, Knoepfe neben
  "Drucken".
- VerwendungsnachweisSeite 1.2-3: Sprungziele (nur Berater), vnUrsprung.
- ZAPanel 7.4.4-88: Prop onNavigateToVN, Knopf "Verwendungsnachweis" (VN-faehige Formate).
- ZASeite 1.0.13: handleNavigateToVN; Matrix-Sprung mit returnUrl; zaUrsprung kennt VN.
- TimesheetForm 7.4.6-102: Knopf "VN" neben "ZA" (Berater, VN-faehige Formate).
- StundennachweisMatrix 7.4.6-23: Knopf "Verwendungsnachweis" neben "Zahlungsanforderung".
- cockpit-stundennachweis-page 7.4.9-8: "Zurueck" honoriert ?returnUrl=.
- Firma-Portal bewusst ohne VN-Knoepfe (VN dort freischaltpflichtig, ZA-Spruenge dort
  ebenfalls nicht vorhanden; A-098).

### Deploy 3 - ZA bleibt nach dem Speichern offen (A-103)
- ZAPanel 7.4.4-89: openPanel(pid, keepZaId?) laedt nach der Laufnummern-Pruefung und ohne
  await dazwischen die ZA keepZaId aus der frischen Liste per loadZAIntoForm. handleSave
  uebergibt die gespeicherte ID (bestehend: zaSelectedId, neu: ID aus dem INSERT).
  INSERT-Fehler wird geworfen und gemeldet. Erstladen, Projektwechsel, "+ Neue ZA"
  unveraendert. Schutzmassnahmen aus -82/-83 (A-092, PROD AURA 22.09.2026) erhalten.

## Code-Integration (Status) - V7.9.19

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| VerwendungsnachweisPanel-v1_2-9.tsx | src/components/shared/VerwendungsnachweisPanel.tsx | DEPLOYED (V7.9.19; -8 zuvor deployed) |
| VerwendungsnachweisSeite-v1_2-3.tsx | src/components/shared/VerwendungsnachweisSeite.tsx | DEPLOYED |
| ZAPanel-v7_4_4-89.tsx | src/components/shared/ZAPanel.tsx | DEPLOYED (V7.9.19; -88 zuvor deployed) |
| ZASeite-v1_0_13.tsx | src/components/shared/ZASeite.tsx | DEPLOYED |
| TimesheetForm-v7_4_6-102.tsx | src/components/shared/TimesheetForm.tsx | DEPLOYED |
| StundennachweisMatrix-v7_4_6-23.tsx | src/components/shared/StundennachweisMatrix.tsx | DEPLOYED |
| cockpit-stundennachweis-page-v7_4_9-8.tsx | src/app/v7/berater/foerderung/firma/[id]/cockpit/stundennachweis/page.tsx | DEPLOYED |

Je Datei: ASCII-Check (0 Nicht-ASCII-Zeilen), Aenderung per Skript mit Eindeutigkeits-
pruefung jeder Ersetzung (Claude); `npm run build` und Test auf DEV bei AS (Martin).

## Test

- Deploy 1: DEV bei AS ("Bewilligungssumme taucht richtig auf"); SAND nur in PROD
  vorhanden -> direkt deployed (reine Anzeige, kein Schreibpfad), PROD bestaetigt.
- Deploy 2: DEV-Runde ZA -> VN -> Matrix -> Stundenerfassung mit "Zurueck"
  ("laeuft einwandfrei"); PROD bestaetigt ("laeuft soweit alles korrekt").
- Deploy 3: DEV drei Faelle (bestehende ZA speichern, "+ Neue ZA" speichern, erneut
  speichern) - "Passt alles"; PROD nach dem Deploy bestaetigt ("ZA bleibt nach
  speichern offen"). Die Test-ZA aus Fall 2 ist in DEV zu
  loeschen (nicht ausdruecklich rueckgemeldet).
- Claude hat die Oberflaeche nicht selbst gesehen.

## Besonderheiten dieser Session

- Vercel zeigte Deploy 2 erst rund zwei Minuten nach dem Push an. Ein vorsorglich
  gelieferter Redeploy-Befehl wurde parallel ausgefuehrt -> zweiter, inhaltsgleicher
  Build (168b8b7). Harmlos. Festgehalten in DEPLOY-PROZESS-PZE v3 und IF-19.
- Prozessfehler Claude: Im ersten Integrationsbefehl stand ein `npx tsc --noEmit` vor dem
  Dev-Start - entgegen DEPLOY-PROZESS (IF-14). Korrigiert, danach nur `npm run build`.
- Session-Auftakt (Versions-Check aller Basisnamen) wurde nicht gefahren; geprueft
  wurden nur die betroffenen Dateien (hoechste Builds, ASCII).
- Das Aufraeum-Skript aus Session 91 wurde offenbar nicht ausgefuehrt (TimesheetForm-98,
  Matrix-20, VERHALTENSVERTRAG-v1_8 u. a. noch in downloads/). Das Skript fuer Session 92
  enthaelt diese Dateien mit und verschiebt aufraeumen-session91-v1.zsh selbst.

## Lehren dieser Session

- Vor einem Redeploy-Trigger warten und `git ls-remote cubintec main` pruefen (IF-19).
- Sprungziele und die Liste der VN-faehigen Formate stehen in mehreren Dateien (IF-18).
- openPanel ist der heikelste Pfad des ZAPanels; Erweiterungen nur ueber optionale
  Parameter und mit dem Drei-Faelle-Test (Verhaltensvertrag 6, fragiler Bereich).

## Offen / naechste Schritte

- A-098 Direktspruenge im Firma-Portal (ZA und VN) - Rollenfrage und VN-Freischaltung.
- A-100 Mehrteilige Nachnamen im PDF-Dateinamen, niedrig.
- A-091 Knopf "ZA speichern und fortfahren" ohne Farbe.
- Etappe 3 (Korrektur-Versionierung), A-090 endgueltig.
- A-088 AS/HEATS PROD-Zahlungsbetraege (Punkt-Fehler) - Martin.
- A-089, A-080 wie Session 89.
- Test-ZA in DEV (AS) loeschen, falls noch vorhanden.

## Doku dieser Session

PFLICHTENHEFT-v5_53-AENDERUNGSBLOCK.md; VERHALTENSVERTRAG-v1_11.md;
DEPLOY-PROZESS-PZE-v3.md; GIT-SICHERUNG-v7_9_19-session92.md (diese Datei);
PZE-Upload-Checkliste-Session92.xlsx; aufraeumen-session92-v1.zsh.
