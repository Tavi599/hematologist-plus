import { useEffect, useState } from 'react'

import { supabase } from './supabase'

export interface SessionUser {
  id: string
  email: string
}

/**
 * Who is signed in, if anyone. A session unlocks the department-only article text; everything
 * else on the site works without one.
 */
export function useSessionUser(): { user: SessionUser | null; loading: boolean } {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(supabase !== null)

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(toUser(data.session?.user))
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toUser(session?.user))
      setLoading(false)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}

function toUser(user: { id: string; email?: string } | undefined): SessionUser | null {
  return user?.email === undefined ? null : { id: user.id, email: user.email }
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
}

/** Sign-in is only offered where it can work. */
export const isAuthConfigured = supabase !== null
