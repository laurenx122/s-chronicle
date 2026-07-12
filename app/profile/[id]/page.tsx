'use client'

import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AVATAR_PRESETS } from '@/lib/avatars'
import { ThemeToggle } from '@/components/ThemeToggle'
import { User, Calendar, Clock, Users, Edit2, Save, X, Heart, Shield, Lock, Upload } from 'lucide-react'
import { format } from 'date-fns'

interface Profile {
  id: string
  username: string
  bio: string
  avatar_url: string
  avatar_bg?: string
}

// Helper to get display avatar
const getDisplayAvatar = (avatarUrl: string | undefined, username: string) => {
  if (!avatarUrl) return '👤'
  if (avatarUrl.startsWith('http')) {
    return username?.charAt(0)?.toUpperCase() || '👤'
  }
  return avatarUrl
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isFriend, setIsFriend] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [editAvatarBg, setEditAvatarBg] = useState('')
  const [sessions, setSessions] = useState<any[]>([])
  const [totalTime, setTotalTime] = useState(0)
  const [friendCount, setFriendCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    setLoading(true)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profileError && profileData) {
      setProfile(profileData)
      setEditUsername(profileData.username)
      setEditBio(profileData.bio || '')
      setEditAvatar(profileData.avatar_url || '🌟')
      setEditAvatarBg(profileData.avatar_bg || 'from-yellow-400 to-yellow-600')

      const isOwn = user?.id === userId
      setIsOwnProfile(isOwn)

      let isFriendStatus = false
      if (!isOwn) {
        const { data: friendData } = await supabase
          .from('friends')
          .select('*')
          .or(`user_id.eq.${user?.id},friend_id.eq.${user?.id}`)
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
          .eq('status', 'accepted')
        isFriendStatus = !!(friendData && friendData.length > 0)
        setIsFriend(isFriendStatus)
      }

      const { count: friendCountData } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted')
      setFriendCount(friendCountData || 0)

      let sessionsData: any[] = []
      let visibleSessions: any[] = []

      if (isOwn) {
        const { data } = await supabase
          .from('timer_sessions')
          .select('*, categories:category_id(name, is_private)')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(50)
        sessionsData = data || []
        visibleSessions = sessionsData
      } else if (isFriendStatus) {
        const { data: allSessions } = await supabase
          .from('timer_sessions')
          .select('*, categories:category_id(id, name, is_private)')
          .eq('user_id', userId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(50)
        if (allSessions) {
          visibleSessions = allSessions.filter(s => s.categories && s.categories.is_private === false)
          sessionsData = visibleSessions.slice(0, 20)
        }
      } else {
        sessionsData = []
        visibleSessions = []
      }

      setSessions(sessionsData)
      const total = visibleSessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0)
      setTotalTime(total)
    }
    setLoading(false)
  }

  // -------- Username & Profile Update --------
  const updateProfile = async () => {
    if (!editUsername.trim()) {
      alert('Username cannot be empty')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        username: editUsername.trim(),
        bio: editBio,
        avatar_url: editAvatar,
        avatar_bg: editAvatarBg
      })
      .eq('id', user?.id)

    if (!error) {
      setProfile({
        ...profile!,
        username: editUsername.trim(),
        bio: editBio,
        avatar_url: editAvatar,
        avatar_bg: editAvatarBg
      })
      setEditing(false)
      setShowAvatarPicker(false)
      alert('Profile updated!')
    } else {
      alert('Failed to update: ' + error.message)
    }
  }

  // -------- Image Upload --------
  const uploadAvatar = async (file: File) => {
    if (!user) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB')
      return
    }
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    if (!allowed.includes(file.type)) {
      alert('Only PNG, JPEG, GIF, or WEBP images are allowed')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
      const avatarUrl = urlData.publicUrl

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setEditAvatar(avatarUrl)
      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null)
      alert('Profile picture updated!')
    } catch (error: any) {
      console.error('Upload error:', error)
      alert('Failed to upload image: ' + (error.message || 'unknown error'))
    } finally {
      setUploading(false)
    }
  }

  // -------- UI Helpers --------
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
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

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-maroon-600 dark:text-maroon-400">Profile not found</h2>
          <Link href="/dashboard" className="text-gold-600 hover:text-gold-700 mt-4 inline-block">Go back to dashboard</Link>
        </div>
      </div>
    )
  }

  const displayAvatar = getDisplayAvatar(profile.avatar_url, profile.username)

  // Helper to render avatar image (supports both emoji and URL)
  const renderAvatarImage = (src: string | undefined, alt: string, className: string) => {
    if (!src) return <span className={className}>👤</span>
    if (src.startsWith('http')) {
      return <img src={src} alt={alt} className={`${className} object-cover`} />
    }
    return <span className={className}>{src}</span>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="glass sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">⏱️</span>
            <span className="text-xl font-bold text-maroon-800 dark:text-maroon-300">Tracker</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/friends" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-maroon-600 dark:hover:text-maroon-400 transition">
              <Users className="w-5 h-5" />
              <span className="hidden sm:inline">Friends</span>
            </Link>
            <Link href="/dashboard" className="bg-maroon-600 hover:bg-maroon-700 text-white text-sm py-1.5 px-4 rounded-lg transition-all duration-200 hover:scale-105">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <div className="glass rounded-2xl p-6 md:p-8 shadow-xl card-hover">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${profile.avatar_bg || 'from-yellow-400 to-yellow-600'} flex items-center justify-center shadow-lg overflow-hidden`}>
                {renderAvatarImage(
                  profile.avatar_url,
                  profile.username,
                  'w-28 h-28 rounded-full text-5xl flex items-center justify-center font-bold text-white'
                )}
              </div>
              {isOwnProfile && (
                <button
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="absolute -bottom-2 -right-2 bg-maroon-600 text-white p-2 rounded-full shadow-lg hover:bg-maroon-700 transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 text-xl font-bold"
                      placeholder="Username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400"
                      rows={3}
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile Picture</label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center overflow-hidden">
                        {editAvatar?.startsWith('http') ? (
                          <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl">{editAvatar || '🌟'}</span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) uploadAvatar(file)
                        }}
                        className="text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-maroon-50 dark:file:bg-maroon-900 file:text-maroon-700 dark:file:text-maroon-300 hover:file:bg-maroon-100 dark:hover:file:bg-maroon-800"
                        disabled={uploading}
                      />
                      {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Upload JPG, PNG, GIF, WEBP (max 2MB)</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={updateProfile} className="bg-maroon-600 hover:bg-maroon-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2">
                      <Save className="w-4 h-4" /> Save
                    </button>
                    <button onClick={() => { setEditing(false); setShowAvatarPicker(false) }} className="border-2 border-maroon-600 text-maroon-600 hover:bg-maroon-600 hover:text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2">
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-maroon-800 dark:text-maroon-300">{profile.username}</h1>
                  {profile.bio && <p className="text-gray-600 dark:text-gray-400 mt-2">{profile.bio}</p>}
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <span className="bg-maroon-100 dark:bg-maroon-900 text-maroon-800 dark:text-maroon-200 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <Users className="w-4 h-4" /> {friendCount} {friendCount === 1 ? 'Friend' : 'Friends'}
                    </span>
                    {isOwnProfile && (
                      <span className="bg-gold-100 dark:bg-gold-900 text-gold-800 dark:text-gold-200 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                        <Shield className="w-4 h-4" /> Owner
                      </span>
                    )}
                    {!isOwnProfile && isFriend && (
                      <span className="bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                        <Heart className="w-4 h-4 fill-current" /> Friends
                      </span>
                    )}
                    {!isOwnProfile && !isFriend && (
                      <span className="bg-maroon-100 dark:bg-maroon-900 text-maroon-800 dark:text-maroon-200 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                        <Users className="w-4 h-4" /> Not friends yet
                      </span>
                    )}
                    {isOwnProfile && (
                      <button
                        onClick={() => setEditing(true)}
                        className="bg-gold-500 hover:bg-gold-600 text-maroon-900 font-semibold text-sm py-1.5 px-4 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" /> Edit Profile
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Avatar picker for emoji avatars (keep existing) */}
          {showAvatarPicker && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-800 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Choose Emoji Avatar</h3>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-3">
                {AVATAR_PRESETS.map((avatar) => (
                  <button
                    key={avatar.emoji + avatar.name}
                    onClick={() => {
                      setEditAvatar(avatar.emoji)
                      setEditAvatarBg(avatar.bg)
                      setShowAvatarPicker(false)
                    }}
                    className={`w-14 h-14 rounded-full bg-gradient-to-br ${avatar.bg} flex items-center justify-center text-2xl transition-all transform hover:scale-110 ${
                      editAvatar === avatar.emoji ? 'ring-4 ring-maroon-500 shadow-lg' : ''
                    }`}
                  >
                    {avatar.emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats and Sessions (unchanged) */}
        {(isOwnProfile || isFriend) && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="glass rounded-xl p-4 card-hover">
                <div className="flex items-center gap-3">
                  <div className="bg-maroon-100 dark:bg-maroon-900 p-3 rounded-full">
                    <Clock className="w-6 h-6 text-maroon-600 dark:text-maroon-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Time</p>
                    <p className="text-xl font-bold text-maroon-600 dark:text-maroon-400">{formatTime(totalTime)}</p>
                  </div>
                </div>
              </div>
              <div className="glass rounded-xl p-4 card-hover">
                <div className="flex items-center gap-3">
                  <div className="bg-gold-100 dark:bg-gold-900 p-3 rounded-full">
                    <Calendar className="w-6 h-6 text-gold-600 dark:text-gold-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sessions</p>
                    <p className="text-xl font-bold text-gold-600 dark:text-gold-400">{sessions.length}</p>
                  </div>
                </div>
              </div>
              <div className="glass rounded-xl p-4 card-hover">
                <div className="flex items-center gap-3">
                  <div className="bg-pink-100 dark:bg-pink-900 p-3 rounded-full">
                    <Heart className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Categories</p>
                    <p className="text-xl font-bold text-pink-600 dark:text-pink-400">{new Set(sessions.map(s => s.category_id)).size}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 mt-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-maroon-800 dark:text-maroon-300">Recent Sessions</h2>
                {!isOwnProfile && (
                  <span className="bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Only visible to friends
                  </span>
                )}
              </div>
              {sessions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🕐</div>
                  <p className="text-gray-500 dark:text-gray-400">No completed sessions yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                    {!isOwnProfile && isFriend ? 'No public sessions available from this friend' : 'Start tracking your time to see your progress!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{session.name}</span>
                          <span className="bg-maroon-100 dark:bg-maroon-900 text-maroon-800 dark:text-maroon-200 px-2 py-0.5 rounded-full text-xs font-medium">
                            {session.categories?.name || 'Uncategorized'}
                          </span>
                          {session.categories?.is_private && <Lock className="w-3 h-3 text-gray-400" />}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(session.created_at), 'MMM d, yyyy')}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(session.created_at), 'h:mm a')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <span className="text-lg font-bold text-maroon-600 dark:text-maroon-400">
                          {session.duration_seconds ? `${Math.floor(session.duration_seconds / 60)}m ${session.duration_seconds % 60}s` : '0m 0s'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}