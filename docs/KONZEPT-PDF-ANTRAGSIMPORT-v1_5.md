# KONZEPT: PDF-Antragsimport (ZIM-Förderanträge)

**Version:** 1.5
**Stand:** 10.07.2026
**Status:** Architektur abgestimmt, Stufe 1 (Extraktion) validiert, Stufe 2 (Integration) in Vorbereitung
**Betrifft:** Projektanlage im Berater- und Firmen-Portal

---

## 1. Zweck und Zielsetzung

Beim Anlegen eines neuen geförderten Projekts sollen die erforderlichen Projektdaten
**zuverlässig und automatisch aus dem Förderantrag (PDF)** übernommen werden, statt sie
manuell zu erfassen.

Der bisherige Behelf ("Krücke") war: Projekt und Team manuell anlegen, eine personalisierte
Excel-Vorlage befüllen und hochladen, woraus der Arbeitsplan übernommen wurde. Diese Krücke
existiert wegen manueller Übertragung von Arbeitspaketen und Personenmonaten in die
Excel-Vorlage als Fehlerquelle — genau das soll der automatische PDF-Import beseitigen.

**Zielbild:** Ein Firmen-Admin oder Berater lädt den Antrag als PDF hoch; das System extrahiert
Projektdaten, Mitarbeiter und den kompletten Arbeitsplan und übergibt sie über dieselbe
Import-Schnittstelle, die heute schon der Excel-Import nutzt. Danach läuft alles Weitere
(Stundenerfassung, ZA, Abrechnung) unverändert.

---

## 2. Historie: Warum der erste Versuch scheiterte

Ein früherer PDF-Import wurde in `ProjectCreateForm` v7.4.2-1 zurückgestellt. Zwei Ursachen:

1. **XFA-Extraktion bei verschiedenen Formularversionen (Object Streams).** Die Nutzdaten
   eines ZIM-Antrags stehen nicht in der sichtbaren Textebene, sondern als XFA-Formulardaten
   (XML) im AcroForm. Der alte Weg (Python-Parser als Railway-Service, aufgerufen über
   `/api/parse-zim`) scheiterte an PDFs mit Object Streams.
2. **Fehlerhafte Matrix-Rekonstruktion.** Der alte Parser las die AP-/MA-/PM-Tabelle
   *spaltenweise* in flache Listen und legte diese nebeneinander. Bei leeren Zellen verschoben
   sich die Listen gegeneinander — Personenmonate landeten beim falschen AP/Mitarbeiter.
   Ergebnis: "Arbeitspläne nie korrekt".

Beide Ursachen sind in Stufe 1 gelöst (siehe Abschnitt 5 und 6).

---

## 3. Anforderungen

### 3.1 Eingang
- **Primärweg (v1):** Original-PDF mit XFA-Formulardaten — deterministisch und zuverlässig.
- **Fallback (später):** Printversion/Scan über OCR (Document-AI-Dienst), zwingend mit
  Pflicht-Kontrolle. Wegen DSGVO nur EU-Region + AV-Vertrag. Bewusst nachgelagert, weil OCR
  von Tabellen die Zuverlässigkeit gefährdet.

### 3.2 Umfang
- Komplettes Projekt aus dem PDF: **Projektstammdaten + Mitarbeiter + Arbeitsplan**.
- Übergabe über dieselbe Schnittstelle (`ParsedWorkPackage`-Struktur) wie der Excel-Import.

### 3.3 Laufzeitumgebung
- Die Extraktion läuft als **TypeScript-API-Route auf Vercel** (Produktion), nicht mehr als
  lokaler Python-/Railway-Dienst.

### 3.4 Kontrolle / Freigabe (Pflicht)
- Extrahierte Daten werden **vor** dem Schreiben in die DB in einer **Vorschau** angezeigt und
  vom Nutzer bestätigt/korrigiert (Mensch-im-Kreis). Die Vorschau stellt bestehende Werte den
  Import-Werten gegenüber, damit keine manuellen Korrekturen versehentlich überschrieben werden.

---

## 4. Datenquellen im Antrag (XFA)

Die XFA-`datasets` werden als **Baum** geparst (nicht als flache Listen). Relevante Bereiche:

- **Arbeitsplan:** `a6_tabelle/Tabelle1`, wiederholende Zeilen (`Zeile2`). Jede Zeile ist ein
  vollständiger Datensatz. Der AP-Name/Zeitraum steht nur in der Kopfzeile; Folgezeilen mit
  gleicher AP-Nr. tragen weitere Mitarbeiter. **Zeilenweises Lesen** garantiert die korrekte
  Zuordnung.
