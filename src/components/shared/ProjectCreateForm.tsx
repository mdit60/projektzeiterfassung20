// src/components/shared/ProjectCreateForm.tsx
// ============================================================================
// PZE V7 - Shared Project Create Form Component
// ============================================================================
// Datum: 11. Juli 2026
// Version: 7.4.2-7
//
// Wird von beiden Portalen genutzt:
// - Firmen-Portal: /v7/firma/projekte/neu
// - Berater-Portal: /v7/berater/foerderung/firma/[id]/projekt/neu
//
// Features:
// - Manuelles Formular fuer Projektanlage
// - PDF-Import (ZIM-Antrag): Upload -> /api/v7/parse-zim -> Vorschau
//   (Projektkopf editierbar, Mitarbeiter mit Dublettenabgleich + pWAZ/Stundensatz,
//    Arbeitsplan, Kontrollsummen-Warnung)
// - v7.4.2-7: Reine Info-Anzeige beim Verknuepfen: frueherer Stundensatz eines bereits
//   vorhandenen MA aus einem anderen Projekt (ohne jede Auswirkung auf die Daten).
// - v7.4.2-6: Uebernahme laeuft jetzt serverseitig ueber /api/v7/import-antrag-neu
//   (atomarer RPC-Kern + Arbeitsplan + Kompensation) statt client-seitiger Inserts.
// - v7.4.2-5: Akronym (Kurzbezeichnung) aus dem Antrag vorbelegt + editierbar; dient
//   zusaetzlich als Duplikat-Signal (neben strich-tolerantem Namensvergleich).
// - v7.4.2-4: Vor dem Anlegen werden bestehende Projekte der Firma gezeigt mit der
//   Frage "neues Projekt oder Aktualisierung?" (strich-tolerante Trefferhervorhebung).
// - v7.4.2-3: Uebernahme aktiv. Beim Anlegen: Projekt (inkl.
//   pm_basis_weekly_hours) -> Mitarbeiter anlegen/verknuepfen -> Zuordnungen
//   (projektbezogene Antragswerte) -> Arbeitsplan via arbeitsplan-import (JSON).
// - Portal-abhaengige Farben
//
// Hinweis: Die Schreibvorgaenge laufen (noch) ohne Transaktion. Bei einem Fehler
// mitten im Ablauf wird der Fehler gemeldet; ein automatisches Rollback ist als
// spaetere Haertung vorgesehen (Server-RPC).
// ============================================================================

'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { buildImportPayload } from '@/lib/zim/zim-import-mapping';
import {
  Save,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FileText,
  Upload,
  Users,
  ListChecks,
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
  name: '', short_name: '', funding_format: '', funding_reference: '',
  start_date: '', end_date: '', notes: '',
};

interface ZimMitarbeiter {
  ma_nr: string;
  nachname: string;
  vorname: string;
  berufsbezeichnung: string;
  qualifikation: string;
  monatsbrutto: number | null;            // tatsaechlich (p_kosten * TZF)
  teilzeitfaktor: number | null;
  personal_weekly_hours?: number | null;  // pWAZ
  company_weekly_hours?: number | null;    // bWAZ
  stundensatz?: number | null;             // EUR/h
}
interface ZimZuordnung { ma_nr: string; planned_pm: number; }
interface ZimArbeitspaket {
  ap_code: string; ap_number: number | null; ap_sub_number: number | null; ebene: number;
  name: string; start_date: string | null; end_date: string | null;
  is_technical: boolean | null; planned_pm: number; zuordnungen: ZimZuordnung[];
}
interface ZimContract {
  format_erkannt: string;
  ist_durchfuehrbarkeitsstudie: boolean;
  projekt: {
    titel: string; akronym?: string; antragsteller: string;
    laufzeit_von: string | null; laufzeit_bis: string | null;
    bwaz?: number | null; pm_basis_weekly_hours?: number | null;
    gesamt_pm: number;
  };
  mitarbeiter: ZimMitarbeiter[];
  arbeitspakete: ZimArbeitspaket[];
  kontrollsummen_pruefung: { status: string; je_mitarbeiter: any[] };
}

