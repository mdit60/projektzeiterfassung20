import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Root path (/) - immer zum Login weiterleiten wenn nicht eingeloggt
  if (request.nextUrl.pathname === '/') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Geschützte Routen - erfordern Login
  const protectedPaths = ['/dashboard', '/projekte', '/mitarbeiter', '/arbeitsplaene', '/zeiterfassung', '/berichte', '/einstellungen'];
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Login/Register Seiten - wenn eingeloggt zum Dashboard
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/projekte/:path*',
    '/mitarbeiter/:path*',
    '/arbeitsplaene/:path*',
    '/zeiterfassung/:path*',
    '/berichte/:path*',
    '/einstellungen/:path*',
    '/login',
    '/register'
  ]
};