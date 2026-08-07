# GIT-SICHERUNG - Session 73

**Datum:** 31. Juli 2026
**SW-Release:** V7.8.0 (VN-Modul - Verwendungsnachweis als reine Zahlenseite, alle De-minimis-Varianten + NWM, Freigabe je Firma - in PRODUKTION)
**Pflichtenheft:** v5.30
**Branch:** main = PROD (deployed) / v7-dev
**Deploy-Stand:** **V7.8.0 ist in PROD.** Zwei SQL-Migrationen in PROD ausgefuehrt (Snapshot-Tabelle + Freigabe-Spalte), merge v7-dev -> main (--no-ff), push origin + cubintec, Vercel-Deploy auf pze.cubintec-hub.com. In PROD mit echten Daten getestet (WerftScan DS De-minimis).

---

## Anlass

Neues Modul: Fuer den Verwendungsnachweis (VN) gegenueber der Foerderstelle (VDI/VDE-IT) wird je
Projekt eine Zusammenfassung ALLER Zahlungsanforderungen (ZA) benoetigt. Der VN wird als reine
**Zahlenseite** aufbereitet (der Sachbericht/Teil 2 wird direkt im offiziellen PDF geschrieben und
ist bewusst NICHT im System). Umgesetzt fuer alle **De-minimis-Varianten**; AGVO bleibt aussen vor
(wird direkt im PDF ausgefuellt).

---

## Erledigte Punkte

### 1. VN-Kernlogik (Aggregation aller ZA je Projekt)

- Neue Lib `verwendungsnachweis-utils.ts` (**v1.2-1**). `computeVNSchluss(projectId, von, bis, data)`
  erkennt die Variante ueber `funding_format` (+ bei Netzwerk `netzwerk_phase`) und liefert
  Kostenzeilen, Summe, Finanzierung und Warnungen.
- **Varianten:**
  - **DS De-minimis** (`ZIM_DS`): 6 Zeilen (Personal T/NT, Zuschlag uebrige Kosten T/NT, Auftraege
    an Dritte T/NT). Personalkosten 1:1 aus ZAPanel-Rechnung (Zeiterfassung), Zuschlag aus
    overhead_t/overhead_nt - Prozentsaetze DYNAMISCH aus den Projektdaten in den Labels.
  - **Einzel-/Kooperationsprojekt** (`ZIM_EINZEL`, `ZIM_KOOP`, `ZIM`): Personalkosten,
    Zuschlag uebrige Kosten (%), Auftraege 6.3a, FuE-Auftraege 6.3b, FuE-Personalaufnahme 6.3c.
  - **Netzwerk (NWM) Phase 1 + 2** (`ZIM_NETZWERK`): aggregiert die je ZA GESPEICHERTEN NWM-Werte
    (nwm_personalkosten, nwm_kosten_dritte, nwm_kosten_uebrige, nwm_kosten_gesamt,
    foerderbetrag_gesamt) - KEINE Neuberechnung, weil jeder ZA seinen eigenen Foerdersatz je
    Laufzeitjahr traegt (Phase 1/2 fallend). Zeilen: Personalkosten, Auftraege an Dritte, Uebrige
    Kosten (pauschal 100% der Personalkosten). Finanzierung zusaetzlich mit **Eigenanteil**
    (Gesamt - Foerderbetrag); Kopf-Foerdersatz = effektiver Mischsatz ueber alle Laufzeitjahre.
    Phase-Erkennung aus `netzwerk_phase` ('2'/'umsetzung' -> Phase 2, sonst Phase 1).
- Synthetische Tests bestanden (NWM Phase-2-Erkennung, Summe, Zuwendung, Eigenanteil, Mischsatz;
  DS/EP-Regression unveraendert).

### 2. VN-Oberflaeche

- `VerwendungsnachweisPanel.tsx` (**v1.2-2**): Kopf (FKZ, Kurzbez., Bescheiddatum, editierbarer
  Berichtszeitraum, Foerdersatz, Anzahl ZA), Kostentabelle A, Finanzierung B (inkl. NWM-Eigenanteil),
  Speichern (Snapshot je project+art), Drucken. Layout: Inhalt auf dokumentaehnliche Breite begrenzt
  und zentriert (max-w-5xl mx-auto); Kopf entzerrt (Berichtszeitraum ueber zwei Spalten, kein
  Ueberlappen mit Foerdersatz).
- `VerwendungsnachweisSeite.tsx` (**v1.2-2**): selbstladend (auch ABGESCHLOSSENE Projekte, da VN nach
  Projektende), laedt De-minimis- + Netzwerk-Projekte; Firmen-Guard (siehe 4.).
- Route-Seiten (**v1.0-2**, Next.js-15-Suspense-Wrapper um useSearchParams):
  - `/v7/berater/foerderung/firma/[id]/verwendungsnachweis`
  - `/v7/berater/app/firma/[id]/verwendungsnachweis`
  - `/v7/firma/verwendungsnachweis`

### 3. Einstiegspunkte

