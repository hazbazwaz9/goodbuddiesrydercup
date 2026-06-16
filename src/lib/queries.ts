import { createSupabaseServerClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import {
  computeMatchStatus,
  teamStrokesPerHole,
  bestBallStrokes,
  singlesAllocation,
  scrambleAllocation,
  strokesForHandicap,
  type CourseHole,
  type HoleWinner,
  type MatchFormat,
} from "./golf";
import type {
  ContestResult,
  HoleScore,
  MatchView,
  PlayerLite,
  SessionView,
  TournamentView,
} from "./types";

/** 16 matches @ 1 pt each. */
const MATCH_POINTS = 16;
/** Each session has 2 side contests (Long Drive, Closest to Pin) worth 0.5 each. */
const CONTEST_POINTS_PER_SESSION = 1;

const EMPTY_CONTESTS = {
  longDrive: { winnerPlayerId: null, winnerName: null, winnerTeam: null } as ContestResult,
  closestPin: { winnerPlayerId: null, winnerName: null, winnerTeam: null } as ContestResult,
};

const EMPTY_TOURNAMENT: TournamentView = {
  sessions: [],
  players: [],
  europeTotal: 0,
  usaTotal: 0,
  europeProjected: 0,
  usaProjected: 0,
  pointsToWin: MATCH_POINTS / 2 + 0.5,
  totalPoints: MATCH_POINTS,
  winner: null,
  configured: false,
};

function buildHoleWinners(
  rows: { hole_number: number; winner: HoleWinner }[],
): HoleWinner[] {
  const arr: HoleWinner[] = Array(18).fill(null);
  for (const r of rows) {
    if (r.hole_number >= 1 && r.hole_number <= 18) arr[r.hole_number - 1] = r.winner;
  }
  return arr;
}

/** Full tournament view for the leaderboard and matches list. */
export async function getTournament(): Promise<TournamentView> {
  if (!isSupabaseConfigured) return EMPTY_TOURNAMENT;

  const supabase = await createSupabaseServerClient();

  const [playersRes, sessionsRes, matchesRes, holesRes, contestsRes] = await Promise.all([
    supabase.from("players").select("id, name, handicap, team"),
    supabase.from("golf_sessions").select("*").order("session_number"),
    supabase.from("matches").select("*").order("match_order"),
    supabase.from("hole_results").select("match_id, hole_number, winner"),
    supabase.from("session_contests").select("session_id, contest_type, winner_player_id"),
  ]);

  if (playersRes.error || sessionsRes.error || matchesRes.error || holesRes.error) {
    return EMPTY_TOURNAMENT;
  }
  // session_contests may not exist yet on older DBs — treat as no contests.
  const contestRows = contestsRes.error ? [] : contestsRes.data ?? [];

  const playerMap = new Map<string, PlayerLite>(
    (playersRes.data ?? []).map((p) => [
      p.id,
      { id: p.id, name: p.name, handicap: p.handicap, team: p.team },
    ]),
  );

  const holesByMatch = new Map<number, { hole_number: number; winner: HoleWinner }[]>();
  for (const h of holesRes.data ?? []) {
    const list = holesByMatch.get(h.match_id) ?? [];
    list.push(h);
    holesByMatch.set(h.match_id, list);
  }

  // Index contest winners by session + type.
  const contestBySession = new Map<number, Map<string, string | null>>();
  for (const c of contestRows) {
    const byType = contestBySession.get(c.session_id) ?? new Map<string, string | null>();
    byType.set(c.contest_type, c.winner_player_id);
    contestBySession.set(c.session_id, byType);
  }

  const resolveContest = (sessionId: number, type: string): ContestResult => {
    const playerId = contestBySession.get(sessionId)?.get(type) ?? null;
    const player = playerId ? playerMap.get(playerId) : undefined;
    return {
      winnerPlayerId: playerId,
      winnerName: player?.name ?? null,
      winnerTeam: player?.team ?? null,
    };
  };

  const sessions: SessionView[] = (sessionsRes.data ?? []).map((s) => ({
    id: s.id,
    sessionNumber: s.session_number,
    name: s.name,
    format: s.format as MatchFormat,
    isActive: s.is_active,
    matches: [],
    contests: {
      longDrive: resolveContest(s.id, "long_drive"),
      closestPin: resolveContest(s.id, "closest_pin"),
    },
  }));
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  let europeTotal = 0;
  let usaTotal = 0;
  let europeProjected = 0;
  let usaProjected = 0;

  // Side contests: each decided contest awards 0.5 to the winner's team (locked).
  for (const s of sessions) {
    for (const contest of [s.contests.longDrive, s.contests.closestPin]) {
      if (contest.winnerTeam === "europe") europeTotal += 0.5;
      else if (contest.winnerTeam === "usa") usaTotal += 0.5;
    }
  }

  for (const m of matchesRes.data ?? []) {
    const session = sessionById.get(m.session_id);
    if (!session) continue;

    const holeWinners = buildHoleWinners(holesByMatch.get(m.id) ?? []);
    const status = computeMatchStatus(holeWinners);
    europeTotal += status.points.europe;
    usaTotal += status.points.usa;

    // Project in-progress matches: current leader gets 1 point projected, all-square = 0.5 each
    if (!status.isComplete && status.holesPlayed > 0) {
      if (status.leader === "europe") europeProjected += 1;
      else if (status.leader === "usa") usaProjected += 1;
      else { europeProjected += 0.5; usaProjected += 0.5; }
    }

    const view: MatchView = {
      id: m.id,
      sessionId: m.session_id,
      matchOrder: m.match_order,
      format: session.format,
      europePlayers: (m.europe_player_ids as string[])
        .map((id) => playerMap.get(id))
        .filter((p): p is PlayerLite => Boolean(p)),
      usaPlayers: (m.usa_player_ids as string[])
        .map((id) => playerMap.get(id))
        .filter((p): p is PlayerLite => Boolean(p)),
      holeWinners,
      status,
    };
    session.matches.push(view);
  }

  for (const s of sessions) s.matches.sort((a, b) => a.matchOrder - b.matchOrder);

  const totalPoints = MATCH_POINTS + sessions.length * CONTEST_POINTS_PER_SESSION;
  const pointsToWin = totalPoints / 2 + 0.5;

  const winner =
    europeTotal >= pointsToWin ? "europe" : usaTotal >= pointsToWin ? "usa" : null;

  return {
    sessions,
    players: [...playerMap.values()],
    europeTotal,
    usaTotal,
    europeProjected,
    usaProjected,
    pointsToWin,
    totalPoints,
    winner,
    configured: true,
  };
}

export async function getCourseHoles(): Promise<CourseHole[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("course_holes")
    .select("hole_number, stroke_index, par")
    .order("hole_number");
  if (error || !data) return [];
  return data.map((h) => ({
    holeNumber: h.hole_number,
    strokeIndex: h.stroke_index,
    par: h.par,
  }));
}

export interface MatchDetail extends MatchView {
  sessionName: string;
  holes: CourseHole[];
  /** Advisory strokes each TEAM receives per hole (index 0..17). */
  teamStrokes: { europe: number[]; usa: number[] };
  /**
   * Individual strokes per player per hole.
   * playerStrokes.europe[playerIdx][holeIdx] = strokes that player receives.
   */
  playerStrokes: { europe: number[][]; usa: number[][] };
  /** Gross scores previously saved to the DB. */
  holeScores: HoleScore[];
}

/** Single match with course holes and per-player stroke allocation for scoring. */
export async function getMatchDetail(matchId: number): Promise<MatchDetail | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createSupabaseServerClient();
  const tournament = await getTournament();

  let found: MatchView | undefined;
  let sessionName = "";
  for (const s of tournament.sessions) {
    const match = s.matches.find((mm) => mm.id === matchId);
    if (match) {
      found = match;
      sessionName = s.name;
      break;
    }
  }
  if (!found) return null;

  const holes = await getCourseHoles();

  // Per-player strokes per hole
  const playerStrokes = {
    europe: found.europePlayers.map((p) => strokesForHandicap(p.handicap, holes)),
    usa: found.usaPlayers.map((p) => strokesForHandicap(p.handicap, holes)),
  };

  const teamStrokes = teamStrokesPerHole(
    found.format,
    found.europePlayers.map((p) => p.handicap),
    found.usaPlayers.map((p) => p.handicap),
    holes,
  );

  // Fetch saved gross scores
  const { data: scoreRows } = await supabase
    .from("hole_results")
    .select("hole_number, europe_gross, usa_gross")
    .eq("match_id", matchId);

  const scoresByHole = new Map<number, { europeGross: (number | null)[]; usaGross: (number | null)[] }>();
  for (const row of scoreRows ?? []) {
    scoresByHole.set(row.hole_number, {
      europeGross: (row.europe_gross as number[] | null) ?? [],
      usaGross: (row.usa_gross as number[] | null) ?? [],
    });
  }

  const holeScores: HoleScore[] = holes.map((h) => {
    const saved = scoresByHole.get(h.holeNumber);
    const euCount = found!.europePlayers.length;
    const usaCount = found!.usaPlayers.length;
    return {
      holeNumber: h.holeNumber,
      europeGross: saved?.europeGross.length
        ? saved.europeGross.concat(Array(Math.max(0, euCount - saved.europeGross.length)).fill(null))
        : Array(euCount).fill(null),
      usaGross: saved?.usaGross.length
        ? saved.usaGross.concat(Array(Math.max(0, usaCount - saved.usaGross.length)).fill(null))
        : Array(usaCount).fill(null),
    };
  });

  return { ...found, sessionName, holes, teamStrokes, playerStrokes, holeScores };
}
