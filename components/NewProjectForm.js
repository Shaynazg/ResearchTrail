"use client";

import { useState } from "react";

// Form to create a project. Calls onCreated() after a successful save.
export default function NewProjectForm({ onCreated }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setSaving(true);

    const form = new FormData(formElement);
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
      }),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error);
      return;
    }
    formElement.reset();
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="font-semibold">New project</h2>

      <input name="title" required maxLength={200} placeholder="Project title"
        className="w-full rounded border border-zinc-300 bg-white px-3 py-2" />

      <textarea name="description" rows={2} placeholder="What is this research about? (optional)"
        className="w-full rounded border border-zinc-300 bg-white px-3 py-2" />

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button type="submit" disabled={saving}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {saving ? "Creating..." : "Create project"}
      </button>
    </form>
  );
}