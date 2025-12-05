// ========================================
// Datei: src/app/mitarbeiter/page.tsx
// ========================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Employee {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  job_function: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
  deactivated_at: string | null;
}

export default function MitarbeiterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [inviteData, setInviteData] = useState({
    firstName: '',
    lastName: '',
    emailPrefix: '',
    password: '',
    position: '',
    department: '',
    role: 'user'
  });
  const [companyDomain, setCompanyDomain] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        setError('Profil konnte nicht geladen werden');
        return;
      }

      setProfile(profileData);

      // Domain aus Admin-E-Mail extrahieren
      if (profileData.email) {
        const emailParts = profileData.email.split('@');
        if (emailParts.length === 2) {
          setCompanyDomain(emailParts[1]);
        }
      }

      // Nur Admin darf Mitarbeiter verwalten
      if (profileData.role === 'user') {
        router.push('/dashboard');
        return;
      }

      const { data: employeesData, error: employeesError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('company_id', profileData.company_id)
        .order('created_at', { ascending: false });

      if (employeesError) {
        console.error('Error loading employees:', employeesError);
        setError('Mitarbeiter konnten nicht geladen werden');
      } else {
        setEmployees(employeesData || []);
      }

    } catch (error: any) {
      console.error('Error loading data:', error);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = employee.is_active ? '/api/employees/deactivate' : '/api/employees/activate';
      const action = employee.is_active ? 'deaktiviert' : 'aktiviert';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employee.id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Fehler beim ${action === 'aktiviert' ? 'Aktivieren' : 'Deaktivieren'}`);
      }

      setSuccess(`${employee.name} wurde ${action}`);
      loadData();

    } catch (error: any) {
      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEmployee) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/employees/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmployee.id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Löschen');
      }

      setSuccess(`${selectedEmployee.name} wurde gelöscht`);
      setShowDeleteModal(false);
      setSelectedEmployee(null);
      loadData();

    } catch (error: any) {
      setError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Modal schließen und Meldungen zurücksetzen
  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setError('');
    setSuccess('');
    setInviteData({
      firstName: '',
      lastName: '',
      emailPrefix: '',
      password: '',
      position: '',
      department: '',
      role: 'user'
    });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInviting(true);

    let adminSession: any = null;

    try {
      if (!inviteData.firstName.trim() || !inviteData.lastName.trim() || !inviteData.emailPrefix.trim() || !inviteData.password.trim()) {
        throw new Error('Bitte füllen Sie alle Pflichtfelder aus');
      }

      // Vollständiger Name für Anzeige
      const fullName = `${inviteData.firstName.trim()} ${inviteData.lastName.trim()}`;

      // Vollständige E-Mail zusammensetzen
      const fullEmail = companyDomain 
        ? `${inviteData.emailPrefix.trim()}@${companyDomain}`.toLowerCase()
        : inviteData.emailPrefix.trim().toLowerCase();

      if (inviteData.password.length < 6) {
        throw new Error('Passwort muss mindestens 6 Zeichen lang sein');
      }

      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', fullEmail)
        .eq('company_id', profile.company_id)
        .maybeSingle();

      if (existingProfile) {
        throw new Error('Ein Mitarbeiter mit dieser E-Mail existiert bereits');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Keine aktive Session gefunden');
      }
      adminSession = {
        access_token: session.access_token,
        refresh_token: session.refresh_token
      };

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: fullEmail,
        password: inviteData.password,
        options: {
          data: {
            name: fullName,
            first_name: inviteData.firstName.trim(),
            last_name: inviteData.lastName.trim(),
            role: inviteData.role
          }
        }
      });

      if (authError) {
        throw new Error(`Fehler beim Erstellen des Accounts: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('User konnte nicht erstellt werden');
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token
      });

      if (sessionError) {
        throw new Error('Admin-Session konnte nicht wiederhergestellt werden');
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          user_id: authData.user.id,
          company_id: profile.company_id,
          role: inviteData.role,
          name: fullName,
          first_name: inviteData.firstName.trim(),
          last_name: inviteData.lastName.trim(),
          email: fullEmail,
          job_function: inviteData.position.trim() || null,
          department: inviteData.department.trim() || null,
          is_active: true
        }]);

      if (profileError) {
        throw new Error('Fehler beim Erstellen des Profils');
      }

      setSuccess(`${fullName} wurde erfolgreich eingeladen!`);
      
      // Formular zurücksetzen
      setInviteData({
        firstName: '',
        lastName: '',
        emailPrefix: '',
        password: '',
        position: '',
        department: '',
        role: 'user'
      });

      // Modal nach 2 Sekunden schließen und Daten neu laden
      setTimeout(() => {
        setShowInviteModal(false);
        setSuccess('');
        loadData();
      }, 2000);

    } catch (error: any) {
      setError(error.message || 'Fehler beim Einladen des Mitarbeiters');
      
      if (adminSession) {
        try {
          await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token
          });
        } catch (restoreError) {
          console.error('Failed to restore session:', restoreError);
        }
      }
    } finally {
      setInviting(false);
    }
  };

  // Position oder Fallback auf Rolle anzeigen
  const getDisplayPosition = (employee: Employee) => {
    if (employee.job_function) {
      return employee.job_function;
    }
    // Fallback auf Rolle wenn keine Position gesetzt
    return employee.role === 'admin' ? 'Administrator' : 'Mitarbeiter';
  };

  const getRoleBadgeColor = (role: string) => {
    return role === 'admin' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 mb-2">Laden...</div>
          <div className="text-sm text-gray-600">Mitarbeiter werden geladen</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Zurück zum Dashboard</span>
              </button>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">{profile?.name}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mitarbeiter</h1>
            <p className="text-gray-600">Verwalten Sie Ihr Team und Rollen</p>
          </div>
          {profile?.role === 'admin' && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Mitarbeiter einladen
            </button>
          )}
        </div>

        {/* Messages - nur außerhalb des Modals anzeigen wenn Modal geschlossen */}
        {!showInviteModal && error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!showInviteModal && success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Mitarbeiter-Liste */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">
              Alle Mitarbeiter ({employees.length})
            </h2>
          </div>

          {employees.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-lg font-medium mb-2">Noch keine Mitarbeiter</p>
              <p className="text-sm">Laden Sie Ihr erstes Teammitglied ein</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {employees.map((employee) => (
                <div key={employee.id} className={`px-6 py-4 ${!employee.is_active ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'} transition-colors`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Avatar */}
                      <div className={`w-12 h-12 ${employee.is_active ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gray-400'} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Info */}
                      <div>
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900">{employee.name}</h3>
                          {!employee.is_active && (
                            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded font-medium">
                              Deaktiviert
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{employee.email}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-3">
                      {/* Position statt Rolle anzeigen */}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(employee.role)}`}>
                        {getDisplayPosition(employee)}
                      </span>
                      
                      {profile?.role === 'admin' && employee.user_id !== user.id && (
                        <div className="flex items-center space-x-2">
                          {/* Bearbeiten */}
                          <button
                            onClick={() => router.push(`/mitarbeiter/detail?id=${employee.id}`)}
                            className="text-blue-600 hover:text-blue-700 p-2 rounded hover:bg-blue-50"
                            title="Bearbeiten"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Aktivieren/Deaktivieren */}
                          <button
                            onClick={() => handleToggleActive(employee)}
                            disabled={actionLoading}
                            className={`p-2 rounded ${
                              employee.is_active 
                                ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' 
                                : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                            }`}
                            title={employee.is_active ? 'Deaktivieren' : 'Aktivieren'}
                          >
                            {employee.is_active ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>

                          {/* Löschen (nur Admin) */}
                          {profile?.role === 'admin' && (
                            <button
                              onClick={() => handleDeleteClick(employee)}
                              disabled={actionLoading}
                              className="text-red-600 hover:text-red-700 p-2 rounded hover:bg-red-50"
                              title="Löschen"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500 ml-16">
                    {employee.department && <span className="mr-3">{employee.department}</span>}
                    Mitglied seit {new Date(employee.created_at).toLocaleDateString('de-DE')}
                    {!employee.is_active && employee.deactivated_at && (
                      <span className="ml-3">
                        • Deaktiviert am {new Date(employee.deactivated_at).toLocaleDateString('de-DE')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Mitarbeiter löschen?</h3>
                <p className="text-sm text-gray-600">Diese Aktion kann nicht rückgängig gemacht werden</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                Möchten Sie <strong>{selectedEmployee.name}</strong> wirklich permanent löschen?
              </p>
              <p className="text-xs text-gray-500 mt-2">
                • Profil wird gelöscht<br />
                • Account wird gelöscht<br />
                • Login nicht mehr möglich
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedEmployee(null);
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:bg-gray-400"
              >
                {actionLoading ? 'Wird gelöscht...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal - mit Position und Abteilung */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Mitarbeiter einladen</h3>
              <button
                onClick={handleCloseInviteModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Fehler/Erfolg IM Modal anzeigen */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
                  <input
                    type="text"
                    value={inviteData.firstName}
                    onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Max"
                    required
                    disabled={!!success}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
                  <input
                    type="text"
                    value={inviteData.lastName}
                    onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Mustermann"
                    required
                    disabled={!!success}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
                {companyDomain ? (
                  <div className="flex">
                    <input
                      type="text"
                      value={inviteData.emailPrefix}
                      onChange={(e) => setInviteData({ ...inviteData, emailPrefix: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="max.mustermann"
                      required
                      disabled={!!success}
                    />
                    <span className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 bg-gray-100 text-gray-600 rounded-r-lg">
                      @{companyDomain}
                    </span>
                  </div>
                ) : (
                  <input
                    type="email"
                    value={inviteData.emailPrefix}
                    onChange={(e) => setInviteData({ ...inviteData, emailPrefix: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="max.mustermann@firma.de"
                    required
                    disabled={!!success}
                  />
                )}
                {companyDomain && (
                  <p className="mt-1 text-xs text-gray-500">
                    Domain wird automatisch aus Ihrer E-Mail übernommen
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Temporäres Passwort *</label>
                <input
                  type="text"
                  value={inviteData.password}
                  onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Mind. 6 Zeichen"
                  minLength={6}
                  required
                  disabled={!!success}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Teilen Sie dieses Passwort dem Mitarbeiter mit
                </p>
              </div>

              {/* Neue Felder: Position und Abteilung */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position / Funktion</label>
                  <input
                    type="text"
                    value={inviteData.position}
                    onChange={(e) => setInviteData({ ...inviteData, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="z.B. Entwickler"
                    disabled={!!success}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abteilung</label>
                  <input
                    type="text"
                    value={inviteData.department}
                    onChange={(e) => setInviteData({ ...inviteData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="z.B. Entwicklung"
                    disabled={!!success}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Berechtigung *</label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!!success}
                >
                  <option value="user">Mitarbeiter (nur eigene Zeiterfassung)</option>
                  <option value="admin">Projektleiter (volle Verwaltungsrechte)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Projektleiter können Projekte, Mitarbeiter und alle Zeiterfassungen verwalten
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseInviteModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  {success ? 'Schließen' : 'Abbrechen'}
                </button>
                {!success && (
                  <button
                    type="submit"
                    disabled={inviting}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:bg-gray-400"
                  >
                    {inviting ? 'Wird eingeladen...' : 'Einladen'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}