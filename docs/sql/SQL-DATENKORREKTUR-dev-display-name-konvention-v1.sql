-- ============================================================
-- PZE V7 - Datenkorrektur: display_name-Konvention in DEV angleichen
-- Version: v1
-- Datum: 15. Juli 2026 (Session 68)
-- Auszufuehren in: NUR DEV  (PROD ist bereits korrekt!)
-- ============================================================
--
-- ANLASS
-- v7_user_profiles.display_name folgt in DEV und PROD unterschiedlichen
-- Konventionen:
--   PROD: "Ditscherlein, Martin" / "Kirchner, Katrin"   -> Nachname, Vorname
--   DEV : "Martin Ditscherlein"  / "Katrin Kirchner"    -> Vorname Nachname
-- Faellt spaetestens bei einem PROD->DEV-Sync auf (Darstellung kippt) und
-- betrifft die ganze App (Header, Ersteller-Anzeige in der FZul-Vorhabenliste).
--
-- BEFUND: DEV ist der Ausreisser, nicht PROD
-- Der Code schreibt die Konvention bereits korrekt als "Nachname, Vorname":
--   ConsultantManagement.tsx:296 -> v7_user_profiles.display_name
--                                   = last_name || ', ' || first_name
--   EmployeeManagement.tsx:839   -> v7_employees.display_name  (gleiche Form)
-- Auch v7_employees folgt ihr durchgaengig ("Bohlmann, Jens"), und der
-- BSFZ-Excel-Export verlaesst sich darauf: er splittet empName am Komma in
-- Nach- und Vorname.
-- Die DEV-Werte stammen aus frueher manueller Anlage.
--
-- ERGEBNIS: Kein Code-Fix noetig - nur ein UPDATE der DEV-Altdaten.
-- ============================================================

-- ------------------------------------------------------------
-- 1. VORHER ANSEHEN: Was wuerde sich aendern?
--    (Erst pruefen, dann Schritt 2 ausfuehren.)
-- ------------------------------------------------------------
select
  email,
  display_name                              as alt,
  last_name || ', ' || first_name           as neu,
  role
from v7_user_profiles
where first_name is not null
  and last_name  is not null
  and btrim(first_name) <> ''
  and btrim(last_name)  <> ''
  and display_name is distinct from (last_name || ', ' || first_name)
order by email;

-- ------------------------------------------------------------
-- 2. KORREKTUR (nur ausfuehren, wenn Schritt 1 plausibel aussieht)
-- ------------------------------------------------------------
-- Bewusst nur Profile MIT Vor- UND Nachname: Datensaetze ohne beides
-- behalten ihren bisherigen display_name (kein Datenverlust).
update v7_user_profiles
set display_name = last_name || ', ' || first_name
where first_name is not null
  and last_name  is not null
  and btrim(first_name) <> ''
  and btrim(last_name)  <> ''
  and display_name is distinct from (last_name || ', ' || first_name);

-- ------------------------------------------------------------
-- 3. KONTROLLE: DEV muss jetzt aussehen wie PROD
-- ------------------------------------------------------------
select email, display_name, first_name, last_name, role
from v7_user_profiles
where consultant_company_id is not null
order by email;

-- Erwartung (Beraterfirma Cubintec):
--   k.kirchner@cubintec.com    -> "Kirchner, Katrin"
--   m.ditscherlein@cubintec.com-> "Ditscherlein, Martin"
