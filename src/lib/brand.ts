import type { Team } from "./golf";

export const TEAM_LABEL: Record<Team, string> = {
  europe: "Europe",
  usa: "USA",
};

/** Tailwind classes for solid team backgrounds (uses theme tokens in globals.css). */
export const TEAM_BG: Record<Team, string> = {
  europe: "bg-europe text-europe-foreground",
  usa: "bg-usa text-usa-foreground",
};

export const TEAM_TEXT: Record<Team, string> = {
  europe: "text-europe",
  usa: "text-usa",
};

export const TEAM_RING: Record<Team, string> = {
  europe: "ring-europe/40",
  usa: "ring-usa/40",
};

export const APP_NAME = "Good Buddies Ryder Cup";
export const APP_SHORT = "GBRC";

/** Format a points value: 0.5 → "½", 1 → "1", 1.5 → "1½". */
export function formatPoints(value: number): string {
  const whole = Math.floor(value);
  const half = value - whole >= 0.5;
  if (whole === 0 && half) return "½";
  return half ? `${whole}½` : `${whole}`;
}
