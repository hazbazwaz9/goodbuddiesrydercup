"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ADMIN_COOKIE, getAdminPasscode, isAdminUnlocked } from "@/lib/admin-session";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

type AdminGuard = { admin: ReturnType<typeof createSupabaseAdminClient> } | { error: string };

/** Verify the passcode cookie and return a service-role client (bypasses RLS). */
async function requireAdmin(): Promise<AdminGuard> {
  if (!(await isAdminUnlocked())) return { error: "Admin is locked. Enter the passcode." };
  try {
    return { admin: createSupabaseAdminClient() };
  } catch {
    return { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." };
  }
}

function revalidateAll() {
  revalidatePath("/admin");
  revalidatePath("/roster");
  revalidatePath("/matches");
  revalidatePath("/leaderboard");
}

/* ----------------------------- Passcode ----------------------------- */

export async function unlockAdmin(passcode: string): Promise<ActionResult> {
  const expected = getAdminPasscode();
  if (!expected) return { ok: false, error: "No admin passcode is configured on the server." };
  if (passcode !== expected) return { ok: false, error: "Wrong passcode." };
  const store = await cookies();
  store.set(ADMIN_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/admin");
  return { ok: true };
}

export async function lockAdmin(): Promise<ActionResult> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  revalidatePath("/admin");
  return { ok: true };
}

/* ----------------------------- Players ----------------------------- */

export async function createPlayer(input: {
  name: string;
  team: "europe" | "usa" | null;
  handicap: number;
}): Promise<ActionResult> {
  const a = await requireAdmin();
  if ("error" in a) return { ok: false, error: a.error };
  const { error } = await a.admin.from("players").insert({
    name: input.name,
    team: input.team,
    handicap: input.handicap,
  });
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function updatePlayer(input: {
  id: string;
  name: string;
  team: "europe" | "usa" | null;
  handicap: number;
}): Promise<ActionResult> {
  const a = await requireAdmin();
  if ("error" in a) return { ok: false, error: a.error };
  const { error } = await a.admin
    .from("players")
    .update({ name: input.name, team: input.team, handicap: input.handicap })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function deletePlayer(id: string): Promise<ActionResult> {
  const a = await requireAdmin();
  if ("error" in a) return { ok: false, error: a.error };
  const { error } = await a.admin.from("players").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

/* ----------------------------- Sessions & matches ----------------------------- */

export async function setSessionActive(
  sessionId: number,
  isActive: boolean,
): Promise<ActionResult> {
  const a = await requireAdmin();
  if ("error" in a) return { ok: false, error: a.error };
  const { error } = await a.admin
    .from("golf_sessions")
    .update({ is_active: isActive })
    .eq("id", sessionId);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function createMatch(input: {
  sessionId: number;
  europePlayerIds: string[];
  usaPlayerIds: string[];
  matchOrder: number;
}): Promise<ActionResult> {
  const a = await requireAdmin();
  if ("error" in a) return { ok: false, error: a.error };
  if (input.europePlayerIds.length === 0 || input.usaPlayerIds.length === 0) {
    return { ok: false, error: "Pick players for both sides." };
  }
  const { error } = await a.admin.from("matches").insert({
    session_id: input.sessionId,
    europe_player_ids: input.europePlayerIds,
    usa_player_ids: input.usaPlayerIds,
    match_order: input.matchOrder,
  });
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

export async function deleteMatch(matchId: number): Promise<ActionResult> {
  const a = await requireAdmin();
  if ("error" in a) return { ok: false, error: a.error };
  const { error } = await a.admin.from("matches").delete().eq("id", matchId);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

/** Wipe all hole results across every match (scores + winners reset to zero). */
export async function resetMatchScores(): Promise<ActionResult> {
  const a = await requireAdmin();
  if ("error" in a) return { ok: false, error: a.error };
  const { error } = await a.admin.from("hole_results").delete().neq("id", 0);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}
