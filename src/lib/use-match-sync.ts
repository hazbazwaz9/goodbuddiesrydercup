"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import type { HoleWinner } from "./golf";

/**
 * Hole-result sync for a single match, built for spotty golf-course signal:
 *  - optimistic: the tapped result shows immediately
 *  - durable queue: unsynced writes persist to localStorage and flush on reconnect
 *  - realtime: other players' updates stream in (without clobbering local pending)
 */
export function useMatchSync(matchId: number, initialWinners: HoleWinner[]) {
  const [winners, setWinners] = useState<HoleWinner[]>(initialWinners);
  const [pendingCount, setPendingCount] = useState(0);
  const [synced, setSynced] = useState(true);

  const queueRef = useRef<Map<number, HoleWinner>>(new Map());
  const supabaseRef = useRef(isSupabaseConfigured ? createSupabaseBrowserClient() : null);
  const storageKey = `gbrc:queue:${matchId}`;

  const persist = useCallback(() => {
    if (typeof window === "undefined") return;
    const obj = Object.fromEntries(queueRef.current);
    window.localStorage.setItem(storageKey, JSON.stringify(obj));
    setPendingCount(queueRef.current.size);
  }, [storageKey]);

  const flush = useCallback(async () => {
    const supabase = supabaseRef.current;
    if (!supabase || queueRef.current.size === 0) return;

    for (const [holeNumber, winner] of [...queueRef.current.entries()]) {
      const { error } = await supabase.from("hole_results").upsert(
        { match_id: matchId, hole_number: holeNumber, winner },
        { onConflict: "match_id,hole_number" },
      );
      if (error) {
        setSynced(false);
        return; // keep the rest queued; retry later
      }
      queueRef.current.delete(holeNumber);
    }
    persist();
    setSynced(true);
  }, [matchId, persist]);

  const setWinner = useCallback(
    (holeNumber: number, winner: HoleWinner) => {
      setWinners((prev) => {
        const next = [...prev];
        next[holeNumber - 1] = winner;
        return next;
      });
      queueRef.current.set(holeNumber, winner);
      persist();
      setSynced(false);
      void flush();
    },
    [flush, persist],
  );

  // Restore any queue persisted from a previous (possibly offline) session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const obj = JSON.parse(raw) as Record<string, HoleWinner>;
        for (const [k, v] of Object.entries(obj)) {
          const hole = Number(k);
          queueRef.current.set(hole, v);
          setWinners((prev) => {
            const next = [...prev];
            next[hole - 1] = v;
            return next;
          });
        }
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
          };
          if (!row?.hole_number) return;
          // Don't overwrite a hole we still have queued locally.
          if (queueRef.current.has(row.hole_number)) return;
          setWinners((prev) => {
            const next = [...prev];
            next[row.hole_number - 1] = payload.eventType === "DELETE" ? null : row.winner;
            return next;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  return { winners, setWinner, pendingCount, synced };
}
