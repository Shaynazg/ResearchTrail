import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import TrailMark from "@/components/TrailMark";

// Top bar shown on every logged-in page
export default function AppHeader({ user }) {
  return (
    <header className="border-b border-[var(--header-line)] bg-[var(--header-bg)] text-[var(--header-ink)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <TrailMark />
          <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">ResearchTrail</span>
        </Link>
        <div className="flex items-center gap-2.5 text-sm sm:gap-3">
          <Link href="/search" className="font-medium hover:underline">Search</Link>
          {user.role === "admin" && (
            <Link href="/admin" className="font-medium hover:underline">Admin</Link>
          )}
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