# GIT-SICHERUNG - Session 66

**Datum:** 11. Juli 2026
**SW-Release:** V7.6.0 (PDF-Antragsimport - Meilenstein)
**Pflichtenheft:** v5.17
**Branch:** v7-dev (committet) / main = PROD STEHT AUS
**Deploy-Stand:** **NICHT in PROD.** In DEV vollstaendig gebaut und getestet, git-Commit
auf v7-dev zur Sicherung. PROD-Deploy (merge v7-dev->main, push origin+cubintec) und die
PROD-DB-Migration folgen in der naechsten Session.

---

## Zusammenfassung

Meilenstein: Ein komplettes Projekt (Projekt + Mitarbeiter + Team + Arbeitsplan) wird
jetzt **vollautomatisch aus dem ZIM-Antrags-PDF** angelegt. Damit faellt die groesste
manuelle Huerde der Projektanlage weg - PZE ist als Produkt schluesselfertig. SW-Release
auf **V7.6.0** angehoben.

Der PDF-Import ersetzt die bisherige "Excel-Kruecke" (Projekt+Team manuell, Excel-Vorlage
befuellen/hochladen) fuer den Fall "neues Projekt aus Antrag". Der Excel-Arbeitsplan-Import
bleibt unveraendert bestehen.

1. **Eigener, lizenzfreier TS/Node-Extraktor** fuer verschluesselte XFA-Antrags-PDFs
   (nur zlib+crypto, keine Fremd-Lib).
2. **Foerderrechtlich korrektes Salaer-Modell** (projektbezogene Werte, gegen PROD verifiziert).
3. **Atomare Uebernahme** ueber eine Server-Route mit Postgres-RPC (echtes Rollback) +
   Kompensation.
4. **Duplikatspruefung** mit strich-toleranter Namens- und Akronym-Erkennung.
5. **Einstiegspunkt 2 ("Daten aktualisieren") bewusst verworfen** (die realistischen Faelle
   sind schon abgedeckt).

---

## Erledigte Punkte

### Extraktion (eigener TS/Node-Extraktor)

- `zim-antrag-extraktor.ts` (v1.0-3): loest den **PDF-Standard-Sicherheitshandler selbst** -
  AES-128 (V4/R4) UND AES-256 (V5/R6, Algorithm 2.B) - sowie Cross-Reference- und
  Object-Streams inkl. inkrementeller Updates. Nur Node-Bordmittel (`zlib`, `crypto`).
- Nachweis: das extrahierte `datasets`-XML ist fuer alle vier Testantraege **byte-identisch**
  zur pypdf-Referenz (Goldstandard). Verworfen: pdf-lib (Verschluesselung/Object Streams),
  MuPDF (AGPL/kommerziell -> Lizenzkosten), pdf.js (liefert nur geparste XFA).
- Minimaler eigener XML-Parser (keine Fremd-Lib). Parser: `datasets` -> Vertrag
  (Projekt/MA/Arbeitsplan) inkl. **Kontrollsummen-Selbstcheck** (Anlage 5, byte-genau
  reproduziert).

### Salaer-/WAZ-Modell (gegen PROD verifiziert)

- `p_kosten` (Anlage 6.1) = **Vollzeit-aequivalentes** Monatsbrutto (NICHT das tatsaechliche).
- Tatsaechliches Monatsbrutto = round2(`p_kosten` * TZF).
- **bWAZ global pro Antrag**: aus Feld `<bWAZ>`, sonst aus `std_satz`/`p_kosten` zurueckgerechnet
  (WISE=38, EP_Heats/DS=40).
- pWAZ = TZF * bWAZ; **Stundensatz** = (`p_kosten`*12)/(bWAZ*52) = Antragswert `std_satz`.
- Am Projekt: `pm_basis_weekly_hours` = bWAZ.
- Alle Anlage-6.1-Werte projektbezogen auf `v7_project_assignments` (fix pro Projekt);
  "verknuepfen" teilt nur die Identitaet (`v7_employees`), nie das Gehalt.
- **Verifiziert gegen PROD-Screenshots:** Herrler 28,85 EUR/h, Doan 21,63 EUR/h; alle
  `std_satz` aller vier Antraege exakt reproduziert.

### Akronym

- Extraktion aus `cg_VMS_VB_KurzName` (HEATS/VETIS/WerftScan) bzw. bei WISE aus dem Titel
  vor dem Gedankenstrich abgeleitet. Wird als `short_name` gesetzt und zusaetzlich als
  Duplikat-Signal genutzt.

### Routen

- **NEU** `/api/v7/parse-zim` (`parse-zim-route` v1.0-1 + `parse-zim-core` v1.0-2):
  PDF-Upload -> Vertrag oder sprechender Fehler (KEIN_PDF / KEIN_XFA / EXTRAKTION_FEHLER /
  KEIN_ARBEITSPLAN); Kontrollsummen-Abweichung als Warnung (kein Fehler). Node-Runtime.
- **NEU** `/api/v7/import-antrag-neu` (v1.0-1): atomare Uebernahme (siehe unten).
- **ERWEITERT** `arbeitsplan-import` (v7.3.90-1): zusaetzlicher **JSON-Eingang**
  (Content-Type application/json, `packages`) neben dem Excel-Pfad. Gemeinsames Backend fuer
  Excel UND PDF; JSON-Pakete laufen durch dieselbe `parseAPNumber` -> identische
  AP-Nummerierung. Excel-Weg und `ArbeitsplanImport.tsx` unveraendert.

### Uebernahme (atomar, Hybrid)

