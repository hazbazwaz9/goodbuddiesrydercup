import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/brand";
import type { Team } from "@/lib/golf";

export function ScoreHero({
  europeTotal,
  usaTotal,
  europeProjected = 0,
  usaProjected = 0,
  pointsToWin,
  totalPoints = 16,
  winner,
  live = false,
}: {
  europeTotal: number;
  usaTotal: number;
  europeProjected?: number;
  usaProjected?: number;
  pointsToWin: number;
  totalPoints?: number;
  winner: Team | null;
  live?: boolean;
}) {
  const euLive = europeTotal + europeProjected;
  const usaLive = usaTotal + usaProjected;

  return (
    <div className="overflow-hidden rounded-2xl border shadow-sm">
      {winner && (
        <div className="bg-gold py-2 text-center text-sm font-bold tracking-wide text-black">
          🏆 {winner === "europe" ? "EUROPE" : "USA"} WINS THE GBRC!
        </div>
      )}
      <div className="grid grid-cols-2">
        <TeamScore
          team="europe"
          label="Europe"
          value={euLive}
          lockedValue={europeTotal}
          leading={euLive > usaLive}
        />
        <TeamScore
          team="usa"
          label="USA"
          value={usaLive}
          lockedValue={usaTotal}
          leading={usaLive > euLive}
          align="right"
        />
      </div>

      {/* Progress bar */}
      <ProgressBar
        europeCompleted={europeTotal}
        europeProjected={europeProjected}
        usaCompleted={usaTotal}
        usaProjected={usaProjected}
        pointsToWin={pointsToWin}
        totalPoints={totalPoints}
      />

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

function ProgressBar({
  europeCompleted,
  europeProjected,
  usaCompleted,
  usaProjected,
  pointsToWin,
  totalPoints,
}: {
  europeCompleted: number;
  europeProjected: number;
  usaCompleted: number;
  usaProjected: number;
  pointsToWin: number;
  totalPoints: number;
}) {
  const total = totalPoints;
  const euCompPct = (europeCompleted / total) * 100;
  const euProjPct = (europeProjected / total) * 100;
  const usaCompPct = (usaCompleted / total) * 100;
  const usaProjPct = (usaProjected / total) * 100;
  const winPct = (pointsToWin / total) * 100;

  return (
    <div className="relative mx-3 my-2 h-5 overflow-hidden rounded-full bg-muted">
      {/* Europe projected (sits right after solid, left side) */}
      <div
        className="absolute left-0 top-0 h-full bg-europe/35"
        style={{
          left: `${euCompPct}%`,
          width: `${euProjPct}%`,
          backgroundImage:
            "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,0.15) 3px,rgba(255,255,255,0.15) 6px)",
        }}
      />
      {/* Europe completed (solid, left side) */}
      <div
        className="absolute left-0 top-0 h-full bg-europe transition-all duration-500"
        style={{ width: `${euCompPct}%` }}
      />

      {/* USA projected (right of solid, right side) */}
      <div
        className="absolute top-0 h-full bg-usa/35"
        style={{
          right: `${usaCompPct}%`,
          width: `${usaProjPct}%`,
          backgroundImage:
            "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,0.15) 3px,rgba(255,255,255,0.15) 6px)",
        }}
      />
      {/* USA completed (solid, right side) */}
      <div
        className="absolute right-0 top-0 h-full bg-usa transition-all duration-500"
        style={{ width: `${usaCompPct}%` }}
      />

      {/* Win threshold marker */}
      <div
        className="absolute top-0 h-full w-0.5 bg-foreground/30"
        style={{ left: `${winPct}%` }}
        title={`${pointsToWin} to win`}
      />
      <div
        className="absolute top-0 h-full w-0.5 bg-foreground/30"
        style={{ right: `${winPct}%` }}
        title={`${pointsToWin} to win`}
      />
    </div>
  );
}

function TeamScore({
  team,
  label,
  value,
  lockedValue,
  leading,
  align = "left",
}: {
  team: Team;
  label: string;
  value: number;
  lockedValue: number;
  leading: boolean;
  align?: "left" | "right";
}) {
  const hasProjected = value > lockedValue;

  return (
    <div
      className={cn(
        "flex flex-col px-5 py-6 text-white",
        team === "europe" ? "bg-europe" : "bg-usa",
        align === "right" ? "items-end text-right" : "items-start",
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-widest opacity-80">{label}</span>
      <span className={cn("font-mono text-5xl font-bold tabular-nums", leading && "text-gold")}>
        {formatPoints(value)}
      </span>
      {hasProjected && (
        <span className="text-[11px] opacity-70">
          {formatPoints(lockedValue)} locked · {formatPoints(value - lockedValue)} projected
        </span>
      )}
    </div>
  );
}
