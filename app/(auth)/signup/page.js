"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        institution: form.get("institution"),
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
        <h1 className="font-display text-3xl font-semibold tracking-tight">Create an account</h1>

        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input name="name" required maxLength={100} className="field" />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" required maxLength={255} className="field" />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Password (at least 8 characters)</span>
          <input name="password" type="password" required minLength={8} className="field" />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Institution (optional)</span>
          <input name="institution" maxLength={150} className="field" />
        </label>

        {error && <p className="error-box">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating account..." : "Sign up"}
        </button>

        <p className="text-center text-sm text-muted">
          Already have an account? <Link href="/login" className="font-medium text-brand hover:underline">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}