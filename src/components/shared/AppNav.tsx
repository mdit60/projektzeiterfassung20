'use client';

// src/components/shared/AppNav.tsx
// ============================================================================
// PZE V7 - App-Navigation (neue Struktur)
// ============================================================================
// Version: 1.0.2
// v1.0.2: FZul-Nav-Item nur noch fuer system_admin. Ein eigenstaendiges
//         Forschungszulage-Modul entfaellt - die FZul-Auswertung ist laut
//         KONZEPT-KAPAZITAETSPLANUNG v1.1 eine Spezialisierung der
//         Kapazitaetsplanung und dort umgesetzt. Der Eintrag bleibt fuer den
//         SysAdmin als Vorbereitung eines neuen FZul-Moduls (BSFZ-
//         Bescheinigungsbeantragung); Berater sehen ihn nicht mehr - auch nicht
//         im App-/Cockpit-Modus (Gegenstueck zu PortalNav v7.4.4-26).
// v1.0.1: Home-Button nur noch Icon (Haeuschen) ohne Label "Cockpit"
//         Icon etwas groesser (20px) fuer eigenstaendige visuelle Praesenz
// v1.0.0: Neue saubere Nav fuer App-Modus (pze_mode='app')
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

  const isCockpitActive = pathname === '/v7/berater/app/cockpit';

  const navItems = [
    { key: 'netzwerk',    label: 'Netzwerk',            href: '/v7/berater/netzwerk',        icon: <Network size={18} /> },
    { key: 'kapazitaet',  label: 'Kapazitaetsplanung',  href: '/v7/berater/multiprojekt',    icon: <BarChart3 size={18} /> },
    // v1.0.2: FZul nur fuer system_admin (Vorbereitung neues FZul-Modul)
    ...(userRole === 'system_admin'
      ? [{ key: 'fzul',   label: 'Forschungszulage',    href: '/v7/berater/fzul',            icon: <FlaskConical size={18} /> }]
      : []),
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center py-1 -mb-px overflow-visible">

          {/* Home-Button: nur Icon, kein Label */}
          <button
            onClick={() => router.push('/v7/berater/app/cockpit')}
            className={[
              'flex items-center justify-center px-3 py-3',
              'border-b-2 transition-colors duration-150 mr-1',
              isCockpitActive
                ? 'border-current'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300',
            ].join(' ')}
            style={isCockpitActive ? { color: PRIMARY, borderColor: PRIMARY } : undefined}
            title="Startseite"
          >
            <Home size={20} />
          </button>

          {/* Regulaere Nav-Items mit Icon + Label */}
          {navItems.map((item) => {
            const active = isActive(item.href);
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
