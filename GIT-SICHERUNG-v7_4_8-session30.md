# GIT-SICHERUNG SESSION 30
**Datum:** 24. April 2026
**Version:** v7.4.8
**Status:** Vollstaendig abgeschlossen, alles in PROD

---

## ERLEDIGTE AUFGABEN

### 1. KPT: 3-Jahres-Ansicht + Layout-Redesign
**Finale Datei:** `berater-multiprojekt-page-v7_4_8-11.tsx`
→ `src/app/v7/berater/multiprojekt/page.tsx`

- Layout: 3/4 links (3x Jahresmatrix) + 1/4 rechts (FZul + Platzhalter)
- Kontrollleiste oben: Firma + Jahresfenster-Navigation + Legende in einer Bar
- Jahresfenster: Startjahr ±1, immer 3 Jahre gleichzeitig
- Datenladen: Ein Query fuer alle 3 Jahre (effizienter als vorher)
- Namensspalte: 80px, truncate, text-center
- Summenspalten: Frei h + Frei PM schmal + zentriert
- Druck/PDF: Print-Button, @media print (nur Tabellen), Kopfzeile mit
  Firma (links) + Zeitraum (Mitte) + Datum (rechts), A4 landscape,
  kompakte Zeilenabstaende, Rasterlinien erzwungen
- Iterationen: v7.4.8-6 bis -11 (6 Iterationen)

### 2. PortalNav: Kontextsensitive Navigation
**Finale Datei:** `PortalNav-v7_4_4-3.tsx`
→ `src/components/shared/PortalNav.tsx`

- 4 Berater-Hauptbereiche: Zeiterfassungen, Kundenfirmen, Netzwerk, Kapazitaetsplanung
- Aktive Seite wird ausgeblendet via usePathname() intern
- Administration ganz rechts mit ml-auto (nur system_admin)
- Keine Aenderung an einzelnen Seiten noetig

---

## AKTUELLE VERSIONSNUMMERN

| Datei | Version | Pfad | Status |
|-------|---------|------|--------|
| berater-multiprojekt-page | v7.4.8-11 | src/app/v7/berater/multiprojekt/page.tsx | PROD |
| PortalNav | v7.4.4-3 | src/components/shared/PortalNav.tsx | PROD |
| berater-multiprojekt-detail | v7.4.8-12 | src/app/v7/berater/multiprojekt/[id]/page.tsx | PROD |
| berater-dashboard | v7.4.4-13 | src/app/v7/berater/dashboard/page.tsx | PROD |
| ProjectDetailPage | v7.4.4-54 | src/components/shared/ProjectDetailPage.tsx | PROD |
| WorkPackageTable | v7.4.3-11 | src/components/shared/WorkPackageTable.tsx | PROD |
| v7-types | v7.4.8-1 | src/lib/v7-types.ts | PROD |
| v7-module-config | v7.3.90-7 | src/lib/v7-module-config.ts | PROD |

---

## OFFENE PUNKTE FUER SESSION 31

**Prioritaet 1 — NWM Jahresabrechnung pruefen:**
Sind die gestuften Foerderquoten (Jahr 1/Jahr 2 mit verschiedenen Saetzen)
bereits in der NWM-Eigenanteil-Abrechnung beruecksichtigt?
- Laufzeitjahr-Erkennung in ZAPanel korrekt?
- Eigenanteil-Berechnung verwendet richtigen Foerdersatz pro Periode?
- NWM-Konzept und Implementierung ggf. erweitern

**Prioritaet 2 — Unique Constraint v7_timesheets:**
Verhindert kuenftige Duplikate. Constraint auf
(employee_id, project_id, work_date, work_package_id).
Sorgfaeltige Planung: legitime Mehrfachbuchungen verschiedener APs
am gleichen Tag muessen weiterhin erlaubt sein.

**Prioritaet 3 — KPT Erweiterungen:**
Weitere Tools fuer rechte Spalte (nach interner Klaerung was benoetigt wird).

**Prioritaet 4 — Benutzerdokumentation:**
- Benutzerhandbuch Berater-Portal (noch nicht erstellt)
- Benutzerhandbuch PL + Admin aktualisieren (v2.0 veraltet)

---

## WICHTIGE DB-INFOS

**DEV:** projektzeiterfassung20
- Cubintec consultant_company_id: `4f20d4bc-588d-4291-bc0b-995943533829`

**PROD:** PZE-production
- Cubintec consultant_company_id: `db94308e-f2d0-447b-8b67-96a4f4ef3d15`

**NWM Yacht Connect:**
- Projekt-ID: `5d73f3d3-b6c5-4368-b753-1dcf38c16102`
- Foerderkennzeichen: 16KN124502
- Jahr 1: 01.08.2025-31.07.2026, 70%, ID `a1000001-0000-0000-0000-000000000001`
- Jahr 2: 01.08.2026-31.07.2027, 50%, ID `a1000001-0000-0000-0000-000000000002`

---

## LERNPUNKTE SESSION 30

- `usePathname()` von Next.js direkt in Shared Components nutzbar —
  kein `currentPath`-Prop mehr noetig, Seiten muessen nicht angepasst werden
- @media print: `print-color-adjust: exact` erzwingt Hintergrunddruck
  ohne manuelle Browser-Einstellung des Users
- Druckskalierung ist Browser-Funktion, nicht per Code steuerbar;
  kompaktes Print-CSS reduziert manuellen Anpassungsbedarf erheblich

---

## GIT-WORKFLOW SESSION 30
```bash
cd ~/Documents/Dev/PZE
git add -A
git commit -m "feat(v7.4.8): KPT 3-Jahres-Ansicht, Druck-PDF, kontextsensitive Nav"
git push origin v7-dev
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```
