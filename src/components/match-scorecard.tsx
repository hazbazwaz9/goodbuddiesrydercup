"use client";

import { useMemo } from "react";
import { computeMatchStatus, type CourseHole, type HoleWinner } from "@/lib/golf";
import { useMatchSync } from "@/lib/use-match-sync";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Cloud, CloudOff, Check } from "lucide-react";
import type { PlayerLite } from "@/lib/types";

const FORMAT_LABEL: Record<string, string> = {
  best_ball: "Best Ball · 2v2 · full handicap",
  scramble: "Scramble · 2v2 · 25% combined",
  singles: "Singles · 1v1 · full handicap",
};

export interface ScorecardProps {
  matchId: number;
  format: "best_ball" | "scramble" | "singles";
  sessionName: string;
  europePlayers: PlayerLite[];
  usaPlayers: PlayerLite[];
  holes: CourseHole[];
  teamStrokes: { europe: number[]; usa: number[] };
  initialWinners: HoleWinner[];
}

export function MatchScorecard(props: ScorecardProps) {
  const { winners, setWinner, pendingCount, synced } = useMatchSync(
    props.matchId,
    props.initialWinners,
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
          <div className="grid grid-cols-[2.2rem_1fr] items-center gap-2 border-b px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Hole</span>
            <span className="text-center">Tap the winner of each hole</span>
          </div>
          <ul className="divide-y">
            {props.holes.map((hole, i) => (
              <HoleRow
                key={hole.holeNumber}
                hole={hole}
                euStrokes={props.teamStrokes.europe[i] ?? 0}
                usaStrokes={props.teamStrokes.usa[i] ?? 0}
                winner={winners[i] ?? null}
                onSet={(w) => setWinner(hole.holeNumber, w)}
              />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function SyncIndicator({
  pendingCount,
  synced,
}: {
  pendingCount: number;
  synced: boolean;
}) {
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
  euStrokes,
  usaStrokes,
  winner,
  onSet,
}: {
  hole: CourseHole;
  euStrokes: number;
  usaStrokes: number;
  winner: HoleWinner;
  onSet: (w: HoleWinner) => void;
}) {
  // Tapping the active option again clears it back to "not played".
  const toggle = (w: HoleWinner) => onSet(winner === w ? null : w);

  return (
    <li className="grid grid-cols-[2.2rem_1fr] items-center gap-2 px-3 py-2">
      <div className="text-center">
        <div className="text-base font-bold leading-none">{hole.holeNumber}</div>
        <div className="text-[10px] text-muted-foreground">
          par{hole.par}·SI{hole.strokeIndex}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_2.5rem_1fr] gap-1">
        <SegButton
          team="europe"
          active={winner === "europe"}
          strokes={euStrokes}
          onClick={() => toggle("europe")}
        />
        <button
          type="button"
          onClick={() => toggle("halved")}
          className={cn(
            "rounded-md py-2 text-xs font-semibold transition-colors disabled:opacity-50",
            winner === "halved"
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:bg-muted/70",
          )}
        >
          ½
        </button>
        <SegButton
          team="usa"
          active={winner === "usa"}
          strokes={usaStrokes}
          onClick={() => toggle("usa")}
        />
      </div>
    </li>
  );
}

function SegButton({
  team,
  active,
  strokes,
  onClick,
}: {
  team: "europe" | "usa";
  active: boolean;
  strokes: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center rounded-md py-2 text-xs font-semibold transition-colors disabled:opacity-50",
        active
          ? team === "europe"
            ? "bg-europe text-europe-foreground"
            : "bg-usa text-usa-foreground"
          : team === "europe"
            ? "bg-europe/10 text-europe hover:bg-europe/20"
            : "bg-usa/10 text-usa hover:bg-usa/20",
      )}
    >
      {team === "europe" ? "Europe" : "USA"}
      {strokes > 0 && (
        <span
          className="absolute right-1 top-0.5 text-[9px] font-bold opacity-80"
          title={`${strokes} stroke${strokes > 1 ? "s" : ""} here`}
        >
          {"•".repeat(strokes)}
        </span>
      )}
    </button>
  );
}
