'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { GoogleSignIn } from '@/components/GoogleSignIn'
import { Mail, Lock, User, UserPlus, Sparkles, AlertCircle } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const { signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before trying again.`)
      return
    }

    setLoading(true)
    setError('')
    
    try {
      await signUp(email, password, username)
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Registration error:', err)
      
      if (err.message?.includes('rate limit')) {
        setError('Too many registration attempts. Please wait 5-10 minutes and try again with a different email, or use Google Sign-In above.')
        setCooldown(30)
        const interval = setInterval(() => {
          setCooldown(prev => {
            if (prev <= 1) {
              clearInterval(interval)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else if (err.message?.includes('duplicate key')) {
        setError('Username already taken. Please choose another one.')
      } else if (err.message?.includes('Email')) {
        setError('Email already registered. Please sign in instead.')
      } else {
        setError(err.message || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen animated-gradient flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="glass rounded-3xl p-8 w-full max-w-md shadow-2xl transform transition-all hover:scale-[1.01]">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-float">🚀</div>
          <h1 className="text-4xl font-bold gradient-text">Get Started</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create your account and start tracking today
          </p>
        </div>

        {/* Google Sign In Button */}
        <div className="mb-6">
          <GoogleSignIn />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 border-t border-gray-300 dark:border-gray-700"></div>
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">or sign up with email</span>
          <div className="flex-1 border-t border-gray-300 dark:border-gray-700"></div>
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
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-custom pl-10"
                  placeholder="Choose a cool username"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-custom pl-10"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-custom pl-10"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className={`${
                error.includes('rate limit') 
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
              } border px-4 py-3 rounded-lg text-sm flex items-start gap-2`}>
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {cooldown > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-lg text-sm text-center">
                ⏳ Please wait {cooldown} seconds before trying again
              </div>
            )}

            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" /> Create Account
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-maroon-600 dark:text-maroon-400 font-semibold hover:underline transition">
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Sparkles className="w-3 h-3" />
          <span>Join the productivity community</span>
          <Sparkles className="w-3 h-3" />
        </div>
      </div>
    </div>
  )
}