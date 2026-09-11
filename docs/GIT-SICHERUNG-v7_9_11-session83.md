# GIT-SICHERUNG - Session 83 (V7.9.11)

**Datum:** 11. September 2026
**SW-Release:** V7.9.11 (FZul-Detailseite: zentrale Abwesenheiten, zuschussfaehige
Stunden, Jahresarbeitszeit-Block der BSFZ-Vorlage) - in PRODUKTION
**Pflichtenheft:** v5.44
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_10-session82.md (Kapazitaetsplanung Elternzeit).

**Stand main:** `b4f8e42` "Merge v7-dev: FZul-Detail Abwesenheiten, zuschussfaehige
Stunden, BSFZ-Jahresarbeitszeit (v7.4.8-20, Route v2.5)" - identisch auf **origin/main**
und **cubintec/main** (beide Remotes gepusht, Vercel "Ready").
**Stand v7-dev:** `c74affb`, identisch auf origin/v7-dev (zuvor `feca4d7`).
**Release-Tag:** `v7.9.11` (annotiert, auf `b4f8e42`), gepusht auf origin und cubintec.
Tags jetzt: v7.9.7, v7.9.8, v7.9.9, v7.9.10, v7.9.11.

**Deploy-Stand:** In PROD deployt. **KEIN SQL** (DEV und PROD). Nur lesende Abfragen.
Drei Themen (A-067, A-068, A-069) plus ein Beifang, zwei Dateien, ein Commit.

---

## Ziel dieser Etappe

A-067 aus V7.9.10: Die FZul-Detailseite (`/v7/berater/multiprojekt/[id]`, Uebersicht,
Import, Jahreskalender, BSFZ-Export) las `v7_employee_absences` nicht. An Urlaubs-,
Krank-, Sonstige- und Elternzeit-Tagen wurden volle FZul-Stunden angeboten und
gelangten in den BSFZ-Export. Beim Test kamen zwei weitere Fehler im selben Lesepfad
zutage (A-068, A-069), die vor dem Deploy mit behoben wurden, weil der Export nach
aussen geht.

---

## Session-Auftakt (Versions-Check downloads/)

- 106 Dateien, 98 Basisnamen. ASCII: alle 63 .ts/.tsx-Quelldateien (hoechste Version)
  0 Nicht-ASCII, keine Lesefehler.
- iCloud-Platzhalter: VERHALTENSVERTRAG-v1_2.md ("Resource deadlock avoided") - kein
  Befund, Projektkopie gelesen.
- Archivreif neben Nachfolgern: FirmaCockpit-v7_4_9-36-14, ProjektFortschrittPanel-
  v7_4_5-33, StundennachweisMatrix-v7_4_6-15, TimesheetForm-v7_4_6-96,
  projektfortschritt-utils-v7_4_9-15, berater-multiprojekt-page-v7_4_8-27/-28,
  KONZEPT-ELTERNZEIT-TIMESHEET-v1_0, GIT-SICHERUNG-v7_9_7-session81.
  Aufraeumskript: aufraeumen-session83-v1.zsh.

---

## Weg zur Loesung

### A-067 - zentrale Abwesenheiten (Build -18)

Befund (-17): vier Lesepfade (Uebersicht, Import, Kalender, Export) lasen nur
`v7_timesheets`; `urlaub_hours`/`krank_hours`/`sonderurlaub_hours` wurden immer 0
geschrieben. Die Route kannte bereits `dayData[m][d].absence`, die Seite setzte es nie.

Umsetzung:

1. `ladeAbwesenheiten()`: aktive U/K/S/E je MA und Zeitraum, `.limit(10000)`.
   **Mitarbeiterbezogen, ohne Filter auf das Projekt-Zuordnungsfenster** (anders als
   `lib/employeeAbsences.ts`) - die FZul haengt an der Person, nicht an einem Projekt.
   Ladefehler werden geworfen statt verschluckt (sonst stille Falschwerte).
