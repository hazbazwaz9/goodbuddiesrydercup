import { getTournament } from "@/lib/queries";
import { isAdminUnlocked } from "@/lib/admin-session";
import { AdminClient } from "@/components/admin-client";
import { AdminGate } from "@/components/admin-gate";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminUnlocked())) {
    return <AdminGate />;
  }

  const t = await getTournament();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage players, draft teams, and set the match pairings.
        </p>
      </div>
      <AdminClient players={t.players} sessions={t.sessions} />
    </div>
  );
}
