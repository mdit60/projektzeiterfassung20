// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Öffentliche Routen, die OHNE Login erreichbar sind
  const publicRoutes = ['/login', '/'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // API-Routen nicht durch Middleware prüfen (haben eigene Logik)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Supabase Client erstellen
  const supabase = await createClient();
  
  // User-Session prüfen
  const { data: { user }, error } = await supabase.auth.getUser();

  // Wenn User NICHT eingeloggt ist
  if (!user || error) {
    // Geschützte Route? -> Redirect zu /login
    if (!isPublicRoute) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    // Öffentliche Route -> erlauben
    return NextResponse.next();
  }

  // User IST eingeloggt
  // Auf /login zugreifen? -> Redirect zu /dashboard
  if (pathname === '/login') {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Alle anderen Routen erlauben
  return NextResponse.next();
}

// Konfiguration: Auf welche Routen die Middleware angewendet wird
export const config = {
  matcher: [
    /*
     * Match alle Routen AUSSER:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - Dateien mit Extensions (.svg, .png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};