import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/brand";
import type { Team } from "@/lib/golf";

export function ScoreHero({
  europeTotal,
  usaTotal,
  pointsToWin,
  winner,
  live = false,
}: {
  europeTotal: number;
  usaTotal: number;
  pointsToWin: number;
  winner: Team | null;
  live?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border shadow-sm">
      {winner && (
        <div className="bg-gold py-2 text-center text-sm font-bold tracking-wide text-black">
          🏆 {winner === "europe" ? "EUROPE" : "USA"} WINS THE GBRC!
        </div>
      )}
      <div className="grid grid-cols-2">
        <TeamScore team="europe" label="Europe" value={europeTotal} leading={europeTotal > usaTotal} />
        <TeamScore team="usa" label="USA" value={usaTotal} leading={usaTotal > europeTotal} align="right" />
      </div>
      <div className="flex items-center justify-center gap-2 border-t bg-muted/40 py-1.5 text-xs text-muted-foreground">
        {live && (
          <span className="flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fairway opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-fairway" />
            </span>
            LIVE
          </span>
        )}
        <span>{pointsToWin} to win</span>
      </div>
    </div>
  );
}

function TeamScore({
  team,
  label,
  value,
  leading,
  align = "left",
}: {
  team: Team;
  label: string;
  value: number;
  leading: boolean;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex flex-col px-5 py-6 text-white",
        team === "europe" ? "bg-europe" : "bg-usa",
        align === "right" ? "items-end text-right" : "items-start",
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-widest opacity-80">
        {label}
      </span>
      <span className={cn("font-mono text-5xl font-bold tabular-nums", leading && "text-gold")}>
        {formatPoints(value)}
      </span>
    </div>
  );
}
