# GIT-SICHERUNG - Session 80 (V7.9.6)

**Datum:** 27. August 2026
**SW-Release:** V7.9.6 (NWM-Jahresselektor Fortschritt/Prognose, FZ-basierte Foerderquote
ZAPanel + NWMEigenanteilPanel mit Grenzueberschreitungs-Validierung - in PRODUKTION)
**Pflichtenheft:** v5.39
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_5-session77.md (Timesheet-AP-Angebot, AP-Status-Rundung,
Prognose auf Planerfuellung).

**Deploy-Stand:** In PROD deployt (durch Martin bestaetigt). KEIN SQL - reine Frontend-
Aenderungen. Zwei fachliche Themenbloecke, fuenf Datei-Builds. Deploy per Merge
v7-dev -> main (--no-ff), push origin + cubintec, Vercel.

---

## Ziel dieser Etappe

Zwei Themenbloecke fuer NWM-Projekte (ZIM_NETZWERK):

1. **NWM-Jahresselektor fuer Projektfortschritt + Prognose.** Die Fortschrittsanzeige
   (Berater-Cockpit) und die Analyse (Firma-Cockpit) konnten bisher nur den
   Gesamtverlauf des Projekts darstellen. NWM-Projekte haben aber mehrere
   Netzwerkjahre (Foerderzeitraeume) mit eigenen Budgets und Foerderquoten. Neu:
   Dropdown-Selektor "Netzwerkjahr" mit allen FZ aus v7_nwm_foerderzeitraeume +
   Option "Gesamtverlauf". Fortschritt und Prognose werden auf den gewaehlten
   Zeitraum eingeschraenkt. Firma-Cockpit erkennt NWM automatisch und setzt das
   aktuelle Netzwerkjahr als Vorauswahl.

2. **FZ-basierte Foerderquote in ZAPanel und NWMEigenanteilPanel.** Bisher wurde die
   Foerderquote per Datumsarithmetik ermittelt (calcLaufzeitjahr + getFoerdersatzNWM/
   getFoerdersatz ueber foerdersatz_stufen-JSONB). Neu: direkter Abgleich von
   zeitraum_bis gegen die v7_nwm_foerderzeitraeume-Datensaetze - die dort hinterlegte
   foerderquote wird 1:1 uebernommen. Zusaetzlich: **FZ-Grenzueberschreitungs-
   Validierung** - wenn zeitraum_von und zeitraum_bis in unterschiedliche
   Foerderzeitraeume fallen (mit verschiedenen Foerderquoten), wird eine Speichersperre
   ausgeloest mit roter Fehlermeldung, da eine Aufteilung in zwei ZAs/EAs erforderlich
   ist. Alte Datumsarithmetik bleibt als Fallback fuer Projekte ohne FZ-Daten erhalten.

---

## Weg zur Loesung

### Thema 1 - NWM-Jahresselektor (ProjektFortschrittPanel v7.4.5-33; cockpit-fortschritt-page v7.4.9-9; FirmaCockpit v7.4.9-36-14)

- **ProjektFortschrittPanel v7.4.5-33:** Neues Dropdown "Netzwerkjahr" oberhalb der
  Fortschritts-/Prognose-Anzeige fuer NWM-Projekte. Laedt Foerderzeitraeume aus
  v7_nwm_foerderzeitraeume (netzwerkjahr, start_datum, ende_datum, foerderquote).
  Optionen: je Netzwerkjahr "NWJ X (DD.MM.YYYY - DD.MM.YYYY, FQ XX%)" + "Gesamtverlauf".
  Bei Auswahl eines NWJ werden Start-/Enddatum als Filter an die Fortschritts- und
  Prognose-Berechnung weitergegeben. Gesamtverlauf = bisheriges Verhalten ohne Filter.

- **cockpit-fortschritt-page v7.4.9-9:** Berater-Cockpit-Fortschrittsseite. Laedt
  NWM-spezifische Daten (Foerderzeitraeume, AP-Planung) und reicht sie an
  ProjektFortschrittPanel durch. Einbindung unter
  src/app/v7/berater/foerderung/firma/[id]/cockpit/fortschritt/page.tsx.

- **FirmaCockpit v7.4.9-36-14:** NWM-Erkennung (funding_format === 'ZIM_NETZWERK').
  Automatische Vorauswahl des aktuellen Netzwerkjahrs (heutiges Datum innerhalb der
  FZ-Bereiche). Analyse-Abschnitt beruecksichtigt den gewaehlten Zeitraum.

### Thema 2a - FZ-basierte Foerderquote im ZAPanel (ZAPanel v7.4.4-68, -69; deployt: -69)

