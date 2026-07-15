# GIT-SICHERUNG - Session 68 (Nachtrag: FZul-Bereich geklaert, Sichtbarkeit, Rechte)

**Datum:** 15. Juli 2026
**SW-Release:** V7.7.0 (unveraendert - Code + RLS, keine neuen Tabellen)
**Pflichtenheft:** v5.21
**Branch:** main = PROD (deployed) / v7-dev
**Deploy-Stand:** **In PROD.** Drei Deploy-Wellen (FZul-Sichtbarkeit; Modal-Firma;
Rechte + Ersteller-Anzeige), je merge v7-dev -> main (--no-ff), push origin + cubintec,
Vercel-Deploy verifiziert. **Zwei SQL-Migrationen in DEV UND PROD ausgefuehrt.**
Gegen ein Berater-Konto (Katrin) verifiziert.

---

## Zusammenfassung

Nachtrag zur Haupt-Sicherung Session 68. Drei Themen:

1. Die dort noch als "naechstes grosses Thema" notierte Frage nach dem Bereich
   Forschungszulage ist **geklaert** - aus den eigenen Konzepten heraus: Ein
   eigenstaendiges FZul-Modul war seit April 2026 gar nicht mehr vorgesehen.
2. Beim Aufraeumen der Sichtbarkeit kam ein **Strukturbefund** ans Licht (vier
   duplizierte Nav-/Kachel-Listen) und eine **Falle im Vorhaben-Modal**.
3. Ein **Rechte-Bug**: Ein Berater konnte fremde Vorhaben weder loeschen noch
   bearbeiten - beides scheiterte LAUTLOS.

