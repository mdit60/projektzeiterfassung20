# PZE - Deploy-Prozess (verbindlich)

**Stand:** 20.09.2026. Diese Datei ist die maßgebliche Referenz für
Integration und Deployment. Bei jeder Session vor dem ersten Deploy lesen.

## Kernregel (der häufige Stolperstein)

`main` muss auf **ZWEI Remotes** gepusht werden: `origin` UND `cubintec`.
Der **cubintec-Push ist NICHT optional** — die Vercel-Production zieht daraus.
Wird nur `origin/main` gepusht, läuft **kein** Deploy (genau das ist am 06.08.2026
passiert: origin/main stand auf dem -73-Merge, cubintec hing beim -72-Merge, Vercel
baute nichts. Erst `git push cubintec main` löste den Deploy aus).

## Zweite Regel: nur `npm run build`, kein separater Typecheck

Der lokale Test ist **ausschließlich** `npm run build`. Kein `npx tsc --noEmit`
davor, auch nicht "zur Sicherheit".

Grund: Das Projekt enthält eine größere Zahl latenter Typfehler (Stand 20.09.2026:
55 in 29 Dateien). Der Next-Build prüft keine Typen ("Skipping validation of
types"), ein separater `tsc`-Lauf dagegen schon — und bricht dann an Altlasten ab,
die mit der aktuellen Änderung nichts zu tun haben. Zusätzlich erfasst die
`tsconfig.json` über `"include": ["**/*.ts", "**/*.tsx"]` auch Ablageordner wie
`downloads/` und `backup-v7_3_86/`, in denen historische und unvollständige
Stände liegen.

Am 20.09.2026 hat ein vorangestellter `tsc`-Lauf genau deshalb eine Stunde
gekostet, ohne einen einzigen Fehler in der geänderten Datei zu finden.

Die Typfehler sind ein eigenes Thema und gehören sauber aufgeräumt — aber nicht
im Rahmen einer fachlichen Änderung.

## Branch-Strategie

| Branch | Zweck | Deployment |
|--------|-------|------------|
| `v7-dev` | Aktive Entwicklung | Push löst KEINEN Deploy aus (Preview deaktiviert) |
| `main` | Produktion | Push löst Vercel-Production-Deploy aus (via cubintec) |

Entwicklung immer auf `v7-dev`. Vor jedem Git-Befehl Branch prüfen.

## Standard-Ablauf (Frontend-Änderung, kein SQL)

Martin führt alle Terminal-/Git-Befehle selbst aus. Claude liefert sie als
kopierbare Zeilen. Reihenfolge:

1. Integrieren (downloads -> src), Dateiname/Pfad je Datei anpassen:
   ```bash
   cp ~/Documents/Dev/pze/downloads/<DATEI>.tsx ~/Documents/Dev/pze/src/<ZIELPFAD>
   ```
2. Lokal bauen und testen:
   ```bash
   cd ~/Documents/Dev/pze && npm run build
   ```
3. Auf `v7-dev` committen:
   ```bash
   cd ~/Documents/Dev/pze && git add <PFAD> && git commit -m "<Komponente vX: Beschreibung>"
   ```
4. Nach `main` mergen und auf BEIDE Remotes pushen (löst Deploy aus):
   ```bash
   cd ~/Documents/Dev/pze && git checkout main && git merge --no-ff v7-dev -m "Merge v7-dev: <Beschreibung>" && git push origin main && git push cubintec main && git checkout v7-dev
   ```

Danach im Vercel-Dashboard auf "Ready" warten (meist 1-2 Min.). Bei Layout-/
Anzeige-Fixes: im Browser hart neu laden (Cmd+Shift+R).

Gehören mehrere Dateien zu einer Änderung (z. B. eine Komponente und die von ihr
importierte Lib), werden sie **gemeinsam** integriert und committet. Einzeln
integriert bricht der Build.

## Wenn "kein Deploy läuft" - Diagnose

```bash
cd ~/Documents/Dev/pze && git branch --show-current && git log --oneline -4 && echo "=== origin/main ===" && git log --oneline -4 origin/main && echo "=== cubintec/main ===" && git log --oneline -4 cubintec/main && git status -sb
```

Prüfen:
- Steht der neue Merge sowohl auf `origin/main` ALS AUCH `cubintec/main`?
  Fehlt er bei `cubintec/main` -> `git push cubintec main` nachholen (häufigster Fall).
- Ist der Commit nur auf `v7-dev` und gar nicht auf `main`? -> Merge-Block (Schritt 4)
  wurde nicht ausgeführt.

## Wenn "in DEV läuft es, in PROD nicht"

Meist fehlt kein Code, sondern das Schema. Ein Deployment bringt nur Code nach
Prod, keine Tabellen und Spalten. Siehe PZE-UMGEBUNGEN-DEV-PROD.md, Abschnitt
"Deployment ist nicht Migration", inklusive Schnelltest.

## Wichtige Rahmenbedingungen

- Claude hat KEINEN Zugriff auf Git/Deploy/SQL - immer nur fertige Befehle liefern.
- **Frontend-Änderungen** (Komponenten .tsx) brauchen KEIN SQL - nur Integration +
  Merge + Push nach main (beide Remotes).
- **Schema-/DB-Änderungen**: SQL IMMER in DEV UND PROD ausführen (Parität), siehe
  PZE-UMGEBUNGEN-DEV-PROD.md. DEV = Supabase-Projekt `projektzeiterfassung20`,
  PROD = `PZE-production` (Ref `cnnuyioklhlrfygwticf`).
- Prod nie ohne vorherigen lokalen Test (`npm run build` + Sichtprüfung im Browser).
  Ausnahme nur bei winzigen, dringenden Fixes nach Absprache. Liegen die Testdaten
  ausschließlich in Prod, ist eine Sichtprüfung vorab nicht möglich — dann vorher
  prüfen, ob die Änderung im Anzeigepfad schreibt, und andernfalls direkt nach dem
  Deploy in Prod verifizieren.
