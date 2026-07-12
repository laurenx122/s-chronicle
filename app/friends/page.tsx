'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Search, UserPlus, Users, Check, X, ArrowLeft, Heart, Clock, UserCheck } from 'lucide-react'

interface Friend {
  id: string
  username: string
  bio: string
  avatar_url: string
  avatar_bg?: string
  status: string
}

interface AllUser {
  id: string
  username: string
  bio: string
  avatar_url: string
  avatar_bg?: string
  relationship?: 'friend' | 'pending_sent' | 'pending_received' | 'none' | 'self'
}

export default function FriendsPage() {
  const { user } = useAuth()
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([])
  const [sentRequests, setSentRequests] = useState<Friend[]>([])
  const [allUsers, setAllUsers] = useState<AllUser[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<AllUser[]>([])
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sent' | 'all'>('friends')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      loadAllData()
    }
  }, [user])

  // Helper to fetch user profiles by IDs
  const fetchProfiles = async (ids: string[]) => {
    if (!ids.length) return []
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, bio, avatar_url, avatar_bg')
      .in('id', ids)
    if (error) {
      console.error('Error fetching profiles:', error)
      return []
    }
    return data || []
  }

  const loadAllData = async () => {
    if (!user) return
    setLoading(true)
    try {
      // Load all friend relationships
      const { data: allRelations, error: relError } = await supabase
        .from('friends')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

      if (relError) {
        console.error('Error loading relationships:', relError)
        setLoading(false)
        return
      }

      // Separate relationships
      const friendIds: string[] = []
      const pendingReceivedIds: string[] = []
      const pendingSentIds: string[] = []

      allRelations?.forEach(rel => {
        if (rel.status === 'accepted') {
          if (rel.user_id === user.id) friendIds.push(rel.friend_id)
          else if (rel.friend_id === user.id) friendIds.push(rel.user_id)
        } else if (rel.status === 'pending') {
          if (rel.user_id === user.id) pendingSentIds.push(rel.friend_id)
          else if (rel.friend_id === user.id) pendingReceivedIds.push(rel.user_id)
        }
      })

      // Fetch profiles for each group
      const [friendProfiles, pendingReceivedProfiles, pendingSentProfiles] = await Promise.all([
        fetchProfiles(friendIds),
        fetchProfiles(pendingReceivedIds),
        fetchProfiles(pendingSentIds)
      ])

      // Set states
      setFriends(friendProfiles.map(p => ({ ...p, status: 'accepted' })))
      setPendingRequests(pendingReceivedProfiles.map(p => ({ ...p, status: 'pending' })))
      setSentRequests(pendingSentProfiles.map(p => ({ ...p, status: 'pending' })))

      // Load all users with relationship status
      await loadAllUsers(friendIds, pendingReceivedIds, pendingSentIds)

    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }

  const loadAllUsers = async (
    friendIds: string[] = [],
    pendingReceivedIds: string[] = [],
    pendingSentIds: string[] = []
  ) => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)

      if (error) {
        console.error('Error loading users:', error)
        return
      }

      const friendSet = new Set(friendIds)
      const pendingReceivedSet = new Set(pendingReceivedIds)
      const pendingSentSet = new Set(pendingSentIds)

      const usersWithRelationship: AllUser[] = data.map((u: any) => {
        let relationship: 'friend' | 'pending_sent' | 'pending_received' | 'none' | 'self' = 'none'
        if (friendSet.has(u.id)) relationship = 'friend'
        else if (pendingSentSet.has(u.id)) relationship = 'pending_sent'
        else if (pendingReceivedSet.has(u.id)) relationship = 'pending_received'

        return {
          id: u.id,
          username: u.username || '',
          bio: u.bio || '',
          avatar_url: u.avatar_url || '🌟',
          avatar_bg: u.avatar_bg || 'from-yellow-400 to-yellow-600',
          relationship
        }
      })

      setAllUsers(usersWithRelationship)
    } catch (error) {
      console.error('Error loading all users:', error)
    }
  }

  // Render avatar helper
  const renderAvatar = (user: { avatar_url?: string, avatar_bg?: string, username?: string }, size: string = 'w-10 h-10', textSize: string = 'text-xl') => {
    const bg = user.avatar_bg || 'from-yellow-400 to-yellow-600'
    let displayChar = user.avatar_url || '👤'
    if (displayChar.startsWith('http')) {
      displayChar = user.username?.charAt(0)?.toUpperCase() || '👤'
    }
    return (
      <div className={`${size} rounded-full bg-gradient-to-br ${bg} flex items-center justify-center ${textSize} font-bold text-white`}>
        {displayChar}
      </div>
    )
  }

  // Search users
  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${searchTerm}%`)
        .neq('id', user?.id)

      if (error) {
        console.error('Search error:', error)
        setSearching(false)
        return
      }

      // Get relationships for these users
      const { data: relData } = await supabase
        .from('friends')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${user?.id},friend_id.eq.${user?.id}`)

      const friendSet = new Set()
      const pendingReceivedSet = new Set()
      const pendingSentSet = new Set()

      relData?.forEach(rel => {
        if (rel.status === 'accepted') {
          if (rel.user_id === user?.id) friendSet.add(rel.friend_id)
          else if (rel.friend_id === user?.id) friendSet.add(rel.user_id)
        } else if (rel.status === 'pending') {
          if (rel.user_id === user?.id) pendingSentSet.add(rel.friend_id)
          else if (rel.friend_id === user?.id) pendingReceivedSet.add(rel.user_id)
        }
      })

      const results: AllUser[] = data.map((u: any) => {
        let relationship: 'friend' | 'pending_sent' | 'pending_received' | 'none' | 'self' = 'none'
        if (friendSet.has(u.id)) relationship = 'friend'
        else if (pendingSentSet.has(u.id)) relationship = 'pending_sent'
        else if (pendingReceivedSet.has(u.id)) relationship = 'pending_received'
        return {
          id: u.id,
          username: u.username || '',
          bio: u.bio || '',
          avatar_url: u.avatar_url || '🌟',
          avatar_bg: u.avatar_bg || 'from-yellow-400 to-yellow-600',
          relationship
        }
      })
      setSearchResults(results)
    } catch (error) {
      console.error('Search error:', error)
    }
    setSearching(false)
  }

  const handleSearch = () => searchUsers()

  // Friend actions
  const sendFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .insert([{ user_id: user?.id, friend_id: friendId, status: 'pending' }])
      if (error) {
        alert('Failed to send request: ' + error.message)
        return
      }
      await loadAllData()
    } catch (error) {
      console.error('Error sending request:', error)
      alert('Failed to send request')
    }
  }

  const acceptFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('user_id', friendId)
        .eq('friend_id', user?.id)
      if (!error) await loadAllData()
    } catch (error) {
      console.error('Error accepting request:', error)
    }
  }

  const rejectFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', user?.id)
      if (!error) await loadAllData()
    } catch (error) {
      console.error('Error rejecting request:', error)
    }
  }

  const cancelFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', user?.id)
        .eq('friend_id', friendId)
        .eq('status', 'pending')
      if (!error) await loadAllData()
    } catch (error) {
      console.error('Error canceling request:', error)
    }
  }

  // UI helpers
  const getRelationshipBadge = (relationship: string) => {
    switch (relationship) {
      case 'friend': return <span className="bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"><Heart className="w-3 h-3 fill-current" /> Friends</span>
      case 'pending_sent': return <span className="bg-gold-100 dark:bg-gold-900 text-gold-800 dark:text-gold-200 px-3 py-1 rounded-full text-xs font-medium">⏳ Pending</span>
      case 'pending_received': return <span className="bg-maroon-100 dark:bg-maroon-900 text-maroon-800 dark:text-maroon-200 px-3 py-1 rounded-full text-xs font-medium">📩 Request</span>
      default: return null
    }
  }

  const getActionButton = (user: AllUser) => {
    switch (user.relationship) {
      case 'friend': return null
      case 'pending_sent': return <button onClick={() => cancelFriendRequest(user.id)} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"><X className="w-4 h-4" /> Cancel</button>
      case 'pending_received': return (
        <div className="flex gap-1">
          <button onClick={() => acceptFriendRequest(user.id)} className="bg-green-500 text-white p-1.5 rounded-lg hover:bg-green-600 transition"><Check className="w-4 h-4" /></button>
          <button onClick={() => rejectFriendRequest(user.id)} className="bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 transition"><X className="w-4 h-4" /></button>
        </div>
      )
      case 'none': return <button onClick={() => sendFriendRequest(user.id)} className="bg-gold-500 hover:bg-gold-600 text-maroon-900 font-semibold text-sm py-1 px-3 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-1"><UserPlus className="w-4 h-4" /> Add</button>
      default: return null
    }
  }

  // Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="glass sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xl font-bold text-maroon-800 dark:text-maroon-300">Back</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/dashboard" className="bg-maroon-600 hover:bg-maroon-700 text-white text-sm py-1.5 px-4 rounded-lg transition-all duration-200 hover:scale-105">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-maroon-800 dark:text-maroon-300 mb-2">Friends</h1>
          <p className="text-gray-600 dark:text-gray-400">Connect with friends and share your productivity journey</p>
        </div>

        {/* Search */}
        <div className="glass rounded-2xl p-6 shadow-xl mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for users by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all duration-200 pl-10"
              />
            </div>
            <button onClick={handleSearch} disabled={searching} className="bg-maroon-600 hover:bg-maroon-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-2">
              {searching ? '...' : <Search className="w-4 h-4" />} Search
            </button>
            <button onClick={() => { setSearchTerm(''); setSearchResults([]); }} className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition">Clear</button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Search Results</h3>
              {searchResults.map((result) => (
                <div key={result.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {renderAvatar(result)}
                    <div><div className="font-medium text-gray-800 dark:text-gray-200">{result.username}</div>{result.bio && <div className="text-xs text-gray-500 dark:text-gray-400">{result.bio}</div>}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRelationshipBadge(result.relationship || 'none')}
                    {getActionButton(result)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          <button onClick={() => setActiveTab('friends')} className={`flex items-center gap-2 px-4 py-2 border-b-2 transition whitespace-nowrap ${activeTab === 'friends' ? 'border-maroon-600 text-maroon-600 dark:text-maroon-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Heart className="w-4 h-4" /> Friends ({friends.length})
          </button>
          <button onClick={() => setActiveTab('requests')} className={`flex items-center gap-2 px-4 py-2 border-b-2 transition whitespace-nowrap ${activeTab === 'requests' ? 'border-maroon-600 text-maroon-600 dark:text-maroon-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <UserCheck className="w-4 h-4" /> Requests ({pendingRequests.length})
          </button>
          <button onClick={() => setActiveTab('sent')} className={`flex items-center gap-2 px-4 py-2 border-b-2 transition whitespace-nowrap ${activeTab === 'sent' ? 'border-maroon-600 text-maroon-600 dark:text-maroon-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Clock className="w-4 h-4" /> Sent ({sentRequests.length})
          </button>
          <button onClick={() => { setActiveTab('all'); loadAllData(); }} className={`flex items-center gap-2 px-4 py-2 border-b-2 transition whitespace-nowrap ${activeTab === 'all' ? 'border-maroon-600 text-maroon-600 dark:text-maroon-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Users className="w-4 h-4" /> All Users ({allUsers.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'friends' && (
          <div className="glass rounded-2xl p-6 shadow-xl">
            {friends.length === 0 ? (
              <div className="text-center py-12"><div className="text-6xl mb-4">👥</div><h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No friends yet</h3><p className="text-gray-500 dark:text-gray-400 mt-2">Search for users and send them a friend request!</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {friends.map((friend) => (
                  <Link key={friend.id} href={`/profile/${friend.id}`} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition card-hover">
                    {renderAvatar(friend, 'w-12 h-12', 'text-2xl')}
                    <div className="flex-1"><div className="font-semibold text-gray-800 dark:text-gray-200">{friend.username}</div>{friend.bio && <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{friend.bio}</div>}</div>
                    <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="glass rounded-2xl p-6 shadow-xl">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12"><div className="text-6xl mb-4">📭</div><h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No pending requests</h3><p className="text-gray-500 dark:text-gray-400 mt-2">You're all caught up!</p></div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      {renderAvatar(request, 'w-12 h-12', 'text-2xl')}
                      <div><div className="font-semibold text-gray-800 dark:text-gray-200">{request.username}</div>{request.bio && <div className="text-sm text-gray-500 dark:text-gray-400">{request.bio}</div>}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptFriendRequest(request.id)} className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition"><Check className="w-5 h-5" /></button>
                      <button onClick={() => rejectFriendRequest(request.id)} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition"><X className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="glass rounded-2xl p-6 shadow-xl">
            {sentRequests.length === 0 ? (
              <div className="text-center py-12"><div className="text-6xl mb-4">✉️</div><h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No sent requests</h3><p className="text-gray-500 dark:text-gray-400 mt-2">You haven't sent any friend requests yet</p></div>
            ) : (
              <div className="space-y-3">
                {sentRequests.map((request) => (
                  <div key={request.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      {renderAvatar(request, 'w-12 h-12', 'text-2xl')}
                      <div><div className="font-semibold text-gray-800 dark:text-gray-200">{request.username}</div><div className="text-sm text-gray-500 dark:text-gray-400">Pending...</div></div>
                    </div>
                    <button onClick={() => cancelFriendRequest(request.id)} className="text-red-500 hover:text-red-600 transition"><X className="w-5 h-5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="glass rounded-2xl p-6 shadow-xl">
            {allUsers.length === 0 ? (
              <div className="text-center py-12"><div className="text-6xl mb-4">👤</div><h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No other users found</h3><p className="text-gray-500 dark:text-gray-400 mt-2">Invite your friends to join S-Chronicle!</p></div>
            ) : (
              <div className="space-y-3">
                {allUsers.map((user) => (
                  <div key={user.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                    <Link href={`/profile/${user.id}`} className="flex items-center gap-3 flex-1">
                      {renderAvatar(user, 'w-12 h-12', 'text-2xl')}
                      <div><div className="font-semibold text-gray-800 dark:text-gray-200">{user.username}</div>{user.bio && <div className="text-sm text-gray-500 dark:text-gray-400">{user.bio}</div>}</div>
                    </Link>
                    <div className="flex items-center gap-2">
                      {getRelationshipBadge(user.relationship || 'none')}
                      {getActionButton(user)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}