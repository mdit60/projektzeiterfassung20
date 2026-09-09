# GIT-SICHERUNG - Session 76 (V7.9.4)

**Datum:** 8. August 2026
**SW-Release:** V7.9.4 (Timesheet-Restanzeige umschaltbar: Monatsende/gesamt, Feature Katrin - in PRODUKTION)
**Pflichtenheft:** v5.37
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_3-session75.md (AP-Status-Druck ueber eigenes Druckfenster).

**Deploy-Stand:** In PROD deployt. EINE neue DB-Migration (v7_user_preferences) in DEV UND PROD
ausgefuehrt. Frontend: TimesheetForm ueber drei Builds (-79/-80/-81) zum Endstand -81; Deploy
per Merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel.

---

## Ziel dieser Etappe

Bei der Stundeneingabe zeigt die rechte "+/-"-Spalte des Timesheets je zugeordnetem AP die
noch offenen Stunden (gruen) bzw. die Ueberbuchung (rot). Bisher war das immer die PROJEKTWEIT
noch offene Zahl (geplant minus gebucht ueber ALLE Monate). Sind spaetere Monate bereits voll
gebucht, steht dann auch in einem frueheren Monat 0 - fuer nachtraegliche Korrekturen wenig
hilfreich.

Wunsch Katrin: in den Timesheets stattdessen anzeigen, wieviele Stunden am ENDE des angezeigten
Monats noch offen waren (kumuliert bis inkl. dieses Monats; spaetere Monate NICHT abgezogen).
Beispiel (geplant 300; Jan 50, Feb 80, Maer 100, Apr 50, Mai 20): Monatsende-Anzeige Jan 250,
Feb 170, Maer 70, Apr 20, Mai 0 - statt ueberall 0 bei ausgebuchtem AP.

Martin sieht die bisherige (projektweite) Zahl fachlich als korrekter an (echtes Restbudget);
Katrins Sicht ist fuer Korrektur- und Verlaufslesen wertvoll. Da beide unterschiedliche Fragen
beantworten (Budgetkontrolle vs. historischer Monatsstand) und es reine ANZEIGE ohne
Datenwirkung ist, wurde die Anzeige umschaltbar gemacht - pro Nutzer gespeichert. In der
AP-Status-Gesamtuebersicht ("Alle AP") bleibt die bisherige Anzeige.

---

## Weg zur Loesung (TimesheetForm v7.4.6-79 .. -81; deployt: -81)

- **v7.4.6-79 (Feature-Kern):** Zwei Modi der rechten Restanzeige. "gesamt" = projektweit ueber
  alle Monate (bisheriges Verhalten). "monatsende" = geplant minus (Buchungen der Vormonate +
  Live-Formstand des aktuellen Monats), zukuenftige Monate nicht abgezogen. Datengrundlage:
  reloadBookedHours liest jetzt work_date mit und baut monthlyBookedPerWP (je AP je "YYYY-MM").
  Helfer bookedBeforeSelectedMonth + calculateRemainingHoursMonthly. Nur die gruen/rot
  angezeigte Restzahl ZUGEORDNETER APs ist betroffen; die blaue projektweite Restzahl (nicht
  zugeordnete MA) und die "Alle AP"-Uebersicht bleiben unveraendert. Umschalter zunaechst als
  Knopf im Kopf. Persistenz pro Nutzer: neue Tabelle v7_user_preferences
  (settings.timesheet_rest_modus), Laden beim Oeffnen, Speichern per upsert.
- **v7.4.6-80 (Ergonomie):** Der Kopf-Knopf wandert weg; der Umschalter sitzt direkt in der
  Kopfzelle der Rest-Spalte (bisher bedeutungsloser Text "+/-"), zunaechst als Schiebeschalter.
  Grund: die Maus bleibt dort, wo der Blick ist (rechte Spalte).
- **v7.4.6-81 (Endstand, deployt):** Zwei Feinschliffe nach Abstimmung. (1) STANDARD gedreht:
  Default-Modus ohne gespeicherte Wahl ist jetzt "monatsende" (Katrins Sicht) - eine bereits
  gespeicherte persoenliche Wahl bleibt unangetastet. (2) Schiebeschalter -> dezenter KREISPFEIL
  in der Kopfzelle: Ruhezustand grau = Monatsende (Standard); ein Klick aktiviert "gesamt" und
  hebt den Kreispfeil mit gruenem Chip (bg-green-200/text-green-800) hervor. Bewusst gruen statt
  Bernstein/Amber, da Bernstein dem Feiertags-Orange im Sheet zu aehnlich waere. Tooltip erklaert
  je Zustand.

