# GESAMTPLAN: Förderberatung mit PZE - vier strategische Wege

**Version:** 0.2 (Weg 4 Antragsassistent ergänzt)
**Datum:** 13. Juli 2026
**Status:** Entwurf - strategische Dachplanung, zur Abstimmung mit Cornelius und Katrin
**Zweck:** Überblick über vier zusammenhängende Vorhaben, damit sie sich nicht verzetteln.
**Bündelt die Einzelkonzepte:**
- KONZEPT-MULTIPROJEKT-FZUL v1.2 + KONZEPT-KAPAZITAETSPLANUNG v1.1 (Weg 1)
- KONZEPT-FOERDERMONITOR v0.2 (Weg 2)
- KONZEPT-KUNDENAKQUISE (Weg 3, noch zu erstellen)
- KONZEPT-ANTRAGSASSISTENT (Weg 4, noch zu erstellen)
- Baustein Firmen-Profil-Datenbank (gemeinsames Fundament, noch zu spezifizieren)

### Änderungen gegenüber v0.1
- Weg 4 (KI-gestützter Antragsassistent, Idee von Katrin) als eigenständiges Projekt/PZE-Modul aufgenommen.
- Lebenszyklus-Schleife dokumentiert: Antrag erstellen → Bewilligung → Übernahme des Vorhabens in PZE (nutzt den vorhandenen PDF-Antragsimport).

---

## 1. Warum dieses Dokument

Aus den letzten Gesprächen sind vier Vorhaben entstanden, die eng zusammenhängen, aber jedes
für sich Substanz hat. Dieses Papier hält den Gesamtzusammenhang fest: die strategische Logik,
das gemeinsame Fundament, wie die Wege ineinandergreifen und in welcher Reihenfolge man sie
sinnvoll angeht. Die fachlichen Details bleiben in den jeweiligen Einzelkonzepten.

---

## 2. Ausgangslage und strategische Logik

- **ZIM ausgesetzt** (seit 07.07.2026, Wiederaufnahme frühestens Anfang 2027): Für neue
  FuE-Vorhaben fällt das wichtigste Zuschussinstrument aus. Das erzwingt Alternativen - und
  macht Förderberatung akut wertvoll.
- **FZul aufgewertet** (ab 2026: Bemessungsgrundlage 12 Mio. €, bis 4,2 Mio. €/Jahr für KMU,
  20 % Gemeinkostenpauschale): Die Forschungszulage als steuerlicher Rechtsanspruch ist die
  tragende Säule, die nicht haushaltsbedingt wegfällt.
- **Strategische Doppelbewegung:**
  - *Defensiv / sofort:* Bestandskunden absichern - optimale Förderung trotz ZIM-Lücke.
  - *Offensiv / Wachstum:* Mit demselben Werkzeug neue Kunden gewinnen und das Feld ausbauen.
- **Vollständiger Förder-Lebenszyklus:** Die vier Wege bilden zusammen die gesamte Kette ab -
  Förderung **finden** (Weg 2), Antrag **gewinnen** (Weg 4), Vorhaben **verwalten** (PZE-Kern),
  Förderung **optimieren** (Weg 1). Weg 3 speist von außen neue Kunden in diese Kette.
- **Euer Vorsprung (der rote Faden):** PZE kennt Firmen und ihre Projekte tief und aktuell.
  Dieses Wissen ist die Basis für besseres Matching, bessere Anträge und die nahtlose Übernahme
  bewilligter Vorhaben - der eigentliche Wettbewerbsvorteil in allen Wegen.

---

## 3. Die vier Wege im Überblick

