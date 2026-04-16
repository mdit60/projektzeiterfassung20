// src/components/shared/ZAPanel.tsx
// ============================================================================
// PZE V7 - Shared Component: ZA-Panel (Zahlungsanforderung ZIM)
// ============================================================================
// Version: 7.4.4-29
// v7.4.4-28: FIX: Datum Zuwendungsbescheid zeigt bewilligung_datum statt
//   zuwendungsbescheid_datum (falsches Feld, war immer NULL)
//   - Bei Status "bewilligt" jetzt zwei Buttons:
//     "Zurueck zu Eingereicht" (primaer) und "Zurueck zu Entwurf" (sekundaer)
//   - handleStatusChange unveraendert (unterstuetzt bereits alle Status)
//
// v7.4.4-22: NEU ZIM_NETZWERK-Erweiterungen:
//   - isNetzwerk Flag fuer ZIM_NETZWERK-Projekte
//   - Laufzeitjahr automatisch aus bewilligung_datum berechnet
//   - Foerdersatz automatisch aus foerdersatz_stufen JSONB ermittelt
//   - Deckblatt ZIM_NETZWERK: eigene Kostentabelle mit NWM-Feldern
//     (Personalkosten aus ZE, Auftraege Dritte manuell, Uebrige pauschal)
//   - Warnung wenn Bewilligungsdatum fehlt
//   - ZAProject Interface um NWM-Felder erweitert
//   - ZahlungsanforderungDB um NWM-Felder erweitert
//   - handleSave speichert NWM-Felder zusaetzlich
//
// v7.4.4-18: NEU: Archiv-Tab mit Uebersicht aller ZAs
//   - Neuer Tab "Archiv" neben Deckblatt / Anlage 1a / Anlage 1b
//   - Tabelle: ZA-Nr / Zeitraum / Eingereicht am / Bewilligt am / Status / Foerderbetrag
//   - Status-Badge farbig: grau=Entwurf, blau=Eingereicht, gruen=Bewilligt
//   - Klick auf Zeile laedt ZA in Deckblatt-Tab
//   - Fuer beide Portale (Firma + Berater)
//
// v7.4.4-17: Status-Workflow: Entwurf -> Eingereicht -> Bewilligt
//   - Status-Badge bei jeder gespeicherten ZA in der ZA-Auswahlliste
//   - Status-Steuerblock im Deckblatt-Tab (unterhalb Speichern-Button)
//   - Buttons: "Als eingereicht markieren" / "Als bewilligt markieren" / "Zurueck zu Entwurf"
//   - Status-Farben: Entwurf=grau, Eingereicht=blau, Bewilligt=gruen
//   - Einreichdatum wird automatisch beim Status "Eingereicht" gesetzt
//   - Bewilligungsdatum wird automatisch beim Status "Bewilligt" gesetzt
//   - Statusaenderung direkt in DB (kein Reload noetig)
//
// v7.4.4-16: Rechtlicher Hinweiskasten auf allen drei Tabs eingefuegt:
//            "Fuer die Zahlungsanforderungen sind die vorgegebenen Formulare
//            zu verwenden." (Originalzitat ZIM-Formular VDI/VDE-IT)
//            Link zum ZIM-Foyer eingefuegt.
//
// SHARED COMPONENT - wird von BEIDEN Portalen verwendet:
//   Berater-Portal: portal="berater" -> blaue Akzentfarben
//   Firmen-Portal:  portal="firma"   -> gruene Akzentfarben
//
// WICHTIG: Dieses Component enthaelt NUR den Panel-Inhalt (aufgeklappter Bereich).
// Der Kachel-Button und der showZA-State werden in der jeweiligen Page verwaltet.
// Einbindung in der Page:
//   {showZA && (
//     <ZAPanel portal="firma|berater" projects={...} ... onLoad={openPanel} />
//   )}
// ============================================================================

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText } from 'lucide-react';


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
// TYPEN (exportiert fuer Verwendung in den Page-Komponenten)
// ============================================================================

export interface ZAProject {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  funding_reference: string | null;
  start_date: string | null;
  end_date: string | null;
  foerdersatz: number | null;
  overhead_t: number | null;
  overhead_nt: number | null;
  overhead_gleich: boolean | null;
  // NWM-Felder
  netzwerk_typ: string | null;
  netzwerk_phase: string | null;
  bewilligung_datum: string | null;
  phase2_start_datum: string | null;
  foerdersatz_stufen: Array<{ laufzeitjahr: number; satz_percent: number; gueltig_ab: string }> | null;
  bewilligte_summe: number | null;
}

export interface ZAWorkPackage {
  id: string;
  project_id: string;
  name: string;
  is_technical?: boolean;
}

export interface ZAWpAssignment {
  work_package_id: string;
  employee_id: string;
}

export interface ZAEmployee {
  id: string;
  display_name: string;
}

export interface ZATimesheetEntry {
  id: string;
  project_id: string;
  employee_id: string;
  work_package_id: string | null;
  work_date: string;
  hours: number;
  is_active: boolean;
  is_billable: boolean;
}

export interface ZAProjectAssignment {
  id: string;
  project_id: string;
  employee_id: string;
  hourly_rate: number | null;
}

interface ZahlungsanforderungDB {
  id: string;
  project_id: string;
  za_nummer: number;
  zeitraum_von: string;
  zeitraum_bis: string;
  auftraege_dritte_t: number | null;
  auftraege_dritte_nt: number | null;
  fue_unterauftrag: number | null;
  zeitw_personalaufnahme: number | null;
  status: string | null;
  notizen: string | null;
  eingereicht_am: string | null;
  bewilligt_am: string | null;
  // NWM-Felder
  nwm_personalkosten: number | null;
  nwm_kosten_dritte: number | null;
  nwm_kosten_uebrige: number | null;
  nwm_kosten_gesamt: number | null;
  laufzeitjahr: number | null;
  foerdersatz_percent: number | null;
}

// Status-Hilfsfunktionen
const ZA_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  entwurf:     { label: 'Entwurf',     bg: 'bg-gray-100',  text: 'text-gray-600',  border: 'border-gray-300' },
  eingereicht: { label: 'Eingereicht', bg: 'bg-blue-100',  text: 'text-blue-700',  border: 'border-blue-300' },
  bewilligt:   { label: 'Bewilligt',   bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
};

const getStatusConfig = (status: string | null) =>
  ZA_STATUS_CONFIG[status || 'entwurf'] || ZA_STATUS_CONFIG.entwurf;

interface ZAFormData {
  za_nummer: string;
  zeitraum_von: string;
  zeitraum_bis: string;
  auftraege_dritte_t: string;
  auftraege_dritte_nt: string;
  fue_unterauftrag: string;
  zeitw_personalaufnahme: string;
  notizen: string;
  // NWM-Felder
  nwm_kosten_dritte: string;
}

// ============================================================================
// LOADER (exportiert - wird in Pages fuer projectAssignments verwendet)
// ============================================================================

