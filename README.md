# Good Buddies Ryder Cup (GBRC) 🏆

Live mobile scoring for the annual Good Buddies Ryder Cup — Europe vs USA, two teams of eight, three 18-hole sessions (Best Ball, Scramble, Singles).

- **Live leaderboard** (public) that updates in real time as holes are scored
- **Open hole-by-hole scoring** — no login; anyone in the group taps in results, with optimistic updates + an offline queue for spotty course signal
- **Roster** showing both teams and handicaps
- **Admin panel** (behind a shared passcode) to draft teams, set pairings, and manage handicaps
- Installable as a **PWA** ("Add to Home Screen")

## Stack

Next.js (App Router) · Supabase (Postgres + Realtime) · Drizzle · Tailwind + shadcn/ui · TypeScript. Deploys to Vercel. **No user accounts** — the app is open for viewing and scoring; admin actions are gated by a passcode and run via the Supabase service role.

## Setup

### 1. Supabase project
1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL editor**, paste and run the contents of [`supabase/schema.sql`](supabase/schema.sql). It creates all tables, RLS, the realtime triggers, and the static course/session data. (Safe to re-run — it tears down and rebuilds.)

### 2. Environment
Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...        # Project Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # Project Settings → API → anon public key
SUPABASE_SERVICE_ROLE_KEY=...       # Project Settings → API → service_role (admin writes + seed)
DATABASE_URL=...                    # Project Settings → Database → URI (seed only)
ADMIN_PASSCODE=pick-something       # unlocks the in-app Admin panel
```

The anon URL/key are enough for the public app and scoring. The **service role key** is required for the Admin panel to write players/teams/matches.

### 3. Add players
Either seed 16 placeholders:
```bash
npm install
npm run db:seed
```
…or just add them in the app: open `/admin`, enter your `ADMIN_PASSCODE`, and add players / draft teams / set pairings there.

### 4. Run
```bash
npm run dev         # http://localhost:3000
```

## How it works
- **Players** open the app, go to a match, and tap **Europe / ½ / USA** for each hole. The leaderboard updates live on everyone's phone. No login.
- **You (admin)** tap the gear icon (top-right) → enter the passcode → manage everything. The passcode is stored in an httpOnly cookie; admin writes only succeed with the service role key on the server.

## Deploy (Vercel)
1. Push to GitHub, import the repo in Vercel.
2. Add the same env vars in **Project Settings → Environment Variables**.

## Before the tournament ⛳️
- **Stroke index:** `supabase/schema.sql` seeds a placeholder stroke index (`stroke_index = hole_number`). Replace it with the real course stroke index and par.

## Handicap rules
| Session | Format | Handicap |
|---------|--------|----------|
| 1 | Best Ball 2v2 | Full handicap per player |
| 2 | Scramble 2v2 | 25% of combined team handicap |
| 3 | Singles 1v1 | Full handicap difference |

Points: 1 win / ½ halve / 0 loss. First team to 8.5 of 16 wins. Scoring math lives in [`src/lib/golf.ts`](src/lib/golf.ts) (unit-tested in `golf.test.ts`).

## Scripts
```bash
npm run dev        # dev server
npm run build      # production build
npm test           # golf logic unit tests
npm run db:seed    # seed 16 placeholder players
```
