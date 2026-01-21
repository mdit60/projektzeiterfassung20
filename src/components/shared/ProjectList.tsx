// src/components/shared/ProjectList.tsx
// ============================================================================
// PZE V7 - Shared Project List Component
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.57
//
// Wird von beiden Portalen genutzt:
// - Firmen-Portal: /v7/firma/projekte
// - Berater-Portal: /v7/berater/foerderung/firma/[id]?tab=projekte
//
// Props:
// - portal: 'berater' | 'firma'
// - projects: Project[]
// - companyId: string (fuer Berater-Portal)
// - onProjectClick: (projectId: string) => void
// - onNewProject?: () => void (optional, nur wenn Button angezeigt werden soll)
// - showNewButton?: boolean
// ============================================================================

'use client';

import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  ChevronRight,
  Search,
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
}

interface ProjectListProps {
  portal: 'berater' | 'firma';
  projects: Project[];
  onProjectClick: (projectId: string) => void;
  onNewProject?: () => void;
  showNewButton?: boolean;
  title?: string;
}

// ============================================================================
// FARBEN
// ============================================================================

const PORTAL_COLORS = {
  berater: {
    button: 'bg-blue-600 hover:bg-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    focus: 'focus:ring-blue-500',
  },
  firma: {
    button: 'bg-green-600 hover:bg-green-700',
    badge: 'bg-green-100 text-green-700',
    focus: 'focus:ring-green-500',
  },
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function ProjectList({
  portal,
  projects,
  onProjectClick,
  onNewProject,
  showNewButton = false,
  title = 'Projekte',
}: ProjectListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const colors = PORTAL_COLORS[portal];

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

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.funding_reference && p.funding_reference.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // ============================================================================
  // RENDER
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
          {showNewButton && onNewProject && (
            <button
              onClick={onNewProject}
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
          <p className="text-gray-500 text-lg">
            {searchTerm ? 'Keine Projekte gefunden.' : 'Noch keine Projekte vorhanden.'}
          </p>
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
                  onClick={() => onProjectClick(project.id)}
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
      </div>
    </div>
  );
}
