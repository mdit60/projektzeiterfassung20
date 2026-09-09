# PFLICHTENHEFT v5.37 - Aenderungsblock (Session 76, 08.08.2026)

Basis: PFLICHTENHEFT-v5_36.md. Dieser Block enthaelt AUSSCHLIESSLICH die Aenderungen fuer
v5.37 mit exakten Einfuegepunkten. SW-Release V7.9.3 -> V7.9.4. Feature: Timesheet-Restanzeige
umschaltbar (Monatsende/gesamt), pro Nutzer gespeichert.

================================================================================
AENDERUNG 1 - Kopfblock (ersetzt die ersten Zeilen des Dokuments)
================================================================================

ALT:
  **Version:** 5.36
  **SW-Release:** V7.9.3
  **Datum:** 7. August 2026

NEU:
  **Version:** 5.37
  **SW-Release:** V7.9.4
  **Datum:** 8. August 2026

--------------------------------------------------------------------------------
AENDERUNG 1b - Status-Zeile (die bisherige **Status:**-Zeile wird um den neuen
Stand VORNE ergaenzt; der bisherige V7.9.3-Text wird zu "Zuvor in V7.9.3:")
--------------------------------------------------------------------------------

Vor "Session 75 (07.08.2026, Forts.): **AP-STATUS-DRUCK ROBUST..." wird eingefuegt:

  **Status:** Session 76 (08.08.2026): **TIMESHEET-RESTANZEIGE UMSCHALTBAR
  (MONATSENDE / GESAMT) - V7.9.4 (in PRODUKTION).** Die rechte "+/-"-Spalte im
  Timesheet zeigt je zugeordnetem AP die noch offenen Stunden (gruen) bzw. die
  Ueberbuchung (rot). Bisher immer die PROJEKTWEIT offene Zahl (geplant minus
  gebucht ueber ALLE Monate). NEU umschaltbar auf "Monatsende": noch offene
  Stunden am Ende des angezeigten Monats (kumuliert bis inkl. dieses Monats,
  spaetere Monate nicht abgezogen) - nuetzlich fuer nachtraegliche Korrekturen und
  das Verlaufslesen (Beispiel geplant 300; Jan 250, Feb 170, Maer 70 ... statt
  ueberall 0 bei ausgebuchtem AP). Reine ANZEIGE, keine Datenwirkung; die
  "Alle AP"-Gesamtuebersicht bleibt bei der bisherigen Anzeige, ebenso die blaue
  projektweite Restzahl nicht zugeordneter MA. Umschalter = dezenter KREISPFEIL in
  der Kopfzelle der Rest-Spalte (ersetzt den bedeutungslosen Text "+/-"): Ruhe grau
  = Monatsende (Default), Klick aktiviert "gesamt" mit gruenem Chip (Tooltip je
  Zustand); print:hidden. DEFAULT ohne gespeicherte Wahl = "monatsende" (Wunsch
  Katrin); eine bereits gespeicherte persoenliche Wahl bleibt unangetastet.
  Persistenz PRO NUTZER in der NEUEN Tabelle v7_user_preferences
  (settings.timesheet_rest_modus jsonb) - geraeteunabhaengig; Details Paragraph 2.11.
  TimesheetForm v7.4.6-79/-80/-81 (Endstand -81). DB: SQL-MIGRATION-user-preferences-v1.sql
  (DEV + PROD). Deploy: Merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel.
  Details GIT-SICHERUNG-v7_9_4-session76.md. Zuvor in V7.9.3:

(der bestehende Text "Session 75 (07.08.2026, Forts.): **AP-STATUS-DRUCK ROBUST..."
folgt unveraendert direkt danach.)

================================================================================
AENDERUNG 2 - Paragraph 2.1 Kern-Tabellen (neue Zeile am Ende der Tabelle)
================================================================================

Neue Zeile hinter der v7_system_config-Zeile:

  | v7_user_preferences | Persoenliche UI-Einstellungen pro Nutzer (user_id PK -> auth.users, settings jsonb, Default '{}'); RLS: jeder nur eigene Zeile. Key timesheet_rest_modus (gesamt|monatsende) - NEU Session 76 |

================================================================================
AENDERUNG 3 - NEUER Paragraph 2.11 (direkt nach Paragraph 2.10 Username-Login)
================================================================================

### 2.11 Nutzer-Praeferenzen (NEU Session 76)

Persoenliche UI-Einstellungen pro eingeloggtem Nutzer, geraeteunabhaengig gespeichert.
Erster Anwendungsfall: Restanzeige-Modus im Timesheet.

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| user_id | uuid PK | FK auth.users(id) ON DELETE CASCADE |
| settings | jsonb | UI-Praeferenzen, Default '{}'. Aktueller Key: timesheet_rest_modus ('gesamt'|'monatsende') |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Default now(), per Trigger gepflegt |

- RLS aktiv; drei Policies (SELECT/INSERT/UPDATE) auf `auth.uid() = user_id` - jeder Nutzer
  sieht/aendert nur seine eigene Zeile. GRANT SELECT/INSERT/UPDATE an authenticated.
- Bewusst als jsonb-Spalte `settings` angelegt, damit kuenftige UI-Schalter OHNE weitere
  Migration hinzukommen (einfach neuer Key im JSON).
