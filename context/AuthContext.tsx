'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  checkProfile: () => Promise<{ hasUsername: boolean; username?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkProfile = async () => {
    if (!user) return { hasUsername: false }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    if (error || !data?.username) {
      return { hasUsername: false }
    }
    return { hasUsername: true, username: data.username }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data: { user }, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { username }
        }
      })
      
      if (error) {
        if (error.message?.includes('rate limit')) {
          throw new Error('Too many registration attempts. Please wait 5-10 minutes before trying again with a different email.')
        }
        throw error
      }
      
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ 
            id: user.id, 
            username,
            avatar_url: '🌟',
            avatar_bg: 'from-yellow-400 to-yellow-600',
            bio: ''
          }])

        if (profileError) {
          console.error('Profile creation error:', profileError)
          await supabase.auth.signOut()
          throw new Error('Failed to create profile. Please try again.')
        }
      }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, checkProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}