# GIT-SICHERUNG - PZE Projekt

**Version:** v7.3.81  
**Datum:** 23. Januar 2026  
**Session:** ZIM PDF Parser v4.8 + Mitarbeiter-Sortierung nach Antrag

---

## Zusammenfassung dieser Session

### Hauptergebnisse

1. **ZIM PDF Parser v4.8 fertiggestellt**
   - Unterstuetzt alle aktuellen VDI/VDE Formulare (2025)
   - Unterstuetzt AiF Kooperations-Formulare
   - Unterstuetzt EuroNorm Legacy-Formulare
   - Automatische Formular-Typ-Erkennung
   - **NEU: Mitarbeiter-Extraktion aus Anlage 6.2**

2. **Formular-Typ-Erkennung implementiert**
   - Einzelprojekt, Kooperation, Netzwerk, Durchfuehrbarkeitsstudie
   - Basiert auf eindeutigen Markern (FuE-Einzelprojekt, FuE-Kooperationsprojekt, Antrag_DS)
   - Version und Stand werden aus Fusszeile extrahiert

3. **Team-Sortierung nach MA-Nummer**
   - Neue Spalte `employee_number` in `v7_project_assignments`
   - ProjectDetailPage sortiert Team nach Anlage 6.2 Reihenfolge
   - Fallback auf alphabetisch falls keine Nummer vorhanden

### Parser-Entwicklung Uebersicht

| Version | Datum | Aenderungen |
|---------|-------|-------------|
| v4.5 | 23.01.2026 | DS + Standard-ZIM Basis |
| v4.6 | 23.01.2026 | Formular-Versionserkennung (VDI/VDE) |
| v4.7 | 23.01.2026 | EuroNorm Einzelprojekt vs DS unterscheiden |
| v4.8 | 23.01.2026 | Vollstaendige Typ-Erkennung mit Markern |

---

## Neue/Geaenderte Dateien

### Parser
```
parse-zim-pdf-v4_8.py                    # Hauptparser mit Mitarbeiter-Extraktion
```

### Komponenten
```
src/components/shared/ProjectDetailPage.tsx   # v7.3.81 - Team-Sortierung nach employee_number
```

### Migration
```
migration-v7_3_81-employee-number.sql    # Neue Spalte employee_number
```

### Dokumentation
```
PFLICHTENHEFT-v4_20.md                   # Aktualisiert
GIT-SICHERUNG-v7_3_81.md                 # Diese Datei
```

---

## Getestete Formulare

### VDI/VDE (2025)

| Formular | Erkannt als | Version | Stand |
|----------|-------------|---------|-------|
| antrag-einzelprojekt.pdf | Einzelprojekt | 13.11 | 18.12.2025 |
| antragsformular-durchfuehrbarkeitsstudie.pdf | Durchfuehrbarkeitsstudie | 13.11 | 18.12.2025 |
| innovationsnetzwerke-antrag-koop-5.pdf | Kooperation (aus Netzwerk) | 13.11 | 18.12.2025 |
| innovationsnetzwerk-antrag-phase-1-2.pdf | Netzwerk (Phase 1+2) | 13.11 | 18.12.2025 |
| innovationsnetzwerk-antrag-phase-2.pdf | Netzwerk (Phase 1+2) | 13.12 | 06.01.2026 |

### AiF

| Formular | Erkannt als | Version | Stand |
|----------|-------------|---------|-------|
| AiF_ZIM-Antrag-koop.pdf | Kooperation | - | - |

### Legacy (EuroNorm)

| Formular | Erkannt als | PM | APs |
|----------|-------------|-----|-----|
| ZIM antrag-einzelprojekt WISE-1.pdf | Einzelprojekt (EuroNorm) | 53.25 | 9 |
| ZIM Beispiel Digitrans.pdf | Einzelprojekt | 54.0 | 9+1 |

---

## Git-Befehle