- SQL-MIGRATION-user-preferences-v1.sql (idempotent), DEV + PROD ausgefuehrt.
- Der Code faengt eine fehlende Tabelle ab (Default 'monatsende', Log) - blockiert nichts,
  kann die Wahl dann aber nicht speichern.

================================================================================
AENDERUNG 4 - Paragraph 4.1 Shared Components, Zeile TimesheetForm.tsx
================================================================================

Versionsangabe 7.4.6-65 -> **7.4.6-81** und am Ende der Beschreibung anfuegen:

  ; **v7.4.6-79/-80/-81 (Session 76, Feature Katrin): rechte "+/-"-Spalte umschaltbar
  zwischen projektweiter Restzahl ("gesamt", geplant - gebucht ueber alle Monate) und
  "monatsende" (geplant - (Vormonate + Live-Formstand); spaetere Monate nicht abgezogen).
  Datengrundlage: reloadBookedHours liest work_date mit -> monthlyBookedPerWP; Helfer
  bookedBeforeSelectedMonth + calculateRemainingHoursMonthly. Betroffen nur die gruen/rot
  angezeigte Restzahl ZUGEORDNETER APs (blaue projektweite Restzahl + "Alle AP"-Modal
  unveraendert). Umschalter = Kreispfeil in der Rest-Kopfzelle (ersetzt Text "+/-"): grau =
  Monatsende, gruener Chip = gesamt, print:hidden; -80 Zwischenstand Schiebeschalter, -81
  Endstand Kreispfeil. DEFAULT ohne gespeicherte Wahl = monatsende; Persistenz pro Nutzer in
  v7_user_preferences.settings.timesheet_rest_modus (Laden beim Oeffnen, Speichern per upsert)**

================================================================================
AENDERUNG 5 - Paragraph 12.1 Anforderungsliste (neue Zeile ans Tabellenende)
================================================================================

  | A-051 | Timesheet-Restanzeige umschaltbar: statt nur projektweit offener Stunden auch die am Ende des angezeigten Monats noch offenen Stunden anzeigen (Monatsende), pro Nutzer waehlbar | Katrin (via Martin) | Session 76 | Erledigt | 08.08.2026 | TimesheetForm v7.4.6-79/-80/-81: zwei Modi der rechten "+/-"-Spalte (gesamt / monatsende); Umschalter als Kreispfeil in der Rest-Kopfzelle (grau=Monatsende Default, gruener Chip=gesamt); Persistenz pro Nutzer in NEUER Tabelle v7_user_preferences (settings.timesheet_rest_modus), SQL-MIGRATION-user-preferences-v1.sql DEV+PROD. Nur Anzeige zugeordneter APs; "Alle AP"-Uebersicht + blaue projektweite Restzahl unveraendert. Fachlicher Hintergrund (Diskussion Martin/Katrin): gesamt = echtes projektweites Restbudget; monatsende = historischer Monatsstand fuer Korrekturen/Verlaufslesen. Deploy V7.9.4: Merge v7-dev->main (--no-ff), push origin+cubintec, Vercel. Details GIT-SICHERUNG-v7_9_4-session76.md. |

================================================================================
AENDERUNG 6 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.37 | 08.08.2026 | Session 76: Timesheet-Restanzeige umschaltbar (V7.9.4). Die rechte "+/-"-Spalte zeigt je zugeordnetem AP wahlweise die projektweit offene Zahl ("gesamt", bisheriges Verhalten) oder die am Ende des angezeigten Monats noch offene Zahl ("monatsende", kumuliert bis inkl. Monat, spaetere Monate nicht abgezogen; Wunsch Katrin fuer nachtraegliche Korrekturen/Verlaufslesen). Umschalter = dezenter Kreispfeil in der Rest-Kopfzelle (ersetzt Text "+/-"): grau=Monatsende (Default), gruener Chip=gesamt (bewusst gruen statt Bernstein wegen Naehe zum Feiertags-Orange), print:hidden. Nur die gruen/rot angezeigte Restzahl ZUGEORDNETER APs betroffen; "Alle AP"-Modal + blaue projektweite Restzahl unveraendert. TimesheetForm v7.4.6-79 (Feature-Kern + reloadBookedHours liest work_date -> monthlyBookedPerWP), -80 (Umschalter in die Rest-Kopfzelle, Zwischenstand Schiebeschalter), -81 (Default monatsende + Kreispfeil-Endstand). Persistenz pro Nutzer: NEU Tabelle v7_user_preferences (settings jsonb, RLS eigene Zeile, key timesheet_rest_modus), SQL-MIGRATION-user-preferences-v1.sql DEV+PROD; Paragraph 2.1 + neuer Paragraph 2.11. A-051 erledigt. Deploy: Merge v7-dev->main (--no-ff), push origin+cubintec, Vercel. Details GIT-SICHERUNG-v7_9_4-session76.md. |

================================================================================
Hinweis: Keine weiteren Abschnitte betroffen. Paragraph 5 (Bekannte Fehler) unveraendert
(reines Feature, kein Bugfix). Verhaltensvertrag TimesheetForm (12e.1) bleibt gueltig; die
Umschaltung beruehrt TF-10 (offen-Spalte) nur als zusaetzlicher Anzeigemodus, kein Vertrag
gebrochen.
================================================================================
