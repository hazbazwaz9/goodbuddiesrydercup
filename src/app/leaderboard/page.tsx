import { getTournament } from "@/lib/queries";
import { ScoreHero } from "@/components/score-hero";
import { SessionCard } from "@/components/session-card";
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
        pointsToWin={t.pointsToWin}
        winner={t.winner}
        live
      />
      {t.sessions.map((s) => (
        <SessionCard key={s.id} session={s} linkMatches />
      ))}
      {t.sessions.every((s) => s.matches.length === 0) && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Matches haven&apos;t been drafted yet. Check back after the draft.
        </p>
      )}
    </div>
  );
}
