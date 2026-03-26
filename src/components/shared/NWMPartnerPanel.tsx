// src/components/shared/NWMPartnerPanel.tsx
// ============================================================================
// PZE V7 - NWM Netzwerkpartner-Verwaltung
// ============================================================================
// Version: 7.4.5-4
// Datum: 26. Maerz 2026
//
// Verwaltet die Netzwerkpartner eines ZIM_NETZWERK-Projekts:
// - Tabelle aller NP mit Quoten, USt-Satz, Status
// - Smart-Anpassung: Manuelle Quota-Aenderung passt andere NP proportional an
// - Gleichverteilung als Standard (100 / n NP)
// - Schloss-Icon: manuell gesperrte NP werden bei Auto-Anpassung uebersprungen
// - NP hinzufuegen / bearbeiten / ausscheiden
// - Quoten-Summen-Validierung (muss 100,00% ergeben)
// v7.4.5-4: FIX: Nach NP-Hinzufuegen automatisch Gleichverteilung aller aktiven NP
// v7.4.5-3: Kundenauswahl uebernimmt alle verfuegbaren Felder:
//   contact_person, contact_email, street, zip_code, city
//   Rechtsform wird automatisch aus Firmennamen abgeleitet
// v7.4.5-2: NEU: Kundenauswahl im NP-Modal
//   - Dropdown "Aus bestehendem Kunden uebernehmen" oben im Modal
//   - Befuellt Name, Adresse automatisch aus v7_client_companies
//   - Manuell-Eingabe bleibt moeglich (Dropdown leer lassen)
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Plus,
  Lock,
  Unlock,
  UserMinus,
  Pencil,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

interface NetzwerkPartner {
  id: string;
  project_id: string;
  name: string;
  rechtsform: string | null;
  ansprechpartner: string | null;
  email: string | null;
  adresse_strasse: string | null;
  adresse_plz: string | null;
  adresse_ort: string | null;
  ust_id: string | null;
  eigenanteil_quote: number;
  quote_manuell_gesperrt: boolean;
  ust_satz: number;
  beitritt_datum: string;
  austritt_datum: string | null;
  sort_order: number;
  notizen: string | null;
}

interface NWMPartnerPanelProps {
  portal: 'berater' | 'firma';
  projectId: string;
  consultantCompanyId?: string;
}

