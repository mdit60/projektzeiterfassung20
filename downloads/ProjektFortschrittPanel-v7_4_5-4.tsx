// src/components/shared/ProjektFortschrittPanel.tsx
// ============================================================================
// PZE V7 - Projekt-Fortschritt Grafische Auswertung
// ============================================================================
// Version: 7.4.5-4
// Datum: 1. April 2026
//
// v7.4.5-3: Projektname + FKZ im Panel-Header angezeigt (bei Einzelprojekt)
// v7.4.5-2: Monatsverlauf-Diagramm komplett neu
//   - ComposedChart: Soll/Ist-Saeulen + kumulative Linien kombiniert
//   - Soll-Planstunden je Monat: AP-genau verteilt (Start/End-Datum je AP)
//     Formel: Summe(MA-PM * 173.33) / AP-Laufzeit-Tage * Overlap-Tage je Monat
//     Alle APs pro Kalendermonat summiert = monatlicher Soll-Wert
//   - Ist-Saeulen: tatsaechlich erfasste foerderbare Stunden je Monat
//   - Kumulative Soll-Linie (gestrichelt): aufaddierter Planverlauf
//   - Kumulative Ist-Linie: aufaddierte erfasste Stunden
//   - Zwei Y-Achsen: links Monatsstunden, rechts Kumuliert
//   - WorkPackage-Interface um start_date/end_date erweitert
// v7.4.5-1: Initiale Version mit einfachem Liniendiagramm
// ============================================================================

'use client';

import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Clock, Euro, Users } from 'lucide-react';


// Förderformat-Labels (entspricht ProjectCreateForm)
const FUNDING_FORMAT_LABELS: Record<string, string> = {
  'ZIM':           'ZIM Einzelprojekt',
  'ZIM_KOOP':      'ZIM Kooperationsprojekt',
  'ZIM_NETZWERK':  'ZIM Netzwerk-Management',
  'ZIM_DS':        'ZIM Durchfuehrbarkeitsstudie',
  'BMBF':          'BMBF Foerderung',
  'BMBF_DS':       'BMBF Durchfuehrbarkeitsstudie',
};
const getFundingLabel = (format: string | null | undefined): string =>
  format ? (FUNDING_FORMAT_LABELS[format] || format) : '';

// ============================================================================
// TYPEN
// ============================================================================

interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference?: string | null;
  start_date: string | null;
  end_date: string | null;
  foerdersatz: number | null;
  overhead_t: number | null;
}

interface WorkPackage {
  id: string;
  project_id: string;
  total_person_months: number | null;
  start_date: string | null;
  end_date: string | null;
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

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
];

