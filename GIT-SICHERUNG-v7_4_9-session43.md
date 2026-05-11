# GIT-SICHERUNG Session 43

**Datum:** 11. Mai 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v4.91
**PROD-Stand:** FirmaCockpit v7.4.9-23, ZAPanel v7.4.4-52, PortalNav v7.4.4-19, PortalHeader v7.3.95-11

---

## Zusammenfassung

Session 43 war ein architektonischer Wendepunkt: Statt weiter die bestehende Navigation
zu patchen, wurde eine **parallele App-Struktur** unter `/v7/berater/app/` aufgebaut.
Alte Struktur bleibt komplett unangetastet. Umschaltung nur fuer system_admin via
Ansicht-Wechsler im User-Dropdown.

---

## Geaenderte Dateien

### Neue Dateien (App-Struktur)
| Datei | Ziel | Beschreibung |
|-------|------|-------------|
| AppNav-v1_0_0.tsx | src/components/shared/AppNav.tsx | Neue Navigation: Cockpit, Netzwerk, KPT, FZul, Admin |
| berater-app-cockpit-page-v1_0_0.tsx | src/app/v7/berater/app/cockpit/page.tsx | 4 Kacheln + Firma-Dropdown |
| berater-app-firma-page-v1_0_0.tsx | src/app/v7/berater/app/firma/[id]/page.tsx | Firmen-Cockpit Route |
| berater-projekt-neu-page-v1_0_0.tsx | src/app/v7/berater/foerderung/firma/[id]/projekt/neu/page.tsx | Projekt-Anlage mit returnTo |

### Aktualisierte Komponenten
| Datei | Version | Ziel |
|-------|---------|------|
| PortalHeader-v7_3_95-11.tsx | 7.3.95-11 | src/components/shared/PortalHeader.tsx |
| PortalNav-v7_4_4-19.tsx | 7.4.4-19 | src/components/shared/PortalNav.tsx |
| FirmaCockpit-v7_4_9-23.tsx | 7.4.9-23 | src/components/shared/FirmaCockpit.tsx |
| EmployeeManagement-v7_3_95-17.tsx | 7.3.95-17 | src/components/shared/EmployeeManagement.tsx |
| ZAPanel-v7_4_4-52.tsx | 7.4.4-52 | src/components/shared/ZAPanel.tsx |
| ProjectList-v7_3_88-7.tsx | 7.3.88-7 | src/components/shared/ProjectList.tsx |

### Aktualisierte Seiten
| Datei | Version | Ziel |
|-------|---------|------|
| berater-firma-detail-page-v7_4_4-6.tsx | 7.4.4-6 | src/app/v7/berater/foerderung/firma/[id]/page.tsx |
| foerderung-page-v7_4_1-7.tsx | 7.4.1-7 | src/app/v7/berater/foerderung/page.tsx |
| berater-multiprojekt-page-v7_4_8-12.tsx | 7.4.8-12 | src/app/v7/berater/multiprojekt/page.tsx |
| berater-netzwerk-page-v7_4_5-3.tsx | 7.4.5-3 | src/app/v7/berater/netzwerk/page.tsx |

---

## Architektur-Entscheidungen Session 43

1. **Parallele App-Struktur:** Neue Routen unter /v7/berater/app/, alte bleiben unangetastet
2. **Ansicht-Wechsler:** localStorage pze_mode ('classic'|'app'), nur system_admin sieht Wechsler
3. **Inline-Modals:** Neuer MA oeffnet Modal direkt im Cockpit statt Seitenwechsel
4. **Zukunft:** Cockpit-Freischaltung via Admin-Toggles fuer Berater/Firmen (kein Wechsler fuer andere)

---

## Offene Punkte fuer Session 44

1. Firmen-Cockpit Sub-Pages in App-Struktur verdrahten (12-19 aus Navigationsliste):
   - Neues Projekt (Inline-Modal oder Route)
   - Neue ZA (Inline-Modal oder Route)
   - Firmendaten bearbeiten
   - Projektdaten/Fortschritt/Stundennachweis aufrufen
   - ZA bearbeiten (Klick auf ZA-Nummer)
   - MA bearbeiten (Inline-Modal)
2. returnTo-URLs auf /v7/berater/app/ umstellen
3. Login-Redirect: pze_mode='app' -> direkt zu App-Cockpit
4. Projektverzeichnis aufraeumen (alte Versionen archivieren)

---

## GIT-Sicherung Befehle

```bash
git checkout v7-dev

# Pflichtenheft + GIT-SICHERUNG einchecken
# (Dateien muessen im Repo-Root liegen)

git add PFLICHTENHEFT-v4_91.md GIT-SICHERUNG-v7_4_9-session43.md
git commit -m "Session 43: Pflichtenheft v4.91 + GIT-Sicherung"
git push origin v7-dev

git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```
