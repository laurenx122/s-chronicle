'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { GoogleSignIn } from '@/components/GoogleSignIn'
import { Mail, Lock, LogIn, Sparkles } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signIn(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
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
          <div className="text-6xl mb-4 animate-float">⏱️</div>
          <h1 className="text-3xl font-bold text-maroon-800 dark:text-maroon-300 text-center mb-2">
            S-Chronicle
            </h1>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">
            Track. Connect. Grow.
            </p>
        </div>

        {/* Google Sign In Button */}
        <div className="mb-6">
          <GoogleSignIn />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 border-t border-gray-300 dark:border-gray-700"></div>
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">or continue with email</span>
          <div className="flex-1 border-t border-gray-300 dark:border-gray-700"></div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
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
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <span className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <LogIn className="w-5 h-5" /> Sign In
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-maroon-600 dark:text-maroon-400 font-semibold hover:underline transition">
              Create one
            </Link>
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Sparkles className="w-3 h-3" />
          <span>Track. Connect. Grow.</span>
          <Sparkles className="w-3 h-3" />
        </div>
      </div>
    </div>
  )
}