# GIT-SICHERUNG - Session 27
## Multiprojekt-Tool Phase 1

**Datum:** 23. April 2026
**Session:** 27
**Version nach Session:** v7.4.8-1

---

## 1. ZIEL DIESER SESSION

Implementierung Phase 1 des Multiprojekt-Tools (MPT) / FZul-Moduls:
- Konzept v1.0 bis v1.2 erarbeitet und abgenommen
- Datenbankstruktur angelegt (DEV + PROD)
- Uebersichtsseite mit Vorhaben-Liste und Anlage-Modal
- Modul im Dashboard aktiviert

---

## 2. GEAENDERTE / NEUE DATEIEN

| Datei | Version | Aktion | Ziel |
|-------|---------|--------|------|
| `migration_fzul_modul_v7_4_8.sql` | v7.4.8 | NEU | Supabase DEV + PROD |
| `v7-types.ts` | v7.4.8-1 | Erweitert | `src/types/v7-types.ts` |
| `v7-module-config.ts` | v7.3.90-7 | Geaendert | `src/lib/v7-module-config.ts` |
| `berater-multiprojekt-page.tsx` | v7.4.8-1 | NEU | `src/app/v7/berater/multiprojekt/page.tsx` |
| `berater-dashboard/page.tsx` | v7.4.4-11 | Geaendert | `src/app/v7/berater/dashboard/page.tsx` |

---

## 3. DATENBANKSTRUKTUR (NEU)

### v7_fzul_vorhaben
FZul-Vorhaben pro Firma und Wirtschaftsjahr.
Felder: id, client_company_id, created_by, title, vorhaben_id,
wirtschaftsjahr, start_monat, ende_monat, bundesland, status, notes,
created_at, updated_at.
RLS: aktiv. Berater sehen nur eigene Kundenfirmen.

### v7_fzul_timesheets
Tagesweise FZul-Stunden pro MA und Vorhaben.
Felder: id, vorhaben_id, employee_id, work_date, fue_hours,
gefoerdert_hours, verfuegbar_hours, taetigkeitsbezeichnung, day_type,
holiday_label, urlaub_hours, krank_hours, sonderurlaub_hours,
notes, locked, created_at, updated_at.
UNIQUE: (vorhaben_id, employee_id, work_date).
RLS: aktiv.

**Hinweis:** Beide Tabellen existierten bereits als V6-Altlasten mit
falscher Struktur. DROP + Neuanlage war in DEV und PROD erforderlich.

---

## 4. KONZEPT-DOKUMENTE

- `KONZEPT-MULTIPROJEKT-FZUL-v1_0.md` — Erstentwurf
- `KONZEPT-MULTIPROJEKT-FZUL-v1_1.md` — Nach Abnahme Martin
- `KONZEPT-MULTIPROJEKT-FZUL-v1_2.md` — Ergaenzung Excel-Blattschutz

Alle drei in downloads/ abgelegt.

---

## 5. COMMITS DIESER SESSION

```
feat(v7.4.8-1): Multiprojekt-Tool Phase 1 - DB-Tabellen, Uebersichtsseite, Modul aktiv
```

---

## 6. GETESTET

- DEV (localhost:3000): Vorhaben anlegen fuer Cubintec GmbH ✅
- PROD (pze.itenion.com): Vorhaben anlegen fuer AS System ✅
- Modul-Kachel im Berater-Dashboard aktiv und klickbar ✅
- RLS-Policies in DEV und PROD aktiv ✅

---

## 7. BEKANNTE ISSUES / OFFENE PUNKTE

- Detailseite `/v7/berater/multiprojekt/[id]` fehlt noch (Phase 2)
  → 404 wenn auf Vorhaben-Karte geklickt wird
- Titel eines Vorhabens derzeit nicht editierbar (kommt in Phase 2)
- Passwort erscheint in Browser-URL beim Login (Firefox Auto-Fill)
  → kein PZE-Bug, Browser-seitig

---

## 8. NAECHSTE SCHRITTE (Phase 2 - Session 28)

1. Detailseite `/v7/berater/multiprojekt/[id]` anlegen
2. Tab 1: MA-Auswahl (Gruppe A mit gefoerderten Stunden, Gruppe B ohne)
3. Import-Logik: gefoerderte Stunden aus v7_timesheets aggregieren
4. Invertierung: verfuegbare FZul-Stunden als Vorschlag berechnen
5. Tab 2: Jahreskalender mit Farbcodierung (tagesweise Stundenansicht)
6. Editierbarkeit fue_hours pro Tag mit Validierung

---

## 9. VORGEMERKTER STRATEGISCHER PUNKT

Nach Abschluss der MPT-Arbeit im Berater-Portal soll das FZul-Vorhaben
perspektivisch als Projekt (Typ FZUL) im Firmen-Portal sichtbar werden.
Betrifft Schnittstelle Berater-Tool <-> Firmen-Portal.
Einzuplanen beim FZul-Modul (spaetere Phase).

---

**Session-Ende:** 23. April 2026
**Naechste Session:** Phase 2 Multiprojekt-Tool (Detailseite + Import)
