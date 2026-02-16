# PZE - ToDo: Produktiv-Datenbank einrichten

**Datum:** 15. Februar 2026
**Ziel:** Separate Supabase-DB fuer main/PZE-Test (Produktiv)
**Erster Kunde:** Steuerkanzlei Robin Freund

---

## PHASE 1: Vorbereitung (5 Min)

- [ ] **1.1** Alte DB "Projektzeiterfassung" (Nano) in Supabase loeschen
  - Supabase Dashboard -> Projekt "Projektzeiterfassung" -> Settings -> General -> Delete Project
  - ACHTUNG: Nur das alte V6-Projekt, NICHT "projektzeiterfassung20"!

- [ ] **1.2** Schema-SQL aus aktueller Dev-DB exportieren
  - Claude bereitet ein vollstaendiges, getestetes SQL-Script vor
  - Inkl. aller Spalten die nachtraeglich per ALTER TABLE hinzugefuegt wurden
    (z.B. portal_role, is_technical, employee_number, ap_sub_number, etc.)
  - WICHTIG: Das bestehende V7-DB-SCHEMA.sql ist VERALTET - die tatsaechliche
    DB hat andere Spaltenstrukturen (z.B. v7_timesheets: work_date statt year/month)

---

## PHASE 2: Neues Supabase-Projekt (10 Min)

- [ ] **2.1** Neues Projekt anlegen in Supabase
  - Name: "pze-produktion" (oder "projektzeiterfassung-prod")
  - Region: eu-central-1 (Frankfurt) - gleich wie Dev
  - Plan: Micro (wie Dev-DB)
  - Datenbank-Passwort sicher notieren!

- [ ] **2.2** Warten bis Projekt initialisiert ist (~2 Minuten)

- [ ] **2.3** Neue Credentials notieren:
  - Project URL: https://[NEUE-ID].supabase.co
  - Anon Key: (unter Settings -> API -> Legacy anon key)
  - Service Role Key: (fuer Admin-Operationen, sicher aufbewahren)

---

## PHASE 3: Schema einrichten (15 Min)

- [ ] **3.1** SQL-Editor im neuen Projekt oeffnen
  - Supabase Dashboard -> SQL Editor -> New Query

- [ ] **3.2** Schema-SQL ausfuehren (von Claude vorbereitet)
  - Erstellt alle Tabellen, Indizes, Constraints, Trigger
  - Prueft: Alle v7_*-Tabellen vorhanden?

- [ ] **3.3** Pruefen ob alle Tabellen existieren:
  ```sql
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public' AND tablename LIKE 'v7_%'
  ORDER BY tablename;
  ```
  Erwartet: v7_archive, v7_client_companies, v7_consultant_access,
  v7_consultant_companies, v7_data_completion, v7_employees,
  v7_fzul_timesheets, v7_project_assignments, v7_projects,
  v7_timesheets, v7_user_profiles, v7_work_package_assignments,
  v7_work_packages (+ ggf. v7_project_budget)

---

## PHASE 4: Auth konfigurieren (10 Min)

HINWEIS: Email-Einladungen via Resend SMTP funktionieren noch nicht zuverlaessig
(SPF pending bei Strato, MX fuer Subdomain nicht moeglich).
LOESUNG: User MANUELL im Supabase Dashboard anlegen (Auth -> Add User).
Email-System spaeter in Ruhe einrichten wenn alles andere stabil laeuft.

- [ ] **4.1** Auth -> Settings -> General:
  - Site URL: https://pze.itenion.com
  - Redirect URLs: https://pze.itenion.com/**

- [ ] **4.2** Auth -> Settings -> Email:
  - SMTP vorerst NICHT konfigurieren (Default Supabase-Mailer nutzen)
  - Resend-SMTP erst einrichten wenn SPF/MX bei Strato geklaert
  - Fuer Passwort-Reset reicht der Supabase-Default-Mailer

- [ ] **4.3** User manuell anlegen:
  - Auth -> Add User -> Set email + password
  - Fuer jeden User der Steuerkanzlei einzeln anlegen
  - Passwort dem User mitteilen (z.B. telefonisch oder persoenlich)

---

## PHASE 5: Stammdaten anlegen (15 Min)

- [ ] **5.1** Cubintec als Beraterfirma anlegen:
  ```sql
  INSERT INTO v7_consultant_companies (name, short_name, city, federal_state)
  VALUES ('Cubintec GmbH', 'Cubintec', 'Bad Neustadt a.d. Saale', 'DE-BY');
  ```

- [ ] **5.2** Martin als System-Admin anlegen:
  - Erst: Auth-User erstellen (Supabase Auth -> Add User)
    - Email: m.ditscherlein@cubintec.com
    - Password setzen
  - Dann: User-Profil anlegen:
  ```sql
  INSERT INTO v7_user_profiles (email, first_name, last_name, display_name,
    role, consultant_company_id)
  VALUES ('m.ditscherlein@cubintec.com', 'Martin', 'Ditscherlein',
    'Martin Ditscherlein', 'system_admin',
    (SELECT id FROM v7_consultant_companies WHERE short_name = 'Cubintec'));
  ```

