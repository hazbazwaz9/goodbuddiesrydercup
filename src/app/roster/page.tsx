import { getTournament } from "@/lib/queries";
import { RosterClient } from "@/components/roster-client";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const t = await getTournament();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Roster</h1>
        <p className="text-sm text-muted-foreground">
          The player pool and, once drafted, the two teams.
        </p>
      </div>
      <RosterClient players={t.players} />
    </div>
  );
}
