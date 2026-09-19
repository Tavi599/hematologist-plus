import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(url && publishableKey)

/**
 * Read-only client (publishable key, RLS allows SELECT only).
 * Null when VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are missing.
 *
 * The session is kept so a signed-in physician is not asked again on every visit; it unlocks the
 * article text and nothing else. No patient data ever reaches this client.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, publishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null
