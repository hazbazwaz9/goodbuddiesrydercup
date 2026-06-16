"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Thin banner shown when the device goes offline — reassures users on the course. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 py-1 text-xs font-medium text-black">
      <WifiOff className="h-3.5 w-3.5" /> Offline — scores will sync when you reconnect
    </div>
  );
}