2. Wirksam nur an **Arbeitstagen** (Mo-Fr, kein Feiertag laut `getGermanHolidays`); E
   steht laut Bereichsdialog auch auf Feiertagen, dort geht der Feiertag vor.
3. Uebersicht: Max./Verf. h minus Abwesenheits-Arbeitstage x Tagesarbeitszeit, **alle
   Codes** (Entscheidung Martin). Zusatzzeile "abzgl. x h Abw. (n AT)".
4. Import: an Abwesenheitstagen `fue = verfuegbar = 0`; U/K/S-Stunden aus der
   Abwesenheitszeile, E: 0.
5. Kalender: Abwesenheitstag mit Kuerzel statt Eingabefeld (E hellblau `bg-sky-100`,
   U/K/S violett). **Altdaten** (gespeicherte FZul-Stunden an einem Abwesenheitstag):
   rote Zelle, Eingabe setzt auf 0, Hinweis mit Anzahl und Stunden, **keine automatische
   DB-Aenderung** (Entscheidung Martin). Ladefehler sichtbar.
6. Export: `dayData[m][d].absence = true` fuer alle Abwesenheitstage.
7. **Beifang:** `loadVorhaben` nutzte als Enddatum fest `-31`; bei Vorhaben mit Ende
   Feb/Apr/Jun/Sep/Nov lehnt Postgres das Datum ab, der Fehler wurde nicht ausgewertet
   -> gefoerdert 0, MA faelschlich in Gruppe B. Jetzt tatsaechlicher Monatsletzter.

PROD-Vorab-Abfrage (nur lesend): **59 Tage / 303,6 h** gespeicherte FZul-Stunden an
U-Werktagen, ausschliesslich Vorhaben **KAIRA 2026** (Planungsprojekt, nichts
eingereicht): Ditscherlein 19 / 144,4 h, Kirchner Katrin 13 / 72,8 h, Kirchner Lisa
27 / 86,4 h. Entscheidung Martin: Daten stehen lassen, als PROD-Pruefung nutzen.

### A-068 - nur zuschussfaehige Stunden sind "gefoerdert" (Build -19)

Befund im DEV-Test: Beim Speichern eines Monats im TimesheetForm legt die
Auto-Vorbelegung (V7.9.7, TF-12) an jedem Arbeitstag "Nicht zuschussfaehige Arbeiten"
an (ohne AP, `is_billable = false`). Die FZul-Seite zaehlte ALLE Stunden in
Foerderprojekten als gefoerdert -> fuer jeden gespeicherten Monat verfuegbar = 0.
Das Werkzeug meldete damit zu WENIG FZul-Stunden (nicht zu viel).

Datenpruefung DEV und PROD (je `funding_format`): `work_package_id IS NOT NULL` <=>
`is_billable = true` in allen Formaten (ZIM, ZIM_DS, ZIM_KOOP, ZIM_EINZEL,
ZIM_NETZWERK), keine Mischfaelle. PROD-Bestand nicht zuschussfaehig in
Foerderprojekten: **6.070,8 h**.

Umsetzung: `.eq('is_billable', true)` in allen vier `v7_timesheets`-Abfragen
(Entscheidung Martin).

Rueckfrage Martin (Verstaendnis): Die Zahl in einer Kalenderzelle ist der
GESPEICHERTE FZul-Wert, nur leer zeigt sie "verfuegbar". Unterschied Oktober (0) /
November (rote 8) im Test entstand durch einen Neu-Import nach dem Speichern des
Oktobers; beide Monate hatten dieselben nicht zuschussfaehigen Stunden.

### A-069 - Jahresarbeitszeit-Block der BSFZ-Vorlage (Route v2.5 + Build -20)

Befund Martin im Export: Krankheit und Elternzeit fehlen im unteren Teil. Auslesen der
Vorlage `public/templates/FZul_Vorlage.xlsx` ergab zusaetzlich:

