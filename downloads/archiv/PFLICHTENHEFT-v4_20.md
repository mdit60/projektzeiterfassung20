# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.20  
**SW-Release:** V7.3.81  
**Datum:** 23. Januar 2026  
**Projekt:** Projektzeiterfassung fuer FuE-Foerdervorhaben  
**Status:** V7 Entwicklung - Phase 3 abgeschlossen, ZIM PDF Parser v4.8 fertig

---

## 1. Projektstatus Uebersicht

### 1.1 Versionen

| Version | Status | Beschreibung |
|---------|--------|--------------|
| **V6** | Produktion | Stabile Version auf main-Branch (FZul-Analyse) |
| **V7** | Entwicklung | Berater-Portal + Firmen-Portal auf v7-dev |

### 1.2 Aktueller Stand V7

| Komponente | Status | Version |
|------------|--------|---------|
| Berater-Portal | **Komplett** | v7.3.81 |
| Firmen-Portal | **Komplett** | v7.3.81 |
| Zeiterfassung | **Shared Component** | v7.3.57 |
| Shared Components | **Vollstaendig** | v7.3.81 |
| ZIM PDF Parser | **Komplett** | v4.8 |
| FZul-Migration | Ausstehend | Phase 4 |

---

## 2. Architektur

### 2.1 Zentrale Erkenntnis

**Eine zentrale Codebasis mit rollen-basiertem Zugriff:**
- Shared Components in `/components/shared/`
- `portal`-Parameter steuert nur die Farbe (blau/gruen)
- Berechtigungen kommen aus der Datenbank

### 2.2 Shared Components vs. Pages - Visualisierung

```
+---------------------------------------------------------------------+
|                      SHARED COMPONENTS                              |
|            (die eigentliche Logik + UI, 90% des Codes)              |
+---------------------------------------------------------------------+
|  TimesheetForm.tsx          |  ProjectCreateForm.tsx                |
|  - Excel-Navigation         |  - PDF-Import                         |
|  - PDF-Export               |  - Manuelles Formular                 |
|  - Feiertage                |  - Validierung                        |
|  - Speichern                |  - Speichern                          |
|  (1387 Zeilen)              |  (849 Zeilen)                         |
+---------------------------------------------------------------------+
                      ^                       ^
                      |                       |
          +-----------+-----------+-----------+-----------+
          |                       |                       |
+---------+---------+   +---------+---------+   +---------+---------+
|   FIRMA PAGE      |   |   BERATER PAGE    |   |    usw...         |
|   (~300 Zeilen)   |   |   (~250 Zeilen)   |   |                   |
+-------------------+   +-------------------+   +-------------------+
| - Auth pruefen    |   | - Auth pruefen    |   |                   |
| - EIGENE          |   | - ALLE Firmen     |   |                   |
|   Firma laden     |   |   zugaenglich     |   |                   |
| - Rollen-         |   | - Firma-ID        |   |                   |
|   basiert         |   |   aus URL         |   |                   |
| - Gruener         |   | - Blauer          |   |                   |
|   Spinner         |   |   Spinner         |   |                   |
+-------------------+   +-------------------+   +-------------------+
```

### 2.3 Warum zwei Pages fuer eine Funktion?

Die **Pages** sind "Wrapper" - sie bereiten nur die Daten vor:

| Aufgabe | Firma-Page | Berater-Page |
|---------|------------|--------------|
| **Auth-Check** | Ist Firmen-User? | Ist Berater/Admin? |
| **Firma ermitteln** | Aus `user_profile.client_company_id` | Aus URL `[id]` Parameter |
| **Welche MA sichtbar?** | Rollenbasiert (Admin/PL/MA) | Alle MA der Firma |
| **Welche Projekte?** | Rollenbasiert | Alle Projekte |
| **Zurueck-Button** | -> `/v7/firma` | -> `/v7/berater/foerderung/firma/[id]` |
| **Spinner-Farbe** | Gruen | Blau |

Dann rufen beide **dasselbe** Shared Component auf:
```tsx
<TimesheetForm portal="firma|berater" ... />
```

### 2.4 Vorteile dieser Architektur

1. **Keine Code-Duplizierung** - Logik existiert nur einmal
2. **Konsistente UI** - Beide Portale sehen gleich aus (nur Farbe anders)
3. **Einfache Wartung** - Bug-Fix an einer Stelle behebt es ueberall
4. **Klare Trennung** - Pages = Routing/Auth, Components = Logik/UI