- **Mitarbeiter (Anlage 6.1/6.2):** `a72_tab` → Tabelle. Liefert je MA: Name + Berufsbezeichnung
  (kombiniertes Feld), Qualifikationsgruppe, `p_kosten` (monatliches Bruttogehalt inkl.
  Zusatzzahlungen — vertraglich bindend, Basis der Fördersummenberechnung), Teilzeitfaktor.
- **Verknüpfung:** In der AP-Tabelle steht `MA_Nr`, in der Personaltabelle dieselbe Nummer als
  `DdsId`/`lfd`. Eindeutiger, deterministischer Join-Schlüssel innerhalb eines Antrags.
- **Kontrollsummen (Anlage 5):** `kontr_ap` (je AP), `kontr_ma` (je MA). Dienen der
  Selbstkontrolle (Abschnitt 6).

### 4.1 Zwei Feldvokabulare, eine Struktur

| Zweck        | v13 "formular" (EP/Koop/DS) | "Antrag_EP" (neuere EP)      |
|--------------|-----------------------------|------------------------------|
| AP-Nr.       | `lfd`                       | `Arbeitspaket_Nr`            |
| AP-Name      | `ap`                        | `Arbeitspaket`               |
| von / bis    | `von` / `bis`               | `RealisierungVON` / `...BIS` |
| MA-Nr.       | `ma_nr`                     | `MA_Nr`                      |
| PM           | `pm` (+ `pm2` bei DS)       | `pm`                         |
| Projekttitel | `cg_VMS_VB_Projekt`         | `thema`                      |
| Laufzeit     | `cg_VMS_HB_A_Beginn/Ende`   | `LaufzeitVON` / `LaufzeitBIS`|

Der Parser bildet beide Vokabulare über eine Synonym-Zuordnung auf dieselbe Spezifikation ab.

### 4.2 Durchführbarkeitsstudie (DS): technisch / nicht-technisch

DS-Anträge trennen technische und nicht-technische Arbeitspakete, die einen unterschiedlichen
Kostenaufschlag haben. Im XFA trägt jede Zeile **entweder** `pm` **oder** `pm2`:

- Wert in `pm`  → technisches AP  → `is_technical = true`
- Wert in `pm2` → nicht-technisches AP → `is_technical = false`

PZE bildet dies bereits vollständig ab: Feld `v7_work_packages.is_technical`; getrennte
Kontrollsummen T/NT; in der ZA getrennte Zuschläge `overheadT` / `overheadNT`. Der Extraktor
setzt lediglich `is_technical` pro AP aus der Spaltenzugehörigkeit.

---

## 5. Die Schnittstellen-Spezifikation (Datenformat-Vereinbarung)

Die Extraktionsroute liefert ein validiertes JSON. Struktur (vereinfacht):

```
projekt:        { titel, antragsteller, laufzeit_von, laufzeit_bis, gesamt_pm }
mitarbeiter[]:  { ma_nr, nachname, vorname, berufsbezeichnung, qualifikation (A/B/C),
                  monatsbrutto, teilzeitfaktor }
arbeitspakete[]:{ ap_code, ap_number, ap_sub_number, ebene, name, start_date, end_date,
                  is_technical (nur DS, sonst null), planned_pm,
                  zuordnungen[]: { ma_nr, planned_pm } }
kontrollsummen_pruefung: { status, je_mitarbeiter[] }
```

**Bewusst nicht gesetzt:**
- `planned_hours` — ergibt sich in PZE aus `planned_pm × hoursPerPM(pm_basis)`; braucht die
  betriebliche WAZ (bWAZ) der Firma, die nicht im Antrag steht.
- `is_technical` außerhalb von DS = null (im Antrag nicht anwendbar).

**Nicht im Antrag enthalten (bleiben leer / manuell):** Förderkennzeichen (FKZ) und bewilligter
Fördersatz — beide existieren erst im Zuwendungsbescheid, nicht im Antrag.

---

## 6. Selbstkontrolle über Kontrollsummen

Der Extraktor summiert die zeilenweise gelesenen PM je Mitarbeiter (bei DS getrennt nach T/NT)
und vergleicht sie mit den im Antrag hinterlegten Kontrollsummen der Anlage 5. Übereinstimmung
= Extraktion nachweislich korrekt; Abweichung = Alarm in der Vorschau.

