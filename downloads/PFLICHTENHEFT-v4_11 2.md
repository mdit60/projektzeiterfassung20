# PFLICHTENHEFT - Projektzeiterfassung (PZE)

**Version:** 4.10  
**SW-Release:** V7.3  
**Datum:** 18. Januar 2026  
**Projekt:** Projektzeiterfassung für FuE-Fördervorhaben  
**Status:** V7 Entwicklung - Phase 3 (Firmen-Portal)

---

## 1. Projektstatus ÃƒÅ“bersicht

### 1.1 Versionen

| Version | Status | Beschreibung |
|---------|--------|--------------|
| **V6** | Ã¢Å“â€¦ Produktion | Stabile Version auf main-Branch (FZul-Analyse) |
| **V7** | Ã°Å¸â€Â§ Entwicklung | Berater-Portal + Firmen-Portal auf v7-dev |

### 1.2 Aktueller Stand V7

| Komponente | Status | Version |
|------------|--------|---------|
| Berater-Portal | Ã¢Å“â€¦ Funktional | v7.3.3 |
| Firmen-Portal | Ã¢Å“â€¦ Grundfunktionen | v7.3.5 |
| **Zeiterfassung** | Ã¢Å“â€¦ **Fertig** | **v7.3.12** |
| FZul-Migration | Ã¢ÂÂ³ Ausstehend | Phase 4 |

---

## 2. Entwicklungsphasen

### 2.1 Phasenübersicht

Die Entwicklung von PZE gliedert sich in 5 Hauptphasen plus Projektmanagement. **Phase 0** umfasst die V6-Vorarbeit (Okt 2025 - Dez 2025), die als Grundlage für V7 dient. Die **Phasen 1-5** beschreiben die V7-Entwicklung (seit Dez 2025). **PM** erfasst phasenübergreifende Meta-Arbeit am Projekt selbst.

