# PFLICHTENHEFT v5.48 - Aenderungsblock (Session 87, 21.09.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37 bis v5.47. Dieser Block enthaelt
AUSSCHLIESSLICH die Aenderungen fuer v5.48 mit exakten Einfuegepunkten.
SW-Release: **V7.9.14** (in PRODUKTION). Kein SQL-Schema.
Inhalt: KORREKTUREN zu v5.47. (1) Das Projektende von ANOVIA ist der 31.08.2026, nicht
der 30.08. - die in v5.47 beschriebene "Abrechnung ausserhalb der Bewilligung" traf
nicht zu. (2) Die angeforderte Zuwendung je ZA wird wieder auf ganze Euro gerundet
(A-075 zurueckgenommen, A-082). (3) Verwendungsnachweis: Berichtszeitraum fest aus der
Projektlaufzeit, keine ZA faellt mehr stillschweigend heraus (A-083). (4) A-081 erledigt.
Verhaltensvertrag v1.6.

Nummernpruefung vor Vergabe: v5.48 sowie A-082 und A-083 sind weder in downloads/ noch in
den Projektdokumenten vergeben (Stand 21.09.2026; hoechste bisherige Anforderung A-081
aus v5.47).

================================================================================
AENDERUNG 1 - Kopfblock
================================================================================

ALT:
  **Version:** 5.47
  **SW-Release:** V7.9.13
  **Datum:** 21. September 2026

NEU:
  **Version:** 5.48
  **SW-Release:** V7.9.14
  **Datum:** 21. September 2026

--------------------------------------------------------------------------------
AENDERUNG 1b - Status-Zeile (neuer Stand VORNE; bisheriger Text wird zu
"Zuvor (Session 86):")
--------------------------------------------------------------------------------

  **Status:** Session 87 (21.09.2026): **V7.9.14 in PRODUKTION - Korrekturen zu
  V7.9.13.** Das Projektende von ANOVIA war in den Stammdaten faelschlich mit 30.08.2026
  erfasst; richtig ist der 31.08.2026 (Korrektur durch Martin). Damit waren die
  Projektstunden vom 31.08. zulaessig. Martin hat sie aus einem gesicherten PDF des
  August-Stundenblatts wiederhergestellt (Stand vor dem 19.09.: 586,00 h T / 27,00 h NT
  Jul/Aug) - der eingereichte Betrag der ZA Jul/Aug (14.593 EUR) ist damit exakt
  reproduzierbar. Der taggenaue Abrechnungsfilter (A-074) bleibt als Code richtig.
  Weitere Korrekturen: ZA-Anforderung wieder auf ganze Euro (Originalformular);
  VN-Berichtszeitraum fest aus den Projektdaten. Die ZA-Luecke Mai/Juni 2026 (A-081) hat
  Martin durch Neuanlage einer ZA geschlossen (jetzt 5 ZA).
  Zuvor (Session 86):

================================================================================
AENDERUNG 2 - Paragraph 4 Komponententabelle (Versionen aktualisieren)
================================================================================

  | src/lib/verwendungsnachweis-utils.ts                 | verwendungsnachweis-utils-v1_2-7.ts  | (bisher v1_2-5) |
  | src/components/shared/VerwendungsnachweisPanel.tsx   | VerwendungsnachweisPanel-v1_2-6.tsx  | (bisher v1_2-5) |
  | src/components/shared/ZAPanel.tsx                    | ZAPanel-v7_4_4-72.tsx                | (bisher -71)    |

================================================================================
AENDERUNG 3 - Korrektur der fachlichen Anforderungen aus v5.47
================================================================================

--- 3a) ersetzt den zweiten Absatz von v5.47 AENDERUNG 3a (Rundung) ---

  Angeforderte Zuwendung je ZA (antZuwendung, gespeicherter foerderbetrag_gesamt,
  NWM-Foerderbetrag): kaufmaennisch auf GANZE EURO, wie im Originalformular der
  Zahlungsanforderung. Umsetzung ueber roundEuro() aus der VN-Lib (erst auf Cent, dann
  auf den Euro, gegen Gleitkomma-Rauschen). Kosten und Kostenzeilen bleiben centgenau.
  Entscheidung Martin 21.09.2026, geprueft an ANOVIA ZA 1: 8.274,63 -> 8.275.
  Der Verwendungsnachweis rechnet den Anspruch centgenau (Entscheidung Martin
  21.09.2026). Abweichungswarnung erst ab Anzahl ZA x 0,50 + 0,005 EUR.

