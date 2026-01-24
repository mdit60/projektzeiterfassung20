// src/components/shared/EmployeeManagement.tsx
// ============================================================================
// PZE V7 - Shared Employee Management Component
// ============================================================================
// Datum: 24. Januar 2026
// Version: 7.3.84
//
// Wird von beiden Portalen genutzt:
// - Firmen-Portal: /v7/firma/mitarbeiter
// - Berater-Portal: /v7/berater/foerderung/firma/[id]?tab=mitarbeiter
//
// Volle CRUD-Funktionalitaet:
// - Liste mit Suche
// - Anlegen
// - Bearbeiten
// - Deaktivieren/Reaktivieren
// - Portal-Rolle zuweisen (employee/project_leader/client_admin)
// - Login erstellen (NEU: Erkennt bereits registrierte Benutzer)
//
// AENDERUNGEN v7.3.84:
// - Alle Anlage 6.1 Felder hinzugefuegt:
//   - Geburtsdatum, Bildungsabschluss, Jahr Ausbildungsabschluss
//   - Jahresbruttolohn, betriebl. Wochenarbeitszeit (bWAZ)
//   - Stundensatz (automatisch berechnet)
//   - lfd. Nr. (fuer Excel-Import)
// - Aufklappbarer Bereich fuer persoenliche Daten
// - Automatische Stundensatz-Berechnung: Jahresbrutto / (pWAZ × 52)
//
// Props:
// - portal: 'berater' | 'firma'
// - companyId: string
// - canEdit: boolean
// - title?: string
// ============================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Search,
  Plus,
  Pencil,
  UserX,
  RefreshCw,
  X,
  Save,
  KeyRound,
  Link2,
  Check,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

export interface Employee {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  position_title: string | null;
  qualification: string | null;
  weekly_hours: number | null;
  employment_start: string | null;
  employment_end: string | null;
  is_active: boolean;
  portal_role: string | null;
  user_id: string | null;
  // Anlage 6.1 Felder
  birth_date: string | null;
  education_degree: string | null;
  education_year: number | null;
  annual_salary: number | null;
  company_weekly_hours: number | null;
  hourly_rate: number | null;
  employee_number: number | null;
  // NEU: Aus JOIN mit v7_user_profiles
  has_login?: boolean;
}

interface EmployeeFormData {
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  position_title: string;
  qualification: string;
  weekly_hours: string;
  employment_start: string;
  employment_end: string;
  portal_role: string;
  // Anlage 6.1 Felder
  birth_date: string;
  education_degree: string;
  education_year: string;
  annual_salary: string;
  company_weekly_hours: string;
  hourly_rate: string;
  employee_number: string;
}

interface EmployeeManagementProps {
  portal: 'berater' | 'firma';
  companyId: string;
  canEdit: boolean;
  title?: string;
}

// Cache fuer registrierte E-Mails
interface RegisteredUser {
  id: string;
  email: string;
  display_name: string | null;
}

// ============================================================================
// KONSTANTEN
// ============================================================================

const EMPTY_FORM: EmployeeFormData = {
  display_name: '',
  first_name: '',
  last_name: '',
  email: '',
  position_title: '',
  qualification: '',
  weekly_hours: '40',
  employment_start: '',
  employment_end: '',
  portal_role: 'employee',
  // Anlage 6.1 Felder
  birth_date: '',
  education_degree: '',
  education_year: '',
  annual_salary: '',
  company_weekly_hours: '40',
  hourly_rate: '',
  employee_number: '',
};

const QUALIFICATION_OPTIONS = [
  'keine Ausbildung',
  'Berufsausbildung',
  'Meister/Techniker',
  'Bachelor',
  'Master/Diplom',
  'Promotion',
];

const PORTAL_ROLE_OPTIONS = [
  { value: 'employee', label: 'Mitarbeiter', description: 'Kann nur eigene Zeiterfassung sehen' },
  { value: 'project_leader', label: 'Projektleiter', description: 'Kann zugeordnete Projekte und deren MA sehen' },
  { value: 'client_admin', label: 'Administrator', description: 'Voller Zugriff auf alle Firmendaten' },
];

