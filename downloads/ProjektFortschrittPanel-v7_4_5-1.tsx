// src/components/shared/ProjektFortschrittPanel.tsx
// ============================================================================
// PZE V7 - Projekt-Fortschritt Grafische Auswertung
// ============================================================================
// Version: 7.4.5-1
// Datum: 26. Maerz 2026
//
// Zeigt fuer ein ausgewaehltes Projekt:
// - 3 Kennzahl-Kacheln: Laufzeit %, PM-Fortschritt %, Kosten-Fortschritt %
// - Balkendiagramm: Soll/Ist Personenmonate je Mitarbeiter
// - Balkendiagramm: Soll/Ist Kosten je Mitarbeiter
// - Liniendiagramm: Monatsverlauf Stunden ueber Projektlaufzeit
// ============================================================================

'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { TrendingUp, Clock, Euro, Users } from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  start_date: string | null;
  end_date: string | null;
  foerdersatz: number | null;
  overhead_t: number | null;
}

interface WorkPackage {
  id: string;
  project_id: string;
  total_person_months: number | null;
}

interface WorkPackageAssignment {
  work_package_id: string;
  employee_id: string;
  planned_person_months: number;
}

interface ProjectAssignment {
  project_id: string;
  employee_id: string;
  hourly_rate: number | null;
}

interface Employee {
  id: string;
  display_name: string;
}

interface TimesheetEntry {
  project_id: string;
  employee_id: string;
  work_date: string;
  hours: number;
  is_billable: boolean;
}

interface ProjektFortschrittPanelProps {
  portal: 'berater' | 'firma';
  projects: Project[];
  workPackages: WorkPackage[];
  wpAssignments: WorkPackageAssignment[];
  projectAssignments: ProjectAssignment[];
  employees: Employee[];
  timesheets: TimesheetEntry[];
  initialProjectId?: string;
}

// ============================================================================
// KONSTANTEN
// ============================================================================

const HOURS_PER_PM = 173.33;

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

const fmt1 = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt0 = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtEur = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' EUR';

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

// Fortschritts-Farbe (gruen/gelb/rot)
const progressColor = (pct: number, timePct: number): string => {
  if (pct >= timePct - 5) return 'text-green-600';
  if (timePct - pct > 25) return 'text-red-600';
  return 'text-amber-600';
};

const progressBg = (pct: number, timePct: number): string => {
  if (pct >= timePct - 5) return 'bg-green-500';
  if (timePct - pct > 25) return 'bg-red-500';
  return 'bg-amber-500';
};

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

const PMTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {fmt1(p.value)} PM
        </p>
      ))}
    </div>
  );
};

const KostenTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {fmtEur(p.value)}
        </p>
      ))}
    </div>
  );
};

const MonatTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {fmt1(p.value)} h
        </p>
      ))}
    </div>
  );
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function ProjektFortschrittPanel({
  portal,
  projects,
  workPackages,
  wpAssignments,
  projectAssignments,
  employees,
  timesheets,
  initialProjectId,
}: ProjektFortschrittPanelProps) {

  const accentColor = portal === 'firma' ? '#16a34a' : '#2563eb';
  const accentLight = portal === 'firma' ? '#dcfce7' : '#dbeafe';

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || projects[0]?.id || ''
  );

  // ---- Ausgewaehltes Projekt ----
  const project = projects.find(p => p.id === selectedProjectId) || projects[0];

  // ---- Berechnungen ----
  const analysis = useMemo(() => {
    if (!project) return null;

    const projWPs = workPackages.filter(wp => wp.project_id === project.id);
    const projAssignments = projectAssignments.filter(pa => pa.project_id === project.id);
    const projTimesheets = timesheets.filter(t => t.project_id === project.id && t.is_billable !== false);

    // ---- Laufzeit-Fortschritt ----
    let laufzeitPct = 0;
    let laufzeitLabel = '--';
    let gesamtMonate = 0;
    let vergangeMonate = 0;
    if (project.start_date && project.end_date) {
      const start = new Date(project.start_date);
      const end = new Date(project.end_date);
      const now = new Date();
      const total = end.getTime() - start.getTime();
      const elapsed = Math.max(0, Math.min(total, now.getTime() - start.getTime()));
      laufzeitPct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
      gesamtMonate = Math.round(total / (30.44 * 24 * 60 * 60 * 1000));
      vergangeMonate = Math.round(elapsed / (30.44 * 24 * 60 * 60 * 1000));
      laufzeitLabel = `${vergangeMonate} / ${gesamtMonate} Monate`;
    }

    // ---- PM-Fortschritt ----
    const gesamtPlanPM = projWPs.reduce((s, wp) => s + (wp.total_person_months || 0), 0);
    const gesamtIstStunden = projTimesheets.reduce((s, t) => s + (t.hours || 0), 0);
    const gesamtIstPM = gesamtIstStunden / HOURS_PER_PM;
    const pmPct = gesamtPlanPM > 0 ? Math.round((gesamtIstPM / gesamtPlanPM) * 100) : 0;

    // ---- Kosten-Fortschritt ----
    const overhead = (project.overhead_t || 0) / 100;
    let gesamtPlanKosten = 0;
    let gesamtIstKosten = 0;

    projAssignments.forEach(pa => {
      const rate = pa.hourly_rate || 0;
      if (rate === 0) return;

      // Plan-Stunden fuer diesen MA aus wpAssignments
      const maWPAs = wpAssignments.filter(wpa => {
        const wp = projWPs.find(w => w.id === wpa.work_package_id);
        return wp && wpa.employee_id === pa.employee_id;
      });
      const planPM = maWPAs.reduce((s, wpa) => s + (wpa.planned_person_months || 0), 0);
      const planH = planPM * HOURS_PER_PM;
      gesamtPlanKosten += planH * rate * (1 + overhead);

      // Ist-Stunden
      const istH = projTimesheets
        .filter(t => t.employee_id === pa.employee_id)
        .reduce((s, t) => s + (t.hours || 0), 0);
      gesamtIstKosten += istH * rate * (1 + overhead);
    });

    const kostenPct = gesamtPlanKosten > 0 ? Math.round((gesamtIstKosten / gesamtPlanKosten) * 100) : 0;

    // ---- MA-Daten fuer Balkendiagramm ----
    const maData = projAssignments.map(pa => {
      const emp = employees.find(e => e.id === pa.employee_id);
      const name = emp?.display_name.split(',')[0] || 'MA'; // Nur Nachname

      const maWPAs = wpAssignments.filter(wpa => {
        const wp = projWPs.find(w => w.id === wpa.work_package_id);
        return wp && wpa.employee_id === pa.employee_id;
      });
      const planPM = maWPAs.reduce((s, wpa) => s + (wpa.planned_person_months || 0), 0);
      const istH = projTimesheets
        .filter(t => t.employee_id === pa.employee_id)
        .reduce((s, t) => s + (t.hours || 0), 0);
      const istPM = istH / HOURS_PER_PM;

      const rate = pa.hourly_rate || 0;
      const planKosten = planPM * HOURS_PER_PM * rate * (1 + overhead);
      const istKosten = istH * rate * (1 + overhead);

      return {
        name,
        'Plan PM': Math.round(planPM * 10) / 10,
        'Ist PM': Math.round(istPM * 10) / 10,
        'Plan EUR': Math.round(planKosten),
        'Ist EUR': Math.round(istKosten),
      };
    }).filter(d => d['Plan PM'] > 0 || d['Ist PM'] > 0);

    // ---- Monatsverlauf ----
    const monatMap: Record<string, number> = {};
    projTimesheets.forEach(t => {
      const d = new Date(t.work_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monatMap[key] = (monatMap[key] || 0) + t.hours;
    });

    // Zeitraum ab Projektstart
    let monatData: { monat: string; Stunden: number; kumulativ: number }[] = [];
    if (project.start_date) {
      const start = new Date(project.start_date);
      const end = project.end_date ? new Date(project.end_date) : new Date();
      const bis = end < new Date() ? end : new Date();
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      let kumulativ = 0;

      while (cur <= bis) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        const h = monatMap[key] || 0;
        kumulativ += h;
        monatData.push({
          monat: `${MONTH_NAMES_SHORT[cur.getMonth()]} ${String(cur.getFullYear()).slice(-2)}`,
          Stunden: Math.round(h * 10) / 10,
          kumulativ: Math.round(kumulativ * 10) / 10,
        });
        cur.setMonth(cur.getMonth() + 1);
      }
    }

    return {
      laufzeitPct, laufzeitLabel, vergangeMonate, gesamtMonate,
      pmPct, gesamtPlanPM, gesamtIstPM,
      kostenPct, gesamtPlanKosten, gesamtIstKosten,
      maData, monatData,
    };
  }, [project, workPackages, wpAssignments, projectAssignments, employees, timesheets]);

  if (!project || !analysis) {
    return (
      <div className="p-8 text-center text-gray-400">
        Kein Projekt ausgewaehlt.
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-5">

      {/* Projekt-Auswahl */}
      {projects.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Projekt:</label>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': accentColor } as any}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.short_name || p.name}
                {p.funding_reference ? ` (${p.funding_reference})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ---- 3 Kennzahl-Kacheln ---- */}
      <div className="grid grid-cols-3 gap-4">

        {/* Laufzeit */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Laufzeit</span>
          </div>
          <div className={`text-3xl font-bold mb-1 ${progressColor(analysis.laufzeitPct, analysis.laufzeitPct)}`}
            style={{ color: accentColor }}>
            {analysis.laufzeitPct}%
          </div>
          <div className="text-xs text-gray-500 mb-2">{analysis.laufzeitLabel}</div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, analysis.laufzeitPct)}%`, backgroundColor: accentColor }}
            />
          </div>
        </div>

        {/* PM-Fortschritt */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Personenmonate</span>
          </div>
          <div className={`text-3xl font-bold mb-1 ${progressColor(analysis.pmPct, analysis.laufzeitPct)}`}>
            {analysis.pmPct}%
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {fmt1(analysis.gesamtIstPM)} / {fmt1(analysis.gesamtPlanPM)} PM
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${progressBg(analysis.pmPct, analysis.laufzeitPct)}`}
              style={{ width: `${Math.min(100, analysis.pmPct)}%` }}
            />
          </div>
        </div>

        {/* Kosten-Fortschritt */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Euro size={16} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Kosten</span>
          </div>
          <div className={`text-3xl font-bold mb-1 ${progressColor(analysis.kostenPct, analysis.laufzeitPct)}`}>
            {analysis.kostenPct}%
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {fmtEur(analysis.gesamtIstKosten)} / {fmtEur(analysis.gesamtPlanKosten)}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${progressBg(analysis.kostenPct, analysis.laufzeitPct)}`}
              style={{ width: `${Math.min(100, analysis.kostenPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ---- Balkendiagramme (2 nebeneinander) ---- */}
      {analysis.maData.length > 0 && (
        <div className="grid grid-cols-2 gap-4">

          {/* PM je MA */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">
              Personenmonate je Mitarbeiter (Plan vs. Ist)
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analysis.maData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" PM" width={45} />
                <Tooltip content={<PMTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Plan PM" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Ist PM" fill={accentColor} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Kosten je MA */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">
              Personalkosten je Mitarbeiter (Plan vs. Ist)
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analysis.maData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} width={45} />
                <Tooltip content={<KostenTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Plan EUR" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Ist EUR" fill={accentColor} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ---- Monatsverlauf ---- */}
      {analysis.monatData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">
            Monatsverlauf Projektstunden (kumulativ)
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analysis.monatData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="monat" tick={{ fontSize: 10 }}
                interval={Math.max(0, Math.floor(analysis.monatData.length / 12) - 1)} />
              <YAxis tick={{ fontSize: 11 }} unit=" h" width={50} />
              <Tooltip content={<MonatTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="Stunden"
                stroke="#94a3b8"
                strokeWidth={1.5}
                dot={false}
                name="Monatl. Stunden"
              />
              <Line
                type="monotone"
                dataKey="kumulativ"
                stroke={accentColor}
                strokeWidth={2}
                dot={false}
                name="Kumulativ"
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2">
            Nur foerderbare Projektstunden (is_billable = true).
            Inkl. GKZ-Zuschlag {project.overhead_t || 0}% in Kostendarstellung.
          </p>
        </div>
      )}

      {analysis.maData.length === 0 && analysis.monatData.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Zeiterfassungsdaten vorhanden.</p>
        </div>
      )}

    </div>
  );
}
