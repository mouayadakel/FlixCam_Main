/**
 * @file server.ts
 * @description Supabase client for server components
 * @module lib/supabase
 */

import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_MISSING_ENV =
  'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see https://supabase.com/dashboard/project/_/settings/api).'

let _serverClient: SupabaseClient<Database> | null = null

function createClient(): SupabaseClient<Database> {
  if (_serverClient) return _serverClient
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(SUPABASE_MISSING_ENV)
  }
  _serverClient = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: async () => {
        const cookieStore = await cookies()
        return cookieStore
          .getAll()
          .map((c: { name: string; value: string }) => ({ name: c.name, value: c.value }))
      },
      setAll: async () => {
        /* Server Components cannot set cookies; middleware handles auth cookie updates */
      },
    },
  })
  return _serverClient
}

/** Creates a Supabase client for server (RSC / API). Throws only when used if env vars are missing (allows build to complete). */
export function createServerSupabaseClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Proxy({} as SupabaseClient<Database>, {
      get() {
        throw new Error(SUPABASE_MISSING_ENV)
      },
    })
  }
  return createClient()
}
