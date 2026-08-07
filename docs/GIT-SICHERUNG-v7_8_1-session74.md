# GIT-SICHERUNG - Session 74

**Datum:** 5. August 2026
**SW-Release:** V7.8.1 (Projektanlage/Foerderformate ueberarbeitet + Team-Vorbelegung - in PRODUKTION)
**Pflichtenheft:** v5.31
**Branch:** main = PROD (deployed) / v7-dev
**Deploy-Stand:** **V7.8.1 ist in PROD.** DB-Migration (Enum-Werte + Spalte) in DEV UND PROD ausgefuehrt.
Code in zwei Schritten deployt (erst ProjectCreateForm, dann die vier Begleitdateien), jeweils merge
v7-dev -> main (--no-ff), push origin + cubintec, Vercel-Deploy. `pnpm build` sauber.

---

## Anlass

Beim Aufbau eines Testmandanten (DZ E) fielen drei Dinge auf, plus ein Team-UX-Wunsch:

1. Beim Zuordnen eines Mitarbeiters zum Projekt mussten die Gehaltsdaten erneut eingegeben werden,
   obwohl sie am Firmen-Mitarbeiter bereits erfasst waren.
2. Der PDF-Antragsimport war im Formular schwer zu finden (Reiter "Manuell" stand vorn/Standard).
3. Foerderformat-Liste veraltet: "BMBF Durchfuehrbarkeitsstudie" gibt es nicht; Ministerium heisst
   jetzt BMFTR (Bundesministerium fuer Forschung, Technologie und Raumfahrt), nicht mehr BMBF.
4. Fuer Programme ohne PDF-Import brauchte es einen sauberen Weg ("Sonstige" + Hinweis -> manuell).

---

## Erledigte Punkte

### 1. Team-Vorbelegung aus den Stammdaten (ProjectTeamManager v7.4.4-19)

- `handleEmployeeSelect` uebernimmt jetzt beim Auswaehlen eines MA dessen in `v7_employees`
  hinterlegte Anlage-6.1-Vorgabewerte ins Formular: Fix-Monatsbrutto (monthly_salary), weitere
  Fixbestandteile (annual_bonus), pWAZ (weekly_hours), bWAZ (company_weekly_hours) und den
  kalkulatorischen Stundensatz. Number-Felder in Punkt-Dezimal, Stundensatz im Komma-Format.
- Alle Felder bleiben editierbar. "Bewilligter Stundensatz lt. Bescheid" bleibt bewusst leer
  (projekt-/bescheidspezifisch). Gespeichert wird weiterhin ausschliesslich projektbezogen auf
  `v7_project_assignments` (fix pro Projekt) -> foerderrechtliches Modell unveraendert.
- Aufraeumung: totes Employee-Interface-Feld `annual_salary` (existierte nie als Spalte) ersetzt
  durch die realen `monthly_salary` + `annual_bonus`.
- KEINE DB-Migration noetig (die Spalten existieren seit Session 44).

### 2. Projektanlage: PDF-Import zuerst + Foerderformate (ProjectCreateForm v7.4.2-11)

- Reiter heisst jetzt "PDF-Import (Antrag)" (nicht mehr "ZIM-Antrag"), steht ZUERST und ist der
  Standard-Reiter, mit "Empfohlen"-Badge; "Manuell" folgt dahinter. Gilt in beiden Portalen
  (geteilte Komponente).
- Foerderformat-Liste: ZIM Einzel / Kooperation / Netzwerk-Management / Durchfuehrbarkeitsstudie,
  NEU "KMU-innovativ" (interner Code BMBF_KMU) und "Sonstige (anderes Foerderprogramm)". Die
  generischen Eintraege BMBF, BMBF_DS und Verbund wurden entfernt.
- "Sonstige" blendet ein Pflicht-Freitextfeld "Welches Foerderprogramm?" ein (-> Spalte
  v7_projects.funding_format_other); ohne Eintrag ist "Projekt anlegen" gesperrt.
- PDF-Reiter mit Programm-Auswahl und dreistufiger Import-Weiche:
  * ZIM -> normaler Upload wie bisher.
  * KMU-innovativ -> Hinweis "PDF-Import in Vorbereitung" + Knopf "Manuell anlegen".
  * Sonstige -> Hinweis "kein Import vorgesehen" + Knopf "Manuell anlegen".
  Der Knopf setzt das Format passend und springt auf den Manuell-Reiter. Parse-Fehler (kein ZIM-PDF)
  zeigen zusaetzlich einen "Manuell anlegen"-Ausweg.
- Erweiterbar: Sobald der KMU-innovativ-Antrag als PDF eingelesen werden kann, wird dieser eine
  Zweig von "in Vorbereitung" auf "verfuegbar" gestellt und der Parser angehaengt (naechster
  moeglicher Aktionspunkt).

### 3. App-weite Labels + Bearbeiten-Konsistenz

- Entscheidung: Label nach dem stabilen PROGRAMM "KMU-innovativ", nicht nach dem Ministerium
  (BMBF -> BMFTR wechselt je Regierung). Interner Code bleibt BMBF_KMU (fuer Nutzer unsichtbar).
- Anzeige-Labels umgestellt: v7-types v7.4.9-4 (LABELS + SHORT), projektfortschritt-utils v7.4.9-5
  (LABELS + SHORT, "OTHER" ergaenzt), mein-status v7.4.4-18 (Badge BMBF_KMU -> KMU-innovativ,
  Fall "OTHER" -> Sonstige).