const fmt1 = (v: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtEur = (v: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' EUR';

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

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
// CUSTOM TOOLTIPS
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
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill || p.stroke }} className="mb-0.5">
          {p.name}: {Math.round(p.value)} h
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

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || projects[0]?.id || ''
  );

  const project = projects.find(p => p.id === selectedProjectId) || projects[0];

  // ============================================================================
  // BERECHNUNGEN
  // ============================================================================

  const analysis = useMemo(() => {
    if (!project) return null;

    const projWPs = workPackages.filter(wp => wp.project_id === project.id);
    const projAssignments = projectAssignments.filter(pa => pa.project_id === project.id);
    const projTimesheets = timesheets.filter(
      t => t.project_id === project.id && t.is_billable !== false
    );

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
      const maWPAs = wpAssignments.filter(wpa => {
        const wp = projWPs.find(w => w.id === wpa.work_package_id);
        return wp && wpa.employee_id === pa.employee_id;
      });
      const planPM = maWPAs.reduce((s, wpa) => s + (wpa.planned_person_months || 0), 0);
      gesamtPlanKosten += planPM * HOURS_PER_PM * rate * (1 + overhead);
      const istH = projTimesheets
        .filter(t => t.employee_id === pa.employee_id)
        .reduce((s, t) => s + (t.hours || 0), 0);
      gesamtIstKosten += istH * rate * (1 + overhead);
    });

    const kostenPct =
      gesamtPlanKosten > 0 ? Math.round((gesamtIstKosten / gesamtPlanKosten) * 100) : 0;

    // ---- MA-Daten fuer Balkendiagramme ----
    const maData = projAssignments
      .map(pa => {
        const emp = employees.find(e => e.id === pa.employee_id);
        const name = emp?.display_name.split(',')[0] || 'MA';
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
      })
      .filter(d => d['Plan PM'] > 0 || d['Ist PM'] > 0);

    // ---- Monatsverlauf: AP-genaue Soll-Verteilung ----
    //
    // Fuer jeden AP mit Start/End-Datum:
    //   Gesamt-Planstunden = Summe(MA-PM * 173.33) fuer alle MA in diesem AP
    //   Planstunden/Tag = Gesamt-Planstunden / AP-Laufzeit in Tagen
    //   Je Kalendermonat: anteilige Ueberlappungstage * Planstunden/Tag
    //
    // Alle APs pro Monat summiert = monatlicher Soll-Wert.

    type MonatDatum = {
      monat: string;
      'Soll': number;
      'Ist': number;
      'Soll kumuliert': number;
      'Ist kumuliert': number;
    };

    let monatData: MonatDatum[] = [];

    if (project.start_date && project.end_date) {
      const projStart = new Date(project.start_date);
      const projEnd = new Date(project.end_date);

      // Alle Projektmonate aufbauen (gesamte Laufzeit inkl. Zukunft)
      const months: { year: number; month: number; label: string }[] = [];
      const cur = new Date(projStart.getFullYear(), projStart.getMonth(), 1);
      const endMonth = new Date(projEnd.getFullYear(), projEnd.getMonth(), 1);
      while (cur <= endMonth) {
        months.push({
          year: cur.getFullYear(),
          month: cur.getMonth() + 1,
          label: `${MONTH_NAMES_SHORT[cur.getMonth()]} ${String(cur.getFullYear()).slice(-2)}`,
        });
        cur.setMonth(cur.getMonth() + 1);
      }

      // Soll-Map aufbauen: AP-genaue Stundenverteilung
      const sollMap: Record<string, number> = {};

      projWPs.forEach(wp => {
        if (!wp.start_date || !wp.end_date) return;

        const apStart = new Date(wp.start_date);
        const apEnd = new Date(wp.end_date);

        // Gesamt-Planstunden fuer diesen AP (alle MA zusammen)
        const apWPAs = wpAssignments.filter(wpa => wpa.work_package_id === wp.id);
        const apTotalPM = apWPAs.reduce((s, wpa) => s + (wpa.planned_person_months || 0), 0);
        const apTotalHours = apTotalPM * HOURS_PER_PM;
        if (apTotalHours === 0) return;

        // AP-Gesamtlaufzeit in Tagen
        const apDurationDays =
          (apEnd.getTime() - apStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
        if (apDurationDays <= 0) return;

        const hoursPerDay = apTotalHours / apDurationDays;

        // Je Kalendermonat: Ueberlappungstage berechnen
        months.forEach(({ year, month }) => {
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 0); // letzter Tag des Monats

          if (apEnd < monthStart || apStart > monthEnd) return;

          const overlapStart = apStart > monthStart ? apStart : monthStart;
          const overlapEnd = apEnd < monthEnd ? apEnd : monthEnd;
          const overlapDays =
            (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24) + 1;

          const key = `${year}-${String(month).padStart(2, '0')}`;
          sollMap[key] = (sollMap[key] || 0) + hoursPerDay * overlapDays;
        });
      });

      // Ist-Map: erfasste foerderbare Stunden je Monat
      const istMap: Record<string, number> = {};
      projTimesheets.forEach(t => {
        const d = new Date(t.work_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        istMap[key] = (istMap[key] || 0) + t.hours;
      });

      // Kombinierte Daten aufbauen
      let sollKumuliert = 0;
      let istKumuliert = 0;

      monatData = months.map(({ year, month, label }) => {
        const key = `${year}-${String(month).padStart(2, '0')}`;
        const soll = Math.round((sollMap[key] || 0));
        const ist = Math.round((istMap[key] || 0));
        sollKumuliert += soll;
        istKumuliert += ist;
        return {
          monat: label,
          'Soll': soll,
          'Ist': ist,
          'Soll kumuliert': Math.round(sollKumuliert),
          'Ist kumuliert': Math.round(istKumuliert),
        };
      });
    }

    return {
      laufzeitPct,
      laufzeitLabel,
      vergangeMonate,
      gesamtMonate,
      pmPct,
      gesamtPlanPM,
      gesamtIstPM,
      kostenPct,
      gesamtPlanKosten,
      gesamtIstKosten,
      maData,
      monatData,
    };
  }, [project, workPackages, wpAssignments, projectAssignments, employees, timesheets]);

  if (!project || !analysis) {
    return (
      <div className="p-8 text-center text-gray-400">
        Kein Projekt ausgewaehlt.
      </div>
    );
  }

  const xAxisInterval = Math.max(0, Math.floor(analysis.monatData.length / 12) - 1);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-5">

      {/* Projekt-Auswahl oder Projektname */}
      {projects.length > 1 ? (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Projekt:</label>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.short_name || p.name}
                {p.funding_reference ? ` (${p.funding_reference})` : ''}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <span className="text-base font-bold text-gray-900">
            {project.short_name || project.name}
          </span>
          {project.funding_reference && (
            <span className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
              {project.funding_reference}
            </span>
          )}
          {project.funding_format && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
              {getFundingLabel(project.funding_format)}
            </span>
          )}
        </div>
      )}

      {/* ---- 3 Kennzahl-Kacheln ---- */}
      <div className="grid grid-cols-3 gap-4">

        {/* Laufzeit */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Laufzeit
            </span>
          </div>
          <div className="text-3xl font-bold mb-1" style={{ color: accentColor }}>
            {analysis.laufzeitPct}%
          </div>
          <div className="text-xs text-gray-500 mb-2">{analysis.laufzeitLabel}</div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(100, analysis.laufzeitPct)}%`,
                backgroundColor: accentColor,
              }}
            />
          </div>
        </div>

        {/* PM-Fortschritt */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Personenmonate
            </span>
          </div>
          <div
            className={`text-3xl font-bold mb-1 ${progressColor(
              analysis.pmPct,
              analysis.laufzeitPct
            )}`}
          >
            {analysis.pmPct}%
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {fmt1(analysis.gesamtIstPM)} / {fmt1(analysis.gesamtPlanPM)} PM
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${progressBg(
                analysis.pmPct,
                analysis.laufzeitPct
              )}`}
              style={{ width: `${Math.min(100, analysis.pmPct)}%` }}
            />
          </div>
        </div>

        {/* Kosten-Fortschritt */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Euro size={16} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Kosten
            </span>
          </div>
          <div
            className={`text-3xl font-bold mb-1 ${progressColor(
              analysis.kostenPct,
              analysis.laufzeitPct
            )}`}
          >
            {analysis.kostenPct}%
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {fmtEur(analysis.gesamtIstKosten)} / {fmtEur(analysis.gesamtPlanKosten)}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${progressBg(
                analysis.kostenPct,
                analysis.laufzeitPct
              )}`}
              style={{ width: `${Math.min(100, analysis.kostenPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ---- Balkendiagramme MA ---- */}
      {analysis.maData.length > 0 && (
        <div className="grid grid-cols-2 gap-4">

          {/* PM je MA */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">
              Personenmonate je Mitarbeiter (Plan vs. Ist)
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={analysis.maData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
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
              <BarChart
                data={analysis.maData}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  width={45}
                />
                <Tooltip content={<KostenTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Plan EUR" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Ist EUR" fill={accentColor} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ---- Monatsverlauf: ComposedChart ---- */}
      {analysis.monatData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-1">
            Monatsverlauf Projektstunden
          </h4>
          <p className="text-xs text-gray-400 mb-4">
            Saeulen: geplante vs. erfasste Stunden je Monat &nbsp;·&nbsp;
            Linien: kumulierter Soll- und Ist-Verlauf
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={analysis.monatData}
              margin={{ top: 10, right: 60, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="monat"
                tick={{ fontSize: 10 }}
                interval={xAxisInterval}
              />
              {/* Linke Y-Achse: Stunden je Monat (Saeulen) */}
              <YAxis
                yAxisId="monat"
                orientation="left"
                tick={{ fontSize: 10 }}
                unit=" h"
                width={52}
              />
              {/* Rechte Y-Achse: kumulierte Stunden (Linien) */}
              <YAxis
                yAxisId="kumuliert"
                orientation="right"
                tick={{ fontSize: 10 }}
                unit=" h"
                width={60}
              />
              <Tooltip content={<MonatTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />

              {/* Saeulen: Soll und Ist je Monat */}
              <Bar
                yAxisId="monat"
                dataKey="Soll"
                fill="#cbd5e1"
                radius={[2, 2, 0, 0]}
                name="Soll (Monat)"
                maxBarSize={16}
              />
              <Bar
                yAxisId="monat"
                dataKey="Ist"
                fill={accentColor}
                fillOpacity={0.8}
                radius={[2, 2, 0, 0]}
                name="Ist (Monat)"
                maxBarSize={16}
              />

              {/* Linien: kumulierter Verlauf */}
              <Line
                yAxisId="kumuliert"
                type="monotone"
                dataKey="Soll kumuliert"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                name="Soll kumuliert"
              />
              <Line
                yAxisId="kumuliert"
                type="monotone"
                dataKey="Ist kumuliert"
                stroke={accentColor}
                strokeWidth={2.5}
                dot={false}
                name="Ist kumuliert"
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2">
            Nur foerderbare Projektstunden (is_billable = true).
            Soll-Verteilung gleichmaessig ueber AP-Laufzeit je Arbeitspaket.
          </p>
        </div>
      )}

      {/* Fallback: keine Daten */}
      {analysis.maData.length === 0 && analysis.monatData.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Zeiterfassungsdaten vorhanden.</p>
        </div>
      )}

    </div>
  );
}
