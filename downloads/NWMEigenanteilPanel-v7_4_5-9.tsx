// src/components/shared/NWMEigenanteilPanel.tsx
// ============================================================================
// PZE V7 - NWM Eigenanteil-Berechnung und Zahlungsstatus
// ============================================================================
// Version: 7.4.5-9
// Datum: 26. Maerz 2026
//
// Berechnet quartalsweise Eigenanteile pro Netzwerkpartner:
// - Quartal-Auswahl (Dropdown)
// - NWM-Kosten aus ZE berechnen (foerderfaehige Std x hourly_rate_approved)
//   PLUS manuell: Auftraege an Dritte
//   PLUS automatisch: Uebrige Kosten (100% Personalkosten, lt. Richtlinie)
// - Foerdersatz automatisch aus foerdersatz_stufen + Laufzeitjahr
// - Eigenanteil je NP berechnen und in v7_netzwerk_eigenanteile speichern
// - Zahlungseingang erfassen, Status pflegen
// - PDF: Rechnung Cubintec -> NP
// - PDF: PT-Nachweis Eigenanteil-Eingang
// v7.4.5-9: FIX: periodeStart not defined in generatePerioden
// v7.4.5-8: Intelligenter Periodenvorschlag ab letzter abgerechneter Periode
//   Laedt letztes periode_bis aus DB, naechster Vorschlag = +1 Tag bis +3 Monate
//   Faellt automatisch ins urspruengliche Raster zurueck
// v7.4.5-7: Von/Bis-Datumsfelder frei waehlbar
//   Perioden-Dropdown als Vorschlag, Von/Bis direkt editierbar
// v7.4.5-6: FIX: Cent-genaue Betragsverteilung
//   Rundungsrest geht an letzten NP (max. 1 Cent Differenz)
//   Quoten bleiben unveraendert, Betrag wird direkt verteilt
// v7.4.5-5: FIX: Perioden-Datum Off-by-one (lokale Strings statt toISOString)
// v7.4.5-4: FIX: ZE-Query auf alte Timesheet-Struktur umgestellt
//   (work_date/hours/is_active/is_billable statt year/month/total_fue_hours)
// v7.4.5-3: FIX: Perioden-Dropdown schaltet korrekt um (Index statt Objekt-Vergleich)
// v7.4.5-2: FIX: Perioden ab Projektstart (3-Monats-Rhythmus, nicht Kalenderquartale)
//   FIX: ZE-Query korrigiert (year/month statt date-Range, total_fue_hours)
//   FIX: hourly_rate_approved Fallback korrekt
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Calculator,
  CheckCircle,
  AlertCircle,
  X,
  FileText,
  Euro,
  Clock,
  Download,
  Save,
  Pencil,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

interface FoerdersatzStufe {
  laufzeitjahr: number;
  satz_percent: number;
  gueltig_ab: string;
}

interface NWMProjekt {
  id: string;
  name: string;
  funding_reference: string | null;
  start_date: string | null;
  netzwerk_typ: string | null;
  netzwerk_phase: string | null;
  bewilligung_datum: string | null;
  phase2_start_datum: string | null;
  foerdersatz_stufen: FoerdersatzStufe[] | null;
  nwm_bank_kontoinhaber: string | null;
  nwm_bank_iban: string | null;
  nwm_bank_bic: string | null;
  nwm_bank_name: string | null;
  nwm_ust_id: string | null;
  nwm_rechnung_prefix: string | null;
  nwm_rechnung_naechste: number | null;
  nwm_faelligkeitsfrist: number | null;
}

interface NetzwerkPartner {
  id: string;
  name: string;
  rechtsform: string | null;
  ansprechpartner: string | null;
  email: string | null;
  adresse_strasse: string | null;
  adresse_plz: string | null;
  adresse_ort: string | null;
  ust_id: string | null;
  eigenanteil_quote: number;
  ust_satz: number;
  beitritt_datum: string;
  austritt_datum: string | null;
}

interface Eigenanteil {
  id: string;
  partner_id: string;
  periode_von: string;
  periode_bis: string;
  nwm_kosten_gesamt: number;
  foerdersatz_percent: number;
  laufzeitjahr: number;
  eigenanteil_quote: number;
  anteil_gesamtleistung_netto: number;
  foerderanteil_pt: number;
  betrag_soll: number;
  ust_satz: number;
  ust_betrag: number;
  betrag_brutto: number;
  rechnung_nr: string | null;
  rechnung_datum: string | null;
  betrag_ist: number | null;
  eingegangen_am: string | null;
  mahnung_datum: string | null;
  status: string;
  notizen: string | null;
}

interface ProjectAssignment {
  employee_id: string;
  hourly_rate: number | null;
  hourly_rate_approved: number | null;
}

