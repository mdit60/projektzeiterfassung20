# GIT-SICHERUNG v7.4.4 – Session 34

**Datum:** 29. April 2026
**SW-Release:** V7.4.4 (Patch)
**Bearbeiter:** Martin Ditscherlein / Claude

---

## Session-Zusammenfassung

Session 34 konzentrierte sich auf Dokumentation und Administration:

1. **Benutzeranleitungen aktualisiert** (PL v2.1 + Admin v2.2) als vollständige DOCX-Neuschrift
2. **System-Konfigurationstabelle** eingeführt (`v7_system_config`)
3. **Toggle für Anleitungs-Downloads** in Berater-Admin implementiert
4. **Stabile PDF-URLs** ohne Versionsnummer eingeführt

---

## Geänderte Dateien

| Datei | Von | Nach | Beschreibung |
|-------|-----|------|--------------|
| src/components/shared/PortalNav.tsx | 7.4.4-8 | 7.4.4-12 | manuals_enabled aus v7_system_config, stabile PDF-URLs, MA ohne Anleitung |
| src/components/shared/SystemConfigPanel.tsx | (neu) | 7.4.4-2 | Toggle Anleitungs-Downloads, Info-Box verknüpfte Dateien |
| src/app/v7/berater/admin/page.tsx | 7.3.94 | 7.3.94-1 | SystemConfigPanel eingebunden |

---

## Neue Dateien (nicht im Repo)

| Datei | Ablage | Beschreibung |
|-------|--------|--------------|
| PZE-Anleitung-Projektleiter-v2_1.docx | downloads/ | Neue PL-Anleitung (vollständig neu) |
| PZE-Anleitung-Firmen-Administrator-v2_2_0.docx | downloads/ | Neue Admin-Anleitung (vollständig neu) |
| public/manuals/PZE_Anleitung_Projektleiter.pdf | public/manuals/ | Live-PDF (stabiler Name) |
| public/manuals/PZE_Anleitung_Firmen-Administrator.pdf | public/manuals/ | Live-PDF (stabiler Name) |

---

## Datenbank-Änderungen

### DEV + PROD (SQL-v7_system_config.sql)

```sql
CREATE TABLE IF NOT EXISTS v7_system_config (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);
INSERT INTO v7_system_config (key, value)
  VALUES ('manuals_enabled', 'true') ON CONFLICT (key) DO NOTHING;
-- RLS: SELECT alle authenticated, ALL nur system_admin
```

Status: In DEV und PROD ausgeführt und verifiziert.

---

## Iterationen dieser Session

| Build | Datei | Änderung |
|-------|-------|----------|
| v7.4.4-9 | PortalNav | manuals_enabled aus v7_system_config |
| v7.4.4-10 | PortalNav | Stabile PDF-URLs (ohne Versionsnummer) |
| v7.4.4-11 | PortalNav | MA-Anleitung entfernt (nur FAQ für employee) |
| v7.4.4-12 | PortalNav | Dateinamen-Schreibweise korrigiert (PZE_Anleitung_...) |
| v7.4.4-1 | SystemConfigPanel | Neu: Toggle + Info-Box |
| v7.4.4-2 | SystemConfigPanel | Mitarbeiter-Zeile entfernt, stabile Dateinamen |
| v7.3.94-1 | berater-admin-page | SystemConfigPanel eingebunden |

---

## Gelöste Probleme

- Anleitungs-Downloads waren nach Überarbeitung der PDFs gesperrt (hardcoded in v7.4.4-8)
- Neue Steuerung über DB-Toggle eliminiert künftig jeden Code-Deploy für diesen Zweck
- Dateinamen-Inkonsistenz zwischen Code (Bindestriche) und tatsächlichen PDFs (Unterstriche) behoben

---

## Offene Punkte (Backlog)

Unverändert aus Session 33 – keine neuen Punkte aufgenommen:

1. Anleitungen für PL + Admin auf v2.1/v2.2 bringen (erledigt diese Session)
2. Berater-Portal User Manual (fehlt noch)
3. Arbeitszeitgrenzen Phase 3: Live-Validierung Ampel-Trio in TimesheetForm + Matrix + BerichtePage
4. Stundennachweis Wording projekttyp-spezifisch (standard vs. Netzwerk)
5. Multiprojekt-Tool, Forschungszulage, De-minimis
6. Vercel-Setup Dokumentation (Pflichtenheft §14)
7. AP-Quick-View Popup in TimesheetForm
8. ZAPanel Rollback "Bewilligt → Eingereicht" (nur "Bewilligt → Entwurf" vorhanden)

---

## Commit-Info

```
Branch: v7-dev → main
Commit: feat: Anleitungen v2.x, SystemConfigPanel, manuals_enabled Toggle (Session 34)
```
