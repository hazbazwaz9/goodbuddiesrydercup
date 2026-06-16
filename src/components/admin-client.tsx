"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEAM_LABEL } from "@/lib/brand";
import type { PlayerLite, SessionView, Team } from "@/lib/types";
import {
  createMatch,
  createPlayer,
  deleteMatch,
  deletePlayer,
  lockAdmin,
  setSessionActive,
  updatePlayer,
  type ActionResult,
} from "@/app/actions/admin";

function useAction() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, success: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(success);
      else toast.error(res.error ?? "Something went wrong");
    });
  return { pending, run };
}

export function AdminClient({
  players,
  sessions,
}: {
  players: PlayerLite[];
  sessions: SessionView[];
}) {
  const { pending, run } = useAction();
  const router = useRouter();
  return (
    <Tabs defaultValue="players">
      <div className="mb-3 flex justify-end">
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => run(async () => {
            const res = await lockAdmin();
            if (res.ok) router.refresh();
            return res;
          }, "Locked")}
        >
          <Lock className="mr-1 h-4 w-4" /> Lock admin
        </Button>
      </div>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="players">Players</TabsTrigger>
        <TabsTrigger value="matches">Matches</TabsTrigger>
      </TabsList>
      <TabsContent value="players" className="space-y-4 pt-4">
        <PlayersTab players={players} />
      </TabsContent>
      <TabsContent value="matches" className="space-y-4 pt-4">
        {sessions.map((s) => (
          <SessionBlock key={s.id} session={s} players={players} />
        ))}
      </TabsContent>
    </Tabs>
  );
}

/* ----------------------------- Players ----------------------------- */

