# GIT-Sicherung Session 42 (Zwischenstand)
**Datum:** 9. Mai 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v4.89
**Branch:** v7-dev

---

## Was wurde gemacht

### 1. Konzeptionelle Entscheidungen (kein Code)

**PZE V8-C Produktbenennung:**
- Produkt heisst ab sofort **PZE V8-C** (C = Cockpit-Paradigma)
- Code-Pfade und DB-Tabellen bleiben intern `v7` (kein Refactoring noetig)
- V8-C = neues UX-Paradigma mit Cockpit als zentraler Arbeitsumgebung
- Version im Header dynamisch: V7 (ohne Cockpit) / V8-C (mit Cockpit)

**Architekturentscheidung Service-Pages:**
- Hybridmodell: ZA-Bearbeitung als Modal im Cockpit (hoehere Frequenz)
- Alle anderen Service-Seiten: returnTo-Navigation (bereits implementiert)
- Keine grosse Umbau-Aktion - organische Weiterentwicklung

**Downloads-Verzeichnis aufgeraeumt:**
- Archiv-Unterordner-Struktur wiederhergestellt (anleitungen, deploy-scripts,
  git-sicherung, komponenten, konfiguration, konzepte, migrationen,
  pflichtenheft, planung, seiten, sonstige)
- Alte Versionen sortiert in korrekte Unterordner
- Verschachtelte downloads/downloads/ und downloads/seiten/ bereinigt
- Leere Git-Artefakt-Ordner (auf, main, mb-8 etc.) geloescht
- Alte parse-zim-pdf Versionen nach archiv/sonstige/
- pze-backup und pze-backup-session40 Bereinigung laeuft noch

### 2. PortalHeader v7.3.95-6 bis v7.3.95-10 (5 Iterationen)

**Ziel:** Komplett neues Header-Design, vollstaendig entkoppelt von aufrufenden Seiten.

| Version | Was |
|---------|-----|
| v7.3.95-6 | Basis-Redesign: 3-Spalten-Layout, volle Breite, PZE-Block links, Versionsnummer, Copyright, Rollenanzeige rechts |
| v7.3.95-7 | FIX: usePathname() statt currentPath-Prop; Berater-Firma aus DB (falsche Tabelle!) |
| v7.3.95-8 | FIX: Korrekte DB-Tabelle (v7_consultant_companies via consultant_company_id); Rollenbezeichnungen DE (Projektkoordinator, System Administrator, Berater) |
| v7.3.95-9 | FIX: system_admin Rollenhierarchie (immer Vorrang vor portalRole) |
| v7.3.95-10 | FIX: Rolle vollstaendig aus DB geladen - komplett entkoppelt von Props |

**Endstand PortalHeader v7.3.95-10:**

3-Spalten-Layout (grid-cols-3):
- LINKS: [PZE]-Block (Farbe) + Versionsnummer (V7/V8-C) + (c) Cubintec
- MITTE: Eingeloggte Firma + Portal-Typ (aus DB, nie von Props)
- RECHTS: Username | Rollenbezeichnung + Dropdown

Versionslogik (vollstaendig von Props entkoppelt):
- usePathname() direkt im Header
- V8-C wenn cockpit_berater_enabled=true (global) ODER URL enthaelt /cockpit
- V7 sonst

Firmenname (Berater-Portal):
- Laedt eigene Firma aus v7_consultant_companies via consultant_company_id
- Niemals companyName-Prop verwendet
- Kundenfirma erscheint nie im Header

Rollenanzeige (vollstaendig von Props entkoppelt):
- Laedt role direkt aus v7_user_profiles
- userRole + portalRole Props nur als Fallback waehrend Laden
- Einheitlich auf allen Seiten

Rollenbezeichnungen:
- system_admin   -> System Administrator (hat immer Vorrang)
- consultant     -> Berater
- berater        -> Berater
- client_admin   -> Administrator
- project_leader -> Projektkoordinator
- employee       -> Mitarbeiter

---

## Geaenderte Dateien

| Datei | Version | Pfad |
|-------|---------|------|
| PortalHeader-v7_3_95-10.tsx | **7.3.95-10** | src/components/shared/PortalHeader.tsx |
| PFLICHTENHEFT-v4_89.md | 4.89 | PFLICHTENHEFT-v4_89.md (Repo-Root) |

## Archiviert (-> downloads/archiv/komponenten/)

- PortalHeader-v7_3_95-6.tsx
- PortalHeader-v7_3_95-7.tsx
- PortalHeader-v7_3_95-8.tsx
- PortalHeader-v7_3_95-9.tsx

---

## GIT-Befehle

```bash
cd ~/Documents/Dev/pze
git checkout v7-dev
git add -A
git commit -m "Session 42 Zwischenstand: PortalHeader v7.3.95-10 + PZE V8-C Konzept

- PortalHeader komplett redesigned (3-Spalten, volle Breite)
- Version V7/V8-C dynamisch via usePathname + cockpit_berater_enabled
- Firmenname immer aus DB (v7_consultant_companies) - nie aus Props
- Rolle immer aus DB (v7_user_profiles.role) - nie aus Props
- Rollenbezeichnungen DE: System Administrator, Berater, Projektkoordinator
- Produkt-Benennung PZE V8-C dokumentiert
- Downloads-Verzeichnis aufgeraeumt"

git push origin v7-dev

# Deploy auf main
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```

---

## Offene Punkte Session 42 (Fortsetzung)

1. **Schritt 0b:** Login-Footer + BerichtePage-Footer: Version dynamisch anpassen
2. **Schritt 1:** ZA-Bearbeitung im Cockpit - Klick auf ZA-Nr. oeffnet ZA direkt
3. **Schritt 2:** Action-Buttons Zielnavigation verfeinern
4. **Schritt 3:** ProjektFortschrittPanel auf projektfortschritt-utils refactoren

---

## Naechste Schritte nach Sicherung

Weiter mit Session 42 Schritt 0b (Login + BerichtePage Footer).
