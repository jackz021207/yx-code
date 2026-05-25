import { useEffect, useRef, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/database.types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const loadedUserIdRef = useRef<string | null>(null)

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
          loadedUserIdRef.current = session.user.id
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
      const nextUserId = session?.user?.id ?? null
      // 只在用户真的变化（登录/登出/切换账号）时重载 profile
      // 否则 TOKEN_REFRESHED / 标签页切换会触发 setProfileLoading(true)，
      // 导致 ProtectedRoute 卸载当前页面、丢失 modal 等本地 state
      if (nextUserId === loadedUserIdRef.current) return
      loadedUserIdRef.current = nextUserId
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
