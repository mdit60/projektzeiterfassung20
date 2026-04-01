# GIT-Sicherung Session 11 - 1. April 2026

## Status
- Branch: v7-dev + main
- Production: pze.itenion.com - LAEUFT STABIL
- RLS: Vollstaendig aktiv in PROD (alle Tabellen)

---

## Was in Session 11 erledigt wurde

### 1. Login-Bug behoben (EmployeeManagement-v7_3_95-3/4)

Neue Mitarbeiter konnten sich nach Login-Erstellung nicht anmelden.
Symptom: Korrekte Zugangsdaten, Rueckkehr zur leeren Login-Maske (Login-Schleife).

Zwei Bugs behoben:
- createUserProfile: role war 'employee' statt 'client_user'
- handleLinkExistingUser: Feldname 'company_id' statt 'client_company_id' -> NULL in DB

SQL-Sofortfix fuer betroffene Stoma-User ausgefuehrt (Markus Schmahl, Roman Matzke).

### 2. Atomare API-Route /api/v7/create-employee-login (v7.3.95-4)

Neues Architekturprinzip: Login-Erstellung vollstaendig server-seitig und atomar.
- Auth + Profil + Employee-Verknuepfung in einem Aufruf
- Vollstaendiges Rollback bei jedem Fehler
- Gilt fuer Berater-Portal UND Firmen-Portal
- EmployeeManagement ruft ausschliesslich diese Route auf
Getestet: Neue Firma angelegt, Admin-Login sofort funktionsfaehig.

### 3. RLS vollstaendig aktiviert in PROD

Vorbereitung:
- Enum v7_user_role: 'client_admin' ergaenzt (fehlte in PROD)
- SECURITY DEFINER Funktion v7_get_my_profile() erstellt

v7_user_profiles RLS (Zirkelschluss geloest):
Loesung: Policies nur mit auth.uid() - KEIN Funktionsaufruf.
- SELECT/INSERT/UPDATE: id = auth.uid()
- DELETE: false (nur Service Role)

v7_timesheets RLS:
Policies bereits vorhanden, RLS aktiviert - alle Tests bestanden.

Lernlektion: SELECT-Policy auf v7_user_profiles darf KEINE Funktion aufrufen
die wieder v7_user_profiles liest - auch SECURITY DEFINER loest das nicht.
Loesung ist immer: direkt auth.uid() = id.

### Test-Checkliste - alle bestanden
- Login Martin -> blaues Dashboard + 7 Kundenfirmen sichtbar
- Martin -> Kundenfirma Freund -> Projekte + ZE sichtbar
- Login Robin Freund -> gruenes Dashboard + eigene ZE sichtbar
- Robin Freund -> Zeiterfassung -> Stunden sichtbar
- Berichte -> Fortschritt-Kachel -> Diagramme korrekt

---

## RLS-Status PROD - vollstaendig

Alle V7-Tabellen haben aktives RLS. Sicherheitsziel aus Session 9 erreicht.

---

## Offene Punkte (naechste Session)

- ProjektFortschrittPanel: Projektname in Anzeige erwaehnen
- ZAPanel: Direkter Bewilligt->Eingereicht Rollback-Button
- Berater-Portal Benutzerhandbuch
- Gestaffelte Foerderquoten ZIM_NETZWERK

---

## Dateien dieser Session

| Dateiname | Zweck | Status |
|-----------|-------|--------|
| EmployeeManagement-v7_3_95-3.tsx | Bug-Fix role + client_company_id | deployed |
| EmployeeManagement-v7_3_95-4.tsx | Atomare API-Route Umstellung | deployed |
| create-employee-login-route-v7_3_95-1.ts | Neue API-Route | deployed |
| GIT-SICHERUNG-v7_4_5-session11.md | diese Datei | - |
| PFLICHTENHEFT-v4_54.md | Pflichtenheft aktualisiert | - |

---

## Deploy-Sequenz Session 11

git add -A
git commit -m "session11: RLS komplett PROD, atomarer Login, GIT-Sicherung, Pflichtenheft v4.54"
git push origin v7-dev
git checkout main
git merge v7-dev --no-ff --no-edit
git push origin main
git checkout v7-dev

---

## Pflichtenheft
Version: 4.54
Datei: PFLICHTENHEFT-v4_54.md
