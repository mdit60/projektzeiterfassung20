'use client';

// src/components/shared/SystemConfigPanel.tsx
// ============================================================================
// PZE V7 - System-Konfiguration (nur system_admin)
// ============================================================================
// Version: 7.4.4-4
// v7.4.4-4: NEU Abschnitt "AP-Status-Analyse - Freigabe je Firma" (Stufe 2). Pro
//   Firma (v7_client_companies.ap_analyse_firma_freigeschaltet) steuerbar, ob die
//   vertiefte AP-Status-Analyse (Monats-Aufschluesselung + externer Zugang) im
//   FIRMEN-Portal verfuegbar ist. Berater haben sie immer; Firmen sonst nur die
//   einfache AP-Uebersicht im Timesheet. Speichern je Zeile sofort (eigene Tabelle),
//   analog zum VN-Schalter. Voraussetzung: SQL-MIGRATION-ap-analyse-firma-freigabe-v1.sql.
// Datum: 6. August 2026
// Version: 7.4.4-3
// v7.4.4-3: NEU Abschnitt "Verwendungsnachweis - Freigabe je Firma". Pro Firma
//   (v7_client_companies.vn_firma_freigeschaltet) steuerbar, ob der VN im
//   FIRMEN-Portal sichtbar ist. Berater-Seite bleibt immer frei. Nur system_admin
//   (dieser Panel-Bereich ist ohnehin system_admin-only). Speichern je Zeile
//   sofort (eigene Tabelle, nicht ueber den globalen "Alle speichern"-Button).
//   Voraussetzung: SQL-MIGRATION-vn-firma-freigabe-v1.sql (Spalte angelegt).
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
import { BookOpen, LayoutDashboard, CheckCircle, AlertCircle, Loader2, Save, FileText, Search } from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

