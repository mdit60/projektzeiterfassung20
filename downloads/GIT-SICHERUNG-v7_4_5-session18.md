# GIT-SICHERUNG - Session 18
**Datum:** 17. April 2026
**SW-Release:** V7.4.5
**Pflichtenheft:** v4.62

---

## Erledigte Punkte dieser Session

### 1. create-employee-login: duplicate-key Bug behoben (v7.3.95-2)
- **Problem:** "duplicate key value violates unique constraint v7_user_profiles_pkey"
  beim Erstellen eines MA-Logins. Betraf alle neu angelegten Mitarbeiter.
- **Ursache:** Supabase hat einen internen Trigger (handle_new_user), der beim
  Auth.createUser() automatisch einen leeren v7_user_profiles-Eintrag anlegt.
  Die Route versuchte danach nochmals einen INSERT -> Konflikt auf Primary Key.
- **Fix:** INSERT -> UPSERT mit onConflict: 'id' in Schritt 2 der Route.
  Leeres Trigger-Profil wird nun korrekt befuellt statt Fehler auszuloesen.
- **Zusatz:** listUsers jetzt mit perPage: 1000 fuer Skalierbarkeit.
- **Datei:** create-employee-login-route-v7_3_95-2.ts
- **Pfad:** src/app/api/v7/create-employee-login/route.ts
- **DB-Aufraeum vor erstem Test:** 5 leere v7_user_profiles-Eintraege fuer
  d.herrler@androlite.de manuell geloescht (Reste gescheiterter Versuche).

### 2. ProjectTeamManager: Hinzufuegen/Bearbeiten-Dialog vereinheitlicht (v7.4.4-8/9)
- **Problem:** "Mitarbeiter hinzufuegen" und "Team-Mitglied bearbeiten" hatten
  unterschiedliche Layouts und Felder.
- **Fix:** AddMemberDialog komplett auf identisches Layout wie EditMemberDialog
  umgestellt (einspaltig).
- **Neu in Hinzufuegen-Dialog:**
  * Bewilligter Stundensatz lt. Bescheid
  * Im Projekt bis (assignment_end)
  * Berechnete Werte (Jahresarbeitsstd., Teilzeitfaktor)
  * Neu-berechnen-Button fuer Stundensatz
- **handleAddMember:** speichert jetzt auch hourly_rate_approved und assignment_end
- **Einziger Unterschied:** MA-Dropdown nur im Hinzufuegen-Dialog (logisch)
- **Hilfsfunktion:** calcHourlyRate() als gemeinsame Funktion extrahiert
  (war vorher doppelt als calculateRateAdd / calculateRate)
- **Hinweis:** v7.4.4-8 wurde versehentlich zweimal deployed (einmal ohne,
  einmal mit Status-Fix). Daher v7.4.4-9 als saubere finale Version.
- **Datei:** ProjectTeamManager-v7_4_4-9.tsx
- **Pfad:** src/components/shared/ProjectTeamManager.tsx

### 3. ProjectTeamManager: Status-Anzeige korrigiert (v7.4.4-9)
- **Problem:** Mitarbeiter mit zukuenftigem assignment_end (z.B. Werkstudentin
  bis 30.09.2026) wurde als "Ausgeschieden" angezeigt obwohl noch aktiv.
- **Ursache:** Logik war `is_active && !assignment_end` -> jedes gesetzte
  Enddatum fuehrte sofort zu "Ausgeschieden".
- **Fix:** `isActive = is_active && (!assignment_end || new Date(assignment_end)
  >= heute)` -> "Ausgeschieden" nur wenn Enddatum in der Vergangenheit.
- **Auswirkung:** Rein kosmetisch in der Tabelle. ZA-Berechnung und
  Zeiterfassung waren nicht betroffen.
- **Datei:** ProjectTeamManager-v7_4_4-9.tsx (zusammen mit Punkt 2)

### 4. EmployeeManagement: "Student" als Qualifikation (v7.3.95-5)
- **Erweiterung:** QUALIFICATION_OPTIONS um 'Student' ergaenzt.
- **Position:** Zwischen 'keine Ausbildung' und 'Berufsausbildung'
  (aufsteigend nach Bildungsgrad).
- **Begruendung:** Werkstudenten kommen in FuE-Projekten regelmaessig vor.
- **Datei:** EmployeeManagement-v7_3_95-5.tsx
- **Pfad:** src/components/shared/EmployeeManagement.tsx

---

## Lernpunkte Session 18

1. **Supabase handle_new_user Trigger:** Supabase legt bei auth.admin.createUser()
   automatisch einen leeren v7_user_profiles-Eintrag an (undokumentierter Trigger).
   Deshalb IMMER upsert statt insert fuer v7_user_profiles in der Login-Route.
2. **Versionierungsregel (Wiederholung):** Wenn eine Datei deployed wurde und
   danach noch veraendert wird, MUSS die Version inkrementiert werden.
   Zwei unterschiedliche Dateien mit gleicher Nummer im PV sind nicht akzeptabel.

---

## Aktueller Dateistand (deployed PROD)

| Komponente | Version | Pfad |
|---|---|---|
| create-employee-login | v7.3.95-2 | src/app/api/v7/create-employee-login/route.ts |
| ProjectTeamManager | v7.4.4-9 | src/components/shared/ProjectTeamManager.tsx |
| EmployeeManagement | v7.3.95-5 | src/components/shared/EmployeeManagement.tsx |
| ZAPanel | v7.4.4-30 | src/components/shared/ZAPanel.tsx |
| BerichtePage | v7.4.4-2 | src/components/shared/BerichtePage.tsx |
| StundennachweisMatrix | v7.4.4-2 | src/components/shared/StundennachweisMatrix.tsx |
| TimesheetForm | v7.4.3-16 | src/components/shared/TimesheetForm.tsx |
| NWMEigenanteilPanel | v7.4.5-12 | src/components/shared/NWMEigenanteilPanel.tsx |
| NWMEinstellungenPanel | v7.4.5-3 | src/components/shared/NWMEinstellungenPanel.tsx |
| NWMPartnerPanel | v7.4.5-4 | src/components/shared/NWMPartnerPanel.tsx |
| ProjectDetailPage | v7.4.4-40 | src/components/shared/ProjectDetailPage.tsx |
| ProjektFortschrittPanel | v7.4.5-4 | src/components/shared/ProjektFortschrittPanel.tsx |
| FirmendatenCard | v7.4.4-2 | src/components/shared/FirmendatenCard.tsx |
| PortalHeader | v7.3.95-3 | src/components/shared/PortalHeader.tsx |
| PortalNav | v7.4.4-1 | src/components/shared/PortalNav.tsx |
| WorkPackageTable | v7.4.3-7 | src/components/shared/WorkPackageTable.tsx |
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
| create-employee-login-route-v7_3_95-2.ts | upsert-Fix duplicate key | deployed |
| ProjectTeamManager-v7_4_4-8.tsx | Dialog-Vereinheitlichung (Zwischenversion) | deployed, durch -9 ersetzt |
| ProjectTeamManager-v7_4_4-9.tsx | Dialog-Vereinheitlichung + Status-Fix (final) | deployed |
| EmployeeManagement-v7_3_95-5.tsx | Student als Qualifikation | deployed |
| GIT-SICHERUNG-v7_4_5-session18.md | diese Datei | - |
| PFLICHTENHEFT-v4_62.md | Pflichtenheft aktualisiert | - |

---

## Pflichtenheft
Version: 4.62
Datei: PFLICHTENHEFT-v4_62.md
