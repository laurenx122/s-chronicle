'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { format } from 'date-fns'
import { Play, Pause, Square, RotateCcw, Clock, Calendar, Tag } from 'lucide-react'

interface TimerProps {
  categoryId: string
  categoryName: string
  onSessionComplete?: () => void
}

export function Timer({ categoryId, categoryName, onSessionComplete }: TimerProps) {
  const { user } = useAuth()
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [sessionName, setSessionName] = useState('')
  const [sessions, setSessions] = useState<any[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (categoryId) {
      loadSessions()
    }
  }, [categoryId])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, isPaused])

  const loadSessions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('timer_sessions')
      .select('*')
      .eq('category_id', categoryId)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) {
      setSessions(data)
      // Check if there's a running session
      const runningSession = data.find(s => s.status === 'running' || s.status === 'paused')
      if (runningSession) {
        setCurrentSessionId(runningSession.id)
        setIsRunning(runningSession.status === 'running')
        setIsPaused(runningSession.status === 'paused')
        setSessionName(runningSession.name)
        // Calculate elapsed time
        if (runningSession.start_time) {
          const start = new Date(runningSession.start_time).getTime()
          const elapsed = Math.floor((Date.now() - start) / 1000)
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
      setSeconds(0)
      await loadSessions()
    }
  }

  const pauseTimer = async () => {
    if (currentSessionId) {
      const { error } = await supabase
        .from('timer_sessions')
        .update({ 
          status: 'paused',
          duration_seconds: seconds
        })
        .eq('id', currentSessionId)

      if (!error) {
        setIsPaused(true)
        setIsRunning(false)
        await loadSessions()
      }
    }
  }

  const resumeTimer = async () => {
    if (currentSessionId) {
      const { error } = await supabase
        .from('timer_sessions')
        .update({ 
          status: 'running',
          start_time: new Date().toISOString()
        })
        .eq('id', currentSessionId)

      if (!error) {
        setIsPaused(false)
        setIsRunning(true)
        await loadSessions()
      }
    }
  }

  const stopTimer = async () => {
    if (currentSessionId) {
      const totalSeconds = seconds
      
      const { error } = await supabase
        .from('timer_sessions')
        .update({ 
          status: 'completed',
          duration_seconds: totalSeconds,
          end_time: new Date().toISOString()
        })
        .eq('id', currentSessionId)

      if (!error) {
        setIsRunning(false)
        setIsPaused(false)
        setSeconds(0)
        setCurrentSessionId(null)
        setSessionName('')
        await loadSessions()
        if (onSessionComplete) onSessionComplete()
      }
    }
  }

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
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
    <div className="glass rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-maroon-600 dark:text-maroon-400" />
          <h2 className="text-2xl font-bold gradient-text">{categoryName}</h2>
        </div>
        <span className="badge-maroon">
          {sessions.length} sessions
        </span>
      </div>
      
      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <div className={`text-6xl font-mono font-bold tracking-wider ${
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
      </div>

      {/* Controls */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="What are you doing?"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          className="input-custom"
          disabled={isRunning || isPaused}
        />
      </div>

      <div className="flex flex-wrap gap-3 justify-center mb-6">
        {!isRunning && !isPaused && (
          <button
            onClick={startTimer}
            className="btn-primary flex items-center gap-2 px-6 py-3"
          >
            <Play className="w-5 h-5" /> Start
          </button>
        )}
        
        {isRunning && !isPaused && (
          <>
            <button
              onClick={pauseTimer}
              className="btn-gold flex items-center gap-2 px-6 py-3"
            >
              <Pause className="w-5 h-5" /> Pause
            </button>
            <button
              onClick={stopTimer}
              className="btn-pink flex items-center gap-2 px-6 py-3"
            >
              <Square className="w-5 h-5" /> Stop & Save
            </button>
          </>
        )}
        
        {isPaused && (
          <>
            <button
              onClick={resumeTimer}
              className="btn-primary flex items-center gap-2 px-6 py-3"
            >
              <RotateCcw className="w-5 h-5" /> Resume
            </button>
            <button
              onClick={stopTimer}
              className="btn-pink flex items-center gap-2 px-6 py-3"
            >
              <Square className="w-5 h-5" /> Stop & Save
            </button>
          </>
        )}
      </div>

      {/* Recent Sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Recent Sessions
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {sessions.filter(s => s.status === 'completed').length} completed
          </span>
        </div>
        
        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
          {sessions.filter(s => s.status === 'completed' || s.status === 'paused').map((session) => (
            <div 
              key={session.id} 
              className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-800 dark:text-gray-200">
                  {session.name}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(session.created_at), 'MMM d')}
                  </span>
                  <span>
                    {session.status === 'paused' ? '⏸️ Paused' : '✅ Done'}
                  </span>
                </div>
              </div>
              <div className="text-sm font-semibold text-maroon-600 dark:text-maroon-400">
                {session.duration_seconds ? formatTime(session.duration_seconds) : 'In progress'}
              </div>
            </div>
          ))}
          
          {sessions.filter(s => s.status === 'completed' || s.status === 'paused').length === 0 && (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">⏳</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No sessions yet
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Start your first timer to track your progress
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}