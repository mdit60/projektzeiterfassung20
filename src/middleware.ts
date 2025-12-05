// src/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            // Session-Cookie: KEIN maxAge = wird bei Browser-Close gelöscht
            supabaseResponse.cookies.set(name, value, {
              ...options,
              maxAge: undefined,  // Entfernt maxAge → Session-Cookie
              expires: undefined, // Entfernt expires → Session-Cookie
            });
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ==========================================
  // ÖFFENTLICHE ROUTEN - KEIN LOGIN ERFORDERLICH
  // ==========================================
  const publicRoutes = [
    '/',
    '/login',
    '/register',
  ];

  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  // ==========================================
  // GESCHÜTZTE ROUTEN - LOGIN ERFORDERLICH
  // ==========================================
  const protectedRoutes = [
    '/dashboard',
    '/projekte',
    '/mitarbeiter',
    '/arbeitsplaene',
    '/zeiterfassung',
    '/berichte',
    '/einstellungen'
  ];

  const isProtectedRoute = protectedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  // ==========================================
  // REDIRECT-LOGIK
  // ==========================================
  
  // 1. Nicht eingeloggt + geschützte Route → Login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. Eingeloggt + auf Login-Seite → Dashboard
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // 3. Root → Redirect basierend auf Login-Status
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = user ? '/dashboard' : '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};