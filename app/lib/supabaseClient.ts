import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

// Create the browser client only when a feature actually needs Supabase.
// This keeps static builds from evaluating missing deployment variables.
export function getSupabaseClient() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim()

  if (!url || !key) {
    throw new Error('Supabase public configuration is missing.')
  }

  client = createClient(url, key)
  return client
}
