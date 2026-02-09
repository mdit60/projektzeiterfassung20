// src/components/shared/CompanyDataView.tsx
// ============================================================================
// PZE V7 - Shared Company Data View Component
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.57
//
// Wird von beiden Portalen genutzt:
// - Firmen-Portal: /v7/firma/firmendaten
// - Berater-Portal: /v7/berater/foerderung/firma/[id]?tab=firmendaten
//
// Props:
// - portal: 'berater' | 'firma'
// - company: CompanyData
// - canEdit: boolean
// - onSave: (data: CompanyData) => Promise<void>
// ============================================================================

'use client';

import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Pencil,
  Save,
  X,
  Calendar,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

export interface CompanyData {
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
  created_at?: string;
}

interface CompanyDataViewProps {
  portal: 'berater' | 'firma';
  company: CompanyData;
  canEdit: boolean;
  onSave: (data: CompanyData) => Promise<void>;
}

// ============================================================================
// KONSTANTEN
// ============================================================================

const BUNDESLAENDER = [
  { code: 'DE-BW', name: 'Baden-Wuerttemberg' },
  { code: 'DE-BY', name: 'Bayern' },
  { code: 'DE-BE', name: 'Berlin' },
  { code: 'DE-BB', name: 'Brandenburg' },
  { code: 'DE-HB', name: 'Bremen' },
  { code: 'DE-HH', name: 'Hamburg' },
  { code: 'DE-HE', name: 'Hessen' },
  { code: 'DE-MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'DE-NI', name: 'Niedersachsen' },
  { code: 'DE-NW', name: 'Nordrhein-Westfalen' },
  { code: 'DE-RP', name: 'Rheinland-Pfalz' },
  { code: 'DE-SL', name: 'Saarland' },
  { code: 'DE-SN', name: 'Sachsen' },
  { code: 'DE-ST', name: 'Sachsen-Anhalt' },
  { code: 'DE-SH', name: 'Schleswig-Holstein' },
  { code: 'DE-TH', name: 'Thueringen' },
];

const BUNDESLAND_NAMES: Record<string, string> = Object.fromEntries(
  BUNDESLAENDER.map(bl => [bl.code, bl.name])
);

// ============================================================================
// FARBEN
// ============================================================================

const PORTAL_COLORS = {
  berater: {
    button: 'bg-blue-600 hover:bg-blue-700',
    buttonOutline: 'text-blue-600 hover:bg-blue-50',
    focus: 'focus:ring-blue-500',
    link: 'text-blue-600 hover:underline',
  },
  firma: {
    button: 'bg-green-600 hover:bg-green-700',
    buttonOutline: 'text-green-600 hover:bg-green-50',
    focus: 'focus:ring-green-500',
    link: 'text-green-600 hover:underline',
  },
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function CompanyDataView({
  portal,
  company,
  canEdit,
  onSave,
}: CompanyDataViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<CompanyData>(company);
  const [error, setError] = useState<string | null>(null);

  const colors = PORTAL_COLORS[portal];

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const getBundeslandName = (code: string | null): string => {
    if (!code) return '-';
    return BUNDESLAND_NAMES[code] || code;
  };

  // ============================================================================
  // AKTIONEN
  // ============================================================================

  const startEdit = () => {
    setEditData({ ...company });
    setIsEditing(true);
    setError(null);
  };

  const cancelEdit = () => {
    setEditData(company);
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!editData.name?.trim()) {
      setError('Firmenname ist erforderlich');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(editData);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // RENDER - BEARBEITUNGSMODUS
  // ============================================================================

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Firmendaten bearbeiten</h2>
          <button
            onClick={cancelEdit}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Firmenname */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Firmenname *
              </label>
              <input
                type="text"
                value={editData.name || ''}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              />
            </div>

            {/* Kurzname */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kurzname
              </label>
              <input
                type="text"
                value={editData.short_name || ''}
                onChange={(e) => setEditData({ ...editData, short_name: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              />
            </div>

            {/* Strasse */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Strasse
              </label>
              <input
                type="text"
                value={editData.street || ''}
                onChange={(e) => setEditData({ ...editData, street: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              />
            </div>

            {/* PLZ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PLZ
              </label>
              <input
                type="text"
                value={editData.zip_code || ''}
                onChange={(e) => setEditData({ ...editData, zip_code: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              />
            </div>

            {/* Ort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ort
              </label>
              <input
                type="text"
                value={editData.city || ''}
                onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              />
            </div>

            {/* Bundesland */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bundesland
              </label>
              <select
                value={editData.federal_state || ''}
                onChange={(e) => setEditData({ ...editData, federal_state: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              >
                <option value="">-- Bitte waehlen --</option>
                {BUNDESLAENDER.map(bl => (
                  <option key={bl.code} value={bl.code}>{bl.name}</option>
                ))}
              </select>
            </div>

            {/* Ansprechpartner */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ansprechpartner
              </label>
              <input
                type="text"
                value={editData.contact_person || ''}
                onChange={(e) => setEditData({ ...editData, contact_person: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              />
            </div>

            {/* Telefon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <input
                type="tel"
                value={editData.contact_phone || ''}
                onChange={(e) => setEditData({ ...editData, contact_phone: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              />
            </div>

            {/* E-Mail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail
              </label>
              <input
                type="email"
                value={editData.contact_email || ''}
                onChange={(e) => setEditData({ ...editData, contact_email: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 ${colors.focus}`}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700
                         hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !editData.name?.trim()}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg
                         transition-colors disabled:opacity-50 ${colors.button}`}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Speichern...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Speichern
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - ANZEIGEMODUS
  // ============================================================================

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Firmendaten</h2>
        {canEdit && (
          <button
            onClick={startEdit}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${colors.buttonOutline}`}
          >
            <Pencil size={16} />
            Bearbeiten
          </button>
        )}
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Linke Spalte: Adresse */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Building2 size={16} />
                Firmenname
              </div>
              <p className="text-lg font-medium text-gray-900">{company.name}</p>
              {company.short_name && (
                <p className="text-sm text-gray-500">({company.short_name})</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <MapPin size={16} />
                Adresse
              </div>
              <p className="text-gray-900">{company.street || '-'}</p>
              <p className="text-gray-900">
                {company.zip_code} {company.city}
              </p>
              {company.federal_state && (
                <p className="text-sm text-gray-500">{getBundeslandName(company.federal_state)}</p>
              )}
            </div>

            {company.created_at && (
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Calendar size={16} />
                  Angelegt am
                </div>
                <p className="text-gray-900">{formatDate(company.created_at)}</p>
              </div>
            )}
          </div>

          {/* Rechte Spalte: Kontakt */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <User size={16} />
                Ansprechpartner
              </div>
              <p className="text-gray-900">{company.contact_person || '-'}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Phone size={16} />
                Telefon
              </div>
              <p className="text-gray-900">{company.contact_phone || '-'}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Mail size={16} />
                E-Mail
              </div>
              {company.contact_email ? (
                <a
                  href={`mailto:${company.contact_email}`}
                  className={colors.link}
                >
                  {company.contact_email}
                </a>
              ) : (
                <p className="text-gray-900">-</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
