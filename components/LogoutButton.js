"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleLogout}
      className="rounded-md border border-[var(--header-line)] whitespace-nowrap px-3 py-1.5 text-sm font-medium hover:bg-white/10">
      Log out
    </button>
  );
}