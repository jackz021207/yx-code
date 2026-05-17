import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/database.types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        if (session?.user) {
          loadProfile(session.user.id)
        } else {
          setProfileLoading(false)
        }
      })
      .catch((err) => {
        console.error('[useAuth] getSession failed:', err)
        if (!cancelled) {
          setLoading(false)
          setProfileLoading(false)
        }
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setProfileLoading(false)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId: string) {
    setProfileLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) console.error('[useAuth] loadProfile failed:', error)
      setProfile(data ?? null)
    } catch (err) {
      console.error('[useAuth] loadProfile exception:', err)
    } finally {
      setProfileLoading(false)
    }
  }

  const signOut = () => supabase.auth.signOut()

  return {
    user,
    session,
    profile,
    role: profile?.role ?? null,
    loading,
    profileLoading,
    signOut,
  }
}
