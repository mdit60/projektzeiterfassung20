// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

// Singleton für den Client
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;
let inactivityTimerSet = false;

// ============================================
// KONFIGURATION: Inactivity Timeout
// ============================================
const INACTIVITY_TIMEOUT_MINUTES = 30;  // Nach 30 Min Inaktivität ausloggen
const INACTIVITY_TIMEOUT_MS = INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;

export function createClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: {
          // sessionStorage statt localStorage
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

  // ============================================
  // INACTIVITY TIMER
  // ============================================
  if (typeof window !== 'undefined' && !inactivityTimerSet) {
    inactivityTimerSet = true;
    
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
    
    const resetTimer = () => {
      // Timer zurücksetzen bei Aktivität
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      
      inactivityTimer = setTimeout(async () => {
        // Nach Timeout: Prüfen ob eingeloggt, dann ausloggen
        if (supabaseClient) {
          const { data: { session } } = await supabaseClient.auth.getSession();
          if (session) {
            console.log('[Auth] Inaktivität erkannt, logge aus...');
            await supabaseClient.auth.signOut();
            window.location.href = '/login?reason=inactivity';
          }
        }
      }, INACTIVITY_TIMEOUT_MS);
    };
    
    // Aktivitäts-Events die den Timer zurücksetzen
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true });
    });
    
    // Timer initial starten
    resetTimer();
    
    console.log(`[Auth] Inactivity-Timer aktiv: ${INACTIVITY_TIMEOUT_MINUTES} Minuten`);
  }

  return supabaseClient;
}