# GIT-SICHERUNG - Session 51

**Datum:** 03. Juni 2026 (Nachtrag 05. Juni 2026)
**SW-Release:** V7.4.9
**Pflichtenheft:** v5.00
**Branch:** v7-dev -> main (deployed)

---

## Zusammenfassung

Firmen-Lebenszyklus im App-Paradigma vervollstaendigt (Deaktivieren + Reaktivieren),
Schutz gegen E-Mail-Tippfehler bei Mitarbeiter-Neuanlage, und ein geloester
PROD-Login-Incident (Kunde Luebeck Yacht).

---

## Erledigte Anforderungen

### A-020 - Firmen-Deaktivierung im App-Paradigma
- **Datei:** `src/components/shared/FirmaCockpit.tsx` -> **v7.4.9-31**
- Trash2-Icon in der Firmendaten-Karte neben dem Stift, nur Berater-Portal (alle Berater).
- Bestaetigungsdialog, Wording analog klassische Foerderung-Seite.
- DB-Update wie klassische handleDelete: `is_active=false, status=inactive, updated_at`.
- Nach Erfolg Rueck-Navigation ins App-Cockpit (`/v7/berater/app/cockpit`) bzw.
  `/v7/berater/foerderung` im Classic-Mode.
- Soft-Delete - wiederherstellbar ueber A-023.

### A-023 - Firmen-Reaktivierung im App-Cockpit (NEU, Gegenstueck zu A-020)
- **Datei:** `src/app/v7/berater/app/cockpit/page.tsx` -> **v1.0.7**
- Zweite Query auf `status=inactive` (bestehendes `load()` unangetastet).
- Aufklappbarer Bereich "Inaktive Firmen (N)" unter "Neues Unternehmen anlegen",
  nur sichtbar wenn inaktive Firmen existieren.
- Pro Firma RotateCcw-Wiederherstellen-Button + Bestaetigungsdialog.
- DB-Update analog klassisch: `is_active=true, status=active, updated_at`.
- Nach Erfolg reiner Client-State-Update (Firma wandert zurueck in den Dropdown,
  Zaehler hoch, kein Reload).

### A-024 - Schutz gegen E-Mail-Tippfehler bei MA-Neuanlage (NEU)
- **Dateien:**
  - `src/components/shared/MitarbeiterModal.tsx` -> **v1.0.2** (App-Paradigma)
  - `src/components/shared/EmployeeManagement.tsx` -> **v7.3.95-18** (klassisch)
- Zweites Bestaetigungsfeld "E-Mail bestaetigen", nur im Anlage-Modus.
- Live-Abgleich (kleingeschrieben + getrimmt): roter Hinweis + Anlegen-Button
  gesperrt bei Abweichung; harte Pruefung in handleSave.
- Paste im Bestaetigungsfeld gesperrt (`onPaste preventDefault`).
- Hintergrund: Die Login-E-Mail wird beim Anlegen in `v7_employees.email` gesetzt;
  `create-employee-login` uebernimmt sie von dort (kein erneutes Tippen) - daher ist
  das Anlage-Formular die einzige noetige Schutzstelle.

---

## PROD-Incident (geloest, kein Code-Item)

**Symptom:** Kunde Luebeck Yacht (`t.schulze-hagenest@luebeckyacht.de`, Till
Schulze-Hagenest) kam mit korrekten Daten nicht in seinen Zugang, Meldung
"Invalid login credentials".

**Diagnoseweg (Schritt fuer Schritt):**
1. Browser-Verdacht ausgeschlossen - der Kunde scheiterte auch in Firefox; Opera
   war nur das Reproduktions-Tool.
2. Network-Tab (Opera): POST an `cnnuyioklhlrfygwticf.supabase.co/auth/v1/token`,
   Status 400, `X-Sb-Error-Code: invalid_credentials`.
3. Erkenntnis: "funktioniert in Martins Firefox" beruhte auf einer alten Session
   (Network-Tab dort leer), nicht auf einer frischen Passwort-Pruefung.
