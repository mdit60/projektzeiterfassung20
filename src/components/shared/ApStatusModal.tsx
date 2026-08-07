'use client';
// src/components/shared/ApStatusModal.tsx
// Version: 1.0-10
// v1.0-10: NEUER Druckweg - eigenes Druckfenster statt In-Place-Druck. Die bisherigen
//   In-Place-Varianten (v1.0-4..-9) erzeugten in PROD mit echten Daten Artefakte, zuletzt
//   ZWEI identische Seiten (die Tabelle wurde dupliziert statt umgebrochen), weil das Modal
//   tief im App-Layout haengt. Loesung: handlePrint kopiert die fertig gerenderte Tabelle
//   (inkl. aufgeklappter Monatszeilen) in ein neues Fenster, das nur die Tabelle enthaelt,
//   uebernimmt die App-Stylesheets (Tailwind -> Rahmen/Farben) und ruft dort window.print().
//   Dort bricht die Tabelle zuverlaessig ueber mehrere Seiten um; "An Seitenbreite anpassen"
//   skaliert voll aufs Querformat. Das gesamte In-Place-Druck-CSS entfaellt.
// v1.0-9: Breitenanpassung wieder komplett dem Browser ueberlassen. Der eigene Auto-Zoom
//   (v1.0-7) kollidierte mit Chromes "An Seitenbreite anpassen" - beide skalierten, rechts
//   blieb ein Drittel leer. Jetzt KEIN eigener zoom mehr: die Tabelle wird in ihrer
//   natuerlichen (breiten) Groesse gedruckt, und der Druckmodus "An Seitenbreite anpassen"
//   skaliert sie vollstaendig und randlos aufs Querformat. Die Vorfahrenkette wird zusaetzlich
//   auf width:max-content gesetzt, damit der Browser die volle Tabellenbreite sieht und
//   korrekt herunterskaliert. Der robuste Seitenumbruch (normaler Fluss, display:none fuer
//   den Rest) aus v1.0-8 bleibt. Empfehlung im Druckdialog: "An Seitenbreite anpassen".
// v1.0-8: Robuster Seitenumbruch bei vielen aufgeklappten Monatszeilen. In -4..-7 wurde
//   die Druck-Tabelle per position:absolute an den Blattanfang geholt; bei HOHEN Tabellen
//   (viele Monatsaufschluesselungen) kam Chrome damit ueber mehrere Seiten nicht zurecht
//   (zerrissene/doppelte Darstellung). Jetzt bleibt die Tabelle im NORMALEN Fluss und bricht
//   sauber ueber beliebig viele Seiten um. Umsetzung: beim Drucken werden per JS die Vorfahren
//   der Tabelle markiert (Klasse ap-print-ancestor); das Druck-CSS blendet mit display:none
//   ALLES aus und zeigt nur die Vorfahrenkette + die Tabelle (kein Leerraum, kein absolute,
//   kein fixed). Die automatische Breitenanpassung (gemessener zoom, v1.0-7) und das Aufklappen
//   aller mehrmonatigen APs (v1.0-5) bleiben. Markierungen werden ueber afterprint entfernt.
// v1.0-7: Druck fuellt die Seitenbreite AUTOMATISCH. Beim Drucken wird die tatsaechliche
//   Tabellenbreite gemessen und daraus ein Zoom-Faktor berechnet, der die Tabelle genau
//   auf die nutzbare Querformat-Breite bringt: wenige MA -> vergroessert, viele MA ->
//   verkleinert. Umsetzung ueber die CSS-Eigenschaft "zoom" (nur im Druck via CSS-Variable
//   --ap-print-zoom), weil zoom - anders als transform:scale - den Seitenumbruch korrekt
//   mitzieht (mehrere Seiten untereinander bleiben moeglich). Die feste Druckschrift (8px)
//   entfaellt; gemessen und gedruckt wird mit derselben Schrift, damit die Skalierung exakt
//   passt. Empfehlung im Druckdialog: Skalierung auf "Standard/100%" (die Anpassung macht
//   die Komponente selbst).
// v1.0-6: Druck-Korrektur. In -5 wurde die Tabelle rechts abgeschnitten (die
//   "offen"-Gruppe fehlte, dadurch eine zweite halbe Seite): width:100% + auto-Layout
//   kann NICHT unter die Inhaltsbreite schrumpfen -> Ueberlauf wird gekappt. Jetzt
//   druckt die Tabelle in ihrer NATUERLICHEN Breite mit kompakter Druckschrift (8px,
//   enge Zellen); der Chrome-Druckmodus "An Seitenbreite anpassen" skaliert sie damit
//   sauber und VOLLSTAENDIG (alle Spalten) aufs Querformat und bricht bei Bedarf nach
//   unten auf mehrere Seiten um (Kopfzeile je Seite wiederholt, Zeilen nicht mittig
//   getrennt). Empfehlung im Druckdialog: "An Seitenbreite anpassen" aktiv lassen.
// v1.0-5: Druck-Feinschliff. (1) Die Tabelle nutzt im Druck die VOLLE Seitenbreite
//   (table width 100%, quer/A4 landscape) und laeuft bei Bedarf auf mehrere Seiten
//   UNTEREINANDER; Kopfzeile wird je Seite wiederholt (thead table-header-group),
//   Zeilen werden nicht mitten umgebrochen (page-break-inside: avoid). (2) Fuer den
//   Druck werden ALLE mehrmonatigen APs automatisch aufgeklappt (Monatsaufschluesselung
//   sichtbar): Klick auf "Drucken" setzt printExpandAll -> nach dem Repaint window.print();
//   das afterprint-Event setzt den Zustand zurueck (die manuelle Auf-/Zuklapp-Auswahl am
//   Bildschirm bleibt unveraendert). Greift nur, wenn showMonthly aktiv ist.
// v1.0-4: Drucken/PDF. Neuer Knopf "Drucken" im Kopf des Dialogs oeffnet den
//   Browser-Druckdialog (window.print) - dort direkt drucken ODER "Als PDF sichern".
//   Gezieltes Druck-CSS (@media print) blendet alles ausser der AP-Status-Tabelle aus
//   und druckt sie quer (A4 landscape): Backdrop, Kopf-/Fuss-Buttons (Klasse
//   ap-print-hide) verschwinden, die Tabelle (#ap-status-print-area) wird oben links
//   voll aufgezogen (max-height/overflow aufgehoben, kein Schatten). Nur Anzeige/Export,
//   keine Datenaenderung. Das Modal-Grundgeruest ist im Druck nicht mehr pauschal
//   ausgeblendet (print:hidden am Overlay entfaellt); stattdessen regelt das Druck-CSS
//   gezielt, was gedruckt wird.
// Version: 1.0-3
// v1.0-3: Neuer Prop showMonthly (Default true). Steuert, ob die aufklappbare
//   Monatsaufschluesselung mehrmonatiger APs angeboten wird. Aufrufer aus dem
//   Timesheet reicht showMonthly = apAnalyseEnabled hinein (Monatsansicht nur fuer
//   Berater bzw. freigeschaltete Firmen); die Stundenmatrix laesst den Default
//   (true), da der AP-Status-Button dort bereits vollstaendig gegated ist. Bei
//   showMonthly === false sind AP-Zeilen nicht aufklappbar (kein Chevron), die
//   MA-Direktspruenge der Hauptzeile (einmonatige APs) bleiben unveraendert.
// Version: 1.0-2
// v1.0-2: Direktsprung ins Timesheet. Die gebuchten MA-Zellen sind klickbar und
//   springen in die Zeiterfassung des jeweiligen Mitarbeiters fuer den betreffenden
//   Monat (Monatszellen der Aufschluesselung immer; Hauptzeile nur bei einmonatigen
//   APs, da dort der Monat eindeutig ist). Verdrahtung ueber neuen Prop
//   onJumpToTimesheet (Aufrufer setzt portalgerechte Navigation inkl. returnUrl).
//   Fehlt der Callback, bleiben die Zellen wie bisher nicht klickbar.
// Version: 1.0-1
// Wiederverwendbarer AP-Status-Dialog ("Alle AP"): kapselt den projektweiten
// AP-Status (geplant / gebucht / offen je AP, gruppiert nach gesamt + MA-Spalten,
// mit aufklappbarer Monatsaufschluesselung) als eigenstaendige Komponente. Laedt
// alle Daten selbst per projectId aus Supabase. Die Tabellen-JSX ist 1:1 aus
// TimesheetForm-v7_4_6-75.tsx uebernommen; nur State-/Datenherkunft wurde auf
// eigenstaendiges Laden umgestellt.

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { hoursPerPM } from '@/lib/projektfortschritt-utils';

