// src/components/shared/NWMEinstellungenPanel.tsx
// ============================================================================
// PZE V7 - NWM Einstellungen
// ============================================================================
// Version: 7.4.5-1
// Datum: 26. Maerz 2026
//
// Zeigt und bearbeitet alle NWM-spezifischen Projekteinstellungen:
// - Netzwerktyp / Phase / Bewilligungsdaten
// - Foerdersatz-Stufen (auto berechnet, manuell ueberschreibbar)
// - Bankdaten Cubintec (fuer NP-Rechnungen)
// - USt-ID, Rechnungsnummernkreis, Faelligkeitsfrist
// Speichert direkt in v7_projects.
// ============================================================================

'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Pencil,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Settings,
  Building2,
  CreditCard,
  FileText,
  Calendar,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

interface FoerdersatzStufe {
  laufzeitjahr: number;
  satz_percent: number;
  gueltig_ab: string;
}

interface NWMProjektDaten {
  id: string;
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

interface NWMEinstellungenPanelProps {
  portal: 'berater' | 'firma';
  project: NWMProjektDaten;
  onProjectUpdate: (updated: Partial<NWMProjektDaten>) => void;
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

// Foerdersatz-Stufen automatisch berechnen
const berechneStufen = (
  typ: string,
  phase: string,
  bewilligungDatum: string,
  phase2Datum: string | null
): FoerdersatzStufe[] => {
  const isInt = typ === 'international';
  const isPhase1 = phase === 'phase1';
  const basisDatum = isPhase1
    ? bewilligungDatum
    : (phase2Datum || bewilligungDatum);

  if (!basisDatum) return [];

  const addJahr = (datum: string, jahre: number): string => {
    const d = new Date(datum);
    d.setFullYear(d.getFullYear() + jahre);
    return d.toISOString().slice(0, 10);
  };

  if (isPhase1) {
    const satz = isInt ? 95 : 90;
    return [
      { laufzeitjahr: 1, satz_percent: satz, gueltig_ab: basisDatum },
      { laufzeitjahr: 2, satz_percent: satz, gueltig_ab: addJahr(basisDatum, 1) },
    ];
  } else {
    // Phase 2
    if (isInt) {
      return [
        { laufzeitjahr: 1, satz_percent: 80, gueltig_ab: basisDatum },
        { laufzeitjahr: 2, satz_percent: 60, gueltig_ab: addJahr(basisDatum, 1) },
        { laufzeitjahr: 3, satz_percent: 40, gueltig_ab: addJahr(basisDatum, 2) },
        { laufzeitjahr: 4, satz_percent: 40, gueltig_ab: addJahr(basisDatum, 3) },
      ];
    } else {
      return [
        { laufzeitjahr: 1, satz_percent: 70, gueltig_ab: basisDatum },
        { laufzeitjahr: 2, satz_percent: 50, gueltig_ab: addJahr(basisDatum, 1) },
        { laufzeitjahr: 3, satz_percent: 30, gueltig_ab: addJahr(basisDatum, 2) },
        { laufzeitjahr: 4, satz_percent: 30, gueltig_ab: addJahr(basisDatum, 3) },
      ];
    }
  }
};

// IBAN formatieren (Leerzeichen alle 4 Zeichen)
const formatIBAN = (raw: string): string => {
  const clean = raw.replace(/\s/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
};

// Rechnungsnummer-Vorschau
const previewRechnungsnr = (prefix: string | null, naechste: number | null): string => {
  const year = new Date().getFullYear().toString().slice(-2);
  const pre = prefix || year;
  const nr = String(naechste || 1).padStart(4, '0');
  return `${pre}${nr}`;
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function NWMEinstellungenPanel({
  portal,
  project,
  onProjectUpdate,
}: NWMEinstellungenPanelProps) {
  const supabase = createClient();

  const btnPrimary = portal === 'firma' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700';
  const focusRing = portal === 'firma' ? 'focus:ring-green-500 focus:border-green-500' : 'focus:ring-blue-500 focus:border-blue-500';
  const iconColor = portal === 'firma' ? 'text-green-600' : 'text-blue-600';

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Formular-State
  const [form, setForm] = useState({
    netzwerk_typ: project.netzwerk_typ || '',
    netzwerk_phase: project.netzwerk_phase || '',
    bewilligung_datum: project.bewilligung_datum || '',
    phase2_start_datum: project.phase2_start_datum || '',
    nwm_bank_kontoinhaber: project.nwm_bank_kontoinhaber || '',
    nwm_bank_iban: project.nwm_bank_iban || '',
    nwm_bank_bic: project.nwm_bank_bic || '',
    nwm_bank_name: project.nwm_bank_name || '',
    nwm_ust_id: project.nwm_ust_id || '',
    nwm_rechnung_prefix: project.nwm_rechnung_prefix || '',
    nwm_rechnung_naechste: String(project.nwm_rechnung_naechste || 1),
    nwm_faelligkeitsfrist: String(project.nwm_faelligkeitsfrist || 30),
    stufen_manuell: false,
    stufen: project.foerdersatz_stufen || [] as FoerdersatzStufe[],
  });

  const openModal = () => {
    setForm({
      netzwerk_typ: project.netzwerk_typ || '',
      netzwerk_phase: project.netzwerk_phase || '',
      bewilligung_datum: project.bewilligung_datum || '',
      phase2_start_datum: project.phase2_start_datum || '',
      nwm_bank_kontoinhaber: project.nwm_bank_kontoinhaber || '',
      nwm_bank_iban: project.nwm_bank_iban || '',
      nwm_bank_bic: project.nwm_bank_bic || '',
      nwm_bank_name: project.nwm_bank_name || '',
      nwm_ust_id: project.nwm_ust_id || '',
      nwm_rechnung_prefix: project.nwm_rechnung_prefix || '',
      nwm_rechnung_naechste: String(project.nwm_rechnung_naechste || 1),
      nwm_faelligkeitsfrist: String(project.nwm_faelligkeitsfrist || 30),
      stufen_manuell: false,
      stufen: project.foerdersatz_stufen || [],
    });
    setError(null);
    setShowModal(true);
  };

  // Stufen neu berechnen wenn Typ/Phase/Datum sich aendert
  const recalcStufen = (
    typ: string,
    phase: string,
    bew: string,
    ph2: string
  ): FoerdersatzStufe[] => {
    if (!typ || !phase || !bew) return [];
    return berechneStufen(typ, phase, bew, ph2 || null);
  };

  const handleFieldChange = (field: string, value: string) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      // Stufen automatisch neu berechnen wenn nicht manuell
      if (!prev.stufen_manuell && ['netzwerk_typ', 'netzwerk_phase', 'bewilligung_datum', 'phase2_start_datum'].includes(field)) {
        const typ = field === 'netzwerk_typ' ? value : updated.netzwerk_typ;
        const phase = field === 'netzwerk_phase' ? value : updated.netzwerk_phase;
        const bew = field === 'bewilligung_datum' ? value : updated.bewilligung_datum;
        const ph2 = field === 'phase2_start_datum' ? value : updated.phase2_start_datum;
        updated.stufen = recalcStufen(typ, phase, bew, ph2);
      }
      return updated;
    });
  };

