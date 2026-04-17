# GIT-SICHERUNG - Session 19
**Datum:** 17. April 2026
**SW-Release:** V7.4.5
**Pflichtenheft:** v4.63

---

## Erledigte Punkte dieser Session

### 1. ProjectTeamManager: Status-Zaehlung fix (v7.4.4-10 bis -16)
- **Problem:** Zaehlung "aktive Mitarbeiter" nutzte m.is_active statt Datumspruefung.
  Werkstudentin mit zukuenftigem Enddatum wurde nicht mitgezaehlt.
- **Weitere Ursache:** is_active wurde beim Speichern auf false gesetzt wenn
  assignment_end gesetzt war -> isActive-Check scheiterte bereits am DB-Feld.
- **Fix:** is_active beim Speichern immer true. isActive-Anzeige und Zaehlung
  ausschliesslich ueber Datum: !assignment_end || assignment_end >= heute.
- **Diverse Build-Fehler** durch sed-Einsatz (Kommentare in JSX eingefuegt,
  fehlende div-Tags). Ab jetzt: sed nur fuer einfache Substitutionen,
  JSX-Aenderungen immer per str_replace + div-Zaehlung als Qualitaetscheck.
- **Finale Version:** ProjectTeamManager-v7_4_4-16.tsx

### 2. EmployeeManagement: Status "Ausgeschieden" + Sync employment_end (v7.3.95-6/7)
- **Neu:** Status-Badge zeigt jetzt drei Zustaende:
  * "Aktiv" (is_active=true, kein Vertragsende oder in der Zukunft)
  * "Ausgeschieden DD.MM.YYYY" (is_active=true, employment_end in Vergangenheit)
  * "Inaktiv" (is_active=false, manuell deaktiviert)
- **Neu:** Helper-Funktion isEmpActive(emp) steuert alle Status-Checks konsistent.
- **Neu:** employment_end -> assignment_end automatische Synchronisation:
  Wenn employment_end gesetzt wird, werden alle v7_project_assignments dieses MA
  automatisch gekappt falls ihr assignment_end leer oder spaeter liegt.
  Begruendung: MA kann nicht laenger im Projekt mitarbeiten als in der Firma.
- **Student** als Qualifikation (bereits in v7.3.95-5, hier konsolidiert).
- **Finale Version:** EmployeeManagement-v7_3_95-7.tsx

### 3. ProjectTeamManager: employment_end als Hard-Limit (v7.4.4-13 bis -16)
- **Neu:** employment_end aus v7_employees ins Employee-Interface aufgenommen.
- **AddMemberDialog:** Wenn MA mit Vertragsende ausgewaehlt wird:
  * assignment_end automatisch auf employment_end vorbelegt
  * max-Attribut auf Datumsfeld gesetzt
  * Hinweis "Vertrag endet am XX.XX.XXXX — spaeteres Datum nicht moeglich"
- **EditMemberDialog:** Gleiche Logik ueber member.employee.employment_end.
- **Speichern:** assignment_end wird automatisch auf employment_end gekappt
  falls bestehendes assignment_end spaeter liegt (statt Fehler/Blockierung).
- **Finale Version:** ProjectTeamManager-v7_4_4-16.tsx

### 4. WorkPackageTable: PM-Anzeige auf 3 Dezimalstellen (v7.4.3-8)
- **Problem:** PM-Werte wurden nur 2-stellig angezeigt (z.B. 0,34 statt 0,344).
  Berechnung intern war korrekt, aber Anzeige/PDF wichen vom Antrag ab.
- **Fix:** Alle toFixed(2) -> toFixed(3) in fmtPM und direkt im JSX (5 Stellen).
- **Datei:** WorkPackageTable-v7_4_3-8.tsx

### 5. TimesheetForm: MA-Dropdown nach Team-Nummer sortiert (v7.4.3-17/18)
- **Problem:** MA-Dropdown in Zeiterfassung war alphabetisch, nicht nach
  Projekt-Teamnummer (lfd. Nr. gemaess Anlage 6.1).
- **Fix:** useMemo sortedEmployees laedt bei Projektwechsel die employee_number
  aus v7_project_assignments und sortiert die MA-Liste entsprechend.
  Fallback: alphabetisch wenn kein Projekt oder MA nicht im Team.
- **Build-Fehler v7.4.3-17:** useEffect-Anfang durch str_replace verschluckt.
  Fix in v7.4.3-18.
- **Finale Version:** TimesheetForm-v7_4_3-18.tsx

---

## Lernpunkte Session 19

1. **sed fuer JSX-Aenderungen vermeiden:** sed-Substitutionen koennen Kommentare
   mitten in JSX einfuegen oder Codestrukturen zerstoeren. Fuer JSX-Aenderungen
   immer str_replace verwenden. Nach jeder JSX-Aenderung div-Zaehlung:
   grep -c "<div" und grep -c "</div>" muessen identisch sein.
2. **str_replace Kontext gross genug waehlen:** Zu kleiner Kontext fuehrt zu
   "String not unique" oder verschluckt benachbarte Zeilen.
3. **Versionierungsregel:** Memory-Eintrag #23 gesetzt. Vor jeder Dateiausgabe
   downloads-Ordner pruefen. Diese Regel wurde heute mehrfach verletzt.
