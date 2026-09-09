# KONZEPT: Arbeitszeitgrenzen in der Stundenerfassung

**Version:** 1.4
**Datum:** 08.09.2026
**Status:** Abgenommen, in Umsetzung
**Betrifft:** PZE V7 ab v7.4.7 (Abgrenzung §2.4 umgesetzt in v7.4.6-88 / v7.4.4-20)
**Loest ab:** KONZEPT-ARBEITSZEITGRENZEN-v1_3.md

---

## Änderungen gegenüber v1.3

- **Neu: §2.4 „Abgrenzung: pWAZ ist keine Arbeitszeit-Quelle"** — klärt das
  Verhältnis zwischen `v7_employees.weekly_hours` (Stammdaten, maßgeblich für die
  Zeiterfassung) und `v7_project_assignments.personal_weekly_hours` (pWAZ,
  Anlage-6.1-Stundensatzkalkulation). Anlass: Session 08.09.2026, Fall
  Flensburger Yacht-Service (MA mit pWAZ 30 h im Projekt, aber 40 h in den
  Stammdaten — die Zeiterfassung rechnete mit 40 h und warnte zu spät).
- **§2.1 ergänzt** um den Verweis auf §2.4 und die Rangfolge der Quellen.
- **§3.2 ergänzt** um die Klarstellung, dass die Historie die einzige Quelle für
  unterjährige WAZ-Änderungen ist und die pWAZ davon unberührt bleibt.
- **§5.6 neu**, **§6 ergänzt** um den Umsetzungsstand, **§7** um das Nicht-Ziel
  „keine Synchronisation".

Inhaltlich unverändert: die drei Grenzen, das Datenmodell und die UI-Logik aus v1.3.

---

## 1. Ziel & Motivation

PZE soll sicherstellen, dass die ZA so sauber ist, dass der Projektträger nichts zu
kappen findet. Stunden über den zulässigen Grenzen werden vom Prüfer als nicht
förderfähig gestrichen und können den Verwendungsnachweis gefährden.

---

## 2. Die drei Grenzen

### 2.1 Monatliches Maximum pro Mitarbeiter

```
max_stunden_monat = 173,33 × (weekly_hours / 40)
```

- Vollzeit (40 h/Woche): 173,33 h/Monat
- Teilzeit 50% (20 h/Woche): 86,67 h/Monat
- Teilzeit 75% (30 h/Woche): 130,00 h/Monat

Die Grenze gilt in jedem Monat identisch (2080 h / 12 Monate), unabhängig von
Werktagen oder Feiertagen.

**Rangfolge der Quellen (verbindlich, siehe §2.4):**
1. `v7_employee_hours_history` — Eintrag, der zum Monatsersten gültig war
2. `v7_employees.weekly_hours` — Stammsatz, falls keine Historie existiert
3. `v7_client_companies.standard_weekly_hours` — Firmenstandard als Fallback

Die projektbezogene pWAZ ist **keine** Quelle dieser Kette.

**Durchsetzung:** WEICH (Warnung; Speichern möglich).

### 2.2 50%-Regel für Geschäftsführer

`max_projektstunden_gf = max_stunden_monat × 0,5`, bei Position „Geschäftsführer"
oder „Gesellschafter-Geschäftsführer". Hintergrund: ZIM-Richtlinie — GF üben primär
Leitungs- und Vertriebstätigkeiten aus. **Durchsetzung:** WEICH.

### 2.3 Tägliche Höchstgrenze (PT-Richtlinie)

Projektzeiten + sonstige Arbeitszeit dürfen pro Kalendertag 9 Stunden nicht
überschreiten. Urlaub, Krankheit, Feiertag, Sonderurlaub zählen nicht mit.
**Durchsetzung:** HART (Speichern gesperrt), weil der Projektträger Stunden über
9 h/Tag vollständig kappt.

### 2.4 Abgrenzung: pWAZ ist keine Arbeitszeit-Quelle (neu in v1.4)

Zwei Felder, die beide „Wochenarbeitszeit" heißen könnten, mit **verschiedenen
Aufgaben**; sie dürfen nicht gegeneinander synchronisiert werden.

