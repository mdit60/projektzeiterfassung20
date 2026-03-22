# GIT-Sicherung Session 6 - 22. Maerz 2026

## Status
- Branch: v7-dev (aktuell deployed)
- Letzter Commit: v7.4.4-31
- Production: pze.itenion.com

## Was heute erfolgreich deployed wurde

### ProjectDetailPage-v7_4_4-31.tsx
**Ziel:** `src/components/shared/ProjectDetailPage.tsx`
**Methode:** KOMPLETTER NEUAUFBAU (kein Patching)

**Kern-Fixes (von Grund auf korrekt implementiert):**
1. Profil-Query via `.eq('email', user.email)` - nicht `.eq('id', user.id)`
   Ursache des bisherigen Bugs: teamMembers blieb leer im AP-Tab
2. wpAssignments-Query ohne `!inner` - verhindert silent exception
3. ArbeitsplanImport Props exakt nach Interface:
   `projectId, hasTeam, teamCount, onImportComplete, portal`
   (vorher falsch: projectName, teamMembers, onImportSuccess)
4. WorkPackageTable Props exakt nach Interface:
   - `assignments.planned_pm` (statt planned_person_months)
   - `projectTeam` als `WPProjectTeamMember[]` mit korrekten Feldern
   - `ap_code` non-null via Mapping `wp.ap_code ?? AP${wp.ap_number}`
5. WPEmployee mit `position_title` + `weekly_hours` (laut WPModalEmployee-Interface)
6. Handler-Signaturen fuer WorkPackageAssignmentModal:
   - `onAddAssignment(employeeId, pm)` - 2 Parameter, nutzt assignmentWP aus State
   - `onUpdateAssignment(employeeId, pm)` - 2 Parameter
   - `onRemoveAssignment(employeeId)` - 1 Parameter
7. Durchgehend typsicher - kein `as any`
8. Fehlerbehandlung via `err instanceof Error`

**Ergebnis nach Deploy:**
- AP-Tab zeigt Team korrekt (4 MAs bei GMM-Yacht)
- Excel-Vorlage wird mit korrekten MA-Namen generiert
- Excel-Upload (Import) funktioniert
- Keine TypeScript-Fehler (0 Problems in VS Code)

## Bugfix ausserhalb Code (SQL)

**Problem:** Thomas Duehrkop (t.duehrkop@gmm-yacht.de) konnte sich nicht anmelden.
**Symptom:** Leere Login-Seite ohne Fehlermeldung nach Login-Versuch.
**Ursache:** `client_company_id` in `v7_user_profiles` war NULL.
**Fix:** SQL UPDATE direkt in Supabase:
```sql
UPDATE v7_user_profiles
SET client_company_id = '[GMM-Yacht Company-ID]'
WHERE email = 't.duehrkop@gmm-yacht.de';
```
**Lernpunkt:** Bei neuem Firmen-User immer pruefen:
1. auth.users Eintrag vorhanden?
2. v7_user_profiles Eintrag vorhanden?
3. client_company_id in v7_user_profiles gesetzt?

## Deployment-Protokoll

```bash
cp ~/Documents/Dev/PZE/downloads/ProjectDetailPage-v7_4_4-31.tsx \
   src/components/shared/ProjectDetailPage.tsx

git add -A
git commit -m "v7.4.4-31: ProjectDetailPage Neuaufbau - korrekte Queries, typsichere Props"
git push origin v7-dev

git checkout main
git merge v7-dev --no-edit
git push origin main
git checkout v7-dev
```

## Offene Punkte (naechste Session)

- Firma-Detailseite im Berater-Portal: Header noch gruen statt blau
- Stundensatz-Diskrepanz pruefen: Annika Arndt (Claude: 20.19 EUR vs. Robin: 20.35 EUR)
- User Manual Berater-Portal
- ZA-Rollback-Button: Bewilligt -> Eingereicht (aktuell nur Bewilligt -> Entwurf)
- ZA-Ampel Integration Berater-Dashboard (vereinbart, noch nicht gestartet)

## Pflichtenheft
**Version:** 4.45
**Datei:** PFLICHTENHEFT-v4_45.md
