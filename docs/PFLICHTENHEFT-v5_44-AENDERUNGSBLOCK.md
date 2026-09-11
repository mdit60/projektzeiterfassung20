# PFLICHTENHEFT v5.44 - Aenderungsblock (Session 83, 11.09.2026)

Basis: PFLICHTENHEFT-v5_36.md + Aenderungsbloecke v5.37 bis v5.43. Dieser Block enthaelt
AUSSCHLIESSLICH die Aenderungen fuer v5.44 mit exakten Einfuegepunkten.
SW-Release V7.9.10 -> V7.9.11. KEIN SQL - reine Code-Aenderung (Seite + API-Route):
FZul-Detailseite und BSFZ-Export beruecksichtigen zentrale Abwesenheiten, zaehlen nur
zuschussfaehige Stunden als gefoerdert und fuellen den Jahresarbeitszeit-Block der
Vorlage korrekt.

Nummernpruefung vor Vergabe: v5.44 sowie A-068 und A-069 sind weder in downloads/ noch
in downloads/archiv/doku/PFLICHTENHEFT/ noch in den Projektdokumenten vergeben (Stand
11.09.2026; hoechste bisherige Anforderung A-067 aus v5.43).

================================================================================
AENDERUNG 1 - Kopfblock (ersetzt die ersten Zeilen des Dokuments)
================================================================================

ALT:
  **Version:** 5.43
  **SW-Release:** V7.9.10
  **Datum:** 11. September 2026

NEU:
  **Version:** 5.44
  **SW-Release:** V7.9.11
  **Datum:** 11. September 2026

--------------------------------------------------------------------------------
AENDERUNG 1b - Status-Zeile (neuer Stand VORNE ergaenzt; der bisherige Text wird
zu "Zuvor in V7.9.10:")
--------------------------------------------------------------------------------

Vor dem bestehenden Status-Text aus v5.43 wird eingefuegt:

  **Status:** Session 83 (11.09.2026): **FZUL-DETAILSEITE UND BSFZ-EXPORT KORRIGIERT -
  V7.9.11 (in PRODUKTION).** Kein SQL. Drei Fehler im selben Lesepfad
  (/v7/berater/multiprojekt/[id] und /api/export/fzul): (1) A-067 - zentrale
  Abwesenheiten (v7_employee_absences, U/K/S/E) wurden nicht gelesen; an
  Abwesenheitstagen wurden volle FZul-Stunden angeboten und exportiert. Jetzt in
  Uebersicht, Import, Jahreskalender und Export beruecksichtigt, mitarbeiterbezogen und
  nur an Arbeitstagen (Mo-Fr, kein Feiertag); gespeicherte FZul-Stunden an
  Abwesenheitstagen (Altdaten, PROD: KAIRA 59 Tage / 303,6 h) werden rot markiert und
  sind korrigierbar, ohne automatische DB-Aenderung. (2) A-068 - als "gefoerdert"
  zaehlten alle Stunden in Foerderprojekten, auch "Nicht zuschussfaehige Arbeiten"; seit
  der Auto-Vorbelegung (V7.9.7) ergab das fuer jeden gespeicherten Monat 0 verfuegbare
  FZul-Stunden (PROD-Bestand 6.070,8 h). Jetzt nur is_billable = true. (3) A-069 - die
  Route schrieb Wochenarbeitszeit und Urlaubstage in nicht gelesene Zellen (C38/F39/J39),
  die Vorlage rechnete immer mit 40 h / 30 Tagen; Krankheit, Sonderurlaub und Elternzeit
  fehlten. Route v2.5 schreibt E38, O39, O40 (K), O41 (S), O43 (E); die Seite zaehlt die
  Arbeitstage je Code. U ueber vertraglichem Anspruch nur als Hinweis im Export-Tab.
  Beifang: Enddatum "-31" im Uebersichts-Laden (Vorhaben mit Ende in 30-Tage-Monat
  oder Februar lieferten gefoerdert 0). multiprojekt-detail v7.4.8-20,
  api/export/fzul v2.5. A-067, A-068, A-069 erledigt. Deploy: Merge v7-dev -> main
  (--no-ff), push origin + cubintec, Vercel, Tag v7.9.11. Details
  GIT-SICHERUNG-v7_9_11-session83.md. Zuvor in V7.9.10:

