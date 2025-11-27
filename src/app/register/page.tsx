'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface Employee {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'company_admin' | 'manager' | 'employee';
  created_at: string;
}

export default function MitarbeiterPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [inviteData, setInviteData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 1. User laden
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // 2. Profil laden
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profileData) {
        setError('Profil konnte nicht geladen werden');
        return;
      }

      setProfile(profileData);

      // 3. Berechtigung prüfen - Nur Admin und Manager dürfen Mitarbeiter sehen
      if (profileData.role === 'employee') {
        console.warn('⚠️ Employee tried to access employee management - redirecting to dashboard');
        router.push('/dashboard');
        return;
      }

      // 4. Alle Mitarbeiter der Firma laden
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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInviting(true);

    try {
      // Validierung
      if (!inviteData.name.trim() || !inviteData.email.trim() || !inviteData.password.trim()) {
        throw new Error('Bitte füllen Sie alle Pflichtfelder aus');
      }

      if (inviteData.password.length < 6) {
        throw new Error('Passwort muss mindestens 6 Zeichen lang sein');
      }

      console.log('🚀 Creating new employee via API...');

      // API-Route aufrufen (erstellt Mitarbeiter ohne Admin auszuloggen)
      const response = await fetch('/api/employees/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: inviteData.name,
          email: inviteData.email,
          password: inviteData.password,
          role: inviteData.role
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen des Mitarbeiters');
      }

      console.log('✅ Employee created:', data.user);

      setSuccess(`${inviteData.name} wurde erfolgreich als ${getRoleName(inviteData.role)} eingeladen!`);
      
      // Formular zurücksetzen
      setInviteData({
        name: '',
        email: '',
        password: '',
        role: 'employee'
      });

      // Modal schließen und Liste neu laden
      setTimeout(() => {
        setShowInviteModal(false);
        setSuccess('');
        loadData();
      }, 2000);

    } catch (error: any) {
      console.error('❌ Invite error:', error);
      setError(error.message || 'Fehler beim Einladen des Mitarbeiters');
    } finally {
      setInviting(false);
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'company_admin': return 'Administrator';
      case 'manager': return 'Manager';
      case 'employee': return 'Mitarbeiter';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'company_admin': return 'bg-green-100 text-green-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          {(profile?.role === 'company_admin' || profile?.role === 'manager') && (
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

        {/* Error/Success Messages */}
        {error && !showInviteModal && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && !showInviteModal && (
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
                <div key={employee.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {employee.name.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Info */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{employee.name}</h3>
                        <p className="text-sm text-gray-600">{employee.email}</p>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(employee.role)}`}>
                        {getRoleName(employee.role)}
                      </span>
                      
                      {/* Aktionen */}
                      {(profile?.role === 'company_admin' || profile?.role === 'manager') && (
                        <button
                          onClick={() => router.push(`/mitarbeiter/detail?id=${employee.id}`)}
                          className="text-blue-600 hover:text-blue-700 flex items-center text-sm font-medium"
                          title="Bearbeiten"
                        >
                          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Bearbeiten
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Mitglied seit */}
                  <div className="mt-2 text-xs text-gray-500 ml-16">
                    Mitglied seit {new Date(employee.created_at).toLocaleDateString('de-DE')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Mitarbeiter einladen</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setError('');
                  setSuccess('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Max Mustermann"
                  required
                  disabled={inviting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail *
                </label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="max@firma.de"
                  required
                  disabled={inviting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temporäres Passwort *
                </label>
                <input
                  type="password"
                  value={inviteData.password}
                  onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mindestens 6 Zeichen"
                  required
                  minLength={6}
                  disabled={inviting}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Der Mitarbeiter kann das Passwort später ändern
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rolle *
                </label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={inviting}
                >
                  <option value="employee">Mitarbeiter</option>
                  <option value="manager">Manager</option>
                  {profile?.role === 'company_admin' && (
                    <option value="company_admin">Administrator</option>
                  )}
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  disabled={inviting}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400"
                >
                  {inviting ? 'Wird erstellt...' : 'Einladen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}