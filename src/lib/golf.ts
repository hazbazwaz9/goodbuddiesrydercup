/**
 * Good Buddies Ryder Cup — golf scoring logic.
 *
 * Pure functions, no I/O. Shared by server and client.
 *
 * Stroke allocation here is *advisory*: players record the winner of each hole
 * directly (europe / usa / halved). These helpers tell each player/team how many
 * strokes they receive on a given hole so they can settle the hole at the tee.
 */

export type Team = "europe" | "usa";
export type HoleWinner = Team | "halved" | null;
export type MatchFormat = "shamble" | "scramble" | "singles";

export interface CourseHole {
  holeNumber: number; // 1..18
  strokeIndex: number; // 1 = hardest, 18 = easiest
  par: number;
}

/**
 * Strokes a player receives on each hole for a given (full) handicap, using the
 * course stroke index. Handles handicaps over 18: every hole gets `floor(h/18)`
 * strokes, and the `h % 18` hardest holes get one extra.
 *
 * Returns an array aligned to the supplied `holes` order, one entry per hole.
 */
export function strokesForHandicap(handicap: number, holes: CourseHole[]): number[] {
  const h = Math.max(0, Math.round(handicap));
  const base = Math.floor(h / 18);
  const remainder = h % 18;
  return holes.map((hole) => base + (hole.strokeIndex <= remainder ? 1 : 0));
}

/**
 * Shamble (2v2): each player plays their own ball at 50% of their handicap.
 * Returns each player's strokes-per-hole array, in the same order as `players`.
 */
export function shambleStrokes(
  players: { handicap: number }[],
  holes: CourseHole[],
): number[][] {
  return players.map((p) => strokesForHandicap(Math.round(p.handicap * 0.5), holes));
}

export interface TeamAllocation {
  europeTeamHandicap: number;
  usaTeamHandicap: number;
  /** Which team receives strokes (the higher-handicap team), or null if level. */
  receiver: Team | null;
  /** Strokes-per-hole the higher team receives; the lower team gets all zeros. */
  europeStrokes: number[];
  usaStrokes: number[];
}

function allocateDifference(
  europeHandicap: number,
  usaHandicap: number,
  holes: CourseHole[],
): TeamAllocation {
  const diff = europeHandicap - usaHandicap;
  const zeros = holes.map(() => 0);
  if (diff === 0) {
    return {
      europeTeamHandicap: europeHandicap,
      usaTeamHandicap: usaHandicap,
      receiver: null,
      europeStrokes: zeros,
      usaStrokes: [...zeros],
    };
  }
  const receiver: Team = diff > 0 ? "europe" : "usa";
  const received = strokesForHandicap(Math.abs(diff), holes);
  return {
    europeTeamHandicap: europeHandicap,
    usaTeamHandicap: usaHandicap,
    receiver,
    europeStrokes: receiver === "europe" ? received : zeros,
    usaStrokes: receiver === "usa" ? received : [...zeros],
  };
}

/**
 * Scramble (2v2): team handicap = round((p1 + p2) * 0.25). The higher-handicap
 * team receives the difference in strokes, allocated by stroke index.
 */
export function scrambleAllocation(
  europeHandicaps: number[],
  usaHandicaps: number[],
  holes: CourseHole[],
): TeamAllocation {
  const europeTeam = Math.round(europeHandicaps.reduce((a, b) => a + b, 0) * 0.25);
  const usaTeam = Math.round(usaHandicaps.reduce((a, b) => a + b, 0) * 0.25);
  return allocateDifference(europeTeam, usaTeam, holes);
}

/**
 * Advisory strokes each team receives per hole, by format — for the scorecard.
 * Shamble: count of teammates getting a stroke that hole (0..2), at 50% handicap.
 * Scramble / Singles: the receiving team's allocated strokes (0/1 per hole).
 */
