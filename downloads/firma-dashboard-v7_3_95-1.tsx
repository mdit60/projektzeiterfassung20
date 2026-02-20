// src/app/v7/firma/dashboard/page.tsx
// ============================================================================
// PZE V7 - Firmen-Portal Dashboard
// ============================================================================
// Datum: 20. Februar 2026
// Version: 7.3.95-1
//
// v7.3.95-1: userName Fallback auf v7_employees.display_name
// v7.3.92: Intelligenter Redirect basierend auf Rolle + Employee-Record:
//   - Employee/Project Leader -> Redirect auf /v7/firma/mein-status
//   - Client Admin MIT Employee-Record -> Redirect auf /v7/firma/mein-status
//   - Client Admin OHNE Employee-Record -> Dashboard mit Modul-Kacheln
//
// v7.3.90: Modul-Kacheln mit rollenbasierter Sichtbarkeit
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PortalHeader from '@/components/shared/PortalHeader';
import PortalNav from '@/components/shared/PortalNav';
import {
  V7_MODULES,
  type V7ModuleDefinition,
} from '@/lib/v7-module-config';
import {
  Clock,
  FolderKanban,
  BarChart3,
  FileText,
  ClipboardList,
  Calculator,
  Shield,
  Network,
  Layers,
  FlaskConical,
  CheckCircle2,
  Building2,
} from 'lucide-react';

// ============================================================================
// TYPEN
// ============================================================================

type PortalRole = 'client_admin' | 'project_leader' | 'employee';

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  client_company_id: string | null;
}

interface ClientCompany {
  id: string;
  name: string;
}

// ============================================================================
// ICON-MAPPING
// ============================================================================

const ICON_MAP: Record<string, React.ReactNode> = {
  FolderKanban: <FolderKanban size={28} className="text-green-600" />,
  Clock: <Clock size={28} className="text-green-600" />,
  BarChart3: <BarChart3 size={28} className="text-green-600" />,
  FileText: <FileText size={28} className="text-green-600" />,
  ClipboardList: <ClipboardList size={28} className="text-green-600" />,
  Calculator: <Calculator size={28} className="text-green-600" />,
  Shield: <Shield size={28} className="text-green-600" />,
  Network: <Network size={28} className="text-green-600" />,
  Layers: <Layers size={28} className="text-green-600" />,
  FlaskConical: <FlaskConical size={28} className="text-green-600" />,
};

// ============================================================================
// KOMPONENTE
// ============================================================================

export default function FirmaDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<ClientCompany | null>(null);
  const [portalRole, setPortalRole] = useState<PortalRole>('employee');
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Profil laden
        const { data: profile } = await supabase
          .from('v7_user_profiles')
          .select('id, email, display_name, role, client_company_id')
          .eq('email', user.email)
          .maybeSingle();

        if (!profile || !profile.client_company_id) {
          router.push('/login');
          return;
        }

        setUserProfile(profile);

        // Company laden
        const { data: companyData } = await supabase
          .from('v7_client_companies')
          .select('id, name')
          .eq('id', profile.client_company_id)
          .single();

        if (companyData) setCompany(companyData);

        // Portal-Rolle ermitteln
        const { data: employeeRecord } = await supabase
          .from('v7_employees')
          .select('id, portal_role, display_name')
          .eq('client_company_id', profile.client_company_id)
          .eq('user_id', user.id)
          .maybeSingle();

        // Fallback: display_name aus Employee wenn in Profile leer
        if (employeeRecord?.display_name && !profile.display_name) {
          profile.display_name = employeeRecord.display_name;
        }

        let userPortalRole: PortalRole = 'employee';
        const hasEmployeeRecord = !!employeeRecord;

        if (profile.role === 'client_admin') {
          userPortalRole = 'client_admin';
        } else if (employeeRecord) {
          userPortalRole = (employeeRecord.portal_role as PortalRole) || 'employee';
        }

        setPortalRole(userPortalRole);

        // Entscheidung: Redirect oder Dashboard anzeigen
        // Employee und PL -> immer Mein Status
        // Client Admin MIT Employee-Record -> Mein Status (arbeitet im Projekt mit)
        // Client Admin OHNE Employee-Record -> Dashboard (reiner GF/Verwaltung)
        if (userPortalRole !== 'client_admin') {
          // Employee oder Project Leader -> Mein Status
          router.push('/v7/firma/mein-status');
          return;
        }

        if (userPortalRole === 'client_admin' && hasEmployeeRecord) {
          // Admin der im Projekt mitarbeitet -> Mein Status
          router.push('/v7/firma/mein-status');
          return;
        }

        // Client Admin ohne Employee-Record -> Dashboard anzeigen
        setShowDashboard(true);

      } catch (err) {
        console.error('Dashboard Fehler:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, supabase]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading || !showDashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userProfile || !company) return null;

  // Module fuer Firmen-Portal filtern
  const visibleModules = (V7_MODULES || [])
    .filter((m: V7ModuleDefinition) => {
      const config = m.firma;
      if (!config || !config.visible) return false;
      // Rollenbasierte Sichtbarkeit
      if (config.portalRoles && config.portalRoles.length > 0) {
        return config.portalRoles.includes(portalRole);
      }
      return true;
    })
    .sort((a: V7ModuleDefinition, b: V7ModuleDefinition) => a.sortOrder - b.sortOrder);

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        portal="firma"
        companyName={company.name}
        userName={userProfile.display_name || userProfile.email}
        userRole="client_admin"
      />
      <PortalNav
        portal="firma"
        userRole="client_admin"
        portalRole={portalRole}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Willkommen, {userProfile.display_name || userProfile.email}!
          </h1>
          <p className="text-gray-600 mt-1 flex items-center gap-2">
            <Building2 size={16} className="text-gray-400" />
            {company.name}
          </p>
        </div>

        {/* Modul-Kacheln */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleModules.map((mod: V7ModuleDefinition) => {
            const config = mod.firma;
            const isActive = config.status === 'active';

            return (
              <button
                key={mod.id}
                onClick={() => isActive && router.push(config.href)}
                disabled={!isActive}
                className={`
                  relative p-6 rounded-xl border text-left transition-all
                  ${isActive
                    ? 'bg-white border-gray-200 hover:border-green-300 hover:shadow-md cursor-pointer'
                    : 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-60'
                  }
                `}
              >
                {/* Status-Badge */}
                <div className="absolute top-4 right-4">
                  {isActive ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 size={14} />
                      Aktiv
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">
                      In Vorbereitung
                    </span>
                  )}
                </div>

                {/* Icon */}
                <div className="mb-4">
                  {ICON_MAP[mod.icon] || <FolderKanban size={28} className="text-green-600" />}
                </div>

                {/* Text */}
                <h3 className="font-semibold text-gray-900">{mod.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{config.description}</p>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-500">
            PZE v7.3.92 &middot; {company.name}
          </p>
        </div>
      </footer>
    </div>
  );
}
