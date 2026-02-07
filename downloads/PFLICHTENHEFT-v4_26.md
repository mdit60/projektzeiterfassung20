# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.26  
**SW-Release:** V7.3.88-10  
**Datum:** 05. Februar 2026  
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben  
**Status:** V7 Entwicklung - Vercel Deployment Problem

---

## 1. Aktueller Stand

### 1.1 Localhost
- **Status:** ✅ Funktioniert komplett
- Alle Features arbeiten korrekt
- MA-Bearbeitung, Projekte, Zeiterfassung - alles OK

### 1.2 Vercel Production
- **Status:** ❌ Application Error
- **Fehler:** `Uncaught TypeError: can't access property "filter", s is undefined`
- **Seite:** Projekte-Tab in Firmen-Detail (`/v7/berater/foerderung/firma/[id]?tab=projekte`)

---

## 2. Bereits durchgefuehrte Fixes (05.02.2026)

| Commit | Beschreibung |
|--------|--------------|
| 6ff9604 | Null-safety fuer p.name in ProjectList Filter |
| 084d664 | Null-safety fuer alle .filter() Aufrufe in shared Components |
| 4c0b7ca | Null-safety fuer alle .filter() in V7 pages |

### 2.1 Geaenderte Dateien

**Shared Components:**
- `ProjectList.tsx` - `(p.name || '').toLowerCase()`
- `ProjectDetailPage.tsx` - `(workPackages || []).filter()`
- `TimesheetForm.tsx` - `(workPackages || []).filter()`
- `WorkPackageAssignmentModal.tsx` - `(allEmployees || []).filter()`
- `ProjectTeamManager.tsx` - `(allEmployees || []).filter()`

**V7 Pages:**
- `foerderung/page.tsx` - `(companies || []).filter()`
- `berichte/page.tsx` (Berater + Firma) - diverse Filter

---

## 3. Bekanntes Problem: Vercel vs Localhost

### 3.1 Symptom
- Localhost (Dev-Mode): Funktioniert
- Vercel (Production): Application Error

### 3.2 Ursache
Der Production-Build von Next.js verhält sich anders als der Dev-Mode:
- **Dev-Mode:** Toleranter, Daten laden in bestimmter Reihenfolge
- **Production:** Strikter, Race Conditions werden sichtbar

Irgendwo wird `.filter()` auf einer Variable aufgerufen, die noch `undefined` ist,
bevor die Daten aus der Datenbank geladen wurden.

### 3.3 Naechste Schritte (fuer morgen)

1. **Systematische Suche:** Alle `.filter()`, `.map()`, `.find()` Aufrufe pruefen
2. **Optional Chaining:** Ueberall `?.filter()` oder `(arr || []).filter()` verwenden
3. **State Initialisierung:** Alle useState mit `[]` statt `undefined` initialisieren

**Suchbefehl fuer ungeschuetzte Aufrufe:**
```bash
grep -rn "\.filter(\|\.map(\|\.find(" ~/Documents/Dev/PZE/src/ --include="*.tsx" | grep -v "|| \[\]" | grep -v "\?\.filter\|\?\.map\|\?\.find"
```

---

## 4. Abgeschlossene Features v7.3.88

| Feature | Status |
|---------|--------|
| T-Spalte (technische APs) | ✅ Funktioniert |
| MA-Sortierung nach Lfd. Nr. | ✅ Funktioniert |
| MA-Bearbeitung Berater-Portal | ✅ Localhost OK |
| Berichte-Modul | ✅ Funktioniert |
| Excel-Import Arbeitsplan | ✅ Funktioniert |

---

## 5. Git-Status

```
Letzter Commit: 4c0b7ca
Branch: main (synced mit origin/main)
```

---

## 6. Deployment-Info

- **Vercel Node.js:** 20.x (geaendert von 24.x)
- **Lokal Node.js:** v20.19.5
- **Next.js:** 15.5.12

---

## 7. Fuer V7.4 geplant (nach Bugfix)

- FZul-Integration im Berater-Portal
- Deminimis-Datenbank Feature
