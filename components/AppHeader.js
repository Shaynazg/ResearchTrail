import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import TrailMark from "@/components/TrailMark";

// Top bar shown on every logged-in page
export default function AppHeader({ user }) {
  return (
    <header className="border-b border-[var(--header-line)] bg-[var(--header-bg)] text-[var(--header-ink)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <TrailMark />
          <span className="font-display text-xl font-semibold tracking-tight">ResearchTrail</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/search" className="font-medium hover:underline">Search</Link>
          <span className="hidden sm:inline">{user.name}</span>
          <span className="hidden rounded-full border border-[var(--header-line)] px-2.5 py-0.5 text-xs font-medium capitalize sm:inline">
            {user.role}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}