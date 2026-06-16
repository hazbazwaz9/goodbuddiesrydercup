/**
 * Seeds 16 players into the `players` table (no accounts).
 * Reference data (sessions, course holes) is seeded by supabase/schema.sql.
 *
 * Run AFTER applying schema.sql:  npm run db:seed
 * Requires env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent by name. You can also just add players in the app's Admin panel.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before seeding.",
  );
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Team = "europe" | "usa";
const players: { name: string; team: Team; handicap: number }[] = [
  { name: "Harry", team: "europe", handicap: 12 },
  { name: "Europe Player 2", team: "europe", handicap: 8 },
  { name: "Europe Player 3", team: "europe", handicap: 18 },
  { name: "Europe Player 4", team: "europe", handicap: 5 },
  { name: "Europe Player 5", team: "europe", handicap: 24 },
  { name: "Europe Player 6", team: "europe", handicap: 14 },
  { name: "Europe Player 7", team: "europe", handicap: 10 },
  { name: "Europe Player 8", team: "europe", handicap: 20 },
  { name: "USA Player 1", team: "usa", handicap: 11 },
  { name: "USA Player 2", team: "usa", handicap: 7 },
  { name: "USA Player 3", team: "usa", handicap: 16 },
  { name: "USA Player 4", team: "usa", handicap: 3 },
  { name: "USA Player 5", team: "usa", handicap: 22 },
  { name: "USA Player 6", team: "usa", handicap: 15 },
  { name: "USA Player 7", team: "usa", handicap: 9 },
  { name: "USA Player 8", team: "usa", handicap: 19 },
];

async function seed() {
  console.log("Seeding players…");
  const { data: existing, error: exErr } = await admin.from("players").select("name");
  if (exErr) throw exErr;
  const have = new Set((existing ?? []).map((p) => p.name.toLowerCase()));

  const toInsert = players.filter((p) => !have.has(p.name.toLowerCase()));
  if (toInsert.length === 0) {
    console.log("All players already present. Nothing to do.");
    return;
  }
  const { error } = await admin.from("players").insert(toInsert);
  if (error) throw error;
  console.log(`Done. Inserted ${toInsert.length} players.`);
}

seed().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
