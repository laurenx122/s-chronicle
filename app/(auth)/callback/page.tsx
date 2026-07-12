'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session after OAuth redirect
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setError(error.message)
          setLoading(false)
          setTimeout(() => router.push('/login?error=auth_failed'), 3000)
          return
        }

        if (data.session?.user) {
          const user = data.session.user
          
          // Check if profile exists
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileError || !profile) {
            // Create profile if it doesn't exist
            const username = user.user_metadata?.user_name || 
                            user.user_metadata?.name?.replace(/\s/g, '').toLowerCase() ||
                            user.email?.split('@')[0] || 
                            `user_${Math.random().toString(36).substring(2, 8)}`

            const { error: insertError } = await supabase
              .from('profiles')
              .insert([{
                id: user.id,
                username: username,
                avatar_url: user.user_metadata?.avatar_url || '🌟',
                avatar_bg: 'from-yellow-400 to-yellow-600',
                bio: ''
              }])

            if (insertError) {
              console.error('Profile creation error:', insertError)
            }
          }

          // Redirect to dashboard
          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      } catch (err) {
        console.error('Callback error:', err)
        setError('An unexpected error occurred')
        setLoading(false)
        setTimeout(() => router.push('/login'), 3000)
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Authentication Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Redirecting to login...</p>
          <div className="mt-4 w-8 h-8 border-4 border-maroon-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-maroon-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Signing you in...</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please wait while we set up your account</p>
      </div>
    </div>
  )
}