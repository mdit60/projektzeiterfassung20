'use client';

// src/components/shared/AppNav.tsx
// ============================================================================
// PZE V7 - App-Navigation (neue Struktur)
// ============================================================================
// Version: 1.0.0
// v1.0.0: Neue saubere Nav fuer App-Modus (pze_mode='app')
//   - HOME -> /v7/berater/app/cockpit (Berater-App-Cockpit)
//   - Netzwerk, Kapazitaetsplanung, FZul wie bisher
//   - Kein Cockpit-Button (ist bereits HOME)
//   - Komplett getrennt von PortalNav (keine Querverbindungen)
// ============================================================================

import { usePathname, useRouter } from 'next/navigation';
import { Home, Network, BarChart3, FlaskConical, Settings } from 'lucide-react';

const PRIMARY = '#002451';

interface AppNavProps {
  userRole?: string;
}

export default function AppNav({ userRole }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) =>
    pathname?.startsWith(path) ?? false;

  const navItems = [
    { key: 'cockpit',     label: 'Cockpit',            href: '/v7/berater/app/cockpit',    icon: <Home size={18} /> },
    { key: 'netzwerk',    label: 'Netzwerk',            href: '/v7/berater/netzwerk',        icon: <Network size={18} /> },
    { key: 'kapazitaet',  label: 'Kapazitaetsplanung',  href: '/v7/berater/multiprojekt',    icon: <BarChart3 size={18} /> },
    { key: 'fzul',        label: 'Forschungszulage',    href: '/v7/berater/fzul',            icon: <FlaskConical size={18} /> },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center py-1 -mb-px overflow-visible">

          {navItems.map((item) => {
            const active = item.key === 'cockpit'
              ? pathname === '/v7/berater/app/cockpit'
              : isActive(item.href);
            return (
              <button
                key={item.key}
                onClick={() => router.push(item.href)}
                className={[
                  'flex items-center space-x-1.5 px-4 py-3 text-sm font-medium',
                  'border-b-2 transition-colors duration-150 whitespace-nowrap mr-1',
                  active
                    ? 'border-current'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300',
                ].join(' ')}
                style={active ? { color: PRIMARY, borderColor: PRIMARY } : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Administration (nur system_admin) */}
          {userRole === 'system_admin' && (
            <button
              onClick={() => router.push('/v7/berater/admin')}
              className={[
                'flex items-center space-x-1.5 px-4 py-3 text-sm font-medium',
                'border-b-2 transition-colors duration-150 whitespace-nowrap',
                isActive('/v7/berater/admin')
                  ? 'border-current'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300',
              ].join(' ')}
              style={isActive('/v7/berater/admin') ? { color: PRIMARY, borderColor: PRIMARY } : undefined}
            >
              <Settings size={18} />
              <span>Administration</span>
            </button>
          )}

        </div>
      </div>
    </nav>
  );
}
