'use client';

import { useEffect, useState, useRef } from 'react';
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
  days: { [day: number]: number };
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
  const [companyStateCode, setCompanyStateCode] = useState<string>('DE-NW');
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

  // NEU: Track ob Änderungen vorliegen
  const [hasChanges, setHasChanges] = useState(false);
  const initialLoadDone = useRef(false);

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  // NEU: Änderungen tracken
  useEffect(() => {
    if (initialLoadDone.current) {
      setHasChanges(true);
    }
  }, [entries, absenceRow]);

  useEffect(() => {
    loadData();
  }, [currentYear, currentMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      initialLoadDone.current = false;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select(`
          *,
          companies (
            id,
            name,
            state_code
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        setError('Profil nicht gefunden');
        return;
      }
      setProfile(profileData);

      const stateCode = (profileData.companies as any)?.state_code || 'DE-NW';
      setCompanyStateCode(stateCode);

      // Arbeitspakete die dem User zugeordnet sind
      const { data: assignedWPs } = await supabase
        .from('work_package_assignments')
        .select(`
          work_package_id,
          work_packages (
            id,
            code,
            description,
            estimated_hours,
            project_id,
            project:projects (id, name, color)
          )
        `)
        .eq('user_profile_id', profileData.id);

      const myWPs = (assignedWPs || [])
        .map((a: any) => a.work_packages)
        .filter(Boolean);
      setWorkPackages(myWPs);

      // Alle Arbeitspakete der Firma
      const { data: allWPs } = await supabase
        .from('work_packages')
        .select(`
          id,
          code,
          description,
          estimated_hours,
          project_id,
          project:projects!inner (id, name, color, company_id)
        `)
        .eq('projects.company_id', profileData.company_id)
        .eq('is_active', true)
        .order('code');

      setAllWorkPackages(allWPs || []);

      // Feiertage laden
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      const { data: holidaysData } = await supabase
        .from('public_holidays')
        .select('holiday_date, name, state_code, is_regional_only')
        .eq('country', 'DE')
        .gte('holiday_date', startDate)
        .lte('holiday_date', endDate);

      const filteredHolidays = (holidaysData || []).filter(h => 
        h.state_code === null || h.state_code === stateCode
      ).filter(h => !h.is_regional_only);

      const uniqueHolidays: Holiday[] = [];
      const seenDates = new Set<string>();
      
      for (const h of filteredHolidays) {
        if (!seenDates.has(h.holiday_date)) {
          seenDates.add(h.holiday_date);
          uniqueHolidays.push({ holiday_date: h.holiday_date, name: h.name });
        }
      }

      setHolidays(uniqueHolidays);

      // Bestehende Einträge laden
      const { data: existingEntries } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_profile_id', profileData.id)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      const entriesMap: { [wpId: string]: MonthEntry } = {};
      const newAbsenceRow: { [day: number]: 'U' | 'K' | 'S' | null } = {};

      for (const entry of (existingEntries || [])) {
        const day = new Date(entry.entry_date).getDate();

        if (entry.category === 'vacation') {
          newAbsenceRow[day] = 'U';
        } else if (entry.category === 'sick_leave') {
          newAbsenceRow[day] = 'K';
        } else if (entry.category === 'other_absence') {
          // Nur als Sonderurlaub behandeln wenn es KEIN Feiertag/Non-Billable ist
          if (entry.work_package_code !== 'HOLIDAY' && entry.work_package_code !== 'NON_BILLABLE') {
            newAbsenceRow[day] = 'S';
          }
          // HOLIDAY und NON_BILLABLE Einträge ignorieren - werden neu berechnet
        } else if (entry.category === 'project_work' && entry.work_package_id) {
          if (!entriesMap[entry.work_package_id]) {
            const wp = allWPs?.find((w: any) => w.id === entry.work_package_id);
            const proj = wp ? getProject(wp.project) : null;
            entriesMap[entry.work_package_id] = {
              work_package_id: entry.work_package_id,
              work_package_code: entry.work_package_code || '',
              work_package_description: entry.work_package_description || '',
              project_id: entry.project_id || '',
              project_name: proj?.name || '',
              project_color: proj?.color || '#3B82F6',
              days: {}
            };
          }
          entriesMap[entry.work_package_id].days[day] = entry.hours;
        }
      }

      setAbsenceRow(newAbsenceRow);
      setEntries(Object.values(entriesMap));
      
      // Nach dem Laden: keine Änderungen
      setTimeout(() => {
        initialLoadDone.current = true;
        setHasChanges(false);
      }, 100);

    } catch (error: any) {
      console.error('Load error:', error);
      setError('Fehler beim Laden: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // NEU: Auto-Save Funktion (ohne UI-Blockierung)
  // ============================================
  const autoSave = async (): Promise<boolean> => {
    if (!profile || !hasChanges) return true;
    
    // Prüfen ob überhaupt Daten zum Speichern da sind
    const hasData = entries.some(e => Object.keys(e.days).length > 0) || Object.keys(absenceRow).length > 0;
    if (!hasData) return true;

    try {
      // Validierung
      for (const entry of entries) {
        const hasHours = Object.values(entry.days).some(v => typeof v === 'number' && v > 0);
        if (hasHours && !entry.work_package_id) {
          setError('Bitte wählen Sie für alle Zeilen mit Stunden ein Arbeitspaket aus.');
          return false;
        }
      }

      const totals = getMonthTotals();
      const maxHours = getMaxMonthlyHours();
      
      if (totals.billableTotal > maxHours) {
        setError(`Die erfassten Stunden (${totals.billableTotal.toFixed(1)}h) überschreiten das Maximum von ${maxHours.toFixed(1)}h. Bitte korrigieren Sie die Einträge.`);
        return false;
      }

      setSaving(true);

      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      // Alte Einträge löschen
      const { error: deleteError } = await supabase
        .from('time_entries')
        .delete()
        .eq('user_profile_id', profile.id)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (deleteError) throw deleteError;

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

      // 3. Feiertage - werden NICHT separat gespeichert, nur in der Anzeige berechnet
      // (Die DB erlaubt nur: project_work, vacation, sick_leave)

      // 4. Nicht förderfähige Arbeit - wird NICHT separat gespeichert, nur in der Anzeige berechnet
      // (Differenz zu 8h wird automatisch als "nicht förderfähig" angezeigt)

      if (newEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('time_entries')
          .insert(newEntries);

        if (insertError) throw insertError;
      }

      setHasChanges(false);
      return true;

    } catch (error: any) {
      console.error('Auto-save error:', error);
      setError('Fehler beim automatischen Speichern: ' + error.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // Navigation MIT Auto-Save
  // ============================================
  const goToPreviousMonth = async () => {
    if (hasChanges) {
      const saved = await autoSave();
      if (!saved) return; // Bei Fehler nicht wechseln
    }
    
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = async () => {
    if (hasChanges) {
      const saved = await autoSave();
      if (!saved) return;
    }
    
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToCurrentMonth = async () => {
    if (hasChanges) {
      const saved = await autoSave();
      if (!saved) return;
    }
    
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  const handleMonthChange = async (newMonth: number) => {
    if (hasChanges) {
      const saved = await autoSave();
      if (!saved) return;
    }
    setCurrentMonth(newMonth);
  };

  const handleYearChange = async (newYear: number) => {
    if (hasChanges) {
      const saved = await autoSave();
      if (!saved) return;
    }
    setCurrentYear(newYear);
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
    const weeklyHours = profile?.weekly_hours_contract || profile?.contract_hours_per_week || 40;
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
      setEntries(prev => prev.map(entry => {
        if (entry.days[day]) {
          const newDays = { ...entry.days };
          delete newDays[day];
          return { ...entry, days: newDays };
        }
        return entry;
      }));
    } else {
      setAbsenceRow(prev => {
        const newAbsences = { ...prev };
        delete newAbsences[day];
        return newAbsences;
      });
    }
  };
  
  const clearAbsence = (day: number) => {
    setAbsenceRow(prev => {
      const newAbsences = { ...prev };
      delete newAbsences[day];
      return newAbsences;
    });
  };

  // Summen-Berechnungen
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
    if (absenceRow[day]) return 0; // Volle Abwesenheit (U/K/S) = kein nicht-förderfähig
    
    const projectHours = getProjectHoursForDay(day);
    const dailyTarget = 8; // Soll-Stunden pro Tag
    
    // Differenz zwischen Soll und Projekt-Ist = nicht förderfähig
    const nonBillable = Math.max(0, dailyTarget - projectHours);
    return nonBillable;
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
      total: projectTotal + absenceTotal + nonBillableTotal,
      billableTotal: projectTotal + absenceTotal
    };
  };

  const isOverMaxHours = () => {
    const totals = getMonthTotals();
    return totals.billableTotal > getMaxMonthlyHours();
  };

  // Manuelles Speichern
  const handleSave = async () => {
    const saved = await autoSave();
    if (saved) {
      const totals = getMonthTotals();
      setSuccess(`✅ ${monthNames[currentMonth - 1]} ${currentYear} gespeichert! Förderfähig: ${totals.project.toFixed(1)}h, Fehlzeiten: ${totals.absence.toFixed(1)}h`);
      setTimeout(() => setSuccess(''), 5000);
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
            <div className="flex items-center space-x-4">
              {/* NEU: Änderungs-Indikator */}
              {hasChanges && (
                <span className="flex items-center text-amber-600 text-sm">
                  <span className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></span>
                  Ungespeicherte Änderungen
                </span>
              )}
              <span className="text-sm text-gray-500">
                📍 Feiertage: {companyStateCode.replace('DE-', '')}
              </span>
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
                {(profile?.weekly_hours_contract || profile?.contract_hours_per_week) && (
                  <span className="ml-2">• {profile?.weekly_hours_contract || profile?.contract_hours_per_week}h/Woche</span>
                )}
              </p>
            </div>
            <div className="text-right">
              <div className="text-blue-100 text-sm">Aktueller Monat</div>
              <div className="text-2xl font-bold">{monthNames[currentMonth - 1]} {currentYear}</div>
              <div className="text-blue-200 text-sm mt-1">
                {monthTotals.billableTotal.toFixed(1)}h / {maxHours.toFixed(1)}h max
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
                Förderfähig + Fehlzeiten: {monthTotals.billableTotal.toFixed(1)}h | Maximum: {maxHours.toFixed(1)}h
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
            <span>❌ {error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">✕</button>
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
              <button 
                onClick={goToPreviousMonth} 
                disabled={saving}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                ← Vorheriger
              </button>
              <button 
                onClick={goToCurrentMonth} 
                disabled={saving}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                Heute
              </button>
              <button 
                onClick={goToNextMonth} 
                disabled={saving}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Nächster →
              </button>
              
              <div className="border-l pl-4 ml-2 flex items-center space-x-2">
                <select
                  value={currentMonth}
                  onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                  disabled={saving}
                  className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 cursor-pointer font-medium disabled:opacity-50"
                >
                  {monthNames.map((name, index) => (
                    <option key={index + 1} value={index + 1}>{name}</option>
                  ))}
                </select>
                <select
                  value={currentYear}
                  onChange={(e) => handleYearChange(parseInt(e.target.value))}
                  disabled={saving}
                  className="px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 cursor-pointer font-medium disabled:opacity-50"
                >
                  {Array.from({ length: new Date().getFullYear() - 2020 + 6 }, (_, i) => 2020 + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center text-sm cursor-pointer">
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
                    : hasChanges
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-green-600 text-white hover:bg-green-700'
                } disabled:bg-gray-400`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {saving ? 'Speichert...' : hasChanges ? 'Speichern *' : 'Gespeichert ✓'}
              </button>
            </div>
          </div>
          
          {/* NEU: Auto-Save Hinweis */}
          <div className="mt-3 text-xs text-gray-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Änderungen werden beim Monatswechsel automatisch gespeichert
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
            <div className={`rounded-lg p-4 text-center border-2 ${overMax ? 'bg-red-50 border-red-400' : 'bg-blue-50 border-blue-400'}`}>
              <div className={`text-2xl font-bold ${overMax ? 'text-red-700' : 'text-blue-700'}`}>
                {monthTotals.billableTotal.toFixed(1)}h
              </div>
              <div className={`text-sm ${overMax ? 'text-red-600' : 'text-blue-600'}`}>
                Summe (max {maxHours.toFixed(0)}h)
              </div>
            </div>
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-700">{monthTotals.nonBillable.toFixed(1)}h</div>
              <div className="text-sm text-gray-600">Nicht förderfähig</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">{monthTotals.total.toFixed(1)}h</div>
              <div className="text-sm text-yellow-600">Gesamt</div>
            </div>
          </div>
          
          {/* Fortschrittsbalken */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Auslastung (Förderfähig + Fehlzeiten)</span>
              <span>{Math.round((monthTotals.billableTotal / maxHours) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  overMax ? 'bg-red-500' : monthTotals.billableTotal >= maxHours * 0.9 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, (monthTotals.billableTotal / maxHours) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Feiertage-Liste */}
          {holidays.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-2">🎄 Feiertage im {monthNames[currentMonth - 1]}:</h4>
              <div className="flex flex-wrap gap-2">
                {holidays.map(h => (
                  <span key={h.holiday_date} className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                    {new Date(h.holiday_date).getDate()}. - {h.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}