# GIT-SICHERUNG v7.3.51

**Datum:** 21. Januar 2026  
**Branch:** v7-dev  
**Status:** Zwischenstand vor Shared Components Refactoring

---

## 1. Commit-Nachricht

```
git add .
git commit -m "v7.3.51: Firmen-Portal Zwischenstand vor Shared Components Refactoring

Firmen-Portal Updates:
- Dashboard v7.3.45: Sub-Navigation, Willkommen-Bereich, Projekte-Tabelle
- Projekt-Detail v7.3.51: Tabs (Uebersicht/APs/Team/Zeiterfassung)
- Team-Tab: Wochenstunden, Stundensatz, individuelle Stundenberechnung
- Projekt-Bearbeiten-Modal: Name, FKZ, Foerderprogramm, Laufzeit
- Mitarbeiter-Seite v7.3.47: Konsistenter Header

Wichtig:
- Quick Stats Kacheln entfernt (redundant)
- AP-Tab zeigt nur PM (keine Stunden - da MA-abhaengig)
- Stundenberechnung: PM x (Wochenstunden x 52 / 12)

TODO naechster Schritt:
- Shared Components aus v7.3.41-1 extrahieren
- AP-Bearbeitung + MA-Zuordnung als Shared Components
- Beide Portale auf gemeinsame Komponenten umstellen

Pflichtenheft: v4.14"
```

---

## 2. Geaenderte Dateien

### 2.1 Firmen-Portal Seiten

| Datei | Aktion | Ziel |
|-------|--------|------|
| page-firma-projekt-detail-v7_3_51.tsx | NEU | src/app/v7/firma/projekte/[id]/page.tsx |
| v7-firma-dashboard-v7_3_45.tsx | BEREITS | src/app/v7/firma/dashboard/page.tsx |
| page-firma-mitarbeiter-v7_3_47.tsx | BEREITS | src/app/v7/firma/mitarbeiter/page.tsx |
| page-firma-projekt-neu-v7_3_44.tsx | BEREITS | src/app/v7/firma/projekte/neu/page.tsx |

### 2.2 Dokumentation

| Datei | Aktion |
|-------|--------|
| PFLICHTENHEFT-v4_14.md | NEU |
| GIT-SICHERUNG-v7_3_51.md | NEU |

---

## 3. Deploy-Befehle

```bash
# 1. Download-Verzeichnis
cd ~/Documents/dev/pze/downloads

# 2. v7.3.51 deployen
chmod +x deploy-v7_3_51.sh
./deploy-v7_3_51.sh

# 3. Pflichtenheft kopieren
cp PFLICHTENHEFT-v4_14.md ~/Documents/dev/pze/

# 4. Git Sicherung
cd ~/Documents/dev/pze
git add .
git commit -m "v7.3.51: Firmen-Portal Zwischenstand vor Shared Components Refactoring"
git push origin v7-dev
```

---

## 4. Aktuelle Versionen Uebersicht

### Firmen-Portal (src/app/v7/firma/)

| Seite | Version | Status |
|-------|---------|--------|
| /dashboard | v7.3.45 | OK |
| /projekte | v7.3.43 | OK |
| /projekte/[id] | **v7.3.51** | OK |
| /projekte/neu | v7.3.44 | OK |
| /mitarbeiter | v7.3.47 | OK |
| /firmendaten | - | TODO |
| /berichte | - | TODO |

### Berater-Portal (Referenz)

| Seite | Version | Status |
|-------|---------|--------|
| /foerderung/firma/[id] | v7.3.41-1 | Volle Funktionalitaet |

### Shared Components (src/components/shared/)

| Komponente | Version | Status |
|------------|---------|--------|
| PortalHeader | v7.3.42 | OK |
| Modal | v7.3.42 | OK |
| DataTable | v7.3.42 | OK |
| PortalNav | v7.3.42 | OK |
| WorkPackageList | - | **TODO: extrahieren** |
| WorkPackageAssignmentModal | - | **TODO: extrahieren** |

---

## 5. Naechster Chat

Im naechsten Chat:
1. Shared Components aus v7-firma-detail-page-v7_3_41-1.tsx extrahieren
2. Projekt-Detail-Seite auf Shared Components umstellen
3. AP-Bearbeitung + MA-Zuordnung aktivieren

Relevante Basis-Dateien:
- /mnt/project/v7-firma-detail-page-v7_3_41-1.tsx (2925 Zeilen)
- /mnt/project/Modal-v7_3_42.tsx
- /mnt/project/PortalHeader-v7_3_42.tsx
- /mnt/project/DataTable-v7_3_42.tsx

---

*Erstellt: 21. Januar 2026*
