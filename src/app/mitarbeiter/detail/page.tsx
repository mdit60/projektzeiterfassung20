// ========================================
// Datei: src/app/mitarbeiter/detail/page.tsx
// Mitarbeiter-Detail mit FuE-Daten (ZIM Anlage 6.1/6.1a)
// ========================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface SalaryComponent {
  id?: string;
  year: number;
  monthly_gross_salary: number;
  christmas_bonus: number;
  christmas_bonus_months: number;
  vacation_bonus: number;
  vacation_bonus_months: number;
  capital_forming_benefits: number;
  capital_forming_months: number;
  pension_contribution: number;
  pension_contribution_months: number;
  other_fixed_components: number;
  other_fixed_description: string;
  // Berechnete Werte
  additional_components_total?: number;
  annual_gross_salary?: number;
  hourly_rate?: number;
  monthly_personnel_cost?: number;
}

interface EmployeeData {
  // Basis
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  
  // Persönliche Daten
  salutation: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  phone: string;
  
  // Adresse
  street: string;
  house_number: string;
  zip: string;
  city: string;
  country: string;
  
  // Qualifikation & Vertrag
  qualification: string;
  employed_since: string;
  job_function: string;
  department: string;
  employee_number: string;
  contract_type: string;
  contract_end_date: string;
  
  // Öffentlicher Dienst / TVöD
  is_publicly_funded: boolean;
  is_tvoed_comparable: boolean;
  tvoed_group: string;
  tvoed_level: string;
  has_fixed_salary: boolean;
  
  // Arbeitszeit
  weekly_hours_contract: number;
  weekly_hours_company: number;
}

const defaultEmployee: EmployeeData = {
  id: '',
  name: '',
  email: '',
  role: 'employee',
  is_active: true,
  salutation: 'Herr',
  first_name: '',
  last_name: '',
  birth_date: '',
  phone: '',
  street: '',
  house_number: '',
  zip: '',
  city: '',
  country: 'DE',
  qualification: '',
  employed_since: '',
  job_function: '',
  department: '',
  employee_number: '',
  contract_type: 'permanent',
  contract_end_date: '',
  is_publicly_funded: false,
  is_tvoed_comparable: false,
  tvoed_group: '',
  tvoed_level: '',
  has_fixed_salary: true,
  weekly_hours_contract: 40,
  weekly_hours_company: 40
};

const defaultSalary: SalaryComponent = {
  year: new Date().getFullYear(),
  monthly_gross_salary: 0,
  christmas_bonus: 0,
  christmas_bonus_months: 1,
  vacation_bonus: 0,
  vacation_bonus_months: 1,
  capital_forming_benefits: 0,
  capital_forming_months: 12,
  pension_contribution: 0,
  pension_contribution_months: 12,
  other_fixed_components: 0,
  other_fixed_description: ''
};

