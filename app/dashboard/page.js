"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

// Temporary dashboard: shows who is logged in. Projects are added in Step 4.
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => {
        if (response.status === 401) {
          router.push("/login");
          return null;
        }
        return response.json();
      })
      .then((data) => data && setUser(data.user));
  }, [router]);

  if (!user) {
    return <main className="min-h-screen bg-zinc-50 p-8 text-zinc-600">Loading...</main>;
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-8 text-zinc-900">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
          <p className="text-sm text-zinc-600">
            Role: <span className="font-medium">{user.role}</span>
          </p>
        </div>
        <LogoutButton />
      </div>
    </main>
  );
}