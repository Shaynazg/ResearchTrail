import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

// Top bar shown on every logged-in page
export default function AppHeader({ user }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="text-lg font-semibold">
          ResearchTrail
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span>
            {user.name}{" "}
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
              {user.role}
            </span>
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}