```
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š  PHASE 0: V6-VORARBEIT (Okt-Dez 2025)                              Ã¢Å“â€¦ FERTIG Ã¢â€â€š
Ã¢â€â€š  Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬  Ã¢â€â€š
Ã¢â€â€š  Grundlagen, die in V7 übernommen wurden:                                   Ã¢â€â€š
Ã¢â€â€š  Ã¢â‚¬Â¢ Datenmodell (Projekte, MA, Arbeitspakete, Zeiterfassung)                Ã¢â€â€š
Ã¢â€â€š  Ã¢â‚¬Â¢ FZul-Analyse-Logik (Kapazitätsberechnung, Stundenverteilung)            Ã¢â€â€š
Ã¢â€â€š  Ã¢â‚¬Â¢ Excel-Import (ZIM/BMBF-Stundennachweise)                                 Ã¢â€â€š
Ã¢â€â€š  Ã¢â‚¬Â¢ PDF-Export (FZul-Jahres-Stundennachweis)                                 Ã¢â€â€š
Ã¢â€â€š  Ã¢â‚¬Â¢ UI/UX-Konzepte (Kalender-Raster, Tages-Editor)                          Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
        Ã¢â€â€š
        Ã¢â€“Â¼
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š  PHASE 1: BASIS-INFRASTRUKTUR (Dez 2025 - Jan 2026)                Ã¢Å“â€¦ FERTIG Ã¢â€â€š
Ã¢â€â€š  Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬  Ã¢â€â€š
Ã¢â€â€š  Ã¢â‚¬Â¢ V7-Datenbank-Schema (Berater/Kunden-Hierarchie)                         Ã¢â€â€š
Ã¢â€â€š  Ã¢â‚¬Â¢ Login & Authentifizierung (Supabase Auth)                                Ã¢â€â€š
Ã¢â€â€š  Ã¢â‚¬Â¢ Rollenbasierter Redirect (BeraterÃ¢â€ â€™Portal, FirmaÃ¢â€ â€™Portal)                 Ã¢â€â€š
Ã¢â€â€š  Ã¢â‚¬Â¢ Berater-Dashboard Grundstruktur                                          Ã¢â€â€š
Ã¢â€â€š  Ã¢â‚¬Â¢ Navigation & Header-Design (Blau/Grün-Schema)                           Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
        Ã¢â€â€š
        Ã¢â€“Â¼
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š  PHASE 2: BERATER-PORTAL (Jan 2026)                                Ã¢Å“â€¦ FERTIG Ã¢â€â€š
Ã¢â€â€š  Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬  Ã¢â€â€š
Ã¢â€â€š  2a) CRUD-Funktionen:                                                       Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Firmenübersicht, Firma anlegen/bearbeiten, Logo-Upload              Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Firmen-Detailseite (Projekte, MA, APs)                              Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Projekt/Mitarbeiter/Arbeitspaket CRUD                               Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ MA Ã¢â€ â€™ Projekt und MA Ã¢â€ â€™ AP Zuordnung                                  Ã¢â€â€š
Ã¢â€â€š                                                                             Ã¢â€â€š
Ã¢â€â€š  2b) ZIM-PDF-Import:                                                        Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Python PDF-Parser (PyMuPDF)                                          Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Railway Microservice                                                 Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Import-UI mit Vorschau                                               Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Automatischer Reimport                                               Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
        Ã¢â€â€š
        Ã¢â€“Â¼
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š  PHASE 3: FIRMEN-PORTAL (Jan 2026)                              Ã°Å¸â€â€ž IN ARBEIT Ã¢â€â€š
Ã¢â€â€š  Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬  Ã¢â€â€š
Ã¢â€â€š  Ã¢Å“â€¦ Erledigt:                                                               Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Firmen-Dashboard mit Statistiken                                     Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Zeiterfassung komplett (v7.3.12)                                     Ã¢â€â€š
Ã¢â€â€š        - Excel-ähnliche Navigation                                          Ã¢â€â€š
Ã¢â€â€š        - PDF-Export mit Auto-Filename                                       Ã¢â€â€š
Ã¢â€â€š        - Bundesland-Feiertage                                               Ã¢â€â€š
Ã¢â€â€š                                                                             Ã¢â€â€š
Ã¢â€â€š  Ã¢ÂÂ³ Offen:                                                                   Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Projekte verwalten (/firma/projekte)                                 Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Mitarbeiter verwalten (/firma/mitarbeiter)                           Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Berichte (/firma/berichte)                                           Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Wording projektartspezifisch (Netzwerk vs Standard)                  Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Header-Farbe Firmen-Detailseite (Berater-Portal)                    Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
        Ã¢â€â€š
        Ã¢â€“Â¼
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š  PHASE 4: FZUL-MIGRATION (geplant)                                 Ã¢ÂÂ³ OFFEN Ã¢â€â€š
Ã¢â€â€š  Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬  Ã¢â€â€š
Ã¢â€â€š  Migration der V6-FZul-Funktionen nach V7:                                  Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ FZul-Datenbank-Tabellen (fzul_employee_settings, etc.)              Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ MA-Stammdaten UI                                                     Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ FZul-Editor (Wizard, Kalender-Raster, Tages-Editor)                 Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ PDF-Generierung BMF-konform                                          Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ PDF-Archiv & Freigabe-Workflow                                       Ã¢â€â€š
Ã¢â€â€š                                                                             Ã¢â€â€š
Ã¢â€â€š  Basis: V6-FZul-Analyse (bewährte Logik wird übernommen)                   Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
        Ã¢â€â€š
        Ã¢â€“Â¼
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š  PHASE 5: PRODUKTION (geplant)                                     Ã¢ÂÂ³ OFFEN Ã¢â€â€š
Ã¢â€â€š  Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬  Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ RLS-Policies aktivieren (Row Level Security)                         Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ DSGVO-Autorisierung (Berater-Zugriff durch GF)                      Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Multi-Mandanten-Fähigkeit (weitere Beraterfirmen)                   Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Performance-Optimierung (Indizes, Caching)                          Ã¢â€â€š
Ã¢â€â€š      Ã¢â‚¬Â¢ Dokumentation & Schulung (Benutzerhandbuch)                         Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  PM: PROJEKTMANAGEMENT - META-ARBEIT (phasenübergreifend)                   â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  Arbeit am Projekt selbst, nicht an der PZE-Software:                       â”‚
â”‚      â€¢ Projektplanung und -steuerung                                        â”‚
â”‚      â€¢ Aufwandsanalyse (Plan/Ist-Vergleich, KI vs klassisch)               â”‚
â”‚      â€¢ Konzeption Projekttracking-System                                    â”‚
â”‚      â€¢ Dokumentation (Pflichtenheft, Projektplan)                          â”‚
â”‚      â€¢ Eigenverbrauchsberechnung (FZul für eigenes Projekt)                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 2.2 V6-Vorarbeit (Phase 0) - Was wurde übernommen?

**Hinweis zur Versionierung:** Die Versionen V1-V5 (Okt-Nov 2025) waren explorative Prototypen und Gehversuche, in denen Grundkonzepte erprobt wurden. V6 war die erste produktiv nutzbare Version, die auf dem main-Branch deployed wurde. Die V7-Entwicklung baut auf den Erkenntnissen aller Vorversionen auf.

Die V6-Entwicklung (Oktober - Dezember 2025) hat wichtige Grundlagen geschaffen:

| V6-Feature | ÃƒÅ“bernahme in V7 | Status |
|------------|-----------------|--------|
| Datenmodell (Projekte, MA, APs) | Ã¢â€ â€™ V7-Schema mit Berater-Hierarchie | Ã¢Å“â€¦ ÃƒÅ“bernommen |
| Excel-Import (ZIM/BMBF) | Ã¢â€ â€™ Wird in Phase 4 migriert | Ã¢ÂÂ³ Geplant |
| FZul-Analyse-Logik | Ã¢â€ â€™ Wird in Phase 4 migriert | Ã¢ÂÂ³ Geplant |
| PDF-Export (Stundennachweis) | Ã¢â€ â€™ Neu implementiert in v7.3.12 | Ã¢Å“â€¦ Neu gebaut |
| Kalender-Raster UI | Ã¢â€ â€™ Wird in Phase 4 übernommen | Ã¢ÂÂ³ Geplant |
| Kapazitätsberechnung | Ã¢â€ â€™ Wird in Phase 4 übernommen | Ã¢ÂÂ³ Geplant |

**Wichtig:** V6 bleibt auf dem `main`-Branch produktiv nutzbar, bis V7 alle Funktionen übernommen hat.

### 2.3 Phasen-Details mit Arbeitspaketen

Die detaillierte Aufschlüsselung aller Arbeitspakete ist im separaten Dokument **PZE-V7-PROJEKTPLAN-v1.x.xlsx** gepflegt. Der Projektplan enthält:

- Hierarchische Nummerierung (1, 1.1, 1.2, ... wie bei Förderprojekten)
- Plan-Aufwand (Stunden bei externer Vergabe)
- Ist-Aufwand (tatsächlicher Aufwand mit Claude AI)
- Status (Ã¢Å“â€¦ Fertig / Ã°Å¸â€â€ž In Arbeit / Ã¢ÂÂ³ Offen)
- Version und Datum der Fertigstellung

---

## 3. Versionierungskonzept

### 3.1 Schema

```
Datei-Version:  v[Release].[Änderungsschritt]
Beispiel:       v7.3.12 = Release 7.3, 12. Änderung in diesem Release
```

### 3.2 Regeln

| Element | Format | Beschreibung |
|---------|--------|--------------|
| **SW-Release** | V7.3 | Hauptversion des Gesamtsystems |
| **Datei-Version** | v7.3.12 | Release + Änderungsschritt dieser Datei |
| **PH-Version** | 4.9 | Pflichtenheft-Dokumentversion |

**WICHTIG:** Jede funktionale Änderung = neue Versionsnummer!

### 3.3 Datei-Header Format

```typescript
// src/app/v7/firma/zeiterfassung/page.tsx
// VERSION: v7.3.12 (SW-Release V7.3)
// DATUM: 08. Januar 2026
// BESCHREIBUNG: Zeiterfassung mit Excel-Navigation und PDF-Export
```

---

## 4. Architektur V7

### 4.1 Benutzer-Hierarchie

```
Berater-Firma (z.B. Cubintec GmbH)
    Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ Berater (consultant)
            Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ betreut mehrere Kundenfirmen
                    