export default function MitarbeiterDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const employeeId = searchParams.get('id');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'personal' | 'salary'>('personal');

  const [employee, setEmployee] = useState<EmployeeData>(defaultEmployee);
  const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [editingSalary, setEditingSalary] = useState<SalaryComponent | null>(null);

  useEffect(() => {
    if (employeeId) {
      loadEmployee();
    } else {
      setLoading(false);
    }
  }, [employeeId]);

  const loadEmployee = async () => {
    try {
      // Mitarbeiter laden
      const { data: empData, error: empError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (empError) throw empError;
      
      setEmployee({
        ...defaultEmployee,
        ...empData,
        birth_date: empData.birth_date || '',
        employed_since: empData.employed_since || '',
        contract_end_date: empData.contract_end_date || '',
        weekly_hours_contract: empData.weekly_hours_contract || 40,
        weekly_hours_company: empData.weekly_hours_company || 40
      });

      // Gehaltsdaten laden
      const { data: salaryData, error: salaryError } = await supabase
        .from('salary_components')
        .select('*')
        .eq('user_profile_id', employeeId)
        .order('year', { ascending: true });

      if (!salaryError && salaryData) {
        setSalaryComponents(salaryData);
      }

    } catch (err: any) {
      console.error('Error loading employee:', err);
      setError('Mitarbeiter konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Validierung
      if (!employee.first_name?.trim() && !employee.last_name?.trim() && !employee.name?.trim()) {
        throw new Error('Bitte geben Sie mindestens einen Namen ein');
      }

      // Name zusammensetzen falls first_name/last_name vorhanden
      const fullName = employee.first_name && employee.last_name 
        ? `${employee.first_name} ${employee.last_name}`.trim()
        : employee.name;

      const updateData = {
        name: fullName,
        salutation: employee.salutation,
        first_name: employee.first_name,
        last_name: employee.last_name,
        birth_date: employee.birth_date || null,
        phone: employee.phone,
        street: employee.street,
        house_number: employee.house_number,
        zip: employee.zip,
        city: employee.city,
        country: employee.country,
        qualification: employee.qualification,
        employed_since: employee.employed_since || null,
        job_function: employee.job_function,
        department: employee.department,
        employee_number: employee.employee_number,
        contract_type: employee.contract_type,
        contract_end_date: employee.contract_type === 'temporary' ? employee.contract_end_date : null,
        is_publicly_funded: employee.is_publicly_funded,
        is_tvoed_comparable: employee.is_tvoed_comparable,
        tvoed_group: employee.is_tvoed_comparable ? employee.tvoed_group : null,
        tvoed_level: employee.is_tvoed_comparable ? employee.tvoed_level : null,
        has_fixed_salary: employee.has_fixed_salary,
        weekly_hours_contract: employee.weekly_hours_contract,
        weekly_hours_company: employee.weekly_hours_company,
        role: employee.role,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', employeeId);

      if (updateError) throw updateError;

      // 🆕 Prüfen ob Gehaltsdaten vorhanden sind
      if (salaryComponents.length === 0) {
        setSuccess('Persönliche Daten gespeichert! Bitte nun die Gehaltsdaten erfassen.');
        setActiveTab('salary');
        // Nach kurzer Verzögerung das Gehalt-Modal öffnen
        setTimeout(() => {
          openSalaryModal();
        }, 500);
      } else {
        setSuccess('Mitarbeiter erfolgreich gespeichert!');
      }
      
      setTimeout(() => setSuccess(''), 4000);

    } catch (err: any) {
      console.error('Error saving employee:', err);
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSalary = async () => {
    if (!editingSalary) return;
    
    setError('');
    setSaving(true);

    try {
      const salaryData = {
        user_profile_id: employeeId,
        year: editingSalary.year,
        monthly_gross_salary: editingSalary.monthly_gross_salary || 0,
        christmas_bonus: editingSalary.christmas_bonus || 0,
        christmas_bonus_months: editingSalary.christmas_bonus_months || 0,
        vacation_bonus: editingSalary.vacation_bonus || 0,
        vacation_bonus_months: editingSalary.vacation_bonus_months || 0,
        capital_forming_benefits: editingSalary.capital_forming_benefits || 0,
        capital_forming_months: editingSalary.capital_forming_months || 0,
        pension_contribution: editingSalary.pension_contribution || 0,
        pension_contribution_months: editingSalary.pension_contribution_months || 0,
        other_fixed_components: editingSalary.other_fixed_components || 0,
        other_fixed_description: editingSalary.other_fixed_description || ''
      };

      if (editingSalary.id) {
        // Update bestehenden Eintrag
        const { error } = await supabase
          .from('salary_components')
          .update(salaryData)
          .eq('id', editingSalary.id);
        if (error) throw error;
      } else {
        // Insert neuen Eintrag
        const { error } = await supabase
          .from('salary_components')
          .insert([salaryData]);
        if (error) throw error;

        // 🆕 Automatisch Folgejahre anlegen (2 weitere Jahre)
        const followYears = [editingSalary.year + 1, editingSalary.year + 2];
        
        for (const year of followYears) {
          // Prüfen ob Jahr bereits existiert
          const { data: existing } = await supabase
            .from('salary_components')
            .select('id')
            .eq('user_profile_id', employeeId)
            .eq('year', year)
            .maybeSingle();

          if (!existing) {
            // Jahr existiert noch nicht → anlegen mit gleichen Daten
            await supabase
              .from('salary_components')
              .insert([{ ...salaryData, year }]);
          }
        }
      }

      setShowSalaryModal(false);
      setEditingSalary(null);
      loadEmployee(); // Neu laden für berechnete Werte

    } catch (err: any) {
      console.error('Error saving salary:', err);
      setError(err.message || 'Fehler beim Speichern der Gehaltsdaten');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSalary = async (salaryId: string) => {
    if (!confirm('Gehaltsdaten für dieses Jahr wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('salary_components')
        .delete()
        .eq('id', salaryId);

      if (error) throw error;
      loadEmployee();
    } catch (err: any) {
      setError('Fehler beim Löschen');
    }
  };

  const openSalaryModal = (salary?: SalaryComponent) => {
    if (salary) {
      setEditingSalary(salary);
    } else {
      // Neues Jahr: Nächstes Jahr oder aktuelles Jahr falls noch nicht vorhanden
      const existingYears = salaryComponents.map(s => s.year);
      const currentYear = new Date().getFullYear();
      let newYear = currentYear;
      while (existingYears.includes(newYear)) {
        newYear++;
      }
      setEditingSalary({ ...defaultSalary, year: newYear });
    }
    setShowSalaryModal(true);
  };

  // Berechnungen
  const partTimeFactor = employee.weekly_hours_company > 0 
    ? (employee.weekly_hours_contract / employee.weekly_hours_company).toFixed(3)
    : '1.000';
  
  const annualHours = employee.weekly_hours_contract * 52;

  // Berechnung für Salary Modal
  const calculateSalaryPreview = (salary: SalaryComponent) => {
    const additionalTotal = 
      (salary.christmas_bonus * salary.christmas_bonus_months) +
      (salary.vacation_bonus * salary.vacation_bonus_months) +
      (salary.capital_forming_benefits * salary.capital_forming_months) +
      (salary.pension_contribution * salary.pension_contribution_months) +
      salary.other_fixed_components;
    
    const annualGross = (salary.monthly_gross_salary * 12) + additionalTotal;
    const hours = employee.weekly_hours_contract * 52;
    const hourlyRate = hours > 0 ? annualGross / hours : 0;
    const factor = employee.weekly_hours_company > 0 
      ? employee.weekly_hours_contract / employee.weekly_hours_company 
      : 1;
    const monthlyPersonnelCost = (hours / 12) * hourlyRate * factor;

    return { additionalTotal, annualGross, hourlyRate, monthlyPersonnelCost };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/mitarbeiter')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Zurück zur Übersicht</span>
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {employee.is_active ? 'Aktiv' : 'Inaktiv'}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Titel */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {employee.first_name || employee.last_name 
              ? `${employee.salutation} ${employee.first_name} ${employee.last_name}`.trim()
              : employee.name || 'Neuer Mitarbeiter'}
          </h1>
          <p className="text-gray-600 mt-1">
            {employee.job_function || 'Keine Funktion angegeben'} 
            {employee.department && ` • ${employee.department}`}
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('personal')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'personal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              👤 Persönliche Daten & Vertrag
            </button>
            <button
              onClick={() => setActiveTab('salary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'salary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              💰 Gehalt & FuE-Daten
            </button>
          </nav>
        </div>

        {/* Tab: Persönliche Daten */}
        {activeTab === 'personal' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Spalte 1: Persönliche Daten */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  Persönliche Daten
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Anrede</label>
                    <select
                      value={employee.salutation}
                      onChange={(e) => setEmployee({...employee, salutation: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Herr">Herr</option>
                      <option value="Frau">Frau</option>
                      <option value="Divers">Divers</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
                      <input
                        type="text"
                        value={employee.first_name}
                        onChange={(e) => setEmployee({...employee, first_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
                      <input
                        type="text"
                        value={employee.last_name}
                        onChange={(e) => setEmployee({...employee, last_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Geburtsdatum</label>
                    <input
                      type="date"
                      value={employee.birth_date}
                      onChange={(e) => setEmployee({...employee, birth_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                    <input
                      type="email"
                      value={employee.email}
                      onChange={(e) => setEmployee({...employee, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">E-Mail kann nicht geändert werden</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                    <input
                      type="tel"
                      value={employee.phone}
                      onChange={(e) => setEmployee({...employee, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="+49 123 456789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Qualifikation / Ausbildung
                    </label>
                    <input
                      type="text"
                      value={employee.qualification}
                      onChange={(e) => setEmployee({...employee, qualification: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. M. Sc. Elektrotechnik"
                    />
                  </div>
                </div>
              </div>

              {/* Spalte 2: Adresse & Unternehmensdaten */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  Adresse
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Straße</label>
                      <input
                        type="text"
                        value={employee.street}
                        onChange={(e) => setEmployee({...employee, street: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nr.</label>
                      <input
                        type="text"
                        value={employee.house_number}
                        onChange={(e) => setEmployee({...employee, house_number: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
                      <input
                        type="text"
                        value={employee.zip}
                        onChange={(e) => setEmployee({...employee, zip: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stadt</label>
                      <input
                        type="text"
                        value={employee.city}
                        onChange={(e) => setEmployee({...employee, city: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b mt-8">
                  Unternehmensdaten
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Personalnummer</label>
                    <input
                      type="text"
                      value={employee.employee_number}
                      onChange={(e) => setEmployee({...employee, employee_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. MA-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Funktion / Arbeitsgebiet</label>
                    <input
                      type="text"
                      value={employee.job_function}
                      onChange={(e) => setEmployee({...employee, job_function: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. Leiter Technik"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Abteilung</label>
                    <input
                      type="text"
                      value={employee.department}
                      onChange={(e) => setEmployee({...employee, department: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. Entwicklung"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rolle im System *</label>
                    <select
                      value={employee.role}
                      onChange={(e) => setEmployee({...employee, role: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="employee">Mitarbeiter</option>
                      <option value="manager">Manager</option>
                      <option value="company_admin">Administrator</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Spalte 3: Vertragsdaten */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  Vertragsdaten
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Angestellt seit</label>
                    <input
                      type="date"
                      value={employee.employed_since}
                      onChange={(e) => setEmployee({...employee, employed_since: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Arbeitsverhältnis</label>
                    <select
                      value={employee.contract_type}
                      onChange={(e) => setEmployee({...employee, contract_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="permanent">Unbefristet</option>
                      <option value="temporary">Befristet</option>
                    </select>
                  </div>

                  {employee.contract_type === 'temporary' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Befristet bis</label>
                      <input
                        type="date"
                        value={employee.contract_end_date}
                        onChange={(e) => setEmployee({...employee, contract_end_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={employee.is_publicly_funded}
                        onChange={(e) => setEmployee({...employee, is_publicly_funded: e.target.checked})}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Grundfinanziert (öffentl. Einrichtung)</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={employee.is_tvoed_comparable}
                        onChange={(e) => setEmployee({...employee, is_tvoed_comparable: e.target.checked})}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">TVöD-Bund vergleichbar</span>
                    </label>
                  </div>

                  {employee.is_tvoed_comparable && (
                    <div className="grid grid-cols-2 gap-3 pl-7">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Entgeltgruppe</label>
                        <input
                          type="text"
                          value={employee.tvoed_group}
                          onChange={(e) => setEmployee({...employee, tvoed_group: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="z.B. E13"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stufe</label>
                        <input
                          type="text"
                          value={employee.tvoed_level}
                          onChange={(e) => setEmployee({...employee, tvoed_level: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="z.B. 4"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Entlohnungsart</label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          checked={employee.has_fixed_salary}
                          onChange={() => setEmployee({...employee, has_fixed_salary: true})}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Feste Entlohnung</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input
                          type="radio"
                          checked={!employee.has_fixed_salary}
                          onChange={() => setEmployee({...employee, has_fixed_salary: false})}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Ohne feste Entlohnung (Unternehmer)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b mt-8">
                  Arbeitszeit
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      pWAZ (Wochenstunden lt. Vertrag)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={employee.weekly_hours_contract}
                      onChange={(e) => setEmployee({...employee, weekly_hours_contract: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      bWAZ (Betriebsüblich Vollzeit)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={employee.weekly_hours_company}
                      onChange={(e) => setEmployee({...employee, weekly_hours_company: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-blue-800">
                      <div className="flex justify-between">
                        <span>Teilzeitfaktor:</span>
                        <span className="font-semibold">{partTimeFactor}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Jahresarbeitsstunden:</span>
                        <span className="font-semibold">{annualHours.toLocaleString('de-DE')} h</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Speichern Button */}
            <div className="mt-8 pt-6 border-t flex justify-end space-x-4">
              <button
                onClick={() => router.push('/mitarbeiter')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:bg-gray-400"
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Gehalt & FuE-Daten */}
        {activeTab === 'salary' && (
          <div className="space-y-6">
            {/* Info-Box Arbeitszeit */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Arbeitszeitdaten (aus Vertrag)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-900">{employee.weekly_hours_contract}h</div>
                  <div className="text-sm text-gray-600">pWAZ (Vertrag)</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-900">{employee.weekly_hours_company}h</div>
                  <div className="text-sm text-gray-600">bWAZ (Betrieb)</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-700">{partTimeFactor}</div>
                  <div className="text-sm text-blue-600">Teilzeitfaktor</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-700">{annualHours.toLocaleString('de-DE')}</div>
                  <div className="text-sm text-green-600">Jahresstunden</div>
                </div>
              </div>
            </div>

            {/* Jahresgehälter */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Jahresgehälter & Stundensätze
                </h3>
                <button
                  onClick={() => openSalaryModal()}
                  className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Jahr hinzufügen
                </button>
              </div>

              {salaryComponents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">Noch keine Gehaltsdaten</p>
                  <p className="text-sm">Fügen Sie das erste Projektjahr hinzu</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Jahr</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Monatsgehalt</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">+ Zusätze</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">= Jahresbrutto</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Stundensatz</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">PM-Kosten</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {salaryComponents.map((salary) => (
                        <tr key={salary.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-gray-900">{salary.year}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {salary.monthly_gross_salary?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">
                            + {salary.additional_components_total?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {salary.annual_gross_salary?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
                              {salary.hourly_rate?.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €/h
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {salary.monthly_personnel_cost?.toLocaleString('de-DE', { minimumFractionDigits: 0 })} €
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => openSalaryModal(salary)}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                              title="Bearbeiten"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteSalary(salary.id!)}
                              className="text-red-600 hover:text-red-800"
                              title="Löschen"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>💡 Hinweis:</strong> Bei Gehaltserhöhungen im Projektverlauf ändert sich der Stundensatz. 
                  Dadurch verringert sich die Anzahl der förderfähigen Stunden, um im Rahmen des bewilligten Budgets zu bleiben.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gehalt Modal */}
      {showSalaryModal && editingSalary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Gehaltsdaten {editingSalary.id ? 'bearbeiten' : 'hinzufügen'} - {editingSalary.year}
              </h2>
              <button
                onClick={() => { setShowSalaryModal(false); setEditingSalary(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Linke Spalte: Eingaben */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jahr</label>
                  <input
                    type="number"
                    value={editingSalary.year}
                    onChange={(e) => setEditingSalary({...editingSalary, year: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={!!editingSalary.id}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fix-Monatsbruttolohn (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingSalary.monthly_gross_salary}
                    onChange={(e) => setEditingSalary({...editingSalary, monthly_gross_salary: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. 5901.68"
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Weitere fixe Gehaltsbestandteile (Anlage 6.1a)</h4>
                  
                  {/* Weihnachtsgeld */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Weihnachtsgeld / 13. Gehalt (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingSalary.christmas_bonus}
                        onChange={(e) => setEditingSalary({...editingSalary, christmas_bonus: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">× Anzahl</label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingSalary.christmas_bonus_months}
                        onChange={(e) => setEditingSalary({...editingSalary, christmas_bonus_months: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  {/* Urlaubsgeld */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Urlaubsgeld (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingSalary.vacation_bonus}
                        onChange={(e) => setEditingSalary({...editingSalary, vacation_bonus: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">× Anzahl</label>
                      <input
                        type="number"
                        step="0.5"
                        value={editingSalary.vacation_bonus_months}
                        onChange={(e) => setEditingSalary({...editingSalary, vacation_bonus_months: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  {/* VWL */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">AG-Anteil VWL (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingSalary.capital_forming_benefits}
                        onChange={(e) => setEditingSalary({...editingSalary, capital_forming_benefits: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">× Monate</label>
                      <input
                        type="number"
                        step="1"
                        value={editingSalary.capital_forming_months}
                        onChange={(e) => setEditingSalary({...editingSalary, capital_forming_months: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  {/* bAV */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">AG-Anteil betr. Altersvorsorge (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingSalary.pension_contribution}
                        onChange={(e) => setEditingSalary({...editingSalary, pension_contribution: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">× Monate</label>
                      <input
                        type="number"
                        step="1"
                        value={editingSalary.pension_contribution_months}
                        onChange={(e) => setEditingSalary({...editingSalary, pension_contribution_months: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  {/* Sonstige */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Sonstige (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingSalary.other_fixed_components}
                        onChange={(e) => setEditingSalary({...editingSalary, other_fixed_components: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Beschreibung</label>
                      <input
                        type="text"
                        value={editingSalary.other_fixed_description}
                        onChange={(e) => setEditingSalary({...editingSalary, other_fixed_description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Rechte Spalte: Berechnungen */}
              <div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">📊 Berechnete Werte</h4>
                  
                  {(() => {
                    const calc = calculateSalaryPreview(editingSalary);
                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">Fix-Monatsbrutto × 12</span>
                          <span className="font-medium">
                            {(editingSalary.monthly_gross_salary * 12).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                          </span>
                        </div>
                        
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-gray-600">+ Weitere Bestandteile</span>
                          <span className="font-medium">
                            {calc.additionalTotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                          </span>
                        </div>
                        
                        <div className="flex justify-between py-2 border-b bg-blue-50 -mx-2 px-2 rounded">
                          <span className="font-semibold text-blue-900">= Jahresbrutto</span>
                          <span className="font-bold text-blue-900">
                            {calc.annualGross.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €
                          </span>
                        </div>

                        <div className="pt-4">
                          <div className="flex justify-between py-2">
                            <span className="text-gray-600">Jahresarbeitsstunden</span>
                            <span className="font-medium">{annualHours.toLocaleString('de-DE')} h</span>
                          </div>
                          
                          <div className="flex justify-between py-2">
                            <span className="text-gray-600">Teilzeitfaktor</span>
                            <span className="font-medium">{partTimeFactor}</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t">
                          <div className="flex justify-between py-2 bg-green-50 -mx-2 px-2 rounded">
                            <span className="font-semibold text-green-900">Stundensatz</span>
                            <span className="font-bold text-green-900">
                              {calc.hourlyRate.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €/h
                            </span>
                          </div>
                          
                          <div className="flex justify-between py-2 mt-2">
                            <span className="text-gray-600">Personalkosten je PM</span>
                            <span className="font-medium">
                              {calc.monthlyPersonnelCost.toLocaleString('de-DE', { minimumFractionDigits: 0 })} €
                            </span>
                          </div>
                        </div>

                        <div className="mt-6 p-3 bg-yellow-50 rounded text-sm text-yellow-800">
                          <strong>Formel:</strong><br/>
                          Stundensatz = Jahresbrutto / (pWAZ × 52)<br/>
                          PM-Kosten = (Jahresstunden / 12) × Stundensatz × Teilzeitfaktor
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 pt-4 border-t flex justify-end space-x-4">
              <button
                onClick={() => { setShowSalaryModal(false); setEditingSalary(null); }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveSalary}
                disabled={saving}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:bg-gray-400"
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}