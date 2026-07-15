# GIT-SICHERUNG - Session 68

**Datum:** 15. Juli 2026
**SW-Release:** V7.7.0 (FZul-/Multiprojekt-Modul end-to-end funktionsfaehig - jetzt in PRODUKTION)
**Pflichtenheft:** v5.20
**Branch:** main = PROD (deployed) / v7-dev
**Deploy-Stand:** **V7.7.0 ist in PROD.** merge v7-dev -> main (--no-ff), push auf origin +
cubintec, Vercel-Deploy auf pze.cubintec-hub.com verifiziert. Kein Tabellen- oder
Enum-Migrationsschritt noetig (FZul-Tabellen + RLS existierten bereits in PROD).

---

## Zusammenfassung

Session 68 hat das FZul-/Multiprojekt-Modul von "teilweise vorhanden, aber unbrauchbar"
zu **end-to-end funktionsfaehig in PRODUKTION** gebracht: gefoerderte Stunden je MA
ermitteln (Abgrenzung Doppelfoerderung), Multijahr-Kalender mit freier FZul-Kapazitaet je
Tag, und BSFZ-Excel-Export pro MA. Kern war die Diagnose zweier verdeckter Bugs, die den
Import dauerhaft auf 0 hielten.

---

## Erledigte Punkte

### CRITICAL FIX: day_type-Enum-Filter (Kernursache "Import = 0")

- `multiprojekt/[id]/page.tsx` v7.4.8-13 -> **v7.4.8-14**.
- Der Import-Filter schloss Abwesenheiten mit **deutschen** Werten aus
  (`urlaub, krank, sonderurlaub, feiertag`). Die Enum `v7_day_type` ist aber **englisch**
  (`vacation, sick, special_leave, holiday, weekend, work, short_time`). Der Cast warf
  einen PostgREST-Enum-Fehler -> die v7_timesheets-Query lieferte `null` (Fehler nicht
  abgefangen) -> gefoerderte Stunden = 0 -> alle MA faelschlich in Gruppe B, Kalender
  zeigte ueberall volle 8 h. Filter auf englische Enum-Werte korrigiert (2 Stellen:
  loadVorhaben + handleImport).

### FIX: ZIM-Erkennung (Alt-Projekte)

- `v7-types.ts` v7.4.9-2 -> **v7.4.9-3** (additiv).
- `ZIM` und `ZIM_DS` in Typ-Union, Label-/Short-Maps und `V7_PUBLIC_FUNDING_FORMATS`
  ergaenzt. Ursache: Alt-Projekte mit generischem `funding_format = 'ZIM'` (z.B. HEATS)
  wurden nicht als gefoerdert erkannt, weil `ZIM` nicht in der Positivliste stand. In PROD
  sind faktisch alle Foerderprojekte `ZIM`-Varianten - dieser Fix ist dort entscheidend.

### Multijahr-Kalender

- `multiprojekt/[id]/page.tsx` -> **v7.4.8-15**.
- Die gefoerderten Stunden werden jetzt je **angezeigtem Jahr** live aus v7_timesheets
  berechnet (statt nur aus den gespeicherten FZul-Zeilen des Vorhaben-Jahres). Beim
  Jahreswechsel im Kalender erscheinen damit fuer JEDES Jahr die tatsaechlich gebuchten
  Foerderstunden und die reduzierte FZul-Verfuegbarkeit - man sieht, wo Kapazitaet frei
  ist. Nebeneffekt: gefoerdert/verfuegbar sind immer aktuell.

### Export-Tab (Phase 3, pro MA eine Datei)

- `multiprojekt/[id]/page.tsx` -> **v7.4.8-16**.
- Pro MA ein Button -> erzeugt die amtliche BSFZ-Excel fuers gewaehlte Jahr ueber die
  **bestehende** `/api/export/fzul` (v2.3, unveraendert) und laedt sie herunter
  (`FZul_Nachname_Jahr.xlsx`). Uebergeben werden die je Tag in Foerderprojekten gebuchten
  Stunden; die Vorlage schreibt daraus die **maximal fuer FZul verfuegbaren Stunden je Tag**
  (Tagesarbeitszeit - gebucht). Jahresarbeitszeit/FuE-Anteil/Hoechstgrenze rechnet die
  Vorlage selbst.
