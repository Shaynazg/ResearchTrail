"use client";

import { useState } from "react";

// Form to create a project. Calls onCreated() after a successful save.
export default function NewProjectForm({ onCreated, onCancel }) {
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
    <form onSubmit={handleSubmit} className="panel space-y-3 p-5">
      <h2 className="font-display text-lg font-semibold">New project</h2>

      <label className="block">
        <span className="text-sm font-medium">Title</span>
        <input name="title" required maxLength={200} placeholder="e.g. Graph neural networks" className="field" />
      </label>

      <label className="block">
        <span className="text-sm font-medium">What is this research about? (optional)</span>
        <textarea name="description" rows={2} className="field" />
      </label>

      {error && <p className="error-box">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Creating..." : "Create project"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        )}
      </div>
    </form>
  );
}