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
  days: { [day: number]: number };
}

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
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [entries, setEntries] = useState<MonthEntry[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter
  const [showAllAPs, setShowAllAPs] = useState(false);
  
  // Date Navigation
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);

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

      // User & Profil laden
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profileData) {
        setError('Profil nicht gefunden');
        return;
      }
      setProfile(profileData);

      // Arbeitspakete laden - nur die, denen der MA zugeordnet ist
      let wpQuery = supabase
        .from('work_packages')
        .select(`
          id,
          code,
          description,
          estimated_hours,
          project_id,
          project:projects(id, name, color)
        `)
        .eq('company_id', profileData.company_id)
        .eq('is_active', true)
        .order('display_order');

      // Wenn nicht "Alle APs zeigen", dann nur zugeordnete
      if (!showAllAPs && profileData.role === 'employee') {
        // Hole erst die zugeordneten AP-IDs
        const { data: assignmentData } = await supabase
          .from('work_package_assignments')
          .select('work_package_id')
          .eq('user_profile_id', profileData.id);

        if (assignmentData && assignmentData.length > 0) {
          const wpIds = assignmentData.map(a => a.work_package_id);
          wpQuery = wpQuery.in('id', wpIds);
        }
      }

      const { data: wpData, error: wpError } = await wpQuery;
      
      if (wpError) {
        console.error('Error loading work packages:', wpError);
      }
      
      setWorkPackages(wpData || []);

      // Feiertage laden
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

      const { data: holidayData } = await supabase
        .from('public_holidays')
        .select('holiday_date, name')
        .gte('holiday_date', startDate)
        .lte('holiday_date', endDate);

      setHolidays(holidayData || []);

      // Bestehende Zeiteinträge laden
      const { data: timeData } = await supabase
        .from('time_entries')
        .select(`
          id,
          entry_date,
          hours,
          work_package_code,
          project_id,
          project:projects(id, name, color)
        `)
        .eq('user_profile_id', profileData.id)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      // Gruppiere nach Arbeitspaket
      const entriesMap: { [key: string]: MonthEntry } = {};

      if (timeData) {
        timeData.forEach((entry: any) => {
          const key = `${entry.project_id}-${entry.work_package_code}`;
          const day = new Date(entry.entry_date).getDate();
          const proj = getProject(entry.project);

          if (!entriesMap[key]) {
            entriesMap[key] = {
              work_package_id: '',
              work_package_code: entry.work_package_code,
              work_package_description: '',
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

    } catch (error: any) {
      console.error('Error:', error);
      setError('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  // ============ Navigation ============

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

  // ============ Helpers ============

  const getDaysInMonth = () => {
    return new Date(currentYear, currentMonth, 0).getDate();
  };

  const isWeekend = (day: number) => {
    const date = new Date(currentYear, currentMonth - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const getHolidayName = (day: number) => {
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

  // ============ Entry Management ============

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
    const wp = workPackages.find(w => w.id === wpId);
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

  const handleHoursChange = (index: number, day: number, hours: string) => {
    const newEntries = [...entries];
    const entry = newEntries[index];
    
    if (hours === '' || hours === '0') {
      delete entry.days[day];
    } else {
      const value = Math.min(24, Math.max(0, parseFloat(hours) || 0));
      entry.days[day] = Math.round(value * 100) / 100;
    }
    
    setEntries(newEntries);
  };

  const getRowTotal = (entry: MonthEntry) => {
    return Object.values(entry.days).reduce((sum, h) => sum + h, 0);
  };

  const getDayTotal = (day: number) => {
    return entries.reduce((sum, entry) => sum + (entry.days[day] || 0), 0);
  };

  const getMonthTotal = () => {
    return entries.reduce((sum, entry) => sum + getRowTotal(entry), 0);
  };

  // ============ Speichern ============

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validierung
      for (const entry of entries) {
        if (!entry.work_package_code) {
          throw new Error('Bitte alle Arbeitspakete auswählen');
        }
      }

      // Alte Einträge für diesen Monat löschen
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

      await supabase
        .from('time_entries')
        .delete()
        .eq('user_profile_id', profile.id)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      // Neue Einträge erstellen
      const newEntries: any[] = [];

      for (const entry of entries) {
        for (const [dayStr, hours] of Object.entries(entry.days)) {
          if (hours > 0) {
            const day = parseInt(dayStr);
            const entryDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            newEntries.push({
              user_profile_id: profile.id,
              company_id: profile.company_id,
              entry_date: entryDate,
              project_id: entry.project_id,
              work_package_code: entry.work_package_code,
              work_package_description: entry.work_package_description,
              hours: hours,
              category: 'project_work',
              created_by: profile.user_id
            });
          }
        }
      }

      if (newEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('time_entries')
          .insert(newEntries);

        if (insertError) throw insertError;
      }

      setSuccess(`${newEntries.length} Einträge für ${monthNames[currentMonth - 1]} ${currentYear} gespeichert!`);
      setTimeout(() => setSuccess(''), 5000);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ============ Geplante Stunden berechnen ============

  const getPlannedHoursForAP = (wpCode: string) => {
    const wp = workPackages.find(w => w.code === wpCode);
    return wp?.estimated_hours || 0;
  };

  // ============ Render ============

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 mb-2">Laden...</div>
          <div className="text-sm text-gray-600">Zeiterfassung wird geladen</div>
        </div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth();

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
        {/* Header mit Mitarbeiter-Info */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">🕐 Zeiterfassung</h1>
              <p className="text-blue-100 text-lg">
                für <span className="font-semibold text-white">{profile?.name}</span>
              </p>
              <p className="text-blue-200 text-sm mt-1">
                {workPackages.length} Arbeitspaket{workPackages.length !== 1 ? 'e' : ''} zugeordnet
              </p>
            </div>
            <div className="text-right">
              <div className="text-blue-100 text-sm">Aktueller Monat</div>
              <div className="text-2xl font-bold">{monthNames[currentMonth - 1]} {currentYear}</div>
              <div className="text-blue-200 text-sm mt-1">
                {getMonthTotal().toFixed(1)}h erfasst
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Monats-Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousMonth}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50"
              >
                ← Vorheriger
              </button>
              <button
                onClick={goToCurrentMonth}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50 font-medium"
              >
                Heute
              </button>
              <button
                onClick={goToNextMonth}
                className="px-3 py-2 border rounded-lg hover:bg-gray-50"
              >
                Nächster →
              </button>
            </div>

            {/* Filter & Aktionen */}
            <div className="flex items-center space-x-4">
              {profile?.role !== 'employee' && (
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={showAllAPs}
                    onChange={(e) => {
                      setShowAllAPs(e.target.checked);
                      setTimeout(loadData, 100);
                    }}
                    className="mr-2"
                  />
                  Alle APs anzeigen
                </label>
              )}
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
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {saving ? 'Speichert...' : 'Monat speichern'}
              </button>
            </div>
          </div>
        </div>

        {/* Keine APs zugeordnet */}
        {workPackages.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center mb-6">
            <svg className="w-12 h-12 mx-auto text-yellow-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-medium text-yellow-800 mb-2">Keine Arbeitspakete zugeordnet</h3>
            <p className="text-yellow-700 text-sm">
              Sie sind keinen Arbeitspaketen zugeordnet. Bitte wenden Sie sich an Ihren Projektleiter.
            </p>
          </div>
        )}

        {/* Matrix */}
        {workPackages.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  {/* Header Row 1: Tage */}
                  <tr className="bg-gray-100">
                    <th className="sticky left-0 z-20 bg-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-600 border-b border-r min-w-[200px]">
                      Arbeitspaket
                    </th>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const holiday = getHolidayName(day);
                      const isNonWorking = isNonWorkingDay(day);
                      return (
                        <th
                          key={day}
                          className={`px-1 py-2 text-center text-xs font-medium border-b min-w-[40px] ${
                            isNonWorking ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 text-white'
                          }`}
                          title={holiday || undefined}
                        >
                          <div>{getDayLabel(day)}</div>
                          <div className="font-bold">{day}</div>
                        </th>
                      );
                    })}
                    <th className="sticky right-12 z-20 bg-green-600 text-white px-3 py-2 text-center text-xs font-medium border-b min-w-[60px]">
                      Summe
                    </th>
                    <th className="sticky right-0 z-20 bg-gray-100 px-2 py-2 text-center text-xs font-medium border-b min-w-[40px]">
                      
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {/* AP Dropdown */}
                      <td className="sticky left-0 z-10 bg-white px-2 py-2 border-b border-r">
                        <select
                          value={entry.work_package_id}
                          onChange={(e) => handleAPChange(rowIndex, e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm"
                        >
                          <option value="">-- AP auswählen --</option>
                          {workPackages.map(wp => (
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

                      {/* Tages-Inputs */}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const isNonWorking = isNonWorkingDay(day);
                        return (
                          <td
                            key={day}
                            className={`px-1 py-1 border-b text-center ${
                              isNonWorking ? 'bg-gray-100' : ''
                            }`}
                          >
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              value={entry.days[day] || ''}
                              onChange={(e) => handleHoursChange(rowIndex, day, e.target.value)}
                              disabled={isNonWorking}
                              className={`w-full text-center text-sm rounded border px-1 py-1 ${
                                isNonWorking
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                              }`}
                              placeholder={isNonWorking ? '-' : ''}
                            />
                          </td>
                        );
                      })}

                      {/* Zeilen-Summe */}
                      <td className="sticky right-12 z-10 bg-green-50 px-2 py-2 border-b text-center font-bold text-green-800">
                        {getRowTotal(entry).toFixed(1)}h
                        {entry.work_package_code && getPlannedHoursForAP(entry.work_package_code) > 0 && (
                          <div className="text-xs font-normal text-gray-500">
                            / {getPlannedHoursForAP(entry.work_package_code)}h
                          </div>
                        )}
                      </td>

                      {/* Löschen Button */}
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

                  {/* Summen-Zeile */}
                  <tr className="bg-yellow-50 font-bold">
                    <td className="sticky left-0 z-10 bg-yellow-50 px-3 py-3 border-t-2 border-yellow-300 text-right">
                      Tages-Summe:
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const total = getDayTotal(day);
                      const isNonWorking = isNonWorkingDay(day);
                      const isOver8 = total > 8;
                      return (
                        <td
                          key={day}
                          className={`px-1 py-3 border-t-2 border-yellow-300 text-center text-sm ${
                            isNonWorking ? 'bg-gray-100 text-gray-400' : 
                            isOver8 ? 'bg-red-100 text-red-700' : 'text-yellow-800'
                          }`}
                        >
                          {total > 0 ? total.toFixed(1) : '-'}
                        </td>
                      );
                    })}
                    <td className="sticky right-12 z-10 bg-yellow-200 px-2 py-3 border-t-2 border-yellow-300 text-center text-lg">
                      {getMonthTotal().toFixed(1)}h
                    </td>
                    <td className="sticky right-0 z-10 bg-yellow-50 px-2 py-3 border-t-2 border-yellow-300"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legende */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
            Wochenende / Feiertag
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-100 rounded mr-2"></div>
            Mehr als 8h/Tag
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-50 rounded mr-2"></div>
            Zeilen-Summe
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-50 rounded mr-2"></div>
            Tages-Summe
          </div>
        </div>
      </div>
    </div>
  );
}