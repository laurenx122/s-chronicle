'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Search, UserPlus, Users, Check, X, ArrowLeft, Heart, Clock } from 'lucide-react'

interface Friend {
  id: string
  username: string
  bio: string
  avatar_url: string
  avatar_bg?: string
  status: string
}

export default function FriendsPage() {
  const { user } = useAuth()
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([])
  const [sentRequests, setSentRequests] = useState<Friend[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Friend[]>([])
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sent'>('friends')

  useEffect(() => {
    if (user) {
      loadFriends()
      loadPendingRequests()
      loadSentRequests()
    }
  }, [user])

  const loadFriends = async () => {
    try {
      // Get friends where user is user_id
      const { data: friends1, error: e1 } = await supabase
        .from('friends')
        .select(`
          friend_id,
          status,
          profiles:friend_id (
            id,
            username,
            bio,
            avatar_url,
            avatar_bg
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'accepted')

      // Get friends where user is friend_id
      const { data: friends2, error: e2 } = await supabase
        .from('friends')
        .select(`
          user_id,
          status,
          profiles:user_id (
            id,
            username,
            bio,
            avatar_url,
            avatar_bg
          )
        `)
        .eq('friend_id', user?.id)
        .eq('status', 'accepted')

      const allFriends: Friend[] = []
      
      if (friends1 && !e1) {
        // Fix: Properly type the map function
        friends1.forEach((f: any) => {
          if (f.profiles) {
            allFriends.push({
              id: f.profiles.id,
              username: f.profiles.username || '',
              bio: f.profiles.bio || '',
              avatar_url: f.profiles.avatar_url || '🌟',
              avatar_bg: f.profiles.avatar_bg || 'from-yellow-400 to-yellow-600',
              status: f.status || 'accepted'
            })
          }
        })
      }
      
      if (friends2 && !e2) {
        friends2.forEach((f: any) => {
          if (f.profiles) {
            allFriends.push({
              id: f.profiles.id,
              username: f.profiles.username || '',
              bio: f.profiles.bio || '',
              avatar_url: f.profiles.avatar_url || '🌟',
              avatar_bg: f.profiles.avatar_bg || 'from-yellow-400 to-yellow-600',
              status: f.status || 'accepted'
            })
          }
        })
      }
      
      setFriends(allFriends)
    } catch (error) {
      console.error('Error loading friends:', error)
    }
  }

  const loadPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          user_id,
          status,
          profiles:user_id (
            id,
            username,
            bio,
            avatar_url,
            avatar_bg
          )
        `)
        .eq('friend_id', user?.id)
        .eq('status', 'pending')

      if (data && !error) {
        const formatted: Friend[] = []
        data.forEach((f: any) => {
          if (f.profiles) {
            formatted.push({
              id: f.profiles.id,
              username: f.profiles.username || '',
              bio: f.profiles.bio || '',
              avatar_url: f.profiles.avatar_url || '🌟',
              avatar_bg: f.profiles.avatar_bg || 'from-yellow-400 to-yellow-600',
              status: f.status || 'pending'
            })
          }
        })
        setPendingRequests(formatted)
      }
    } catch (error) {
      console.error('Error loading pending requests:', error)
    }
  }

  const loadSentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          friend_id,
          status,
          profiles:friend_id (
            id,
            username,
            bio,
            avatar_url,
            avatar_bg
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'pending')

      if (data && !error) {
        const formatted: Friend[] = []
        data.forEach((f: any) => {
          if (f.profiles) {
            formatted.push({
              id: f.profiles.id,
              username: f.profiles.username || '',
              bio: f.profiles.bio || '',
              avatar_url: f.profiles.avatar_url || '🌟',
              avatar_bg: f.profiles.avatar_bg || 'from-yellow-400 to-yellow-600',
              status: f.status || 'pending'
            })
          }
        })
        setSentRequests(formatted)
      }
    } catch (error) {
      console.error('Error loading sent requests:', error)
    }
  }

  const searchUsers = async () => {
    if (!searchTerm.trim()) return

    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${searchTerm}%`)
        .neq('id', user?.id)
        .limit(10)

      if (data && !error) {
        const friendIds = new Set([
          ...friends.map(f => f.id),
          ...pendingRequests.map(f => f.id),
          ...sentRequests.map(f => f.id)
        ])
        
        const results: Friend[] = data.map((p: any) => ({
          ...p,
          status: friendIds.has(p.id) ? 'already' : 'none'
        }))
        setSearchResults(results)
      }
    } catch (error) {
      console.error('Error searching users:', error)
    }
    setSearching(false)
  }

  const sendFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .insert([{
          user_id: user?.id,
          friend_id: friendId,
          status: 'pending'
        }])

      if (!error) {
        alert('Friend request sent! 🎉')
        setSearchResults([])
        setSearchTerm('')
        loadSentRequests()
      }
    } catch (error) {
      console.error('Error sending friend request:', error)
    }
  }

  const acceptFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('user_id', friendId)
        .eq('friend_id', user?.id)

      if (!error) {
        loadFriends()
        loadPendingRequests()
      }
    } catch (error) {
      console.error('Error accepting friend request:', error)
    }
  }

  const rejectFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', user?.id)

      if (!error) {
        loadPendingRequests()
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error)
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

      if (!error) {
        loadSentRequests()
      }
    } catch (error) {
      console.error('Error canceling friend request:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="glass sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xl font-bold gradient-text">Back</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link 
              href="/dashboard" 
              className="btn-primary text-sm py-1.5 px-4"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Friends</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect with friends and share your productivity journey
          </p>
        </div>

        {/* Search */}
        <div className="glass rounded-2xl p-6 shadow-xl mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for friends by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500 dark:focus:ring-maroon-400 transition-all duration-200 pl-10"
              />
            </div>
            <button
              onClick={searchUsers}
              disabled={searching}
              className="btn-primary flex items-center gap-2"
            >
              {searching ? '...' : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Search Results</h3>
              {searchResults.map((result) => (
                <div key={result.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${result.avatar_bg || 'from-yellow-400 to-yellow-600'} flex items-center justify-center text-xl`}>
                      {result.avatar_url || '👤'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">{result.username}</div>
                      {result.bio && <div className="text-xs text-gray-500 dark:text-gray-400">{result.bio}</div>}
                    </div>
                  </div>
                  {result.status === 'already' ? (
                    <span className="badge-maroon text-xs">Already friends</span>
                  ) : (
                    <button
                      onClick={() => sendFriendRequest(result.id)}
                      className="btn-gold text-sm py-1 px-3 flex items-center gap-1"
                    >
                      <UserPlus className="w-4 h-4" /> Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition ${
              activeTab === 'friends'
                ? 'border-maroon-600 text-maroon-600 dark:text-maroon-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition ${
              activeTab === 'requests'
                ? 'border-maroon-600 text-maroon-600 dark:text-maroon-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Heart className="w-4 h-4" />
            Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition ${
              activeTab === 'sent'
                ? 'border-maroon-600 text-maroon-600 dark:text-maroon-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Sent ({sentRequests.length})
          </button>
        </div>

        {/* Friends List */}
        {activeTab === 'friends' && (
          <div className="glass rounded-2xl p-6 shadow-xl">
            {friends.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No friends yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Search for friends to connect with!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {friends.map((friend) => (
                  <Link
                    key={friend.id}
                    href={`/profile/${friend.id}`}
                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition card-hover"
                  >
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${friend.avatar_bg || 'from-yellow-400 to-yellow-600'} flex items-center justify-center text-2xl`}>
                      {friend.avatar_url || '👤'}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{friend.username}</div>
                      {friend.bio && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{friend.bio}</div>
                      )}
                    </div>
                    <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Requests */}
        {activeTab === 'requests' && (
          <div className="glass rounded-2xl p-6 shadow-xl">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No pending requests</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${request.avatar_bg || 'from-yellow-400 to-yellow-600'} flex items-center justify-center text-2xl`}>
                        {request.avatar_url || '👤'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{request.username}</div>
                        {request.bio && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">{request.bio}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptFriendRequest(request.id)}
                        className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(request.id)}
                        className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sent Requests */}
        {activeTab === 'sent' && (
          <div className="glass rounded-2xl p-6 shadow-xl">
            {sentRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✉️</div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No sent requests</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  You haven't sent any friend requests yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentRequests.map((request) => (
                  <div key={request.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${request.avatar_bg || 'from-yellow-400 to-yellow-600'} flex items-center justify-center text-2xl`}>
                        {request.avatar_url || '👤'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{request.username}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Pending...</div>
                      </div>
                    </div>
                    <button
                      onClick={() => cancelFriendRequest(request.id)}
                      className="text-red-500 hover:text-red-600 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
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