Kunden-Firma (z.B. AS System GmbH)
    Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Firmen-Admin (client_admin) - z.B. Geschäftsführer
    Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Projektleiter (project_leader)
    Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ Mitarbeiter (employee)
```

### 4.2 Rollen und Berechtigungen

| Rolle | Portal | Rechte |
|-------|--------|--------|
| `system_admin` | Berater | Vollzugriff |
| `consultant` | Berater | Alle Kundenfirmen verwalten |
| `client_admin` | Firma | Eigene Firma verwalten, alle Mitarbeiter sehen |
| `project_leader` | Firma | Projekte verwalten, Team-Zeiten sehen |
| `employee` | Firma | Nur eigene Zeiterfassung |

### 4.3 Farbschema

| Portal | Farbe | Hex-Code | Verwendung |
|--------|-------|----------|------------|
| Berater-Portal | Ozeanblau | `#0369a1` | Header zeigt "Ich bin Berater" |
| Firmen-Portal | Cubintec-Grün | `#65A655` | Header zeigt "Ich bin Firma" |

**Regel:** Die Header-Farbe zeigt immer an, **wer eingeloggt ist** - nicht welche Daten man gerade sieht.

---

## 5. Header-Design (v7.3.3)

### 5.1 Einheitliches Layout

```
Ã¢â€Å’Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Â
Ã¢â€â€š [Ã¢â€ Â Zurück]   [PZE]   Seitentitel                    Benutzer [Abmelden]     Ã¢â€â€š
Ã¢â€â€š                      Untertitel                                             Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€Ëœ
```

