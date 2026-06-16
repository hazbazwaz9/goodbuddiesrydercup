"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Keeps a server-rendered page live: subscribes to Postgres changes on matches
 * and hole_results and calls router.refresh(). A slow interval is kept as a
 * fallback in case the realtime socket drops (e.g. flaky course signal).
 */
export function RealtimeRefresher() {
  const router = useRouter();

  useEffect(() => {
    // Always refresh server data immediately on page visit (busts the RSC client cache).
    router.refresh();

    if (!isSupabaseConfigured) return;
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("gbrc-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "hole_results" }, () =>
        router.refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () =>
        router.refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "session_contests" }, () =>
        router.refresh(),
      )
      .subscribe();

    // Fallback poll every 10 s in case the realtime socket drops on spotty signal.
    const interval = setInterval(() => router.refresh(), 10_000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
