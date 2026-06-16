import { cn } from "@/lib/utils";
import { TEAM_LABEL } from "@/lib/brand";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerLite, Team } from "@/lib/types";

export function RosterClient({ players }: { players: PlayerLite[] }) {
  const teams: Team[] = ["europe", "usa"];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {teams.map((team) => {
        const roster = players.filter((p) => p.team === team);
        return (
          <Card key={team}>
            <CardHeader
              className={cn(
                "rounded-t-xl py-3",
                team === "europe"
                  ? "bg-europe text-europe-foreground"
                  : "bg-usa text-usa-foreground",
              )}
            >
              <CardTitle className="flex items-center justify-between text-base">
                {TEAM_LABEL[team]}
                <span className="text-sm font-normal opacity-80">{roster.length}/8</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {roster.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    HCP {p.handicap}
                  </span>
                </div>
              ))}
              {roster.length === 0 && (
                <p className="px-4 py-4 text-sm text-muted-foreground">No players yet.</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
