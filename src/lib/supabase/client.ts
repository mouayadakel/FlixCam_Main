/**
 * @file client.ts
 * @description Supabase client for client components
 * @module lib/supabase
 */

import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

let _client: SupabaseClient<Database> | null = null

function getSupabase(): SupabaseClient<Database> {
  if (_client) return _client
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY). Check your .env.local.'
    )
  }
  _client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  return _client
}

/** Lazy-initialized Supabase client for browser; use getSupabase() when env may be missing at build time. */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return (getSupabase() as unknown as Record<string, unknown>)[prop as string]
  },
})