- Die Route (deployt: **v2.3**, nicht die Archivkopie v2.4) schrieb nach **C38 / F39 /
  J39**. Diese Zellen liegen in verbundenen Beschriftungsfeldern und werden nicht
  gelesen. Eingabezellen der Formeln sind **E38** (Wochenarbeitszeit) und **O39..O43**
  (Tage). E38/O39 behielten immer die Vorgabewerte der Vorlage **40 h / 30 Tage** - bei
  jedem MA mit anderer WAZ oder anderem Anspruch war die Jahresarbeitszeit falsch.
- Zeilen: 39 Urlaubsanspruch (O39), 40 Krankheitstage (O40), 41 Sonderurlaub (O41),
  42 Gesetzliche Feiertage (O42 = Formel der Vorlage), 43 Kurzarbeit,
  Erziehungsurlaub u. ae. (O43).
- Die Archivkopie `api-export-fzul-route-v2_4.ts` (fzulData) wurde nie deployt.
- Route v2.3 enthielt Umlaute im Quelltext (ASCII-Regel verletzt).

Fachliche Klaerung S -> Sonderurlaub (Vorschlag Martin: Summen-Differenz S minus
Feiertage, Ueberschuss U ueber Anspruch als Sonderurlaub):

- S wird **tagesgenau** gezaehlt (Arbeitstag ohne Feiertag) statt per Summen-Differenz
  - robust auch bei fehlender Feiertags-Vorbelegung (E-Tage) und S an sonstigen freien
  Tagen. Zuordnung Zeile 41.
- **U ueber Anspruch wird nicht umgebucht**, sondern im Export-Tab als Hinweis gezeigt.
  Grund: die Vorlage zieht den vertraglichen ANSPRUCH ab; haeufigste Ursache fuer
  mehr genommene Tage ist Resturlaub aus dem Vorjahr - eine Umbuchung wuerde dann
  doppelt kuerzen. PROD-Pruefung: 2 von 72 MA-Jahren (Schoebel 2026: 33/30,
  Schwab 2025: 32/30). Anspruch in PROD bei allen MA 30 (Stammdaten pruefen).

Umsetzung:

- **Route v2.5** (`api-export-fzul-route-v2_5-1.ts`, Basis src v2.3): E38 und O39
  statt C38/F39/J39; neue optionale Felder `sickDays` -> O40, `specialLeaveDays` ->
  O41, `parentalLeaveDays` -> O43 (Arbeitstage; Stunden und Feiertage rechnet die
  Vorlage). Fehlen die Felder, bleiben die Zeilen 0. ASCII-konform.
- **Seite -20:** Export zaehlt K/S/E-Arbeitstage im Exportjahr und uebergibt sie; U
  nicht (Anspruch aus `annual_leave_days`). Export-Tab je MA: "Arbeitstage JJJJ: U · K ·
  S · E · Urlaubsanspruch" und gelber Hinweis bei U > Anspruch.
- Weitere Aufrufer der Route (`grep`): nur `src/app/import/page.tsx` (Alt-Seite V7.0,
  Legacy-Cluster A-013). Wirkung dort: E38/O39 zeigen jetzt die uebergebenen Werte;
  Zeilen 40/41/43 bleiben 0. Nicht gegengetestet.

---

## DB-Aenderung

**Keine.** Nur lesende Abfragen (PROD: Konflikt-Umfang KAIRA, `is_billable` je Format,
U/S-Werktage je MA; DEV: Testfaelle, Import-Kontrolle).

DEV-Testdaten (Oberflaeche): Vorhaben "Test A-067" (AS System 2026, 1-12); U 12.10. und
16.11.2026 und E 14.-31.12.2026 bei Bohlmann - wieder entfernt (von Martin bestaetigt);
dabei angelegte nicht zuschussfaehige Stunden Okt/Nov 2026 (HEATS, Bohlmann) koennen in
DEV bleiben.

---

