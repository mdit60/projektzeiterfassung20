'use client';

// src/components/shared/FirmaCockpit.tsx
// ============================================================================
// SHARED COMPONENT: FirmaCockpit
// Version: 7.4.9-1
// Datum: 8. Mai 2026
//
// Firma-Cockpit als MIS (Management Information System)
// Zeigt alle relevanten Informationen einer Firma auf einen Blick.
//
// Verwendung:
//   - Berater-Portal: /v7/berater/foerderung/firma/[id]
//     (ersetzt die bisherige Tab-basierte Berater-Firma-Detailseite)
//   - Firmen-Portal:  /v7/firma/cockpit (Landing Page fuer Firmen-Admin)
//
// Props:
//   firmaId  : string              - ID der Kundenfirma
//   portal   : 'berater' | 'firma' - steuert Farbe (blau/gruen)
//
// Layout: 3 Spalten (responsive: stacked auf Mobile)
//   Links:  Firmenkopf + Mitarbeiter-Uebersicht
//   Mitte:  Projekt-Karten
//   Rechts: Finanzen (ZA-Uebersicht + Summen)
//
// v7.4.9-1: Erstversion - Grundgeruest mit Live-Daten
// ============================================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Building2,
  Users,
  FolderKanban,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Banknote,
  Clock,
  CheckCircle,
  FileText,
  BarChart3,
} from 'lucide-react';

// ============================================================================
// KONSTANTEN
// ============================================================================

const PORTAL_PRIMARY: Record<string, string> = {
  berater: '#002451',
  firma: '#65A655',
};

const ZA_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Entwurf': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  'Eingereicht': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Bewilligt': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
};

const FUNDING_FORMAT_LABELS: Record<string, string> = {
  'ZIM_EINZEL': 'ZIM Einzel',
  'ZIM_KOOPERATION': 'ZIM Koop.',
  'ZIM_NETZWERK': 'ZIM NWM',
  'BMBF_KMU': 'BMBF/KMU-innov.',
  'FORSCHUNGSZULAGE': 'FZul',
};

// ============================================================================
// TYPEN
// ============================================================================

interface FirmaCockpitProps {
  firmaId: string;
  portal: 'berater' | 'firma';
}

interface FirmaData {
  id: string;
  name: string;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  federal_state: string | null;
  holiday_region: string | null;
  standard_weekly_hours: number | null;
}

interface ProjektData {
  id: string;
  name: string;
  short_name: string | null;
  funding_reference: string | null;
  funding_format: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

interface MitarbeiterData {
  id: string;
  display_name: string;
  position_title: string | null;
  portal_role: string | null;
  weekly_hours: number | null;
  is_active: boolean;
  projekte: string[]; // Projektnamen
}

interface ZAData {
  id: string;
  project_id: string;
  za_nummer: number;
  zeitraum_von: string | null;
  zeitraum_bis: string | null;
  status: string;
  foerderbetrag_gesamt: number | null;
  zahlungseingang_datum: string | null;
  zahlungseingang_betrag: number | null;
  zahlungseingang_kommentar: string | null;
  eingereicht_am: string | null;
  projekt_name?: string;
  projekt_fkz?: string;
}

// ============================================================================
// HILFSFUNKTIONEN
// ============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' });
}

function formatEuro(betrag: number | null): string {
  if (betrag == null) return '-';
  return betrag.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
}

