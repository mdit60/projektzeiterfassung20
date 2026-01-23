# GIT-SICHERUNG v7.3.83

## Datum: 2026-01-25 (nach Mitternacht)

## Zusammenfassung
ZIM-PDF-Import funktioniert jetzt vollständig mit Mitarbeitern und AP-Zuordnungen.

## Änderungen in dieser Version

### 1. Parser v4.9 (parse-zim-pdf-v4_9.py)
- **EuroNorm-Mitarbeiter-Extraktion**: Tags `<name>`, `<vname>`, `<quali>` werden erkannt
- **Duplikat-Entfernung**: Mitarbeiter werden nur einmal erfasst
- **Kurzname-Ableitung**: Aus Projektname vor dem `:` (z.B. "BioInk")
- **--json Option**: Für stdout-Ausgabe (API-Kompatibilität)

### 2. API-Route (route-v7_3_82-5.ts → route.ts)
- Korrigierte Daten-Erkennung (`data.projekt` statt `result.success`)
- Parser gibt JSON direkt zurück

### 3. ProjectCreateForm (v7_3_82-9)
- **Korrekte Tabellennamen**:
  - `v7_project_assignments` für Projekt-Team
  - `v7_work_package_assignments` für AP-Zuordnungen
- **Korrekte Spaltennamen**:
  - `total_person_months` statt `planned_pm`
  - `planned_person_months` statt `planned_pm`
- **Kombinierte AP-Nummer**: AP2.1 → 201, AP4.3 → 403 (Unique Constraint)
- **Flexibles Mitarbeiter-Matching**: Exakt oder via first_name/last_name

## Dateien zum Kopieren

```bash
# Parser
cp ~/Documents/Dev/PZE/downloads/parse-zim-pdf-v4_9.py src/lib/

# API-Route
cp ~/Documents/Dev/PZE/downloads/route-v7_3_82-5.ts src/app/api/parse-zim/route.ts

# ProjectCreateForm
cp ~/Documents/Dev/PZE/downloads/ProjectCreateForm-v7_3_82-9.tsx src/components/shared/ProjectCreateForm.tsx
```

## Git-Befehle

```bash
cd ~/Documents/Dev/PZE

# Status prüfen
git status

# Alle Änderungen stagen
git add -A

# Commit
git commit -m "v7.3.83: ZIM-Import mit Mitarbeitern und AP-Zuordnungen

- Parser v4.9: EuroNorm-Mitarbeiter, Kurzname-Ableitung, --json Option
- API: Korrigierte Daten-Erkennung
- ProjectCreateForm: Korrekte Tabellen/Spalten, kombinierte AP-Nummer
- Import erstellt jetzt: Projekt, Mitarbeiter, Team, APs, Zuordnungen"

# Push
git push origin v7-dev
```

## Getestetes Ergebnis
- 9 Arbeitspakete (inkl. AP2.1, AP2.2, AP4.1, AP4.2, AP4.3)
- 3 Mitarbeiter im Team-Tab mit PM-Summen
- Zuordnungen zu APs funktionieren
- Gesamt: 12.50 PM

## Noch offen
- Förderquote/Gesamtkosten/Zuwendung aus EuroNorm-PDF extrahieren
- Zeiterfassung-Platzhalter durch echte Komponente ersetzen
- Stundensatz aus PDF extrahieren