**Wichtig:** Der Abgleich garantiert Treue **zum Dokument**, nicht dass das PDF die finale
Version ist. Ein hochgeladenes PDF kann älter sein als der in PZE gepflegte Stand; nach dem
Import in PZE vorgenommene Korrekturen stehen nicht im PDF. Deshalb ist der Vorschau-/Freigabe-
schritt Pflicht, und der Upload-Dialog weist darauf hin, den zuletzt eingereichten/korrigierten
Antrag hochzuladen.

**Stufe-1-Ergebnis:** Vier reale Anträge (EP, Koop-Partner, neuere EP, DS) über drei
Formularstrukturen — alle Kontrollsummen "ok", inklusive Teilzeitfaktoren ≠ 1,0 und
AP-Unternummern.

---

## 7. Architektur Stufe 2 (Integration)

### 7.1 Datenfluss
1. Nutzer öffnet "Projekt anlegen", lädt Antrags-PDF hoch.
2. `ProjectCreateForm.handlePdfUpload` → **neue** Route `/api/parse-zim` (TypeScript, Vercel).
3. Route: XFA-Extraktion → Parser (Stufe-1-Logik) → Spezifikations-JSON + Kontrollsummen-Status.
4. UI-Vorschau: Gegenüberstellung "bestehend ↔ Import" + Kontrollsummen-Check; Nutzer bestätigt.
5. Nach Freigabe: Projekt anlegen → MA anlegen/verknüpfen → Arbeitsplan über das bestehende
   `arbeitsplan-import`-Backend schreiben.

### 7.2 Betroffene Dateien

| Datei                       | Basis-Version | Änderung |
|-----------------------------|---------------|----------|
| `/api/parse-zim` route       | NEU           | Eigener TS-Extraktor (zlib+crypto, ohne Fremd-Lib) + Parser + Selbstcheck (ersetzt Railway/Python) |
| `ProjectCreateForm.tsx`      | v7.4.2-1      | Zurückgestellten PDF-Block reaktivieren, an neue Route + Vorschau binden |
| `arbeitsplan-import` route   | v7.3.89       | Vergleich um MA-Zuordnung (Zellenebene) und ggf. MA-Stammdaten erweitern |
| `v7-types.ts`                | v7.4.9-2      | Spezifikations-Interfaces (MA mit Monatsbrutto/TZF/Qualifikation, Kontrollsummen-Status) |

**Engine-Entscheidung (Meilenstein 1):** Der Extraktor ist reines TypeScript/Node auf Basis der
Bordmittel `zlib` und `crypto` -- ohne externe PDF-Bibliothek. Er loest Cross-Reference- und
Object-Streams selbst auf und implementiert den PDF-Standard-Sicherheitshandler fuer AES-128
(V4/R4) und AES-256 (V5/R6). Bewusst verworfen: pdf-lib (scheitert an Verschluesselung/Object
Streams), MuPDF (AGPL/kommerziell -> Lizenzkosten), pdf.js (liefert nur geparste, nicht rohe XFA).
Kein Lizenzkosten, keine Fremdabhaengigkeit, ein einziger Node-Stack, byte-genauer Goldstandard
bleibt erhalten.

### 7.3 Vergleichsumfang der Import-Route
- **Heute abgedeckt (v7.3.89), je AP:** Name, Start, Ende, Gesamt-PM, `is_technical`.
- **Zu ergänzen:** Vergleich auf **MA-Zellenebene** (heute nur AP-Gesamt-PM; eine Umverteilung
  zwischen MA bei gleicher Summe würde nicht auffallen) und die Mitarbeiter-Ebene (Abschnitt 8).

---

## 8. Mitarbeiter-Ebene (neu gegenüber Excel-Import)

Der Excel-Import setzt das Team als vorhanden voraus und warnt nur bei fehlender MA-Nr.; er legt
keine Mitarbeiter an. Der PDF-Import bringt Mitarbeiter mit und braucht daher:

- **Dublettencheck** gegen den firmenweiten Mitarbeiterstamm. Match über **Nachname/Vorname** —
  die Personalnummer aus dem Antrag ist projektspezifisch und **kein** firmenweiter Schlüssel.
- Pro MA in der Vorschau die Entscheidung **"verknüpfen oder neu anlegen?"**.
- Beim Verknüpfen: **bestehende Kostendaten nie überschreiben** — es kommt nur die Projekt-/AP-
  Zuordnung dazu. Neu angelegte MA erhalten Monatsbrutto/TZF/Qualifikation aus dem Antrag.
