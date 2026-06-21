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
  const euNames = match.europePlayers.map((p) => p.name).join(" & ") || "TBD";
  const usaNames = match.usaPlayers.map((p) => p.name).join(" & ") || "TBD";

  const body = (
    <div className="px-4 py-3 space-y-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-x-2 text-sm">
        <div className="flex items-start gap-1.5">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-europe" />
          <span className="font-medium leading-snug text-europe">{euNames}</span>
        </div>
        <span className="mt-0.5 text-xs font-bold text-muted-foreground">vs</span>
        <div className="flex items-start justify-end gap-1.5">
          <span className="font-medium leading-snug text-usa text-right">{usaNames}</span>
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-usa" />
        </div>
      </div>
      <div className="flex items-center justify-between">
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
