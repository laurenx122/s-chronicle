'use client'

import { useState, useEffect, useRef } from 'react'
import { Clock, Play, Pause, Square, RotateCcw, Bell } from 'lucide-react'

interface CountdownTimerProps {
  categoryId?: string
  userId?: string
  onComplete?: (durationSeconds: number) => void
}

export function CountdownTimer({ categoryId, userId, onComplete }: CountdownTimerProps) {
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(5)
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300)
  const [initialTime, setInitialTime] = useState(300)
  const [isComplete, setIsComplete] = useState(false)
  const [showAlarm, setShowAlarm] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const playAlarmSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContext) {
        alert('⏰ TIME\'S UP! ⏰')
        return
      }
      const context = new AudioContext()
      const beep = (freq: number, dur: number, vol: number, delay: number) => {
        setTimeout(() => {
          try {
            const osc = context.createOscillator()
            const gain = context.createGain()
            osc.connect(gain)
            gain.connect(context.destination)
            osc.frequency.value = freq
            osc.type = 'square'
            gain.gain.setValueAtTime(vol, context.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + dur)
            osc.start(context.currentTime)
            osc.stop(context.currentTime + dur)
          } catch (e) { /* ignore */ }
        }, delay)
      }
      beep(880, 0.2, 0.3, 0)
      beep(1100, 0.2, 0.3, 250)
      beep(880, 0.2, 0.3, 500)
      beep(1100, 0.2, 0.3, 750)
      beep(880, 0.4, 0.4, 1000)
      beep(1100, 0.4, 0.4, 1400)
    } catch (error) {
      console.error('Alarm error:', error)
      alert('⏰ TIME\'S UP! ⏰')
    }
  }

  useEffect(() => {
    if (isRunning && !isPaused && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            setIsComplete(true)
            setShowAlarm(true)
            playAlarmSound()
            // Call onComplete with the initial time (total duration)
            if (onComplete) onComplete(initialTime)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, isPaused, timeLeft, initialTime, onComplete])

  const setTimer = () => {
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds
    if (totalSeconds === 0) {
      alert('Please set a time greater than 0')
      return
    }
    setTimeLeft(totalSeconds)
    setInitialTime(totalSeconds)
    setIsComplete(false)
    setShowAlarm(false)
  }

  const startTimer = () => {
    if (timeLeft === 0) setTimeLeft(initialTime)
    setIsRunning(true)
    setIsPaused(false)
    setIsComplete(false)
    setShowAlarm(false)
  }

  const pauseTimer = () => {
    setIsPaused(true)
    setIsRunning(false)
  }

  const resumeTimer = () => {
    setIsRunning(true)
    setIsPaused(false)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setIsPaused(false)
    setTimeLeft(initialTime)
    setIsComplete(false)
    setShowAlarm(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const stopTimer = () => {
    setIsRunning(false)
    setIsPaused(false)
    setIsComplete(true)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return {
      hours: h.toString().padStart(2, '0'),
      minutes: m.toString().padStart(2, '0'),
      seconds: s.toString().padStart(2, '0')
    }
  }

  const time = formatTime(timeLeft)
  const progress = initialTime > 0 ? ((initialTime - timeLeft) / initialTime) * 100 : 0
  const isTimerComplete = timeLeft === 0 && isComplete

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gold-500" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Countdown Timer</h3>
        {showAlarm && (
          <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse flex items-center gap-1">
            <Bell className="w-3 h-3" /> ALARM!
          </span>
        )}
      </div>

      <div className="text-center mb-3">
        <div className={`text-4xl font-mono font-bold tracking-wider ${
          isTimerComplete ? 'text-red-500 animate-pulse' :
          isRunning ? 'text-emerald-600 dark:text-emerald-400' :
          isPaused ? 'text-gold-600 dark:text-gold-400' :
          'text-gray-400 dark:text-gray-500'
        }`}>
          {time.hours}:{time.minutes}:{time.seconds}
        </div>
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div className={`h-full transition-all duration-1000 ${
            isTimerComplete ? 'bg-red-500' :
            progress > 75 ? 'bg-red-400' :
            progress > 50 ? 'bg-yellow-400' :
            progress > 25 ? 'bg-blue-400' :
            'bg-emerald-400'
          }`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {!isRunning && !isPaused && !isTimerComplete && (
        <div className="flex gap-1 mb-3 justify-center">
          <div className="flex items-center gap-0.5">
            <input type="number" min="0" max="99" value={hours} onChange={(e) => setHours(Math.min(99, parseInt(e.target.value) || 0))} className="w-10 px-1 py-0.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-center focus:outline-none focus:ring-2 focus:ring-maroon-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">h</span>
          </div>
          <div className="flex items-center gap-0.5">
            <input type="number" min="0" max="59" value={minutes} onChange={(e) => setMinutes(Math.min(59, parseInt(e.target.value) || 0))} className="w-10 px-1 py-0.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-center focus:outline-none focus:ring-2 focus:ring-maroon-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">m</span>
          </div>
          <div className="flex items-center gap-0.5">
            <input type="number" min="0" max="59" value={seconds} onChange={(e) => setSeconds(Math.min(59, parseInt(e.target.value) || 0))} className="w-10 px-1 py-0.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-center focus:outline-none focus:ring-2 focus:ring-maroon-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">s</span>
          </div>
          <button onClick={setTimer} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-0.5 rounded text-sm transition cursor-pointer">Set</button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 justify-center">
        {!isRunning && !isPaused && !isTimerComplete && (
          <button onClick={startTimer} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-sm transition flex items-center gap-1 cursor-pointer disabled:opacity-50" disabled={timeLeft === 0}>
            <Play className="w-3 h-3" /> Start
          </button>
        )}
        {isRunning && !isPaused && (
          <>
            <button onClick={pauseTimer} className="bg-gold-500 hover:bg-gold-600 text-maroon-900 px-3 py-1 rounded text-sm transition flex items-center gap-1 cursor-pointer">
              <Pause className="w-3 h-3" /> Pause
            </button>
            <button onClick={stopTimer} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition flex items-center gap-1 cursor-pointer">
              <Square className="w-3 h-3" /> Stop
            </button>
          </>
        )}
        {isPaused && (
          <>
            <button onClick={resumeTimer} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-sm transition flex items-center gap-1 cursor-pointer">
              <Play className="w-3 h-3" /> Resume
            </button>
            <button onClick={stopTimer} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition flex items-center gap-1 cursor-pointer">
              <Square className="w-3 h-3" /> Stop
            </button>
          </>
        )}
        {isTimerComplete && (
          <>
            <button onClick={resetTimer} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition flex items-center gap-1 cursor-pointer">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
            <button onClick={() => { setShowAlarm(false); setIsComplete(false); setTimeLeft(initialTime) }} className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition cursor-pointer">
              Dismiss
            </button>
          </>
        )}
      </div>


      {isTimerComplete && (
        <div className="mt-2 text-center text-red-500 font-bold animate-pulse text-sm">⏰ TIME'S UP! ⏰</div>
      )}
    </div>
  )
}