- **Überschneidungs-/Auslastungscheck** über zeitlich überlappende Projekte (Doppelplanung /
  WAZ-Kapazität) dockt an die bestehende Kapazitätsplanung an.

**Feldabbildung Antrag → PZE:**
- `p_kosten` (monatlich) → **Monatsbrutto** (Gesamtbetrag; kein Split in "sonstige").
- Teilzeitfaktor → **Teilzeitfaktor**; pWAZ = Teilzeitfaktor × bWAZ (bWAZ aus Firmendaten, keine
  festen 40 h/Woche).
- Qualifikationsgruppe (1/2/3) → **A/B/C**.

---

## 9. Kooperationsprojekte

Jeder Kooperationspartner stellt seinen **eigenen** Antrag. Eine PDF-Datei enthält damit die
Daten **eines** Partners (ein Antragsteller, dessen MA, dessen AP-Anteil). Eine Kooperation ist
die logische Klammer über mehrere separat hochgeladene Anträge — der Extraktor muss nie mehrere
Partner aus einer Datei trennen.

---

## 9a. Zwei Einstiegspunkte: Neu anlegen vs. Aktualisieren

Der PDF-Import wird bewusst an zwei getrennten Stellen angeboten:

1. **Projekt neu anlegen aus Antrag** (ProjectCreateForm, PDF-Tab) -- nur fuer NEUE Projekte.
   Existiert bereits ein gleichnamiges Projekt der Firma, erfolgt eine Rueckfrage:
   "Neues Projekt mit gleichem Namen (Name anpassen)" oder "Dasselbe Projekt -> bitte ueber
   'Daten aktualisieren' am bestehenden Projekt".
2. **Daten aktualisieren am bestehenden Projekt** -- eine Aktion direkt beim Projekt
   ("Antrag neu hochladen / Daten aktualisieren"). Nutzt dieselbe Extraktion, fuehrt aber den
   Vergleich "bestehend <-> Import" (geaenderte/neue Arbeitspakete, geaenderte MA-Werte) und
   uebernimmt nur nach Bestaetigung.

## 9b. Mitarbeiter-Daten: projektbezogen (fix pro Projekt)

WICHTIG (verifiziert im Code): Gehalt, Arbeitszeit und Stundensatz sind **projektbezogen** und
liegen auf `v7_project_assignments` -- NICHT geteilt auf `v7_employees`. Pro Projekt-Zuordnung:
`employee_number`, `personal_weekly_hours` (pWAZ), `company_weekly_hours` (bWAZ), `hourly_rate`
(Stundensatz), `hourly_rate_approved` (bewilligt lt. Bescheid), `role_in_project`; der
Teilzeitfaktor wird daraus berechnet. Die Abrechnung (ZAPanel, Berichte, Cockpit) liest den
Stundensatz von der Zuordnung. `v7_employees` haelt nur Identitaet (Name, Qualifikation) und
Vorgabewerte.

Foerderrechtliche Regeln (durch dieses Modell bereits erfuellt):
- **Fix pro Projekt:** Die Werte werden beim Team-Aufbau auf der Zuordnung eingefroren und
  aendern sich waehrend der Projektlaufzeit nicht -- auch nicht bei einer Gehaltserhoehung.
- **Neues Projekt, neue Werte:** Derselbe MA bekommt in einem spaeteren Projekt eine neue
  Zuordnung mit den Werten aus dem neuen Antrag. Altprojekt und dessen Zuordnung bleiben unberuehrt.
- **"Verknuepfen" teilt nur die Identitaet** (`v7_employees`-Datensatz Name/Qualifikation), nie das
  Gehalt. Die Antragswerte dieses Projekts kommen immer auf eine neue `v7_project_assignments`-Zeile.
  Keine geteilte Aktualisierung, keine separate Gehalts-Historie noetig.

Berechnungsmodell (im Code verifiziert gegen PZE Prod):
- `p_kosten` (Anlage 6.1) ist das **Vollzeit-aequivalente** Monatsbrutto, NICHT das tatsaechliche.
- **bWAZ** ist global pro Antrag: aus dem Feld `<bWAZ>` (z.B. WISE = 38), sonst zurueckgerechnet
  aus `std_satz`/`p_kosten` (EP_Heats/DS = 40). bWAZ = (p_kosten * 12) / (std_satz * 52).