interface ExistingEmployee { id: string; display_name: string | null; last_name: string | null; first_name: string | null; }

type MaEntscheidung = 'neu' | 'verknuepfen';
interface MaAbgleich { ma: ZimMitarbeiter; treffer: ExistingEmployee | null; entscheidung: MaEntscheidung; }

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
    button: 'bg-blue-600 hover:bg-blue-700', buttonLight: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    focus: 'focus:ring-blue-500', text: 'text-blue-600', border: 'border-blue-200', bg: 'bg-blue-50',
    activeTab: 'bg-white text-blue-700 shadow-sm', tabBg: 'bg-blue-100', icon: 'text-blue-600', headBg: 'bg-blue-50',
  },
  firma: {
    button: 'bg-green-600 hover:bg-green-700', buttonLight: 'bg-green-50 text-green-700 hover:bg-green-100',
    focus: 'focus:ring-green-500', text: 'text-green-600', border: 'border-green-200', bg: 'bg-green-50',
    activeTab: 'bg-white text-green-700 shadow-sm', tabBg: 'bg-green-100', icon: 'text-green-600', headBg: 'bg-green-50',
  },
};

// ============================================================================
// HELFER
// ============================================================================

function fmtNum(x: number | null | undefined, digits = 3): string {
  if (x == null) return '\u2013';
  const s = x.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
  return s.replace('.', ',');
}
function normalizeName(s: string | null | undefined): string { return (s || '').trim().toLowerCase(); }
function findExisting(ma: ZimMitarbeiter, existing: ExistingEmployee[]): ExistingEmployee | null {
  const target = normalizeName(ma.nachname);
  if (!target) return null;
  for (const e of existing) {
    if (normalizeName(e.last_name) === target) return e;
    const dn = normalizeName(e.display_name);
    if (dn && dn.includes(target)) return e;
  }
  return null;
}
function fundingFromFormat(c: ZimContract): string { return c.ist_durchfuehrbarkeitsstudie ? 'ZIM_DS' : 'ZIM'; }
function normProjName(s: string | null | undefined): string {
  return (s || '').toLowerCase().replace(/[\u2010-\u2015]/g, '-').replace(/\s+/g, ' ').trim();
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function ProjectCreateForm({
  portal, companyId, companyName, onSuccess, onCancel,
}: ProjectCreateFormProps) {
  const supabase = createClient();
  const colors = PORTAL_COLORS[portal];

  const [tab, setTab] = useState<'manuell' | 'pdf'>('manuell');

  // Manuelles Formular
  const [formData, setFormData] = useState<ProjectFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // PDF-Import
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [contract, setContract] = useState<ZimContract | null>(null);
  const [warnung, setWarnung] = useState<string | null>(null);
  const [abgleich, setAbgleich] = useState<MaAbgleich[]>([]);
  const [companyWeeklyHours, setCompanyWeeklyHours] = useState<number>(40);
  const [maInfo, setMaInfo] = useState<Record<string, { projectName: string; hourly_rate: number }>>({});

  // Uebernahme
  const [uebernehmen, setUebernehmen] = useState(false);
  const [uebernahmeError, setUebernahmeError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [existingProjects, setExistingProjects] = useState<any[]>([]);

  // ==========================================================================
  // MANUELL SPEICHERN
  // ==========================================================================
  const handleSaveManual = async () => {
    if (!formData.name.trim()) { setError('Projektname ist erforderlich'); return; }
    setSaving(true); setError(null);
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
        .select('id').single();
      if (insertError) throw insertError;
      setSuccess('Projekt erfolgreich angelegt!');
      setTimeout(() => onSuccess(newProject.id), 1000);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally { setSaving(false); }
  };

  // ==========================================================================
  // PDF AUSWERTEN
  // ==========================================================================
  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPdfFile(e.target.files?.[0] || null);
    setContract(null); setPdfError(null); setWarnung(null); setAbgleich([]); setUebernahmeError(null); setMaInfo({});
  };

  const handleParse = async () => {
    if (!pdfFile) return;
    setParsing(true); setPdfError(null); setContract(null); setWarnung(null); setAbgleich([]); setUebernahmeError(null); setMaInfo({});
    try {
      const fd = new FormData();
      fd.append('file', pdfFile);
      const res = await fetch('/api/v7/parse-zim', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.ok) { setPdfError(data.meldung || 'Der Antrag konnte nicht ausgewertet werden.'); return; }

      const c: ZimContract = data.contract;
      setContract(c);
      setWarnung(data.warnung || null);

      setFormData({
        name: c.projekt.titel || '',
        short_name: (c.projekt as any).akronym || '',
        funding_format: fundingFromFormat(c),
        funding_reference: '',
        start_date: c.projekt.laufzeit_von || '',
        end_date: c.projekt.laufzeit_bis || '',
        notes: c.projekt.antragsteller ? `Antragsteller: ${c.projekt.antragsteller}` : '',
      });

      // Firmen-bWAZ als Fallback laden
      try {
        const { data: comp } = await supabase
          .from('v7_client_companies').select('standard_weekly_hours').eq('id', companyId).single();
        if (comp?.standard_weekly_hours) setCompanyWeeklyHours(Number(comp.standard_weekly_hours));
      } catch { /* Default 40 */ }

      // Dublettenabgleich
      let existing: ExistingEmployee[] = [];
      try {
        const { data: emps } = await supabase
          .from('v7_employees').select('id, display_name, last_name, first_name')
          .eq('client_company_id', companyId).eq('is_active', true);
        existing = emps || [];
      } catch { existing = []; }
      const ab = c.mitarbeiter.map((ma) => {
        const treffer = findExisting(ma, existing);
        return { ma, treffer, entscheidung: (treffer ? 'verknuepfen' : 'neu') as MaEntscheidung };
      });
      setAbgleich(ab);

      // Info: frueherer Stundensatz bereits vorhandener MA (reine Anzeige, ohne Auswirkung)
      try {
        const matchedIds = ab.filter((a) => a.treffer).map((a) => a.treffer!.id);
        if (matchedIds.length > 0) {
          const { data: prior } = await supabase
            .from('v7_project_assignments').select('employee_id, hourly_rate, project_id')
            .in('employee_id', matchedIds).eq('is_active', true);
          const projIds = Array.from(new Set((prior || []).map((x: any) => x.project_id)));
          const { data: projs2 } = await supabase.from('v7_projects').select('id, name').in('id', projIds);
          const projName = new Map((projs2 || []).map((p: any) => [p.id, p.name] as [string, string]));
          const info: Record<string, { projectName: string; hourly_rate: number }> = {};
          for (const a of (prior || []) as any[]) {
            if (!info[a.employee_id] && a.hourly_rate != null) {
              info[a.employee_id] = { projectName: projName.get(a.project_id) || 'anderes Projekt', hourly_rate: Number(a.hourly_rate) };
            }
          }
          setMaInfo(info);
        }
      } catch { /* Info optional */ }
    } catch {
      setPdfError('Verbindungsfehler beim Auswerten des Antrags. Bitte erneut versuchen.');
    } finally { setParsing(false); }
  };

  const setEntscheidung = (idx: number, ent: MaEntscheidung) =>
    setAbgleich((prev) => prev.map((a, i) => (i === idx ? { ...a, entscheidung: ent } : a)));

  // ==========================================================================
  // UEBERNAHME (Projekt + MA + Team + Arbeitsplan)
  // ==========================================================================
  const handleAnlegenClick = async () => {
    if (!contract) return;
    if (!formData.name.trim()) { setUebernahmeError('Projektname ist erforderlich.'); return; }
    setUebernahmeError(null);
    // Bestehende Projekte der Firma zeigen -> bewusste Entscheidung neu/aktualisieren
    try {
      const { data: projs } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_reference, start_date, end_date')
        .eq('client_company_id', companyId).eq('is_active', true);
      if (projs && projs.length > 0) { setExistingProjects(projs); setShowConfirm(true); return; }
    } catch { /* im Zweifel weiter -> anlegen */ }
    doUebernahme();
  };

  const doUebernahme = async () => {
    if (!contract) return;
    setShowConfirm(false);
    setUebernehmen(true); setUebernahmeError(null);
    try {
      const entscheidungen = abgleich.map((a) => ({
        ma_nr: a.ma.ma_nr,
        entscheidung: a.entscheidung,
        employee_id: a.entscheidung === 'verknuepfen' && a.treffer ? a.treffer.id : null,
      }));
      const payload = buildImportPayload(contract as any, {
        companyId, companyWeeklyHours, entscheidungen,
        fundingFormat: formData.funding_format || null,
        shortName: formData.short_name.trim() || null,
        fundingReference: formData.funding_reference.trim() || null,
      });
      // Projektkopf aus dem (ggf. editierten) Formular
      payload.project.name = formData.name.trim();
      payload.project.start_date = formData.start_date || null;
      payload.project.end_date = formData.end_date || null;
      if (formData.notes.trim()) payload.project.notes = formData.notes.trim();

      // Atomare Uebernahme ueber die Server-Route (RPC-Kern + Arbeitsplan + Kompensation)
      const res = await fetch('/api/v7/import-antrag-neu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: payload.project,
          employeesToCreate: payload.employeesToCreate,
          assignments: payload.assignments,
          packages: payload.packages,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Uebernahme fehlgeschlagen.');

      setSuccess('Projekt, Mitarbeiter und Arbeitsplan wurden aus dem Antrag angelegt.');
      setTimeout(() => onSuccess(data.projectId), 1200);
    } catch (err: any) {
      setUebernahmeError(err.message || 'Fehler bei der Uebernahme.');
    } finally { setUebernehmen(false); }
  };

  // ==========================================================================
  // RENDER-HELFER: Arbeitsplan-Vorschau (AP x MA Matrix)
  // ==========================================================================
  const renderArbeitsplan = (c: ZimContract) => {
    const maList = c.mitarbeiter;
    const pmOf = (ap: ZimArbeitspaket, nr: string): number | null => {
      const z = ap.zuordnungen.find((x) => x.ma_nr === nr);
      return z ? z.planned_pm : null;
    };
    const colSum: Record<string, number> = {};
    for (const ap of c.arbeitspakete) for (const z of ap.zuordnungen) colSum[z.ma_nr] = (colSum[z.ma_nr] || 0) + z.planned_pm;
    const isDS = c.ist_durchfuehrbarkeitsstudie;
    return (
      <div className="overflow-x-auto">
        <table className="text-sm border-collapse">
          <thead>
            <tr className={colors.headBg}>
              <th className="border border-gray-300 px-2 py-1 text-left">AP</th>
              <th className="border border-gray-300 px-2 py-1 text-left">Bezeichnung</th>
              <th className="border border-gray-300 px-2 py-1">Zeitraum</th>
              {isDS && <th className="border border-gray-300 px-2 py-1">T/NT</th>}
              {maList.map((m) => (
                <th key={m.ma_nr} className="border border-gray-300 px-2 py-1 whitespace-nowrap">{m.nachname || `MA ${m.ma_nr}`}</th>
              ))}
              <th className="border border-gray-300 px-2 py-1">Summe</th>
            </tr>
          </thead>
          <tbody>
            {c.arbeitspakete.map((ap) => (
              <tr key={ap.ap_code}>
                <td className="border border-gray-300 px-2 py-1 font-mono font-semibold">{ap.ap_code}</td>
                <td className="border border-gray-300 px-2 py-1">{ap.name}</td>
                <td className="border border-gray-300 px-2 py-1 text-xs whitespace-nowrap">
                  {ap.start_date || ''}{ap.end_date ? ` \u2013 ${ap.end_date}` : ''}
                </td>
                {isDS && (
                  <td className="border border-gray-300 px-2 py-1 text-center font-semibold">
                    {ap.is_technical === true ? 'T' : ap.is_technical === false ? 'NT' : ''}
                  </td>
                )}
                {maList.map((m) => (
                  <td key={m.ma_nr} className="border border-gray-300 px-2 py-1 text-right">{fmtNum(pmOf(ap, m.ma_nr))}</td>
                ))}
                <td className="border border-gray-300 px-2 py-1 text-right font-semibold bg-gray-50">{fmtNum(ap.planned_pm)}</td>
              </tr>
            ))}
            <tr className="bg-gray-100 font-semibold">
              <td className="border border-gray-400 px-2 py-1" colSpan={isDS ? 4 : 3}>Summe PM</td>
              {maList.map((m) => (
                <td key={m.ma_nr} className="border border-gray-400 px-2 py-1 text-right">{fmtNum(colSum[m.ma_nr] || 0)}</td>
              ))}
              <td className="border border-gray-400 px-2 py-1 text-right">{fmtNum(c.projekt.gesamt_pm)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <span className="text-red-800">{error}</span>
        </div>
      )}
      {success && (
        <div className={`p-4 ${colors.bg} border ${colors.border} rounded-lg flex items-start gap-3`}>
          <CheckCircle className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
          <span className="text-gray-800">{success}</span>
        </div>
      )}

      {/* Tab-Leiste */}
      <div className={`inline-flex gap-1 p-1 rounded-lg ${colors.tabBg}`}>
        <button onClick={() => setTab('manuell')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'manuell' ? colors.activeTab : 'text-gray-600 hover:text-gray-800'}`}>
          <Save size={16} /> Manuell
        </button>
        <button onClick={() => setTab('pdf')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'pdf' ? colors.activeTab : 'text-gray-600 hover:text-gray-800'}`}>
          <FileText size={16} /> PDF-Import (ZIM-Antrag)
        </button>
      </div>

      {/* TAB: MANUELL */}
      {tab === 'manuell' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Projektname *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. Entwicklung innovativer Drucktechnologie"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.focus}`} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kurzname</label>
              <input type="text" value={formData.short_name} onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                placeholder="z.B. InnovDruck"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.focus}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Foerderformat</label>
              <select value={formData.funding_format} onChange={(e) => setFormData({ ...formData, funding_format: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.focus}`}>
                {FUNDING_FORMATS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Foerderkennzeichen (FKZ)</label>
              <input type="text" value={formData.funding_reference} onChange={(e) => setFormData({ ...formData, funding_reference: e.target.value })}
                placeholder="z.B. 16KN12345"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.focus}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
              <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.focus}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum</label>
              <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.focus}`} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3}
                placeholder="Optionale Anmerkungen zum Projekt..."
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.focus}`} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Abbrechen</button>
            <button onClick={handleSaveManual} disabled={saving || !formData.name.trim()}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${colors.button}`}>
              {saving ? (<><Loader2 size={18} className="animate-spin" /> Speichere...</>) : (<><Save size={18} /> Projekt anlegen</>)}
            </button>
          </div>
        </div>
      )}

      {/* TAB: PDF-IMPORT */}
      {tab === 'pdf' && (
        <div className="space-y-6">
          {/* Upload */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-4">
              Laden Sie den originalen, ausfuellbaren ZIM-Foerderantrag als PDF hoch. Bitte den
              zuletzt eingereichten/korrigierten Stand verwenden (kein Ausdruck oder Scan).
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer ${colors.buttonLight}`}>
                <Upload size={18} />
                <span>{pdfFile ? pdfFile.name : 'PDF auswaehlen'}</span>
                <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={handlePdfSelect} />
              </label>
              <button onClick={handleParse} disabled={!pdfFile || parsing}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${colors.button}`}>
                {parsing ? (<><Loader2 size={18} className="animate-spin" /> Werte aus...</>) : (<><FileText size={18} /> Antrag auswerten</>)}
              </button>
            </div>
            {pdfError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="text-red-800 text-sm">{pdfError}</span>
              </div>
            )}
          </div>

          {/* Vorschau */}
          {contract && (
            <div className="space-y-6">
              {warnung ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span className="text-amber-800 text-sm">{warnung}</span>
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-green-800 text-sm">Kontrollsummen der Anlage 5 stimmen mit den extrahierten Werten ueberein.</span>
                </div>
              )}

              {/* Projektkopf */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText size={16} className={colors.icon} /> Projektdaten (aus Antrag, editierbar)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Projektname</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.focus}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Kurzbezeichnung / Akronym</label>
                    <input type="text" value={formData.short_name} onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                      placeholder="z.B. WISE"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.focus}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Foerderformat</label>
                    <select value={formData.funding_format} onChange={(e) => setFormData({ ...formData, funding_format: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.focus}`}>
                      {FUNDING_FORMATS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Foerderkennzeichen (FKZ) &ndash; im Antrag nicht enthalten</label>
                    <input type="text" value={formData.funding_reference} onChange={(e) => setFormData({ ...formData, funding_reference: e.target.value })}
                      placeholder="spaeter aus Bescheid nachtragen"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.focus}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Startdatum</label>
                    <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.focus}`} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Enddatum</label>
                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${colors.focus}`} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  bWAZ (betriebsueblich): {fmtNum(contract.projekt.bwaz, 1)} Std. &middot; wird als pm_basis_weekly_hours gesetzt.
                  {contract.projekt.antragsteller ? ` Antragsteller: ${contract.projekt.antragsteller}` : ''}
                </p>
              </div>

              {/* Mitarbeiter */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Users size={16} className={colors.icon} /> Mitarbeiter ({abgleich.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="text-sm w-full">
                    <thead>
                      <tr className="text-left text-gray-600 border-b border-gray-200">
                        <th className="px-2 py-1">Nr</th>
                        <th className="px-2 py-1">Name</th>
                        <th className="px-2 py-1">Qual.</th>
                        <th className="px-2 py-1 text-right">Monatsbrutto</th>
                        <th className="px-2 py-1 text-right">pWAZ</th>
                        <th className="px-2 py-1 text-right">Stundensatz</th>
                        <th className="px-2 py-1">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abgleich.map((a, idx) => (
                        <tr key={a.ma.ma_nr} className="border-b border-gray-100">
                          <td className="px-2 py-1">{a.ma.ma_nr}</td>
                          <td className="px-2 py-1">
                            {a.ma.nachname}{a.ma.vorname ? `, ${a.ma.vorname}` : ''}
                            {a.ma.berufsbezeichnung ? <span className="text-gray-400"> &middot; {a.ma.berufsbezeichnung}</span> : null}
                            {a.treffer && maInfo[a.treffer.id] && a.ma.stundensatz != null && maInfo[a.treffer.id].hourly_rate !== a.ma.stundensatz && (
                              <div className="text-xs text-gray-400">
                                Info: zuvor {maInfo[a.treffer.id].hourly_rate.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {'\u20ac'}/h in {maInfo[a.treffer.id].projectName}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-1">{a.ma.qualifikation}</td>
                          <td className="px-2 py-1 text-right">{a.ma.monatsbrutto != null ? `${a.ma.monatsbrutto.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} \u20ac` : '\u2013'}</td>
                          <td className="px-2 py-1 text-right">{fmtNum(a.ma.personal_weekly_hours, 2)}</td>
                          <td className="px-2 py-1 text-right">{a.ma.stundensatz != null ? `${a.ma.stundensatz.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} \u20ac` : '\u2013'}</td>
                          <td className="px-2 py-1">
                            {a.treffer ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">bereits vorhanden</span>
                                <select value={a.entscheidung} onChange={(e) => setEntscheidung(idx, e.target.value as MaEntscheidung)}
                                  className="text-xs border border-gray-300 rounded px-1 py-0.5">
                                  <option value="verknuepfen">verknuepfen</option>
                                  <option value="neu">neu anlegen</option>
                                </select>
                              </div>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">neu anlegen</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Gehalt, pWAZ und Stundensatz sind projektbezogen (fix fuer dieses Projekt). Beim Verknuepfen
                  werden bestehende Mitarbeiter-Kostendaten anderer Projekte nicht veraendert.
                </p>
              </div>

              {/* Arbeitsplan */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ListChecks size={16} className={colors.icon} /> Arbeitsplan ({contract.arbeitspakete.length} Arbeitspakete)
                </h3>
                {renderArbeitsplan(contract)}
              </div>

              {/* Uebernahme-Fehler */}
              {uebernahmeError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="text-red-800 text-sm">{uebernahmeError}</span>
                </div>
              )}

              {/* Bestaetigung: neues Projekt oder Aktualisierung? */}
              {showConfirm ? (
                <div className="bg-white rounded-lg border border-amber-300 shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600" /> Bereits vorhandene Projekte dieser Firma
                  </h3>
                  <p className="text-sm text-gray-600">
                    Gehoert dieser Antrag zu einem bestehenden Projekt? Dann nutzen Sie dort spaeter
                    &bdquo;Daten aktualisieren&ldquo; (in Vorbereitung), statt ein Duplikat anzulegen. Ist es ein
                    neues Projekt, koennen Sie es hier anlegen.
                  </p>
                  <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                    {existingProjects.map((p) => {
                      const akr = normProjName(formData.short_name || (contract.projekt as any).akronym || '');
                      const likely = normProjName(p.name) === normProjName(formData.name)
                        || normProjName(p.name) === normProjName(contract.projekt.titel)
                        || (akr !== '' && normProjName(p.short_name) === akr);
                      return (
                        <li key={p.id} className={`flex items-center justify-between gap-3 px-3 py-2 ${likely ? 'bg-amber-50' : ''}`}>
                          <div className="text-sm">
                            <div className="font-medium text-gray-800">{p.name}</div>
                            <div className="text-xs text-gray-500">
                              {p.funding_reference ? `FKZ ${p.funding_reference} \u00b7 ` : ''}{p.start_date || '?'} &ndash; {p.end_date || '?'}
                              {likely && <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">wahrscheinlich dasselbe Projekt</span>}
                            </div>
                          </div>
                          <button onClick={() => onSuccess(p.id)} className={`text-xs px-3 py-1 rounded-lg ${colors.buttonLight}`}>Zum Projekt</button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => setShowConfirm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Abbrechen</button>
                    <button onClick={doUebernahme} disabled={uebernehmen}
                      className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${colors.button}`}>
                      {uebernehmen ? (<><Loader2 size={18} className="animate-spin" /> Lege an...</>) : (<><Save size={18} /> Ja, neues Projekt anlegen</>)}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">Abbrechen</button>
                  <button onClick={handleAnlegenClick} disabled={uebernehmen || !formData.name.trim()}
                    className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${colors.button}`}>
                    {uebernehmen ? (<><Loader2 size={18} className="animate-spin" /> Lege an...</>) : (<><Save size={18} /> Projekt aus Antrag anlegen</>)}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