```
            +---------------------------------------------------------------+
            |                  GEMEINSAMES FUNDAMENT (PZE)                  |
            |  Projekt- & Kapazitaetsdaten . Firmen-Profil-Datenbank .      |
            |  KI-Klassifizierung . PDF-Antragsimport (Uebernahme-Schleife) |
            +------------------------------+--------------------------------+
    +----------------+------------------+------------------+------------------+
    v                v                  v                  v
 WEG 1: FZul    WEG 2: Monitor     WEG 3: Akquise    WEG 4: Antragsassistent
 Bestands-      Neue Foerderung    Neue Kunden       Antrag gewinnen: formale
 kunden         finden (ZIM-       gewinnen (Profil- Struktur + gefuehrter
 optimal        Ersatz); Prototyp  DB + ICP +        Text + Gutachter-Check
 versorgen      mit PZE koppeln    Zielkunden-Suche)

 LEBENSZYKLUS:  Weg 2 findet  ->  Weg 4 schreibt  ->  Bewilligung
                ->  Uebernahme in PZE (Projekt/Arbeitsplan/Team, via PDF-Antragsimport)
                ->  Weg 1 (Zeiterfassung, Kapazitaet, FZul)
```

### Weg 1 - FZul-Ausbau: Bestandskunden optimal versorgen

**Ziel:** Aus den in PZE erfassten Projekten ableiten, wo Mitarbeiter freie (nicht anderweitig
geförderte) Kapazitäten hatten, und daraus behördenkonforme Forschungszulage-Anträge erzeugen.
**Geschäftswert:** Sofort spürbarer Nutzen für Bestandskunden, gerade weil ZIM fehlt.
**PZE-Rolle:** Kern - PZE hat die Projekt- und Stundendaten bereits.
**Status:** Konzept abgenommen (v1.1/v1.2), Umsetzung offen (~3 Sessions). Kernmodul fehlt noch.
**Dringlichkeit:** Hoch - ZIM-Lücke + aufgewertete FZul-Konditionen.

### Weg 2 - Fördermonitor: neue Förderung finden

**Ziel:** Passende aktuelle Förderprogramme kundenspezifisch finden und als verkaufbaren Report
liefern.
**Geschäftswert:** Beratungsleistung "wir beschaffen die optimale Förderung".
**PZE-Rolle:** Liefert die realen Firmenprofile fürs Matching; erzeugt den Report.
**Status:** Cornelius' Prototyp ist weit (Import, KI-Tags, Monitoring, Deep-Dive-Crawler,
Vertriebs-Entwürfe). Konzept v0.2. Lücken: Matching-Tiefe, PZE-Profil-Kopplung, Report,
Datenqualität.

### Weg 3 - Neuakquise: neue Kunden gewinnen

**Ziel:** Zielkunden definieren (ICP aus Bestand), mit KI identifizieren/profilieren und ihnen
passende Programme + Cubintec-Unterstützung anbieten.
**Geschäftswert:** Wachstum der Kundenbasis in diesem Feld.
**PZE-Rolle:** Firmen-Profil-Datenbank als Zielkunden-Register; KI-Profilierung (Name + Website
→ Entwurf → Berater-Freigabe).
**Status:** Ideenstand. Eigenes Konzept (KONZEPT-KUNDENAKQUISE) noch zu erstellen.

### Weg 4 - Antragsassistent: den Antrag gewinnen

**Ziel:** KI-gestützt die vollständige formale Struktur eines Förderantrags abbilden und den
Nutzer geführt zu einem einreichfertigen Antrag bringen - alle Pflichtteile (Ziel/Problem,
Stand der Technik + Abgrenzung, Neuheit/Innovationshöhe, Arbeitsplan/Arbeitspakete, technische
Risiken, Verwertung/Wirtschaftlichkeit, Finanzierung) - inklusive **Gutachter-Check** gegen die
Bewertungskriterien des jeweiligen Programms.
**Geschäftswert:** Höchste Wertschöpfung - das Schreiben des Antrags ist die eigentliche
Beratungs- und Honorarleistung; ein guter Gutachter-Check hebt die Bewilligungsquote.
**PZE-Rolle:** Eigenständiges Projekt, als **Modul im PZE-Portal** vorgesehen. Nutzt Firmen- und
Projektdaten als Startfüllung; das Antrags-Template kommt idealerweise aus dem Fördermonitor
(Programm → passende Vorlage + Kriterien).
**Schnittstellen / Übernahme-Schleife:** Ist ein Antrag erstellt und bewilligt, wird das
Vorhaben direkt in PZE übernommen (Projekt + Arbeitsplan + Team). PZE hat mit dem
**PDF-Antragsimport** (Session 66/67) bereits den Baustein, der aus genau so einer
Vorhabensstruktur ein komplettes Projekt anlegt - der Antragsassistent liefert diese Struktur,
die Schnittstelle existiert im Kern also schon.
**Grenzen (ehrlich):** Assistent, kein Autopilot - echte Innovationshöhe muss vorhanden sein;
der Stand-der-Technik-Teil braucht Quellenbindung; die formale Einreichung läuft über die
Programm-Portale (easy-Online, BSFZ). KI strukturiert, führt, entwirft und kritisiert - der
Mensch verantwortet den Inhalt.
**Status:** Ideenstand (Katrin). Eigenes Projekt/Konzept (KONZEPT-ANTRAGSASSISTENT) noch zu
erstellen.