Print: Die Rest-Spalte inkl. Umschalter ist print:hidden - kein Einfluss auf den Ausdruck.

---

## DB-Aenderung (DEV + PROD, ausgefuehrt)

NEU Tabelle **v7_user_preferences** (persoenliche UI-Einstellungen pro Nutzer):
- Spalten: user_id uuid PK (FK auth.users, ON DELETE CASCADE), settings jsonb NOT NULL DEFAULT
  '{}', created_at, updated_at.
- RLS aktiv; drei Policies (SELECT/INSERT/UPDATE) auf auth.uid() = user_id (jeder nur eigene
  Zeile). GRANT SELECT/INSERT/UPDATE an authenticated. Trigger pflegt updated_at.
- Bewusst als jsonb settings, damit kuenftige UI-Schalter OHNE weitere Migration hinzukommen
  (neuer Key im JSON). Erster Key: timesheet_rest_modus = 'gesamt' | 'monatsende'.
- SQL: **SQL-MIGRATION-user-preferences-v1.sql** (idempotent), in DEV (projektzeiterfassung20)
  UND PROD (PZE-production, Ref cnnuyioklhlrfygwticf) ausgefuehrt.

Der Code faengt eine fehlende Tabelle ab (catch -> Default "monatsende", Log) - blockiert also
nichts, kann die Wahl dann aber nicht speichern.

---

## Code-Integration (Status) - V7.9.4

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| TimesheetForm-v7_4_6-81.tsx | src/components/shared/TimesheetForm.tsx | DEPLOYED |
| SQL-MIGRATION-user-preferences-v1.sql | (Supabase SQL-Editor) | AUSGEFUEHRT DEV + PROD |

Zwischenstaende -79/-80 sind im Endstand -81 aufgegangen. ASCII-Check (0 Nicht-ASCII) und
esbuild-Syntaxpruefung je Build erfolgt. Deploy: Merge v7-dev -> main (--no-ff), push origin +
cubintec, Vercel.

---

## Verifikation (durch Martin bestaetigt)

- Umschaltung funktioniert (Beispielprojekt AURA, Dez 2025): Kreispfeil in der Rest-Kopfzelle,
  Standard Monatsende (grau), Klick -> Gesamtsicht (gruener Chip), Restzahl wechselt entsprechend.
- Persistenz pro Nutzer ueber v7_user_preferences (DEV + PROD Migration vorab ausgefuehrt).
- In PROD deployt.

---

## Offen / naechste Schritte

- Optional (nicht beauftragt): Im Modus "monatsende" zusaetzlich die projektweite "gesamt"-Zahl
  in den Zell-Tooltip legen (Hover zeigt beide) - entschaerft den einen Nachteil der
  Monatsende-Sicht (verdeckte projektweite Ueberbuchung, wenn Folgemonate bereits gebucht sind).
- Uebernommen aus frueheren Sessions: automatisierte Stundenvorschlaege (Konzept vor Bau);
  KMU-innovativ PDF-Import; Enum-Vereinheitlichung v7_funding_format DEV/PROD; Manuals-Nachzug;
  Datenhygiene Loesch-Kaskade; 'Assistenz GL'-Rolle; A-013 Legacy-Cluster; A-036 Feiertags-
  UI-Sperre Fehlzeit-Zeile; A-037 Footer-Build-Marker.

---

## Komponenten / Dateien dieser Etappe (deployed src/)

- src/components/shared/TimesheetForm.tsx (v7.4.6-81)

**DB:** NEU v7_user_preferences (DEV + PROD), SQL-MIGRATION-user-preferences-v1.sql.

**Doku:** PFLICHTENHEFT-v5_37.md; GIT-SICHERUNG-v7_9_4-session76.md (diese Datei);
DEPLOY-PROZESS-PZE.md (unveraendert gueltig: main auf origin + cubintec).