--- 3b) Ergaenzung zu v5.47 AENDERUNG 3c/3d (Verwendungsnachweis) ---

  Berichtszeitraum = Projektlaufzeit (v7_projects.start_date bis end_date), nicht
  editierbar. Begruendung Martin: ein VN kommt immer erst am Schluss eines Projekts.
  Der beim Speichern abgelegte Zeitraum dient nur noch dem Vergleich; weicht er ab,
  erscheint "bitte neu speichern".
  Eine ZA wird aufgenommen, sobald sie den Berichtszeitraum beruehrt; Kosten und Stunden
  werden taggenau auf den Berichtszeitraum gekappt, ein Ueberstand wird gemeldet.
  Bisher fiel eine ZA, die auch nur einen Tag hinausragte, stillschweigend komplett
  heraus.

================================================================================
AENDERUNG 4 - Paragraph 5 Bekannte Fehler
================================================================================

  Behoben (V7.9.14):
  - Verwendungsnachweis verwarf ZA, die ueber den Berichtszeitraum hinausragten,
    vollstaendig und ohne Hinweis (A-083).
  - Verwendungsnachweis uebernahm den Berichtszeitraum aus dem gespeicherten Datensatz
    statt aus den Projektdaten; Aenderungen am Projektende kamen nicht an (A-083).

  Korrektur der Darstellung in v5.47 Paragraph 5 und GIT-SICHERUNG Session 86: die
  Aussage "Stunden nach Bewilligungsende wurden abgerechnet, 390,42 EUR zu viel" beruhte
  auf dem falsch erfassten Projektende 30.08.2026 und trifft fuer ANOVIA nicht zu. Die
  Codeaenderung (taggenaue Abrechnung) bleibt richtig und notwendig.

================================================================================
AENDERUNG 5 - Paragraph 12.1 Anforderungsliste
================================================================================

  Aenderung bestehender Zeilen:

  | A-075 | ... | Zurueckgenommen (V7.9.14) | 21.09.2026 | Ersetzt durch A-082. Centrundung der ZA-Anforderung widerspricht dem Originalformular |
  | A-081 | ... | Erledigt (Martin) | 21.09.2026 | Neue ZA 4 (01.05.-30.06.2026, 14.784 EUR) angelegt, bisherige ZA 4 ist jetzt ZA 5 (01.07.-31.08.2026, 14.593 EUR). Cockpit-Pruefung meldet keine Luecke mehr |

  Neue Zeilen:

  | A-082 | ZA-Anforderung kaufmaennisch auf ganze Euro (wie Originalformular), Kosten centgenau | Martin | Session 87 | Erledigt (V7.9.14) | 21.09.2026 | ZAPanel v7.4.4-72, Lib v1.2-6 (roundEuro). PROD: ANOVIA ZA 1-5 = 8.275 / 5.428 / 15.391 / 14.784 / 14.593 EUR, Summe 58.471 |
  | A-083 | VN: Berichtszeitraum aus Projektdaten; ZA mit Ueberschneidung aufnehmen und kappen; Warnung bei Ueberstand | Martin (ANOVIA, ZA 5 fehlte im VN) | Session 87 | Erledigt (V7.9.14) | 21.09.2026 | Lib v1.2-7, Panel v1.2-6. PROD verifiziert: 5 ZA, Summe A 83.529,51, Zuwendung 58.470,66, erhalten 43.878,00, Schlusszahlung 14.592,66, Eigenanteil 25.058,85; C 1.739,00 / 730,33 / 2.469,33 h; keine Warnung |

================================================================================
AENDERUNG 6 - Paragraph 12e Verhaltensvertrag (Fortschreibung auf v1.6)
================================================================================

  Arbeitskopie: VERHALTENSVERTRAG-v1_6.md (loest v1_5 ab).
  - ZA-14 und IF-13: Anforderung je ZA ganze Euro (roundEuro), Kosten und VN centgenau.
  - VN-05: Toleranz Anzahl ZA x 0,50 + 0,005 EUR.
  - Neu VN-08: Berichtszeitraum aus Projektdaten, Ueberschneidung statt Enthaltenheit.
  - Fragile Bereiche VN: Zeitraumfilter korrigiert; gespeicherter Stand vs. Stammdaten.

================================================================================
AENDERUNG 7 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.48 | 21.09.2026 | Session 87, V7.9.14: Korrekturen zu v5.47. ANOVIA-Projektende 31.08.2026 (nicht 30.08.), Stunden vom 31.08. wiederhergestellt. ZA-Anforderung wieder ganze Euro (A-082, A-075 zurueckgenommen). VN: Berichtszeitraum aus Projektdaten, keine stille ZA-Exklusion mehr (A-083). A-081 erledigt (ZA-Luecke Mai/Juni durch neue ZA geschlossen). Verhaltensvertrag v1.6. Kein SQL-Schema. |

================================================================================