interface KundenFirma {
  id: string;
  name: string;
  short_name: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

// Leeres Formular fuer neuen NP
const emptyForm = () => ({
  name: '',
  rechtsform: '',
  ansprechpartner: '',
  email: '',
  adresse_strasse: '',
  adresse_plz: '',
  adresse_ort: '',
  ust_id: '',
  eigenanteil_quote: '',
  ust_satz: '19',
  beitritt_datum: new Date().toISOString().slice(0, 10),
  notizen: '',
});

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

// Rundungskorrektur: Stellt sicher dass Summe exakt 100,00 ergibt
const roundQuote = (v: number): number =>
  Math.round(v * 100) / 100;

// Gleichverteilung fuer n aktive NP
const gleichverteilung = (n: number): number[] => {
  if (n === 0) return [];
  const basis = roundQuote(100 / n);
  const quoten = Array(n).fill(basis);
  // Letzte NP bekommt den Restbetrag fuer exakte Summe
  const summe = quoten.slice(0, -1).reduce((s, q) => s + q, 0);
  quoten[n - 1] = roundQuote(100 - summe);
  return quoten;
};

// Smart-Anpassung: NP_x auf neuen Wert setzen, Rest proportional anpassen
const smartAnpassung = (
  partner: NetzwerkPartner[],
  changedId: string,
  neueQuote: number
): NetzwerkPartner[] => {
  const aktive = partner.filter(p => !p.austritt_datum);
  const changed = aktive.find(p => p.id === changedId);
  if (!changed) return partner;

  const alteQuote = changed.eigenanteil_quote;
  const differenz = neueQuote - alteQuote;

  // Freie NP: aktiv, nicht der geaenderte, nicht manuell gesperrt
  const freie = aktive.filter(
    p => p.id !== changedId && !p.quote_manuell_gesperrt
  );

  const summeFreie = freie.reduce((s, p) => s + p.eigenanteil_quote, 0);

  let neueQuoten: Record<string, number> = {};

  if (freie.length === 0 || summeFreie === 0) {
    // Keine freien NP -> nur den geaenderten setzen
    neueQuoten[changedId] = roundQuote(neueQuote);
  } else {
    // Proportionale Verteilung der Differenz auf freie NP
    neueQuoten[changedId] = roundQuote(neueQuote);
    freie.forEach(p => {
      const anteil = (p.eigenanteil_quote / summeFreie) * (-differenz);
      neueQuoten[p.id] = roundQuote(p.eigenanteil_quote + anteil);
    });

    // Rundungskorrektur: letzten freien NP anpassen
    const gesperrteSumme = aktive
      .filter(p => p.id !== changedId && p.quote_manuell_gesperrt)
      .reduce((s, p) => s + p.eigenanteil_quote, 0);
    const andereFreieSumme = freie
      .slice(0, -1)
      .reduce((s, p) => s + (neueQuoten[p.id] || 0), 0);
    const letzterFreier = freie[freie.length - 1];
    neueQuoten[letzterFreier.id] = roundQuote(
      100 - roundQuote(neueQuote) - gesperrteSumme - andereFreieSumme
    );
  }

  return partner.map(p => {
    if (p.id === changedId) {
      return { ...p, eigenanteil_quote: neueQuoten[changedId] ?? p.eigenanteil_quote, quote_manuell_gesperrt: true };
    }
    if (neueQuoten[p.id] !== undefined) {
      return { ...p, eigenanteil_quote: neueQuoten[p.id] };
    }
    return p;
  });
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function NWMPartnerPanel({ portal, projectId, consultantCompanyId }: NWMPartnerPanelProps) {
  const supabase = createClient();

  const borderActive = portal === 'firma' ? 'border-green-600 text-green-600' : 'border-blue-600 text-blue-600';
  const btnPrimary = portal === 'firma' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700';
  const focusRing = portal === 'firma' ? 'focus:ring-green-500 focus:border-green-500' : 'focus:ring-blue-500 focus:border-blue-500';
  const iconColor = portal === 'firma' ? 'text-green-600' : 'text-blue-600';

  const [partner, setPartner] = useState<NetzwerkPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal-State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  // Kunden-Auswahl
  const [kundenListe, setKundenListe] = useState<KundenFirma[]>([]);
  const [selectedKundeId, setSelectedKundeId] = useState<string>('');

  // Austritt-Dialog
  const [austrittsId, setAustrittsId] = useState<string | null>(null);
  const [austrittDatum, setAustrittDatum] = useState(new Date().toISOString().slice(0, 10));
  const [austrittAuto, setAustrittAuto] = useState(true);

  // ---- Laden ----
  const loadPartner = useCallback(async () => {
    setLoading(true);
    // Kundenliste laden fuer Auswahl-Dropdown
    if (consultantCompanyId) {
      const { data: kunden } = await supabase
        .from('v7_client_companies')
        .select('id, name, short_name, street, zip_code, city, contact_person, contact_email, contact_phone')
        .eq('consultant_company_id', consultantCompanyId)
        .eq('is_active', true)
        .order('name', { ascending: true });
      setKundenListe(kunden || []);
    }
    const { data, error: err } = await supabase
      .from('v7_netzwerk_partner')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('beitritt_datum', { ascending: true });
    if (err) {
      setError('Fehler beim Laden der Netzwerkpartner');
    } else {
      setPartner(data || []);
    }
    setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => { loadPartner(); }, [loadPartner]);

  // ---- Berechnungen ----
  const aktivePartner = partner.filter(p => !p.austritt_datum);
  const quotenSumme = roundQuote(
    aktivePartner.reduce((s, p) => s + p.eigenanteil_quote, 0)
  );
  const quotenOk = Math.abs(quotenSumme - 100) < 0.01;

  // ---- Quoten-Aktionen (lokal, noch nicht gespeichert) ----
  const handleQuoteChange = (id: string, rawValue: string) => {
    const val = parseFloat(rawValue.replace(',', '.'));
    if (isNaN(val) || val < 0 || val > 100) return;
    const updated = smartAnpassung(partner, id, val);
    setPartner(updated);
  };

  const handleToggleLock = (id: string) => {
    setPartner(prev => prev.map(p =>
      p.id === id ? { ...p, quote_manuell_gesperrt: !p.quote_manuell_gesperrt } : p
    ));
  };

  const handleGleichverteilen = () => {
    const aktive = partner.filter(p => !p.austritt_datum);
    const quoten = gleichverteilung(aktive.length);
    let qi = 0;
    setPartner(prev => prev.map(p => {
      if (p.austritt_datum) return p;
      return { ...p, eigenanteil_quote: quoten[qi++], quote_manuell_gesperrt: false };
    }));
  };

  const handleAlleEntsprerren = () => {
    setPartner(prev => prev.map(p => ({ ...p, quote_manuell_gesperrt: false })));
  };

  // ---- Quoten speichern ----
  const handleSaveQuoten = async () => {
    if (!quotenOk) {
      setError('Quoten muessen 100,00% ergeben bevor gespeichert werden kann.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const p of aktivePartner) {
        await supabase
          .from('v7_netzwerk_partner')
          .update({
            eigenanteil_quote: p.eigenanteil_quote,
            quote_manuell_gesperrt: p.quote_manuell_gesperrt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', p.id);
      }
      setSuccess('Quoten gespeichert.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---- Kunde auswaehlen und Formular befuellen ----
  const handleKundeSelect = (kundeId: string) => {
    setSelectedKundeId(kundeId);
    if (!kundeId) return;
    const kunde = kundenListe.find(k => k.id === kundeId);
    if (!kunde) return;
    // Rechtsform aus dem Firmennamen ableiten
    const rechtsformGuess = (() => {
      const n = kunde.name;
      if (n.includes('GmbH & Co. KG')) return 'KG';
      if (n.includes('gGmbH')) return 'gGmbH';
      if (n.includes('GmbH')) return 'GmbH';
      if (n.includes(' AG')) return 'AG';
      if (n.includes(' UG')) return 'UG';
      if (n.includes(' GbR')) return 'GbR';
      if (n.includes(' OHG')) return 'OHG';
      if (n.includes(' KG')) return 'KG';
      if (n.includes('e.V.') || n.includes('eV')) return 'e.V.';
      return '';
    })();
    setForm(f => ({
      ...f,
      name: kunde.name,
      rechtsform: rechtsformGuess,
      ansprechpartner: kunde.contact_person || '',
      email: kunde.contact_email || '',
      adresse_strasse: kunde.street || '',
      adresse_plz: kunde.zip_code || '',
      adresse_ort: kunde.city || '',
    }));
  };

  // ---- NP anlegen / bearbeiten ----
  const openNeu = () => {
    setEditingId(null);
    // Vorschlag: Gleichverteilung fuer n+1 NP
    const n = aktivePartner.length + 1;
    const quoten = gleichverteilung(n);
    const vorschlag = quoten[n - 1];
    setSelectedKundeId('');
    setForm({ ...emptyForm(), eigenanteil_quote: String(vorschlag) });
    setShowModal(true);
  };

  const openEdit = (p: NetzwerkPartner) => {
    setEditingId(p.id);
    setSelectedKundeId('');
    setForm({
      name: p.name,
      rechtsform: p.rechtsform || '',
      ansprechpartner: p.ansprechpartner || '',
      email: p.email || '',
      adresse_strasse: p.adresse_strasse || '',
      adresse_plz: p.adresse_plz || '',
      adresse_ort: p.adresse_ort || '',
      ust_id: p.ust_id || '',
      eigenanteil_quote: String(p.eigenanteil_quote),
      ust_satz: String(p.ust_satz),
      beitritt_datum: p.beitritt_datum,
      notizen: p.notizen || '',
    });
    setShowModal(true);
  };

  const handleModalSave = async () => {
    if (!form.name.trim()) { setError('Name ist Pflichtfeld.'); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        project_id: projectId,
        name: form.name.trim(),
        rechtsform: form.rechtsform.trim() || null,
        ansprechpartner: form.ansprechpartner.trim() || null,
        email: form.email.trim() || null,
        adresse_strasse: form.adresse_strasse.trim() || null,
        adresse_plz: form.adresse_plz.trim() || null,
        adresse_ort: form.adresse_ort.trim() || null,
        ust_id: form.ust_id.trim() || null,
        eigenanteil_quote: parseFloat(form.eigenanteil_quote.replace(',', '.')) || 0,
        ust_satz: parseFloat(form.ust_satz) || 19,
        beitritt_datum: form.beitritt_datum,
        notizen: form.notizen.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        await supabase.from('v7_netzwerk_partner').update(payload).eq('id', editingId);
      } else {
        await supabase.from('v7_netzwerk_partner').insert({
          ...payload,
          sort_order: aktivePartner.length,
          quote_manuell_gesperrt: false,
        });
      }
      setShowModal(false);

      // Bei neuem NP: Quoten aller aktiven NP gleichverteilen und speichern
      if (!editingId) {
        // Neu geladene Liste holen
        const { data: alleNP } = await supabase
          .from('v7_netzwerk_partner')
          .select('id')
          .eq('project_id', projectId)
          .is('austritt_datum', null);
        const aktiveIds = (alleNP || []).map((p: any) => p.id);
        const quoten = gleichverteilung(aktiveIds.length);
        for (let i = 0; i < aktiveIds.length; i++) {
          await supabase
            .from('v7_netzwerk_partner')
            .update({ eigenanteil_quote: quoten[i], quote_manuell_gesperrt: false, updated_at: new Date().toISOString() })
            .eq('id', aktiveIds[i]);
        }
      }

      setSuccess(editingId ? 'Netzwerkpartner aktualisiert.' : 'Netzwerkpartner hinzugefuegt und Quoten gleichverteilt.');
      setTimeout(() => setSuccess(null), 3000);
      await loadPartner();
    } catch (err: any) {
      setError('Fehler: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ---- NP ausscheiden ----
  const openAustritt = (id: string) => {
    setAustrittsId(id);
    setAustrittDatum(new Date().toISOString().slice(0, 10));
    setAustrittAuto(true);
  };

  const handleAustritt = async () => {
    if (!austrittsId) return;
    setSaving(true);
    setError(null);
    try {
      // Austritt setzen
      await supabase
        .from('v7_netzwerk_partner')
        .update({ austritt_datum: austrittDatum, updated_at: new Date().toISOString() })
        .eq('id', austrittsId);

      if (austrittAuto) {
        // Quoten der verbleibenden NP proportional neu verteilen
        const verbleibende = aktivePartner.filter(p => p.id !== austrittsId);
        const quoten = gleichverteilung(verbleibende.length);
        for (let i = 0; i < verbleibende.length; i++) {
          await supabase
            .from('v7_netzwerk_partner')
            .update({ eigenanteil_quote: quoten[i], updated_at: new Date().toISOString() })
            .eq('id', verbleibende[i].id);
        }
      }
      setAustrittsId(null);
      setSuccess('Netzwerkpartner ausgeschieden. Quoten wurden angepasst.');
      setTimeout(() => setSuccess(null), 4000);
      await loadPartner();
    } catch (err: any) {
      setError('Fehler: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fmt2 = (v: number) => v.toFixed(2).replace('.', ',');

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className={`w-8 h-8 border-4 rounded-full animate-spin ${
          portal === 'firma' ? 'border-green-200 border-t-green-600' : 'border-blue-200 border-t-blue-600'
        }`}></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Meldungen */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          <CheckCircle size={16} className="shrink-0" />
          {success}
        </div>
      )}

      {/* Header + Aktionen */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">
              Netzwerkpartner
              <span className="ml-2 text-sm font-normal text-gray-500">
                {aktivePartner.length} aktiv
                {partner.filter(p => p.austritt_datum).length > 0 && (
                  <span className="ml-1 text-gray-400">
                    / {partner.filter(p => p.austritt_datum).length} ausgeschieden
                  </span>
                )}
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Quoten muessen zusammen 100,00% ergeben.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleAlleEntsprerren}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
            >
              <Unlock size={13} />
              Alle entsperren
            </button>
            <button
              onClick={handleGleichverteilen}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
            >
              <RefreshCw size={13} />
              Gleichverteilen
            </button>
            <button
              onClick={handleSaveQuoten}
              disabled={saving || !quotenOk}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${btnPrimary}`}
            >
              <Save size={13} />
              {saving ? 'Speichern...' : 'Quoten speichern'}
            </button>
            <button
              onClick={openNeu}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors ${btnPrimary}`}
            >
              <Plus size={13} />
              NP hinzufuegen
            </button>
          </div>
        </div>
      </div>

      {/* Tabelle aktive NP */}
      {aktivePartner.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-gray-400 text-sm mb-3">Noch keine Netzwerkpartner eingetragen.</div>
          <button
            onClick={openNeu}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg ${btnPrimary}`}
          >
            <Plus size={16} />
            Ersten NP hinzufuegen
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Nr.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Name / Rechtsform</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Kontakt</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">USt.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Quote %
                  <span className="ml-1 text-[10px] font-normal normal-case text-gray-400">(editierbar)</span>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide w-10">
                  <Lock size={12} className="inline" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Beitritt</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {aktivePartner.map((p, idx) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    {p.rechtsform && (
                      <div className="text-xs text-gray-400">{p.rechtsform}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.ansprechpartner && (
                      <div className="text-xs text-gray-700">{p.ansprechpartner}</div>
                    )}
                    {p.email && (
                      <div className="text-xs text-gray-400">{p.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.ust_satz === 0
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {p.ust_satz === 0 ? 'steuerfrei' : `${p.ust_satz}%`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={p.eigenanteil_quote}
                      onChange={e => handleQuoteChange(p.id, e.target.value)}
                      className={`w-20 text-right px-2 py-1 text-sm border rounded ${
                        p.quote_manuell_gesperrt
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-gray-300 bg-white'
                      } focus:outline-none focus:ring-1 ${focusRing}`}
                    />
                    <span className="ml-1 text-xs text-gray-400">%</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleLock(p.id)}
                      title={p.quote_manuell_gesperrt ? 'Entsperren' : 'Sperren'}
                      className={`p-1 rounded transition-colors ${
                        p.quote_manuell_gesperrt
                          ? 'text-amber-500 hover:text-amber-700'
                          : 'text-gray-300 hover:text-gray-500'
                      }`}
                    >
                      {p.quote_manuell_gesperrt ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(p.beitritt_datum).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        title="Bearbeiten"
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => openAustritt(p.id)}
                        title="Ausscheiden"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Summenzeile */}
            <tfoot>
              <tr className={`border-t-2 ${quotenOk ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-right text-gray-600">
                  Summe Quoten:
                </td>
                <td className={`px-4 py-2 text-right font-bold text-sm ${quotenOk ? 'text-green-700' : 'text-red-700'}`}>
                  {fmt2(quotenSumme)} %
                </td>
                <td colSpan={3} className="px-4 py-2">
                  {quotenOk ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle size={12} /> OK
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle size={12} /> Muss 100,00% ergeben
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Ausgeschiedene NP (eingeklappt) */}
      {partner.filter(p => p.austritt_datum).length > 0 && (
        <details className="bg-white rounded-lg border border-gray-200">
          <summary className="px-4 py-3 text-sm text-gray-500 cursor-pointer hover:text-gray-700">
            {partner.filter(p => p.austritt_datum).length} ausgeschiedene Netzwerkpartner anzeigen
          </summary>
          <div className="border-t border-gray-100">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {partner.filter(p => p.austritt_datum).map(p => (
                  <tr key={p.id} className="bg-gray-50">
                    <td className="px-4 py-2 text-gray-400 text-xs w-8">--</td>
                    <td className="px-4 py-2 text-gray-400 line-through">{p.name}</td>
                    <td className="px-4 py-2 text-xs text-gray-400">
                      Ausgeschieden: {new Date(p.austritt_datum!).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* ================================================================== */}
      {/* MODAL: NP anlegen / bearbeiten */}
      {/* ================================================================== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                {editingId ? 'Netzwerkpartner bearbeiten' : 'Neuer Netzwerkpartner'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">

              {/* Kundenauswahl-Dropdown (nur wenn Kundenliste vorhanden) */}
              {kundenListe.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <label className="block text-xs font-medium text-blue-700 mb-1">
                    Aus bestehendem Kunden uebernehmen
                    <span className="ml-1 font-normal text-blue-500">(optional)</span>
                  </label>
                  <select
                    value={selectedKundeId}
                    onChange={e => handleKundeSelect(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Manuell eingeben --</option>
                    {kundenListe.map(k => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
                  {selectedKundeId && (
                    <p className="text-xs text-blue-600 mt-1">
                      Daten uebernommen. Bitte pruefen und ggf. ergaenzen.
                    </p>
                  )}
                </div>
              )}

              {/* Name + Rechtsform */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Firmenname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    placeholder="z.B. TechCorp GmbH"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rechtsform</label>
                  <select
                    value={form.rechtsform}
                    onChange={e => setForm(f => ({ ...f, rechtsform: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                  >
                    <option value="">-- bitte waehlen --</option>
                    <option value="GmbH">GmbH</option>
                    <option value="UG">UG (haftungsbeschraenkt)</option>
                    <option value="AG">AG</option>
                    <option value="GbR">GbR</option>
                    <option value="OHG">OHG</option>
                    <option value="KG">KG</option>
                    <option value="e.V.">e.V.</option>
                    <option value="gGmbH">gGmbH</option>
                    <option value="Sonstige">Sonstige</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Beitrittsdatum</label>
                  <input
                    type="date"
                    value={form.beitritt_datum}
                    onChange={e => setForm(f => ({ ...f, beitritt_datum: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                  />
                </div>
              </div>

              {/* Kontakt */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ansprechpartner</label>
                  <input
                    type="text"
                    value={form.ansprechpartner}
                    onChange={e => setForm(f => ({ ...f, ansprechpartner: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    placeholder="Name Vorname"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">E-Mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    placeholder="email@firma.de"
                  />
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Strasse</label>
                <input
                  type="text"
                  value={form.adresse_strasse}
                  onChange={e => setForm(f => ({ ...f, adresse_strasse: e.target.value }))}
                  className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">PLZ</label>
                  <input
                    type="text"
                    value={form.adresse_plz}
                    onChange={e => setForm(f => ({ ...f, adresse_plz: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    maxLength={5}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ort</label>
                  <input
                    type="text"
                    value={form.adresse_ort}
                    onChange={e => setForm(f => ({ ...f, adresse_ort: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                  />
                </div>
              </div>

              {/* Steuer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">USt-IdNr.</label>
                  <input
                    type="text"
                    value={form.ust_id}
                    onChange={e => setForm(f => ({ ...f, ust_id: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                    placeholder="DE123456789"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">USt-Satz</label>
                  <select
                    value={form.ust_satz}
                    onChange={e => setForm(f => ({ ...f, ust_satz: e.target.value }))}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                  >
                    <option value="19">19% (Standard)</option>
                    <option value="0">0% (steuerbefreit)</option>
                  </select>
                </div>
              </div>

              {/* Quote */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Eigenanteil-Quote %
                  <span className="ml-1 text-gray-400 font-normal">(Summe aller NP muss 100% ergeben)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.eigenanteil_quote}
                    onChange={e => setForm(f => ({ ...f, eigenanteil_quote: e.target.value }))}
                    className={`w-28 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
              </div>

              {/* Notizen */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notizen</label>
                <textarea
                  value={form.notizen}
                  onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))}
                  rows={2}
                  className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                  placeholder="Optionale interne Notizen"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleModalSave}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${btnPrimary}`}
              >
                <Save size={15} />
                {saving ? 'Speichern...' : (editingId ? 'Aktualisieren' : 'Hinzufuegen')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* DIALOG: NP ausscheiden */}
      {/* ================================================================== */}
      {austrittsId && (() => {
        const np = partner.find(p => p.id === austrittsId);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">NP ausscheiden</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{np?.name}</span> aus dem Netzwerk ausscheiden?
                </p>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Austrittsdatum</label>
                  <input
                    type="date"
                    value={austrittDatum}
                    onChange={e => setAustrittDatum(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 ${focusRing}`}
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">Quoten der verbleibenden NP:</div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      checked={austrittAuto}
                      onChange={() => setAustrittAuto(true)}
                    />
                    Automatisch gleichmaessig neu verteilen
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      checked={!austrittAuto}
                      onChange={() => setAustrittAuto(false)}
                    />
                    Quoten manuell anpassen (nach Austritt in Tabelle bearbeiten)
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => setAustrittsId(null)}
                  className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAustritt}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
                >
                  <UserMinus size={15} />
                  {saving ? 'Verarbeite...' : 'Ausscheiden'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
