# GIT-Sicherung Session 12 - 2. April 2026

## Status
- Branch: v7-dev + main
- Production: pze.itenion.com - LAEUFT STABIL
- RLS: Vollstaendig aktiv in PROD (alle Tabellen)

---

## Was in Session 12 erledigt wurde

### 1. Projektname + FKZ + Foerderformat in allen Report-Panels

Alle drei Report-Panels zeigen jetzt einheitlich:
Projektname · FKZ · Foerderformat-Klartext (z.B. "ZIM Durchfuehrbarkeitsstudie")

Foerderformat-Labels aus ProjectCreateForm uebernommen:
- ZIM -> ZIM Einzelprojekt
- ZIM_KOOP -> ZIM Kooperationsprojekt
- ZIM_NETZWERK -> ZIM Netzwerk-Management
- ZIM_DS -> ZIM Durchfuehrbarkeitsstudie
- BMBF -> BMBF Foerderung
- BMBF_DS -> BMBF Durchfuehrbarkeitsstudie

Betroffene Panels:
- ProjektFortschrittPanel (v7.4.5-4): Projektname + FKZ + Format
- ZAPanel (v7.4.4-25): Projektname + FKZ + Format statt hardcodiertem "DS-Formular"
- StundennachweisMatrix: Als neue Shared Component (siehe unten)

### 2. StundennachweisMatrix als Shared Component (v7.4.4-1)

Problem: Stundennachweis-Matrix war doppelt implementiert in:
- berichte-page (Firmen-Portal)
- berater-berichte-page (Berater-Portal)

Beide hatten unterschiedliche Stände -> Inkonsistenz und Mehrfachpflege.

Loesung: Neue Shared Component StundennachweisMatrix.tsx
- Einmalige Implementierung in /components/shared/
- portal-Prop steuert Farbe und ZE-Navigation-URL
- Beide Portale importieren dieselbe Component
- Projektname + FKZ + Foerderformat korrekt angezeigt

Lernlektion: Berater-Berichte liegt unter
/v7/berater/foerderung/firma/[id]/berichte/page.tsx
(NICHT unter /v7/berater/berichte/ - falscher Pfad war Ursache fuer mehrere fehlgeschlagene Deploys)

### 3. Korrekte Ablage-Pfade dokumentiert

| Component | Pfad |
|-----------|------|
| StundennachweisMatrix | src/components/shared/StundennachweisMatrix.tsx |
| Firmen-Berichte | src/app/v7/firma/berichte/page.tsx |
| Berater-Berichte | src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx |
| ProjektFortschrittPanel | src/components/shared/ProjektFortschrittPanel.tsx |
| ZAPanel | src/components/shared/ZAPanel.tsx |

---

## Dateien dieser Session

| Dateiname | Ablage | Version |
|-----------|--------|---------|
| ProjektFortschrittPanel-v7_4_5-4.tsx | shared/ProjektFortschrittPanel.tsx | 7.4.5-4 |
| ZAPanel-v7_4_4-25.tsx | shared/ZAPanel.tsx | 7.4.4-25 |
| StundennachweisMatrix-v7_4_4-1.tsx | shared/StundennachweisMatrix.tsx | 7.4.4-1 (NEU) |
| berichte-page-v7_4_4-25.tsx | firma/berichte/page.tsx | 7.4.4-18 |
| berater-berichte-page-v7_4_4-22.tsx | berater/.../berichte/page.tsx | 7.4.4-20 |
| GIT-SICHERUNG-v7_4_5-session12.md | downloads/ | - |
| PFLICHTENHEFT-v4_55.md | downloads/ | - |

---

## Offene Punkte

- ZAPanel: Direkter "Bewilligt -> Eingereicht" Rollback-Button
- Berater-Portal Benutzerhandbuch
- Gestaffelte Foerderquoten ZIM_NETZWERK

---

## Deploy-Sequenz Session 12

```bash
git add -A
git commit -m "session12: StundennachweisMatrix Shared Component, Projektname+FKZ alle Panels, GIT-Sicherung v4.55"
git push origin v7-dev
git checkout main
git merge v7-dev --no-ff --no-edit
git push origin main
git checkout v7-dev
```

---

## Pflichtenheft
Version: 4.55
Datei: PFLICHTENHEFT-v4_55.md