### 5.2 Regeln

| Element | Position | Immer gleich? |
|---------|----------|---------------|
| Ã¢â€ Â Zurück | Links | Ã¢Å“â€¦ Ja (außer Hauptseiten) |
| PZE Badge | Nach Zurück | Ã¢Å“â€¦ Ja |
| Seitentitel | Mitte-Links | Ã¢Å“â€¦ Ja |
| Benutzername | Rechts | Ã¢Å“â€¦ Ja |
| Abmelden | Ganz rechts | Ã¢Å“â€¦ Ja |
| **Aktions-Buttons** | **NIE im Header** | Ã¢Å“â€¦ In Content-Bereich |

### 5.3 Seiten-Titel

| Seite | Zurück? | Titel | Untertitel |
|-------|---------|-------|------------|
| Berater Dashboard | Nein | Berater-Portal | v7 |
| Förderberatung | Ã¢â€ â€™ Dashboard | Berater-Portal | Förderberatung · ZIM / BMBF |
| FZul-Beratung | Ã¢â€ â€™ Dashboard | Berater-Portal | FZul-Beratung · §35a EStG |
| Firmen-Detail | Ã¢â€ â€™ Förderberatung | {Firmenname} | Förderberatung · {Bundesland} |
| Firmen-Portal | Nein | Firmen-Portal | {Firmenname} |
| Zeiterfassung | Ã¢â€ â€™ Dashboard | Stundennachweis | - |

---

## 6. Datenbank-Schema V7

### 6.1 Haupttabellen

| Tabelle | Beschreibung |
|---------|--------------|
| `v7_consultant_companies` | Beraterfirmen |
| `v7_client_companies` | Kundenfirmen |
| `v7_user_profiles` | Benutzerprofile mit Rollen |
| `v7_projects` | Förderprojekte |
| `v7_employees` | Mitarbeiter |
| `v7_work_packages` | Arbeitspakete |
| `v7_timesheets` | Zeiterfassung |
| `v7_project_assignments` | MA-Projekt-Zuordnung |
| `v7_work_package_assignments` | MA-AP-Zuordnung |

### 6.2 Neue Spalten v7.3.x

**v7_client_companies:**

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `status` | TEXT | invited, registered, active, inactive |
| `onboarding_type` | TEXT | by_consultant, self_registration |
| `invitation_token` | UUID | Für Selbst-Registrierung |
| `logo_url` | TEXT | Pfad zum Firmenlogo |
| `vat_id` | TEXT | USt-ID |
| `website` | TEXT | Firmenwebsite |
| `legal_name` | TEXT | Vollständiger juristischer Name |
| `federal_state` | TEXT | Bundesland für Feiertage |

**v7_projects:**

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `funding_format` | ENUM | ZIM_SOLO, ZIM_KOOP, ZIM_DS, BMBF, etc. |

### 6.3 funding_format Werte

| Wert | Beschreibung | T-Spalte in Zeiterfassung |
|------|--------------|---------------------------|
| ZIM_SOLO | ZIM Einzelprojekt | Nein |
| ZIM_KOOP | ZIM Kooperationsprojekt | Nein |
| ZIM_NETZWERK | ZIM Netzwerk-Management | Nein |
| ZIM_DS | ZIM Durchführbarkeitsstudie | **Ja** |
| BMBF | BMBF Förderung | Nein |
| BMBF_DS | BMBF Durchführbarkeitsstudie | **Ja** |

