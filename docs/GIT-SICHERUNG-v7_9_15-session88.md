# GIT-SICHERUNG - Session 88 (V7.9.15)

**Datum:** 21. September 2026
**SW-Release:** V7.9.15 (ZA-Zahlungseingaenge als Liste, Sammelueberweisung, Archiv
in der ZA-Auswahl) - in PRODUKTION
**Pflichtenheft:** v5.49
**Verhaltensvertrag:** v1.7
**Konzept:** KONZEPT-ZA-KORREKTUR-ZAHLUNGEN v1.2 (Teil B / Etappen 1-2 erledigt)
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_14-session87.md

**Stand main / v7-dev / Tag:** Code-Commits `7a089bc` (Etappe 2) und ZAPanel
7.4.4-80 (Anmerkungs-Popup) auf v7-dev, je per Merge in main, gepusht auf origin und
cubintec. Release-Tag `v7.9.15` wird mit dem Doku-Commit gesetzt.

**Deploy-Stand:** In PROD deployt. **SQL-Schema: JA** - neue Tabelle `v7_za_zahlungen`
inkl. RLS und Migration, in DEV und PROD ausgefuehrt (Paritaet).

---

## Ausloeser

Steuerkanzlei Freund / ANOVIA: Korrektur-ZA 1 und ZA 2 wurden vom Projekttraeger in
EINER Ueberweisung (13.03.2026, 12.128 EUR) bezahlt. PZE kannte je ZA nur ein
Zahlungsfeld -> Scheindifferenzen +6.700 / -6.700. Umsetzung von Teil B des
KONZEPT-ZA-KORREKTUR-ZAHLUNGEN v1.1.

## Etappe 1 - SQL (DEV und PROD)

- Tabelle `v7_za_zahlungen` (id, project_id, za_nummer, datum, betrag, referenz,
  kommentar, is_active, created_at, created_by, updated_at). Zahlung haengt an
  (project_id, za_nummer), nicht an der ZA-Zeile.
- RLS: eine Policy FOR ALL, identisch mit v7_zahlungsanforderungen
  (`project_id IN (SELECT p.id FROM v7_projects p WHERE v7_can_access_client(p.client_company_id))`),
  per Vergleich von pg_policies.qual verifiziert.
- Migration aus zahlungseingang_datum/_betrag/_kommentar. Alte Spalten bleiben,
  werden nicht mehr gelesen oder geschrieben.
- Pruefung DEV: 4 = 4 Zahlungen, 0 Abweichungen. PROD: 11 = 11, 0 Abweichungen,
  Regel gleich = true.
- PROD-Migration bewusst erst unmittelbar vor dem Deploy (sonst Luecke durch den
  alten Code, der weiter in die alten Spalten schreibt).

## Etappe 2 - Code

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| ZAPanel-v7_4_4-80.tsx | src/components/shared/ZAPanel.tsx | DEPLOYED (V7.9.15; -79 mit Etappe 2, -80 Anmerkungs-Popup im Archiv) |
| FirmaCockpit-v7_4_9-36-21.tsx | src/components/shared/FirmaCockpit.tsx | DEPLOYED (V7.9.15) |
| VerwendungsnachweisPanel-v1_2-7.tsx | src/components/shared/VerwendungsnachweisPanel.tsx | DEPLOYED (V7.9.15) |
| ZASeite-v1_0_11.tsx | src/components/shared/ZASeite.tsx | DEPLOYED (V7.9.15) |

Zwischenstaende ZAPanel -73 bis -79 und FirmaCockpit 36-19/-20 nur in DEV getestet,
aufgegangen in den obigen Staenden. verwendungsnachweis-utils unveraendert (v1.2-7):
das Panel uebergibt je ZA die Summe der Zahlungen im bestehenden Feld.

Je Build: ASCII-Check (0 Nicht-ASCII), `npm run build` lokal fehlerfrei (Martin).

