# GIT-SICHERUNG Session 50

**Datum:** 01. Juni 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v4.99
**PROD-Stand:** Alle Aenderungen deployed und auf PROD verifiziert.

---

## Zusammenfassung

Session 50 war eine Feature-Session mit hoher Dichte. Zwei seit Session <=42 offene
Kundenwuensche (A-002 Wording, A-003 AP-Quick-View) wurden endlich umgesetzt, dazu
eine substantielle neue Anforderung (A-021 NWM-Tagessperren + Cross-Projekt-Validierung)
und ein kritischer Berechnungs-Fix (A-022 Kapazitaetsplanung). Nebenbei wurden mehrere
entdeckte Bugs gefixt (Cockpit-Freischaltung fuer Berater, Header-Rollenanzeige).

Neue DB-Tabelle: `v7_nwm_blocked_periods` (DEV + PROD).

---

## Was wurde ausgeliefert (Commits auf v7-dev -> main)

| Thema | Dateien/Versionen | Beschreibung |
|-------|-------------------|--------------|
| A-002 + A-003 | TimesheetForm v7.4.6-21 | NWM-Wording "foerderbare Management-Arbeiten" + AP-Quick-View Modal (Info-Icon neben Projekt-Dropdown) |
| Cockpit-Fix | PortalHeader v7.3.95-12, login-page v7.3.90-7 | Berater landen automatisch im Cockpit wenn Admin es freigibt. Fix: Config-Query auf korrekte Spalten key/value. localStorage-Sync fuer Nicht-system_admin. |
| A-021 (NWM-Sperren) | TimesheetForm v7.4.6-22 | NWM-Tagessperren (Admin sperrt Tage fuer MA) + Cross-Projekt 9h-Grenze (projektuebergreifende Tagessumme). Neuer useEffect laedt Sperren + Fremdstunden. Sperren-Modal mit MA-Mehrfachauswahl. |
| A-021 (DB) | SQL-MIGRATION-nwm-blocked-periods-v1.sql | Neue Tabelle v7_nwm_blocked_periods (project_id, employee_id, start_date, end_date, reason). RLS: alle lesen, consultant/system_admin schreiben. |
| A-022 (Kapa-Fix) | berater-multiprojekt-page v7.4.8-14 | Monatskapazitaet auf echte Arbeitstage x (WAZ/5) umgestellt. Vorher: pauschale 173,33h. Jetzt: countWorkdaysInMonth() mit Feiertagen + v7_employee_hours_history fuer unterjaerige WAZ-Aenderungen. |
| A-022 (MA-Link) | berater-multiprojekt-page v7.4.8-15..17, FirmaCockpit v7.4.9-30 | Klick auf MA-Name in Kapazitaetsmatrix -> Deep-Link mit ?editMA + ?returnTo -> MA-Bearbeitungs-Modal oeffnet direkt, Ruecksprung zur KP nach Schliessen/Speichern (useRef). |
| Header-Fix | PortalHeader v7.3.95-13 | Firmen-Portal: portal_role aus v7_employees statt generischem client_user aus v7_user_profiles. client_user-Fallback als "Nutzer" gemappt. |

---

## Neue/geaenderte Dateien (fuer Claude-Projektverzeichnis)

### NEU hochladen:
- `TimesheetForm-v7_4_6-22.tsx` (ersetzt v7_4_6-20)
- `berater-multiprojekt-page-v7_4_8-17.tsx` (ersetzt v7_4_8-13)
- `FirmaCockpit-v7_4_9-30.tsx` (ersetzt v7_4_9-29)
- `PortalHeader-v7_3_95-13.tsx` (ersetzt v7_3_95-11)
- `login-page-v7_3_90-7.tsx` (ersetzt v7_3_90-6)
- `SQL-MIGRATION-nwm-blocked-periods-v1.sql` (NEU)
- `GIT-SICHERUNG-v7_4_9-session50.md` (NEU)
- `PFLICHTENHEFT-v4_99.md` (ersetzt v4_98)

### ALT loeschen:
- `TimesheetForm-v7_4_6-20.tsx`
- `berater-multiprojekt-page-v7_4_8-13.tsx`
- `FirmaCockpit-v7_4_9-29.tsx`
- `PortalHeader-v7_3_95-11.tsx`
- `login-page-v7_3_90-6.tsx`
- `GIT-SICHERUNG-v7_4_9-session49.md`
- `PFLICHTENHEFT-v4_98.md`

---

## Offene Punkte (Stand nach Session 50)

| ID | Anforderung | Status |
|----|-------------|--------|
| A-001 | Berater-Portal Benutzerhandbuch | In Arbeit |
| A-012 | Standalone StundennachweisSeite + ProjektfortschrittSeite | Offen |
| A-013 | Verwaiste Seite v7/firmen/[id]/page.tsx aufraeumen | Offen |
| A-019 | Namens-Vereinheitlichung K/C (niedrige Prio) | Offen |
| A-020 | Firmen-Deaktivierung im App-Paradigma fehlt | Offen |

Erledigt in dieser Session: A-002, A-003, A-021, A-022.