### 6.4 Storage

| Bucket | Zweck | Public |
|--------|-------|--------|
| `company-logos` | Firmenlogos | Ã¢Å“â€¦ Ja |

---

## 7. Implementierte Features

### 7.1 Berater-Portal (`/v7/berater/`)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Dashboard | Ã¢Å“â€¦ | Statistiken, Navigation zu Förder-/FZul-Beratung |
| Firmenübersicht | Ã¢Å“â€¦ | Liste aller Kundenfirmen mit Status |
| Firma anlegen | Ã¢Å“â€¦ | Modal mit optionaler Admin-Erstellung |
| Firma bearbeiten | Ã¢Å“â€¦ | Alle Stammdaten |
| Status-System | Ã¢Å“â€¦ | invited Ã¢â€ â€™ registered Ã¢â€ â€™ active |
| Firmen-Detailseite | Ã¢Å“â€¦ | Projekte, Mitarbeiter, Arbeitspakete |
| ZIM-Import | Ã¢Å“â€¦ | PDF-Parser via Railway-Service |
| Projekt-CRUD | Ã¢Å“â€¦ | Anlegen, Bearbeiten, Löschen |
| Mitarbeiter-CRUD | Ã¢Å“â€¦ | Anlegen, Bearbeiten, Löschen |
| Arbeitspaket-CRUD | Ã¢Å“â€¦ | Anlegen, Bearbeiten, Löschen |
| FZul-Beratung | Ã¢Å“â€¦ | Firmenauswahl für FZul-Analyse |

### 7.2 Firmen-Portal (`/v7/firma/`)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Dashboard | Ã¢Å“â€¦ | Willkommen, Statistiken, Navigation |
| Firmendaten anzeigen | Ã¢Å“â€¦ | 3-Spalten-Layout (Logo, Adresse, Kontakt) |
| Firmendaten bearbeiten | Ã¢Å“â€¦ | Modal mit allen Feldern |
| Logo-Upload | Ã¢Å“â€¦ | Supabase Storage |
| **Zeiterfassung** | Ã¢Å“â€¦ | **v7.3.12 - Stundennachweis komplett** |
| Projekte verwalten | Ã¢ÂÂ³ | Phase 3 |
| Mitarbeiter verwalten | Ã¢ÂÂ³ | Phase 3 |
| Berichte | Ã¢ÂÂ³ | Phase 3 |

### 7.3 Zeiterfassung (v7.3.12)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Stundennachweis-Formular | Ã¢Å“â€¦ | Excel-konformes Layout |
| Header 2x3 Layout | Ã¢Å“â€¦ | Zuwendungsempfänger, Vorhabenthema, Monat, FKZ, Mitarbeiter |
| Kalender-Eingabe | Ã¢Å“â€¦ | 31 Tage, WE/Feiertage markiert |
| 4+ AP-Zeilen | Ã¢Å“â€¦ | Dynamisch erweiterbar |
| Fehlzeiten | Ã¢Å“â€¦ | U=Urlaub, K=Krankheit, S=Sonstige |
| T-Spalte | Ã¢Å“â€¦ | Nur bei Durchführbarkeitsstudien |
| Excel-Navigation | Ã¢Å“â€¦ | Ã¢â€ Â Ã¢â€ â€™ Ã¢â€ â€˜ Ã¢â€ â€œ Tab Shift+Tab Enter |
| PDF-Export | Ã¢Å“â€¦ | Mit Speicherdialog, Dateiname automatisch |
| Drucken | Ã¢Å“â€¦ | A4 Landscape, alles auf einer Seite |
| Unterschriften | Ã¢Å“â€¦ | Senkrechte Trennlinie, Datum editierbar |
| Bundesland-Feiertage | Ã¢Å“â€¦ | Automatisch aus Firmendaten |

### 7.4 Login & Routing

| Feature | Status |
|---------|--------|
| Rollenbasierter Redirect | Ã¢Å“â€¦ |
| V6/V7 Koexistenz | Ã¢Å“â€¦ |
| Bestehende V6-User Ã¢â€ â€™ V7 | Ã¢Å“â€¦ (manuell via SQL) |

