'use client';

// src/components/shared/WorkPackageEditModal.tsx
// ============================================================================
// PZE V7 - Gemeinsame WorkPackageEditModal-Komponente
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.52
//
// Wiederverwendbares Modal fuer:
// - Arbeitspakete anlegen (create)
// - Arbeitspakete bearbeiten (edit)
//
// Portal-unabhaengig: Farben werden via portal-Parameter gesteuert
// ============================================================================

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { V7PortalType } from '@/types/v7-types';
import { PORTAL_COLORS, HOURS_PER_PM } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

export interface WorkPackage {
  id: string;
  project_id: string;
  ap_number: number;
  ap_sub_number: number | null;
  ap_code: string | null;
  name: string;
  description: string | null;
  start_month: number | null;      // Legacy - wird nicht mehr verwendet
  end_month: number | null;        // Legacy - wird nicht mehr verwendet
  start_date: string | null;       // NEU: Echtes Datum (YYYY-MM-DD)
  end_date: string | null;         // NEU: Echtes Datum (YYYY-MM-DD)
  total_person_months: number | null;
  total_costs: number | null;
  is_technical: boolean;           // NEU: Technisches AP (true) oder Nicht-technisches (false)
  is_active: boolean;
}

export interface Project {
  id: string;
  name: string;
  funding_reference: string | null;
}

export interface WorkPackageFormData {
  project_id: string;
  ap_number: string;
  ap_code: string;
  name: string;
  description: string;
  start_date: string;              // NEU: Datum (YYYY-MM-DD)
  end_date: string;                // NEU: Datum (YYYY-MM-DD)
  total_person_months: string;
  total_costs: string;
  is_technical: boolean;           // NEU: Technisch/Nicht-technisch
}

interface WorkPackageEditModalProps {
  portal: V7PortalType;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: WorkPackageFormData) => Promise<void>;
  
  // Mode: create oder edit
  mode: 'create' | 'edit';
  
  // Fuer Edit-Mode: Das zu bearbeitende AP
  workPackage?: WorkPackage | null;
  
  // Liste der Projekte fuer Dropdown
  projects: Project[];
  
  // Vorausgewaehltes Projekt (fuer create)
  defaultProjectId?: string;
  
  // Naechste freie AP-Nummer (fuer create)
  getNextAPNumber?: (projectId: string) => number;
  
  // Loading und Error States
  saving?: boolean;
  error?: string | null;
}

// ============================================================================
// KONSTANTEN
// ============================================================================

const EMPTY_FORM: WorkPackageFormData = {
  project_id: '',
  ap_number: '',
  ap_code: '',
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  total_person_months: '',
  total_costs: '',
  is_technical: false,
};

// ============================================================================
// HELPER
// ============================================================================

