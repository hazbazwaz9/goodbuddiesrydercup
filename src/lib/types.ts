import type { MatchFormat, MatchStatus, HoleWinner, Team } from "./golf";

export type { MatchFormat, MatchStatus, HoleWinner, Team };

export interface PlayerLite {
  id: string;
  name: string;
  handicap: number;
  team: Team | null;
}

export interface MatchView {
  id: number;
  sessionId: number;
  matchOrder: number;
  format: MatchFormat;
  europePlayers: PlayerLite[];
  usaPlayers: PlayerLite[];
  /** Hole winners indexed 0..17 (hole 1..18); null = not yet played. */
  holeWinners: HoleWinner[];
  status: MatchStatus;
}

export interface SessionView {
  id: number;
  sessionNumber: number;
  name: string;
  format: MatchFormat;
  isActive: boolean;
  matches: MatchView[];
}

/** Gross scores for a single hole (null = not yet entered). */
export interface HoleScore {
  holeNumber: number;
  europeGross: (number | null)[];
  usaGross: (number | null)[];
}

export interface TournamentView {
  sessions: SessionView[];
  players: PlayerLite[];
  /** Points from completed matches only (official score). */
  europeTotal: number;
  usaTotal: number;
  /** Projected points from in-progress matches (live leader gets 1, all-square 0.5 each). */
  europeProjected: number;
  usaProjected: number;
  pointsToWin: number;
  winner: Team | null;
  configured: boolean;
}