- `FirmaCockpit.tsx` (**v7.4.9-36-10**): VN-Kachel bei aktiven UND abgeschlossenen Projekten
  (Formate ZIM_EINZEL/ZIM_KOOP/ZIM/ZIM_DS/ZIM_NETZWERK); im Firmen-Portal nur bei freigeschalteter
  Firma (siehe 4.), Berater-Portal immer.
- `ProjectDetailPage.tsx` (**v7.4.4-63**): VN-Button in der Tab-Leiste (neben Zahlungsanforderungen),
  gleiche Freigabe-Regel.

### 4. Freigabe je Firma (Feature-Schalter)

- Neue Spalte `v7_client_companies.vn_firma_freigeschaltet` (Default false).
- `SystemConfigPanel.tsx` (**v7.4.4-3**): neuer Administrations-Abschnitt "Verwendungsnachweis -
  Freigabe je Firma" (nur system_admin) - Firmenliste mit Suche + Toggle je Firma, Speichern sofort.
- Regel: Berater-Portal IMMER frei (zum internen Testen); Firmen-Portal (Kacheln, Button, VN-Seite)
  nur bei `vn_firma_freigeschaltet = true`. VN-Seite zeigt sonst einen Sperr-Hinweis (Schutz gegen
  Deep-Links). Setzen aktuell nur SystemAdmin (spaeter optional Berater erweiterbar -> Datenmodell
  bleibt gleich). Grundlage fuer spaetere Basic/Advanced/Pro-Feature-Matrix.

### 5. Layout ZA-Deckblatt

- `ZAPanel.tsx` (**v7.4.4-63**): Deckblatt (Seite 5) auf gleiche dokumentaehnliche Breite begrenzt
  und zentriert (max-w-5xl mx-auto). Anlage 1a/1b (Matrizen mit overflow-x-auto) bleiben voll breit.

### Konventionen

- Alle .ts/.tsx ASCII-konform geprueft (Umlaute als \\u-Escapes im JS, HTML-Entities im JSX).
- `pnpm build` in DEV fehlerfrei (u. a. Suspense-Fix an den VN-Route-Seiten).

---

## DB-Migrationen (DEV + PROD ausgefuehrt)

1. **SQL-MIGRATION-verwendungsnachweis-snapshot-v1.sql** - legt `v7_verwendungsnachweise` an
   (art, variante inkl. NW_PH1/NW_PH2, formular_version, berichtszeitraum, zahlen_snapshot jsonb,
   summe_kosten, zuwendung_gesamt, status; unique (project_id, art); 4 RLS-Policies via
   v7_can_access_client / v7_is_consultant / v7_get_user_role) und sichert `beihilfe_basis`.
   PROD-Kontrolle: rls_aktiv=true, policies=4.
2. **SQL-MIGRATION-vn-firma-freigabe-v1.sql** - fuegt `vn_firma_freigeschaltet boolean not null
   default false` zu `v7_client_companies` hinzu. PROD-Kontrolle: alle Firmen false.

---

## Code-Integration (Status) - Session 73

| Datei (downloads) | Ziel in src/ | Status |
|---|---|---|
| verwendungsnachweis-utils-v1_2-1.ts | src/lib/verwendungsnachweis-utils.ts | INTEGRIERT + DEPLOYED |
| VerwendungsnachweisPanel-v1_2-2.tsx | src/components/shared/VerwendungsnachweisPanel.tsx | INTEGRIERT + DEPLOYED |
| VerwendungsnachweisSeite-v1_2-2.tsx | src/components/shared/VerwendungsnachweisSeite.tsx | INTEGRIERT + DEPLOYED |
| FirmaCockpit-v7_4_9-36-10.tsx | src/components/shared/FirmaCockpit.tsx | INTEGRIERT + DEPLOYED |
| ProjectDetailPage-v7_4_4-63.tsx | src/components/shared/ProjectDetailPage.tsx | INTEGRIERT + DEPLOYED |
| ZAPanel-v7_4_4-63.tsx | src/components/shared/ZAPanel.tsx | INTEGRIERT + DEPLOYED |
| SystemConfigPanel-v7_4_4-3.tsx | src/components/shared/SystemConfigPanel.tsx | INTEGRIERT + DEPLOYED |
| berater-verwendungsnachweis-page-v1_0-2.tsx | src/app/v7/berater/foerderung/firma/[id]/verwendungsnachweis/page.tsx | INTEGRIERT + DEPLOYED |
| berater-verwendungsnachweis-page-v1_0-2.tsx | src/app/v7/berater/app/firma/[id]/verwendungsnachweis/page.tsx | INTEGRIERT + DEPLOYED |
| firma-verwendungsnachweis-page-v1_0-2.tsx | src/app/v7/firma/verwendungsnachweis/page.tsx | INTEGRIERT + DEPLOYED |

Legende: INTEGRIERT = per `cp` nach `src/` uebernommen; DEPLOYED = via v7-dev -> main in PROD.

---