function pmToHours(pm: string | number | null): string {
  if (pm === null || pm === undefined || pm === '') return '';
  const pmNum = typeof pm === 'string' ? parseFloat(pm) : pm;
  if (isNaN(pmNum) || pmNum === 0) return '';
  return `${(pmNum * HOURS_PER_PM).toFixed(0)} h`;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function WorkPackageEditModal({
  portal,
  isOpen,
  onClose,
  onSave,
  mode,
  workPackage,
  projects,
  defaultProjectId,
  getNextAPNumber,
  saving = false,
  error = null,
}: WorkPackageEditModalProps) {
  const colors = PORTAL_COLORS[portal];
  const [formData, setFormData] = useState<WorkPackageFormData>(EMPTY_FORM);
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Formular initialisieren
  useEffect(() => {
    if (!isOpen) return;
    
    if (mode === 'edit' && workPackage) {
      // Edit-Mode: Werte aus WorkPackage laden
      setFormData({
        project_id: workPackage.project_id,
        ap_number: workPackage.ap_number.toString(),
        ap_code: workPackage.ap_code || '',
        name: workPackage.name || '',
        description: workPackage.description || '',
        start_date: workPackage.start_date || '',
        end_date: workPackage.end_date || '',
        total_person_months: workPackage.total_person_months?.toString() || '',
        total_costs: workPackage.total_costs?.toString() || '',
        is_technical: workPackage.is_technical || false,
      });
    } else {
      // Create-Mode: Leeres Formular mit Defaults
      const projectId = defaultProjectId || (projects.length > 0 ? projects[0].id : '');
      const nextAP = projectId && getNextAPNumber ? getNextAPNumber(projectId) : 1;
      
      setFormData({
        ...EMPTY_FORM,
        project_id: projectId,
        ap_number: nextAP.toString(),
        ap_code: `AP${nextAP}`,
      });
    }
    setLocalError(null);
  }, [isOpen, mode, workPackage, defaultProjectId, projects, getNextAPNumber]);
  
  if (!isOpen) return null;
  
  // ============================================
  // HANDLER
  // ============================================
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-generate ap_code when ap_number changes
    if (name === 'ap_number' && value) {
      setFormData(prev => ({ ...prev, ap_number: value, ap_code: `AP${value}` }));
    }
    
    // Update project_id and recalculate next AP number
    if (name === 'project_id' && value && mode === 'create' && getNextAPNumber) {
      const nextAP = getNextAPNumber(value);
      setFormData(prev => ({ 
        ...prev, 
        project_id: value, 
        ap_number: nextAP.toString(), 
        ap_code: `AP${nextAP}` 
      }));
    }
  };
  
  const handleSubmit = async () => {
    // Validierung
    if (!formData.name.trim()) {
      setLocalError('Name des Arbeitspakets ist erforderlich');
      return;
    }
    if (!formData.project_id) {
      setLocalError('Bitte waehlen Sie ein Projekt');
      return;
    }
    if (!formData.ap_number) {
      setLocalError('AP-Nummer ist erforderlich');
      return;
    }
    
    setLocalError(null);
    await onSave(formData);
  };
  
  const displayError = localError || error;
  
  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Neues Arbeitspaket anlegen' : 'Arbeitspaket bearbeiten'}
          </h3>
          <button 
            onClick={onClose} 
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {displayError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {displayError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Projekt-Auswahl */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Projekt *
              </label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleInputChange}
                disabled={mode === 'edit' || saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-sky-500 disabled:bg-gray-100"
              >
                <option value="">-- Projekt auswaehlen --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.funding_reference ? `(${p.funding_reference})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* AP-Nummer und Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AP-Nummer *
              </label>
              <input
                type="number"
                name="ap_number"
                value={formData.ap_number}
                onChange={handleInputChange}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                min="1"
                placeholder="1, 2, 3..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AP-Code
              </label>
              <input
                type="text"
                name="ap_code"
                value={formData.ap_code}
                onChange={handleInputChange}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                placeholder="AP1, AP1.1..."
              />
            </div>

            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                placeholder="Bezeichnung des Arbeitspakets"
              />
            </div>

            {/* Beschreibung */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschreibung
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                disabled={saving}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                placeholder="Kurze Beschreibung der Arbeitsinhalte"
              />
            </div>

            {/* Laufzeit - echte Datumsfelder */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Startdatum
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enddatum
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
              />
            </div>

            {/* Technisches AP (nur bei Durchfuehrbarkeitsstudien relevant) */}
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_technical"
                  checked={formData.is_technical}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_technical: e.target.checked }))}
                  disabled={saving}
                  className="w-4 h-4 text-sky-600 border-gray-300 rounded 
                             focus:ring-sky-500 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700">
                  Technisches Arbeitspaket (B)
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Bei Durchfuehrbarkeitsstudien: A) Nicht-technisch (bis 30.000 EUR) vs. B) Technisch (bis 100.000 EUR)
              </p>
            </div>

            {/* PM und Kosten */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Personenmonate (PM)
              </label>
              <input
                type="number"
                name="total_person_months"
                value={formData.total_person_months}
                onChange={handleInputChange}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                min="0"
                step="0.1"
                placeholder="z.B. 2.5"
              />
              {formData.total_person_months && (
                <p className="text-xs text-gray-500 mt-1">
                  = {pmToHours(formData.total_person_months)} (bei 173,33 h/PM)
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gesamtkosten (EUR)
              </label>
              <input
                type="number"
                name="total_costs"
                value={formData.total_costs}
                onChange={handleInputChange}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                min="0"
                step="100"
                placeholder="z.B. 25000"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button 
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg 
                       hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-white rounded-lg disabled:opacity-50 
                       flex items-center gap-2 transition-colors"
            style={{ backgroundColor: colors.primary }}
          >
            {saving && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            )}
            {mode === 'create' ? 'Anlegen' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ENDE
// ============================================================================