---

## 4. Das gemeinsame Fundament

Alle Wege stehen auf demselben Kern - deshalb lohnt es sich, ihn bewusst als Erstes sauber
aufzubauen:

- **PZE-Projekt- und Kapazitätsdaten:** speisen Weg 1 (freie Kapazitäten → FZul), reichern die
  Firmenprofile für Weg 2/3 an und liefern die Startfüllung für Weg 4.
- **Firmen-Profil-Datenbank:** strukturierte Steckbriefe je Firma (Sitz/Größe/Branche als harte
  Filter; Aktivitätsschwerpunkte, Technologien, Produkte, Zielmärkte, laufende/geplante Vorhaben
  als fachliche Merkmale). Treibt das Matching in Weg 2, ist das Zielkunden-Register in Weg 3
  und liefert Kontext für Weg 4.
- **KI-Klassifizierung:** dieselbe Tag-Taxonomie für Programme *und* Firmen - Matching wird eine
  direkte, filterbare Rechnung statt eines groben Themenvergleichs.
- **PDF-Antragsimport (vorhanden):** schließt die Schleife von Weg 4 zurück in den PZE-Kern -
  bewilligtes Vorhaben wird zum verwalteten Projekt.

**Kernaussage:** Die Firmen-Profil-Datenbank ist der Dreh- und Angelpunkt für Weg 2 und 3; der
vorhandene PDF-Antragsimport ist die Brücke, die Weg 4 mit dem PZE-Kern und damit mit Weg 1
verbindet.

---

## 5. Wie die Wege ineinandergreifen

- Weg 2 (Monitor) verweist bei ausgesetzten Zuschüssen automatisch auf **Weg 1 (FZul)** als
  Alternative und liefert **Weg 4** das passende Antrags-Template.
- Weg 4 (Antrag) übernimmt bei Bewilligung das Vorhaben über den **PDF-Antragsimport** in den
  PZE-Kern; dort greifen Zeiterfassung, Kapazitätsplanung und **Weg 1 (FZul)**.
- Weg 3 (Akquise) nutzt **Firmen-Profil-Datenbank** und Matching aus Weg 2 in umgekehrter
  Richtung ("Programm sucht Firma") und führt neue Kunden in den gesamten Zyklus ein.
- Weg 1 liefert bei bestehenden und neuen Kunden ein konkretes, sofort verkaufbares Ergebnis
  (Zulage), das den Einstieg in die weitergehende Förderberatung öffnet.

---

## 6. Konzept-Portfolio (Dokumentenübersicht)

| Dokument | Deckt ab | Status |
|----------|----------|--------|
| KONZEPT-MULTIPROJEKT-FZUL v1.2 | Weg 1 (FZul-Modul, tagesgenau, BSFZ-Export) | abgenommen |
| KONZEPT-KAPAZITAETSPLANUNG v1.1 | Weg 1 (Kapazitätsmatrix als Rahmen) | abgenommen |
| KONZEPT-FOERDERMONITOR v0.2 | Weg 2 (Ist-Stand + Vertiefung + PZE-Kopplung) | Entwurf |
| KONZEPT-KUNDENAKQUISE (neu) | Weg 3 (ICP, Zielkunden-Suche, Ansprache) | noch zu erstellen |
| KONZEPT-ANTRAGSASSISTENT (neu) | Weg 4 (Antragsstruktur, geführter Text, Gutachter-Check) | noch zu erstellen |
| Baustein Firmen-Profil-Datenbank | Fundament für Weg 2 + 3 (+ Kontext Weg 4) | noch zu spezifizieren |
| Dieses Dokument | Dach-/Gesamtplan | Entwurf v0.2 |

