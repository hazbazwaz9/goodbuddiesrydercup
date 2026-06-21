"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, Users, Swords, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const items: NavItem[] = [
  { href: "/leaderboard", label: "Live", icon: Trophy },
  { href: "/matches", label: "Matches", icon: Swords },
  { href: "/roster", label: "Roster", icon: Users },
  { href: "/stats", label: "Stats", icon: BarChart2 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-gold")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
