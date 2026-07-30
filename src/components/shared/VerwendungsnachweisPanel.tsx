'use client';

// src/components/shared/VerwendungsnachweisPanel.tsx
// ============================================================================
// PZE V7 - VN-Modul (Verwendungsnachweis), De-minimis-Varianten
// Version: 1.2-2
// v1.2-2: LAYOUT-FIX Kopfbereich. Das Berichtszeitraum-Feld (zwei Datumsfelder)
//   war breiter als eine Rasterspalte und ueberlappte mit "Foerdersatz". Es
//   spannt jetzt zwei Spalten (md:col-span-2) und darf umbrechen (flex-wrap),
//   sodass sich im Kopf nichts mehr ueberschneidet. Reines Layout.
// v1.2-1: NWM-Variante (Netzwerk Phase 1/2). ZA-Select um die NWM-Felder
//   ergaenzt (nwm_personalkosten/-dritte/-uebrige/-gesamt, foerdersatz_percent,
//   laufzeitjahr); vnProject um netzwerk_phase (steuert Phase-1/2-Erkennung in
//   der Lib). Finanzierung zeigt bei NWM zusaetzlich den Eigenanteil. Die
//   Kostenzeilen/Betraege kommen unveraendert aus computeVNSchluss.
// v1.1-3: LAYOUT - VN-Block zusaetzlich horizontal zentriert (mx-auto). Breite
//   unveraendert (max-w-5xl), steht jetzt aber mittig statt links. Reines Layout.
// v1.1-2: LAYOUT - VN-Inhalt auf dokumentaehnliche Breite begrenzt (max-w-5xl).
//   Zuvor lief die Seite ueber die volle Fensterbreite (w-full aus der Seite),
//   wodurch die Wertespalte weit nach rechts gezogen wurde und schlecht lesbar
//   war. Jetzt zentrierter, begrenzter Block wie im Firmen-Dashboard. Reines
//   Layout, keine Logik-/Datenaenderung.
// v1.1-1: VARIANTENFAEHIG. Variante + Labels + Formularversion kommen aus der Lib
//   (computeVNSchluss); Kopf/Speichern/Fusszeile nutzen result.variante /
//   .varianteLabel / .formularVersion statt fest DS. Unterstuetzt DS De-minimis
//   und Einzel-/Koop; NWM folgt.
// v1.0-4: Uebersichtsliste "Gespeicherte Verwendungsnachweise" ENTFERNT. Es gibt
//   je Projekt genau EINEN VN (unique project+art); erreichbar ueber die
//   Projekt-Kachel im Cockpit. Beim Oeffnen erscheint automatisch der
//   gespeicherte Stand (Berichtszeitraum aus dem Satz, Zahlen live). Speichern
//   (Berichtszeitraum + Snapshot + "erstellt am") bleibt als Audit.
// v1.0-3: nur Zahlenseite (Sachbericht raus), Speichern mit Snapshot + Uebersicht.
// v1.0-2: FIX Spaltenname funding_reference.
//
// Konvention: JSX-Text als HTML-Entities, JS-String-Literale als \u-Escapes.
// Kostenzeilen-Labels stammen aus der Lib (dort bereits \u-escaped).
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText, Printer } from 'lucide-react';
import {
  computeVNSchluss,
  VNData,
  VNProject,
  VNProjectAssignment,
  VNWorkPackage,
  VNEmployee,
  VNTimesheet,
  VNZahlungsanforderung,
  VNResult,
} from '@/lib/verwendungsnachweis-utils';

