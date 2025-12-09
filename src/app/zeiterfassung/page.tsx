'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Header from '@/components/Header';

// ============================================
// INTERFACES
// ============================================

interface ProjectInfo {
  id: string;
  name: string;
  color: string;
  funding_number?: string;
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
  days: { [day: number]: number | string }; // number für Stunden, string für U/K/S
}

interface OtherProjectHours {
  [day: number]: {
    total: number;
    details: { projectName: string; hours: number }[];
  };
}

// ============================================
// FARBSCHEMA
// ============================================

const COLORS = {
  gruen: {
    hell: '#e8f5e9',
    mittel: '#a5d6a7',
    text: '#2e7d32',
  },
  gelb: {
    hell: '#fffde7',
    mittel: '#fff59d',
    text: '#f57f17',
  },
  blau: {
    hell: '#e3f2fd',
    mittel: '#90caf9',
    text: '#1565c0',
  },
  grau: {
    hell: '#f5f5f5',
    mittel: '#e0e0e0',
    dunkel: '#616161',
  },
  wochenende: '#d5d5d5',  // Deutlich grau für Wochenenden
  feiertag: '#ffcdd2',
  header: '#37474f',
};

// Fehlzeit-Badges
const ABSENCE_BADGES: { [key: string]: { label: string; bgColor: string; textColor: string } } = {
  'U': { label: 'Urlaub', bgColor: '#bbdefb', textColor: '#1565c0' },
  'K': { label: 'Krankheit', bgColor: '#ffcdd2', textColor: '#c62828' },
  'S': { label: 'Sonderurlaub', bgColor: '#e1bee7', textColor: '#7b1fa2' },
  'F': { label: 'Feiertag', bgColor: '#cfd8dc', textColor: '#455a64' },
};

// Verfügbarkeits-Ampel
const AVAILABILITY_COLORS = {
  full: { bg: '#c8e6c9', text: '#2e7d32', icon: '🟢' },      // 8h verfügbar
  partial: { bg: '#fff9c4', text: '#f57f17', icon: '🟡' },   // 1-7h verfügbar
  none: { bg: '#ffcdd2', text: '#c62828', icon: '🔴' },      // 0h verfügbar
  weekend: { bg: '#d5d5d5', text: '#757575', icon: '⬜' },   // Wochenende/Feiertag (grau)
};

