import { createSupabaseTableFetcher, type TableFetcher } from './catalog'
import { supabase } from './supabase'

/** Where the site reads the catalog from; null when Supabase is not configured. */
export const catalogFetcher: TableFetcher | null = supabase
  ? createSupabaseTableFetcher(supabase)
  : null
