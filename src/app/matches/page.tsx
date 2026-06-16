import { getTournament } from "@/lib/queries";
import { SessionCard } from "@/components/session-card";
import { SessionContests } from "@/components/session-contests";
import { RealtimeRefresher } from "@/components/realtime-refresher";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const t = await getTournament();

  return (
    <div className="space-y-6">
      <RealtimeRefresher />
      <h1 className="text-xl font-semibold">Matches</h1>
      {t.sessions.map((s) => (
        <div key={s.id} className="space-y-2">
          <SessionCard session={s} linkMatches />
          <SessionContests session={s} players={t.players} editable />
        </div>
      ))}
    </div>
  );
}