interface NWMEigenanteilPanelProps {
  portal: 'berater' | 'firma';
  project: NWMProjekt;
  companyName: string;
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

const fmt2 = (v: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('de-DE') : '--';

// Laufzeitjahr berechnen
const calcLaufzeitjahr = (
  bewilligungDatum: string | null,
  phase2Datum: string | null,
  phase: string | null,
  periodeBis: string
): number => {
  const basisDatum = phase === 'phase2' ? (phase2Datum || bewilligungDatum) : bewilligungDatum;
  if (!basisDatum) return 1;
  const beg = new Date(basisDatum);
  const bis = new Date(periodeBis);
  const diffMs = bis.getTime() - beg.getTime();
  const diffYears = diffMs / (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(1, Math.ceil(diffYears));
};

// Foerdersatz aus Stufen ermitteln
const getFoerdersatz = (
  stufen: FoerdersatzStufe[] | null,
  laufzeitjahr: number,
  typ: string | null,
  phase: string | null
): number => {
  if (stufen && stufen.length > 0) {
    const stufe = stufen.find(s => s.laufzeitjahr === laufzeitjahr);
    return stufe ? stufe.satz_percent : (stufen[stufen.length - 1]?.satz_percent || 30);
  }
  // Fallback-Werte wenn keine Stufen konfiguriert
  const isInt = typ === 'international';
  const isPhase1 = phase === 'phase1';
  if (isPhase1) return isInt ? 95 : 90;
  if (laufzeitjahr === 1) return isInt ? 80 : 70;
  if (laufzeitjahr === 2) return isInt ? 60 : 50;
  return isInt ? 40 : 30;
};

// Abrechnungsperioden ab Projektstart im 3-Monats-Rhythmus generieren
const generatePerioden = (startDate: string | null): { label: string; von: string; bis: string }[] => {
  if (!startDate) return [];
  const result = [];
  const start = new Date(startDate);
  // Sicherstellen dass wir am 1. des Startmonats beginnen
  const basisJahr = start.getFullYear();
  const basisMonat = start.getMonth(); // 0-basiert
  const now = new Date();
  // Bis 2 Perioden in der Zukunft generieren
  const maxDatum = new Date(now.getFullYear(), now.getMonth() + 6, 1);
  let periodeJahr = basisJahr;
  let periodeMonat = basisMonat; // 0-basiert
  let periodeNr = 1;
  while (new Date(periodeJahr, periodeMonat, 1) <= maxDatum) {
    // Datum direkt als lokale Strings konstruieren - kein UTC-Problem
    const pad = (n: number) => String(n).padStart(2, '0');
    const vonStr = `${periodeJahr}-${pad(periodeMonat + 1)}-01`;
    // Ende: 3 Monate spaeter, Tag 0 = letzter Tag des Vormonats
    const endMonat = periodeMonat + 3;
    const endJahrRaw = periodeJahr + Math.floor(endMonat / 12);
    const endMonatRaw = endMonat % 12; // 0-basiert, Tag 0 = letzter des Vormonats
    const letzterTag = new Date(endJahrRaw, endMonatRaw, 0).getDate();
    const bisStr = `${endJahrRaw}-${pad(endMonatRaw)}-${pad(letzterTag)}`;
    // Label: "Periode 1 (Aug-Okt 2025)"
    const vonLabel = new Date(periodeJahr, periodeMonat).toLocaleString('de-DE', { month: 'short' });
    const endDatum = new Date(endJahrRaw, endMonatRaw - 1);
    const bisLabel = endDatum.toLocaleString('de-DE', { month: 'short', year: '2-digit' });
    result.push({
      label: `Periode ${periodeNr} (${vonLabel}-${bisLabel})`,
      von: vonStr,
      bis: bisStr,
    });
    periodeMonat += 3;
    if (periodeMonat >= 12) {
      periodeJahr += Math.floor(periodeMonat / 12);
      periodeMonat = periodeMonat % 12;
    }
    periodeNr++;
  }
  return result;
};

// Rechnungsnummer generieren
const genRechnungsnr = (prefix: string | null, naechste: number | null): string => {
  const year = new Date().getFullYear().toString().slice(-2);
  const pre = prefix || year;
  const nr = String(naechste || 1).padStart(4, '0');
  return `${pre}${nr}`;
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function NWMEigenanteilPanel({
  portal,
  project,
  companyName,
}: NWMEigenanteilPanelProps) {
  const supabase = createClient();

  const btnPrimary = portal === 'firma' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700';
  const focusRing = portal === 'firma' ? 'focus:ring-green-500 focus:border-green-500' : 'focus:ring-blue-500 focus:border-blue-500';

  // Perioden-Auswahl (3-Monats-Rhythmus ab Projektstart als Vorschlag)
  const perioden = generatePerioden(project.start_date);
  const now = new Date();
  const defaultIdx = (() => {
    const idx = perioden.findIndex(q => now >= new Date(q.von) && now <= new Date(q.bis));
    return idx >= 0 ? idx : Math.max(0, perioden.length - 1);
  })();
  const defaultPeriode = perioden[defaultIdx] || perioden[0] || { label: 'Manuell', von: project.start_date || '', bis: '' };
  const [selectedIdx, setSelectedIdx] = useState<number | -1>(defaultIdx);
  const [vonDatum, setVonDatum] = useState(defaultPeriode.von);
  const [bisDatum, setBisDatum] = useState(defaultPeriode.bis);
  const [naechsteVorschlag, setNaechsteVorschlag] = useState<{ von: string; bis: string } | null>(null);
  // selectedQ immer aus den freien Datumsfeldern
  const selectedQ = { label: 'Manuell', von: vonDatum, bis: bisDatum };

  // Daten
  const [partner, setPartner] = useState<NetzwerkPartner[]>([]);
  const [eigenanteile, setEigenanteile] = useState<Eigenanteil[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [nwmKostenDritte, setNwmKostenDritte] = useState('');
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Zahlungseingang-Dialog
  const [zahlung, setZahlung] = useState<{ id: string; betrag: string; datum: string } | null>(null);

  // ---- Daten laden ----
  const loadDaten = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Aktive Partner laden
      const { data: npData } = await supabase
        .from('v7_netzwerk_partner')
        .select('*')
        .eq('project_id', project.id)
        .is('austritt_datum', null)
        .order('sort_order');
      setPartner(npData || []);

      // Eigenanteile fuer dieses Quartal laden
      const { data: eaData } = await supabase
        .from('v7_netzwerk_eigenanteile')
        .select('*')
        .eq('project_id', project.id)
        .eq('periode_von', selectedQ.von)
        .eq('periode_bis', selectedQ.bis);
      setEigenanteile(eaData || []);

      // Project Assignments fuer Stundensaetze
      const { data: paData } = await supabase
        .from('v7_project_assignments')
        .select('employee_id, hourly_rate, hourly_rate_approved')
        .eq('project_id', project.id)
        .eq('is_active', true);
      setAssignments(paData || []);

      // Letztes periode_bis aus allen EA dieses Projekts laden
      // -> daraus naechsten intelligenten Periodenvorschlag berechnen
      const { data: letzteEA } = await supabase
        .from('v7_netzwerk_eigenanteile')
        .select('periode_bis')
        .eq('project_id', project.id)
        .order('periode_bis', { ascending: false })
        .limit(1);

      if (letzteEA && letzteEA.length > 0) {
        const letztesBis = new Date(letzteEA[0].periode_bis);
        // Naechster Von = letztes Bis + 1 Tag
        const naechstesVon = new Date(letztesBis);
        naechstesVon.setDate(naechstesVon.getDate() + 1);
        // Naechstes Bis = Von + 3 Monate - 1 Tag
        const naechstesBis = new Date(naechstesVon);
        naechstesBis.setMonth(naechstesBis.getMonth() + 3);
        naechstesBis.setDate(naechstesBis.getDate() - 1);
        const pad = (n: number) => String(n).padStart(2, '0');
        const vonStr = `${naechstesVon.getFullYear()}-${pad(naechstesVon.getMonth() + 1)}-${pad(naechstesVon.getDate())}`;
        const bisStr = `${naechstesBis.getFullYear()}-${pad(naechstesBis.getMonth() + 1)}-${pad(naechstesBis.getDate())}`;
        setNaechsteVorschlag({ von: vonStr, bis: bisStr });
      } else {
        setNaechsteVorschlag(null);
      }

      // Auftraege Dritte aus ZA laden falls vorhanden
      const { data: zaData } = await supabase
        .from('v7_zahlungsanforderungen')
        .select('nwm_kosten_dritte, zeitraum_von, zeitraum_bis')
        .eq('project_id', project.id)
        .gte('zeitraum_bis', selectedQ.von)
        .lte('zeitraum_von', selectedQ.bis)
        .order('za_nummer', { ascending: false })
        .limit(1);
      if (zaData && zaData.length > 0 && zaData[0].nwm_kosten_dritte) {
        setNwmKostenDritte(String(zaData[0].nwm_kosten_dritte));
      }
    } catch (err: any) {
      setError('Fehler beim Laden: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [project.id, vonDatum, bisDatum, supabase]);

  useEffect(() => { loadDaten(); }, [loadDaten]);

  // ---- Berechnungen ----
  const laufzeitjahr = calcLaufzeitjahr(
    project.bewilligung_datum,
    project.phase2_start_datum,
    project.netzwerk_phase,
    selectedQ.bis
  );

  const foerdersatz = getFoerdersatz(
    project.foerdersatz_stufen,
    laufzeitjahr,
    project.netzwerk_typ,
    project.netzwerk_phase
  );

  const eigenanteilsquote = 100 - foerdersatz;

  // NWM-Personalkosten aus Eigenanteilen (falls bereits berechnet)
  const existingEA = eigenanteile[0];
  const nwmPersonalkosten = existingEA
    ? existingEA.nwm_kosten_gesamt - (parseFloat(nwmKostenDritte) || 0) - (existingEA.nwm_kosten_gesamt - (parseFloat(nwmKostenDritte) || 0)) / 2
    : 0;

  const nwmDritte = parseFloat(nwmKostenDritte.replace(',', '.')) || 0;

  // Kosten aus vorhandenen EA lesen (Snapshot)
  const nwmKostenGesamt = existingEA ? existingEA.nwm_kosten_gesamt : 0;
  const foerderbetragPT = Math.round(nwmKostenGesamt * foerdersatz / 100 * 100) / 100;
  const eigenanteilGesamt = nwmKostenGesamt - foerderbetragPT;

  // Summen aus EA-Liste
  const summeBrutto = eigenanteile.reduce((s, ea) => s + ea.betrag_brutto, 0);
  const summeBezahlt = eigenanteile.filter(e => e.status === 'bezahlt').reduce((s, ea) => s + (ea.betrag_ist || ea.betrag_brutto), 0);
  const summeOffen = eigenanteile.filter(e => e.status !== 'bezahlt' && e.status !== 'storniert').reduce((s, ea) => s + ea.betrag_brutto, 0);

  // ---- Eigenanteile berechnen und speichern ----
  const handleBerechnen = async () => {
    if (partner.length === 0) {
      setError('Keine aktiven Netzwerkpartner vorhanden.');
      return;
    }
    if (!project.bewilligung_datum) {
      setError('Bewilligungsdatum fehlt. Bitte in Einstellungen hinterlegen.');
      return;
    }

    setCalculating(true);
    setError(null);
    try {
      // Personalkosten aus ZE berechnen
      // Prod-Struktur: v7_timesheets mit work_date/hours/is_active/is_billable
      const { data: tsData, error: tsError } = await supabase
        .from('v7_timesheets')
        .select('employee_id, hours, work_date, is_active, is_billable')
        .eq('project_id', project.id)
        .gte('work_date', selectedQ.von)
        .lte('work_date', selectedQ.bis)
        .eq('is_active', true)
        .eq('is_billable', true);

      if (tsError) {
        console.error('ZE-Query Fehler:', tsError);
      }

      // Stunden je Mitarbeiter aggregieren
      const stundenJeMA: Record<string, number> = {};
      for (const ts of (tsData || [])) {
        const empId = ts.employee_id;
        stundenJeMA[empId] = (stundenJeMA[empId] || 0) + Number(ts.hours || 0);
      }

      // Personalkosten = Stunden x bewilligter Stundensatz
      let personalkosten = 0;
      for (const [empId, stunden] of Object.entries(stundenJeMA)) {
        if (stunden === 0) continue;
        const pa = assignments.find(a => a.employee_id === empId);
        const rate = Number(pa?.hourly_rate_approved || pa?.hourly_rate || 0);
        personalkosten += stunden * rate;
      }

      const uebrige = personalkosten; // 100% der Personalkosten
      const kostenGesamt = personalkosten + nwmDritte + uebrige;
      const foerderbetrag = Math.round(kostenGesamt * foerdersatz / 100 * 100) / 100;

      // Fuer jeden NP einen EA-Datensatz erstellen/aktualisieren
      let naechsteRechnungsnr = project.nwm_rechnung_naechste || 1;

      // Cent-genaue Verteilung: Gesamtbetrag in Cents berechnen
      // dann floor(Betrag/n) je NP, Rest an letzten NP
      const eigenanteilGesamtCents = Math.round(kostenGesamt * (100 - foerdersatz));
      // Cents je NP (floor)
      const centsJeNP = Math.floor(eigenanteilGesamtCents / partner.length);
      const restCents = eigenanteilGesamtCents - centsJeNP * partner.length;

      for (let npIdx = 0; npIdx < partner.length; npIdx++) {
        const np = partner[npIdx];
        const istLetzter = npIdx === partner.length - 1;

        // Betrag in Cents: letzter NP bekommt den Rundungsrest
        const betragSollCents = centsJeNP + (istLetzter ? restCents : 0);
        const betragSoll = betragSollCents / 100;

        // Anteil Gesamtleistung: proportional zum Soll-Betrag
        // Eigenanteil = Anteil - Foerderanteil
        // Anteil = betragSoll / (eigenanteilsquote/100)
        const eigenanteilsquote = (100 - foerdersatz) / 100;
        const anteilGesamt = eigenanteilsquote > 0
          ? Math.round(betragSoll / eigenanteilsquote * 100) / 100
          : 0;
        const foerderAnteil = Math.round((anteilGesamt - betragSoll) * 100) / 100;
        const ustBetrag = Math.round(anteilGesamt * np.ust_satz / 100 * 100) / 100;
        const betragBrutto = Math.round((betragSoll + ustBetrag) * 100) / 100;

        // Quote fuer Anzeige: aus Betrag rueckrechnen
        const quoteDisplay = kostenGesamt > 0
          ? Math.round(anteilGesamt / kostenGesamt * 10000) / 100
          : np.eigenanteil_quote;

        const payload = {
          project_id: project.id,
          partner_id: np.id,
          periode_von: selectedQ.von,
          periode_bis: selectedQ.bis,
          nwm_kosten_gesamt: Math.round(kostenGesamt * 100) / 100,
          foerdersatz_percent: foerdersatz,
          laufzeitjahr,
          eigenanteil_quote: quoteDisplay,
          anteil_gesamtleistung_netto: anteilGesamt,
          foerderanteil_pt: foerderAnteil,
          betrag_soll: betragSoll,
          ust_satz: np.ust_satz,
          ust_betrag: ustBetrag,
          betrag_brutto: betragBrutto,
          status: 'offen',
          updated_at: new Date().toISOString(),
        };

        // Pruefen ob bereits vorhanden
        const existing = eigenanteile.find(e => e.partner_id === np.id);
        if (existing && existing.status !== 'bezahlt') {
          await supabase
            .from('v7_netzwerk_eigenanteile')
            .update(payload)
            .eq('id', existing.id);
        } else if (!existing) {
          await supabase
            .from('v7_netzwerk_eigenanteile')
            .insert({ ...payload, rechnung_nr: genRechnungsnr(project.nwm_rechnung_prefix, naechsteRechnungsnr) });
          naechsteRechnungsnr++;
        }
      }

      // Naechste Rechnungsnummer in Projekt aktualisieren
      if (naechsteRechnungsnr > (project.nwm_rechnung_naechste || 1)) {
        await supabase
          .from('v7_projects')
          .update({ nwm_rechnung_naechste: naechsteRechnungsnr, updated_at: new Date().toISOString() })
          .eq('id', project.id);
      }

      setSuccess('Eigenanteile berechnet und gespeichert.');
      setTimeout(() => setSuccess(null), 4000);
      await loadDaten();
    } catch (err: any) {
      setError('Fehler bei Berechnung: ' + err.message);
    } finally {
      setCalculating(false);
    }
  };

  // ---- Zahlung erfassen ----
  const handleZahlungSpeichern = async () => {
    if (!zahlung) return;
    setSaving(true);
    try {
      await supabase
        .from('v7_netzwerk_eigenanteile')
        .update({
          betrag_ist: parseFloat(zahlung.betrag.replace(',', '.')) || 0,
          eingegangen_am: zahlung.datum,
          status: 'bezahlt',
          updated_at: new Date().toISOString(),
        })
        .eq('id', zahlung.id);
      setZahlung(null);
      setSuccess('Zahlungseingang erfasst.');
      setTimeout(() => setSuccess(null), 3000);
      await loadDaten();
    } catch (err: any) {
      setError('Fehler: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMahnung = async (id: string) => {
    await supabase
      .from('v7_netzwerk_eigenanteile')
      .update({ status: 'gemahnt', mahnung_datum: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() })
      .eq('id', id);
    await loadDaten();
  };

  // ---- PDF: Rechnung ----
  const handleRechnungPDF = (ea: Eigenanteil) => {
    const np = partner.find(p => p.id === ea.partner_id);
    if (!np) return;

    const faellig = new Date(ea.rechnung_datum || new Date());
    faellig.setDate(faellig.getDate() + (project.nwm_faelligkeitsfrist || 30));

    const iban = project.nwm_bank_iban
      ? project.nwm_bank_iban.replace(/(.{4})/g, '$1 ').trim()
      : 'Nicht hinterlegt';

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Rechnung ${ea.rechnung_nr || ''}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #222; margin: 20mm; }
  .header { display: flex; justify-content: space-between; margin-bottom: 10mm; }
  .absender { font-size: 9pt; color: #555; }
  .titel { font-size: 18pt; font-weight: bold; margin: 8mm 0 4mm; }
  table { width: 100%; border-collapse: collapse; margin: 5mm 0; }
  th { background: #f0f0f0; text-align: left; padding: 3mm; font-size: 9pt; }
  td { padding: 2.5mm 3mm; font-size: 10pt; border-bottom: 0.5pt solid #ddd; }
  .sum { font-weight: bold; background: #f8f8f8; }
  .foerder { background: #e8f0ff; }
  .eigen { background: #fff3e0; }
  .total { font-weight: bold; font-size: 12pt; background: #e8f5e9; }
  .bank { margin-top: 8mm; padding: 4mm; background: #f5f5f5; font-size: 9pt; }
  .footer { margin-top: 10mm; font-size: 8pt; color: #888; border-top: 0.5pt solid #ccc; padding-top: 3mm; }
  @page { size: A4 portrait; margin: 20mm; }
</style>
</head>
<body>
<div class="header">
  <div>
    <strong>${companyName}</strong><br>
    Rederstrasse 24<br>
    97616 Bad Neustadt a.d. Saale<br>
    USt-IdNr.: ${project.nwm_ust_id || 'nicht hinterlegt'}
  </div>
  <div style="text-align:right; font-size:9pt; color:#555;">
    Rechnungsnummer: <strong>${ea.rechnung_nr || '--'}</strong><br>
    Rechnungsdatum: ${fmtDate(ea.rechnung_datum || new Date().toISOString().slice(0, 10))}<br>
    Faellig bis: ${fmtDate(faellig.toISOString().slice(0, 10))}
  </div>
</div>

<div style="margin-bottom:8mm; font-size:10pt;">
  <strong>${np.name}</strong><br>
  ${np.adresse_strasse ? np.adresse_strasse + '<br>' : ''}
  ${np.adresse_plz && np.adresse_ort ? np.adresse_plz + ' ' + np.adresse_ort + '<br>' : ''}
  ${np.ust_id ? 'USt-IdNr.: ' + np.ust_id : ''}
</div>

<div class="titel">RECHNUNG</div>

<p style="font-size:10pt; margin-bottom:5mm;">
  <strong>Betreff:</strong> Netzwerkmanagement ${project.name} &ndash; Eigenbeteiligung<br>
  <strong>Abrechnungszeitraum:</strong> ${fmtDate(ea.periode_von)} bis ${fmtDate(ea.periode_bis)}<br>
  <strong>Foerderzeichen:</strong> ${project.funding_reference || '--'}
</p>

<table>
  <tr><th>Position</th><th style="text-align:right; width:30mm;">Betrag (EUR)</th></tr>
  <tr>
    <td>
      Netzwerkmanagement-Gesamtleistung (netto)<br>
      <span style="font-size:9pt; color:#555;">Laufzeitjahr ${ea.laufzeitjahr} | Foerdersatz ${ea.foerdersatz_percent}%</span>
    </td>
    <td style="text-align:right;">${fmt2(ea.nwm_kosten_gesamt)}</td>
  </tr>
  <tr class="foerder">
    <td>Ihr Leistungsanteil (${ea.eigenanteil_quote}% der Gesamtleistung)</td>
    <td style="text-align:right;">${fmt2(ea.anteil_gesamtleistung_netto)}</td>
  </tr>
  <tr class="foerder">
    <td>./. Foerderanteil Projekttraeger (${ea.foerdersatz_percent}%)</td>
    <td style="text-align:right;">-${fmt2(ea.foerderanteil_pt)}</td>
  </tr>
  <tr class="eigen">
    <td><strong>Eigenanteil netto</strong></td>
    <td style="text-align:right;"><strong>${fmt2(ea.betrag_soll)}</strong></td>
  </tr>
  ${ea.ust_satz > 0
    ? `<tr><td>zzgl. Umsatzsteuer ${ea.ust_satz}% auf ${fmt2(ea.anteil_gesamtleistung_netto)} EUR</td><td style="text-align:right;">${fmt2(ea.ust_betrag)}</td></tr>`
    : `<tr><td>Umsatzsteuer: steuerfrei gemaess &sect; 4 UStG</td><td style="text-align:right;">0,00</td></tr>`
  }
  <tr class="total">
    <td><strong>Rechnungsbetrag</strong></td>
    <td style="text-align:right;"><strong>${fmt2(ea.betrag_brutto)} EUR</strong></td>
  </tr>
</table>

<div class="bank">
  <strong>Bankverbindung:</strong><br>
  Kontoinhaber: ${project.nwm_bank_kontoinhaber || companyName}<br>
  Bank: ${project.nwm_bank_name || '--'}<br>
  IBAN: ${iban}<br>
  BIC: ${project.nwm_bank_bic || '--'}<br>
  Verwendungszweck: <strong>${ea.rechnung_nr || ''} ${np.name.slice(0, 20)}</strong>
</div>

<div class="footer">
  ${companyName} | ZIM-Innovationsnetzwerk | Foerderrichtlinie ZIM 2024 | Projekttraeger: VDI/VDE Innovation + Technik GmbH
</div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) { alert('Popup blockiert. Bitte Popups erlauben.'); return; }
    w.document.write(html);
    w.document.close();
    w.document.title = `Rechnung_${ea.rechnung_nr || 'NWM'}_${np.name.replace(/\s/g, '_')}.pdf`;
    setTimeout(() => { w.print(); }, 400);
  };

  // ---- PDF: PT-Nachweis ----
  const handlePTNachweisPDF = () => {
    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>PT-Nachweis Eigenanteile ${selectedQ.label}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #222; margin: 15mm; }
  h1 { font-size: 14pt; border-bottom: 1pt solid #333; padding-bottom: 2mm; margin-bottom: 5mm; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; margin-bottom: 6mm; font-size: 9pt; }
  .meta-label { color: #666; }
  table { width: 100%; border-collapse: collapse; margin: 4mm 0; font-size: 9pt; }
  th { background: #e0e8ff; text-align: left; padding: 2mm 3mm; border: 0.5pt solid #aaa; }
  td { padding: 2mm 3mm; border: 0.5pt solid #ccc; }
  .bezahlt { color: #1a7a1a; font-weight: bold; }
  .offen { color: #cc4400; }
  .gemahnt { color: #cc8800; }
  .sumrow { background: #f0f0f0; font-weight: bold; }
  .confirm { margin-top: 10mm; font-size: 9pt; padding: 4mm; border: 0.5pt solid #aaa; }
  .sig { margin-top: 15mm; display: flex; gap: 40mm; }
  .sig-line { border-top: 0.5pt solid #333; padding-top: 2mm; font-size: 9pt; width: 60mm; }
  @page { size: A4 portrait; margin: 15mm; }
</style>
</head>
<body>
<h1>Nachweis Eigenbeteiligungen Netzwerkpartner</h1>
<div class="meta">
  <div><span class="meta-label">Netzwerk:</span><br><strong>${project.name}</strong></div>
  <div><span class="meta-label">Foerderzeichen:</span><br><strong>${project.funding_reference || '--'}</strong></div>
  <div><span class="meta-label">Abrechnungszeitraum:</span><br><strong>${fmtDate(selectedQ.von)} bis ${fmtDate(selectedQ.bis)}</strong></div>
  <div><span class="meta-label">Erstellt am:</span><br><strong>${new Date().toLocaleDateString('de-DE')}</strong></div>
  <div><span class="meta-label">Foerderphase / Laufzeitjahr:</span><br><strong>${project.netzwerk_phase === 'phase1' ? 'Phase 1' : 'Phase 2'} / Jahr ${laufzeitjahr}</strong></div>
  <div><span class="meta-label">Foerdersatz NWM:</span><br><strong>${foerdersatz}% (Eigenanteil ${eigenanteilsquote}%)</strong></div>
  <div><span class="meta-label">NWM-Kosten gesamt (netto):</span><br><strong>${existingEA ? fmt2(existingEA.nwm_kosten_gesamt) : '--'} EUR</strong></div>
  <div><span class="meta-label">Erstellt von:</span><br><strong>${companyName} (NWM)</strong></div>
</div>

<table>
  <tr>
    <th>Nr.</th>
    <th>Netzwerkpartner</th>
    <th style="text-align:right;">Anteil</th>
    <th style="text-align:right;">Soll netto (EUR)</th>
    <th style="text-align:right;">Rechnung</th>
    <th>Eingegangen am</th>
    <th>Status</th>
  </tr>
  ${eigenanteile.map((ea, idx) => {
    const np = partner.find(p => p.id === ea.partner_id);
    const statusClass = ea.status === 'bezahlt' ? 'bezahlt' : ea.status === 'gemahnt' ? 'gemahnt' : 'offen';
    const statusLabel = ea.status === 'bezahlt' ? 'bezahlt' : ea.status === 'gemahnt' ? 'gemahnt' : 'offen';
    return `<tr>
      <td>${idx + 1}</td>
      <td>${np?.name || '--'}</td>
      <td style="text-align:right;">${ea.eigenanteil_quote.toFixed(2)}%</td>
      <td style="text-align:right;">${fmt2(ea.betrag_soll)}</td>
      <td style="text-align:right;">${ea.rechnung_nr || '--'}</td>
      <td>${fmtDate(ea.eingegangen_am)}</td>
      <td class="${statusClass}">${statusLabel}</td>
    </tr>`;
  }).join('')}
  <tr class="sumrow">
    <td colspan="3">Summe</td>
    <td style="text-align:right;">${fmt2(eigenanteile.reduce((s, e) => s + e.betrag_soll, 0))}</td>
    <td colspan="3"></td>
  </tr>
</table>

<div class="confirm">
  <strong>Bestaetigung der Netzwerkmanagementeinrichtung:</strong><br><br>
  Mit Einreichung dieser Zahlungsanforderung bestaetigt ${companyName} als Netzwerkmanagementeinrichtung,
  dass die als "bezahlt" ausgewiesenen Eigenbeteiligungen der Netzwerkpartner fuer den Abrechnungszeitraum
  ${fmtDate(selectedQ.von)} bis ${fmtDate(selectedQ.bis)} eingegangen sind und als Nachweis erbrachter
  Managementleistungen gemaess ZIM-Foerderrichtlinie 2024 Abschnitt 6.2.5 d) dienen.
</div>

<div class="sig">
  <div class="sig-line">Ort, Datum</div>
  <div class="sig-line">Unterschrift Netzwerkmanagement</div>
</div>
</body>
</html>`;

    const w = window.open('', '_blank');
    if (!w) { alert('Popup blockiert. Bitte Popups erlauben.'); return; }
    w.document.write(html);
    w.document.close();
    w.document.title = `PT-Nachweis_Eigenanteile_${selectedQ.label.replace(' ', '_')}.pdf`;
    setTimeout(() => { w.print(); }, 400);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bezahlt': return 'bg-green-100 text-green-700 border-green-200';
      case 'gemahnt': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'storniert': return 'bg-gray-100 text-gray-500 border-gray-200';
      default: return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'bezahlt': return 'bezahlt';
      case 'gemahnt': return 'gemahnt';
      case 'storniert': return 'storniert';
      default: return 'offen';
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-4">

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* ---- Quartal-Auswahl + Foerderinfo ---- */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-medium text-gray-700">Abrechnungszeitraum:</label>
            {/* Perioden-Vorschlag */}
            <select
              value={selectedIdx === -1 ? '__manuell__' : (selectedIdx === -2 ? '__naechste__' : String(selectedIdx))}
              onChange={e => {
                if (e.target.value === '__manuell__') {
                  setSelectedIdx(-1);
                } else if (e.target.value === '__naechste__') {
                  setSelectedIdx(-2);
                  if (naechsteVorschlag) {
                    setVonDatum(naechsteVorschlag.von);
                    setBisDatum(naechsteVorschlag.bis);
                  }
                } else {
                  const idx = parseInt(e.target.value);
                  setSelectedIdx(idx);
                  const p = perioden[idx];
                  if (p) { setVonDatum(p.von); setBisDatum(p.bis); }
                }
              }}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
            >
              {naechsteVorschlag && (
                <option value="__naechste__">
                  Naechste Periode ({naechsteVorschlag.von} -- {naechsteVorschlag.bis})
                </option>
              )}
              <optgroup label="Perioden ab Projektstart">
                {perioden.map((q, i) => (
                  <option key={q.label} value={String(i)}>{q.label}</option>
                ))}
              </optgroup>
              <option value="__manuell__">Manuell eingeben</option>
            </select>
            {/* Freie Von/Bis-Felder */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">von</label>
              <input
                type="date"
                value={vonDatum}
                onChange={e => { setVonDatum(e.target.value); setSelectedIdx(-1); }}
                className={`px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
              />
              <label className="text-xs text-gray-500">bis</label>
              <input
                type="date"
                value={bisDatum}
                onChange={e => { setBisDatum(e.target.value); setSelectedIdx(-1); }}
                className={`px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
              />
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              Laufzeitjahr {laufzeitjahr}
            </span>
            <span className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded font-medium">
              Foerdersatz {foerdersatz}%
            </span>
            <span className="px-2 py-0.5 bg-orange-50 border border-orange-200 text-orange-700 rounded font-medium">
              Eigenanteil {eigenanteilsquote}%
            </span>
          </div>
        </div>
      </div>

      {/* ---- Kacheln ---- */}
      {eigenanteile.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'NWM-Kosten gesamt', value: fmt2(nwmKostenGesamt) + ' EUR', sub: 'netto' },
            { label: 'Foerderbetrag PT', value: fmt2(foerderbetragPT) + ' EUR', sub: foerdersatz + '%', color: 'text-blue-700' },
            { label: 'Eigenanteil gesamt', value: fmt2(eigenanteilGesamt) + ' EUR', sub: eigenanteilsquote + '%', color: 'text-orange-700' },
            { label: 'Offen', value: fmt2(summeOffen) + ' EUR', sub: 'brutto', color: summeOffen > 0 ? 'text-red-600' : 'text-green-600' },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="text-xs text-gray-500 mb-1">{k.label}</div>
              <div className={`text-base font-bold ${k.color || 'text-gray-900'}`}>{k.value}</div>
              <div className="text-xs text-gray-400">{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Aktions-Panel ---- */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Auftraege Dritte (manuell):</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={nwmKostenDritte}
              onChange={e => setNwmKostenDritte(e.target.value)}
              placeholder="0,00"
              className={`w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 ${focusRing}`}
            />
            <span className="text-xs text-gray-400">EUR</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleBerechnen}
              disabled={calculating || loading}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 ${btnPrimary}`}
            >
              <Calculator size={13} />
              {calculating ? 'Berechne...' : 'Eigenanteile berechnen'}
            </button>
            {eigenanteile.length > 0 && (
              <>
                <button
                  onClick={handlePTNachweisPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg"
                >
                  <FileText size={13} />
                  PT-Nachweis PDF
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ---- NP-Tabelle ---- */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className={`w-8 h-8 border-4 rounded-full animate-spin ${portal === 'firma' ? 'border-green-200 border-t-green-600' : 'border-blue-200 border-t-blue-600'}`}></div>
        </div>
      ) : eigenanteile.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Euro size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 mb-2">Noch keine Eigenanteile fuer {selectedQ.label} berechnet.</p>
          <p className="text-xs text-gray-400">Klick auf "Eigenanteile berechnen" um die Berechnung zu starten.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Netzwerkpartner</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Quote</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Netto (EUR)</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">USt.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Brutto (EUR)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Rechnung</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Eingegangen</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {eigenanteile.map(ea => {
                const np = partner.find(p => p.id === ea.partner_id);
                return (
                  <tr key={ea.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{np?.name || '--'}</div>
                      {np?.ansprechpartner && (
                        <div className="text-xs text-gray-400">{np.ansprechpartner}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {ea.eigenanteil_quote.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {fmt2(ea.betrag_soll)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {ea.ust_satz > 0 ? fmt2(ea.ust_betrag) : '0,00'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
                      {fmt2(ea.betrag_brutto)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {ea.rechnung_nr || '--'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {ea.eingegangen_am ? fmtDate(ea.eingegangen_am) : '--'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(ea.status)}`}>
                        {getStatusLabel(ea.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {ea.status !== 'bezahlt' && (
                          <button
                            onClick={() => setZahlung({ id: ea.id, betrag: String(ea.betrag_brutto), datum: new Date().toISOString().slice(0, 10) })}
                            title="Zahlungseingang erfassen"
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          >
                            <CheckCircle size={15} />
                          </button>
                        )}
                        {ea.status === 'offen' && (
                          <button
                            onClick={() => handleMahnung(ea.id)}
                            title="Als gemahnt markieren"
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          >
                            <Clock size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => handleRechnungPDF(ea)}
                          title="Rechnung PDF"
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Download size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Summenzeile */}
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-sm">
                <td colSpan={2} className="px-4 py-3 text-right text-gray-600">Summe:</td>
                <td className="px-4 py-3 text-right font-mono">{fmt2(eigenanteile.reduce((s, e) => s + e.betrag_soll, 0))}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-500">{fmt2(eigenanteile.reduce((s, e) => s + e.ust_betrag, 0))}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt2(summeBrutto)}</td>
                <td colSpan={4} className="px-4 py-3 text-xs text-gray-500">
                  Bezahlt: {fmt2(summeBezahlt)} EUR | Offen: {fmt2(summeOffen)} EUR
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ================================================================== */}
      {/* DIALOG: Zahlungseingang erfassen                                    */}
      {/* ================================================================== */}
      {zahlung && (() => {
        const ea = eigenanteile.find(e => e.id === zahlung.id);
        const np = ea ? partner.find(p => p.id === ea.partner_id) : null;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Zahlungseingang erfassen</h3>
                <p className="text-xs text-gray-500 mt-0.5">{np?.name}</p>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Eingegangener Betrag (brutto EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={zahlung.betrag}
                    onChange={e => setZahlung(z => z ? { ...z, betrag: e.target.value } : z)}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                  />
                  <p className="text-xs text-gray-400 mt-1">Soll-Betrag: {ea ? fmt2(ea.betrag_brutto) : '--'} EUR</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Eingangsdatum</label>
                  <input
                    type="date"
                    value={zahlung.datum}
                    onChange={e => setZahlung(z => z ? { ...z, datum: e.target.value } : z)}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => setZahlung(null)}
                  className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleZahlungSpeichern}
                  disabled={saving}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${btnPrimary}`}
                >
                  <Save size={15} />
                  {saving ? 'Speichern...' : 'Eingang bestaetigen'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