```bash
cd ~/Documents/Dev/PZE

# Dateien kopieren
cp ~/Documents/Dev/PZE/downloads/parse-zim-pdf-v4_8.py src/lib/
cp ~/Documents/Dev/PZE/downloads/ProjectDetailPage-v7_3_81.tsx src/components/shared/ProjectDetailPage.tsx
cp ~/Documents/Dev/PZE/downloads/PFLICHTENHEFT-v4_20.md docs/
cp ~/Documents/Dev/PZE/downloads/GIT-SICHERUNG-v7_3_81.md docs/

# Status pruefen
git status

# Alle Aenderungen stagen
git add .

# Commit mit ausfuehrlicher Nachricht
git commit -m "v7.3.81: ZIM Parser Mitarbeiter-Extraktion + Team-Sortierung

PARSER v4.8:
- Alle VDI/VDE Formulare 2025 unterstuetzt (Version 13.11/13.12)
- AiF + EuroNorm Legacy unterstuetzt
- Automatische Typ-Erkennung via Marker
- NEU: Mitarbeiter aus Anlage 6.2 extrahieren (ma_nr, Name, Qualifikation)

DATENBANK:
- Neue Spalte employee_number in v7_project_assignments
- Speichert MA-Nummer aus Foerderantrag (projektspezifisch)

UI:
- ProjectDetailPage: Team-Sortierung nach employee_number
- Reihenfolge entspricht jetzt Anlage 6.2 im Antrag

DOKUMENTATION:
- Pflichtenheft v4.20
- Git-Sicherung v7.3.81"

# Tag setzen
git tag -a v7.3.81 -m "ZIM Parser + Team-Sortierung nach Antrag"

# Push
git push origin v7-dev --tags
```

---

## Parser-Architektur

### Erkennungs-Logik

```python
# Schritt 1: Projekttraeger erkennen
if 'VDI/VDE' in xfa_text:
    quelle = 'VDI/VDE'
elif 'EuroNorm' in xfa_text:
    quelle = 'EuroNorm'
elif 'AiF Projekt' in xfa_text:
    quelle = 'AiF'

# Schritt 2: Formular-Typ via Marker
if 'Antrag_DS' in xfa_text:
    typ = 'Durchfuehrbarkeitsstudie'
elif has_fue_einzelprojekt and not has_fue_kooperation:
    typ = 'Einzelprojekt'
elif has_fue_einzelprojekt and has_fue_kooperation:
    typ = 'Kooperation (aus Netzwerk)'
elif has_fue_kooperation:
    typ = 'Kooperation'
elif has_phase1 and has_phase2:
    typ = 'Netzwerk (Phase 1+2)'
```

### Tag-Mapping

| Format | AP-Nr | AP-Name | MA-Nr | PM |
|--------|-------|---------|-------|-----|
| VDI/VDE 2025 | `lfd` | `ap` | `ma_nr` | `pm` |
| EuroNorm Legacy | `Arbeitspaket_Nr` | `Arbeitspaket` | `MA_Nr` | `pm` |
| EuroNorm DS tech | `Arbeitspaket_Nr_techn` | `Arbeitspaket_techn` | `MA_Nr_techn` | `pm_techn` |

---

## Naechste Schritte

### Sofort
1. Git Push ausfuehren (siehe Befehle oben)
2. Parser nach `src/lib/` kopieren
3. Vercel Deployment pruefen

### Kurzfristig
1. Parser als API-Route in Next.js einbinden
2. Import-Funktion im UI testen
3. FZul-Migration starten (Phase 4)

### Mittelfristig
1. Online-Antraege beobachten (Projekttraeger stellen um)
2. OCR-Fallback evaluieren falls noetig

---

## Hinweise

### Formular-Download
Aktuelle Formulare unter: https://www.zim.de/ZIM/Navigation/DE/Formular-Center/formular-center.html

### Projekttraeger-Aenderung 2025
- EuroNorm ist komplett raus
- VDI/VDE macht jetzt auch Durchfuehrbarkeitsstudien
- AiF nur noch fuer Kooperationen (nicht aus Netzwerk)

### Parser-Einschraenkungen
- AiF Version/Stand wird nicht erkannt (anderes Muster)
- Online-Antraege koennten anderes Format haben
- Parser benoetigt pypdf (`pip install pypdf`)

---

**Erstellt:** 23. Januar 2026, 14:00 Uhr  
**Autor:** Claude (AI Assistant)  
**Geprueft:** Martin Ditscherlein
