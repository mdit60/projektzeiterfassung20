// src/app/page.tsx
// Landing Page - Leitet zur Login-Seite oder zum Dashboard
// VERSION: v7.1.0
// DATUM: 02. Januar 2026

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Eingeloggt -> Rollen-Check und Redirect
        const { data: profile } = await supabase
          .from('v7_user_profiles')
          .select('role, consultant_company_id, client_company_id')
          .eq('email', session.user.email)
          .maybeSingle()

        if (profile) {
          if (profile.role === 'consultant' || profile.role === 'system_admin') {
            router.push('/v7/berater')
          } else {
            router.push('/v7/firma')
          }
        } else {
          // Kein V7-Profil -> V6 Dashboard (Fallback)
          router.push('/dashboard')
        }
      } else {
        // Nicht eingeloggt -> Login-Seite
        router.push('/login')
      }
    }

    checkAuth()
  }, [router, supabase])

  // Loading während Redirect
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white text-2xl font-bold rounded-xl mb-4">
          PZE
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Wird geladen...</p>
      </div>
    </div>
  )
}
