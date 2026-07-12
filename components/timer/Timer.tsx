'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { format } from 'date-fns'
import { Play, Pause, Square, RotateCcw, Clock, Calendar, Tag, Trash2, Edit2, Plus, Save, X } from 'lucide-react'
import { CountdownTimer } from './CountdownTimer'

interface TimerProps {
  categoryId: string
  categoryName: string
  categoryColor?: string
  onSessionComplete?: () => void
  onCategoryDelete?: (categoryId: string) => void
}

export function Timer({ categoryId, categoryName, categoryColor, onSessionComplete, onCategoryDelete }: TimerProps) {
  const { user } = useAuth()
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [sessionName, setSessionName] = useState('')
  const [sessions, setSessions] = useState<any[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pausedSeconds, setPausedSeconds] = useState(0)
  
  // Manual time entry states
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualHours, setManualHours] = useState('0')
  const [manualMinutes, setManualMinutes] = useState('0')
  const [manualSessionName, setManualSessionName] = useState('')
  const [manualDate, setManualDate] = useState('')
  
  // Edit session states
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editSessionName, setEditSessionName] = useState('')
  const [editHours, setEditHours] = useState('0')
  const [editMinutes, setEditMinutes] = useState('0')

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)

  // Use refs to track interval and state without causing re-renders
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const secondsRef = useRef(0)
  const isRunningRef = useRef(false)
  const isPausedRef = useRef(false)

  useEffect(() => {
    if (categoryId) {
      loadSessions()
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [categoryId])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        secondsRef.current += 1
        setSeconds(secondsRef.current)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    isRunningRef.current = isRunning
    isPausedRef.current = isPaused

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, isPaused])

  const loadSessions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('timer_sessions')
      .select('*')
      .eq('category_id', categoryId)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      setSessions(data)
      const runningSession = data.find(s => s.status === 'running' || s.status === 'paused')
      if (runningSession) {
        setCurrentSessionId(runningSession.id)
        const isPausedState = runningSession.status === 'paused'
        setIsRunning(!isPausedState)
        setIsPaused(isPausedState)
        setSessionName(runningSession.name)
        
        if (runningSession.start_time) {
          const start = new Date(runningSession.start_time).getTime()
          let elapsed = Math.floor((Date.now() - start) / 1000)
          
          if (isPausedState && runningSession.duration_seconds) {
            elapsed = runningSession.duration_seconds
            setPausedSeconds(elapsed)
          }
          
          secondsRef.current = elapsed
          setSeconds(elapsed)
        }
      }
    }
    setLoading(false)
  }

  const startTimer = async () => {
    if (!sessionName.trim()) {
      alert('Please give this timer session a name')
      return
    }

    secondsRef.current = 0
    setSeconds(0)
    setPausedSeconds(0)

    const { data, error } = await supabase
      .from('timer_sessions')
      .insert([{
        category_id: categoryId,
        user_id: user?.id,
        name: sessionName,
        start_time: new Date().toISOString(),
        status: 'running'
      }])
      .select()

    if (!error && data) {
      setCurrentSessionId(data[0].id)
      setIsRunning(true)
      setIsPaused(false)
      await loadSessions()
    }
  }

  const pauseTimer = async () => {
    if (currentSessionId) {
      const currentSeconds = secondsRef.current
      setPausedSeconds(currentSeconds)
      
      const { error } = await supabase
        .from('timer_sessions')
        .update({ 
          status: 'paused',
          duration_seconds: currentSeconds,
          end_time: new Date().toISOString()
        })
        .eq('id', currentSessionId)

      if (!error) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setIsPaused(true)
        setIsRunning(false)
        const { data } = await supabase
          .from('timer_sessions')
          .select('*')
          .eq('category_id', categoryId)
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (data) {
          setSessions(data)
        }
      }
    }
  }

  const resumeTimer = async () => {
    if (currentSessionId) {
      const { data: sessionData, error: fetchError } = await supabase
        .from('timer_sessions')
        .select('duration_seconds')
        .eq('id', currentSessionId)
        .single()

      if (fetchError) {
        console.error('Error fetching session:', fetchError)
        return
      }

      const startSeconds = sessionData?.duration_seconds || pausedSeconds || secondsRef.current
      
      const { error } = await supabase
        .from('timer_sessions')
        .update({ 
          status: 'running',
          start_time: new Date().toISOString()
        })
        .eq('id', currentSessionId)

      if (!error) {
        secondsRef.current = startSeconds
        setSeconds(startSeconds)
        setPausedSeconds(startSeconds)
        
        setIsPaused(false)
        setIsRunning(true)
        
        const { data } = await supabase
          .from('timer_sessions')
          .select('*')
          .eq('category_id', categoryId)
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (data) {
          setSessions(data)
        }
      }
    }
  }

  const stopTimer = async () => {
    if (currentSessionId) {
      const totalSeconds = secondsRef.current
      
      const { error } = await supabase
        .from('timer_sessions')
        .update({ 
          status: 'completed',
          duration_seconds: totalSeconds,
          end_time: new Date().toISOString()
        })
        .eq('id', currentSessionId)

      if (!error) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        setIsRunning(false)
        setIsPaused(false)
        secondsRef.current = 0
        setSeconds(0)
        setPausedSeconds(0)
        setCurrentSessionId(null)
        setSessionName('')
        await loadSessions()
        if (onSessionComplete) onSessionComplete()
      }
    }
  }

  const addManualTime = async () => {
    const hours = parseInt(manualHours) || 0
    const minutes = parseInt(manualMinutes) || 0
    const totalSeconds = (hours * 3600) + (minutes * 60)
    
    if (totalSeconds === 0) {
      alert('Please enter a valid time (at least 1 minute)')
      return
    }

    if (!manualSessionName.trim()) {
      alert('Please give this session a name')
      return
    }

    const sessionDate = manualDate ? new Date(manualDate) : new Date()
    
    const { data, error } = await supabase
      .from('timer_sessions')
      .insert([{
        category_id: categoryId,
        user_id: user?.id,
        name: manualSessionName,
        start_time: sessionDate.toISOString(),
        end_time: new Date(sessionDate.getTime() + totalSeconds * 1000).toISOString(),
        duration_seconds: totalSeconds,
        status: 'completed'
      }])
      .select()

    if (!error && data) {
      await loadSessions()
      if (onSessionComplete) onSessionComplete()
      setManualHours('0')
      setManualMinutes('0')
      setManualSessionName('')
      setManualDate('')
      setShowManualEntry(false)
    } else {
      alert('Failed to add manual time. Please try again.')
    }
  }

  const deleteSession = async (sessionId: string) => {
    const { error } = await supabase
      .from('timer_sessions')
      .delete()
      .eq('id', sessionId)

    if (!error) {
      await loadSessions()
      if (onSessionComplete) onSessionComplete()
      setShowDeleteConfirm(false)
      setSessionToDelete(null)
    }
  }

  const startEditing = (session: any) => {
    if (session.status === 'running' || session.status === 'paused') {
      alert('Cannot edit a session that is currently running or paused. Please stop it first.')
      return
    }
    
    setEditingSessionId(session.id)
    setEditSessionName(session.name)
    const mins = Math.floor((session.duration_seconds || 0) / 60)
    const hrs = Math.floor(mins / 60)
    setEditHours(String(hrs))
    setEditMinutes(String(mins % 60))
  }

  const saveEdit = async () => {
    if (!editingSessionId) return
    
    const hours = parseInt(editHours) || 0
    const minutes = parseInt(editMinutes) || 0
    const totalSeconds = (hours * 3600) + (minutes * 60)
    
    if (totalSeconds === 0) {
      alert('Please enter a valid time')
      return
    }

    const { error } = await supabase
      .from('timer_sessions')
      .update({
        name: editSessionName,
        duration_seconds: totalSeconds
      })
      .eq('id', editingSessionId)

    if (!error) {
      await loadSessions()
      if (onSessionComplete) onSessionComplete()
      setEditingSessionId(null)
    }
  }

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // NEW: Format time with hours, minutes, and seconds for display
  const formatTimeFull = (totalSeconds: number) => {
    if (!totalSeconds) return '0s'
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 shadow-xl animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
        <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
      </div>
    )
  }

  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${categoryColor || 'from-maroon-500 to-pink-500'}`}></div>
            <h2 className="text-2xl font-bold text-maroon-800 dark:text-maroon-300">
            {categoryName}
            </h2>
        </div>
        <div className="flex items-center gap-2">
            <span className="badge-maroon">
            {sessions.length} sessions
            </span>
            {onCategoryDelete && (
            <button
                onClick={() => {
                if (confirm(`Are you sure you want to delete the category "${categoryName}" and all its sessions?`)) {
                    onCategoryDelete(categoryId)
                }
                }}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition cursor-pointer"
                title="Delete category"
            >
                <Trash2 className="w-4 h-4" />
            </button>
            )}
        </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stopwatch Section */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
            <div className="text-center mb-4">
            <div className="relative inline-block">
                <div className={`text-5xl font-mono font-bold tracking-wider ${
                isRunning ? 'text-maroon-600 dark:text-maroon-400' : 
                isPaused ? 'text-gold-600 dark:text-gold-400' : 
                'text-gray-400 dark:text-gray-500'
                }`}>
                {formatTime(seconds)}
                </div>
                {(isRunning || isPaused) && (
                <div className="absolute -top-2 -right-2">
                    <span className={`inline-block w-3 h-3 rounded-full animate-pulse ${
                    isRunning ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></span>
                </div>
                )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">⏱️ Stopwatch</p>
            </div>

            <div className="mb-3">
            <input
                type="text"
                placeholder="Session name..."
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all duration-200"
                disabled={isRunning || isPaused}
            />
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
            {!isRunning && !isPaused && (
                <>
                <button
                    onClick={startTimer}
                    className="bg-maroon-600 hover:bg-maroon-700 text-white font-semibold py-1.5 px-4 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-1.5 cursor-pointer text-sm"
                >
                    <Play className="w-4 h-4" /> Start
                </button>
                <button
                    onClick={() => setShowManualEntry(!showManualEntry)}
                    className="bg-gold-500 hover:bg-gold-600 text-maroon-900 font-semibold py-1.5 px-4 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-1.5 cursor-pointer text-sm"
                >
                    <Plus className="w-4 h-4" /> Manual
                </button>
                </>
            )}
            
            {isRunning && !isPaused && (
                <>
                <button
                    onClick={pauseTimer}
                    className="bg-gold-500 hover:bg-gold-600 text-maroon-900 font-semibold py-1.5 px-4 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-1.5 cursor-pointer text-sm"
                >
                    <Pause className="w-4 h-4" /> Pause
                </button>
                <button
                    onClick={stopTimer}
                    className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-1.5 px-4 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-1.5 cursor-pointer text-sm"
                >
                    <Square className="w-4 h-4" /> Stop
                </button>
                </>
            )}
            
            {isPaused && (
                <>
                <button
                    onClick={resumeTimer}
                    className="bg-maroon-600 hover:bg-maroon-700 text-white font-semibold py-1.5 px-4 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-1.5 cursor-pointer text-sm"
                >
                    <RotateCcw className="w-4 h-4" /> Resume
                </button>
                <button
                    onClick={stopTimer}
                    className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-1.5 px-4 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-1.5 cursor-pointer text-sm"
                >
                    <Square className="w-4 h-4" /> Stop
                </button>
                </>
            )}
            </div>
        </div>

        {/* Countdown Section */}
        <div>
            <CountdownTimer />
        </div>
        </div>

        {/* Manual Time Entry */}
        {showManualEntry && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" /> Add Manual Time
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
                type="text"
                placeholder="Session name"
                value={manualSessionName}
                onChange={(e) => setManualSessionName(e.target.value)}
                className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500"
            />
            <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500"
            />
            <div className="flex gap-2">
                <input
                type="number"
                min="0"
                max="99"
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
                placeholder="Hours"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500"
                />
                <span className="flex items-center text-gray-500 dark:text-gray-400 text-sm">h</span>
                <input
                type="number"
                min="0"
                max="59"
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                placeholder="Minutes"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500"
                />
                <span className="flex items-center text-gray-500 dark:text-gray-400 text-sm">m</span>
            </div>
            <div className="flex gap-2">
                <button
                onClick={addManualTime}
                className="flex-1 bg-maroon-600 hover:bg-maroon-700 text-white px-4 py-2 rounded-lg transition cursor-pointer text-sm"
                >
                Add
                </button>
                <button
                onClick={() => setShowManualEntry(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition cursor-pointer text-sm"
                >
                Cancel
                </button>
            </div>
            </div>
        </div>
        )}

        {/* Recent Sessions */}
        <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" /> Recent Sessions
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
            {sessions.filter(s => s.status === 'completed').length} completed
            </span>
        </div>
        
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {sessions.filter(s => s.status === 'completed' || s.status === 'paused').map((session) => (
            <div 
                key={session.id} 
                className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition group"
            >
                {editingSessionId === session.id ? (
                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <input
                    type="text"
                    value={editSessionName}
                    onChange={(e) => setEditSessionName(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                    />
                    <div className="flex items-center gap-1">
                    <input
                        type="number"
                        min="0"
                        value={editHours}
                        onChange={(e) => setEditHours(e.target.value)}
                        className="w-10 px-1 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-center"
                    />
                    <span className="text-xs text-gray-500">h</span>
                    <input
                        type="number"
                        min="0"
                        max="59"
                        value={editMinutes}
                        onChange={(e) => setEditMinutes(e.target.value)}
                        className="w-10 px-1 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-center"
                    />
                    <span className="text-xs text-gray-500">m</span>
                    <button
                        onClick={saveEdit}
                        className="p-1 text-green-600 hover:text-green-700 cursor-pointer"
                    >
                        <Save className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => setEditingSessionId(null)}
                        className="p-1 text-red-600 hover:text-red-700 cursor-pointer"
                    >
                        <X className="w-3 h-3" />
                    </button>
                    </div>
                </div>
                ) : (
                <>
                    <div className="flex-1">
                    <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                        {session.name}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(session.created_at), 'MMM d, yyyy')}
                        </span>
                        <span>
                        {session.status === 'paused' ? '⏸️ Paused' : '✅ Done'}
                        </span>
                    </div>
                    </div>
                    <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-maroon-600 dark:text-maroon-400">
                        {session.duration_seconds ? formatTimeFull(session.duration_seconds) : 'In progress'}
                    </div>
                    {session.status === 'completed' && (
                        <>
                        <button
                            onClick={() => startEditing(session)}
                            className="p-1 text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            title="Edit session"
                        >
                            <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => {
                            setSessionToDelete(session.id)
                            setShowDeleteConfirm(true)
                            }}
                            className="p-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            title="Delete session"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                        </>
                    )}
                    </div>
                </>
                )}
            </div>
            ))}
            
            {sessions.filter(s => s.status === 'completed' || s.status === 'paused').length === 0 && (
            <div className="text-center py-4">
                <div className="text-2xl mb-1">⏳</div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                No sessions yet
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Start your first timer or add manual time
                </p>
            </div>
            )}
        </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Session?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
                This action cannot be undone. Are you sure you want to delete this session?
            </p>
            <div className="flex gap-3">
                <button
                onClick={() => {
                    if (sessionToDelete) deleteSession(sessionToDelete)
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition cursor-pointer"
                >
                Delete
                </button>
                <button
                onClick={() => {
                    setShowDeleteConfirm(false)
                    setSessionToDelete(null)
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition cursor-pointer"
                >
                Cancel
                </button>
            </div>
            </div>
        </div>
        )}
    </div>
    )
}