## Code-Integration (Status) - V7.9.11

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| berater-multiprojekt-detail-v7_4_8-18.tsx | src/app/v7/berater/multiprojekt/[id]/page.tsx | DEV getestet, aufgegangen in -19 |
| berater-multiprojekt-detail-v7_4_8-19.tsx | dto. | DEV getestet, aufgegangen in -20 |
| berater-multiprojekt-detail-v7_4_8-20.tsx | dto. | DEPLOYED (V7.9.11) |
| api-export-fzul-route-v2_5-1.ts | src/app/api/export/fzul/route.ts | DEPLOYED (V7.9.11) |

Je Build: ASCII-Check (0 Nicht-ASCII), strikte Typpruefung gegen Vorgaenger (keine neuen
Fehler), `cmp` gegen den src-Stand vor dem Kopieren, `npm run build` lokal fehlerfrei.

**Commits dieser Etappe:**

| Commit | Branch | Inhalt |
|---|---|---|
| `c74affb` | v7-dev | FZul-Detail v7.4.8-20 + Export-Route v2.5: A-067, A-068, A-069 (2 Dateien) |
| `b4f8e42` | main | Merge v7-dev (--no-ff): +486 / -38 |

---

## Verifikation (durch Martin bestaetigt)

**DEV (AS System, Vorhaben "Test A-067", 2026, 40 h/W, 173,33 h x 12 = 2.079,96 h):**

- Uebersicht -18: Bohlmann 1280.0 (15 AT, -120 h), Duehrkop M. 1693.0 (keine
  Abwesenheit), Duehrkop T. 1619.0 (10 AT), Schulz 1288.7 (5 AT) - alle auf 0,1 h.
- Kalender Bohlmann: 11 x U, 4 x K violett, keine roten Zellen, FZul 1.240 h.
- Altdaten: U 16.11. nach Import -> roter Hinweis "1 Abwesenheitstag (8.0 h)", Zelle
  rot; auf 0 gesetzt und gespeichert -> violett U, FZul Nov 168 -> 160.
- Neu-Import: `fue_hours` 0, `verfuegbar_hours` 0, `urlaub_hours` 8 am U-Tag (SQL).
- -19: Oktober/November wieder 8 h/Tag, Gef. leer; Gef. h Bohlmann 680 unveraendert
  (Jan-Mai nur AP-Stunden); Duehrkop T. 381 -> 379.
- E 14.-31.12.: roter Hinweis "13 Abwesenheitstage (104.0 h)", 25.12. bleibt 1.WT; nach
  Neu-Import hellblau E, Dezember 72 h.
- Excel (-19): Raster U/K/E leer, Summe 1.136 h = 1.240 - 104.
- Excel (-20 / v2.5): E38 40, O39 30, **O40 4 (32 h)**, O41 0, O42 7 (56 h), **O43 13
  (104 h)**, Jahresarbeitszeit **1.648 h**, Anteil **0,69** (mit v2.3: 1.784 h / 0,64).
- Export-Tab: "Arbeitstage 2026: U 11 · K 4 · S 0 · E 13 · Urlaubsanspruch 30".

**PROD (KAIRA 2026, nur Ansicht):**

- Ditscherlein: roter Hinweis **19 Abwesenheitstage (144.4 h)** = Vorab-SQL.
- Uebersicht: Ditscherlein 19 AT / 144,4 h, Kirchner Katrin 13 AT / 72,8 h, Kirchner
  Lisa 27 AT / 86,4 h = Vorab-SQL.
- Export-Tab Ditscherlein: U 19 · K 0 · S 0 · E 0 · Anspruch 30.
- Excel Ditscherlein: **E38 = 38** (bisher Vorgabe 40), O39 30, Feiertage 9 (68,4 h),
  Jahresarbeitszeit **1.679,6 h** (bisher 1.768 h), FuE 357,66 h, Anteil 0,21.

---

## Beobachtungen (nicht Teil dieser Etappe)

