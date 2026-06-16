import { getTournament } from "@/lib/queries";
import { ScoreHero } from "@/components/score-hero";
import { SessionCard } from "@/components/session-card";
import { SessionContests } from "@/components/session-contests";
import { SetupNotice } from "@/components/setup-notice";
import { RealtimeRefresher } from "@/components/realtime-refresher";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const t = await getTournament();

  if (!t.configured) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Leaderboard</h1>
        <SetupNotice />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RealtimeRefresher />
      <ScoreHero
        europeTotal={t.europeTotal}
        usaTotal={t.usaTotal}
        europeProjected={t.europeProjected}
        usaProjected={t.usaProjected}
        pointsToWin={t.pointsToWin}
        totalPoints={t.totalPoints}
        winner={t.winner}
        live
      />
      {t.sessions.map((s) => (
        <div key={s.id} className="space-y-2">
          <SessionCard session={s} linkMatches />
          <SessionContests session={s} players={t.players} />
        </div>
      ))}
      {t.sessions.every((s) => s.matches.length === 0) && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Matches haven&apos;t been drafted yet. Check back after the draft.
        </p>
      )}
    </div>
  );
}
