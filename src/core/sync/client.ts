import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_CHIAVE_PUBBLICA, SUPABASE_URL } from './config'

let client: SupabaseClient | undefined

/** Il collegamento a Supabase, creato alla prima richiesta. La sessione resta sul telefono. */
export function supabase(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_CHIAVE_PUBBLICA, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  })
  return client
}
