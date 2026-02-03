# Git-Sicherung v7.3.41-1

**Datum:** 20. Januar 2026  
**Branch:** v7-dev  
**Commit-Message:** `v7.3.41-1: Einheitliches Tabellen-Design Berater-Portal`

---

## Änderungen in dieser Version

### v7.3.41-1 - Einheitliches Tabellen-Design

**Berater-Detailseite** (`/v7/berater/foerderung/firma/[id]/page.tsx`):

1. **Arbeitspakete-Tabelle:**
   - Header: AP | Bezeichnung | PM | +Hinzufügen
   - AP-Code korrekt (AP1.1, AP1.2 statt nur AP1)
   - Sortierung nach ap_number + ap_sub_number
   - Icons permanent sichtbar (Zuordnen, Bearbeiten, Löschen)

2. **Mitarbeiter-Tabelle:**
   - Header: Name | Position/Qualifikation | Stunden | Seit | Status | Aktionen
   - Gleiches Design wie Arbeitspakete (border, Trennlinien)
   - Icons permanent sichtbar

3. **UTF-8 bereinigt:**
   - Alle Emojis korrekt: 📊📁👥👤📋🗑️
   - Keine Encoding-Fehler

---

## Deployment-Befehle

```bash
# 1. Ins Projektverzeichnis wechseln
cd ~/Documents/dev/pze

# 2. Dateien kopieren (falls noch nicht geschehen)
chmod +x downloads/deploy-v7_3_41-1.sh && ./downloads/deploy-v7_3_41-1.sh

# 3. Git sichern
git add .
git commit -m "v7.3.41-1: Einheitliches Tabellen-Design Berater-Portal"
git push origin v7-dev

# 4. Optional: Tag setzen
git tag -a v7.3.41-1 -m "Einheitliches Tabellen-Design"
git push origin v7.3.41-1
```

---

## Geänderte Dateien

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `src/app/v7/berater/foerderung/firma/[id]/page.tsx` | Geändert | Komplette Überarbeitung |
| `downloads/v7-firma-detail-page-v7_3_41-1.tsx` | Neu | Backup der Quelldatei |
| `downloads/deploy-v7_3_41-1.sh` | Neu | Deploy-Script |
| `PFLICHTENHEFT-v4_13.md` | Neu | Aktualisierte Dokumentation |

---

## Nächste Aufgabe (morgen)

**Firmen-Portal auf gemeinsame Abfrage-Mechanik umstellen:**

1. Gemeinsame Komponenten erstellen (`/components/shared/`)
2. Firmen-Projektseite (`/v7/firma/projekte/page.tsx`) refactoren
3. Gleiche Datenabfrage für beide Portale
4. Nur Header-Farbe unterschiedlich (blau vs. grün)

---

## Vorherige Versionen (Referenz)

| Version | Commit | Beschreibung |
|---------|--------|--------------|
| v7.3.39 | ac50254 | Hierarchische AP-Nummern |
| v7.3.32 | 399df85 | Mitarbeiter/Berichte-Seiten, Header-Farben |
| v7.3.18 | df2aaae | Firmen-Projektseite Verbesserungen |

---

*Erstellt: 20. Januar 2026*
