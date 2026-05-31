# GIT-SICHERUNG Session 48

**Datum:** 31. Mai 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v4.97
**PROD-Stand:** GEAENDERT (drei Deploys, siehe unten). Alle ueber v7-dev -> main.

---

## Zusammenfassung

Session 48 hatte zwei Teile:

1. **A-011 erledigt** (geplanter Punkt): ProjektFortschrittPanel rechnet jetzt ueber die
   gemeinsame Datei `projektfortschritt-utils.ts` (calculateProjectAnalysis) statt eigener
   Inline-useMemo-Logik. Damit gibt es nur noch EINE Rechenquelle fuer den Projektfortschritt,
   die auch das FirmaCockpit nutzt. Diskrepanz zwischen den beiden Ansichten ist damit
   technisch ausgeschlossen.

2. **Drei Werkbank-Funde ausgeliefert** (ungeplant): Beim Pruefen, warum der
   "Neues Unternehmen anlegen"-Button auf localhost erscheint, aber nicht auf Preview/PROD,
   stellte sich heraus: Die lokale Arbeitskopie war seit Session 44 von dem abgedriftet,
   was deployt ist. Mehrere fertige, lokal getestete Aenderungen lagen uncommittet in `src/`.
   Drei davon wurden geprueft und sauber ausgeliefert.

---

## Was wurde ausgeliefert (Commits auf v7-dev, gemerged nach main)

| Commit | Inhalt | Dateien/Versionen |
|--------|--------|-------------------|
| 97bc3bd | A-011: ProjektFortschrittPanel auf gemeinsame Rechenquelle | ProjektFortschrittPanel v7.4.5-23 (Inline-useMemo -> calculateProjectAnalysis aus projektfortschritt-utils) |
| bd21e9d | A-014: "Neues Unternehmen anlegen" | cockpit/page.tsx v1.0.4 (Button -> /v7/berater/foerderung?openNew=true) + foerderung/page.tsx v7.4.1-9 (openNew-Auto-Modal + Redirect zum App-Cockpit nach Speichern) |
| a1e3118 | A-015: Foerderseite Zurueck-Button modus-bewusst | foerderung/page.tsx v7.4.1-10 (liest pze_mode aus localStorage; App-Modus -> App-Cockpit, Classic -> altes Dashboard; Label "Zurueck") |
| (neuester) | A-016: App-Cockpit voller Name | berater-app-cockpit-page v1.0.5 (Name aus first_name+last_name; wirkt in Begruessung UND PortalHeader). Deploy von Martin bestaetigt; Commit-Hash via `git log -1` ablesbar. |

**Verifikation A-011:** Die beiden Rechenwege (alte Inline-Logik vs. gemeinsame Datei) wurden
nicht stichprobenartig, sondern anweisungsweise verglichen. Ergebnis: identisch. Die kleinen
Bausteine (Stundenfaktor 173.33, GF-50%-Regel, Arbeitstage, Farben) sind byte-gleich; die
grosse Prognose-Berechnung ergab nach Normalisierung keine logischen Unterschiede. Einzige
echte Aenderung fuer Schritt 2: die Diagramm-Datenfelder wurden vom Leerzeichen-Schema
("Plan PM", "Soll kumuliert") auf das Utility-Schema (planPM, SollKumuliert) angepasst; die
vier Balken erhielten ein explizites name=-Prop, damit Legende und Tooltip-Text unveraendert
bleiben. PF-01..07 (Verhaltensvertrag 12e.4) intakt.

---

## Was bewusst NICHT ausgeliefert wurde (bleibt auf der Werkbank)

Alle Deploys waren chirurgisch: pro Commit nur die betroffenen Dateien gestaged, vor jedem
Commit die Staging-Liste geprueft. Folgendes blieb absichtlich uncommittet (Befund aus
`git status` Session 48):

- `package.json` + `pnpm-lock.yaml` (Dependency `pg` hinzugefuegt) - gehoert NICHT zur App.
  Verifiziert: weder cockpit/page.tsx noch foerderung/page.tsx importieren `pg`; der bisherige
  Live-Build laeuft ohne `pg`. `pg` gehoert zu den `sync-prod-to-dev`-Skripten (lokales Werkzeug).
- `src/app/v7/berater/fzul/page.tsx` - alte, vermutlich vergessene Aenderung. Laut Martin ist
  die Forschungszulage-Seite nur ein Platzhalter; die lokale Datei ist eine alte V7.3-Vollseite.
- `src/app/v7/berater/foerderung/foerderung-page.tsx` - verirrte Upload-Kopie (untracked),
  versehentlich in `src/` gelandet. Stoert Build/Routing nicht (Next ignoriert den Namen).
- `scripts/sync-prod-to-dev.mjs`, `scripts/sync-prod-to-dev-v2.mjs`, `sync-prod-to-dev.mjs` (untracked).
- `docs/Supabase/Supabase MDBS.docx`, `docs/PZE-Upload-Checkliste-Session44-final_1.xlsx`.
- untracked: `Vercel`.

Diese Punkte sind als A-017 (Werkbank-Bereinigung) in der Offen-Liste erfasst.

---

## Offene Punkte (Stand Ende Session 48, vgl. PH Paragraph 12.1)

- A-001 Berater-Portal Benutzerhandbuch (In Arbeit)
- A-002 Stundennachweis-Wording projekttyp-spezifisch (Offen)
- A-003 AP-Quick-View Popup in TimesheetForm (Offen)
- A-006 FZul-Modul ausbauen (Offen)
- A-007 De-minimis-Modul (Offen)
- A-012 Standalone StundennachweisSeite + ProjektfortschrittSeite (Offen)
- A-013 verwaiste Seite v7/firmen/[id]/page.tsx aufraeumen (Offen)
- A-017 Werkbank-Bereinigung / Drift-Reconciliation (NEU, Offen) - fuer morgen
- A-018 refreshed-Lose-Ende Cockpit/Foerderseite (NEU, Offen)
- A-019 Namens-Vereinheitlichung ProjektFortschrittPanel K vs Project* C (NEU, niedrige Prio)

---

## Prozess-Notiz

- Beim Einfuegen mehrzeiliger Kopier-Bash mit `if`-Block kam es zu einem Bracketed-Paste-Fehler
  (zsh blieb am `else>`-Prompt haengen). Konsequenz ab jetzt: Kopier-Befehle immer EINZEILIG.
- Versionsschema bestaetigt: Jede Datei behaelt ihre Versionswurzel und zaehlt nur den Build
  hoch (ProjektFortschrittPanel -22 -> -23; foerderung -9 -> -10; cockpit 1.0.4 -> 1.0.5),
  unabhaengig vom SW-Release V7.4.9.
