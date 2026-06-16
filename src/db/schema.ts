/**
 * Drizzle schema for the Good Buddies Ryder Cup app (no-auth model).
 *
 * Source of truth for type-safe queries. Provisioning (RLS, triggers, realtime)
 * lives in `supabase/schema.sql`, which is authoritative.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
  serial,
  unique,
} from "drizzle-orm/pg-core";

export const teamEnum = pgEnum("team", ["europe", "usa"]);
export const formatEnum = pgEnum("match_format", ["best_ball", "scramble", "singles"]);
export const matchStatusEnum = pgEnum("match_status", ["pending", "active", "complete"]);
export const holeWinnerEnum = pgEnum("hole_winner", ["europe", "usa", "halved"]);

/** A tournament player. No accounts — just a name, team and handicap. */
export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  team: teamEnum("team"),
  handicap: integer("handicap").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const golfSessions = pgTable("golf_sessions", {
  id: serial("id").primaryKey(),
  sessionNumber: integer("session_number").notNull(),
  format: formatEnum("format").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(false),
});

export const courseHoles = pgTable("course_holes", {
  id: serial("id").primaryKey(),
  holeNumber: integer("hole_number").notNull().unique(),
  strokeIndex: integer("stroke_index").notNull(),
  par: integer("par").notNull(),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => golfSessions.id, { onDelete: "cascade" }),
  europePlayerIds: uuid("europe_player_ids").array().notNull(),
  usaPlayerIds: uuid("usa_player_ids").array().notNull(),
  status: matchStatusEnum("status").notNull().default("pending"),
  europePoints: numeric("europe_points", { precision: 3, scale: 1 }).notNull().default("0"),
  usaPoints: numeric("usa_points", { precision: 3, scale: 1 }).notNull().default("0"),
  matchOrder: integer("match_order").notNull().default(0),
});

export const holeResults = pgTable(
  "hole_results",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    holeNumber: integer("hole_number").notNull(),
    winner: holeWinnerEnum("winner"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("hole_results_match_hole_unique").on(t.matchId, t.holeNumber)],
);

export type Player = typeof players.$inferSelect;
export type GolfSession = typeof golfSessions.$inferSelect;
export type CourseHoleRow = typeof courseHoles.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type HoleResult = typeof holeResults.$inferSelect;
