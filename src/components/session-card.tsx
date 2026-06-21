import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchStatusBadge } from "@/components/match-status-badge";
import { cn } from "@/lib/utils";
import type { SessionView, MatchView } from "@/lib/types";
import { ChevronRight } from "lucide-react";

const FORMAT_LABEL: Record<string, string> = {
  shamble: "Shamble · 2v2",
  scramble: "Scramble · 2v2",
  singles: "Singles · 1v1",
};

export function SessionCard({
  session,
  linkMatches = false,
}: {
  session: SessionView;
  linkMatches?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{session.name}</CardTitle>
          <Badge variant="secondary">{FORMAT_LABEL[session.format]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {session.matches.length === 0 ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">No matches set yet.</p>
        ) : (
          session.matches.map((m) => (
            <MatchRow key={m.id} match={m} linkable={linkMatches} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function MatchRow({ match, linkable }: { match: MatchView; linkable: boolean }) {
  const body = (
    <div className="flex items-center justify-between gap-3 px-6 py-3">
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <PlayerLine names={match.europePlayers.map((p) => p.name)} team="europe" />
        <PlayerLine names={match.usaPlayers.map((p) => p.name)} team="usa" />
      </div>
      <div className="flex items-center gap-1">
        <MatchStatusBadge status={match.status} />
        {linkable && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
    </div>
  );

  if (!linkable) return body;
  return (
    <Link href={`/matches/${match.id}`} className="block transition-colors hover:bg-muted/50">
      {body}
    </Link>
  );
}

function PlayerLine({ names, team }: { names: string[]; team: "europe" | "usa" }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-block h-2 w-2 shrink-0 rounded-full",
          team === "europe" ? "bg-europe" : "bg-usa",
        )}
      />
      <span className="truncate">{names.join(" & ") || "TBD"}</span>
    </div>
  );
}
