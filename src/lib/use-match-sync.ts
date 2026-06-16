"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import { computeHoleWinner, type CourseHole, type HoleWinner, type MatchFormat } from "./golf";
import type { HoleScore } from "./types";

type HoleScores = { europeGross: (number | null)[]; usaGross: (number | null)[] };

type QueueEntry = {
  winner: HoleWinner;
  europeGross: (number | null)[];
  usaGross: (number | null)[];
};

/**
 * Hole-result sync for a single match.
 * Tracks gross scores per player, auto-computes the hole winner from handicaps,
 * and syncs everything to Supabase with offline queue + realtime.
 */
export function useMatchSync(
  matchId: number,
  config: {
    format: MatchFormat;
    euHcps: number[];
    usaHcps: number[];
    holes: CourseHole[];
    initialWinners: HoleWinner[];
    initialScores: HoleScore[];
  },
) {
  const { format, euHcps, usaHcps, holes, initialWinners, initialScores } = config;

  const [holeScores, setHoleScores] = useState<HoleScores[]>(() =>
    holes.map((h, i) => {
      const saved = initialScores[i];
      return {
        europeGross: saved?.europeGross ?? Array(euHcps.length).fill(null),
        usaGross: saved?.usaGross ?? Array(usaHcps.length).fill(null),
      };
    }),
  );

  // Winners derived from scores; fall back to server-provided winner when no scores entered yet
  const [serverWinners, setServerWinners] = useState<HoleWinner[]>(initialWinners);

  const winners: HoleWinner[] = holeScores.map((s, i) => {
    const computed = computeHoleWinner(format, s.europeGross, s.usaGross, euHcps, usaHcps, holes[i]);
    if (computed !== null) return computed;
    return serverWinners[i] ?? null;
  });

  const [pendingCount, setPendingCount] = useState(0);
  const [synced, setSynced] = useState(true);

  const queueRef = useRef<Map<number, QueueEntry>>(new Map());
  const supabaseRef = useRef(isSupabaseConfigured ? createSupabaseBrowserClient() : null);
  const storageKey = `gbrc:scores:${matchId}`;

  const persist = useCallback(() => {
    if (typeof window === "undefined") return;
    const obj = Object.fromEntries(
      [...queueRef.current.entries()].map(([k, v]) => [k, v]),
    );
    window.localStorage.setItem(storageKey, JSON.stringify(obj));
    setPendingCount(queueRef.current.size);
  }, [storageKey]);

  const flush = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase || queueRef.current.size === 0) return;

    for (const [holeNumber, entry] of [...queueRef.current.entries()]) {
      // Only include winner when non-null — never overwrite a saved winner with
      // null from a partial score entry (one side not yet scored).
      const payload: Record<string, unknown> = {
        match_id: matchId,
        hole_number: holeNumber,
        europe_gross: entry.europeGross.filter((g) => g != null),
        usa_gross: entry.usaGross.filter((g) => g != null),
      };
      if (entry.winner !== null) payload.winner = entry.winner;

      // Try with score columns first; fall back to winner-only if columns don't exist yet.
      let { error } = await supabase.from("hole_results").upsert(
        payload,
        { onConflict: "match_id,hole_number" },
      );
      if (error) {
        // Score columns may not exist yet — retry with just winner.
        const fallbackPayload: Record<string, unknown> = { match_id: matchId, hole_number: holeNumber };
        if (entry.winner !== null) fallbackPayload.winner = entry.winner;
        const fallback = await supabase.from("hole_results").upsert(
          fallbackPayload,
          { onConflict: "match_id,hole_number" },
        );
        error = fallback.error;
      }
      if (error) {
        setSynced(false);
        return;
      }
      queueRef.current.delete(holeNumber);
    }
    persist();
    setSynced(true);
  }, [matchId, persist]);

  const setScore = useCallback(
    (side: "eu" | "usa", playerIdx: number, holeNumber: number, score: number | null) => {
      const holeIdx = holeNumber - 1;

      setHoleScores((prev) => {
        const next = [...prev];
        const current = { ...next[holeIdx] };
        if (side === "eu") {
          const arr = [...current.europeGross];
          arr[playerIdx] = score;
          current.europeGross = arr;
        } else {
          const arr = [...current.usaGross];
          arr[playerIdx] = score;
          current.usaGross = arr;
        }
        next[holeIdx] = current;

        const winner = computeHoleWinner(
          format,
          current.europeGross,
          current.usaGross,
          euHcps,
          usaHcps,
          holes[holeIdx],
        );

        queueRef.current.set(holeNumber, {
          winner,
          europeGross: current.europeGross,
          usaGross: current.usaGross,
        });
        return next;
      });

      persist();
      setSynced(false);
      void flush();
    },
    [format, euHcps, usaHcps, holes, flush, persist],
  );

  // Restore any queue persisted from a previous (possibly offline) session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const obj = JSON.parse(raw) as Record<string, QueueEntry>;
        setHoleScores((prev) => {
          const next = [...prev];
          for (const [k, entry] of Object.entries(obj)) {
            const holeIdx = Number(k) - 1;
            if (holeIdx >= 0 && holeIdx < next.length) {
              next[holeIdx] = {
                europeGross: entry.europeGross,
                usaGross: entry.usaGross,
              };
              queueRef.current.set(Number(k), entry);
            }
          }
          return next;
        });
        setPendingCount(queueRef.current.size);
        void flush();
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Retry on reconnect + periodic safety flush.
  useEffect(() => {
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    const interval = setInterval(() => void flush(), 10_000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
  }, [flush]);

  // Stream other players' updates for this match.
  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hole_results",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as {
            hole_number: number;
            winner: HoleWinner;
            europe_gross: number[] | null;
            usa_gross: number[] | null;
          };
          if (!row?.hole_number) return;
          // Don't overwrite a hole we still have queued locally.
          if (queueRef.current.has(row.hole_number)) return;

          const holeIdx = row.hole_number - 1;
          if (payload.eventType === "DELETE") {
            setServerWinners((prev) => {
              const next = [...prev];
              next[holeIdx] = null;
              return next;
            });
            setHoleScores((prev) => {
              const next = [...prev];
              next[holeIdx] = {
                europeGross: Array(euHcps.length).fill(null),
                usaGross: Array(usaHcps.length).fill(null),
              };
              return next;
            });
          } else {
            setServerWinners((prev) => {
              const next = [...prev];
              next[holeIdx] = row.winner;
              return next;
            });
            if (row.europe_gross?.length || row.usa_gross?.length) {
              setHoleScores((prev) => {
                const next = [...prev];
                next[holeIdx] = {
                  europeGross: row.europe_gross ?? Array(euHcps.length).fill(null),
                  usaGross: row.usa_gross ?? Array(usaHcps.length).fill(null),
                };
                return next;
              });
            }
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, euHcps, usaHcps]);

  return { winners, holeScores, setScore, pendingCount, synced };
}
