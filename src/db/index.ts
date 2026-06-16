/**
 * Drizzle client backed by Supabase Postgres (via postgres.js).
 *
 * Used for server-side queries that need raw DB access (e.g. the seed script and
 * any service-role operations). User-facing reads/writes generally go through the
 * Supabase client so that Row-Level Security is enforced.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. See .env.example.");
}

// prepare:false is recommended for Supabase's transaction pooler.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export { schema };