### 2.5 Rollen-Hierarchie

```
Berater (system_admin, consultant)
    - Sieht ALLE Firmen
    - Header: Sky-700 (#0369a1)
    - Einstieg: /v7/berater/...

Firmen-Admin (client_admin)
    - Sieht NUR eigene Firma
    - Header: Cubintec-Gruen (#65A655)
    - Einstieg: /v7/firma/...

Projektleiter (project_leader)
    - Zugeordnete Projekte
    
Mitarbeiter (employee)
    - Nur eigene Zeiterfassung
```

---

## 3. Shared Components (komplett)

### 3.1 Uebersicht

| Komponente | Version | Zeilen | Funktion |
|------------|---------|--------|----------|
| **TimesheetForm** | v7.3.57 | 1387 | Zeiterfassung (Stundennachweis) |
| **ProjectDetailPage** | v7.3.62 | 1527 | Projekt-Detail mit Tabs |
| **ProjectCreateForm** | v7.3.57 | 849 | Projekt anlegen (PDF + Manuell) |
| **ProjectList** | v7.3.57 | ~300 | Projektliste |
| **CompanyDataView** | v7.3.57 | ~400 | Firmendaten anzeigen/bearbeiten |
| **EmployeeManagement** | v7.3.60 | ~600 | Mitarbeiter CRUD + Login |
| **WorkPackageList** | v7.3.54 | ~350 | AP-Liste mit MA-Zuordnungen |
| **WorkPackageEditModal** | v7.3.52 | ~300 | AP erstellen/bearbeiten |
| **WorkPackageAssignmentModal** | v7.3.52 | ~350 | MA zu AP zuordnen |
| **PortalHeader** | v7.3.42 | ~250 | Header mit portal-Farbe |
| **PortalNav** | v7.3.42 | ~200 | Navigation |
| **Modal** | v7.3.42 | ~100 | Basis-Modal-Komponente |
| **DataTable** | v7.3.42 | ~150 | Tabellen-Komponente |
| **CapacityBar** | v7.3.42 | ~100 | Kapazitaets-Anzeige |

**Gesamt:** ~6.800 Zeilen in Shared Components

### 3.2 TimesheetForm Props

```typescript
interface TimesheetFormProps {
  portal: 'berater' | 'firma';
  companyId: string;
  company: ClientCompany;
  employees: Employee[];
  projects: Project[];
  workPackages: WorkPackage[];
  currentUserId: string;
  currentUserDisplayName: string;
  isAdmin: boolean;
  onBack: () => void;
  initialEmployeeId?: string;
  initialProjectId?: string;
}
```

---

## 4. ZIM PDF Parser

### 4.1 Uebersicht

| Eigenschaft | Wert |
|-------------|------|
| **Version** | v4.8 |
| **Datei** | `parse-zim-pdf-v4_8.py` |
| **Sprache** | Python 3 |
| **Abhaengigkeit** | pypdf |
| **Deployment** | Lokal + Vercel (API Route) |

### 4.2 Unterstuetzte Formular-Typen

| Formular-Typ | Projekttraeger | Version | Status |
|--------------|----------------|---------|--------|
| **Einzelprojekt** | VDI/VDE-IT | 13.11 (18.12.2025) | ✓ Vollstaendig |
| **Kooperation (aus Netzwerk)** | VDI/VDE-IT | 13.11 (18.12.2025) | ✓ Vollstaendig |
| **Kooperation (standalone)** | AiF Projekt GmbH | - | ✓ Grundlegend |
| **Netzwerk (Phase 1+2)** | VDI/VDE-IT | 13.11/13.12 | ✓ Vollstaendig |
| **Durchfuehrbarkeitsstudie** | VDI/VDE-IT | 13.11 (18.12.2025) | ✓ Vollstaendig |
| **Einzelprojekt (Legacy)** | EuroNorm GmbH | - | ✓ Vollstaendig |
| **DS (Legacy)** | EuroNorm GmbH | - | ✓ Vollstaendig |

### 4.3 Formular-Typ-Erkennung

Der Parser erkennt den Formular-Typ automatisch anhand eindeutiger Marker:

| Marker im PDF | Erkannter Typ |
|---------------|---------------|
| `Antrag_DS` | Durchfuehrbarkeitsstudie |
| `FuE-Einzelprojekt` (allein) | Einzelprojekt |
| `FuE-Einzelprojekt` + `FuE-Kooperationsprojekt` | Kooperation (aus Netzwerk) |
| `FuE-Kooperationsprojekt` (allein) | Kooperation (AiF) |
| `Phase 1` + `Phase 2` + `Netzwerkmanagement` | Netzwerk (Phase 1+2) |