- **ZAPanel v7.4.4-68:** Beim Oeffnen des Panels werden die Foerderzeitraeume aus
  v7_nwm_foerderzeitraeume geladen (State nwmFoerderzeitraeumeZA). Neue Funktion
  `getFoerderquoteFromFZ(bisStr)`: matcht zeitraum_bis gegen die FZ-Bereiche, liefert
  {netzwerkjahr, foerderquote} oder null. Anzeige als Badge "(aus FZ-Tabelle)" bzw.
  "(Fallback)".

- **ZAPanel v7.4.4-69 (Korrektur + Grenzvalidierung, deployt):** Neue Funktion
  `checkFZGrenzueberschreitung(vonStr, bisStr)`: prueft ob zeitraum_von und zeitraum_bis
  in verschiedene FZ mit unterschiedlichen Foerderquoten fallen. Falls ja: rote
  Fehlermeldung und deaktivierter Speichern-Button. Verhindert eine ZA mit zwei
  verschiedenen Foerderquoten.

### Thema 2b - FZ-basierte Foerderquote im NWMEigenanteilPanel (v7.4.5-13; deployt)

Identische FZ-Logik wie ZAPanel: State nwmFoerderzeitraeume, FZ-Laden in loadDaten,
fzMatchEA, fzGrenzfehlerEA. laufzeitjahr und foerdersatz FZ-basiert mit Fallback auf
calcLaufzeitjahr/getFoerdersatz. handleBerechnen blockiert bei fzGrenzfehlerEA.
UI: Badges mit Quelleninfo, rote Warnung, deaktivierter Berechnen-Button.

---

## DB-Aenderung

**Keine.** Alle Aenderungen sind reine Frontend-Logik. Die
v7_nwm_foerderzeitraeume-Tabelle wird nur gelesen.

---

## Code-Integration (Status) - V7.9.6

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| ProjektFortschrittPanel-v7_4_5-33.tsx | src/components/shared/ProjektFortschrittPanel.tsx | DEPLOYED |
| cockpit-fortschritt-page-v7_4_9-9.tsx | src/app/v7/berater/foerderung/firma/[id]/cockpit/fortschritt/page.tsx | DEPLOYED |
| FirmaCockpit-v7_4_9-36-14.tsx | src/components/shared/FirmaCockpit.tsx | DEPLOYED |
| ZAPanel-v7_4_4-69.tsx | src/components/shared/ZAPanel.tsx | DEPLOYED |
| NWMEigenanteilPanel-v7_4_5-13.tsx | src/components/shared/NWMEigenanteilPanel.tsx | DEPLOYED |

ZAPanel-Zwischenstand -68 ist im Endstand -69 aufgegangen. ASCII-Check (0 Nicht-ASCII)
je Datei erfolgt.

---

## Verifikation (durch Martin bestaetigt)

- Thema 1: NWM-Jahresselektor zeigt alle Netzwerkjahre + Gesamtverlauf; Fortschritt und
  Prognose reagieren korrekt auf die Auswahl; FirmaCockpit erkennt NWM und waehlt das
  aktuelle Jahr vor.
- Thema 2a: ZAPanel zeigt die FZ-basierte Foerderquote korrekt an; Grenzueberschreitung
  wird erkannt, Speichern blockiert, rote Meldung angezeigt.
- Thema 2b: NWMEigenanteilPanel identisches Verhalten; Berechnung bei
  Grenzueberschreitung blockiert.
- Alle in PROD deployt.

---

## Offen / naechste Schritte

- Uebernommen aus frueheren Sessions: optional im Restanzeige-Modus "monatsende" die
  projektweite "gesamt"-Zahl in den Zell-Tooltip legen; automatisierte
  Stundenvorschlaege (Konzept vor Bau); KMU-innovativ PDF-Import; Enum-Vereinheitlichung
  v7_funding_format DEV/PROD; Manuals-Nachzug; Datenhygiene Loesch-Kaskade;
  'Assistenz GL'-Rolle; A-013 Legacy-Cluster.

---

## Komponenten / Dateien dieser Etappe (deployed src/)

- src/components/shared/ProjektFortschrittPanel.tsx (v7.4.5-33)
- src/app/v7/berater/foerderung/firma/[id]/cockpit/fortschritt/page.tsx (v7.4.9-9)
- src/components/shared/FirmaCockpit.tsx (v7.4.9-36-14)
- src/components/shared/ZAPanel.tsx (v7.4.4-69)
- src/components/shared/NWMEigenanteilPanel.tsx (v7.4.5-13)

**DB:** keine Aenderung.

**Doku:** PFLICHTENHEFT-v5_39-AENDERUNGSBLOCK.md; GIT-SICHERUNG-v7_9_6-session80.md
(diese Datei); DEPLOY-PROZESS-PZE.md (unveraendert gueltig: main auf origin + cubintec).