- Verworfen: eine zunaechst begonnene API-Erweiterung (v2.4, direkte fue_hours-Uebernahme)
  war ueberfluessig - das Tool liefert an dieser Stelle bewusst nur die verfuegbare
  Kapazitaet, nicht die manuell verteilten FZul-Stunden.

### Vorhaben-Loeschen-Button

- `multiprojekt/page.tsx` v7.4.8-18 -> **v7.4.8-19**.
- Papierkorb-Button je Vorhaben in der Liste (mit Sicherheitsabfrage); loescht zuerst
  v7_fzul_timesheets, dann das Vorhaben (unabhaengig vom ON-DELETE-CASCADE). Vorhaben-Zeile
  von `<button>` auf `<div>` umgestellt (kein verschachtelter Button).

---

## Erkenntnisse

- **DB-Enum-Divergenz DEV/PROD** bei `v7_funding_format`: DEV = `ZIM_EINZEL/KOOP/NETZWERK,
  BMBF_KMU, FZUL, OTHER, ZIM, ZIM_DS`; PROD = `ZIM, ZIM_DS, ZIM_KOOP, ZIM_NETZWERK, BMBF,
  BMBF_DS, EFRE, Horizon, Landesprogramm, FZul, Sonstige`. Real genutzt werden nur
  ZIM-Varianten (vom Fix abgedeckt). Vereinheitlichung (Richtung B) bleibt eigener Track.
- **FZul-Tabellen + RLS existieren in DEV UND PROD**: `v7_fzul_vorhaben`,
  `v7_fzul_timesheets` inkl. granularer Policies (Berater SELECT/INSERT/UPDATE/DELETE +
  system_admin ALL). Deshalb kein Migrationsschritt beim Deploy.
- **day_type-Werte** in v7_timesheets sind englisch (`work` etc.) - relevant fuer alle
  kuenftigen Filter auf diese Spalte.

---

## Deploy V7.7.0

- Keine SQL-Migration, keine Enum-Aenderung.
- Commit auf v7-dev, merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel-Deploy
  verifiziert (Footer-SHA).
- Verifikation in PROD: Vorhaben angelegt, Gruppe A zieht gefoerderte Stunden (ZIM erkannt),
  Multijahr-Kalender und Export getestet.

---

## Offen / naechste Schritte

- **Bereich "Forschungszulage" (Tile `fzul`) - naechstes grosses Thema:** ausser den
  Firmen-Kacheln noch nichts umgesetzt. Kachel-Klick fuehrt auf
  `/v7/berater/fzul/firma/<id>` -> **404** (Route existiert nicht). Zu klaeren: Verhaeltnis
  zum Multiprojekt-Tool (Konsolidierung/Einstieg) und Funktionsumfang.
- **Enum-Vereinheitlichung DEV/PROD** (`v7_funding_format`, Richtung B): TS-Typ + beide
  DB-Enums + Projektdaten + Dropdowns angleichen. Latenter Bug: Nicht-ZIM-Format im
  Projektformular kann in PROD am Enum scheitern.
- **Multijahr-Feinschliff:** Tagesarbeitszeit je Jahr aus Teilzeit-Historie statt
  Vorhaben-Stichtag.
- **Spaeter/separat (neue Funktion):** "freie" FZul-Zeit intelligent auf konkrete
  FZul-Vorhaben verteilen (bewusst abgegrenzt, noch nicht angedacht).

---

## Komponenten / Dateien dieser Session

**Geaendert & deployed (src/):**
- `src/types/v7-types.ts` (v7.4.9-3)
- `src/app/v7/berater/multiprojekt/[id]/page.tsx` (v7.4.8-16, kumuliert -14/-15/-16)
- `src/app/v7/berater/multiprojekt/page.tsx` (v7.4.8-19)

**Unveraendert (bewusst):**
- `src/app/api/export/fzul/route.ts` (v2.3) - erledigt die Kapazitaets-Berechnung selbst

**DB:**
- Keine Migration. FZul-Tabellen + RLS existierten bereits in DEV und PROD.

**Doku:**
- `GIT-SICHERUNG-v7_7_0-session68.md` (diese Datei)
- `PFLICHTENHEFT-v5_20.md`
