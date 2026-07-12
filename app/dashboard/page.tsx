'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Timer } from '@/components/timer/Timer'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Plus, Users, LogOut, Layout, Lock, Globe } from 'lucide-react'

interface Category {
  id: string
  name: string
  is_private: boolean
  session_count?: number
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewCategory, setShowNewCategory] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    loadCategories()
  }, [user])

  const loadCategories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: true })

    if (!error && data) {
      // Get session counts for each category
      const categoriesWithCounts = await Promise.all(
        data.map(async (category) => {
          const { count } = await supabase
            .from('timer_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id)
            .eq('user_id', user?.id)
            .eq('status', 'completed')
          
          return { ...category, session_count: count || 0 }
        })
      )
      
      setCategories(categoriesWithCounts)
      if (categoriesWithCounts.length > 0 && !selectedCategory) {
        setSelectedCategory(categoriesWithCounts[0].id)
      }
    }
    setLoading(false)
  }

  const addCategory = async () => {
    if (!newCategoryName.trim()) return

    const { data, error } = await supabase
      .from('categories')
      .insert([{
        user_id: user?.id,
        name: newCategoryName,
        is_private: isPrivate
      }])
      .select()

    if (!error && data) {
      setCategories([...categories, { ...data[0], session_count: 0 }])
      setNewCategoryName('')
      setIsPrivate(false)
      setSelectedCategory(data[0].id)
      setShowNewCategory(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (loading) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏱️</span>
            <h1 className="text-xl font-bold gradient-text hidden sm:block">Productivity Tracker</h1>
          </div>
          <div className="flex items-center gap-4">
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
              className="flex items-center gap-2 btn-primary text-sm py-1.5 px-4"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-4 shadow-xl sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold gradient-text">Categories</h2>
                <button
                  onClick={() => setShowNewCategory(!showNewCategory)}
                  className="p-2 bg-maroon-100 dark:bg-maroon-900 rounded-full hover:bg-maroon-200 dark:hover:bg-maroon-800 transition"
                >
                  <Plus className="w-4 h-4 text-maroon-600 dark:text-maroon-400" />
                </button>
              </div>
              
              {showNewCategory && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <input
                    type="text"
                    placeholder="Category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="input-custom mb-2"
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
                    className="w-full btn-primary text-sm"
                  >
                    Create Category
                  </button>
                </div>
              )}

              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center justify-between group ${
                      selectedCategory === category.id
                        ? 'bg-gradient-to-r from-maroon-600 to-maroon-700 text-white shadow-lg'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layout className="w-4 h-4" />
                      <span className="font-medium">{category.name}</span>
                      {category.is_private && (
                        <Lock className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      selectedCategory === category.id
                        ? 'bg-white/20'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      {category.session_count || 0}
                    </span>
                  </button>
                ))}
                
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
                onSessionComplete={loadCategories}
              />
            ) : (
              <div className="glass rounded-2xl p-8 text-center shadow-xl">
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