  const handleStufeSatz = (idx: number, satz: string) => {
    setForm(prev => {
      const stufen = [...prev.stufen];
      stufen[idx] = { ...stufen[idx], satz_percent: parseFloat(satz) || 0 };
      return { ...prev, stufen, stufen_manuell: true };
    });
  };

  const handleStufeAb = (idx: number, datum: string) => {
    setForm(prev => {
      const stufen = [...prev.stufen];
      stufen[idx] = { ...stufen[idx], gueltig_ab: datum };
      return { ...prev, stufen, stufen_manuell: true };
    });
  };

  const handleStufeReset = () => {
    const stufen = recalcStufen(
      form.netzwerk_typ,
      form.netzwerk_phase,
      form.bewilligung_datum,
      form.phase2_start_datum
    );
    setForm(prev => ({ ...prev, stufen, stufen_manuell: false }));
  };

  const handleSave = async () => {
    if (!form.netzwerk_typ) { setError('Bitte Netzwerktyp auswaehlen.'); return; }
    if (!form.netzwerk_phase) { setError('Bitte Foerderphase auswaehlen.'); return; }
    if (!form.bewilligung_datum) { setError('Bewilligungsdatum Phase 1 ist Pflichtfeld.'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        netzwerk_typ: form.netzwerk_typ,
        netzwerk_phase: form.netzwerk_phase,
        bewilligung_datum: form.bewilligung_datum,
        phase2_start_datum: form.phase2_start_datum || null,
        foerdersatz_stufen: form.stufen.length > 0 ? form.stufen : null,
        nwm_bank_kontoinhaber: form.nwm_bank_kontoinhaber.trim() || null,
        nwm_bank_iban: form.nwm_bank_iban.replace(/\s/g, '').toUpperCase() || null,
        nwm_bank_bic: form.nwm_bank_bic.trim().toUpperCase() || null,
        nwm_bank_name: form.nwm_bank_name.trim() || null,
        nwm_ust_id: form.nwm_ust_id.trim() || null,
        nwm_rechnung_prefix: form.nwm_rechnung_prefix.trim() || null,
        nwm_rechnung_naechste: parseInt(form.nwm_rechnung_naechste) || 1,
        nwm_faelligkeitsfrist: parseInt(form.nwm_faelligkeitsfrist) || 30,
        updated_at: new Date().toISOString(),
      };

      const { error: saveErr } = await supabase
        .from('v7_projects')
        .update(payload)
        .eq('id', project.id);

      if (saveErr) throw saveErr;

      onProjectUpdate(payload);
      setShowModal(false);
      setSuccess('NWM-Einstellungen gespeichert.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString('de-DE') : '--';

  const stufen = project.foerdersatz_stufen || [];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-4">

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* ---- Foerderparameter ---- */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Settings className={iconColor} size={20} />
            <h2 className="text-lg font-semibold text-gray-900">NWM-Einstellungen</h2>
          </div>
          <button
            onClick={openModal}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white rounded-lg ${btnPrimary}`}
          >
            <Pencil size={15} />
            Bearbeiten
          </button>
        </div>

        {/* Foerderparameter */}
        <div className="mb-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Calendar size={13} />
            Foerderparameter
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Netzwerktyp</div>
              <div className="font-medium text-sm text-gray-900">
                {project.netzwerk_typ === 'national'
                  ? 'Nationales Innovationsnetzwerk'
                  : project.netzwerk_typ === 'international'
                    ? 'Internationales Innovationsnetzwerk'
                    : <span className="text-amber-500 italic">Noch nicht konfiguriert</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Foerderphase</div>
              <div className="font-medium text-sm text-gray-900">
                {project.netzwerk_phase === 'phase1'
                  ? 'Phase 1 (Konzeption / Etablierung)'
                  : project.netzwerk_phase === 'phase2'
                    ? 'Phase 2 (Umsetzung)'
                    : <span className="text-amber-500 italic">Noch nicht konfiguriert</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Bewilligungsdatum Phase 1</div>
              <div className="font-medium text-sm text-gray-900">
                {project.bewilligung_datum
                  ? fmtDate(project.bewilligung_datum)
                  : <span className="text-amber-500 italic">Nicht hinterlegt</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Bewilligungsdatum Phase 2</div>
              <div className="font-medium text-sm text-gray-900">
                {project.phase2_start_datum ? fmtDate(project.phase2_start_datum) : <span className="text-gray-400">--</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Foerdersatz-Stufen */}
        {stufen.length > 0 && (
          <div className="mb-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Foerdersatz-Stufen
            </div>
            <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Laufzeitjahr</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Foerdersatz</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Eigenanteil</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Gueltig ab</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stufen.map((s, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="px-3 py-2 font-medium text-gray-900">Jahr {s.laufzeitjahr}</td>
                    <td className="px-3 py-2 text-right font-semibold text-green-700">{s.satz_percent}%</td>
                    <td className="px-3 py-2 text-right text-orange-700">{100 - s.satz_percent}%</td>
                    <td className="px-3 py-2 text-gray-500">{fmtDate(s.gueltig_ab)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(!project.netzwerk_typ || !project.bewilligung_datum) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            Bitte Netzwerktyp und Bewilligungsdatum hinterlegen damit Laufzeitjahr
            und Foerdersatz im ZA-Panel automatisch berechnet werden koennen.
          </div>
        )}

        {/* Bankdaten */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <CreditCard size={13} />
            Bankdaten (fuer NP-Rechnungen)
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Kontoinhaber</div>
              <div className="text-sm text-gray-900">
                {project.nwm_bank_kontoinhaber || <span className="text-gray-400 italic">Nicht hinterlegt</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Bank</div>
              <div className="text-sm text-gray-900">
                {project.nwm_bank_name || <span className="text-gray-400 italic">--</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">IBAN</div>
              <div className="text-sm font-mono text-gray-900">
                {project.nwm_bank_iban
                  ? formatIBAN(project.nwm_bank_iban)
                  : <span className="text-gray-400 italic font-sans">Nicht hinterlegt</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">BIC</div>
              <div className="text-sm font-mono text-gray-900">
                {project.nwm_bank_bic || <span className="text-gray-400 italic font-sans">--</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Rechnungsparameter */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <FileText size={13} />
            Rechnungsparameter
          </div>
          <div className="grid grid-cols-3 gap-x-8 gap-y-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">USt-ID</div>
              <div className="text-sm text-gray-900">
                {project.nwm_ust_id || <span className="text-gray-400 italic">--</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Naechste Rechnungsnr.</div>
              <div className="text-sm font-mono text-gray-900">
                {previewRechnungsnr(project.nwm_rechnung_prefix, project.nwm_rechnung_naechste)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Zahlungsfrist</div>
              <div className="text-sm text-gray-900">
                {project.nwm_faelligkeitsfrist || 30} Tage
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* MODAL: Bearbeiten                                                   */}
      {/* ================================================================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Modal-Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-gray-900">NWM-Einstellungen bearbeiten</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              {/* ---- Foerderparameter ---- */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Calendar size={13} />
                  Foerderparameter
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Netzwerktyp <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.netzwerk_typ}
                      onChange={e => handleFieldChange('netzwerk_typ', e.target.value)}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    >
                      <option value="">-- bitte waehlen --</option>
                      <option value="national">Nationales Innovationsnetzwerk</option>
                      <option value="international">Internationales Innovationsnetzwerk</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Foerderphase <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.netzwerk_phase}
                      onChange={e => handleFieldChange('netzwerk_phase', e.target.value)}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    >
                      <option value="">-- bitte waehlen --</option>
                      <option value="phase1">Phase 1 (Konzeption / Etablierung)</option>
                      <option value="phase2">Phase 2 (Umsetzung)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Bewilligungsdatum Phase 1 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.bewilligung_datum}
                      onChange={e => handleFieldChange('bewilligung_datum', e.target.value)}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Bewilligungsdatum Phase 2
                      <span className="ml-1 text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={form.phase2_start_datum}
                      onChange={e => handleFieldChange('phase2_start_datum', e.target.value)}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    />
                  </div>
                </div>
              </div>

              {/* ---- Foerdersatz-Stufen ---- */}
              {form.stufen.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Foerdersatz-Stufen
                      {form.stufen_manuell && (
                        <span className="ml-2 text-amber-500 font-normal normal-case">(manuell bearbeitet)</span>
                      )}
                    </div>
                    {form.stufen_manuell && (
                      <button
                        onClick={handleStufeReset}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Automatisch neu berechnen
                      </button>
                    )}
                  </div>
                  <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Jahr</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Foerdersatz %</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Eigenanteil %</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Gueltig ab</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {form.stufen.map((s, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="px-3 py-2 font-medium text-gray-900">Jahr {s.laufzeitjahr}</td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={s.satz_percent}
                              onChange={e => handleStufeSatz(idx, e.target.value)}
                              className={`w-16 text-right px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 ${focusRing}`}
                            />
                            <span className="ml-1 text-gray-400">%</span>
                          </td>
                          <td className="px-3 py-2 text-right text-orange-700 font-medium">
                            {100 - s.satz_percent}%
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={s.gueltig_ab}
                              onChange={e => handleStufeAb(idx, e.target.value)}
                              className={`px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 ${focusRing}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Stufen werden automatisch berechnet. Einzelne Werte koennen manuell angepasst werden.
                  </p>
                </div>
              )}

              {/* ---- Bankdaten ---- */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CreditCard size={13} />
                  Bankdaten (erscheinen auf NP-Rechnungen)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Kontoinhaber</label>
                    <input
                      type="text"
                      value={form.nwm_bank_kontoinhaber}
                      onChange={e => setForm(f => ({ ...f, nwm_bank_kontoinhaber: e.target.value }))}
                      placeholder="Cubintec GmbH"
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bankname</label>
                    <input
                      type="text"
                      value={form.nwm_bank_name}
                      onChange={e => setForm(f => ({ ...f, nwm_bank_name: e.target.value }))}
                      placeholder="Sparkasse Bad Neustadt"
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">IBAN</label>
                    <input
                      type="text"
                      value={form.nwm_bank_iban}
                      onChange={e => setForm(f => ({ ...f, nwm_bank_iban: e.target.value.replace(/\s/g, '').toUpperCase() }))}
                      placeholder="DE12 3456 7890 1234 5678 90"
                      maxLength={22}
                      className={`w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">BIC</label>
                    <input
                      type="text"
                      value={form.nwm_bank_bic}
                      onChange={e => setForm(f => ({ ...f, nwm_bank_bic: e.target.value.toUpperCase() }))}
                      placeholder="SSKMDEMMXXX"
                      maxLength={11}
                      className={`w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    />
                  </div>
                </div>
              </div>

              {/* ---- Rechnungsparameter ---- */}
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <FileText size={13} />
                  Rechnungsparameter
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">USt-ID</label>
                    <input
                      type="text"
                      value={form.nwm_ust_id}
                      onChange={e => setForm(f => ({ ...f, nwm_ust_id: e.target.value }))}
                      placeholder="DE123456789"
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Rechnungs-Praefix
                      <span className="ml-1 text-gray-400 font-normal">(leer = Jahreszahl)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={form.nwm_rechnung_prefix}
                        onChange={e => setForm(f => ({ ...f, nwm_rechnung_prefix: e.target.value }))}
                        placeholder="26"
                        maxLength={6}
                        className={`w-20 px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                      />
                      <span className="text-xs text-gray-500">
                        Vorschau: <span className="font-mono font-medium">
                          {previewRechnungsnr(form.nwm_rechnung_prefix || null, parseInt(form.nwm_rechnung_naechste) || 1)}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Naechste Nr.</label>
                    <input
                      type="number"
                      min="1"
                      value={form.nwm_rechnung_naechste}
                      onChange={e => setForm(f => ({ ...f, nwm_rechnung_naechste: e.target.value }))}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Zahlungsfrist (Tage)</label>
                    <input
                      type="number"
                      min="7"
                      max="90"
                      value={form.nwm_faelligkeitsfrist}
                      onChange={e => setForm(f => ({ ...f, nwm_faelligkeitsfrist: e.target.value }))}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Modal-Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${btnPrimary}`}
              >
                <Save size={15} />
                {saving ? 'Speichern...' : 'Einstellungen speichern'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
