'use client'

import { useState, useEffect, useRef } from 'react'
import { Clock, Play, Pause, Square, RotateCcw, Bell } from 'lucide-react'

interface CountdownTimerProps {
  onComplete?: () => void
}

export function CountdownTimer({ onComplete }: CountdownTimerProps) {
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(5)
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes in seconds
  const [initialTime, setInitialTime] = useState(300)
  const [isComplete, setIsComplete] = useState(false)
  const [showAlarm, setShowAlarm] = useState(false)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
    // Create audio using Web Audio API - works without any file
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    
    if (AudioContext) {
        const context = new AudioContext()
        
        // Create a function that plays a beep
        const playBeep = (frequency: number, duration: number, volume: number) => {
        const oscillator = context.createOscillator()
        const gainNode = context.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(context.destination)
        
        oscillator.frequency.value = frequency
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(volume, context.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration)
        
        oscillator.start(context.currentTime)
        oscillator.stop(context.currentTime + duration)
        }
        
        audioRef.current = {
        play: () => {
            // Play multiple beeps in sequence
            playBeep(800, 0.3, 0.5)
            setTimeout(() => playBeep(1000, 0.3, 0.5), 300)
            setTimeout(() => playBeep(800, 0.3, 0.5), 600)
            setTimeout(() => playBeep(1000, 0.5, 0.5), 900)
        }
        } as any
    } else {
        // Fallback if Web Audio API is not available
        console.warn('Web Audio API not supported')
        audioRef.current = {
        play: () => {
            alert('⏰ TIME\'S UP! ⏰')
        }
        } as any
    }
    }, [])



  useEffect(() => {
    if (isRunning && !isPaused && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Timer complete
            setIsRunning(false)
            setIsComplete(true)
            setShowAlarm(true)
            playAlarm()
            if (onComplete) onComplete()
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, isPaused, timeLeft])

  const playAlarm = () => {
    if (audioRef.current) {
      // Play alarm sound multiple times
      let count = 0
      const interval = setInterval(() => {
        if (count < 3) {
          audioRef.current?.play()
          count++
        } else {
          clearInterval(interval)
        }
      }, 500)
    }
  }

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
    if (timeLeft === 0) {
      // Reset if at zero
      setTimeLeft(initialTime)
    }
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
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const stopTimer = () => {
    setIsRunning(false)
    setIsPaused(false)
    setIsComplete(true)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
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

  // Check if timer is complete
  const isTimerComplete = timeLeft === 0 && isComplete

  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-gold-500" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Countdown Timer</h3>
        {showAlarm && (
          <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full animate-pulse flex items-center gap-1">
            <Bell className="w-3 h-3" /> ALARM!
          </span>
        )}
      </div>

      {/* Time Display */}
      <div className="text-center mb-4">
        <div className={`text-5xl font-mono font-bold tracking-wider ${
          isTimerComplete ? 'text-red-500 animate-pulse' :
          isRunning ? 'text-emerald-600 dark:text-emerald-400' :
          isPaused ? 'text-gold-600 dark:text-gold-400' :
          'text-gray-400 dark:text-gray-500'
        }`}>
          {time.hours}:{time.minutes}:{time.seconds}
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${
              isTimerComplete ? 'bg-red-500' :
              progress > 75 ? 'bg-red-400' :
              progress > 50 ? 'bg-yellow-400' :
              progress > 25 ? 'bg-blue-400' :
              'bg-emerald-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Inputs for setting time */}
      {!isRunning && !isPaused && !isTimerComplete && (
        <div className="flex gap-2 mb-4 justify-center">
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="99"
              value={hours}
              onChange={(e) => setHours(Math.min(99, parseInt(e.target.value) || 0))}
              className="w-14 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-maroon-500"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">h</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="59"
              value={minutes}
              onChange={(e) => setMinutes(Math.min(59, parseInt(e.target.value) || 0))}
              className="w-14 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-maroon-500"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">m</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="59"
              value={seconds}
              onChange={(e) => setSeconds(Math.min(59, parseInt(e.target.value) || 0))}
              className="w-14 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-maroon-500"
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">s</span>
          </div>
          <button
            onClick={setTimer}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded-lg transition cursor-pointer"
          >
            Set
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-2 justify-center">
        {!isRunning && !isPaused && !isTimerComplete && (
          <>
            <button
              onClick={startTimer}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer"
              disabled={timeLeft === 0}
            >
              <Play className="w-4 h-4" /> Start
            </button>
          </>
        )}
        
        {isRunning && !isPaused && (
          <>
            <button
              onClick={pauseTimer}
              className="bg-gold-500 hover:bg-gold-600 text-maroon-900 px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Pause className="w-4 h-4" /> Pause
            </button>
            <button
              onClick={stopTimer}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4" /> Stop
            </button>
          </>
        )}
        
        {isPaused && (
          <>
            <button
              onClick={resumeTimer}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4" /> Resume
            </button>
            <button
              onClick={stopTimer}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4" /> Stop
            </button>
          </>
        )}
        
        {isTimerComplete && (
          <>
            <button
              onClick={resetTimer}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
            <button
              onClick={() => {
                setShowAlarm(false)
                setIsComplete(false)
                setTimeLeft(initialTime)
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition cursor-pointer"
            >
              Dismiss Alarm
            </button>
          </>
        )}
      </div>

      {/* Alarm indicator */}
      {isTimerComplete && (
        <div className="mt-3 text-center text-red-500 font-bold animate-pulse">
          ⏰ TIME'S UP! ⏰
        </div>
      )}
    </div>
  )
}