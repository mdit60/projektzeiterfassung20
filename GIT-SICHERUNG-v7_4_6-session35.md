# GIT-SICHERUNG v7.4.6 – Session 35

**Datum:** 1. Mai 2026
**SW-Release:** V7.4.6 (Patch)
**Bearbeiter:** Martin Ditscherlein / Claude

---

## Session-Zusammenfassung

Session 35 brachte sechs TimesheetForm-Bugfixes, drei Iterationen der Firmen-Anlage
(RLS-Fix, Doppel-Submit, Pflichtfeld), EmployeeManagement mit Orphan-Erkennung,
sowie Beratungsarbeit zur VETIS-Arbeitsplan-Korrektur.

---

## Geänderte Dateien

| Datei | Von | Nach | Beschreibung |
|-------|-----|------|--------------|
| src/components/shared/TimesheetForm.tsx | 7.4.6-4 | **7.4.6-10** | 6 Bugfixes (s.u.) |
| src/components/shared/EmployeeManagement.tsx | 7.3.95-13 | **7.3.95-14** | Verwaiste Login-User anzeigen |
| src/app/v7/berater/foerderung/page.tsx | 7.4.1-3 | **7.4.1-6** | Admin Pflichtfeld + Doppel-Submit + RLS-Fix |
| src/app/api/v7/create-user/route.ts | 7.4.1 | **7.4.1-1** | Profil + Employee server-seitig |

---

## TimesheetForm – Iterationen

| Build | Änderung |
|-------|----------|
| v7.4.6-5 | AP-Spalte 30→55px; Summe-Monat + offen je 50→25px; Druck-neutral (±0px) |
| v7.4.6-6 | `compareApCode` Versions-Sort: 3.1.1 < 3.1.2 < 3.4 < 4 < 5.1 an 3 Stellen |
| v7.4.6-7 | FIX: U/K/S in „sonstige Arbeiten" fehlte in `getAbsencesForDay` + `calculateAbsenceSums` |
| v7.4.6-8 | FIX: ArrowDown überspringt leere AP-Zeilen, nonbillable-Zeile immer erreichbar |
| v7.4.6-9 | FIX: `offen`-Spalte zeigt negative Stunden wenn MA kein Arbeitsplan-Eintrag (Vertretungsfall) |
| v7.4.6-10 | FIX: Feiertag auf Wochenende zeigte 8h in Fehlzeiten-Tageszelle (Summe war korrekt) |

---

## Firmen-Anlage – Iterationen

| Build | Änderung |
|-------|----------|
| v7.4.1-4 | Admin-Felder immer sichtbar (Checkbox entfernt), E-Mail Pflichtfeld |
| v7.4.1-5 | `saved`-Flag: Doppel-Submit verhindert, Modal schließt sofort nach Create |
| v7.4.1-6 | RLS-Fix: Profil+Employee-Insert clientseitig → server-seitig in create-user-Route |

---

## create-user-Route v7.4.1-1

Erweiterte Parameter: `client_company_id`, `first_name`, `last_name`, `portal_role`, `invited_by`.
Wenn `client_company_id` übergeben → alle 3 Schritte (Auth + v7_user_profiles + v7_employees)
mit Service-Role-Key (umgeht RLS). Vollständiger Rollback bei Fehler in Schritt 2 oder 3.

---

## EmployeeManagement v7.3.95-14

Neue Logik: Nach Employee-Abfrage zusätzlich `v7_user_profiles` der Firma laden.
User mit Login aber ohne `v7_employees`-Eintrag erscheinen als „verwaiste" Zeile
mit gelbem `⚠ Nur Login`-Badge und Hinweistext. Direkt über Stift-Symbol bearbeitbar.

---

## Nicht-Code-Arbeiten

**VETIS Arbeitsplan korrigiert (Excel):**
- Bewilligungsbeginn 03.03.2025 vs. Antragsbeginn 20.02.2025 → +11 Tage Verschiebung
- AP1-Enddatum-Tippfehler korrigiert (01.03. → 31.03., dann +11 = 11.04.2025)
- Ab AP3.3.1: Rückkehr ins Kalender-Raster (31.12.2025 / 01.01.2026)
- AP5.2 verlängert auf bewilligtes Projektende 02.03.2027
- PM-Werte unverändert (bewilligter Antrag)

**SQL-Sofortlösungen für GF ohne Mitarbeiter-Eintrag:**
- Passwort-Reset direkt via `crypt()` auf `auth.users`
- `client_company_id` in `v7_user_profiles` gesetzt
- `v7_employees`-Eintrag mit `client_admin`-Rolle nachträglich angelegt
- Duplikat bereinigt

---

## Offene Punkte (Backlog, unverändert)

1. Berater-Portal User Manual (fehlt noch)
2. Arbeitszeitgrenzen Phase 3: Live-Validierung Ampel-Trio
3. Stundennachweis-Wording projekttyp-spezifisch
4. Multiprojekt-Tool, Forschungszulage, De-minimis
5. AP-Quick-View Popup in TimesheetForm
6. ZAPanel Rollback "Bewilligt → Eingereicht"
7. Vercel-Setup Dokumentation (§14)

---

## Commit-Info

```
Branch: v7-dev → main
Commit: fix: TimesheetForm 6x Bugfix + Firmenanlage RLS/Doppel-Submit + EmployeeManagement Orphan (Session 35)
```
