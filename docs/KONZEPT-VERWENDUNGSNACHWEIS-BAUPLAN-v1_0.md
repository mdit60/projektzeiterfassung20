# BAUPLAN - VN-Modul (MVP DS De-minimis)

**Version:** 1.0
**Datum:** 29.07.2026
**Bezug:** KONZEPT-VERWENDUNGSNACHWEIS-v1_0.md, SQL-MIGRATION-verwendungsnachweis-v1.sql
**Grundlage Code:** ZAPanel-v7_4_4-61.tsx (DS-Kostenrechnung), FirmaCockpit (Kachel)

---

## 1. Leitidee

Der VN erfindet keine Rechnung. Er **summiert die exakt gleiche DS-Kostenrechnung,
die die ZA je Abrechnungszeitraum bereits macht**, ueber alle ZAs des Projekts im
Berichtszeitraum und sortiert die Zeilen in die Formular-Reihenfolge um. Neu
gespeichert werden nur die Sachbericht-Texte (Tabelle v7_verwendungsnachweise).

---

## 2. Die wiederverwendete ZA-Formel (aus ZAPanel, isDS-Zweig)

Je ZA (Zeitraum von..bis), Quelle ZAPanel Z. 943-964:

```
pkT   = Summe ueber MA:  totalT(MA)  * getHourlyRate(MA)     // Personal technisch
pkNT  = Summe ueber MA:  totalNT(MA) * getHourlyRate(MA)     // Personal nichttechnisch
gkT   = pkT  * overhead_t  / 100                             // Zuschlag technisch (30%)
gkNT  = pkNT * (overhead_nt || overhead_t) / 100             // Zuschlag nichttechnisch
auftraegeT  = za.auftraege_dritte_t                          // Auftraege Dritte technisch
auftraegeNT = za.auftraege_dritte_nt                         // Auftraege Dritte nichttechnisch
summeGesamt = pkT+gkT+auftraegeT + pkNT+gkNT+auftraegeNT (+ fueUA + zeitwPA)
antZuwendung = round(summeGesamt * foerdersatz / 100)        // = foerderbetrag_gesamt
```

- **T/NT-Trennung:** ueber Arbeitspaket-Flag `work_package.is_technical`
  (getZAPersonenstunden, Z. 634). Stunden nur is_active + is_billable.
- **Stundensatz:** getHourlyRate = hourly_rate_approved ?? (hourly_rate skaliert mit
  pm_basis/realWAZ). 1:1 uebernehmen, damit Betraege centgenau der ZA entsprechen.
- **foerdersatz** (DS = 70), **overhead_t/overhead_nt** (Zuschlag = 30) liegen am Projekt.
- **fueUA (fue_unterauftrag), zeitwPA (zeitw_personalaufnahme):** bei DS i.d.R. 0
  (WerftScan: 0). Falls je > 0, brauchen sie im VN-Formular einen Platz -> dann
  melden (Formular DS-oAGVO Tabelle6 hat nur 6 Zeilen; Sonderfall pruefen).

---

## 3. Aggregations-Helfer (neue lib)

**Datei:** `src/lib/verwendungsnachweis-utils.ts` (analog projektfortschritt-utils).

**Funktion:** `computeVNSchluss(projectId, von, bis, {projects, projectAssignments, workPackages, employees, timesheets, zahlungsanforderungen})`

Ablauf:
1. ZAs des Projekts filtern, deren Zeitraum in [von, bis] faellt.
2. Je ZA die 6 Positionen exakt nach der Formel aus Paragraph 2 berechnen
   (dieselbe Kernrechnung wie ZAPanel; **Empfehlung:** die reine Rechenkern-Funktion
   aus ZAPanel in diese lib auslagern und ZAPanel sie importieren lassen -> DRY, eine
   Quelle der Wahrheit; falls das ZAPanel-Risiko vermieden werden soll, im MVP die
   Formel duplizieren und mit Testfall WerftScan gegen die ZA-Anzeige absichern).
3. Positionen ueber alle ZAs aufsummieren.
4. **Kostenzeilen in Formular-Reihenfolge** ausgeben (siehe Paragraph 4).
5. **Finanzierung** (Tabelle 8) rechnen:
   - bisherErhalten = Summe(za.zahlungseingang_betrag)
   - gesamtZuwendung = Summe(za.foerderbetrag_gesamt)   (bzw. round(summeGesamt*fs/100))
   - schlusszahlung = gesamtZuwendung - bisherErhalten
