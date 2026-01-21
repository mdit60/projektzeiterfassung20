'use client';

// src/components/shared/DataTable.tsx
// ============================================================================
// PZE V7 - Gemeinsame DataTable-Komponente
// ============================================================================
// Datum: 21. Januar 2026
// Version: 7.3.42
//
// Wiederverwendbare Tabellen-Komponente fuer:
// - Mitarbeiterlisten
// - Projektlisten
// - Arbeitspaket-Listen
// - Team-Zuordnungen
// - etc.
// ============================================================================

import { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Filter,
  Pencil,
  Trash2,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { V7PortalType } from '@/types/v7-types';
import { PORTAL_COLORS, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

export interface Column<T> {
  key: string;
  header: string;
  width?: string;                    // z.B. 'w-32', 'w-48', 'flex-1'
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  hideOnMobile?: boolean;
}

export interface RowAction<T> {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: (item: T) => void;
  show?: (item: T) => boolean;       // Optional: Nur anzeigen wenn true
  variant?: 'default' | 'danger';
}

interface DataTableProps<T> {
  portal: V7PortalType;
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;                  // Eindeutiges Feld fuer key (z.B. 'id')
  actions?: RowAction<T>[];
  onRowClick?: (item: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];         // Felder die durchsucht werden
  emptyMessage?: string;
  loading?: boolean;
  pagination?: boolean;
  pageSize?: number;
  stickyHeader?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

function compareValues(a: any, b: any, direction: SortDirection): number {
  if (a === null || a === undefined) return direction === 'asc' ? 1 : -1;
  if (b === null || b === undefined) return direction === 'asc' ? -1 : 1;
  
  if (typeof a === 'string' && typeof b === 'string') {
    return direction === 'asc' 
      ? a.localeCompare(b, 'de') 
      : b.localeCompare(a, 'de');
  }
  
  if (typeof a === 'number' && typeof b === 'number') {
    return direction === 'asc' ? a - b : b - a;
  }
  
  return 0;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function DataTable<T extends Record<string, any>>({
  portal,
  columns,
  data,
  keyField,
  actions,
  onRowClick,
  searchable = false,
  searchPlaceholder = 'Suchen...',
  searchFields,
  emptyMessage = 'Keine Daten vorhanden',
  loading = false,
  pagination = true,
  pageSize = DEFAULT_PAGE_SIZE,
  stickyHeader = false,
}: DataTableProps<T>) {
  const colors = PORTAL_COLORS[portal];
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  // Gefilterte und sortierte Daten
  const processedData = useMemo(() => {
    let result = [...data];

    // Suche
    if (searchable && searchTerm && searchFields && searchFields.length > 0) {
      const term = searchTerm.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = getNestedValue(item, field as string);
          return value?.toString().toLowerCase().includes(term);
        })
      );
    }

    // Sortierung
    if (sortKey && sortDirection) {
      result.sort((a, b) => {
        const aVal = getNestedValue(a, sortKey);
        const bVal = getNestedValue(b, sortKey);
        return compareValues(aVal, bVal, sortDirection);
      });
    }

    return result;
  }, [data, searchTerm, searchFields, searchable, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    const start = (currentPage - 1) * itemsPerPage;
    return processedData.slice(start, start + itemsPerPage);
  }, [processedData, currentPage, itemsPerPage, pagination]);

  // Sort-Handler
  const handleSort = (key: string) => {
    if (sortKey === key) {
      // Gleiche Spalte: Richtung wechseln oder zuruecksetzen
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      // Neue Spalte
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Sort-Icon
  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ChevronsUpDown size={14} className="text-gray-400" />;
    if (sortDirection === 'asc') return <ChevronUp size={14} />;
    return <ChevronDown size={14} />;
  };

  // Seite wechseln
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Actions Menu schliessen bei Klick ausserhalb
  const closeActionMenu = () => setOpenActionMenu(null);

  return (
    <div className="w-full">
      {/* Toolbar: Suche */}
      {searchable && (
        <div className="mb-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Zurueck zur ersten Seite
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ '--tw-ring-color': colors.primary } as React.CSSProperties}
            />
          </div>
        </div>
      )}

      {/* Tabelle */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead className={`bg-gray-50 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`
                      px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider
                      border-b border-gray-200
                      ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                      ${col.width || ''}
                      ${col.hideOnMobile ? 'hidden md:table-cell' : ''}
                      ${col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''}
                    `}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.header}</span>
                      {col.sortable && getSortIcon(col.key)}
                    </div>
                  </th>
                ))}
                {actions && actions.length > 0 && (
                  <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider
                                 border-b border-gray-200 text-right w-24">
                    Aktionen
                  </th>
                )}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                // Loading State
                <tr>
                  <td
                    colSpan={columns.length + (actions ? 1 : 0)}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      <span>Laden...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                // Empty State
                <tr>
                  <td
                    colSpan={columns.length + (actions ? 1 : 0)}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                // Daten
                paginatedData.map((item, index) => (
                  <tr
                    key={String(item[keyField])}
                    onClick={() => onRowClick?.(item)}
                    className={`
                      ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                      transition-colors duration-100
                    `}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`
                          px-4 py-3 text-sm text-gray-700
                          ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                          ${col.hideOnMobile ? 'hidden md:table-cell' : ''}
                        `}
                      >
                        {col.render
                          ? col.render(item, index)
                          : getNestedValue(item, col.key) ?? '-'
                        }
                      </td>
                    ))}
                    
                    {/* Aktionen */}
                    {actions && actions.length > 0 && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {actions.length <= 3 ? (
                            // Direkte Icons wenn <= 3 Aktionen
                            actions.map((action) => {
                              if (action.show && !action.show(item)) return null;
                              return (
                                <button
                                  key={action.key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    action.onClick(item);
                                  }}
                                  title={action.label}
                                  className={`
                                    p-1.5 rounded hover:bg-gray-100 transition-colors
                                    ${action.variant === 'danger' 
                                      ? 'text-red-600 hover:bg-red-50' 
                                      : 'text-gray-600 hover:text-gray-800'
                                    }
                                  `}
                                >
                                  {action.icon}
                                </button>
                              );
                            })
                          ) : (
                            // Dropdown Menu wenn > 3 Aktionen
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionMenu(
                                    openActionMenu === String(item[keyField]) 
                                      ? null 
                                      : String(item[keyField])
                                  );
                                }}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                              >
                                <MoreVertical size={18} />
                              </button>
                              
                              {openActionMenu === String(item[keyField]) && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={closeActionMenu} 
                                  />
                                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg z-20 py-1 border">
                                    {actions.map((action) => {
                                      if (action.show && !action.show(item)) return null;
                                      return (
                                        <button
                                          key={action.key}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            action.onClick(item);
                                            closeActionMenu();
                                          }}
                                          className={`
                                            w-full flex items-center gap-2 px-3 py-2 text-sm
                                            ${action.variant === 'danger'
                                              ? 'text-red-600 hover:bg-red-50'
                                              : 'text-gray-700 hover:bg-gray-100'
                                            }
                                          `}
                                        >
                                          {action.icon}
                                          <span>{action.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && processedData.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Info */}
          <div className="text-sm text-gray-600">
            Zeige {((currentPage - 1) * itemsPerPage) + 1} bis{' '}
            {Math.min(currentPage * itemsPerPage, processedData.length)} von{' '}
            {processedData.length} Eintraegen
          </div>

          {/* Seitengroesse + Navigation */}
          <div className="flex items-center gap-4">
            {/* Seitengroesse */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Pro Seite:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            {/* Seiten-Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-50 
                           disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft size={18} />
              </button>
              
              <span className="px-3 py-1 text-sm">
                Seite {currentPage} von {totalPages || 1}
              </span>
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-50 
                           disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ENDE
// ============================================================================
