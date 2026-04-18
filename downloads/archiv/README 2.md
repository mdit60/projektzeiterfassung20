# V7 ZIM-Import - Vercel Serverless

## Übersicht

PDF-Upload direkt im Browser - keine lokale Python-Installation nötig!

```
Browser → PDF Upload → Vercel Python API → JSON → Datenbank
```

## Dateien

| Datei | Zielort | Beschreibung |
|-------|---------|--------------|
| `parse-zim.py` | `api/parse-zim.py` | Python Serverless Function |
| `requirements.txt` | `requirements.txt` (Root) | Python Dependencies |
| `vercel.json` | `vercel.json` (Root) | Vercel Konfiguration |
| `page.tsx` | `src/app/v7/import/page.tsx` | Aktualisierte Import-Seite |

## Installation

```bash
# 1. api Ordner erstellen (falls nicht vorhanden)
mkdir -p ~/Documents/dev/pze/api

# 2. Dateien kopieren
cp parse-zim.py ~/Documents/dev/pze/api/
cp requirements.txt ~/Documents/dev/pze/
cp page.tsx ~/Documents/dev/pze/src/app/v7/import/

# 3. vercel.json mergen (siehe unten)

# 4. Commit & Push
cd ~/Documents/dev/pze
git add .
git commit -m "feat: ZIM-PDF Serverless Parser"
git push origin v7-dev
```

## vercel.json

Falls du bereits eine `vercel.json` hast, füge diese Einträge hinzu:

```json
{
  "functions": {
    "api/parse-zim.py": {
      "runtime": "python3.11",
      "maxDuration": 30
    }
  }
}
```

Falls du **keine** `vercel.json` hast, erstelle sie mit dem kompletten Inhalt:

```json
{
  "functions": {
    "api/parse-zim.py": {
      "runtime": "python3.11",
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/parse-zim",
      "destination": "/api/parse-zim.py"
    }
  ]
}
```

## Lokales Testen

**Option A: Vercel CLI (empfohlen)**
```bash
npm i -g vercel
cd ~/Documents/dev/pze
vercel dev
```

**Option B: Python direkt testen**
```bash
python3 scripts/zim-pdf-parser.py test.pdf
```

## API Endpoint

**POST /api/parse-zim**

Request:
- `Content-Type: multipart/form-data`
- `file`: PDF-Datei (max 10 MB)

Response (Erfolg):
```json
{
  "success": true,
  "data": {
    "projekt": { ... },
    "antragsteller": { ... },
    "mitarbeiter": [ ... ],
    "arbeitspakete": [ ... ]
  }
}
```

## Troubleshooting

**"Function not found"**
- Prüfe dass `api/parse-zim.py` existiert
- Prüfe `vercel.json` Syntax
- Vercel Logs prüfen: `vercel logs`

**"Module not found: pypdf"**
- Prüfe dass `requirements.txt` im Root liegt
- Enthält: `pypdf>=4.0.0`

**CORS Fehler**
- Die API sendet bereits CORS-Header
- Falls immer noch Probleme: Vercel Logs prüfen

## Limits

- Max. Dateigröße: 10 MB
- Timeout: 30 Sekunden
- Unterstützt: ZIM XFA-PDFs (alle Antragstypen)
