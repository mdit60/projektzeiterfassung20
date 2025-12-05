// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                maxAge: undefined,  // Session-Cookie: kein maxAge
                expires: undefined, // Session-Cookie: kein expires
              })
            );
          } catch {
            // Wird von Server Components aufgerufen, die Cookies nicht setzen können
            // Ignorieren - die Cookies werden von Middleware/Route Handlers gesetzt
          }
        },
      },
    }
  );
}