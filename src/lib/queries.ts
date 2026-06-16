import { createSupabaseServerClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import {
  computeMatchStatus,
  teamStrokesPerHole,
  type CourseHole,
  type HoleWinner,
  type MatchFormat,
} from "./golf";
import type { MatchView, PlayerLite, SessionView, TournamentView } from "./types";

/** 16 players → first team to 8.5 of 16 points wins. */
const POINTS_TO_WIN = 8.5;

const EMPTY_TOURNAMENT: TournamentView = {
  sessions: [],
  players: [],
  europeTotal: 0,
  usaTotal: 0,
  pointsToWin: POINTS_TO_WIN,
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

  const [playersRes, sessionsRes, matchesRes, holesRes] = await Promise.all([
    supabase.from("players").select("id, name, handicap, team"),
    supabase.from("golf_sessions").select("*").order("session_number"),
    supabase.from("matches").select("*").order("match_order"),
    supabase.from("hole_results").select("match_id, hole_number, winner"),
  ]);

  if (playersRes.error || sessionsRes.error || matchesRes.error || holesRes.error) {
    return EMPTY_TOURNAMENT;
  }

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

  const sessions: SessionView[] = (sessionsRes.data ?? []).map((s) => ({
    id: s.id,
    sessionNumber: s.session_number,
    name: s.name,
    format: s.format as MatchFormat,
    isActive: s.is_active,
    matches: [],
  }));
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  let europeTotal = 0;
  let usaTotal = 0;

  for (const m of matchesRes.data ?? []) {
    const session = sessionById.get(m.session_id);
    if (!session) continue;

    const holeWinners = buildHoleWinners(holesByMatch.get(m.id) ?? []);
    const status = computeMatchStatus(holeWinners);
    europeTotal += status.points.europe;
    usaTotal += status.points.usa;

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

  const winner =
    europeTotal >= POINTS_TO_WIN ? "europe" : usaTotal >= POINTS_TO_WIN ? "usa" : null;

  return {
    sessions,
    players: [...playerMap.values()],
    europeTotal,
    usaTotal,
    pointsToWin: POINTS_TO_WIN,
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
  /** Advisory strokes each team receives per hole (index 0..17). */
  teamStrokes: { europe: number[]; usa: number[] };
}

/** Single match with course holes and per-player stroke allocation for scoring. */
export async function getMatchDetail(matchId: number): Promise<MatchDetail | null> {
  if (!isSupabaseConfigured) return null;

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
  const teamStrokes = teamStrokesPerHole(
    found.format,
    found.europePlayers.map((p) => p.handicap),
    found.usaPlayers.map((p) => p.handicap),
    holes,
  );

  return { ...found, sessionName, holes, teamStrokes };
}