| | `v7_employees.weekly_hours` (+ Historie) | `v7_project_assignments.personal_weekly_hours` (pWAZ) |
|---|---|---|
| **Bedeutung** | Wie lange arbeitet der MA aktuell | Womit wurde im Antrag gerechnet |
| **Pflegeort** | MA-Stammdaten, Wochenstunden-Historie | Projektteam, Dialog „Team-Mitglied bearbeiten" |
| **Zeitbezug** | fortschreibbar, mit `gueltig_ab` | eingefroren pro Projekt (Antrag/Bescheid) |
| **Verwendet für** | Tages-Sollstunden, Monatsgrenze, GF-Grenze, Ampeln, Fehlzeiten-Stunden | Stundensatz Anlage 6.1: `Jahresbrutto / (pWAZ × 52)`, Teilzeitfaktor `pWAZ/bWAZ` |
| **Darf sich ändern** | ja, jederzeit über die Historie | nein, nicht rückwirkend im laufenden Projekt |

**Regel 1 — Zeiterfassung liest nur Stammdaten.** Sämtliche Zeitlogik im
`TimesheetForm` verwendet ausschließlich die Kette aus §2.1. Ein projektbezogener
Wert würde die Grenzen projektabhängig machen, obwohl Monats- und GF-Grenze pro
**Person** und projektübergreifend gelten.

**Regel 2 — pWAZ bleibt der Antragswert.** Wechselt ein MA später von 30 auf 40
h/Woche, darf sein bereits bewilligter Stundensatz nicht rückwirkend sinken. Die
pWAZ darf zudem bewusst von der Realität abweichen (dokumentierter Fall in
`BerichtePage`: Antrags-WAZ 37 statt tatsächlicher 37,5).

**Regel 3 — Divergenzen werden gemeldet, nicht ausgeglichen.** Der Team-Dialog zeigt
bei Abweichung einen Hinweis mit beiden Werten. Keine automatische Übernahme in eine
der beiden Richtungen. Ist der Stammsatz falsch, wird er über einen neuen Eintrag in
der Wochenstunden-Historie korrigiert; ist die pWAZ falsch erfasst, wird sie im
Team-Dialog korrigiert — mit Prüfung gegen den Bescheid.

**Typischer Fehlerfall:** MA-Liste zeigt 40 h, im Projektteam stehen 30 h, die
Erfassung meldet erst bei 173,33 h statt bei 130 h rot. Ursache ist fast immer ein
nicht gepflegter Stammsatz, nicht die pWAZ.

---

## 3. Datenmodell

### 3.1 Feld `position_title`

Standardrollen als Dropdown mit Freitext-Fallback; GF-Eigenschaft wird zur Laufzeit
aus `POSITION_OPTIONS` / `GF_POSITIONS` abgeleitet, nicht gespeichert.

### 3.2 Teilzeit-Historie

```sql
CREATE TABLE v7_employee_hours_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES v7_employees(id) ON DELETE CASCADE,
  weekly_hours    NUMERIC(5,2) NOT NULL,
  gueltig_ab      DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id),
  notiz           TEXT,
  UNIQUE (employee_id, gueltig_ab)
);
```

Lookup: jüngster Eintrag mit `gueltig_ab <= Monatserster`.

**Hinweis (v1.4):** Diese Historie ist die **einzige** Stelle, an der eine Änderung
der Wochenarbeitszeit erfasst wird. Sie wirkt ab `gueltig_ab` auf alle Projekte. Die
pWAZ bleibt davon unberührt (§2.4).

**Ergänzung aus v7.3.95-19:** Beim Anlegen eines MA wird **kein** automatischer
Initialeintrag mehr geschrieben — er fror den Anlegewert als Anker ein und
übersteuerte spätere Stammsatz-Korrekturen unbemerkt. Weicht der Stammsatz von der
aktuell gültigen Historie ab, warnt EmployeeManagement beim Speichern.

**Alt-Feld `v7_employees.weekly_hours`:** bleibt als Fallback (§2.1 Stufe 2) und wird
mit dem jeweils aktuell gültigen Historie-Eintrag synchron gehalten.

