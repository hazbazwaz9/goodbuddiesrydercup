import { getTournament } from "@/lib/queries";
import { SessionCard } from "@/components/session-card";
import { RealtimeRefresher } from "@/components/realtime-refresher";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const t = await getTournament();

  return (
    <div className="space-y-4">
      <RealtimeRefresher />
      <h1 className="text-xl font-semibold">Matches</h1>
      {t.sessions.map((s) => (
        <SessionCard key={s.id} session={s} linkMatches />
      ))}
    </div>
  );
}
