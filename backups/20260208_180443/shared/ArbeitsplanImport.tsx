// src/components/shared/ArbeitsplanImport.tsx
// ============================================================================
// PZE V7 - Arbeitsplan Import Komponente
// ============================================================================
// Datum: 03. Februar 2026
// Version: 7.3.87
//
// Buttons und Dialog für:
// - Excel-Vorlage herunterladen (projektspezifisch)
// - Excel hochladen und importieren (mit Vorschau)
//
// Props:
// - projectId: string
// - hasTeam: boolean (ob Team definiert ist)
// - onImportComplete: () => void (Callback nach erfolgreichem Import)
// - portal: 'berater' | 'firma'
// ============================================================================

'use client';

import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle,
  X,
  Loader2,
  AlertTriangle,
  Plus,
  RefreshCw
} from 'lucide-react';
import { PORTAL_COLORS } from '@/lib/v7-constants';

// ============================================================================
// TYPEN
// ============================================================================

interface ArbeitsplanImportProps {
  projectId: string;
  hasTeam: boolean;
  teamCount: number;
  onImportComplete: () => void;
  portal: 'berater' | 'firma';
}

interface ParsedWorkPackage {
  ap_code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  total_pm: number;
  assignments: { employee_number: number; planned_pm: number }[];
}

interface PreviewResult {
  success: boolean;
  parsed: ParsedWorkPackage[];
  newAPs: ParsedWorkPackage[];
  updateAPs: {
    existing: any;
    updated: ParsedWorkPackage;
    changes: string[];
  }[];
  unchangedAPs: string[];
  errors: string[];
  warnings: string[];
}

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  assignmentsCreated: number;
  assignmentsUpdated: number;
  errors: string[];
}

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================

