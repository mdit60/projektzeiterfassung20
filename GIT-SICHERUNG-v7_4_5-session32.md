# GIT-SICHERUNG SESSION 32
**Datum:** 25. April 2026
**Version:** v7.4.5 (Fortsetzung)
**Status:** Abgeschlossen, bereit fuer PROD

---

## ERLEDIGTE AUFGABEN

### 1. ProjektFortschrittPanel: Laufzeit im Header + Drucken/PDF
**Finale Datei:** `ProjektFortschrittPanel-v7_4_5-21.tsx`
-> `src/components/shared/ProjektFortschrittPanel.tsx`

Iterationen: v7.4.5-12 bis -21 (10 Iterationen)

**Neue Features:**
- Projektlaufzeit (Startdatum - Enddatum) im Panel-Header neben FKZ und
  Foerderprogramm-Badge — gilt fuer Einzel- und Multi-Projekt-Ansicht
- Button "Drucken / PDF" im Monatsverlauf-Block (oben rechts)
  Oeffnet isoliertes Druckfenster mit Styles + Monatsverlauf + Prognose
  Dateiname: `<Projektname>_<FKZ>_Projektfortschritt_JJJJMMDD`
  (wird als window.title gesetzt; macOS/Chrome nutzt Title als PDF-Dateiname)

**Kontrast-Verbesserungen:**
- Alle text-gray-400/500 -> text-gray-700 (#374151, Anthrazit)
- Chart-Achsen tick fill: #374151
- Custom Legend: helle Soll-Serien (Plan/Soll) bekommen Label-Farbe #475569
  damit Legende auf weissem Hintergrund lesbar bleibt
- Technischer Hinweistext bereinigt: "(is_billable = true)" entfernt

**Technische Entscheidung:**
- html2canvas + jsPDF inkompatibel mit Tailwind CSS v4 + Next.js
  (oklch-Farbfunktion wird nicht unterstuetzt, auch nach 6 Fix-Versuchen)
- Loesung: window.print() mit isoliertem Popup-Fenster
- Pakete html2canvas und jspdf bleiben installiert (package.json),
  werden aber nicht mehr verwendet — koennen bei Bedarf entfernt werden

### 2. ZAPanel: Deckblatt 3-Zeilen-Struktur
**Finale Datei:** `ZAPanel-v7_4_4-31.tsx`
-> `src/components/shared/ZAPanel.tsx`

- Deckblatt-Kopfbereich von 2 auf 3 Zeilen umstrukturiert:
  - Zeile 1 (gelb): Foerderkennzeichen | Datum Zuwendungsbescheid
  - Zeile 2 (gruen): Projektlaufzeit von...bis | Bewilligte Foerdersumme
  - Zeile 3 (blau): ZA-Nr. | Abrechnungszeitraum von...bis
- Farbzuordnung jetzt zeilenweise einheitlich (vorher feldbezogen)
- Projektlaufzeit neu hinzugefuegt (aus project.start_date / end_date)

---

## AKTUELLE VERSIONSNUMMERN (geaenderte Dateien)

| Datei | Version | Pfad |
|-------|---------|------|
| ProjektFortschrittPanel | v7.4.5-21 | src/components/shared/ProjektFortschrittPanel.tsx |
| ZAPanel | v7.4.4-31 | src/components/shared/ZAPanel.tsx |

---

## OFFENE PUNKTE

Unveraendert aus Session 31 (siehe GIT-SICHERUNG-v7_4_5-session31.md):
- Arbeitszeitgrenzen Phase 3 (Ampel-Trio live)
- User Manuals aktualisieren
- Berater-Portal Manual erstellen
- Unique Constraint v7_timesheets
- NWM Jahresabrechnung pruefen

---

## GIT-WORKFLOW SESSION 32

```bash
cd ~/Documents/Dev/PZE

# Dateien deployen (falls noch nicht geschehen)
cp ~/Documents/Dev/PZE/downloads/ProjektFortschrittPanel-v7_4_5-21.tsx src/components/shared/ProjektFortschrittPanel.tsx
cp ~/Documents/Dev/PZE/downloads/ZAPanel-v7_4_4-31.tsx src/components/shared/ZAPanel.tsx

# GIT-Sicherung einchecken
cp ~/Documents/Dev/PZE/downloads/GIT-SICHERUNG-v7_4_5-session32.md GIT-SICHERUNG-v7_4_5-session32.md

git add -A
git commit -m "feat(v7.4.5): Laufzeit Header, Drucken/PDF, ZA 3-Zeilen, Kontrast-Verbesserung"
git push origin v7-dev
git checkout main && git pull && git merge v7-dev --no-ff --no-edit && git push origin main && git checkout v7-dev
```
