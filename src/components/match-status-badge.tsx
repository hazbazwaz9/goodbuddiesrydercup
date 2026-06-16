import { cn } from "@/lib/utils";
import type { MatchStatus } from "@/lib/golf";

/** Colour-coded live status pill: green when Europe leads, red when USA leads. */
export function MatchStatusBadge({
  status,
  className,
}: {
  status: MatchStatus;
  className?: string;
}) {
  const tone =
    status.leader === "europe"
      ? "bg-europe text-europe-foreground"
      : status.leader === "usa"
        ? "bg-usa text-usa-foreground"
        : "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      {status.statusText}
    </span>
  );
}