(der bestehende Status-Text aus v5.43 folgt unveraendert direkt danach.)

================================================================================
AENDERUNG 2 - Paragraph 4.3 Wrapper-Seiten (eine Zeile aktualisieren, eine neu)
================================================================================

(a) Zeile **src/app/v7/berater/multiprojekt/[id]/page.tsx**: Versionsangabe 7.4.8-16 ->
**7.4.8-20**, am Ende der Beschreibung anfuegen:

  ; v7.4.8-17 einheitlicher "Zurueck"-Button (router.back(), Fallback Uebersicht) -
  hier nachgezogen; **v7.4.8-18 (Session 83, A-067): zentrale Abwesenheiten U/K/S/E aus
  v7_employee_absences (ladeAbwesenheiten, .limit(10000), mitarbeiterbezogen OHNE
  Projekt-Zuordnungsfenster, Ladefehler werden geworfen); wirksam nur an Arbeitstagen
  (Mo-Fr, kein Feiertag). Uebersicht: Max./Verf. h minus Abwesenheits-Arbeitstage x
  Tagesarbeitszeit (alle Codes), Zusatzzeile "abzgl. x h Abw. (n AT)". Import:
  fue = verfuegbar = 0 an Abwesenheitstagen, urlaub_/krank_/sonderurlaub_hours aus der
  Abwesenheitszeile (E: 0). Kalender: Kuerzel-Zelle statt Eingabe (E bg-sky-100, U/K/S
  bg-violet-100), Altdaten (gespeicherte fue_hours an Abwesenheitstag) rot, Eingabe
  setzt 0, Hinweis mit Anzahl/Stunden, keine automatische DB-Aenderung; Ladefehler
  sichtbar. Export: dayData[m][d].absence = true. Enddatum im Uebersichts-Laden =
  tatsaechlicher Monatsletzter (bisher "-31"). v7.4.8-19 (A-068): alle vier
  v7_timesheets-Abfragen mit .eq('is_billable', true). v7.4.8-20 (A-069): Export
  zaehlt K/S/E-Arbeitstage im Exportjahr und uebergibt sickDays/specialLeaveDays/
  parentalLeaveDays an Route v2.5; Export-Tab je MA "Arbeitstage JJJJ: U · K · S · E ·
  Urlaubsanspruch" und Hinweis bei U-Arbeitstagen > annual_leave_days.**

(b) NEUE Zeile direkt darunter:

  | src/app/api/export/fzul/route.ts | **2.5** | BSFZ-Excel je MA/Jahr aus public/templates/FZul_Vorlage.xlsx (xlsx-populate). Tagesraster: Tagesarbeitszeit minus uebergebene Stunden, leer an WE/Feiertag/absence. v2.5 (Session 83, A-069): Wochenarbeitszeit -> E38, vertraglicher Urlaubsanspruch -> O39 (bis v2.3 faelschlich C38/F39/J39 in verbundenen Beschriftungsfeldern -> Vorlage rechnete immer mit 40 h / 30 Tagen); optional sickDays -> O40, specialLeaveDays -> O41, parentalLeaveDays -> O43 (Arbeitstage; Stunden und Feiertage O42 rechnet die Vorlage); ohne die Felder bleiben die Zeilen 0; ASCII-konform. Basis war der deployte Stand v2.3; die Archivkopie v2.4 (fzulData) wurde nie deployt. Aufrufer: multiprojekt/[id]/page.tsx, Alt-Seite src/app/import/page.tsx (A-013). |