4. SQL im PROD-Projekt: `auth.users WHERE email ILIKE '%schulze-hagenest%'` ->
   **no rows**. Account unter dieser Schreibweise nicht vorhanden.
5. **Ursache:** E-Mail beim Anlegen mit Doppel-N (`hagennest`) statt Ein-N
   (`hagenest`) getippt. Auth-Lookup fand den Account nie - daher griffen auch
   alle Passwort-Resets ins Leere.

**Korrektur:**
- Auth-Admin-API: `PUT /auth/v1/admin/users/0b0114ac-fa75-4157-bf8b-1b237013e600`
  mit `{"email":"t.schulze-hagenest@luebeckyacht.de","email_confirm":true}`.
- App-Tabellen nachgezogen (User-ID 0b0114ac...):
  `v7_user_profiles.email` und `v7_employees.email` per UPDATE auf Ein-N.
- Login danach OK, Kunde landet korrekt im Firmen-Portal.

**Bewusst belassen:** Interne Restkopie der Doppel-N-Adresse in
`auth.identities` / `user_metadata`. Fuer den Passwort-Login irrelevant (durch den
erfolgreichen Login bewiesen, der mit Ein-N gegen die stale Identity lief); das
geschuetzte `auth`-Schema ist ueber den SQL-Editor nicht schreibbar, und ein
Erzwingen (Identity/User loeschen+neu) traegt Risiko fuer den Live-Account mit
Fremdschluesseln. Cosmetic, kein Funktionsbezug.

---

## Hochgestuft

### A-013 - von "5-Min-Win" auf Legacy-Cluster
Beim Verifizieren vor dem Loeschen entdeckt: `v7/firmen/[id]/page.tsx` wird von
`v7/page.tsx` (selbst tot, v7.0.0) referenziert, und die **aktive** Seite
`v7/berater/foerderung/import/page.tsx` pusht noch 2x auf `/v7`. Zusaetzlich ein
Datei-Duplikat `v7/import/page 2.tsx` (Leerzeichen im Namen). Nicht loeschbar ohne
Navigationsentscheidung (wohin sollen die `router.push('/v7')` zeigen, vermutlich
`/v7/berater/foerderung`) und Klaerung, welche der drei Import-Dateien aktiv ist.
-> Eigene fokussierte Aufraeum-Session mit `pnpm build`-Gegencheck. **Heute bewusst
nicht angefasst.**

---

## Deploy

- Keine DB-Migration (bestehende Spalten `is_active`/`status`, Rest Frontend).
- Commit auf v7-dev, Merge nach main (`--no-ff --no-edit`), Vercel-Build auf main.
- PROD verifiziert: Deaktivieren/Reaktivieren im Cockpit OK, E-Mail-Bestaetigung
  sperrt bei Abweichung.

## Nachtrag (05.06.2026) - Navigations-Feinschliff App-Paradigma + Deploy-Infrastruktur

Beim Durchklicken des App-Modus auf PROD fielen nach dem Haupt-Deploy noch drei Punkte auf:

### A-025 - "Unternehmen"-Tab im App-Modus fuehrte auf die alte Firmenliste (NEU, erledigt)
- **Datei:** `src/components/shared/PortalNav.tsx` -> **v7.4.4-24**
- Problem: Vom Cockpit auf Netzwerk/Kapazitaetsplanung, dann "Unternehmen" -> landete auf
  der alten Auswahlseite (`/foerderung/firma/select/cockpit`) statt im App-Cockpit.
- Loesung: Der "Unternehmen"-Tab wird im App-Modus (`pze_mode='app'`) komplett ausgeblendet.
  Zugang zur Firmenauswahl ausschliesslich ueber das Home-Icon -> App-Cockpit. Damit ist die
  App-Nav auf allen Seiten identisch zur Cockpit-Nav (AppNav). Classic-Modus unveraendert.

