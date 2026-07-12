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
        console.log('🔐 Auth Callback: Getting session...')
        
        // Get the session after OAuth redirect
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError(sessionError.message)
          setLoading(false)
          return
        }

        if (!session?.user) {
          console.log('No session found, redirecting to login')
          router.push('/login')
          return
        }

        const user = session.user
        console.log('👤 User found:', user.email)

        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          console.log('📝 Creating profile for user...')
          
          // Create profile
          const username = user.user_metadata?.user_name || 
                          user.user_metadata?.name?.replace(/\s/g, '').toLowerCase() ||
                          user.email?.split('@')[0] || 
                          `user_${Math.random().toString(36).substring(2, 8)}`

          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: username,
              bio: '',
              avatar_url: user.user_metadata?.avatar_url || '🌟',
              avatar_bg: 'from-yellow-400 to-yellow-600'
            })

          if (insertError) {
            console.error('❌ Profile creation error:', insertError)
            setError(`Failed to create profile: ${insertError.message}`)
            setLoading(false)
            return
          }
          console.log('✅ Profile created successfully!')
        } else {
          console.log('✅ Profile already exists')
        }

        console.log('🚀 Redirecting to dashboard...')
        router.push('/dashboard')
      } catch (err) {
        console.error('❌ Callback error:', err)
        setError('An unexpected error occurred')
        setLoading(false)
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
          <button
            onClick={() => router.push('/login')}
            className="bg-maroon-600 hover:bg-maroon-700 text-white px-6 py-2 rounded-lg transition cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-maroon-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Setting up your account...</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please wait a moment</p>
      </div>
    </div>
  )
}