const PORTAL_COLORS = {
  berater: { border: 'border-blue-200', headerBg: 'bg-blue-50', icon: 'text-blue-600',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700', inputFocus: 'focus:outline-none focus:border-blue-500' },
  firma: { border: 'border-green-200', headerBg: 'bg-green-50', icon: 'text-green-600',
    btnPrimary: 'bg-green-600 hover:bg-green-700', inputFocus: 'focus:outline-none focus:border-green-500' },
};

interface VNPanelProjectProp {
  id: string;
  name?: string | null;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  foerdersatz: number | null;
  overhead_t: number | null;
  overhead_nt: number | null;
  bewilligung_datum: string | null;
  bewilligte_summe: number | null;
  pm_basis_weekly_hours: number | null;
  start_date: string | null;
  end_date: string | null;
}

interface VNPanelProps {
  portal: 'berater' | 'firma';
  projects: VNPanelProjectProp[];
  workPackages: VNWorkPackage[];
  employees: VNEmployee[];
  timesheets: VNTimesheet[];
  projectAssignments: VNProjectAssignment[];
  initialProjectId?: string;
}

function fmtEur(v: number | null): string {
  return (v ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(s: string | null): string {
  if (!s) return '';
  const [y, m, d] = s.slice(0, 10).split('-');
  return d && m && y ? `${d}.${m}.${y}` : s;
}

export default function VerwendungsnachweisPanel({
  portal,
  projects,
  workPackages,
  employees,
  timesheets,
  projectAssignments,
  initialProjectId,
}: VNPanelProps) {
  const supabase = createClient();
  const colors = PORTAL_COLORS[portal];

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [projectId, setProjectId] = useState<string>(initialProjectId || (projects[0]?.id ?? ''));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [zas, setZas] = useState<VNZahlungsanforderung[]>([]);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [vonEdit, setVonEdit] = useState<string>('');
  const [bisEdit, setBisEdit] = useState<string>('');

  // Aktuelles Projekt laden: ZAs + gespeicherter VN-Satz (Meta).
  const ladeProjekt = useCallback(async (pid: string) => {
    if (!pid) return;
    setLoading(true);
    setSaved(false);
    const proj = projects.find(p => p.id === pid);

    const { data: zaDB } = await supabase
      .from('v7_zahlungsanforderungen')
      .select('id, project_id, za_nummer, zeitraum_von, zeitraum_bis, auftraege_dritte_t, auftraege_dritte_nt, fue_unterauftrag, zeitw_personalaufnahme, foerderbetrag_gesamt, zahlungseingang_betrag, nwm_personalkosten, nwm_kosten_dritte, nwm_kosten_uebrige, nwm_kosten_gesamt, foerdersatz_percent, laufzeitjahr')
      .eq('project_id', pid)
      .order('za_nummer', { ascending: true });
    setZas((zaDB as VNZahlungsanforderung[]) || []);

    const { data: vnDB } = await supabase
      .from('v7_verwendungsnachweise')
      .select('id, status, aktualisiert_am, berichtszeitraum_von, berichtszeitraum_bis')
      .eq('project_id', pid)
      .eq('art', 'schluss')
      .maybeSingle();
    if (vnDB) {
      setSavedStatus(vnDB.status || null);
      setSavedAt(vnDB.aktualisiert_am || null);
      setVonEdit(vnDB.berichtszeitraum_von || proj?.start_date || '');
      setBisEdit(vnDB.berichtszeitraum_bis || proj?.end_date || '');
    } else {
      setSavedStatus(null);
      setSavedAt(null);
      setVonEdit(proj?.start_date || '');
      setBisEdit(proj?.end_date || '');
    }
    setLoading(false);
  }, [supabase, projects]);

  useEffect(() => { if (projectId) ladeProjekt(projectId); }, [projectId, ladeProjekt]);

  // VNData zusammenstellen + rechnen.
  const propProject = projects.find(p => p.id === projectId);
  const vnProject: VNProject = {
    id: projectId,
    funding_format: propProject?.funding_format ?? null,
    foerdersatz: propProject?.foerdersatz ?? null,
    overhead_t: propProject?.overhead_t ?? null,
    overhead_nt: propProject?.overhead_nt ?? null,
    pm_basis_weekly_hours: propProject?.pm_basis_weekly_hours ?? null,
    short_name: propProject?.short_name ?? null,
    title: null,
    foerderkennzeichen: propProject?.funding_reference ?? null,
    bewilligung_datum: propProject?.bewilligung_datum ?? null,
    bewilligte_summe: propProject?.bewilligte_summe ?? null,
    start_date: propProject?.start_date ?? null,
    end_date: propProject?.end_date ?? null,
    client_company_id: null,
    netzwerk_phase: propProject?.netzwerk_phase ?? null,
  };

  const data: VNData = {
    projects: [vnProject],
    projectAssignments, workPackages, employees, timesheets,
    zahlungsanforderungen: zas,
  };

  const result: VNResult | null = (mounted && projectId && !loading)
    ? computeVNSchluss(projectId, vonEdit || null, bisEdit || null, data)
    : null;

  // Speichern: Datensatz + Zahlen-Snapshot (upsert je project+art).
  const handleSave = async () => {
    if (!projectId || !result) return;
    setSaving(true);
    const payload = {
      project_id: projectId,
      art: 'schluss',
      variante: result.variante,
      formular_version: result.formularVersion,
      berichtszeitraum_von: vonEdit || null,
      berichtszeitraum_bis: bisEdit || null,
      zahlen_snapshot: result,
      summe_kosten: result.summeKosten,
      zuwendung_gesamt: result.finanzierung.gesamtZuwendung,
      status: 'Erstellt',
      aktualisiert_am: new Date().toISOString(),
    };
    await supabase
      .from('v7_verwendungsnachweise')
      .upsert(payload, { onConflict: 'project_id,art' });
    setSaving(false);
    setSaved(true);
    await ladeProjekt(projectId);
  };

  const handlePrint = () => {
    const fkz = vnProject.foerderkennzeichen || '';
    const kurz = vnProject.short_name || '';
    const prev = document.title;
    document.title = `VN ${fkz} ${kurz}`.trim();
    window.print();
    setTimeout(() => { document.title = prev; }, 500);
  };

  if (!mounted) return <div className="text-sm text-gray-400 py-10">&hellip;</div>;

  return (
    <div className="notranslate max-w-5xl mx-auto" translate="no">
      <style>{`@media print { .vn-no-print { display: none !important; } }`}</style>

      {/* Kopfzeile / Steuerung */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 vn-no-print">
        <div className="flex items-center gap-2">
          <FileText className={`w-5 h-5 ${colors.icon}`} />
          <h2 className="text-lg font-semibold text-gray-800">Verwendungsnachweis</h2>
          <span className="text-xs text-gray-500">(Schlussnachweis &middot; {result ? result.varianteLabel : 'De-minimis'})</span>
        </div>
        <div className="flex items-center gap-2">
          {projects.length > 1 && (
            <select value={projectId} onChange={e => setProjectId(e.target.value)}
              className={`text-sm border border-gray-300 rounded px-2 py-1 ${colors.inputFocus}`}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.short_name || p.name || p.id}</option>)}
            </select>
          )}
          <button onClick={handlePrint}
            className="inline-flex items-center gap-1 text-sm border border-gray-300 rounded px-3 py-1 text-gray-700 hover:bg-gray-100">
            <Printer className="w-4 h-4" /> Drucken
          </button>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500 py-10">Daten werden geladen&hellip;</div>}

      {!loading && result && (
        <div className={`border ${colors.border} rounded-lg overflow-hidden`}>
          {/* Kopfdaten */}
          <div className={`${colors.headerBg} px-4 py-3 border-b ${colors.border}`}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm">
              <div><span className="text-gray-500">F&ouml;rderkennzeichen:</span> <span className="font-medium">{result.foerderkennzeichen || '\u2013'}</span></div>
              <div><span className="text-gray-500">Kurzbezeichnung:</span> <span className="font-medium">{result.kurzbezeichnung || '\u2013'}</span></div>
              <div><span className="text-gray-500">Zuwendungsbescheid vom:</span> <span className="font-medium">{fmtDate(result.bescheidDatum)}</span></div>
              <div className="flex items-center gap-1 flex-wrap md:col-span-2">
                <span className="text-gray-500">Berichtszeitraum:</span>
                <input type="date" value={vonEdit} onChange={e => { setVonEdit(e.target.value); setSaved(false); }}
                  className={`vn-no-print border border-gray-300 rounded px-1 py-0.5 text-xs ${colors.inputFocus}`} />
                <span className="text-gray-400">bis</span>
                <input type="date" value={bisEdit} onChange={e => { setBisEdit(e.target.value); setSaved(false); }}
                  className={`vn-no-print border border-gray-300 rounded px-1 py-0.5 text-xs ${colors.inputFocus}`} />
                <span className="hidden print:inline font-medium">{fmtDate(vonEdit)} bis {fmtDate(bisEdit)}</span>
              </div>
              <div><span className="text-gray-500">F&ouml;rdersatz:</span> <span className="font-medium">{result.foerdersatz} %</span></div>
              <div><span className="text-gray-500">Zahlungsanforderungen:</span> <span className="font-medium">{result.anzahlZas}</span></div>
            </div>
          </div>

          {result.warnungen.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800">
              {result.warnungen.map((w, i) => <div key={i}>&bull; {w}</div>)}
            </div>
          )}

          {/* A. Kostenzusammenstellung */}
          <div className="px-4 py-3">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              A. Zusammenfassung der mit den Zahlungsanforderungen nachgewiesenen zuwendungsf&auml;higen Kosten
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left px-2 py-1 border border-gray-200 w-8">Nr.</th>
                  <th className="text-left px-2 py-1 border border-gray-200">Kostenart</th>
                  <th className="text-right px-2 py-1 border border-gray-200 w-44">entst. zuwendungsf&auml;hige Kosten [EUR, Cent]</th>
                </tr>
              </thead>
              <tbody>
                {result.kostenZeilen.map(z => (
                  <tr key={z.nr}>
                    <td className="px-2 py-1 border border-gray-200 text-center text-gray-500">({z.nr})</td>
                    <td className="px-2 py-1 border border-gray-200">{z.label}</td>
                    <td className="px-2 py-1 border border-gray-200 text-right font-mono">{fmtEur(z.betrag)}</td>
                  </tr>
                ))}
                <tr className="font-semibold bg-gray-50">
                  <td className="px-2 py-1 border border-gray-200" colSpan={2}>Summe</td>
                  <td className="px-2 py-1 border border-gray-200 text-right font-mono">{fmtEur(result.summeKosten)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* B. Finanzierung */}
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="text-sm font-semibold text-gray-700 mb-2">B. Finanzierung der zuwendungsf&auml;higen Kosten</div>
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr>
                  <td className="px-2 py-1 border border-gray-200">bisher erhaltene Zuwendungen</td>
                  <td className="px-2 py-1 border border-gray-200 text-right font-mono w-44">{fmtEur(result.finanzierung.bisherErhalten)}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 border border-gray-200">noch zu erhaltende Zuwendung (Schlusszahlung)</td>
                  <td className="px-2 py-1 border border-gray-200 text-right font-mono">{fmtEur(result.finanzierung.schlusszahlung)}</td>
                </tr>
                <tr className="font-semibold bg-gray-50">
                  <td className="px-2 py-1 border border-gray-200">Zuwendung gesamt</td>
                  <td className="px-2 py-1 border border-gray-200 text-right font-mono">{fmtEur(result.finanzierung.gesamtZuwendung)}</td>
                </tr>
                {/* v1.2-1: NWM - Eigenanteil des Netzwerkpartners */}
                {result.finanzierung.eigenanteil != null && (
                  <tr>
                    <td className="px-2 py-1 border border-gray-200">Eigenanteil Netzwerkpartner</td>
                    <td className="px-2 py-1 border border-gray-200 text-right font-mono">{fmtEur(result.finanzierung.eigenanteil)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Speichern-Leiste */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 vn-no-print">
            <button onClick={handleSave} disabled={saving}
              className={`text-sm text-white rounded px-4 py-1.5 ${colors.btnPrimary} disabled:opacity-50`}>
              {saving ? 'Speichert\u2026' : 'Verwendungsnachweis speichern'}
            </button>
            {saved && <span className="text-sm text-green-600">Gespeichert.</span>}
            {!saved && savedAt && (
              <span className="text-xs text-gray-500">Zuletzt gespeichert: {fmtDate(savedAt)} ({savedStatus})</span>
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 vn-no-print">
            Datenaufbereitung zum &Uuml;bertragen in das offizielle VDI/VDE-VN-Formular ({result.varianteLabel}, {result.formularVersion}). Sachbericht (Teil 2) wird direkt im PDF erfasst.
          </div>
        </div>
      )}

      {!loading && !result && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-6 py-4 text-sm">
          Kein Projekt ausgew&auml;hlt oder keine Daten vorhanden.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ENDE VerwendungsnachweisPanel v1.0-4
// ============================================================================
