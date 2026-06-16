import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-5xl">⛳️</p>
      <h1 className="text-xl font-semibold">Out of bounds</h1>
      <p className="text-sm text-muted-foreground">That page isn&apos;t on the card.</p>
      <Link href="/leaderboard" className={buttonVariants()}>
        Back to leaderboard
      </Link>
    </div>
  );
}
