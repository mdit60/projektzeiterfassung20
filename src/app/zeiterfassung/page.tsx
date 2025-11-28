'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface ProjectInfo {
  id: string;
  name: string;
  color: string;
}

interface WorkPackage {
  id: string;
  code: string;
  description: string;
  estimated_hours: number;
  project_id: string;
  project?: ProjectInfo | ProjectInfo[] | null;
}

interface Holiday {
  holiday_date: string;
  name: string;
}

interface MonthEntry {
  id?: string;
  work_package_id: string;
  work_package_code: string;
  work_package_description: string;
  project_id: string;
  project_name: string;
  project_color: string;
  days: { [day: number]: number };  // Nur Zahlen, keine Strings
}

// Abwesenheits-Typen
const ABSENCE_TYPES: { [key: string]: { label: string; color: string; bgColor: string; hours: number } } = {
  'U': { label: 'Urlaub', color: 'text-green-800', bgColor: 'bg-green-100', hours: 8 },
  'K': { label: 'Krankheit', color: 'text-red-800', bgColor: 'bg-red-100', hours: 8 },
  'F': { label: 'Feiertag', color: 'text-yellow-800', bgColor: 'bg-yellow-100', hours: 8 },
  'S': { label: 'Sonderurlaub', color: 'text-purple-800', bgColor: 'bg-purple-100', hours: 8 },
};

