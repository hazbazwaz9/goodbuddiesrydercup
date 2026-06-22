"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeMatchStatus,
  golfScoreName,
  scoreOptions,
  scoreEmoji,
  type CourseHole,
  type HoleWinner,
} from "@/lib/golf";
import { useMatchSync } from "@/lib/use-match-sync";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cloud, CloudOff, Check, Pencil } from "lucide-react";
import type { HoleScore, PlayerLite } from "@/lib/types";
import type { MatchFormat } from "@/lib/golf";

const FORMAT_LABEL: Record<string, string> = {
  shamble: "Shamble · 2v2 · 50% handicap",
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

  const holeRefs = useRef<(HTMLLIElement | null)[]>([]);

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
              const isShamble = props.format === "shamble";
              const euPlayerStrokes = isShamble
                ? props.playerStrokes.europe.map((ps) => ps[i] ?? 0)
                : [props.teamStrokes.europe[i] ?? 0];
              const usaPlayerStrokes = isShamble
                ? props.playerStrokes.usa.map((ps) => ps[i] ?? 0)
                : [props.teamStrokes.usa[i] ?? 0];

              return (
                <HoleRow
                  key={hole.holeNumber}
                  liRef={(el) => { holeRefs.current[i] = el; }}
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

function holeSummaryText(
  hole: CourseHole,
  format: MatchFormat,
  winner: HoleWinner,
  euScores: (number | null)[],
  usaScores: (number | null)[],
): string {
  if (!winner) return "";
  if (winner === "halved") {
    const score = euScores[0] ?? usaScores[0];
    const name = score != null ? ` with a ${score} (${golfScoreName(score, hole.par)})` : "";
    return `Hole ${hole.holeNumber} halved${name}`;
  }
  const teamLabel = winner === "europe" ? "EU" : "USA";
  const scores = winner === "europe" ? euScores : usaScores;
  if (format === "shamble") {
    return `${teamLabel} won hole ${hole.holeNumber}`;
  }
  const score = scores[0];
  const name = score != null ? ` with a ${score} (${golfScoreName(score, hole.par)})` : "";
  return `${teamLabel} won hole ${hole.holeNumber}${name}`;
}

function HoleRow({
  liRef,
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
  liRef: (el: HTMLLIElement | null) => void;
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
  const isShamble = format === "shamble";
  const isSinglesOrScramble = format === "singles" || format === "scramble";

  // How many scores we expect before the hole can auto-roll-up.
  const expectedEu = isShamble ? europePlayers.length : 1;
  const expectedUsa = isShamble ? usaPlayers.length : 1;
  const allScoresEntered =
    euScores.filter((s) => s != null).length >= expectedEu &&
    usaScores.filter((s) => s != null).length >= expectedUsa;

  // Start collapsed if already complete (e.g. loading an in-progress match).
  const [expanded, setExpanded] = useState(!(winner !== null && allScoresEntered));
  // Auto-collapse only once every expected score is in.
  const prevAllEntered = useRef(allScoresEntered);
  useEffect(() => {
    if (!prevAllEntered.current && allScoresEntered && winner !== null) {
      setExpanded(false);
    }
    prevAllEntered.current = allScoresEntered;
  }, [allScoresEntered, winner]);

  const summaryText = holeSummaryText(hole, format, winner, euScores, usaScores);
  const showInputs = winner === null || expanded;

  return (
    <li ref={liRef} className="px-3 py-2.5">
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

      {!showInputs ? (
        /* Roll-up summary */
        <div
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2",
            winner === "europe" && "bg-europe/10 ring-1 ring-europe/20",
            winner === "usa" && "bg-usa/10 ring-1 ring-usa/20",
            winner === "halved" && "bg-muted",
          )}
        >
          <p
            className={cn(
              "text-sm font-medium",
              winner === "europe" && "text-europe",
              winner === "usa" && "text-usa",
            )}
          >
            {summaryText}
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="ml-2 h-7 px-2 text-xs"
            onClick={() => setExpanded(true)}
          >
            <Pencil className="mr-1 h-3 w-3" /> Edit
          </Button>
        </div>
      ) : (
        /* Score inputs */
        !isShamble ? (
          <div className="grid grid-cols-[1fr_1fr] gap-2">
            <div
              className={cn(
                "rounded-lg p-0.5",
                winner === "europe" && "bg-europe/10 ring-1 ring-europe/30",
              )}
            >
              <PlayerScoreInput
                label={format === "singles" ? europePlayers[0]?.name ?? "Europe" : "Europe"}
                team="europe"
                par={hole.par}
                strokes={euPlayerStrokes[0] ?? 0}
                value={euScores[0] ?? null}
                onChange={(v) => onSetScore("eu", 0, v)}
              />
            </div>
            <div
              className={cn(
                "rounded-lg p-0.5",
                winner === "usa" && "bg-usa/10 ring-1 ring-usa/30",
              )}
            >
              <PlayerScoreInput
                label={format === "singles" ? usaPlayers[0]?.name ?? "USA" : "USA"}
                team="usa"
                par={hole.par}
                strokes={usaPlayerStrokes[0] ?? 0}
                value={usaScores[0] ?? null}
                onChange={(v) => onSetScore("usa", 0, v)}
              />
            </div>
          </div>
        ) : (
          /* Best ball: 2 players per side */
          <div className="grid grid-cols-2 gap-2">
            <div
              className={cn(
                "space-y-1.5 rounded-lg p-0.5",
                winner === "europe" && "bg-europe/10 ring-1 ring-europe/30",
              )}
            >
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
            <div
              className={cn(
                "space-y-1.5 rounded-lg p-0.5",
                winner === "usa" && "bg-usa/10 ring-1 ring-usa/30",
              )}
            >
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
        )
      )}
      {/* Done button when editing a hole that already has a winner */}
      {showInputs && winner !== null && (
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs"
            onClick={() => setExpanded(false)}
          >
            <Check className="mr-1 h-3 w-3" /> Done
          </Button>
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
            {strokes} stroke{strokes > 1 ? "s" : ""}
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
          <SelectValue>
            {value == null ? "—" : String(value)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="none">— Clear</SelectItem>
          {options.map((o) => {
            const emoji = scoreEmoji(o.score, par);
            return (
              <SelectItem key={o.score} value={String(o.score)}>
                <span className="font-mono font-bold tabular-nums">{o.score}</span>
                {emoji && <span className="ml-0.5">{emoji}</span>}
                <span className="text-muted-foreground ml-1">({o.name})</span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
