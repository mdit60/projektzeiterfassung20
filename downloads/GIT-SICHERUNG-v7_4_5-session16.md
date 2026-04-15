# GIT-SICHERUNG - Session 16
**Datum:** 15. April 2026
**Ort:** Rhodos
**SW-Release:** V7.4.5
**Pflichtenheft:** v4.59

---

## Session-Ziel
4 kurzfristige Korrekturen aus der offenen Punkte-Liste abarbeiten.

---

## Erledigte Aufgaben

### 1. ZA-Rollback Bewilligt -> Eingereicht (ZAPanel-v7_4_4-27)
- **Problem:** Bei Status "Bewilligt" gab es nur "Zurueck zu Entwurf" (zu weit zurueck)
- **Fix:** Zweiter Button "Zurueck zu Eingereicht" (blau) ergaenzt
- **Datei:** ZAPanel-v7_4_4-27.tsx
- **Deploy:** PROD deployed, getestet OK

### 2. NWM Perioden-Dropdown entfernt (NWMEigenanteilPanel-v7_4_5-12)
- **Problem:** Dropdown mit Periodenvorschlaegen war unnoetig, verwirrend
- **Fix:** Nur noch freie Von/Bis-Datumsfelder, kein Dropdown mehr
- **Datei:** NWMEigenanteilPanel-v7_4_5-12.tsx
- **Deploy:** PROD deployed, getestet OK

### 3. NWM EA USt-Anteil statt Brutto (NWMEigenanteilPanel-v7_4_5-12)
- **Problem:** Archiv + Abrechnung zeigten "EA Brutto" - sollte "USt-Anteil" sein
- **Fix:** Spaltenheader + Datenwerte auf ust_betrag umgestellt
  - Archiv-Tab: "EA brutto" -> "USt-Anteil", summeBrutto -> summeUst
  - Abrechnung-Tab: "Brutto (EUR)" -> "USt-Anteil (EUR)", betrag_brutto -> ust_betrag
  - Archiv-Query: ust_betrag hinzugefuegt
  - Typ-Definition: summeUst ergaenzt
- **Datei:** NWMEigenanteilPanel-v7_4_5-12.tsx (gemeinsam mit Punkt 2)
- **Deploy:** PROD deployed, getestet OK

### 4. Stundennachweis Wording ZIM_NETZWERK (TimesheetForm-v7_4_3-14)
- **Problem:** Abschnitt 1 zeigte immer "foerderbare Projektarbeiten" - bei NWM falsch
- **Fix:** isNetzwerk-Flag ergaenzt; bei ZIM_NETZWERK: "Management-Arbeiten"
- **Datei:** TimesheetForm-v7_4_3-14.tsx
- **Deploy:** PROD deployed, getestet OK

---

## Aktueller Dateistand (deployed PROD)

| Komponente | Version | Pfad |
|---|---|---|
| ZAPanel | v7.4.4-27 | src/components/shared/ZAPanel.tsx |
| NWMEigenanteilPanel | v7.4.5-12 | src/components/shared/NWMEigenanteilPanel.tsx |
| TimesheetForm | v7.4.3-14 | src/components/shared/TimesheetForm.tsx |
| NWMEinstellungenPanel | v7.4.5-3 | src/components/shared/NWMEinstellungenPanel.tsx |
| ProjectDetailPage | v7.4.4-40 | src/components/shared/ProjectDetailPage.tsx |
| BerichtePage | v7.4.4-1 | src/components/shared/BerichtePage.tsx |
| berater-firma-detail-page | v7.4.4-4 | src/app/v7/berater/foerderung/firma/[id]/page.tsx |
| berater-ze-seite | v7.4.0-4 | src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx |
| foerderung-page | v7.4.1-3 | src/app/v7/berater/foerderung/page.tsx |

---

## Lernpunkte Session 16

1. **Downloads-Pfad:** Immer `~/Documents/Dev/PZE/downloads/` - NICHT `~/Downloads/`
   (steht in den Memories, darf nicht nochmal passieren)
2. **Versionskonflikte:** Vor Erstellen einer neuen Datei pruefen ob der Name
   bereits im downloads/-Ordner existiert. Falls ja: Nummer erhoehen.
   Heute: TimesheetForm-v7_4_3-13 bereits vorhanden -> auf -14 gegangen.
3. **Gestaffelte Foerderquoten ZIM_NETZWERK:** Bereits vollstaendig implementiert
   (ZAPanel ermittelt Satz automatisch aus foerdersatz_stufen). Kein Handlungsbedarf.

---

## Offene Punkte

| # | Thema | Prioritaet |
|---|---|---|
| 1 | Berater-Portal Benutzerhandbuch PDF | NIEDRIG |
| 2 | NWM Eigenanteile: Abrechnungsperioden Katrin-Abstimmung | NIEDRIG |
| 3 | SWC-Bug ProjectDetailPage analysieren | OFFEN |
| 4 | Umlaut-Bereinigung UI-Texte (ue/ae/oe -> ae/oe/ue) | ZUKUNFT |
| 5 | Multiprojekt-Tool | ZUKUNFT |
| 6 | Forschungszulage-Modul | ZUKUNFT |
| 7 | SaaS Selbstregistrierung | ZUKUNFT |
| 8 | RLS vollstaendig planen + ausfuehren | ZUKUNFT |

---

## Dateien dieser Session

| Dateiname | Zweck | Status |
|---|---|---|
| ZAPanel-v7_4_4-27.tsx | ZA Rollback Bewilligt->Eingereicht | deployed |
| NWMEigenanteilPanel-v7_4_5-12.tsx | Dropdown entfernt + USt-Anteil | deployed |
| TimesheetForm-v7_4_3-14.tsx | Management-Arbeiten Wording NWM | deployed |
| GIT-SICHERUNG-v7_4_5-session16.md | diese Datei | - |
| PFLICHTENHEFT-v4_59.md | Pflichtenheft aktualisiert | - |

---

## Deploy-Sequenz Session 16

```bash
cp ~/Documents/Dev/PZE/downloads/ZAPanel-v7_4_4-27.tsx src/components/shared/ZAPanel.tsx
cp ~/Documents/Dev/PZE/downloads/NWMEigenanteilPanel-v7_4_5-12.tsx src/components/shared/NWMEigenanteilPanel.tsx
cp ~/Documents/Dev/PZE/downloads/TimesheetForm-v7_4_3-14.tsx src/components/shared/TimesheetForm.tsx
git add -A
git commit -m "session16: ZAPanel-27 Rollback Bewilligt->Eingereicht, NWMEigenanteilPanel-12 USt-Anteil+kein Dropdown, TimesheetForm-14 Management-Arbeiten NWM"
git push origin v7-dev
git checkout main && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```

---

## Pflichtenheft
Version: 4.59
Datei: PFLICHTENHEFT-v4_59.md