### A-006 (Teil) - Header-Vereinheitlichung der FZul-Seite (erledigt; Modul-Ausbau bleibt offen)
- **Datei:** `src/app/v7/berater/fzul/page.tsx` -> **v7.4.9-2**
- VERSIONSNUMMER-KORREKTUR (05.06., beim PV-Aufraeumen entdeckt): Zunaechst als v7.3.1-1 auf
  Basis der live-v7.3.1 erstellt. In downloads/ lag aber bereits eine VERWORFENE v7.4.9-1
  (halbfertiger Header-Umbau aus Session 49, per git restore verworfen - A-017): ASCII-mangled
  Bundeslaender/UI-Texte, redundante v7_consultant_companies-Query/companyName-Prop, fehlendes
  hideNavigation (-> doppelte Nav), totes handleLogout. Da v7.4.9-1 die hoechste vorhandene
  Nummer war, neu herausgegeben als v7.4.9-2 (Code unveraendert gegenueber v7.3.1-1). Die
  verworfene v7.4.9-1 und die Zwischen-v7.3.1-1 wandern aus downloads/ nach archiv/.
- Eigenstaendige Kopfzeile (Ozeanblau #0369a1, "Zurueck"-Button, eigenes Logout, KEINE
  Navi-Zeile) ersetzt durch Standard-Muster PortalHeader (hideNavigation) + PortalNav.
- Folge: korrektes Berater-Blau #002451, Navigationszeile vorhanden, Rueckkehr ins Cockpit
  ueber Home-Icon. `companyName`-Prop bewusst NICHT uebergeben (PortalHeader laedt eigene
  Firma selbst). Umlaute in allen sichtbaren UI-Texten erhalten (kein ae/oe/ue).
- Entfernt: COLORS-Konstante + handleLogout (nur von der alten Kopfzeile genutzt).
- VERBLEIBT OFFEN unter A-006: FZul-Modul-Ausbau (Analyse/Multiprojekt-Zuordnung).
  "Analyse starten" fuehrt weiterhin ins Leere (404) - Modul in Vorbereitung.

### Deploy-Infrastruktur - ZWEI Remotes (Prozess-Korrektur)
- PROD haengt NICHT an `origin` (mdit60/projektzeiterfassung20 = Dev-Repo), sondern am Remote
  `cubintec` (kkcub/pze-cubintec). Ein Push nur auf `origin/main` deployt NICHTS auf
  pze.itenion.com.
- Symptom heute: PortalNav-Fix lag auf `origin/main`, Production zeigte nichts. Nach
  `git push cubintec main` (sauberer Fast-Forward `0e7b862..ac90647`) lief der Deploy.
- KORRIGIERTES DEPLOY-RITUAL: Beim PROD-Deploy IMMER auf BEIDE Remotes pushen:
  `git push origin main && git push cubintec main`.

---

## Komponentenversionen (Stand Session 51, inkl. Nachtrag 05.06.)
| Komponente | Version |
|---|---|
| FirmaCockpit | v7.4.9-31 |
| berater-app-cockpit-page | v1.0.7 |
| MitarbeiterModal | v1.0.2 |
| EmployeeManagement | v7.3.95-18 |
| PortalNav | v7.4.4-24 |
| berater-fzul-page | v7.4.9-2 |

## Offene Punkte (Stand Ende Session 51)
| ID | Thema | Status |
|---|---|---|
| A-001 | Berater-Portal Benutzerhandbuch (PDF/Wording) | In Arbeit |
| A-006 | FZul-Modul ausbauen (Analyse/Multiprojekt-Zuordnung) | Teil-erledigt: Header-Vereinheitlichung der fzul-Seite umgesetzt (berater-fzul-page v7.4.9-2, 05.06.). Modul-Ausbau offen |
| A-007 | De-minimis-Beihilfen-Modul | Offen |
| A-012 | Standalone Stundennachweis-/Projektfortschritt-Seiten | Offen |
| A-013 | Legacy-Cluster aufraeumen (firmen/[id] + v7/page + import) | Offen (hochgestuft) |
| A-019 | Namens-Vereinheitlichung K/C (kosmetisch, Bruchrisiko) | Offen |
