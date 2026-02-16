'use client';

// ============================================================================
// BERATER-PORTAL: Firmen-Detail-Seite
// Version: 7.3.91-1
// Datum: 16. Februar 2026
// 
// Route: /v7/berater/foerderung/firma/[id]
// 
// TABS: Firmendaten | Projekte | Mitarbeiter | Zeiterfassung | Berichte
//
// FIX v7.3.91-1: Firmendaten-Bearbeiten implementiert (war nur TODO)
//                Modal mit allen Feldern, Speichern in DB
// FIX v7.3.88-9: onUpdate entfernt (nicht im EmployeeManagement Interface)
// FIX v7.3.88-8: canEdit=true an EmployeeManagement uebergeben (Bearbeiten-Buttons)
// FIX v7.3.88-5: Bei tab=berichte oder tab=zeiterfassung zur separaten Seite weiterleiten
// FIX v7.3.88-3: CompanyDataView ersetzt durch inline Firmendaten
// ============================================================================

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import ProjectList from '@/components/shared/ProjectList';
import EmployeeManagement from '@/components/shared/EmployeeManagement';
import { 
  ArrowLeft, 
  Building2, 
  FolderKanban, 
  Users,
  Clock,
  BarChart3,
  Pencil,
  X,
  Save
} from 'lucide-react';

// Tab-Definition - nur fuer Tabs die HIER angezeigt werden
type TabKey = 'firmendaten' | 'projekte' | 'mitarbeiter' | 'zeiterfassung' | 'berichte';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  isExternal?: boolean; // Fuer Tabs die zu separaten Seiten fuehren
}

// Firma-Interface
interface ClientCompany {
  id: string;
  name: string;
  short_name: string | null;
  street: string | null;
  zip_code: string | null;
  city: string | null;
  federal_state: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
}

// Bundesland-Namen
const BUNDESLAND_NAMES: Record<string, string> = {
  'DE-BW': 'Baden-Wuerttemberg',
  'DE-BY': 'Bayern',
  'DE-BE': 'Berlin',
  'DE-BB': 'Brandenburg',
  'DE-HB': 'Bremen',
  'DE-HH': 'Hamburg',
  'DE-HE': 'Hessen',
  'DE-MV': 'Mecklenburg-Vorpommern',
  'DE-NI': 'Niedersachsen',
  'DE-NW': 'Nordrhein-Westfalen',
  'DE-RP': 'Rheinland-Pfalz',
  'DE-SL': 'Saarland',
  'DE-SN': 'Sachsen',
  'DE-ST': 'Sachsen-Anhalt',
  'DE-SH': 'Schleswig-Holstein',
  'DE-TH': 'Thueringen',
};

