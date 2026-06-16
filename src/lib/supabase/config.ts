/**
 * Centralised Supabase env access. Falls back to empty strings so the app can
 * still boot and render UI (e.g. the leaderboard's empty state) before keys are
 * configured. `isSupabaseConfigured` lets pages show a friendly setup notice
 * instead of crashing.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