## Deploy V7.8.0

- PROD-Datenbank zuerst: beide SQL-Skripte im Supabase-SQL-Editor der PROD-Instanz ausgefuehrt
  (Snapshot-Tabelle, dann Freigabe-Spalte), jeweils mit Lese-Kontrolle bestaetigt.
- Code: Commit auf v7-dev, `git checkout main`, `git merge --no-ff v7-dev`, `git push origin main`,
  `git push cubintec main`. Vercel-Deploy (Production, projektzeiterfassung20, main) automatisch.
- Test in PROD: VN als Berater fuer echtes Projekt geoeffnet (WerftScan, DS De-minimis) - Kostenzeilen,
  Summe und Finanzierung plausibel; mehrere Firmen geprueft. Firmen-Admins: VN ueberall gesperrt
  (Default), Freischaltung je Firma spaeter in Administration.

---

## Lehren

- **Aggregation statt Neuberechnung bei NWM:** Der pro ZA gespeicherte Foerderbetrag traegt den
  jahresabhaengigen Foerdersatz bereits in sich - Summieren der gespeicherten NWM-Felder ist damit
  automatisch korrekt und robuster als ein Nachbauen der Phasen-/Jahres-Logik.
- **Freigabe als Sichtbarkeits-Gate, Berater immer frei:** So kann intern getestet werden, bevor
  ein Firmen-Admin das Feature sieht. Ein einzelner Boolean je Firma ist die kleinste Grundlage, aus
  der spaeter eine Abo-/Feature-Matrix wachsen kann, ohne das Datenmodell zu aendern.
- **Next.js 15 + useSearchParams:** Client-Seiten, die statisch pre-rendern, muessen useSearchParams
  in eine <Suspense>-Grenze wickeln, sonst bricht `pnpm build` beim Prerender. Muster: Inhalt in eine
  innere Komponente auslagern, Default-Export rendert sie in Suspense (analog ZASeite-Route).
- **Breite als Layout-Frage, nicht als Datenfrage:** Volle Fensterbreite zog die Wertespalte weit
  nach rechts; max-w-5xl + mx-auto (und Kopf ueber zwei Spalten) loesen das ohne Logikaenderung.

---

## Offen / naechste Schritte

- **VN-Freischaltung je Firma** im Live-Betrieb setzen, sobald eine Firma ihren Admins den VN zeigen
  soll (Administration -> "Verwendungsnachweis - Freigabe je Firma").
- **Feature-/Abo-Konzept (Basic/Advanced/Pro):** aus dem einen Boolean je Firma eine Feature-Matrix
  entwickeln; VN als erstes Pro-Merkmal-Kandidat.
- **AGVO-VN:** bewusst nicht im System (direkt im PDF). Falls spaeter gewuenscht, eigener Zweig.

Uebernommen aus Session 72 (unveraendert offen): Enum-Vereinheitlichung DEV/PROD
(`v7_funding_format`), Berater-Einstiege konsolidieren, Multijahr-Feinschliff, BSFZ-Bescheinigung,
"freie" FZul-Zeit verteilen. Backlog: A-001, Manuals-Nachzug, Datenhygiene Loesch-Kaskade, A-034-Rest,
'Assistenz GL'-Rolle, Max-foerderbare-Stunden-Chip.

---

## Komponenten / Dateien dieser Session

**Geaendert/neu & deployed (src/):**
- `src/lib/verwendungsnachweis-utils.ts` (v1.2-1) - NEU
- `src/components/shared/VerwendungsnachweisPanel.tsx` (v1.2-2) - NEU
- `src/components/shared/VerwendungsnachweisSeite.tsx` (v1.2-2) - NEU
- `src/app/v7/berater/foerderung/firma/[id]/verwendungsnachweis/page.tsx` (v1.0-2) - NEU
- `src/app/v7/berater/app/firma/[id]/verwendungsnachweis/page.tsx` (v1.0-2) - NEU
- `src/app/v7/firma/verwendungsnachweis/page.tsx` (v1.0-2) - NEU
- `src/components/shared/FirmaCockpit.tsx` (v7.4.9-36-10)
- `src/components/shared/ProjectDetailPage.tsx` (v7.4.4-63)
- `src/components/shared/ZAPanel.tsx` (v7.4.4-63)
- `src/components/shared/SystemConfigPanel.tsx` (v7.4.4-3)

**DB:**
- `SQL-MIGRATION-verwendungsnachweis-snapshot-v1.sql` (DEV + PROD)
- `SQL-MIGRATION-vn-firma-freigabe-v1.sql` (DEV + PROD)

**Doku:**
- `PFLICHTENHEFT-v5_30.md` (VN-Modul + Freigabe je Firma, §13-Eintrag v5.30)
- `GIT-SICHERUNG-v7_8_0-session73.md` (diese Datei)
- `ARBEITSWEISE-MIT-MARTIN.md` (Projekt-Notiz: Schritt-fuer-Schritt-Anleitung, keine Fliesstexte)
