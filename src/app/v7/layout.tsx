// src/app/v7/layout.tsx
// VERSION: v7.0.0 - V7 Layout mit Navigation
// BESCHREIBUNG: Gemeinsames Layout für alle V7-Seiten

import Link from 'next/link';

export default function V7Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* V7 Header */}
      <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Titel */}
            <div className="flex items-center gap-4">
              <Link href="/v7" className="flex items-center gap-3 hover:opacity-90">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-blue-700 font-bold text-lg">V7</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold">Projektzeiterfassung</h1>
                  <p className="text-blue-200 text-xs">Berater-Portal</p>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-6">
              <Link 
                href="/v7" 
                className="text-blue-100 hover:text-white transition-colors"
              >
                🏢 Firmen
              </Link>
              <Link 
                href="/v7/import" 
                className="text-blue-100 hover:text-white transition-colors"
              >
                📥 Import
              </Link>
              <Link 
                href="/v7/archiv" 
                className="text-blue-100 hover:text-white transition-colors"
              >
                📁 Archiv
              </Link>
            </nav>

            {/* User Menu Placeholder */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-blue-200">Berater</span>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm">👤</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/v7" className="hover:text-blue-600">V7</Link>
            <span>/</span>
            <span className="text-gray-700">Firmenübersicht</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          PZE v7.0 · Cubintec · {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}