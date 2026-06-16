import Link from "next/link";
import { Settings } from "lucide-react";
import { Logo } from "@/components/logo";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/leaderboard" className="flex items-center" aria-label="GBRC home">
          <Logo className="h-10 w-auto" />
        </Link>
        <Link
          href="/admin"
          aria-label="Admin"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