6. Kopfdaten + Rueckgabeobjekt (siehe Paragraph 5).

Rueckgabe ist reine Anzeige-/Aggregatstruktur; kein Schreiben.

---

## 4. Zeilen-Reihenfolge (ZA -> VN)

| VN-Zeile (Formular DS-oAGVO) | Wert |
|---|---|
| 1 Personal technisch | Summe pkT |
| 2 Zuschlag uebrige Kosten technisch (30 %) | Summe gkT |
| 3 Kosten der Auftraege Dritte technisch | Summe auftraegeT |
| 4 Personal nichttechnisch | Summe pkNT |
| 5 Zuschlag uebrige Kosten nichttechnisch (30 %) | Summe gkNT |
| 6 Kosten der Auftraege Dritte nichttechnisch | Summe auftraegeNT |
| Summe | Summe aller sechs |

Die ZA listet in anderer Reihenfolge (1 pkT, 2 gkT, 3 pkNT, 4 gkNT, 5 auftrT,
6 auftrNT) - die ZA bleibt unveraendert, nur der VN ordnet zur Ausgabe um.

---

## 5. VN-Seite (Komponente)

**Datei:** `src/components/shared/VerwendungsnachweisPanel.tsx` (Muster: ZAPanel/Stundennachweis).
**Props:** projectId (+ portalabhaengige Farb-/Routing-Props wie bei ZAPanel).

Bloecke:
1. **Kopf:** FKZ, Kurzbezeichnung, Bescheiddatum, Vertretungsberechtigter, Variante
   (fix "DS De-minimis"), Modus (fix "Schlussnachweis"), Berichtszeitraum
   (Default Projektlaufzeit, editierbar).
2. **Kostenzusammenstellung** (6 Zeilen aus Paragraph 4 + Summe), read-only.
3. **Finanzierung** (bisher erhalten / Schlusszahlung / Summe), read-only.
4. **Sachbericht** (Eingabefelder -> v7_verwendungsnachweise): sachbericht_ergebnis,
   sachbericht_arbeitspakete, sachbericht_auftraege, sachbericht_kooperation,
   sachbericht_weiteres. Speichern/Status wie im ZA-Archiv-Tab.
5. **Druckbeleg:** Browser-Print (translate="no"/notranslate wie Stundennachweis),
   Dateiname z.B. "VN <FKZ> <Kurzbezeichnung>".

Ausgabe-Philosophie: feldgenaue Aufbereitung zum manuellen Uebertragen ins offizielle
VDI/VDE-Formular (kein Auto-Upload), plus Druckbeleg (PH Paragraph 6.1).

---

## 6. Einstiege

1. **Kachel "Verwendungsnachweis"** im Cockpit (FirmaCockpit / App-Cockpit), neben
   Cockpit | Fortschritt | Stundennachweis. Nur bei funding_format ZIM_DS sichtbar
   (MVP); Route auf die VN-Wrapper-Seite mit projectId + returnUrl (Muster
   cockpit-stundennachweis-page).
2. **Deeplink-Knopf** im Kopf der ZA-Liste ("Verwendungsnachweis") auf dieselbe Seite.

Wrapper-Seiten analog Stundennachweis:
Berater `/v7/berater/foerderung/firma/[id]/verwendungsnachweis`,
Firma `/v7/firma/verwendungsnachweis`.

---

## 7. Verifikation (Definition of Done)

- **WerftScan (FKZ 16KN124595):** die 6 Zeilen ergeben 52.786,28 / 15.835,88 / 0,00 /
  14.168,63 / 4.250,59 / (0) mit Summe 87.041,38; Finanzierung 20.267 + 40.662 =
  60.929,00 (bei entsprechenden ZAs). Muss centgenau zur Summe der Einzel-ZAs passen.
- Zuschlagszeilen = exakt 30 % der jeweiligen Personalzeile.
- Sachbericht speichern/laden ueber Sessions (v7_verwendungsnachweise).
- ASCII-Konformitaet der .ts/.tsx-Quellen; Deploy-/Marker-Check wie ueblich.

---

## 8. Reihenfolge der Umsetzung

1. SQL-Migration DEV (Tabelle + Spalte + RLS), Verifikation Schritt 4.
2. lib verwendungsnachweis-utils.ts + Unit-Abgleich gegen WerftScan-ZAs.
3. VerwendungsnachweisPanel + Wrapper-Seiten.
4. Kachel + ZA-Deeplink.
5. DEV-Test, dann PROD-Migration + Deploy (beide Remotes), Verifikation.