- Server-Route ruft **RPC `v7_import_projekt_team`**: legt Projekt + neue MA + Team in
  EINER Transaktion an, Rollback bei jedem Fehler. Danach Arbeitsplan ueber die
  `arbeitsplan-import`-Route; scheitert dieser Schritt, kompensiert **RPC `v7_cleanup_projekt`**
  (Projekt + Zuordnungen + Arbeitspakete + neue MA entfernen).
- `SQL-MIGRATION-import-projekt-team-v2.sql`: beide Funktionen (v2 = `funding_format`
  explizit auf Enum `v7_funding_format` gecastet, nachdem v1 daran scheiterte). Gegen echte
  Postgres-Instanz (PGlite) getestet: korrekte Inserts, verknuepfte MA nicht neu angelegt,
  **Rollback bei Fehler nachgewiesen**, Cleanup restlos. **NUR DEV ausgefuehrt - PROD STEHT AUS.**
- Mapping `zim-import-mapping` (v1.0-3): Vertrag -> Projekt-/MA-/Zuordnungs-/Arbeitsplan-Nutzdaten.

### Frontend

- `ProjectCreateForm` (v7.4.2-7): neuer **PDF-Import-Tab** neben "Manuell". Vorschau mit
  editierbarem Projektkopf (inkl. Kurzbezeichnung/Akronym), MA-Tabelle mit Dublettenabgleich,
  pWAZ, Stundensatz und reiner **Info-Anzeige** frueherer Saetze (ohne Auswirkung),
  Arbeitsplan-Matrix, Kontrollsummen-Status. **Duplikat-Rueckfrage** vor dem Anlegen:
  bestehende Firmenprojekte werden gezeigt mit der Frage "neu oder aktualisieren?", wahrscheinliche
  Treffer strich-tolerant + per Akronym gelb markiert. Uebernahme laeuft serverseitig ueber
  die neue Route (keine Client-Inserts mehr).

### Bewusste Entscheidung: Einstiegspunkt 2 verworfen

- "Daten aktualisieren am bestehenden Projekt" wird **nicht gebaut**: der realistische Fall
  (ein einzelner neuer MA) geht direkter ueber die UI (Team > Mitarbeiter hinzufuegen);
  Arbeitsplan-Aenderungen deckt der bestehende Excel-Import mit Diff-Vorschau ab; ein komplett
  neuer Antrag ist unrealistisch, da ein Projekt erst mit Bewilligung/FKZ angelegt wird und
  sich danach kaum grundlegend aendert.

### DEV-Test (erfolgreich)

- Kompletter Durchlauf gegen den echten WISE-Antrag: Projekt + Team (korrekte Stundensaetze,
  Herrler 28,85 / Doan 21,63) + Arbeitsplan (10 AP, 1 PM = 164,67 h bei bWAZ 38) sauber
  angelegt; Kontrollsummen gruen. Enum-Fehler (v1) durch v2 behoben; danach durchgelaufen.
- Duplikat-Rueckfrage getestet: beide vorhandenen WISE-Projekte werden als "wahrscheinlich
  dasselbe Projekt" markiert (strich-tolerant + Akronym).

---

## Erkenntnis / Backlog (Datenhygiene)

- **Verwaiste MA:** Beim Loeschen eines Projekts bleiben neu angelegte, sonst nirgends
  verwendete Firmen-MA im Stamm zurueck (im Test der "n.n."-Fall - manuell im Firmenstamm
  entfernt). Die Loesch-Kaskade fuer verwaiste MA/Zuordnungen sollte geprueft werden
  (unabhaengig vom Import). Der Import selbst hat korrekt gehandelt.

---

## Offen / naechste Session (PROD-Deploy)

1. **SQL-Migration v2 auf PROD** (cnnuyioklhlrfygwticf) ausfuehren (create-or-replace der
   beiden Funktionen). Muss VOR dem Code-Deploy laufen, sonst 500er in PROD.
2. **PROD-Deploy:** merge v7-dev -> main, push origin + cubintec, Vercel-Deploy auf
   pze.cubintec-hub.com verifizieren (Footer-Build-SHA).
3. **Entscheidung:** PDF-Import-Tab zunaechst nur im Berater-Portal sichtbar? (fruehere
   Vorgabe: im Firmen-Portal ausblenden, bis stabil - aktuell in beiden sichtbar).
4. **Upload-Checkliste (.xlsx)** fuer alle Session-66-Dateien.

**Offen unveraendert:** A-001, A-006, A-012, A-013, A-019, A-039, A-043; A-034-Restpunkt
(RLS-Angleich DEV/PROD im Backlog).

---

## Komponenten / Dateien dieser Session

**Neu (src/):**
- `src/lib/zim/zim-antrag-extraktor.ts` (v1.0-3)
- `src/lib/zim/zim-import-mapping.ts` (v1.0-3)
- `src/lib/zim/parse-zim-core.ts` (v1.0-2)
- `src/app/api/v7/parse-zim/route.ts` (parse-zim-route v1.0-1)
- `src/app/api/v7/import-antrag-neu/route.ts` (v1.0-1)

**Geaendert (src/):**
- `src/app/api/v7/arbeitsplan-import/route.ts` (v7.3.89 -> v7.3.90-1, JSON-Eingang additiv)
- `src/components/shared/ProjectCreateForm.tsx` (v7.4.2-1 -> v7.4.2-7)

**DB (nur DEV ausgefuehrt, PROD offen):**
- `SQL-MIGRATION-import-projekt-team-v2.sql` (Funktionen v7_import_projekt_team,
  v7_cleanup_projekt; Enum-Cast funding_format)

**Doku:**
- `KONZEPT-PDF-ANTRAGSIMPORT-v1_5.md`
- `PFLICHTENHEFT-v5_17.md`
- `GIT-SICHERUNG-v7_6_0-session66.md` (diese Datei)