4. **Build-Fehler Diagnose:** Vercel zeigt Zeilennummer des Symptoms, nicht
   der Ursache. Immer 10-20 Zeilen oberhalb der Fehlerstelle pruefen.

---

## Aktueller Dateistand (deployed PROD)

| Komponente | Version | Pfad |
|---|---|---|
| create-employee-login | v7.3.95-2 | src/app/api/v7/create-employee-login/route.ts |
| ProjectTeamManager | v7.4.4-16 | src/components/shared/ProjectTeamManager.tsx |
| EmployeeManagement | v7.3.95-7 | src/components/shared/EmployeeManagement.tsx |
| WorkPackageTable | v7.4.3-8 | src/components/shared/WorkPackageTable.tsx |
| TimesheetForm | v7.4.3-18 | src/components/shared/TimesheetForm.tsx |
| ZAPanel | v7.4.4-30 | src/components/shared/ZAPanel.tsx |
| BerichtePage | v7.4.4-2 | src/components/shared/BerichtePage.tsx |
| StundennachweisMatrix | v7.4.4-2 | src/components/shared/StundennachweisMatrix.tsx |
| NWMEigenanteilPanel | v7.4.5-12 | src/components/shared/NWMEigenanteilPanel.tsx |
| NWMEinstellungenPanel | v7.4.5-3 | src/components/shared/NWMEinstellungenPanel.tsx |
| NWMPartnerPanel | v7.4.5-4 | src/components/shared/NWMPartnerPanel.tsx |
| ProjectDetailPage | v7.4.4-40 | src/components/shared/ProjectDetailPage.tsx |
| ProjektFortschrittPanel | v7.4.5-4 | src/components/shared/ProjektFortschrittPanel.tsx |
| FirmendatenCard | v7.4.4-2 | src/components/shared/FirmendatenCard.tsx |
| PortalHeader | v7.3.95-3 | src/components/shared/PortalHeader.tsx |
| PortalNav | v7.4.4-1 | src/components/shared/PortalNav.tsx |
| WorkPackageEditModal | v7.3.85-2 | src/components/shared/WorkPackageEditModal.tsx |
| ProjectCreateForm | v7.3.82-9 | src/components/shared/ProjectCreateForm.tsx |
| berater-firma-detail-page | v7.4.4-4 | src/app/v7/berater/foerderung/firma/[id]/page.tsx |
| berater-ze-seite | v7.4.0-4 | src/app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx |
| foerderung-page | v7.4.1-3 | src/app/v7/berater/foerderung/page.tsx |
| berater-netzwerk-page | v7.4.5-1 | src/app/v7/berater/netzwerk/page.tsx |
| berater-dashboard | v7.4.4-6 | src/app/v7/berater/dashboard/page.tsx |
| mein-status-page | v7.4.4-8 | src/app/v7/firma/mein-status/page.tsx |

---

## Offene Punkte (aktuell)

| # | Thema | Prioritaet |
|---|---|---|
| 1 | Berater-Portal Benutzerhandbuch PDF | NIEDRIG |
| 2 | SWC-Bug ProjectDetailPage analysieren (Zurueck-Button NWM) | OFFEN |
| 3 | Umlaut-Bereinigung UI-Texte (ue/ae/oe -> Umlaute) | ZUKUNFT |
| 4 | Multiprojekt-Tool | ZUKUNFT |
| 5 | Forschungszulage-Modul | ZUKUNFT |
| 6 | RLS vollstaendig planen + ausfuehren | ZUKUNFT |

---

## Dateien dieser Session

| Dateiname | Zweck | Status |
|---|---|---|
| ProjectTeamManager-v7_4_4-10.tsx | isActive-Fix Zaehlung (Zwischenversion) | deployed, durch -11ff ersetzt |
| ProjectTeamManager-v7_4_4-11.tsx | employment_end Hard-Limit (Zwischenversion) | deployed, durch -12ff ersetzt |
| ProjectTeamManager-v7_4_4-13.tsx | Validierung assignment_end (Zwischenversion) | Build-Fehler |
| ProjectTeamManager-v7_4_4-14.tsx | JSX-Fix (Zwischenversion) | Build-Fehler |
| ProjectTeamManager-v7_4_4-15.tsx | Automatisches Kappen statt Blockierung | deployed, durch -16 ersetzt |
| ProjectTeamManager-v7_4_4-16.tsx | Finale Version aller Fixes | deployed |
| EmployeeManagement-v7_3_95-6.tsx | Status + Sync (Zwischenversion) | Versionskonflikt |
| EmployeeManagement-v7_3_95-7.tsx | Status + Sync (finale Version) | deployed |
| WorkPackageTable-v7_4_3-8.tsx | PM 3 Dezimalstellen | deployed |
| TimesheetForm-v7_4_3-17.tsx | MA-Sortierung (Zwischenversion mit Build-Fehler) | Build-Fehler |
| TimesheetForm-v7_4_3-18.tsx | MA-Sortierung (finale Version) | deployed |
| GIT-SICHERUNG-v7_4_5-session19.md | diese Datei | - |
| PFLICHTENHEFT-v4_63.md | Pflichtenheft aktualisiert | - |

---

## Pflichtenheft
Version: 4.63
Datei: PFLICHTENHEFT-v4_63.md