---

## 4. UI-Logik

### 4.1 Mitarbeiter-Verwaltung
Position als Dropdown mit GF-Hinweis; Wochenstunden-Historie als aufklappbarer Block
mit „Neuer Eintrag" (Datum, Stunden, Notiz), Validierung `gueltig_ab.getDate() === 1`
als weiche Warnung.

### 4.2 Stundenerfassung — Ampel-Trio
Monat / GF-Anteil / Heute, jeweils grün oder rot; Klick öffnet Detail-Popup.
Monatsgrenze und GF-Regel weich (Bestätigungsmodal), Tagesgrenze hart.

**Quellenangabe (v7.4.6-88):** Neben der MA-Auswahl steht die wirksame
Wochenarbeitszeit mit Herkunft — „(lt. Historie)", „(lt. Stammdaten)" oder
„(Firmenstandard)".

### 4.3 Stundennachweis-Matrix
Überschrittene Tage rot, überschrittene Monate mit Warn-Badge; keine Funktionssperre.

### 4.4 Compliance-Hinweis
Mein-Status (MA und Admin/PL) sowie Berater > Firma > Berichte zeigen die Ampeln je
Mitarbeiter.

### 4.5 Projektteam (ProjectTeamManager, v7.4.4-20)
Unter dem pWAZ/bWAZ-Block erscheint ein Hinweis, sobald die erfasste pWAZ vom
aktuellen Stammsatz abweicht (Toleranz 0,01 h). Kein Schreibzugriff.

### 4.6 Keine Mail-Benachrichtigungen

---

## 5. Edge Cases

### 5.1 Monatswechsel
Pro Kalendermonat separat geprüft.

### 5.2 Teilzeitwechsel mitten im Monat
`gueltig_ab` ist ein Datum; Wechsel erfolgen i. d. R. zum Monatsersten, sonst weiche
Warnung.

### 5.3 Teilzeit-MA mit halbem Krank-Tag + Projektarbeit
Krank zählt nicht zur 9 h-Grenze; Speichern erlaubt, Monatsampel zeigt die Situation.

### 5.4 GF mit 100% Projektzeit
Weiche Warnung, Speichern möglich.

### 5.5 Alt-Einträge vor Einführung der Grenzen
Keine rückwirkende Validierung; die Matrix zeigt Überschreitungen informativ.

### 5.6 MA wechselt die Wochenstunden während eines laufenden Projekts (v1.4)
Neuer Historie-Eintrag zum Monatsersten. Ab diesem Monat rechnen Sollstunden und
Monatsgrenze mit dem neuen Wert; erfasste Vormonate bleiben unverändert. Die pWAZ des
Projekts und damit der Stundensatz bleiben stehen — das ist gewollt, kein vergessener
Abgleich.

---

## 6. Umsetzungsreihenfolge

Phase 1 Datenbasis, Phase 2 Teilzeit-Historie-UI, Phase 3 Live-Validierung,
Phase 4 Sichtbarmachung, Phase 5 Dokumentation.

**Nachtrag 08.09.2026 (v1.4):** Die Abgrenzung nach §2.4 ist umgesetzt —
`TimesheetForm v7.4.6-88` (Stammdaten-Kette, Quellenangabe) und
`ProjectTeamManager v7.4.4-20` (Divergenz-Hinweis). Offen: die Kapazitätsplanung
(`/v7/berater/multiprojekt`) rechnet ebenfalls mit Stammsatz + Historie — konsistent
mit §2.4, aber noch nicht dokumentiert geprüft.

---

## 7. Nicht-Ziele

- Keine Jahres-Grenze-Überwachung.
- Keine automatische Zeitstempel-Plausibilisierung.
- Keine Integration mit externen Zeiterfassungssystemen.
- Keine Pausen-Pflichtprüfung (§4 ArbZG).
- Keine E-Mail-Benachrichtigungen.
- **Keine Synchronisation zwischen Stammdaten-WAZ und pWAZ** in irgendeiner
  Richtung (v1.4, §2.4).