interface FirmaVN {
  id: string;
  name: string;
  vn: boolean;
  apAnalyse: boolean; // v7.4.4-4: vertiefte AP-Status-Analyse fuer Firma freigeschaltet
}

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

  // VN-Freigabe je Firma (eigene Tabelle v7_client_companies)
  const [firmen, setFirmen] = useState<FirmaVN[]>([]);
  const [firmaSuche, setFirmaSuche] = useState('');
  const [firmaSaving, setFirmaSaving] = useState<Record<string, boolean>>({});
  const [firmaSaved, setFirmaSaved] = useState<Record<string, boolean>>({});
  // v7.4.4-4: eigener Speicherstatus fuer den AP-Analyse-Schalter (Kollisionsfrei zum VN-Schalter)
  const [apSaving, setApSaving] = useState<Record<string, boolean>>({});
  const [apSaved, setApSaved] = useState<Record<string, boolean>>({});

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

      // VN-Freigabe je Firma laden
      const { data: firmenData } = await supabase
        .from('v7_client_companies')
        .select('id, name, vn_firma_freigeschaltet, ap_analyse_firma_freigeschaltet')
        .order('name', { ascending: true });
      if (firmenData) {
        setFirmen(firmenData.map((f: any) => ({
          id: f.id, name: f.name, vn: !!f.vn_firma_freigeschaltet,
          apAnalyse: !!f.ap_analyse_firma_freigeschaltet,
        })));
      }

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

  // VN-Freigabe je Firma sofort speichern (optimistisch, mit Rollback)
  async function toggleFirmaVN(id: string, next: boolean) {
    const supabase = createClient();
    setFirmaSaving(prev => ({ ...prev, [id]: true }));
    setFirmen(prev => prev.map(f => f.id === id ? { ...f, vn: next } : f));
    const { error } = await supabase
      .from('v7_client_companies')
      .update({ vn_firma_freigeschaltet: next })
      .eq('id', id);
    setFirmaSaving(prev => ({ ...prev, [id]: false }));
    if (error) {
      setFirmen(prev => prev.map(f => f.id === id ? { ...f, vn: !next } : f));
      console.error('VN-Freigabe speichern fehlgeschlagen fuer ' + id + ':', error);
    } else {
      setFirmaSaved(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setFirmaSaved(prev => ({ ...prev, [id]: false })), 2000);
    }
  }

  // v7.4.4-4: AP-Status-Analyse je Firma sofort speichern (optimistisch, mit Rollback)
  async function toggleFirmaApAnalyse(id: string, next: boolean) {
    const supabase = createClient();
    setApSaving(prev => ({ ...prev, [id]: true }));
    setFirmen(prev => prev.map(f => f.id === id ? { ...f, apAnalyse: next } : f));
    const { error } = await supabase
      .from('v7_client_companies')
      .update({ ap_analyse_firma_freigeschaltet: next })
      .eq('id', id);
    setApSaving(prev => ({ ...prev, [id]: false }));
    if (error) {
      setFirmen(prev => prev.map(f => f.id === id ? { ...f, apAnalyse: !next } : f));
      console.error('AP-Analyse-Freigabe speichern fehlgeschlagen fuer ' + id + ':', error);
    } else {
      setApSaved(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setApSaved(prev => ({ ...prev, [id]: false })), 2000);
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

  const firmenGefiltert = firmen.filter(f =>
    f.name.toLowerCase().includes(firmaSuche.trim().toLowerCase()));
  const anzahlFrei = firmen.filter(f => f.vn).length;
  const anzahlApFrei = firmen.filter(f => f.apAnalyse).length;

  return (
    <div className="space-y-6">

      {/* ================================================================ */}
      {/* VERWENDUNGSNACHWEIS - FREIGABE JE FIRMA                         */}
      {/* ================================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <FileText size={20} className="text-gray-500" />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">Verwendungsnachweis &ndash; Freigabe je Firma</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Steuert pro Firma, ob der Verwendungsnachweis im <span className="font-medium">Firmen-Portal</span> sichtbar ist.
              Die Berater-Seite ist immer frei (zum Testen). Standard: gesperrt.
            </p>
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {anzahlFrei} / {firmen.length} freigeschaltet
          </span>
        </div>

        <div className="px-6 py-4">
          {/* Suche */}
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={firmaSuche}
              onChange={e => setFirmaSuche(e.target.value)}
              placeholder="Firma suchen ..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {firmen.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Keine Firmen gefunden.</p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {firmenGefiltert.map(f => (
                <div key={f.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleFirmaVN(f.id, !f.vn)}
                      disabled={!!firmaSaving[f.id]}
                      className={[
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 disabled:opacity-50',
                        f.vn ? 'bg-green-500' : 'bg-gray-300',
                      ].join(' ')}
                      aria-label={'VN-Freigabe ' + f.name}
                    >
                      <span className={[
                        'inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200',
                        f.vn ? 'translate-x-6' : 'translate-x-1',
                      ].join(' ')} />
                    </button>
                    <span className="text-sm text-gray-800 truncate">{f.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {firmaSaving[f.id] ? (
                      <Loader2 size={13} className="animate-spin text-gray-400" />
                    ) : firmaSaved[f.id] ? (
                      <span className="flex items-center gap-1 text-green-700 text-xs"><CheckCircle size={12} /> gespeichert</span>
                    ) : (
                      <span className={[
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        f.vn ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700',
                      ].join(' ')}>
                        {f.vn ? 'Freigeschaltet' : 'Gesperrt'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {firmenGefiltert.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">Keine Treffer.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* AP-STATUS-ANALYSE - FREIGABE JE FIRMA (v7.4.4-4)                 */}
      {/* ================================================================ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <FileText size={20} className="text-gray-500" />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">AP-Status-Analyse &ndash; Freigabe je Firma</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Steuert pro Firma, ob die <span className="font-medium">vertiefte AP-Status-Analyse</span> (Monats-Aufschl&uuml;sselung je Mitarbeiter
              und direkter Zugang au&szlig;erhalb der Zeiterfassung) im <span className="font-medium">Firmen-Portal</span> verf&uuml;gbar ist.
              Berater haben sie immer. Firmen sehen sonst nur die einfache AP-&Uuml;bersicht im Timesheet. Standard: gesperrt.
            </p>
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {anzahlApFrei} / {firmen.length} freigeschaltet
          </span>
        </div>

        <div className="px-6 py-4">
          {firmen.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Keine Firmen gefunden.</p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {firmenGefiltert.map(f => (
                <div key={f.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleFirmaApAnalyse(f.id, !f.apAnalyse)}
                      disabled={!!apSaving[f.id]}
                      className={[
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 disabled:opacity-50',
                        f.apAnalyse ? 'bg-green-500' : 'bg-gray-300',
                      ].join(' ')}
                      aria-label={'AP-Analyse-Freigabe ' + f.name}
                    >
                      <span className={[
                        'inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200',
                        f.apAnalyse ? 'translate-x-6' : 'translate-x-1',
                      ].join(' ')} />
                    </button>
                    <span className="text-sm text-gray-800 truncate">{f.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {apSaving[f.id] ? (
                      <Loader2 size={13} className="animate-spin text-gray-400" />
                    ) : apSaved[f.id] ? (
                      <span className="flex items-center gap-1 text-green-700 text-xs"><CheckCircle size={12} /> gespeichert</span>
                    ) : (
                      <span className={[
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        f.apAnalyse ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700',
                      ].join(' ')}>
                        {f.apAnalyse ? 'Freigeschaltet' : 'Gesperrt'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {firmenGefiltert.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">Keine Treffer.</p>
              )}
            </div>
          )}
        </div>
      </div>

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
