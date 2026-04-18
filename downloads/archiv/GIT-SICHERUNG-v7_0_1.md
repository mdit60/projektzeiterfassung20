# Git-Sicherung v7.0.1

**Datum:** 30. Dezember 2024  
**Version:** v7.0.1  
**Beschreibung:** ZIM-PDF-Import funktioniert - Datums-Fix

---

## Zusammenfassung der Aenderungen

### Heute behoben:
1. **RLS-Probleme** - Row Level Security für V7-Tabellen deaktiviert
2. **Spalten-Mapping** - Code an tatsächliches DB-Schema angepasst:
   - `consultant_company_id` statt `consultant_id`
   - `client_company_id` statt `company_id`
   - `v7_project_assignments` statt `v7_project_employees`
3. **Datums-Konvertierung** - Deutsches Format (DD.MM.YYYY) zu ISO (YYYY-MM-DD)

### Getestete Funktionen:
- ✅ ZIM-PDF hochladen und parsen
- ✅ Vorschau der extrahierten Daten
- ✅ Import in Datenbank (Firma, Projekt, Mitarbeiter)
- ✅ Projekt-Zuordnungen erstellen

---

## Schritt 1: Dateien aktualisieren

Die korrigierte Import-Seite muss ins Projekt kopiert werden:

```bash
# page-v7-import-FINAL-v2.tsx -> src/app/v7/import/page.tsx
```

---

## Schritt 2: In v7-dev Branch committen

```bash
# In Projektverzeichnis wechseln
cd projektzeiterfassung20

# Auf v7-dev Branch wechseln
git checkout v7-dev

# Status pruefen
git status

# Alle Aenderungen stagen
git add .

# Commit erstellen
git commit -m "v7.0.1: ZIM-PDF-Import funktioniert

Bugfixes:
- RLS deaktiviert fuer v7_employees, v7_projects, v7_client_companies, v7_project_assignments
- Spalten-Mapping korrigiert (client_company_id statt company_id)
- consultant_company_id statt consultant_id in v7_client_companies
- v7_project_assignments statt v7_project_employees
- parseGermanDate() Funktion: DD.MM.YYYY -> YYYY-MM-DD

Getestet:
- PDF-Upload und Parsing OK
- Firma anlegen/finden OK
- Projekt anlegen/finden OK
- Mitarbeiter anlegen OK
- Projekt-Zuordnungen OK"

# Nach GitHub pushen
git push origin v7-dev
```

---

## Schritt 3: Vercel Deployment pruefen

Nach dem Push sollte Vercel automatisch deployen:

1. Gehe zu: https://vercel.com/dashboard
2. Pruefe ob Build fuer v7-dev laeuft
3. Nach erfolgreichem Build testen unter:
   - https://projektzeiterfassung20-v7-dev.vercel.app

---

## Schritt 4: (Optional) Version taggen

```bash
# Tag fuer diese Entwicklungsversion
git tag -a v7.0.1-dev -m "ZIM-PDF-Import funktioniert"
git push origin v7.0.1-dev
```

---

## Geaenderte Dateien

| Datei | Aenderung |
|-------|----------|
| `src/app/v7/import/page.tsx` | FINAL-v2: Spalten-Fix + Datums-Konvertierung |

---

## SQL-Befehle (bereits ausgefuehrt)

### RLS deaktivieren (Entwicklungsmodus)

```sql
ALTER TABLE v7_user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_client_companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE v7_project_assignments DISABLE ROW LEVEL SECURITY;
```

### RLS-Status pruefen

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'v7_%';
```

---

## Bekannte Einschraenkungen

1. **RLS deaktiviert** - Nur fuer Entwicklung! Vor Produktion RLS-Policies einrichten.
2. **Nur neuer Import** - Bestehende V6-Daten werden nicht migriert
3. **Kein Excel-Import in V7** - Noch nicht implementiert

---

## Naechste Schritte

- [ ] Excel-Import nach V7 portieren
- [ ] Timesheet-Erfassung implementieren
- [ ] FZul-Editor in V7 integrieren
- [ ] RLS-Policies fuer Produktion erstellen

---

## Changelog v7.x

| Version | Datum | Feature |
|---------|-------|---------|
| v7.0.1 | 30.12.2024 | ZIM-PDF-Import funktioniert, Datums-Fix |
| v7.0.0 | 27.12.2024 | Berater-Portal Grundstruktur, V7-Tabellen |

---

**Erstellt:** 30. Dezember 2024