export function teamStrokesPerHole(
  format: MatchFormat,
  europeHandicaps: number[],
  usaHandicaps: number[],
  holes: CourseHole[],
): { europe: number[]; usa: number[] } {
  if (format === "shamble") {
    const eu = europeHandicaps.map((h) => strokesForHandicap(Math.round(h * 0.5), holes));
    const usa = usaHandicaps.map((h) => strokesForHandicap(Math.round(h * 0.5), holes));
    return {
      europe: holes.map((_, i) => eu.reduce((s, a) => s + (a[i] > 0 ? 1 : 0), 0)),
      usa: holes.map((_, i) => usa.reduce((s, a) => s + (a[i] > 0 ? 1 : 0), 0)),
    };
  }
  const alloc =
    format === "scramble"
      ? scrambleAllocation(europeHandicaps, usaHandicaps, holes)
      : singlesAllocation(europeHandicaps[0] ?? 0, usaHandicaps[0] ?? 0, holes);
  return { europe: alloc.europeStrokes, usa: alloc.usaStrokes };
}

/**
 * Singles (1v1), full handicap: lower handicap plays scratch, higher receives the
 * difference in strokes, allocated by stroke index.
 */
export function singlesAllocation(
  europeHandicap: number,
  usaHandicap: number,
  holes: CourseHole[],
): TeamAllocation {
  return allocateDifference(europeHandicap, usaHandicap, holes);
}

/**
 * Human golf name for a gross score on a hole of the given par.
 * A score of 1 is always "Hole in One"; otherwise the name comes from the
 * score relative to par (Eagle, Birdie, Par, Bogey, …).
 */
export function golfScoreName(score: number, par: number): string {
  if (score === 1) return "Hole in One";
  const diff = score - par;
  switch (diff) {
    case -3:
      return "Albatross";
    case -2:
      return "Eagle";
    case -1:
      return "Birdie";
    case 0:
      return "Par";
    case 1:
      return "Bogey";
    case 2:
      return "Double Bogey";
    case 3:
      return "Triple Bogey";
    case 4:
      return "Quadruple Bogey";
    default:
      return diff < 0 ? `${diff} under` : `+${diff}`;
  }
}

/** Returns a fun emoji for a score relative to par, or empty string for par/bogey/worse. */
export function scoreEmoji(score: number, par: number): string {
  if (score === 1) return "⛳";
  const diff = score - par;
  if (diff <= -3) return "🦅";
  if (diff === -2) return "🦅";
  if (diff === -1) return "🐦";
  return "";
}

/**
 * Selectable gross-score options for a hole, each labelled with its golf name.
 * Ranges from 1 (Hole in One) up to par + 3 (Triple Bogey).
 */
export function scoreOptions(par: number): { score: number; name: string }[] {
  const max = par + 3;
  const opts: { score: number; name: string }[] = [];
  for (let score = 1; score <= max; score++) {
    opts.push({ score, name: golfScoreName(score, par) });
  }
  return opts;
}

export interface MatchStatus {
  europeHolesWon: number;
  usaHolesWon: number;
  /** Positive = Europe ahead, negative = USA ahead. */
  diff: number;
  holesPlayed: number;
  holesRemaining: number;
  isComplete: boolean;
  leader: Team | null;
  /** Short live status, e.g. "Europe 2 UP", "All Square", "Europe wins 3&2". */
  statusText: string;
  /** Points earned once complete (win = 1, halve = 0.5), else 0/0. */
  points: { europe: number; usa: number };
}

/**
 * Auto-compute who wins a hole given gross scores and handicap strokes.
 * Returns null if neither side has any scores yet.
 */
