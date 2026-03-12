# GIT-SICHERUNG v7.4.4 - Session 3
**Datum:** 12. Maerz 2026
**Branch:** v7-dev + main
**Status:** Deployed auf pze.itenion.com

---

## Zusammenfassung Session

ZA-Kachel umbenannt, ZIM-Hinweiskasten auf allen drei Tabs eingefuegt.
Entscheidung: ZA-Modul vereinfacht - kein eigenes PDF-Formular,
nur Datenaufbereitung fuer manuellen Uebertrag ins offizielle ZIM-Formular.

---

## Geaenderte Dateien

### 1. ZAPanel-v7_4_4-16.tsx
**Ziel:** `src/components/shared/ZAPanel.tsx`
**Aenderungen:**
- Hinweiskasten (amber) auf allen 3 Tabs eingefuegt (Deckblatt, Anlage 1a, Anlage 1b)
- Hinweistext: "Fuer die Zahlungsanforderungen sind die vorgegebenen Formulare
  zu verwenden. Diese Daten sind deshalb in das offizielle ZIM-Formular zu
  uebertragen. Alle weiteren Informationen entnehmen Sie bitte den Hinweisen
  des ZIM-Formulars."
- Bewusst kein Originalzitat mehr -> vermeidet Haftung bei kuenftigen
  Textaenderungen seitens VDI/VDE-IT

### 2. berichte-page-v7_4_4-14.tsx
**Ziel:** `src/app/v7/firma/berichte/page.tsx`
**Aenderungen:**
- Kachel-Titel: "Zahlungsanforderung" -> "Daten f. Zahlungsanforderung"
- Kachel-Untertitel: "ZIM Mittelabruf" -> "Datengrundlage ZIM-Formular"
- Basis: berichte-page-v7_4_4-13.tsx

### 3. berater-berichte-page-v7_4_4-15.tsx
**Ziel:** `src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx`
**Aenderungen:**
- Kachel-Titel: "Zahlungsanforderung" -> "Daten f. Zahlungsanforderung"
- Kachel-Untertitel: "ZIM Mittelabruf" -> "Datengrundlage ZIM-Formular"
- Basis: berater-berichte-page-v7_4_4-14.tsx

---

## Strategische Entscheidung: ZA-Modul vereinfacht

Das offizielle ZIM-Formular (VDI/VDE-IT) kann nicht durch ein eigenes PDF
ersetzt werden (XML-Struktur, QR-Codes, Rechtsverbindlichkeit).

**Bisherige Planung (aufgegeben):**
- ZA-Wizard mit Schritt 1+2
- PDF-Ausgabe im ZIM-Format

**Neue Planung (umgesetzt / offen):**
- ZA-Panel mit Datenaufbereitung: ERLEDIGT (ZAPanel-v7_4_4-16)
- ZA-Archiv (Liste gespeicherter ZAs mit Status): OFFEN
- Faelligkeits-Ampel im Dashboard: OFFEN

---

## Deployment-Protokoll

```bash
# v7-dev
cp downloads/ZAPanel-v7_4_4-16.tsx src/components/shared/ZAPanel.tsx
cp downloads/berichte-page-v7_4_4-14.tsx src/app/v7/firma/berichte/page.tsx
cp downloads/berater-berichte-page-v7_4_4-15.tsx \
   "src/app/v7/berater/foerderung/firma/[id]/berichte/page.tsx"

git add -A
git commit -m "v7.4.4: ZA-Kachel umbenannt + ZIM-Hinweiskasten auf allen Tabs"
git push origin v7-dev

# main (Prod)
git checkout main
git merge v7-dev --no-edit
git push origin main
git checkout v7-dev
```

**Hinweis:** Pfade mit `[id]` immer in Anführungszeichen setzen (zsh-Kompatibilitaet).
**Hinweis:** Merge immer mit `--no-edit` um vim-Editor zu vermeiden.

---

## Offene Punkte (naechste Session)

- ZA-Archiv: Liste gespeicherter ZAs pro Projekt mit Status
  (Entwurf / Eingereicht / Bewilligt)
- Faelligkeits-Ampel: Wann ist naechste ZA faellig? (Dashboard-Anzeige)
- Firma-Detailseite im Berater-Portal: Header noch gruen statt blau
- Berater-Portal User-Manual (PDF)
- Stundensatz-Diskrepanz Annika Arndt pruefen

---

## Pflichtenheft

**Version:** 4.43
**Datei:** PFLICHTENHEFT-v4_43.md
