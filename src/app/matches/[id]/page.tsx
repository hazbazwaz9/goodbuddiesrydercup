import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getMatchDetail } from "@/lib/queries";
import { MatchScorecard } from "@/components/match-scorecard";

export const dynamic = "force-dynamic";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) notFound();

  const match = await getMatchDetail(matchId);
  if (!match) notFound();

  return (
    <div className="space-y-3">
      <Link
        href="/matches"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> All matches
      </Link>
      <MatchScorecard
        matchId={match.id}
        format={match.format}
        sessionName={match.sessionName}
        europePlayers={match.europePlayers}
        usaPlayers={match.usaPlayers}
        holes={match.holes}
        teamStrokes={match.teamStrokes}
        playerStrokes={match.playerStrokes}
        initialWinners={match.holeWinners}
        initialScores={match.holeScores}
      />
    </div>
  );
}
