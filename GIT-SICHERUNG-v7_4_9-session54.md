# GIT-SICHERUNG - Session 54

**Datum:** 22. Juni 2026
**SW-Release:** V7.4.9
**Pflichtenheft:** v5.05
**Branch:** v7-dev -> main (deployed, beide Remotes gepusht)

---

## Zusammenfassung

Eine Luecke im neuen App-Cockpit geschlossen: dort liess sich fuer einen
Mitarbeiter ohne Portal-Login KEIN Login anlegen. Das Schluessel-Icon war fest
auf "Passwort zuruecksetzen" verdrahtet und zeigte bei einem MA ohne `user_id`
nur eine Sackgassen-Meldung ("noch keinen Portal-Login ... bitte ueber die
Mitarbeiterverwaltung"). Die Login-Anlage existierte bisher nur in der alten
Komponente EmployeeManagement (Weg ueber Firmendaten > Mitarbeiter); das
schlanke MitarbeiterModal des Cockpits kannte nur die Modi new/edit/password.

Loesung (A-031): Das Schluessel-Icon macht jetzt automatisch das Richtige. Bei
einem MA ohne Login zeigt das Modal ein "Login erstellen"-Formular und legt den
Login ueber die bereits vorhandene atomare Route `/api/v7/create-employee-login`
an; bei vorhandenem Login bleibt es beim Passwort-Reset. Der Tooltip und die
Hover-Farbe des Icons sind passend dynamisch. Keine neue Backend-Logik, keine
DB-Migration.

---

## Erledigte Anforderungen

### A-031 - Login-Erstellung im App-Cockpit

**Dateien:**
- `src/components/shared/MitarbeiterModal.tsx` -> **v1.0.3**
- `src/components/shared/FirmaCockpit.tsx` -> **v7.4.9-36**

- Bedarf: Im neuen App-Cockpit (`/v7/berater/app/firma/[id]`) konnte man einen MA
  anlegen, aber ihm keinen Portal-Login geben. Erwartet wurde: Schluessel-Icon
  druecken -> Login wird angelegt (analog zum funktionierenden Weg ueber
  Firmendaten > Mitarbeiter / EmployeeManagement).
- Ursache: Session 52 (v7.4.9-26) hat EmployeeManagement aus dem FirmaCockpit
  entfernt und durch das leichte MitarbeiterModal ersetzt. Dieses Modal hatte nur
  die Modi new/edit/password; einen "Login erstellen"-Modus gab es nicht. Das
  Schluessel-Icon rief immer den Passwort-Modus auf, der bei fehlender `user_id`
  in einer Sackgassen-Meldung endete.

- Loesung MitarbeiterModal v1.0.3:
  - `loadEmployee` nimmt im Passwort-Modus jetzt auch `email`, `portal_role`,
    `first_name`, `last_name` des MA mit.
  - Passwort-Modus zeigt bei fehlendem Login (`!empUserId`) statt der Sackgasse:
    - bei fehlender E-Mail einen Hinweis, erst ueber "Bearbeiten" eine E-Mail zu
      hinterlegen (Login braucht eine E-Mail);
    - sonst ein "Login erstellen"-Formular: Mitarbeiter/E-Mail/Portal-Rolle
      read-only, Passwortfeld, Button "Login erstellen".
  - `handleCreateLogin` ruft die bestehende atomare Route
    `/api/v7/create-employee-login` (Auth + Profil + Verknuepfung in einem Schritt).
    Fall `ALREADY_REGISTERED` wird abgefangen und als Hinweis angezeigt; das
    Verknuepfen eines bereits existierenden Logins bleibt bewusst im Weg ueber
    Firmendaten > Mitarbeiter (EmployeeManagement), nicht im Cockpit.
  - Bei Erfolg `onSaved()` -> Cockpit laedt die MA-Liste neu, der Status springt
    sofort um.
  - Modal-Titel je nach Lage "Login erstellen" bzw. "Passwort zuruecksetzen".

- Loesung FirmaCockpit v7.4.9-36:
  - `user_id` in der MA-Query (`select`) und im Interface `MitarbeiterData`
    ergaenzt (vorher gar nicht geladen -> Cockpit wusste nicht, ob ein Login
    existiert).
  - Schluessel-Icon-Tooltip dynamisch: `ma.user_id ? "Passwort zuruecksetzen"
    : "Login erstellen"`; Hover-Farbe passend (blau = anlegen, amber = reset).
  - ASCII-Korrektur: Mittelpunkt-Zeichen im Firmen-Zaehler-Text durch "-"
    ersetzt (verstiess gegen die ASCII-only-Regel fuer .tsx, war seit v7.4.9-35
    drin, nicht von dieser Aenderung verursacht).

- Zusammenspiel: Beide Dateien greifen ineinander - das Cockpit liefert ueber
  `user_id` den korrekten Tooltip, das Modal fuehrt die jeweils passende Aktion aus.

---

## Doku-Nachtrag

- §4.1 nachgezogen: MitarbeiterModal 1.0.2 -> 1.0.3, FirmaCockpit 7.4.9-33 -> 7.4.9-36.
- §12.1: A-031 aufgenommen; ausserdem A-029 und A-030 (Session 53) als
  Tabellenzeilen ergaenzt - sie standen bis v5.04 nur in der Status-Prosa.
- Pflichtenheft auf v5.05, Status rotiert (Session 54 -> Status, Session 53 ->
  Vorgaenger, Session 52 -> Aeltere Sessions).

---

## Geaenderte Dateien (Deploy-Reihenfolge)

1. `src/components/shared/MitarbeiterModal.tsx` (v1.0.3)
2. `src/components/shared/FirmaCockpit.tsx` (v7.4.9-36)

Keine DB-Migration. Keine neue API-Route (vorhandene
`/api/v7/create-employee-login` wiederverwendet).

---

## Deploy-Notiz (Vercel)

Production baut nur `main`; ein Push auf `v7-dev` erzeugt kein Preview-Deployment.
PROD-Deploy weiterhin IMMER auf beide Remotes (origin + cubintec) pushen. Merge in
dieser Session: Merge-Commit 92b51c1 ("Merge branch 'v7-dev'"), `main` =
`origin/main` = `cubintec/main`. Deploy auf pze.cubintec-hub.com verifiziert
(Schluessel-Icon-Tooltip zeigt korrekt "Login erstellen" bzw. "Passwort
zuruecksetzen").

**Hinweis Vercel-Zugang:** Beim Deploy fiel auf, dass der Login ins Vercel-
Dashboard mit dem persoenlichen Account scheiterte (Cubintec-Team nicht
sichtbar). Das ist ein reines Anzeige-/Scope-Thema (Team-Umschalter / richtige
E-Mail) und war KEIN Deploy-Blocker - der Build lief ueber den Push auf
`cubintec` normal durch. Team-Billing/Plan liegt bei Katrin (Owner).
