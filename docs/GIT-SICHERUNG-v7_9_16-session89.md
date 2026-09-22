# GIT-SICHERUNG - Session 89 (V7.9.16)

**Datum:** 22. September 2026
**SW-Release:** V7.9.16 (kritischer Fix ZAPanel: Ueberschreiben der markierten ZA;
Betragseingabe; Sicherungen fuer eingereichte ZA) - in PRODUKTION
**Pflichtenheft:** v5.50
**Verhaltensvertrag:** v1.8
**Branch:** main = PROD (deployed) / v7-dev
**Loest ab:** GIT-SICHERUNG-v7_9_15-session88.md

**Deploy-Stand:** ZAPanel 7.4.4-84, -85, -86 je einzeln per Merge in main, gepusht auf
origin und cubintec, alle "Ready". **Kein SQL-Schema.** Datenkorrektur PROD per SQL:
AURA ZA 1 wiederhergestellt (siehe unten).

---

## Ausloeser

1. Martin: bei Eingabe "35.235" wurde weiterhin 35,24 gespeichert. KORREKTUR zu Session
   88: parseBetrag (-73) las einen Punkt ohne Komma als Dezimaltrenner - die Aussage
   "versteht 35.235" in GIT-SICHERUNG v7.9.15 und PFLICHTENHEFT v5.49 war falsch.
2. PROD GMM/AURA: nach "ZA speichern" war die einzige ZA 1 verschwunden, stattdessen
   ZA 2 (01.08.-22.09.2026).

## Befund AURA (kritisch, verursacht durch ZAPanel -73)

- Es gab nur eine Zeile (angelegt 24.03.2026 = ZA 1). Sie wurde am 22.09. 06:39 UTC
  UEBERSCHRIEBEN: Nummer 2, Zeitraum 01.08.-22.09.2026, Betrag neu berechnet 10.449.
  Zahlungen zogen per "Nummer geaendert -> Zahlungen ziehen mit" auf Nummer 2 um.
- Ursache 1 (-73): openPanel setzte zaList, wartete auf ladeZahlungen() und setzte erst
  danach die Formular-Vorbelegung "neue ZA". Dazwischen lief der Auto-Select und lud die
  letzte ZA - die Vorbelegung ueberschrieb das Formular, zaSelectedId blieb auf der ZA.
- Ursache 2: openPanel lief parallel zweimal (Mount-Effekt; in DEV durch StrictMode
  immer). Der zweite Lauf ueberschrieb das Formular nach dem Auto-Select.
- Fix: -82 Zahlungen vor setZAList laden; -83 Laufnummer openSeqRef (nur der letzte
  Lauf uebernimmt Ergebnisse); -82/-84 Rueckfrage bei Aenderung von Nummer/Zeitraum
  einer eingereichten ZA, Abbrechen stellt den gespeicherten Stand wieder her.

## Wiederherstellung AURA (PROD, SQL, 22.09.2026)

Werte aus dem eingereichten Formular (ZA 1, 16KN124599): 01.12.2025-31.07.2026,
eingereicht 10.08.2026, angefordert 55.329 EUR.
- v7_zahlungsanforderungen: za_nummer 1, Zeitraum, foerderbetrag_gesamt 55.329.
- v7_za_zahlungen: Nummer 2 -> 1. Betrag 55,33 (Punkt-Fehler seit Ersterfassung)
  durch Martin ueber die Oberflaeche auf 55.329,00 korrigiert. Status Volle Zahlung.

## Befund Stunden AURA nach Einreichung

Deckblatt ZA 1 zeigte 56.248 statt 55.329: bei Nguyen am 17.09.2026 Juni 16 -> 13 h und
Juli +38 h technisch (entered_by = Martin; Juni vermutlich durch Speichern des Monats
mit Auto-Vorbelegung neu geschrieben). Martin hat die Stunden korrigiert; Deckblatt
wieder 55.329. Auswertung ueber entered_by/entered_at und deaktivierte Zeilen der
v7_timesheets moeglich (Muster: to_jsonb(t) je Eintrag).

## Code-Integration (Status) - V7.9.16

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| ZAPanel-v7_4_4-86.tsx | src/components/shared/ZAPanel.tsx | DEPLOYED (V7.9.16) |

Inhalt -81 bis -86: -81 Punkte bei Betragseingabe immer ignoriert (nur Komma ist
Dezimaltrenner, Vorgabe Martin); -82 Ladereihenfolge + Rueckfrage Nummer/Zeitraum;
-83 Laufnummer openSeqRef; -84 Abbrechen setzt Formular zurueck; -85 Betraege im
Eingabefeld als Waehrung ("55.329,00"); -86 Rueckfrage, wenn der neu berechnete Betrag
einer eingereichten ZA vom gespeicherten abweicht (A-090 Bruecke).
Je Build: ASCII-Check, `npm run build` fehlerfrei (Martin).

## Lehren dieser Session

- Ein zusaetzliches await zwischen zusammengehoerigen State-Updates kann eine
  Effekt-Reihenfolge kippen. Parallele Ladelaeufe immer per Laufnummer absichern.
- Testen des ERSTEN Aufrufs einer Seite (Deep-Link aus dem Cockpit), nicht nur des
  Wechsels ueber Knoepfe.
- Terminal: laeuft `npm run dev`, gehoert cp in ein zweites Terminal-Tab.

## Offen / naechste Schritte

- Etappe 3 (Korrektur-Versionierung), A-090 endgueltig.
- A-088 AS/HEATS PROD-Zahlungsbetraege (Punkt-Fehler) - Martin.
- A-089, A-091 wie Session 88.
- Pruefen, ob weitere ZA in PROD seit V7.9.15 ueberschrieben wurden (Abfrage:
  ZA mit updated_at >= 21.09.2026 und veraendertem Zeitraum/Nummer; bisher nur AURA bekannt).

## Doku dieser Session

PFLICHTENHEFT-v5_50-AENDERUNGSBLOCK.md; VERHALTENSVERTRAG-v1_8.md;
GIT-SICHERUNG-v7_9_16-session89.md (diese Datei); PZE-Upload-Checkliste-Session89.xlsx;
aufraeumen-session89-v1.zsh.