function formatLaufzeit(start: string | null, end: string | null): string {
  if (!start || !end) return '-';
  return formatDateShort(start) + ' - ' + formatDateShort(end);
}

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function FirmaCockpit({ firmaId, portal }: FirmaCockpitProps) {
  const router = useRouter();
  const supabase = createClient();
  const primaryColor = PORTAL_PRIMARY[portal] || PORTAL_PRIMARY.berater;

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firma, setFirma] = useState<FirmaData | null>(null);
  const [projekte, setProjekte] = useState<ProjektData[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<MitarbeiterData[]>([]);
  const [zaList, setZaList] = useState<ZAData[]>([]);
  const [showInactiveProjekte, setShowInactiveProjekte] = useState(false);

  // ==========================================================================
  // DATEN LADEN
  // ==========================================================================

  useEffect(() => {
    loadCockpitData();
  }, [firmaId]);

  async function loadCockpitData() {
    try {
      setLoading(true);
      setError(null);

      // 1. Firmendaten
      const { data: firmaDB, error: firmaErr } = await supabase
        .from('v7_client_companies')
        .select('id, name, contact_person, contact_phone, contact_email, federal_state, holiday_region, standard_weekly_hours')
        .eq('id', firmaId)
        .single();

      if (firmaErr || !firmaDB) {
        setError('Firmendaten konnten nicht geladen werden.');
        return;
      }
      setFirma(firmaDB);

      // 2. Projekte
      const { data: projektDB } = await supabase
        .from('v7_projects')
        .select('id, name, short_name, funding_reference, funding_format, start_date, end_date, is_active')
        .eq('client_company_id', firmaId)
        .order('is_active', { ascending: false })
        .order('start_date', { ascending: false });

      setProjekte(projektDB || []);

      // 3. Mitarbeiter mit Projekt-Zuordnungen
      const { data: maDB } = await supabase
        .from('v7_employees')
        .select('id, display_name, position_title, portal_role, weekly_hours, is_active')
        .eq('client_company_id', firmaId)
        .eq('is_active', true)
        .order('display_name');

      // Projekt-Zuordnungen fuer jeden MA laden
      const maList: MitarbeiterData[] = [];
      if (maDB && projektDB) {
        for (const ma of maDB) {
          // Aktive AP-Zuordnungen finden
          const { data: wpaDB } = await supabase
            .from('v7_work_package_assignments')
            .select('work_package_id, is_active, v7_work_packages!inner(project_id)')
            .eq('employee_id', ma.id)
            .eq('is_active', true);

          const projektIds = new Set<string>();
          if (wpaDB) {
            for (const wpa of wpaDB) {
              const wp = wpa.v7_work_packages as any;
              if (wp?.project_id) {
                projektIds.add(wp.project_id);
              }
            }
          }

          const projektNamen = (projektDB || [])
            .filter(p => projektIds.has(p.id) && p.is_active)
            .map(p => p.short_name || p.name);

          maList.push({
            ...ma,
            projekte: projektNamen,
          });
        }
      }
      setMitarbeiter(maList);

      // 4. ZA-Uebersicht (alle Projekte dieser Firma)
      if (projektDB && projektDB.length > 0) {
        const projektIds = projektDB.map(p => p.id);
        const { data: zaDB } = await supabase
          .from('v7_zahlungsanforderungen')
          .select('id, project_id, za_nummer, zeitraum_von, zeitraum_bis, status, foerderbetrag_gesamt, zahlungseingang_datum, zahlungseingang_betrag, zahlungseingang_kommentar, eingereicht_am')
          .in('project_id', projektIds)
          .order('eingereicht_am', { ascending: false });

        const zaWithProjekt = (zaDB || []).map(za => {
          const proj = projektDB.find(p => p.id === za.project_id);
          return {
            ...za,
            projekt_name: proj?.short_name || proj?.name || '-',
            projekt_fkz: proj?.funding_reference || '-',
          };
        });
        setZaList(zaWithProjekt);
      }

    } catch (err) {
      console.error('Cockpit loadData error:', err);
      setError('Unerwarteter Fehler beim Laden des Cockpits.');
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  function handleBack() {
    if (portal === 'berater') {
      router.push('/v7/berater/foerderung');
    } else {
      router.push('/v7/firma/dashboard');
    }
  }

  function handleProjektClick(projektId: string) {
    if (portal === 'berater') {
      router.push(`/v7/berater/foerderung/firma/${firmaId}/projekt/${projektId}`);
    } else {
      router.push(`/v7/firma/projekte/${projektId}`);
    }
  }

  function handleZEClick(projektId: string) {
    if (portal === 'berater') {
      router.push(`/v7/berater/foerderung/firma/${firmaId}/zeiterfassung?projekt=${projektId}`);
    } else {
      router.push(`/v7/firma/zeiterfassung?projekt=${projektId}`);
    }
  }

  function handleBerichteClick(projektId: string) {
    if (portal === 'berater') {
      router.push(`/v7/berater/foerderung/firma/${firmaId}/berichte?projekt=${projektId}`);
    } else {
      router.push(`/v7/firma/berichte?projekt=${projektId}`);
    }
  }

  // ==========================================================================
  // BERECHNUNGEN
  // ==========================================================================

  const aktiveProjekte = projekte.filter(p => p.is_active);
  const inaktiveProjekte = projekte.filter(p => !p.is_active);

  const zaAngefordert = zaList
    .filter(z => z.status !== 'Entwurf')
    .reduce((sum, z) => sum + (z.foerderbetrag_gesamt || 0), 0);

  const zaEingegangen = zaList
    .reduce((sum, z) => sum + (z.zahlungseingang_betrag || 0), 0);

  const zaOffen = zaAngefordert - zaEingegangen;

  // ==========================================================================
  // RENDER: LOADING / ERROR
  // ==========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (error || !firma) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span>{error || 'Firma nicht gefunden.'}</span>
        </div>
        <button
          onClick={handleBack}
          className="mt-4 hover:underline flex items-center gap-2 text-sm"
          style={{ color: primaryColor }}
        >
          <ArrowLeft className="w-4 h-4" />
          Zurueck
        </button>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: COCKPIT
  // ==========================================================================

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Kopfzeile: Zurueck + Firmenname */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">
            {portal === 'berater' ? 'Kundenfirmen' : 'Dashboard'}
          </span>
        </button>
        <div className="h-5 w-px bg-gray-300" />
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5" style={{ color: primaryColor }} />
          {firma.name}
        </h1>
      </div>

      {/* 3-Spalten Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ================================================================ */}
        {/* LINKE SPALTE: Firmenkopf + Mitarbeiter (4 von 12 Spalten)        */}
        {/* ================================================================ */}
        <div className="lg:col-span-4 space-y-6">

          {/* --- Firmenkopf --- */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: primaryColor }}
            >
              Firmendaten
            </h2>

            <div className="space-y-3 text-sm">
              {firma.contact_person && (
                <div className="flex items-start gap-3">
                  <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{firma.contact_person}</span>
                </div>
              )}
              {firma.contact_phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <a href={`tel:${firma.contact_phone}`} className="text-gray-700 hover:underline">
                    {firma.contact_phone}
                  </a>
                </div>
              )}
              {firma.contact_email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <a href={`mailto:${firma.contact_email}`} className="text-gray-700 hover:underline break-all">
                    {firma.contact_email}
                  </a>
                </div>
              )}
              {firma.federal_state && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    {firma.federal_state}
                    {firma.holiday_region && (
                      <span className="text-gray-400 ml-1">({firma.holiday_region})</span>
                    )}
                  </span>
                </div>
              )}
              {firma.standard_weekly_hours != null && (
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">
                    {String(firma.standard_weekly_hours).replace('.', ',')} h/Woche Regelarbeitszeit
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* --- Mitarbeiter --- */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              <Users className="w-4 h-4" />
              Mitarbeiter ({mitarbeiter.length})
            </h2>

            {mitarbeiter.length === 0 ? (
              <p className="text-sm text-gray-400">Keine aktiven Mitarbeiter.</p>
            ) : (
              <div className="space-y-3">
                {mitarbeiter.map(ma => (
                  <div key={ma.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {ma.display_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {ma.weekly_hours != null ? `${String(ma.weekly_hours).replace('.', ',')}h` : '-'}
                      </span>
                    </div>
                    {ma.position_title && (
                      <span className="text-xs text-gray-500">{ma.position_title}</span>
                    )}
                    {ma.projekte.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ma.projekte.map((pName, idx) => (
                          <span
                            key={idx}
                            className="inline-block text-xs px-2 py-0.5 rounded-full border"
                            style={{
                              color: primaryColor,
                              borderColor: primaryColor + '40',
                              backgroundColor: primaryColor + '10',
                            }}
                          >
                            {pName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ================================================================ */}
        {/* MITTLERE SPALTE: Projekte (4 von 12 Spalten)                    */}
        {/* ================================================================ */}
        <div className="lg:col-span-4 space-y-6">

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              <FolderKanban className="w-4 h-4" />
              Aktive Projekte ({aktiveProjekte.length})
            </h2>

            {aktiveProjekte.length === 0 ? (
              <p className="text-sm text-gray-400">Keine aktiven Projekte.</p>
            ) : (
              <div className="space-y-4">
                {aktiveProjekte.map(projekt => (
                  <div
                    key={projekt.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                  >
                    {/* FKZ + Format */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-gray-500">
                        {projekt.funding_reference || 'Kein FKZ'}
                      </span>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          color: primaryColor,
                          backgroundColor: primaryColor + '15',
                        }}
                      >
                        {FUNDING_FORMAT_LABELS[projekt.funding_format] || projekt.funding_format}
                      </span>
                    </div>

                    {/* Projektname */}
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 leading-snug">
                      {projekt.short_name || projekt.name}
                    </h3>

                    {/* Laufzeit */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatLaufzeit(projekt.start_date, projekt.end_date)}
                    </div>

                    {/* Direktlinks */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleProjektClick(projekt.id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        Arbeitsplan
                      </button>
                      <button
                        onClick={() => handleZEClick(projekt.id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <Clock className="w-3 h-3" />
                        Zeiterfassung
                      </button>
                      <button
                        onClick={() => handleBerichteClick(projekt.id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <BarChart3 className="w-3 h-3" />
                        Berichte
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inaktive Projekte ausklappbar */}
            {inaktiveProjekte.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowInactiveProjekte(!showInactiveProjekte)}
                  className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showInactiveProjekte ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {inaktiveProjekte.length} abgeschlossene Projekte
                </button>

                {showInactiveProjekte && (
                  <div className="mt-3 space-y-2">
                    {inaktiveProjekte.map(projekt => (
                      <div
                        key={projekt.id}
                        className="border border-gray-100 rounded-lg p-3 bg-gray-50 opacity-70"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-gray-400">
                            {projekt.funding_reference || '-'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {FUNDING_FORMAT_LABELS[projekt.funding_format] || projekt.funding_format}
                          </span>
                        </div>
                        <h3 className="text-sm text-gray-600">
                          {projekt.short_name || projekt.name}
                        </h3>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatLaufzeit(projekt.start_date, projekt.end_date)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* RECHTE SPALTE: Finanzen (4 von 12 Spalten)                      */}
        {/* ================================================================ */}
        <div className="lg:col-span-4 space-y-6">

          {/* Summen-Karten */}
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2
                className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2"
                style={{ color: primaryColor }}
              >
                <Banknote className="w-4 h-4" />
                Finanzen
              </h2>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xs text-blue-600 font-medium mb-1">Angefordert</div>
                  <div className="text-sm font-bold text-blue-800">
                    {formatEuro(zaAngefordert)}
                  </div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xs text-green-600 font-medium mb-1">Eingegangen</div>
                  <div className="text-sm font-bold text-green-800">
                    {formatEuro(zaEingegangen)}
                  </div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <div className="text-xs text-amber-600 font-medium mb-1">Offen</div>
                  <div className="text-sm font-bold text-amber-800">
                    {formatEuro(zaOffen > 0 ? zaOffen : 0)}
                  </div>
                </div>
              </div>

              {/* ZA-Liste */}
              {zaList.length === 0 ? (
                <p className="text-sm text-gray-400">Keine Zahlungsanforderungen vorhanden.</p>
              ) : (
                <div className="space-y-2">
                  {zaList.map(za => {
                    const statusStyle = ZA_STATUS_COLORS[za.status] || ZA_STATUS_COLORS['Entwurf'];
                    return (
                      <div
                        key={za.id}
                        className={`border rounded-lg p-3 ${statusStyle.border}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-900">
                            {za.projekt_fkz} / ZA {za.za_nummer}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                            {za.status}
                          </span>
                        </div>

                        <div className="text-xs text-gray-500 mb-1">
                          {za.zeitraum_von && za.zeitraum_bis
                            ? formatDateShort(za.zeitraum_von) + ' - ' + formatDateShort(za.zeitraum_bis)
                            : '-'}
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">
                            Betrag: <span className="font-medium">{formatEuro(za.foerderbetrag_gesamt)}</span>
                          </span>
                          {za.zahlungseingang_betrag != null && za.zahlungseingang_betrag > 0 && (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {formatEuro(za.zahlungseingang_betrag)}
                            </span>
                          )}
                        </div>

                        {za.zahlungseingang_kommentar && (
                          <div className="text-xs text-gray-400 mt-1 italic">
                            {za.zahlungseingang_kommentar}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
