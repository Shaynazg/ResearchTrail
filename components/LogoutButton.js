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
      className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-100">
      Log out
    </button>
  );
}