================================================================================
AENDERUNG 3 - Paragraph 5 Bekannte Fehler
================================================================================

Der mit v5.43 aufgenommene Eintrag zu A-067 (falsche verfuegbare FZul-Stunden an
Abwesenheits- und Elternzeit-Tagen) wird als **behoben in V7.9.11** markiert. Neu
aufzunehmen (beide nicht behoben, dokumentiert):

  - FZul-Export: gespeicherte Kalenderwerte (fue_hours) gehen nicht in die BSFZ-Excel;
    der Export nutzt die Live-Invertierung (seit multiprojekt-detail v7.4.8-16).
  - FZul-Export: Kuerzung bei unterjaehrigem Vorhaben (Zeile 45) fest 1; E38 = WAZ zum
    1.1. des Vorhabenjahres (kein Wechsel im Jahr, auch nicht bei Jahresnavigation);
    Kurzarbeit (KA) nicht in Zeile 43.

================================================================================
AENDERUNG 4 - Paragraph 12.1 Anforderungsliste
================================================================================

(a) Zeile **A-067**: Status Offen -> **Erledigt**, erledigt am **11.09.2026**, Referenz
anfuegen:

  ERLEDIGT Session 83 (V7.9.11): multiprojekt-detail v7.4.8-18..-20. Abwesenheiten
  mitarbeiterbezogen aus v7_employee_absences, nur an Arbeitstagen, in Uebersicht,
  Import, Kalender und Export. Altdaten-Konflikt sichtbar und korrigierbar, keine
  automatische DB-Aenderung (Entscheidung Martin). Verifiziert DEV (AS System, Test
  A-067) und PROD (KAIRA: Ditscherlein 19 Tage / 144,4 h = Vorab-SQL).

(b) Zwei neue Zeilen ans Tabellenende:

  | A-068 | FZul-Detailseite: nur zuschussfaehige Stunden duerfen als "gefoerdert" die FZul-Verfuegbarkeit mindern | Session 83 (DEV-Test A-067, Befund Martin: "0 muesste 8 sein") | Session 83 | Erledigt | 11.09.2026 | multiprojekt-detail v7.4.8-19: .eq('is_billable', true) in Uebersicht, Import, Kalender, Export. Ursache: Zeile "Nicht zuschussfaehige Arbeiten" (ohne AP, is_billable false) wird seit V7.9.7 automatisch vorbelegt und zaehlte als gefoerdert -> gespeicherte Monate mit 0 FZul-Stunden. Datenpruefung DEV+PROD: work_package_id IS NOT NULL <=> is_billable = true in allen Foerderformaten, keine Mischfaelle; PROD 6.070,8 h betroffen. Wirkung: zu WENIG FZul-Stunden, keine Ueberforderung. |
  | A-069 | BSFZ-Export: Jahresarbeitszeit-Block der Vorlage vollstaendig und in die richtigen Zellen | Martin (Session 83, Export-Pruefung: Krankheit und Elternzeit fehlen) | Session 83 | Erledigt | 11.09.2026 | Route /api/export/fzul v2.5 + multiprojekt-detail v7.4.8-20. Befund beim Auslesen der Vorlage: v2.3 schrieb C38/F39/J39 (nicht gelesen), E38/O39 blieben Vorgabe 40 h / 30 Tage. Neu: E38, O39, O40 = K-, O41 = S-, O43 = E-Arbeitstage (tagesgenau Mo-Fr ohne Feiertag; Feiertage O42 rechnet die Vorlage). S -> Sonderurlaub tagesgenau statt Summen-Differenz; U ueber Anspruch nur Hinweis, keine Umbuchung (Resturlaub Vorjahr wuerde doppelt kuerzen; PROD 2 von 72 MA-Jahren). Verifiziert DEV (Bohlmann 2026: O40 4, O43 13, 1.648 h, 0,69) und PROD (Ditscherlein 2026: E38 38 statt 40, 1.679,6 h statt 1.768 h). |

