// ========================================
// Datei: src/app/page.tsx
// ========================================

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // User ist eingeloggt -> zum Dashboard
        router.push('/dashboard');
      } else {
        // User ist nicht eingeloggt -> zum Login
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Weiterleitung...</div>
    </div>
  );
}