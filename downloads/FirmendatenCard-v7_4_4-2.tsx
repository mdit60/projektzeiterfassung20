'use client';

// ============================================================================
// SHARED COMPONENT: FirmendatenCard
// Version: 7.4.4-2
// Datum: 20. Maerz 2026
//
// Verwendung:
//   - Berater-Portal: /v7/berater/foerderung/firma/[id] (Tab: Firmendaten)
//   - Firmen-Portal:  /v7/firma/firmendaten
//
// Props:
//   firmaId  : string         - ID der Kundenfirma
//   portal   : 'berater'|'firma' - steuert Farbe (blau/gruen)
//   canEdit  : boolean        - Bearbeiten-Button sichtbar?
//
// v7.4.4-2: NEU: Feld standard_weekly_hours (Regelarbeitszeit des Unternehmens)
//            Wird fuer Feiertagsstunden-Berechnung in TimesheetForm genutzt
// v7.4.4-1: Erstversion als Shared Component
//            Anzeige + Bearbeiten-Modal
//            Alle Firmendaten-Felder (Name, Adresse, Kontakt)
// ============================================================================

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Building2,
  Pencil,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

// ============================================================================
// KONSTANTEN
// ============================================================================

const PORTAL_PRIMARY: Record<string, string> = {
  berater: '#002451',
  firma: '#65A655',
};

const BUNDESLAENDER = [
  'Baden-Wuerttemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thueringen',
];

// ============================================================================
// TYPEN
// ============================================================================

interface ClientCompany {
  id: string;
  name: string;
  short_name: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  federal_state: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string | null;
  standard_weekly_hours: number | null;
}

interface EditForm {
  name: string;
  short_name: string;
  street: string;
  zip_code: string;
  city: string;
  federal_state: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  standard_weekly_hours: string;
}

interface FirmendatenCardProps {
  firmaId: string;
  portal: 'berater' | 'firma';
  canEdit?: boolean;
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE');
}

