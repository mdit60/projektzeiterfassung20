# GIT-SICHERUNG Session 44

**Datum:** 12. Mai 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v4.92
**PROD-Stand:** AppNav v1.0.1, PortalNav v7.4.4-22, ZASeite v1.0.8, berater-cockpit-page v7.4.9-3

---

## Zusammenfassung

Session 44 hatte zwei Schwerpunkte: (1) Bereinigung aller Projekt- und Archivverzeichnisse,
(2) Konsistente Navigation in der neuen App-Struktur. Der Begriff "Cockpit" wurde aus
der gesamten UI entfernt, ersetzt durch ein reines Home-Icon (Haeuschen). Die Nav-Zeile
zeigt jetzt auf jeder Seite dieselben Items, aktive Items werden hervorgehoben statt
versteckt. Forschungszulage wurde als Nav-Item ergaenzt.

---

## Geaenderte Dateien

### Aktualisierte Komponenten
| Datei | Version | Ziel | Aenderung |
|-------|---------|------|-----------|
| AppNav-v1_0_1.tsx | 1.0.1 | src/components/shared/AppNav.tsx | Home nur Icon, kein Label "Cockpit" |
| PortalNav-v7_4_4-22.tsx | 7.4.4-22 | src/components/shared/PortalNav.tsx | Home->Startseite, Kundenfirmen->Firmenliste, FZul ergaenzt, aktive Items hervorgehoben |
| ZASeite-v1_0_8.tsx | 1.0.8 | src/components/shared/ZASeite.tsx | "Zurueck zum Cockpit" -> "Zurueck" |

### Aktualisierte Seiten
| Datei | Version | Ziel | Aenderung |
|-------|---------|------|-----------|
| berater-multiprojekt-page-v7_4_8-12.tsx | 7.4.8-12 | src/app/v7/berater/multiprojekt/page.tsx | Dashboard-Link im App-Modus ausgeblendet |
| berater-firma-detail-page-v7_4_4-7.tsx | 7.4.4-7 | src/app/v7/berater/foerderung/firma/[id]/page.tsx | "Zurueck zum Cockpit" -> "Zurueck" |
| berater-cockpit-page-v7_4_9-3.tsx | 7.4.9-3 | src/app/v7/berater/foerderung/firma/[id]/cockpit/page.tsx | userRole korrekt, select-Modus, keine doppelte PortalNav |

---

## Architektur-Entscheidungen Session 44

1. **Kein "Cockpit" in der UI:** Home-Button ist nur ein Haeuschen-Icon (20px), kein Text.
   Universell verstaendlich, spart Platz. Tooltip "Startseite" beim Hovern.
2. **Konsistente Nav:** Im App-Modus werden aktive Items hervorgehoben (nicht versteckt).
   Auf jeder Seite sieht der User: Home | Kundenfirmen | Netzwerk | Kapazitaetsplanung |
   Forschungszulage | Administration (nur system_admin).
3. **Kundenfirmen im App-Modus:** Link fuehrt zur Firmenliste mit Buchstaben-Kacheln
   (/v7/berater/foerderung/firma/select/cockpit), nicht zur alten Tabelle.
4. **FirmaCockpit rendert eigene PortalNav:** Page-Wrapper darf keine zweite PortalNav
   enthalten, sonst Verdopplung.
5. **Projektverzeichnis-Workflow:** Waehrend der Session nur ins downloads/ herunterladen.
   Am Session-Ende Upload-Checkliste fuer Claude-Projektverzeichnis erstellen.

---

## Nicht-Code-Arbeiten Session 44

- Downloads-Verzeichnis bereinigt (57 alte Versionen -> archiv/ mit Unterordnern)
- Archiv-Unterordner aufgeraeumt (komponenten, git-sicherung, pflichtenheft, konzepte, anleitungen, sonstige)
- Claude-Projektverzeichnis bereinigt (81 alte Versionen entfernt)
- PZE-Root bereinigt (alte PFLICHTENHEFT + GIT-SICHERUNG per git rm)

---

## Offene Punkte fuer naechste Session

1. Firmen-Cockpit Sub-Pages verdrahten (Neues Projekt, Neue ZA, Firmendaten,
   Projektdaten/Fortschritt/Stundennachweis, ZA bearbeiten, MA bearbeiten)
2. returnTo-URLs auf /v7/berater/app/ umstellen
3. Login-Redirect: pze_mode='app' -> direkt zu App-Cockpit
4. FZul-Seite: PortalHeader + PortalNav einbauen (wenn Modul ausgebaut wird)
5. ProjektFortschrittPanel auf projektfortschritt-utils refactoren

---

## GIT-Sicherung Befehle

```bash
git checkout v7-dev
git add PFLICHTENHEFT-v4_92.md GIT-SICHERUNG-v7_4_9-session44.md
git commit -m "Session 44: Pflichtenheft v4.92 + GIT-Sicherung"
git push origin v7-dev
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```