export async function loadProjectAssignments(projectIds: string[]) {
  if (projectIds.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('v7_project_assignments')
    .select(`id, project_id, employee_id, employee_number, hourly_rate, role_in_project,
             v7_employees!inner(annual_salary, weekly_hours, qualification)`)
    .in('project_id', projectIds)
    .eq('is_active', true);
  if (error) {
    console.error('loadProjectAssignments error:', error);
    return [];
  }
  return (data || []).map((pa: any) => ({
    id: pa.id,
    project_id: pa.project_id,
    employee_id: pa.employee_id,
    employee_number: pa.employee_number,
    hourly_rate: pa.hourly_rate,
    role_in_project: pa.role_in_project,
    annual_salary: pa.v7_employees?.annual_salary,
    weekly_hours: pa.v7_employees?.weekly_hours,
    qualification: pa.v7_employees?.qualification,
  }));
}

// ============================================================================
// FARBEN
// ============================================================================

const PORTAL_COLORS = {
  berater: {
    border: 'border-blue-200',
    headerBg: 'bg-blue-50',
    headerBorder: 'border-blue-200',
    icon: 'text-blue-600',
    tabActive: 'border-blue-600 text-blue-700',
    tabInactive: 'border-transparent text-gray-500 hover:text-gray-700',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700',
    btnZaSelected: 'bg-blue-100 text-blue-800 border-blue-400',
    btnZaHover: 'hover:border-blue-400',
    btnNeueZA: 'border-dashed border-blue-400 text-blue-600 hover:bg-blue-50',
    inputFocus: 'focus:outline-none focus:border-blue-500',
    focusRing: 'focus:ring-blue-500',
  },
  firma: {
    border: 'border-green-200',
    headerBg: 'bg-green-50',
    headerBorder: 'border-green-200',
    icon: 'text-green-600',
    tabActive: 'border-green-600 text-green-700',
    tabInactive: 'border-transparent text-gray-500 hover:text-gray-700',
    btnPrimary: 'bg-green-600 hover:bg-green-700',
    btnZaSelected: 'bg-green-100 text-green-800 border-green-400',
    btnZaHover: 'hover:border-green-400',
    btnNeueZA: 'border-dashed border-green-400 text-green-600 hover:bg-green-50',
    inputFocus: 'focus:outline-none focus:border-green-500',
    focusRing: 'focus:ring-green-500',
  },
};

// ============================================================================
// PROPS
// ============================================================================

interface ZAPanelProps {
  portal: 'berater' | 'firma';
  projects: ZAProject[];
  workPackages: ZAWorkPackage[];
  wpAssignments: ZAWpAssignment[];
  employees: ZAEmployee[];
  timesheets: ZATimesheetEntry[];
  projectAssignments: ZAProjectAssignment[];
  initialProjectId?: string;
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function ZAPanel({
  portal,
  projects,
  workPackages,
  wpAssignments,
  employees,
  timesheets,
  projectAssignments,
  initialProjectId,
}: ZAPanelProps) {
  const supabase = createClient();
  const colors = PORTAL_COLORS[portal];

  // ZIM-relevante Projekte (robust gegen Postgres ENUM-Typ)
  const zimProjects = projects.filter(p => {
    const ff = String(p.funding_format || '').toUpperCase().trim();
    return ff === 'ZIM' || ff === 'ZIM_DS' || ff === 'ZIM_NETZWERK' || ff.startsWith('ZIM');
  });

  // ---- State ----
  const [projectId, setProjectId] = useState<string>(
    initialProjectId || zimProjects[0]?.id || ''
  );
  const [zaTab, setZATab] = useState<'deckblatt' | 'anlage1a' | 'anlage1b' | 'archiv'>('deckblatt');
  const [zaList, setZAList] = useState<ZahlungsanforderungDB[]>([]);
  const [zaSelectedId, setZASelectedId] = useState<string | null>(null);
  const [zaLoading, setZALoading] = useState(false);
  const [zaSaving, setZASaving] = useState(false);
  // v7.4.4-28: Direkt aus DB geladene Projektfelder (bewilligung_datum, bewilligte_summe)
  const [zaProjectExtra, setZAProjectExtra] = useState<{
    bewilligung_datum: string | null;
    bewilligte_summe: number | null;
  }>({ bewilligung_datum: null, bewilligte_summe: null });
  const [zaFormData, setZAFormData] = useState<ZAFormData>({
    za_nummer: '1',
    zeitraum_von: '',
    zeitraum_bis: '',
    auftraege_dritte_t: '',
    auftraege_dritte_nt: '',
    fue_unterauftrag: '',
    zeitw_personalaufnahme: '',
    notizen: '',
    nwm_kosten_dritte: '',
  });

  // ---- Panel beim ersten Rendern laden ----
  const openPanel = useCallback(async (pid: string) => {
    setZALoading(true);
    setZASelectedId(null);
    const project = projects.find(p => p.id === pid);

    // v7.4.4-28: Fehlende Felder direkt aus DB laden
    const { data: projectDB } = await supabase
      .from('v7_projects')
      .select('bewilligung_datum, bewilligte_summe')
      .eq('id', pid)
      .maybeSingle();
    setZAProjectExtra({
      bewilligung_datum: projectDB?.bewilligung_datum || null,
      bewilligte_summe: projectDB?.bewilligte_summe || null,
    });

    const { data: existingZAs } = await supabase
      .from('v7_zahlungsanforderungen')
      .select('id, project_id, za_nummer, zeitraum_von, zeitraum_bis, auftraege_dritte_t, auftraege_dritte_nt, fue_unterauftrag, zeitw_personalaufnahme, status, notizen, eingereicht_am, bewilligt_am, nwm_personalkosten, nwm_kosten_dritte, nwm_kosten_uebrige, nwm_kosten_gesamt, laufzeitjahr, foerdersatz_percent')
      .eq('project_id', pid)
      .order('za_nummer', { ascending: true });

    const zaListLoaded: ZahlungsanforderungDB[] = existingZAs || [];
    setZAList(zaListLoaded);

    const nextNummer = zaListLoaded.length > 0
      ? Math.max(...zaListLoaded.map(z => z.za_nummer)) + 1
      : 1;
    const lastZA = zaListLoaded.length > 0 ? zaListLoaded[zaListLoaded.length - 1] : null;
    const vonDefault = lastZA
      ? (() => { const d = new Date(lastZA.zeitraum_bis); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })()
      : (project?.start_date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    const bisDefault = new Date().toISOString().slice(0, 10);

    setZAFormData({
      za_nummer: String(nextNummer),
      zeitraum_von: vonDefault,
      zeitraum_bis: bisDefault,
      auftraege_dritte_t: '',
      auftraege_dritte_nt: '',
      fue_unterauftrag: '',
      zeitw_personalaufnahme: '',
      notizen: '',
      nwm_kosten_dritte: '',
    });
    setZALoading(false);
  }, [projects, supabase]);

  // Automatisch laden wenn Panel sichtbar wird
  useEffect(() => {
    if (projectId) openPanel(projectId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadZAIntoForm = (za: ZahlungsanforderungDB) => {
    setZASelectedId(za.id);
    setZAFormData({
      za_nummer: String(za.za_nummer),
      zeitraum_von: za.zeitraum_von,
      zeitraum_bis: za.zeitraum_bis,
      auftraege_dritte_t: za.auftraege_dritte_t != null ? String(za.auftraege_dritte_t) : '',
      auftraege_dritte_nt: za.auftraege_dritte_nt != null ? String(za.auftraege_dritte_nt) : '',
      fue_unterauftrag: za.fue_unterauftrag != null ? String(za.fue_unterauftrag) : '',
      zeitw_personalaufnahme: za.zeitw_personalaufnahme != null ? String(za.zeitw_personalaufnahme) : '',
      notizen: za.notizen || '',
      nwm_kosten_dritte: za.nwm_kosten_dritte != null ? String(za.nwm_kosten_dritte) : '',
    });
  };

  const handleStatusChange = async (newStatus: 'entwurf' | 'eingereicht' | 'bewilligt') => {
    if (!zaSelectedId) return;
    setZASaving(true);
    try {
      const now = new Date().toISOString();
      const patch: Record<string, string | null> = {
        status: newStatus,
        updated_at: now,
      };
      if (newStatus === 'eingereicht') patch.eingereicht_am = now;
      if (newStatus === 'bewilligt')   patch.bewilligt_am = now;
      if (newStatus === 'entwurf') {
        patch.eingereicht_am = null;
        patch.bewilligt_am = null;
      }
      await supabase.from('v7_zahlungsanforderungen').update(patch).eq('id', zaSelectedId);
      // Lokale ZA-Liste sofort aktualisieren ohne vollstaendigen Reload
      setZAList(prev => prev.map(z =>
        z.id === zaSelectedId
          ? { ...z, status: newStatus,
              eingereicht_am: newStatus === 'eingereicht' ? now : (newStatus === 'entwurf' ? null : z.eingereicht_am),
              bewilligt_am:   newStatus === 'bewilligt'   ? now : (newStatus === 'entwurf' ? null : z.bewilligt_am) }
          : z
      ));
    } catch (err: any) {
      alert('Fehler beim Statuswechsel: ' + err.message);
    } finally {
      setZASaving(false);
    }
  };

  const handleSave = async () => {
    if (!projectId) return;
    setZASaving(true);
    try {
      const payload: Record<string, any> = {
        project_id: projectId,
        za_nummer: parseInt(zaFormData.za_nummer) || 1,
        zeitraum_von: zaFormData.zeitraum_von,
        zeitraum_bis: zaFormData.zeitraum_bis,
        auftraege_dritte_t: zaFormData.auftraege_dritte_t !== '' ? parseFloat(zaFormData.auftraege_dritte_t.replace(',', '.')) : 0,
        auftraege_dritte_nt: zaFormData.auftraege_dritte_nt !== '' ? parseFloat(zaFormData.auftraege_dritte_nt.replace(',', '.')) : 0,
        fue_unterauftrag: zaFormData.fue_unterauftrag !== '' ? parseFloat(zaFormData.fue_unterauftrag.replace(',', '.')) : 0,
        zeitw_personalaufnahme: zaFormData.zeitw_personalaufnahme !== '' ? parseFloat(zaFormData.zeitw_personalaufnahme.replace(',', '.')) : 0,
        notizen: zaFormData.notizen.trim() || null,
        updated_at: new Date().toISOString(),
      };
      // NWM-spezifische Felder nur bei ZIM_NETZWERK speichern
      if (isNetzwerk) {
        payload.nwm_personalkosten = nwmPersonalkosten;
        payload.nwm_kosten_dritte = nwmKostenDritte;
        payload.nwm_kosten_uebrige = nwmKostenUebrige;
        payload.nwm_kosten_gesamt = nwmKostenGesamt;
        payload.laufzeitjahr = nwmLaufzeitjahr;
        payload.foerdersatz_percent = nwmFoerdersatz;
      }
      if (zaSelectedId) {
        await supabase.from('v7_zahlungsanforderungen').update(payload).eq('id', zaSelectedId);
      } else {
        const { data: newZA } = await supabase.from('v7_zahlungsanforderungen').insert(payload).select().single();
        if (newZA) setZASelectedId((newZA as any).id);
      }
      await openPanel(projectId);
      alert('ZA gespeichert.');
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setZASaving(false);
    }
  };

  // ---- Berechnungsfunktionen ----

  const getZAPersonenstunden = (pid: string, vonStr: string, bisStr: string) => {
    if (!vonStr || !bisStr) return [];
    const project = projects.find(p => p.id === pid);
    if (!project) return [];
    const isDS = String(project.funding_format || '').toUpperCase().trim() === 'ZIM_DS';

    const projectWPs = workPackages.filter(wp => wp.project_id === pid);
    const projectWPIds = projectWPs.map(wp => wp.id);
    const assignedEmployeeIds = [...new Set(
      wpAssignments
        .filter(wpa => projectWPIds.includes(wpa.work_package_id))
        .map(wpa => wpa.employee_id)
    )];

    const vonDate = new Date(vonStr);
    const bisDate = new Date(bisStr);
    const months: { year: number; month: number; label: string }[] = [];
    const cur = new Date(vonDate.getFullYear(), vonDate.getMonth(), 1);
    while (cur <= bisDate) {
      months.push({
        year: cur.getFullYear(),
        month: cur.getMonth() + 1,
        label: cur.toLocaleString('de-DE', { month: 'short', year: '2-digit' }),
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    const technicalWPIds = isDS
      ? projectWPs.filter(wp => wp.is_technical === true).map(wp => wp.id)
      : [];

    return assignedEmployeeIds.map(empId => {
      const emp = employees.find(e => e.id === empId);
      const empName = emp ? emp.display_name : empId;

      const monthData = months.map(m => {
        const monthEntries = timesheets.filter(ts =>
          ts.project_id === pid &&
          ts.employee_id === empId &&
          ts.is_active &&
          ts.is_billable &&
          (() => {
            const d = new Date(ts.work_date);
            return d.getFullYear() === m.year && (d.getMonth() + 1) === m.month;
          })()
        );
        const hoursT = isDS
          ? monthEntries.filter(ts => technicalWPIds.includes(ts.work_package_id || '')).reduce((s, ts) => s + ts.hours, 0)
          : monthEntries.reduce((s, ts) => s + ts.hours, 0);
        const hoursNT = isDS
          ? monthEntries.filter(ts => !technicalWPIds.includes(ts.work_package_id || '')).reduce((s, ts) => s + ts.hours, 0)
          : 0;
        return { ...m, hoursT, hoursNT, hoursTotal: hoursT + hoursNT };
      });

      const totalT = monthData.reduce((s, m) => s + m.hoursT, 0);
      const totalNT = monthData.reduce((s, m) => s + m.hoursNT, 0);
      return { empId, empName, monthData, totalT, totalNT, totalAll: totalT + totalNT };
    }).filter(row => row.totalAll > 0);
  };

  const getHourlyRate = (empId: string, pid: string): number | null => {
    const pa = projectAssignments.find(pa => pa.employee_id === empId && pa.project_id === pid);
    return pa?.hourly_rate || null;
  };

  const fmt = (v: number) => v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${d}.${m}.${y}`;
  };


  // ============================================================================
  // NWM-HILFSFUNKTIONEN
  // ============================================================================

  // Laufzeitjahr aus Bewilligungsdatum + ZA-Periodenende berechnen
  const calcLaufzeitjahr = (bewilligungDatum: string | null, periodeBis: string): number => {
    if (!bewilligungDatum || !periodeBis) return 1;
    const beg = new Date(bewilligungDatum);
    const bis = new Date(periodeBis);
    const diffMs = bis.getTime() - beg.getTime();
    const diffYears = diffMs / (365.25 * 24 * 60 * 60 * 1000);
    return Math.max(1, Math.ceil(diffYears));
  };

  // Foerdersatz aus foerdersatz_stufen JSONB fuer Laufzeitjahr ermitteln
  const getFoerdersatzNWM = (project: ZAProject, laufzeitjahr: number): number => {
    const stufen = project.foerdersatz_stufen;
    if (!stufen || stufen.length === 0) {
      // Fallback: Standardwerte national Phase 2
      if (laufzeitjahr === 1) return 70;
      if (laufzeitjahr === 2) return 50;
      return 30;
    }
    const stufe = stufen.find(s => s.laufzeitjahr === laufzeitjahr);
    return stufe ? stufe.satz_percent : (stufen[stufen.length - 1]?.satz_percent || 30);
  };

  // NWM-Personalkosten aus ZE berechnen (foerderfaehige Std x hourly_rate_approved)
  const calcNWMPersonalkosten = (pid: string, vonStr: string, bisStr: string): number => {
    if (!vonStr || !bisStr) return 0;
    const psRows = getZAPersonenstunden(pid, vonStr, bisStr);
    return psRows.reduce((sum, row) => {
      const rate = getHourlyRate(row.empId, pid) || 0;
      return sum + row.totalAll * rate;
    }, 0);
  };

  const handlePrint = () => {
    const el = document.getElementById('za-print-area');
    if (!el) return;
    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) return;
    const styles = Array.from(document.styleSheets)
      .map(ss => { try { return Array.from(ss.cssRules).map(r => r.cssText).join('\n'); } catch { return ''; } })
      .join('\n');
    const tabLabel = zaTab === 'deckblatt' ? 'Deckblatt' : zaTab === 'anlage1a' ? 'Anlage 1a' : zaTab === 'anlage1b' ? 'Anlage 1b' : 'Archiv';
    printWin.document.write(
      '<html><head><title>ZA ' + zaFormData.za_nummer + ' - ' + tabLabel +
      '</title><style>' + styles +
      ' @media print { body { margin: 10mm; } } @page { size: A4 portrait; margin: 15mm; }</style></head><body>' +
      el.innerHTML + '</body></html>'
    );
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); printWin.close(); }, 400);
  };

  // Kein ZIM-Projekt -> nichts rendern
  if (zimProjects.length === 0) return null;

  // Berechnungen
  const zaProject = projects.find(p => p.id === projectId) || zimProjects[0];
  const isDS = String(zaProject?.funding_format || '').toUpperCase().trim() === 'ZIM_DS';
  const isNetzwerk = String(zaProject?.funding_format || '').toUpperCase().trim() === 'ZIM_NETZWERK';
  const vonStr = zaFormData.zeitraum_von;
  const bisStr = zaFormData.zeitraum_bis;
  const psData = (vonStr && bisStr && projectId) ? getZAPersonenstunden(projectId, vonStr, bisStr) : [];

  // NWM-spezifische Berechnungen (nur relevant wenn isNetzwerk)
  const nwmLaufzeitjahr = isNetzwerk && bisStr
    ? calcLaufzeitjahr(zaProjectExtra.bewilligung_datum || zaProject?.bewilligung_datum || null, bisStr)
    : 1;
  const nwmFoerdersatz = isNetzwerk
    ? getFoerdersatzNWM(zaProject, nwmLaufzeitjahr)
    : (zaProject?.foerdersatz || 0);
  const nwmPersonalkosten = isNetzwerk && vonStr && bisStr
    ? calcNWMPersonalkosten(projectId, vonStr, bisStr)
    : 0;
  const nwmKostenDritte = parseFloat((zaFormData.nwm_kosten_dritte || '0').replace(',', '.')) || 0;
  const nwmKostenUebrige = nwmPersonalkosten; // = 100% der Personalkosten lt. Richtlinie
  const nwmKostenGesamt = nwmPersonalkosten + nwmKostenDritte + nwmKostenUebrige;
  const nwmEigenanteilsquote = 100 - nwmFoerdersatz;
  const nwmFoerderbetrag = Math.round(nwmKostenGesamt * nwmFoerdersatz / 100);
  const nwmEigenanteil = nwmKostenGesamt - nwmFoerderbetrag;

  const pkT = psData.reduce((sum, row) => sum + row.totalT * (getHourlyRate(row.empId, projectId) || 0), 0);
  const pkNT = psData.reduce((sum, row) => sum + row.totalNT * (getHourlyRate(row.empId, projectId) || 0), 0);
  const pkGesamt = isDS
    ? pkT + pkNT
    : psData.reduce((sum, row) => sum + row.totalAll * (getHourlyRate(row.empId, projectId) || 0), 0);

  const foerdersatz = zaProject?.foerdersatz || 0;
  const overheadT = zaProject?.overhead_t || 0;
  const overheadNT = isDS ? (zaProject?.overhead_nt || zaProject?.overhead_t || 0) : (zaProject?.overhead_t || 0);
  const gkT = isDS ? pkT * overheadT / 100 : pkGesamt * overheadT / 100;
  const gkNT = isDS ? pkNT * overheadNT / 100 : 0;
  const auftraegeT = parseFloat((zaFormData.auftraege_dritte_t || '0').replace(',', '.')) || 0;
  const auftraegeNT = parseFloat((zaFormData.auftraege_dritte_nt || '0').replace(',', '.')) || 0;
  const fueUA = parseFloat((zaFormData.fue_unterauftrag || '0').replace(',', '.')) || 0;
  const zeitwPA = parseFloat((zaFormData.zeitw_personalaufnahme || '0').replace(',', '.')) || 0;
  const summeT = isDS ? pkT + gkT + auftraegeT : 0;
  const summeNT = isDS ? pkNT + gkNT + auftraegeNT : 0;
  const summeGesamt = isDS
    ? summeT + summeNT + fueUA + zeitwPA
    : pkGesamt + gkT + auftraegeT + fueUA + zeitwPA;
  const antZuwendung = Math.round(summeGesamt * foerdersatz / 100);

  // ============================================================================
  // RENDER - NUR PANEL-INHALT (kein Button, kein show/hide)
  // ============================================================================

  return (
    <div className={`mt-4 border ${colors.border} rounded-lg overflow-hidden`}>

      {/* Panel-Header */}
      <div className={`${colors.headerBg} px-4 py-3 border-b ${colors.headerBorder} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <FileText className={`w-5 h-5 ${colors.icon}`} />
          <span className="font-medium text-gray-900">Zahlungsanforderung ({zaProject?.funding_format?.replace('_', ' ') || 'ZIM'})</span>
          {zimProjects.length > 1 && (
            <select
              value={projectId}
              onChange={e => {
                setProjectId(e.target.value);
                openPanel(e.target.value);
              }}
              className={`text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 ${colors.focusRing}`}
            >
              {zimProjects.map(p => (
                <option key={p.id} value={p.id}>{p.short_name || p.name}</option>
              ))}
            </select>
          )}
          {zimProjects.length === 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">
                {zaProject?.short_name || zaProject?.name}
              </span>
              {zaProject?.funding_reference && (
                <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                  {zaProject.funding_reference}
                </span>
              )}
            </div>
          )}
          {zaProject?.funding_format && <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">{getFundingLabel(zaProject.funding_format)}</span>}
        </div>
        {zaList.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Gespeicherte ZAs:</span>
            {zaList.map(za => {
              const sc = getStatusConfig(za.status);
              return (
                <button key={za.id} onClick={() => loadZAIntoForm(za)}
                  className={`text-xs px-2 py-1 rounded border transition-colors flex items-center gap-1.5
                    ${zaSelectedId === za.id
                      ? colors.btnZaSelected
                      : `bg-white text-gray-700 border-gray-300 ${colors.btnZaHover}`}`}>
                  ZA {za.za_nummer}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium border ${sc.bg} ${sc.text} ${sc.border}`}>
                    {sc.label}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => { setZASelectedId(null); openPanel(projectId); }}
              className={`text-xs px-2 py-1 rounded border ${colors.btnNeueZA}`}>
              + Neue ZA
            </button>
          </div>
        )}
      </div>

      {/* Tab-Navigation */}
      <div className="flex items-center border-b border-gray-200 bg-white">
        <div className="flex flex-1">
          {(['deckblatt', 'anlage1a', 'anlage1b', 'archiv'] as const).map(tab => (
            <button key={tab} onClick={() => setZATab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${zaTab === tab ? colors.tabActive : colors.tabInactive}`}>
              {tab === 'deckblatt' ? 'Deckblatt (Seite 5)'
                : tab === 'anlage1a' ? 'Anlage 1a - Personenstunden'
                : tab === 'anlage1b' ? 'Anlage 1b - Personalkosten'
                : 'Archiv'}
            </button>
          ))}
        </div>
        <button onClick={handlePrint}
          className="flex items-center gap-1.5 mx-3 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded transition-colors"
          title="Dieses Formblatt drucken">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Drucken
        </button>
      </div>

      {zaLoading ? (
        <div className="p-8 text-center text-gray-500">Lade...</div>
      ) : (
        <div className="p-4 bg-white">

          {/* ====== TAB: DECKBLATT ====== */}
          {zaTab === 'deckblatt' && (
            <div className="space-y-4">
              <div id="za-print-area" className="border-2 border-gray-400 rounded bg-white p-4">
                <div className="text-center text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">
                  Zentrales Innovationsprogramm Mittelstand (ZIM) &mdash; Zahlungsanforderung
                  {isDS ? ' fuer Durchfuehrbarkeitsstudien' : ''}
                </div>

                {/* Kopfdaten - Zeile 1: Foerderkennzeichen + Bewilligte Summe */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Foerderkennzeichen</div>
                    <div className="font-medium text-sm bg-yellow-50 border border-gray-300 rounded px-2 py-1 min-h-[28px]">
                      {zaProject?.funding_reference || <span className="text-gray-400 italic">nicht hinterlegt</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Bewilligte Foerdersumme</div>
                    <div className="font-medium text-sm bg-green-50 border border-gray-300 rounded px-2 py-1 min-h-[28px] text-green-800">
                      {zaProjectExtra.bewilligte_summe != null
                        ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(zaProjectExtra.bewilligte_summe)
                        : <span className="text-gray-400 italic font-normal">nicht hinterlegt</span>}
                    </div>
                  </div>
                </div>
                {/* Kopfdaten - Zeile 2: ZA-Nr + Bescheid-Datum + Zeitraum von/bis */}
                <div className="grid grid-cols-4 gap-3 mb-4 pb-3 border-b border-gray-300">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Zahlungsanforderung Nr.</div>
                    <input type="number" min="1" value={zaFormData.za_nummer}
                      onChange={e => setZAFormData(prev => ({ ...prev, za_nummer: e.target.value }))}
                      className={`w-full px-2 py-1 text-sm font-medium border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Datum Zuwendungsbescheid</div>
                    <div className="text-sm bg-yellow-50 border border-gray-300 rounded px-2 py-1 min-h-[28px] text-gray-800">
                      {zaProjectExtra.bewilligung_datum
                        ? new Date(zaProjectExtra.bewilligung_datum).toLocaleDateString('de-DE')
                        : <span className="text-gray-400 italic">nicht hinterlegt</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Abrechnungszeitraum von</div>
                    <input type="date" value={zaFormData.zeitraum_von}
                      onChange={e => setZAFormData(prev => ({ ...prev, zeitraum_von: e.target.value }))}
                      className={`w-full px-2 py-1 text-sm border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">bis</div>
                    <input type="date" value={zaFormData.zeitraum_bis}
                      onChange={e => setZAFormData(prev => ({ ...prev, zeitraum_bis: e.target.value }))}
                      className={`w-full px-2 py-1 text-sm border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} />
                  </div>
                </div>

                {/* Warnung fehlende Foerderparameter */}
                {!isNetzwerk && (!zaProject?.foerdersatz || !zaProject?.overhead_t) && (
                  <div className="bg-amber-50 border border-amber-300 rounded p-2 text-xs text-amber-700 mb-3">
                    Foerderparameter (Foerdersatz, GKZ) sind noch nicht am Projekt hinterlegt.
                    Bitte im Projekt bearbeiten (Tab Uebersicht &rsaquo; Bearbeiten).
                  </div>
                )}
                {isNetzwerk && !zaProjectExtra.bewilligung_datum && !zaProject?.bewilligung_datum && (
                  <div className="bg-amber-50 border border-amber-300 rounded p-2 text-xs text-amber-700 mb-3">
                    Bewilligungsdatum fehlt. Bitte im Tab Netzwerk &rsaquo; Einstellungen hinterlegen,
                    damit Laufzeitjahr und Foerdersatz automatisch berechnet werden.
                  </div>
                )}

                {/* NWM-Kostentabelle (nur ZIM_NETZWERK) */}
                {isNetzwerk && (
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-xs font-medium text-gray-700">
                        NWM-Kosten Abrechnungszeitraum
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-gray-500">Laufzeitjahr:</span>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">{nwmLaufzeitjahr}</span>
                        <span className="text-xs text-gray-500 ml-2">Foerdersatz:</span>
                        <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">{nwmFoerdersatz}%</span>
                        <span className="text-xs text-gray-500 ml-2">Eigenanteil:</span>
                        <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">{nwmEigenanteilsquote}%</span>
                      </div>
                    </div>
                    <table className="w-full text-xs border border-gray-400">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="text-left px-2 py-1.5 border border-gray-300 font-medium">Kostenart</th>
                          <th className="text-right px-2 py-1.5 border border-gray-300 font-medium w-40">Betrag [EUR]</th>
                          <th className="px-2 py-1.5 border border-gray-300 font-medium w-48 text-gray-500 text-center">Herkunft</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1.5 border border-gray-300">(1) Personalkosten (foerderfaehig)</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(nwmPersonalkosten)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-400 text-[10px]">aus Zeiterfassung</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1.5 border border-gray-300">(2) Auftraege an Dritte</td>
                          <td className="px-2 py-1.5 border border-gray-300 p-0">
                            <input type="number" step="0.01" min="0"
                              value={zaFormData.nwm_kosten_dritte}
                              onChange={e => setZAFormData(prev => ({ ...prev, nwm_kosten_dritte: e.target.value }))}
                              className={`w-full px-2 py-1.5 text-right border-0 bg-blue-50 ${colors.inputFocus}`}
                              placeholder="0,00" />
                          </td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-400 text-[10px]">manuell (max. 25%)</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1.5 border border-gray-300">(3) Uebrige Kosten (pauschal 100% Personalkosten)</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-gray-50 text-gray-500">{fmt(nwmKostenUebrige)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-400 text-[10px]">automatisch</td>
                        </tr>
                        <tr className="bg-gray-100 font-semibold">
                          <td className="px-2 py-1.5 border border-gray-300">Gesamtkosten NWM</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{fmt(nwmKostenGesamt)}</td>
                          <td className="px-2 py-1.5 border border-gray-300"></td>
                        </tr>
                        <tr className="bg-blue-50">
                          <td className="px-2 py-1.5 border border-gray-300 text-blue-700">Foerderbetrag PT ({nwmFoerdersatz}%)</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono text-blue-700">{fmt(nwmFoerderbetrag)}</td>
                          <td className="px-2 py-1.5 border border-gray-300"></td>
                        </tr>
                        <tr className="bg-orange-50">
                          <td className="px-2 py-1.5 border border-gray-300 text-orange-700 font-semibold">Eigenanteil NP gesamt ({nwmEigenanteilsquote}%)</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono text-orange-700 font-semibold">{fmt(nwmEigenanteil)}</td>
                          <td className="px-2 py-1.5 border border-gray-300"></td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Uebrige Kosten = 100% der Personalkosten (pauschal lt. ZIM-Richtlinie 2024 Abschnitt 5.3.1c).
                      Auftraege an Dritte max. 25% der Gesamtkosten (national) bzw. 35% (international).
                    </p>
                  </div>
                )}

                {/* Kostentabelle (nur NICHT-NWM) */}
                {!isNetzwerk && (
                <div className="text-xs font-medium text-gray-700 mb-1">
                  Zuwendungsfaehige Kosten im Abrechnungszeitraum und anteilige Zuwendung
                </div>
                )}
                {!isNetzwerk && (
                <table className="w-full text-xs border border-gray-400">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-left px-2 py-1.5 border border-gray-300 font-medium w-8">Nr.</th>
                      <th className="text-left px-2 py-1.5 border border-gray-300 font-medium">Kostenart</th>
                      {isDS ? (
                        <>
                          <th className="text-right px-2 py-1.5 border border-gray-300 font-medium w-32">entst. Kosten technisch<br />[EUR, Cent]</th>
                          <th className="text-right px-2 py-1.5 border border-gray-300 font-medium w-32">entst. Kosten nichttechn.<br />[EUR, Cent]</th>
                        </>
                      ) : (
                        <>
                          <th className="text-right px-2 py-1.5 border border-gray-300 font-medium w-40">entstandene zuwendungs-<br />faehige Kosten [EUR, Cent]</th>
                          <th className="text-center px-2 py-1.5 border border-gray-300 font-medium w-24">Foerdersatz<br />[%]</th>
                          <th className="text-right px-2 py-1.5 border border-gray-300 font-medium w-40">anteilige Zuwendung<br />(Summe gerundet) [EUR, Cent]</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {/* (1) Personal */}
                    <tr>
                      <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(1)</td>
                      <td className="px-2 py-1.5 border border-gray-300">Personal {isDS ? 'technisch' : ''} (lt. Anlage 1b)</td>
                      {isDS ? (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(pkT)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-gray-50 text-gray-400">--</td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(pkGesamt)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                          <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                        </>
                      )}
                    </tr>
                    {/* (2) Zuschlag T */}
                    <tr>
                      <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(2)</td>
                      <td className="px-2 py-1.5 border border-gray-300">
                        Zuschlag fuer uebrige Kosten{isDS ? ' technisch' : ''}&nbsp;
                        <span className="font-medium">{overheadT}%</span>
                      </td>
                      {isDS ? (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(gkT)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-gray-50 text-gray-400">--</td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(gkT)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                          <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                        </>
                      )}
                    </tr>
                    {/* (3) Personal NT - nur DS */}
                    {isDS && (
                      <tr>
                        <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(3)</td>
                        <td className="px-2 py-1.5 border border-gray-300">Personal nichttechnisch (lt. Anlage 1b)</td>
                        <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-gray-50 text-gray-400">--</td>
                        <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(pkNT)}</td>
                      </tr>
                    )}
                    {/* (4) Zuschlag NT - nur DS */}
                    {isDS && (
                      <tr>
                        <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(4)</td>
                        <td className="px-2 py-1.5 border border-gray-300">
                          Zuschlag fuer uebrige Kosten nichttechnisch&nbsp;
                          <span className="font-medium">{overheadNT}%</span>
                        </td>
                        <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-gray-50 text-gray-400">--</td>
                        <td className="px-2 py-1.5 border border-gray-300 text-right font-mono bg-blue-50">{fmt(gkNT)}</td>
                      </tr>
                    )}
                    {/* Auftraege Dritte T */}
                    <tr>
                      <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">{isDS ? '(5)' : '(3)'}</td>
                      <td className="px-2 py-1.5 border border-gray-300">Kosten der Auftraege an wiss. qual. Dritte{isDS ? ', technisch' : ''}</td>
                      {isDS ? (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300">
                            <input type="number" step="0.01" min="0" value={zaFormData.auftraege_dritte_t}
                              onChange={e => setZAFormData(prev => ({ ...prev, auftraege_dritte_t: e.target.value }))}
                              className={`w-full px-1 py-0.5 text-right border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} placeholder="0,00" />
                          </td>
                          <td className="px-2 py-1.5 border border-gray-300 bg-gray-50 text-gray-400 text-right">--</td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300">
                            <input type="number" step="0.01" min="0" value={zaFormData.auftraege_dritte_t}
                              onChange={e => setZAFormData(prev => ({ ...prev, auftraege_dritte_t: e.target.value }))}
                              className={`w-full px-1 py-0.5 text-right border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} placeholder="0,00" />
                          </td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                          <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                        </>
                      )}
                    </tr>
                    {/* Auftraege Dritte NT - nur DS */}
                    {isDS && (
                      <tr>
                        <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(6)</td>
                        <td className="px-2 py-1.5 border border-gray-300">Kosten der Auftraege an wiss. qual. Dritte, nichttechnisch</td>
                        <td className="px-2 py-1.5 border border-gray-300 bg-gray-50 text-gray-400 text-right">--</td>
                        <td className="px-2 py-1.5 border border-gray-300">
                          <input type="number" step="0.01" min="0" value={zaFormData.auftraege_dritte_nt}
                            onChange={e => setZAFormData(prev => ({ ...prev, auftraege_dritte_nt: e.target.value }))}
                            className={`w-full px-1 py-0.5 text-right border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} placeholder="0,00" />
                        </td>
                      </tr>
                    )}
                    {/* FuE-Unterauftrag - nur ZIM (nicht DS) */}
                    {!isDS && (
                      <tr>
                        <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(4)</td>
                        <td className="px-2 py-1.5 border border-gray-300">FuE-Unterauftrag</td>
                        <td className="px-2 py-1.5 border border-gray-300">
                          <input type="number" step="0.01" min="0" value={zaFormData.fue_unterauftrag}
                            onChange={e => setZAFormData(prev => ({ ...prev, fue_unterauftrag: e.target.value }))}
                            className={`w-full px-1 py-0.5 text-right border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} placeholder="0,00" />
                        </td>
                        <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                        <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                      </tr>
                    )}
                    {/* Zeitw. Personalaufnahme - nur ZIM (nicht DS) */}
                    {!isDS && (
                      <tr>
                        <td className="px-2 py-1.5 border border-gray-300 text-center text-gray-500">(5)</td>
                        <td className="px-2 py-1.5 border border-gray-300">Zeitweilige Personalaufnahme</td>
                        <td className="px-2 py-1.5 border border-gray-300">
                          <input type="number" step="0.01" min="0" value={zaFormData.zeitw_personalaufnahme}
                            onChange={e => setZAFormData(prev => ({ ...prev, zeitw_personalaufnahme: e.target.value }))}
                            className={`w-full px-1 py-0.5 text-right border border-gray-300 rounded bg-blue-50 ${colors.inputFocus}`} placeholder="0,00" />
                        </td>
                        <td className="px-2 py-1.5 border border-gray-300 text-center bg-gray-50 text-gray-400">--</td>
                        <td className="px-2 py-1.5 border border-gray-300 bg-gray-50"></td>
                      </tr>
                    )}
                    {/* Summe */}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="px-2 py-1.5 border border-gray-300"></td>
                      <td className="px-2 py-1.5 border border-gray-300">Summe</td>
                      {isDS ? (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{fmt(summeT)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{fmt(summeNT)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{fmt(summeGesamt)}</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-center font-medium">{foerdersatz}%</td>
                          <td className="px-2 py-1.5 border border-gray-300 text-right font-mono text-green-800">{fmt(antZuwendung)}</td>
                        </>
                      )}
                    </tr>
                    {/* Gesamt + Zuwendung bei DS */}
                    {isDS && (
                      <>
                        <tr className="bg-gray-200 font-semibold">
                          <td className="px-2 py-1.5 border border-gray-300"></td>
                          <td className="px-2 py-1.5 border border-gray-300">Summe gesamt (T + NT)</td>
                          <td colSpan={2} className="px-2 py-1.5 border border-gray-300 text-right font-mono">{fmt(summeGesamt)}</td>
                        </tr>
                        <tr className="bg-green-50 font-semibold">
                          <td className="px-2 py-1.5 border border-gray-300"></td>
                          <td className="px-2 py-1.5 border border-gray-300 text-green-800">Anteilige Zuwendung ({foerdersatz}% Foerdersatz)</td>
                          <td colSpan={2} className="px-2 py-1.5 border border-gray-300 text-right font-mono text-green-800">{fmt(antZuwendung)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>

                )}
                {/* Interne Notizen */}
                <div className="mt-3">
                  <label className="block text-xs text-gray-500 mb-1">Interne Notizen (nicht im Formular)</label>
                  <textarea value={zaFormData.notizen}
                    onChange={e => setZAFormData(prev => ({ ...prev, notizen: e.target.value }))}
                    rows={2}
                    className={`w-full px-2 py-1.5 text-xs border border-gray-300 rounded ${colors.inputFocus}`}
                    placeholder="Optionale Notizen zur ZA" />
                </div>
              </div>

              {/* Rechtlicher Hinweis ZIM-Formular */}
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <div>
                  <div className="font-semibold mb-1">
                    Hinweis: Fuer die Zahlungsanforderungen sind die vorgegebenen Formulare zu verwenden.
                    Diese Daten sind deshalb in das offizielle ZIM-Formular zu uebertragen.
                    Alle weiteren Informationen entnehmen Sie bitte den Hinweisen des ZIM-Formulars.
                  </div>
                </div>
              </div>

              {/* Speichern */}
              <div className="flex justify-end">
                <button onClick={handleSave}
                  disabled={zaSaving || !zaFormData.zeitraum_von || !zaFormData.zeitraum_bis}
                  className={`flex items-center gap-2 px-4 py-2 ${colors.btnPrimary} text-white rounded-lg disabled:opacity-50 transition-colors text-sm`}>
                  {zaSaving ? 'Speichern...' : (zaSelectedId ? 'Aktualisieren' : 'ZA speichern')}
                </button>
              </div>

              {/* Status-Workflow (nur bei gespeicherter ZA) */}
              {zaSelectedId && (() => {
                const currentZA = zaList.find(z => z.id === zaSelectedId);
                const currentStatus = currentZA?.status || 'entwurf';
                const sc = getStatusConfig(currentStatus);
                return (
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">Status:</span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                          {sc.label}
                        </span>
                        {currentZA?.eingereicht_am && (
                          <span className="text-xs text-gray-400">
                            Eingereicht: {new Date(currentZA.eingereicht_am).toLocaleDateString('de-DE')}
                          </span>
                        )}
                        {currentZA?.bewilligt_am && (
                          <span className="text-xs text-gray-400">
                            Bewilligt: {new Date(currentZA.bewilligt_am).toLocaleDateString('de-DE')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {currentStatus === 'entwurf' && (
                          <button
                            onClick={() => handleStatusChange('eingereicht')}
                            disabled={zaSaving}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 2 11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                            Als eingereicht markieren
                          </button>
                        )}
                        {currentStatus === 'eingereicht' && (
                          <>
                            <button
                              onClick={() => handleStatusChange('bewilligt')}
                              disabled={zaSaving}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              Als bewilligt markieren
                            </button>
                            <button
                              onClick={() => handleStatusChange('entwurf')}
                              disabled={zaSaving}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-gray-100 text-gray-600 border border-gray-300 rounded-lg disabled:opacity-50 transition-colors">
                              Zurueck zu Entwurf
                            </button>
                          </>
                        )}
                        {currentStatus === 'bewilligt' && (
                          <>
                            <button
                              onClick={() => handleStatusChange('eingereicht')}
                              disabled={zaSaving}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors">
                              Zurueck zu Eingereicht
                            </button>
                            <button
                              onClick={() => handleStatusChange('entwurf')}
                              disabled={zaSaving}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white hover:bg-gray-100 text-gray-600 border border-gray-300 rounded-lg disabled:opacity-50 transition-colors">
                              Zurueck zu Entwurf
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ====== TAB: ANLAGE 1a ====== */}
          {zaTab === 'anlage1a' && (
            <div>
              {(!zaFormData.zeitraum_von || !zaFormData.zeitraum_bis) ? (
                <div className="p-4 text-sm text-gray-500 text-center">Bitte zunaechst im Tab "Deckblatt" den Abrechnungszeitraum festlegen.</div>
              ) : psData.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">Keine Zeiterfassungsdaten im gewaehlten Zeitraum gefunden.</div>
              ) : (
                <div id="za-print-area" className="border-2 border-gray-400 rounded bg-white p-4">
                  <div className="text-center text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                    Zentrales Innovationsprogramm Mittelstand (ZIM) &mdash; Anlage 1a
                  </div>
                  <div className="text-center text-base font-bold mb-3">Abrechnung der foerderbaren Personenstunden</div>
                  <div className="grid grid-cols-4 gap-3 mb-4 pb-3 border-b border-gray-300 text-xs">
                    <div><span className="text-gray-500">Foerderkennzeichen: </span><span className="font-medium">{zaProject?.funding_reference || '--'}</span></div>
                    <div><span className="text-gray-500">zu ZA-Nr.: </span><span className="font-medium">{zaFormData.za_nummer}</span></div>
                    <div><span className="text-gray-500">Zeitraum von: </span><span className="font-medium">{fmtDate(zaFormData.zeitraum_von)}</span></div>
                    <div><span className="text-gray-500">bis: </span><span className="font-medium">{fmtDate(zaFormData.zeitraum_bis)}</span></div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border border-gray-400">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-2 py-1.5 border border-gray-300 text-center w-8">lfd.<br />Nr.</th>
                          <th className="px-2 py-1.5 border border-gray-300 text-left w-36">Projektmitarbeiter(in)<br />(Name, Vorname)</th>
                          <th className="px-2 py-1.5 border border-gray-300 text-center w-24">Monat</th>
                          {isDS ? (
                            <>
                              <th className="px-2 py-1.5 border border-gray-300 text-center">foerderbare<br />Std. je Monat<br />[h] techn.</th>
                              <th className="px-2 py-1.5 border border-gray-300 text-center">foerderbare<br />Std. je Monat<br />[h] nichttechn.</th>
                              <th className="px-2 py-1.5 border border-gray-300 text-center">Summe<br />[h] techn.</th>
                              <th className="px-2 py-1.5 border border-gray-300 text-center">Summe<br />[h] nichttechn.</th>
                            </>
                          ) : (
                            <>
                              <th className="px-2 py-1.5 border border-gray-300 text-center">foerderbare Personenstunden<br />je Monat [h]</th>
                              <th className="px-2 py-1.5 border border-gray-300 text-center">Summe<br />[h]</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {psData.map((row, idx) => (
                          <React.Fragment key={row.empId}>
                            {row.monthData.map((m, mIdx) => (
                              <tr key={`${row.empId}-${m.year}-${m.month}`}
                                className={mIdx === 0 ? 'border-t-2 border-gray-400' : ''}>
                                {mIdx === 0 && (
                                  <>
                                    <td className="px-2 py-1.5 border border-gray-300 text-center align-top" rowSpan={row.monthData.length}>{idx + 1}</td>
                                    <td className="px-2 py-1.5 border border-gray-300 font-medium align-top" rowSpan={row.monthData.length}>{row.empName}</td>
                                  </>
                                )}
                                <td className="px-2 py-1.5 border border-gray-300 text-center whitespace-nowrap">{m.label}</td>
                                {isDS ? (
                                  <>
                                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{m.hoursT > 0 ? m.hoursT.toFixed(2) : ''}</td>
                                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{m.hoursNT > 0 ? m.hoursNT.toFixed(2) : ''}</td>
                                    {mIdx === 0 && (
                                      <>
                                        <td className="px-2 py-1.5 border border-gray-300 text-right font-mono font-semibold bg-blue-50 align-top" rowSpan={row.monthData.length}>{row.totalT > 0 ? row.totalT.toFixed(2) : '--'}</td>
                                        <td className="px-2 py-1.5 border border-gray-300 text-right font-mono font-semibold bg-blue-50 align-top" rowSpan={row.monthData.length}>{row.totalNT > 0 ? row.totalNT.toFixed(2) : '--'}</td>
                                      </>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <td className="px-2 py-1.5 border border-gray-300 text-right font-mono">{m.hoursTotal > 0 ? m.hoursTotal.toFixed(2) : ''}</td>
                                    {mIdx === 0 && (
                                      <td className="px-2 py-1.5 border border-gray-300 text-right font-mono font-semibold bg-blue-50 align-top" rowSpan={row.monthData.length}>{row.totalAll > 0 ? row.totalAll.toFixed(2) : '--'}</td>
                                    )}
                                  </>
                                )}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Foerderbare Personenstunden: geleistete Projektbearbeitungsstunden gemaess Stundennachweisen,
                    jedoch nicht mehr als arbeitsvertraglich vereinbart.
                    Max. foerderbare Std. je Monat = Wochenarbeitszeit x 52 (Wochen) : 12 (Monate).
                  </p>
                </div>
              )}
              {/* Rechtlicher Hinweis ZIM-Formular */}
              {psData.length > 0 && zaFormData.zeitraum_von && zaFormData.zeitraum_bis && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800 mt-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div>
                    <div className="font-semibold mb-1">
                      Hinweis: Fuer die Zahlungsanforderungen sind die vorgegebenen Formulare zu verwenden.
                      Diese Daten sind deshalb in das offizielle ZIM-Formular zu uebertragen.
                      Alle weiteren Informationen entnehmen Sie bitte den Hinweisen des ZIM-Formulars.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====== TAB: ANLAGE 1b ====== */}
          {zaTab === 'anlage1b' && (
            <div>
              {(!zaFormData.zeitraum_von || !zaFormData.zeitraum_bis) ? (
                <div className="p-4 text-sm text-gray-500 text-center">Bitte zunaechst im Tab "Deckblatt" den Abrechnungszeitraum festlegen.</div>
              ) : psData.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">Keine Zeiterfassungsdaten im gewaehlten Zeitraum gefunden.</div>
              ) : (
                <div id="za-print-area" className="border-2 border-gray-400 rounded bg-white p-4">
                  <div className="text-center text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                    Zentrales Innovationsprogramm Mittelstand (ZIM) &mdash; Anlage 1b
                  </div>
                  <div className="text-center text-base font-bold mb-3">Abrechnung der zuwendungsfaehigen Personalkosten</div>
                  <div className="grid grid-cols-4 gap-3 mb-4 pb-3 border-b border-gray-300 text-xs">
                    <div><span className="text-gray-500">Foerderkennzeichen: </span><span className="font-medium">{zaProject?.funding_reference || '--'}</span></div>
                    <div><span className="text-gray-500">zu ZA-Nr.: </span><span className="font-medium">{zaFormData.za_nummer}</span></div>
                    <div><span className="text-gray-500">Zeitraum von: </span><span className="font-medium">{fmtDate(zaFormData.zeitraum_von)}</span></div>
                    <div><span className="text-gray-500">bis: </span><span className="font-medium">{fmtDate(zaFormData.zeitraum_bis)}</span></div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border border-gray-400">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-2 py-1.5 border border-gray-300 text-center w-8">lfd.<br />Nr.</th>
                          <th className="px-2 py-1.5 border border-gray-300 text-left">Projektmitarbeiter(in)</th>
                          {isDS ? (
                            <>
                              <th className="px-2 py-1.5 border border-gray-300 text-right">foerderbare<br />Std. techn.<br />entspr. 1a (1)<br />[h]</th>
                              <th className="px-2 py-1.5 border border-gray-300 text-right">foerderbare<br />Std. nichttechn.<br />entspr. 1a (2)<br />[h]</th>
                            </>
                          ) : (
                            <th className="px-2 py-1.5 border border-gray-300 text-right">foerderbare<br />Personenstunden<br />entspr. Anlage 1a<br />[h]</th>
                          )}
                          <th className="px-2 py-1.5 border border-gray-300 text-right">Stundensatz<br />[EUR, Cent/h]</th>
                          {isDS ? (
                            <>
                              <th className="px-2 py-1.5 border border-gray-300 text-right">entst. PK<br />technisch<br />(1) x (3)<br />[EUR, Cent]</th>
                              <th className="px-2 py-1.5 border border-gray-300 text-right">entst. PK<br />nichttechn.<br />(2) x (3)<br />[EUR, Cent]</th>
                            </>
                          ) : (
                            <th className="px-2 py-1.5 border border-gray-300 text-right">entstandene PK<br />Stunden x Satz<br />[EUR, Cent]</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {psData.map((row, idx) => {
                          const rate = getHourlyRate(row.empId, projectId) || 0;
                          const pkRowT = row.totalT * rate;
                          const pkRowNT = row.totalNT * rate;
                          const pkRow = row.totalAll * rate;
                          return (
                            <tr key={row.empId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-2 py-2 border border-gray-300 text-center">{idx + 1}</td>
                              <td className="px-2 py-2 border border-gray-300 font-medium">{row.empName}</td>
                              {isDS ? (
                                <>
                                  <td className="px-2 py-2 border border-gray-300 text-right font-mono">{row.totalT > 0 ? row.totalT.toFixed(2) : '--'}</td>
                                  <td className="px-2 py-2 border border-gray-300 text-right font-mono">{row.totalNT > 0 ? row.totalNT.toFixed(2) : '--'}</td>
                                </>
                              ) : (
                                <td className="px-2 py-2 border border-gray-300 text-right font-mono">{row.totalAll > 0 ? row.totalAll.toFixed(2) : '--'}</td>
                              )}
                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">
                                {rate > 0 ? rate.toFixed(2) : <span className="text-amber-500 font-normal">fehlt!</span>}
                              </td>
                              {isDS ? (
                                <>
                                  <td className="px-2 py-2 border border-gray-300 text-right font-mono font-semibold">{fmt(pkRowT)}</td>
                                  <td className="px-2 py-2 border border-gray-300 text-right font-mono font-semibold">{fmt(pkRowNT)}</td>
                                </>
                              ) : (
                                <td className="px-2 py-2 border border-gray-300 text-right font-mono font-semibold">{fmt(pkRow)}</td>
                              )}
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                          <td colSpan={2} className="px-2 py-2 border border-gray-300 text-right">Summe/Uebertrag:</td>
                          {isDS ? (
                            <>
                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">{psData.reduce((s, r) => s + r.totalT, 0).toFixed(2)}</td>
                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">{psData.reduce((s, r) => s + r.totalNT, 0).toFixed(2)}</td>
                              <td className="px-2 py-2 border border-gray-300"></td>
                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">{fmt(pkT)}</td>
                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">{fmt(pkNT)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">{psData.reduce((s, r) => s + r.totalAll, 0).toFixed(2)}</td>
                              <td className="px-2 py-2 border border-gray-300"></td>
                              <td className="px-2 py-2 border border-gray-300 text-right font-mono">{fmt(pkGesamt)}</td>
                            </>
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Stundensatz = vom Zuwendungsgeber anerkannter personengebundener Stundensatz (aus Projektteam).
                  </p>
                </div>
              )}
              {/* Rechtlicher Hinweis ZIM-Formular */}
              {psData.length > 0 && zaFormData.zeitraum_von && zaFormData.zeitraum_bis && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800 mt-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div>
                    <div className="font-semibold mb-1">
                      Hinweis: Fuer die Zahlungsanforderungen sind die vorgegebenen Formulare zu verwenden.
                      Diese Daten sind deshalb in das offizielle ZIM-Formular zu uebertragen.
                      Alle weiteren Informationen entnehmen Sie bitte den Hinweisen des ZIM-Formulars.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====== TAB: ARCHIV ====== */}
          {zaTab === 'archiv' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Alle Zahlungsanforderungen</h3>
                <span className="text-xs text-gray-400">{zaList.length} ZA gespeichert</span>
              </div>
              {zaList.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Noch keine Zahlungsanforderungen gespeichert.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">ZA Nr.</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Zeitraum</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Eingereicht</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Bewilligt</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Foerderbetrag</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {zaList.map((za) => {
                        const statusCfg = getStatusConfig(za.status);
                        const vonDate = za.zeitraum_von ? new Date(za.zeitraum_von).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--';
                        const bisDate = za.zeitraum_bis ? new Date(za.zeitraum_bis).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--';
                        const einDate = za.eingereicht_am ? new Date(za.eingereicht_am).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--';
                        const bewDate = za.bewilligt_am ? new Date(za.bewilligt_am).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--';
                        const isSelected = zaSelectedId === za.id;
                        return (
                          <tr key={za.id}
                            className={`transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-4 py-3 font-semibold text-gray-900">ZA {za.za_nummer}</td>
                            <td className="px-4 py-3 text-gray-700 text-xs">
                              {vonDate}<br/><span className="text-gray-400">bis</span> {bisDate}
                            </td>
                            <td className="px-4 py-3 text-gray-700 text-xs">{einDate}</td>
                            <td className="px-4 py-3 text-gray-700 text-xs">{bewDate}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                                {statusCfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-700 text-xs">
                              {za.status === 'bewilligt' || za.status === 'eingereicht'
                                ? <span className="text-gray-400">s. Deckblatt</span>
                                : <span className="text-gray-300">--</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => { loadZAIntoForm(za); setZATab('deckblatt'); }}
                                className={`text-xs px-3 py-1 rounded border transition-colors ${colors.btnZaHover} bg-white text-gray-600 border-gray-300`}>
                                Oeffnen
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Legende */}
              <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400 font-medium">Status:</span>
                {(['entwurf', 'eingereicht', 'bewilligt'] as const).map(s => {
                  const cfg = getStatusConfig(s);
                  return (
                    <span key={s} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                      {cfg.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
