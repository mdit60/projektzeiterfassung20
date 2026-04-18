# GIT-SICHERUNG - PZE Projekt

**Version:** v7.3.61  
**Datum:** 21. Januar 2026  
**Session:** Firmen-Portal Dashboard & Login-Verknuepfung

---

## Zusammenfassung dieser Session

### Hauptergebnisse

1. **Login-Status Erkennung verbessert** (EmployeeManagement)
   - Bereits registrierte Benutzer werden jetzt korrekt erkannt
   - Verknuepfungsfunktion fuer existierende Logins
   - Unterschiedliche Icons: Schluessel (neu) vs. Kette (verknuepfen)

2. **Dashboard rollenbasierte Ansicht korrigiert**
   - Admin: Firmendaten | Projekte | Mitarbeiter
   - Projektleiter: Projekte mit ZE-Button (KEINE redundante Box mehr)
   - Mitarbeiter: Grosse ZE-Box + Projektliste

3. **Projektzuordnung vereinfacht und korrigiert**
   - EINZIGE QUELLE: `v7_work_package_assignments`
   - MA ist Projekt zugeordnet wenn er einem AP zugeordnet ist
   - Redundante Abfragen auf `v7_project_team` und `v7_project_assignments` entfernt

### Architektur-Klarstellung

**Die richtige Hierarchie fuer Projektzuordnung:**

```
Projekt
  └── Arbeitspakete (v7_work_packages)
        └── MA-Zuordnung mit PM (v7_work_package_assignments) ← EINZIGE QUELLE
```

**Tabellen-Status:**

| Tabelle | Zweck | Status |
|---------|-------|--------|
| `v7_work_package_assignments` | MA → AP mit PM | ✅ Primaer/Quelle |
| `v7_project_assignments` | MA → Projekt (Rolle, PL) | ⚠️ Redundant pruefbar |
| `v7_project_team` | - | ⚠️ Nicht im Schema |

---

## Geaenderte Dateien

### Komponenten
```
src/components/shared/EmployeeManagement.tsx   # Login-Status & Verknuepfung
```

### Seiten
```
src/app/v7/firma/dashboard/page.tsx           # Rollenbasiertes Dashboard
```

### Manuelle Datenbankaktionen (Supabase SQL Editor)
```sql
-- Matthias Duehrkop mit bestehendem Login verknuepfen
UPDATE v7_employees 
SET user_id = 'f0e99b10-b3ef-4be7-a6eb-4eb37cb97725',
    updated_at = NOW()
WHERE email = 'm.duehrkop@assystem.de';

INSERT INTO v7_user_profiles (id, email, role, display_name, client_company_id)
SELECT 
  'f0e99b10-b3ef-4be7-a6eb-4eb37cb97725',
  'm.duehrkop@assystem.de',
  'client_user',
  'Duehrkop, Matthias',
  (SELECT client_company_id FROM v7_employees WHERE email = 'm.duehrkop@assystem.de')
ON CONFLICT (id) DO NOTHING;
```

---

## Git-Befehle

```bash
cd ~/Documents/Dev/PZE

# Status pruefen
git status

# Alle Aenderungen stagen
git add .

# Commit mit ausfuehrlicher Nachricht
git commit -m "v7.3.61: Dashboard Rollen-Ansicht & Login-Verknuepfung

- EmployeeManagement: Login-Status korrekt erkennen
- EmployeeManagement: Verknuepfung fuer bereits registrierte User
- Dashboard: Rollenbasierte Ansicht (Admin/PL/MA)
- Dashboard: Projektleiter ohne redundante ZE-Box
- Dashboard: Projektzuordnung nur via v7_work_package_assignments
- Architektur: Einzige Quelle fuer MA-Projektzuordnung definiert"

# Optional: Tag setzen
git tag -a v7.3.61 -m "Dashboard Rollen-Ansicht & Login-Verknuepfung"

# Push (falls Remote eingerichtet)
git push origin main --tags
```

---

## Naechste Schritte

### Kurzfristig
1. Testen aller drei Rollen (Admin, Projektleiter, Mitarbeiter)
2. Zeiterfassung fuer Matthias Duehrkop testen

### Mittelfristig (Architektur-Bereinigung)
1. Pruefung ob `v7_project_assignments` noch benoetigt wird
2. Falls ja: Felder wie `is_project_leader` nach `v7_work_package_assignments` migrieren
3. Falls nein: Tabelle als deprecated markieren

### Features
1. ZIM PDF Import fertigstellen
2. FZul Migration von V6 nach V7

---

## Versions-Historie (letzte 5)

| Version | Datum | Aenderungen |
|---------|-------|-------------|
| 7.3.61 | 21.01.2026 | Dashboard Rollen-Ansicht, Login-Verknuepfung |
| 7.3.60 | 21.01.2026 | EmployeeManagement Login-Status Fix |
| 7.3.59 | 21.01.2026 | EmployeeManagement Shared Component |
| 7.3.58 | 21.01.2026 | CompanyDataView, ProjectList Shared Components |
| 7.3.57 | 21.01.2026 | Shared Components Refactoring |

---

## Hinweise

### Login-Rollen vs Portal-Rollen

| Feld | Tabelle | Werte | Bedeutung |
|------|---------|-------|-----------|
| `role` | v7_user_profiles | system_admin, consultant, client_admin, client_user | Login-Berechtigung |
| `portal_role` | v7_employees | client_admin, project_leader, employee | Firmen-Portal Rechte |

### Projektzuordnung

Die Zuordnung eines Mitarbeiters zu einem Projekt erfolgt AUSSCHLIESSLICH ueber:
```
v7_work_package_assignments.employee_id 
  → v7_work_packages.project_id
```

Dies ist die einzige Quelle der Wahrheit. Alle anderen Abfragen sollten diese Logik verwenden.

---

**Erstellt:** 21. Januar 2026, 15:30 Uhr  
**Autor:** Claude (AI Assistant)  
**Geprueft:** Martin Ditscherlein
