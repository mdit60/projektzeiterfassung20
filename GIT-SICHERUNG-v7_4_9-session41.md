# GIT-Sicherung Session 41
**Datum:** 8. Mai 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v4.87

---

## Geaenderte / Neue Dateien

### Neue Dateien
| Datei | Ziel | Beschreibung |
|-------|------|--------------|
| projektfortschritt-utils-v7_4_9-1.ts | src/lib/projektfortschritt-utils.ts | Extrahierte Berechnungslogik (Monatsverlauf, Prognose, Szenarien) |

### Aktualisierte Shared Components
| Datei | Ziel | Beschreibung |
|-------|------|--------------|
| FirmaCockpit-v7_4_9-10.tsx | src/components/shared/FirmaCockpit.tsx | Cockpit MIS: Dropdown-Projektauswahl, Monatsverlauf-Chart, Prognose, Firma-Dropdown, PortalNav, Action-Buttons |
| PortalHeader-v7_3_95-5.tsx | src/components/shared/PortalHeader.tsx | Home-Icon entfernt (redundant mit PortalNav) |

### Pflichtenheft
| Datei | Ziel | Beschreibung |
|-------|------|--------------|
| PFLICHTENHEFT-v4_87.md | PFLICHTENHEFT-v4_87.md (Repo-Root) | Sessions 39-41 dokumentiert |

---

## GIT-Befehle

```bash
cd ~/Documents/Dev/pze

# Sicherstellen dass v7-dev aktiv
git checkout v7-dev

# Alle Aenderungen stagen
git add -A

# Commit
git commit -m "Session 41: Cockpit Berater-Zentrale - Monatsverlauf, Prognose, Firma-Dropdown, PortalNav, Action-Buttons

- NEU: lib/projektfortschritt-utils.ts (extrahierte Berechnungslogik)
- FirmaCockpit v7.4.9-10 (Dropdown, Chart, Prognose, Firma-Wechsel, Buttons)
- PortalHeader v7.3.95-5 (Home-Icon entfernt)
- Pflichtenheft v4.87"

# Push auf v7-dev
git push origin v7-dev
```

---

## Zusammenfassung Session 41

### Kern-Ergebnis: Cockpit als Berater-Zentrale
Das Firma-Cockpit wurde von einer statischen Uebersicht zur vollwertigen
Berater-Arbeitsumgebung ausgebaut:

1. **Berechnungslogik extrahiert** (projektfortschritt-utils.ts)
   - calculateProjectAnalysis() liefert alles: Laufzeit, PM, Kosten,
     Monatsverlauf, Prognose, Szenarien
   - Wird vom Cockpit genutzt, spaeter auch vom ProjektFortschrittPanel

2. **Dropdown-Projektauswahl** statt Kartenliste
   - Alle 3 Spalten (MA, Projekte+Chart, ZA) reagieren synchron
   - Monatsverlauf-Chart (recharts ComposedChart) mit Soll/Ist + Prognose
   - Prognose-Box mit Ampel und Hochrechnung

3. **Firma-Dropdown** im Berater-Portal
   - Firmenwechsel direkt im Cockpit, ohne Dashboard-Umweg
   - "Neue Firma"-Button

4. **PortalNav konsistent** auf allen Seiten
   - Cockpit rendert PortalNav am Kopf
   - Home-Icon aus PortalHeader entfernt (redundant)

5. **Action-Buttons** in allen Bereichen
   - Firmendaten bearbeiten, Neuer MA, Neues Projekt, Neue ZA
   - Navigieren zu Verwaltungsseiten mit returnTo=cockpit

### Naechste Schritte
- Action-Buttons: Zielnavigation verfeinern (Dialoge im Cockpit statt externe Seiten)
- ProjektFortschrittPanel auf projektfortschritt-utils refactoren
- "Alle Projekte"-Option im Dropdown
- Berater-Landing direkt aufs Cockpit