- Tatsaechliches **Monatsbrutto** = round2(p_kosten * TZF).
- **pWAZ** = TZF * bWAZ.  **Stundensatz** = (p_kosten * 12) / (bWAZ * 52) = Antragswert `std_satz`.
- Am Projekt: **`pm_basis_weekly_hours` = bWAZ** (fuer die PM<->Stunden-Umrechnung).
- Geschrieben wird pro MA auf `v7_project_assignments`: `monthly_gross_salary`,
  `additional_salary_components` (0), `personal_weekly_hours` (pWAZ), `company_weekly_hours` (bWAZ),
  `hourly_rate` (= std_satz), `hourly_rate_approved` (null, kommt aus Bescheid), `employee_number`.
- Verifikation: Herrler 28,85 EUR/h, Doan 21,63 EUR/h (Prod-Screenshots), sowie alle `std_satz`
  aller vier Antraege exakt reproduziert.

Konsequenz fuer die beiden Einstiegspunkte:
- **Neu anlegen (Einstiegspunkt 1):** immer die Antragswerte des neuen Projekts verwenden; keine
  "uebernehmen vs. behalten"-Frage.
- **Aktualisieren (Einstiegspunkt 2):** hier ist die Gegenueberstellung "bereits eingefrorener
  Projektwert <-> neuer Antragswert" mit bewusster Uebernahme-Entscheidung relevant.
- Bei mehreren gleichnamigen Bestands-MA muss die Vorschau die konkreten Identitaets-Treffer zur
  eindeutigen Auswahl anbieten (Nachname allein reicht nicht).

## 10. Bekannte Grenzen und Prozesshinweise

- **Antrag ≠ Bescheid:** FKZ und bewilligter Fördersatz fehlen im Antrag (manuell nachtragen).
- **Antrag ≠ Prod-Stand:** Ein PDF kann älter sein als der gepflegte PZE-Stand; manuelle
  Korrekturen in PZE stehen nicht im PDF. Vorschau + "bestehend ↔ Import"-Diff sind der Schutz.
- **OCR-Fallback** ist bewusst nachgelagert (Zuverlässigkeit + DSGVO).
- **Namen-Split** (Nachname/Vorname aus kombiniertem Feld) ist heuristisch und im Freigabeschritt
  korrigierbar.

---

## 11. Umsetzungsschritte (Roadmap)

1. **Stufe 1 — Extraktions-Nachweis (abgeschlossen).** Parser + Kontrollsummen-Selbstcheck über
   vier reale Anträge; Spezifikations-JSON festgezurrt.
2. **Meilenstein 1 — Node-XFA-Extraktion (ABGESCHLOSSEN).** Eigener TS/Node-Extraktor
   (zlib+crypto, keine Fremd-Lib) liefert alle vier `datasets` byte-identisch zu pypdf --
   inklusive der AES-256/R6-verschluesselten Datei. Extraktionsrisiko ausgeraeumt.
3. **Stufe 2 — Integration.** Neue Route, `ProjectCreateForm` reaktivieren, Vorschau mit
   MA-Dublettencheck, Import-Route erweitern, Spezifikations-Typen ergänzen.
4. **Später.** OCR-Fallback; Vergleich auf MA-Zellenebene als Standard.

---

## 12. Versionshistorie

| Version | Stand      | Änderung |
|---------|------------|----------|
| 1.0     | 10.07.2026 | Erstfassung nach Abschluss Stufe 1 (Extraktion validiert) |
| 1.1     | 10.07.2026 | Begriff "Daten-Vertrag" durchgaengig ersetzt durch "Schnittstellen-Spezifikation" / "Datenformat-Vereinbarung" |
| 1.2     | 10.07.2026 | Meilenstein 1 abgeschlossen (eigener TS-Extraktor, AES-128/256, byte-identisch); Engine-Entscheidung dokumentiert |
| 1.3     | 10.07.2026 | Zwei Einstiegspunkte (neu/aktualisieren), MA-Bestandsdaten-Regeln, Projekt-Duplikatspruefung, Schema-Befund Gehalt/Stunden |
| 1.4     | 10.07.2026 | KORREKTUR: Gehalt/WAZ/Stundensatz sind projektbezogen (v7_project_assignments), fix pro Projekt; frueheres "geteilter Datensatz" verworfen |
| 1.5     | 11.07.2026 | Salaer-Modell praezisiert: p_kosten=Vollzeit-Basis, tatsaechliches Monatsbrutto=p_kosten*TZF, bWAZ aus Antrag, pm_basis_weekly_hours=bWAZ; gegen Prod verifiziert |