### 4.4 Projekttraeger-Zuordnung (Stand 2025)

| Projekttyp | Projekttraeger |
|------------|----------------|
| Einzelprojekte | VDI/VDE Innovation + Technik GmbH |
| Kooperationsprojekte (nicht aus Netzwerk) | AiF Projekt GmbH |
| Innovationsnetzwerke (Management + Projekte) | VDI/VDE Innovation + Technik GmbH |
| Durchfuehrbarkeitsstudien | VDI/VDE Innovation + Technik GmbH |
| Internationale Fragestellungen | AiF Projekt GmbH |

**Hinweis:** EuroNorm GmbH ist seit 2025 nicht mehr als Projekttraeger aktiv (nur Legacy-Antraege).

### 4.5 Tag-Struktur

**VDI/VDE Standard (2025+):**
```
Arbeitspaket: lfd, ap, von, bis, ma_nr, pm
Projekt: cg_VMS_VB_Projekt, cg_VMS_VB_KurzName
Firma: cg_VMS_firma, cg_VMS_str, cg_VMS_plz, cg_VMS_ort
```

**EuroNorm Legacy:**
```
Arbeitspaket: Arbeitspaket_Nr, Arbeitspaket, von, bis, MA_Nr, pm
DS technisch: Arbeitspaket_Nr_techn, Arbeitspaket_techn, RealisierungVON, RealisierungBIS, MA_Nr_techn, pm_techn
```

### 4.6 JSON-Ausgabe

```json
{
  "projekt": {
    "name": "...",
    "kurzname": "...",
    "fkz": "...",
    "start": "...",
    "ende": "...",
    "foerderquote": 0.0,
    "gesamtkosten": 0.0,
    "zuwendung": 0.0,
    "gesamt_pm": 0.0,
    "gesamt_pk": 0.0,
    "laufzeit_monate": 0
  },
  "antragsteller": { ... },
  "budget": { ... },
  "mitarbeiter": [ ... ],
  "arbeitspakete": [
    {
      "ap_number": 1,
      "ap_sub_number": null,
      "ap_code": "AP1",
      "name": "...",
      "start_date": "2025-01-01",
      "end_date": "2025-06-30",
      "total_person_months": 5.0,
      "is_technical": false,
      "mitarbeiter_zuordnungen": [
        { "ma_nr": 1, "pm": 2.0 },
        { "ma_nr": 2, "pm": 3.0 }
      ]
    }
  ],
  "formular_info": {
    "quelle": "VDI/VDE",
    "formular_typ": "Einzelprojekt",
    "version": "13.11",
    "stand": "18.12.2025",
    "projekttraeger": "VDI/VDE Innovation + Technik GmbH"
  },
  "format_erkannt": "standard_zim",
  "statistik": { ... }
}
```

### 4.7 Verwendung

```bash
# Lokal testen
python3 parse-zim-pdf-v4_8.py "pfad/zum/antrag.pdf"

# Ausgabe: JSON-Datei im gleichen Verzeichnis
```

### 4.8 Zukuenftige Entwicklung

| Thema | Status | Anmerkung |
|-------|--------|-----------|
| Online-Antraege | Offen | Projekttraeger stellen auf Online-Antraege um, evtl. kein XFA mehr |
| OCR-Fallback | Offen | Falls Online-Antraege nur normale PDFs liefern |
| AiF-Versionserkennung | Niedrig | Version/Stand wird bei AiF nicht erkannt |

---

## 5. Farbschema

| Kontext | Farbe | Hex-Code | Tailwind |
|---------|-------|----------|----------|
| Berater eingeloggt | Sky-Blau | `#0369a1` | sky-700 |
| Firma eingeloggt | Cubintec-Gruen | `#65A655` | custom |

**WICHTIG:** Die Farbe zeigt "Wer bin ICH" - nicht welche Daten ich sehe!
- Berater schaut Firma an -> Header bleibt BLAU
- Firma-Admin arbeitet -> Header ist GRUEN

---

## 6. Datenbankarchitektur

### 6.1 Projektzuordnung (Single Source of Truth)

Die Zuordnung eines Mitarbeiters zu einem Projekt erfolgt **AUSSCHLIESSLICH** ueber:

```
Projekt
  +-- Arbeitspakete (v7_work_packages)
        +-- MA-Zuordnung mit PM (v7_work_package_assignments) <- EINZIGE QUELLE
```

