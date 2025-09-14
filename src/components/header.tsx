"use client";

import Link from "next/link";
import { MountainIcon } from "lucide-react";

export default function Header() {
  return (
    <header className="flex h-16 w-full items-center justify-between px-4 md:px-6 bg-card/50 backdrop-blur-sm fixed top-0 z-50">
      <Link href="#" className="flex items-center gap-2" prefetch={false}>
        <MountainIcon className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold text-foreground">GoalGazer</span>
      </Link>
      <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
        <Link
          href="#"
          className="text-muted-foreground transition-colors hover:text-foreground"
          prefetch={false}
        >
          Matches
        </Link>
        <Link
          href="#"
          className="text-muted-foreground transition-colors hover:text-foreground"
          prefetch={false}
        >
          Predictions
        </Link>
        <Link
          href="#"
          className="text-muted-foreground transition-colors hover:text-foreground"
          prefetch={false}
        >
          Leaderboard
        </Link>
      </nav>
    </header>
  );
}