export function computeHoleWinner(
  format: MatchFormat,
  euGross: (number | null)[],
  usaGross: (number | null)[],
  euHcps: number[],
  usaHcps: number[],
  hole: CourseHole,
): HoleWinner {
  const holeArr = [hole];

  if (format === "shamble") {
    const euNets = euGross.map((g, i) =>
      g != null ? g - strokesForHandicap(Math.round((euHcps[i] ?? 0) * 0.5), holeArr)[0] : Infinity,
    );
    const usaNets = usaGross.map((g, i) =>
      g != null ? g - strokesForHandicap(Math.round((usaHcps[i] ?? 0) * 0.5), holeArr)[0] : Infinity,
    );
    const bestEu = Math.min(...euNets);
    const bestUsa = Math.min(...usaNets);
    if (!isFinite(bestEu) || !isFinite(bestUsa)) return null;
    if (bestEu < bestUsa) return "europe";
    if (bestUsa < bestEu) return "usa";
    return "halved";
  }

  if (format === "scramble") {
    const alloc = scrambleAllocation(euHcps, usaHcps, holeArr);
    const euNet = (euGross[0] ?? null);
    const usaNet = (usaGross[0] ?? null);
    if (euNet == null || usaNet == null) return null;
    const euAdj = euNet - alloc.europeStrokes[0];
    const usaAdj = usaNet - alloc.usaStrokes[0];
    if (euAdj < usaAdj) return "europe";
    if (usaAdj < euAdj) return "usa";
    return "halved";
  }

  // singles
  const alloc = singlesAllocation(euHcps[0] ?? 0, usaHcps[0] ?? 0, holeArr);
  const euG = euGross[0] ?? null;
  const usaG = usaGross[0] ?? null;
  if (euG == null || usaG == null) return null;
  const euAdj = euG - alloc.europeStrokes[0];
  const usaAdj = usaG - alloc.usaStrokes[0];
  if (euAdj < usaAdj) return "europe";
  if (usaAdj < euAdj) return "usa";
  return "halved";
}

/**
 * Compute match-play status from an ordered list of hole results.
 * `results` should be the 18 holes in play order; nulls (unplayed) are ignored
 * for the win count but still consume a hole position for "remaining".
 */
export function computeMatchStatus(results: HoleWinner[]): MatchStatus {
  const totalHoles = results.length || 18;
  let europeHolesWon = 0;
  let usaHolesWon = 0;
  let holesPlayed = 0;

  for (const r of results) {
    if (r === null) continue;
    holesPlayed += 1;
    if (r === "europe") europeHolesWon += 1;
    else if (r === "usa") usaHolesWon += 1;
    // "halved" counts as played but awards no hole.
  }

  const diff = europeHolesWon - usaHolesWon;
  const holesRemaining = totalHoles - holesPlayed;
  const lead = Math.abs(diff);
  const isComplete = holesPlayed === totalHoles || lead > holesRemaining;
  const leader: Team | null = diff > 0 ? "europe" : diff < 0 ? "usa" : null;

  let statusText: string;
  let points = { europe: 0, usa: 0 };

  if (isComplete) {
    if (diff === 0) {
      statusText = "Match Halved";
      points = { europe: 0.5, usa: 0.5 };
    } else {
      const winnerName = diff > 0 ? "Europe" : "USA";
      // Closeout margin: "X&Y" where Y = holes remaining when clinched; "X UP" if it went to the last hole.
      statusText =
        holesRemaining === 0
          ? `${winnerName} wins ${lead} UP`
          : `${winnerName} wins ${lead}&${holesRemaining}`;
      points = diff > 0 ? { europe: 1, usa: 0 } : { europe: 0, usa: 1 };
    }
  } else if (holesPlayed === 0) {
    statusText = "Not started";
  } else if (diff === 0) {
    statusText = `All Square (${holesRemaining} to play)`;
  } else {
    const leaderName = diff > 0 ? "Europe" : "USA";
    statusText = `${leaderName} ${lead} UP (${holesRemaining} to play)`;
  }

  return {
    europeHolesWon,
    usaHolesWon,
    diff,
    holesPlayed,
    holesRemaining,
    isComplete,
    leader,
    statusText,
    points,
  };
}
