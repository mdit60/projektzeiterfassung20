# GIT-SICHERUNG Session 44 (final)

**Datum:** 12. Mai 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v4.93
**PROD-Stand:** FirmaCockpit v7.4.9-28, PortalNav v7.4.4-23, AppNav v1.0.1, MitarbeiterModal v1.0.1, ZASeite v1.0.9, login-page v7.3.90-6

---

## Zusammenfassung

Session 44 war ein umfassender Umbau der Navigation und MA-Verwaltung:
- "Cockpit" komplett aus der UI entfernt, Home nur noch als Haeuschen-Icon
- Nav-Zeile konsistent auf jeder Seite (aktive Items hervorgehoben, nicht versteckt)
- Forschungszulage als Nav-Item ergaenzt
- "Kundenfirmen" in "Unternehmen" umbenannt
- Portal-Rolle "Projektleiter" in "Projektkoordinator" umbenannt
- Alle returnTo-URLs App-Mode-aware (pze_mode aus localStorage)
- MitarbeiterModal ersetzt EmployeeManagement im Cockpit (kein Table-Bug mehr)
- Gehaltsdaten + Stundensatzberechnung (Anlage 6.1) im MA-Modal
- Login-Redirect bei pze_mode='app' direkt zur Startseite
- Projektverzeichnis komplett bereinigt (downloads, archiv, Claude PV)
- Neue Konvention: Upload-Checkliste am Session-Ende

---

## Geaenderte Dateien

### Neue Dateien
| Datei | Ziel | Beschreibung |
|-------|------|-------------|
| MitarbeiterModal-v1_0_1.tsx | src/components/shared/MitarbeiterModal.tsx | MA Neu/Bearbeiten/Passwort, Gehaltsdaten, Stundensatz |
| SQL-MIGRATION-gehaltsdaten-v1.sql | (manuell DEV+PROD) | monthly_salary, annual_bonus, company_weekly_hours, hourly_rate |

### Aktualisierte Komponenten
| Datei | Version | Ziel |
|-------|---------|------|
| AppNav-v1_0_1.tsx | 1.0.1 | src/components/shared/AppNav.tsx |
| PortalNav-v7_4_4-23.tsx | 7.4.4-23 | src/components/shared/PortalNav.tsx |
| FirmaCockpit-v7_4_9-28.tsx | 7.4.9-28 | src/components/shared/FirmaCockpit.tsx |
| ZASeite-v1_0_9.tsx | 1.0.9 | src/components/shared/ZASeite.tsx |

### Aktualisierte Seiten
| Datei | Version | Ziel |
|-------|---------|------|
| berater-cockpit-page-v7_4_9-3.tsx | 7.4.9-3 | src/app/v7/berater/foerderung/firma/[id]/cockpit/page.tsx |
| berater-firma-detail-page-v7_4_4-8.tsx | 7.4.4-8 | src/app/v7/berater/foerderung/firma/[id]/page.tsx |
| berater-multiprojekt-page-v7_4_8-12.tsx | 7.4.8-12 | src/app/v7/berater/multiprojekt/page.tsx |
| berater-app-cockpit-page-v1_0_1.tsx | 1.0.1 | src/app/v7/berater/app/cockpit/page.tsx |
| login-page-v7_3_90-6.tsx | 7.3.90-6 | src/app/login/page.tsx |

---

## DB-Migration Session 44

```sql
ALTER TABLE v7_employees ADD COLUMN IF NOT EXISTS monthly_salary numeric;
ALTER TABLE v7_employees ADD COLUMN IF NOT EXISTS annual_bonus numeric DEFAULT 0;
ALTER TABLE v7_employees ADD COLUMN IF NOT EXISTS company_weekly_hours numeric DEFAULT 40;
ALTER TABLE v7_employees ADD COLUMN IF NOT EXISTS hourly_rate numeric;
```
Ausgefuehrt auf DEV und PROD am 12.05.2026.

---

## Architektur-Entscheidungen Session 44

1. **Kein "Cockpit" in der UI:** Home-Button ist nur Haeuschen-Icon, universell verstaendlich
2. **Konsistente Nav:** Aktive Items hervorgehoben (nicht versteckt), ueberall gleich
3. **MitarbeiterModal statt EmployeeManagement:** Eigenes leichtgewichtiges Modal im Cockpit, kein Table-Bug
4. **Gehaltsdaten am Mitarbeiter:** monthly_salary, annual_bonus in v7_employees (stabil). Bewilligter Stundensatz bleibt projektspezifisch in v7_project_assignments
5. **"Unternehmen" statt "Kundenfirmen":** Professioneller, neutraler Begriff
6. **"Projektkoordinator" statt "Projektleiter":** Vermeidet Verwechslung mit Projekt-Rolle
7. **Upload-Checkliste:** Waehrend Session nur downloads, am Ende Checkliste fuers Claude-PV

---

## Offene Punkte

1. MA-Modal: Teilzeit-Historie (pWAZ-Aenderungen ueber Zeit)
2. MA-Modal: Login-Erstellung (aktuell nur ueber alte Mitarbeiterverwaltung)
3. FZul-Seite: PortalHeader + PortalNav (wenn Modul ausgebaut wird)
4. Classic-Mode Seiten: "Kundenfirmen" noch nicht umbenannt
5. ProjektFortschrittPanel auf projektfortschritt-utils refactoren

---

## GIT-Sicherung Befehle

```bash
git checkout v7-dev
git add PFLICHTENHEFT-v4_93.md GIT-SICHERUNG-v7_4_9-session44.md
git commit -m "Session 44 final: Pflichtenheft v4.93 + GIT-Sicherung"
git push origin v7-dev
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```
