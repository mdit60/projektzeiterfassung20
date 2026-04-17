# GIT-SICHERUNG - Session 17b (Nachtrag)
**Datum:** 16. April 2026
**Ort:** Rhodos
**SW-Release:** V7.4.5
**Pflichtenheft:** v4.61

---

## Nachtrag zu Session 17 — Stundensatz-Fix

### 8. ZAPanel: hourly_rate_approved bevorzugt (v7.4.4-30)
- Problem: ZAPanel nutzte immer kalkulatorischen Stundensatz (hourly_rate)
  statt des vom PT bewilligten Stundensatzes (hourly_rate_approved)
- Fix: Interface ZAProjectAssignment um hourly_rate_approved ergaenzt
- Fix: loadProjectAssignments laedt hourly_rate_approved aus DB
- Fix: getHourlyRate gibt hourly_rate_approved ?? hourly_rate zurueck
- Betrifft: Anlage 1b Personalkosten + NWM-Kostenberechnung
- Datei: ZAPanel-v7_4_4-30.tsx

### 9. ProjectTeamManager: Stundensatz-Anzeige + Spaltenheader (v7.4.4-7)
- Problem: Team-Tabelle zeigte kalkulatorischen statt bewilligten Stundensatz
- Fix: formatCurrency(member.hourly_rate_approved ?? member.hourly_rate)
- Fix: Spaltenheader "Stundensatz" -> "Stundensatz (bewilligt)"
- Datei: ProjectTeamManager-v7_4_4-7.tsx

---

## Aktueller Dateistand (deployed PROD) — vollstaendig

| Komponente | Version | Pfad |
|---|---|---|
| ZAPanel | v7.4.4-30 | src/components/shared/ZAPanel.tsx |
| ProjectTeamManager | v7.4.4-7 | src/components/shared/ProjectTeamManager.tsx |
| BerichtePage | v7.4.4-2 | src/components/shared/BerichtePage.tsx |
| StundennachweisMatrix | v7.4.4-2 | src/components/shared/StundennachweisMatrix.tsx |
| TimesheetForm | v7.4.3-16 | src/components/shared/TimesheetForm.tsx |
| NWMEigenanteilPanel | v7.4.5-12 | src/components/shared/NWMEigenanteilPanel.tsx |
| NWMEigenanteilPanel | v7.4.5-12 | src/components/shared/NWMEigenanteilPanel.tsx |
| NWMEinstellungenPanel | v7.4.5-3 | src/components/shared/NWMEinstellungenPanel.tsx |
| NWMPartnerPanel | v7.4.5-4 | src/components/shared/NWMPartnerPanel.tsx |
| ProjectDetailPage | v7.4.4-40 | src/components/shared/ProjectDetailPage.tsx |
| ProjektFortschrittPanel | v7.4.5-4 | src/components/shared/ProjektFortschrittPanel.tsx |
| StundennachweisMatrix | v7.4.4-2 | src/components/shared/StundennachweisMatrix.tsx |
| BerichtePage | v7.4.4-2 | src/components/shared/BerichtePage.tsx |
| FirmendatenCard | v7.4.4-2 | src/components/shared/FirmendatenCard.tsx |
| PortalHeader | v7.3.95-3 | src/components/shared/PortalHeader.tsx |
| PortalNav | v7.4.4-1 | src/components/shared/PortalNav.tsx |
| WorkPackageTable | v7.4.3-7 | src/components/shared/WorkPackageTable.tsx |
| WorkPackageEditModal | v7.3.85-2 | src/components/shared/WorkPackageEditModal.tsx |
| ProjectTeamManager | v7.4.4-7 | src/components/shared/ProjectTeamManager.tsx |
| ProjectCreateForm | v7.3.82-9 | src/components/shared/ProjectCreateForm.tsx |
| EmployeeManagement | v7.3.95-4 | src/components/shared/EmployeeManagement.tsx |
| berater-firma-detail-page | v7.4.4-4 | src/app/v7/berater/foerderung/firma/[id]/page.tsx |
| berater-ze-seite | v7.4.0-4 | src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx |
| foerderung-page | v7.4.1-3 | src/app/v7/berater/foerderung/page.tsx |
| berater-netzwerk-page | v7.4.5-1 | src/app/v7/berater/netzwerk/page.tsx |
| berater-dashboard | v7.4.4-6 | src/app/v7/berater/dashboard/page.tsx |
| mein-status-page | v7.4.4-8 | src/app/v7/firma/mein-status/page.tsx |
| create-employee-login | v7.3.95-1 | src/app/api/v7/create-employee-login/route.ts |

---

## Lernpunkte Session 17 (Nachtrag)

- **Versionierungsregel:** Im Chatverlauf erstellte Versionen sind massgeblich,
  nicht das PV (das wird nur beim Chat-Start geladen).
  Vor jeder neuen Datei: Chatverlauf UND PV pruefen.
  Bei Konflikt: Martin sagt Bescheid, naechste Nummer nehmen.

---

## Offene Punkte (aktuell)

| # | Thema | Prioritaet |
|---|---|---|
| 1 | create-employee-login: Fehlerbehandlung verbessern | MITTEL |
| 2 | Berater-Portal Benutzerhandbuch PDF | NIEDRIG |
| 3 | SWC-Bug ProjectDetailPage analysieren | OFFEN |
| 4 | Umlaut-Bereinigung UI-Texte (ue/ae/oe -> Umlaute) | ZUKUNFT |
| 5 | Multiprojekt-Tool | ZUKUNFT |
| 6 | Forschungszulage-Modul | ZUKUNFT |
| 7 | RLS vollstaendig planen + ausfuehren | ZUKUNFT |

---

## Dateien Session 17b

| Dateiname | Zweck | Status |
|---|---|---|
| ZAPanel-v7_4_4-30.tsx | hourly_rate_approved in ZA-Berechnung | deployed |
| ProjectTeamManager-v7_4_4-7.tsx | bewilligter Stundensatz + Header | deployed |
| GIT-SICHERUNG-v7_4_5-session17b.md | diese Datei | - |
| PFLICHTENHEFT-v4_61.md | Pflichtenheft aktualisiert | - |

---

## Pflichtenheft
Version: 4.61
Datei: PFLICHTENHEFT-v4_61.md
