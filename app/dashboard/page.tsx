'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Timer } from '@/components/timer/Timer'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Plus, Users, LogOut, Layout, Lock, Clock, Calendar, TrendingUp } from 'lucide-react'

interface Category {
  id: string
  name: string
  is_private: boolean
  session_count?: number
  total_time?: number // in seconds
  color?: string
}

// Category colors - vibrant and varied
const CATEGORY_COLORS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-indigo-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-yellow-500 to-amber-500',
  'from-orange-500 to-red-500',
  'from-violet-500 to-fuchsia-500',
  'from-cyan-500 to-sky-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-purple-500',
  'from-teal-500 to-emerald-500',
  'from-amber-500 to-yellow-500',
]

export default function Dashboard() {
  const { user, signOut, checkProfile } = useAuth()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [totalOverallTime, setTotalOverallTime] = useState(0)
  const [checkingProfile, setCheckingProfile] = useState(true)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const checkAndLoad = async () => {
      // Check if user has a username
      const { hasUsername } = await checkProfile()
      if (!hasUsername) {
        router.push('/setup-username')
        return
      }
      setCheckingProfile(false)
      
      // Load user profile for display name
      await loadUserProfile()
      await loadCategories()
    }

    checkAndLoad()
  }, [user, router])

  const loadUserProfile = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()
      
      if (!error && data?.username) {
        setDisplayName(data.username)
      } else {
        // Fallback to email or user metadata
        setDisplayName(user?.user_metadata?.username || user?.email?.split('@')[0] || 'User')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setDisplayName(user?.email?.split('@')[0] || 'User')
    }
  }

  const loadCategories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: true })

    if (!error && data) {
      const categoriesWithData = await Promise.all(
        data.map(async (category, index) => {
          // Get session count and total time
          const { data: sessions, error: sessionsError } = await supabase
            .from('timer_sessions')
            .select('duration_seconds')
            .eq('category_id', category.id)
            .eq('user_id', user?.id)
            .eq('status', 'completed')

          let totalTime = 0
          let sessionCount = 0

          if (!sessionsError && sessions) {
            sessionCount = sessions.length
            totalTime = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0)
          }

          return {
            ...category,
            session_count: sessionCount,
            total_time: totalTime,
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
          }
        })
      )
      
      setCategories(categoriesWithData)
      
      // Calculate overall total time
      const overallTotal = categoriesWithData.reduce((acc, c) => acc + (c.total_time || 0), 0)
      setTotalOverallTime(overallTotal)
      
      if (categoriesWithData.length > 0 && !selectedCategory) {
        setSelectedCategory(categoriesWithData[0].id)
      } else if (categoriesWithData.length === 0) {
        setSelectedCategory(null)
      }
    }
    setLoading(false)
  }

  const addCategory = async () => {
    if (!newCategoryName.trim()) return

    const colorIndex = categories.length % CATEGORY_COLORS.length
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        user_id: user?.id,
        name: newCategoryName,
        is_private: isPrivate
      }])
      .select()

    if (!error && data) {
      setCategories([...categories, { 
        ...data[0], 
        session_count: 0, 
        total_time: 0,
        color: CATEGORY_COLORS[colorIndex]
      }])
      setNewCategoryName('')
      setIsPrivate(false)
      setSelectedCategory(data[0].id)
      setShowNewCategory(false)
    }
  }

  const deleteCategory = async (categoryId: string) => {
    const { error: sessionsError } = await supabase
      .from('timer_sessions')
      .delete()
      .eq('category_id', categoryId)
      .eq('user_id', user?.id)

    if (sessionsError) {
      alert('Failed to delete sessions. Please try again.')
      return
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', user?.id)

    if (!error) {
      const updatedCategories = categories.filter(c => c.id !== categoryId)
      setCategories(updatedCategories)
      if (selectedCategory === categoryId) {
        setSelectedCategory(updatedCategories.length > 0 ? updatedCategories[0].id : null)
      }
    } else {
      alert('Failed to delete category. Please try again.')
    }
  }

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut()
      router.push('/login')
    }
  }

  const formatTotalTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  if (loading || checkingProfile) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏱️</span>
            <div>
              <h1 className="text-xl font-bold text-maroon-800 dark:text-maroon-300">
                S-Chronicle
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                Track. Connect. Grow.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block">
              {displayName ? `${displayName}'s Chronicles` : 'Chronicles'}
            </span>
            <ThemeToggle />
            <Link 
              href="/friends" 
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-maroon-600 dark:hover:text-maroon-400 transition"
            >
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline">Friends</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 bg-maroon-600 hover:bg-maroon-700 text-white text-sm py-1.5 px-4 rounded-lg transition-all duration-200 hover:scale-105"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-maroon-500 to-pink-500 rounded-2xl p-4 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-sm opacity-80">Total Time</p>
                <p className="text-2xl font-bold">{formatTotalTime(totalOverallTime)}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl p-4 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-sm opacity-80">Categories</p>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 opacity-80" />
              <div>
                <p className="text-sm opacity-80">Total Sessions</p>
                <p className="text-2xl font-bold">
                  {categories.reduce((acc, c) => acc + (c.session_count || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-2xl p-4 shadow-xl sticky top-20 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold bg-gradient-to-r from-maroon-600 to-pink-500 bg-clip-text text-transparent">
                  Categories
                </h2>
                <button
                  onClick={() => setShowNewCategory(!showNewCategory)}
                  className="p-2 bg-maroon-100 dark:bg-maroon-900 rounded-full hover:bg-maroon-200 dark:hover:bg-maroon-800 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-maroon-600 dark:text-maroon-400" />
                </button>
              </div>
              
              {showNewCategory && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    placeholder="Category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all duration-200 mb-2"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      id="private"
                      className="rounded border-gray-300 text-maroon-600 focus:ring-maroon-500"
                    />
                    <label htmlFor="private" className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Private
                    </label>
                  </div>
                  <button
                    onClick={addCategory}
                    className="w-full bg-maroon-600 hover:bg-maroon-700 text-white text-sm py-2 rounded-lg transition cursor-pointer"
                  >
                    Create Category
                  </button>
                </div>
              )}

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {categories.map((category) => {
                  const isSelected = selectedCategory === category.id
                  return (
                    <div key={category.id} className="group flex items-center gap-1">
                      <button
                        onClick={() => setSelectedCategory(category.id)}
                        className={`flex-1 text-left p-3 rounded-xl transition-all duration-200 ${
                          isSelected
                            ? `bg-gradient-to-r ${category.color || 'from-maroon-600 to-maroon-700'} text-white shadow-lg`
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${category.color || 'from-gray-400 to-gray-500'}`}></div>
                            <span className="font-medium">{category.name}</span>
                            {category.is_private && (
                              <Lock className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                          <div className="text-right">
                            <div className={`text-xs font-semibold ${isSelected ? 'text-white/90' : 'text-maroon-600 dark:text-maroon-400'}`}>
                              {formatTotalTime(category.total_time || 0)}
                            </div>
                            <div className={`text-xs ${isSelected ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                              {category.session_count || 0} sessions
                            </div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${category.name}" and all its sessions?`)) {
                            deleteCategory(category.id)
                          }
                        }}
                        className="p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                        title="Delete category"
                      >
                        <LogOut className="w-4 h-4 rotate-90" />
                      </button>
                    </div>
                  )
                })}
                
                {categories.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📂</div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No categories yet
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                      Create your first category to start tracking
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Timer */}
          <div className="lg:col-span-3">
            {selectedCategory ? (
              <Timer
                categoryId={selectedCategory}
                categoryName={categories.find(c => c.id === selectedCategory)?.name || ''}
                categoryColor={categories.find(c => c.id === selectedCategory)?.color}
                onSessionComplete={loadCategories}
                onCategoryDelete={deleteCategory}
              />
            ) : (
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-2xl p-8 text-center shadow-xl border border-gray-200 dark:border-gray-800">
                <div className="text-6xl mb-4">⏱️</div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Select a category to start tracking
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Create a new category or select an existing one from the sidebar
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}