// ============================================================================
// Typen (self-contained, an TimesheetForm angelehnt)
// ============================================================================
interface Project {
  id: string;
  name: string;
  short_name: string | null;
  funding_format: string | null;
  pm_basis_weekly_hours: number | null;
  client_company_id: string | null;
}

interface WorkPackage {
  id: string;
  project_id: string;
  ap_code: string | null;
  ap_number: number;
  ap_sub_number?: number | null;
  name: string;
  total_person_months: number | null;
  is_technical?: boolean | null;
  start_date: string | null;
  end_date: string | null;
}

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
}

interface ApStatusModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectLabel?: string;
  // v1.0-3: Monatsaufschluesselung anbieten (Default true). false = keine
  // aufklappbaren AP-Zeilen (kein Chevron, keine Monatszeilen).
  showMonthly?: boolean;
  // v1.0-2: Direktsprung in die Zeiterfassung eines MA fuer einen bestimmten Monat.
  // Wird vom Aufrufer portalgerecht verdrahtet (inkl. returnUrl). Fehlt der Callback,
  // sind die MA-Zellen nicht klickbar.
  onJumpToTimesheet?: (employeeId: string, year: number, month: number) => void;
}

export default function ApStatusModal({ open, onClose, projectId, projectLabel, showMonthly = true, onJumpToTimesheet }: ApStatusModalProps) {
  // v1.0-2: 'YYYY-MM' -> Sprung in die Zeiterfassung des MA fuer diesen Monat.
  const jumpTo = (empId: string, ym: string) => {
    if (!onJumpToTimesheet) return;
    const y = parseInt(ym.slice(0, 4), 10);
    const m = parseInt(ym.slice(5, 7), 10);
    if (!y || !m) return;
    onJumpToTimesheet(empId, y, m);
  };
  // --------------------------------------------------------------------------
  // Selbst geladene Daten (analog der States in TimesheetForm)
  // --------------------------------------------------------------------------
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [firmStdWAZ, setFirmStdWAZ] = useState<number>(40);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [team, setTeam] = useState<Employee[]>([]);
  // plannedHoursPerWpPerMa: wpId -> empId -> Stunden (geplant)
  const [plannedHoursPerWpPerMa, setPlannedHoursPerWpPerMa] = useState<Record<string, Record<string, number>>>({});
  // projectBookedPerWP: wpId -> Stunden (projektweit gebucht)
  const [projectBookedPerWP, setProjectBookedPerWP] = useState<Record<string, number>>({});
  // projectBookedPerWpPerMa: wpId -> empId -> Stunden
  const [projectBookedPerWpPerMa, setProjectBookedPerWpPerMa] = useState<Record<string, Record<string, number>>>({});
  // projectBookedPerWpPerMaMonth: wpId -> empId -> 'YYYY-MM' -> Stunden
  const [projectBookedPerWpPerMaMonth, setProjectBookedPerWpPerMaMonth] = useState<Record<string, Record<string, Record<string, number>>>>({});
  // aufgeklappte AP-Zeilen (Set von work_package_id)
  const [expandedAllApRows, setExpandedAllApRows] = useState<Set<string>>(new Set());
  // v1.0-5: fuer den Druck werden voruebergehend ALLE mehrmonatigen APs aufgeklappt.
  const [printExpandAll, setPrintExpandAll] = useState(false);

  // v1.0-10: Druck ueber ein eigenes, sauberes Druckfenster. Die In-Place-Varianten
  //   (v1.0-4..-9) erzeugten je nach Datenmenge Artefakte (abgeschnitten, halbe Breite,
  //   doppelte/identische Seiten), weil das Modal tief im App-Layout steckt. Jetzt wird die
  //   fertig gerenderte Tabelle (inkl. aufgeklappter Monatszeilen) in ein neues Fenster
  //   kopiert, das NUR die Tabelle enthaelt. Die Stylesheets der App (Tailwind) werden
  //   uebernommen, damit Rahmen/Farben stimmen. Dort bricht die Tabelle zuverlaessig ueber
  //   mehrere Seiten um; "An Seitenbreite anpassen" skaliert sie voll aufs Querformat.
  const handlePrint = () => {
    setPrintExpandAll(true);
    setTimeout(() => {
      const area = document.getElementById('ap-status-print-area');
      const table = area ? area.querySelector('table') : null;
      if (!table) { setPrintExpandAll(false); return; }
      const tableHtml = table.outerHTML;
      setPrintExpandAll(false);
      const win = window.open('', '_blank', 'width=1400,height=900');
      if (!win) {
        window.alert('Bitte Popups fuer diese Seite erlauben, um den AP-Status zu drucken.');
        return;
      }
      const styleHead = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(el => el.outerHTML)
        .join('\n');
      const label = (projectLabel || '').replace(/[<>&]/g, '');
      const html =
        '<!doctype html><html lang="de"><head><meta charset="utf-8">'
        + '<base href="' + window.location.origin + '/">'
        + '<title>AP-Status ' + label + '</title>'
        + styleHead
        + '<style>'
        +   '@page { size: A4 landscape; margin: 8mm; }'
        +   'html,body{margin:0;padding:0;background:#fff;}'
        +   '.ap-doc h2{font-size:14px;margin:0 0 8px 0;font-family:sans-serif;}'
        +   '.ap-doc table{border-collapse:collapse;}'
        +   '.ap-doc table,.ap-doc th,.ap-doc td{font-size:11px !important;}'
        +   '.ap-doc *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}'
        +   '@media print{'
        +     '@page { size: A4 landscape; margin: 8mm; }'
        +     '.ap-doc,.ap-doc *{visibility:visible !important;}'
        +     '.ap-doc{display:block !important;}'
        +     '.ap-doc table{display:table !important;}'
        +     '.ap-doc thead{display:table-header-group !important;}'
        +     '.ap-doc tbody{display:table-row-group !important;}'
        +     '.ap-doc tfoot{display:table-footer-group !important;}'
        +     '.ap-doc tr{display:table-row !important;page-break-inside:avoid;}'
        +     '.ap-doc th,.ap-doc td{display:table-cell !important;}'
        +   '}'
        + '</style></head><body><div class="ap-doc">'
        + '<h2>AP-Status ' + label + '</h2>'
        + tableHtml
        + '</div></body></html>';
      win.document.open();
      win.document.write(html);
      win.document.close();
      const doPrint = () => { try { win.focus(); win.print(); } catch (e) { /* ignore */ } };
      win.onload = () => window.setTimeout(doPrint, 350);
      window.setTimeout(doPrint, 1000);
    }, 80);
  };

  // --------------------------------------------------------------------------
  // Datenladung: nur wenn open && projectId. Reagiert auf [open, projectId].
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        // 1. Projekt
        const { data: proj } = await supabase
          .from('v7_projects')
          .select('id, name, short_name, funding_format, pm_basis_weekly_hours, client_company_id')
          .eq('id', projectId)
          .single();
        const projectRow = (proj as Project | null) || null;

        // 2. Firma (Regelarbeitszeit als Fallback fuer pm_basis)
        let stdWAZ = 40;
        if (projectRow?.client_company_id) {
          const { data: comp } = await supabase
            .from('v7_client_companies')
            .select('standard_weekly_hours')
            .eq('id', projectRow.client_company_id)
            .single();
          stdWAZ = (comp as { standard_weekly_hours: number | null } | null)?.standard_weekly_hours ?? 40;
        }
        const pmBasis = projectRow?.pm_basis_weekly_hours ?? stdWAZ;

        // 3. Arbeitspakete des Projekts
        const { data: wps } = await supabase
          .from('v7_work_packages')
          .select('id, project_id, ap_code, ap_number, ap_sub_number, name, total_person_months, is_technical, start_date, end_date')
          .eq('project_id', projectId);
        const wpList = (wps as WorkPackage[] | null) || [];
        const wpIds = wpList.map(w => w.id);

        // 4. Projekt-Zuordnungen (Team-Nummern)
        const { data: assigns } = await supabase
          .from('v7_project_assignments')
          .select('employee_id, employee_number')
          .eq('project_id', projectId);
        const teamNumbers = new Map<string, number>();
        const teamMemberIds = new Set<string>();
        (assigns || []).forEach((a: { employee_id: string; employee_number: number | null }) => {
          if (a.employee_id) {
            teamMemberIds.add(a.employee_id);
            if (a.employee_number !== null && a.employee_number !== undefined) {
              teamNumbers.set(a.employee_id, a.employee_number);
            }
          }
        });

        // 5. Team-Mitarbeiter laden (nur die dem Projekt zugeordneten)
        let teamList: Employee[] = [];
        if (teamMemberIds.size > 0) {
          const { data: emps } = await supabase
            .from('v7_employees')
            .select('id, first_name, last_name, display_name')
            .in('id', Array.from(teamMemberIds));
          teamList = (emps as Employee[] | null) || [];
        }
        // Sortierung: employee_number (fehlend = 9999), dann display_name
        teamList.sort((a, b) => {
          const nA = teamNumbers.get(a.id) ?? 9999;
          const nB = teamNumbers.get(b.id) ?? 9999;
          if (nA !== nB) return nA - nB;
          return (a.display_name || '').localeCompare(b.display_name || '');
        });

        // 6. Geplante Stunden je (AP, MA) ueber das ganze Team
        const plannedMap: Record<string, Record<string, number>> = {};
        if (wpIds.length > 0) {
          const { data: wpAssigns } = await supabase
            .from('v7_work_package_assignments')
            .select('work_package_id, employee_id, planned_person_months')
            .in('work_package_id', wpIds)
            .eq('is_active', true);
          const factor = hoursPerPM(pmBasis);
          (wpAssigns || []).forEach((a: { work_package_id: string; employee_id: string; planned_person_months: number | null }) => {
            const pm = a.planned_person_months || 0;
            if (a.work_package_id && a.employee_id && pm > 0) {
              if (!plannedMap[a.work_package_id]) plannedMap[a.work_package_id] = {};
              plannedMap[a.work_package_id][a.employee_id] =
                (plannedMap[a.work_package_id][a.employee_id] || 0) + pm * factor;
            }
          });
        }

        // 7. Projektweite Buchungen aus v7_timesheets (gesamt / je MA / je MA je Monat)
        const projBooked: Record<string, number> = {};
        const projBookedPerMa: Record<string, Record<string, number>> = {};
        const projBookedPerMaMonth: Record<string, Record<string, Record<string, number>>> = {};
        const { data: projEntries } = await supabase
          .from('v7_timesheets')
          .select('work_package_id, employee_id, hours, work_date')
          .eq('project_id', projectId)
          .eq('is_active', true)
          .eq('is_billable', true);
        (projEntries || []).forEach((e: { work_package_id: string | null; employee_id: string | null; hours: number | string | null; work_date: string | null }) => {
          if (e.work_package_id) {
            const h = parseFloat(String(e.hours)) || 0;
            if (h > 0) {
              projBooked[e.work_package_id] = (projBooked[e.work_package_id] || 0) + h;
              if (e.employee_id) {
                if (!projBookedPerMa[e.work_package_id]) projBookedPerMa[e.work_package_id] = {};
                projBookedPerMa[e.work_package_id][e.employee_id] =
                  (projBookedPerMa[e.work_package_id][e.employee_id] || 0) + h;
                const ym = typeof e.work_date === 'string' ? e.work_date.slice(0, 7) : '';
                if (ym) {
                  if (!projBookedPerMaMonth[e.work_package_id]) projBookedPerMaMonth[e.work_package_id] = {};
                  if (!projBookedPerMaMonth[e.work_package_id][e.employee_id]) projBookedPerMaMonth[e.work_package_id][e.employee_id] = {};
                  projBookedPerMaMonth[e.work_package_id][e.employee_id][ym] =
                    (projBookedPerMaMonth[e.work_package_id][e.employee_id][ym] || 0) + h;
                }
              }
            }
          }
        });

        if (cancelled) return;
        setProject(projectRow);
        setFirmStdWAZ(stdWAZ);
        setWorkPackages(wpList);
        setTeam(teamList);
        setPlannedHoursPerWpPerMa(plannedMap);
        setProjectBookedPerWP(projBooked);
        setProjectBookedPerWpPerMa(projBookedPerMa);
        setProjectBookedPerWpPerMaMonth(projBookedPerMaMonth);
        setExpandedAllApRows(new Set());
      } catch (err) {
        console.error('[ApStatusModal] Fehler beim Laden der AP-Status-Daten:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, projectId]);

  // --------------------------------------------------------------------------
  // Abgeleitete Werte (analog TimesheetForm)
  // --------------------------------------------------------------------------
  const isDurchfuehrbarkeitsstudie = project?.funding_format?.includes('DS') || false;
  const pmBasisWAZ = project?.pm_basis_weekly_hours ?? firmStdWAZ;

  const isTechnicalAP = (wp: WorkPackage | undefined | null): boolean => {
    if (!wp) return false;
    const val = wp.is_technical as unknown;
    if (val === true || val === 'true' || val === 'TRUE' || val === '1' || val === 1) return true;
    return false;
  };

  const compareApCode = (a: WorkPackage, b: WorkPackage): number => {
    const getCode = (wp: WorkPackage) =>
      wp.ap_code
        ? wp.ap_code.replace(/^AP\s*/i, '')
        : `${wp.ap_number}${wp.ap_sub_number ? `.${wp.ap_sub_number}` : ''}`;
    const aParts = getCode(a).split('.').map(Number);
    const bParts = getCode(b).split('.').map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const diff = (aParts[i] || 0) - (bParts[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };

  // Kurzlabel "V.Nachname" (Vorname-Initial . Nachname) fuer MA-Spalten.
  const maShortLabel = (emp: { first_name?: string | null; last_name?: string | null; display_name?: string | null } | undefined): string => {
    if (!emp) return '?';
    const ln = (emp.last_name || '').trim();
    const fn = (emp.first_name || '').trim();
    if (ln && fn) return `${fn.charAt(0)}.${ln}`;
    if (ln) return ln;
    const dn = (emp.display_name || '').trim();
    if (dn.includes(',')) {
      const parts = dn.split(',');
      const l = (parts[0] || '').trim();
      const f = (parts[1] || '').trim();
      return f ? `${f.charAt(0)}.${l}` : l;
    }
    return dn || '?';
  };

  // allApTeam: bereits sortiert in team; Fallback (kein Team) auf MA mit Plan-/Buchungsstunden.
  const allApTeam = useMemo(() => {
    if (team.length > 0) return team;
    const ids = new Set<string>();
    Object.values(plannedHoursPerWpPerMa).forEach(m => Object.keys(m).forEach(id => ids.add(id)));
    Object.values(projectBookedPerWpPerMa).forEach(m => Object.keys(m).forEach(id => ids.add(id)));
    // Ohne geladene Mitarbeiterstammdaten koennen hier nur IDs stehen; als
    // Minimal-Fallback als Pseudo-Employee mit display_name = ID-Kurzform.
    return Array.from(ids).map(id => ({ id, first_name: null, last_name: null, display_name: id.slice(0, 6) } as Employee));
  }, [team, plannedHoursPerWpPerMa, projectBookedPerWpPerMa]);

  // Rendert nichts, wenn nicht offen.
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div id="ap-status-print-area" className="bg-white rounded-lg shadow-xl p-6 max-w-[96vw] mx-4 w-fit max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            AP-Status {projectLabel || ''}
          </h3>
          <div className="flex items-center gap-2 ap-print-hide">
            {/* v1.0-4: Drucken / Als PDF sichern (Browser-Druckdialog) */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              title="AP-Status drucken oder als PDF sichern"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Drucken
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">l&auml;dt...</p>
        ) : (() => {
          const realAPs = workPackages
            .filter(wp => wp.total_person_months != null && wp.total_person_months > 0)
            .sort(compareApCode);
          if (realAPs.length === 0) {
            return (
              <p className="text-gray-500 text-sm">Keine Arbeitspakete mit geplanten Stunden vorhanden.</p>
            );
          }
          let sumPlanned = 0;
          let sumBooked = 0;
          const fmtMon = (d: string | null): string => {
            if (!d) return '?';
            const p = d.split('-');
            return p.length >= 2 ? `${p[1]}.${p[0]}` : d;
          };
          // MA-Spalten (ganzes Projekt-Team). Alle Werte in STUNDEN.
          // Reihenfolge je Gruppe = "gesamt" zuerst, dann MA-Spalten.
          const team = allApTeam;
          const lastMa = team.length - 1;
          const numCell = 'border px-1 py-1.5 text-center whitespace-nowrap';
          const totBase = 'border px-1 py-1.5 text-center whitespace-nowrap bg-gray-50 font-semibold';
          // Rahmen-Kanten der Gruppe (dick, gut sichtbar)
          const grpL = 'border-l-4 border-gray-500';                 // linke Kante (auf "gesamt")
          const grpR = 'border-r-4 border-gray-500';                 // rechte Kante (auf letzter MA)
          const grpB = 'border-b-4 border-gray-500';                 // untere Kante (Fusszeile)
          const grpTLR = 'border-t-4 border-l-4 border-r-4 border-gray-500'; // Kopf oben+seiten
          // "gesamt"-Zelle einer Gruppe: linke Kante, falls kein MA folgt auch rechte Kante
          const totHead = `border px-1 py-1 font-semibold text-gray-700 text-center bg-gray-100 ${grpL} ${team.length === 0 ? grpR : ''}`;
          const maHead = (i: number) => `border px-1 py-1 font-medium text-gray-600 align-bottom ${i === lastMa ? grpR : ''}`;
          const maNameDiv = 'max-w-[4.5rem] break-normal leading-tight text-center mx-auto';
          // offene Stunden (+) gruen, ueberbuchte (-) rot, 0 grau.
          const offenColor = (v: number) => v > 0 ? 'text-green-600 font-bold' : v < 0 ? 'text-red-600 font-bold' : 'text-gray-400';
          const r2 = (v: number) => Math.round(v * 100) / 100;
          // Monatslabel 'YYYY-MM' -> 'Mrz 26' (ASCII, deterministisch).
          const MON_ABK = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
          const fmtYm = (ym: string): string => {
            const p = ym.split('-');
            if (p.length < 2) return ym;
            const mi = parseInt(p[1], 10) - 1;
            return `${MON_ABK[mi] || p[1]} ${p[0].slice(-2)}`;
          };
          // sortierte Monatsliste je AP (nur Monate mit Buchungen).
          const monthsOfWp = (wpId: string): string[] => {
            const mm = projectBookedPerWpPerMaMonth[wpId] || {};
            const set = new Set<string>();
            Object.values(mm).forEach(perYm => Object.keys(perYm).forEach(ym => set.add(ym)));
            return Array.from(set).sort();
          };
          const toggleExpand = (wpId: string) => setExpandedAllApRows(prev => {
            const nx = new Set(prev);
            if (nx.has(wpId)) nx.delete(wpId); else nx.add(wpId);
            return nx;
          });
          // Spaltensummen je MA (fuer die Fusszeile)
          const colPlanned: Record<string, number> = {};
          const colBooked: Record<string, number> = {};
          team.forEach(e => {
            colPlanned[e.id] = realAPs.reduce((a, wp) => a + ((plannedHoursPerWpPerMa[wp.id] || {})[e.id] || 0), 0);
            colBooked[e.id] = realAPs.reduce((a, wp) => a + ((projectBookedPerWpPerMa[wp.id] || {})[e.id] || 0), 0);
          });
          return (
            <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-auto">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th rowSpan={2} className="border px-2 py-1.5 font-medium text-gray-700 align-bottom">AP</th>
                  <th rowSpan={2} className="border px-2 py-1.5 font-medium text-gray-700 align-bottom w-[11rem]">Bezeichnung</th>
                  <th rowSpan={2} className="border px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap align-bottom">Zeitraum (geplant)</th>
                  {isDurchfuehrbarkeitsstudie && (
                    <th rowSpan={2} className="border px-2 py-1.5 font-medium text-gray-700 text-center align-bottom">T/NT</th>
                  )}
                  <th colSpan={team.length + 1} className={`px-1 py-1.5 font-medium text-gray-700 text-center ${grpTLR}`}>geplant (h)</th>
                  <th colSpan={team.length + 1} className={`px-1 py-1.5 font-medium text-gray-700 text-center ${grpTLR}`}>gebucht (h)</th>
                  <th colSpan={team.length + 1} className={`px-1 py-1.5 font-medium text-gray-700 text-center ${grpTLR}`}>offen (h)</th>
                </tr>
                <tr className="bg-gray-50 text-center">
                  {/* geplant: gesamt zuerst, dann MA */}
                  <th className={totHead}>gesamt</th>
                  {team.map((e, i) => (
                    <th key={`hp-${e.id}`} className={maHead(i)}><div className={maNameDiv}>{maShortLabel(e)}</div></th>
                  ))}
                  {/* gebucht */}
                  <th className={totHead}>gesamt</th>
                  {team.map((e, i) => (
                    <th key={`hb-${e.id}`} className={maHead(i)}><div className={maNameDiv}>{maShortLabel(e)}</div></th>
                  ))}
                  {/* offen */}
                  <th className={totHead}>gesamt</th>
                  {team.map((e, i) => (
                    <th key={`ho-${e.id}`} className={maHead(i)}><div className={maNameDiv}>{maShortLabel(e)}</div></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {realAPs.map(wp => {
                  const apDisplay = wp.ap_code
                    ? wp.ap_code.replace(/^AP\s*/i, '')
                    : `${wp.ap_number}${wp.ap_sub_number ? `.${wp.ap_sub_number}` : ''}`;
                  const planned = (wp.total_person_months || 0) * hoursPerPM(pmBasisWAZ);
                  const booked = projectBookedPerWP[wp.id] || 0;
                  const offen = planned - booked;
                  const offenR = r2(offen);
                  const pMap = plannedHoursPerWpPerMa[wp.id] || {};
                  const bMap = projectBookedPerWpPerMa[wp.id] || {};
                  sumPlanned += planned;
                  sumBooked += booked;
                  const months = monthsOfWp(wp.id);
                  const expandable = showMonthly && months.length > 1;
                  // v1.0-5: im Druck alle mehrmonatigen APs aufgeklappt (printExpandAll).
                  const isOpen = expandable && (printExpandAll || expandedAllApRows.has(wp.id));
                  const mMap = projectBookedPerWpPerMaMonth[wp.id] || {};
                  return (
                    <React.Fragment key={wp.id}>
                    <tr className={`hover:bg-gray-50 ${expandable ? 'cursor-pointer' : ''}`} onClick={expandable ? () => toggleExpand(wp.id) : undefined}>
                      <td className="border px-2 py-1.5 whitespace-nowrap font-mono text-xs align-top" title={expandable ? 'Monatsaufschluesselung ein-/ausklappen' : undefined}>
                        {expandable && <span className="inline-block w-3 text-gray-500 select-none">{isOpen ? '\u25be' : '\u25b8'}</span>}{apDisplay}
                      </td>
                      <td className="border px-2 py-1.5 align-top w-[11rem] whitespace-normal break-words leading-tight">{wp.name}</td>
                      <td className="border px-2 py-1.5 whitespace-nowrap text-xs text-gray-600 align-top">
                        {(wp.start_date || wp.end_date) ? `${fmtMon(wp.start_date)} \u2013 ${fmtMon(wp.end_date)}` : '\u2014'}
                      </td>
                      {isDurchfuehrbarkeitsstudie && (
                        <td className="border px-2 py-1.5 text-center align-top">
                          {isTechnicalAP(wp)
                            ? <span className="text-green-700 font-bold text-xs">T</span>
                            : <span className="text-blue-700 font-bold text-xs">NT</span>}
                        </td>
                      )}
                      {/* geplant: gesamt zuerst, dann je MA */}
                      <td className={`${totBase} ${grpL} ${team.length === 0 ? grpR : ''}`}>{planned.toFixed(2)}</td>
                      {team.map((e, i) => { const v = pMap[e.id] || 0; return (
                        <td key={`p-${e.id}`} className={`${numCell} ${i === lastMa ? grpR : ''}`}>{v > 0 ? v.toFixed(2) : ''}</td>
                      ); })}
                      {/* gebucht */}
                      <td className={`${totBase} ${grpL} ${team.length === 0 ? grpR : ''}`}>{booked.toFixed(2)}</td>
                      {team.map((e, i) => {
                        const v = bMap[e.id] || 0;
                        // v1.0-2: bei einmonatigen APs ist der Monat eindeutig -> Direktsprung.
                        const jm = (onJumpToTimesheet && months.length === 1) ? months[0] : null;
                        return (
                          <td key={`b-${e.id}`}
                            className={`${numCell} ${i === lastMa ? grpR : ''} ${jm ? 'cursor-pointer hover:bg-blue-100 text-blue-700' : ''}`}
                            title={jm ? `Zur Zeiterfassung: ${maShortLabel(e)} ${fmtYm(jm)}` : undefined}
                            onClick={jm ? (ev) => { ev.stopPropagation(); jumpTo(e.id, jm); } : undefined}>
                            {v > 0 ? v.toFixed(2) : ''}
                          </td>
                        );
                      })}
                      {/* offen = geplant(MA) - gebucht(MA) */}
                      <td className={`${totBase} ${grpL} ${team.length === 0 ? grpR : ''}`}>
                        <span className={offenColor(offenR)}>{offenR.toFixed(2)}</span>
                      </td>
                      {team.map((e, i) => {
                        const pv = pMap[e.id] || 0; const bv = bMap[e.id] || 0;
                        const ov = r2(pv - bv);
                        const has = pv > 0 || bv > 0;
                        return (
                          <td key={`o-${e.id}`} className={`${numCell} ${i === lastMa ? grpR : ''}`}>
                            {has ? <span className={offenColor(ov)}>{ov.toFixed(2)}</span> : ''}
                          </td>
                        );
                      })}
                    </tr>
                    {/* Monatsaufschluesselung (gebucht je MA je Monat) fuer mehrmonatige APs */}
                    {isOpen && months.map(ym => {
                      const monthTotal = team.reduce((a, e) => a + ((mMap[e.id] || {})[ym] || 0), 0);
                      return (
                        <tr key={`${wp.id}-${ym}`} className="bg-blue-50 text-xs">
                          <td colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3} className="border px-2 py-1 text-right italic text-gray-500 whitespace-nowrap">{fmtYm(ym)}</td>
                          <td colSpan={team.length + 1} className={`border px-1 py-1 ${grpL} ${grpR}`}></td>
                          <td className={`${numCell} ${grpL} bg-gray-100 font-semibold`}>{monthTotal > 0 ? monthTotal.toFixed(2) : ''}</td>
                          {team.map((e, i) => {
                            const v = (mMap[e.id] || {})[ym] || 0;
                            const clickable = !!onJumpToTimesheet;
                            return (
                              <td key={`bm-${e.id}`}
                                className={`${numCell} ${i === lastMa ? grpR : ''} ${clickable ? 'cursor-pointer hover:bg-blue-100 text-blue-700' : ''}`}
                                title={clickable ? `Zur Zeiterfassung: ${maShortLabel(e)} ${fmtYm(ym)}` : undefined}
                                onClick={clickable ? () => jumpTo(e.id, ym) : undefined}>
                                {v > 0 ? v.toFixed(2) : ''}
                              </td>
                            );
                          })}
                          <td colSpan={team.length + 1} className={`border px-1 py-1 ${grpL} ${grpR}`}></td>
                        </tr>
                      );
                    })}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="border px-2 py-1.5" colSpan={isDurchfuehrbarkeitsstudie ? 4 : 3}>Gesamt</td>
                  {/* geplant */}
                  <td className={`${totBase} ${grpL} ${grpB} ${team.length === 0 ? grpR : ''}`}>{sumPlanned.toFixed(2)}</td>
                  {team.map((e, i) => (
                    <td key={`fp-${e.id}`} className={`${numCell} ${grpB} ${i === lastMa ? grpR : ''}`}>{colPlanned[e.id] > 0 ? colPlanned[e.id].toFixed(2) : ''}</td>
                  ))}
                  {/* gebucht */}
                  <td className={`${totBase} ${grpL} ${grpB} ${team.length === 0 ? grpR : ''}`}>{sumBooked.toFixed(2)}</td>
                  {team.map((e, i) => (
                    <td key={`fb-${e.id}`} className={`${numCell} ${grpB} ${i === lastMa ? grpR : ''}`}>{colBooked[e.id] > 0 ? colBooked[e.id].toFixed(2) : ''}</td>
                  ))}
                  {/* offen */}
                  <td className={`${totBase} ${grpL} ${grpB} ${team.length === 0 ? grpR : ''}`}>
                    {(() => { const g = r2(sumPlanned - sumBooked); return <span className={offenColor(g)}>{g.toFixed(2)}</span>; })()}
                  </td>
                  {team.map((e, i) => {
                    const ov = r2((colPlanned[e.id] || 0) - (colBooked[e.id] || 0));
                    const has = (colPlanned[e.id] || 0) > 0 || (colBooked[e.id] || 0) > 0;
                    return (
                      <td key={`fo-${e.id}`} className={`${numCell} ${grpB} ${i === lastMa ? grpR : ''}`}>
                        {has ? <span className={offenColor(ov)}>{ov.toFixed(2)}</span> : ''}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
            </div>
          );
        })()}

        <div className="flex justify-end mt-4 ap-print-hide">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
          >
            {'Schlie\u00dfen'}
          </button>
        </div>
      </div>
      {/* v1.0-10: Kein In-Place-Druck-CSS mehr. Gedruckt wird ueber ein eigenes, sauberes
          Druckfenster (siehe handlePrint), das nur die Tabelle enthaelt. */}
    </div>
  );
}
