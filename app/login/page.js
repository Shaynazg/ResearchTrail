"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 text-zinc-900">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Log in to ResearchTrail</h1>

        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" required
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2" />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input name="password" type="password" required
            className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-2" />
        </label>

        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full rounded bg-zinc-900 px-3 py-2 font-medium text-white disabled:opacity-50">
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p className="text-center text-sm text-zinc-600">
          No account? <Link href="/signup" className="font-medium underline">Sign up</Link>
        </p>
      </form>
    </main>
  );
}