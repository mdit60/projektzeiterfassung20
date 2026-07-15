# GIT-SICHERUNG - Session 68 (Nachtrag: FZul-Bereich geklaert + Sichtbarkeit)

**Datum:** 15. Juli 2026
**SW-Release:** V7.7.0 (unveraendert - Code-Deploy, keine DB-Aenderung)
**Pflichtenheft:** v5.21
**Branch:** main = PROD (deployed) / v7-dev
**Deploy-Stand:** **In PROD.** Sechs Dateien, ein Commit, merge v7-dev -> main (--no-ff),
push origin + cubintec, Vercel-Deploy verifiziert. KEINE DB-Migration. Gegen ein
Berater-Konto (Katrin) verifiziert: FZul erscheint dort an keiner Stelle mehr.

---

## Zusammenfassung

Nachtrag zur Haupt-Sicherung Session 68. Die dort noch als "naechstes grosses Thema"
notierte Frage nach dem Bereich Forschungszulage ist **geklaert** - und zwar aus den
eigenen Konzepten heraus: Ein eigenstaendiges FZul-Modul war seit April 2026 gar nicht
mehr vorgesehen. Der `fzul`-Tile ist eine Altlast und wurde auf den SysAdmin beschraenkt.
Zusaetzlich eine Falle im Vorhaben-Modal behoben.

**Damit ist die Aussage der Haupt-Sicherung Session 68 und des Pflichtenhefts v5.20
("Bereich Forschungszulage - ausser Firmen-Kacheln noch nichts, naechstes grosses Thema")
ueberholt.** Dieser Nachtrag ersetzt sie.

---

## Erkenntnis: Ein eigenstaendiges FZul-Modul entfaellt

Recherche in den Planungsdokumenten ergab eine klare, aber in Vergessenheit geratene
Entscheidung. **KONZEPT-KAPAZITAETSPLANUNG v1.1 (23.04.2026)** hebt das FZul-Konzept
ausdruecklich auf eine hoehere Ebene:

> "Das bisherige FZul-Konzept wird nicht verworfen, sondern auf eine hoehere Ebene
> gehoben. Die FZul-Auswertung ist eine **Spezialisierung** der allgemeinen
> Kapazitaetsplanung."

Architektur laut Konzept:

```
Kapazitaetsplanungs-Tool (KPT)
  |-- Kapazitaetsmatrix   (neu)      -- Monat/Jahr, alle MA
  |-- FZul-Auswertung     (besteht)  -- Tagesebene, behoerdenkonform
  |-- Personalplanung     (geplant)  -- Planstellen, spaetere Phase
```

Anlass war laut §1.1 eine Rueckmeldung von Katrin Kirchner: Das eigentliche Beduerfnis sei
allgemeiner - Berater wollen jederzeit die freie Kapazitaet sehen, unabhaengig vom Zweck.
§6 ist unmissverstaendlich:

> "Die FZul-Auswertung ist ein **Exportweg** aus der Kapazitaetsplanung - **nicht mehr der
> primaere Einstieg**."

**Konsequenz:** Die `fzul`-Seite (v7.3.1/v7.4.0, Januar/Februar 2026) stammt aus der Zeit
VOR diesem Konzept und wurde nie zurueckgebaut - daher bis zuletzt `coming_soon`, leerer
href und Firmen-Kacheln, die auf die nie gebaute Route `/v7/berater/fzul/firma/<id>`
zeigten (404).

**Was einem separaten FZul-Modul je zugedacht war**, steht allein in
KONZEPT-MULTIPROJEKT-FZUL v1.2 §8: "MAs ohne gefoerderte Projekte vollstaendig abbilden"
(inzwischen erledigt - Gruppe B in der Vorhaben-Detailseite) und die
**BSFZ-Bescheinigungsbeantragung** (nicht gebaut). Nur Letzteres bleibt fachlich uebrig.

**Entscheidung (Martin):** Der `fzul`-Tile wird fuer alle Berater ausgeblendet und bleibt
ausschliesslich fuer `system_admin` sichtbar - als Werkbank zur Vorbereitung eines
kuenftigen FZul-Moduls (BSFZ-Bescheinigungen; ggf. spaeter das Verteilen der freien
Kapazitaet auf konkrete FZul-Vorhaben). Der 404 dahinter bleibt bewusst bestehen.

---

## Befund: Vier duplizierte Nav-/Kachel-Listen

Die Sichtbarkeitsaenderung griff zunaechst nur halb - Ursache: Der FZul-Einstieg ist an
**vier voneinander unabhaengigen, hartkodierten Stellen** definiert, keine davon liest die
Modul-Config:

| Stelle | Datei | Mechanik |
|--------|-------|----------|
| klassische Nav | `PortalNav.tsx` | `NAV_BERATER`-Array + `isAdmin`-Filter |
| klassisches Dashboard | `berater/dashboard/page.tsx` | eigenes `kacheln`-Array |
| App-/Cockpit-Nav | `AppNav.tsx` | eigenes `navItems`-Array |
| App-Cockpit | `berater/app/cockpit/page.tsx` | hartkodierte "Kachel 4" |

