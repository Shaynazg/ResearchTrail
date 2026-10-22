"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";

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
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Log in</h1>

        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" required className="field" />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input name="password" type="password" required className="field" />
        </label>

        {error && <p className="error-box">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p className="text-center text-sm text-muted">
          No account? <Link href="/signup" className="font-medium text-brand hover:underline">Sign up</Link>
        </p>
      </form>
    </AuthLayout>
  );
}