---

## 8. URL-Struktur

### 8.1 Berater-Portal

```
/v7/berater/                           # Dashboard
/v7/berater/foerderung/                # Firmenübersicht
/v7/berater/foerderung/firma/[id]/     # Firmen-Detailseite
/v7/berater/foerderung/import/         # ZIM-Import
/v7/berater/fzul/                      # FZul-Firmenauswahl
/v7/berater/fzul/firma/[id]/           # FZul-Analyse (Phase 4)
```

### 8.2 Firmen-Portal

```
/v7/firma/                             # Dashboard
/v7/firma/zeiterfassung/               # Ã¢Å“â€¦ Stundennachweis (v7.3.12)
/v7/firma/projekte/                    # Projekte (Phase 3)
/v7/firma/mitarbeiter/                 # Mitarbeiter (Phase 3)
/v7/firma/berichte/                    # Berichte (Phase 3)
```

---

## 9. Externe Services

### 9.1 ZIM-PDF-Parser

| Eigenschaft | Wert |
|-------------|------|
| URL | https://web-production-e2e1.up.railway.app |
| Endpunkt | POST /parse-zim |
| Input | PDF-Datei (multipart/form-data) |
| Output | JSON mit Projektdaten |
| Unterstützt | ZIM-Formulare ab 2022 (cg_VMS_*) |

---

## 10. Testdaten V7

### 10.1 Beraterfirma

| Firma | ID |
|-------|-----|
| Cubintec GmbH | (consultant_company_id) |

### 10.2 Kundenfirmen

| Firma | Admin | Status |
|-------|-------|--------|
| AS System GmbH | Thomas Dührkop | Ã¢Å“â€¦ active |
| Tippl GmbH | Mario Tippl | Ã¢Å“â€¦ active |

### 10.3 Test-Logins

| Email | Rolle | Portal |
|-------|-------|--------|
| m.ditscherlein@cubintec.com | consultant | Berater |
| t.duehrkop@assystem.de | client_admin | Firma |
| mario.tippl@tippl.de | client_admin | Firma |

---

## 11. Deployment

### 11.1 Branches

| Branch | URL | Zweck |
|--------|-----|-------|
| `main` | projektzeiterfassung20.vercel.app | Produktion (V6) |
| `v7-dev` | Preview-URL | Entwicklung (V7) |

### 11.2 Git-Tags

| Tag | Datum | Beschreibung |
|-----|-------|--------------|
| **v7.3.12-dev** | **08.01.2026** | **Zeiterfassung komplett** |
| v7.3.3-dev | 07.01.2026 | Header-Vereinheitlichung, Ozeanblau |
| v7.3.2-dev | 06.01.2026 | Firmendaten + Logo-Upload |
| v7.3.1-dev | 06.01.2026 | Header-Design (Blau/Grün) |
| v7.3.0-dev | 06.01.2026 | Firmen-Portal Sprint 1 |

---

## 12. Offene ToDos

### 12.1 Phase 3 - Noch offen