- [ ] **5.3** Steuerkanzlei Freund als Kundenfirma anlegen:
  ```sql
  INSERT INTO v7_client_companies (consultant_company_id, name, short_name,
    city, federal_state)
  VALUES (
    (SELECT id FROM v7_consultant_companies WHERE short_name = 'Cubintec'),
    'Steuerkanzlei Robin Freund', 'Freund', 'Buechen', 'DE-SH');
  ```

- [ ] **5.4** Robin Freund als User + MA anlegen:
  - Auth-User erstellen (Email: robin@..., Password)
  - User-Profil + Employee-Record mit portal_role='project_leader'
  - (Details haengen von Robins tatsaechlicher Email ab)

- [ ] **5.5** Ggf. weitere MA der Steuerkanzlei anlegen

---

## PHASE 6: Vercel konfigurieren (10 Min)

- [ ] **6.1** Vercel Dashboard -> projektzeiterfassung20 -> Settings -> Environment Variables

- [ ] **6.2** Bestehende Vars aendern - WICHTIG: Scope pro Branch setzen!
  - NEXT_PUBLIC_SUPABASE_URL:
    - Production (main): https://[NEUE-ID].supabase.co
    - Preview (v7-dev): https://jaiyycmstgepxaqsvnjd.supabase.co (bleibt!)
  - NEXT_PUBLIC_SUPABASE_ANON_KEY:
    - Production (main): [Neuer Anon Key]
    - Preview (v7-dev): [Bestehender Key] (bleibt!)

- [ ] **6.3** Redeploy main Branch ausloesen:
  - Vercel -> Deployments -> letztes main Deployment -> ... -> Redeploy

- [ ] **6.4** Testen: https://pze.itenion.com/v7/login
  - Mit Martin-Account einloggen
  - Pruefen ob leere DB (keine Testdaten von Dev)

---

## PHASE 7: Funktionstest (15 Min)

- [ ] **7.1** Login testen (Martin als Berater)
- [ ] **7.2** Steuerkanzlei Freund sichtbar im Berater-Portal?
- [ ] **7.3** Login testen (Robin als Firmen-User)
- [ ] **7.4** Firmen-Dashboard korrekt (gruener Header)?
- [ ] **7.5** Projekt anlegen (Testprojekt oder echtes ANOVIA)
- [ ] **7.6** Mitarbeiter sichtbar?
- [ ] **7.7** Zeiterfassung funktioniert?
- [ ] **7.8** Mein Status zeigt Projekte?
- [ ] **7.9** Berichte-Seite laedt?

---

## PHASE 8: Dokumentation (5 Min)

- [ ] **8.1** Neue Supabase-Credentials sicher dokumentieren
  - Project URL, Anon Key, Service Role Key
  - NICHT in Git! Nur lokal oder in Passwort-Manager

- [ ] **8.2** Pflichtenheft aktualisieren:
  - Abschnitt 6: Zwei Supabase-Projekte dokumentieren
  - Dev-DB vs. Prod-DB Trennung

- [ ] **8.3** Schema-Migrationen ab jetzt als SQL-Dateien
  - Neue Dateien: docs/migrations/YYYY-MM-DD_beschreibung.sql
  - Jede Aenderung in BEIDE DBs einspielen!

---

## LAUFENDE REGEL: Schema-Migrationen

Ab sofort bei jeder DB-Aenderung:
1. SQL-Datei erstellen: docs/migrations/2026-02-XX_beschreibung.sql
2. Auf Dev-DB ausfuehren und testen
3. Auf Prod-DB ausfuehren
4. In Git committen

Beispiel:
```sql
-- Migration: 2026-02-20_add_employee_number.sql
ALTER TABLE v7_employees ADD COLUMN employee_number TEXT;
ALTER TABLE v7_work_packages ADD COLUMN is_technical BOOLEAN DEFAULT false;
```

---

## ZEITSCHAETZUNG GESAMT

| Phase | Aufwand |
|-------|---------|
| 1. Vorbereitung | 5 Min |
| 2. Neues Projekt | 10 Min |
| 3. Schema | 15 Min |
| 4. Auth | 10 Min |
| 5. Stammdaten | 15 Min |
| 6. Vercel | 10 Min |
| 7. Test | 15 Min |
| 8. Doku | 5 Min |
| **Gesamt** | **~85 Min** |

Claude bereitet das Schema-SQL (Phase 3) komplett vor,
damit du es nur noch copy-pasten musst.

---

**WICHTIG: Vor Phase 1 sicherstellen, dass v7-dev auf Vercel
weiterhin mit der alten Dev-DB laeuft! Nur main bekommt die neuen Credentials.**
