// src/components/shared/ProjectList.tsx
// ============================================================================
// PZE V7 - Shared Project List Component
// ============================================================================
// Datum: 06. Februar 2026
// Version: 7.3.88-7
// v7.3.88-7: returnTo Prop - wird an /projekt/neu weitergegeben fuer Zurueck-Navigation
//
// Wird von beiden Portalen genutzt:
// - Firmen-Portal: /v7/firma/projekte
// - Berater-Portal: /v7/berater/foerderung/firma/[id]?tab=projekte
//
// FIX v7.3.88-6: Komponente laedt Projekte selbst statt als Props zu erwarten
//                Verhindert "projects is undefined" Fehler
//
// Props:
// - portal: 'berater' | 'firma'
// - companyId: string (Firma-ID fuer Datenbankabfrage)
// - onProjectClick?: (projectId: string) => void (optional, default: Navigation)
// - showNewButton?: boolean
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  FolderKanban,
  Plus,
  ChevronRight,
  Search,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

export interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

interface ProjectListProps {
  portal: 'berater' | 'firma';
  companyId: string;
  onProjectClick?: (projectId: string) => void;
  showNewButton?: boolean;
  title?: string;
  returnTo?: string; // Zurueck-Ziel fuer /projekt/neu (z.B. Firmen-Cockpit URL)
}

// ============================================================================
// FARBEN
// ============================================================================

const PORTAL_COLORS = {
  berater: {
    primary: '#002451',
    button: 'bg-[#002451] hover:bg-[#003366]',
    badge: 'bg-blue-100 text-blue-700',
    focus: 'focus:ring-[#002451]',
  },
  firma: {
    primary: '#65A655',
    button: 'bg-[#65A655] hover:bg-[#558B47]',
    badge: 'bg-green-100 text-green-700',
    focus: 'focus:ring-[#65A655]',
  },
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function ProjectList({
  portal,
  companyId,
  onProjectClick,
  showNewButton = true,
  title = 'Projekte',
  returnTo,
}: ProjectListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const colors = PORTAL_COLORS[portal];

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  useEffect(() => {
    loadProjects();
  }, [companyId]);

  async function loadProjects() {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = createClient();
      
      const { data, error: dbError } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_format, funding_reference, start_date, end_date, is_active')
        .eq('client_company_id', companyId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (dbError) {
        console.error('Fehler beim Laden der Projekte:', dbError);
        setError('Fehler beim Laden der Projekte');
        return;
      }

      setProjects(data || []);
    } catch (err) {
      console.error('Fehler:', err);
      setError('Unerwarteter Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const getFundingFormatLabel = (format: string | null): string => {
    const formats: Record<string, string> = {
      'ZIM': 'ZIM',
      'ZIM_KOOP': 'ZIM Koop',
      'ZIM_NETZWERK': 'Netzwerk',
      'ZIM_DS': 'ZIM DS',
      'BMBF': 'BMBF',
      'BMBF_DS': 'BMBF DS',
    };
    return formats[format || ''] || format || '-';
  };

  // Sichere Filterung - projects ist immer ein Array
  const filteredProjects = (projects || []).filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.funding_reference && p.funding_reference.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Default Navigation wenn kein onProjectClick gegeben
  const handleProjectClick = (projectId: string) => {
    if (onProjectClick) {
      onProjectClick(projectId);
    } else {
      // Standard-Navigation basierend auf Portal
      if (portal === 'berater') {
        router.push(`/v7/berater/foerderung/firma/${companyId}/projekt/${projectId}`);
      } else {
        router.push(`/v7/firma/projekt/${projectId}`);
      }
    }
  };

  // Neues Projekt anlegen
  const handleNewProject = () => {
    if (portal === 'berater') {
      const url = `/v7/berater/foerderung/firma/${companyId}/projekt/neu`;
      router.push(returnTo ? `${url}?returnTo=${encodeURIComponent(returnTo)}` : url);
    } else {
      router.push(`/v7/firma/projekt/neu`);
    }
  };

  // ============================================================================
  // RENDER - LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500">Projekte werden geladen...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - ERROR
  // ============================================================================

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadProjects}
            className="mt-4 px-4 py-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - HAUPTINHALT
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Header mit Suche und Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

        <div className="flex items-center gap-4">
          {/* Suche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-48
                         focus:outline-none focus:ring-2 ${colors.focus} focus:border-transparent`}
            />
          </div>

          {/* Neues Projekt Button */}
          {showNewButton && (
            <button
              onClick={handleNewProject}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg
                         transition-colors text-sm font-medium ${colors.button}`}
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Neues Projekt</span>
            </button>
          )}
        </div>
      </div>

      {/* Projektliste */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">
            {searchTerm ? 'Keine Projekte gefunden.' : 'Noch keine Projekte vorhanden.'}
          </p>
          {!searchTerm && showNewButton && (
            <button
              onClick={handleNewProject}
              className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg
                         transition-colors text-sm font-medium ${colors.button}`}
            >
              <Plus size={18} />
              Erstes Projekt anlegen
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Projekt</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden sm:table-cell">Foerderprogramm</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">FKZ</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden lg:table-cell">Laufzeit</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{project.name}</div>
                    {project.short_name && (
                      <div className="text-sm text-gray-500">{project.short_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell">
                    {project.funding_format ? (
                      <span className={`px-2 py-1 text-xs font-medium rounded ${colors.badge}`}>
                        {getFundingFormatLabel(project.funding_format)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 hidden md:table-cell">
                    {project.funding_reference || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 hidden lg:table-cell">
                    {formatDate(project.start_date)} - {formatDate(project.end_date)}
                  </td>
                  <td className="px-4 py-4">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Anzahl */}
      <div className="text-sm text-gray-500">
        {filteredProjects.length} {filteredProjects.length === 1 ? 'Projekt' : 'Projekte'}
        {projects.length !== filteredProjects.length && ` (von ${projects.length} gesamt)`}
      </div>
    </div>
  );
}
