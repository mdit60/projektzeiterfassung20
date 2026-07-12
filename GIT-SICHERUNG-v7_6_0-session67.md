# GIT-SICHERUNG - Session 67

**Datum:** 12. Juli 2026
**SW-Release:** V7.6.0 (PDF-Antragsimport - jetzt in PRODUKTION)
**Pflichtenheft:** v5.17
**Branch:** main = PROD (deployed) / v7-dev
**Deploy-Stand:** **V7.6.0 ist in PROD.** SQL-Migration v2 auf PROD ausgefuehrt, merge
v7-dev -> main, push auf origin + cubintec, Vercel-Deploy auf pze.cubintec-hub.com
verifiziert. PDF-Antragsimport live und getestet.

---

## Zusammenfassung

Session 67 war die **Produktivsetzung** des in Session 66 gebauten Meilensteins plus
Nachpflege (ASCII-Konformitaet) und umfangreiches Housekeeping (Archiv, Anweisungen,
Arbeitsweise). PZE legt jetzt komplette Projekte (Projekt + Mitarbeiter + Team + Arbeitsplan)
vollautomatisch aus dem ZIM-Antrags-PDF an - in PRODUKTION.

---

## Erledigte Punkte

### PROD-Deploy V7.6.0

- **SQL-Migration v2 auf PROD** (cnnuyioklhlrfygwticf) ausgefuehrt: `v7_import_projekt_team`
  und `v7_cleanup_projekt` (create-or-replace, funding_format-Enum-Cast). Erfolgreich
  ("Success. No rows returned"). Lief VOR dem Code-Deploy.
- **Code-Deploy:** merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel-Deploy
  auf pze.cubintec-hub.com verifiziert.
- **Verifikation in PROD:** PDF-Antragsimport ("Projekt neu anlegen aus Antrag") getestet -
  laeuft rund.

### Entscheidung: PDF-Import-Tab in BEIDEN Portalen

- Abweichend von der urspruenglichen Session-66-Vorgabe ("im Firmen-Portal ausblenden bis
  stabil") bleibt der PDF-Antragsimport-Tab bewusst in **Berater- UND Firmen-Portal**
  sichtbar. In PROD verifiziert: Firmen koennen den Import nutzen. Keine Code-Aenderung
  noetig (aktueller Stand von ProjectCreateForm bleibt).

### ASCII-Konformitaet (Nachpflege dreier Seiten)

Drei aktuelle Quelldateien enthielten noch Non-ASCII-Zeichen; chirurgisch bereinigt,
Rendering unveraendert. Konvention: Kommentare -> ae/oe/ue, String-Literale -> \u-Escapes,
JSX-Anzeigetext -> HTML-Entities (&auml;, &uuml;, &ouml;, &ndash;, &mdash;, &middot;).

- `berater-multiprojekt-page` v7.4.8-17 -> **v7.4.8-18** (9 Stellen: Typo-Striche/-Punkte,
  "demnaechst", Tooltip-Gedankenstrich)
- `berater-fzul-page` v7.4.9-2 -> **v7.4.9-3** (8 Stellen: Bundeslaender-Namen, UI-Texte,
  BUNDESLAENDER-Kommentar)
- `mein-status-page` v7.4.4-16 -> **v7.4.4-17** (2 Stellen: Changelog-Kommentare)

Alle drei nach Integration in src/ mit `pnpm dev` geprueft und mit deployed.

### Housekeeping (downloads/ + Arbeitsweise)

- **Direkter downloads-Zugriff:** Claude legt Dateien jetzt direkt in
  `~/Documents/Dev/pze/downloads/` ab und liest von dort die jeweils hoechste Version
  (kein Nachfragen der Versionsnummer mehr). Integration downloads/ -> src/ bleibt beim
  Nutzer (per Terminal); Claude liefert dazu immer die fertige Befehlszeile.
- **Archiv neu strukturiert:** `downloads/archiv/` von 12 halbfertigen Kategorien auf ein
  klares, deterministisches Schema umgestellt: `code/<Basisname>/`, `doku/<Basisname>/`,
  `sql/`, `skripte/`. 567 Altdateien einsortiert, ~40 echte Duplikate entfernt. (Ein
  Zwischenbug - doppelte archiv-Ebene - per Korrektur-Skript behoben.)
- **Projekt-Anweisungen ueberarbeitet:** 9 Abschnitte, u.a. neu: Loeschen/Verschieben
  bleibt ausschliesslich beim Nutzer (Claude liefert nur Plan/Skript), Session-Auftakt-
  Versions-Check, Struktur-Guard in Skripten, praezise ASCII-Regel, "alles nach downloads".

---

## Offen / naechste Schritte

- **Manuals-Nachzug:** PDF-Antragsimport in den Anleitungen ergaenzen (Firma + Berater).
- **Berater-Portal-Anleitung v1.3:** NWM-Tagessperren (A-021) + max-Stunden-Chip.
- **Datenhygiene (aus Session 66):** Loesch-Kaskade fuer verwaiste MA/Zuordnungen pruefen
  (unabhaengig vom Import).
- **Backlog unveraendert:** A-034-Restpunkt (RLS-Angleich DEV/PROD), A-039 (PortalFooter
  ueberall), "Assistenz GL"-Rolle (admin_assistant), Max-foerderbare-Stunden-Chip in
  TimesheetForm.
- **Pflichtenheft:** ggf. v5.18 mit Vermerk "PDF-Import in beiden Portalen freigegeben".

---

## Komponenten / Dateien dieser Session

**Geaendert & deployed (src/):**
- `src/app/v7/berater/multiprojekt/page.tsx` (berater-multiprojekt-page v7.4.8-18)
- `src/app/v7/berater/fzul/page.tsx` (berater-fzul-page v7.4.9-3)
- `src/app/v7/firma/mein-status/page.tsx` (mein-status-page v7.4.4-17)

**DB (PROD ausgefuehrt):**
- `SQL-MIGRATION-import-projekt-team-v2.sql` (v7_import_projekt_team, v7_cleanup_projekt)

**Doku:**
- `GIT-SICHERUNG-v7_6_0-session67.md` (diese Datei)

**Housekeeping-Artefakte (downloads/, nicht Teil von src/):**
- `aufraeumen-archiv-v1.zsh`, `korrektur-archiv-ebene-v1.zsh`, `Aufraeumplan-NEU-DryRun.md`
