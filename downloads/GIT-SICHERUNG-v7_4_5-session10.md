# GIT-Sicherung Session 10 - 31. Maerz 2026

## Status
- Branch: v7-dev + main
- Production: pze.itenion.com - LAEUFT STABIL
- DEV: projektzeiterfassung20 - RLS aktiv (alle Tabellen)
- PROD: PZE-production - RLS teilweise aktiv (siehe unten)

---

## Was in Session 10 erledigt wurde

### 1. RLS-Migration DEV (projektzeiterfassung20)
- Hilfsfunktionen erstellt: v7_get_user_role, v7_is_system_admin,
  v7_is_consultant, v7_can_access_client
- RLS aktiviert fuer alle v7-Tabellen in DEV
- Policies erstellt fuer alle Tabellen
- Kontroll-SELECT: alle Tabellen true, alle Policies vorhanden

### 2. RLS-Migration PROD (PZE-production) - TEILWEISE
**Was funktioniert:**
- Hilfsfunktionen erstellt (v7_get_user_role etc.)
- RLS aktiviert fuer: v7_client_companies, v7_consultant_companies,
  v7_employees, v7_projects, v7_work_packages, v7_work_package_assignments,
  v7_project_assignments, v7_project_budget, v7_project_team,
  v7_zahlungsanforderungen, v7_netzwerk_partner, v7_netzwerk_eigenanteile,
  v7_timesheet_completions, v7_payment_requests, v7_archive,
  v7_consultant_access, v7_data_completion, v7_fzul_timesheets

**Was NICHT funktioniert hat:**
- v7_user_profiles: RLS aktiviert -> System komplett gesperrt
  Ursache: Zirkelschluss - v7_can_access_client() liest v7_user_profiles,
  aber RLS auf v7_user_profiles blockiert genau diesen Lesezugriff
  Loesung: RLS wieder deaktiviert -> System laeuft wieder

- v7_timesheets: RLS kurz aktiviert (ohne Policies) -> alle Daten weg
  Loesung: RLS wieder deaktiviert -> Daten sofort wieder da

### 3. Aktueller RLS-Status PROD

| Tabelle | RLS | Policies | Status |
|---------|-----|----------|--------|
| v7_user_profiles | FALSE | 4 | Bewusst deaktiviert - Zirkelschluss |
| v7_timesheets | FALSE | 4 | Deaktiviert - noch offen |
| v7_client_companies | TRUE | 1 | OK |
| v7_consultant_companies | TRUE | 1 | OK |
| v7_employees | TRUE | 1 | OK |
| v7_projects | TRUE | 1 | OK |
| v7_work_packages | TRUE | 1 | OK |
| v7_work_package_assignments | TRUE | 1 | OK |
| v7_project_assignments | TRUE | 1 | OK |
| v7_netzwerk_partner | TRUE | 1 | OK |
| v7_netzwerk_eigenanteile | TRUE | 1 | OK |
| v7_timesheet_completions | TRUE | 3 | OK |
| v7_payment_requests | TRUE | 4 | OK |
| v7_archive | TRUE | 1 | OK |
| v7_consultant_access | TRUE | 1 | OK |
| v7_data_completion | TRUE | 1 | OK |
| v7_fzul_timesheets | TRUE | 1 | OK |
| v7_project_budget | TRUE | 1 | OK |
| v7_project_team | TRUE | 1 | OK |
| v7_zahlungsanforderungen | TRUE | 1 | OK |

---

## Fehler und Lernlektionen

### Problem 1: Zirkelschluss v7_user_profiles
v7_can_access_client() liest aus v7_user_profiles.
Wenn RLS auf v7_user_profiles aktiv ist, blockiert es genau diesen Lesezugriff.
-> Policy muss OHNE v7_can_access_client() auskommen.
-> Loesung: Direkt auth.uid() verwenden, ABER auch das ist rekursiv!
-> Echte Loesung: SECURITY DEFINER Funktion die auth.uid() direkt prueft.

### Problem 2: Enum v7_user_role fehlt 'client_admin' in PROD
DEV hat: system_admin, consultant, client_admin, client_user
PROD hat: system_admin, consultant, client_user
-> Vor naechster Migration: ALTER TYPE v7_user_role ADD VALUE 'client_admin';

### Problem 3: Kein funktionierender lokaler DEV-Test
Lokaler Server zeigt V6-Dashboard nach Login (Redirect-Problem).
V7 laeuft nur auf Vercel/pze.itenion.com.
-> Naechste Session: Login-Redirect-Problem lokal fixen.

---

## Aktionsplan naechste Session (RLS sauber abschliessen)

### Vorbereitung (vor dem Coden)
1. Enum in PROD pruefen/ergaenzen:
   SELECT enumlabel FROM pg_enum JOIN pg_type ON...
   ALTER TYPE v7_user_role ADD VALUE IF NOT EXISTS 'client_admin';

2. Korrekte Policy fuer v7_user_profiles entwerfen (KEIN Zirkelschluss):
   Option A: Eigene SECURITY DEFINER Funktion v7_get_current_user_role()
             die direkt SQL ohne RLS ausfuehrt
   Option B: policy mit SET LOCAL row_security = off

### Ausfuehren (schrittweise mit Test nach jedem Schritt)
1. v7_user_profiles Policy korrekt erstellen
2. RLS auf v7_user_profiles aktivieren
3. SOFORT testen: Login Martin -> Kundenfirmen sichtbar?
4. Wenn OK: v7_timesheets RLS aktivieren (Policies bereits vorhanden)
5. SOFORT testen: Robin Freund -> Zeiterfassung sichtbar?
6. Wenn OK: Fertig!

### Test-Checkliste (nach jeder Aktivierung)
- [ ] Login als Martin (Berater) -> blaues Dashboard + Kundenfirmen sichtbar
- [ ] Martin -> Kundenfirma Freund -> Projekte + ZE sichtbar
- [ ] Login als Robin Freund -> gruenes Dashboard + eigene ZE sichtbar
- [ ] Robin Freund -> Zeiterfassung aufrufen -> Stunden sichtbar
- [ ] Berichte -> Fortschritt-Kachel -> Diagramme sichtbar

---

## Dateien in Downloads (Session 10)

| Dateiname | Zweck | Status |
|-----------|-------|--------|
| migration_rls_komplett_prod.sql | RLS-Migration v1 | DEV ausgefuehrt |
| migration_rls_komplett_prod_v2.sql | RLS-Migration v2 (client_admin fix) | PROD teilweise |
| PFLICHTENHEFT-v4_52.md | Pflichtenheft | aktualisiert |
| GIT-SICHERUNG-v7_4_5-session10.md | diese Datei | - |

---

## Pflichtenheft
**Version:** 4.52
**Datei:** PFLICHTENHEFT-v4_52.md