export default function ZeiterfassungPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Helper: Extrahiert Project aus Array oder Object
  const getProject = (project: ProjectInfo | ProjectInfo[] | null | undefined): ProjectInfo | null => {
    if (!project) return null;
    if (Array.isArray(project)) return project[0] || null;
    return project;
  };

  // States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [allWorkPackages, setAllWorkPackages] = useState<WorkPackage[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [entries, setEntries] = useState<MonthEntry[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showAllAPs, setShowAllAPs] = useState(false);
  
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

  // Fehlzeiten-Zeile (für U/K/S)
  const [absenceRow, setAbsenceRow] = useState<{ [day: number]: 'U' | 'K' | 'S' | null }>({});

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  useEffect(() => {
    loadData();
  }, [currentYear, currentMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*, contract_hours_per_week')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        setError('Profil nicht gefunden');
        return;
      }
      setProfile(profileData);

      // ALLE Arbeitspakete laden
      const { data: allWpData } = await supabase
        .from('work_packages')
        .select(`
          id,
          code,
          description,
          estimated_hours,
          project_id,
          project:projects(id, name, color)
        `)
        .eq('is_active', true)
        .order('code');

      setAllWorkPackages(allWpData || []);

      // Zugeordnete Arbeitspakete
      const { data: assignmentData } = await supabase
        .from('work_package_assignments')
        .select('work_package_id')
        .eq('user_profile_id', profileData.id);

      const assignedWpIds = assignmentData?.map(a => a.work_package_id) || [];
      const assignedWps = (allWpData || []).filter(wp => assignedWpIds.includes(wp.id));
      setWorkPackages(assignedWps);

      // Feiertage laden - KORREKTES Enddatum berechnen
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate(); // Letzter Tag des Monats
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      const { data: companyData } = await supabase
        .from('companies')
        .select('state_code')
        .eq('id', profileData.company_id)
        .single();

      const stateCode = companyData?.state_code || 'DE-BY';

      const { data: holidayData } = await supabase
        .from('public_holidays')
        .select('holiday_date, name')
        .gte('holiday_date', startDate)
        .lte('holiday_date', endDate)
        .or(`state_code.is.null,state_code.eq.${stateCode}`);

      setHolidays(holidayData || []);

      // Zeiteinträge laden
      const { data: timeData, error: timeError } = await supabase
        .from('time_entries')
        .select(`
          id,
          entry_date,
          hours,
          category,
          work_package_id,
          work_package_code,
          work_package_description,
          project_id,
          project:projects(id, name, color)
        `)
        .eq('user_profile_id', profileData.id)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (timeError) {
        console.error('Error loading time entries:', timeError);
      }

      console.log('Geladene Zeiteinträge:', timeData);

      // Gruppiere nach Arbeitspaket
      const entriesMap: { [key: string]: MonthEntry } = {};
      const absences: { [day: number]: 'U' | 'K' | 'S' | null } = {};

      if (timeData && timeData.length > 0) {
        timeData.forEach((entry: any) => {
          const day = new Date(entry.entry_date).getDate();
          const proj = getProject(entry.project);

          // Fehlzeiten separat behandeln
          if (entry.category === 'vacation') {
            absences[day] = 'U';
            return;
          } else if (entry.category === 'sick_leave') {
            absences[day] = 'K';
            return;
          } else if (entry.category === 'other_absence') {
            absences[day] = 'S';
            return;
          } else if (entry.category === 'public_holiday' || entry.category === 'non_billable') {
            return;
          }

          // Projektarbeit
          const key = entry.work_package_id || `manual-${entry.work_package_code}`;

          if (!entriesMap[key]) {
            const wpInfo = (allWpData || []).find(wp => wp.id === entry.work_package_id);
            
            entriesMap[key] = {
              work_package_id: entry.work_package_id || '',
              work_package_code: entry.work_package_code || wpInfo?.code || '',
              work_package_description: entry.work_package_description || wpInfo?.description || '',
              project_id: entry.project_id,
              project_name: proj?.name || '',
              project_color: proj?.color || '#3B82F6',
              days: {}
            };
          }
          entriesMap[key].days[day] = entry.hours;
        });
      }

      setEntries(Object.values(entriesMap));
      setAbsenceRow(absences);

    } catch (error: any) {
      console.error('Error:', error);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  // Navigation
  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  // Helpers
  const getDaysInMonth = () => {
    return new Date(currentYear, currentMonth, 0).getDate();
  };

  const isWeekend = (day: number) => {
    const date = new Date(currentYear, currentMonth - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const getHolidayName = (day: number): string | null => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const holiday = holidays.find(h => h.holiday_date === dateStr);
    return holiday?.name || null;
  };

  const getDayLabel = (day: number) => {
    const date = new Date(currentYear, currentMonth - 1, day);
    const dayOfWeek = date.getDay();
    const labels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return labels[dayOfWeek];
  };

  const isNonWorkingDay = (day: number) => {
    return isWeekend(day) || getHolidayName(day) !== null;
  };

  const getMaxMonthlyHours = () => {
    const weeklyHours = profile?.contract_hours_per_week || 40;
    return Math.round((weeklyHours * 52) / 12 * 100) / 100;
  };

  // Entry Management
  const addNewRow = () => {
    setEntries([...entries, {
      work_package_id: '',
      work_package_code: '',
      work_package_description: '',
      project_id: '',
      project_name: '',
      project_color: '#3B82F6',
      days: {}
    }]);
  };

  const removeRow = (index: number) => {
    const newEntries = [...entries];
    newEntries.splice(index, 1);
    setEntries(newEntries);
  };

  const handleAPChange = (index: number, wpId: string) => {
    const wp = allWorkPackages.find(w => w.id === wpId);
    if (!wp) return;

    const proj = getProject(wp.project);
    const newEntries = [...entries];
    newEntries[index] = {
      ...newEntries[index],
      work_package_id: wp.id,
      work_package_code: wp.code,
      work_package_description: wp.description,
      project_id: wp.project_id,
      project_name: proj?.name || '',
      project_color: proj?.color || '#3B82F6'
    };
    setEntries(newEntries);
  };

  const handleHoursChange = (index: number, day: number, value: string) => {
    const newEntries = [...entries];
    const entry = newEntries[index];
    
    const upperValue = value.toUpperCase().trim();
    
    if (['U', 'K', 'S'].includes(upperValue)) {
      delete entry.days[day];
      setAbsenceRow(prev => ({ ...prev, [day]: upperValue as 'U' | 'K' | 'S' }));
    } else if (value === '' || value === '0' || value === '-') {
      delete entry.days[day];
    } else {
      const hours = Math.min(24, Math.max(0, parseFloat(value) || 0));
      entry.days[day] = Math.round(hours * 100) / 100;
      if (absenceRow[day]) {
        setAbsenceRow(prev => {
          const newAbsences = { ...prev };
          delete newAbsences[day];
          return newAbsences;
        });
      }
    }
    
    setEntries(newEntries);
  };

  const handleAbsenceChange = (day: number, value: string) => {
    const upperValue = value.toUpperCase().trim();
    
    if (['U', 'K', 'S'].includes(upperValue)) {
      setAbsenceRow(prev => ({ ...prev, [day]: upperValue as 'U' | 'K' | 'S' }));
      // Entferne Projektstunden für diesen Tag
      setEntries(prev => prev.map(entry => {
        if (entry.days[day]) {
          const newDays = { ...entry.days };
          delete newDays[day];
          return { ...entry, days: newDays };
        }
        return entry;
      }));
    } else {
      // Leere Eingabe, '-', oder andere Zeichen → Abwesenheit löschen
      setAbsenceRow(prev => {
        const newAbsences = { ...prev };
        delete newAbsences[day];
        return newAbsences;
      });
    }
  };
  
  // Direkt Abwesenheit für einen Tag löschen (für X-Button)
  const clearAbsence = (day: number) => {
    setAbsenceRow(prev => {
      const newAbsences = { ...prev };
      delete newAbsences[day];
      return newAbsences;
    });
  };

  // Summen-Berechnungen - KORRIGIERT
  const getRowTotal = (entry: MonthEntry): number => {
    let total = 0;
    for (const val of Object.values(entry.days)) {
      if (typeof val === 'number') {
        total += val;
      }
    }
    return total;
  };

  const getProjectHoursForDay = (day: number): number => {
    let total = 0;
    for (const entry of entries) {
      const val = entry.days[day];
      if (typeof val === 'number') {
        total += val;
      }
    }
    return total;
  };

  const getAbsenceHoursForDay = (day: number): number => {
    const absence = absenceRow[day];
    if (absence) return 8;
    if (getHolidayName(day) && !isWeekend(day)) return 8;
    return 0;
  };

  const getNonBillableHoursForDay = (day: number): number => {
    if (isWeekend(day)) return 0;
    if (getHolidayName(day)) return 0;
    if (absenceRow[day]) return 0;
    const projectHours = getProjectHoursForDay(day);
    if (projectHours > 0) return 0;
    return 8;
  };

  const getMonthTotals = () => {
    const daysInMonth = getDaysInMonth();
    let projectTotal = 0;
    let absenceTotal = 0;
    let nonBillableTotal = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      projectTotal += getProjectHoursForDay(day);
      absenceTotal += getAbsenceHoursForDay(day);
      nonBillableTotal += getNonBillableHoursForDay(day);
    }

    return {
      project: projectTotal,
      absence: absenceTotal,
      nonBillable: nonBillableTotal,
      total: projectTotal + absenceTotal + nonBillableTotal
    };
  };

  const isOverMaxHours = () => {
    const totals = getMonthTotals();
    return totals.total > getMaxMonthlyHours();
  };

  // Speichern
  const handleSave = async () => {
    try {
      if (isOverMaxHours()) {
        setError(`Die Gesamtstunden (${getMonthTotals().total.toFixed(1)}h) überschreiten die maximale Monatsarbeitszeit von ${getMaxMonthlyHours().toFixed(1)}h.`);
        return;
      }

      setSaving(true);
      setError('');
      setSuccess('');

      for (const entry of entries) {
        const hasHours = Object.values(entry.days).some(v => typeof v === 'number' && v > 0);
        if (hasHours && !entry.work_package_id) {
          throw new Error('Bitte wählen Sie für alle Zeilen mit Stunden ein Arbeitspaket aus.');
        }
      }

      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      const { error: deleteError } = await supabase
        .from('time_entries')
        .delete()
        .eq('user_profile_id', profile.id)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (deleteError) {
        throw new Error('Fehler beim Löschen alter Einträge: ' + deleteError.message);
      }

      const newEntries: any[] = [];
      const daysInMonth = getDaysInMonth();

      // 1. Projektarbeit
      for (const entry of entries) {
        if (!entry.work_package_id) continue;
        
        for (const [dayStr, value] of Object.entries(entry.days)) {
          if (typeof value === 'number' && value > 0) {
            const day = parseInt(dayStr);
            const entryDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            newEntries.push({
              user_profile_id: profile.id,
              company_id: profile.company_id,
              entry_date: entryDate,
              project_id: entry.project_id,
              work_package_id: entry.work_package_id,
              work_package_code: entry.work_package_code,
              work_package_description: entry.work_package_description,
              hours: value,
              category: 'project_work',
              created_by: profile.user_id
            });
          }
        }
      }

      // 2. Fehlzeiten (U/K/S)
      for (const [dayStr, absence] of Object.entries(absenceRow)) {
        if (absence) {
          const day = parseInt(dayStr);
          const entryDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          let category = 'other_absence';
          if (absence === 'U') category = 'vacation';
          else if (absence === 'K') category = 'sick_leave';

          newEntries.push({
            user_profile_id: profile.id,
            company_id: profile.company_id,
            entry_date: entryDate,
            project_id: null,
            work_package_id: null,
            work_package_code: null,
            work_package_description: absence === 'U' ? 'Urlaub' : absence === 'K' ? 'Krankheit' : 'Sonderurlaub',
            hours: 8,
            category: category,
            created_by: profile.user_id
          });
        }
      }

      // 3. Feiertage automatisch
      for (let day = 1; day <= daysInMonth; day++) {
        const holidayName = getHolidayName(day);
        if (holidayName && !isWeekend(day) && !absenceRow[day]) {
          const hasProjectHours = getProjectHoursForDay(day) > 0;
          if (!hasProjectHours) {
            const entryDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            newEntries.push({
              user_profile_id: profile.id,
              company_id: profile.company_id,
              entry_date: entryDate,
              project_id: null,
              work_package_id: null,
              work_package_code: null,
              work_package_description: holidayName,
              hours: 8,
              category: 'public_holiday',
              created_by: profile.user_id
            });
          }
        }
      }

      // 4. Nicht förderfähige Arbeit
      for (let day = 1; day <= daysInMonth; day++) {
        const nonBillableHours = getNonBillableHoursForDay(day);
        if (nonBillableHours > 0) {
          const entryDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          newEntries.push({
            user_profile_id: profile.id,
            company_id: profile.company_id,
            entry_date: entryDate,
            project_id: null,
            work_package_id: null,
            work_package_code: 'NON_BILLABLE',
            work_package_description: 'Nicht förderfähige Arbeitszeit',
            hours: nonBillableHours,
            category: 'non_billable',
            created_by: profile.user_id
          });
        }
      }

      if (newEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('time_entries')
          .insert(newEntries);

        if (insertError) {
          throw new Error('Fehler beim Speichern: ' + insertError.message);
        }
      }

      const totals = getMonthTotals();
      setSuccess(`✅ ${monthNames[currentMonth - 1]} ${currentYear} gespeichert! Förderfähig: ${totals.project.toFixed(1)}h, Fehlzeiten: ${totals.absence.toFixed(1)}h, Nicht förderfähig: ${totals.nonBillable.toFixed(1)}h`);
      setTimeout(() => setSuccess(''), 8000);

    } catch (error: any) {
      console.error('Save error:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const getDropdownWorkPackages = () => {
    if (showAllAPs) {
      return allWorkPackages;
    }
    return workPackages;
  };

  // Render
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-900 mb-2">Laden...</div>
        </div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth();
  const monthTotals = getMonthTotals();
  const maxHours = getMaxMonthlyHours();
  const overMax = isOverMaxHours();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">🕐 Zeiterfassung</h1>
              <p className="text-blue-100 text-lg">
                für <span className="font-semibold text-white">{profile?.name}</span>
              </p>
              <p className="text-blue-200 text-sm mt-1">
                {workPackages.length} Arbeitspaket{workPackages.length !== 1 ? 'e' : ''} zugeordnet
                {profile?.contract_hours_per_week && (
                  <span className="ml-2">• {profile.contract_hours_per_week}h/Woche</span>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-blue-100 text-sm">Aktueller Monat</div>
              <div className="text-2xl font-bold">{monthNames[currentMonth - 1]} {currentYear}</div>
              <div className="text-blue-200 text-sm mt-1">
                {monthTotals.total.toFixed(1)}h / {maxHours.toFixed(1)}h max
              </div>
            </div>
          </div>
        </div>

        {/* Validierungs-Warnung */}
        {overMax && (
          <div className="mb-4 bg-red-100 border-2 border-red-500 text-red-800 px-4 py-3 rounded-lg flex items-center">
            <svg className="w-6 h-6 mr-3 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <strong>Maximale Monatsstunden überschritten!</strong>
              <div className="text-sm">
                Erfasst: {monthTotals.total.toFixed(1)}h | Maximum: {maxHours.toFixed(1)}h | Überschreitung: {(monthTotals.total - maxHours).toFixed(1)}h
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <button onClick={goToPreviousMonth} className="px-3 py-2 border rounded-lg hover:bg-gray-50">
                ← Vorheriger
              </button>
              <button onClick={goToCurrentMonth} className="px-3 py-2 border rounded-lg hover:bg-gray-50 font-medium">
                Heute
              </button>
              <button onClick={goToNextMonth} className="px-3 py-2 border rounded-lg hover:bg-gray-50">
                Nächster →
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center text-sm cursor-pointer" title="Alle Arbeitspakete im Dropdown anzeigen">
                <input
                  type="checkbox"
                  checked={showAllAPs}
                  onChange={(e) => setShowAllAPs(e.target.checked)}
                  className="mr-2"
                />
                Alle APs im Dropdown
              </label>
              <button
                onClick={addNewRow}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Zeile hinzufügen
              </button>
              <button
                onClick={handleSave}
                disabled={saving || overMax}
                className={`px-4 py-2 rounded-lg flex items-center font-medium ${
                  overMax 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {saving ? 'Speichert...' : 'Monat speichern'}
              </button>
            </div>
          </div>
        </div>

        {/* Matrix */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="sticky left-0 z-20 bg-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-600 border-b border-r" style={{ minWidth: '200px' }}>
                    Arbeitspaket
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const holiday = getHolidayName(day);
                    const isNonWorking = isNonWorkingDay(day);
                    return (
                      <th
                        key={day}
                        className={`px-1 py-2 text-center text-xs font-medium border-b ${
                          isNonWorking ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white'
                        }`}
                        style={{ minWidth: '40px' }}
                        title={holiday || undefined}
                      >
                        <div>{getDayLabel(day)}</div>
                        <div className="font-bold">{day}</div>
                        {holiday && <div className="text-[8px]">🎄</div>}
                      </th>
                    );
                  })}
                  <th className="sticky right-12 z-20 bg-green-600 text-white px-3 py-2 text-center text-xs font-medium border-b" style={{ minWidth: '60px' }}>
                    Summe
                  </th>
                  <th className="sticky right-0 z-20 bg-gray-100 px-2 py-2 text-center text-xs font-medium border-b" style={{ minWidth: '40px' }}>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Projektarbeit-Zeilen */}
                {entries.map((entry, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white px-2 py-2 border-b border-r">
                      <select
                        value={entry.work_package_id}
                        onChange={(e) => handleAPChange(rowIndex, e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        <option value="">-- AP auswählen --</option>
                        {getDropdownWorkPackages().map(wp => (
                          <option key={wp.id} value={wp.id}>
                            {wp.code} - {wp.description?.substring(0, 30)}
                          </option>
                        ))}
                      </select>
                      {entry.project_name && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center">
                          <span
                            className="w-2 h-2 rounded-full mr-1"
                            style={{ backgroundColor: entry.project_color }}
                          />
                          {entry.project_name}
                        </div>
                      )}
                    </td>

                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const isNonWorking = isNonWorkingDay(day);
                      const hasAbsence = absenceRow[day];
                      const value = entry.days[day];
                      
                      return (
                        <td
                          key={day}
                          className={`px-1 py-1 border-b text-center ${
                            isNonWorking ? 'bg-gray-100' : hasAbsence ? 'bg-gray-50' : ''
                          }`}
                        >
                          <input
                            type="text"
                            value={typeof value === 'number' ? value : ''}
                            onChange={(e) => handleHoursChange(rowIndex, day, e.target.value)}
                            disabled={isNonWorking || !!hasAbsence}
                            className={`w-full text-center text-sm rounded border px-1 py-1 ${
                              isNonWorking || hasAbsence
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                            }`}
                            placeholder={isNonWorking ? '-' : hasAbsence ? hasAbsence : ''}
                          />
                        </td>
                      );
                    })}

                    <td className="sticky right-12 z-10 bg-green-50 px-2 py-2 border-b text-center font-bold text-green-800">
                      {getRowTotal(entry).toFixed(1)}h
                    </td>

                    <td className="sticky right-0 z-10 bg-white px-2 py-2 border-b text-center">
                      <button
                        onClick={() => removeRow(rowIndex)}
                        className="text-red-500 hover:text-red-700"
                        title="Zeile entfernen"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Fehlzeiten-Zeile */}
                <tr className="bg-orange-50">
                  <td className="sticky left-0 z-10 bg-orange-50 px-3 py-2 border-b border-r font-medium text-orange-800">
                    Fehlzeiten (U/K/S)
                    <div className="text-xs font-normal text-orange-600">
                      U=Urlaub, K=Krank, S=Sonder
                    </div>
                  </td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const isNonWorking = isNonWorkingDay(day);
                    const holiday = getHolidayName(day);
                    const absence = absenceRow[day];
                    const absenceInfo = absence ? ABSENCE_TYPES[absence] : null;
                    
                    return (
                      <td key={day} className={`px-1 py-1 border-b text-center ${isNonWorking ? 'bg-gray-100' : ''}`}>
                        {holiday && !isWeekend(day) ? (
                          <div className="text-yellow-700 font-bold text-sm" title={holiday}>F</div>
                        ) : isNonWorking ? (
                          <div className="text-gray-400">-</div>
                        ) : absence ? (
                          // Abwesenheit eingetragen - zeige mit X zum Löschen
                          <div className={`relative group ${absenceInfo?.bgColor} rounded`}>
                            <input
                              type="text"
                              value={absence}
                              onChange={(e) => handleAbsenceChange(day, e.target.value)}
                              maxLength={1}
                              className={`w-full text-center text-sm rounded border-transparent px-1 py-1 font-bold uppercase ${absenceInfo?.bgColor} ${absenceInfo?.color} focus:border-orange-500 focus:ring-1`}
                            />
                            <button
                              onClick={() => clearAbsence(day)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Abwesenheit löschen"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          // Kein Eintrag - normales Eingabefeld
                          <input
                            type="text"
                            value=""
                            onChange={(e) => handleAbsenceChange(day, e.target.value)}
                            maxLength={1}
                            placeholder=""
                            className="w-full text-center text-sm rounded border px-1 py-1 font-bold uppercase hover:border-orange-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                          />
                        )}
                      </td>
                    );
                  })}
                  <td className="sticky right-12 z-10 bg-orange-100 px-2 py-2 border-b text-center font-bold text-orange-800">
                    {monthTotals.absence.toFixed(1)}h
                  </td>
                  <td className="sticky right-0 z-10 bg-orange-50 px-2 py-2 border-b"></td>
                </tr>

                {/* Summen-Zeilen */}
                
                {/* 1. Förderfähige Stunden */}
                <tr className="bg-green-50 font-bold">
                  <td className="sticky left-0 z-10 bg-green-50 px-3 py-2 border-b text-right text-green-800">
                    Σ Förderfähige Stunden:
                  </td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const total = getProjectHoursForDay(day);
                    const isNonWorking = isNonWorkingDay(day);
                    return (
                      <td key={day} className={`px-1 py-2 border-b text-center text-sm ${isNonWorking ? 'bg-gray-100 text-gray-400' : 'text-green-800'}`}>
                        {total > 0 ? total.toFixed(1) : '-'}
                      </td>
                    );
                  })}
                  <td className="sticky right-12 z-10 bg-green-200 px-2 py-2 border-b text-center text-lg text-green-900">
                    {monthTotals.project.toFixed(1)}h
                  </td>
                  <td className="sticky right-0 z-10 bg-green-50 px-2 py-2 border-b"></td>
                </tr>

                {/* 2. Fehlzeiten */}
                <tr className="bg-orange-50 font-bold">
                  <td className="sticky left-0 z-10 bg-orange-50 px-3 py-2 border-b text-right text-orange-800">
                    Σ Fehlzeiten (U/K/F/S):
                  </td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const isNonWorking = isWeekend(day);
                    const absence = absenceRow[day];
                    const holiday = getHolidayName(day);
                    
                    let display = '-';
                    let colorClass = 'text-gray-400';
                    
                    if (absence) {
                      display = absence;
                      const info = ABSENCE_TYPES[absence];
                      colorClass = info ? info.color : 'text-orange-800';
                    } else if (holiday && !isWeekend(day)) {
                      display = 'F';
                      colorClass = 'text-yellow-700';
                    }
                    
                    return (
                      <td key={day} className={`px-1 py-2 border-b text-center text-sm ${isNonWorking ? 'bg-gray-100' : ''} ${colorClass}`}>
                        {display}
                      </td>
                    );
                  })}
                  <td className="sticky right-12 z-10 bg-orange-200 px-2 py-2 border-b text-center text-lg text-orange-900">
                    {monthTotals.absence.toFixed(1)}h
                  </td>
                  <td className="sticky right-0 z-10 bg-orange-50 px-2 py-2 border-b"></td>
                </tr>

                {/* 3. Nicht förderfähig */}
                <tr className="bg-gray-100 font-bold">
                  <td className="sticky left-0 z-10 bg-gray-100 px-3 py-2 border-b text-right text-gray-700">
                    Σ Nicht förderfähig:
                  </td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const hours = getNonBillableHoursForDay(day);
                    const isNonWorking = isNonWorkingDay(day);
                    return (
                      <td key={day} className={`px-1 py-2 border-b text-center text-sm ${isNonWorking ? 'bg-gray-200 text-gray-400' : hours > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                        {hours > 0 ? hours.toFixed(0) : '-'}
                      </td>
                    );
                  })}
                  <td className="sticky right-12 z-10 bg-gray-300 px-2 py-2 border-b text-center text-lg text-gray-800">
                    {monthTotals.nonBillable.toFixed(1)}h
                  </td>
                  <td className="sticky right-0 z-10 bg-gray-100 px-2 py-2 border-b"></td>
                </tr>

                {/* GESAMT */}
                <tr className={`font-bold ${overMax ? 'bg-red-100' : 'bg-yellow-100'}`}>
                  <td className={`sticky left-0 z-10 px-3 py-3 border-t-2 ${overMax ? 'bg-red-100 border-red-400 text-red-800' : 'bg-yellow-100 border-yellow-400 text-yellow-800'} text-right`}>
                    GESAMT:
                  </td>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const total = getProjectHoursForDay(day) + getAbsenceHoursForDay(day) + getNonBillableHoursForDay(day);
                    const isNonWorking = isWeekend(day);
                    const isOver8 = total > 8;
                    
                    return (
                      <td key={day} className={`px-1 py-3 border-t-2 ${overMax ? 'border-red-400' : 'border-yellow-400'} text-center text-sm ${
                        isNonWorking ? 'bg-gray-100 text-gray-400' : 
                        isOver8 ? 'bg-red-200 text-red-700' : 
                        overMax ? 'text-red-800' : 'text-yellow-800'
                      }`}>
                        {total > 0 ? total.toFixed(0) : '-'}
                      </td>
                    );
                  })}
                  <td className={`sticky right-12 z-10 px-2 py-3 border-t-2 text-center text-lg ${
                    overMax ? 'bg-red-300 border-red-400 text-red-900' : 'bg-yellow-200 border-yellow-400 text-yellow-900'
                  }`}>
                    {monthTotals.total.toFixed(1)}h
                    <div className="text-xs font-normal">/ {maxHours.toFixed(0)}h</div>
                  </td>
                  <td className={`sticky right-0 z-10 px-2 py-3 border-t-2 ${overMax ? 'bg-red-100 border-red-400' : 'bg-yellow-100 border-yellow-400'}`}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Legende */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center"><div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>Wochenende/Feiertag</div>
          <div className="flex items-center"><div className="w-4 h-4 bg-green-100 rounded mr-2"></div>U = Urlaub</div>
          <div className="flex items-center"><div className="w-4 h-4 bg-red-100 rounded mr-2"></div>K = Krankheit</div>
          <div className="flex items-center"><div className="w-4 h-4 bg-yellow-100 rounded mr-2"></div>F = Feiertag</div>
          <div className="flex items-center"><div className="w-4 h-4 bg-purple-100 rounded mr-2"></div>S = Sonderurlaub</div>
          <div className="flex items-center"><div className="w-4 h-4 bg-red-200 rounded mr-2"></div>&gt;8h/Tag</div>
        </div>

        {/* Zusammenfassung */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Monatszusammenfassung</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{monthTotals.project.toFixed(1)}h</div>
              <div className="text-sm text-green-600">Förderfähig</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-700">{monthTotals.absence.toFixed(1)}h</div>
              <div className="text-sm text-orange-600">Fehlzeiten</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-700">{monthTotals.nonBillable.toFixed(1)}h</div>
              <div className="text-sm text-gray-600">Nicht förderfähig</div>
            </div>
            <div className={`rounded-lg p-4 text-center ${overMax ? 'bg-red-100' : 'bg-blue-50'}`}>
              <div className={`text-2xl font-bold ${overMax ? 'text-red-700' : 'text-blue-700'}`}>
                {monthTotals.total.toFixed(1)}h
              </div>
              <div className={`text-sm ${overMax ? 'text-red-600' : 'text-blue-600'}`}>Gesamt</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-700">{maxHours.toFixed(1)}h</div>
              <div className="text-sm text-gray-600">Maximum</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Auslastung</span>
              <span>{Math.round((monthTotals.total / maxHours) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  overMax ? 'bg-red-500' : monthTotals.total >= maxHours * 0.9 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, (monthTotals.total / maxHours) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}