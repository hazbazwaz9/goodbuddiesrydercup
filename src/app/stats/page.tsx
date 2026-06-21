import { getStats } from "@/lib/queries";
import { StatsClient } from "@/components/stats-client";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const stats = await getStats();
  return <StatsClient stats={stats} />;
}
