# GIT-SICHERUNG - Session 75 (V7.9.2)

**Datum:** 7. August 2026
**SW-Release:** V7.9.2 (AP-Status Drucken/PDF - in PRODUKTION)
**Pflichtenheft:** v5.35
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_1-session75.md (AP-Status Shared-Refactor).

**Deploy-Stand:** In PROD zusaetzlich zu V7.9.1: die Drucken/PDF-Funktion im AP-Status
(ApStatusModal v1.0-7). Merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel-Prod
(Commit 9ea9b28 = "Merge v7-dev: AP-Status Drucken/PDF (ApStatusModal v1.0-7)"). Kein SQL,
reine Frontend-Aenderung an EINER Datei.

---

## Ziel dieser Etappe

Der AP-Status soll ausgedruckt oder als PDF gesichert werden koennen, um damit die
Stundenerfassung zu optimieren. Umgesetzt zentral in ApStatusModal, daher aus beiden
Zugaengen (Timesheet und Stundenmatrix) verfuegbar.

---

## ApStatusModal v1.0-4 .. v1.0-7 (nur v1.0-7 ist deployt)

Iterativ entwickelt; deployt ist der Endstand v1.0-7. Die Zwischenstaende dokumentieren den
Weg (im Header der Datei vollstaendig gefuehrt):

- **v1.0-4:** "Drucken"-Knopf im Dialogkopf -> window.print() (Browser-Druckdialog: drucken
  ODER "Als PDF sichern"). Druck-CSS (@media print): nur die AP-Status-Tabelle drucken
  (Backdrop/Buttons via ap-print-hide aus), Overlay-print:hidden entfaellt, gezielte
  Steuerung ueber die Tabelle (#ap-status-print-area). A4 quer.
- **v1.0-5:** Fuer den Druck werden ALLE mehrmonatigen APs automatisch aufgeklappt
  (printExpandAll; Reset ueber afterprint, Bildschirm-Auswahl bleibt). Kopfzeile je Seite
  (thead table-header-group), Zeilen nicht mittig getrennt (page-break-inside: avoid).
- **v1.0-6:** Korrektur - v1.0-5 hatte die Tabelle rechts abgeschnitten (width:100% + auto-
  Layout kann nicht unter die Inhaltsbreite schrumpfen). Jetzt natuerliche Tabellenbreite,
  damit vollstaendig (alle Spalten).
- **v1.0-7:** Seitenbreite wird AUTOMATISCH gefuellt. Beim Drucken wird die tatsaechliche
  Tabellenbreite gemessen (scrollWidth) und ein Zoom-Faktor berechnet, der sie auf die
  nutzbare Querformat-Breite (~1040px bei 8mm Rand) bringt: wenige MA groesser, viele MA
  kleiner. Umsetzung ueber CSS "zoom" (nur im Druck, via CSS-Variable --ap-print-zoom),
  weil zoom - anders als transform:scale - den Seitenumbruch korrekt mitzieht. Grenzen
  0.4..3. Feste Druckschrift entfaellt (gemessen und gedruckt mit gleicher Schrift).

Empfehlung im Druckdialog: Skalierung auf "Standard/100%" (die Anpassung macht die Komponente
selbst).

---

## Code-Integration (Status) - V7.9.2

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| ApStatusModal-v1_0-7.tsx | src/components/shared/ApStatusModal.tsx | DEPLOYED (Drucken/PDF) |

Zwischenstaende v1.0-4/-5/-6 sind im Endstand v1.0-7 aufgegangen. Kein SQL. Deploy: Merge
v7-dev -> main (--no-ff), push origin + cubintec, Vercel.

---

## Verifikation (durch Martin bestaetigt)

- Dev-Sichttest: Drucken aus AP-Status oeffnet den Druckdialog; nur die Tabelle, quer,
  vollstaendig; mehrmonatige APs aufgeklappt.
- v1.0-6 behob das rechtsseitige Abschneiden; v1.0-7 fuellt die Seitenbreite automatisch
  (mehr MA -> groessere Breite -> passende Skalierung). Vorschau als "gut" bestaetigt.
- In PROD deployed (Vercel Ready, Commit 9ea9b28) und bestaetigt.

---

## Offen / naechste Schritte

- **Idee in Diskussion (noch nicht beauftragt): automatisierte Stundenvorschlaege.** PZE
  erzeugt je MA einen Vorschlag zur Stundenerfassung, streng an den geplanten AP-Stunden pro
  MA/Monat, in AP-Reihenfolge, unter Beachtung von WAZ, Fehlzeiten/Feiertagen und den
  bestehenden Regeln (Wochendeckel, GF-50%, "sonstige"); bei Ausfall/Unterdeckung Umverteilung
  offener Stunden auf Kollegen zeitnah zum geplanten AP. WICHTIG (foerderrechtlich): nur ein
  VORSCHLAG mit menschlicher Bestaetigung, mit realistischer Streuung - kein Auto-Nachweis.
  Vorgeschlagene Phasen: (1) Einzel-MA-Monatsvorschlag; (2) Cross-MA-Umverteilung. Vor Bau:
  KONZEPT-STUNDENVORSCHLAG anlegen. Offene Frage: Vorschlag je Monat oder fuer den ganzen
  Restzeitraum.
- Uebernommen aus frueheren Sessions: KMU-innovativ PDF-Import; PH §4 Versions-Nachzug;
  Enum-Vereinheitlichung v7_funding_format DEV/PROD; Manuals-Nachzug; Datenhygiene
  Loesch-Kaskade; 'Assistenz GL'-Rolle; Max-foerderbare-Stunden-Chip.

---

## Komponenten / Dateien dieser Etappe (deployed src/)

- src/components/shared/ApStatusModal.tsx (v1.0-7)

**DB:** keine Aenderung.

**Doku:** PFLICHTENHEFT-v5_35.md; GIT-SICHERUNG-v7_9_2-session75.md (diese Datei);
DEPLOY-PROZESS-PZE.md (unveraendert gueltig: main auf origin + cubintec).
