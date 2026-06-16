"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flag, Wind } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ContestResult, ContestType, PlayerLite, SessionView } from "@/lib/types";

const CONTESTS: { type: ContestType; label: string; icon: typeof Flag }[] = [
  { type: "long_drive", label: "Long Drive", icon: Wind },
  { type: "closest_pin", label: "Closest to the Pin", icon: Flag },
];

export function SessionContests({
  session,
  players,
  editable = false,
}: {
  session: SessionView;
  players: PlayerLite[];
  editable?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-muted/20">
      <div className="border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Side contests · ½ pt each
      </div>
      <div className="divide-y">
        {CONTESTS.map(({ type, label, icon }) => (
          <ContestRow
            key={type}
            sessionId={session.id}
            type={type}
            label={label}
            Icon={icon}
            result={type === "long_drive" ? session.contests.longDrive : session.contests.closestPin}
            players={players}
            editable={editable}
          />
        ))}
      </div>
    </div>
  );
}

function ContestRow({
  sessionId,
  type,
  label,
  Icon,
  result,
  players,
  editable,
}: {
  sessionId: number;
  type: ContestType;
  label: string;
  Icon: typeof Flag;
  result: ContestResult;
  players: PlayerLite[];
  editable: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(result.winnerPlayerId ?? "none");

  const europe = players.filter((p) => p.team === "europe");
  const usa = players.filter((p) => p.team === "usa");

  function save(next: string) {
    setValue(next);
    start(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("session_contests").upsert(
        {
          session_id: sessionId,
          contest_type: type,
          winner_player_id: next === "none" ? null : next,
        },
        { onConflict: "session_id,contest_type" },
      );
      if (error) {
        toast.error("Couldn't save — try again");
        setValue(result.winnerPlayerId ?? "none");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {!editable && (
          <p className="text-xs text-muted-foreground">
            {result.winnerName ? (
              <>
                {result.winnerName}
                <span
                  className={cn(
                    "ml-1 font-semibold",
                    result.winnerTeam === "europe" ? "text-europe" : "text-usa",
                  )}
                >
                  ({result.winnerTeam === "europe" ? "EU" : "USA"} +½)
                </span>
              </>
            ) : (
              "Not decided"
            )}
          </p>
        )}
      </div>

      {editable ? (
        <Select value={value} onValueChange={(v) => save(v ?? "none")} disabled={pending}>
          <SelectTrigger className="h-8 w-[9.5rem] text-xs">
            <SelectValue placeholder="Pick winner…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not decided</SelectItem>
            {europe.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-europe">Europe</SelectLabel>
                {europe.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {usa.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-usa">USA</SelectLabel>
                {usa.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      ) : (
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            result.winnerTeam === "europe" && "bg-europe text-europe-foreground",
            result.winnerTeam === "usa" && "bg-usa text-usa-foreground",
            !result.winnerTeam && "bg-muted text-muted-foreground",
          )}
        >
          {result.winnerTeam ? "½ pt" : "TBD"}
        </span>
      )}
    </div>
  );
}
