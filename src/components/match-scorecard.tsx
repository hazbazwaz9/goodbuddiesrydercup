"use client";

import { useMemo } from "react";
import { computeMatchStatus, scoreOptions, type CourseHole, type HoleWinner } from "@/lib/golf";
import { useMatchSync } from "@/lib/use-match-sync";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cloud, CloudOff, Check } from "lucide-react";
import type { HoleScore, PlayerLite } from "@/lib/types";
import type { MatchFormat } from "@/lib/golf";

const FORMAT_LABEL: Record<string, string> = {
  best_ball: "Best Ball · 2v2 · full handicap",
  scramble: "Scramble · 2v2 · 25% combined",
  singles: "Singles · 1v1 · full handicap",
};

export interface ScorecardProps {
  matchId: number;
  format: MatchFormat;
  sessionName: string;
  europePlayers: PlayerLite[];
  usaPlayers: PlayerLite[];
  holes: CourseHole[];
  teamStrokes: { europe: number[]; usa: number[] };
  /** Per-player strokes: playerStrokes.europe[playerIdx][holeIdx] */
  playerStrokes: { europe: number[][]; usa: number[][] };
  initialWinners: HoleWinner[];
  initialScores: HoleScore[];
}

export function MatchScorecard(props: ScorecardProps) {
  const { winners, holeScores, setScore, pendingCount, synced } = useMatchSync(
    props.matchId,
    {
      format: props.format,
      euHcps: props.europePlayers.map((p) => p.handicap),
      usaHcps: props.usaPlayers.map((p) => p.handicap),
      holes: props.holes,
      initialWinners: props.initialWinners,
      initialScores: props.initialScores,
    },
  );

  const status = useMemo(() => computeMatchStatus(winners), [winners]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {props.sessionName}
              </p>
              <p className="text-xs text-muted-foreground">{FORMAT_LABEL[props.format]}</p>
            </div>
            <SyncIndicator pendingCount={pendingCount} synced={synced} />
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <TeamHeading players={props.europePlayers} team="europe" />
            <span className="text-xs font-bold text-muted-foreground">vs</span>
            <TeamHeading players={props.usaPlayers} team="usa" align="right" />
          </div>

          <div
            className={cn(
              "rounded-lg py-2 text-center text-sm font-semibold",
              status.leader === "europe" && "bg-europe text-europe-foreground",
              status.leader === "usa" && "bg-usa text-usa-foreground",
              !status.leader && "bg-muted text-foreground",
            )}
          >
            {status.statusText}
          </div>
        </CardContent>
      </Card>

      {/* Scorecard */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Enter gross scores — winner computed automatically
          </div>
          <ul className="divide-y">
            {props.holes.map((hole, i) => {
              // Best ball: individual player strokes. Singles/scramble: team-level allocation.
              const isBestBall = props.format === "best_ball";
              const euPlayerStrokes = isBestBall
                ? props.playerStrokes.europe.map((ps) => ps[i] ?? 0)
                : [props.teamStrokes.europe[i] ?? 0];
              const usaPlayerStrokes = isBestBall
                ? props.playerStrokes.usa.map((ps) => ps[i] ?? 0)
                : [props.teamStrokes.usa[i] ?? 0];

              return (
                <HoleRow
                  key={hole.holeNumber}
                  hole={hole}
                  format={props.format}
                  europePlayers={props.europePlayers}
                  usaPlayers={props.usaPlayers}
                  euPlayerStrokes={euPlayerStrokes}
                  usaPlayerStrokes={usaPlayerStrokes}
                  euScores={holeScores[i]?.europeGross ?? []}
                  usaScores={holeScores[i]?.usaGross ?? []}
                  winner={winners[i] ?? null}
                  onSetScore={(side, playerIdx, score) =>
                    setScore(side, playerIdx, hole.holeNumber, score)
                  }
                />
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function SyncIndicator({ pendingCount, synced }: { pendingCount: number; synced: boolean }) {
  if (pendingCount > 0 && !synced)
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600">
        <CloudOff className="h-3.5 w-3.5" /> Saving {pendingCount}…
      </span>
    );
  if (synced)
    return (
      <span className="flex items-center gap-1 text-xs text-fairway">
        <Check className="h-3.5 w-3.5" /> Saved
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Cloud className="h-3.5 w-3.5" /> Live
    </span>
  );
}

function TeamHeading({
  players,
  team,
  align = "left",
}: {
  players: PlayerLite[];
  team: "europe" | "usa";
  align?: "left" | "right";
}) {
  return (
    <div className={cn(align === "right" && "text-right")}>
      {players.map((p) => (
        <div key={p.id} className="text-sm font-medium leading-tight">
          {p.name}
          <span className="ml-1 text-xs text-muted-foreground">({p.handicap})</span>
        </div>
      ))}
      <span
        className={cn(
          "text-[10px] font-bold uppercase tracking-widest",
          team === "europe" ? "text-europe" : "text-usa",
        )}
      >
        {team === "europe" ? "Europe" : "USA"}
      </span>
    </div>
  );
}

function HoleRow({
  hole,
  format,
  europePlayers,
  usaPlayers,
  euPlayerStrokes,
  usaPlayerStrokes,
  euScores,
  usaScores,
  winner,
  onSetScore,
}: {
  hole: CourseHole;
  format: MatchFormat;
  europePlayers: PlayerLite[];
  usaPlayers: PlayerLite[];
  euPlayerStrokes: number[];
  usaPlayerStrokes: number[];
  euScores: (number | null)[];
  usaScores: (number | null)[];
  winner: HoleWinner;
  onSetScore: (side: "eu" | "usa", playerIdx: number, score: number | null) => void;
}) {
  const isSinglesOrScramble = format === "singles" || format === "scramble";

  return (
    <li className="px-3 py-2.5">
      {/* Hole info row */}
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-bold">
          {hole.holeNumber}
        </span>
        <span className="text-[11px] text-muted-foreground">
          par {hole.par} · SI {hole.strokeIndex}
        </span>
        {winner && (
          <span
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              winner === "europe" && "bg-europe text-europe-foreground",
              winner === "usa" && "bg-usa text-usa-foreground",
              winner === "halved" && "bg-muted text-foreground",
            )}
          >
            {winner === "europe" ? "EU wins" : winner === "usa" ? "USA wins" : "Halved"}
          </span>
        )}
      </div>

      {/* Score inputs */}
      {isSinglesOrScramble ? (
        <div className="grid grid-cols-[1fr_1fr] gap-2">
          <PlayerScoreInput
            label={format === "singles" ? europePlayers[0]?.name ?? "Europe" : "Europe"}
            team="europe"
            par={hole.par}
            strokes={euPlayerStrokes[0] ?? 0}
            value={euScores[0] ?? null}
            onChange={(v) => onSetScore("eu", 0, v)}
          />
          <PlayerScoreInput
            label={format === "singles" ? usaPlayers[0]?.name ?? "USA" : "USA"}
            team="usa"
            par={hole.par}
            strokes={usaPlayerStrokes[0] ?? 0}
            value={usaScores[0] ?? null}
            onChange={(v) => onSetScore("usa", 0, v)}
          />
        </div>
      ) : (
        /* Best ball: 2 players per side */
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            {europePlayers.map((p, pi) => (
              <PlayerScoreInput
                key={p.id}
                label={p.name}
                team="europe"
                par={hole.par}
                strokes={euPlayerStrokes[pi] ?? 0}
                value={euScores[pi] ?? null}
                onChange={(v) => onSetScore("eu", pi, v)}
              />
            ))}
          </div>
          <div className="space-y-1.5">
            {usaPlayers.map((p, pi) => (
              <PlayerScoreInput
                key={p.id}
                label={p.name}
                team="usa"
                par={hole.par}
                strokes={usaPlayerStrokes[pi] ?? 0}
                value={usaScores[pi] ?? null}
                onChange={(v) => onSetScore("usa", pi, v)}
              />
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

function PlayerScoreInput({
  label,
  team,
  par,
  strokes,
  value,
  onChange,
}: {
  label: string;
  team: "europe" | "usa";
  par: number;
  strokes: number;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const hasStroke = strokes > 0;
  const options = useMemo(() => scoreOptions(par), [par]);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 transition-colors",
        hasStroke && team === "europe" && "border-europe/40 bg-europe/5",
        hasStroke && team === "usa" && "border-usa/40 bg-usa/5",
        !hasStroke && "border-border bg-transparent",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium leading-tight">{label}</p>
        {hasStroke && (
          <p
            className={cn(
              "text-[10px] font-bold",
              team === "europe" ? "text-europe" : "text-usa",
            )}
          >
            {"▼".repeat(strokes)} stroke{strokes > 1 ? "s" : ""}
          </p>
        )}
      </div>
      <Select
        value={value != null ? String(value) : "none"}
        onValueChange={(v) => onChange(v == null || v === "none" ? null : Number(v))}
      >
        <SelectTrigger
          aria-label="Score"
          className={cn(
            "h-8 min-w-[3.5rem] justify-center px-2 font-mono text-sm font-bold tabular-nums",
            value != null &&
              (team === "europe"
                ? "border-europe bg-europe text-europe-foreground"
                : "border-usa bg-usa text-usa-foreground"),
          )}
        >
          <SelectValue>{(v) => (v == null || v === "none" ? "—" : String(v))}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="none">— Clear</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.score} value={String(o.score)}>
              <span className="font-mono font-bold tabular-nums">{o.score}</span>
              <span className="text-muted-foreground">({o.name})</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
