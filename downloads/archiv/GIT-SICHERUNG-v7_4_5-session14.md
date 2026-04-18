# GIT-Sicherung Session 14 - 8. April 2026

## Status
- Branch: v7-dev + main
- Production: pze.itenion.com - LAEUFT STABIL
- DEV: projektzeiterfassung20-git-v7-dev... - LAEUFT STABIL (nach Revert)

---

## Was in Session 14 erledigt wurde

### 1. NWMEinstellungenPanel v7.4.5-2
Label-Korrektur: "Bewilligungsdatum" -> "Startdatum" (6 Stellen)
Status: Deployed PROD + DEV

### 2. NWM Konzept-Erarbeitung
- Analyse: Phase 1 und Phase 2 sind eigenstaendige Projekte
- YachtConnect PROD-Daten analysiert
- Konzeptpapier KONZEPT-NWM-DATENMODELL-KORREKTUR-v1_1.md erstellt
- ZIM-Formulare analysiert (ZA, Leistungsbestaetigung, Stundennachweis)
- Katrin-Feedback: Abrechnungsperioden frei einstellbar (nicht Quartalszwang)

### 3. DEV-Setup YachtConnect
- migration_nwm_dev_setup_v7_4_5.sql erstellt und in DEV ausgefuehrt
- Daten: 1 Projekt, 8 Partner, 24 EA, 4 ZAs
- Schema-Korrekturen: UNIQUE constraint aufgehoben, 3 neue Felder

### 4. PROD-Migration NWM
- migration_nwm_prod_v7_4_5.sql ausgefuehrt
- phase2_start_datum = NULL
- foerdersatz_stufen korrigiert (gueltig_ab ab 2025-08-01)
- Neue Felder: ist_korrektur, korrektur_zu_id, foerderquote_manuell

### 5. NWMEinstellungenPanel v7.4.5-3
- Neues Datenmodell: start_date/end_date statt phase2_start_datum
- Stufen-Berechnung auf start_date umgestellt
- Deployed PROD + DEV - funktioniert

### 6. Navigation NWM Zurueck-Button (NICHT FERTIG)
Ziel: Zurueck-Button in ProjectDetailPage soll bei Aufruf aus NWM-Liste
      zurueck zur NWM-Liste navigieren statt zur Projektuebersicht.

Problem: SWC-Compiler auf Vercel bricht bei jeder Aenderung der
         ProjectDetailPage.tsx mit "Unterminated regexp literal" ab.
         Lokal (Webpack) funktioniert alles - nur Vercel/SWC hat das Problem.

Versuche: v7.4.4-41 bis v7.4.4-45 - alle gescheitert.
Ursache unklar: Der fehlerhafte Kommentar /* Normal-Ansicht: Haupt-Tabs */
                (ohne geschweifte Klammern) wurde gefunden und entfernt,
                aber der Fehler trat immer wieder an anderen Stellen auf.

Revert: git checkout 16824b5 -- src/components/shared/ProjectDetailPage.tsx
        -> Zurueck auf v7.4.4-40, DEV stabil.

OFFEN: Navigation-Fix muss in neuem Ansatz geloest werden.
Vorschlag: Nicht ProjectDetailPage anfassen, sondern in
           berater-netzwerk-page.tsx einen URL-Parameter ?from=nwm
           setzen und in einer separaten kleinen Komponente auswerten.

---

## Dateien dieser Session

| Dateiname | Zweck | Status |
|-----------|-------|--------|
| NWMEinstellungenPanel-v7_4_5-2.tsx | Label-Fix | deployed |
| NWMEinstellungenPanel-v7_4_5-3.tsx | Neues Datenmodell | deployed |
| migration_nwm_dev_setup_v7_4_5.sql | DEV-Setup YachtConnect | ausgefuehrt DEV |
| migration_nwm_prod_v7_4_5.sql | PROD-Migration | ausgefuehrt PROD |
| KONZEPT-NWM-DATENMODELL-KORREKTUR-v1_1.md | Konzeptpapier | dokumentiert |
| ProjectDetailPage-v7_4_4-41 bis -45 | Fehlgeschlagene Versuche | NICHT deployed |

---

## Aktueller Dateistand (deployed)

| Komponente | Version | Pfad |
|-----------|---------|------|
| NWMEinstellungenPanel | v7.4.5-3 | src/components/shared/NWMEinstellungenPanel.tsx |
| ProjectDetailPage | v7.4.4-40 | src/components/shared/ProjectDetailPage.tsx |

---

## Offene Punkte

| # | Thema | Prioritaet |
|---|-------|-----------|
| 1 | NWM Zurueck-Button Navigation | HOCH - naechste Session |
| 2 | NWM Eigenanteile Abrechnungsperioden frei | MITTEL |
| 3 | PROD Daten korrigieren (foerdersatz_stufen) | ERLEDIGT |
| 4 | GIT-Sicherung + Pflichtenheft aktualisieren | DIESE SESSION |

---

## Lernpunkte Session 14

1. NIEMALS dieselbe Versionsnummer fuer mehrere Iterationen verwenden
2. SWC-Compiler (Vercel) vs Webpack (lokal) haben unterschiedliche
   JSX-Parser-Verhalten - lokaler Build-Test ist nicht ausreichend
3. Bei hartnackigen Build-Fehlern: Minimal-Diff vom Original, nicht
   schrittweise patchen
4. ProjectDetailPage ist eine sehr grosse Datei (2305 Zeilen) -
   SWC hat bekannte Probleme mit grossen JSX-Dateien

---

## Deploy-Sequenz (Revert auf v7.4.4-40)

```bash
git checkout 16824b5 -- src/components/shared/ProjectDetailPage.tsx
git add src/components/shared/ProjectDetailPage.tsx
git commit -m "ProjectDetailPage: Revert auf v7.4.4-40 (16824b5)"
git push origin v7-dev
git commit --allow-empty -m "Trigger redeploy"
git push origin v7-dev
```

---

## Pflichtenheft
Version: 4.57 (unveraendert)
Naechste Version: 4.58 nach Abschluss NWM Navigation-Fix