- ProjectDetailPage v7.4.4-64: gleiche Foerderformat-Liste wie die Anlage, Sonstige-Freitextfeld
  auch beim Bearbeiten, Laden/Speichern von funding_format_other, und Klartext-Label-Anzeige ueber
  neuen Helfer `fundingLabel` (statt Rohwert-Badge; bei Sonstige der eingetragene Programmname).

---

## DB-Migrationen (DEV + PROD ausgefuehrt)

Drei Statements (einzeln, nicht in einer Transaktion; idempotent):

    ALTER TYPE v7_funding_format ADD VALUE IF NOT EXISTS 'BMBF_KMU';
    ALTER TYPE v7_funding_format ADD VALUE IF NOT EXISTS 'OTHER';
    ALTER TABLE v7_projects ADD COLUMN IF NOT EXISTS funding_format_other text;

---

## Code-Integration (Status) - Session 74

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| ProjectTeamManager-v7_4_4-19.tsx | src/components/shared/ProjectTeamManager.tsx | INTEGRIERT + DEPLOYED |
| ProjectCreateForm-v7_4_2-11.tsx | src/components/shared/ProjectCreateForm.tsx | INTEGRIERT + DEPLOYED |
| ProjectDetailPage-v7_4_4-64.tsx | src/components/shared/ProjectDetailPage.tsx | INTEGRIERT + DEPLOYED |
| v7-types-v7_4_9-4.ts | src/types/v7-types.ts | INTEGRIERT + DEPLOYED |
| projektfortschritt-utils-v7_4_9-5.ts | src/lib/projektfortschritt-utils.ts | INTEGRIERT + DEPLOYED |
| mein-status-page-v7_4_4-18.tsx | src/app/v7/firma/mein-status/page.tsx | INTEGRIERT + DEPLOYED |

Hinweis: Der Zwischenbuild ProjectCreateForm-v7_4_2-10 (nur Reiter-Umstellung) wurde durch -11 abgeloest
und NICHT separat deployt.

---

## Deploy V7.8.1

- ProjectTeamManager v7.4.4-19 zuerst (eigener Commit, Vorbelegung) - ohne DB-Aenderung.
- Dann DB-Migration (Enum-Werte + Spalte) in DEV, getestet, danach PROD.
- Dann ProjectCreateForm v7.4.2-11 (Commit + merge -> main + push origin/cubintec).
- Dann die vier Begleitdateien (ProjectDetailPage, v7-types, projektfortschritt-utils, mein-status)
  als zweiter Commit + merge -> main + push. `pnpm build` sauber.

WICHTIGE LEHRE (Reihenfolge): ProjectCreateForm-11 schreibt beim Anlegen IMMER funding_format_other.
Ohne die vorherige Spalten-Migration scheitert daher jede manuelle Projektanlage
("column funding_format_other does not exist"). Bei Feld-/Enum-erweiternden Deploys gilt: DB zuerst
(DEV + PROD), dann Code. Der ZIM-PDF-Import (serverseitige RPC) war davon nicht betroffen.

---

## Lehren

- **Label vs. Wert trennen:** Ministeriumsnamen sind politisch fluechtig (BMBF -> BMFTR). Das
  Programm "KMU-innovativ" ist stabil -> nach dem Programm benennen, den internen Enum-Code
  unangetastet lassen. Aendert sich der Programmname, ist es ein Label-, kein Code-/Datenthema.
- **Vorbelegen != Binden:** Die Stammdaten sind nur Startwerte; die foerderrechtlich verbindlichen
  Werte kommen aus Antrag/Bescheid und werden pro Projekt auf v7_project_assignments eingefroren.
- **Import-Faehigkeit als Weiche modellieren:** Dreistufig (verfuegbar / in Vorbereitung / kein
  Import) statt "geht/geht nicht" - so ist KMU-innovativ spaeter ein Einzeiler zum Freischalten.

---

## Offen / naechste Schritte

- **KMU-innovativ PDF-Import** bauen (eigener Antrags-Parser analog ZIM) - dann Weiche von
  "in Vorbereitung" auf "verfuegbar" stellen.
- **PH §4 (Komponenten-Uebersicht)** Versions-Nachzug fuer die sechs Dateien dieser Session
  (Header + §13 sind aktualisiert).
- Enum-Vereinheitlichung v7_funding_format DEV/PROD (Alt-Backlog) bleibt offen.
- Uebernommen: Manuals-Nachzug, Datenhygiene Loesch-Kaskade, 'Assistenz GL'-Rolle,
  Max-foerderbare-Stunden-Chip.

---

## Komponenten / Dateien dieser Session

**Geaendert & deployed (src/):**
- src/components/shared/ProjectTeamManager.tsx (v7.4.4-19)
- src/components/shared/ProjectCreateForm.tsx (v7.4.2-11)
- src/components/shared/ProjectDetailPage.tsx (v7.4.4-64)
- src/types/v7-types.ts (v7.4.9-4)
- src/lib/projektfortschritt-utils.ts (v7.4.9-5)
- src/app/v7/firma/mein-status/page.tsx (v7.4.4-18)

**DB (DEV + PROD):**
- ALTER TYPE v7_funding_format ADD VALUE 'BMBF_KMU', 'OTHER'
- ALTER TABLE v7_projects ADD COLUMN funding_format_other text

**Doku:**
- PFLICHTENHEFT-v5_31.md (Kopf + §13-Eintrag v5.31)
- GIT-SICHERUNG-v7_8_1-session74.md (diese Datei)
