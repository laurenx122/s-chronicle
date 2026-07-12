'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import { User, Check, AlertCircle, Sparkles } from 'lucide-react'

export default function SetupUsername() {
  const { user } = useAuth()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    // If no user, redirect to login
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user already has a username
    const checkProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (data?.username) {
        // User already has a username, redirect to dashboard
        router.push('/dashboard')
      }
    }
    checkProfile()
  }, [user, router])

  const checkUsername = async (value: string) => {
    if (value.length < 3) {
      setIsAvailable(null)
      return
    }

    setIsChecking(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', value)
      .single()

    setIsChecking(false)
    if (error || !data) {
      setIsAvailable(true)
      setError('')
    } else {
      setIsAvailable(false)
      setError('Username already taken')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    if (isAvailable === false) {
      setError('Username already taken')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Update profile with username
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username: username.trim(),
          avatar_url: '🌟',
          avatar_bg: 'from-yellow-400 to-yellow-600'
        })
        .eq('id', user?.id)

      if (error) {
        if (error.message?.includes('duplicate')) {
          setError('Username already taken')
        } else {
          setError('Failed to set username. Please try again.')
        }
        setLoading(false)
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Setup error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  // If no user, show nothing (will redirect)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-maroon-200 dark:bg-maroon-800 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-maroon-200 dark:bg-maroon-800 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen animated-gradient flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="glass rounded-3xl p-8 w-full max-w-md shadow-2xl transform transition-all hover:scale-[1.01]">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-float">👋</div>
          <h1 className="text-3xl font-bold text-maroon-800 dark:text-maroon-300">Welcome to S-Chronicle!</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Choose a unique username to get started
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/\s/g, '')
                    setUsername(value)
                    setError('')
                    if (value.length >= 3) {
                      checkUsername(value)
                    } else {
                      setIsAvailable(null)
                    }
                  }}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all duration-200 pl-10"
                  placeholder="Choose a cool username"
                  required
                  minLength={3}
                  maxLength={20}
                  disabled={loading}
                  autoFocus
                />
                {isChecking && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-maroon-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {isAvailable === true && username.length >= 3 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Check className="w-5 h-5 text-green-500" />
                  </div>
                )}
                {isAvailable === false && username.length >= 3 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
              </div>
              {username.length > 0 && username.length < 3 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum 3 characters
                </p>
              )}
              {isAvailable === true && username.length >= 3 && (
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Username is available!
                </p>
              )}
              {error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || username.length < 3 || isAvailable === false}
              className="w-full bg-maroon-600 hover:bg-maroon-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> Get Started
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Your username will be visible to other S-Chronicle users
          </p>
        </div>
      </div>
    </div>
  )
}