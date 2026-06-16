import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Anon Supabase client for server-side reads (server components, route handlers).
 * No sessions — the app has no login. Returns a harmless empty client when
 * unconfigured so pages can render a setup notice instead of crashing.
 */
export function createSupabaseServerClient() {
  return createClient(SUPABASE_URL || "http://localhost", SUPABASE_ANON_KEY || "anon", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