## Wichtige Befunde waehrend des DEV-Tests

1. **Zahlung ueberschrieb die angeforderte Summe (A-085, behoben in -77).** Regel aus
   v7.4.4-41 berechnete foerderbetrag_gesamt bei jedem Zahlungssichern neu. Eine
   Sammelueberweisung aenderte HEATS ZA 2/3 in DEV von 26.387,72 / 27.482,33 auf
   24.218 / 25.688. Seit -77: gespeicherter Betrag bleibt, nur leere werden gefuellt.
   DEV-Werte per SQL wiederhergestellt. In PROD nie aufgetreten (Code erst mit -79).
2. **Versehentliches Loeschen von ZA 1 in DEV** (Knopf "Loeschen" statt "Entfernen");
   per SQL wiederhergestellt. Daraus A-086: Loeschen eingereichter ZA nur mit Eingabe
   der ZA-Nummer, "Zahlung entfernen" grau, keine Zahlungen bei Entwuerfen.
3. **PROD AS/HEATS:** Zahlungseingaenge stehen mit 35,24 / 24,21 / 25,69 / 24,18 EUR.
   Vermutlich "35.235" im alten Code eingegeben, Punkt als Dezimalkomma gelesen. Die
   neue Eingabe (parseBetrag) versteht "35.235" und "35.235,00". Werte klaert Martin
   mit AS (A-088).

## PROD-Pruefung (21.09.2026)

- AS/HEATS: neue Oberflaeche aktiv, angeforderte Betraege nach Hin- und Zuruecksichern
  unveraendert (-77 wirkt).
- Freund/ANOVIA: Zahlung 12.128 von ZA 2 entfernt, Sammelueberweisung 13.03.2026
  "Ueberw. 13.03.26" erfasst: ZA 1 6.700, ZA 2 5.428. Ergebnis ZA 1 8.275,00 (2),
  ZA 2 5.428,00, beide "Volle Zahlung", Differenzen 0.

## Lehren dieser Session

- Eine Regel, die fuer einen Sonderfall eingefuehrt wurde ("Betrag immer neu
  berechnen", -41), wirkt spaeter an Stellen, an die niemand gedacht hat. Beim
  Uebertragen auf neue Wege die urspruengliche Absicht pruefen.
- Gleich aussehende Knoepfe mit sehr unterschiedlicher Tragweite (Zahlung entfernen /
  ZA loeschen) fuehren zu Fehlbedienung - unterschiedliche Optik und Huerde.
- Beim Testen immer die Umgebung pruefen (localhost vs. PROD).

## Offen / naechste Schritte

- **Etappe 3 (Konzept Teil A):** Korrektur-Versionierung. Zusaetzliche Pflichtpunkte aus
  dieser Session: "ZA speichern" im Deckblatt ueberschreibt den eingereichten Betrag
  (A-090); Einreichdatum Freund ZA 1 steht auf 15.04.2026, Konzept nennt 23.02.2026.
- A-088 AS/HEATS Zahlungsbetraege klaeren und korrigieren (Martin).
- A-089 VN zaehlt Entwuerfe in "angefordert laut ZA" mit.
- A-091 Dialog "ZA speichern und fortfahren": Knopf ohne Hintergrundfarbe (colors.primary fehlt).
- Alte Spalten zahlungseingang_* entfernen, wenn alles stabil ist (eigene Etappe).
- Aus Session 87 uebernommen: A-080 Typfehler, Folgeanforderungen, A-066/070/071 u. a.

## Doku dieser Session

PFLICHTENHEFT-v5_49-AENDERUNGSBLOCK.md; VERHALTENSVERTRAG-v1_7.md;
KONZEPT-ZA-KORREKTUR-ZAHLUNGEN-v1_2.md; GIT-SICHERUNG-v7_9_15-session88.md (diese
Datei); PZE-Upload-Checkliste-Session88.xlsx; aufraeumen-session88-v1.zsh.
