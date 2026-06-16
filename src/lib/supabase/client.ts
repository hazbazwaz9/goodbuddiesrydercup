"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

let browserClient: SupabaseClient | null = null;

/** Singleton browser Supabase client for realtime + score writes (anon, no login). */
export function createSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient(
      SUPABASE_URL || "http://localhost",
      SUPABASE_ANON_KEY || "anon",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return browserClient;
}