Das widerspricht dem Shared-Components-Prinzip (Pflichtenheft: "Niemals Code
duplizieren"). Zusaetzlich divergieren die Listen inhaltlich:

- In `v7-module-config` sind nur **drei** der zehn Module Beraterwerkzeuge (`netzwerk`,
  `multiprojekt`, `fzul`); "Unternehmen" und "Administration" fehlen dort ganz.
- Dieselbe Kachel hat zwei ids: PortalNav `foerderung` vs. Dashboard `kunden`.
  AppNav nennt die Kapazitaetsplanung `kapazitaet`, die Config `multiprojekt`.
- Labels divergieren: Config sagt "Multiprojekt-Tool", die UI "Kapazitaetsplanung"
  (die offene §8-Umbenennung aus dem KPT-Konzept).
- Icons: Config als String (`'Layers'`), Consumer als Lucide-Komponente - und inhaltlich
  uneins (Config `Layers`, PortalNav `BarChart3`).

---

## Erledigte Punkte

### FZul-Sichtbarkeit auf system_admin beschraenkt (4 Stellen)

- `PortalNav` v7.4.4-25 -> **v7.4.4-26**: `fzul`-Nav-Item mit `isAdmin: true`
  (nutzt die vorhandene Filterlogik wie bei "Administration").
- `v7-module-config` v7.3.90-7 -> **v7.3.90-8**: `fzul`-Kachel `roles: ['system_admin']`;
  Beschreibung ehrlich gemacht ("In Vorbereitung: BSFZ-Bescheinigungen. Die Ermittlung der
  fuer die FZul freien Kapazitaet liegt in der Kapazitaetsplanung."), `plannedRelease`
  von `Q2/2026` auf `offen`.
- `berater-dashboard-page` v7.4.4-13 -> **v7.4.4-14**: FZul-Kachel im klassischen
  Dashboard nur fuer `system_admin` (Spread-Conditional im `kacheln`-Array).
- `AppNav` v1.0.1 -> **v1.0.2**: FZul-Nav-Item nur fuer `system_admin`.
- `berater-app-cockpit-page` v1.0.7 -> **v1.0.8**: "Kachel 4 - Forschungszulage" nur fuer
  `system_admin`.

### FIX: Vorhaben-Modal uebernimmt die gewaehlte Firma

- `berater-multiprojekt-page` v7.4.8-19 -> **v7.4.8-20**.
- Das Modal "Neues FZul-Vorhaben anlegen" belegte die Firma **immer** mit `companies[0]`
  (alphabetisch erste Firma), unabhaengig von der Auswahl im FIRMA-Dropdown der
  Kapazitaetsplanung. Ein Vorhaben konnte damit unbemerkt auf der **falschen Firma**
  angelegt werden.
- Neu: Prop `defaultCompanyId` (= `selectedCompanyId` der Seite). Das Formular wird beim
  **Oeffnen** zurueckgesetzt und mit dieser Firma vorbelegt - noetig, weil das Modal
  montiert bleibt (`if (!isOpen) return null` steht nach dem `useState`) und der
  Form-State sonst zwischen Oeffnen/Schliessen ueberlebt. Effekt bewusst nur von `isOpen`
  abhaengig, damit das Formular nicht mitten in der Eingabe zurueckgesetzt wird.

---

## Verifikation

- Als `system_admin`: FZul weiterhin an allen vier Stellen sichtbar (Werkbank).
- Als Berater (Katrin, PROD): FZul an **keiner** der vier Stellen mehr sichtbar - der
  rollenabhaengige Teil liess sich mit dem SysAdmin-Konto nicht abschliessend pruefen und
  wurde deshalb gegen ein echtes Berater-Konto verifiziert.
- Kapazitaetsplanung: Firmenwechsel oben -> "Neu -> FZul" uebernimmt die richtige Firma,
  auch bei mehrfachem Oeffnen.

---

## Offen / naechste Schritte

- **NEU im Backlog - Berater-Einstiege zusammenfuehren:** die vier Listen auf eine
  gemeinsame Quelle umstellen, damit ein Eintrag nicht wieder an drei Stellen vergessen
  wird. Empfehlung: **zusammen mit der offenen §8-Umbenennung** ("Multiprojekt-Tool" ->
  "Kapazitaetsplanung"), da beide dieselben Labels an denselben Stellen anfassen -
  gemeinsam ca. eine halbe bis dreiviertel Session. Voll auf `v7-module-config`
  konsolidieren waere ~1 Session, fasst aber die komplette Navigation an (Risiko).
- **Matrix-Detail-Popup (KPT §5.2) zurueckgestellt:** Die Anforderung ist faktisch
  erfuellt - der Hover-Tooltip zeigt bereits Monatskapazitaet, je Projekt geplant/verbucht
  und "Frei: X h (Y%)". Es fehlt nur ein klickbares Popup (der Tooltip hat
  `pointerEvents: 'none'`) mit dem Button "+ FZul-Auswertung erstellen". Nutzen gering:
  das Konzept dachte "Klick auf MA -> Auswertung", tatsaechlich ist ein Vorhaben heute ein
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

## Komponenten / Dateien dieses Nachtrags

**Geaendert & deployed (src/):**
- `src/components/shared/PortalNav.tsx` (v7.4.4-26)
- `src/components/shared/AppNav.tsx` (v1.0.2)
- `src/lib/v7-module-config.ts` (v7.3.90-8)
- `src/app/v7/berater/dashboard/page.tsx` (v7.4.4-14)
- `src/app/v7/berater/app/cockpit/page.tsx` (v1.0.8)
- `src/app/v7/berater/multiprojekt/page.tsx` (v7.4.8-20)

**DB:** keine Aenderung.

**Doku:**
- `GIT-SICHERUNG-v7_7_0-session68-nachtrag.md` (diese Datei)
- `PFLICHTENHEFT-v5_21.md`
