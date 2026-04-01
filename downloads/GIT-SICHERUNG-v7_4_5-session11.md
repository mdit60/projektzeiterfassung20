# GIT-Sicherung Session 11 - 1. April 2026

## Was in Session 11 erledigt wurde

---

### 1. Bug-Fix: Login-Erstellung MA (EmployeeManagement-v7_3_95-3)

**Problem:** Neue Mitarbeiter konnten sich nach Login-Erstellung nicht anmelden.
Symptom: Korrekte Zugangsdaten, aber Rueckkehr zur leeren Login-Maske (Login-Schleife).

**Diagnose am Beispiel Firma Stoma:**
- Reinhard Matzke (erster Admin, manuell angelegt) = funktioniert
- Markus Schmahl + Roman Matzke (ueber EmployeeManagement angelegt) = Login-Schleife
- SQL-Diagnose ergab: `client_company_id` = NULL in `v7_user_profiles`

**Zwei Bugs in EmployeeManagement-v7_3_95-2 gefunden und behoben:**

| # | Funktion | War (falsch) | Ist (korrekt) |
|---|----------|--------------|---------------|
| 1 | `createUserProfile` | `role: 'employee'` | `role: 'client_user'` |
| 2 | `handleLinkExistingUser` | `company_id: companyId` | `client_company_id: companyId` |

Bug 2 war die eigentliche Ursache: falscher Feldname wurde von Supabase
stillschweigend ignoriert, `client_company_id` blieb NULL. Das Routing
prueft dieses Feld und schickt den User bei NULL zurueck zur Login-Seite.

**Sofort-Fix PROD (SQL):**
```sql
UPDATE v7_user_profiles up
SET client_company_id = e.client_company_id
FROM v7_employees e
WHERE e.user_id = up.id
  AND up.client_company_id IS NULL
  AND up.id IN (
    '7b1478d1-ec26-4460-87d8-96afaafe795b',
    '01c02c9a-9704-4d2c-b366-2bf7546889eb'
  );
```
Ergebnis: Beide User haben jetzt korrekte `client_company_id`, Login funktioniert.

**Code-Fix:** EmployeeManagement-v7_3_95-3.tsx deployed.

---

### 2. Architekturentscheidung: Atomarer Login-Prozess (naechste Umsetzung)

**Problem:** Der Login-Erstellungsprozess laeuft clientseitig ueber 3 separate
Supabase-Aufrufe. Schlaegt einer still fehl, sieht es im UI nach Erfolg aus
aber der Login funktioniert nicht. Dieser Fehler ist in der Vergangenheit
mehrfach aufgetreten.

**Beschlossene Loesung:** Neue Server-Side API-Route `/api/v7/create-employee-login`

Anforderungen:
- Alle 3 Schritte (Auth anlegen + Profil anlegen + Employee verknuepfen) atomar
- Bei jedem Fehler vollstaendiges Rollback
- Nur "Erfolg" wenn wirklich alle 3 Schritte abgeschlossen
- Idempotent (doppelter Aufruf schadet nicht)
- Gilt fuer ALLE Wege: Berater legt an, Firmen-Admin legt an
- EmployeeManagement ruft diese eine Route auf, keine eigene Logik mehr

**Reihenfolge:**
1. GIT-Sicherung (diese Datei) ✅
2. API-Route `/api/v7/create-employee-login` bauen
3. EmployeeManagement auf neue Route umstellen
4. RLS-Thema

---

## Offene Punkte (unveraendert aus Session 9)

### KRITISCH: v7_timesheets RLS in PROD
- PROD: `rowsecurity=FALSE` -> Zeiterfassungsdaten ungeschuetzt
- DEV: `rowsecurity=TRUE` -> korrekt
- Muss vor naechstem Produktivbetrieb behoben werden

### RLS-Aktionsplan (aus Session 9 uebernommen)
Schritt 2: DEV Altlasten loeschen (fzul_*, import_*)
Schritt 3: RLS aktivieren alle V7-Tabellen DEV
Schritt 4: DEV testen
Schritt 5: RLS PROD aktivieren inkl. v7_timesheets

---

## Dateien dieser Session

| Dateiname | Zweck | Status |
|-----------|-------|--------|
| EmployeeManagement-v7_3_95-3.tsx | Bug-Fix Login-Erstellung | deployed |
| GIT-SICHERUNG-v7_4_5-session11.md | diese Datei | - |
| PFLICHTENHEFT-v4_52.md | Pflichtenheft aktualisiert | - |

---

## Deploy-Sequenz Session 11

```bash
git add -A
git commit -m "session11: EmployeeManagement Login-Fix + GIT-Sicherung + Pflichtenheft"
git push origin v7-dev
git checkout main
git merge v7-dev --no-ff --no-edit
git push origin main
git checkout v7-dev
```

---

## Pflichtenheft
**Version:** 4.52
**Datei:** PFLICHTENHEFT-v4_52.md
