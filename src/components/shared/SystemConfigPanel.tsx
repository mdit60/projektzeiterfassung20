'use client';

// src/components/shared/SystemConfigPanel.tsx
// ============================================================================
// PZE V7 - System-Konfiguration (nur system_admin)
// ============================================================================
// Version: 7.4.4-1
// Neu: Toggle fuer manuals_enabled in v7_system_config
//   - Schaltet Anleitungs-Downloads im Hilfe-Dropdown ein/aus
//   - Nur sichtbar fuer system_admin (Berater-Admin-Seite)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, CheckCircle, AlertCircle, Loader2, Save } from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

interface ConfigRow {
  key: string;
  value: string;
  updated_at: string;
  updated_by: string | null;
}

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================

export default function SystemConfigPanel() {
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [manualsEnabled, setManualsEnabled] = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<string | null>(null);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);
  const [saveStatus, setSaveStatus]     = useState<'idle' | 'ok' | 'err'>('idle');
  const [userEmail, setUserEmail]       = useState<string>('');

  // ── Daten laden ────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);

      // Eingeloggter User
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);

      // Config lesen
      const { data, error } = await supabase
        .from('v7_system_config')
        .select('key, value, updated_at, updated_by')
        .eq('key', 'manuals_enabled')
        .single();

      if (!error && data) {
        setManualsEnabled(data.value === 'true');
        setLastUpdated(data.updated_at);
        setLastUpdatedBy(data.updated_by);
      }

      setLoading(false);
    }

    load();
  }, []);

  // ── Speichern ──────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaveStatus('idle');
    const supabase = createClient();

    const { error } = await supabase
      .from('v7_system_config')
      .upsert({
        key:        'manuals_enabled',
        value:      manualsEnabled ? 'true' : 'false',
        updated_at: new Date().toISOString(),
        updated_by: userEmail || null,
      }, { onConflict: 'key' });

    setSaving(false);
    if (error) {
      console.error('SystemConfigPanel save error:', error);
      setSaveStatus('err');
    } else {
      setSaveStatus('ok');
      setLastUpdated(new Date().toISOString());
      setLastUpdatedBy(userEmail || null);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }

  // ── Formatierung ───────────────────────────────────────────────────────────
  function formatDate(iso: string | null) {
    if (!iso) return '–';
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center gap-3 text-gray-500">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Konfiguration wird geladen …</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <BookOpen size={20} className="text-gray-500" />
        <div>
          <h3 className="text-base font-semibold text-gray-900">Anleitungen & Downloads</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Steuert, ob Benutzerhandbücher im Hilfe-Dropdown des Firmen-Portals heruntergeladen werden können.
          </p>
        </div>
      </div>

      {/* Toggle-Zeile */}
      <div className="px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Toggle */}
            <button
              onClick={() => { setManualsEnabled(v => !v); setSaveStatus('idle'); }}
              className={[
                'relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none',
                manualsEnabled ? 'bg-green-500' : 'bg-gray-300',
              ].join(' ')}
              aria-label="Anleitungen freischalten"
            >
              <span
                className={[
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200',
                  manualsEnabled ? 'translate-x-8' : 'translate-x-1',
                ].join(' ')}
              />
            </button>

            {/* Label + Status */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  Anleitungs-Downloads
                </span>
                <span className={[
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  manualsEnabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700',
                ].join(' ')}>
                  {manualsEnabled ? (
                    <><CheckCircle size={11} /> Aktiv</>
                  ) : (
                    <><AlertCircle size={11} /> Gesperrt (»Wird aktualisiert«)</>
                  )}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {manualsEnabled
                  ? 'Nutzer können die Anleitungen als PDF herunterladen.'
                  : 'Im Hilfe-Dropdown erscheint der Hinweis „Wird aktualisiert".'}
              </p>
            </div>
          </div>

          {/* Speichern-Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Speichern
          </button>
        </div>

        {/* Feedback-Zeile */}
        {saveStatus === 'ok' && (
          <div className="mt-3 flex items-center gap-2 text-green-700 text-xs">
            <CheckCircle size={14} />
            Gespeichert. Änderung ist sofort aktiv – kein Neustart nötig.
          </div>
        )}
        {saveStatus === 'err' && (
          <div className="mt-3 flex items-center gap-2 text-red-700 text-xs">
            <AlertCircle size={14} />
            Fehler beim Speichern. Bitte erneut versuchen oder Konsole prüfen.
          </div>
        )}

        {/* Zuletzt geändert */}
        {lastUpdated && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
            Zuletzt geändert: {formatDate(lastUpdated)}
            {lastUpdatedBy && <> · {lastUpdatedBy}</>}
          </div>
        )}
      </div>

      {/* Info-Box: Welche Dateien */}
      <div className="px-6 pb-5">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-600 mb-2">Verknüpfte Dateien in /public/manuals/</p>
          <div className="space-y-1">
            {[
              { rolle: 'Firmen-Administrator', datei: 'PZE-Anleitung-Firmen-Administrator-v2_2_0.pdf' },
              { rolle: 'Projektleiter',        datei: 'PZE-Anleitung-Projektleiter-v2_1.pdf' },
              { rolle: 'Mitarbeiter',          datei: 'PZE-Anleitung-Mitarbeiter-v2_0.pdf' },
              { rolle: 'Alle Rollen (immer)',  datei: 'PZE-FAQ-Zeiterfassung-v1.pdf' },
            ].map(row => (
              <div key={row.datei} className="flex items-baseline gap-2 text-xs text-gray-500">
                <span className="text-gray-400 shrink-0">→</span>
                <span className="font-medium text-gray-700 shrink-0">{row.rolle}:</span>
                <span className="font-mono truncate">{row.datei}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Der FAQ-Download ist immer verfügbar, unabhängig von diesem Schalter.
            Um einen Dateinamen zu ändern, muss PortalNav.tsx angepasst werden.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ENDE
// ============================================================================