### 6.2 Tabellen-Status

| Tabelle | Zweck | Status |
|---------|-------|--------|
| `v7_work_package_assignments` | MA -> AP mit PM | Primaer/Quelle |
| `v7_project_assignments` | MA -> Projekt (Rolle, PL) | Redundant pruefbar |

### 6.3 Login-Rollen vs Portal-Rollen

| Feld | Tabelle | Werte | Bedeutung |
|------|---------|-------|-----------|
| `role` | v7_user_profiles | system_admin, consultant, client_admin, client_user | Login-Berechtigung |
| `portal_role` | v7_employees | client_admin, project_leader, employee | Firmen-Portal Rechte |

---

## 7. Deployment

### 7.1 Aktuelle Dateien

| Datei | Version | Pfad |
|-------|---------|------|
| TimesheetForm | v7.3.57 | /components/shared/TimesheetForm.tsx |
| ProjectDetailPage | v7.3.62 | /components/shared/ProjectDetailPage.tsx |
| ProjectCreateForm | v7.3.57 | /components/shared/ProjectCreateForm.tsx |
| Firma Zeiterfassung | v7.3.59 | /app/v7/firma/zeiterfassung/page.tsx |
| Berater Zeiterfassung | v7.3.59 | /app/v7/berater/foerderung/firma/[id]/zeiterfassung/page.tsx |
| Firma Dashboard | v7.3.61 | /app/v7/firma/dashboard/page.tsx |
| **ZIM PDF Parser** | **v4.8** | **/lib/parse-zim-pdf.py** |

### 7.2 URL-Struktur

| Funktion | Firma-Portal | Berater-Portal |
|----------|--------------|----------------|
| Dashboard | `/v7/firma` | `/v7/berater/foerderung` |
| Projekte | `/v7/firma/projekte` | `/v7/berater/foerderung/firma/[id]?tab=projekte` |
| Projekt-Detail | `/v7/firma/projekte/[id]` | `/v7/berater/foerderung/firma/[id]/projekt/[pid]` |
| Zeiterfassung | `/v7/firma/zeiterfassung?projekt=<id>` | `/v7/berater/foerderung/firma/[id]/zeiterfassung?projekt=<pid>` |
| Mitarbeiter | `/v7/firma/mitarbeiter` | `/v7/berater/foerderung/firma/[id]?tab=mitarbeiter` |

### 7.3 Git

| Branch | Verwendung |
|--------|------------|
| `main` | V6 Produktion |
| `v7-dev` | V7 Entwicklung |

---

## 8. Naechste Schritte (Phase 4+)

| ID | Aufgabe | Prioritaet | Status |
|----|---------|-----------|--------|
| 1 | FZul-Analyse (Forschungszulage) | Hoch | Phase 4 |
| 2 | ZIM PDF Parser in Vercel deployen | Hoch | Bereit |
| 3 | Berichte-Funktionen | Mittel | Phase 5 |
| 4 | Online-Antraege Monitoring | Niedrig | Beobachten |

---

## 9. Aenderungshistorie

### v4.20 (23.01.2026)
- Mitarbeiter-Extraktion aus Anlage 6.2 im Parser
- Neue DB-Spalte `employee_number` in `v7_project_assignments`
- Team-Sortierung nach MA-Nummer aus Antrag
- ProjectDetailPage v7.3.81

### v4.19 (23.01.2026)
- ZIM PDF Parser v4.8 komplett dokumentiert
- Formular-Typ-Erkennung mit eindeutigen Markern
- Projekttraeger-Zuordnung 2025 dokumentiert
- Tag-Struktur fuer VDI/VDE und EuroNorm Legacy
- JSON-Ausgabe-Format dokumentiert

### v4.18 (22.01.2026)
- Architektur-Visualisierung (Shared Components vs. Pages) hinzugefuegt
- Erklaerung warum zwei Pages fuer eine Funktion benoetigt werden
- Projektdateien aufgeraeumt (von ~88 auf ~35 Dateien reduziert)

### v4.17 (21.01.2026)
- TimesheetForm als Shared Component
- ProjectDetailPage mit Zeiterfassung-Tab
- Dashboard rollenbasierte Ansicht

### v4.16 (21.01.2026)
- EmployeeManagement Shared Component
- Login-Verknuepfung fuer bestehende User

---

*Letzte Aktualisierung: 23. Januar 2026, 14:00 Uhr*
