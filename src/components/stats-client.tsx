"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlayerStat, StatsView } from "@/lib/queries";

type StatConfig = {
  title: string;
  emoji: string;
  value: (p: PlayerStat) => number;
  format?: (n: number) => string;
  higherIsBetter?: boolean;
};

const STAT_CONFIGS: StatConfig[] = [
  {
    title: "Most Points",
    emoji: "🏆",
    value: (p) => p.points,
    format: (n) => n % 1 === 0 ? String(n) : n.toFixed(1),
  },
  {
    title: "Most Birdies",
    emoji: "🐦",
    value: (p) => p.birdies,
  },
  {
    title: "Most Eagles",
    emoji: "🦅",
    value: (p) => p.eagles,
  },
  {
    title: "Most Pars",
    emoji: "⛳",
    value: (p) => p.pars,
  },
  {
    title: "Most Holes Won",
    emoji: "✅",
    value: (p) => p.holesWon,
  },
  {
    title: "Most Holes Lost",
    emoji: "❌",
    value: (p) => p.holesLost,
  },
  {
    title: "Best Scoring Average",
    emoji: "📉",
    value: (p) => p.holesPlayed > 0 ? p.scoringDiff / p.holesPlayed : 999,
    format: (n) => (n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2)),
    higherIsBetter: false,
  },
];

function teamColor(team: string | null) {
  if (team === "europe") return "text-europe";
  if (team === "usa") return "text-usa";
  return "text-muted-foreground";
}

function StatCard({ config, players }: { config: StatConfig; players: PlayerStat[] }) {
  const higherIsBetter = config.higherIsBetter !== false;
  const eligible = players.filter((p) => {
    const v = config.value(p);
    return v !== 999 && (higherIsBetter ? v > 0 : true);
  });
  const sorted = [...eligible].sort((a, b) =>
    higherIsBetter ? config.value(b) - config.value(a) : config.value(a) - config.value(b),
  );
  const top = sorted.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span>{config.emoji}</span>
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {top.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data yet</p>
        ) : (
          <ol className="space-y-1.5">
            {top.map((p, i) => {
              const val = config.value(p);
              const display = config.format ? config.format(val) : String(val);
              const isFirst = i === 0;
              return (
                <li
                  key={p.playerId}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2 py-1 text-sm",
                    isFirst && "bg-muted font-semibold",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-4 shrink-0 text-center text-xs text-muted-foreground">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                    </span>
                    <span className={cn("truncate", teamColor(p.team))}>{p.name}</span>
                  </div>
                  <span className="ml-2 shrink-0 font-mono text-sm tabular-nums">{display}</span>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsClient({ stats }: { stats: StatsView }) {
  if (!stats.configured || stats.players.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <p className="text-muted-foreground text-sm">No stats available yet — scores will appear here once matches are underway.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
      <h1 className="text-lg font-bold">Statistics</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STAT_CONFIGS.map((cfg) => (
          <StatCard key={cfg.title} config={cfg} players={stats.players} />
        ))}
      </div>
    </div>
  );
}