function PlayersTab({ players }: { players: PlayerLite[] }) {
  const counts = {
    europe: players.filter((p) => p.team === "europe").length,
    usa: players.filter((p) => p.team === "usa").length,
  };
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Europe {counts.europe} · USA {counts.usa} · {players.length} total
        </p>
        <AddPlayerDialog />
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {players.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {p.name}
                  {p.team && (
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        p.team === "europe" ? "bg-europe" : "bg-usa",
                      )}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">HCP {p.handicap}</p>
              </div>
              <EditPlayerDialog player={p} />
            </div>
          ))}
          {players.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">No players yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function AddPlayerDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [team, setTeam] = useState<Team>("europe");
  const [handicap, setHandicap] = useState("18");
  const { pending, run } = useAction();

  function submit() {
    run(
      () => createPlayer({ name, team, handicap: Number(handicap) || 0 }),
      "Player added",
    );
    setOpen(false);
    setName("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-1 h-4 w-4" /> Add
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add player</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Team">
              <TeamSelect value={team} onChange={(v) => setTeam(v as Team)} />
            </Field>
            <Field label="Handicap">
              <Input
                type="number"
                value={handicap}
                onChange={(e) => setHandicap(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || !name}>
            Add player
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPlayerDialog({ player }: { player: PlayerLite }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(player.name);
  const [team, setTeam] = useState<string>(player.team ?? "none");
  const [handicap, setHandicap] = useState(String(player.handicap));
  const { pending, run } = useAction();

  function save() {
    run(
      () =>
        updatePlayer({
          id: player.id,
          name,
          team: team === "none" ? null : (team as Team),
          handicap: Number(handicap) || 0,
        }),
      "Player updated",
    );
    setOpen(false);
  }

  function remove() {
    run(() => deletePlayer(player.id), "Player removed");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Edit</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit player</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Team">
              <TeamSelect value={team} onChange={setTeam} allowNone />
            </Field>
            <Field label="Handicap">
              <Input
                type="number"
                value={handicap}
                onChange={(e) => setHandicap(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" className="text-destructive" onClick={remove} disabled={pending}>
            <Trash2 className="mr-1 h-4 w-4" /> Remove
          </Button>
          <Button onClick={save} disabled={pending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- Matches ----------------------------- */

function SessionBlock({ session, players }: { session: SessionView; players: PlayerLite[] }) {
  const { pending, run } = useAction();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">{session.name}</CardTitle>
        <Button
          size="sm"
          variant={session.isActive ? "default" : "outline"}
          disabled={pending}
          onClick={() =>
            run(
              () => setSessionActive(session.id, !session.isActive),
              session.isActive ? "Session paused" : "Session activated",
            )
          }
        >
          {session.isActive ? "Active" : "Activate"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="divide-y rounded-lg border">
          {session.matches.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No matches yet.</p>
          ) : (
            session.matches.map((m) => (
              <MatchRow key={m.id} matchId={m.id} eu={m.europePlayers} usa={m.usaPlayers} />
            ))
          )}
        </div>
        <AddMatchForm session={session} players={players} />
      </CardContent>
    </Card>
  );
}

function MatchRow({
  matchId,
  eu,
  usa,
}: {
  matchId: number;
  eu: PlayerLite[];
  usa: PlayerLite[];
}) {
  const { pending, run } = useAction();
  return (
    <div className="flex items-center justify-between px-3 py-2 text-sm">
      <span>
        <span className="text-europe">{eu.map((p) => p.name).join(" & ")}</span>
        <span className="mx-1 text-muted-foreground">v</span>
        <span className="text-usa">{usa.map((p) => p.name).join(" & ")}</span>
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-destructive"
        disabled={pending}
        onClick={() => run(() => deleteMatch(matchId), "Match deleted")}
        aria-label="Delete match"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AddMatchForm({ session, players }: { session: SessionView; players: PlayerLite[] }) {
  const needed = session.format === "singles" ? 1 : 2;
  const europeRoster = players.filter((p) => p.team === "europe");
  const usaRoster = players.filter((p) => p.team === "usa");

  const [eu, setEu] = useState<string[]>(Array(needed).fill(""));
  const [usa, setUsa] = useState<string[]>(Array(needed).fill(""));
  const { pending, run } = useAction();

  function setSlot(side: "eu" | "usa", index: number, value: string) {
    const setter = side === "eu" ? setEu : setUsa;
    setter((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function add() {
    const euIds = eu.filter(Boolean);
    const usaIds = usa.filter(Boolean);
    if (euIds.length !== needed || usaIds.length !== needed) {
      toast.error(`Pick ${needed} player${needed > 1 ? "s" : ""} per side.`);
      return;
    }
    if (new Set(euIds).size !== euIds.length || new Set(usaIds).size !== usaIds.length) {
      toast.error("A player can't be picked twice.");
      return;
    }
    run(
      () =>
        createMatch({
          sessionId: session.id,
          europePlayerIds: euIds,
          usaPlayerIds: usaIds,
          matchOrder: session.matches.length + 1,
        }),
      "Match added",
    );
    setEu(Array(needed).fill(""));
    setUsa(Array(needed).fill(""));
  }

  return (
    <div className="space-y-2 rounded-lg bg-muted/40 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Add match
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-europe">Europe</span>
          {eu.map((value, i) => (
            <PlayerSelect
              key={i}
              roster={europeRoster}
              value={value}
              exclude={eu.filter((_, j) => j !== i)}
              onChange={(v) => setSlot("eu", i, v)}
            />
          ))}
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-usa">USA</span>
          {usa.map((value, i) => (
            <PlayerSelect
              key={i}
              roster={usaRoster}
              value={value}
              exclude={usa.filter((_, j) => j !== i)}
              onChange={(v) => setSlot("usa", i, v)}
            />
          ))}
        </div>
      </div>
      <Button size="sm" className="w-full" onClick={add} disabled={pending}>
        <Plus className="mr-1 h-4 w-4" /> Add match
      </Button>
    </div>
  );
}

/* ----------------------------- Shared ----------------------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function TeamSelect({
  value,
  onChange,
  allowNone = false,
}: {
  value: string;
  onChange: (v: string) => void;
  allowNone?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="none">Unassigned</SelectItem>}
        <SelectItem value="europe">{TEAM_LABEL.europe}</SelectItem>
        <SelectItem value="usa">{TEAM_LABEL.usa}</SelectItem>
      </SelectContent>
    </Select>
  );
}

function PlayerSelect({
  roster,
  value,
  exclude,
  onChange,
}: {
  roster: PlayerLite[];
  value: string;
  exclude: string[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder="Pick…" />
      </SelectTrigger>
      <SelectContent>
        {roster
          .filter((p) => !exclude.includes(p.id))
          .map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name} ({p.handicap})
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
