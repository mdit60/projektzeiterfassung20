# GIT-SICHERUNG - PZE Projekt

**Version:** v7.3.0  
**Datum:** 06. Januar 2026  
**Session:** Firmen-Portal Sprint 1 - Dashboard & Einladungssystem

---

## Zusammenfassung dieser Session

### Hauptergebnis: Firmen-Portal Grundstruktur 🏢

Das Firmen-Portal wurde konzipiert und die Basis-Komponenten erstellt:
- **Firmen-Dashboard** für Client-Admins und Mitarbeiter
- **Erweiterte Berater-Sicht** mit Status-Anzeige und GF-Anlage
- **Einladungssystem** (Berater lädt Firma ein)

### Neue Features

| Feature | Beschreibung |
|---------|--------------|
| Firmen-Dashboard | `/v7/firma/` - Übersicht für Firmenmitarbeiter |
| Status-System | invited → registered → active → inactive |
| GF-Anlage | Firma + Admin-User in einem Schritt erstellen |
| Einladungslink | Token-basierte Selbstregistrierung (vorbereitet) |
| Rollen-Filter | Admin sieht alles, MA nur eigene Zeiterfassung |

### Status-Konzept

| Status | Bedeutung | Icon |
|--------|-----------|------|
| `invited` | Einladung verschickt, wartet | 🟡 |
| `registered` | Selbst-registriert, wartet auf Bestätigung | 🟠 |
| `active` | Aktiv, kann arbeiten | 🟢 |
| `inactive` | Deaktiviert | ⚫ |

---

## Neue/Geänderte Dateien

### Datenbank-Migration
```
v7-migration-client-status.sql    # Neue Spalten für Status & Onboarding
```

### Frontend-Dateien
```
src/app/v7/firma/page.tsx                    # NEU: Firmen-Dashboard
src/app/v7/berater/foerderung/page.tsx       # AKTUALISIERT: Status + GF-Anlage
```

---

## Datenbank-Änderungen

### Neue Spalten in v7_client_companies

```sql
-- WICHTIG: In Supabase SQL Editor ausführen!

ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('invited', 'registered', 'active', 'inactive'));

ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS onboarding_type TEXT 
CHECK (onboarding_type IN ('by_consultant', 'self_registration'));

ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ;

ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS invitation_token UUID DEFAULT gen_random_uuid();

ALTER TABLE v7_client_companies 
ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;

-- Bestehende Firmen aktualisieren
UPDATE v7_client_companies 
SET status = 'active', onboarding_type = 'by_consultant', registered_at = created_at
WHERE status IS NULL;

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_v7_client_companies_status ON v7_client_companies(status);
```

---

## Git-Befehle

### 1. Status prüfen
```bash
cd ~/Documents/Dev/PZE
git status
```

### 2. Alle Änderungen stagen
```bash
git add .
```

### 3. Commit
```bash
git commit -m "v7.3.0: Firmen-Portal Sprint 1 - Dashboard & Einladungssystem

NEUE FEATURES:
- Firmen-Dashboard (/v7/firma/) für Client-Admins und Mitarbeiter
- Status-System für Firmen (invited, registered, active, inactive)
- Firma + Admin-User in einem Schritt anlegen
- Einladungslink-System vorbereitet
- Rollen-basierte Sichtbarkeit (Admin vs. Mitarbeiter)

DATENBANK:
- Neue Spalten: status, onboarding_type, invited_at, registered_at, invitation_token

UI-VERBESSERUNGEN:
- Status-Badges auf Firmenkarten
- Filter nach Status
- Aktivieren-Button für eingeladene Firmen
- Einladungslink kopieren

DEV-HINWEIS:
- Festes Passwort 'Test1234!' für Entwicklung
- E-Mail-Versand noch nicht implementiert"
```

### 4. Push
```bash
git push origin v7-dev
```

### 5. Optional: Tag setzen
```bash
git tag -a v7.3.0-dev -m "Firmen-Portal Sprint 1"
git push origin v7.3.0-dev
```

---

## Nächste Schritte (Sprint 2)

| Nr. | Feature | Aufwand |
|-----|---------|---------|
| 1 | Zeiterfassung-Seite (`/v7/firma/zeiterfassung/`) | ~6-8h |
| 2 | Projektverwaltung (`/v7/firma/projekte/`) | ~3h |
| 3 | Mitarbeiterverwaltung (`/v7/firma/mitarbeiter/`) | ~3h |
| 4 | Berichte (`/v7/firma/berichte/`) | ~2h |

---

## Test-Szenario

1. **Als Berater einloggen** → `/v7/berater`
2. **Förderberatung öffnen** → Firmenübersicht mit Status
3. **Neue Firma anlegen** mit "Administrator-Zugang erstellen"
4. **In neuem Browser** mit der neuen Admin-E-Mail + Passwort `Test1234!` einloggen
5. **Firmen-Dashboard** sollte erscheinen

---

**Erstellt:** 06. Januar 2026  
**Autor:** Claude AI / Martin Ditscherlein