- **KAIRA (PROD):** 59 U-Tage mit gespeicherten FZul-Stunden; zusaetzlich Monate, in
  denen gespeicherte FZul-Stunden die Verfuegbarkeit uebersteigen (rote Schrift, z. B.
  Ditscherlein Sep/Okt). Bereinigung bei Bedarf per "Neu importieren" je MA (verwirft
  manuelle Kalenderaenderungen).
- **Kalenderwerte gehen nicht in die Excel:** Der Export nutzt seit -16 die
  Live-Invertierung, nicht die gespeicherten `fue_hours`. Manuelle Korrekturen im
  Kalender erscheinen nicht in der BSFZ-Datei. Fachliche Entscheidung offen.
- **Tooltip** (`title`) der Kalenderzellen bei Martin nicht sichtbar; Vergleich mit
  Feiertagszelle nicht rueckgemeldet (vermutlich Browserverhalten).
- **Enddatum-Fix** nicht separat getestet (Vorhaben mit Ende Juni).
- `v7_fzul_timesheets.updated_at` aendert sich beim Upsert nicht (kein Trigger).
- Regionale Feiertage (holiday_region, z. B. Augsburg): Seite beruecksichtigt sie, Route
  und Vorlage nicht - Randfall.
- **Aufraeumskripte:** `(( OK++ ))` liefert in zsh Exit-Status 1, wenn der Zaehler 0 war -
  der erste erfolgreiche Move meldet faelschlich "FEHLER" (aufraeumen-session81 und -83;
  alle 18 Moves in Session 83 geprueft ausgefuehrt). Kuenftig `(( ++OK ))`.
- **Doku-Ablage im Repo:** `docs/` (downloads/ ist nicht versioniert).

---

## Offen / naechste Schritte

- **Stammdaten `annual_leave_days`** in PROD pruefen (bei allen MA 30), da der Wert jetzt
  wirksam in O39 steht.
- **FZul-Export Ausbau:** Kuerzung bei unterjaehrigem Vorhaben (Zeile 45, X45 fest 1);
  WAZ-Wechsel im Jahr (E38 = WAZ zum 1.1. des Vorhabenjahres, auch bei
  Jahresnavigation); Kurzarbeit (KA) nicht in Zeile 43; manuelle Korrektur U > Anspruch
  (Resturlaub/Sonderurlaub); Entscheidung "gespeicherte Kalenderwerte exportieren".
- **Alt-Seite `src/app/import/page.tsx`** (A-013): nutzt die Route; Pruefen oder
  Stilllegen.
- Aus V7.9.10 uebernommen: A-066 (Elternzeit ausserhalb Projektlaufzeit per UI nicht
  entfernbar); Warnung bei verplanten Arbeitsplan-PM im E-Zeitraum; Anleitungen (Admin,
  PL) Kapitel Elternzeit; VERHALTENSVERTRAG v1.3 (KP-01..04 aus v5.43, neu FD-01..08
  aus v5.44); veraltetes Interface `V7Timesheet`; Vereinfachung Prognose-Modell;
  Restanzeige "monatsende"; automatisierte Stundenvorschlaege; KMU-innovativ PDF-Import;
  Enum-Vereinheitlichung v7_funding_format DEV/PROD; Manuals-Nachzug; Datenhygiene
  Loesch-Kaskade; 'Assistenz GL'-Rolle; A-013 Legacy-Cluster.

---

## Komponenten / Dateien dieser Etappe (deployed src/)

- src/app/v7/berater/multiprojekt/[id]/page.tsx (v7.4.8-20)
- src/app/api/export/fzul/route.ts (v2.5)

**DB:** keine Aenderung.

**Git:** `main` = `b4f8e42` auf origin und cubintec (Tag `v7.9.11`); `v7-dev` = `c74affb`.
Doku-Commits folgen.

**Doku:** PFLICHTENHEFT-v5_44-AENDERUNGSBLOCK.md; GIT-SICHERUNG-v7_9_11-session83.md
(diese Datei); KONZEPT-ELTERNZEIT-TIMESHEET-v1_2.md; DEPLOY-PROZESS-PZE.md (unveraendert
gueltig).
