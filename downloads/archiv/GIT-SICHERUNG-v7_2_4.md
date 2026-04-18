# GIT-SICHERUNG - PZE Projekt

**Version:** v7.2.4  
**Datum:** 06. Januar 2026  
**Session:** ZIM-Import Direktupload via Microservice

---

## Zusammenfassung dieser Session

### Hauptergebnis: PDF-Direktupload funktioniert! 🎉

Der ZIM-Import wurde vollständig automatisiert:
- **Vorher:** PDF → Python lokal → JSON → Upload → Import
- **Nachher:** PDF → Upload → fertig!

### Erledigte Aufgaben

| Version | Feature | Status |
|---------|---------|--------|
| v7.2.2 | Parser Fix für mehrere MA pro AP | ✅ |
| v7.2.2 | DB-Constraint auf ap_code geändert | ✅ |
| v7.2.3 | Automatischer Reimport (alte Daten überschreiben) | ✅ |
| v7.2.4 | ZIM Parser Microservice auf Railway | ✅ |
| v7.2.4 | Import-Seite mit direktem PDF-Upload | ✅ |

### Neue Infrastruktur

| Service | URL | Repository |
|---------|-----|------------|
| ZIM Parser Microservice | https://web-production-e2e1.up.railway.app | github.com/mdit60/zim-parser-service |

---

## Geänderte Dateien (PZE Projekt)

### Import-Seite
```
src/app/v7/berater/foerderung/import/page.tsx   # v7.2.4 - PDF-Direktupload
```

### Dokumentation
```
PFLICHTENHEFT-v4_5.md                           # Aktuelle Version
GIT-SICHERUNG-v7_2_4.md                         # Diese Datei
```

---

## Datenbank-Änderungen

### UNIQUE Constraint geändert (v7.2.2)

```sql
-- WICHTIG: Bereits ausgeführt am 06.01.2026
ALTER TABLE v7_work_packages DROP CONSTRAINT v7_work_packages_unique;
ALTER TABLE v7_work_packages ADD CONSTRAINT v7_work_packages_unique UNIQUE (project_id, ap_code);
```

---

## Neues Repository: zim-parser-service

Auf GitHub unter `mdit60/zim-parser-service`:

```
zim-parser-service/
├── main.py              # FastAPI Server + XFA Parser
├── requirements.txt     # Dependencies (inkl. cryptography)
├── Procfile             # Railway Start-Befehl
├── railway.toml         # Railway Konfiguration
├── README.md            # Dokumentation
└── .gitignore
```

**Deployed auf Railway.app:**
- URL: https://web-production-e2e1.up.railway.app
- Auto-Deploy bei git push

---

## Git-Befehle für PZE

### 1. Status prüfen
```bash
cd ~/Documents/Dev/PZE
git status
```

### 2. Alle Änderungen stagen
```bash
git add .
```

### 3. Commit mit aussagekräftiger Message
```bash
git commit -m "v7.2.4: PDF-Direktupload via ZIM Parser Microservice

FEATURES:
- ZIM-Antrag PDF kann direkt hochgeladen werden
- Parser läuft als Microservice auf Railway.app
- Kein lokales Python-Script mehr nötig
- Automatischer Reimport (alte Daten werden überschrieben)

FIXES:
- Parser erkennt jetzt alle MA-Zuordnungen pro AP
- DB-Constraint auf ap_code statt ap_number
- UTF-8 Encoding für Umlaute

NEUE INFRASTRUKTUR:
- github.com/mdit60/zim-parser-service
- https://web-production-e2e1.up.railway.app"
```

### 4. Push
```bash
git push
```

### 5. Tag setzen
```bash
git tag -a v7.2.4-dev -m "PDF-Direktupload via Microservice"
git push origin v7.2.4-dev
```

---

## Nächste Session - TODO

### Priorität 1: Weitere PDFs testen
- [ ] Anderen ZIM-Antrag testen (nicht DigiTrans)
- [ ] Kooperationsprojekt testen
- [ ] Durchführbarkeitsstudie testen

### Priorität 2: FZul-Migration (Phase 3)
- [ ] V6 FZul-Editor analysieren
- [ ] V7-Integration planen
- [ ] FZul-Import nach V7 portieren

### Priorität 3: Cleanup
- [ ] Alte lokale Parser-Dateien archivieren
- [ ] Downloads-Ordner aufräumen

---

## Backup-Hinweis

### Wichtige Konfigurationen sichern:

1. **Railway Environment:**
   - Service läuft auf Railway Free Tier
   - Auto-Deploy aus GitHub aktiviert
   - URL: https://web-production-e2e1.up.railway.app

2. **Supabase:**
   - UNIQUE Constraint auf v7_work_packages wurde geändert
   - Keine weiteren Schema-Änderungen

3. **Vercel:**
   - Keine Änderungen an Vercel-Config nötig
   - Optional: NEXT_PUBLIC_ZIM_PARSER_URL als Environment Variable

---

## Dateien zum Download (aus dieser Session)

Falls die Session-Dateien noch gebraucht werden:

| Datei | Beschreibung |
|-------|--------------|
| page-v7-import-v2.4.tsx | Import-Seite mit PDF-Direktupload |
| parse-zim-pdf-v4-FINAL.py | Finaler Parser (jetzt im Microservice) |
| PFLICHTENHEFT-v4_5.md | Aktuelle Dokumentation |

---

**Erstellt:** 06. Januar 2026  
**Session-Dauer:** ca. 2 Stunden  
**Autor:** Claude AI / Martin Ditscherlein
