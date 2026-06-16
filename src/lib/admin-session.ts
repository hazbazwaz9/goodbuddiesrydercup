import "server-only";
import { cookies } from "next/headers";

/**
 * Lightweight admin gate (no accounts). A single shared passcode unlocks the
 * admin panel; once entered it's stored in an httpOnly cookie. This is a
 * convenience lock for a trusted group, not a hardened security boundary —
 * the real protection is that admin writes go through the service role only.
 */
export const ADMIN_COOKIE = "gbrc_admin";

export function getAdminPasscode(): string {
  return process.env.ADMIN_PASSCODE ?? "";
}

export async function isAdminUnlocked(): Promise<boolean> {
  const pass = getAdminPasscode();
  if (!pass) return false;
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === pass;
}
