'use client';

// src/components/shared/SystemConfigPanel.tsx
// ============================================================================
// PZE V7 - System-Konfiguration (nur system_admin)
// ============================================================================
// Version: 7.4.4-2
// Datum: 8. Mai 2026
//
// v7.4.4-2: Cockpit-Freischaltung
//   - cockpit_berater_enabled: Cockpit fuer Berater-Rolle sichtbar
//   - cockpit_firma_enabled: Cockpit fuer Firmen-Portal sichtbar
//   - system_admin sieht Cockpit IMMER (unabhaengig von Config)
//   - Toggles im gleichen Pattern wie manuals_enabled
//
// v7.4.4-1: Toggle fuer manuals_enabled
// ============================================================================

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, LayoutDashboard, CheckCircle, AlertCircle, Loader2, Save } from 'lucide-react';

// ============================================================================
// TOGGLE-KOMPONENTE (wiederverwendbar)
// ============================================================================

function ConfigToggle({
  enabled,
  onToggle,
  label,
  labelAktiv,
  labelInaktiv,
  beschreibungAktiv,
  beschreibungInaktiv,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  labelAktiv: string;
  labelInaktiv: string;
  beschreibungAktiv: string;
  beschreibungInaktiv: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onToggle}
        className={[
          'relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0',
          enabled ? 'bg-green-500' : 'bg-gray-300',
        ].join(' ')}
        aria-label={label}
      >
        <span
          className={[
            'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200',
            enabled ? 'translate-x-8' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          <span className={[
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            enabled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700',
          ].join(' ')}>
            {enabled ? (
              <><CheckCircle size={11} /> {labelAktiv}</>
            ) : (
              <><AlertCircle size={11} /> {labelInaktiv}</>
            )}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {enabled ? beschreibungAktiv : beschreibungInaktiv}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================

export default function SystemConfigPanel() {
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [saveStatus, setSaveStatus]     = useState<'idle' | 'ok' | 'err'>('idle');
  const [userEmail, setUserEmail]       = useState<string>('');
  const [lastUpdated, setLastUpdated]   = useState<string | null>(null);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);

  // Config-Werte
  const [manualsEnabled, setManualsEnabled] = useState(false);
  const [cockpitBeraterEnabled, setCockpitBeraterEnabled] = useState(false);
  const [cockpitFirmaEnabled, setCockpitFirmaEnabled] = useState(false);

  // -- Daten laden --
  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);

      // Alle Config-Keys auf einmal laden
      const { data } = await supabase
        .from('v7_system_config')
        .select('key, value, updated_at, updated_by')
        .in('key', ['manuals_enabled', 'cockpit_berater_enabled', 'cockpit_firma_enabled']);

      let newestUpdate: string | null = null;
      let newestUpdatedBy: string | null = null;

      if (data) {
        for (const row of data) {
          if (row.key === 'manuals_enabled') {
            setManualsEnabled(row.value === 'true');
          }
          if (row.key === 'cockpit_berater_enabled') {
            setCockpitBeraterEnabled(row.value === 'true');
          }
          if (row.key === 'cockpit_firma_enabled') {
            setCockpitFirmaEnabled(row.value === 'true');
          }
          if (row.updated_at && (!newestUpdate || row.updated_at > newestUpdate)) {
            newestUpdate = row.updated_at;
            newestUpdatedBy = row.updated_by;
          }
        }
      }
      setLastUpdated(newestUpdate);
      setLastUpdatedBy(newestUpdatedBy);
      setLoading(false);
    }

    load();
  }, []);

  // -- Speichern (alle Werte auf einmal) --
  async function handleSave() {
    setSaving(true);
    setSaveStatus('idle');
    const supabase = createClient();
    const now = new Date().toISOString();

    const configs = [
      { key: 'manuals_enabled', value: manualsEnabled ? 'true' : 'false' },
      { key: 'cockpit_berater_enabled', value: cockpitBeraterEnabled ? 'true' : 'false' },
      { key: 'cockpit_firma_enabled', value: cockpitFirmaEnabled ? 'true' : 'false' },
    ];

    let hasError = false;
    for (const cfg of configs) {
      const { error } = await supabase
        .from('v7_system_config')
        .upsert({
          key: cfg.key,
          value: cfg.value,
          updated_at: now,
          updated_by: userEmail || null,
        }, { onConflict: 'key' });
      if (error) {
        console.error('SystemConfig save error for ' + cfg.key + ':', error);
        hasError = true;
      }
    }

    setSaving(false);
    if (hasError) {
      setSaveStatus('err');
    } else {
      setSaveStatus('ok');
      setLastUpdated(now);
      setLastUpdatedBy(userEmail || null);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }

  function resetSaveStatus() { setSaveStatus('idle'); }

  function formatDate(iso: string | null) {
    if (!iso) return '--';
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  // -- Render --
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center gap-3 text-gray-500">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Konfiguration wird geladen ...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ================================================================ */}
      {/* COCKPIT-FREISCHALTUNG                                           */}
      {/* ================================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <LayoutDashboard size={20} className="text-gray-500" />
          <div>
            <h3 className="text-base font-semibold text-gray-900">Cockpit-Freischaltung</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Steuert, wer das Firma-Cockpit in der Navigation sieht. system_admin sieht es immer.
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <ConfigToggle
            enabled={cockpitBeraterEnabled}
            onToggle={() => { setCockpitBeraterEnabled(v => !v); resetSaveStatus(); }}
            label="Cockpit fuer Berater"
            labelAktiv="Aktiv"
            labelInaktiv="Nur system_admin"
            beschreibungAktiv="Alle Berater sehen den Cockpit-Tab in der Navigation."
            beschreibungInaktiv="Nur system_admin sieht den Cockpit-Tab. Andere Berater sehen keine Aenderung."
          />

          <ConfigToggle
            enabled={cockpitFirmaEnabled}
            onToggle={() => { setCockpitFirmaEnabled(v => !v); resetSaveStatus(); }}
            label="Cockpit fuer Firmen-Portal"
            labelAktiv="Aktiv"
            labelInaktiv="Ausgeblendet"
            beschreibungAktiv="Firmen-Admins und Projektleiter sehen das Cockpit als Startseite."
            beschreibungInaktiv="Firmen-Nutzer sehen das bisherige Dashboard. Keine sichtbare Aenderung."
          />
        </div>
      </div>

      {/* ================================================================ */}
      {/* ANLEITUNGEN & DOWNLOADS                                         */}
      {/* ================================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <BookOpen size={20} className="text-gray-500" />
          <div>
            <h3 className="text-base font-semibold text-gray-900">Anleitungen & Downloads</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Steuert, ob Benutzerhandbucher im Hilfe-Dropdown des Firmen-Portals heruntergeladen werden koennen.
            </p>
          </div>
        </div>

        <div className="px-6 py-5">
          <ConfigToggle
            enabled={manualsEnabled}
            onToggle={() => { setManualsEnabled(v => !v); resetSaveStatus(); }}
            label="Anleitungs-Downloads"
            labelAktiv="Aktiv"
            labelInaktiv="Gesperrt"
            beschreibungAktiv="Nutzer koennen die Anleitungen als PDF herunterladen."
            beschreibungInaktiv="Im Hilfe-Dropdown erscheint der Hinweis 'Wird aktualisiert'."
          />
        </div>

        <div className="px-6 pb-5">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs font-medium text-gray-600 mb-2">Verknuepfte Dateien in /public/manuals/</p>
            <div className="space-y-1">
              {[
                { rolle: 'Firmen-Administrator', datei: 'PZE-Anleitung-Firmen-Administrator.pdf' },
                { rolle: 'Projektleiter',        datei: 'PZE-Anleitung-Projektleiter.pdf' },
                { rolle: 'Alle Rollen (immer)',  datei: 'PZE-FAQ-Zeiterfassung-v1.pdf' },
              ].map(row => (
                <div key={row.datei} className="flex items-baseline gap-2 text-xs text-gray-500">
                  <span className="text-gray-400 shrink-0">-</span>
                  <span className="font-medium text-gray-700 shrink-0">{row.rolle}:</span>
                  <span className="font-mono truncate">{row.datei}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* SPEICHERN + STATUS                                               */}
      {/* ================================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            {lastUpdated && (
              <div className="text-xs text-gray-400">
                Zuletzt gespeichert: {formatDate(lastUpdated)}
                {lastUpdatedBy && <> - {lastUpdatedBy}</>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {saveStatus === 'ok' && (
              <span className="flex items-center gap-1 text-green-700 text-xs">
                <CheckCircle size={14} />
                Gespeichert - sofort aktiv
              </span>
            )}
            {saveStatus === 'err' && (
              <span className="flex items-center gap-1 text-red-700 text-xs">
                <AlertCircle size={14} />
                Fehler beim Speichern
              </span>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Alle Einstellungen speichern
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