(c) Hinweis ohne neue Nummer (Beifang A-067, erledigt): Enddatum im Uebersichts-Laden
der FZul-Detailseite (fest "-31") - bei Vorhaben mit Ende Feb/Apr/Jun/Sep/Nov wurde
gefoerdert = 0 geliefert und MA landeten faelschlich in Gruppe B. Nicht separat getestet.

================================================================================
AENDERUNG 5 - Paragraph 13 Aenderungshistorie (neue Zeile GANZ OBEN)
================================================================================

  | v5.44 | 11.09.2026 | Session 83 (V7.9.11, kein SQL): FZul-Detailseite und BSFZ-Export. A-067 erledigt (zentrale Abwesenheiten U/K/S/E mitarbeiterbezogen an Arbeitstagen in Uebersicht, Import, Kalender, Export; Altdaten-Konflikt rot und korrigierbar), A-068 neu+erledigt (nur is_billable = true zaehlt als gefoerdert; Auto-Vorbelegung "nicht zuschussfaehige Arbeiten" machte gespeicherte Monate FZul-frei), A-069 neu+erledigt (Route v2.5: E38/O39 statt nicht gelesener C38/F39/J39, neu O40 K, O41 S, O43 E; Export-Tab mit Arbeitstagen je Code und Hinweis U > Anspruch). Beifang Enddatum "-31". multiprojekt-detail v7.4.8-20, api/export/fzul v2.5 (Basis deployte v2.3, Archiv-v2.4 nie deployt). Verifiziert DEV (AS System) und PROD (KAIRA). Deploy: Merge v7-dev->main (--no-ff) b4f8e42, push origin+cubintec, Vercel, Tag v7.9.11. Details GIT-SICHERUNG-v7_9_11-session83.md. |

================================================================================
Hinweis Verhaltensvertrag (Paragraph 12e): Fuer FZul-Detailseite und Export-Route
existiert noch kein Vertrag. Vorschlag fuer VERHALTENSVERTRAG v1.3 (zusammen mit
KP-01..04 aus v5.43 und den zwei offenen Regeln aus v5.42):

  - FD-01 Gefoerdert = Stunden aus v7_timesheets in Projekten mit oeffentlichem
    Foerderformat, is_active, is_billable = true, ohne Abwesenheits-day_type,
    .limit(10000).
  - FD-02 Abwesenheiten (U/K/S/E) aus v7_employee_absences, mitarbeiterbezogen (kein
    Projekt-Zuordnungsfenster), wirksam nur an Arbeitstagen (Mo-Fr, kein Feiertag).
  - FD-03 Import: fue = verfuegbar = 0 an WE, Feiertagen und Abwesenheitstagen;
    sonst verfuegbar = Tagesarbeitszeit - gefoerdert.
  - FD-04 Kalender aendert gespeicherte fue_hours nie selbst; Altdaten-Konflikt
    (Abwesenheitstag mit fue_hours > 0) rot mit Hinweis, Korrektur nur manuell oder per
    Neu-Import.
  - FD-05 Uebersicht Max. h = WAZ/40 x 173,33 x Monate - Abwesenheits-Arbeitstage x
    WAZ/5.
  - FD-06 Export-Raster: leer an WE, Feiertagen und Abwesenheitstagen.
  - FD-07 Export unterer Teil: E38 WAZ, O39 annual_leave_days, O40 K-, O41 S-, O43
    E-Arbeitstage; O42 Feiertage bleibt Formel der Vorlage.
  - FD-08 Ladefehler (Abwesenheiten, Urlaubsanspruch) werden angezeigt, nie still als
    0 behandelt.

Hinweis Stammdaten: annual_leave_days steht in PROD bei allen MA auf 30 und wirkt seit
V7.9.11 tatsaechlich in der BSFZ-Excel (O39) - vor echten Exporten pruefen.
================================================================================