function companyToForm(firma: ClientCompany): EditForm {
  return {
    name: firma.name || '',
    short_name: firma.short_name || '',
    street: firma.street || '',
    zip_code: firma.zip_code || '',
    city: firma.city || '',
    federal_state: firma.federal_state || '',
    contact_person: firma.contact_person || '',
    contact_email: firma.contact_email || '',
    contact_phone: firma.contact_phone || '',
    standard_weekly_hours: firma.standard_weekly_hours != null ? String(firma.standard_weekly_hours).replace('.', ',') : '',
  };
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function FirmendatenCard({
  firmaId,
  portal,
  canEdit = false,
}: FirmendatenCardProps) {
  const supabase = createClient();
  const primaryColor = PORTAL_PRIMARY[portal] || PORTAL_PRIMARY.berater;

  const [loading, setLoading] = useState(true);
  const [firma, setFirma] = useState<ClientCompany | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal-State
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ==========================================================================
  // DATEN LADEN
  // ==========================================================================

  useEffect(() => {
    loadFirma();
  }, [firmaId]);

  async function loadFirma() {
    try {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from('v7_client_companies')
        .select('id, name, short_name, street, zip_code, city, federal_state, contact_person, contact_email, contact_phone, created_at, standard_weekly_hours')
        .eq('id', firmaId)
        .single();

      if (error || !data) {
        setLoadError('Firmendaten konnten nicht geladen werden.');
        return;
      }
      setFirma(data);
    } catch (err) {
      setLoadError('Unerwarteter Fehler beim Laden.');
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================================
  // MODAL OEFFNEN / SCHLIESSEN
  // ==========================================================================

  function handleOpenModal() {
    if (!firma) return;
    setForm(companyToForm(firma));
    setSaveError(null);
    setSaveSuccess(false);
    setShowModal(true);
  }

  function handleCloseModal() {
    if (saving) return;
    setShowModal(false);
    setForm(null);
    setSaveError(null);
    setSaveSuccess(false);
  }

  // ==========================================================================
  // SPEICHERN
  // ==========================================================================

  async function handleSave() {
    if (!form) return;
    setSaveError(null);
    setSaveSuccess(false);

    // Validierung
    if (!form.name.trim()) {
      setSaveError('Firmenname ist ein Pflichtfeld.');
      return;
    }
    if (!form.federal_state) {
      setSaveError('Bitte Bundesland auswaehlen.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('v7_client_companies')
        .update({
          name: form.name.trim(),
          short_name: form.short_name.trim() || null,
          street: form.street.trim() || null,
          zip_code: form.zip_code.trim() || null,
          city: form.city.trim() || null,
          federal_state: form.federal_state,
          contact_person: form.contact_person.trim() || null,
          contact_email: form.contact_email.trim() || null,
          contact_phone: form.contact_phone.trim() || null,
          standard_weekly_hours: form.standard_weekly_hours
            ? parseFloat(form.standard_weekly_hours.replace(',', '.'))
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', firmaId);

      if (error) {
        setSaveError('Fehler beim Speichern: ' + error.message);
        return;
      }

      // Lokalen State sofort aktualisieren
      await loadFirma();
      setSaveSuccess(true);

      // Modal nach kurzer Verzoegerung schliessen
      setTimeout(() => {
        setShowModal(false);
        setForm(null);
        setSaveSuccess(false);
      }, 800);

    } catch (err) {
      setSaveError('Unerwarteter Fehler. Bitte erneut versuchen.');
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================================
  // RENDER: LOADING
  // ==========================================================================

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 flex items-center justify-center h-40">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </div>
    );
  }

  if (loadError || !firma) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} />
          {loadError || 'Firma nicht gefunden.'}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: ANZEIGE
  // ==========================================================================

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Firmendaten</h2>
          {canEdit && (
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-2 text-sm font-medium hover:opacity-75 transition-opacity"
              style={{ color: primaryColor }}
            >
              <Pencil size={16} />
              Bearbeiten
            </button>
          )}
        </div>

        {/* Daten-Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Linke Spalte */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Building2 size={14} />
                Firmenname
              </div>
              <div className="text-gray-900 font-medium">{firma.name}</div>
              {firma.short_name && (
                <div className="text-sm text-gray-400">{firma.short_name}</div>
              )}
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">Adresse</div>
              <div className="text-gray-900">
                {firma.street && <div>{firma.street}</div>}
                {(firma.zip_code || firma.city) && (
                  <div>{[firma.zip_code, firma.city].filter(Boolean).join(' ')}</div>
                )}
                {firma.federal_state && (
                  <div className="text-gray-600">{firma.federal_state}</div>
                )}
                {!firma.street && !firma.zip_code && !firma.city && !firma.federal_state && (
                  <div className="text-gray-400">-</div>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">Angelegt am</div>
              <div className="text-gray-900">{formatDate(firma.created_at)}</div>
            </div>
          </div>

          {/* Rechte Spalte */}
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Ansprechpartner</div>
              <div className="text-gray-900">{firma.contact_person || '-'}</div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">Telefon</div>
              <div className="text-gray-900">{firma.contact_phone || '-'}</div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">E-Mail</div>
              {firma.contact_email ? (
                <a
                  href={`mailto:${firma.contact_email}`}
                  className="hover:underline"
                  style={{ color: primaryColor }}
                >
                  {firma.contact_email}
                </a>
              ) : (
                <div className="text-gray-900">-</div>
              )}
            </div>
          </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">Regelarbeitszeit</div>
              <div className="text-gray-900">
                {firma.standard_weekly_hours
                  ? <>{String(firma.standard_weekly_hours).replace('.', ',')} h/Woche ({(firma.standard_weekly_hours / 5).toFixed(1).replace('.', ',')} h/Tag)</>
                  : <span className="text-gray-400">40 h/Woche (Standard)</span>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* MODAL: FIRMENDATEN BEARBEITEN                                      */}
      {/* ================================================================== */}
      {showModal && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseModal}
          />

          {/* Modal-Box */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Building2 size={18} className="text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Firmendaten bearbeiten</h2>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={saving}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Fehlermeldung */}
            {saveError && (
              <div className="flex items-start gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {saveError}
              </div>
            )}

            {/* Erfolgsmeldung */}
            {saveSuccess && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                <CheckCircle size={16} className="shrink-0" />
                Gespeichert!
              </div>
            )}

            {/* Formular */}
            <div className="space-y-4">

              {/* Abschnitt: Firma */}
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">
                Firmendaten
              </div>

              {/* Firmenname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firmenname <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  disabled={saving}
                  autoFocus
                />
              </div>

              {/* Kurzname */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kurzname <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.short_name}
                  onChange={(e) => setForm({ ...form, short_name: e.target.value })}
                  placeholder="z.B. Mustermann"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:border-transparent"
                  disabled={saving}
                />
              </div>

              {/* Abschnitt: Adresse */}
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">
                Adresse
              </div>

              {/* Strasse */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strasse <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  placeholder="z.B. Musterstrasse 1"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:border-transparent"
                  disabled={saving}
                />
              </div>

              {/* PLZ + Stadt */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PLZ <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.zip_code}
                    onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                    placeholder="z.B. 10115"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:ring-2 focus:border-transparent"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stadt <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="z.B. Berlin"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:ring-2 focus:border-transparent"
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Bundesland */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bundesland <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.federal_state}
                  onChange={(e) => setForm({ ...form, federal_state: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:border-transparent bg-white"
                  disabled={saving}
                >
                  <option value="">-- Bitte auswaehlen --</option>
                  {BUNDESLAENDER.map((bl) => (
                    <option key={bl} value={bl}>{bl}</option>
                  ))}
                </select>
              </div>

              {/* Abschnitt: Kontakt */}
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">
                Kontakt
              </div>

              {/* Ansprechpartner */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ansprechpartner <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  placeholder="z.B. Max Mustermann"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:border-transparent"
                  disabled={saving}
                />
              </div>

              {/* Telefon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  placeholder="z.B. +49 30 12345678"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:border-transparent"
                  disabled={saving}
                />
              </div>

              {/* E-Mail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  placeholder="z.B. info@mustermann.de"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:border-transparent"
                  disabled={saving}
                />
              </div>


              {/* Abschnitt: Arbeitszeit */}
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">
                Arbeitszeit
              </div>

              {/* Regelarbeitszeit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Woechentliche Regelarbeitszeit (h/Woche)
                </label>
                <input
                  type="text"
                  value={form.standard_weekly_hours}
                  onChange={(e) => setForm({ ...form, standard_weekly_hours: e.target.value })}
                  placeholder="z.B. 38 oder 40"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                             focus:outline-none focus:ring-2 focus:border-transparent"
                  disabled={saving}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Wird fuer die Berechnung der Feiertagsstunden verwendet (h/Woche geteilt durch 5).
                  Standard: 40 h/Woche = 8 h/Tag.
                </p>
              </div>

            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100
                           hover:bg-gray-200 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
                           rounded-lg transition-colors disabled:opacity-60"
                style={{ backgroundColor: primaryColor }}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Speichern...
                  </>
                ) : (
                  'Speichern'
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
