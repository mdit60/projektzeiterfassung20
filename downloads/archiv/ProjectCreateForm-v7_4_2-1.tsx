// src/components/shared/ProjectCreateForm.tsx
// ============================================================================
// PZE V7 - Shared Project Create Form Component
// ============================================================================
// Datum: 26. Februar 2026
// Version: 7.4.2-1
//
// Wird von beiden Portalen genutzt:
// - Firmen-Portal: /v7/firma/projekte/neu
// - Berater-Portal: /v7/berater/foerderung/firma/[id]/projekt/neu
//
// Features:
// - Manuelles Formular fuer Projektanlage
// - Portal-abhaengige Farben
//
// HINWEIS: PDF-Import-Funktionalitaet wurde zurueckgestellt (v7.4.2-1).
// Der Parser-Code ist weiter unten als Kommentarblock erhalten fuer
// spaetere Reaktivierung. Import erfolgt vorerst ueber Excel-AP-Vorlage.
// ============================================================================

'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Save,
  AlertCircle,
  Edit3,
  CheckCircle,
  Loader2,
} from 'lucide-react';

// ============================================================================
// KONSTANTEN
// ============================================================================

const FUNDING_FORMATS = [
  { value: '', label: '-- Bitte waehlen --' },
  { value: 'ZIM', label: 'ZIM Einzelprojekt' },
  { value: 'ZIM_KOOP', label: 'ZIM Kooperationsprojekt' },
  { value: 'ZIM_NETZWERK', label: 'ZIM Netzwerk-Management' },
  { value: 'ZIM_DS', label: 'ZIM Durchfuehrbarkeitsstudie' },
  { value: 'BMBF', label: 'BMBF Foerderung' },
  { value: 'BMBF_DS', label: 'BMBF Durchfuehrbarkeitsstudie' },
];

// ============================================================================
// TYPEN
// ============================================================================

interface ProjectFormData {
  name: string;
  short_name: string;
  funding_format: string;
  funding_reference: string;
  start_date: string;
  end_date: string;
  notes: string;
}

const EMPTY_FORM: ProjectFormData = {
  name: '',
  short_name: '',
  funding_format: '',
  funding_reference: '',
  start_date: '',
  end_date: '',
  notes: '',
};

interface ProjectCreateFormProps {
  portal: 'berater' | 'firma';
  companyId: string;
  companyName: string;
  onSuccess: (projectId: string) => void;
  onCancel: () => void;
}

// ============================================================================
// FARBEN
// ============================================================================

const PORTAL_COLORS = {
  berater: {
    button: 'bg-blue-600 hover:bg-blue-700',
    buttonLight: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    focus: 'focus:ring-blue-500',
    text: 'text-blue-600',
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    activeTab: 'bg-white text-blue-700 shadow-sm',
    tabBg: 'bg-blue-100',
    spinner: 'border-blue-200 border-t-blue-600',
    icon: 'text-blue-600',
  },
  firma: {
    button: 'bg-green-600 hover:bg-green-700',
    buttonLight: 'bg-green-50 text-green-700 hover:bg-green-100',
    focus: 'focus:ring-green-500',
    text: 'text-green-600',
    border: 'border-green-200',
    bg: 'bg-green-50',
    activeTab: 'bg-white text-green-700 shadow-sm',
    tabBg: 'bg-green-100',
    spinner: 'border-green-200 border-t-green-600',
    icon: 'text-green-600',
  },
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function ProjectCreateForm({
  portal,
  companyId,
  companyName,
  onSuccess,
  onCancel,
}: ProjectCreateFormProps) {
  const supabase = createClient();
  const colors = PORTAL_COLORS[portal];

  // State
  const [formData, setFormData] = useState<ProjectFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ============================================================================
  // MANUELL SPEICHERN
  // ============================================================================

  const handleSaveManual = async () => {
    if (!formData.name.trim()) {
      setError('Projektname ist erforderlich');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: newProject, error: insertError } = await supabase
        .from('v7_projects')
        .insert({
          client_company_id: companyId,
          name: formData.name.trim(),
          short_name: formData.short_name.trim() || null,
          funding_format: formData.funding_format || null,
          funding_reference: formData.funding_reference.trim() || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          notes: formData.notes.trim() || null,
          is_active: true,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      setSuccess('Projekt erfolgreich angelegt!');
      setTimeout(() => {
        onSuccess(newProject.id);
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Meldungen */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {success && (
        <div className={`p-4 ${colors.bg} border ${colors.border} rounded-lg flex items-start gap-3`}>
          <CheckCircle className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
          <span className={colors.text.replace('text-', 'text-').replace('600', '800')}>{success}</span>
        </div>
      )}

      {/* ================================================================ */}
      {/* MANUELLES FORMULAR                                              */}
      {/* ================================================================ */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Projektname */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Projektname *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="z.B. Entwicklung innovativer Drucktechnologie"
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 ${colors.focus}`}
              autoFocus
            />
          </div>

          {/* Kurzname */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kurzname
            </label>
            <input
              type="text"
              value={formData.short_name}
              onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
              placeholder="z.B. InnovDruck"
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 ${colors.focus}`}
            />
          </div>

          {/* Foerderformat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foerderformat
            </label>
            <select
              value={formData.funding_format}
              onChange={(e) => setFormData({ ...formData, funding_format: e.target.value })}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 ${colors.focus}`}
            >
              {FUNDING_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Foerderkennzeichen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foerderkennzeichen (FKZ)
            </label>
            <input
              type="text"
              value={formData.funding_reference}
              onChange={(e) => setFormData({ ...formData, funding_reference: e.target.value })}
              placeholder="z.B. 16KN12345"
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 ${colors.focus}`}
            />
          </div>

          {/* Startdatum */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Startdatum
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 ${colors.focus}`}
            />
          </div>

          {/* Enddatum */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enddatum
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 ${colors.focus}`}
            />
          </div>

          {/* Notizen */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notizen
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Optionale Anmerkungen zum Projekt..."
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 ${colors.focus}`}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700
                       hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSaveManual}
            disabled={saving || !formData.name.trim()}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg
                       transition-colors disabled:opacity-50 ${colors.button}`}
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Speichere...
              </>
            ) : (
              <>
                <Save size={18} />
                Projekt anlegen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ZURUECKGESTELLTER CODE: PDF-IMPORT (fuer spaetere Reaktivierung)
// ============================================================================
//
// Der folgende Code war bis v7.4.2 aktiv und ermoeglicht den Import von
// ZIM-Foerderantraegen als PDF. Zurueckgestellt wegen Problemen mit der
// XFA-Extraktion bei verschiedenen PDF-Formular-Versionen (Object Streams).
//
// Zum Reaktivieren:
// 1. ZIM-Type-Interfaces und normalizeAPs() wiederherstellen
// 2. State-Variablen hinzufuegen: activeTab, parsing, importing, parsedData, normalizedAPs
// 3. handlePdfUpload() und handleImport() Funktionen einbinden
// 4. Tab-Leiste und Upload-UI in den RENDER-Block einfuegen
// 5. API-Route /api/parse-zim muss funktionierenden XFA-Extraktor haben
//
// Letzter funktionierender Stand: ProjectCreateForm-v7_3_82-9.tsx
// Parser-Route: parse-zim-route-v7_4_2.ts (mit DS-Support)
// Python-Parser: parse-zim-pdf-v4_9.py (Railway-Service, vollstaendige XFA-Extraktion)
//
// ============================================================================