export default function BeraterFirmaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const firmaId = params.id as string;
  
  // Tab aus URL - aber zeiterfassung/berichte werden weitergeleitet
  const tabFromUrl = searchParams.get('tab') as TabKey | null;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firma, setFirma] = useState<ClientCompany | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // activeTab - default firmendaten, aber NICHT zeiterfassung/berichte
  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (tabFromUrl === 'zeiterfassung' || tabFromUrl === 'berichte') {
      return 'firmendaten'; // Wird sofort weitergeleitet
    }
    return tabFromUrl || 'firmendaten';
  });

  // Firmendaten bearbeiten
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    short_name: '',
    street: '',
    zip_code: '',
    city: '',
    federal_state: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
  });

  // Tabs Konfiguration - ALLE 5 TABS
  const tabs: TabConfig[] = [
    { key: 'firmendaten', label: 'Firmendaten', icon: <Building2 className="w-4 h-4" /> },
    { key: 'projekte', label: 'Projekte', icon: <FolderKanban className="w-4 h-4" />, badge: projectCount },
    { key: 'mitarbeiter', label: 'Mitarbeiter', icon: <Users className="w-4 h-4" />, badge: employeeCount },
    { key: 'zeiterfassung', label: 'Zeiterfassung', icon: <Clock className="w-4 h-4" />, isExternal: true },
    { key: 'berichte', label: 'Berichte', icon: <BarChart3 className="w-4 h-4" />, isExternal: true },
  ];

  // Bei tab=zeiterfassung oder tab=berichte sofort weiterleiten
  useEffect(() => {
    if (tabFromUrl === 'zeiterfassung') {
      router.replace(`/v7/berater/foerderung/firma/${firmaId}/zeiterfassung`);
    } else if (tabFromUrl === 'berichte') {
      router.replace(`/v7/berater/foerderung/firma/${firmaId}/berichte`);
    }
  }, [tabFromUrl, firmaId, router]);

  useEffect(() => {
    loadData();
  }, [firmaId]);

  // Tab-Wechsel mit URL-Update
  const handleTabChange = (tab: TabKey) => {
    // Fuer Zeiterfassung und Berichte: Navigation zu separaten Seiten
    if (tab === 'zeiterfassung') {
      router.push(`/v7/berater/foerderung/firma/${firmaId}/zeiterfassung`);
      return;
    }
    if (tab === 'berichte') {
      router.push(`/v7/berater/foerderung/firma/${firmaId}/berichte`);
      return;
    }
    
    setActiveTab(tab);
    // URL aktualisieren fuer andere Tabs
    const newUrl = `/v7/berater/foerderung/firma/${firmaId}?tab=${tab}`;
    window.history.pushState({}, '', newUrl);
  };

  async function loadData() {
    try {
      setLoading(true);
      const supabase = createClient();

      // User-Profil laden
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('v7_user_profiles')
        .select('*')
        .eq('email', user.email)
        .single();

      if (!profile || (profile.role !== 'consultant' && profile.role !== 'system_admin')) {
        router.push('/v7/berater');
        return;
      }
      setUserProfile(profile);

      // Firmendaten laden
      const { data: firmaData, error: firmaError } = await supabase
        .from('v7_client_companies')
        .select('*')
        .eq('id', firmaId)
        .single();

      if (firmaError || !firmaData) {
        setError('Firma nicht gefunden');
        return;
      }
      setFirma(firmaData);

      // Projekt-Anzahl laden
      const { count: pCount } = await supabase
        .from('v7_projects')
        .select('*', { count: 'exact', head: true })
        .eq('client_company_id', firmaId);
      setProjectCount(pCount || 0);

      // Mitarbeiter-Anzahl laden
      const { count: eCount } = await supabase
        .from('v7_employees')
        .select('*', { count: 'exact', head: true })
        .eq('client_company_id', firmaId)
        .eq('is_active', true);
      setEmployeeCount(eCount || 0);

    } catch (err) {
      console.error('Fehler beim Laden:', err);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }

  // Zurueck zur Firmenliste
  const handleBack = () => {
    router.push('/v7/berater/foerderung');
  };

  // Bearbeiten starten
  const handleStartEdit = () => {
    if (!firma) return;
    setEditForm({
      name: firma.name || '',
      short_name: firma.short_name || '',
      street: firma.street || '',
      zip_code: firma.zip_code || '',
      city: firma.city || '',
      federal_state: firma.federal_state || 'DE-BW',
      contact_person: firma.contact_person || '',
      contact_email: firma.contact_email || '',
      contact_phone: firma.contact_phone || '',
    });
    setIsEditing(true);
  };

  // Bearbeiten abbrechen
  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Firmendaten speichern
  const handleSaveEdit = async () => {
    if (!firma) return;
    try {
      setSaving(true);
      const supabase = createClient();
      
      const { error: updateError } = await supabase
        .from('v7_client_companies')
        .update({
          name: editForm.name.trim(),
          short_name: editForm.short_name.trim() || null,
          street: editForm.street.trim() || null,
          zip_code: editForm.zip_code.trim() || null,
          city: editForm.city.trim() || null,
          federal_state: editForm.federal_state,
          contact_person: editForm.contact_person.trim() || null,
          contact_email: editForm.contact_email.trim() || null,
          contact_phone: editForm.contact_phone.trim() || null,
        })
        .eq('id', firma.id);

      if (updateError) {
        console.error('Fehler beim Speichern:', updateError);
        alert('Fehler beim Speichern: ' + updateError.message);
        return;
      }

      // Lokalen State aktualisieren
      setFirma({
        ...firma,
        name: editForm.name.trim(),
        short_name: editForm.short_name.trim() || null,
        street: editForm.street.trim() || null,
        zip_code: editForm.zip_code.trim() || null,
        city: editForm.city.trim() || null,
        federal_state: editForm.federal_state,
        contact_person: editForm.contact_person.trim() || null,
        contact_email: editForm.contact_email.trim() || null,
        contact_phone: editForm.contact_phone.trim() || null,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Fehler:', err);
      alert('Unerwarteter Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // Formular-Aenderung
  const handleEditChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // Datum formatieren
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE');
  };

  // Wenn tab=zeiterfassung oder tab=berichte, zeige Loading waehrend Weiterleitung
  if (tabFromUrl === 'zeiterfassung' || tabFromUrl === 'berichte') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002451]"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader 
          portal="berater"
          firmaName="Laden..."
          userName=""
          userRole="consultant"
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#002451]"></div>
        </div>
      </div>
    );
  }

  if (error || !firma) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PortalHeader 
          portal="berater"
          firmaName="Fehler"
          userName=""
          userRole="consultant"
        />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Firma nicht gefunden'}
          </div>
          <button
            onClick={handleBack}
            className="mt-4 text-[#002451] hover:underline flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurueck zur Firmenliste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - IMMER BLAU (Berater-Portal) */}
      <PortalHeader 
        portal="berater"
        firmaName={firma.name}
        userName={userProfile?.display_name || userProfile?.email || ''}
        userRole="consultant"
      />

      {/* Tab-Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 overflow-x-auto">
            {/* Zurueck-Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 py-4 text-gray-600 hover:text-[#002451] whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurueck
            </button>

            {/* Tabs */}
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 py-4 border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.key && !tab.isExternal
                    ? 'border-[#002451] text-[#002451]'
                    : 'border-transparent text-gray-600 hover:text-[#002451] hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab-Inhalt */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* FIRMENDATEN - Inline */}
        {activeTab === 'firmendaten' && firma && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Firmendaten</h2>
              {!isEditing && (
                <button 
                  className="flex items-center gap-2 text-[#002451] hover:text-[#003366]"
                  onClick={handleStartEdit}
                >
                  <Pencil className="w-4 h-4" />
                  Bearbeiten
                </button>
              )}
            </div>

            {/* ANZEIGE-MODUS */}
            {!isEditing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Linke Spalte */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Building2 className="w-4 h-4" />
                      Firmenname
                    </div>
                    <div className="text-gray-900 font-medium">{firma.name}</div>
                    {firma.short_name && (
                      <div className="text-sm text-gray-500">Kuerzel: {firma.short_name}</div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm text-gray-500 mb-1">Adresse</div>
                    <div className="text-gray-900">
                      {firma.street && <div>{firma.street}</div>}
                      {(firma.zip_code || firma.city) && (
                        <div>{firma.zip_code} {firma.city}</div>
                      )}
                      {firma.federal_state && (
                        <div className="text-gray-600">
                          {BUNDESLAND_NAMES[firma.federal_state] || firma.federal_state}
                        </div>
                      )}
                      {!firma.street && !firma.zip_code && !firma.city && '-'}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500 mb-1">Angelegt am</div>
                    <div className="text-gray-900">{formatDate(firma.created_at)}</div>
                  </div>
                </div>

                {/* Rechte Spalte */}
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Ansprechpartner</div>
                    <div className="text-gray-900">{firma.contact_person || '-'}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500 mb-1">Telefon</div>
                    <div className="text-gray-900">{firma.contact_phone || '-'}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-500 mb-1">E-Mail</div>
                    {firma.contact_email ? (
                      <a 
                        href={`mailto:${firma.contact_email}`}
                        className="text-[#002451] hover:underline"
                      >
                        {firma.contact_email}
                      </a>
                    ) : (
                      <div className="text-gray-900">-</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* BEARBEITEN-MODUS */}
            {isEditing && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Firmenname */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Firmenname *
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => handleEditChange('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={saving}
                    />
                  </div>

                  {/* Kuerzel */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kuerzel
                    </label>
                    <input
                      type="text"
                      value={editForm.short_name}
                      onChange={(e) => handleEditChange('short_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={saving}
                    />
                  </div>

                  {/* Strasse */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Strasse
                    </label>
                    <input
                      type="text"
                      value={editForm.street}
                      onChange={(e) => handleEditChange('street', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={saving}
                    />
                  </div>

                  {/* PLZ + Ort */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PLZ
                      </label>
                      <input
                        type="text"
                        value={editForm.zip_code}
                        onChange={(e) => handleEditChange('zip_code', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={saving}
                        maxLength={5}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ort
                      </label>
                      <input
                        type="text"
                        value={editForm.city}
                        onChange={(e) => handleEditChange('city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={saving}
                      />
                    </div>
                  </div>

                  {/* Bundesland */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bundesland
                    </label>
                    <select
                      value={editForm.federal_state}
                      onChange={(e) => handleEditChange('federal_state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={saving}
                    >
                      {Object.entries(BUNDESLAND_NAMES).map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ansprechpartner */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ansprechpartner
                    </label>
                    <input
                      type="text"
                      value={editForm.contact_person}
                      onChange={(e) => handleEditChange('contact_person', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={saving}
                    />
                  </div>

                  {/* Telefon */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="text"
                      value={editForm.contact_phone}
                      onChange={(e) => handleEditChange('contact_phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={saving}
                    />
                  </div>

                  {/* E-Mail */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-Mail
                    </label>
                    <input
                      type="email"
                      value={editForm.contact_email}
                      onChange={(e) => handleEditChange('contact_email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Abbrechen
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving || !editForm.name.trim()}
                    className="flex items-center gap-2 px-4 py-2 text-white bg-[#002451] hover:bg-[#003366] rounded-lg disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Speichern...' : 'Speichern'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROJEKTE */}
        {activeTab === 'projekte' && (
          <ProjectList 
            companyId={firmaId}
            portal="berater"
          />
        )}

        {/* MITARBEITER */}
        {activeTab === 'mitarbeiter' && (
          <EmployeeManagement
            companyId={firmaId}
            portal="berater"
            canEdit={true}
          />
        )}
      </div>
    </div>
  );
}