// ============================================
// HAUPTKOMPONENTE
// ============================================

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

  // ============================================
  // STATES
  // ============================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [companyStateCode, setCompanyStateCode] = useState<string>('DE-NW');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [entries, setEntries] = useState<MonthEntry[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [hasChanges, setHasChanges] = useState(false);
  const initialLoadDone = useRef(false);

  // Admin-Funktionen
  const [isAdmin, setIsAdmin] = useState(false);
  const [companyEmployees, setCompanyEmployees] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  // NEU: Projekt-Auswahl
  const [availableProjects, setAvailableProjects] = useState<ProjectInfo[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<ProjectInfo | null>(null);
  const [projectWorkPackages, setProjectWorkPackages] = useState<WorkPackage[]>([]);

  // NEU: Andere Projekt-Stunden & Verfügbarkeit
  const [otherProjectHours, setOtherProjectHours] = useState<OtherProjectHours>({});
  const [globalAbsences, setGlobalAbsences] = useState<{ [day: number]: string }>({});
  const [availableHoursPerDay, setAvailableHoursPerDay] = useState<{ [day: number]: number }>({});

  // NEU: Auto-Fill Checkbox
  const [autoFillEnabled, setAutoFillEnabled] = useState(false);

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  const getDaysInMonth = () => new Date(currentYear, currentMonth, 0).getDate();

  const isWeekend = (day: number): boolean => {
    const date = new Date(currentYear, currentMonth - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const getDayName = (day: number): string => {
    const date = new Date(currentYear, currentMonth - 1, day);
    return dayNames[date.getDay()];
  };

  const getHolidayName = (day: number): string | null => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const holiday = holidays.find(h => h.holiday_date === dateStr);
    return holiday ? holiday.name : null;
  };

  const isNonWorkingDay = (day: number): boolean => {
    return isWeekend(day) || getHolidayName(day) !== null;
  };

  const checkIsAdmin = (role: string): boolean => {
    return role === 'admin' || role === 'company_admin';
  };

  const getMaxMonthlyHours = () => {
    const targetProfile = selectedProfile || profile;
    const weeklyHours = targetProfile?.weekly_hours_contract || targetProfile?.contract_hours_per_week || 40;
    return Math.round((weeklyHours * 52) / 12 * 100) / 100;
  };

  const getDailyTargetHours = (): number => {
    const targetProfile = selectedProfile || profile;
    const weeklyHours = targetProfile?.weekly_hours_contract || targetProfile?.contract_hours_per_week || 40;
    return weeklyHours / 5; // 5-Tage-Woche
  };

  // ============================================
  // VERFÜGBARKEITS-BERECHNUNG
  // ============================================

  const calculateAvailability = () => {
    const daysInMonth = getDaysInMonth();
    const dailyTarget = getDailyTargetHours();
    const newAvailability: { [day: number]: number } = {};

    for (let day = 1; day <= daysInMonth; day++) {
      if (isNonWorkingDay(day)) {
        newAvailability[day] = 0;
      } else if (globalAbsences[day]) {
        newAvailability[day] = 0;
      } else {
        const otherHours = otherProjectHours[day]?.total || 0;
        newAvailability[day] = Math.max(0, dailyTarget - otherHours);
      }
    }

    setAvailableHoursPerDay(newAvailability);
  };

  const getAvailabilityColor = (day: number): typeof AVAILABILITY_COLORS.full => {
    if (isNonWorkingDay(day)) return AVAILABILITY_COLORS.weekend;
    if (globalAbsences[day]) return AVAILABILITY_COLORS.weekend;
    
    const available = availableHoursPerDay[day] || 0;
    const dailyTarget = getDailyTargetHours();
    
    if (available >= dailyTarget) return AVAILABILITY_COLORS.full;
    if (available > 0) return AVAILABILITY_COLORS.partial;
    return AVAILABILITY_COLORS.none;
  };

  // ============================================
  // EFFECTS
  // ============================================

  // Warnung bei ungespeicherten Änderungen (Browser-Navigation, Tab schließen)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = 'Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  // Flag für Header-Navigation setzen (wird von Header.tsx gelesen)
  useEffect(() => {
    (window as any).hasUnsavedChanges = hasChanges;
    return () => {
      (window as any).hasUnsavedChanges = false;
    };
  }, [hasChanges]);

  useEffect(() => {
    if (initialLoadDone.current) {
      setHasChanges(true);
    }
  }, [entries]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Projekte laden wenn sich MA oder Monat ändert
  useEffect(() => {
    if (profile && selectedProfileId) {
      const adminStatus = checkIsAdmin(profile.role);
      loadProjectsForEmployee(selectedProfileId, adminStatus, profile.company_id);
    }
  }, [selectedProfileId, currentYear, currentMonth, profile]);

  useEffect(() => {
    if (selectedProjectId && selectedProfileId) {
      loadProjectTimesheet();
    }
  }, [selectedProjectId, selectedProfileId, currentYear, currentMonth]);

  useEffect(() => {
    calculateAvailability();
  }, [otherProjectHours, globalAbsences, holidays, currentYear, currentMonth]);

  // ============================================
  // DATA LOADING
  // ============================================

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('=== loadInitialData START ===');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      console.log('User:', user.id);

      // Eigenes Profil laden
      const { data: profileData, error: profileError } = await supabase
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

      console.log('Profile:', profileData, 'Error:', profileError);

      if (!profileData) {
        setError('Profil nicht gefunden');
        return;
      }

      setProfile(profileData);
      const adminStatus = checkIsAdmin(profileData.role);
      setIsAdmin(adminStatus);
      console.log('IsAdmin:', adminStatus, 'Role:', profileData.role);

      const stateCode = (profileData.companies as any)?.state_code || 'DE-NW';
      setCompanyStateCode(stateCode);

      // Feiertage laden
      await loadHolidays(stateCode);

      // Für Admins: Alle Mitarbeiter der Firma laden
      if (adminStatus) {
        const { data: employees } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, name, email, job_function, weekly_hours_contract, contract_hours_per_week')
          .eq('company_id', profileData.company_id)
          .eq('is_active', true)
          .order('last_name');

        console.log('Employees:', employees);
        setCompanyEmployees(employees || []);
      }

      // Sich selbst als Standard auswählen
      setSelectedProfileId(profileData.id);
      setSelectedProfile(profileData);

      // DIREKT Projekte laden (nicht im Effect warten!)
      console.log('=== Lade Projekte direkt ===');
      await loadProjectsForEmployee(profileData.id, adminStatus, profileData.company_id);

    } catch (error: any) {
      console.error('Load error:', error);
      setError('Fehler beim Laden: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHolidays = async (stateCode: string) => {
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
  };

  const loadProjectsForEmployee = async (profileId: string, adminStatus: boolean, companyId: string) => {
    try {
      const projectMap = new Map<string, ProjectInfo>();

      // 1. Projekte aus work_package_assignments laden (MA hat APs zugeordnet)
      const { data: assignments, error: assignError } = await supabase
        .from('work_package_assignments')
        .select(`
          work_package_id,
          work_packages (
            id,
            project_id,
            project:projects (
              id,
              name,
              color
            )
          )
        `)
        .eq('user_profile_id', profileId);

      console.log('AP Assignments für', profileId, ':', assignments, 'Error:', assignError);

      for (const assignment of (assignments || [])) {
        const wp = assignment.work_packages as any;
        if (wp?.project) {
          const proj = Array.isArray(wp.project) ? wp.project[0] : wp.project;
          if (proj && !projectMap.has(proj.id)) {
            projectMap.set(proj.id, proj);
          }
        }
      }

      // 2. Für Admins: ALLE Projekte der Firma laden (auch ohne AP-Zuordnung)
      if (adminStatus && companyId) {
        const { data: allProjects } = await supabase
          .from('projects')
          .select('id, name, color')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('name');

        console.log('Alle Projekte der Firma:', allProjects);

        for (const proj of (allProjects || [])) {
          if (!projectMap.has(proj.id)) {
            projectMap.set(proj.id, proj);
          }
        }
      }

      // 3. Für normale User: Auch Projekte laden, bei denen der MA als Projektmitglied eingetragen ist
      if (!adminStatus) {
        const { data: projectAssignments } = await supabase
          .from('project_assignments')
          .select(`
            project:projects (
              id,
              name,
              color
            )
          `)
          .eq('user_profile_id', profileId);

        console.log('Project Assignments:', projectAssignments);

        for (const pa of (projectAssignments || [])) {
          const proj = pa.project as any;
          if (proj) {
            const p = Array.isArray(proj) ? proj[0] : proj;
            if (p && !projectMap.has(p.id)) {
              projectMap.set(p.id, p);
            }
          }
        }
      }

      const projects = Array.from(projectMap.values());
      console.log('Verfügbare Projekte:', projects);
      setAvailableProjects(projects);

      // Wenn nur ein Projekt, automatisch auswählen
      if (projects.length === 1) {
        setSelectedProjectId(projects[0].id);
        setSelectedProject(projects[0]);
      } else if (projects.length === 0) {
        setSelectedProjectId('');
        setSelectedProject(null);
        setEntries([]);
      }

    } catch (error: any) {
      console.error('Load projects error:', error);
    }
  };

  const loadProjectTimesheet = async () => {
    if (!selectedProjectId || !selectedProfileId) return;

    try {
      setLoading(true);
      initialLoadDone.current = false;

      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      // 1. Arbeitspakete für dieses Projekt laden
      let myWPs: any[] = [];

      // Dem MA zugeordnete APs in diesem Projekt
      const { data: wpAssignments } = await supabase
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
        .eq('user_profile_id', selectedProfileId);

      myWPs = (wpAssignments || [])
        .map((a: any) => a.work_packages)
        .filter((wp: any) => wp && wp.project_id === selectedProjectId);

      console.log('Zugeordnete APs für MA in diesem Projekt:', myWPs);

      // Für Admins: ALLE APs des Projekts laden (für Dropdown und falls MA keine Zuordnung hat)
      let allProjectWPs: any[] = [];
      if (isAdmin) {
        const { data: projectWPs } = await supabase
          .from('work_packages')
          .select(`
            id,
            code,
            description,
            estimated_hours,
            project_id,
            project:projects (id, name, color)
          `)
          .eq('project_id', selectedProjectId)
          .eq('is_active', true)
          .order('code');

        allProjectWPs = projectWPs || [];
        console.log('Alle APs des Projekts (Admin):', allProjectWPs);

        // Wenn MA keine zugeordneten APs hat, alle Projekt-APs verfügbar machen
        if (myWPs.length === 0) {
          myWPs = allProjectWPs;
        }
      }

      // Kombiniere für Dropdown: zugeordnete + alle Projekt-APs
      const combinedWPs = [...myWPs];
      for (const wp of allProjectWPs) {
        if (!combinedWPs.find((w: any) => w.id === wp.id)) {
          combinedWPs.push(wp);
        }
      }

      setProjectWorkPackages(combinedWPs);

      // 2. ALLE Zeiteinträge des MA für diesen Monat laden (alle Projekte!)
      const { data: allTimeEntries } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_profile_id', selectedProfileId)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      // 3. Globale Fehlzeiten extrahieren (project_id IS NULL)
      const absences: { [day: number]: string } = {};
      for (const entry of (allTimeEntries || [])) {
        if (!entry.project_id || entry.project_id === null) {
          const day = new Date(entry.entry_date).getDate();
          if (entry.category === 'vacation') {
            absences[day] = 'U';
          } else if (entry.category === 'sick_leave') {
            absences[day] = 'K';
          } else if (entry.category === 'other_absence') {
            absences[day] = 'S';
          }
        }
      }
      setGlobalAbsences(absences);

      // 4. Stunden ANDERER Projekte berechnen
      const otherHours: OtherProjectHours = {};
      for (const entry of (allTimeEntries || [])) {
        if (entry.project_id && entry.project_id !== selectedProjectId && entry.category === 'project_work') {
          const day = new Date(entry.entry_date).getDate();
          if (!otherHours[day]) {
            otherHours[day] = { total: 0, details: [] };
          }
          otherHours[day].total += entry.hours;

          // Detail hinzufügen (Projektname aus Entry oder "Anderes Projekt")
          const existingDetail = otherHours[day].details.find(d => d.projectName === (entry.project_name || 'Anderes Projekt'));
          if (existingDetail) {
            existingDetail.hours += entry.hours;
          } else {
            otherHours[day].details.push({
              projectName: entry.project_name || 'Anderes Projekt',
              hours: entry.hours
            });
          }
        }
      }
      setOtherProjectHours(otherHours);

      // 5. Einträge für DIESES Projekt laden
      const entriesMap: { [wpId: string]: MonthEntry } = {};

      for (const entry of (allTimeEntries || [])) {
        if (entry.project_id === selectedProjectId && entry.category === 'project_work' && entry.work_package_id) {
          const day = new Date(entry.entry_date).getDate();

          if (!entriesMap[entry.work_package_id]) {
            const wp = combinedWPs.find((w: any) => w.id === entry.work_package_id);
            const proj = wp ? getProject(wp.project) : null;
            entriesMap[entry.work_package_id] = {
              work_package_id: entry.work_package_id,
              work_package_code: entry.work_package_code || wp?.code || '',
              work_package_description: entry.work_package_description || wp?.description || '',
              project_id: selectedProjectId,
              project_name: proj?.name || selectedProject?.name || '',
              project_color: proj?.color || selectedProject?.color || '#3B82F6',
              days: {}
            };
          }
          entriesMap[entry.work_package_id].days[day] = entry.hours;
        }
      }

      // Fehlzeiten in entries für Anzeige übertragen (in erste Zeile oder neue)
      if (Object.keys(absences).length > 0) {
        const entryValues = Object.values(entriesMap);
        if (entryValues.length > 0) {
          for (const [dayStr, absence] of Object.entries(absences)) {
            entryValues[0].days[parseInt(dayStr)] = absence;
          }
        }
      }

      setEntries(Object.values(entriesMap));

      // Nach dem Laden: keine Änderungen
      setTimeout(() => {
        initialLoadDone.current = true;
        setHasChanges(false);
      }, 100);

    } catch (error: any) {
      console.error('Load timesheet error:', error);
      setError('Fehler beim Laden: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // EVENT HANDLERS
  // ============================================

  // Mitarbeiter-Wechsel (nur Admin)
  const handleEmployeeChange = async (newProfileId: string) => {
    if (!newProfileId) return;

    if (hasChanges) {
      const confirmed = window.confirm('Sie haben ungespeicherte Änderungen. Möchten Sie fortfahren?');
      if (!confirmed) return;
    }

    const newProfile = companyEmployees.find(e => e.id === newProfileId);
    if (!newProfile) return;

    setSelectedProfileId(newProfileId);
    setSelectedProfile(newProfile);
    setSelectedProjectId('');
    setSelectedProject(null);
    setEntries([]);
    setOtherProjectHours({});
    setGlobalAbsences({});
    setAutoFillEnabled(false);
  };

  // Projekt-Wechsel
  const handleProjectChange = async (newProjectId: string) => {
    if (!newProjectId) {
      setSelectedProjectId('');
      setSelectedProject(null);
      setEntries([]);
      return;
    }

    if (hasChanges) {
      const confirmed = window.confirm('Sie haben ungespeicherte Änderungen. Möchten Sie fortfahren?');
      if (!confirmed) return;
    }

    const project = availableProjects.find(p => p.id === newProjectId);
    setSelectedProjectId(newProjectId);
    setSelectedProject(project || null);
    setAutoFillEnabled(false);
  };

  // Monat-Wechsel
  const handleMonthChange = async (year: number, month: number) => {
    if (hasChanges) {
      const saved = await handleSave();
      if (!saved) return;
    }

    setCurrentYear(year);
    setCurrentMonth(month);
    await loadHolidays(companyStateCode);
  };

  // Auto-Fill Toggle
  const handleAutoFillToggle = (enabled: boolean) => {
    setAutoFillEnabled(enabled);

    if (enabled && entries.length > 0) {
      // Verfügbare Stunden automatisch in erstes AP eintragen
      const daysInMonth = getDaysInMonth();
      const firstEntry = entries[0];
      const newDays = { ...firstEntry.days };

      for (let day = 1; day <= daysInMonth; day++) {
        const available = availableHoursPerDay[day] || 0;
        // Nur wenn noch kein Eintrag und Stunden verfügbar
        if (!newDays[day] && available > 0 && !globalAbsences[day] && !isNonWorkingDay(day)) {
          newDays[day] = available;
        }
      }

      setEntries(prev => {
        const updated = [...prev];
        updated[0] = { ...updated[0], days: newDays };
        return updated;
      });
    }
  };

  // Stunden-Eingabe
  const handleHoursChange = (entryIndex: number, day: number, value: string) => {
    // Feiertag oder Wochenende blocken
    if (isNonWorkingDay(day)) return;

    // Fehlzeit blocken
    if (globalAbsences[day]) return;

    // Verfügbarkeit prüfen
    const available = availableHoursPerDay[day] || 0;
    if (available <= 0) return;

    // Leer = löschen
    if (value === '' || value === '-') {
      setEntries(prev => {
        const updated = [...prev];
        const newDays = { ...updated[entryIndex].days };
        delete newDays[day];
        updated[entryIndex] = { ...updated[entryIndex], days: newDays };
        return updated;
      });
      return;
    }

    // U/K/S Eingabe
    const upperValue = value.toUpperCase();
    if (['U', 'K', 'S'].includes(upperValue)) {
      // Fehlzeit global setzen
      setGlobalAbsences(prev => ({ ...prev, [day]: upperValue }));
      // Aus Entry entfernen
      setEntries(prev => {
        const updated = [...prev];
        const newDays = { ...updated[entryIndex].days };
        delete newDays[day];
        updated[entryIndex] = { ...updated[entryIndex], days: newDays };
        return updated;
      });
      return;
    }

    // Zahl parsen
    const normalizedValue = value.replace(',', '.');
    let hours = parseFloat(normalizedValue);

    if (isNaN(hours)) return;

    // Auf verfügbare Stunden limitieren
    hours = Math.min(hours, available);
    hours = Math.max(0, hours);
    hours = Math.round(hours * 100) / 100;

    if (hours === 0) {
      setEntries(prev => {
        const updated = [...prev];
        const newDays = { ...updated[entryIndex].days };
        delete newDays[day];
        updated[entryIndex] = { ...updated[entryIndex], days: newDays };
        return updated;
      });
    } else {
      setEntries(prev => {
        const updated = [...prev];
        const newDays = { ...updated[entryIndex].days };
        newDays[day] = hours;
        updated[entryIndex] = { ...updated[entryIndex], days: newDays };
        return updated;
      });
    }
  };

  // Fehlzeit löschen
  const clearAbsence = (day: number) => {
    setGlobalAbsences(prev => {
      const updated = { ...prev };
      delete updated[day];
      return updated;
    });
  };

  // Zeile hinzufügen
  const addEntry = (workPackage: WorkPackage) => {
    const proj = getProject(workPackage.project);
    const newEntry: MonthEntry = {
      work_package_id: workPackage.id,
      work_package_code: workPackage.code,
      work_package_description: workPackage.description,
      project_id: workPackage.project_id,
      project_name: proj?.name || '',
      project_color: proj?.color || '#3B82F6',
      days: {}
    };
    setEntries(prev => [...prev, newEntry]);
  };

  // Zeile entfernen
  const removeEntry = (index: number) => {
    setEntries(prev => prev.filter((_, i) => i !== index));
  };

  // ============================================
  // BERECHNUNGEN
  // ============================================

  // Förderfähige Stunden dieses Projekts an einem Tag
  const getFoerderfaehigForDay = (day: number): number => {
    let total = 0;
    for (const entry of entries) {
      const val = entry.days[day];
      if (typeof val === 'number') {
        total += val;
      }
    }
    return total;
  };

  // Nicht zuschussfähig = 8h - Förderfähig - Fehlzeit (automatisch!)
  const getNichtZuschussfaehigForDay = (day: number): number => {
    if (isNonWorkingDay(day)) return 0;
    if (globalAbsences[day]) return 0;

    const dailyTarget = getDailyTargetHours();
    const foerderfaehig = getFoerderfaehigForDay(day);

    return Math.max(0, dailyTarget - foerderfaehig);
  };

  // Fehlzeiten an einem Tag
  const getFehlzeitenForDay = (day: number): number => {
    if (getHolidayName(day) && !isWeekend(day)) return getDailyTargetHours();
    if (globalAbsences[day]) return getDailyTargetHours();
    return 0;
  };

  // Gesamt an einem Tag
  const getGesamtForDay = (day: number): number => {
    if (isWeekend(day)) return 0;
    return getFoerderfaehigForDay(day) + getNichtZuschussfaehigForDay(day) + getFehlzeitenForDay(day);
  };

  // Monats-Summen
  const getMonthTotals = () => {
    const daysInMonth = getDaysInMonth();
    let foerderfaehig = 0;
    let nichtZuschussfaehig = 0;
    let fehlzeiten = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      foerderfaehig += getFoerderfaehigForDay(day);
      nichtZuschussfaehig += getNichtZuschussfaehigForDay(day);
      fehlzeiten += getFehlzeitenForDay(day);
    }

    return {
      foerderfaehig,
      nichtZuschussfaehig,
      fehlzeiten,
      gesamt: foerderfaehig + nichtZuschussfaehig + fehlzeiten
    };
  };

  // Zeilen-Summe
  const getRowTotal = (entry: MonthEntry): number => {
    let total = 0;
    for (const val of Object.values(entry.days)) {
      if (typeof val === 'number') {
        total += val;
      }
    }
    return total;
  };

  // ============================================
  // SPEICHERN
  // ============================================

  const handleSave = async (): Promise<boolean> => {
    if (!selectedProjectId || !selectedProfileId) {
      setError('Bitte wählen Sie ein Projekt aus.');
      return false;
    }

    const targetProfile = selectedProfile || profile;
    if (!targetProfile || !profile) return false;

    try {
      setSaving(true);
      setError('');

      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      // 1. Alte Einträge für DIESES Projekt löschen
      const { error: deleteProjectError } = await supabase
        .from('time_entries')
        .delete()
        .eq('user_profile_id', targetProfile.id)
        .eq('project_id', selectedProjectId)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (deleteProjectError) throw deleteProjectError;

      // 2. Alte globale Fehlzeiten löschen (project_id IS NULL)
      const { error: deleteAbsenceError } = await supabase
        .from('time_entries')
        .delete()
        .eq('user_profile_id', targetProfile.id)
        .is('project_id', null)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (deleteAbsenceError) throw deleteAbsenceError;

      const newEntries: any[] = [];

      // 3. Projekt-Stunden speichern
      for (const entry of entries) {
        if (!entry.work_package_id) continue;

        for (const [dayStr, value] of Object.entries(entry.days)) {
          const day = parseInt(dayStr);
          const entryDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          if (typeof value === 'number' && value > 0) {
            newEntries.push({
              user_profile_id: targetProfile.id,
              company_id: profile.company_id,
              entry_date: entryDate,
              project_id: selectedProjectId,
              project_name: selectedProject?.name || '',
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

      // 4. Globale Fehlzeiten speichern (project_id = NULL)
      for (const [dayStr, absence] of Object.entries(globalAbsences)) {
        const day = parseInt(dayStr);
        const entryDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        let category = 'other_absence';
        let description = 'Sonderurlaub';
        if (absence === 'U') {
          category = 'vacation';
          description = 'Urlaub';
        } else if (absence === 'K') {
          category = 'sick_leave';
          description = 'Krankheit';
        }

        newEntries.push({
          user_profile_id: targetProfile.id,
          company_id: profile.company_id,
          entry_date: entryDate,
          project_id: null,  // GLOBAL!
          work_package_id: null,
          work_package_code: null,
          work_package_description: description,
          hours: getDailyTargetHours(),
          category: category,
          created_by: profile.user_id
        });
      }

      if (newEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('time_entries')
          .insert(newEntries);

        if (insertError) throw insertError;
      }

      setHasChanges(false);

      const targetName = targetProfile.id === profile.id
        ? 'Ihre Zeiterfassung'
        : `Zeiterfassung für ${targetProfile.first_name || ''} ${targetProfile.last_name || targetProfile.name || ''}`;
      setSuccess(`${targetName} für "${selectedProject?.name}" gespeichert ✓`);
      setTimeout(() => setSuccess(''), 3000);
      return true;

    } catch (error: any) {
      console.error('Save error:', error);
      setError('Fehler beim Speichern: ' + error.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Zeiterfassung komplett löschen
  const handleDelete = async () => {
    if (!selectedProjectId || !selectedProfileId) {
      setError('Kein Projekt ausgewählt.');
      return;
    }

    const targetProfile = selectedProfile || profile;
    if (!targetProfile || !profile) return;

    try {
      setDeleting(true);
      setError('');

      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      // 1. Projekt-Einträge löschen
      const { error: deleteProjectError } = await supabase
        .from('time_entries')
        .delete()
        .eq('user_profile_id', targetProfile.id)
        .eq('project_id', selectedProjectId)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (deleteProjectError) throw deleteProjectError;

      // 2. Globale Fehlzeiten löschen (project_id IS NULL)
      const { error: deleteAbsenceError } = await supabase
        .from('time_entries')
        .delete()
        .eq('user_profile_id', targetProfile.id)
        .is('project_id', null)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (deleteAbsenceError) throw deleteAbsenceError;

      // UI zurücksetzen
      setEntries([]);
      setGlobalAbsences({});
      setHasChanges(false);
      setConfirmDelete(false);

      const targetName = targetProfile.id === profile.id
        ? 'Ihre Zeiterfassung'
        : `Zeiterfassung für ${targetProfile.first_name || ''} ${targetProfile.last_name || targetProfile.name || ''}`;
      setSuccess(`${targetName} für "${selectedProject?.name}" (${monthNames[currentMonth - 1]} ${currentYear}) wurde gelöscht.`);
      setTimeout(() => setSuccess(''), 4000);

    } catch (error: any) {
      console.error('Delete error:', error);
      setError('Fehler beim Löschen: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg font-medium text-gray-900">Laden...</div>
          </div>
        </div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth();
  const monthTotals = getMonthTotals();
  const maxHours = getMaxMonthlyHours();
  const dailyTarget = getDailyTargetHours();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">

        {/* Fehler & Erfolg */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
            <button onClick={() => setError('')} className="float-right font-bold">×</button>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Titel-Bereich */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-4 mb-6 text-white">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-2xl font-bold flex items-center mb-3">
                ⏱️ Zeiterfassung
              </h1>

              {/* Admin: Mitarbeiter-Auswahl */}
              {isAdmin && companyEmployees.length > 0 && (
                <div className="mb-3">
                  <label className="text-blue-200 text-sm mr-2">👤 Mitarbeiter:</label>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    className="px-3 py-1.5 rounded bg-blue-500 text-white border border-blue-400 hover:bg-blue-400 cursor-pointer font-medium"
                    disabled={saving}
                  >
                    {companyEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name || ''} {emp.last_name || emp.name || emp.email}
                        {emp.id === profile?.id ? ' (Sie selbst)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* PROJEKT-AUSWAHL (PFLICHT!) */}
              <div className="mb-2">
                <label className="text-blue-200 text-sm mr-2">📁 Projekt:</label>
                {availableProjects.length === 0 ? (
                  <span className="text-yellow-200">Keine Projekte zugeordnet</span>
                ) : (
                  <select
                    value={selectedProjectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="px-3 py-1.5 rounded bg-blue-500 text-white border border-blue-400 hover:bg-blue-400 cursor-pointer font-medium min-w-64"
                    disabled={saving}
                  >
                    <option value="">-- Bitte Projekt wählen --</option>
                    {availableProjects.map(proj => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                )}
                {availableProjects.length > 1 && (
                  <span className="ml-3 text-blue-200 text-sm">
                    📊 {availableProjects.length} Projekte
                  </span>
                )}
              </div>
            </div>

            {/* Rechte Seite: Monat & Summen */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-2 mb-2">
                <button
                  onClick={() => handleMonthChange(
                    currentMonth === 1 ? currentYear - 1 : currentYear,
                    currentMonth === 1 ? 12 : currentMonth - 1
                  )}
                  className="p-1 hover:bg-blue-500 rounded"
                >
                  ◀
                </button>
                <select
                  value={currentMonth}
                  onChange={(e) => handleMonthChange(currentYear, parseInt(e.target.value))}
                  className="bg-blue-500 border border-blue-400 rounded px-2 py-1"
                >
                  {monthNames.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
                <select
                  value={currentYear}
                  onChange={(e) => handleMonthChange(parseInt(e.target.value), currentMonth)}
                  className="bg-blue-500 border border-blue-400 rounded px-2 py-1"
                >
                  {[2023, 2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleMonthChange(
                    currentMonth === 12 ? currentYear + 1 : currentYear,
                    currentMonth === 12 ? 1 : currentMonth + 1
                  )}
                  className="p-1 hover:bg-blue-500 rounded"
                >
                  ▶
                </button>
              </div>
              <div className="text-2xl font-bold">{monthNames[currentMonth - 1]} {currentYear}</div>
              {selectedProjectId && (
                <div className="text-blue-200 text-sm mt-1">
                  Förderfähig: {monthTotals.foerderfaehig.toFixed(2)}h / {maxHours.toFixed(2)}h max
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kein Projekt gewählt */}
        {!selectedProjectId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Bitte Projekt auswählen</h3>
            <p className="text-yellow-600">
              Wählen Sie oben ein Projekt aus, um die Zeiterfassung zu starten.
            </p>
          </div>
        )}

        {/* Projekt gewählt - Zeiterfassung anzeigen */}
        {selectedProjectId && (
          <>
            {/* Info-Banner bei mehreren Projekten */}
            {availableProjects.length > 1 && Object.keys(otherProjectHours).length > 0 && (
              <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
                <div className="flex items-start">
                  <span className="text-xl mr-3">ℹ️</span>
                  <div>
                    <strong>Mehrere Projekte:</strong> An einigen Tagen haben Sie bereits Stunden in anderen Projekten erfasst.
                    Die verfügbaren Stunden werden oben in der Tabelle angezeigt.
                  </div>
                </div>
              </div>
            )}

            {/* Auto-Fill Checkbox */}
            {entries.length > 0 && (
              <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoFillEnabled}
                    onChange={(e) => handleAutoFillToggle(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                  />
                  <div>
                    <span className="font-medium text-gray-800">
                      Freie Kapazität automatisch als förderfähig vorbelegen
                    </span>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Verfügbare Stunden werden automatisch in das erste Arbeitspaket eingetragen. Sie können diese manuell anpassen.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Eingabelogik-Box */}
            <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <span><strong>Eingabe:</strong></span>
                <span className="text-green-700">🟢 Zahl (8 / 7,50) → Förderfähige Stunden</span>
                <span className="text-blue-700">🔵 U/K/S → Fehlzeit (global)</span>
                <span className="text-yellow-700">🟡 Leer → Nicht förderfähig (auto)</span>
                <span className="text-red-700">🔴 0h verfügbar → Gesperrt</span>
              </div>
            </div>

            {/* Zeiterfassungs-Tabelle */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    {/* Verfügbarkeits-Zeile */}
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th className="sticky left-0 z-10 bg-gray-100 px-2 py-1 text-left text-xs font-medium text-gray-500 border-b">
                        Verfügbar
                      </th>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const avail = availableHoursPerDay[day] || 0;
                        const color = getAvailabilityColor(day);
                        const otherInfo = otherProjectHours[day];
                        return (
                          <th
                            key={`avail-${day}`}
                            className="px-1 py-1 text-center text-xs border-b cursor-help"
                            style={{ backgroundColor: color.bg, color: color.text }}
                            title={
                              isNonWorkingDay(day) ? (getHolidayName(day) || 'Wochenende') :
                              globalAbsences[day] ? ABSENCE_BADGES[globalAbsences[day]]?.label :
                              otherInfo ? `${otherInfo.details.map(d => `${d.projectName}: ${d.hours}h`).join(', ')}` :
                              `${avail}h verfügbar`
                            }
                          >
                            {isNonWorkingDay(day) || globalAbsences[day] ? '-' : avail.toFixed(0)}
                          </th>
                        );
                      })}
                      <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-b bg-gray-100">
                        Σ
                      </th>
                    </tr>

                    {/* Tag-Nummern */}
                    <tr style={{ backgroundColor: COLORS.header }}>
                      <th className="sticky left-0 z-10 px-2 py-2 text-left text-xs font-medium text-white border-b" style={{ backgroundColor: COLORS.header }}>
                        Tag
                      </th>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const holiday = getHolidayName(day);
                        const weekend = isWeekend(day);
                        return (
                          <th
                            key={`day-${day}`}
                            className="px-1 py-2 text-center text-xs font-medium border-b"
                            style={{
                              backgroundColor: holiday ? COLORS.feiertag : weekend ? COLORS.wochenende : COLORS.header,
                              color: holiday || weekend ? '#666' : 'white'
                            }}
                            title={holiday || ''}
                          >
                            <div>{String(day).padStart(2, '0')}</div>
                            <div className="text-[10px] opacity-75">{getDayName(day)}</div>
                          </th>
                        );
                      })}
                      <th className="px-2 py-2 text-center text-xs font-medium text-white border-b" style={{ backgroundColor: COLORS.header }}>
                        Summe
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {/* SEKTION 1: Förderfähige Arbeiten */}
                    <tr style={{ backgroundColor: COLORS.gruen.mittel }}>
                      <td colSpan={daysInMonth + 2} className="px-3 py-2 font-semibold" style={{ color: COLORS.gruen.text }}>
                        1. Förderbare Arbeiten
                      </td>
                    </tr>

                    {/* AP-Zeilen */}
                    {entries.length === 0 ? (
                      <tr>
                        <td colSpan={daysInMonth + 2} className="px-3 py-4 text-center text-gray-500 italic" style={{ backgroundColor: COLORS.gruen.hell }}>
                          Keine Arbeitspakete zugeordnet.
                          {projectWorkPackages.length > 0 && (
                            <button
                              onClick={() => addEntry(projectWorkPackages[0])}
                              className="ml-2 text-green-600 hover:underline"
                            >
                              + Zeile hinzufügen
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry, entryIndex) => (
                        <tr key={entry.work_package_id} style={{ backgroundColor: COLORS.gruen.hell }}>
                          <td className="sticky left-0 z-10 px-2 py-1 text-xs border-b whitespace-nowrap" style={{ backgroundColor: COLORS.gruen.hell }}>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400">{entryIndex + 1}.{entryIndex + 1}</span>
                              <span className="font-medium truncate max-w-32" title={entry.work_package_description}>
                                {entry.work_package_code || entry.work_package_description}
                              </span>
                              {entries.length > 1 && (
                                <button
                                  onClick={() => removeEntry(entryIndex)}
                                  className="text-red-400 hover:text-red-600 ml-1"
                                  title="Zeile entfernen"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </td>
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                            const value = entry.days[day];
                            const holiday = getHolidayName(day);
                            const weekend = isWeekend(day);
                            const absence = globalAbsences[day];
                            const available = availableHoursPerDay[day] || 0;
                            const isBlocked = weekend || holiday || absence || available <= 0;

                            // Fehlzeit anzeigen (nur in erster Zeile)
                            if (entryIndex === 0 && (absence || (holiday && !weekend))) {
                              const badge = absence ? ABSENCE_BADGES[absence] : ABSENCE_BADGES['F'];
                              return (
                                <td
                                  key={`${entry.work_package_id}-${day}`}
                                  className="px-0.5 py-1 text-center border-b"
                                  style={{ backgroundColor: holiday ? COLORS.feiertag : COLORS.blau.hell }}
                                >
                                  <span
                                    className="inline-block px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer"
                                    style={{ backgroundColor: badge.bgColor, color: badge.textColor }}
                                    onClick={() => !holiday && clearAbsence(day)}
                                    title={badge.label + (absence ? ' (Klick zum Entfernen)' : '')}
                                  >
                                    {absence || 'F'}
                                  </span>
                                </td>
                              );
                            }

                            // Wochenende oder Feiertag (weitere Zeilen)
                            if (weekend || holiday) {
                              return (
                                <td
                                  key={`${entry.work_package_id}-${day}`}
                                  className="px-0.5 py-1 text-center border-b text-gray-400"
                                  style={{ backgroundColor: holiday ? COLORS.feiertag : COLORS.wochenende }}
                                >
                                  -
                                </td>
                              );
                            }

                            // Fehlzeit in weiteren Zeilen
                            if (absence && entryIndex > 0) {
                              return (
                                <td
                                  key={`${entry.work_package_id}-${day}`}
                                  className="px-0.5 py-1 text-center border-b text-gray-400"
                                  style={{ backgroundColor: COLORS.blau.hell }}
                                >
                                  -
                                </td>
                              );
                            }

                            // Geblockt (0h verfügbar)
                            if (available <= 0) {
                              return (
                                <td
                                  key={`${entry.work_package_id}-${day}`}
                                  className="px-0.5 py-1 text-center border-b"
                                  style={{ backgroundColor: '#ffebee' }}
                                  title={`0h verfügbar - ${otherProjectHours[day]?.total || 0}h in anderen Projekten`}
                                >
                                  <span className="text-red-400 text-xs">🔒</span>
                                </td>
                              );
                            }

                            // Normale Eingabe
                            return (
                              <td
                                key={`${entry.work_package_id}-${day}`}
                                className="px-0.5 py-1 text-center border-b"
                                style={{ backgroundColor: '#ffffff' }}
                              >
                                <input
                                  type="text"
                                  value={typeof value === 'number' ? value.toFixed(2).replace('.', ',') : ''}
                                  onChange={(e) => handleHoursChange(entryIndex, day, e.target.value)}
                                  className="w-10 text-center text-xs border border-green-300 rounded px-0.5 py-0.5 focus:border-green-500 focus:ring-1 focus:ring-green-200 bg-white"
                                  placeholder="-"
                                  disabled={saving}
                                />
                              </td>
                            );
                          })}
                          <td className="px-2 py-1 text-center border-b font-medium" style={{ backgroundColor: COLORS.gruen.hell, color: COLORS.gruen.text }}>
                            {getRowTotal(entry).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}

                    {/* AP hinzufügen */}
                    {projectWorkPackages.length > entries.length && (
                      <tr style={{ backgroundColor: COLORS.gruen.hell }}>
                        <td colSpan={daysInMonth + 2} className="px-3 py-2 border-b">
                          <select
                            onChange={(e) => {
                              const wp = projectWorkPackages.find(w => w.id === e.target.value);
                              if (wp) addEntry(wp);
                              e.target.value = '';
                            }}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                            defaultValue=""
                          >
                            <option value="">+ Arbeitspaket hinzufügen...</option>
                            {projectWorkPackages
                              .filter(wp => !entries.find(e => e.work_package_id === wp.id))
                              .map(wp => (
                                <option key={wp.id} value={wp.id}>
                                  {wp.code} - {wp.description}
                                </option>
                              ))
                            }
                          </select>
                        </td>
                      </tr>
                    )}

                    {/* Summe Förderfähig */}
                    <tr style={{ backgroundColor: COLORS.gruen.mittel }}>
                      <td className="sticky left-0 z-10 px-3 py-2 font-semibold border-b" style={{ backgroundColor: COLORS.gruen.mittel, color: COLORS.gruen.text }}>
                        Σ Summe förderfähig
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const total = getFoerderfaehigForDay(day);
                        const weekend = isWeekend(day);
                        const holiday = getHolidayName(day);
                        return (
                          <td
                            key={`sum-foerd-${day}`}
                            className="px-1 py-2 text-center text-xs font-medium border-b"
                            style={{
                              backgroundColor: holiday ? COLORS.feiertag : weekend ? COLORS.wochenende : COLORS.gruen.mittel,
                              color: holiday || weekend ? '#666' : COLORS.gruen.text
                            }}
                          >
                            {weekend || holiday ? '-' : (total > 0 ? total.toFixed(2) : '0,00')}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-bold border-b" style={{ backgroundColor: COLORS.gruen.mittel, color: COLORS.gruen.text }}>
                        {monthTotals.foerderfaehig.toFixed(2)}
                      </td>
                    </tr>

                    {/* SEKTION 2: Nicht zuschussfähig */}
                    <tr style={{ backgroundColor: COLORS.gelb.mittel }}>
                      <td colSpan={daysInMonth + 2} className="px-3 py-2 font-semibold" style={{ color: COLORS.gelb.text }}>
                        2. Nicht zuschussfähige Arbeiten
                        <span className="font-normal text-xs ml-2">(automatisch berechnet)</span>
                      </td>
                    </tr>

                    <tr style={{ backgroundColor: COLORS.gelb.hell }}>
                      <td className="sticky left-0 z-10 px-3 py-2 text-xs border-b" style={{ backgroundColor: COLORS.gelb.hell }}>
                        <span className="text-gray-400">2.1</span> Differenz zu {dailyTarget}h/Tag
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const nz = getNichtZuschussfaehigForDay(day);
                        const weekend = isWeekend(day);
                        const holiday = getHolidayName(day);
                        const absence = globalAbsences[day];
                        const otherInfo = otherProjectHours[day];
                        
                        return (
                          <td
                            key={`nz-${day}`}
                            className="px-1 py-2 text-center text-xs border-b cursor-help"
                            style={{
                              backgroundColor: holiday ? COLORS.feiertag : weekend ? COLORS.wochenende : absence ? COLORS.blau.hell : COLORS.gelb.hell,
                              color: COLORS.gelb.text
                            }}
                            title={
                              otherInfo ? `Inkl. ${otherInfo.details.map(d => `${d.projectName}: ${d.hours}h`).join(', ')}` : ''
                            }
                          >
                            {weekend || holiday || absence ? '-' : (nz > 0 ? nz.toFixed(2) : '0,00')}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-medium border-b" style={{ backgroundColor: COLORS.gelb.hell, color: COLORS.gelb.text }}>
                        {monthTotals.nichtZuschussfaehig.toFixed(2)}
                      </td>
                    </tr>

                    {/* Summe Nicht zuschussfähig */}
                    <tr style={{ backgroundColor: COLORS.gelb.mittel }}>
                      <td className="sticky left-0 z-10 px-3 py-2 font-semibold border-b" style={{ backgroundColor: COLORS.gelb.mittel, color: COLORS.gelb.text }}>
                        Σ Summe nicht zuschussfähig
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const nz = getNichtZuschussfaehigForDay(day);
                        const weekend = isWeekend(day);
                        const holiday = getHolidayName(day);
                        const absence = globalAbsences[day];
                        return (
                          <td
                            key={`sum-nz-${day}`}
                            className="px-1 py-2 text-center text-xs font-medium border-b"
                            style={{
                              backgroundColor: holiday ? COLORS.feiertag : weekend ? COLORS.wochenende : absence ? COLORS.blau.hell : COLORS.gelb.mittel,
                              color: holiday || weekend ? '#666' : COLORS.gelb.text
                            }}
                          >
                            {weekend || holiday || absence ? '-' : (nz > 0 ? nz.toFixed(2) : '0,00')}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-bold border-b" style={{ backgroundColor: COLORS.gelb.mittel, color: COLORS.gelb.text }}>
                        {monthTotals.nichtZuschussfaehig.toFixed(2)}
                      </td>
                    </tr>

                    {/* SEKTION 3: Bezahlte Fehlzeiten */}
                    <tr style={{ backgroundColor: COLORS.blau.mittel }}>
                      <td colSpan={daysInMonth + 2} className="px-3 py-2 font-semibold" style={{ color: COLORS.blau.text }}>
                        3. Bezahlte Fehlzeiten
                        <span className="font-normal text-xs ml-2">(U = Urlaub, K = Krankheit, S = Sonderurlaub, F = Feiertag)</span>
                      </td>
                    </tr>

                    <tr style={{ backgroundColor: COLORS.blau.hell }}>
                      <td className="sticky left-0 z-10 px-3 py-2 text-xs border-b" style={{ backgroundColor: COLORS.blau.hell }}>
                        <span className="text-gray-400">3.1</span> Fehlzeiten
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const holiday = getHolidayName(day);
                        const weekend = isWeekend(day);
                        const absence = globalAbsences[day];
                        const fehlzeit = getFehlzeitenForDay(day);
                        
                        if (weekend) {
                          return (
                            <td key={`fz-${day}`} className="px-1 py-2 text-center text-xs border-b" style={{ backgroundColor: COLORS.wochenende }}>
                              -
                            </td>
                          );
                        }
                        
                        if (holiday || absence) {
                          const badge = absence ? ABSENCE_BADGES[absence] : ABSENCE_BADGES['F'];
                          return (
                            <td key={`fz-${day}`} className="px-1 py-2 text-center text-xs border-b" style={{ backgroundColor: COLORS.blau.hell }}>
                              <span
                                className="inline-block px-1 py-0.5 rounded text-xs font-medium"
                                style={{ backgroundColor: badge.bgColor, color: badge.textColor }}
                              >
                                {absence || 'F'}
                              </span>
                            </td>
                          );
                        }
                        
                        return (
                          <td key={`fz-${day}`} className="px-1 py-2 text-center text-xs border-b" style={{ backgroundColor: COLORS.blau.hell }}>
                            -
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-medium border-b" style={{ backgroundColor: COLORS.blau.hell, color: COLORS.blau.text }}>
                        {monthTotals.fehlzeiten.toFixed(2)}
                      </td>
                    </tr>

                    {/* Summe Fehlzeiten */}
                    <tr style={{ backgroundColor: COLORS.blau.mittel }}>
                      <td className="sticky left-0 z-10 px-3 py-2 font-semibold border-b" style={{ backgroundColor: COLORS.blau.mittel, color: COLORS.blau.text }}>
                        Σ Summe Fehlzeiten
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const fehlzeit = getFehlzeitenForDay(day);
                        const weekend = isWeekend(day);
                        return (
                          <td
                            key={`sum-fz-${day}`}
                            className="px-1 py-2 text-center text-xs font-medium border-b"
                            style={{ backgroundColor: weekend ? COLORS.wochenende : COLORS.blau.mittel, color: COLORS.blau.text }}
                          >
                            {weekend ? '-' : (fehlzeit > 0 ? fehlzeit.toFixed(2) : '-')}
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-bold border-b" style={{ backgroundColor: COLORS.blau.mittel, color: COLORS.blau.text }}>
                        {monthTotals.fehlzeiten.toFixed(2)}
                      </td>
                    </tr>

                    {/* GESAMT-ZEILE */}
                    <tr style={{ backgroundColor: COLORS.grau.mittel }}>
                      <td className="sticky left-0 z-10 px-3 py-3 font-bold border-b text-base" style={{ backgroundColor: COLORS.grau.mittel, color: COLORS.grau.dunkel }}>
                        GESAMT
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const gesamt = getGesamtForDay(day);
                        const weekend = isWeekend(day);
                        return (
                          <td
                            key={`gesamt-${day}`}
                            className="px-1 py-3 text-center text-xs font-bold border-b"
                            style={{ backgroundColor: weekend ? COLORS.wochenende : COLORS.grau.mittel, color: COLORS.grau.dunkel }}
                          >
                            {weekend ? '-' : gesamt.toFixed(2)}
                          </td>
                        );
                      })}
                      <td className="px-2 py-3 text-center font-bold border-b text-base" style={{ backgroundColor: COLORS.grau.mittel, color: COLORS.grau.dunkel }}>
                        {monthTotals.gesamt.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Speichern- und Löschen-Buttons */}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                {hasChanges && (
                  <span className="text-amber-600 flex items-center">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></span>
                    Ungespeicherte Änderungen
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Löschen-Button mit Sicherheitsabfrage */}
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={deleting || saving}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      deleting || saving
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                    }`}
                    title="Zeiterfassung für diesen Monat komplett löschen"
                  >
                    🗑️ Löschen
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg px-3 py-2">
                    <span className="text-red-700 text-sm font-medium">Wirklich löschen?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    >
                      {deleting ? '⏳...' : '✓ Ja'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                      className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                    >
                      ✗ Nein
                    </button>
                  </div>
                )}

                {/* Speichern-Button */}
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    saving || !hasChanges
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {saving ? '⏳ Speichern...' : '💾 Speichern'}
                </button>
              </div>
            </div>

            {/* Monatszusammenfassung */}
            <div className="mt-6 bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3">
                Monatszusammenfassung: {selectedProject?.name}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.gruen.hell }}>
                  <div className="text-sm text-gray-600">Förderfähig</div>
                  <div className="text-xl font-bold" style={{ color: COLORS.gruen.text }}>
                    {monthTotals.foerderfaehig.toFixed(2)}h
                  </div>
                  <div className="text-xs text-gray-500">von max. {maxHours.toFixed(2)}h</div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.gelb.hell }}>
                  <div className="text-sm text-gray-600">Nicht zuschussfähig</div>
                  <div className="text-xl font-bold" style={{ color: COLORS.gelb.text }}>
                    {monthTotals.nichtZuschussfaehig.toFixed(2)}h
                  </div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.blau.hell }}>
                  <div className="text-sm text-gray-600">Fehlzeiten</div>
                  <div className="text-xl font-bold" style={{ color: COLORS.blau.text }}>
                    {monthTotals.fehlzeiten.toFixed(2)}h
                  </div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.grau.hell }}>
                  <div className="text-sm text-gray-600">Gesamt</div>
                  <div className="text-xl font-bold" style={{ color: COLORS.grau.dunkel }}>
                    {monthTotals.gesamt.toFixed(2)}h
                  </div>
                </div>
                <div className="p-3 rounded-lg" style={{ backgroundColor: COLORS.gruen.mittel }}>
                  <div className="text-sm" style={{ color: COLORS.gruen.text }}>Förderquote</div>
                  <div className="text-xl font-bold" style={{ color: COLORS.gruen.text }}>
                    {monthTotals.gesamt > 0 ? ((monthTotals.foerderfaehig / monthTotals.gesamt) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>

              {/* Feiertage des Monats */}
              {holidays.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600 mb-2">📅 Feiertage im {monthNames[currentMonth - 1]}:</div>
                  <div className="flex flex-wrap gap-2">
                    {holidays.map(h => (
                      <span key={h.holiday_date} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                        {new Date(h.holiday_date).getDate()}. - {h.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Andere Projekte Info */}
              {availableProjects.length > 1 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600 mb-2">📊 Ihre anderen Projekte:</div>
                  <div className="flex flex-wrap gap-2">
                    {availableProjects
                      .filter(p => p.id !== selectedProjectId)
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleProjectChange(p.id)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                        >
                          {p.name}
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}