| ToDo | Beschreibung | Priorität |
|------|--------------|-----------|
| Wording projektartspezifisch | "förderbare Projektarbeiten" (Standard) vs "Management-Arbeiten" (Netzwerk) | Mittel |
| Firmen-Detailseite Header | Berater-Portal: Header-Farbe auf blau (#002451) ändern | Niedrig |
| Projekte verwalten | /v7/firma/projekte - Eigene Projekte sehen | Mittel |
| Mitarbeiter verwalten | /v7/firma/mitarbeiter - MA-Stammdaten pflegen | Mittel |
| Berichte | /v7/firma/berichte - Exports, ÃƒÅ“bersichten | Niedrig |

### 12.2 Phase 4 - FZul-Migration

| ToDo | Beschreibung | Priorität |
|------|--------------|-----------|
| FZul-Datenbank-Tabellen | fzul_employee_settings, fzul_timesheets, fzul_pdf_archive | Hoch |
| MA-Stammdaten UI | Tab "MA-Daten" im Import-Modul | Hoch |
| FZul-Editor | Wizard, Kalender-Raster, Tages-Editor, Auto-Fill | Hoch |
| PDF-Generierung | BMF-konformer Jahres-Stundennachweis | Hoch |
| PDF-Archiv | Status-Workflow, ZIP-Download | Mittel |

### 12.3 Phase 5 - Produktion

| ToDo | Beschreibung | Priorität |
|------|--------------|-----------|
| RLS-Policies | Row Level Security aktivieren | Hoch |
| DSGVO-Autorisierung | Berater-Zugriff durch GF freigeben | Hoch |
| Multi-Mandanten | Weitere Beraterfirmen ermöglichen | Mittel |
| Performance | Indizes, Caching optimieren | Niedrig |
| Dokumentation | Benutzerhandbuch erstellen | Niedrig |

---

## 13. Design-Prinzipien

> "So einfach und einheitlich wie möglich" - Nokia 2110 / Apple

| Prinzip | Umsetzung |
|---------|-----------|
| **Konsistenz** | Immer Modals für Bearbeitung, einheitlicher Header |
| **Klarheit** | Header-Farbe = wer bin ICH (nicht was sehe ich) |
| **Einfachheit** | Wenige Klicks zum Ziel, keine Aktions-Buttons im Header |
| **Intuition** | Stift-Icon = Bearbeiten, Zurück immer links |
| **Excel-ähnlich** | Zeiterfassung navigierbar wie Tabellenkalkulation |

---

## 14. Änderungshistorie

### 14.1 Pflichtenheft-Versionen

| PH-Version | SW-Release | Datum | Änderungen |
|------------|------------|-------|------------|
| **v4.11** | **V7.3** | **20.01.2026** | **Farbcode Berater-Portal korrigiert (#0369a1), UTF-8 bereinigt, v7.3.32** |
| v4.10 | V7.3 | 18.01.2026 | PM-Kategorie für Meta-Arbeit, Projektplan v1.5 |
| v4.9 | V7.3 | 18.01.2026 | Entwicklungsphasen-Kapitel, Konsistenz mit Projektplan |
| v4.8 | V7.3 | 08.01.2026 | Zeiterfassung v7.3.12 dokumentiert |
| v4.7 | V7.3 | 07.01.2026 | Versionierungskonzept, Header-Vereinheitlichung |
| v4.6 | V7.3 | 06.01.2026 | Firmen-Portal Sprint 1, Logo-Upload |
| v4.5 | V7.2 | 05.01.2026 | ZIM-Import, Arbeitspakete |
| v4.4 | V7.1 | 04.01.2026 | Firmen-Detailseite CRUD |
| v4.3 | V7.1 | 03.01.2026 | Rollenbasierte Navigation |

### 14.2 SW-Release-Historie

| SW-Release | Datum | Hauptfeatures |
|------------|-------|---------------|
| **V7.3** | **20.01.2026** | **v7.3.32: Mitarbeiter-/Berichte-Seiten, UTF-8-Bereinigung, Header-Korrektur** |
| V7.3 | 08.01.2026 | Zeiterfassung komplett (v7.3.12) |
| V7.3 | 07.01.2026 | Header-Design, Firmen-Portal, Logo-Upload |
| V7.2 | 05.01.2026 | ZIM-Import funktional |
| V7.1 | 02.01.2026 | Berater-Portal CRUD komplett |
| V7.0 | 27.12.2025 | Berater-Portal Grundstruktur |
| V6.7 | 20.12.2025 | Letzte stabile V6 (FZul-Analyse) |
| V1-V5 | Okt-Nov 2025 | Prototypen und Konzepterprobung |

### 14.3 Zugehörige Dokumente

| Dokument | Version | Beschreibung |
|----------|---------|--------------|
| **PZE-V7-PROJEKTPLAN** | v1.2 | Detaillierter Arbeitsplan mit Plan/Ist-Aufwänden |
| V7-DB-SCHEMA.sql | - | Datenbank-Schema Referenz |
| KONZEPT-FZUL-ONLINE-EDITOR.md | - | FZul-Editor Konzept (Phase 4) |
| KONZEPT-FIRMEN-HIERARCHIE-v7_1.md | - | Berater/Kunden-Architektur |

---

**Erstellt:** 20. Januar 2026  
**Autor:** Claude AI / Martin Ditscherlein  
**Kontakt:** m.ditscherlein@cubintec.com