---

## 7. Empfohlene Reihenfolge (Vorschlag)

Dringlichkeit und Abhängigkeiten legen diese Reihenfolge nahe (final mit Katrin/Cornelius):

1. **Sofort - Weg 1 (FZul-Modul).** Höchster, schnellster Nutzen: schützt Bestandskunden in der
   ZIM-Lücke, FZul ist gerade aufgewertet, Konzept ist fertig, geringstes Technikrisiko.
2. **Parallel - Fundament + Weg 2 Phase 1-2.** Firmen-Profil-Datenbank aufbauen und das
   bestehende Monitor-Matching vertiefen sowie an reale PZE-Profile koppeln. Baut zugleich das
   Fundament, das Weg 3 (und teils Weg 4) braucht.
3. **Danach - Weg 3 (Neuakquise)** auf Basis von Profil-Datenbank und ICP.
4. **Eigenes Projekt - Weg 4 (Antragsassistent).** Größeres, eigenständiges Vorhaben; sinnvoll
   als **schmaler MVP** (ein Antragstyp, z. B. die FZul-Vorhabensbeschreibung - hängt an Weg 1 -
   oder ein generisches FuE-Antragsgerüst), dann programmspezifisch ausrollen. Kann zeitlich
   parallel laufen, sobald das Fundament steht; die Übernahme-Schleife nutzt den vorhandenen
   PDF-Antragsimport.

Grundprinzip: Erst das Fundament (Profil-Datenbank) und der sofort wirksame Weg 1, dann die
darauf aufbauenden Wege - keine Doppelarbeit.

---

## 8. Nächste Schritte und offene Entscheidungen

- **Reihenfolge/Ressourcen** bestätigen (mit Katrin): Startet FZul zuerst?
- **Weg 3 und Weg 4 als eigene Konzepte** ausarbeiten (KONZEPT-KUNDENAKQUISE,
  KONZEPT-ANTRAGSASSISTENT).
- **Firmen-Profil-Datenbank:** Feldkatalog + Befüllung (PZE + KI-Vorschlag + Freigabe) festlegen.
- **Fördermonitor-Verzahnung** (mit Cornelius): Kopplung vs. Integration in den PZE-Stack.
- **Weg-4-Schnittstellen:** wie genau der Antragsassistent an die PZE-Funktionen andockt
  (Template aus Fördermonitor rein; bewilligtes Vorhaben über PDF-Antragsimport in PZE raus);
  MVP-Antragstyp festlegen.
- **Datenquellen für Weg 3:** öffentliche Förderprojekt-Datenbanken (Förderkatalog des Bundes,
  EU-CORDIS) als Zielkunden-Quelle prüfen.

---

## 9. Zusammenfassung

Vier Wege, ein Fundament, ein geschlossener Lebenszyklus. Weg 1 (FZul) versorgt die
Bestandskunden sofort und schließt die ZIM-Lücke mit einem steuerlichen Rechtsanspruch. Weg 2
(Fördermonitor) findet die passende aktuelle Förderung und macht daraus ein verkaufbares
Ergebnis. Weg 4 (Antragsassistent) hilft, den Antrag zu gewinnen - und übergibt das bewilligte
Vorhaben über den vorhandenen PDF-Antragsimport zurück in den PZE-Kern, wo Zeiterfassung,
Kapazität und FZul greifen. Weg 3 (Neuakquise) nutzt dieselbe Maschinerie, um neue Kunden in
diesen Zyklus zu holen. Getragen wird alles von den tiefen, aktuellen PZE-Firmen- und
Projektdaten - insbesondere einer Firmen-Profil-Datenbank, die man einmal richtig baut und
mehrfach nutzt. Empfehlung: mit dem fertigen, dringlichen FZul-Modul starten, parallel das
Fundament und die Monitor-Vertiefung aufbauen, dann Neuakquise und Antragsassistent.

---

*Dachdokument v0.2, Diskussionsgrundlage für die Runde mit Cornelius und Katrin. Detailtiefe in
den referenzierten Einzelkonzepten.*