export default function ArbeitsplanImport({
  projectId,
  hasTeam,
  teamCount,
  onImportComplete,
  portal,
}: ArbeitsplanImportProps) {
  const colors = PORTAL_COLORS[portal];
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [downloading, setDownloading] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ========================================
  // VORLAGE HERUNTERLADEN
  // ========================================
  
  const handleDownloadTemplate = async () => {
    if (!hasTeam) return;
    
    setDownloading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v7/arbeitsplan-vorlage?projectId=${projectId}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Fehler beim Herunterladen');
      }
      
      // Blob erstellen und herunterladen
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Dateiname aus Header oder Default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      a.download = filenameMatch ? filenameMatch[1] : 'Arbeitsplan_Vorlage.xlsx';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  // ========================================
  // DATEI AUSWÄHLEN
  // ========================================
  
  const handleFileSelect = () => {
    if (!hasTeam) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset
    setSelectedFile(file);
    setPreview(null);
    setImportResult(null);
    setError(null);
    setShowImportDialog(true);
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('mode', 'preview');
      
      const response = await fetch('/api/v7/arbeitsplan-import', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Verarbeiten der Datei');
      }
      
      setPreview(data);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      // Input zurücksetzen für erneuten Upload
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ========================================
  // IMPORT AUSFÜHREN
  // ========================================
  
  const handleImport = async () => {
    if (!selectedFile) return;
    
    setImporting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', projectId);
      formData.append('mode', 'import');
      
      const response = await fetch('/api/v7/arbeitsplan-import', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Import');
      }
      
      setImportResult(data);
      
      if (data.success) {
        // Nach 2 Sekunden Dialog schließen und Callback
        setTimeout(() => {
          setShowImportDialog(false);
          onImportComplete();
        }, 2000);
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  // ========================================
  // DIALOG SCHLIEßEN
  // ========================================
  
  const handleCloseDialog = () => {
    setShowImportDialog(false);
    setPreview(null);
    setImportResult(null);
    setError(null);
    setSelectedFile(null);
  };

  // ========================================
  // RENDER
  // ========================================
  
  return (
    <>
      {/* Buttons */}
      <div className="flex items-center gap-2">
        {/* Vorlage herunterladen */}
        <button
          onClick={handleDownloadTemplate}
          disabled={!hasTeam || downloading}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors
            ${hasTeam 
              ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' 
              : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          title={hasTeam ? 'Excel-Vorlage herunterladen' : 'Bitte zuerst Team zusammenstellen'}
        >
          {downloading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          Vorlage
        </button>

        {/* Arbeitsplan hochladen */}
        <button
          onClick={handleFileSelect}
          disabled={!hasTeam}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors
            ${hasTeam 
              ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' 
              : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          title={hasTeam ? 'Arbeitsplan aus Excel importieren' : 'Bitte zuerst Team zusammenstellen'}
        >
          <Upload size={16} />
          Import
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Hinweis wenn kein Team */}
      {!hasTeam && (
        <p className="text-xs text-amber-600 mt-1">
          Bitte zuerst Team im Tab "Team" zusammenstellen
        </p>
      )}

      {/* Fehler-Anzeige */}
      {error && !showImportDialog && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-green-600" size={24} />
                <h3 className="text-lg font-semibold text-gray-900">
                  Arbeitsplan importieren
                </h3>
              </div>
              <button onClick={handleCloseDialog} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Laden */}
              {uploading && (
                <div className="text-center py-8">
                  <Loader2 className="animate-spin mx-auto text-gray-400" size={32} />
                  <p className="text-gray-500 mt-2">Datei wird analysiert...</p>
                </div>
              )}

              {/* Fehler */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-500 mt-0.5" size={20} />
                    <div>
                      <p className="font-medium text-red-800">Fehler beim Import</p>
                      <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Vorschau */}
              {preview && !importResult && !uploading && (
                <div className="space-y-4">
                  {/* Zusammenfassung */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-700">{preview.newAPs.length}</div>
                      <div className="text-sm text-green-600">Neue APs</div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-700">{preview.updateAPs.length}</div>
                      <div className="text-sm text-blue-600">Updates</div>
                    </div>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <div className="text-2xl font-bold text-gray-700">{preview.unchangedAPs.length}</div>
                      <div className="text-sm text-gray-600">Unverändert</div>
                    </div>
                  </div>

                  {/* Warnungen */}
                  {preview.warnings.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="text-amber-500 mt-0.5" size={18} />
                        <div>
                          <p className="font-medium text-amber-800 text-sm">Hinweise:</p>
                          <ul className="text-sm text-amber-700 mt-1 space-y-0.5">
                            {preview.warnings.map((w, i) => (
                              <li key={i}>• {w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Neue APs */}
                  {preview.newAPs.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <Plus size={16} className="text-green-600" />
                        Neue Arbeitspakete ({preview.newAPs.length})
                      </h4>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">AP-Nr.</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">Bezeichnung</th>
                              <th className="px-3 py-2 text-right font-medium text-gray-600">PM</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.newAPs.map((ap, i) => (
                              <tr key={i} className="border-t">
                                <td className="px-3 py-2 font-mono">{ap.ap_code}</td>
                                <td className="px-3 py-2 truncate max-w-xs">{ap.name}</td>
                                <td className="px-3 py-2 text-right">{ap.total_pm.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Updates */}
                  {preview.updateAPs.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <RefreshCw size={16} className="text-blue-600" />
                        Aktualisierungen ({preview.updateAPs.length})
                      </h4>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">AP-Nr.</th>
                              <th className="px-3 py-2 text-left font-medium text-gray-600">Änderungen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.updateAPs.map((item, i) => (
                              <tr key={i} className="border-t">
                                <td className="px-3 py-2 font-mono">{item.updated.ap_code}</td>
                                <td className="px-3 py-2">
                                  <ul className="text-xs text-gray-600 space-y-0.5">
                                    {item.changes.map((c, j) => (
                                      <li key={j}>• {c}</li>
                                    ))}
                                  </ul>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Keine Änderungen */}
                  {preview.newAPs.length === 0 && preview.updateAPs.length === 0 && (
                    <div className="text-center py-6 text-gray-500">
                      <AlertCircle className="mx-auto mb-2" size={32} />
                      <p>Keine Änderungen erkannt.</p>
                      <p className="text-sm mt-1">Die Datei enthält keine neuen oder geänderten Arbeitspakete.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Import-Ergebnis */}
              {importResult && (
                <div className="text-center py-6">
                  {importResult.success ? (
                    <>
                      <CheckCircle className="mx-auto text-green-500 mb-3" size={48} />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Import erfolgreich!</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>{importResult.created} Arbeitspakete angelegt</p>
                        <p>{importResult.updated} Arbeitspakete aktualisiert</p>
                        <p>{importResult.assignmentsCreated + importResult.assignmentsUpdated} MA-Zuordnungen verarbeitet</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="mx-auto text-red-500 mb-3" size={48} />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Import fehlgeschlagen</h4>
                      <ul className="text-sm text-red-600 space-y-1">
                        {importResult.errors.map((e, i) => (
                          <li key={i}>• {e}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={handleCloseDialog}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {importResult ? 'Schließen' : 'Abbrechen'}
              </button>
              
              {preview && !importResult && (preview.newAPs.length > 0 || preview.updateAPs.length > 0) && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${colors.buttonBg} disabled:opacity-50`}
                >
                  {importing ? (
                    <>
                      <Loader2 size={16} className="inline animate-spin mr-2" />
                      Importiere...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} className="inline mr-2" />
                      Import starten
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