**Die Aussage der Haupt-Sicherung Session 68 und des Pflichtenhefts v5.20
("Bereich Forschungszulage - ausser Firmen-Kacheln noch nichts, naechstes grosses
Thema") ist damit ueberholt.** Dieser Nachtrag ersetzt sie.

---

## 1. Erkenntnis: Ein eigenstaendiges FZul-Modul entfaellt

**KONZEPT-KAPAZITAETSPLANUNG v1.1 (23.04.2026)** hebt das FZul-Konzept ausdruecklich
auf eine hoehere Ebene:

> "Das bisherige FZul-Konzept wird nicht verworfen, sondern auf eine hoehere Ebene
> gehoben. Die FZul-Auswertung ist eine **Spezialisierung** der allgemeinen
> Kapazitaetsplanung."

```
Kapazitaetsplanungs-Tool (KPT)
  |-- Kapazitaetsmatrix   (neu)      -- Monat/Jahr, alle MA
  |-- FZul-Auswertung     (besteht)  -- Tagesebene, behoerdenkonform
  |-- Personalplanung     (geplant)  -- Planstellen, spaetere Phase
```

Anlass laut §1.1: eine Rueckmeldung von Katrin Kirchner - das eigentliche Beduerfnis sei
allgemeiner, Berater wollen jederzeit die freie Kapazitaet sehen, unabhaengig vom Zweck.
§6 ist unmissverstaendlich:

> "Die FZul-Auswertung ist ein **Exportweg** aus der Kapazitaetsplanung - **nicht mehr
> der primaere Einstieg**."

**Konsequenz:** Die `fzul`-Seite (v7.3.1/v7.4.0, Januar/Februar 2026) stammt aus der Zeit
VOR diesem Konzept und wurde nie zurueckgebaut - daher bis zuletzt `coming_soon`, leerer
href und Firmen-Kacheln auf die nie gebaute Route `/v7/berater/fzul/firma/<id>` (404).

Einem separaten FZul-Modul war je nur zugedacht (KONZEPT-MULTIPROJEKT-FZUL v1.2 §8):
"MAs ohne gefoerderte Projekte vollstaendig abbilden" (inzwischen erledigt - Gruppe B)
und die **BSFZ-Bescheinigungsbeantragung** (nicht gebaut). Nur Letzteres bleibt uebrig.

**Entscheidung (Martin):** `fzul`-Tile fuer alle Berater ausblenden, nur noch fuer
`system_admin` sichtbar - als Werkbank zur Vorbereitung eines kuenftigen FZul-Moduls
(BSFZ-Bescheinigungen; ggf. spaeter das Verteilen der freien Kapazitaet auf konkrete
FZul-Vorhaben). Der 404 dahinter bleibt bewusst bestehen.

---

## 2. Befund: Vier duplizierte Nav-/Kachel-Listen

Die Sichtbarkeitsaenderung griff zunaechst nur halb. Ursache: Der FZul-Einstieg ist an
**vier voneinander unabhaengigen, hartkodierten Stellen** definiert - keine liest die
Modul-Config:

| Stelle | Datei | Mechanik |
|--------|-------|----------|
| klassische Nav | `PortalNav.tsx` | `NAV_BERATER`-Array + `isAdmin`-Filter |
| klassisches Dashboard | `berater/dashboard/page.tsx` | eigenes `kacheln`-Array |
| App-/Cockpit-Nav | `AppNav.tsx` | eigenes `navItems`-Array |
| App-Cockpit | `berater/app/cockpit/page.tsx` | hartkodierte "Kachel 4" |

Widerspricht dem Shared-Components-Prinzip ("Niemals Code duplizieren"). Zusaetzlich
divergieren die Listen inhaltlich:

- In `v7-module-config` sind nur **drei** der zehn Module Beraterwerkzeuge (`netzwerk`,
  `multiprojekt`, `fzul`); "Unternehmen" und "Administration" fehlen dort ganz.
- Dieselbe Kachel hat zwei ids: PortalNav `foerderung` vs. Dashboard `kunden`.
  AppNav nennt die Kapazitaetsplanung `kapazitaet`, die Config `multiprojekt`.
- Labels divergieren: Config "Multiprojekt-Tool" vs. UI "Kapazitaetsplanung" (die offene
  §8-Umbenennung aus dem KPT-Konzept).
- Icons: Config als String (`'Layers'`), Consumer als Lucide-Komponente - und inhaltlich
  uneins (Config `Layers`, PortalNav `BarChart3`).

---

## 3. Rechte-Bug: Berater konnte fremde Vorhaben nicht bearbeiten

**Symptom:** Katrin klickte auf den Papierkorb, die Sicherheitsabfrage kam - und dann
passierte nichts. Keine Meldung, kein Fehler.

**Zwei Ursachen:**

**(a) Asymmetrische RLS-Policies.** LESEN war beraterfirmen-weit, SCHREIBEN/LOESCHEN
ersteller-gebunden:

```
fzul_vorhaben_berater_select : up.consultant_company_id = cc.consultant_company_id
fzul_vorhaben_berater_delete : (created_by = auth.uid())
fzul_vorhaben_berater_update : (created_by = auth.uid())
fzul_timesheets_berater_insert/update/delete : ... fv.created_by = auth.uid()
```

Katrin sah damit Vorhaben, an denen sie **nichts** tun konnte - auch Import und
Kalender-Speichern schlugen fehl, nicht nur das Loeschen.

**(b) Stille Fehlschlaege.** PostgREST liefert bei einem DELETE/UPDATE, der wegen RLS
**0 Zeilen** trifft, **keinen Fehler**. Der Code prueft nur `error` -> lief durch, lud
neu, alles stand noch da. **Lehre: Bei DELETE/UPDATE mit RLS immer `.select()` anhaengen
und pruefen, ob tatsaechlich Zeilen betroffen waren.**

**Zielbild (Vorgabe Martin):**

| | Lesen | Bearbeiten | Loeschen |
|---|---|---|---|
| Berater | alle der Beraterfirma | alle der Beraterfirma | **nur selbst angelegte** |
| SysAdmin | alle | alle | alle |

**Umgesetzt:** `SQL-MIGRATION-fzul-rls-bearbeiten-beraterfirma-v1.sql` zieht NUR die
BEARBEITEN-Policies auf die Beraterfirmen-Logik (`v7_fzul_vorhaben.UPDATE`,
`v7_fzul_timesheets.INSERT/UPDATE`). Die DELETE-Policies bleiben bewusst
ersteller-gebunden - sie waren also von Anfang an richtig. In DEV und PROD ausgefuehrt,
Soll-Bild in beiden Umgebungen verifiziert.

---

## 4. Ersteller-Anzeige (und warum eine SECURITY-DEFINER-Funktion noetig war)

Damit sofort erkennbar ist, wer Eigentuemer ist und wer loeschen kann, zeigt die
Vorhabenliste jetzt "angelegt von X". Bei zwei Beratern Beiwerk - bei einer Beratung mit
vielen Mitarbeitern der eigentliche Nutzen (wen spreche ich an?).

**Problem:** Die Liste kennt nur `created_by` (UUID). Die SELECT-Policy auf
`v7_user_profiles` lautet `(id = auth.uid())` - ein Berater darf **ausschliesslich sein
eigenes Profil** lesen.

**Die Policy laesst sich nicht einfach erweitern:** Eine Policy auf `v7_user_profiles`,
die selbst `v7_user_profiles` liest (um die eigene `consultant_company_id` zu ermitteln),
erzeugt eine **Endlosrekursion** - genau die in den Projektnotizen dokumentierte Falle.

**Loesung (Variante B, minimale Datenpreisgabe):**
`SQL-MIGRATION-beraterfirma-namen-v1.sql` legt `v7_beraterfirma_namen()` an -
`SECURITY DEFINER`, liest intern an der RLS vorbei (keine Rekursion) und gibt **nur
`id` + Anzeigename** der Kollegen der eigenen Beraterfirma zurueck. Keine E-Mail, keine
Rolle. Gleiches Muster wie das bereits vorhandene `v7_is_system_admin()`.
**Die SELECT-Policy auf `v7_user_profiles` bleibt unveraendert eng** (verifiziert).
Faellt die Funktion aus, bleibt die Liste nutzbar (Fallback "einem anderen Berater").

**Verworfen (Variante A):** Profil-SELECT fuer Kollegen derselben Beraterfirma oeffnen -
haette die ganze Profilzeile (E-Mail, Benutzername, Rolle) preisgegeben.

### UX-Entscheidung: kein rot/gruener Papierkorb

Erwogen war, den Papierkorb rot (nicht loeschbar) bzw. gruen (loeschbar) einzufaerben.
Verworfen: **Rot bedeutet konventionell "destruktive Aktion"** - deshalb sind
Loeschen-Buttons rot - und nicht "verboten"; das haette gegen die Nutzererwartung
gearbeitet (Rot = "das ist der Loeschknopf"). Gruen ist fuer Loeschen semantisch schief.
Farbe als einzige Information ist zudem nicht barrierefrei. Stattdessen: **ausgegrauter
Papierkorb** (`text-gray-200`, `cursor-not-allowed`) + Tooltip mit Namen - das etablierte
Signal fuer "nicht verfuegbar". Klickbar bleibt er, damit die erklaerende Meldung kommt.

---

## 5. Weitere erledigte Punkte

### FZul-Sichtbarkeit auf system_admin beschraenkt (4 Stellen)

- `PortalNav` v7.4.4-25 -> **v7.4.4-26**: `fzul`-Nav-Item mit `isAdmin: true`.
- `v7-module-config` v7.3.90-7 -> **v7.3.90-8**: `roles: ['system_admin']`; Beschreibung
  ehrlich gemacht; `plannedRelease` `Q2/2026` -> `offen`.
- `berater-dashboard-page` v7.4.4-13 -> **v7.4.4-14**: FZul-Kachel nur `system_admin`.
- `AppNav` v1.0.1 -> **v1.0.2**: FZul-Nav-Item nur `system_admin`.
- `berater-app-cockpit-page` v1.0.7 -> **v1.0.8**: "Kachel 4" nur `system_admin`.

### FIX: Vorhaben-Modal uebernimmt die gewaehlte Firma

- `berater-multiprojekt-page` v7.4.8-19 -> **v7.4.8-20**.
- Das Modal belegte die Firma **immer** mit `companies[0]` (alphabetisch erste),
  unabhaengig vom FIRMA-Dropdown -> Vorhaben konnten unbemerkt auf der **falschen Firma**
  angelegt werden. Neu: Prop `defaultCompanyId` (= `selectedCompanyId`); Formular wird
  beim **Oeffnen** zurueckgesetzt und vorbelegt (noetig, weil das Modal montiert bleibt -
  `if (!isOpen) return null` steht nach dem `useState` - und der State sonst ueberlebt).
  Effekt bewusst nur von `isOpen` abhaengig, damit er nicht mitten in der Eingabe greift.

### Loeschen: Ersteller-Pruefung, Meldung, Optik (v7.4.8-21 bis -25)

- **-21:** Vorab-Pruefung (nur Ersteller oder `system_admin`) -> sofortiger Hinweis OHNE
  vorherige Sicherheitsabfrage; DELETE mit `.select('id')` -> 0 Zeilen werden gemeldet.
- **-22:** SPRACHKONVENTION - Text auf durchgaengig generisches Maskulinum. Vorher war er
  inkonsistent halb gegendert ("Beraterin bzw. Berater", aber "Ersteller"/
  "System-Administrator").
- **-23:** Papierkorb bei fremden Vorhaben ausgegraut + Tooltip; Berechtigung zentral in
  `darfVorhabenLoeschen()` (Optik und Funktion koennen nicht auseinanderlaufen).
- **-24:** Ersteller-Anzeige "angelegt von X" via `v7_beraterfirma_namen()`; Tooltip und
  Meldung nennen den Namen.
- **-25:** `title`-Attribut auf der Ersteller-Zeile (Spalte ist schmal, Name wird
  gekuerzt) -> voller Name beim Hovern.

---

## 6. NEUE KONVENTION: Sprache (Vorgabe Martin)

In **allen** UI-Texten, Meldungen, Beschreibungen, Dokumenten und Anleitungen wird
durchgaengig **nur ein Genus** verwendet - generisches Maskulinum (der User,
Administrator, Berater, Anwender, Ersteller). Keine Doppelnennungen, keine
Gender-Sonderzeichen. Gehoert in die Projekt-Anweisungen.

---

## 7. Befund: display_name-Konvention DEV vs. PROD

`v7_user_profiles.display_name` folgt in den Umgebungen unterschiedlichen Konventionen:

```
PROD: "Ditscherlein, Martin" / "Kirchner, Katrin"   -> Nachname, Vorname
DEV : "Martin Ditscherlein"  / "Katrin Kirchner"    -> Vorname Nachname
```

**DEV ist der Ausreisser, nicht PROD.** Der Code schreibt die Konvention bereits korrekt
(`ConsultantManagement.tsx:296` -> `last_name || ', ' || first_name`;
`EmployeeManagement.tsx:839` analog fuer `v7_employees`). Auch `v7_employees` folgt ihr
durchgaengig ("Bohlmann, Jens"), und der BSFZ-Excel-Export verlaesst sich darauf (splittet
`empName` am Komma). Die DEV-Werte stammen aus frueher manueller Anlage.

**Entscheidung:** Konvention ist **"Nachname, Vorname"** (auch weil der Nachname bei der
unvermeidlichen Kuerzung in der schmalen Spalte sichtbar bleibt). Nur DEV wird angeglichen:
`SQL-DATENKORREKTUR-dev-display-name-konvention-v1.sql` (Preview + UPDATE + Kontrolle).
**Kein Code-Fix noetig.** Relevant fuer kuenftige PROD->DEV-Syncs.

---

## 8. Offen / naechste Schritte

- **NEU im Backlog - Berater-Einstiege zusammenfuehren:** die vier Listen auf eine
  gemeinsame Quelle umstellen, damit ein Eintrag nicht wieder an drei Stellen vergessen
  wird. Empfehlung: **zusammen mit der offenen §8-Umbenennung** ("Multiprojekt-Tool" ->
  "Kapazitaetsplanung") - beide fassen dieselben Labels an denselben Stellen an;
  gemeinsam ca. halbe bis dreiviertel Session. Volle Konsolidierung auf
  `v7-module-config` ~1 Session, fasst aber die komplette Navigation an (Risiko).
- **Detailseite nachziehen:** `multiprojekt/[id]` prueft bei Import und `handleSaveMonat`
  nur `error`, nicht ob Zeilen geschrieben wurden - dieselbe stille Falle wie in (3b).
  Nach der RLS-Migration entschaerft (Berater darf schreiben), aber sauberer waere
  `.select()` auch dort.
- **Matrix-Detail-Popup (KPT §5.2) zurueckgestellt:** faktisch erfuellt - der
  Hover-Tooltip zeigt bereits Monatskapazitaet, je Projekt geplant/verbucht und
  "Frei: X h (Y%)". Es fehlt nur ein klickbares Popup (Tooltip hat
  `pointerEvents: 'none'`) mit "+ FZul-Auswertung erstellen". Nutzen gering: das Konzept
  dachte "Klick auf MA -> Auswertung", tatsaechlich ist ein Vorhaben heute ein
  FuE-Vorhaben mit Titel/Wirtschaftsjahr/mehreren MA - der Dialog waere fast derselbe.
- **Weiterhin offen aus dem KPT-Konzept:** dynamischer Planungshorizont aus
  Projektlaufzeiten (§3) statt fixer 3 Jahre; Personalplanung/Planstellen (§7, eigene
  Phase, neue Tabelle `v7_planned_employees`).
- **Unveraendert offen:** Enum-Vereinheitlichung DEV/PROD (`v7_funding_format`,
  Richtung B); Multijahr-Feinschliff (Tagesarbeitszeit je Jahr aus Teilzeit-Historie);
  spaeter/separat: freie FZul-Kapazitaet intelligent auf konkrete FZul-Vorhaben verteilen
  (neue Funktion, gehoert fachlich in ein kuenftiges FZul-Modul).
- **404 hinter dem FZul-Tile** bleibt bewusst bestehen (nur SysAdmin sieht ihn).

---

## 9. Komponenten / Dateien dieses Nachtrags

**Geaendert & deployed (src/):**
- `src/components/shared/PortalNav.tsx` (v7.4.4-26)
- `src/components/shared/AppNav.tsx` (v1.0.2)
- `src/lib/v7-module-config.ts` (v7.3.90-8)
- `src/app/v7/berater/dashboard/page.tsx` (v7.4.4-14)
- `src/app/v7/berater/app/cockpit/page.tsx` (v1.0.8)
- `src/app/v7/berater/multiprojekt/page.tsx` (v7.4.8-25, kumuliert -20 bis -25)

**DB (DEV + PROD ausgefuehrt):**
- `SQL-MIGRATION-fzul-rls-bearbeiten-beraterfirma-v1.sql`
- `SQL-MIGRATION-beraterfirma-namen-v1.sql`

**DB (nur DEV):**
- `SQL-DATENKORREKTUR-dev-display-name-konvention-v1.sql`

**Doku:**
- `GIT-SICHERUNG-v7_7_0-session68-nachtrag.md` (diese Datei)
- `PFLICHTENHEFT-v5_21.md`
