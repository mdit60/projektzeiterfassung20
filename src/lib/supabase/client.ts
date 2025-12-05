// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true, // Session WIRD gespeichert, aber in sessionStorage
        autoRefreshToken: true,
        storage: {
          // Explizit sessionStorage verwenden statt localStorage
          getItem: (key: string) => {
            if (typeof window === 'undefined') return null;
            return sessionStorage.getItem(key);
          },
          setItem: (key: string, value: string) => {
            if (typeof window === 'undefined') return;
            sessionStorage.setItem(key, value);
          },
          removeItem: (key: string) => {
            if (typeof window === 'undefined') return;
            sessionStorage.removeItem(key);
          },
        },
      },
    }
  );
}