const PORTAL_COLORS = {
  berater: {
    button: 'bg-blue-600 hover:bg-blue-700',
    focus: 'focus:ring-blue-500',
    badge: 'bg-blue-100 text-blue-800',
    text: 'text-blue-600',
    hover: 'hover:text-blue-900',
  },
  firma: {
    button: 'bg-green-600 hover:bg-green-700',
    focus: 'focus:ring-green-500',
    badge: 'bg-green-100 text-green-800',
    text: 'text-green-600',
    hover: 'hover:text-green-900',
  },
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function EmployeeManagement({
  portal,
  companyId,
  canEdit,
  title = 'Mitarbeiter',
}: EmployeeManagementProps) {
  const supabase = createClient();
  const colors = PORTAL_COLORS[portal];

  // State - Daten
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // NEU: Cache fuer registrierte User-Profiles (Email -> User)
  const [registeredEmails, setRegisteredEmails] = useState<Map<string, RegisteredUser>>(new Map());

  // State - Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // State - Delete Confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // State - Login erstellen Modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmployee, setLoginEmployee] = useState<Employee | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [creatingLogin, setCreatingLogin] = useState(false);
  
  // NEU: Modus fuer Login-Modal (create = neuen User, link = existierenden verknuepfen)
  const [loginMode, setLoginMode] = useState<'create' | 'link'>('create');
  const [existingUserId, setExistingUserId] = useState<string | null>(null);

  // ============================================================================
  // DATEN LADEN
  // ============================================================================

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      // Mitarbeiter laden
      let query = supabase
        .from('v7_employees')
        .select('id, display_name, first_name, last_name, email, position_title, qualification, weekly_hours, employment_start, employment_end, is_active, portal_role, user_id, birth_date, education_degree, education_year, annual_salary, company_weekly_hours, hourly_rate, employee_number')
        .eq('client_company_id', companyId)
        .order('display_name');

      if (!showInactive) {
        query = query.eq('is_active', true);
      }

      const { data: employeesData, error } = await query;
      if (error) throw error;
      
      // NEU: Alle E-Mails sammeln und pruefen welche bereits registriert sind
      const emails = (employeesData || [])
        .filter(e => e.email)
        .map(e => e.email!.toLowerCase());
      
      if (emails.length > 0) {
        // Alle User-Profiles fuer diese E-Mails laden
        const { data: profiles } = await supabase
          .from('v7_user_profiles')
          .select('id, email, display_name')
          .in('email', emails);
        
        // Map erstellen: email -> user
        const emailMap = new Map<string, RegisteredUser>();
        (profiles || []).forEach(p => {
          if (p.email) {
            emailMap.set(p.email.toLowerCase(), {
              id: p.id,
              email: p.email,
              display_name: p.display_name,
            });
          }
        });
        setRegisteredEmails(emailMap);
        
        // has_login Flag setzen basierend auf user_id ODER existierendem Profile
        const enrichedEmployees = (employeesData || []).map(emp => ({
          ...emp,
          has_login: !!(emp.user_id || (emp.email && emailMap.has(emp.email.toLowerCase()))),
        }));
        
        setEmployees(enrichedEmployees);
      } else {
        setEmployees(employeesData || []);
      }
      
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, companyId, showInactive]);

  useEffect(() => {
    if (companyId) loadEmployees();
  }, [companyId, loadEmployees]);

  // ============================================================================
  // MODAL FUNKTIONEN
  // ============================================================================

  const openCreateModal = () => {
    setModalMode('create');
    setEditingEmployee(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setModalMode('edit');
    setEditingEmployee(emp);
    setFormData({
      display_name: emp.display_name || '',
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      position_title: emp.position_title || '',
      qualification: emp.qualification || '',
      weekly_hours: emp.weekly_hours?.toString() || '40',
      employment_start: emp.employment_start || '',
      employment_end: emp.employment_end || '',
      portal_role: emp.portal_role || 'employee',
      // Anlage 6.1 Felder
      birth_date: emp.birth_date || '',
      education_degree: emp.education_degree || '',
      education_year: emp.education_year?.toString() || '',
      annual_salary: emp.annual_salary?.toString() || '',
      company_weekly_hours: emp.company_weekly_hours?.toString() || '40',
      hourly_rate: emp.hourly_rate?.toString() || '',
      employee_number: emp.employee_number?.toString() || '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-generate display_name from first + last name
    if (name === 'first_name' || name === 'last_name') {
      const firstName = name === 'first_name' ? value : formData.first_name;
      const lastName = name === 'last_name' ? value : formData.last_name;
      if (firstName || lastName) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          display_name: `${lastName}${lastName && firstName ? ', ' : ''}${firstName}`.trim(),
        }));
      }
    }

    // Auto-calculate hourly_rate from annual_salary and weekly_hours
    if (name === 'annual_salary' || name === 'weekly_hours') {
      const salary = name === 'annual_salary' ? parseFloat(value) : parseFloat(formData.annual_salary);
      const hours = name === 'weekly_hours' ? parseFloat(value) : parseFloat(formData.weekly_hours);
      if (salary > 0 && hours > 0) {
        const rate = salary / (hours * 52);
        setFormData(prev => ({
          ...prev,
          [name]: value,
          hourly_rate: rate.toFixed(2),
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    if (!formData.display_name.trim()) {
      setFormError('Name ist ein Pflichtfeld.');
      return false;
    }
    if (formData.email && !formData.email.includes('@')) {
      setFormError('Bitte eine gueltige E-Mail-Adresse eingeben.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    setFormError(null);

    try {
      const saveData = {
        display_name: formData.display_name.trim(),
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        email: formData.email.trim() || null,
        position_title: formData.position_title.trim() || null,
        qualification: formData.qualification || null,
        weekly_hours: formData.weekly_hours ? parseFloat(formData.weekly_hours) : null,
        employment_start: formData.employment_start || null,
        employment_end: formData.employment_end || null,
        portal_role: formData.portal_role || 'employee',
        // Anlage 6.1 Felder
        birth_date: formData.birth_date || null,
        education_degree: formData.education_degree.trim() || null,
        education_year: formData.education_year ? parseInt(formData.education_year) : null,
        annual_salary: formData.annual_salary ? parseFloat(formData.annual_salary) : null,
        company_weekly_hours: formData.company_weekly_hours ? parseFloat(formData.company_weekly_hours) : null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        employee_number: formData.employee_number ? parseInt(formData.employee_number) : null,
        updated_at: new Date().toISOString(),
      };

      if (modalMode === 'create') {
        const { error } = await supabase
          .from('v7_employees')
          .insert({
            ...saveData,
            client_company_id: companyId,
            is_active: true,
          });

        if (error) throw error;
      } else if (editingEmployee) {
        const { error } = await supabase
          .from('v7_employees')
          .update(saveData)
          .eq('id', editingEmployee.id);

        if (error) throw error;
      }

      closeModal();
      await loadEmployees();
    } catch (err: any) {
      console.error('Fehler beim Speichern:', err);
      setFormError(err.message || 'Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // DELETE FUNKTIONEN
  // ============================================================================

  const confirmDelete = (emp: Employee) => {
    setEmployeeToDelete(emp);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!employeeToDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('v7_employees')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employeeToDelete.id);

      if (error) throw error;

      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
      await loadEmployees();
    } catch (err) {
      console.error('Fehler beim Deaktivieren:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (emp: Employee) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('v7_employees')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', emp.id);

      if (error) throw error;
      await loadEmployees();
    } catch (err) {
      console.error('Fehler beim Reaktivieren:', err);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // LOGIN FUNKTIONEN (ERWEITERT)
  // ============================================================================

  const openLoginModal = (emp: Employee) => {
    if (!emp.email) {
      alert('Mitarbeiter hat keine E-Mail-Adresse.');
      return;
    }
    
    // Pruefen ob E-Mail bereits registriert ist
    const existingUser = registeredEmails.get(emp.email.toLowerCase());
    
    if (existingUser) {
      // E-Mail ist bereits registriert -> Verknuepfungs-Modus
      setLoginMode('link');
      setExistingUserId(existingUser.id);
    } else {
      // Neuen Login erstellen
      setLoginMode('create');
      setExistingUserId(null);
    }
    
    setLoginEmployee(emp);
    setLoginPassword('');
    setLoginError(null);
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginEmployee(null);
    setLoginPassword('');
    setLoginError(null);
    setLoginMode('create');
    setExistingUserId(null);
  };

  // NEU: Bestehenden User mit Mitarbeiter verknuepfen
  const handleLinkExistingUser = async () => {
    if (!loginEmployee || !existingUserId) return;
    
    setCreatingLogin(true);
    setLoginError(null);
    
    try {
      // Mitarbeiter mit bestehendem User verknuepfen
      const { error } = await supabase
        .from('v7_employees')
        .update({ 
          user_id: existingUserId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loginEmployee.id);
      
      if (error) throw error;
      
      closeLoginModal();
      await loadEmployees();
      alert(`Mitarbeiter ${loginEmployee.display_name} wurde mit dem bestehenden Login verknuepft.`);
      
    } catch (err: any) {
      console.error('Fehler beim Verknuepfen:', err);
      setLoginError(err.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setCreatingLogin(false);
    }
  };

  const handleCreateLogin = async () => {
    if (!loginEmployee || !loginEmployee.email) return;

    if (loginPassword.length < 6) {
      setLoginError('Passwort muss mindestens 6 Zeichen haben.');
      return;
    }

    setCreatingLogin(true);
    setLoginError(null);

    try {
      // 1. Auth-User erstellen (Admin API - ohne E-Mail-Versand)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: loginEmployee.email,
        password: loginPassword,
        email_confirm: true, // Direkt bestaetigt, keine E-Mail
      });

      if (authError) {
        // Fallback: Normale signUp verwenden (sendet evtl. E-Mail)
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: loginEmployee.email,
          password: loginPassword,
          options: {
            data: {
              display_name: loginEmployee.display_name,
            }
          }
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            // E-Mail bereits registriert - auf Verknuepfungs-Modus wechseln
            setLoginError('Diese E-Mail ist bereits registriert. Moechten Sie den bestehenden Login verknuepfen?');
            
            // Versuchen, die User-ID zu finden
            const { data: existingProfile } = await supabase
              .from('v7_user_profiles')
              .select('id')
              .eq('email', loginEmployee.email.toLowerCase())
              .maybeSingle();
            
            if (existingProfile) {
              setLoginMode('link');
              setExistingUserId(existingProfile.id);
            }
            return;
          } else {
            setLoginError(signUpError.message);
          }
          return;
        }

        if (!signUpData.user) {
          setLoginError('Benutzer konnte nicht erstellt werden.');
          return;
        }

        // User ID von signUp
        const userId = signUpData.user.id;

        // 2. user_profile erstellen
        await createUserProfile(userId, loginEmployee);

        // 3. employee.user_id verknuepfen
        await linkEmployeeToUser(loginEmployee.id, userId);

      } else if (authData.user) {
        // Admin API hat funktioniert
        const userId = authData.user.id;

        // 2. user_profile erstellen
        await createUserProfile(userId, loginEmployee);

        // 3. employee.user_id verknuepfen
        await linkEmployeeToUser(loginEmployee.id, userId);
      }

      closeLoginModal();
      await loadEmployees();
      alert(`Login erstellt fuer ${loginEmployee.display_name}!\n\nE-Mail: ${loginEmployee.email}\nPasswort: ${loginPassword}`);

    } catch (err: any) {
      console.error('Fehler beim Login erstellen:', err);
      setLoginError(err.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setCreatingLogin(false);
    }
  };

  const createUserProfile = async (userId: string, emp: Employee) => {
    const { error } = await supabase
      .from('v7_user_profiles')
      .insert({
        id: userId,
        email: emp.email,
        role: emp.portal_role === 'client_admin' ? 'client_admin' : 'employee',
        display_name: emp.display_name,
        first_name: emp.first_name,
        last_name: emp.last_name,
        client_company_id: companyId,
      });

    if (error && error.code !== '23505') {
      throw error;
    }
  };

  const linkEmployeeToUser = async (employeeId: string, userId: string) => {
    const { error } = await supabase
      .from('v7_employees')
      .update({ 
        user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId);

    if (error) throw error;
  };

  // ============================================================================
  // HILFSFUNKTIONEN
  // ============================================================================

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  // Filter
  const filteredEmployees = employees.filter(e =>
    e.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.email && e.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.position_title && e.position_title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeCount = employees.filter(e => e.is_active).length;
  const inactiveCount = employees.filter(e => !e.is_active).length;

  // ============================================================================
  // RENDER - LOADING
  // ============================================================================

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-600"></div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - HAUPT
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-gray-600" />
            {title}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {activeCount} aktiv{inactiveCount > 0 && `, ${inactiveCount} inaktiv`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Suche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 ${colors.focus} w-48`}
            />
          </div>

          {/* Inaktive anzeigen */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Inaktive
          </label>

          {/* Neu-Button */}
          {canEdit && (
            <button
              onClick={openCreateModal}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg ${colors.button}`}
            >
              <Plus size={18} />
              Neu
            </button>
          )}
        </div>
      </div>

      {/* Tabelle */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
          {searchTerm ? 'Keine Mitarbeiter gefunden.' : 'Noch keine Mitarbeiter erfasst.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mitarbeiter</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rolle</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Std./Woche</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  {canEdit && (
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Aktionen</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className={`hover:bg-gray-50 ${!emp.is_active ? 'opacity-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{emp.display_name}</div>
                      {emp.email && (
                        <div className="text-sm text-gray-500">{emp.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {emp.position_title || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {emp.portal_role === 'client_admin' && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                          Admin
                        </span>
                      )}
                      {emp.portal_role === 'project_leader' && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          Projektleiter
                        </span>
                      )}
                      {(!emp.portal_role || emp.portal_role === 'employee') && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          Mitarbeiter
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {emp.weekly_hours ? `${emp.weekly_hours} h` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {emp.is_active ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Aktiv
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                            Inaktiv
                          </span>
                        )}
                        {/* NEU: Login-Status basierend auf has_login Flag */}
                        {emp.has_login ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Login
                          </span>
                        ) : emp.email ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                            Kein Login
                          </span>
                        ) : null}
                      </div>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {/* Login erstellen/verknuepfen - nur wenn noch nicht verknuepft und E-Mail vorhanden */}
                          {!emp.user_id && emp.email && emp.is_active && (
                            <button
                              onClick={() => openLoginModal(emp)}
                              className={`p-1.5 rounded ${
                                registeredEmails.has(emp.email.toLowerCase()) 
                                  ? 'text-blue-600 hover:text-blue-800' 
                                  : 'text-orange-600 hover:text-orange-800'
                              }`}
                              title={registeredEmails.has(emp.email.toLowerCase()) 
                                ? 'Login verknuepfen (bereits registriert)' 
                                : 'Login erstellen'
                              }
                            >
                              {registeredEmails.has(emp.email.toLowerCase()) 
                                ? <Link2 size={18} /> 
                                : <KeyRound size={18} />
                              }
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(emp)}
                            className={`p-1.5 ${colors.text} ${colors.hover} rounded`}
                            title="Bearbeiten"
                          >
                            <Pencil size={18} />
                          </button>
                          {emp.is_active ? (
                            <button
                              onClick={() => confirmDelete(emp)}
                              className="p-1.5 text-red-600 hover:text-red-900 rounded"
                              title="Deaktivieren"
                            >
                              <UserX size={18} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(emp)}
                              className="p-1.5 text-blue-600 hover:text-blue-900 rounded"
                              title="Reaktivieren"
                            >
                              <RefreshCw size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Anzahl */}
      <div className="text-sm text-gray-500">
        {filteredEmployees.length} {filteredEmployees.length === 1 ? 'Mitarbeiter' : 'Mitarbeiter'}
      </div>

      {/* ================================================================ */}
      {/* MODAL: Mitarbeiter erstellen/bearbeiten */}
      {/* ================================================================ */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalMode === 'create' ? 'Neuer Mitarbeiter' : 'Mitarbeiter bearbeiten'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-6">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    placeholder="z.B. Mueller"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    placeholder="z.B. Max"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anzeigename <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                  placeholder="z.B. Mueller, Max"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Wird automatisch aus Vor- und Nachname erzeugt, kann aber angepasst werden.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                  placeholder="z.B. max.mueller@firma.de"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Erforderlich fuer Portal-Login.
                </p>
              </div>

              {/* Portal-Rolle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Portal-Rolle</label>
                <div className="space-y-2">
                  {PORTAL_ROLE_OPTIONS.map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.portal_role === opt.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="portal_role"
                        value={opt.value}
                        checked={formData.portal_role === opt.value}
                        onChange={handleInputChange}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{opt.label}</div>
                        <div className="text-sm text-gray-500">{opt.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Weitere Felder */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position/Funktion</label>
                  <input
                    type="text"
                    name="position_title"
                    value={formData.position_title}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    placeholder="z.B. Geschaeftsfuehrer, Entwickler"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualifikation</label>
                  <select
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                  >
                    <option value="">-- Bitte waehlen --</option>
                    {QUALIFICATION_OPTIONS.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Anlage 6.1 - Persoenliche Daten (aufklappbar) */}
              <details className="border border-gray-200 rounded-lg">
                <summary className="px-4 py-3 bg-gray-50 cursor-pointer font-medium text-gray-700 hover:bg-gray-100 rounded-t-lg">
                  Persoenliche Daten (Anlage 6.1)
                </summary>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Geburtsdatum</label>
                    <input
                      type="date"
                      name="birth_date"
                      value={formData.birth_date}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">lfd. Nr. (Excel-Import)</label>
                    <input
                      type="number"
                      name="employee_number"
                      value={formData.employee_number}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                      placeholder="z.B. 1, 2, 3..."
                      min="1"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bildungsabschluss / Fachrichtung</label>
                    <input
                      type="text"
                      name="education_degree"
                      value={formData.education_degree}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                      placeholder="z.B. Dipl.-Ing. Maschinenbau"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jahr Ausbildungsabschluss</label>
                    <input
                      type="number"
                      name="education_year"
                      value={formData.education_year}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                      placeholder="z.B. 1999"
                      min="1950"
                      max="2030"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beschaeftigt seit</label>
                    <input
                      type="date"
                      name="employment_start"
                      value={formData.employment_start}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                    />
                  </div>
                </div>
              </details>

              {/* Anlage 6.1 - Arbeitszeit & Gehalt */}
              <div className="border border-blue-200 rounded-lg bg-blue-50 p-4">
                <h4 className="font-medium text-blue-900 mb-3">Arbeitszeit & Stundensatz</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wochenstunden (pWAZ) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="weekly_hours"
                      value={formData.weekly_hours}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus} bg-white`}
                      min="0"
                      max="60"
                      step="0.5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Persoenliche Wochenarbeitszeit lt. Vertrag</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Betriebl. Wochenstunden (bWAZ)</label>
                    <input
                      type="number"
                      name="company_weekly_hours"
                      value={formData.company_weekly_hours}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus} bg-white`}
                      min="0"
                      max="60"
                      step="0.5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Betriebsuebliche Arbeitszeit (Standard: 40)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jahresbruttolohn (EUR)</label>
                    <input
                      type="number"
                      name="annual_salary"
                      value={formData.annual_salary}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus} bg-white`}
                      min="0"
                      step="100"
                      placeholder="z.B. 65000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stundensatz (EUR)</label>
                    <input
                      type="number"
                      name="hourly_rate"
                      value={formData.hourly_rate}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus} bg-white`}
                      min="0"
                      step="0.01"
                      placeholder="Wird berechnet"
                    />
                    <p className="text-xs text-gray-500 mt-1">= Jahresbrutto / (Wochenstd. × 52)</p>
                  </div>
                </div>
              </div>

              {/* Beschaeftigt bis (separates Feld) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschaeftigt bis</label>
                <input
                  type="date"
                  name="employment_end"
                  value={formData.employment_end}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                />
                <p className="text-xs text-gray-500 mt-1">Leer lassen wenn noch beschaeftigt</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${colors.button}`}
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                <Save size={18} />
                {modalMode === 'create' ? 'Anlegen' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Deaktivieren bestaetigen */}
      {/* ================================================================ */}
      {showDeleteConfirm && employeeToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <UserX className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Mitarbeiter deaktivieren?</h3>
                  <p className="text-gray-500 mt-1">
                    Moechten Sie <strong>{employeeToDelete.display_name}</strong> wirklich deaktivieren?
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Der Mitarbeiter wird nicht geloescht und kann spaeter reaktiviert werden.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => { setShowDeleteConfirm(false); setEmployeeToDelete(null); }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Deaktivieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL: Login erstellen / verknuepfen */}
      {/* ================================================================ */}
      {showLoginModal && loginEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {loginMode === 'link' ? 'Login verknuepfen' : 'Login erstellen'}
              </h3>
              <button onClick={closeLoginModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {loginError}
                </div>
              )}

              {/* Modus: Verknuepfen (bereits registriert) */}
              {loginMode === 'link' ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
                    <strong>Bereits registriert:</strong> Diese E-Mail-Adresse hat bereits einen Login. 
                    Moechten Sie diesen mit dem Mitarbeiter verknuepfen?
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mitarbeiter</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">
                      {loginEmployee.display_name}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">
                      {loginEmployee.email}
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                    <Check size={18} className="mt-0.5 flex-shrink-0" />
                    <div>
                      Der Mitarbeiter kann sich mit seinen bestehenden Zugangsdaten einloggen.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Modus: Neuen Login erstellen */}
                  <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg text-sm">
                    <strong>Test-Modus:</strong> Es wird keine E-Mail versendet. 
                    Der Mitarbeiter kann sich direkt mit diesen Zugangsdaten einloggen.
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mitarbeiter</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">
                      {loginEmployee.display_name}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700">
                      {loginEmployee.email}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Portal-Rolle</label>
                    <div className="px-3 py-2 bg-gray-100 rounded-lg">
                      {loginEmployee.portal_role === 'client_admin' && (
                        <span className="text-purple-700">Administrator</span>
                      )}
                      {loginEmployee.portal_role === 'project_leader' && (
                        <span className="text-blue-700">Projektleiter</span>
                      )}
                      {(!loginEmployee.portal_role || loginEmployee.portal_role === 'employee') && (
                        <span className="text-gray-700">Mitarbeiter</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Passwort <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 ${colors.focus}`}
                      placeholder="Mind. 6 Zeichen"
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Dieses Passwort muss dem Mitarbeiter mitgeteilt werden.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={closeLoginModal}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              
              {loginMode === 'link' ? (
                <button
                  onClick={handleLinkExistingUser}
                  disabled={creatingLogin}
                  className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 bg-blue-600 hover:bg-blue-700`}
                >
                  {creatingLogin ? 'Verknuepfe...' : (
                    <>
                      <Link2 size={18} />
                      Verknuepfen
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleCreateLogin}
                  disabled={creatingLogin || !loginPassword}
                  className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${colors.button}`}
                >
                  {creatingLogin ? 'Erstelle...' : 'Login erstellen'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
