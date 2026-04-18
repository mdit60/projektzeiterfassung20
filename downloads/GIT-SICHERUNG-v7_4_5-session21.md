# GIT-SICHERUNG - Session 21
# Datum: 18. April 2026 (Nachmittag)
# SW-Release: V7.4.5

## Commits dieser Session

### Pruefung und Bereinigung
- DEV-Altlasten geloescht: fzul_employee_settings, fzul_vorhaben_settings,
  import_employees, imported_timesheets (waren V6-Relikte)
- RLS-Status PROD verifiziert: Alle v7-Tabellen haben RLS aktiv
  (v7_user_profiles + v7_timesheets waren entgegen Pflichtenheft bereits aktiv)
- RLS fuer v7_timesheet_notes aktiviert (DEV + PROD) mit v7_can_access_client()
- Downloads-Ordner aufgeraeumt: 872 -> ~60 Dateien (alte Versionen archiviert)

### Offene-Punkte-Check (Pflichtenheft bereinigt)
- Bug 5.9 (Header-Farbe Firma-Detail): Bereits erledigt -> abgehakt
- Bug 5.10 (Stundensatz Annika Arndt): Bereits erledigt -> abgehakt
- NWM USt-Aufteilung: Bereits erledigt -> abgehakt
- Separate PROD/DEV Datenbank: Bereits erledigt -> abgehakt
- ZIM-PDF-Import: Zurueckgestuft (Excel-Arbeitsplan-Import funktioniert gut)

### v7.4.5-22: Fix Zurueck-Button NWM + SWC-Bug
- ProjectDetailPage-v7_4_4-49 (Basis: stabile -40, NICHT -46!)
  - fromNWMList als useState (stabil bei Re-Render, geht nicht verloren)
  - getBackUrl(): fromNWMList -> /v7/berater/netzwerk
  - getBackLabel(): fromNWMList -> "Netzwerke" statt "Firma"
  - NWM-Tab Zurueck-Button: router.push statt setActiveTab wenn fromNWMList
  - bg-black/50 -> bg-black bg-opacity-50 (SWC-Compiler-Bug Praevention)
- LERNPUNKT: Versionen -41 bis -48 waren alle fehlerhaft (SWC-Bug durch
  bg-black/50 Slash-Syntax). Immer von letzter STABILER Version ausgehen,
  nicht von der letzten ERSTELLTEN Version.

## Dateien dieser Session

| Datei | Version | Ziel im Repo |
|-------|---------|-------------|
| ProjectDetailPage | v7.4.4-49 | src/components/shared/ProjectDetailPage.tsx |

## DB-Aenderungen
- RLS auf v7_timesheet_notes aktiviert (DEV + PROD)
  - SELECT/INSERT/UPDATE/DELETE Policies mit v7_can_access_client()
- DEV: 4 Altlasten-Tabellen geloescht

## Workflow-Verbesserungen
- Deploy-Workflow um Archivierungsschritt ergaenzt:
  Nach erfolgreichem Test alte Version nach downloads/archiv/ verschieben
- Downloads-Ordner Whitelist-Cleanup durchgefuehrt

## Bekannte offene Punkte
- Gestaffelte Foerderquoten (foerdersatz_stufen): Gemeinsam pruefen
- Stundennachweis Wording projekttyp-spezifisch: Noch offen
- Berater-Portal User Manual (PDF): Noch offen
- Anleitungen Admin + PL aktualisieren (Notizen-Funktion): Noch offen
- Drei grosse Module: Multiprojekt, Forschungszulage, De-minimis
